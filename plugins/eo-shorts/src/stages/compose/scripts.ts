import { lit } from "../../host/runScript.ts";
import { GUARD_WORDS_JS } from "./wordsGuard.ts";
import { SPLIT_CROSSING_JS, type SplitRoots } from "./splitCrossing.ts";

export type ComposeGuard = {
  projectId: string;
  draftId: string;
  fps: number;
  frameSize: { width: number; height: number };
  mainEnd: number;
  wordsSig: string | null;
};

export const SOURCE_FILES_JS = `const sourceFiles = async (p) => {
  const files = [];
  const walk = (nodes) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  const tree = await p.sourceFiles();
  if ("fileTree" in tree) walk(tree.fileTree);
  else for (const f of tree.folders || []) { const t = await p.sourceFiles({ folder: f.name }); walk("fileTree" in t ? t.fileTree : []); }
  return files;
};
const normPath = (s) => String(s == null ? "" : s).replace(/\\\\/g, "/").toLowerCase();
const samePath = (a, b) => normPath(a) === normPath(b);
const under = (path, root) => normPath(path).startsWith(normPath(root).replace(/\\/?$/, "/"));`;

function prelude(g: ComposeGuard): string {
  return `const G = ${lit(g)};
const p = selects.project(G.projectId);
const d = selects.draft(G.draftId);
${GUARD_WORDS_JS}
${SOURCE_FILES_JS}
const mainClips = async () => (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").sort((a, b) => a.startFrame - b.startFrame);
const guard = async () => {
  const pm = await p.meta();
  if (!pm.draftIds.includes(G.draftId)) throw new Error("guard: the draft is no longer in its project");
  const meta = await d.meta();
  if (Math.abs(meta.fps - G.fps) > 1e-6 || meta.frameSize.width !== G.frameSize.width || meta.frameSize.height !== G.frameSize.height) {
    throw new Error("guard: the draft is now " + meta.frameSize.width + "x" + meta.frameSize.height + " at " + meta.fps + " fps, planned " + G.frameSize.width + "x" + G.frameSize.height + " at " + G.fps);
  }
  const main = await mainClips();
  const mainEnd = main.reduce((m, c) => Math.max(m, c.endFrame), 0);
  if (mainEnd !== G.mainEnd) throw new Error("guard: Main now ends at frame " + mainEnd + ", planned " + G.mainEnd);
  for (const c of main) { const sp = c.playbackSpeed; if (sp && sp.numerator !== sp.denominator) throw new Error("guard: Main clip " + c.startFrame + "-" + c.endFrame + " is not at 1x"); }
  if (G.wordsSig !== null) {
    const sig = guardWordsSig(await d.words());
    if (sig !== G.wordsSig) throw new Error("guard: the draft's words changed (" + sig + ", planned " + G.wordsSig + ")");
  }
  return { mainEnd };
};`;
}

export function stateScript(projectId: string, draftId: string): string {
  return `const p = selects.project(${lit(projectId)});
const d = selects.draft(${lit(draftId)});
${GUARD_WORDS_JS}
const pm = await p.meta();
if (!pm.draftIds.includes(${lit(draftId)})) throw new Error("the draft is not in the project");
const meta = await d.meta();
const main = (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main");
return { fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames, mainEnd: main.reduce((m, c) => Math.max(m, c.endFrame), 0), wordsSig: guardWordsSig(await d.words()), name: meta.name };`;
}

export type ResolvedFile = { path: string; resourceId: string | null; frameSize: { width: number; height: number } | null; durationSeconds: number | null };

const RESOLVE_JS = `const files = await sourceFiles(p);
const resolve = (paths) => paths.map((path) => { const f = files.find((x) => samePath(x.path, path)); return { path, resourceId: f ? f.resourceId : null, frameSize: f && f.frameSize ? f.frameSize : null, durationSeconds: f && f.durationSeconds != null ? f.durationSeconds : null }; });`;

export function resolveScript(projectId: string, paths: string[]): string {
  return `const p = selects.project(${lit(projectId)});
${SOURCE_FILES_JS}
${RESOLVE_JS}
return resolve(${lit(paths)});`;
}

export function importScript(projectId: string, paths: string[]): string {
  return `const p = selects.project(${lit(projectId)});
${SOURCE_FILES_JS}
const want = ${lit(paths)};
const before = await sourceFiles(p);
const missing = want.filter((path) => !before.some((x) => samePath(x.path, path)));
let added = [];
if (missing.length) added = (await p.importFiles({ paths: missing })).addedResourceIds;
${RESOLVE_JS}
const out = resolve(want);
const lost = out.filter((r) => !r.resourceId).map((r) => r.path);
if (lost.length) throw new Error("import: the project still lacks " + lost.join(", "));
return { imported: missing, added, files: out };`;
}

export function splitCheckScript(g: ComposeGuard, i: SplitRoots & { splits: number[] }): string {
  return `${prelude(g)}
const P = ${lit({ splits: i.splits, roots: { footage: i.footageRoot, sound: i.soundRoot } })};
await guard();
const files = await sourceFiles(p);
${SPLIT_CROSSING_JS}
const bounds = new Set((await mainClips()).flatMap((c) => [c.startFrame, c.endFrame]));
const splits = P.splits.filter((k) => !bounds.has(k));
const x = splits.length ? await splitCrossing(splits, P.roots) : { graphics: [], overlays: [], sound: [], foreign: [], mainEffects: [] };
return { splits, graphics: crossingRows(x.graphics), overlays: crossingRows(x.overlays), sound: crossingRows(x.sound), foreign: crossingRows(x.foreign), mainEffects: x.mainEffects, refusal: x.foreign.length ? crossingError(x.foreign) : null };`;
}

export type PlaceInput = SplitRoots & {
  splits: number[];
  overlays: { path: string; start: number; end: number }[];
  label?: string;
};

export function placeScript(g: ComposeGuard, i: PlaceInput): string {
  return `${prelude(g)}
const P = ${lit({ splits: i.splits, overlays: i.overlays, root: i.footageRoot, roots: { footage: i.footageRoot, sound: i.soundRoot }, label: i.label ?? "EO Shorts: footage overlays" })};
await guard();
const files = await sourceFiles(p);
${SPLIT_CROSSING_JS}
const ridOf = (path) => { const f = files.find((x) => samePath(x.path, path)); return f ? f.resourceId : null; };
for (const o of P.overlays) if (!ridOf(o.path)) throw new Error("place: " + o.path + " is not in the project; import it first");
const ours = new Set(files.filter((f) => f.resourceId && under(f.path, P.root)).map((f) => f.resourceId));
const isEoGraphic = (name) => name.startsWith("EO ");
const overlaps = (c, o) => c.startFrame < o.end && c.endFrame > o.start;
const oursNow = async () => (await d.clips({ trackScope: "all" })).filter((c) => c.trackKind === "video" && c.resourceId && ours.has(c.resourceId));
let changed = false;
const removedGraphics = [];
let removedOverlays = 0;
let removedSound = [];
let mainEffects = [];
// 1. Main splits, after taking away what they would cut in two (or refusing, before any edit)
const bounds = new Set((await mainClips()).flatMap((c) => [c.startFrame, c.endFrame]));
const splits = P.splits.filter((k) => !bounds.has(k));
if (splits.length) {
  const x = await splitCrossing(splits, P.roots);
  if (x.foreign.length) throw new Error(crossingError(x.foreign));
  const cut = x.graphics.concat(x.overlays, x.sound);
  if (cut.length) {
    await d.removeClips(cut.map((r) => r.clip));
    removedGraphics.push(...x.graphics.map((r) => r.name));
    removedOverlays += x.overlays.length;
    removedSound = crossingRows(x.sound);
  }
  mainEffects = x.mainEffects;
  for (const k of splits) await d.splitAt({ frame: k });
  changed = true;
}
// 2. overlays: keep exact ones, remove the rest of ours, place the missing
let have = await oursNow();
const keep = new Set();
const toPlace = [];
for (const o of P.overlays) {
  const rid = ridOf(o.path);
  const c = have.find((x) => !keep.has(x.clipId) && x.resourceId === rid && x.startFrame === o.start && x.endFrame === o.end);
  if (c) keep.add(c.clipId); else toPlace.push(o);
}
const stale = have.filter((c) => !keep.has(c.clipId));
const coverG = toPlace.length ? (await d.motionGraphics()).filter((x) => isEoGraphic(x.name) && toPlace.some((o) => overlaps(x.clip, o))) : [];
if (stale.length || coverG.length) {
  await d.removeClips(stale.concat(coverG.map((x) => x.clip)));
  removedGraphics.push(...coverG.map((x) => x.name));
  removedOverlays += stale.length;
  changed = true;
}
for (const o of toPlace) {
  await d.overlayResource({ resource: p.resource(ridOf(o.path)), over: await d.rangeAtFrames(o.start, o.end), sourceStartSeconds: 0 });
  changed = true;
}
let commitId = null;
if (changed) commitId = (await d.commitAll(P.label)).commitId || null;
// read back
have = await oursNow();
const missing = P.overlays.filter((o) => have.filter((x) => x.resourceId === ridOf(o.path) && x.startFrame === o.start && x.endFrame === o.end).length !== 1);
if (missing.length) throw new Error("read back: overlays not in place: " + missing.map((o) => o.path + " " + o.start + "-" + o.end).join(", "));
const after = new Set((await mainClips()).flatMap((c) => [c.startFrame, c.endFrame]));
const unsplit = P.splits.filter((k) => !after.has(k));
if (unsplit.length) throw new Error("read back: Main is not split at " + unsplit.join(", "));
return { splits, placed: toPlace.length, kept: keep.size, removedOverlays, removedGraphics, removedSound, mainEffects, overlays: have.length, commitId };`;
}

export type EffectTarget = {
  kind: "main" | "overlay";
  path?: string;
  start: number;
  end: number;
  label: string;
  params: Record<string, unknown>;
};

export type EffectsInput = {
  targets: EffectTarget[];
  expected: { kind: "main" | "overlay"; path?: string; start: number; end: number; label: string }[];
  footageRoot: string;
  tsx: string;
  label?: string;
};

const withPath = <T extends { path?: string }>(t: T): T & { path: string | null } => ({ ...t, path: t.path ?? null });

export function effectsScript(g: ComposeGuard, i: EffectsInput): string {
  return `${prelude(g)}
const TSX = ${lit(i.tsx)};
const P = ${lit({ targets: i.targets.map(withPath), expected: i.expected.map(withPath), root: i.footageRoot, label: i.label ?? "EO Shorts: footage looks" })};
await guard();
const files = await sourceFiles(p);
const ridOf = (path) => { const f = files.find((x) => samePath(x.path, path)); return f ? f.resourceId : null; };
const ours = new Set(files.filter((f) => f.resourceId && under(f.path, P.root)).map((f) => f.resourceId));
const isLook = (name) => /^EO [A-Za-z0-9_.-]+ look [0-9a-f]{12}$/.test(name);
const mineClip = (c) => c.resourceId && (c.trackKind === "main" || (c.trackKind === "video" && ours.has(c.resourceId)));
const sameClip = (t, c) => c.startFrame === t.start && c.endFrame === t.end && (t.kind === "main" ? c.trackKind === "main" : c.trackKind === "video" && c.resourceId === ridOf(t.path));
const wanted = (c) => P.expected.filter((t) => sameClip(t, c)).map((t) => t.label);
let removed = [];
for (let n = 0; n < 1000; n += 1) {
  let hit = null;
  for (const c of await d.clips({ trackScope: "all" })) {
    if (!mineClip(c)) continue;
    const want = wanted(c);
    const seen = new Set();
    for (const e of await d.videoEffects(c)) {
      if (!isLook(e.name)) continue;
      if (!want.includes(e.name) || seen.has(e.name)) { hit = { e, at: c.startFrame + "-" + c.endFrame }; break; }
      seen.add(e.name);
    }
    if (hit) break;
  }
  if (!hit) break;
  await d.removeVideoEffect(hit.e);
  removed.push(hit.e.name + " @ " + hit.at);
}
const find = async (t) => (await d.clips({ trackScope: "all" })).find((c) => sameClip(t, c)) || null;
let added = 0, kept = 0;
for (const t of P.targets) {
  const c = await find(t);
  if (!c) throw new Error("effects: no clip " + t.kind + " " + t.start + "-" + t.end + (t.path ? " (" + t.path + ")" : ""));
  if ((await d.videoEffects(c)).some((e) => e.name === t.label)) { kept += 1; continue; }
  await d.addVideoEffect({ clip: c, label: t.label, tsxCode: TSX, parameters: t.params });
  added += 1;
}
let commitId = null;
if (added || removed.length) commitId = (await d.commitAll(P.label)).commitId || null;
const bad = [];
for (const t of P.targets) {
  const c = await find(t);
  const names = c ? (await d.videoEffects(c)).map((e) => e.name) : null;
  if (!names || names.filter((x) => x === t.label).length !== 1) bad.push(t.label + " on " + t.kind + " " + t.start + "-" + t.end + ": " + JSON.stringify(names));
}
if (bad.length) throw new Error("read back: " + bad.join("; "));
return { added, kept, removed, commitId };`;
}

export function effectsStateScript(g: ComposeGuard, i: Pick<EffectsInput, "targets" | "footageRoot">): string {
  return `${prelude(g)}
const P = ${lit({ targets: i.targets.map(({ params: _p, ...t }) => withPath(t)), root: i.footageRoot })};
await guard();
const files = await sourceFiles(p);
const ridOf = (path) => { const f = files.find((x) => samePath(x.path, path)); return f ? f.resourceId : null; };
const sameClip = (t, c) => c.startFrame === t.start && c.endFrame === t.end && (t.kind === "main" ? c.trackKind === "main" : c.trackKind === "video" && c.resourceId === ridOf(t.path));
const all = await d.clips({ trackScope: "all" });
let placed = 0;
for (const t of P.targets) {
  const c = all.find((x) => sameClip(t, x));
  if (c && (await d.videoEffects(c)).filter((e) => e.name === t.label).length === 1) placed += 1;
}
return { placed, of: P.targets.length };`;
}

export function compositionScript(g: ComposeGuard, footageRoot: string): string {
  return `${prelude(g)}
const ROOT = ${lit(footageRoot)};
await guard();
const files = await sourceFiles(p);
const fileOf = (rid) => files.find((f) => f.resourceId === rid) || null;
const meta = await d.meta();
const out = { fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames, mainEnd: 0, main: [], overlays: [], graphics: [], other: 0 };
for (const c of await d.clips({ trackScope: "all" })) {
  if (c.trackKind === "main") {
    out.mainEnd = Math.max(out.mainEnd, c.endFrame);
    if (!c.resourceId) { out.main.push({ start: c.startFrame, end: c.endFrame, resourceId: null, path: null, source: null, transform: null, effects: [] }); continue; }
    const f = fileOf(c.resourceId);
    let t = null;
    try { t = await d.clipTransform(c); } catch (e) { t = null; }
    out.main.push({ start: c.startFrame, end: c.endFrame, resourceId: c.resourceId, path: f ? f.path : null, source: f && f.frameSize ? f.frameSize : null,
      transform: t && t.enabled !== false ? { scale: t.scale, position: t.position, rotation: t.rotation, anchor: t.anchor } : null,
      effects: (await d.videoEffects(c)).map((e) => e.name) });
  } else if (c.trackKind === "video" && c.resourceId) {
    const f = fileOf(c.resourceId);
    out.overlays.push({ start: c.startFrame, end: c.endFrame, resourceId: c.resourceId, path: f ? f.path : null, trackId: c.trackId, ours: !!(f && under(f.path, ROOT)),
      effects: (await d.videoEffects(c)).map((e) => e.name) });
  } else if (c.trackKind === "video" || c.trackKind === "audio") out.other += 1;
}
out.main.sort((a, b) => a.start - b.start);
out.overlays.sort((a, b) => a.start - b.start);
out.graphics = (await d.motionGraphics()).map((x) => ({ name: x.name, start: x.clip.startFrame, end: x.clip.endFrame, trackId: x.clip.trackId })).sort((a, b) => a.start - b.start);
return out;`;
}
