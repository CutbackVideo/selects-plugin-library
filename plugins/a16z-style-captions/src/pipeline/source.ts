import { canonicalResourceBindings } from "../../../../shared/ai-resources.cjs";
// Reading Drafts: the source talking-head Draft (words, Main clips with their files and in-points) and,
// after the Short is made, the Short itself.
import { J, LIST_FILES, script, type Sdk } from "./host";

export type SrcWord = { i: number; t: string; s: number; e: number; ss: number | null; rid: string | null };
export type SrcClip = { clipId: number; rid: string; s: number; e: number; path: string | null; sw: number; sh: number; srcStart: number; canonicalResourceId: string; sourceFps: number; sourceDuration: number };
export type DraftInfo = { name: string; fps: number; width: number; height: number; endFrame: number; words: SrcWord[]; clips: SrcClip[] };

export const READ = (id: string, pid: string, bindings: Record<number, string>) => `const p = selects.project(${J(pid)});
const d = selects.draft(${J(id)});
const m = await d.meta();
const ws = (await d.words()).filter((w: any) => !w.nonSpeech && !w.cut && w.endFrame > w.startFrame);
const main = (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
${LIST_FILES}
const files = await listFiles(p);
const persistent:Record<number,string> = ${J(bindings)};
const clips = await Promise.all(main.map(async (c: any) => {
  const rm = await p.resource(c.resourceId).meta();
  const sourceFps = rm.fps;
  const f = files.find((x: any) => x.resourceId === c.resourceId);
  const offs = ws.filter((w: any) => w.startFrame >= c.startFrame && w.endFrame <= c.endFrame && w.sourceStartFrame != null && (w.sourceResourceId === c.resourceId || w.sourceResourceId === persistent[c.clipId])).map((w: any) => w.sourceStartFrame / sourceFps - w.startFrame / m.fps).sort((a: number, b: number) => a - b);
  const off = offs.length ? offs[Math.floor(offs.length / 2)] : null;
  return { clipId: c.clipId, rid: c.resourceId, s: c.startFrame, e: c.endFrame, path: f ? f.path : null,
    sw: f?.frameSize?.width || rm.frameSize.width, sh: f?.frameSize?.height || rm.frameSize.height, srcStart: off == null ? -1 : c.startFrame / m.fps + off, canonicalResourceId: persistent[c.clipId], sourceFps, sourceDuration: rm.durationSeconds };
}));
return { name: m.name, fps: m.fps, width: m.frameSize.width, height: m.frameSize.height,
  endFrame: main.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0),
  words: ws.map((w: any, i: number) => ({ i, t: w.text, s: w.startFrame, e: w.endFrame, ss: w.sourceStartFrame ?? null, rid: w.sourceResourceId ?? null })),
  clips };`;

export async function readDraft(sdk: Sdk, pid: string, id: string, label = "Read the Draft"): Promise<DraftInfo> {
  if (!sdk.call) throw new Error("Update Selects to resolve source Resources.");
  const before = canonicalResourceBindings(await sdk.call("getDraftCore", id), { projectId: pid, draftId: id });
  const result = await script(sdk, label, READ(id, pid, Object.fromEntries(before)));
  const after = canonicalResourceBindings(await sdk.call("getDraftCore", id), { projectId: pid, draftId: id });
  const fingerprint = (map: Map<number, string>) => JSON.stringify([...map].sort((a, b) => a[0] - b[0]));
  if (fingerprint(before) !== fingerprint(after)) throw new Error("Main sources changed while reading the Draft. Try again.");
  if (result.clips.some((c: SrcClip) => !c.canonicalResourceId || !(c.sourceFps > 0) || !(c.sourceDuration > 0))) throw new Error("The persistent source Resource is unavailable.");
  return result;
}
