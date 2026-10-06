import type { PanelSdk } from "../../host/types.ts";
import { lit, readScript } from "../../host/runScript.ts";
import { SOURCE_FILES_JS } from "../compose/scripts.ts";
import { WORD_ROW_JS, type EditWord } from "../edit/words.ts";
import { joinSplitWords } from "../compose/wordsGuard.ts";

export type SoundClipRead = {
  start: number;
  end: number;
  path: string | null;
  ours: boolean;
  music: boolean;
  muted: boolean;
  level: { volumeDb: number | null; keys: number; maxDb: number | null; fadeIn: number; fadeOut: number; changed: number } | null;
};

export type DiagDraftRead = {
  name: string | null;
  fps: number;
  frameSize: { width: number; height: number };
  durationFrames: number;
  mainEnd: number;
  rows: EditWord[];
  retimed: number;
  sound: SoundClipRead[];
  overlays: { start: number; end: number; path: string | null }[];
};

export function diagnosticsReadScript(i: { projectId: string; draftId: string; soundRoot: string; musicFadeIn?: number | null }): string {
  return `const P = ${lit({ projectId: i.projectId, draftId: i.draftId, soundRoot: i.soundRoot, fadeIn: i.musicFadeIn ?? 0 })};
const p = selects.project(P.projectId);
const d = selects.draft(P.draftId);
${SOURCE_FILES_JS}
${WORD_ROW_JS}
const pm = await p.meta();
if (!pm.draftIds.includes(P.draftId)) throw new Error("the EO draft is no longer in its project");
const meta = await d.meta();
const files = await sourceFiles(p);
const fileOf = (rid) => files.find((f) => f.resourceId === rid) || null;
const all = await d.clips({ trackScope: "all" });
const mainEnd = all.filter((c) => c.trackKind === "main").reduce((m, c) => Math.max(m, c.endFrame), 0);
const retimed = all.filter((c) => c.playbackSpeed && c.playbackSpeed.numerator !== c.playbackSpeed.denominator).length;
const rows = (await d.words()).filter((w) => !w.cut).map(row);
const sound = [];
for (const c0 of all.filter((c) => c.trackKind === "audio" && c.resourceId)) {
  const f = fileOf(c0.resourceId);
  const path = f ? f.path : null;
  const ours = !!(path && under(path, P.soundRoot));
  const music = ours && /EO Music - /.test(path);
  const muted = Array.isArray(c0.audioSourceIndexes) && c0.audioSourceIndexes.length === 0;
  let level = null;
  if (music) {
    const c = (await d.clips({ trackScope: "all" })).find((x) => x.clipId === c0.clipId);
    if (c) {
      const a = await d.setClipAudio({ clip: c, fadeInSeconds: P.fadeIn });
      const keys = a.volumeKeys || [];
      level = { volumeDb: a.volumeDb, keys: keys.length, maxDb: keys.length ? Math.max(...keys.map((k) => k.volumeDb)) : a.volumeDb, fadeIn: a.fadeInSeconds, fadeOut: a.fadeOutSeconds, changed: a.diff ? a.diff.opCount : 0 };
    }
  }
  sound.push({ start: c0.startFrame, end: c0.endFrame, path, ours, music, muted, level });
}
const overlays = all.filter((c) => c.trackKind === "video" && c.resourceId).map((c) => { const f = fileOf(c.resourceId); return { start: c.startFrame, end: c.endFrame, path: f ? f.path : null }; });
return { name: meta.name, fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames, mainEnd, rows, retimed, sound, overlays };`;
}

export async function readDiagnosticsDraft(sdk: PanelSdk, i: { projectId: string; draftId: string; soundRoot: string; musicFadeIn?: number | null; signal?: AbortSignal | null; backoffMs?: number[] }): Promise<DiagDraftRead & { words: EditWord[] }> {
  const r = await readScript<DiagDraftRead>(sdk, "EO Shorts: read the EO draft for the checks", diagnosticsReadScript(i), { signal: i.signal, backoffMs: i.backoffMs });
  return { ...r, words: joinSplitWords(r.rows) };
}

const norm = (p: string | null) => (p == null ? "" : p.replace(/\\/g, "/").toLowerCase());

export function foreignOverlays(overlays: DiagDraftRead["overlays"], footageRoot: string): string[] {
  const root = norm(footageRoot).replace(/\/?$/, "/");
  return overlays.filter((o) => !norm(o.path).startsWith(root)).map((o) => (o.path ?? "(no file)") + " " + o.start + "-" + o.end);
}
