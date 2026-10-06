import type { StageContext, StageImpl, StageResult } from "../../jobs/runner.ts";
import { inputShaFrom } from "../../jobs/receipts.ts";
import { ensureDir, readJsonIfExists, removeFile, statFile, writeJsonAtomic } from "../../host/fs.ts";
import type { HostFs } from "../../host/types.ts";
import { errorMessage } from "../../host/util.ts";
import { ExportFailedError, readWorkflow, startExport, waitForExport, type ExportDone, type VideoResolution, type WorkflowSnapshot } from "../../host/workflows.ts";
import { precheckExport, type ComposedScene, type ExportCheck } from "./precheck.ts";

export const EXPORT_STAGE_VERSION = "eo-export-stage/2";

export const EXPORT_REL = { receipt: "export/receipt.json", compose: "compose/compose.json" };

export const finalRel = (inputSha: string | null): string => "export/final-" + (inputSha ?? "x").slice(0, 12) + ".mp4";

export const MTIME_SLACK_MS = 2000;

export type ExportStageOptions = {
  resolution?: VideoResolution;
  timeoutMs?: number;
  intervalMs?: number;
  backoffMs?: number[];
  sleepFn?: (ms: number, signal?: AbortSignal | null) => Promise<void>;
};

export type ExportReceipt = {
  schema: "eo-export/1";
  jobId: string;
  projectId: string;
  draftId: string;
  workflowId: string;
  outPath: string;
  file: string;
  resolution: VideoResolution;
  startedAt: number;
  resumed: boolean;
  via: ExportDone["via"];
  lastStatus: string;
  polls: number;
  waitMs: number;
  bytes: number;
  probe: ExportDone["probe"];
  draft: { fps: number; frameSize: { width: number; height: number }; mainEnd: number; seconds: number; graphics: number; clips: number };
  pictures: { checked: number; files: number };
  warnings: string[];
};

export function createExportStage(o: ExportStageOptions = {}): StageImpl {
  return {
    id: "export",
    inputSha: (ctx) => inputShaFrom(ctx.host.fs, ctx.dir, ["compose", "sound"], { version: EXPORT_STAGE_VERSION, draftId: ctx.job.draftId, resolution: o.resolution ?? "FHD" }),
    run: (ctx) => runExport(ctx, o),
  };
}

export const exportStage: StageImpl = createExportStage();

const EXPORT_MP4 = /^(final(-[0-9a-fx]+)?|render-[0-9a-fx]+)\.mp4$/;

function removeOtherExports(ctx: StageContext, keepRel: string): void {
  const fs = ctx.host.fs;
  for (const name of fs.readdirSync(ctx.path("export"))) if (EXPORT_MP4.test(name) && "export/" + name !== keepRel) removeFile(fs, ctx.path("export/" + name));
}

export function writtenSince(fs: HostFs, path: string, since: number | null): boolean {
  const st = statFile(fs, path);
  return !!st && st.size > 0 && since != null && st.mtimeMs >= since - MTIME_SLACK_MS;
}

const msOf = (v: string | null | undefined): number | null => {
  const n = Number(v);
  return v != null && Number.isFinite(n) && n > 0 ? n : null;
};

const pct = (s: WorkflowSnapshot) => (s.progress != null ? " " + Math.round(s.progress * 100) + "%" : "");

export function resumable(s: WorkflowSnapshot, fileExists: boolean): boolean {
  if (s.status === "failed" || s.status === "canceled" || s.status === "canceling") return false;
  if (s.status === "missing" || s.status === "unknown" || s.status === "succeeded") return fileExists;
  return true;
}

function clearPending(ctx: StageContext): void {
  ctx.job.pending.exportWorkflowId = null;
  ctx.job.pending.exportFor = null;
  ctx.job.pending.exportStartedAt = null;
}

async function runExport(ctx: StageContext, o: ExportStageOptions): Promise<StageResult> {
  const { host, job } = ctx;
  const fs = host.fs;
  const rs = { signal: ctx.signal, backoffMs: o.backoffMs };
  if (!job.draftId) throw new Error("The job has no EO draft yet (the edit stage makes it).");
  const composed = await readJsonIfExists<{ guard?: { mainEnd?: number }; scenes?: ComposedScene[] } | null>(fs, ctx.path(EXPORT_REL.compose), null);
  if (!composed?.scenes) throw new Error("The scenes have not been built yet (compose/compose.json is missing).");
  const warnings: string[] = [];
  const warn = (m: string) => {
    if (!warnings.includes(m)) warnings.push(m);
    ctx.warn(m);
  };

  if (typeof host.sdk.call === "function") {
    const allowed = await host.sdk.call<boolean>("canAuthorGeneratedMedia").catch(() => null);
    if (allowed === false) throw new Error("Generated-media authoring is off for this account, so the graphics would export broken.");
  }

  ctx.note("Checking the draft before export…");
  const check: ExportCheck = await precheckExport(host.sdk, fs, { projectId: job.projectId, draftId: job.draftId, composeDir: ctx.path("compose"), scenes: composed.scenes, expectMainEnd: composed.guard?.mainEnd ?? null, ...rs });
  check.warnings.forEach(warn);
  if (!check.ok) throw new Error(check.problems.join(" "));
  const d = check.draft;
  const seconds = d.mainEnd / d.fps;

  ensureDir(fs, ctx.path("export"));
  const inputSha = job.stages.export?.inputSha ?? null;
  const rel = finalRel(inputSha);
  const outPath = ctx.path(rel);
  const resolution = o.resolution ?? "FHD";
  let workflowId: string | null = null;
  let startedAt: number | null = null;
  let resumed = false;
  const pendingId = job.pending.exportWorkflowId;
  if (pendingId && inputSha && job.pending.exportFor === inputSha) {
    const since = msOf(job.pending.exportStartedAt);
    if (fs.existsSync(outPath) && !writtenSince(fs, outPath, since)) {
      removeFile(fs, outPath);
      await ctx.event("export-stale-file", { workflowId: pendingId, file: rel, removed: !fs.existsSync(outPath) });
    }
    const snap = since != null ? await readWorkflow(host.sdk, job.projectId, pendingId, rs).catch(() => null) : null;
    if (snap && resumable(snap, fs.existsSync(outPath))) {
      workflowId = pendingId;
      startedAt = since;
      resumed = true;
      await ctx.event("export-resume", { workflowId, status: snap.status });
    } else {
      await ctx.event("export-abandon", { workflowId: pendingId, status: snap?.status ?? (since == null ? "no start time" : "unreadable"), error: snap?.lastErrorMessage ?? null });
      if (snap?.status === "failed") warn("The earlier export failed (" + (snap.lastErrorMessage ?? "no message") + "); exporting again.");
    }
  } else if (pendingId) {
    await ctx.event("export-abandon", { workflowId: pendingId, status: "superseded", exportFor: job.pending.exportFor ?? null });
  }
  if (!workflowId) {
    removeFile(fs, outPath);
    if (fs.existsSync(outPath)) throw new Error("Cannot remove the earlier file at " + outPath + " to export again (is it open in another app?).");
    ctx.note("Starting the export…");
    const started = await startExport(host.sdk, "video", { projectId: job.projectId, draftId: job.draftId, outPath, resolution }, { ...rs, fs });
    workflowId = started.workflowId;
    startedAt = started.startedAt;
    job.pending.exportWorkflowId = workflowId;
    job.pending.exportFor = inputSha;
    job.pending.exportStartedAt = String(startedAt);
    await ctx.saveJob();
    await ctx.event("export-start", { workflowId, outPath });
  }

  let done: ExportDone;
  try {
    done = await waitForExport(host.sdk, {
      projectId: job.projectId,
      workflowId,
      outPath,
      kind: "video",
      fs,
      runtime: host.runtime,
      expectDurationSec: seconds,
      toleranceSec: 1 / d.fps + 0.01,
      intervalMs: o.intervalMs,
      timeoutMs: o.timeoutMs ?? 15 * 60_000,
      signal: ctx.signal,
      tmpDir: ctx.path("export"),
      sleepFn: o.sleepFn,
      onProgress: (s) => ctx.note("Exporting… " + (s.step ?? s.status) + pct(s)),
    });
  } catch (e) {
    if (e instanceof ExportFailedError) {
      clearPending(ctx);
      await ctx.saveJob();
    }
    throw e instanceof Error ? e : new Error(errorMessage(e));
  }
  if (!writtenSince(fs, outPath, startedAt)) {
    removeFile(fs, outPath);
    clearPending(ctx);
    await ctx.saveJob();
    await ctx.event("export-stale-file", { workflowId, file: rel, via: done.via, lastStatus: done.lastStatus });
    throw new Error("The app reported the export finished, but " + rel + " is older than the export, so the app did not write it. Resume exports again.");
  }
  removeOtherExports(ctx, rel);

  const receipt: ExportReceipt = {
    schema: "eo-export/1",
    jobId: job.jobId,
    projectId: job.projectId,
    draftId: job.draftId,
    workflowId,
    outPath,
    file: rel,
    resolution,
    startedAt: startedAt ?? 0,
    resumed,
    via: done.via,
    lastStatus: done.lastStatus,
    polls: done.polls,
    waitMs: done.ms,
    bytes: done.bytes,
    probe: done.probe,
    draft: { fps: d.fps, frameSize: d.frameSize, mainEnd: d.mainEnd, seconds, graphics: d.graphics, clips: d.clips },
    pictures: { checked: check.pictures.checked, files: check.pictures.files },
    warnings,
  };
  await writeJsonAtomic(fs, ctx.path(EXPORT_REL.receipt), receipt);
  clearPending(ctx);
  await ctx.saveJob();
  const v = done.probe?.video;
  return {
    outputs: [EXPORT_REL.receipt, rel],
    note: rel.slice("export/".length) + ", " + seconds.toFixed(1) + " s" + (v ? ", " + v.width + "x" + v.height : "") + (resumed ? " (resumed)" : ""),
    data: { workflowId, file: rel, via: done.via, resumed, bytes: done.bytes, waitMs: done.ms, pictures: check.pictures.checked },
  };
}
