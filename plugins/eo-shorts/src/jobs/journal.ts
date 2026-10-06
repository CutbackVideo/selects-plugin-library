import type { HostFs } from "../host/types.ts";
import { appendText, decodeText } from "../host/fs.ts";

export type JournalEvent = { type: string; stage?: string; [k: string]: unknown };

export const CALL_FIELDS = [
  "t",
  "callId",
  "stage",
  "role",
  "provider",
  "model",
  "effort",
  "promptSha",
  "images",
  "latencyMs",
  "inputTokens",
  "outputTokens",
  "status",
  "attempt",
  "cacheHit",
  "requestId",
  "error",
] as const;

export type CallRecord = {
  t?: string;
  callId?: string;
  stage?: string;
  role: string;
  provider: string;
  model: string;
  effort?: string | null;
  promptSha: string;
  images?: number;
  latencyMs?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  status: string;
  attempt?: number;
  cacheHit?: boolean;
  requestId?: string | null;
  error?: string | null;
};

const SECRET = /\b(sk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|Bearer\s+[A-Za-z0-9._~+/-]{16,}=*|(?:api[_-]?key|x-api-key|x-goog-api-key|authorization)["']?\s*[:=]\s*["']?[^\s"',}]{8,})/gi;

export function redactSecrets(text: string): string {
  return String(text).replace(SECRET, "[redacted]");
}

export function sanitizeCall(call: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of CALL_FIELDS) {
    const v = call[k];
    if (v === undefined) continue;
    if (typeof v === "string") out[k] = redactSecrets(v).slice(0, k === "error" ? 500 : 200);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
  }
  return out;
}

export function eventsPath(fs: HostFs, jobDir: string): string {
  return fs.join(jobDir, "events.jsonl");
}
export function callsPath(fs: HostFs, jobDir: string): string {
  return fs.join(jobDir, "calls.jsonl");
}

const iso = (now: number) => new Date(now).toISOString();

export async function appendEvent(fs: HostFs, jobDir: string, event: JournalEvent, now = Date.now()): Promise<void> {
  const line = JSON.stringify({ t: iso(now), ...event }, (_k, v) => (typeof v === "string" ? redactSecrets(v) : v));
  await appendText(fs, eventsPath(fs, jobDir), line + "\n");
}

export async function appendCall(fs: HostFs, jobDir: string, call: CallRecord, now = Date.now()): Promise<void> {
  const rec = sanitizeCall({ ...call, t: call.t ?? iso(now) });
  await appendText(fs, callsPath(fs, jobDir), JSON.stringify(rec) + "\n");
}

export async function readJsonl<T = Record<string, unknown>>(fs: HostFs, path: string): Promise<{ records: T[]; badLines: number }> {
  if (!fs.existsSync(path)) return { records: [], badLines: 0 };
  const text = decodeText(await fs.readFile(path));
  const records: T[] = [];
  let badLines = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line) as T);
    } catch {
      badLines += 1;
    }
  }
  return { records, badLines };
}
