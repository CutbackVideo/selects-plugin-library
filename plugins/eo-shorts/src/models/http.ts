import { childSignal, isAbortError } from "../host/util.ts";
import { ModelError, type ErrorKind } from "./errors.ts";
import type { Provider } from "./types.ts";

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpOptions {
  provider: Provider;
  timeoutMs: number;
  signal?: AbortSignal;
  redact: (text: string) => string;
}

export function kindForStatus(status: number, code = ""): ErrorKind {
  if (/insufficient_quota|billing/i.test(code)) return "unavailable";
  if (status === 401 || status === 403) return "auth";
  if (status === 413) return "too_large";
  if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) return "busy";
  return "bad_request";
}

export function retryAfterMs(headers: Headers | null | undefined, now = Date.now()): number | undefined {
  const raw = headers?.get("retry-after");
  if (!raw) return undefined;
  const secs = Number(raw);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(0, at - now) : undefined;
}

function errorBodyParts(text: string): { message: string; code: string } {
  try {
    const o = JSON.parse(text) as Record<string, any>;
    const e = o?.error ?? o;
    const message = typeof e === "string" ? e : String(e?.message ?? o?.message ?? text);
    const code = String(e?.code ?? e?.type ?? e?.status ?? "");
    return { message, code };
  } catch {
    return { message: text, code: "" };
  }
}

export function httpError(provider: Provider, status: number, bodyText: string, headers: Headers | null, redact: (s: string) => string): ModelError {
  const { message, code } = errorBodyParts(bodyText || "");
  const kind = kindForStatus(status, code);
  const text = redact(provider + " HTTP " + status + (code ? " " + code : "") + ": " + (message || "no details")).slice(0, 300);
  return new ModelError(kind, text, { provider, status, retryAfterMs: retryAfterMs(headers) });
}

export function toTransportError(e: unknown, provider: Provider, timedOut: boolean, redact: (s: string) => string): ModelError {
  if (e instanceof ModelError) return e;
  if (timedOut) return new ModelError("timeout", provider + " did not answer in time", { provider });
  if (isAbortError(e) || (e as { name?: string })?.name === "AbortError") return new ModelError("aborted", "Canceled.", { provider });
  if (e instanceof TypeError || (e as { name?: string })?.name === "TypeError") {
    return new ModelError("network", redact(provider + " could not be reached (network, CORS or CSP): " + String((e as Error).message)).slice(0, 300), { provider });
  }
  return new ModelError("failed", redact(provider + ": " + String((e as Error)?.message ?? e)).slice(0, 300), { provider });
}

export async function request(
  fetchFn: FetchFn,
  url: string,
  init: { method: "GET" | "POST"; headers: Record<string, string>; body?: unknown },
  opts: HttpOptions & { stream?: boolean },
): Promise<{ response: Response; json: any; done: () => void; timedOut: () => boolean }> {
  const child = childSignal(opts.signal, opts.timeoutMs);
  try {
    const response = await fetchFn(url, {
      method: init.method,
      headers: init.headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: child.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw httpError(opts.provider, response.status, text, response.headers, opts.redact);
    }
    if (opts.stream) return { response, json: null, done: () => child.dispose(), timedOut: child.timedOut };
    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new ModelError("failed", opts.provider + " answered with a body that is not JSON", { provider: opts.provider, status: response.status });
    }
    child.dispose();
    return { response, json, done: () => {}, timedOut: child.timedOut };
  } catch (e) {
    const timedOut = child.timedOut();
    child.dispose();
    throw toTransportError(e, opts.provider, timedOut, opts.redact);
  }
}

export interface SseEvent {
  event: string;
  data: string;
}

export async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = function* (final: boolean): Generator<SseEvent> {
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = final ? "" : (blocks.pop() ?? "");
    for (const block of blocks) {
      let event = "message";
      const data: string[] = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length || event !== "message") yield { event, data: data.join("\n") };
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* flush(false);
    }
    buffer += decoder.decode();
    if (buffer.trim()) yield* flush(true);
  } finally {
    reader.releaseLock();
  }
}
