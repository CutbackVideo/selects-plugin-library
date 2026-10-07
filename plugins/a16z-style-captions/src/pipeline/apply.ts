// Run-script builders that write the Short into Drafts. Each saves with commitAll inside the same run.
import { J, LIST_FILES, script, type Sdk } from "./host";
import { lookCode, graphicCode } from "../renderers";
import type { ClipFrame } from "./framing";
import { W, H } from "./framing";

export const LOOK_LABEL = "a16z Vertical Frame";
export const GRAPHIC_LABEL = "a16z Captions";

// One commit: a new 9:16 Draft holding the kept ranges of the source Draft, every Main clip stretched to
// the frame and given the framing effect. The app opens a Draft created this way at once, so it is
// framed before it opens.
export async function createShort(sdk: Sdk, pid: string, sid: string, baseName: string, ranges: [number, number][], frames: ClipFrame[], fps: number): Promise<{ id: string; name: string }> {
  const plan = frames.map((c) => ({ start: c.start, end: c.end, sw: c.sw, sh: c.sh, shots: c.shots, open: c.open || null }));
  const r = await script(
    sdk,
    "Create the 9:16 Short",
    `const p = selects.project(${J(pid)});
const src = selects.draft(${J(sid)});
const taken: string[] = [];
for (const id of ((await p.meta()) as any).draftIds || []) { try { taken.push((await selects.draft(id).meta()).name); } catch {} }
let name = ${J(baseName)};
for (let k = 2; taken.includes(name); k += 1) name = ${J(baseName)} + " (" + k + ")";
const d = await p.createDraft({ name });
for (const [s, e] of ${J(ranges)} as [number, number][]) await d.insert({ source: await src.rangeAtFrames(s, e), tracks: "main" });
await d.setFrameSize({ width: ${W}, height: ${H} });
const PLAN: any[] = ${J(plan)};
const LOOK = ${J(lookCode)};
const mains = async () => (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
const stretch = (sw: number, sh: number) => { const k = Math.min(${W} / sw, ${H} / sh); return { x: ${W} / (sw * k), y: ${H} / (sh * k) }; };
const ids: number[] = [];
const missing: number[] = [];
for (const m of PLAN) {
  const all = await mains();
  const clip: any = all.find((c: any) => c.startFrame === m.start) || all.find((c: any) => c.startFrame <= m.start && c.endFrame > m.start);
  if (!clip) { missing.push(m.start); ids.push(-1); continue; }
  ids.push(clip.clipId);
  await d.setClipTransform({ clip, scale: stretch(m.sw, m.sh), position: { x: 0, y: 0 }, rotation: 0 });
}
for (let k = 0; k < PLAN.length; k += 1) {
  if (ids[k] < 0) continue;
  const m = PLAN[k];
  const clip: any = (await mains()).find((c: any) => c.clipId === ids[k]);
  if (!clip) continue;
  await d.addVideoEffect({ clip, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: m.sw, sh: m.sh, start: clip.startFrame, shots: m.shots, open: m.open }, editableParameters: [] });
}
const saved = await d.commitAll("a16z Style Captions: new 9:16 Short");
if (!saved.createdDraftId) throw new Error("The Short was not created.");
return { id: saved.createdDraftId, name, missing };`,
    true
  );
  if (!r?.id) throw new Error("The Short was not created.");
  return { id: r.id, name: r.name };
}

export async function importFiles(sdk: Sdk, pid: string, paths: string[]): Promise<{ id: string; path: string }[]> {
  return script(
    sdk,
    "Add the Short's media to the Project",
    `const p = selects.project(${J(pid)});
const paths: string[] = ${J(paths)};
${LIST_FILES}
// a rebuild reuses files the Project already has
const have = await listFiles(p);
const missing = paths.filter((path) => !have.some((x: any) => x.path === path));
const added = missing.length ? (await p.importFiles({ paths: missing })).addedResourceIds : [];
const files = missing.length ? await listFiles(p) : have;
return paths.map((path) => {
  const f = files.find((x: any) => x.path === path);
  // a single new file is the one resource the import added, even before the listing shows it
  const id = f ? f.resourceId : missing.length === 1 && added.length === 1 && missing[0] === path ? added[0] : null;
  return { id, path };
});`,
    true
  );
}

export type PlacedInsert = { id: string; a: number; b: number; sw: number; sh: number; rect: { x: number; y: number; w: number; h: number }; push: number };

// B-roll first (each clip silent, cover-cropped by the frame effect), then the graphic over the whole
// Short (new tracks go on top, so the captions sit over the B-roll), the music bed and the gains, in
// one commit.
export async function finishShort(
  sdk: Sdk,
  rid: string,
  pid: string,
  endFrame: number,
  data: any,
  music: { id: string; db: number } | null,
  voiceDb: number,
  inserts: PlacedInsert[] = [],
  fps = 24,
  relook: { clips: ClipFrame[]; windows: { from: number; to: number }[] } | null = null
) {
  const frames = relook ? relook.clips.map((c) => ({ start: c.start, sw: c.sw, sh: c.sh, shots: c.shots, open: c.open || null })) : [];
  return script(
    sdk,
    "Add B-roll, captions, graphics and music",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
const INS: any[] = ${J(inserts)};
const LOOK = ${J(inserts.length || relook ? lookCode : "")};
// the Main clips' frame effect again, with this build's window cards
const FRAMES: any[] = ${J(frames)};
const WINDOWS: any[] = ${J(relook ? relook.windows : [])};
for (const m of FRAMES) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.trackKind === "main" && c.startFrame === m.start);
  if (!clip) continue;
  for (const e of await d.videoEffects(clip)) if (e.name === ${J(LOOK_LABEL)}) await d.removeVideoEffect(e);
  const again: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === clip.clipId);
  await d.addVideoEffect({ clip: again, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: m.sw, sh: m.sh, start: again.startFrame, shots: m.shots, open: m.open, windows: WINDOWS }, editableParameters: [] });
}
const stretch = (sw: number, sh: number) => { const k = Math.min(${W} / sw, ${H} / sh); return { x: ${W} / (sw * k), y: ${H} / (sh * k) }; };
let placed = 0;
const skipped: number[] = [];
for (const b of INS) {
  // one clip that will not place must not stop the captions
  try { await d.overlayResource({ resource: p.resource(b.id), over: await d.rangeAtFrames(b.a, b.b), sourceStartSeconds: 0 }); } catch { skipped.push(b.a); continue; }
  const all = await d.clips({ trackScope: "all" });
  const video: any = all.filter((c: any) => c.trackKind === "video" && c.resourceId === b.id && c.startFrame === b.a)[0];
  if (!video) continue;
  const audio = all.filter((c: any) => c.trackKind === "audio" && c.resourceId === b.id && c.startFrame === b.a);
  if (audio.length) await d.removeClips(audio);
  const v1: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.setClipTransform({ clip: v1, scale: stretch(b.sw, b.sh), position: { x: 0, y: 0 }, rotation: 0 });
  const v2: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.addVideoEffect({ clip: v2, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: b.sw, sh: b.sh, start: b.a, end: b.b, push: b.push, grade: "saturate(0.8) contrast(1.05) brightness(0.97) sepia(0.07)", shots: [{ from: b.a, to: b.b, ...b.rect }] }, editableParameters: [] });
  placed += 1;
}
const g = await d.addMotionGraphic({ label: ${J(GRAPHIC_LABEL)}, tsxCode: ${J(graphicCode)}, parameters: ${J(data)}, editableParameters: [], within: await d.rangeAtFrames(0, ${endFrame}) });
const music: any = ${J(music)};
let musicInserted = 0;
if (music && music.id) {
  const resource = (await p.resources()).find((r) => r.resourceId === music.id);
  const draftFps = (await d.meta()).fps;
  // A generated or cached bed can be shorter than the Short (generation is capped at 150s).
  // Floor to whole Draft frames so no repetition asks past the available source.
  const musicFrames = Math.floor(Number(resource?.durationSeconds) * draftFps);
  if (!Number.isSafeInteger(musicFrames) || musicFrames < 1) throw new Error("The music resource has no usable duration. Reimport the music before rebuilding.");
  for (let start = 0; start < ${endFrame}; start += musicFrames) {
    const end = Math.min(${endFrame}, start + musicFrames);
    // Explicit 1x keeps the exact target length when the source and Draft frame grids differ.
    const bed = await d.overlayResource({ resource: p.resource(music.id), over: await d.rangeAtFrames(start, end), sourceStartSeconds: 0, playbackSpeed: { numerator: 1, denominator: 1 } });
    musicInserted += bed.inserted;
  }
  const clips = (await d.clips({ trackScope: "all" })).filter((c: any) => c.resourceId === music.id);
  for (const c of clips) { const cur: any = (await d.clips({ trackScope: "all" })).find((x: any) => x.clipId === c.clipId); if (cur) await d.setClipAudio({ clip: cur, volumeDb: music.db }); }
}
const voice: number = ${J(voiceDb)};
if (voice) for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) await d.setClipAudio({ clip, volumeDb: voice });
}
const saved = await d.commitAll("a16z Style Captions: B-roll, captions, graphics and music");
return { commitId: saved.commitId, graphic: g.clipId, music: musicInserted, placed, skipped };`,
    true
  );
}

// Back to the bare framed cut: remove this plugin's graphic, the B-roll and music clips (by Resource),
// and reset the voice gain.
export async function stripShort(sdk: Sdk, rid: string, resourceIds: string[]) {
  return script(
    sdk,
    "Clear the previous captions and music",
    `const d = selects.draft(${J(rid)});
const ids: string[] = ${J(resourceIds.filter(Boolean))};
const graphics = (await d.motionGraphics()).filter((g: any) => g.name === ${J(GRAPHIC_LABEL)});
for (const g of graphics) { const cur = (await d.motionGraphics()).find((x: any) => x.clip.clipId === g.clip.clipId); if (cur) await d.removeClips(cur.clip); }
const extra = (await d.clips({ trackScope: "all" })).filter((c: any) => c.resourceId != null && ids.includes(c.resourceId) && c.trackKind !== "main");
if (extra.length) await d.removeClips(extra);
let reset = 0;
for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) { const r: any = await d.setClipAudio({ clip, volumeDb: 0 }); if (r.diff && r.diff.opCount) reset += 1; }
}
if (!graphics.length && !extra.length && !reset) return { graphics: 0, clips: 0, commitId: null };
const saved = await d.commitAll("a16z Style Captions: clear for rebuild");
return { graphics: graphics.length, clips: extra.length, commitId: saved.commitId };`,
    true
  );
}
