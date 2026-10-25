import type { PanelSdk } from "./host.ts";

// sdk.aiProviders / askAI.provider: the host owns models and credentials.
export type AiProvider = "chatgpt" | "claude" | "selects";
export type AiProviderStatus = "connected" | "disconnected" | "unavailable" | "error";
export type AiProviders = Record<AiProvider, AiProviderStatus>;
export const AI_PROVIDERS: AiProvider[] = ["chatgpt", "claude", "selects"];
export const isAiProvider = (value: unknown): value is AiProvider => AI_PROVIDERS.includes(value as AiProvider);

// An explicit choice survives reconnects. Unknown connection state is not permission to spend credits.
export function scriptProvider(providers: AiProviders | null, preferred?: AiProvider): AiProvider | null {
  if (isAiProvider(preferred)) return preferred;
  if (!providers) return null;
  if (providers.chatgpt === "connected") return "chatgpt";
  if (providers.claude === "connected") return "claude";
  if (providers.chatgpt === "error" || providers.claude === "error") return null;
  return providers.selects === "connected" ? "selects" : null;
}

export async function readAiProviders(sdk: PanelSdk): Promise<AiProviders> {
  if (typeof sdk.aiProviders !== "function") throw new Error("providerUpdateRequired");
  const result = await sdk.aiProviders();
  if (!result || AI_PROVIDERS.some((id) => !["connected", "disconnected", "unavailable", "error"].includes(result[id])))
    throw new Error("providerReadFailed");
  return result;
}

/** One source for every LLM workload, including repairs and retries. Never an unqualified ask. */
export async function selectedAi(sdk: PanelSdk, provider: AiProvider): Promise<PanelSdk> {
  if (!isAiProvider(provider)) throw new Error("providerChoose");
  const status = await readAiProviders(sdk);
  if (AI_PROVIDERS.every((id) => status[id] === "unavailable")) throw new Error("providerUnavailable");
  if (status[provider] !== "connected") throw new Error("providerNotConnected");
  if (!sdk.askAI) throw new Error("noAI");
  return { ...sdk, askAI: (input) => sdk.askAI!({ ...input, provider }) };
}
