// The reel Draft: a new 1080 x 1920 Draft holding the chosen spans of the podcast Draft, and a read of
// everything the later steps need (words, Main clips with their source files and in-points).
import { J, script, type Sdk } from "./host";
import { rawResources } from "./sharedAiFaces.cjs";
import type { SrcWord } from "./select";

export async function readSource(sdk: Sdk, sid: string): Promise<{ name: string; fps: number; words: SrcWord[]; width: number; height: number }> {
  return script(
    sdk,
    "Read the podcast Draft",
    `const d = selects.draft(${J(sid)});
const m = await d.meta();
const ws = (await d.words()).filter((w: any) => !w.nonSpeech && !w.cut && w.endFrame > w.startFrame);
return { name: m.name, fps: m.fps, width: m.frameSize.width, height: m.frameSize.height,
  words: ws.map((w: any, i: number) => ({ i, t: w.text, s: w.startFrame, e: w.endFrame, ss: w.sourceStartFrame, sr: w.sourceResourceId })) };`
  );
}

export async function createReel(sdk: Sdk, pid: string, sid: string, name: string, ranges: [number, number][]): Promise<string> {
  const r = await script(
    sdk,
    "Create the reel Draft",
    `const p = selects.project(${J(pid)});
const src = selects.draft(${J(sid)});
const taken: string[] = [];
for (const id of ((await p.meta()) as any).draftIds || []) { try { taken.push((await selects.draft(id).meta()).name); } catch {} }
let name = ${J(name)};
for (let k = 2; taken.includes(name); k += 1) name = ${J(name)} + " (" + k + ")";
const d = await p.createDraft({ name });
for (const [s, e] of ${J(ranges)} as [number, number][]) await d.insert({ source: await src.rangeAtFrames(s, e), tracks: "main" });
await d.setFrameSize({ width: 1080, height: 1920 });
const c = await d.commitAll("Podcast Hook Captions: new reel");
return { id: c.createdDraftId, name };`,
    true
  );
  if (!r?.id) throw new Error("The reel Draft was not created.");
  return r.id;
}

export type ReelClip = { clipId: number; rid: string; s: number; e: number; path: string | null; sw: number; sh: number; srcStart: number };
export type ReelInfo = { fps: number; endFrame: number; words: { t: string; s: number; e: number; ss: number | null }[]; clips: ReelClip[] };

export async function readReel(sdk: Sdk, pid: string, rid: string): Promise<ReelInfo> {
  const r = await script(
    sdk,
    "Read the reel Draft",
    `const p = selects.project(${J(pid)});
const d = selects.draft(${J(rid)});
const m = await d.meta();
const words = (await d.words()).filter((w: any) => !w.nonSpeech && !w.cut && w.endFrame > w.startFrame)
  .map((w: any) => ({ t: w.text, s: w.startFrame, e: w.endFrame, ss: w.sourceStartFrame }));
const main = (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
const tree: any = await p.sourceFiles();
const files: any[] = [];
const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
// Large Projects expose a shallow folder summary. A named folder returns its
// full subtree even above 200 files; "(root)" contains loose top-level files.
if ("fileTree" in tree) walk(tree.fileTree);
else for (const folder of tree.folders) {
  const detail: any = await p.sourceFiles({ folder: folder.name });
  if (!("fileTree" in detail)) throw new Error("The Project source folder could not be read: " + folder.name);
  walk(detail.fileTree);
}
if (files.length !== tree.fileCount) throw new Error("The Project source inventory changed or is incomplete. Read the reel again.");
const clips = main.map((c: any) => {
  const f = files.find((x: any) => x.resourceId === c.resourceId);
  const offs = words.filter((w: any) => w.s >= c.startFrame && w.e <= c.endFrame && w.ss != null).map((w: any) => w.ss - w.s).sort((a: number, b: number) => a - b);
  const off = offs.length ? offs[Math.floor(offs.length / 2)] : null;
  return { clipId: c.clipId, rid: c.resourceId, s: c.startFrame, e: c.endFrame, path: f ? f.path : null,
    sw: f?.frameSize?.width || 0, sh: f?.frameSize?.height || 0, srcStart: off == null ? -1 : (c.startFrame + off) / m.fps };
});
return { fps: m.fps, endFrame: main.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0), words, clips };`
  );
  // The panel bridge returns persistent UUIDs; run_script aliases are run-local observations.
  const raw = rawResources(await sdk.call("getDraftCore", rid), pid, rid);
  for (const c of r.clips) {
    const id = raw.get(c.clipId);
    if (!id) throw new Error("The source Resource of clip " + c.clipId + " is no longer available.");
    c.rid = id;
  }
  return r as ReelInfo;
}
