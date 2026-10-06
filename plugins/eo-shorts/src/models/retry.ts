import type { ModelError } from "./errors.ts";

export const APP_FAST_FAILURE_MS = 3_000;
export const APP_FAST_LADDER_MS = [0, 4_000, 12_000, 30_000];
export const APP_UNAVAILABLE_AFTER = APP_FAST_LADDER_MS.length;
export const BUSY_LADDER_MS = [0, 4_000, 12_000, 30_000, 60_000];
export const OTHER_LADDER_MS = [0, 4_000, 12_000];
export const NETWORK_RETRY_MS = 4_000;
export const MAX_RETRY_AFTER_MS = 60_000;

export interface RetryState {
  fast: number;
  busy: number;
  timeouts: number;
  network: number;
  other: number;
}

export function newRetryState(): RetryState {
  return { fast: 0, busy: 0, timeouts: 0, network: 0, other: 0 };
}

export type RetryDecision = { retry: true; waitMs: number } | { retry: false; unavailable: boolean };

export function decideRetry(err: ModelError, st: RetryState, cfg: { timeoutRetries: number }): RetryDecision {
  if (err.kind !== "fast_failure") st.fast = 0;
  switch (err.kind) {
    case "fast_failure": {
      st.fast += 1;
      if (st.fast >= APP_UNAVAILABLE_AFTER) return { retry: false, unavailable: true };
      return { retry: true, waitMs: APP_FAST_LADDER_MS[st.fast] };
    }
    case "busy": {
      st.busy += 1;
      if (st.busy >= BUSY_LADDER_MS.length) return { retry: false, unavailable: false };
      const asked = Math.min(MAX_RETRY_AFTER_MS, Math.max(0, err.retryAfterMs ?? 0));
      return { retry: true, waitMs: Math.max(BUSY_LADDER_MS[st.busy], asked) };
    }
    case "timeout": {
      st.timeouts += 1;
      if (st.timeouts > cfg.timeoutRetries) return { retry: false, unavailable: false };
      return { retry: true, waitMs: 0 };
    }
    case "network": {
      st.network += 1;
      if (st.network > 1) return { retry: false, unavailable: true };
      return { retry: true, waitMs: NETWORK_RETRY_MS };
    }
    case "failed": {
      st.other += 1;
      if (st.other >= OTHER_LADDER_MS.length) return { retry: false, unavailable: false };
      return { retry: true, waitMs: OTHER_LADDER_MS[st.other] };
    }
    case "auth":
    case "unavailable":
      return { retry: false, unavailable: true };
    default:
      return { retry: false, unavailable: false };
  }
}
