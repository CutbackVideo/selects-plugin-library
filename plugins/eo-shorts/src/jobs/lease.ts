import type { HostFs } from "../host/types.ts";
import { createExclusive, readText, statFile, writeJsonAtomic, removeFile } from "../host/fs.ts";
import { randomHex, sleep, errorMessage } from "../host/util.ts";

export const LEASE_SCHEMA = "eo-lease/1";
export const LEASE_TTL_MS = 10 * 60_000;
export const LEASE_RENEW_MS = 30_000;
export const LEASE_STALE_MS = 3 * LEASE_RENEW_MS;
export const LEASE_RETRY_MS = 5_000;

export type LeaseRecord = {
  schema: typeof LEASE_SCHEMA;
  owner: string;
  jobId: string | null;
  acquiredAt: number;
  renewedAt: number;
  until: number;
  takenOverFrom?: string | null;
};

export class LeaseBusyError extends Error {
  holder: LeaseRecord | null;
  constructor(holder: LeaseRecord | null, now: number, staleMs = LEASE_STALE_MS) {
    let message = "This job's lease file is being written by another panel; try again in a moment.";
    if (holder) {
      const ago = Math.max(0, Math.round((now - (holder.renewedAt ?? now)) / 1000));
      const wait = Math.max(1, Math.round(((holder.renewedAt ?? now) + staleMs - now) / 1000));
      message = "This job is running in another panel (last heartbeat " + ago + " s ago). If that panel was closed, Resume works in about " + wait + " s.";
    }
    super(message);
    this.name = "LeaseBusyError";
    this.holder = holder;
  }
}

export class LeaseLostError extends Error {
  constructor(by: string | null) {
    super("Another run took over this job" + (by ? " (" + by + ")" : "") + "; this run stopped.");
    this.name = "LeaseLostError";
  }
}

export function newOwnerId(): string {
  return "panel-" + randomHex(10);
}

export function leasePath(fs: HostFs, jobDir: string): string {
  return fs.join(jobDir, "lease.json");
}

async function readLeaseFile(fs: HostFs, path: string): Promise<{ rec: LeaseRecord | null; readError: unknown }> {
  let text: string;
  try {
    if (!fs.existsSync(path)) return { rec: null, readError: null };
    text = await readText(fs, path);
  } catch (e) {
    return { rec: null, readError: e ?? new Error("read failed") };
  }
  try {
    const r = JSON.parse(text) as LeaseRecord;
    return { rec: r && typeof r.owner === "string" && typeof r.until === "number" ? r : null, readError: null };
  } catch {
    return { rec: null, readError: null };
  }
}

async function readLease(fs: HostFs, path: string): Promise<LeaseRecord | null> {
  return (await readLeaseFile(fs, path)).rec;
}

export function isLive(rec: LeaseRecord | null, now: number, staleMs = LEASE_STALE_MS): boolean {
  if (!rec || rec.until <= now) return false;
  return typeof rec.renewedAt !== "number" || now - rec.renewedAt <= staleMs;
}

function unreadableIsLive(fs: HostFs, path: string, now: number, staleMs: number): { live: boolean; freeAt: number | null } {
  const st = statFile(fs, path);
  if (!st) return { live: false, freeAt: null };
  return now - st.mtimeMs < staleMs ? { live: true, freeAt: st.mtimeMs + staleMs } : { live: false, freeAt: null };
}

export type LeaseState = "free" | "live" | "stale";

export type LeaseStatus = {
  state: LeaseState;
  holder: LeaseRecord | null;
  freeAt: number | null;
};

export async function leaseStatus(fs: HostFs, jobDir: string, now = Date.now(), staleMs = LEASE_STALE_MS): Promise<LeaseStatus> {
  const path = leasePath(fs, jobDir);
  if (!fs.existsSync(path)) return { state: "free", holder: null, freeAt: null };
  const rec = await readLease(fs, path);
  if (!rec) {
    const u = unreadableIsLive(fs, path, now, staleMs);
    return { state: u.live ? "live" : fs.existsSync(path) ? "stale" : "free", holder: null, freeAt: u.freeAt };
  }
  if (!isLive(rec, now, staleMs)) return { state: "stale", holder: rec, freeAt: null };
  const staleAt = typeof rec.renewedAt === "number" ? rec.renewedAt + staleMs : rec.until;
  return { state: "live", holder: rec, freeAt: Math.min(rec.until, staleAt) };
}

export async function leaseState(fs: HostFs, jobDir: string, now = Date.now()): Promise<LeaseState> {
  return (await leaseStatus(fs, jobDir, now)).state;
}

export type LeaseOptions = { owner: string; jobId?: string | null; now?: () => number; ttlMs?: number; staleMs?: number; confirmDelayMs?: number; sleepFn?: typeof sleep };

export type HeartbeatOptions = {
  everyMs?: number;
  retryMs?: number;
  onError?: (e: Error, info: { failures: number; msLeft: number }) => void;
};

export type Lease = {
  owner: string;
  path: string;
  takenOverFrom: string | null;
  renew(): Promise<void>;
  heldUntil(): number;
  release(): Promise<void>;
  heartbeat(onLost: (e: Error) => void, opts?: number | HeartbeatOptions): () => void;
};

export async function acquireLease(fs: HostFs, jobDir: string, o: LeaseOptions): Promise<Lease> {
  const now = o.now ?? Date.now;
  const ttl = o.ttlMs ?? LEASE_TTL_MS;
  const staleMs = o.staleMs ?? LEASE_STALE_MS;
  const path = leasePath(fs, jobDir);
  const fresh = (prev?: LeaseRecord | null): LeaseRecord => {
    const t = now();
    return { schema: LEASE_SCHEMA, owner: o.owner, jobId: o.jobId ?? null, acquiredAt: t, renewedAt: t, until: t + ttl, ...(prev ? { takenOverFrom: prev.owner } : {}) };
  };

  let takenOverFrom: string | null = null;
  if (!(await createExclusive(fs, path, JSON.stringify(fresh()) + "\n"))) {
    const held = await readLease(fs, path);
    if (held && held.owner === o.owner) {
    } else if (held && isLive(held, now(), staleMs)) {
      throw new LeaseBusyError(held, now(), staleMs);
    } else {
      if (!held && unreadableIsLive(fs, path, now(), staleMs).live) throw new LeaseBusyError(null, now());
      await writeJsonAtomic(fs, path, fresh(held));
      await (o.sleepFn ?? sleep)(o.confirmDelayMs ?? 200);
      const check = await readLease(fs, path);
      if (!check || check.owner !== o.owner) throw new LeaseBusyError(check, now(), staleMs);
      takenOverFrom = held?.owner ?? "unreadable";
    }
  }

  let lastRenewedAt = now();
  let inflight: Promise<void> | null = null;
  const lease: Lease = {
    owner: o.owner,
    path,
    takenOverFrom,
    async renew() {
      const { rec: held, readError } = await readLeaseFile(fs, path);
      if (readError) throw new Error("Could not read the job lease: " + errorMessage(readError));
      if (held && held.owner !== o.owner) throw new LeaseLostError(held.owner);
      const t = now();
      await writeJsonAtomic(fs, path, { ...(held ?? fresh()), owner: o.owner, renewedAt: t, until: t + ttl });
      lastRenewedAt = t;
    },
    heldUntil: () => lastRenewedAt + Math.min(ttl, staleMs),
    async release() {
      try {
        await inflight;
      } catch {
      }
      try {
        const held = await readLease(fs, path);
        if (held && held.owner === o.owner) removeFile(fs, path);
      } catch {
      }
    },
    heartbeat(onLost, opts) {
      const h: HeartbeatOptions = typeof opts === "number" ? { everyMs: opts } : opts ?? {};
      const every = h.everyMs ?? LEASE_RENEW_MS;
      const retry = Math.max(1, Math.min(h.retryMs ?? LEASE_RETRY_MS, every));
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let failures = 0;
      const schedule = (ms: number) => {
        if (!stopped) timer = setTimeout(() => void (inflight = tick()), ms);
      };
      const lost = (e: Error) => {
        stopped = true;
        onLost(e);
      };
      const tick = async (): Promise<void> => {
        timer = null;
        if (stopped) return;
        try {
          await lease.renew();
        } catch (e) {
          if (stopped) return;
          if (e instanceof LeaseLostError) return lost(e);
          failures += 1;
          const msLeft = lease.heldUntil() - now();
          if (msLeft <= 2 * retry) {
            const since = Math.round((now() - lastRenewedAt) / 1000);
            return lost(
              new Error(
                "Could not renew the job lease for " + since + " s (" + failures + " tries): " + errorMessage(e) +
                  ". The run stopped before another panel could take the job over; Resume continues it.",
              ),
            );
          }
          h.onError?.(e instanceof Error ? e : new Error(errorMessage(e)), { failures, msLeft });
          return schedule(retry);
        }
        failures = 0;
        schedule(every);
      };
      schedule(every);
      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        timer = null;
      };
    },
  };
  await lease.renew();
  return lease;
}

export async function liveLeases(fs: HostFs, jobsRoot: string, now = Date.now()): Promise<{ path: string; lease: LeaseRecord }[]> {
  const out: { path: string; lease: LeaseRecord }[] = [];
  for (const project of fs.readdirSync(jobsRoot)) {
    for (const job of fs.readdirSync(fs.join(jobsRoot, project))) {
      const path = fs.join(jobsRoot, project, job, "lease.json");
      if (!fs.existsSync(path)) continue;
      const rec = await readLease(fs, path);
      if (isLive(rec, now)) out.push({ path, lease: rec! });
    }
  }
  return out;
}
