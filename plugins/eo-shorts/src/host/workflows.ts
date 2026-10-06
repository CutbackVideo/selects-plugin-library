import type { HostFs, HostRuntime, PanelSdk } from "./types.ts";
import { lit, readScript, runScript, ScriptError, type ScriptReport } from "./runScript.ts";
import { probeMedia, type MediaProbe } from "./ffmpeg.ts";
import { errorMessage, sleep, throwIfAborted } from "./util.ts";
import { statFile } from "./fs.ts";

export type ExportKind = "video" | "audio";
export type VideoResolution = "4K" | "FHD" | "HD" | "SD";
export type WorkflowState = "unknown" | "canceling" | "queued" | "running" | "succeeded" | "failed" | "canceled" | "missing";
export type WorkflowSnapshot = { status: WorkflowState; step: string | null; progress: number | null; lastErrorMessage: string | null; listed: boolean };

export class ExportFailedError extends Error {
  status: WorkflowState;
  workflowId: string;
  constructor(workflowId: string, status: WorkflowState, message: string) {
    super(message);
    this.name = "ExportFailedError";
    this.workflowId = workflowId;
    this.status = status;
  }
}

export function exportErrorHint(message: string | null | undefined): string {
  const m = String(message || "");
  if (/code 234|WavPack|invalid block size/i.test(m)) {
    return "The ffmpeg in this Selects could not write the mixed audio (WavPack, exit 234); update Selects, then try again.";
  }
  return "";
}

export function exportScript(kind: ExportKind, input: { projectId: string; draftId: string; outPath: string; resolution?: VideoResolution }): string {
  const call =
    kind === "video"
      ? "selects.export.video({projectId:" + lit(input.projectId) + ",draftSequenceId:" + lit(input.draftId) + ",outPath:" + lit(input.outPath) + ",resolution:" + lit(input.resolution ?? "FHD") + "})"
      : "selects.export.audio({projectId:" + lit(input.projectId) + ",draftSequenceId:" + lit(input.draftId) + ",outPath:" + lit(input.outPath) + "})";
  return "const job = await " + call + ";\nreturn { workflowId: job.workflowId, outPath: job.outPath };";
}

export function workflowReadScript(projectId: string, workflowId: string): string {
  return [
    "const p = selects.project(" + lit(projectId) + ");",
    "const list = await p.workflows();",
    "const w = list.find((x) => x.workflowId === " + lit(workflowId) + ");",
    "let s = null;",
    "if (!w) { try { s = await selects.workflow(" + lit(workflowId) + ").status(); } catch (e) { s = { status: 'unknown' }; } }",
    "const pick = (x) => x ? { status: x.status, step: x.step ?? null, progress: x.progress ?? null, lastErrorMessage: x.lastErrorMessage ?? null } : null;",
    "return { listed: !!w, w: pick(w), s: pick(s) };",
  ].join("\n");
}

export async function readWorkflow(
  sdk: PanelSdk,
  projectId: string,
  workflowId: string,
  opts: { signal?: AbortSignal | null; backoffMs?: number[]; sleepFn?: (ms: number, signal?: AbortSignal | null) => Promise<void> } = {},
): Promise<WorkflowSnapshot> {
  type R = { listed: boolean; w: Partial<WorkflowSnapshot> | null; s: Partial<WorkflowSnapshot> | null };
  const r = await readScript<R>(sdk, "Read export progress", workflowReadScript(projectId, workflowId), opts);
  const src = (r.listed ? r.w : r.s) || {};
  const status = (r.listed ? src.status : src.status ?? "missing") as WorkflowState;
  return {
    status: status || "unknown",
    step: src.step ?? null,
    progress: typeof src.progress === "number" ? src.progress : null,
    lastErrorMessage: src.lastErrorMessage ?? null,
    listed: !!r.listed,
  };
}

export function startedExport(report: ScriptReport | null, kind: ExportKind, outPath: string): { workflowId: string; outPath: string } | null {
  if (!report) return null;
  const list = kind === "video" ? report.exports.video : report.exports.audio;
  return list.find((x) => x.outPath === outPath) ?? list[0] ?? null;
}

export type StartedExport = { workflowId: string; outPath: string; startedAt: number };

export async function startExport(
  sdk: PanelSdk,
  kind: ExportKind,
  input: { projectId: string; draftId: string; outPath: string; resolution?: VideoResolution },
  opts: { signal?: AbortSignal | null; backoffMs?: number[]; fs?: HostFs } = {},
): Promise<StartedExport> {
  const startedAt = Date.now();
  let lastReport: ScriptReport | null = null;
  try {
    const out = await runScript<{ workflowId?: string; outPath?: string }>(sdk, {
      summary: kind === "video" ? "Export the EO short" : "Export the draft's audio",
      script: exportScript(kind, input),
      allowCommit: true,
      signal: opts.signal,
      backoffMs: opts.backoffMs,
      verify: async (failed) => {
        lastReport = failed;
        if (startedExport(failed, kind, input.outPath)) return "done";
        if (failed.kind === "transport" && opts.fs && opts.fs.existsSync(input.outPath)) return "fail";
        return failed.kind === "transport" ? "retry" : "fail";
      },
    });
    const id = out.result?.workflowId ?? startedExport(out.report, kind, input.outPath)?.workflowId;
    if (!id) throw new ScriptError("Start export", "the app did not return a workflow id", "runtime", out.report, out.attempts);
    return { workflowId: id, outPath: out.result?.outPath ?? input.outPath, startedAt };
  } catch (e) {
    const started = startedExport(lastReport ?? (e instanceof ScriptError ? e.report : null), kind, input.outPath);
    if (started) return { ...started, startedAt };
    throw e;
  }
}

export type WaitOptions = {
  projectId: string;
  workflowId: string;
  outPath: string;
  kind: ExportKind;
  fs: HostFs;
  runtime?: HostRuntime | null;
  expectDurationSec?: number | null;
  toleranceSec?: number;
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal | null;
  tmpDir?: string;
  onProgress?: (snap: WorkflowSnapshot) => void;
  sleepFn?: (ms: number, signal?: AbortSignal | null) => Promise<void>;
  now?: () => number;
};

export type ExportDone = { via: "workflow" | "file"; polls: number; ms: number; bytes: number; probe: MediaProbe | null; lastStatus: WorkflowState };

export async function waitForExport(sdk: PanelSdk, o: WaitOptions): Promise<ExportDone> {
  const now = o.now ?? Date.now;
  const wait = o.sleepFn ?? sleep;
  const t0 = now();
  const interval = Math.min(o.intervalMs ?? 1500, 2000);
  const timeout = o.timeoutMs ?? 15 * 60_000;
  const tolerance = o.toleranceSec ?? 1001 / 24000 + 0.01;
  let polls = 0;
  let lastSize = -1;
  let readFailures = 0;
  let last: WorkflowSnapshot = { status: "unknown", step: null, progress: null, lastErrorMessage: null, listed: false };

  const checkFile = async (requireStable: boolean): Promise<ExportDone | null> => {
    const st = statFile(o.fs, o.outPath);
    if (!st || st.size <= 0) {
      lastSize = -1;
      return null;
    }
    const stable = st.size === lastSize;
    lastSize = st.size;
    if (requireStable && !stable) return null;
    let probe: MediaProbe | null = null;
    if (o.runtime) {
      try {
        probe = await probeMedia(o.runtime, o.outPath, { signal: o.signal, fs: o.fs, tmpDir: o.tmpDir });
      } catch (e) {
        if (requireStable) return null;
        throw new Error("The export finished but its file cannot be read: " + errorMessage(e));
      }
      if (o.expectDurationSec != null) {
        const d = probe.durationSec;
        if (d == null || Math.abs(d - o.expectDurationSec) > tolerance) {
          if (requireStable) return null;
          throw new Error("The exported file is " + (d ?? "?") + " s long, expected " + o.expectDurationSec.toFixed(3) + " s.");
        }
      }
    } else if (requireStable) {
      return null;
    }
    return { via: requireStable ? "file" : "workflow", polls, ms: now() - t0, bytes: st.size, probe, lastStatus: last.status };
  };

  for (;;) {
    throwIfAborted(o.signal);
    polls += 1;
    try {
      last = await readWorkflow(sdk, o.projectId, o.workflowId, { signal: o.signal, backoffMs: [1000, 3000], sleepFn: o.sleepFn });
      readFailures = 0;
    } catch (e) {
      if (o.signal?.aborted) throw e;
      readFailures += 1;
      if (readFailures >= 5) throw new Error("Could not read the export's progress: " + errorMessage(e));
      last = { ...last, status: "unknown" };
    }
    o.onProgress?.(last);
    if (last.status === "succeeded") {
      const done = await checkFile(false);
      if (done) return done;
    } else if (last.status === "failed" || last.status === "canceled") {
      const hint = exportErrorHint(last.lastErrorMessage);
      throw new ExportFailedError(
        o.workflowId,
        last.status,
        "The export " + last.status + (last.lastErrorMessage ? ": " + last.lastErrorMessage : ".") + (hint ? " " + hint : ""),
      );
    } else if (last.status === "unknown" || last.status === "missing") {
      const done = await checkFile(true);
      if (done) return done;
    }
    if (now() - t0 > timeout) {
      const span = timeout >= 120_000 ? Math.round(timeout / 60000) + " min" : Math.round(timeout / 1000) + " s";
      throw new Error("The export did not finish within " + span + " (last status " + last.status + ").");
    }
    await wait(interval, o.signal);
  }
}
