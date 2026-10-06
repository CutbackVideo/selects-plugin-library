import type { StageImpl, StageRegistry } from "./runner.ts";
import type { StageId } from "./store.ts";
import { runPreflight, type PreflightReport } from "../host/preflight.ts";
import { writeJsonAtomic } from "../host/fs.ts";
import { hashJson } from "../host/util.ts";
import { PLUGIN_VERSION } from "../identity.ts";
import { findJobByDraft } from "./store.ts";
import { createGatedMediaStage } from "./mediaGates.ts";
import { editStage } from "../stages/edit/index.ts";
import { speakerStage } from "../stages/speaker/index.ts";
import { planStage } from "../stages/plan/index.ts";
import { composeStage } from "../stages/compose/stage.ts";
import { soundStage } from "../stages/sound/stage.ts";
import { exportStage } from "../stages/export/stage.ts";
import { diagnosticsStage } from "../stages/diagnostics/stage.ts";

export const preflightStage: StageImpl = {
  id: "preflight",
  alwaysRerun: true,
  inputSha: (ctx) => hashJson({ projectId: ctx.job.projectId, sourceDraftId: ctx.job.sourceDraftId, plugin: PLUGIN_VERSION }),
  async run(ctx) {
    ctx.note("Checking the app, ffmpeg and the draft…");
    const madeBy = await findJobByDraft(ctx.host.fs, ctx.roots.jobs, ctx.job.projectId, ctx.job.sourceDraftId);
    const report: PreflightReport = await runPreflight(ctx.host, {
      projectId: ctx.job.projectId,
      draftId: ctx.job.sourceDraftId,
      signal: ctx.signal,
      madeBy,
    });
    const caps = report.capabilities;
    ctx.job.versions.plugin = PLUGIN_VERSION;
    if (caps.version) ctx.job.versions.app = caps.version;
    if (report.smoke?.version) ctx.job.versions.ffmpeg = report.smoke.version.version + (caps.platform ? " " + caps.platform : "");
    if (report.source?.name) ctx.job.sourceName = report.source.name;
    for (const w of report.warnings) ctx.warn(w.message);
    const outputs: string[] = [];
    if (report.source) {
      await writeJsonAtomic(ctx.host.fs, ctx.path("source/source.json"), report.source);
      outputs.push("source/source.json");
    }
    const { source, ...rest } = report;
    await writeJsonAtomic(ctx.host.fs, ctx.path("source/preflight.json"), {
      ...rest,
      source: source ? { ...source, words: undefined, wordCount: source.words.length } : null,
    });
    await ctx.saveJob();
    if (!report.ok) throw new Error(report.errors.map((e) => e.message).join(" "));
    const s = report.source!;
    const seconds = s.fps > 0 ? s.mainEndFrame / s.fps : 0;
    return {
      outputs,
      note: seconds.toFixed(1) + " s, " + s.words.filter((w) => !w.nonSpeech).length + " words",
      data: { errors: report.errors, warnings: report.warnings, smokeFailed: report.smoke?.failed ?? [], ms: report.ms },
    };
  },
};

export const PENDING_STAGES: Readonly<Partial<Record<StageId, string>>> = {};

export const gatedMediaStage: StageImpl = createGatedMediaStage();

export function stageRegistry(): StageRegistry {
  return {
    preflight: preflightStage,
    edit: editStage,
    speaker: speakerStage,
    plan: planStage,
    media: gatedMediaStage,
    compose: composeStage,
    sound: soundStage,
    export: exportStage,
    diagnostics: diagnosticsStage,
  };
}
