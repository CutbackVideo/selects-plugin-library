import { STAGE_IDS, type Job, type StageId, type StageStatus } from "../jobs/store.ts";
import { rebuildBlocker } from "../jobs/rebuild.ts";
import { explainFailure, type Failure } from "./failure.ts";
import { t, type MessageKey } from "./messages.ts";

export type StageRow = {
  id: StageId;
  label: string;
  status: StageStatus;
  seconds: number | null;
  note: string | null;
  error: string | null;
  failure: Failure | null;
  fallbacks: string[];
};

export const stageLabel = (id: StageId): string => t(("stage." + id) as MessageKey);

export function stageRows(job: Job | null, now = Date.now(), interrupted = false): StageRow[] {
  return STAGE_IDS.map((id) => {
    const s = job?.stages[id];
    const status: StageStatus = s?.status ?? "pending";
    const prefix = id + ": ";
    const fallbacks = (job?.fallbacks ?? []).filter((f) => f.startsWith(prefix)).map((f) => f.slice(prefix.length));
    if (interrupted && status === "running") {
      return { id, label: stageLabel(id), status: "canceled", seconds: null, note: t("row.interrupted"), error: null, failure: null, fallbacks };
    }
    let seconds: number | null = null;
    if (s?.startedAt && (status === "running" || s.finishedAt)) {
      const end = status === "running" ? now : (s.finishedAt as number);
      seconds = Math.max(0, Math.round((end - s.startedAt) / 1000));
    }
    const stopped = status === "failed" || status === "canceled";
    const error = stopped ? s?.error ?? null : null;
    return { id, label: stageLabel(id), status, seconds, note: s?.note ?? null, error, failure: stopped ? explainFailure(id, error) : null, fallbacks };
  });
}

export function canResume(job: Job | null, lease: "free" | "live" | "stale" = "free"): boolean {
  if (!job || job.status === "done" || lease === "live") return false;
  return true;
}

export function leasePollNeeded(s: { busy: boolean; job: Job | null; lease: "free" | "live" | "stale" }, projectId: string | null): boolean {
  return !s.busy && !!s.job && s.job.projectId === projectId && s.lease === "live";
}

export function visibleError(s: { error: string; errorDraftId?: string | null }, sequenceId: string | null): string {
  if (!s.error) return "";
  return s.errorDraftId && s.errorDraftId !== sequenceId ? "" : s.error;
}

export function leaseHeldText(freeAt: number | null, now = Date.now()): string {
  if (freeAt == null) return t("lease.held");
  const s = Math.max(0, Math.round((freeAt - now) / 1000));
  return s <= 1 ? t("lease.heldSoon") : t("lease.heldIn", { seconds: s });
}

export function statusIcon(status: StageStatus): "check" | "loading" | "error" | "close" | "info" | "clock" {
  switch (status) {
    case "done":
      return "check";
    case "running":
      return "loading";
    case "failed":
      return "error";
    case "canceled":
      return "close";
    case "blocked":
      return "info";
    default:
      return "clock";
  }
}

const STATUS_KEY: Record<Job["status"], MessageKey> = {
  new: "status.ready",
  running: "status.running",
  paused: "status.paused",
  failed: "status.stopped",
  canceled: "status.canceled",
  done: "status.finished",
};

export function summaryLine(job: Job | null, interrupted = false): string {
  if (!job) return "";
  const done = STAGE_IDS.filter((id) => job.stages[id]?.status === "done").length;
  const status = interrupted ? t("status.interrupted") : STATUS_KEY[job.status] ? t(STATUS_KEY[job.status]) : job.status;
  return t("summary.line", { status, done, total: STAGE_IDS.length, job: job.jobId.slice(-6) });
}

export type ViewState = {
  busy: boolean;
  action: string | null;
  canceling?: boolean;
  job: Job | null;
  lease: "free" | "live" | "stale";
};

export type PanelActions = {
  showJob: boolean;
  interrupted: boolean;
  make: boolean;
  resume: boolean;
  rebuild: boolean;
  rebuildWhy: string | null;
  cancel: boolean;
  canceling: boolean;
  heldElsewhere: boolean;
  unfinishedHere: boolean;
};

export function panelActions(s: ViewState, context: { projectId: string | null; sequenceId: string | null }): PanelActions {
  const showJob = !!s.job && s.job.projectId === context.projectId;
  const job = showJob ? s.job! : null;
  const idle = !s.busy;
  const interrupted = idle && !!job && job.status === "running" && s.lease !== "live";
  const heldElsewhere = idle && !!job && s.lease === "live" && job.sourceDraftId === context.sequenceId;
  const blocked = job ? rebuildBlocker(job) : null;
  const running = s.busy && (s.action === "create" || s.action === "resume" || s.action === "rebuild");
  return {
    showJob,
    interrupted,
    make: idle && !!context.projectId && !!context.sequenceId && !heldElsewhere,
    resume: idle && !!job && canResume(job, s.lease),
    rebuild: idle && !!job && s.lease !== "live" && !blocked,
    rebuildWhy: idle && job && s.lease !== "live" ? blocked : null,
    cancel: running,
    canceling: running && !!s.canceling,
    heldElsewhere,
    unfinishedHere: idle && !!job && job.status !== "done" && job.sourceDraftId === context.sequenceId && s.lease !== "live",
  };
}
