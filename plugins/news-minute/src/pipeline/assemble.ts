// Draft assembly as a series of run_script calls, verified on Selects Staging 2.0.763 (export with audio):
//   1. createDraft, 29.97 fps 1080x1920, the brand plate on Main (a Draft needs video on Main to export),
//      the narration over it, the frame graphic; commit.
//   2. scene graphics, a few per call (photos travel as data URLs, so batches keep each script small); commit.
//   3. headline, captions, disclaimers; commit.
// Graphics added later draw on top, so the calls follow the stacking order frame -> scenes -> headline ->
// captions -> disclaimers.

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
  headline: { line1: string; line2: string; accent?: string };
  preset: Preset;
  scenes: SceneClip[];
  captions: TextClip[];
};

const J = (v: unknown) => JSON.stringify(v);
// run_script rejects scripts over 262,144 bytes (Selects Staging 2.0.763), so scene batches stay well under it.
export const SCRIPT_MAX_BYTES = 262_144;
export const SCENE_BATCH_BYTES = 200_000;

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
  const frameParams = { background: x.preset.background, accentColor: x.preset.accentColor, logoMain: x.preset.logoMain, logoAccent: x.preset.logoAccent, tagline: x.preset.tagline, fontFamily: "" };
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
await mg(${J(frame.label)}, ${J(frame.tsxCode)}, ${J(frameParams)}, ${J(frame.editableParameters)}, true, 0, total / fps);
const out: any = await d.commitAll("News short: frame and narration");
return { draftId: out.createdDraftId ?? null, frames: total };`,
  };
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
    const rows = batch.map((s) => ({ type: s.type, label: s.label, params: s.params, a: s.startSec, b: s.endSec }));
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
  for (const c of calls) if (new TextEncoder().encode(c.script).length > SCRIPT_MAX_BYTES) throw new Error("a scene is too large for one script (photo too big)");
  return calls;
}

export function overlayTextScript(draftId: string, x: Pick<AssemblyInput, "headline" | "preset" | "scenes" | "captions">): ScriptCall {
  const head = tpl("headline"), cap = tpl("caption"), dis = tpl("disclaimer");
  const caps = x.captions.map((c) => ({ text: c.text, a: c.startSec, b: c.endSec }));
  const disc = x.scenes.filter((s) => s.disclaimer).map((s) => ({ a: s.startSec, b: s.endSec }));
  return {
    summary: "Add headline and captions",
    allowCommit: true,
    script: `const d = selects.draft(${J(draftId)});
${PRELUDE}
await mg(${J(head.label)}, ${J(head.tsxCode)}, ${J({ line1: x.headline.line1, line2: x.headline.line2, accent: x.headline.accent || "", fontFamily: "" })}, ${J(head.editableParameters)}, true, 0, total / fps);
const capCode = ${J(cap.tsxCode)}, capEdit = ${J(cap.editableParameters)};
let i = 0;
for (const c of ${J(caps)}) { i += 1; await mg(${J(cap.label)} + " " + String(i).padStart(2, "0"), capCode, { text: c.text, fontFamily: "" }, capEdit, true, c.a, c.b); }
for (const s of ${J(disc)}) await mg(${J(dis.label)}, ${J(dis.tsxCode)}, { text: ${J(x.preset.disclaimer)}, fontFamily: "" }, ${J(dis.editableParameters)}, true, s.a, s.b);
await d.commitAll("News short: headline and captions");
return { captions: i };`,
  };
}
