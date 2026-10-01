// Reading Drafts: the source talking-head Draft (words, Main clips with their files and in-points) and,
// after the Short is made, the Short itself.
import { J, LIST_FILES, script, type Sdk } from "./host";

export type SrcWord = { i: number; t: string; s: number; e: number; ss: number | null; rid: string | null };
export type SrcClip = { clipId: number; rid: string; s: number; e: number; path: string | null; sw: number; sh: number; srcStart: number };
export type DraftInfo = { name: string; fps: number; width: number; height: number; endFrame: number; words: SrcWord[]; clips: SrcClip[] };

const READ = (id: string, pid: string) => `const p = selects.project(${J(pid)});
const d = selects.draft(${J(id)});
const m = await d.meta();
const ws = (await d.words()).filter((w: any) => !w.nonSpeech && !w.cut && w.endFrame > w.startFrame);
const main = (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
${LIST_FILES}
const files = await listFiles(p);
const clips = main.map((c: any) => {
  const f = files.find((x: any) => x.resourceId === c.resourceId);
  const offs = ws.filter((w: any) => w.startFrame >= c.startFrame && w.endFrame <= c.endFrame && w.sourceStartFrame != null).map((w: any) => w.sourceStartFrame - w.startFrame).sort((a: number, b: number) => a - b);
  const off = offs.length ? offs[Math.floor(offs.length / 2)] : null;
  return { clipId: c.clipId, rid: c.resourceId, s: c.startFrame, e: c.endFrame, path: f ? f.path : null,
    sw: f?.frameSize?.width || 0, sh: f?.frameSize?.height || 0, srcStart: off == null ? -1 : (c.startFrame + off) / m.fps };
});
return { name: m.name, fps: m.fps, width: m.frameSize.width, height: m.frameSize.height,
  endFrame: main.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0),
  words: ws.map((w: any, i: number) => ({ i, t: w.text, s: w.startFrame, e: w.endFrame, ss: w.sourceStartFrame ?? null, rid: w.sourceResourceId ?? null })),
  clips };`;

export async function readDraft(sdk: Sdk, pid: string, id: string, label = "Read the Draft"): Promise<DraftInfo> {
  return script(sdk, label, READ(id, pid));
}
