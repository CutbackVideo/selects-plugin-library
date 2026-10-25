// Preview operations use only the public run_script SDK. No extra AI or narration calls.
import { readFileBytes, run, sleep, type PanelSdk } from "./host.ts";
import { removeScript } from "./scripts.ts";
import { ENTRANCE, HOLD } from "../templates/entrance.generated.ts";

export type PreviewTarget = { projectId: string; draftId: string };
// enterSec: seconds from the scene's first frame until its card has fully come in (0 or absent: the first frame).
export type PreviewScene = { startSec: number; endSec: number; enterSec?: number };
export type SceneTarget = PreviewTarget & { frames: number; scene: PreviewScene };
export type SceneStill = { dataUrl: string; ms: number; cached: boolean };
const J = (v: unknown) => JSON.stringify(v);
export const FPS = 30000 / 1001;

// Match assemble.ts PRELUDE exactly, including its half-open end. Empty windows have no graphic.
export function sceneFrames(frames: number, scene: PreviewScene) {
  if (!Number.isSafeInteger(frames) || frames < 1 || !Number.isFinite(scene.startSec) || !Number.isFinite(scene.endSec)) throw new Error("invalid preview scene frames");
  const start = Math.max(0, Math.min(frames - 1, Math.round(scene.startSec * FPS)));
  const end = Math.min(frames, Math.round(scene.endSec * FPS));
  if (end <= start) throw new Error("preview scene range is empty");
  const enter = Math.max(0, Number(scene.enterSec) || 0);
  return { start, end, enter: Math.min(end - 1, start + Math.ceil(enter * FPS - 1e-6)), still: Math.max(start, Math.min(end - 1, end - Math.round(0.5 * FPS))) };
}

// When a scene graphic `frames` long has finished coming in, in seconds from its first frame: the template's own
// `natural` (its last entrance at normal speed), or, when the clip is too short for that and the final hold,
// the earlier point useScene (src/heritage/shared.jsx) speeds the entrances up to.
export function entranceSec(type: string, params: Record<string, unknown>, frames: number): number {
  const f = (ENTRANCE as Record<string, (data: unknown, fps: number, durationInFrames: number) => number>)[type];
  if (!f || !(frames >= 1)) return 0;
  const natural = Number(f(params, FPS, frames));
  const end = frames / FPS, room = Math.max(end * 0.5, end - HOLD);
  return Number.isFinite(natural) && natural > 0 ? Math.min(natural, room) : 0;
}

function ownership(x: PreviewTarget) {
  if (!x.projectId?.trim() || !x.draftId?.trim()) throw new Error("preview Project and Draft are required");
  return `const state = await selects.editor.state();
if (state?.projectId !== ${J(x.projectId)} || !Array.isArray(state.draftIds) || !state.draftIds.includes(${J(x.draftId)})) throw new Error("preview Draft does not belong to the open Project");`;
}

function matches(state: any, x: PreviewTarget, frame?: number): boolean {
  return state?.projectId === x.projectId && state.onScreenTab?.kind === "draft" && state.onScreenTab.sequenceId === x.draftId &&
    Array.isArray(state.draftIds) && state.draftIds.includes(x.draftId) &&
    (frame === undefined || (state.playhead?.sequenceId === x.draftId && state.playhead.resolvedFrame === frame));
}

// UI requests are asynchronous. Check a bounded number of fresh snapshots, never infer success from requested.
async function confirm(sdk: PanelSdk, x: PreviewTarget, frame?: number): Promise<boolean> {
  for (let i = 0; i < 5; i++) {
    const state = await run(sdk, { summary: "Confirm the preview position", script: "return await selects.editor.state();" });
    if (matches(state, x, frame)) return true;
    if (state?.projectId !== x.projectId || !state.draftIds?.includes(x.draftId)) return false;
    if (i < 4) await sleep(100);
  }
  return false;
}

export async function openPreview(sdk: PanelSdk, x: PreviewTarget): Promise<boolean> {
  await run(sdk, { summary: "Open the preview Draft", script: `${ownership(x)}\nreturn await selects.editor.openDraft(${J(x.draftId)});` });
  return confirm(sdk, x);
}

export async function seekScene(sdk: PanelSdk, x: SceneTarget): Promise<{ confirmed: boolean; frame: number }> {
  const frame = sceneFrames(x.frames, x.scene).enter;
  await run(sdk, { summary: "Go to the preview scene", script: `${ownership(x)}\nreturn await selects.editor.seekDraftFrame(${J({ projectId: x.projectId, draftSequenceId: x.draftId, resolvedFrame: frame })});` });
  return { confirmed: await confirm(sdk, x, frame), frame };
}

export async function renameDraft(sdk: PanelSdk, x: PreviewTarget & { name: string }): Promise<void> {
  if (!x.name?.trim()) throw new Error("preview Draft name is empty");
  await run(sdk, { summary: "Approve the preview Draft", allowCommit: true, script: `${ownership(x)}
const d = selects.draft(${J(x.draftId)});
await d.setName(${J(x.name)});
await d.commitAll("News short: approve preview");
return true;` });
}

type Cache = { results: Map<string, SceneStill>; pending: Map<string, Promise<SceneStill>>; tail: Promise<unknown>; generation: number };
const caches = new WeakMap<PanelSdk, Cache>();
const CACHE_LIMIT = 24;
let serial = 0;
export function clearPreviewCache(sdk: PanelSdk): void {
  const c = caches.get(sdk);
  if (c) { c.generation++; c.results.clear(); c.pending.clear(); }
}
function cacheFor(sdk: PanelSdk): Cache {
  let c = caches.get(sdk);
  if (!c) { c = { results: new Map(), pending: new Map(), tail: Promise.resolve(), generation: 0 }; caches.set(sdk, c); }
  return c;
}

export async function sceneStill(sdk: PanelSdk, env: { tmp: string; sep: string }, x: SceneTarget & { key: string }): Promise<SceneStill> {
  const frame = sceneFrames(x.frames, x.scene).still;
  if (!x.key || !env.tmp || !["/", "\\"].includes(env.sep)) throw new Error("preview cache key and temporary folder are required");
  const guard = ownership(x);
  const c = cacheFor(sdk);
  // Include ownership and exact bounds even when callers accidentally reuse their key across scenes/projects.
  const key = J([x.projectId, x.draftId, x.frames, x.scene, x.key]);
  const existing = c.results.get(key);
  if (existing) return { ...existing, cached: true };
  const pending = c.pending.get(key);
  if (pending) return { ...await pending, cached: true };
  const generation = c.generation;
  const task = c.tail.then(async () => {
    if (generation !== c.generation) throw new Error("preview render was invalidated");
    const path = env.tmp.replace(/[\\/]+$/, "") + env.sep + "news-minute-preview-" + Date.now() + "-" + (++serial) + "-" + Math.random().toString(36).slice(2) + ".png";
    const t0 = Date.now();
    let bytes: Uint8Array;
    try {
      const output = await run<{ byteSize: number }>(sdk, { summary: "Render the complete preview scene", allowCommit: true, script: `${guard}\nreturn await selects.export.still(${J({ projectId: x.projectId, draftSequenceId: x.draftId, resolvedFrame: frame, outPath: path })});` });
      bytes = await readFileBytes(sdk, path);
      if (!Number.isSafeInteger(output?.byteSize) || output.byteSize < 8 || bytes.length !== output.byteSize ||
        ![137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) throw new Error("preview PNG is missing or truncated");
    } finally {
      // Cleanup must not replace a render/read error. The host owns eventual temp-directory cleanup.
      await run(sdk, removeScript(path)).catch(() => {});
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const result = { dataUrl: "data:image/png;base64," + btoa(binary), ms: Date.now() - t0, cached: false };
    if (generation !== c.generation) throw new Error("preview render was invalidated");
    c.results.set(key, result);
    if (c.results.size > CACHE_LIMIT) c.results.delete(c.results.keys().next().value!);
    return result;
  });
  c.pending.set(key, task);
  c.tail = task.catch(() => {});
  try { return await task; } finally { if (c.pending.get(key) === task) c.pending.delete(key); }
}
