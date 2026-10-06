import { ModelError } from "../errors.ts";
import { request } from "../http.ts";
import type { AdapterRequest, AdapterResult, CallConfig, Effort, ModelAdapter } from "../types.ts";
import type { HttpAdapterDeps } from "./openai.ts";
import { checkImages, httpAvailability, systemWithJsonRule } from "./shared.ts";

export const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_MAX_IMAGES = 16;

export function geminiHeaders(key: string): Record<string, string> {
  return { "content-type": "application/json", "x-goog-api-key": key };
}

const BUDGETS: Record<Effort, number> = { minimal: 128, low: 1024, medium: 8192, high: 24576, xhigh: 32768, max: 32768 };

export function geminiThinking(model: string, effort?: Effort): Record<string, unknown> | undefined {
  if (!effort) return undefined;
  if (/gemini-2\./i.test(model)) return { thinkingBudget: BUDGETS[effort] };
  return { thinkingLevel: effort === "minimal" || effort === "low" ? "low" : "high" };
}

export function geminiBody(req: AdapterRequest, cfg: CallConfig): Record<string, unknown> {
  const parts: Record<string, unknown>[] = req.images.map((img) => ({ inlineData: { mimeType: img.mime, data: img.base64 } }));
  parts.push({ text: req.prompt });
  const generationConfig: Record<string, unknown> = { responseMimeType: "application/json" };
  if (req.schema && cfg.structured) generationConfig.responseJsonSchema = req.schema;
  const thinking = geminiThinking(String(cfg.model ?? ""), cfg.effort);
  if (thinking) generationConfig.thinkingConfig = thinking;
  if (cfg.maxOutputTokens) generationConfig.maxOutputTokens = cfg.maxOutputTokens;
  return {
    systemInstruction: { parts: [{ text: systemWithJsonRule(req.system) }] },
    contents: [{ role: "user", parts }],
    generationConfig,
  };
}

const REFUSED = /SAFETY|RECITATION|PROHIBITED_CONTENT|BLOCKLIST|SPII|IMAGE_SAFETY/;

export function geminiResult(r: any, cfg: CallConfig): AdapterResult {
  const requestId = r?.responseId ? String(r.responseId) : undefined;
  const block = r?.promptFeedback?.blockReason;
  if (block) throw new ModelError("refused", "gemini blocked the prompt: " + String(block), { provider: "gemini", requestId });
  const cand = r?.candidates?.[0];
  const finish = String(cand?.finishReason ?? "");
  if (finish === "MAX_TOKENS") throw new ModelError("truncated", "gemini stopped at the output token limit", { provider: "gemini", requestId });
  if (REFUSED.test(finish)) throw new ModelError("refused", "gemini stopped: " + finish, { provider: "gemini", requestId });
  const text = (cand?.content?.parts ?? []).filter((p: any) => !p?.thought && typeof p?.text === "string").map((p: any) => p.text).join("");
  const u = r?.usageMetadata ?? {};
  return {
    text,
    model: String(r?.modelVersion ?? cfg.model ?? ""),
    effort: cfg.effort,
    requestId,
    usage: { inputTokens: u.promptTokenCount, outputTokens: u.candidatesTokenCount, reasoningTokens: u.thoughtsTokenCount },
    stopReason: finish,
  };
}

export function createGeminiAdapter(deps: HttpAdapterDeps): ModelAdapter {
  const now = deps.now ?? (() => Date.now());
  const base = (cfg: CallConfig) => (cfg.baseUrl || GEMINI_BASE).replace(/\/+$/, "");
  const avail = httpAvailability({
    provider: "gemini",
    now,
    getKey: deps.getKey,
    probe: async (cfg, key) => {
      await request(deps.fetch, base(cfg) + "/models?pageSize=1", { method: "GET", headers: geminiHeaders(key) }, { provider: "gemini", timeoutMs: 15_000, redact: deps.redact });
    },
  });
  return {
    provider: "gemini",
    caps: { maxImages: GEMINI_MAX_IMAGES, selectableModel: true, background: false },
    modelLabel: (cfg) => String(cfg.model ?? ""),
    markUnavailable: avail.markUnavailable,
    available: avail.available,
    async call(req, cfg) {
      checkImages(req.images, cfg);
      const key = deps.getKey();
      if (!key) throw new ModelError("unavailable", "no gemini key", { provider: "gemini" });
      const model = String(cfg.model ?? "").replace(/^models\//, "");
      const url = base(cfg) + "/models/" + encodeURIComponent(model) + ":generateContent";
      const res = await request(deps.fetch, url, { method: "POST", headers: geminiHeaders(key), body: geminiBody(req, cfg) }, {
        provider: "gemini",
        timeoutMs: cfg.timeoutMs,
        signal: req.signal,
        redact: deps.redact,
      });
      return geminiResult(res.json, cfg);
    },
  };
}
