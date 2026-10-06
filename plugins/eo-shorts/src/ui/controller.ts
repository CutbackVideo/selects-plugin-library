import type { PanelSdk } from "../host/types.ts";
import { makeHost } from "../host/di.ts";
import { ensureDataRoots, pluginRoots, type PluginRoots } from "../host/roots.ts";
import { errorMessage } from "../host/util.ts";
import { createJob, eoOutputRefusal, findJobByDraft, listJobs, loadJob, newJob, newJobId, type Job } from "../jobs/store.ts";
import { appendEvent } from "../jobs/journal.ts";
import { newOwnerId, LeaseBusyError, leaseStatus, type LeaseState } from "../jobs/lease.ts";
import { runJob, type RebuildRequest, type RunOutcome, type StageRegistry } from "../jobs/runner.ts";
import { stageRegistry } from "../jobs/stages.ts";
import { rebuildBlocker, rebuildRequest } from "../jobs/rebuild.ts";
import { t } from "./messages.ts";

export type PanelContextLite = { projectId: string | null; sequenceId: string | null };

export type RunAction = "create" | "resume" | "rebuild";

export type PanelState = {
  busy: boolean;
  action: RunAction | null;
  canceling: boolean;
  job: Job | null;
  dir: string | null;
  projectId: string | null;
  lease: LeaseState;
  leaseFreeAt: number | null;
  film: "A" | "B";
  error: string;
  errorDraftId: string | null;
  message: string;
  startedAt: number;
  outcome: RunOutcome | null;
};

const initial: PanelState = {
  busy: false,
  action: null,
  canceling: false,
  job: null,
  dir: null,
  projectId: null,
  lease: "free",
  leaseFreeAt: null,
  film: "A",
  error: "",
  errorDraftId: null,
  message: "",
  startedAt: 0,
  outcome: null,
};

export const LEASE_POLL_MS = 10_000;

let state: PanelState = { ...initial };
let controller: AbortController | null = null;
const listeners = new Set<() => void>();
export const OWNER = newOwnerId();

export function getState(): PanelState {
  return state;
}
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
function set(patch: Partial<PanelState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export type Deps = {
  sdk: PanelSdk;
  di?: Record<string, any> | null;
  stages?: StageRegistry;
  roots?: PluginRoots;
  rebuild?: RebuildRequest;
};

function hostAndRoots(deps: Deps): { host: ReturnType<typeof makeHost>; roots: PluginRoots } {
  const host = makeHost(deps.sdk, deps.di);
  const roots = ensureDataRoots(host.fs, deps.roots ?? pluginRoots(host.fs));
  return { host, roots };
}

export function setFilm(film: "A" | "B"): void {
  set({ film });
}

export async function loadLatest(deps: Deps, projectId: string | null): Promise<void> {
  if (state.busy) return;
  if (!projectId) {
    set({ job: null, dir: null, projectId: null, lease: "free", leaseFreeAt: null });
    return;
  }
  try {
    const { host, roots } = hostAndRoots(deps);
    const jobs = await listJobs(host.fs, roots.jobs, projectId);
    const latest = jobs[0] ?? null;
    const lease = latest ? await leaseStatus(host.fs, latest.dir, host.now()) : null;
    if (state.busy) return;
    set({ job: latest?.job ?? null, dir: latest?.dir ?? null, projectId, lease: lease?.state ?? "free", leaseFreeAt: lease?.freeAt ?? null });
  } catch (e) {
    set({ error: errorMessage(e), projectId });
  }
}

export async function refreshShown(deps: Deps): Promise<void> {
  if (state.busy || !state.dir) return;
  const dir = state.dir;
  try {
    const { host } = hostAndRoots(deps);
    const lease = await leaseStatus(host.fs, dir, host.now());
    let job = state.job;
    try {
      job = await loadJob(host.fs, dir);
    } catch {
    }
    if (state.busy || state.dir !== dir) return;
    set({ job, lease: lease.state, leaseFreeAt: lease.freeAt });
  } catch {
  }
}

function outcomeMessage(outcome: RunOutcome, action: RunAction, job: Job): string {
  if (outcome.status === "done") return t(action === "rebuild" ? "outcome.rebuilt" : "outcome.done");
  if (outcome.status === "incomplete") return t("outcome.incomplete", { stage: outcome.stage ? t(("stage." + outcome.stage) as "stage.edit") : "" });
  if (outcome.status === "canceled") return t(action === "rebuild" && job.status !== "canceled" ? "outcome.rebuildCanceled" : "outcome.canceled");
  return "";
}

async function run(deps: Deps, job: Job, dir: string, action: RunAction): Promise<RunOutcome | null> {
  const { host, roots } = hostAndRoots(deps);
  controller = new AbortController();
  set({ busy: true, action, canceling: false, job, dir, projectId: job.projectId, lease: "free", leaseFreeAt: null, error: "", errorDraftId: null, message: "", startedAt: Date.now(), outcome: null });
  try {
    const outcome = await runJob({
      host,
      roots,
      dir,
      job,
      stages: deps.stages ?? stageRegistry(),
      signal: controller.signal,
      owner: OWNER,
      onUpdate: (j) => set({ job: { ...j, stages: { ...j.stages } } }),
      ...(action === "rebuild" ? { rebuild: deps.rebuild ?? rebuildRequest() } : {}),
    });
    const error = outcome.status === "failed" ? outcome.error ?? t("fail.generic") : outcome.status === "refused" ? outcome.error ?? "" : "";
    set({ outcome, message: outcomeMessage(outcome, action, job), error });
    return outcome;
  } catch (e) {
    set({ error: e instanceof LeaseBusyError ? e.message : t("error.run", { error: errorMessage(e) }) });
    return null;
  } finally {
    controller = null;
    set({ busy: false, action: null, canceling: false });
    await refreshShown(deps);
  }
}

export async function create(deps: Deps, context: PanelContextLite): Promise<RunOutcome | null> {
  if (state.busy) return null;
  if (!context.projectId || !context.sequenceId) {
    set({ error: t("error.noDraft") });
    return null;
  }
  try {
    const { host, roots } = hostAndRoots(deps);
    const refusal = eoOutputRefusal(await findJobByDraft(host.fs, roots.jobs, context.projectId, context.sequenceId), null);
    if (refusal) {
      set({ error: refusal, errorDraftId: context.sequenceId });
      return null;
    }
    const job = newJob({
      jobId: newJobId(host.now()),
      projectId: context.projectId,
      sourceDraftId: context.sequenceId,
      film: state.film,
      now: host.now(),
    });
    const dir = await createJob(host.fs, roots.jobs, job);
    await appendEvent(host.fs, dir, { type: "job-created", sourceDraftId: job.sourceDraftId, film: job.film }, host.now());
    return await run(deps, job, dir, "create");
  } catch (e) {
    set({ error: t("error.start", { error: errorMessage(e) }) });
    return null;
  }
}

export async function resume(deps: Deps): Promise<RunOutcome | null> {
  if (state.busy || !state.dir) return null;
  try {
    const { host } = hostAndRoots(deps);
    const job = await loadJob(host.fs, state.dir);
    await appendEvent(host.fs, state.dir, { type: "resume" }, host.now());
    return await run(deps, job, state.dir, "resume");
  } catch (e) {
    set({ error: t("error.resume", { error: errorMessage(e) }) });
    return null;
  }
}

export async function rebuild(deps: Deps): Promise<RunOutcome | null> {
  if (state.busy || !state.dir) return null;
  try {
    const { host } = hostAndRoots(deps);
    const job = await loadJob(host.fs, state.dir);
    const blocked = rebuildBlocker(job);
    if (blocked) {
      set({ error: blocked, errorDraftId: null });
      return null;
    }
    await appendEvent(host.fs, state.dir, { type: "rebuild" }, host.now());
    return await run(deps, job, state.dir, "rebuild");
  } catch (e) {
    set({ error: t("error.rebuild", { error: errorMessage(e) }) });
    return null;
  }
}

export function cancel(): void {
  if (!controller || state.canceling) return;
  set({ canceling: true });
  controller.abort(new Error("Canceled."));
}

export function resetForTests(): void {
  state = { ...initial };
  controller = null;
}
