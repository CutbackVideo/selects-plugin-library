import { ModelError } from "../errors.ts";
import type { AdapterRequest, AdapterResult, Availability, AvailabilityContext, CallConfig, ModelAdapter, ModelImage } from "../types.ts";
import { APP_FAST_FAILURE_MS } from "../retry.ts";
import { checkImages, strikeTracker } from "./shared.ts";

export const APP_LIMITS = {
  maxChars: 1_000_000,
  contextTokens: 258_000,
  baseTokens: 15_000,
  outputReserveTokens: 50_000,
  charsPerToken: 3.4,
  tokensPerImage: 2_500,
  maxImages: 4,
  maxImageChars: 1_500_000,
  maxTotalImageChars: 4_000_000,
  guardMs: 60_000,
};

export const APP_PREAMBLE_TEXT =
  "Pure text task: do NOT use any tools, do not read or change the project, and do not search. Everything you need is below. Reply with ONLY one JSON object, no Markdown fences.";
export const APP_PREAMBLE_IMAGES =
  "Pure text-and-image task: do NOT use any tools, do not read or change the project, and do not search. Everything you need is below and in the attached images. Reply with ONLY one JSON object, no Markdown fences.";

export type AskAI = (input: {
  prompt: string;
  timeoutMs?: number;
  images?: { dataUrl: string; name?: string }[];
  ephemeral?: boolean;
}) => Promise<{ text: string }>;

export interface ServedModelObserver {
  begin(): unknown;
  end(token: unknown): { servedModel?: string; effort?: string; inputTokens?: number; outputTokens?: number; reasoningTokens?: number } | null;
}

export function composeAppPrompt(req: AdapterRequest): string {
  const head = req.images.length ? APP_PREAMBLE_IMAGES : APP_PREAMBLE_TEXT;
  return head + "\n\n" + (req.system ? req.system + "\n\n" : "") + req.prompt;
}

export function estimateAppTokens(chars: number, images: number): number {
  const L = APP_LIMITS;
  return Math.ceil(chars / L.charsPerToken) + images * L.tokensPerImage + L.baseTokens + L.outputReserveTokens;
}

export function checkAppSize(prompt: string, images: ModelImage[]): { chars: number; estTokens: number } {
  const chars = prompt.length;
  const estTokens = estimateAppTokens(chars, images.length);
  if (chars > APP_LIMITS.maxChars) {
    throw new ModelError("too_large", "the prompt is " + chars + " characters; Selects AI takes at most " + APP_LIMITS.maxChars, { provider: "app" });
  }
  if (estTokens > APP_LIMITS.contextTokens) {
    throw new ModelError("too_large", "the prompt is about " + estTokens + " tokens with output room; Selects AI fits " + APP_LIMITS.contextTokens, { provider: "app" });
  }
  return { chars, estTokens };
}

const CLIENT_REJECTIONS =
  /accepts at most \d+ images|must stay under|base64 characters|not a base64 data URL|cannot be empty|interactive input|unsupported|image \d+ is/i;

export function classifyAppError(e: unknown, elapsedMs: number): ModelError {
  if (e instanceof ModelError) return e;
  const msg = String((e as Error)?.message ?? e ?? "");
  const text = "Selects AI: " + msg.slice(0, 280);
  if (/did not finish within/i.test(msg)) return new ModelError("timeout", text, { provider: "app" });
  if (/exceeds the maximum length/i.test(msg)) return new ModelError("too_large", text, { provider: "app" });
  if (CLIENT_REJECTIONS.test(msg)) return new ModelError("bad_request", text, { provider: "app" });
  if (elapsedMs < APP_FAST_FAILURE_MS && /something went wrong|could not complete/i.test(msg)) {
    return new ModelError("fast_failure", text, { provider: "app" });
  }
  return new ModelError("failed", text, { provider: "app" });
}

export interface AppAdapterDeps {
  askAI: AskAI | null | undefined;
  now?: () => number;
  observer?: ServedModelObserver | null;
}

export function createAppAdapter(deps: AppAdapterDeps): ModelAdapter {
  const now = deps.now ?? (() => Date.now());
  const strikes = strikeTracker(now);
  const label = (cfg: CallConfig) => "selects-app-ai/" + (cfg.label || "account-default");
  return {
    provider: "app",
    caps: { maxImages: APP_LIMITS.maxImages, selectableModel: false, background: false },
    modelLabel: label,
    markUnavailable: (reason) => strikes.strike(reason),
    async available(_cfg: CallConfig, ctx: AvailabilityContext = {}): Promise<Availability> {
      if (typeof deps.askAI !== "function") return { ok: false, reason: "this Selects build has no panel askAI" };
      const held = strikes.check(ctx.lastResort === true);
      if (!held) return { ok: true };
      const why = held.startsWith("Selects AI unavailable") ? held : "Selects AI unavailable (account/session): " + held;
      return { ok: false, reason: strikes.state() === "down" ? why + " (several calls in a row)" : why };
    },
    async call(req: AdapterRequest, cfg: CallConfig): Promise<AdapterResult> {
      const askAI = deps.askAI;
      if (typeof askAI !== "function") throw new ModelError("unavailable", "this Selects build has no panel askAI", { provider: "app" });
      checkImages(req.images, cfg, { maxImageChars: APP_LIMITS.maxImageChars, maxTotalChars: APP_LIMITS.maxTotalImageChars });
      const prompt = composeAppPrompt(req);
      checkAppSize(prompt, req.images);
      if (req.signal?.aborted) throw new ModelError("aborted", "Canceled.", { provider: "app" });
      const images = req.images.map((img, i) => ({ dataUrl: "data:" + img.mime + ";base64," + img.base64, name: img.name || "Image " + (i + 1) }));
      const token = deps.observer?.begin();
      const started = now();
      let guard: ReturnType<typeof setTimeout> | null = null;
      let onAbort: (() => void) | null = null;
      try {
        const answer = await new Promise<{ text: string }>((resolve, reject) => {
          guard = setTimeout(
            () => reject(new ModelError("timeout", "Selects AI did not answer within " + Math.round((cfg.timeoutMs + APP_LIMITS.guardMs) / 1000) + " s", { provider: "app" })),
            cfg.timeoutMs + APP_LIMITS.guardMs,
          );
          onAbort = () => reject(new ModelError("aborted", "Canceled.", { provider: "app" }));
          req.signal?.addEventListener("abort", onAbort, { once: true });
          askAI({ prompt, timeoutMs: cfg.timeoutMs, ephemeral: true, ...(images.length ? { images } : {}) }).then(resolve, (e) =>
            reject(classifyAppError(e, now() - started)),
          );
        });
        strikes.clear();
        const seen = deps.observer?.end(token) ?? null;
        return {
          text: String(answer?.text ?? ""),
          model: label(cfg),
          servedModel: seen?.servedModel,
          effort: seen?.effort,
          usage: seen && (seen.inputTokens != null || seen.outputTokens != null)
            ? { inputTokens: seen.inputTokens, outputTokens: seen.outputTokens, reasoningTokens: seen.reasoningTokens }
            : undefined,
        };
      } catch (e) {
        deps.observer?.end(token);
        throw e;
      } finally {
        if (guard) clearTimeout(guard);
        if (onAbort) req.signal?.removeEventListener("abort", onAbort);
      }
    },
  };
}
