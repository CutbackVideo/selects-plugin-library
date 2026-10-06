import type { ModelStore } from "./store.ts";
import type { ExternalProvider } from "./types.ts";

export type ProviderKeys = Partial<Record<ExternalProvider, string>>;

export const KEYS_FILE = "keys.local.json";

export function keysPath(store: ModelStore, dataRoot: string): string {
  return store.join(dataRoot, "config", KEYS_FILE);
}

export async function loadProviderKeys(store: ModelStore | null | undefined, dataRoot: string | null | undefined): Promise<ProviderKeys> {
  if (!store || !dataRoot) return {};
  let text: string | null = null;
  try {
    text = await store.readText(keysPath(store, dataRoot));
  } catch {
    return {};
  }
  if (!text) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  const out: ProviderKeys = {};
  if (raw && typeof raw === "object") {
    for (const p of ["openai", "anthropic", "gemini"] as const) {
      const v = (raw as Record<string, unknown>)[p];
      if (typeof v === "string" && v.trim()) out[p] = v.trim();
    }
  }
  return out;
}

const KEY_PATTERNS: RegExp[] = [
  /\bsk-ant-[A-Za-z0-9_\-*]{6,}/g,
  /\bsk-[A-Za-z0-9_\-*]{6,}/g,
  /\bAIza[0-9A-Za-z_\-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._\-*]{8,}/gi,
];

export function makeRedactor(keys: ProviderKeys): (text: string) => string {
  const literals = Object.values(keys).filter((k): k is string => typeof k === "string" && k.length >= 6);
  return (text: string) => {
    let s = String(text ?? "");
    for (const k of literals) s = s.split(k).join("[redacted]");
    for (const re of KEY_PATTERNS) s = s.replace(re, "[redacted]");
    return s;
  };
}
