import { sleep } from "../../host/util.ts";
import { ModelError } from "../errors.ts";
import { request, type FetchFn } from "../http.ts";
import type { AdapterRequest, AdapterResult, CallConfig, ModelAdapter } from "../types.ts";
import { checkImages, httpAvailability, systemWithJsonRule } from "./shared.ts";

export const OPENAI_BASE = "https://api.openai.com/v1";
export const OPENAI_MAX_IMAGES = 16;
export const POLL_FIRST_MS = 2_000;
export const POLL_MAX_MS = 15_000;

export interface HttpAdapterDeps {
  fetch: FetchFn;
  getKey: () => string | undefined;
  redact: (text: string) => string;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

function headers(key: string): Record<string, string> {
  return { "content-type": "application/json", authorization: "Bearer " + key };
}

export function openaiBody(req: AdapterRequest, cfg: CallConfig): Record<string, unknown> {
  const content: Record<string, unknown>[] = req.images.map((img) => ({
    type: "input_image",
    image_url: "data:" + img.mime + ";base64," + img.base64,
  }));
  content.push({ type: "input_text", text: req.prompt });
  const format =
    req.schema && cfg.structured
      ? { type: "json_schema", name: (req.schemaName || "result").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64), schema: req.schema, strict: true }
      : { type: "json_object" };
  const body: Record<string, unknown> = {
    model: cfg.model,
    instructions: systemWithJsonRule(req.system),
    input: [{ role: "user", content }],
    text: { format },
    store: cfg.background,
  };
  if (cfg.effort) body.reasoning = { effort: cfg.effort };
  if (cfg.maxOutputTokens) body.max_output_tokens = cfg.maxOutputTokens;
  if (cfg.background) body.background = true;
  return body;
}

export const OPENAI_ENDED_STATUSES = ["failed", "cancelled", "expired"];

export function openaiResult(r: any, cfg: CallConfig, redact: (s: string) => string, aborted = false): AdapterResult | null {
  const status = String(r?.status ?? "completed");
  if (status === "queued" || status === "in_progress") return null;
  const requestId = r?.id ? String(r.id) : undefined;
  if (status === "cancelled" && aborted) throw new ModelError("aborted", "Canceled.", { provider: "openai", requestId });
  if (OPENAI_ENDED_STATUSES.includes(status)) {
    const code = String(r?.error?.code ?? "");
    const kind = status === "failed" && /rate_limit|server_error|overloaded/i.test(code) ? "busy" : "failed";
    const text = "openai response " + (requestId ? requestId + " " : "") + status + (code ? " " + code : "") + ": " + String(r?.error?.message ?? "no answer");
    throw new ModelError(kind, redact(text).slice(0, 300), { provider: "openai", requestId, responseEnded: true });
  }
  let text = "";
  let refusal = "";
  for (const item of r?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c?.type === "output_text") text += String(c.text ?? "");
      else if (c?.type === "refusal") refusal += String(c.refusal ?? "");
    }
  }
  if (status === "incomplete") {
    const reason = String(r?.incomplete_details?.reason ?? "");
    throw new ModelError(reason === "content_filter" ? "refused" : "truncated", "openai response incomplete: " + (reason || "unknown"), { provider: "openai", requestId });
  }
  if (!text && refusal) throw new ModelError("refused", redact("openai refused: " + refusal).slice(0, 300), { provider: "openai", requestId });
  const u = r?.usage ?? {};
  return {
    text,
    model: String(r?.model ?? cfg.model ?? ""),
    effort: r?.reasoning?.effort ?? cfg.effort,
    requestId,
    usage: { inputTokens: u.input_tokens, outputTokens: u.output_tokens, reasoningTokens: u.output_tokens_details?.reasoning_tokens },
    stopReason: status,
  };
}

export function createOpenAIAdapter(deps: HttpAdapterDeps): ModelAdapter {
  const now = deps.now ?? (() => Date.now());
  const wait = deps.sleep ?? sleep;
  const base = (cfg: CallConfig) => (cfg.baseUrl || OPENAI_BASE).replace(/\/+$/, "");
  const keyOrThrow = () => {
    const key = deps.getKey();
    if (!key) throw new ModelError("unavailable", "no openai key", { provider: "openai" });
    return key;
  };
  const avail = httpAvailability({
    provider: "openai",
    now,
    getKey: deps.getKey,
    probe: async (cfg, key) => {
      await request(deps.fetch, base(cfg) + "/models", { method: "GET", headers: headers(key) }, { provider: "openai", timeoutMs: 15_000, redact: deps.redact });
    },
  });

  async function pollUntilDone(requestId: string, cfg: CallConfig, req: AdapterRequest): Promise<AdapterResult> {
    const key = keyOrThrow();
    const deadline = now() + cfg.timeoutMs;
    let pause = POLL_FIRST_MS;
    while (true) {
      const left = deadline - now();
      if (left <= 0) {
        void cancel(requestId, cfg, key);
        throw new ModelError("timeout", "openai background response " + requestId + " did not finish in time", { provider: "openai", requestId, responseEnded: true });
      }
      let r: any;
      try {
        r = (await request(deps.fetch, base(cfg) + "/responses/" + encodeURIComponent(requestId), { method: "GET", headers: headers(key) }, {
          provider: "openai",
          timeoutMs: Math.min(left, 60_000),
          signal: req.signal,
          redact: deps.redact,
        })).json;
      } catch (e) {
        if (e instanceof ModelError) {
          e.requestId = requestId;
          if (e.kind === "aborted") void cancel(requestId, cfg, key);
          if (e.status === 404) e.responseEnded = true;
        }
        throw e;
      }
      const done = openaiResult(r, cfg, deps.redact, req.signal?.aborted === true);
      if (done) return done;
      try {
        await wait(Math.min(pause, Math.max(0, deadline - now())), req.signal);
      } catch {
        void cancel(requestId, cfg, key);
        throw new ModelError("aborted", "Canceled.", { provider: "openai", requestId });
      }
      pause = Math.min(POLL_MAX_MS, Math.round(pause * 1.5));
    }
  }

  async function cancel(requestId: string, cfg: CallConfig, key: string): Promise<void> {
    try {
      await request(deps.fetch, base(cfg) + "/responses/" + encodeURIComponent(requestId) + "/cancel", { method: "POST", headers: headers(key), body: {} }, {
        provider: "openai",
        timeoutMs: 15_000,
        redact: deps.redact,
      });
    } catch {
    }
  }

  return {
    provider: "openai",
    caps: { maxImages: OPENAI_MAX_IMAGES, selectableModel: true, background: true },
    modelLabel: (cfg) => String(cfg.model ?? ""),
    markUnavailable: avail.markUnavailable,
    available: avail.available,
    async call(req, cfg) {
      checkImages(req.images, cfg);
      const key = keyOrThrow();
      const submitted = await request(deps.fetch, base(cfg) + "/responses", { method: "POST", headers: headers(key), body: openaiBody(req, cfg) }, {
        provider: "openai",
        timeoutMs: cfg.background ? Math.min(cfg.timeoutMs, 60_000) : cfg.timeoutMs,
        signal: req.signal,
        redact: deps.redact,
      });
      const r = submitted.json;
      const done = openaiResult(r, cfg, deps.redact, req.signal?.aborted === true);
      if (done) return done;
      const id = String(r?.id ?? "");
      if (!id) throw new ModelError("failed", "openai background response has no id", { provider: "openai" });
      await req.onRequestId?.(id);
      return pollUntilDone(id, cfg, req);
    },
    async poll(requestId, cfg, req) {
      return pollUntilDone(requestId, cfg, req);
    },
  };
}
