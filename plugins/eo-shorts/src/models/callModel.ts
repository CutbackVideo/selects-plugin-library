import { errorMessage, sha256Hex, sleep as hostSleep } from "../host/util.ts";
import { createAnthropicAdapter } from "./adapters/anthropic.ts";
import { createAppAdapter, type AskAI, type ServedModelObserver } from "./adapters/app.ts";
import { createGeminiAdapter } from "./adapters/gemini.ts";
import { createOpenAIAdapter } from "./adapters/openai.ts";
import { SHARED_CACHE_SCOPE, callCacheKey, fileCallCache, jobCacheScope, type CachedCall, type CallCache } from "./cache.ts";
import type { CallLogEntry, CallLogSink } from "./callLog.ts";
import { callConfigFor, loadModelsConfig, providerChain, textRole, type ConfigLayer } from "./config.ts";
import { ModelCallFailed, ModelError } from "./errors.ts";
import type { FetchFn } from "./http.ts";
import { parseModelJson, reaskPrompt, schemaInstruction } from "./json.ts";
import { decideRetry, newRetryState } from "./retry.ts";
import { loadProviderKeys, makeRedactor, type ProviderKeys } from "./secrets.ts";
import type { ModelStore } from "./store.ts";
import type { AdapterRequest, AdapterResult, CallConfig, ModelAdapter, ModelCall, ModelResult, ModelsConfig, Provider } from "./types.ts";

interface Step {
  provider: Provider;
  adapter: ModelAdapter;
  cfg: CallConfig;
  model: string;
  key: string;
  lastResort: boolean;
}

export interface ModelClientDeps {
  askAI?: AskAI | null;
  fetch?: FetchFn | null;
  store?: ModelStore | null;
  dataRoot?: string | null;
  config?: ModelsConfig | null;
  jobOverride?: ConfigLayer | null;
  keys?: ProviderKeys | null;
  log?: CallLogSink | null;
  cache?: CallCache | null;
  shareCacheAcrossJobs?: boolean;
  adapters?: Partial<Record<Provider, ModelAdapter>>;
  observer?: ServedModelObserver | null;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export interface ModelClient {
  callModel(c: ModelCall): Promise<ModelResult>;
  config(): Promise<ModelsConfig>;
  reload(): void;
}

function imageChars(c: ModelCall): number {
  return (c.images ?? []).reduce((n, i) => n + (i.base64?.length ?? 0), 0);
}

export function createModelClient(deps: ModelClientDeps): ModelClient {
  const now = deps.now ?? (() => Date.now());
  const wait = deps.sleep ?? hostSleep;
  const cache: CallCache | null = deps.cache !== undefined ? deps.cache : deps.store && deps.dataRoot ? fileCallCache(deps.store, deps.dataRoot) : null;
  let configP: Promise<ModelsConfig> | null = null;
  let keys: ProviderKeys = deps.keys ?? {};
  let keysLoaded = !!deps.keys;
  let redact = makeRedactor(keys);
  const fetchFn: FetchFn = deps.fetch ?? ((url, init) => fetch(url, init));
  const http = (p: "openai" | "anthropic" | "gemini") => ({ fetch: fetchFn, getKey: () => keys[p], redact: (s: string) => redact(s), now, sleep: wait });
  const adapters: Record<Provider, ModelAdapter> = {
    app: createAppAdapter({ askAI: deps.askAI, now, observer: deps.observer }),
    openai: createOpenAIAdapter(http("openai")),
    anthropic: createAnthropicAdapter(http("anthropic")),
    gemini: createGeminiAdapter(http("gemini")),
    ...(deps.adapters ?? {}),
  } as Record<Provider, ModelAdapter>;

  function config(): Promise<ModelsConfig> {
    if (deps.config) return Promise.resolve(deps.config);
    if (!configP) {
      configP = loadModelsConfig({ store: deps.store, dataRoot: deps.dataRoot, jobOverride: deps.jobOverride }).then((r) => r.config);
      configP.catch(() => {
        configP = null;
      });
    }
    return configP;
  }

  async function ensureKeys(): Promise<void> {
    if (keysLoaded) return;
    keys = await loadProviderKeys(deps.store, deps.dataRoot);
    redact = makeRedactor(keys);
    keysLoaded = true;
  }

  async function log(entry: CallLogEntry): Promise<void> {
    if (!deps.log) return;
    try {
      await deps.log(entry);
    } catch {
    }
  }

  async function callModel(c: ModelCall): Promise<ModelResult> {
    if (c.signal?.aborted) throw new ModelError("aborted", "Canceled.");
    const cfgAll = await config();
    const role = textRole(cfgAll, c.role);
    await ensureKeys();
    const images = c.images ?? [];
    const prompt = c.schema && c.schemaInPrompt ? c.prompt + schemaInstruction(c.schema) : c.prompt;
    const promptSha = await sha256Hex(prompt);
    const imageShas = await Promise.all(images.map((i) => sha256Hex(i.base64 ?? "")));
    const scope = c.cacheScope ?? (deps.shareCacheAcrossJobs ? SHARED_CACHE_SCOPE : jobCacheScope(c.jobId));
    const useCache = !!cache && c.cache !== false;
    const stamp = () => new Date(now()).toISOString();
    const chain = providerChain(role);
    const steps: Step[] = await Promise.all(
      chain.map(async (provider, i) => {
        const adapter = adapters[provider];
        const cfg = callConfigFor(cfgAll, c.role, provider, adapter.caps.maxImages);
        const model = adapter.modelLabel(cfg);
        const key = await callCacheKey({ scope, role: c.role, provider, model, effort: cfg.effort, system: c.system, prompt, schema: c.schema, images: imageShas });
        return { provider, adapter, cfg, model, key, lastResort: i === chain.length - 1 };
      }),
    );
    const logBase = (s: Step, fallbackFrom: Provider[]) => ({
      jobId: c.jobId,
      role: c.role,
      provider: s.provider,
      model: s.model,
      effort: s.cfg.effort,
      promptSha,
      promptChars: prompt.length + (c.system?.length ?? 0),
      images: images.length,
      imageChars: imageChars(c),
      ...(fallbackFrom.length ? { fallbackFrom: fallbackFrom.slice() } : {}),
    });

    if (useCache) {
      for (const s of steps) {
        const t0 = now();
        const hit = await cache!.get(s.key);
        if (!hit) continue;
        const parsed = parseModelJson(hit.text, c.schema, c.validate);
        if (!parsed.ok) continue;
        const fallbackFrom = Array.isArray(hit.fallbackFrom) ? hit.fallbackFrom : [];
        await log({ ...logBase(s, fallbackFrom), model: hit.model || s.model, t: stamp(), status: "cache", attempt: 0, cacheHit: true, latencyMs: now() - t0, textChars: hit.text.length, requestId: hit.requestId, inputTokens: hit.usage?.inputTokens, outputTokens: hit.usage?.outputTokens });
        return {
          role: c.role,
          text: hit.text,
          json: parsed.value,
          provider: s.provider,
          model: hit.model || s.model,
          effort: hit.effort,
          requestId: hit.requestId,
          usage: hit.usage,
          latencyMs: hit.latencyMs,
          attempt: 0,
          cacheHit: true,
          reasked: false,
          fallbackFrom,
          servedModel: hit.servedModel,
        };
      }
    }

    const failures: ModelError[] = [];
    const tried: Provider[] = [];
    for (const s of steps) {
      const { provider, adapter, cfg, model } = s;
      const base = logBase(s, tried);
      const ctx = { lastResort: s.lastResort };

      const avail = await adapter.available(cfg, ctx);
      if (!avail.ok) {
        const err = new ModelError("unavailable", redact(avail.reason), { provider });
        failures.push(err);
        await log({ ...base, t: stamp(), status: "skipped", attempt: 0, cacheHit: false, latencyMs: 0, errorKind: err.kind, error: err.message.slice(0, 300) });
        tried.push(provider);
        continue;
      }

      const state = newRetryState();
      let reasks = 0;
      let attempt = 0;
      let resumeId = provider === "openai" && adapter.poll ? c.resumeRequestId : undefined;
      const baseReq: AdapterRequest = {
        system: c.system,
        prompt,
        images,
        schema: c.schema,
        schemaName: c.schemaName,
        signal: c.signal,
        onRequestId: c.onRequestId ? (requestId) => c.onRequestId!({ jobId: c.jobId, role: c.role, provider, requestId }) : undefined,
      };
      let req = baseReq;

      while (true) {
        if (c.signal?.aborted) throw new ModelError("aborted", "Canceled.", { provider });
        attempt += 1;
        const t0 = now();
        let res: AdapterResult;
        try {
          res = resumeId ? await adapter.poll!(resumeId, cfg, req) : await adapter.call(req, cfg);
        } catch (e) {
          const err = e instanceof ModelError ? e : new ModelError("failed", redact(errorMessage(e)).slice(0, 300), { provider });
          err.provider ??= provider;
          const latencyMs = now() - t0;
          await log({ ...base, t: stamp(), status: "error", attempt, cacheHit: false, latencyMs, errorKind: err.kind, httpStatus: err.status, requestId: err.requestId, error: redact(err.message).slice(0, 300), ...(reasks ? { reask: true } : {}) });
          if (err.kind === "aborted") throw err;
          if (resumeId) {
            const transient = (err.kind === "busy" || err.kind === "network" || err.kind === "timeout") && !err.responseEnded;
            if (!transient) {
              resumeId = undefined;
              if (err.kind !== "timeout" && (err.responseEnded || err.kind === "bad_request")) continue;
            }
          }
          const d = decideRetry(err, state, cfg);
          if (d.retry) {
            try {
              await wait(d.waitMs, c.signal);
            } catch {
              throw new ModelError("aborted", "Canceled.", { provider });
            }
            const still = await adapter.available(cfg, ctx);
            if (!still.ok) {
              failures.push(new ModelError("unavailable", redact(still.reason), { provider }));
              break;
            }
            continue;
          }
          let final = err;
          if (d.unavailable && err.kind === "fast_failure") {
            final = new ModelError("unavailable", "Selects AI unavailable (account/session): " + state.fast + " quick failures in a row. " + err.message, { provider });
          }
          if (d.unavailable) adapter.markUnavailable(final.message);
          failures.push(final);
          break;
        }
        resumeId = undefined;
        const latencyMs = now() - t0;
        const parsed = parseModelJson(res.text, c.schema, c.validate);
        const metrics = {
          latencyMs,
          textChars: res.text.length,
          inputTokens: res.usage?.inputTokens,
          outputTokens: res.usage?.outputTokens,
          reasoningTokens: res.usage?.reasoningTokens,
          requestId: res.requestId,
          servedModel: res.servedModel,
          ...(reasks ? { reask: true } : {}),
        };
        if (!parsed.ok) {
          await log({ ...base, model: res.model || model, t: stamp(), status: "invalid_output", attempt, cacheHit: false, ...metrics, errorKind: "invalid_output", error: parsed.reason.slice(0, 300) });
          if (reasks < cfg.reask) {
            reasks += 1;
            req = { ...baseReq, prompt: reaskPrompt(prompt, parsed.reason) };
            continue;
          }
          failures.push(new ModelError("invalid_output", parsed.reason.slice(0, 300), { provider, requestId: res.requestId }));
          break;
        }
        await log({ ...base, model: res.model || model, effort: res.effort ?? cfg.effort, t: stamp(), status: "ok", attempt, cacheHit: false, ...metrics });
        const result: ModelResult = {
          role: c.role,
          text: res.text,
          json: parsed.value,
          provider,
          model: res.model || model,
          effort: res.effort ?? cfg.effort,
          requestId: res.requestId,
          usage: res.usage,
          latencyMs,
          attempt,
          cacheHit: false,
          reasked: reasks > 0,
          fallbackFrom: tried.slice(),
          servedModel: res.servedModel,
        };
        if (useCache) {
          const entry: CachedCall = {
            schema: "eo-call-cache/1",
            key: s.key,
            scope,
            role: c.role,
            provider,
            model: result.model,
            effort: result.effort,
            createdAt: stamp(),
            text: result.text,
            json: result.json,
            usage: result.usage,
            requestId: result.requestId,
            latencyMs,
            servedModel: result.servedModel,
            fallbackFrom: tried.slice(),
          };
          await cache!.put(entry).catch(() => {});
        }
        return result;
      }
      tried.push(provider);
    }
    throw new ModelCallFailed(c.role, failures);
  }

  return {
    callModel,
    config,
    reload() {
      configP = null;
      if (!deps.keys) keysLoaded = false;
    },
  };
}

let defaultClient: ModelClient | null = null;

export function configureModels(deps: ModelClientDeps): ModelClient {
  defaultClient = createModelClient(deps);
  return defaultClient;
}

export function callModel(c: ModelCall): Promise<ModelResult> {
  if (!defaultClient) return Promise.reject(new ModelError("config", "callModel() before configureModels()"));
  return defaultClient.callModel(c);
}
