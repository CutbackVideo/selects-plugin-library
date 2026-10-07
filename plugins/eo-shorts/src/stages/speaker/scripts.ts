import { lit } from "../../host/runScript.ts";
import { GUARD_WORDS_JS } from "../compose/wordsGuard.ts";
import { SOURCE_FILES_JS } from "../compose/scripts.ts";
import type { MainPiece, SeamLite, WordLite } from "../../speaker/sourceTime.ts";

export type SpeakerDraftRead = {
  fps: number;
  frameSize: { width: number; height: number };
  mainEnd: number;
  wordsSig: string;
  main: MainPiece[];
  words: WordLite[];
  seams: SeamLite[];
  resources: Record<string, { fps: number; path: string | null; frameSize: { width: number; height: number } | null; name: string | null; canonicalResourceId?: string; durationSeconds?: number }>;
};

export function readSpeakerDraftScript(projectId: string, draftId: string, bindings: Record<number, string> = {}): string {
  return `const p = selects.project(${lit(projectId)});
const d = selects.draft(${lit(draftId)});
${GUARD_WORDS_JS}
${SOURCE_FILES_JS}
const pm = await p.meta();
if (!pm.draftIds.includes(${lit(draftId)})) throw new Error("the EO draft is not in its project any more");
const meta = await d.meta();
const main = (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").sort((a, b) => a.startFrame - b.startFrame)
  .map((c) => ({ clipId: c.clipId, startFrame: c.startFrame, endFrame: c.endFrame, resourceId: c.resourceId ?? null, playbackSpeed: c.playbackSpeed ?? null }));
const all = await d.words();
const words = all.map((w) => ({ startFrame: w.startFrame, endFrame: w.endFrame, sourceStartFrame: w.sourceStartFrame ?? null, sourceResourceId: w.sourceResourceId ?? null, cut: !!w.cut }));
const seams = (await d.seams()).map((s) => ({ playbackFrame: s.playbackFrame, hiddenDraftFrames: s.hiddenDraftFrames, sourceJump: s.sourceJump ?? null, sourceGap: s.sourceGap ?? null }));
const files = await sourceFiles(p);
const resources = {};
const persistent:Record<number,string> = ${lit(bindings)};
for (const rid of new Set(main.map((c) => c.resourceId).filter(Boolean))) {
  const rm = await p.resource(rid).meta();
  const f = files.find((x) => x.resourceId === rid);
  resources[rid] = { fps: rm.fps, path: f ? f.path : null, frameSize: f && f.frameSize ? f.frameSize : null, name: rm.name ?? null, canonicalResourceId:persistent[main.find(c=>c.resourceId===rid)?.clipId], durationSeconds:rm.durationSeconds };
}
for(const w of words){if(w.sourceResourceId)for(const [rid,r]of Object.entries(resources) as [string,any][]){if(w.sourceResourceId===r.canonicalResourceId)w.sourceResourceId=rid;}}
for(const seam of seams){if(seam.sourceGap)for(const [rid,r]of Object.entries(resources) as [string,any][]){if(seam.sourceGap.resourceId===r.canonicalResourceId)seam.sourceGap.resourceId=rid;}}
return { fps: meta.fps, frameSize: meta.frameSize, mainEnd: main.reduce((m, c) => Math.max(m, c.endFrame), 0), wordsSig: guardWordsSig(all), main, words, seams, resources };`;
}
