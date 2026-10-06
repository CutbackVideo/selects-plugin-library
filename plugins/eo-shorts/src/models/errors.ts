import type { Provider } from "./types.ts";

export type ErrorKind =
  | "fast_failure"
  | "busy"
  | "timeout"
  | "network"
  | "auth"
  | "unavailable"
  | "too_large"
  | "bad_request"
  | "truncated"
  | "refused"
  | "invalid_output"
  | "aborted"
  | "config"
  | "failed";

export class ModelError extends Error {
  kind: ErrorKind;
  provider?: Provider;
  status?: number;
  retryAfterMs?: number;
  requestId?: string;
  responseEnded?: boolean;

  constructor(
    kind: ErrorKind,
    message: string,
    opts: { provider?: Provider; status?: number; retryAfterMs?: number; requestId?: string; responseEnded?: boolean } = {},
  ) {
    super(message);
    this.name = "ModelError";
    this.kind = kind;
    this.provider = opts.provider;
    this.status = opts.status;
    this.retryAfterMs = opts.retryAfterMs;
    this.requestId = opts.requestId;
    if (opts.responseEnded) this.responseEnded = true;
  }
}

export class ModelCallFailed extends Error {
  role: string;
  failures: ModelError[];
  kind: ErrorKind;

  constructor(role: string, failures: ModelError[]) {
    const parts = failures.map((f) => (f.provider || "?") + ": " + f.kind + " (" + f.message.slice(0, 200) + ")");
    super('Model call for role "' + role + '" failed. ' + (parts.join("; ") || "No provider is configured."));
    this.name = "ModelCallFailed";
    this.role = role;
    this.failures = failures;
    this.kind = failures[0]?.kind ?? "config";
  }
}

export function isModelError(e: unknown): e is ModelError {
  return e instanceof ModelError;
}
