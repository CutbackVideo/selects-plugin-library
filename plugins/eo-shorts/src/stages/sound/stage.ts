import type { StageContext, StageImpl, StageResult } from "../../jobs/runner.ts";
import { inputShaFrom } from "../../jobs/receipts.ts";
import { ensureDir, readJson, readJsonIfExists, writeJsonAtomic } from "../../host/fs.ts";
import { soundFilm, type SoundInput } from "./soundFilm.ts";
import type { SoundScene, SceneExecution } from "./sfxPlacement.ts";
import type { SoundReport } from "./soundReport.ts";

export const SOUND_STAGE_VERSION = "eo-sound-stage/2";

export const SOUND_REL = {
  report: "sound/sound.json",
  music: "sound/music.json",
  sfx: "sound/sfx.json",
  gain: "sound/gain.json",
  credits: "sound/credits.json",
  planMusic: "plan/music.json",
  compose: "compose/compose.json",
  execution: (sid: string) => "compose/" + sid + "/execution.json",
};

export type SoundStageOptions = {
  packageDir?: (ctx: StageContext) => string;
  sound?: Partial<Pick<SoundInput, "render" | "measure" | "backoffMs" | "options">>;
};

export function createSoundStage(o: SoundStageOptions = {}): StageImpl {
  return {
    id: "sound",
    inputSha: (ctx) => inputShaFrom(ctx.host.fs, ctx.dir, ["edit", "plan", "compose"], { version: SOUND_STAGE_VERSION, draftId: ctx.job.draftId, options: o.sound?.options ?? null }),
    run: (ctx) => runSound(ctx, o),
  };
}

export const soundStage: StageImpl = createSoundStage();

export async function soundScenes(ctx: Pick<StageContext, "host" | "path">): Promise<SoundScene[]> {
  const fs = ctx.host.fs;
  const composed = await readJson<{ scenes?: { sceneId: string; start: number; end: number }[] }>(fs, ctx.path(SOUND_REL.compose));
  const out: SoundScene[] = [];
  for (const s of composed.scenes ?? []) out.push({ sceneId: s.sceneId, start: s.start, end: s.end, execution: await readJson<SceneExecution>(fs, ctx.path(SOUND_REL.execution(s.sceneId))) });
  return out;
}

async function runSound(ctx: StageContext, o: SoundStageOptions): Promise<StageResult> {
  const { host, job } = ctx;
  const fs = host.fs;
  if (!job.draftId) throw new Error("The job has no EO draft yet (the edit stage makes it).");
  const music = await readJsonIfExists<{ mood?: string | null; energy?: string | null; reason?: string | null } | null>(fs, ctx.path(SOUND_REL.planMusic), null);
  const scenes = await soundScenes(ctx);
  const edited = await readJsonIfExists<{ mainEnd?: number } | null>(fs, ctx.path("edit/words.json"), null);
  const dirs = { sound: ctx.path("sound"), footage: ctx.path("media/footage"), tmp: ctx.path("sound/tmp") };
  for (const d of Object.values(dirs)) ensureDir(fs, d);
  const report: SoundReport = await soundFilm({
    host,
    projectId: job.projectId,
    draftId: job.draftId,
    jobId: job.jobId,
    dirs,
    packageDir: o.packageDir ? o.packageDir(ctx) : ctx.roots.skills,
    music: music ? { mood: music.mood ?? null, energy: music.energy ?? null, reason: music.reason ?? null } : null,
    scenes,
    expect: { mainEnd: edited?.mainEnd },
    signal: ctx.signal,
    progress: (n) => ctx.note(n),
    ...(o.sound ?? {}),
  });
  for (const w of report.warnings) ctx.warn(w);
  const fin = report.loudness.final;
  if (!fin.ok) ctx.warn("The mix fails G4: " + (fin.failure ?? "the mix measures " + fin.integrated.toFixed(2) + " LUFS / " + fin.truePeak.toFixed(2) + " dBTP") + ".");
  await writeJsonAtomic(fs, ctx.path(SOUND_REL.credits), { schema: "eo-sound-credits/1", credits: report.credits });
  const outputs = [SOUND_REL.report, SOUND_REL.sfx, SOUND_REL.gain, SOUND_REL.credits, ...(report.music ? [SOUND_REL.music] : [])];
  return {
    outputs,
    note: (report.music ? report.music.title + ", " : "no music, ") + report.sfx.placed.length + " effect(s), " + fin.integrated.toFixed(2) + " LUFS / " + fin.truePeak.toFixed(2) + " dBTP" + (report.skipped ? " (unchanged)" : ""),
    data: { final: fin, music: report.music?.trackId ?? null, sfx: report.sfx.placed.length, dips: report.voice.dips.length, skipped: report.skipped, ms: report.ms },
  };
}
