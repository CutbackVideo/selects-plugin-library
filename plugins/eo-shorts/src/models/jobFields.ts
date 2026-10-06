import type { ConfigLayer } from "./config.ts";
import type { ModelResult } from "./types.ts";

export const JOB_MODELS_OVERRIDE_FIELD = "modelsOverride";

export function jobModelsOverride(job: { modelsOverride?: unknown } | null | undefined): ConfigLayer | null {
  const v = job?.modelsOverride;
  return v == null ? null : (v as ConfigLayer);
}

export interface ModelRecord {
  provider: string;
  model: string;
  effort?: string;
}

export function modelRecord(result: Pick<ModelResult, "provider" | "model" | "effort">): ModelRecord {
  return { provider: result.provider, model: result.model, ...(result.effort ? { effort: result.effort } : {}) };
}
