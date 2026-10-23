// Draft assembly as a series of run_script calls, verified on Selects Staging 2.0.763 (export with audio):
//   1. createDraft, 29.97 fps 1080x1920, the brand plate on Main (a Draft needs video on Main to export),
//      the narration over it, the frame graphic (only without a bands image); commit.
//   2. scene graphics, a few per call (photos travel as data URLs, so batches keep each script small); commit.
//   3. the bands image held over the whole Draft (when the preset has one); commit.
//   4. headline, captions, disclaimers in batches; commit each.
// Clips added later draw on top (an image overlay too: checked on Staging 2.0.763, its transparent middle shows
// the scenes and a graphic added after it lands above it), so the calls follow the stacking order
// frame -> scenes -> bands -> headline -> captions -> disclaimers.

import { TEMPLATES } from "../templates/generated.ts";
import type { Preset } from "../preset.ts";
import type { ScriptCall } from "./scripts.ts";

export type SceneClip = { type: string; label: string; params: Record<string, unknown>; startSec: number; endSec: number; disclaimer: boolean };
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
const mainClips = await d.clips({ trackScope: "main" });
const total = mainClips.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0);
const win = async (a: number, b: number) => {
  const s = Math.max(0, Math.min(total - 1, F(a))), e = Math.min(total, F(b));
  return e > s ? await d.rangeAtFrames(s, e) : null;
};
const mg = async (label: string, tsxCode: string, parameters: any, editableParameters: any, timeIndependent: boolean, a: number, b: number) => {
  const within = await win(a, b);
  if (within) await d.addMotionGraphic({ label, tsxCode, parameters, editableParameters, timeIndependent, within });
};`;

export function baseDraftScript(x: AssemblyInput): ScriptCall {
  if (!(x.narrationSeconds > 0)) throw new Error("narration length unknown");
  if (x.plateSeconds < x.narrationSeconds) throw new Error("background plate shorter than the narration");
  const frame = tpl("frame");
  const end = Math.min(x.plateSeconds, x.narrationSeconds + 0.5);
  const deco = x.decorate ?? ((p: Record<string, unknown>) => p);
  const L = x.preset.layout;
  const frameParams = deco({ background: x.preset.background, accentColor: x.preset.accentColor, logoMain: x.preset.logoMain, logoAccent: x.preset.logoAccent, tagline: x.preset.tagline, windowTop: L.windowTop, windowBottom: L.frameWindowBottom, fontFamily: "" });
  return {
    summary: "Build the news short Draft",
    allowCommit: true,
    script: `const p = selects.project(${J(x.projectId)});
const d = await p.createDraft({ name: ${J(x.draftName)} });
await d.setSettings({ frameRate: "30000/1001", frameSize: { width: 1080, height: 1920 } });
await d.insertResource({ resourceId: ${J(x.plateId)}, sourceRange: { startSeconds: 0, endSeconds: ${J(end)} } });
${PRELUDE}
const narr = await win(0, ${J(x.narrationSeconds)});
if (!narr) throw new Error("narration range is empty");
await d.overlayResource({ resource: p.resource(${J(x.narrationId)}), over: narr });
${x.bandsId ? "" : `await mg(${J(frame.label)}, ${J(frame.tsxCode)}, ${J(frameParams)}, ${J(frame.editableParameters)}, true, 0, total / fps);`}
const out: any = await d.commitAll("News short: frame and narration");
return { draftId: out.createdDraftId ?? null, frames: total };`,
  };
}

// Selects rejects a graphic whose parameter does not match its control's type (addMotionGraphic: "Editable
// parameter 'value' does not match its definition"). The planner may send 3592 where the control is text, so
// numbers become text for text controls and numeric text becomes a number for number controls.
export function fitControls(type: string, params: Record<string, unknown>): Record<string, unknown> {
  const out = { ...params };
  for (const d of tpl(type).editableParameters as Array<{ key: string; type: string }>) {
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
    const n = J(s.params).length + tpl(s.type).tsxCode.length;
    if (cur.length && size + n > SCENE_BATCH_BYTES) { batches.push(cur); cur = []; size = 0; }
    cur.push(s);
    size += n;
  }
  if (cur.length) batches.push(cur);
  const calls = batches.map((batch, i) => {
    const types = [...new Set(batch.map((s) => s.type))];
    const codes = Object.fromEntries(types.map((t) => [t, { tsx: tpl(t).tsxCode, edit: tpl(t).editableParameters, ti: tpl(t).timeIndependent }]));
    const rows = batch.map((s) => ({ type: s.type, label: s.label, params: fitControls(s.type, s.params), a: s.startSec, b: s.endSec }));
    return {
      summary: `Add scene graphics (${i + 1}/${batches.length})`,
      allowCommit: true,
      script: `const d = selects.draft(${J(draftId)});
${PRELUDE}
const T: any = ${J(codes)};
for (const s of ${J(rows)} as any[]) await mg(s.label, T[s.type].tsx, s.params, T[s.type].edit, T[s.type].ti, s.a, s.b);
await d.commitAll("News short: scenes");
return { added: ${batch.length} };`,
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
export function overlayTextScripts(draftId: string, x: Pick<AssemblyInput, "headline" | "preset" | "scenes" | "captions" | "decorate">): ScriptCall[] {
  const deco = x.decorate ?? ((p: Record<string, unknown>) => p);
  const items: Array<{ type: string; label: string; params: Record<string, unknown>; a: number; b: number }> = [];
  items.push({ type: "headline", label: tpl("headline").label, params: deco({ line1: x.headline.line1, line2: x.headline.line2, accent: x.headline.accent || "", fontFamily: "" }), a: 0, b: 1e9 });
  const L = x.preset.layout;
  const look = { bottom: L.captionBottom, boxHeight: L.captionHeight, maxWidth: L.captionMaxWidth, fontWeight: L.captionWeight, textColor: L.captionColor, boxColor: L.captionBox };
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
