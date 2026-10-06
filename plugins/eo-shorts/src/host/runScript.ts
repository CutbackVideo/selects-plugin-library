import type { PanelSdk, RunScriptAnswer } from "./types.ts";
import { errorMessage, sleep, throwIfAborted, AbortedError } from "./util.ts";

export const MAX_SCRIPT_BYTES = 262_144;
export const DEFAULT_BACKOFF_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

export type EditRecord = {
  sequenceId: string;
  committed: boolean;
  commitId?: string;
  createdDraft?: boolean;
  stagedEditId?: string;
  simulationOnly?: boolean;
  opCounts?: Record<string, number>;
};

export type ExportStarted = { workflowId: string; outPath: string };

export type ErrorKind =
  | "not-started"
  | "deadline"
  | "transport"
  | "compile"
  | "too-large"
  | "result-too-large"
  | "transient"
  | "runtime";

export type ScriptReport = {
  ok: boolean;
  result: unknown;
  error: string | null;
  kind: ErrorKind | null;
  code: string | null;
  hint: string | null;
  edits: EditRecord[];
  exports: { video: ExportStarted[]; audio: ExportStarted[]; failures: string[]; inFlightUnknown: number };
  hostWaitMs: number | null;
  durationMs: number | null;
  logs: unknown[];
  raw: string;
};

export function parseLeadingJson(text: string): unknown {
  const s = String(text ?? "");
  const start = s.indexOf("{");
  if (start < 0) return undefined;
  for (let end = s.lastIndexOf("}"); end > start; end = s.lastIndexOf("}", end - 1)) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch {
    }
  }
  return undefined;
}

const TRANSIENT = /ECONNRESET|ECONNREFUSED|EPIPE|socket hang ?up|fetch failed|temporarily|try again|busy|No valid session|renderer (?:is )?not ready/i;

export function isNotStarted(error: string, report: Record<string, unknown> | null): boolean {
  if (/exceeded before the script started/i.test(error)) return true;
  if (!report || !/before the script started/i.test(error)) return false;
  const nonEmpty = (v: unknown) => Array.isArray(v) && v.length > 0;
  if (nonEmpty(report.edits) || nonEmpty(report.logs) || report.exportOps != null) return false;
  const duration = report.durationMs;
  const wait = typeof report.hostWaitMs === "number" ? report.hostWaitMs : null;
  const deadlineS = Number(/within the (\d+(?:\.\d+)?)\s*s deadline/i.exec(error)?.[1] ?? NaN);
  const waitedWholeDeadline = wait != null && Number.isFinite(deadlineS) ? wait >= deadlineS * 1000 - 1000 : null;
  if (waitedWholeDeadline === false) return false;
  if (duration === 0) return true;
  return duration == null && waitedWholeDeadline === true;
}

export function classifyError(error: string, report: Record<string, unknown> | null): ErrorKind {
  if (isNotStarted(error, report)) return "not-started";
  if (/Script too large/i.test(error)) return "too-large";
  if (/TypeScript check failed|Script compilation failed/i.test(error)) return "compile";
  if (/did not finish within|deadline/i.test(error)) return "deadline";
  if (!report) return "transport";
  if (TRANSIENT.test(error)) return "transient";
  return "runtime";
}

export function decodeReport(answer: RunScriptAnswer | null | undefined): ScriptReport {
  const raw = String(answer?.output ?? "");
  const parsed = parseLeadingJson(raw);
  const rep = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const edits = Array.isArray(rep?.edits) ? (rep!.edits as EditRecord[]).filter((e) => e && typeof e.sequenceId === "string") : [];
  const ops = (rep?.exportOps ?? {}) as Record<string, unknown>;
  const list = (v: unknown): ExportStarted[] => (Array.isArray(v) ? (v as ExportStarted[]).filter((x) => x && typeof x.workflowId === "string") : []);
  const exports = {
    video: list(ops.videoExportsStarted),
    audio: list(ops.audioExportsStarted),
    failures: Array.isArray(ops.failures) ? (ops.failures as unknown[]).map(String) : [],
    inFlightUnknown: Number(ops.inFlightUnknown ?? 0) || 0,
  };
  const base = {
    edits,
    exports,
    hostWaitMs: typeof rep?.hostWaitMs === "number" ? (rep.hostWaitMs as number) : null,
    durationMs: typeof rep?.durationMs === "number" ? (rep.durationMs as number) : null,
    logs: Array.isArray(rep?.logs) ? (rep!.logs as unknown[]) : [],
    hint: typeof rep?.hint === "string" ? (rep.hint as string) : null,
    code: typeof rep?.code === "string" ? (rep.code as string) : null,
    raw,
  };
  const failedSide = answer?.isError === true || (rep != null && "error" in rep && !("result" in rep));
  if (!failedSide && rep && "result" in rep) {
    return { ok: true, result: rep.result !== undefined ? rep.result : answer?.result, error: null, kind: null, ...base };
  }
  if (!failedSide && rep && "clipped" in rep) {
    const c = (rep.clipped ?? {}) as { totalBytes?: number };
    return {
      ok: false,
      result: undefined,
      error: "The script's return value (" + (c.totalBytes ?? "?") + " bytes) is over the 256 KiB cap; return less.",
      kind: "result-too-large",
      ...base,
    };
  }
  const error = rep && rep.error != null ? String(rep.error) : raw.trim().slice(0, 600) || "run_script failed without a report.";
  return { ok: false, result: undefined, error, kind: classifyError(error, rep), ...base };
}

export class ScriptError extends Error {
  summary: string;
  report: ScriptReport | null;
  kind: ErrorKind | "committed-unverified" | "verify-failed";
  attempts: number;
  constructor(summary: string, message: string, kind: ScriptError["kind"], report: ScriptReport | null, attempts: number) {
    super(summary + ": " + message + (attempts > 1 ? " (after " + attempts + " tries)" : ""));
    this.name = "ScriptError";
    this.summary = summary;
    this.kind = kind;
    this.report = report;
    this.attempts = attempts;
  }
  get committed(): EditRecord[] {
    return (this.report?.edits ?? []).filter((e) => e.committed);
  }
}

export type VerifyVerdict = "done" | "retry" | "fail";

export type RunScriptOptions = {
  summary: string;
  script: string;
  allowCommit?: boolean;
  signal?: AbortSignal | null;
  backoffMs?: number[];
  verify?: (failed: ScriptReport, attempt: number) => Promise<VerifyVerdict>;
  onAttempt?: (info: { attempt: number; ok: boolean; kind: ErrorKind | null; error: string | null; committed: EditRecord[]; hostWaitMs: number | null; ms: number }) => void;
  sleepFn?: (ms: number, signal?: AbortSignal | null) => Promise<void>;
};

export type RunScriptOutcome<T> = {
  result: T;
  report: ScriptReport;
  attempts: number;
  recoveredBy: "verify" | null;
  committed: EditRecord[];
};

export function scriptBytes(script: string): number {
  return new TextEncoder().encode(script).length;
}

export async function runScript<T = unknown>(sdk: PanelSdk, opts: RunScriptOptions): Promise<RunScriptOutcome<T>> {
  const backoff = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  const wait = opts.sleepFn ?? sleep;
  const bytes = scriptBytes(opts.script);
  if (bytes > MAX_SCRIPT_BYTES) {
    throw new ScriptError(opts.summary, "the script is " + bytes + " bytes, over the " + MAX_SCRIPT_BYTES + "-byte limit", "too-large", null, 0);
  }
  for (let attempt = 1; ; attempt += 1) {
    throwIfAborted(opts.signal);
    const t0 = Date.now();
    let answer: RunScriptAnswer | null = null;
    let thrown: unknown = null;
    try {
      answer = await sdk.runScript({ script: opts.script, summary: opts.summary, allowCommit: opts.allowCommit === true });
    } catch (e) {
      thrown = e;
    }
    const report = thrown != null ? decodeReport({ output: errorMessage(thrown), isError: true }) : decodeReport(answer);
    if (thrown != null) report.kind = "transport";
    const committed = report.edits.filter((e) => e.committed);
    opts.onAttempt?.({ attempt, ok: report.ok, kind: report.kind, error: report.error, committed, hostWaitMs: report.hostWaitMs, ms: Date.now() - t0 });
    if (report.ok) return { result: report.result as T, report, attempts: attempt, recoveredBy: null, committed };

    const kind = report.kind as ErrorKind;
    const budgetLeft = attempt <= backoff.length;
    const maySaved = opts.allowCommit === true && (committed.length > 0 || kind === "transport" || report.exports.inFlightUnknown > 0);

    if (maySaved) {
      if (!opts.verify) {
        throw new ScriptError(
          opts.summary,
          (committed.length ? "failed after saving commit " + committed.map((c) => c.commitId ?? c.sequenceId).join(", ") : "failed and may have saved") +
            ": " + report.error,
          "committed-unverified",
          report,
          attempt,
        );
      }
      throwIfAborted(opts.signal);
      const verdict = await opts.verify(report, attempt);
      if (verdict === "done") return { result: undefined as T, report, attempts: attempt, recoveredBy: "verify", committed };
      if (verdict === "fail" || !budgetLeft) throw new ScriptError(opts.summary, report.error ?? "failed", "verify-failed", report, attempt);
      await wait(backoff[attempt - 1], opts.signal);
      continue;
    }

    const retryable =
      kind === "not-started" ||
      (opts.allowCommit !== true && (kind === "transport" || kind === "deadline" || kind === "transient")) ||
      (opts.allowCommit === true && kind === "deadline" && committed.length === 0 && attempt === 1);
    if (!retryable || !budgetLeft) throw new ScriptError(opts.summary, report.error ?? "failed", kind, report, attempt);
    await wait(backoff[attempt - 1], opts.signal);
  }
}

export async function readScript<T = unknown>(sdk: PanelSdk, summary: string, script: string, opts: Partial<RunScriptOptions> & { allowUndefined?: boolean } = {}): Promise<T> {
  const out = await runScript<T>(sdk, { ...opts, summary, script, allowCommit: false });
  if (out.result === undefined && !opts.allowUndefined) throw new ScriptError(summary, "the script returned no value", "runtime", out.report, out.attempts);
  return out.result;
}

export const lit = (v: unknown): string => JSON.stringify(v);

export { AbortedError };
