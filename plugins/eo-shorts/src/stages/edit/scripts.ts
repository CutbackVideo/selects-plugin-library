import { lit } from "../../host/runScript.ts";
import { WORD_ROW_JS, WORD_SIG_JS } from "./words.ts";

function prelude(draftId: string): string {
  return `const d = selects.draft(${lit(draftId)});
${WORD_SIG_JS}
${WORD_ROW_JS}
const mainEndOf = async () => (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").reduce((m, c) => Math.max(m, c.endFrame), 0);
const stateOf = async () => {
  const meta = await d.meta();
  const ws = await d.words();
  return { mainEnd: await mainEndOf(), durationFrames: meta.durationFrames, fps: meta.fps, sig: wordsSig(ws), textSig: textSig(ws), count: ws.length };
};`;
}

export function readStateScript(draftId: string, opts: { words?: boolean; segments?: boolean } = {}): string {
  return `${prelude(draftId)}
const meta = await d.meta();
const all = await d.clips({ trackScope: "all" });
const tracks = {};
for (const c of all) {
  const k = c.trackKind + ":" + c.trackId;
  const t = tracks[k] || (tracks[k] = { kind: c.trackKind, clips: 0, end: 0, media: 0 });
  t.clips += 1; t.end = Math.max(t.end, c.endFrame); if (c.resourceId) t.media += 1;
}
const ws = await d.words();
let segments = null;
if (${opts.segments ? "true" : "false"}) {
  try {
    segments = [];
    let offset = 0;
    for (let page = 0; page < 100; page += 1) {
      const p = await d.semanticCutSegments({ offset, limit: 100 });
      for (const it of p.items) segments.push({ s: it.span.startFrame, e: it.span.endFrame, text: it.text });
      if (p.nextOffset == null) break;
      offset = p.nextOffset;
    }
  } catch (e) { segments = null; }
}
return {
  name: meta.name, fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames,
  mainEnd: all.filter((c) => c.trackKind === "main").reduce((m, c) => Math.max(m, c.endFrame), 0),
  mainClips: all.filter((c) => c.trackKind === "main").length,
  retimed: all.filter((c) => c.playbackSpeed && c.playbackSpeed.numerator !== c.playbackSpeed.denominator).length,
  tracks: Object.values(tracks),
  sig: wordsSig(ws), textSig: textSig(ws), count: ws.length,
  words: ${opts.words === false ? "null" : "ws.map(row)"},
  segments,
};`;
}

export function stateScript(draftId: string): string {
  return `${prelude(draftId)}
return await stateOf();`;
}

export type DuplicateInput = {
  projectId: string;
  sourceDraftId: string;
  name: string;
  sourceMainEnd: number;
  frameSize?: { width: number; height: number };
  label?: string;
};

export function findByNameScript(projectId: string, name: string): string {
  return `const p = selects.project(${lit(projectId)});
const pm = await p.meta();
for (const id of pm.draftIds) {
  try { const m = await selects.draft(id).meta(); if (m.name === ${lit(name)}) return { draftId: id }; } catch (e) {}
}
return { draftId: null };`;
}

export function duplicateScript(i: DuplicateInput): string {
  const size = i.frameSize ?? { width: 1080, height: 1920 };
  return `const P = ${JSON.stringify({ ...i, frameSize: size, label: i.label ?? "EO Shorts: new EO draft (Main only, 9:16)" })};
const p = selects.project(P.projectId);
const pm = await p.meta();
for (const id of pm.draftIds) {
  try { const m = await selects.draft(id).meta(); if (m.name === P.name) return { draftId: id, existed: true }; } catch (e) {}
}
const src = selects.draft(P.sourceDraftId);
const srcEnd = (await src.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").reduce((m, c) => Math.max(m, c.endFrame), 0);
if (srcEnd !== P.sourceMainEnd) throw new Error("guard: the source draft's Main ends at " + srcEnd + ", preflight read " + P.sourceMainEnd + "; run the short again");
let d = null;
let copiedBy = "duplicate";
try {
  d = await p.duplicateDraft({ sourceDraftId: P.sourceDraftId, name: P.name });
} catch (e) {
  // The current web build reads the source's retake groups before a duplicate and refuses on Selects binaries that do
  // not advertise retake.contentSnapshots (before 2.0.541). Copy the source's Main into a new draft instead, and
  // keep it only if it has the source's Main end and words.
  if (!/unsupported_host_capability: retake\.contentSnapshots/.test(String((e && e.message) || e))) throw e;
  copiedBy = "insert";
  const whole = await src.rangeAtFrames(0, srcEnd);
  d = await p.createDraft({ name: P.name });
  await d.insert({ source: whole, tracks: "main" });
  const a = await src.words();
  const b = await d.words();
  const end = (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").reduce((m, c) => Math.max(m, c.endFrame), 0);
  const same = a.length === b.length && a.every((w, k) => w.text === b[k].text && w.startFrame === b[k].startFrame && w.endFrame === b[k].endFrame);
  if (end !== srcEnd || !same) {
    throw new Error("This Selects cannot duplicate the source draft (that needs Selects 2.0.541 or later), and a copy of its Main came out different (Main ends at " + end + " of " + srcEnd + ", words " + (same ? "same" : "different") + "). Update Selects, then make the short again.");
  }
}
const extra = (await d.clips({ trackScope: "all" })).filter((c) => c.trackKind === "video" || c.trackKind === "audio");
if (extra.length) await d.removeClips(extra);
const ident = (t) => t.enabled !== false && t.scale.x === 1 && t.scale.y === 1 && t.position.x === 0 && t.position.y === 0 && t.rotation === 0 && t.anchor.x === 0 && t.anchor.y === 0;
let reset = 0;
const mains = (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main" && c.resourceId);
for (let k = 0; k < mains.length; k += 1) {
  const c = (await d.clips({ trackScope: "main" })).filter((x) => x.trackKind === "main" && x.resourceId)[k];
  if (!c) break;
  let t = null;
  try { t = await d.clipTransform(c); } catch (e) { t = null; }
  if (t && !ident(t)) { await d.resetClipTransform(c); reset += 1; }
}
await d.setFrameSize(P.frameSize);
const commit = await d.commitAll(P.label);
return { draftId: commit.createdDraftId || null, existed: false, removedClips: extra.length, resetTransforms: reset, copiedBy };`;
}

export type RemoveFramesInput = {
  draftId: string;
  ranges: [number, number][];
  guard: { mainEnd: number; sig: string };
  expect: { mainEnd: number; textSig: string };
  label: string;
};

export function removeFramesScript(i: RemoveFramesInput): string {
  return `${prelude(i.draftId)}
const P = ${JSON.stringify({ ranges: i.ranges, guard: i.guard, expect: i.expect, label: i.label })};
const before = await stateOf();
if (before.mainEnd === P.expect.mainEnd && before.textSig === P.expect.textSig) return { already: true, after: before };
if (before.mainEnd !== P.guard.mainEnd || before.sig !== P.guard.sig) {
  throw new Error("guard: the EO draft changed since this step was planned (Main end " + before.mainEnd + " vs " + P.guard.mainEnd + ", words " + before.sig + " vs " + P.guard.sig + ")");
}
const spans = [];
for (const [s, e] of P.ranges) spans.push(await d.rangeAtFrames(s, e));
const removedText = spans.map((x) => x.text);
const diff = await d.remove(spans, { tracks: "all" });
const commit = await d.commitAll(P.label);
const after = await stateOf();
return { already: false, removedText, diff, commitId: commit.commitId || null, after };`;
}

export type SilenceInput = {
  draftId: string;
  guard: { mainEnd: number; sig: string; textSig: string };
  minSeconds: number;
  padSeconds: number;
  label: string;
};

export function silenceScript(i: SilenceInput): string {
  return `${prelude(i.draftId)}
const P = ${JSON.stringify({ guard: i.guard, min: i.minSeconds, pad: i.padSeconds, label: i.label })};
const before = await stateOf();
const plan = async () => d.silenceSpans({ minSilenceSeconds: P.min, keepPaddingSeconds: { left: P.pad, right: P.pad } });
if (before.mainEnd !== P.guard.mainEnd || before.sig !== P.guard.sig) {
  // a run that already removed the pauses: same words, and nothing left to plan
  const rows = await plan();
  if (before.textSig === P.guard.textSig && rows.every((r) => r.cutSpans.length === 0)) return { already: true, rows: rows.length, after: before };
  throw new Error("guard: the EO draft changed since the pauses were planned (Main end " + before.mainEnd + " vs " + P.guard.mainEnd + ")");
}
const rows = await plan();
const cuts = rows.flatMap((r) => r.cutSpans);
const cutFrames = cuts.map((c) => [c.startFrame, c.endFrame]);
const restoreRows = rows.filter((r) => r.restoreRanges.length).length;
if (!cuts.length) return { already: false, rows: rows.length, cutFrames, restoreRows, diff: null, commitId: null, after: before };
const diff = await d.remove(cuts, { tracks: "all" });
const commit = await d.commitAll(P.label);
const after = await stateOf();
return { already: false, rows: rows.length, cutFrames, restoreRows, diff, commitId: commit.commitId || null, after };`;
}
