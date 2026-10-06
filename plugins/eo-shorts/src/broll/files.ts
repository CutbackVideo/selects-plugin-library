import { readJsonIfExists, statFile } from "../host/fs.ts";
import type { HostFs } from "../host/types.ts";
import { hashJson } from "../host/util.ts";
import { clipHolds } from "./cut.ts";
import type { ShotPick, ShotRequest, ShotResult } from "./types.ts";

export function safeName(s: string): string {
  const name = String(s).replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80).replace(/\.+$/, "_") || "_";
  return /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name) ? "_" + name : name;
}

export function shotDir(fs: HostFs, media: string, shotId: string): string {
  return fs.join(media, "shots", safeName(shotId));
}

export function stockEvidenceDir(fs: HostFs, media: string, sourceKey: string): string {
  return fs.join(media, "stock-evidence", safeName(sourceKey));
}

export function peopleDir(fs: HostFs, media: string): string {
  return fs.join(media, "people");
}

export function photoRecordPath(fs: HostFs, media: string, shotId: string): string {
  return fs.join(peopleDir(fs, media), safeName(shotId) + ".json");
}

export function peopleEvidenceDir(fs: HostFs, media: string, pageId: number): string {
  return fs.join(media, "people-evidence", String(pageId));
}

export function requestSha(r: ShotRequest): Promise<string> {
  return hashJson(r);
}

async function pickIntact(fs: HostFs, media: string, shotId: string, pick: ShotPick): Promise<boolean> {
  if (!fs.existsSync(pick.localPath)) return false;
  if (pick.kind === "video") {
    if (!pick.interval) return false;
    const [s, e] = pick.interval;
    return clipHolds(fs, pick.localPath, pick.fileUrl, s, e - s);
  }
  const rec = await readJsonIfExists<{ fileUrl?: string; localFile?: string; bytes?: number } | null>(fs, photoRecordPath(fs, media, shotId), null);
  return !!rec && rec.fileUrl === pick.fileUrl && rec.localFile === fs.basename(pick.localPath) && rec.bytes === statFile(fs, pick.localPath)?.size;
}

export async function resumableResult(fs: HostFs, media: string, r: ShotRequest, sha: string, o: { judging?: boolean } = {}): Promise<ShotResult | null> {
  try {
    const res = await readJsonIfExists<ShotResult | null>(fs, fs.join(shotDir(fs, media, r.id), "result.json"), null);
    if (!res || res.schema !== "shot-result/1" || res.requestSha !== sha || res.status === "error" || res.retry) return null;
    if (o.judging && res.pick?.fit === "unjudged" && res.pick.notJudged === "judge_off") return null;
    if (res.pick && !(await pickIntact(fs, media, r.id, res.pick))) return null;
    return res;
  } catch {
    return null;
  }
}

export function rel(fs: HostFs, media: string, abs: string): string {
  const base = media.replace(/[\\/]+$/, "");
  return abs.startsWith(base) ? abs.slice(base.length).replace(/^[\\/]+/, "").split(/[\\/]/).join("/") : abs;
}
