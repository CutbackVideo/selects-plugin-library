// New drafts link the background (V1) and narration (A1) in one Main source.
// Stack: plate -> frame -> scenes -> bands -> headline -> captions -> disclaimers.
// Multi-call builds always create a candidate; they never clear an existing draft.
// Visual revisions use scene-edits.ts and commit all requested changes together.

import { TEMPLATES } from "../templates/generated.ts";
import type { Preset } from "../preset.ts";
import type { ScriptCall } from "./scripts.ts";

export type SceneClip = { type: string; label: string; params: Record<string, unknown>; startSec: number; endSec: number; disclaimer: boolean; program?: { tsxCode: string; editableParameters: any[] } };
export type TextClip = { text: string; startSec: number; endSec: number };
export type AssemblyInput = {
  projectId: string;
  draftName: string;
  plateId: string;
  plateSeconds: number;
  narrationId: string;
  narrationSeconds: number;
  bandsId?: string; // image Resource for the bands; without it the frame graphic draws them
  headline: { line1: string; line2: string; accent?: string };
  preset: Preset;
  scenes: SceneClip[];
  captions: TextClip[];
  // Adds per-graphic parameters such as the embedded font (fontFamily, fontCss, fontLoads).
  decorate?: (params: Record<string, unknown>) => Record<string, unknown>;
  // Font parameters for the headline in place of decorate (an installed headline face).
  headlineFont?: Record<string, unknown>;
};

const J = (v: unknown) => JSON.stringify(v);
// run_script rejects scripts over 262,144 bytes (Selects Staging 2.0.763), so scene batches stay well under it.
export const SCRIPT_MAX_BYTES = 262_144;
export const SCENE_BATCH_BYTES = 180_000;

function tpl(type: string) {
  const t = (TEMPLATES as Record<string, { tsxCode: string; editableParameters: unknown[]; timeIndependent: boolean; label: string }>)[type];
  if (!t) throw new Error("unknown template " + type);
  return t;
}

// Shared prelude: frame helpers over a committed Draft.
const PRELUDE = `const fps = 30000 / 1001;
const F = (s: number) => Math.round(s * fps);
// clips() omits gaps. Use the draft duration so the ending hold is covered too.
const total = (await d.meta()).durationFrames;
const win = async (a: number, b: number) => {
  const s = Math.max(0, Math.min(total - 1, F(a))), e = Math.min(total, F(b));
  return e > s ? await d.rangeAtFrames(s, e) : null;
};
const mg = async (label: string, tsxCode: string, parameters: any, editableParameters: any, timeIndependent: boolean, a: number, b: number) => {
  const within = await win(a, b);
  if (within) return await d.addMotionGraphic({ label, tsxCode, parameters, editableParameters, timeIndependent, within });
};`;

// Frame graphic above the linked Main source (without a bands image).
function narrationAndFrame(x: AssemblyInput): string {
  const frame = tpl("frame");
  const deco = x.decorate ?? ((p: Record<string, unknown>) => p);
  const L = x.preset.layout;
  const frameParams = deco({ background: x.preset.background, accentColor: x.preset.accentColor, logoMain: x.preset.logoMain, logoAccent: x.preset.logoAccent, tagline: x.preset.tagline, windowTop: L.windowTop, windowBottom: L.frameWindowBottom, fontFamily: "" });
  return `${PRELUDE}
${x.bandsId ? "" : `await mg(${J(frame.label)}, ${J(frame.tsxCode)}, ${J(frameParams)}, ${J(frame.editableParameters)}, true, 0, total / fps);`}`;
}

export type LinkedSource = { resourceId: string; narrationFrames: number; endSeconds: number };

// Project writes persist immediately, so keep source creation in its own run.
export function linkedSourceScript(x: AssemblyInput): ScriptCall {
  if (!(x.narrationSeconds > 0)) throw new Error("narration length unknown");
  if (x.plateSeconds < x.narrationSeconds + 0.5) throw new Error("background plate shorter than the narration and ending hold");
  return {
    summary: "Link the news background and narration",
    allowCommit: true,
    script: `const p = selects.project(${J(x.projectId)});
// Keep both media on a common, explicit clock; no waveform sync is needed.
// A fresh source belongs to this candidate, so older edits remain unchanged.
const source = await p.createSyncedTimeline({ name: ${J(x.draftName + " · V1 A1")} });
await source.addClips({ tracks: [
  { clips: [{ resourceId: ${J(x.plateId)}, startFrame: 0 }] },
  { clips: [{ resourceId: ${J(x.narrationId)}, startFrame: 0 }] },
] });
const layout = await source.layout();
const audio = layout.placements.filter(c => c.trackKind === "Audio");
const video = layout.placements.filter(c => c.trackKind === "Video");
if (audio.length !== 1 || video.length !== 1 || audio[0].baseStartFrame !== 0 || video[0].baseStartFrame !== 0)
  throw new Error("linked background/narration layout is invalid");
const fps = 30000 / 1001;
const narrationFrames = Math.round(audio[0].baseEndFrame / layout.frameRate * fps);
const endSeconds = (narrationFrames + Math.round(0.5 * fps)) / fps;
if (video[0].baseEndFrame / layout.frameRate < endSeconds) throw new Error("background plate shorter than the placed narration and ending hold");
return { resourceId: source.resourceId!, narrationFrames, endSeconds };`
  };
}

export function baseDraftScript(x: AssemblyInput, source: LinkedSource): ScriptCall {
  return {
    summary: "Build the news short Draft",
    allowCommit: true,
    script: `const p = selects.project(${J(x.projectId)});
const d = await p.createDraft({ name: ${J(x.draftName)} });
await d.setSettings({ frameRate: "30000/1001", frameSize: { width: 1080, height: 1920 } });
await d.insertResource({ resourceId: ${J(source.resourceId)}, sourceRange: { startSeconds: 0, endSeconds: ${J(source.endSeconds)} } });
const narrationFrames = ${J(source.narrationFrames)};
${narrationAndFrame(x)}
const out: any = await d.commitAll("News short: frame and narration");
return { draftId: out.createdDraftId ?? null, frames: total, narrationFrames };`,
  };
}

// Selects rejects a graphic whose parameter does not match its control's type (addMotionGraphic: "Editable
// parameter 'value' does not match its definition"). The planner may send 3592 where the control is text, so
// numbers become text for text controls and numeric text becomes a number for number controls.
export function fitControls(type: string, params: Record<string, unknown>): Record<string, unknown> {
  return fitEditableControls(tpl(type).editableParameters as Array<{ key: string; type: string }>, params);
}

// A custom program can change a template's controls. Coerce against the actual
// definitions, including when a scene-row input returns numeric text.
export function fitEditableControls(definitions: Array<{ key: string; type: string }>, params: Record<string, unknown>): Record<string, unknown> {
  const out = { ...params };
  for (const d of definitions) {
    const v = out[d.key];
    if (d.type === "text" && typeof v === "number") out[d.key] = String(v);
    else if (d.type === "number" && typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) out[d.key] = Number(v);
  }
  return out;
}

// Scene graphics in batches that keep each script under SCENE_BATCH_BYTES.
export function sceneScripts(draftId: string, scenes: SceneClip[]): ScriptCall[] {
  const batches: SceneClip[][] = [];
  let cur: SceneClip[] = [], size = 0;
  for (const s of scenes) {
    const n = J(s.params).length + (s.program?.tsxCode ?? tpl(s.type).tsxCode).length;
    if (cur.length && size + n > SCENE_BATCH_BYTES) { batches.push(cur); cur = []; size = 0; }
    cur.push(s);
    size += n;
  }
  if (cur.length) batches.push(cur);
  const calls = batches.map((batch, i) => {
    const types = [...new Set(batch.map((s) => s.type))];
    const codes = Object.fromEntries(types.map((t) => [t, { tsx: tpl(t).tsxCode, edit: tpl(t).editableParameters, ti: tpl(t).timeIndependent }]));
    const rows = batch.map((s) => ({ type: s.type, label: s.label, params: s.program ? fitEditableControls(s.program.editableParameters, s.params) : fitControls(s.type, s.params), program: s.program, a: s.startSec, b: s.endSec }));
    return {
      summary: `Add scene graphics (${i + 1}/${batches.length})`,
      allowCommit: true,
      script: `const d = selects.draft(${J(draftId)});
${PRELUDE}
const T: any = ${J(codes)};
const placed: any[] = [];
for (const s of ${J(rows)} as any[]) {
  const r = await mg(s.label, s.program?.tsxCode ?? T[s.type].tsx, s.params, s.program?.editableParameters ?? T[s.type].edit, s.program ? false : T[s.type].ti, s.a, s.b);
  if (!r) throw new Error("scene range is empty");
  placed.push({ clipId: r.clipId });
}
await d.commitAll("News short: scenes");
return { added: ${batch.length}, placed };`,
    };
  });
  for (const c of calls) if (new TextEncoder().encode(c.script).length > 240_000) throw new Error("a scene is too large for one script (photo too big)");
  return calls;
}

// The bands image over the whole Draft, above the scenes (its middle is transparent).
export function bandsScript(draftId: string, projectId: string, bandsId: string): ScriptCall {
  return {
    summary: "Add the top and bottom bands",
    allowCommit: true,
    script: `const d = selects.draft(${J(draftId)});
${PRELUDE}
const all = await win(0, total / fps);
if (!all) throw new Error("the Draft is empty");
await d.overlayResource({ resource: selects.project(${J(projectId)}).resource(${J(bandsId)}), over: all });
await d.commitAll("News short: bands");
return { added: 1 };`,
  };
}

// Headline, captions and disclaimers on top of the scenes, in size-bounded batches (each caption may carry its
// own embedded font subset, so one call for all of them would pass the script limit).
export function overlayTextScripts(draftId: string, x: Pick<AssemblyInput, "headline" | "preset" | "scenes" | "captions" | "decorate" | "headlineFont">): ScriptCall[] {
  const deco = x.decorate ?? ((p: Record<string, unknown>) => p);
  const items: Array<{ type: string; label: string; params: Record<string, unknown>; a: number; b: number }> = [];
  const head = { line1: x.headline.line1, line2: x.headline.line2, accent: x.headline.accent || "", fontFamily: "" };
  items.push({ type: "headline", label: tpl("headline").label, params: x.headlineFont ? { ...head, ...x.headlineFont } : deco(head), a: 0, b: 1e9 });
  const L = x.preset.layout;
  const look = { bottom: L.captionBottom, boxHeight: L.captionHeight, maxWidth: L.captionMaxWidth, fontWeight: L.captionWeight, textColor: L.captionColor, boxColor: L.captionBox, ...(L.captionPad === undefined ? {} : { padX: L.captionPad }) };
  x.captions.forEach((c, i) => items.push({ type: "caption", label: tpl("caption").label + " " + String(i + 1).padStart(2, "0"), params: deco({ text: c.text, ...look, fontFamily: "" }), a: c.startSec, b: c.endSec }));
  for (const s of x.scenes.filter((s) => s.disclaimer)) items.push({ type: "disclaimer", label: tpl("disclaimer").label, params: deco({ text: x.preset.disclaimer, fontFamily: "" }), a: s.startSec, b: s.endSec });
  const batches: typeof items[] = [];
  let cur: typeof items = [], size = 0;
  for (const it of items) {
    const n = J(it.params).length + 300;
    if (cur.length && size + n > SCENE_BATCH_BYTES) { batches.push(cur); cur = []; size = 0; }
    cur.push(it);
    size += n;
  }
  if (cur.length) batches.push(cur);
  return batches.map((batch, i) => {
    const types = [...new Set(batch.map((s) => s.type))];
    const codes = Object.fromEntries(types.map((t) => [t, { tsx: tpl(t).tsxCode, edit: tpl(t).editableParameters, ti: tpl(t).timeIndependent }]));
    return {
      summary: `Add headline and captions (${i + 1}/${batches.length})`,
      allowCommit: true,
      script: `const d = selects.draft(${J(draftId)});
${PRELUDE}
const T: any = ${J(codes)};
for (const s of ${J(batch)} as any[]) await mg(s.label, T[s.type].tsx, s.params, T[s.type].edit, T[s.type].ti, s.a, Math.min(s.b, total / fps));
await d.commitAll("News short: headline and captions");
return { added: ${batch.length} };`,
    };
  });
}
