// Selects generation (models through the app's MediaGeneration service). Every result is delivered into
// this plugin's data folder so it can be measured before it goes into the Project.
import { di, fs, libraryId, sleep } from "./host";

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const model = (endpoint: string) => "model_v1_" + b64url(endpoint);

const FAILED = new Set(["failed", "cancelled", "canceled", "input_failed", "submission_rejected", "upload_failed", "handoff_failed"]);

export class StuckError extends Error {}

// Submit and wait, resubmitting (with a fresh key) when a job never gets going.
export async function generate(pid: string, r: GenRequest, label: string, onTick?: (s: string) => void, timeoutMs?: number, tries = 3): Promise<string> {
  let last: any = null;
  for (let k = 0; k < tries; k += 1) {
    try {
      const id = await submit(pid, k ? { ...r, key: r.key.slice(0, 56) + "-r" + k } : r);
      return await waitFor(pid, id, label, onTick, timeoutMs);
    } catch (e) {
      last = e;
      if (!(e instanceof StuckError)) throw e;
      if (onTick) onTick(label + ": retrying");
    }
  }
  throw last;
}

export function mediaGeneration() {
  const mg = di().MediaGeneration;
  if (!mg?.isAvailable?.()) throw new Error("Selects generation is not available for this account.");
  if (!mg.supportsPluginFiles?.()) throw new Error("This needs Selects 2.0.512 or later (plug-in generation files). Update Selects.");
  return mg;
}

export type GenRequest = {
  key: string;
  endpoint: string;
  input: Record<string, any>;
  folder: string;
  outputName: string;
  tool: "video" | "audio" | "image";
  recipeId: string;
  uploads?: Record<string, any>;
  inputMediaSeconds?: Record<string, number>;
};

export async function submit(pid: string, r: GenRequest): Promise<string> {
  const mg = mediaGeneration();
  (await fs().mkdir(r.folder, { recursive: true }));
  const res = await mg.submit({
    scope: { libraryId: libraryId(), projectId: pid },
    key: r.key.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64),
    modelId: model(r.endpoint),
    input: r.input,
    ...(r.inputMediaSeconds ? { inputMediaSeconds: r.inputMediaSeconds } : {}),
    uploads: r.uploads || {},
    delivery: { pluginFolder: r.folder },
    outputName: r.outputName,
    batch: 1,
    origin: { tool: r.tool, tab: "a16z-style-captions", recipeId: r.recipeId },
  });
  const id = res?.jobIds?.[0];
  if (!id) throw new Error("Generation was not accepted.");
  return id;
}

// Wait for one job; resolves with the delivered file path.
export async function waitFor(pid: string, jobId: string, label: string, onTick?: (s: string) => void, timeoutMs = 15 * 60000): Promise<string> {
  const mg = mediaGeneration();
  const scope = { libraryId: libraryId(), projectId: pid };
  const t0 = Date.now();
  let redeliveries = 0;
  for (;;) {
    await sleep(1500);
    const j = (await mg.list(scope)).find((x: any) => x.jobId === jobId);
    if (j) {
      if (j.deliveryStatus === "delivered") {
        const p = (j.outputs || []).find((o: any) => o.path)?.path;
        if (!p) throw new Error(label + ": nothing came back.");
        return p;
      }
      // The result exists but fetching it failed: ask for it again rather than paying for a new one.
      if (["download_failed", "result_collection_failed"].includes(j.deliveryStatus) && j.status === "succeeded" && redeliveries < 3) {
        redeliveries += 1;
        if (onTick) onTick(label + ": fetching the result again");
        await mg.retryDelivery(scope, jobId).catch(() => {});
        await sleep(2000 * redeliveries);
        continue;
      }
      if (FAILED.has(j.status) || ["download_failed", "result_collection_failed"].includes(j.deliveryStatus)) {
        const code = String(j.errorCode || j.status || j.deliveryStatus);
        // Upload hand-offs to the provider fail now and then; a fresh submission usually goes through.
        if (/upload|handoff|submission_rejected|input_failed/.test(code + " " + j.status)) throw new StuckError(label + " failed (" + code + ").");
        throw new Error(label + " failed (" + code + ").");
      }
      // A request whose admission reply was lost and that the server cannot find was never accepted, and one
      // still preparing with an error after a minute and a half (e.g. the upload could not be verified) is stuck.
      if (j.status === "submission_unknown" && j.errorCode && Date.now() - t0 > 45000) {
        mg.cancel(scope, jobId).catch(() => {});
        throw new StuckError(label + " was not accepted (" + j.errorCode + ").");
      }
      if (["preparing", "uploading", "submitting"].includes(j.status) && j.errorCode && Date.now() - t0 > 90000) {
        mg.cancel(scope, jobId).catch(() => {});
        throw new StuckError(label + " stalled (" + j.errorCode + ").");
      }
    }
    if (onTick) onTick(label + " · " + Math.round((Date.now() - t0) / 1000) + " s");
    if (Date.now() - t0 > timeoutMs) {
      mg.cancel(scope, jobId).catch(() => {});
      throw new Error(label + " took too long.");
    }
  }
}
