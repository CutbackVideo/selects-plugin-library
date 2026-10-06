import { lit } from "../../host/runScript.ts";
import { WORD_SIG_JS } from "../edit/words.ts";
import { SOURCE_FILES_JS } from "../compose/scripts.ts";

export type SoundGuard = {
  projectId: string;
  draftId: string;
  fps: number;
  frameSize: { width: number; height: number };
  mainEnd: number;
  wordsSig: string;
  pieces: [number, number][];
};

export type ClipAudio = {
  volumeDb?: number;
  volumeKeys?: { atSeconds: number; volumeDb: number }[];
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
};

export type SoundClip = { path: string; start: number; end: number; offset: number; audio: ClipAudio; role: "music" | "sfx" };

export type SoundState = {
  fps: number;
  frameSize: { width: number; height: number };
  durationFrames: number;
  mainEnd: number;
  wordsSig: string;
  words: { s: number; e: number; cut: boolean }[];
  main: [number, number, boolean, boolean][];
  ours: { path: string | null; start: number; end: number; kind: string }[];
  others: { name: string; start: number; end: number; kind: string }[];
};

const HELPERS = `${WORD_SIG_JS}
${SOURCE_FILES_JS}
const mainClips = async () => (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").sort((a, b) => a.startFrame - b.startFrame);`;

export function soundStateScript(projectId: string, draftId: string, roots: { sound: string; footage: string }): string {
  return `const p = selects.project(${lit(projectId)});
const d = selects.draft(${lit(draftId)});
const R: any = ${lit(roots)};
${HELPERS}
const pm = await p.meta();
if (!pm.draftIds.includes(${lit(draftId)})) throw new Error("the draft is not in the project");
const meta = await d.meta();
const main = await mainClips();
const words = await d.words();
const files = await sourceFiles(p);
const fileOf = (rid) => files.find((f) => f.resourceId === rid) || null;
const graphics = new Set((await d.motionGraphics()).map((x) => x.clip.clipId));
const ours: any[] = [], others: any[] = [];
for (const c of await d.clips({ trackScope: "all" })) {
  if ((c.trackKind !== "video" && c.trackKind !== "audio") || !c.resourceId || graphics.has(c.clipId)) continue;
  const f = fileOf(c.resourceId);
  if (f && under(f.path, R.sound)) ours.push({ path: f.path, start: c.startFrame, end: c.endFrame, kind: c.trackKind });
  else if (!(f && under(f.path, R.footage))) others.push({ name: f ? String(f.path).split(/[\\\\/]/).pop() : String(c.resourceId), start: c.startFrame, end: c.endFrame, kind: c.trackKind });
}
const one = (sp) => !sp || sp.numerator === sp.denominator;
return { fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames, mainEnd: main.reduce((m, c) => Math.max(m, c.endFrame), 0), wordsSig: wordsSig(words),
  words: words.map((w) => ({ s: w.startFrame, e: w.endFrame, cut: !!w.cut })),
  main: main.map((c) => [c.startFrame, c.endFrame, !!c.resourceId, one(c.playbackSpeed)]), ours, others };`;
}

export type ApplyInput = {
  soundRoot: string;
  clips: SoundClip[];
  main: { start: number; end: number; audio: ClipAudio }[];
  dryRun?: boolean;
  label?: string;
};

export type ApplyResult = { changed: boolean; why?: string; placed?: number; removed?: number; kept?: number; ops?: number; commitId?: string | null };

export function soundApplyScript(g: SoundGuard, i: ApplyInput): string {
  return `const G: any = ${lit(g)};
const P: any = ${lit({ root: i.soundRoot, clips: i.clips.map(({ role: _r, ...c }) => c), main: i.main, dryRun: i.dryRun === true, label: i.label ?? "EO Shorts: music and sound" })};
const p = selects.project(G.projectId);
const d = selects.draft(G.draftId);
${HELPERS}
const pm = await p.meta();
if (!pm.draftIds.includes(G.draftId)) throw new Error("guard: the draft is no longer in its project");
const meta = await d.meta();
if (Math.abs(meta.fps - G.fps) > 1e-6 || meta.frameSize.width !== G.frameSize.width || meta.frameSize.height !== G.frameSize.height) throw new Error("guard: the draft is now " + meta.frameSize.width + "x" + meta.frameSize.height + " at " + meta.fps + " fps");
const main0 = await mainClips();
const mainEnd = main0.reduce((m, c) => Math.max(m, c.endFrame), 0);
if (mainEnd !== G.mainEnd) throw new Error("guard: Main now ends at frame " + mainEnd + ", planned " + G.mainEnd);
const pieces = main0.filter((c) => c.resourceId).map((c) => [c.startFrame, c.endFrame]);
if (JSON.stringify(pieces) !== JSON.stringify(G.pieces)) throw new Error("guard: Main's pieces changed since the sound was planned");
const sig = wordsSig(await d.words());
if (sig !== G.wordsSig) throw new Error("guard: the draft's words changed (" + sig + ", planned " + G.wordsSig + ")");
const files = await sourceFiles(p);
const want: string[] = [];
for (const c of P.clips) if (!want.includes(c.path)) want.push(c.path);
const missing = want.filter((path) => !files.some((x) => samePath(x.path, path)));
if (missing.length) {
  if (P.dryRun) return { changed: true, why: "the project lacks " + missing.length + " sound file(s)" };
  throw new Error("place: the project lacks " + missing.join(", ") + "; import them first");
}
const ridOf = (path) => { const f = files.find((x) => samePath(x.path, path)); return f ? f.resourceId : null; };
for (const c of P.clips) if (!ridOf(c.path)) throw new Error("import: " + c.path + " is not in the project");
const ours = new Set(files.filter((f) => f.resourceId && under(f.path, P.root)).map((f) => f.resourceId));
const oursNow = async () => (await d.clips({ trackScope: "all" })).filter((c) => (c.trackKind === "audio" || c.trackKind === "video") && c.resourceId && ours.has(c.resourceId));
const same = (c, w) => c.resourceId === ridOf(w.path) && c.startFrame === w.start && c.endFrame === w.end;
let have = await oursNow();
const keep = new Set();
const toPlace: any[] = [];
for (const w of P.clips) { const c = have.find((x) => !keep.has(x.clipId) && same(x, w)); if (c) keep.add(c.clipId); else toPlace.push(w); }
const stale = have.filter((c) => !keep.has(c.clipId));
if (P.dryRun && (stale.length || toPlace.length)) return { changed: true, why: stale.length + " clip(s) to take off, " + toPlace.length + " to lay" };
let changed = false;
if (stale.length) { await d.removeClips(stale); changed = true; }
for (const w of toPlace) {
  await d.overlayResource({ resource: p.resource(ridOf(w.path)), over: await d.rangeAtFrames(w.start, w.end), sourceStartSeconds: w.offset || 0 });
  changed = true;
}
let ops = 0;
const count = (r) => { const n = r && r.diff && typeof r.diff.opCount === "number" ? r.diff.opCount : 1; ops += n; };
for (const w of P.clips) {
  const c = (await oursNow()).find((x) => same(x, w));
  if (!c) throw new Error("place: no clip of " + w.path + " at " + w.start + "-" + w.end);
  count(await d.setClipAudio({ clip: c, ...w.audio }));
}
for (const m of P.main) {
  const c = (await mainClips()).find((x) => x.startFrame === m.start && x.endFrame === m.end && x.resourceId);
  if (!c) throw new Error("place: no Main piece " + m.start + "-" + m.end);
  count(await d.setClipAudio({ clip: c, ...m.audio }));
}
if (ops) changed = true;
if (P.dryRun) return { changed, ops, why: ops ? ops + " level change(s)" : null };
let commitId = null;
if (changed) commitId = (await d.commitAll(P.label)).commitId || null;
have = await oursNow();
const bad = P.clips.filter((w) => have.filter((x) => same(x, w)).length !== 1);
if (bad.length || have.length !== P.clips.length) throw new Error("read back: the sound clips are not as planned (" + bad.map((w) => w.path + " " + w.start + "-" + w.end).join(", ") + "; " + have.length + " of ours, " + P.clips.length + " planned)");
return { changed, placed: toPlace.length, removed: stale.length, kept: keep.size, ops, commitId };`;
}
