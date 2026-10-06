import { sleep as defaultSleep, throwIfAborted, errorMessage } from "../host/util.ts";

export type GenScope = { libraryId: string; projectId: string };

export type GenOutput = { outputIndex: number; status: string; resourceId?: string; path?: string };

export type GenJobRow = {
  jobId: string;
  outputName?: string;
  origin?: { tool?: string; tab?: string; recipeId?: string };
  status: string;
  lastKnownStatus?: string;
  deliveryStatus: string;
  errorCode?: string;
  errorIssues?: { path: string; code: string; message: string }[];
  cancelRequested?: boolean;
  chargedCredits?: string;
  pluginDelivery?: true;
  outputs?: GenOutput[];
};

export type GenSubmitRequest = {
  scope: GenScope;
  key: string;
  modelId: string;
  input: Record<string, unknown>;
  uploads: Record<string, unknown>;
  outputName: string;
  batch: number;
  origin: { tool: "image" | "video" | "audio"; tab: string; recipeId: string };
  delivery?: { pluginFolder: string };
};

export type MediaGenerationLike = {
  isAvailable(): boolean;
  supportsPluginFiles?(): boolean;
  submit(request: GenSubmitRequest): Promise<{ jobIds: string[] }>;
  list(scope: GenScope): Promise<GenJobRow[]>;
  cancel(scope: GenScope, jobId: string): Promise<void>;
  retryDelivery(scope: GenScope, jobId: string): Promise<void>;
};

export const PANEL_TAB = "eo-shorts";
export const DISPATCH_LIMIT_MS = 10 * 60_000;
export const POLL_MS = 2_000;
export const MAX_REDELIVERIES = 3;
export const MISSING_ROW_MS = 60_000;
export const MISSING_ROW_READS = 3;

const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
const JOB_ID_RE = /^selects-[a-f0-9]{64}$/;
const FAILED = new Set(["failed", "input_failed", "submission_rejected", "upload_failed", "handoff_failed"]);
const CANCELED = new Set(["cancelled", "canceled", "canceling"]);
const REDELIVERABLE = new Set(["download_failed", "result_collection_failed", "import_failed", "delivery_failed", "partial"]);

export type GenErrorKind = "unavailable" | "stuck" | "failed" | "canceled" | "timeout" | "unknown" | "rejected";

export class GenerationError extends Error {
  kind: GenErrorKind;
  code: string;
  jobId: string | null;
  constructor(kind: GenErrorKind, code: string, message: string, jobId: string | null = null) {
    super(message);
    this.name = "GenerationError";
    this.kind = kind;
    this.code = code;
    this.jobId = jobId;
  }
}

export function mediaGenerationService(di: Record<string, any> | null | undefined): MediaGenerationLike {
  const mg = di?.MediaGeneration;
  const methods = ["isAvailable", "submit", "list", "cancel", "retryDelivery"];
  if (!mg || methods.some((m) => typeof mg[m] !== "function")) {
    throw new GenerationError("unavailable", "generation_update_required", "This Selects build cannot generate pictures for plug-ins. Update Selects.");
  }
  let available = false;
  try {
    available = !!mg.isAvailable();
  } catch {
    available = false;
  }
  if (!available) throw new GenerationError("unavailable", "generation_unavailable", "Picture generation is not available for this account.");
  let pluginFiles = false;
  try {
    pluginFiles = typeof mg.supportsPluginFiles === "function" && !!mg.supportsPluginFiles();
  } catch {
    pluginFiles = false;
  }
  if (!pluginFiles) {
    throw new GenerationError("unavailable", "plugin_files_unsupported", "Generating pictures into plug-in files needs Selects 2.0.512 or later. Update Selects.");
  }
  return mg as MediaGenerationLike;
}

export function scopeFromPath(pathname: string | null | undefined, projectId: string): GenScope | null {
  const m = /\/libraries\/([^/?#]+)\/(?:projects|prep-project)\/([^/?#]+)(?:[/?#]|$)/.exec(String(pathname || ""));
  if (!m) return null;
  const lib = decodeURIComponent(m[1]);
  const pid = decodeURIComponent(m[2]);
  return pid === projectId ? { libraryId: lib, projectId } : null;
}

export type RowVerdict =
  | { kind: "delivered"; path: string }
  | { kind: "wait"; why: string }
  | { kind: "redeliver"; code: string }
  | { kind: "stuck"; code: string; cancel: boolean }
  | { kind: "failed"; code: string }
  | { kind: "canceled"; code: string };

export function judgeRow(row: GenJobRow | null | undefined, o: { sinceMs: number; redeliveries: number }): RowVerdict {
  if (!row) return { kind: "wait", why: "not listed yet" };
  const status = String(row.status || "");
  const delivery = String(row.deliveryStatus || "");
  const code = String(row.errorCode || status || delivery);
  if (row.cancelRequested || CANCELED.has(status)) return { kind: "canceled", code: row.errorCode || "cancelled" };
  if (delivery === "delivered") {
    const path = (row.outputs || []).find((x) => typeof x.path === "string" && x.path)?.path;
    return path ? { kind: "delivered", path } : { kind: "failed", code: "no_output" };
  }
  if (REDELIVERABLE.has(delivery)) {
    if (status === "succeeded" && o.redeliveries < MAX_REDELIVERIES) return { kind: "redeliver", code: delivery };
    return { kind: "failed", code: row.errorCode || delivery };
  }
  if (FAILED.has(status)) {
    if (/upload|handoff|submission_rejected|input_failed/.test(code + " " + status)) return { kind: "stuck", code, cancel: false };
    return { kind: "failed", code };
  }
  if (status === "submission_unknown" && row.errorCode && o.sinceMs > 45_000) return { kind: "stuck", code: row.errorCode, cancel: true };
  if (["preparing", "uploading", "submitting"].includes(status) && row.errorCode && o.sinceMs > 90_000) {
    return { kind: "stuck", code: row.errorCode, cancel: true };
  }
  return { kind: "wait", why: status === "unknown" ? "status unknown (last " + (row.lastKnownStatus || "?") + ")" : status + "/" + delivery };
}

export async function submitDraw(mg: MediaGenerationLike, request: GenSubmitRequest): Promise<string> {
  if (!KEY_RE.test(request.key)) throw new GenerationError("rejected", "bad_key", "Generation key " + JSON.stringify(request.key) + " is not valid.");
  let reply: { jobIds?: string[] } | null;
  try {
    reply = await mg.submit(request);
  } catch (e) {
    throw new GenerationError("rejected", errorMessage(e).slice(0, 120) || "submit_failed", "Generation was not accepted: " + errorMessage(e));
  }
  const id = reply?.jobIds?.[0];
  if (!id || !JOB_ID_RE.test(id)) throw new GenerationError("rejected", "generation_job_identity_invalid", "Generation returned no job id.");
  return id;
}

export type WaitOptions = {
  deadlineAt: number;
  submittedAt: number;
  signal?: AbortSignal | null;
  pollMs?: number;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal | null) => Promise<void>;
  fileExists?: (path: string) => boolean;
  onTick?: (verdict: RowVerdict, row: GenJobRow | null) => void;
};

export async function waitForDraw(mg: MediaGenerationLike, scope: GenScope, jobId: string, o: WaitOptions): Promise<{ path: string; row: GenJobRow }> {
  const now = o.now ?? Date.now;
  const wait = o.sleep ?? defaultSleep;
  const pollMs = o.pollMs ?? POLL_MS;
  let redeliveries = 0;
  let first = true;
  let absentSince: number | null = null;
  let absentReads = 0;
  for (;;) {
    throwIfAborted(o.signal);
    if (!first) await wait(pollMs, o.signal);
    first = false;
    let rows: GenJobRow[] | null = null;
    try {
      const got = await mg.list(scope);
      rows = Array.isArray(got) ? got : null;
      if (!rows) o.onTick?.({ kind: "wait", why: "list returned no rows" }, null);
    } catch (e) {
      o.onTick?.({ kind: "wait", why: "list failed: " + errorMessage(e) }, null);
    }
    const row = rows ? rows.find((r) => r && r.jobId === jobId) ?? null : null;
    if (rows && row) {
      absentSince = null;
      absentReads = 0;
    } else if (rows) {
      absentSince ??= now();
      absentReads += 1;
    }
    const sinceMs = now() - o.submittedAt;
    const v = judgeRow(row, { sinceMs, redeliveries });
    o.onTick?.(v, row);
    if (v.kind === "delivered") {
      if (!o.fileExists || o.fileExists(v.path)) return { path: v.path, row: row! };
      if (redeliveries >= MAX_REDELIVERIES) throw new GenerationError("failed", "delivered_file_missing", "The generated picture was delivered but its file is missing.", jobId);
      redeliveries += 1;
      await mg.retryDelivery(scope, jobId).catch(() => undefined);
      continue;
    }
    if (v.kind === "redeliver") {
      redeliveries += 1;
      await mg.retryDelivery(scope, jobId).catch(() => undefined);
      await wait(1000 * redeliveries, o.signal);
      continue;
    }
    if (v.kind === "stuck") {
      if (v.cancel) await mg.cancel(scope, jobId).catch(() => undefined);
      throw new GenerationError("stuck", v.code, "Generation stalled (" + v.code + ").", jobId);
    }
    if (v.kind === "failed") throw new GenerationError("failed", v.code, "Generation failed (" + v.code + ").", jobId);
    if (v.kind === "canceled") throw new GenerationError("canceled", v.code, "Generation was cancelled.", jobId);
    if (rows && !row && absentReads >= MISSING_ROW_READS && absentSince !== null && now() - absentSince >= MISSING_ROW_MS) {
      throw new GenerationError("unknown", "generation_history_missing", "The generation job is not in the app's list.", jobId);
    }
    if (now() >= o.deadlineAt) {
      await mg.cancel(scope, jobId).catch(() => undefined);
      throw new GenerationError("timeout", "dispatch_timeout", "Generation took longer than its 10-minute limit.", jobId);
    }
  }
}
