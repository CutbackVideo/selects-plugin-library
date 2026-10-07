import { removeFile, writeFileAtomic, writeJsonAtomic } from "../host/fs.ts";
import type { HostFs } from "../host/types.ts";
import { errorMessage } from "../host/util.ts";
import type { CommonsConfig } from "./config.ts";
import { fetchPhoto, searchCommons, type CommonsPhoto, type FetchLike } from "./commons.ts";
import { prepareStillEvidence } from "./evidence.ts";
import { peopleDir, peopleEvidenceDir, photoRecordPath, safeName } from "./files.ts";
import { judgeItems, transientJudgeCode, type CallModelFn, type JudgeItem, type JudgeOutcome } from "./judge.ts";
import { requestText } from "./request.ts";
import type { SheetPainter } from "./sheet.ts";
import type { Evidence, JudgeRecord, Preference, ShotPick, ShotRequest, ShotResult, ShotStatus } from "./types.ts";

export interface PeopleDeps {
  fs: HostFs;
  painter: SheetPainter;
  callModel: CallModelFn | null;
  fetch: FetchLike | null;
  commons: CommonsConfig;
  now: () => number;
  sleep?: (ms: number) => Promise<void>;
  log: (e: Record<string, unknown>) => void;
}

export interface PersonShotState {
  req: ShotRequest;
  search?: { url: string; status: number; kept: number; refused: { title: string; reason: string }[] };
  photos: { photo: CommonsPhoto; evidence: Evidence | null; error?: string }[];
  records: JudgeRecord[];
  pick?: ShotPick;
  status?: ShotStatus;
  fallback?: string;
  retry?: ShotResult["retry"];
  warnings: string[];
  record?: Record<string, unknown>;
}

const PREF: Record<Preference, number> = { excellent: 0, usable: 1, weak: 2 };
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function runPersonShots(
  reqs: ShotRequest[],
  d: PeopleDeps,
  o: { jobId: string; media: string; signal?: AbortSignal; deadline: number; acceptWeak: boolean; taken: Set<string> },
): Promise<PersonShotState[]> {
  const out: PersonShotState[] = [];
  for (const req of reqs) {
    const s: PersonShotState = { req, photos: [], records: [], warnings: [] };
    out.push(s);
    try {
      await one(s, d, o);
    } catch (e) {
      if (o.signal?.aborted) throw e;
      s.status = "error";
      s.fallback = errorMessage(e).slice(0, 300);
    }
  }
  return out;
}

async function one(s: PersonShotState, d: PeopleDeps, o: Parameters<typeof runPersonShots>[2]): Promise<void> {
  const name = s.req.person!.name;
  if (!d.fetch) {
    s.status = "error";
    s.fallback = "no network access for Wikimedia Commons in this build";
    return;
  }
  const res = await searchCommons(name, d.commons, { fetch: d.fetch, sleep: d.sleep, signal: o.signal });
  s.search = { url: res.url, status: res.status, kept: res.kept.length, refused: res.refused };
  const photos = res.kept.filter((p) => !o.taken.has("commons:" + p.pageId)).slice(0, d.commons.maxJudged);
  if (res.status !== 200) {
    s.status = "error";
    s.fallback = "Commons answered HTTP " + res.status;
    s.retry = { code: "commons_error", reason: s.fallback };
    return;
  }
  if (!photos.length) {
    s.status = "no_match";
    s.fallback = "no CC0, public-domain or CC BY photo names " + name + " (" + res.refused.length + " refused)";
    return;
  }
  const bytesOf = new Map<number, { bytes: Uint8Array; mime: string }>();
  for (const photo of photos) {
    try {
      const got = await fetchPhoto(photo, { fetch: d.fetch, sleep: d.sleep, signal: o.signal });
      bytesOf.set(photo.pageId, got);
      const ev = await prepareStillEvidence("commons:" + photo.pageId, got.bytes, got.mime, peopleEvidenceDir(d.fs, o.media, photo.pageId), { fs: d.fs, runtime: null, painter: d.painter });
      s.photos.push({ photo, evidence: ev });
    } catch (e) {
      if (o.signal?.aborted) throw e;
      s.photos.push({ photo, evidence: null, error: errorMessage(e).slice(0, 200) });
    }
  }
  const ready = s.photos.filter((p) => p.evidence?.status === "ready");
  const failed = s.photos.filter((p) => p.evidence?.status !== "ready");
  const failNote = failed.length ? failed.length + " of " + s.photos.length + " photos could not be fetched or read: " + (failed[0].error ?? failed[0].evidence?.reason ?? "error").slice(0, 160) : "";
  if (!ready.length) {
    s.status = "error";
    s.fallback = failNote;
    s.retry = { code: "commons_error", reason: failNote };
    return;
  }
  const items: JudgeItem[] = ready.map((p) => ({
    key: "commons:" + p.photo.pageId,
    candidate: { kind: "image", request: { text: requestText(s.req), conditions: s.req.conditions.map(({ id, text }) => ({ id, text })), minimumSeconds: null }, durationSeconds: null, timestamps: [] },
    evidence: p.evidence!,
  }));
  const outs: JudgeOutcome[] = d.callModel
    ? await judgeItems(items, d.callModel, d.fs, { jobId: o.jobId, candidatesPerCall: 4, maxImages: 4, concurrency: 1, deadline: o.deadline, signal: o.signal, now: d.now, onBatch: (b) => d.log({ type: "broll.judge.person", shot: s.req.id, ...b }) })
    : items.map((it) => ({ key: it.key, execution: { status: "error" as const, code: "judge_off", reason: "judging is off for this run" }, prediction: null }));
  s.records = outs.map((r) => ({ shotId: s.req.id, sourceKey: r.key, execution: r.execution, prediction: r.prediction, ...(r.call ? { call: r.call } : {}) }));
  const fits = s.records
    .map((r, i) => ({ r, i, p: ready[i].photo }))
    .filter(({ r }) => r.execution.status === "ok" && r.prediction?.status === "fit" && (o.acceptWeak || r.prediction.preference !== "weak"))
    .sort((a, b) => PREF[a.r.prediction!.preference!] - PREF[b.r.prediction!.preference!] || b.p.width - a.p.width || a.i - b.i);
  let chosen: { r: JudgeRecord; p: CommonsPhoto } | null = fits[0] ? { r: fits[0].r, p: fits[0].p } : null;
  if (!chosen) {
    const unjudged = s.records.map((r, i) => ({ r, p: ready[i].photo })).filter(({ r }) => r.execution.status === "error");
    if (unjudged.length && unjudged.length === s.records.length) {
      chosen = unjudged[0];
      s.fallback = "unjudged fallback (" + chosen.r.execution.code + "): first licensed photo that names " + name;
      s.warnings.push("the photo was not checked for one real person and a visible face");
      const transient = transientJudgeCode(chosen.r.execution.code);
      if (transient) s.retry = { code: transient, reason: "the photo was not judged (" + chosen.r.execution.code + ")" };
    }
  }
  if (!chosen) {
    s.status = s.records.some((r) => r.execution.status === "ok" && r.prediction?.status === "unverified") ? "unverified" : "no_match";
    s.fallback = "no photo was judged a clear photograph of one person" + (failNote ? "; " + failNote : "");
    const hiccup = s.records.find((r) => r.execution.status === "error" && transientJudgeCode(r.execution.code));
    if (failNote) s.retry = { code: "commons_error", reason: failNote };
    else if (hiccup) s.retry = { code: transientJudgeCode(hiccup.execution.code)!, reason: "a photo was not judged (" + hiccup.execution.code + ": " + hiccup.execution.reason.slice(0, 120) + ")" };
    return;
  }
  const got = bytesOf.get(chosen.p.pageId)!;
  const dir = peopleDir(d.fs, o.media);
  const file = d.fs.join(dir, safeName(s.req.id) + "." + (EXT[got.mime] ?? "jpg"));
  const recordPath = photoRecordPath(d.fs, o.media, s.req.id);
  await removeFile(d.fs, recordPath);
  if ((await d.fs.exists(recordPath))) throw new Error("could not remove the old photo record " + recordPath);
  await writeFileAtomic(d.fs, file, got.bytes);
  let size: { width: number; height: number } | null = null;
  try {
    size = await d.painter.imageSize(got.bytes, got.mime);
  } catch {
    size = null;
  }
  const p = chosen.p;
  if (p.restrictions) s.warnings.push("Commons lists restrictions for this photo: " + p.restrictions);
  const fit = chosen.r.prediction?.status === "fit";
  s.pick = {
    kind: "photo",
    provider: "Wikimedia Commons",
    sourceKey: "commons:" + p.pageId,
    fileUrl: p.fileUrl,
    pageUrl: p.pageUrl,
    author: p.author,
    license: p.license,
    ...(p.licenseUrl ? { licenseUrl: p.licenseUrl } : {}),
    attribution: p.attribution,
    durationSeconds: null,
    interval: null,
    cx: 0.5,
    cxSource: "default",
    fit: fit ? "fit" : "unjudged",
    ...(fit ? {} : { notJudged: chosen.r.execution.code }),
    preference: fit ? (chosen.r.prediction!.preference ?? null) : null,
    why: fit ? chosen.r.prediction!.reason : "not judged",
    localPath: file,
    ...(size ? { width: size.width, height: size.height } : {}),
  };
  s.status = fit ? (s.pick.preference === "weak" ? "weak_only" : "found") : "unverified";
  o.taken.add("commons:" + p.pageId);
  s.record = {
    schema: "person-photo/1",
    shotId: s.req.id,
    name,
    context: s.req.person!.context,
    title: p.title,
    pageUrl: p.pageUrl,
    fileUrl: p.fileUrl,
    downloadedUrl: p.thumbUrl,
    mime: got.mime,
    bytes: got.bytes.length,
    width: size?.width ?? null,
    height: size?.height ?? null,
    author: p.author,
    credit: p.credit,
    license: p.license,
    licenseUrl: p.licenseUrl,
    attribution: p.attribution,
    restrictions: p.restrictions,
    description: p.description,
    date: p.date,
    identityEvidence: "the file's title or description names " + name,
    judge: chosen.r,
    localFile: d.fs.basename(file),
    retrievedAt: new Date(d.now()).toISOString(),
  };
  await writeJsonAtomic(d.fs, recordPath, s.record);
}
