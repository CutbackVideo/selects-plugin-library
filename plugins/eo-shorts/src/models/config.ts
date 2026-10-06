import DEFAULT_MODELS_JSON from "../../config/models.json" with { type: "json" };
import { ModelError } from "./errors.ts";
import type { ModelStore } from "./store.ts";
import {
  EFFORTS,
  PROVIDERS,
  type CallConfig,
  type MediaRoleConfig,
  type ModelsConfig,
  type Provider,
  type ProviderSettings,
  type RoleConfig,
} from "./types.ts";

export const DEFAULT_MODELS: ModelsConfig = DEFAULT_MODELS_JSON as ModelsConfig;

export const APP_MAX_TIMEOUT_MS = 600_000;
export const APP_MIN_TIMEOUT_MS = 1_000;

export type ConfigLayer = Partial<Pick<ModelsConfig, "roles" | "providers">> & { schema?: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const LAYER_KEYS = ["schema", "roles", "providers"];

export function layerProblems(layer: unknown, name: string): string[] {
  if (layer == null) return [];
  if (!isObject(layer)) return [name + " must be an object with roles and/or providers"];
  const problems: string[] = [];
  const unknown = Object.keys(layer).filter((k) => !LAYER_KEYS.includes(k) && !/^[$_]/.test(k));
  if (unknown.length) {
    problems.push(
      name + " has unknown keys " + unknown.map((k) => JSON.stringify(k)).join(", ") +
        ' (a layer is {"roles": {...}, "providers": {...}}; the image model is roles.image)',
    );
  }
  if (layer.schema !== undefined && layer.schema !== "eo-models/1") problems.push(name + '.schema must be "eo-models/1"');
  for (const key of ["roles", "providers"]) {
    if (layer[key] !== undefined && !isObject(layer[key])) problems.push(name + "." + key + " must be an object");
  }
  return problems;
}

export function layerSetsAnything(layer: ConfigLayer | null | undefined): boolean {
  if (!isObject(layer)) return false;
  return (isObject(layer.roles) && Object.keys(layer.roles).length > 0) || (isObject(layer.providers) && Object.keys(layer.providers).length > 0);
}

export function mergeModelsConfig(...layers: (ConfigLayer | null | undefined)[]): ModelsConfig {
  const out: ModelsConfig = { schema: "eo-models/1", roles: {}, providers: {} };
  for (const layer of layers) {
    if (!isObject(layer)) continue;
    if (isObject(layer.roles)) {
      for (const [name, role] of Object.entries(layer.roles)) {
        if (!isObject(role)) continue;
        out.roles[name] = { ...(out.roles[name] ?? {}), ...role } as RoleConfig | MediaRoleConfig;
      }
    }
    if (isObject(layer.providers)) {
      const providers = out.providers as Record<string, Record<string, unknown>>;
      for (const [name, settings] of Object.entries(layer.providers)) {
        if (!isObject(settings)) continue;
        providers[name] = { ...(providers[name] ?? {}), ...settings };
      }
    }
  }
  return out;
}

export function validateModelsConfig(cfg: ModelsConfig): string[] {
  const errors: string[] = [];
  if (cfg.schema !== "eo-models/1") errors.push('schema must be "eo-models/1"');
  for (const [name, role] of Object.entries(cfg.roles)) {
    const at = "roles." + name;
    if (role.kind === "media") {
      if (role.provider !== "app") errors.push(at + ".provider: a media role runs through the app (MediaGeneration)");
      if (typeof role.model !== "string" || !role.model) errors.push(at + ".model: the MediaGeneration modelId is required");
      continue;
    }
    if (role.kind !== undefined && role.kind !== "text") errors.push(at + '.kind: "text" or "media"');
    if (!PROVIDERS.includes(role.provider)) errors.push(at + ".provider: one of " + PROVIDERS.join(", "));
    if (!(typeof role.timeoutMs === "number" && role.timeoutMs > 0)) errors.push(at + ".timeoutMs: a positive number");
    if (role.effort !== undefined && !EFFORTS.includes(role.effort)) errors.push(at + ".effort: one of " + EFFORTS.join(", "));
    for (const key of ["timeoutRetries", "reask", "maxImagesPerCall", "maxOutputTokens"] as const) {
      const v = role[key];
      if (v !== undefined && !(Number.isInteger(v) && v >= 0)) errors.push(at + "." + key + ": a whole number >= 0");
    }
    if (role.fallback !== undefined) {
      if (!Array.isArray(role.fallback)) errors.push(at + ".fallback: a list of providers");
      else for (const p of role.fallback) if (!PROVIDERS.includes(p)) errors.push(at + ".fallback: unknown provider " + JSON.stringify(p));
    }
  }
  for (const [name, settings] of Object.entries(cfg.providers)) {
    if (!PROVIDERS.includes(name as Provider)) errors.push("providers." + name + ": unknown provider");
    const effort = (settings as { effort?: string })?.effort;
    if (effort !== undefined && !EFFORTS.includes(effort as never)) errors.push("providers." + name + ".effort: one of " + EFFORTS.join(", "));
  }
  return errors;
}

export interface LoadedModelsConfig {
  config: ModelsConfig;
  sources: string[];
}

export async function loadModelsConfig(opts: {
  store?: ModelStore | null;
  dataRoot?: string | null;
  jobOverride?: ConfigLayer | null;
}): Promise<LoadedModelsConfig> {
  const sources = ["package"];
  let owner: ConfigLayer | null = null;
  if (opts.store && opts.dataRoot) {
    const path = opts.store.join(opts.dataRoot, "config", "models.json");
    const text = await opts.store.readText(path);
    if (text != null && text.trim()) {
      try {
        owner = JSON.parse(text) as ConfigLayer;
      } catch (e) {
        throw new ModelError("config", "config/models.json is not valid JSON: " + String((e as Error).message).slice(0, 160));
      }
      const problems = layerProblems(owner, "config/models.json");
      if (problems.length) throw new ModelError("config", problems.join("; "));
      if (layerSetsAnything(owner)) sources.push("plugin-data");
    }
  }
  const job = opts.jobOverride ?? null;
  const jobProblems = layerProblems(job, "job.json modelsOverride");
  if (jobProblems.length) {
    throw new ModelError(
      "config",
      jobProblems.join("; ") + ". job.json `models` records what answered; a pinned override goes in job.json modelsOverride as {roles, providers}",
    );
  }
  if (layerSetsAnything(job)) sources.push("job");
  const config = mergeModelsConfig(DEFAULT_MODELS, owner, job);
  const errors = validateModelsConfig(config);
  if (errors.length) throw new ModelError("config", "models.json: " + errors.join("; "));
  return { config, sources };
}

export function textRole(cfg: ModelsConfig, role: string): RoleConfig {
  const r = cfg.roles[role];
  if (!r) throw new ModelError("config", 'models.json has no role "' + role + '"');
  if (r.kind === "media") throw new ModelError("config", 'role "' + role + '" is a media role; read it with mediaRole()');
  return r;
}

export function mediaRole(cfg: ModelsConfig, role = "image"): MediaRoleConfig {
  const r = cfg.roles[role];
  if (!r || r.kind !== "media") throw new ModelError("config", 'models.json has no media role "' + role + '"');
  return r;
}

export function providerChain(role: RoleConfig): Provider[] {
  const out: Provider[] = [];
  for (const p of [role.provider, ...(role.fallback ?? [])]) if (!out.includes(p)) out.push(p);
  return out;
}

export function callConfigFor(cfg: ModelsConfig, roleName: string, provider: Provider, capsMaxImages: number): CallConfig {
  const role = textRole(cfg, roleName);
  const primary = provider === role.provider;
  const fixed = provider === "app";
  const settings: ProviderSettings = fixed ? {} : (cfg.providers[provider] ?? {});
  let timeoutMs = role.timeoutMs;
  if (provider === "app") timeoutMs = Math.min(APP_MAX_TIMEOUT_MS, Math.max(APP_MIN_TIMEOUT_MS, timeoutMs));
  return {
    role: roleName,
    provider,
    model: fixed ? undefined : (primary ? role.model : undefined) ?? settings.model,
    effort: fixed ? undefined : role.effort ?? settings.effort,
    timeoutMs,
    timeoutRetries: role.timeoutRetries ?? 1,
    reask: role.reask ?? 1,
    maxImages: Math.min(capsMaxImages, role.maxImagesPerCall ?? capsMaxImages),
    background: provider === "openai" && role.background === true,
    stream: role.stream ?? true,
    structured: role.structured === true,
    maxOutputTokens: role.maxOutputTokens ?? settings.maxOutputTokens,
    baseUrl: settings.baseUrl,
    probe: settings.probe ?? true,
    label: provider === "app" ? cfg.providers.app?.label : undefined,
  };
}
