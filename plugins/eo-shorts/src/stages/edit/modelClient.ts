import type { StageContext } from "../../jobs/runner.ts";
import { createModelClient, type ModelClient } from "../../models/callModel.ts";
import { jsonlCallLog } from "../../models/callLog.ts";
import { jobModelsOverride } from "../../models/jobFields.ts";
import { storeFromHostFs } from "../../models/store.ts";
import type { AskAI } from "../../models/adapters/app.ts";

export function stageModelClient(ctx: StageContext): ModelClient {
  const store = storeFromHostFs(ctx.host.fs);
  const sdk = ctx.host.sdk;
  const askAI: AskAI | null = typeof sdk.askAI === "function" ? (input) => sdk.askAI!(input) : null;
  const fetchFn = typeof fetch === "function" ? (url: string, init?: RequestInit) => fetch(url, init) : null;
  return createModelClient({
    askAI,
    fetch: fetchFn,
    store,
    dataRoot: ctx.roots.data,
    jobOverride: jobModelsOverride(ctx.job),
    log: jsonlCallLog(store, () => ctx.path("calls.jsonl")),
  });
}
