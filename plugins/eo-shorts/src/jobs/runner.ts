import type { Host } from "../host/types.ts";
import type { PluginRoots } from "../host/roots.ts";
import { errorMessage, isAbortError } from "../host/util.ts";
import { STAGE_IDS, decideStage, inputsChanged, resetAfter, saveJob, type Job, type StageId } from "./store.ts";
import { appendEvent, type JournalEvent } from "./journal.ts";
import { acquireLease, newOwnerId, LeaseLostError, type Lease } from "./lease.ts";
import { describeOutputs, interruptedReceipt, readReceipt, receiptRel, writeReceipt, type Receipt } from "./receipts.ts";
import { t } from "../ui/messages.ts";

export type StageContext = {
  host: Host;
  roots: PluginRoots;
  job: Job;
  dir: string;
  stage: StageId;
  signal: AbortSignal;
  path(rel: string): string;
  event(type: string, data?: Record<string, unknown>): Promise<void>;
  saveJob(): Promise<void>;
  warn(message: string): void;
  fallback(message: string): void;
  note(message: string): void;
};

export type StageResult = {
  outputs?: string[];
  calls?: string[];
  note?: string | null;
  data?: unknown;
};

export type StageImpl = {
  id: StageId;
  alwaysRerun?: boolean;
  inputSha(ctx: StageContext): Promise<string>;
  run(ctx: StageContext): Promise<StageResult>;
};

export type StageRegistry = Partial<Record<StageId, StageImpl>>;

export type RunOutcome = { status: "done" | "incomplete" | "failed" | "canceled" | "refused"; stage: StageId | null; error: string | null };

export type RebuildRequest = {
  from: StageId;
  check?: (ctx: StageContext) => Promise<string | null>;
  prepare?: (ctx: StageContext) => Promise<unknown>;
};

export class RebuildRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RebuildRefusedError";
  }
}

export type RunOptions = {
  host: Host;
  roots: PluginRoots;
  dir: string;
  job: Job;
  stages: StageRegistry;
  signal?: AbortSignal | null;
  owner?: string;
  onUpdate?: (job: Job) => void;
  leaseTtlMs?: number;
  leaseStaleMs?: number;
  heartbeatMs?: number;
  heartbeatRetryMs?: number;
  leaseConfirmDelayMs?: number;
  rebuild?: RebuildRequest | null;
};

export async function runJob(o: RunOptions): Promise<RunOutcome> {
  const { host, dir, job } = o;
  const fs = host.fs;
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort((o.signal as { reason?: unknown } | null)?.reason);
  if (o.signal?.aborted) onOuterAbort();
  else o.signal?.addEventListener("abort", onOuterAbort, { once: true });

  const log = (e: JournalEvent) => appendEvent(fs, dir, e, host.now()).catch(() => undefined);
  let lostTo: LeaseLostError | null = null;
  const save = async () => {
    if (lostTo) throw lostTo;
    await saveJob(fs, dir, job, host.now());
    o.onUpdate?.(job);
  };
  const stopKind = (): "canceled" | "failed" => (controller.signal.aborted && !o.signal?.aborted ? "failed" : "canceled");

  let lease: Lease | null = null;
  let stopHeartbeat: (() => void) | null = null;
  try {
    lease = await acquireLease(fs, dir, { owner: o.owner ?? newOwnerId(), jobId: job.jobId, now: host.now, ttlMs: o.leaseTtlMs, staleMs: o.leaseStaleMs, confirmDelayMs: o.leaseConfirmDelayMs });
    stopHeartbeat = lease.heartbeat(
      (e) => {
        if (e instanceof LeaseLostError) lostTo = e;
        void log({ type: e instanceof LeaseLostError ? "lease-lost" : "lease-unrenewable", error: e.message });
        controller.abort(e);
      },
      {
        everyMs: o.heartbeatMs,
        retryMs: o.heartbeatRetryMs,
        onError: (e, info) => void log({ type: "lease-renew-failed", error: errorMessage(e), failures: info.failures, msLeft: info.msLeft }),
      },
    );

    const interrupted = STAGE_IDS.filter((id) => job.stages[id]?.status === "running");
    const prior = { status: job.status, stage: job.stage, stages: JSON.parse(JSON.stringify(job.stages)) as Job["stages"] };
    job.status = "running";
    await save();
    await log({
      type: "run-start",
      owner: lease.owner,
      ...(lease.takenOverFrom ? { takenOverFrom: lease.takenOverFrom } : {}),
      ...(interrupted.length ? { interrupted } : {}),
      ...(o.rebuild ? { rebuildFrom: o.rebuild.from } : {}),
    });

    const stopAt = async (stage: StageId, e: unknown): Promise<RunOutcome> => {
      const stopped = controller.signal.aborted || isAbortError(e);
      const message = stopped ? errorMessage(controller.signal.reason ?? e) : errorMessage(e);
      const status = stopped ? stopKind() : "failed";
      await log({ type: status === "canceled" ? "stage-canceled" : "stage-failed", stage, error: message });
      if (lostTo) return { status: "failed", stage, error: message };
      job.stages[stage] = { ...job.stages[stage], status, finishedAt: host.now(), error: message, note: null };
      job.status = status;
      await save();
      return { status, stage, error: message };
    };

    let forceFrom: number = STAGE_IDS.length;
    if (o.rebuild) {
      forceFrom = STAGE_IDS.indexOf(o.rebuild.from);
      if (forceFrom < 0) throw new Error("Unknown stage to rebuild from: " + o.rebuild.from);
      await log({ type: "rebuild-start", from: o.rebuild.from });
    }

    const refuse = async (stage: StageId, reason: string, restoreFrom: StageId, kind: "refused" | "canceled" = "refused"): Promise<RunOutcome> => {
      for (const id of STAGE_IDS.slice(STAGE_IDS.indexOf(restoreFrom))) job.stages[id] = prior.stages[id] ?? { status: "pending" };
      job.status = prior.status;
      job.stage = prior.stage;
      await save();
      await log({ type: kind === "canceled" ? "rebuild-canceled" : "rebuild-refused", stage, reason });
      return { status: kind, stage, error: reason };
    };

    const startRebuild = async (req: RebuildRequest): Promise<RunOutcome | null> => {
      const from = req.from;
      const ctx = makeContext(o, from, controller.signal, save, log);
      const aborted = () => controller.signal.aborted;
      if (req.check) {
        let why: string | null;
        try {
          why = await req.check(ctx);
          if (aborted()) throw controller.signal.reason ?? new Error("Canceled.");
        } catch (e) {
          if (lostTo) throw e;
          if (aborted() || isAbortError(e)) {
            if (stopKind() === "failed") throw e;
            return await refuse(from, errorMessage(controller.signal.reason ?? e), from, "canceled");
          }
          why = e instanceof RebuildRefusedError ? e.message : t("rebuild.checkFailed", { error: errorMessage(e) });
        }
        if (why) return await refuse(from, why, from);
        await log({ type: "rebuild-checked", from });
      }
      for (const id of STAGE_IDS.slice(forceFrom)) {
        const st = job.stages[id];
        if (st && st.status !== "pending") job.stages[id] = { ...st, status: "pending", error: null, note: null };
      }
      job.stage = from;
      await save();
      if (req.prepare) {
        try {
          const result = await req.prepare(ctx);
          if (aborted()) throw controller.signal.reason ?? new Error("Canceled.");
          await log({ type: "rebuild-prepared", from, ...(result && typeof result === "object" ? { result } : {}) });
        } catch (e) {
          if (e instanceof RebuildRefusedError && !aborted()) return await refuse(from, e.message, from);
          return await stopAt(from, e);
        }
      }
      return null;
    };

    let forceRun = false;
    for (const [index, stage] of STAGE_IDS.entries()) {
      if (o.rebuild && index === forceFrom) {
        if (controller.signal.aborted) throw controller.signal.reason ?? new Error("Canceled.");
        const stopped = await startRebuild(o.rebuild);
        if (stopped) return stopped;
        forceRun = true;
      }
      const impl = o.stages[stage];
      if (!impl) {
        job.stage = stage;
        job.stages[stage] = { ...job.stages[stage], status: "blocked", note: "Not built yet." };
        job.status = "paused";
        await save();
        await log({ type: "stage-missing", stage });
        return { status: "incomplete", stage, error: null };
      }
      if (controller.signal.aborted) throw controller.signal.reason ?? new Error("Canceled.");
      const ctx = makeContext(o, stage, controller.signal, save, log);
      const inputSha = await impl.inputSha(ctx);
      if (!forceRun && decideStage(job, stage, inputSha, impl.alwaysRerun) === "skip") {
        await log({ type: "stage-skip", stage, inputSha });
        continue;
      }
      if (!forceRun && !impl.alwaysRerun) {
        const adopted = await interruptedReceipt(fs, dir, job.stages[stage], stage, inputSha).catch(() => null);
        if (adopted) {
          adoptReceipt(job, stage, adopted);
          await save();
          await log({ type: "stage-adopted", stage, inputSha, startedAt: adopted.startedAt });
          continue;
        }
      }
      if (o.rebuild && index < forceFrom && !impl.alwaysRerun) {
        return await refuse(stage, t("rebuild.rerun", { stage: t(("stage." + stage) as "stage.edit") }), stage);
      }
      const changed = inputsChanged(job, stage, inputSha);
      if (changed) {
        forceRun = true;
        resetAfter(job, stage);
      }
      const startedAt = host.now();
      const prev = job.stages[stage];
      forgetStageNotes(job, stage, await readReceipt(fs, dir, stage).catch(() => null));
      job.stage = stage;
      job.stages[stage] = { status: "running", inputSha, receipt: null, startedAt, finishedAt: null, error: null, note: null, runs: (prev?.runs ?? 0) + 1, warnings: [] };
      await save();
      await log({ type: "stage-start", stage, inputSha, changed });

      const warnings: string[] = [];
      const fallbacks: string[] = [];
      (ctx as { _warnings?: string[] })._warnings = warnings;
      (ctx as { _fallbacks?: string[] })._fallbacks = fallbacks;
      try {
        const result = await impl.run(ctx);
        if (controller.signal.aborted) throw controller.signal.reason ?? new Error("Canceled.");
        const finishedAt = host.now();
        const outputs = await describeOutputs(fs, dir, result.outputs ?? []);
        await writeReceipt(fs, dir, {
          jobId: job.jobId,
          stage,
          inputSha,
          outputs,
          calls: result.calls ?? [],
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
          warnings,
          fallbacks,
          note: result.note ?? null,
          ...(result.data !== undefined ? { data: result.data } : {}),
        });
        job.stages[stage] = { ...job.stages[stage], status: "done", receipt: receiptRel(stage), finishedAt, note: result.note ?? job.stages[stage]?.note ?? null };
        await save();
        await log({ type: "stage-done", stage, ms: finishedAt - startedAt, warnings: warnings.length, fallbacks: fallbacks.length });
      } catch (e) {
        return await stopAt(stage, e);
      }
    }
    job.stage = "done";
    job.status = "done";
    await save();
    await log({ type: "run-done" });
    return { status: "done", stage: null, error: null };
  } catch (e) {
    const stopped = controller.signal.aborted || isAbortError(e);
    const message = errorMessage(stopped ? controller.signal.reason ?? e : e);
    const status = lostTo ? "failed" : stopped ? stopKind() : "failed";
    if (!lease) throw e;
    if (!lostTo) {
      job.status = status;
      await save().catch(() => undefined);
    }
    await log({ type: status === "canceled" ? "run-canceled" : "run-failed", error: message });
    return { status, stage: STAGE_IDS.includes(job.stage as StageId) ? (job.stage as StageId) : null, error: message };
  } finally {
    o.signal?.removeEventListener("abort", onOuterAbort);
    stopHeartbeat?.();
    await lease?.release();
  }
}

export function forgetStageNotes(job: Pick<Job, "fallbacks" | "warnings"> & Partial<Pick<Job, "stages">>, stage: StageId, last: Pick<Receipt, "warnings"> | null): void {
  const prefix = stage + ": ";
  job.fallbacks.splice(0, job.fallbacks.length, ...job.fallbacks.filter((f) => !f.startsWith(prefix)));
  const own = job.stages?.[stage];
  const stale = new Set([...(own?.warnings ?? []), ...(last?.warnings ?? [])]);
  if (own) own.warnings = [];
  if (!stale.size) return;
  const others = new Set(STAGE_IDS.filter((id) => id !== stage).flatMap((id) => job.stages?.[id]?.warnings ?? []));
  job.warnings.splice(0, job.warnings.length, ...job.warnings.filter((w) => !stale.has(w) || others.has(w)));
}

export function adoptReceipt(job: Job, stage: StageId, r: Receipt): void {
  forgetStageNotes(job, stage, null);
  for (const f of r.fallbacks ?? []) job.fallbacks.push(stage + ": " + f);
  for (const w of r.warnings ?? []) if (!job.warnings.includes(w)) job.warnings.push(w);
  job.stages[stage] = {
    ...job.stages[stage],
    status: "done",
    inputSha: r.inputSha,
    receipt: receiptRel(stage),
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    error: null,
    note: r.note ?? job.stages[stage]?.note ?? null,
    warnings: [...new Set(r.warnings ?? [])],
  };
}

function makeContext(o: RunOptions, stage: StageId, signal: AbortSignal, save: () => Promise<void>, log: (e: JournalEvent) => Promise<unknown>): StageContext {
  const fs = o.host.fs;
  const ctx: StageContext & { _warnings?: string[]; _fallbacks?: string[] } = {
    host: o.host,
    roots: o.roots,
    job: o.job,
    dir: o.dir,
    stage,
    signal,
    path: (rel: string) => fs.join(o.dir, ...rel.split("/")),
    event: async (type, data = {}) => void (await log({ type, stage, ...data })),
    saveJob: save,
    warn(message) {
      ctx._warnings?.push(message);
      const s = o.job.stages[stage];
      if (s && !(s.warnings ?? []).includes(message)) s.warnings = [...(s.warnings ?? []), message];
      if (!o.job.warnings.includes(message)) o.job.warnings.push(message);
    },
    fallback(message) {
      ctx._fallbacks?.push(message);
      o.job.fallbacks.push(stage + ": " + message);
    },
    note(message) {
      const s = o.job.stages[stage];
      if (s) s.note = message;
      o.onUpdate?.(o.job);
    },
  };
  return ctx;
}
