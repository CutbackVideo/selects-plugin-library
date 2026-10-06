import { MAX_SCRIPT_BYTES, lit, scriptBytes } from "../host/runScript.ts";
import { sha256Hex } from "../host/util.ts";
import { GUARD_WORDS_JS } from "../stages/compose/wordsGuard.ts";

export const SCRIPT_BUDGET_BYTES = MAX_SCRIPT_BYTES - 20 * 1024;

export type DraftGuard = {
  projectId: string;
  draftId: string;
  fps: number;
  frameSize: { width: number; height: number };
  mainEnd: number;
  wordsSig: string | null;
};

export type PartInstall = {
  sceneId: string;
  start: number;
  end: number;
  index: number;
  count: number;
  label: string;
  labels: string[];
  tsx: string;
  parameters: Record<string, unknown>;
};

const SID = /^[A-Za-z0-9_.-]+$/;

export function partLabel(sceneId: string, index: number, count: number, digest: string): string {
  if (!SID.test(sceneId)) throw new Error("Scene id " + JSON.stringify(sceneId) + " cannot name a graphic.");
  return "EO " + sceneId + (count > 1 ? "#" + (index + 1) + "/" + count : "") + " " + digest.slice(0, 12);
}

export function labelDigest(tsxSha256: string, parameters: unknown, start: number, end: number, index = 0, count = 1): Promise<string> {
  return sha256Hex(JSON.stringify([tsxSha256, parameters, start, end, index, count]));
}

export function isSceneLabel(name: string, sceneId: string): boolean {
  return name.startsWith("EO " + sceneId + " ") || name.startsWith("EO " + sceneId + "#");
}

const PRELUDE = `${GUARD_WORDS_JS}
const d = selects.draft(G.draftId);
const guard = async () => {
  const pm = await selects.project(G.projectId).meta();
  if (!pm.draftIds.includes(G.draftId)) throw new Error("guard: the draft is no longer in its project");
  const meta = await d.meta();
  if (Math.abs(meta.fps - G.fps) > 1e-6 || meta.frameSize.width !== G.frameSize.width || meta.frameSize.height !== G.frameSize.height) {
    throw new Error("guard: the draft is now " + meta.frameSize.width + "x" + meta.frameSize.height + " at " + meta.fps + " fps, planned " + G.frameSize.width + "x" + G.frameSize.height + " at " + G.fps);
  }
  const mainEnd = (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").reduce((m, c) => Math.max(m, c.endFrame), 0);
  if (mainEnd !== G.mainEnd) throw new Error("guard: Main now ends at frame " + mainEnd + ", planned " + G.mainEnd);
  if (G.wordsSig !== null) {
    const sig = guardWordsSig(await d.words());
    if (sig !== G.wordsSig) throw new Error("guard: the draft's words changed (" + sig + ", planned " + G.wordsSig + ")");
  }
  return { mainEnd };
};
const mine = (g) => g.name.startsWith("EO " + P.sid + " ") || g.name.startsWith("EO " + P.sid + "#");
const view = (g) => ({ name: g.name, start: g.clip.startFrame, end: g.clip.endFrame, trackId: g.clip.trackId, clipId: g.clip.clipId });`;

export function installScript(guard: DraftGuard, part: PartInstall): string {
  const P = { sid: part.sceneId, label: part.label, labels: part.labels, index: part.index, start: part.start, end: part.end };
  return `const G = ${lit(guard)};
const P = ${lit(P)};
const TSX = ${lit(part.tsx)};
const PARAMS = ${lit(part.parameters)};
${PRELUDE}
const g0 = await guard();
if (P.start < 0 || P.end <= P.start || P.end > g0.mainEnd) throw new Error("guard: scene " + P.sid + " [" + P.start + ", " + P.end + ") is outside Main (0-" + g0.mainEnd + ")");
const before = (await d.motionGraphics()).filter(mine);
const own = before.filter((g) => g.name === P.label);
const present = own.length === 1 && own[0].clip.startFrame === P.start && own[0].clip.endFrame === P.end;
const rank = (name) => P.labels.indexOf(name);
const stale = before.filter((g) => rank(g.name) < 0 || (!present && rank(g.name) >= P.index));
if (present && !stale.length) return { label: P.label, reused: true, removed: [], graphics: before.map(view) };
if (stale.length) await d.removeClips(stale.map((g) => g.clip));
let placed = null;
if (!present) {
  const r = await d.addMotionGraphic({ label: P.label, tsxCode: TSX, parameters: PARAMS, within: await d.rangeAtFrames(P.start, P.end) });
  placed = { clipId: r.clipId, start: r.startFrame, end: r.endFrame };
}
const commit = await d.commitAll("EO Shorts: scene " + P.sid + " graphic" + (P.labels.length > 1 ? " part " + (P.index + 1) + "/" + P.labels.length : ""));
const after = (await d.motionGraphics()).filter(mine);
const mineNow = after.filter((g) => g.name === P.label);
if (mineNow.length !== 1 || mineNow[0].clip.startFrame !== P.start || mineNow[0].clip.endFrame !== P.end) {
  throw new Error("read back: " + mineNow.length + " graphics labelled " + P.label + " over the scene after the commit");
}
return { label: P.label, reused: present, removed: stale.map((g) => g.name), placed, commitId: commit.commitId || null, graphics: after.map(view) };`;
}

export function installStateScript(guard: DraftGuard, part: Pick<PartInstall, "sceneId" | "label" | "labels" | "start" | "end">): string {
  const P = { sid: part.sceneId, label: part.label, labels: part.labels, start: part.start, end: part.end };
  return `const G = ${lit(guard)};
const P = ${lit(P)};
${PRELUDE}
await guard();
const graphics = (await d.motionGraphics()).filter(mine);
const own = graphics.filter((g) => g.name === P.label);
return {
  placed: own.length === 1 && own[0].clip.startFrame === P.start && own[0].clip.endFrame === P.end,
  duplicates: Math.max(0, own.length - 1),
  stale: graphics.filter((g) => !P.labels.includes(g.name)).map((g) => g.name),
  graphics: graphics.map(view),
};`;
}

export function scriptFits(script: string, budget = SCRIPT_BUDGET_BYTES): { bytes: number; fits: boolean } {
  const bytes = scriptBytes(script);
  return { bytes, fits: bytes <= budget };
}
