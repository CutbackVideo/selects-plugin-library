// Scene edits are one run_script transaction. No narration, captions or tracks
// are removed; the host validates every graphic before the single commit.
import { run, type PanelSdk } from "./host.ts";
import { TEMPLATES } from "../templates/generated.ts";
import type { PreviewDraft, ScenePlan } from "./flow.ts";
import type { ScriptCall } from "./scripts.ts";

export type GraphicProgram = { tsxCode: string; parameters: Record<string, any>; editableParameters: any[] };
export type SceneSnapshot = { index: number; clipId: number; trackId: string; startFrame: number; endFrame: number; signature: string; program: GraphicProgram };
export type GraphicEdit = { index: number; parameters: Record<string, any>; tsxCode?: string; editableParameters?: any[] };
const J = JSON.stringify;
const SIGNATURE = `const signature = (c: any, p: any) => {
  const stable = (v: any): string => Array.isArray(v) ? "[" + v.map(stable).join(",") + "]" : v && typeof v === "object" ? "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}" : JSON.stringify(v ?? null);
  const s = stable([c.clipId, c.trackId, c.startFrame, c.endFrame, p]);
  let a = 2166136261, b = 5381;
  for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ s.charCodeAt(i); }
  return s.length + ":" + (a >>> 0) + ":" + (b >>> 0);
};`;

export function readScenesScript(preview: PreviewDraft, plan: ScenePlan, onlyIndex?: number): ScriptCall {
  const targets = preview.scenes.map((p, index) => ({
    index, clipId: p.clipId, startFrame: Math.round(p.startSec * 30000 / 1001), endFrame: Math.round(p.endSec * 30000 / 1001),
    label: `${(TEMPLATES as any)[plan.scenes[index]?.type]?.label ?? plan.scenes[index]?.type} ${String(index + 1).padStart(2, "0")}`,
  })).filter(t => onlyIndex === undefined || t.index === onlyIndex);
  return { summary: "Read the current news graphics", script: `const d = selects.draft(${J(preview.draftId)});
if (typeof (d as any).setMotionGraphicProgram !== "function") throw new Error("graphicEditorNeedsUpdate");
${SIGNATURE}
const graphics = await d.motionGraphics();
const redactAssets = (v: any): any => typeof v === "string" && (v.startsWith("data:") || v.length > 3000) ? "[embedded asset retained by host]" : Array.isArray(v) ? v.map(redactAssets) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, value]) => [k, redactAssets(value)])) : v;
const out: any[] = [];
for (const t of ${J(targets)} as any[]) {
  const matches = graphics.filter(g => t.clipId != null ? g.clip.clipId === t.clipId : g.name === t.label && g.clip.startFrame === t.startFrame && g.clip.endFrame === t.endFrame);
  if (matches.length !== 1) throw new Error("graphicTargetChanged: " + (t.index + 1));
  const c = matches[0].clip, program = await d.motionGraphicProgram(c);
  if (!program) throw new Error("graphicTargetChanged: " + (t.index + 1));
  out.push({ index: t.index, clipId: c.clipId, trackId: c.trackId, startFrame: c.startFrame, endFrame: c.endFrame, signature: signature(c, program), program: { ...program, parameters: redactAssets(program.parameters) } });
}
return out;` };
}

export async function readSceneSnapshots(sdk: PanelSdk, p: PreviewDraft, plan: ScenePlan): Promise<SceneSnapshot[]> {
  // Each graphic may carry a photo and its own embedded font. Reading a full
  // minute in one reply can exceed run_script's result limit even though each
  // individual graphic fits. Keep replies bounded just like initial assembly.
  const snapshots: SceneSnapshot[] = [];
  for (let i = 0; i < p.scenes.length; i++) {
    const rows = await run<SceneSnapshot[]>(sdk, readScenesScript(p, plan, i));
    const row = rows.find(r => r.index === i);
    if (!row) throw new Error("graphicTargetChanged: " + (i + 1));
    snapshots.push(row);
  }
  return snapshots;
}

export function editScenesScript(draftId: string, snapshots: SceneSnapshot[], edits: GraphicEdit[]): ScriptCall {
  const indexes = new Set<number>();
  const rows = edits.map(edit => {
    const snap = snapshots.find(s => s.index === edit.index);
    if (!snap || indexes.has(edit.index)) throw new Error("invalid or repeated scene target");
    indexes.add(edit.index);
    return { ...edit, clipId: snap.clipId, signature: snap.signature };
  });
  if (!rows.length) throw new Error("no graphic edits");
  return { summary: "Update only the requested news graphics", allowCommit: true, script: `const d = selects.draft(${J(draftId)});
${SIGNATURE}
const edits: any[] = ${J(rows)};
// Check all targets against the state seen by the editor before any mutation.
const before = await d.clips({ trackScope: "all" });
for (const e of edits) {
  const c = before.find(c => c.clipId === e.clipId);
  if (!c || signature(c, await d.motionGraphicProgram(c)) !== e.signature) throw new Error("graphicTargetChanged: " + (e.index + 1));
}
for (const e of edits) {
  const clip = (await d.clips({ trackScope: "all" })).find(c => c.clipId === e.clipId)!;
  if (e.tsxCode !== undefined) {
    const current = (await d.motionGraphicProgram(clip))!;
    await d.setMotionGraphicProgram({ clip, tsxCode: e.tsxCode, parameters: { ...current.parameters, ...e.parameters }, editableParameters: e.editableParameters ?? current.editableParameters });
  } else await d.setMotionGraphicParameters({ clip, parameters: e.parameters });
}
await d.commitAll("News short: requested graphics only");
return { updated: edits.map(e => e.index) };` };
}

export async function applySceneEdits(sdk: PanelSdk, draftId: string, snapshots: SceneSnapshot[], edits: GraphicEdit[]) {
  return run<{ updated: number[] }>(sdk, editScenesScript(draftId, snapshots, edits));
}
