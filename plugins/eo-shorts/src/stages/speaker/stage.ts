import type { StageContext, StageImpl, StageResult } from "../../jobs/runner.ts";
import { inputShaFrom } from "../../jobs/receipts.ts";
import { ensureDir, readJsonIfExists, writeJsonAtomic } from "../../host/fs.ts";
import { readScript, runScript } from "../../host/runScript.ts";
import { analyzeSpeaker, type SpeakerHost, type SpeakerInput } from "../../speaker/analyze.ts";
import { buildApplyScript } from "../../speaker/applyScript.ts";
import type { FaceDetector } from "../../speaker/yunet/runtime.ts";
import { sharedFaceDetector } from "./detector.ts";
import { panelSpeakerHost } from "./host.ts";
import { readSpeakerDraftScript, type SpeakerDraftRead } from "./scripts.ts";
import { guardWordsSig, type SignedWord } from "../compose/wordsGuard.ts";

export const SPEAKER_STAGE_VERSION = "eo-speaker-stage/1";

export const SPEAKER_REL = {
  faces: "speaker/faces.json",
  framing: "speaker/framing.json",
  observations: "speaker/observations.json",
  apply: "speaker/apply.json",
};

export type SpeakerStageOptions = {
  host?: (ctx: StageContext) => SpeakerHost;
  detector?: (ctx: StageContext) => Promise<FaceDetector>;
  backoffMs?: number[];
};

type ApplyResult = { splits: number; set: number; unchanged: number; committed: boolean; commitId: string | null; mismatches: unknown[]; pieces: number };

export function createSpeakerStage(o: SpeakerStageOptions = {}): StageImpl {
  return {
    id: "speaker",
    inputSha: (ctx) => inputShaFrom(ctx.host.fs, ctx.dir, ["edit"], { version: SPEAKER_STAGE_VERSION, draftId: ctx.job.draftId }),
    run: (ctx) => runSpeaker(ctx, o),
  };
}

export const speakerStage: StageImpl = createSpeakerStage();

async function runSpeaker(ctx: StageContext, o: SpeakerStageOptions): Promise<StageResult> {
  const { host, job } = ctx;
  const fs = host.fs;
  const draftId = job.draftId;
  if (!draftId) throw new Error("The job has no EO draft yet (the edit stage makes it).");
  const rs = { signal: ctx.signal, ...(o.backoffMs ? { backoffMs: o.backoffMs } : {}) };
  await ensureDir(fs, ctx.path("speaker"));

  ctx.note("Reading the EO draft…");
  const read = await readScript<SpeakerDraftRead>(host.sdk, "EO Shorts: read Main for the speaker framing", readSpeakerDraftScript(job.projectId, draftId), rs);
  const edited = await readJsonIfExists<{ mainEnd?: number; words?: SignedWord[] } | null>(fs, ctx.path("edit/words.json"), null);
  if (edited && (edited.mainEnd !== read.mainEnd || (Array.isArray(edited.words) && guardWordsSig(edited.words) !== read.wordsSig))) {
    throw new Error("The EO draft changed after the edit (Main ends at frame " + read.mainEnd + ", the edit left " + edited.mainEnd + "). Make a new short from the source.");
  }
  const resources: SpeakerInput["resources"] = {};
  for (const [rid, r] of Object.entries(read.resources)) if (r.path) resources[rid] = { fps: r.fps, path: r.path };
  for (const [rid, r] of Object.entries(read.resources)) if (!r.path) ctx.warn("Main's media " + (r.name ?? rid) + " is not among the project's files; its pieces cannot be framed.");
  const input: SpeakerInput = {
    draftId,
    draftFps: read.fps,
    frameSize: read.frameSize,
    durationFrames: read.mainEnd,
    pieces: read.main,
    words: read.words,
    seams: read.seams,
    resources,
  };

  const detector = o.detector ? () => o.detector!(ctx) : () => sharedFaceDetector(fs, ctx.roots.runtime, (s) => ctx.note(s));
  const sh = o.host ? o.host(ctx) : (await panelSpeakerHost(host, { scratchDir: ctx.path("speaker/tmp"), detector, signal: ctx.signal, progress: (s) => ctx.note(s) }));
  const result = await analyzeSpeaker(input, sh, { signal: ctx.signal });
  await writeJsonAtomic(fs, ctx.path(SPEAKER_REL.faces), result.faces);
  await writeJsonAtomic(fs, ctx.path(SPEAKER_REL.framing), result.framing);
  await writeJsonAtomic(fs, ctx.path(SPEAKER_REL.observations), result.observations);
  for (const w of result.framing.warnings) ctx.warn(w);

  ctx.note("Framing the speaker (" + result.plan.splits.length + " camera cut" + (result.plan.splits.length === 1 ? "" : "s") + ")…");
  const out = await runScript<ApplyResult>(host.sdk, {
    ...rs,
    summary: "EO Shorts: frame the speaker (camera cuts, 9:16 Transforms)",
    script: buildApplyScript(result.plan, { draftId, mainEndFrame: read.mainEnd, label: "EO Shorts: frame the speaker" }),
    allowCommit: true,
    verify: async () => "retry",
  });
  const applied = out.result;
  if (applied?.mismatches?.length) throw new Error("The speaker framing did not take on " + applied.mismatches.length + " Main piece(s).");
  await writeJsonAtomic(fs, ctx.path(SPEAKER_REL.apply), { schema: "eo-speaker-apply/1", draftId, mainEnd: read.mainEnd, splits: result.plan.splits, targets: result.plan.targets.length, result: applied ?? null });
  const segs = result.framing.segments;
  return {
    outputs: [SPEAKER_REL.framing, SPEAKER_REL.observations, SPEAKER_REL.faces, SPEAKER_REL.apply],
    note: segs.length + " camera segment" + (segs.length === 1 ? "" : "s") + (result.plan.splits.length ? ", split at " + result.plan.splits.join(", ") : "") + ", " + result.plan.targets.length + " piece(s) framed",
    data: { splits: result.plan.splits, segments: segs.map((s) => ({ id: s.id, cx: Math.round(s.cx * 10) / 10, rule: s.rule, facesFrom: s.facesFrom })), applied: applied ?? null },
  };
}
