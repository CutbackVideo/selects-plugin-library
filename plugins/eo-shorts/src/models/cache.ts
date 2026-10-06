import { canonicalJson, sha256Hex } from "../host/util.ts";
import type { ModelStore } from "./store.ts";
import type { JsonSchema, Provider, Usage } from "./types.ts";

export function jobCacheScope(jobId: string): string {
  return "job:" + jobId;
}

export const SHARED_CACHE_SCOPE = "shared";

export interface CacheKeyParts {
  scope: string;
  role: string;
  provider: Provider;
  model: string;
  effort?: string;
  system?: string;
  prompt: string;
  schema?: JsonSchema;
  images: string[];
}

export function callCacheKey(parts: CacheKeyParts): Promise<string> {
  return sha256Hex(
    canonicalJson({
      v: 2,
      scope: parts.scope,
      role: parts.role,
      provider: parts.provider,
      model: parts.model,
      effort: parts.effort ?? null,
      system: parts.system ?? null,
      prompt: parts.prompt,
      schema: parts.schema ?? null,
      images: parts.images,
    }),
  );
}

export interface CachedCall {
  schema: "eo-call-cache/1";
  key: string;
  scope?: string;
  role: string;
  provider: Provider;
  model: string;
  effort?: string;
  createdAt: string;
  text: string;
  json: unknown;
  usage?: Usage;
  requestId?: string;
  latencyMs: number;
  servedModel?: string;
  fallbackFrom?: Provider[];
}

export interface CallCache {
  get(key: string): Promise<CachedCall | null>;
  put(entry: CachedCall): Promise<void>;
}

export function fileCallCache(store: ModelStore, dataRoot: string): CallCache {
  const pathFor = (key: string) => store.join(dataRoot, "cache", "calls", key + ".json");
  return {
    async get(key) {
      try {
        const text = await store.readText(pathFor(key));
        if (!text) return null;
        const entry = JSON.parse(text) as CachedCall;
        return entry && entry.schema === "eo-call-cache/1" && entry.key === key && typeof entry.text === "string" ? entry : null;
      } catch {
        return null;
      }
    },
    async put(entry) {
      try {
        await store.writeText(pathFor(entry.key), JSON.stringify(entry));
      } catch {
      }
    },
  };
}

export function memoryCallCache(): CallCache & { entries: Map<string, CachedCall> } {
  const entries = new Map<string, CachedCall>();
  return {
    entries,
    async get(key) {
      return entries.get(key) ?? null;
    },
    async put(entry) {
      entries.set(entry.key, entry);
    },
  };
}
