import { load, run, type PanelSdk } from "./host.ts";
import { ttsKey, type TtsRecord } from "./tts.ts";
import { joinScript } from "./timing.ts";

export type NarrationReference = { resourceId: string; durationSeconds: number; workflowId?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const J = JSON.stringify;

// r0/r1 are aliases for this app process, not persistent identities. A saved
// narration job resolves its original Audio Resource again, without generating
// speech or importing anything. Never search for a similar name or duration.
export async function resolveNarration(sdk: PanelSdk, projectId: string, ref: NarrationReference): Promise<NarrationReference> {
  if (!(ref.durationSeconds > 0) || !Number.isFinite(ref.durationSeconds)) throw new Error("narrationReferenceLost");
  if (ref.workflowId) {
    return run<NarrationReference>(sdk, {
      summary: "Verify the saved narration Resource",
      script: `const p = selects.project(${J(projectId)});
const job = selects.narration.job(${J(ref.workflowId)});
const status = await job.status();
if (status.projectId !== ${J(projectId)}) throw new Error("narrationReferenceLost");
const result = await job.result();
if (!result || !Number.isFinite(result.durationSeconds) || Math.abs(result.durationSeconds - ${J(ref.durationSeconds)}) > 0.05) throw new Error("narrationReferenceLost");
const resources = await p.resources();
const audio = resources.find((r: any) => r.resourceId === result.resourceId);
if (!audio || audio.type !== "Audio" || !Number.isFinite(audio.durationSeconds) || Math.abs(audio.durationSeconds - ${J(ref.durationSeconds)}) > 0.05) throw new Error("narrationReferenceLost");
return { resourceId: result.resourceId, durationSeconds: result.durationSeconds, workflowId: ${J(ref.workflowId)} };`,
    }).catch((e: any) => { throw new Error("narrationReferenceLost: " + String(e?.message || e)); });
  }
  // Public panel reads expose UUIDs (unlike run_script's short ids). A UUID
  // already recorded by a caller can be checked against this exact Project.
  // Legacy rN values never take this path, even if their metadata looks right.
  if (!UUID.test(ref.resourceId) || !sdk.call) throw new Error("narrationReferenceLost");
  const resources = await sdk.call("listProjectResources", projectId);
  const audio = Array.isArray(resources) && resources.find(r => r.resourceId === ref.resourceId);
  if (!audio || audio.type !== "Audio" || !Number.isFinite(audio.durationSeconds) || Math.abs(audio.durationSeconds - ref.durationSeconds) > 0.05) throw new Error("narrationReferenceLost");
  return ref;
}

// Older plans saved only rN. Recover their job from the matching TTS record,
// before any build writes. A record for another script/voice is not evidence.
export async function resolvePlanNarration(sdk: PanelSdk, s: {
  projectId: string | null; approved: string | null; voiceId: string;
  plan?: { narrationId: string; narrationWorkflowId?: string; durationSeconds: number; sentences: Array<{ text: string }> } | null;
}): Promise<NarrationReference> {
  const plan = s.plan!, projectId = s.projectId!;
  let workflowId = plan.narrationWorkflowId;
  if (!workflowId && !UUID.test(plan.narrationId)) {
    const rec = await load<TtsRecord>(sdk, ttsKey(projectId));
    if (rec?.state === "imported" && rec.projectId === projectId && rec.revision === s.approved && rec.voiceId === s.voiceId &&
      rec.resourceId === plan.narrationId && rec.text === joinScript(plan.sentences.map(x => x.text)) &&
      Math.abs((rec.durationSeconds ?? 0) - plan.durationSeconds) < 1e-6) workflowId = rec.workflowId;
  }
  return resolveNarration(sdk, projectId, { resourceId: plan.narrationId, durationSeconds: plan.durationSeconds, workflowId });
}
