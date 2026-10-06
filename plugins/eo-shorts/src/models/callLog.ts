import type { ErrorKind } from "./errors.ts";
import type { ModelStore } from "./store.ts";
import type { Provider } from "./types.ts";

export type CallStatus = "ok" | "cache" | "error" | "invalid_output" | "skipped";

export interface CallLogEntry {
  t: string;
  jobId: string;
  role: string;
  provider: Provider;
  model: string;
  effort?: string;
  promptSha: string;
  promptChars: number;
  images: number;
  imageChars: number;
  status: CallStatus;
  attempt: number;
  cacheHit: boolean;
  latencyMs: number;
  textChars?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  requestId?: string;
  servedModel?: string;
  reask?: boolean;
  fallbackFrom?: Provider[];
  errorKind?: ErrorKind;
  httpStatus?: number;
  error?: string;
}

export type CallLogSink = (entry: CallLogEntry) => void | Promise<void>;

export function jsonlCallLog(store: ModelStore, pathFor: (jobId: string) => string): CallLogSink {
  return (entry) => store.appendText(pathFor(entry.jobId), JSON.stringify(entry) + "\n");
}

export function memoryCallLog(): CallLogSink & { entries: CallLogEntry[] } {
  const entries: CallLogEntry[] = [];
  const sink = ((entry: CallLogEntry) => {
    entries.push(entry);
  }) as CallLogSink & { entries: CallLogEntry[] };
  sink.entries = entries;
  return sink;
}
