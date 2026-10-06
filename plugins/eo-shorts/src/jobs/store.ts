import type { HostFs } from "../host/types.ts";
import type { ConfigLayer } from "../models/config.ts";
import { ensureDir, readJson, writeJsonAtomic, createExclusive } from "../host/fs.ts";
import { randomHex } from "../host/util.ts";

export const JOB_SCHEMA = "eo-job/1";

export const STAGE_IDS = ["preflight", "edit", "speaker", "plan", "media", "compose", "sound", "export", "diagnostics"] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const STAGE_LABELS: Record<StageId, string> = {
  preflight: "Check the clip",
  edit: "Tighten the talk",
  speaker: "Frame the speaker",
  plan: "Plan the scenes",
  media: "Find footage and pictures",
  compose: "Build the scenes",
  sound: "Music and loudness",
  export: "Export",
  diagnostics: "Check the result",
};

export const JOB_FOLDERS = ["receipts", "source", "edit", "speaker", "plan", "media", "compose", "sound", "export", "diagnostics"];

export type StageStatus = "pending" | "running" | "done" | "failed" | "canceled" | "blocked";

export type StageState = {
  status: StageStatus;
  inputSha?: string | null;
  receipt?: string | null;
  startedAt?: number | null;
  finishedAt?: number | null;
  error?: string | null;
  note?: string | null;
  runs?: number;
  warnings?: string[];
};

export type JobStatus = "new" | "running" | "paused" | "failed" | "canceled" | "done";

export type Job = {
  schema: typeof JOB_SCHEMA;
  jobId: string;
  projectId: string;
  sourceDraftId: string;
  sourceName: string | null;
  draftId: string | null;
  film: "A" | "B";
  status: JobStatus;
  stage: StageId | "done";
  stages: Partial<Record<StageId, StageState>>;
  versions: Record<string, string>;
  models: Record<string, { provider: string; model: string; effort?: string }>;
  modelsOverride?: ConfigLayer | null;
  pending: { planRequestId: string | null; exportWorkflowId: string | null; [k: string]: string | null };
  fallbacks: string[];
  warnings: string[];
  createdAt: number;
  updatedAt: number;
};

export function newJobId(now = Date.now()): string {
  const d = new Date(now);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "-" + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + "-" + randomHex(6)
  );
}

export function jobId6(jobId: string): string {
  return jobId.slice(-6);
}

export const EO_DRAFT_PREFIX = "EO Short · ";

export function eoDraftName(sourceName: string | null | undefined, jobId: string): string {
  return EO_DRAFT_PREFIX + (sourceName?.trim() || "Untitled") + " · " + jobId6(jobId);
}

export function parseEoDraftName(name: string | null | undefined): { sourceName: string; jobId6: string | null } | null {
  if (typeof name !== "string" || !name.startsWith(EO_DRAFT_PREFIX)) return null;
  const rest = name.slice(EO_DRAFT_PREFIX.length);
  const m = /^(.*) · ([0-9a-f]{6})$/.exec(rest);
  return m ? { sourceName: m[1], jobId6: m[2] } : { sourceName: rest, jobId6: null };
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function jobDir(fs: HostFs, jobsRoot: string, projectId: string, jobId: string): string {
  if (!SAFE_ID.test(projectId) || !SAFE_ID.test(jobId)) throw new Error("Unsafe project or job id: " + projectId + " / " + jobId);
  return fs.join(jobsRoot, projectId, jobId);
}

export function newJob(init: {
  jobId: string;
  projectId: string;
  sourceDraftId: string;
  sourceName?: string | null;
  film?: "A" | "B";
  versions?: Record<string, string>;
  models?: Job["models"];
  modelsOverride?: ConfigLayer | null;
  now?: number;
}): Job {
  const now = init.now ?? Date.now();
  const stages: Job["stages"] = {};
  for (const id of STAGE_IDS) stages[id] = { status: "pending" };
  return {
    schema: JOB_SCHEMA,
    jobId: init.jobId,
    projectId: init.projectId,
    sourceDraftId: init.sourceDraftId,
    sourceName: init.sourceName ?? null,
    draftId: null,
    film: init.film ?? "A",
    status: "new",
    stage: STAGE_IDS[0],
    stages,
    versions: init.versions ?? {},
    models: init.models ?? {},
    ...(init.modelsOverride ? { modelsOverride: init.modelsOverride } : {}),
    pending: { planRequestId: null, exportWorkflowId: null },
    fallbacks: [],
    warnings: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function jobFile(fs: HostFs, dir: string): string {
  return fs.join(dir, "job.json");
}

export async function createJob(fs: HostFs, jobsRoot: string, job: Job): Promise<string> {
  const dir = jobDir(fs, jobsRoot, job.projectId, job.jobId);
  ensureDir(fs, dir);
  for (const f of JOB_FOLDERS) ensureDir(fs, fs.join(dir, f));
  const created = await createExclusive(fs, jobFile(fs, dir), JSON.stringify(job, null, 2) + "\n");
  if (!created) throw new Error("A job named " + job.jobId + " already exists.");
  return dir;
}

export function validateJob(value: unknown): Job {
  const j = value as Job;
  if (!j || typeof j !== "object" || j.schema !== JOB_SCHEMA) throw new Error("Not an " + JOB_SCHEMA + " job file.");
  if (typeof j.jobId !== "string" || typeof j.projectId !== "string" || typeof j.sourceDraftId !== "string") throw new Error("The job file is missing its ids.");
  j.stages = j.stages && typeof j.stages === "object" ? j.stages : {};
  for (const id of STAGE_IDS) if (!j.stages[id]) j.stages[id] = { status: "pending" };
  j.pending = j.pending ?? { planRequestId: null, exportWorkflowId: null };
  j.fallbacks = Array.isArray(j.fallbacks) ? j.fallbacks : [];
  j.warnings = Array.isArray(j.warnings) ? j.warnings : [];
  j.versions = j.versions ?? {};
  j.models = j.models ?? {};
  return j;
}

export async function loadJob(fs: HostFs, dir: string): Promise<Job> {
  return validateJob(await readJson(fs, jobFile(fs, dir)));
}

export async function saveJob(fs: HostFs, dir: string, job: Job, now = Date.now()): Promise<void> {
  job.updatedAt = now;
  await writeJsonAtomic(fs, jobFile(fs, dir), job);
}

export type JobEntry = { jobId: string; dir: string; job: Job };

export async function listJobs(fs: HostFs, jobsRoot: string, projectId: string): Promise<JobEntry[]> {
  if (!SAFE_ID.test(projectId)) return [];
  const root = fs.join(jobsRoot, projectId);
  const names = fs.readdirSync(root).filter((n) => SAFE_ID.test(n)).sort().reverse();
  const out: JobEntry[] = [];
  for (const name of names) {
    const dir = fs.join(root, name);
    if (!fs.existsSync(jobFile(fs, dir))) continue;
    try {
      out.push({ jobId: name, dir, job: await loadJob(fs, dir) });
    } catch {
    }
  }
  return out;
}

export function isFinished(job: Job): boolean {
  return job.status === "done";
}

export async function latestResumable(fs: HostFs, jobsRoot: string, projectId: string, sourceDraftId?: string | null): Promise<JobEntry | null> {
  for (const e of await listJobs(fs, jobsRoot, projectId)) {
    if (sourceDraftId && e.job.sourceDraftId !== sourceDraftId) continue;
    if (!isFinished(e.job)) return e;
  }
  return null;
}

export async function findJobByDraft(fs: HostFs, jobsRoot: string, projectId: string, draftId: string | null | undefined): Promise<JobEntry | null> {
  if (!draftId) return null;
  for (const e of await listJobs(fs, jobsRoot, projectId)) if (e.job.draftId === draftId) return e;
  return null;
}

export function eoOutputRefusal(made: JobEntry | null, draftName: string | null | undefined): string | null {
  const parsed = parseEoDraftName(draftName);
  if (!made && !parsed) return null;
  const source = made?.job.sourceName ?? parsed?.sourceName ?? null;
  const job = made ? " (job " + jobId6(made.jobId) + ")" : parsed?.jobId6 ? " (job " + parsed.jobId6 + ")" : "";
  return (
    "This draft is an EO short this plugin made" + job + (source ? " from “" + source + "”" : "") + ". Open " +
    (source ? "“" + source + "”" : "the original talking-head draft") + " and press Make EO short there."
  );
}

export function firstIncompleteStage(job: Job): StageId | null {
  for (const id of STAGE_IDS) if (job.stages[id]?.status !== "done") return id;
  return null;
}

export function decideStage(job: Job, stage: StageId, inputSha: string, alwaysRerun = false): "skip" | "run" {
  const s = job.stages[stage];
  if (alwaysRerun) return "run";
  return s?.status === "done" && !!s.inputSha && s.inputSha === inputSha ? "skip" : "run";
}

export function inputsChanged(job: Job, stage: StageId, inputSha: string): boolean {
  const s = job.stages[stage];
  return !(s?.status === "done" && s.inputSha === inputSha);
}

export function resetAfter(job: Job, stage: StageId): void {
  const i = STAGE_IDS.indexOf(stage);
  for (const id of STAGE_IDS.slice(i + 1)) {
    const s = job.stages[id];
    if (s && s.status !== "pending") job.stages[id] = { ...s, status: "pending", error: null };
  }
}
