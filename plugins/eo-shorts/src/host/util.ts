export class AbortedError extends Error {
  constructor(message = "Canceled.") {
    super(message);
    this.name = "AbortError";
  }
}

export function isAbortError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  return !!e && (e.name === "AbortError" || /^Aborted by parent signal/.test(String(e.message || "")));
}

export function throwIfAborted(signal?: AbortSignal | null): void {
  if (signal?.aborted) throw new AbortedError(abortReason(signal));
}

function abortReason(signal: AbortSignal): string {
  const r = (signal as { reason?: unknown }).reason;
  if (r instanceof Error && r.message) return r.message;
  if (typeof r === "string" && r) return r;
  return "Canceled.";
}

export function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortedError(abortReason(signal)));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AbortedError(abortReason(signal!)));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function childSignal(parent: AbortSignal | null | undefined, timeoutMs = 0) {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort((parent as { reason?: unknown }).reason ?? new AbortedError());
  if (parent?.aborted) onAbort();
  else parent?.addEventListener("abort", onAbort, { once: true });
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort(new AbortedError("Timed out after " + Math.round(timeoutMs / 1000) + " s."));
        }, timeoutMs)
      : null;
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose() {
      if (timer) clearTimeout(timer);
      parent?.removeEventListener("abort", onAbort);
    },
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = sortKeys(v);
    }
    return out;
  }
  return value;
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hashJson(value: unknown): Promise<string> {
  return sha256Hex(canonicalJson(value));
}

export function randomHex(n: number): string {
  const bytes = new Uint8Array(Math.ceil(n / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, n);
}
