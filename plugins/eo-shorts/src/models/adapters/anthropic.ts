import { ModelError } from "../errors.ts";
import { request, sseEvents, toTransportError } from "../http.ts";
import type { AdapterRequest, AdapterResult, CallConfig, ModelAdapter } from "../types.ts";
import type { HttpAdapterDeps } from "./openai.ts";
import { checkImages, httpAvailability, systemWithJsonRule } from "./shared.ts";

export const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
export const ANTHROPIC_VERSION = "2023-06-01";
export const ANTHROPIC_MAX_IMAGES = 20;
export const ANTHROPIC_STREAM_MAX_TOKENS = 64_000;
export const ANTHROPIC_PLAIN_MAX_TOKENS = 16_000;

export function anthropicHeaders(key: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": key,
    "anthropic-version": ANTHROPIC_VERSION,
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

function takesEffort(model: string): boolean {
  return !/haiku|claude-3|sonnet-4-5|sonnet-4-0|opus-4-5|opus-4-1|opus-4-0/i.test(model);
}

export function anthropicBody(req: AdapterRequest, cfg: CallConfig): Record<string, unknown> {
  const model = String(cfg.model ?? "");
  const content: Record<string, unknown>[] = req.images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mime, data: img.base64 },
  }));
  content.push({ type: "text", text: req.prompt });
  const body: Record<string, unknown> = {
    model,
    max_tokens: cfg.maxOutputTokens ?? (cfg.stream ? ANTHROPIC_STREAM_MAX_TOKENS : ANTHROPIC_PLAIN_MAX_TOKENS),
    system: systemWithJsonRule(req.system),
    messages: [{ role: "user", content }],
  };
  const output: Record<string, unknown> = {};
  if (takesEffort(model)) {
    body.thinking = { type: "adaptive" };
    if (cfg.effort) output.effort = cfg.effort === "minimal" ? "low" : cfg.effort;
  }
  if (req.schema && cfg.structured) output.format = { type: "json_schema", schema: req.schema };
  if (Object.keys(output).length) body.output_config = output;
  if (cfg.stream) body.stream = true;
  return body;
}

function finish(text: string, stopReason: string, model: string, requestId: string | undefined, usage: AdapterResult["usage"], cfg: CallConfig, redact: (s: string) => string): AdapterResult {
  if (stopReason === "max_tokens") throw new ModelError("truncated", "anthropic stopped at max_tokens", { provider: "anthropic", requestId });
  if (stopReason === "refusal") throw new ModelError("refused", redact("anthropic refused the request").slice(0, 300), { provider: "anthropic", requestId });
  return { text, model: model || String(cfg.model ?? ""), effort: cfg.effort, requestId, usage, stopReason };
}

function inputTokens(u: any): number | undefined {
  if (!u || typeof u.input_tokens !== "number") return undefined;
  return u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
}

export function anthropicResult(r: any, cfg: CallConfig, redact: (s: string) => string): AdapterResult {
  const text = (r?.content ?? []).filter((b: any) => b?.type === "text").map((b: any) => String(b.text ?? "")).join("");
  return finish(text, String(r?.stop_reason ?? ""), String(r?.model ?? ""), r?.id, { inputTokens: inputTokens(r?.usage), outputTokens: r?.usage?.output_tokens }, cfg, redact);
}

export async function anthropicStreamResult(body: ReadableStream<Uint8Array>, cfg: CallConfig, redact: (s: string) => string): Promise<AdapterResult> {
  let text = "";
  let model = "";
  let id: string | undefined;
  let stopReason = "";
  let input: number | undefined;
  let output: number | undefined;
  let stopped = false;
  const textBlocks = new Set<number>();
  for await (const ev of sseEvents(body)) {
    if (!ev.data) continue;
    let d: any;
    try {
      d = JSON.parse(ev.data);
    } catch {
      continue;
    }
    switch (d?.type) {
      case "message_start":
        id = d.message?.id;
        model = String(d.message?.model ?? "");
        input = inputTokens(d.message?.usage);
        output = d.message?.usage?.output_tokens ?? output;
        break;
      case "content_block_start":
        if (d.content_block?.type === "text") {
          textBlocks.add(d.index);
          text += String(d.content_block.text ?? "");
        }
        break;
      case "content_block_delta":
        if (d.delta?.type === "text_delta" && (textBlocks.has(d.index) || !textBlocks.size)) text += String(d.delta.text ?? "");
        break;
      case "message_delta":
        if (d.delta?.stop_reason) stopReason = String(d.delta.stop_reason);
        if (typeof d.usage?.output_tokens === "number") output = d.usage.output_tokens;
        if (typeof d.usage?.input_tokens === "number") input = inputTokens(d.usage) ?? input;
        break;
      case "message_stop":
        stopped = true;
        break;
      case "error": {
        const type = String(d.error?.type ?? "");
        const kind = /overloaded|api_error|rate_limit/i.test(type) ? "busy" : "failed";
        throw new ModelError(kind, redact("anthropic stream error " + type + ": " + String(d.error?.message ?? "")).slice(0, 300), { provider: "anthropic", requestId: id });
      }
    }
  }
  if (!stopped) throw new ModelError("failed", "anthropic stream ended before message_stop", { provider: "anthropic", requestId: id });
  return finish(text, stopReason, model, id, { inputTokens: input, outputTokens: output }, cfg, redact);
}

export function createAnthropicAdapter(deps: HttpAdapterDeps): ModelAdapter {
  const now = deps.now ?? (() => Date.now());
  const base = (cfg: CallConfig) => (cfg.baseUrl || ANTHROPIC_BASE).replace(/\/+$/, "");
  const avail = httpAvailability({
    provider: "anthropic",
    now,
    getKey: deps.getKey,
    probe: async (cfg, key) => {
      await request(deps.fetch, base(cfg) + "/models?limit=1", { method: "GET", headers: anthropicHeaders(key) }, { provider: "anthropic", timeoutMs: 15_000, redact: deps.redact });
    },
  });
  return {
    provider: "anthropic",
    caps: { maxImages: ANTHROPIC_MAX_IMAGES, selectableModel: true, background: false },
    modelLabel: (cfg) => String(cfg.model ?? ""),
    markUnavailable: avail.markUnavailable,
    available: avail.available,
    async call(req, cfg) {
      checkImages(req.images, cfg);
      const key = deps.getKey();
      if (!key) throw new ModelError("unavailable", "no anthropic key", { provider: "anthropic" });
      const opts = { provider: "anthropic" as const, timeoutMs: cfg.timeoutMs, signal: req.signal, redact: deps.redact, stream: cfg.stream };
      const res = await request(deps.fetch, base(cfg) + "/messages", { method: "POST", headers: anthropicHeaders(key), body: anthropicBody(req, cfg) }, opts);
      if (!cfg.stream) return anthropicResult(res.json, cfg, deps.redact);
      try {
        if (!res.response.body) throw new ModelError("failed", "anthropic stream has no body", { provider: "anthropic" });
        return await anthropicStreamResult(res.response.body, cfg, deps.redact);
      } catch (e) {
        throw toTransportError(e, "anthropic", res.timedOut(), deps.redact);
      } finally {
        res.done();
      }
    },
  };
}
