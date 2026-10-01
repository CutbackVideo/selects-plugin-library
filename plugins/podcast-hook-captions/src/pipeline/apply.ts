// Run-script builders that write the reel into the Draft. Each returns plain data; the Draft is saved
// with commitAll inside the same run.
import { J, script, type Sdk } from "./host";
import { lookCode, reelCode } from "../renderers";
import type { Plan, ShotFrame } from "../plan";
import type { ReelClip } from "./reel";
import { SPEAKER_GRADE, BROLL_GRADE, type Grade } from "../motion/grade";

export const LOOK_LABEL = "Reel Look";
export const GRAPHIC_LABEL = "Reel Titles";

// Places each B-roll clip on the outermost lane, drops its audio, and gives it the card Look.
const PLACE_BROLL = `const placed: any[] = [];
for (const b of BROLL) {
  const res: any = await d.overlayResource({ resource: p.resource(b.rid), over: await d.rangeAtFrames(b.start, b.end), sourceStartSeconds: b.offset });
  const all = await d.clips({ trackScope: "all" });
  const video: any = all.filter((c: any) => c.trackKind === "video" && c.resourceId === b.rid && c.startFrame === b.start)[0];
  if (!video) throw new Error("B-roll clip was not placed.");
  const audio = all.filter((c: any) => c.trackKind === "audio" && c.resourceId === b.rid && c.startFrame === b.start);
  if (audio.length) await d.removeClips(audio);
  const again: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.setClipTransform({ clip: again, scale: stretch(b.sw, b.sh), position: { x: 0, y: 0 }, rotation: 0 });
  const again2: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.addVideoEffect({ clip: again2, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: b.data, editableParameters: [] });
  placed.push({ clipId: video.clipId, inserted: res.inserted });
}
`;

// The Project's source files with their current resource ids. Script resource ids are only stable within
// one app session, so the plugin keeps file paths and looks the ids up again every time.
const SOURCE_FILES = `const sourceFiles = async (p: any) => {
  const files: any[] = [];
  const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  const tree: any = await p.sourceFiles();
  // Over 200 files the overview is a per-folder summary; read each folder's full list then.
  if ("fileTree" in tree) walk(tree.fileTree);
  else for (const f of tree.folders || []) { const t: any = await p.sourceFiles({ folder: f.name }); walk("fileTree" in t ? t.fileTree : []); }
  return files;
};
const samePath = (a: string, b: string) => String(a).replace(/\\\\/g, "/").toLowerCase() === String(b).replace(/\\\\/g, "/").toLowerCase();
`;

// Media files in the Project by path: files already imported are reused, the rest are imported.
export async function importFiles(sdk: Sdk, pid: string, paths: string[]): Promise<{ id: string; path: string; w: number; h: number }[]> {
  return script(
    sdk,
    "Add generated media to the Project",
    `const p = selects.project(${J(pid)});
${SOURCE_FILES}const paths: string[] = ${J(paths)};
const have = await sourceFiles(p);
const missing = paths.filter((path) => !have.some((x: any) => samePath(x.path, path)));
if (missing.length) await p.importFiles({ paths: missing });
const files = missing.length ? await sourceFiles(p) : have;
return paths.map((path) => { const f = files.find((x: any) => samePath(x.path, path)); return { id: f ? f.resourceId : null, path, w: f?.frameSize?.width || 0, h: f?.frameSize?.height || 0 }; });`,
    true
  );
}

export function brollPlacements(plan: Plan, brolls: { id: string; w: number; h: number }[]) {
  return plan.broll
    .map((b, i) => {
      const r = brolls[b.clip];
      if (!r || !r.id) return null;
      return {
        rid: r.id,
        start: b.start,
        end: b.end,
        offset: b.offsetSeconds,
        sw: r.w || 1080,
        sh: r.h || 1920,
        data: { mode: "card", kind: b.kind, W: plan.W, H: plan.H, fps: plan.fps, sw: r.w || 1080, sh: r.h || 1920, start: b.start, dur: b.end - b.start, uid: "b" + i, gridZoom: plan.gridZoom, grade: BROLL_GRADE },
      };
    })
    .filter(Boolean);
}

export async function applyLook(
  sdk: Sdk,
  rid: string,
  pid: string,
  plan: Plan,
  clips: ReelClip[],
  shots: ShotFrame[],
  brolls: { id: string; w: number; h: number }[],
  grade: Grade = SPEAKER_GRADE
) {
  const mainData = clips.map((c) => ({
    clipId: c.clipId,
    sw: c.sw || 1920,
    sh: c.sh || 1080,
    data: {
      mode: "main",
      W: plan.W,
      H: plan.H,
      fps: plan.fps,
      sw: c.sw || 1920,
      sh: c.sh || 1080,
      start: c.s,
      uid: "m" + c.clipId,
      shots: shots.filter((s) => s.to > c.s && s.from < c.e).map((s) => ({ from: s.from, to: s.to, ...s.rect })),
      camera: plan.camera,
      free: plan.free,
      grade,
    },
  }));
  const brollData = brollPlacements(plan, brolls);
  return script(
    sdk,
    "Reframe, grade and place B-roll",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
const LOOK = ${J(lookCode)};
const MAIN: any[] = ${J(mainData)};
const BROLL: any[] = ${J(brollData)};
const stretch = (sw: number, sh: number) => { const c = Math.min(${plan.W} / sw, ${plan.H} / sh); return { x: ${plan.W} / (sw * c), y: ${plan.H} / (sh * c) }; };
const mains = async () => (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
for (const m of MAIN) {
  const clip: any = (await mains()).find((c: any) => c.clipId === m.clipId);
  if (!clip) throw new Error("Main clip " + m.clipId + " is gone.");
  await d.setClipTransform({ clip, scale: stretch(m.sw, m.sh), position: { x: 0, y: 0 }, rotation: 0 });
}
for (const m of MAIN) {
  const clip: any = (await mains()).find((c: any) => c.clipId === m.clipId);
  await d.addVideoEffect({ clip, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: m.data, editableParameters: [] });
}
${PLACE_BROLL}const saved = await d.commitAll("Podcast Hook Captions: reframe, look and B-roll");
return { commitId: saved.commitId, placed };`,
    true
  );
}

// B-roll cards, the Reel graphic and the sound bed, in one commit.
export async function finishReel(sdk: Sdk, rid: string, pid: string, plan: Plan, data: Record<string, any>, soundId: string | null, brolls: { id: string; w: number; h: number }[], mainDb = 0) {
  const brollData = brollPlacements(plan, brolls);
  return script(
    sdk,
    "Add B-roll, titles, captions and sound",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
const LOOK = ${J(brollData.length ? lookCode : "")};
const BROLL: any[] = ${J(brollData)};
const stretch = (sw: number, sh: number) => { const c = Math.min(${plan.W} / sw, ${plan.H} / sh); return { x: ${plan.W} / (sw * c), y: ${plan.H} / (sh * c) }; };
${PLACE_BROLL}const g = await d.addMotionGraphic({ label: ${J(GRAPHIC_LABEL)}, tsxCode: ${J(reelCode)}, parameters: ${J(data)}, editableParameters: [], within: await d.rangeAtFrames(0, ${plan.endFrame}) });
let sound: any = null;
const sid: string | null = ${J(soundId)};
if (sid) sound = await d.overlayResource({ resource: p.resource(sid), over: await d.rangeAtFrames(0, ${plan.endFrame}) });
const gain: number = ${J(Math.round(mainDb * 10) / 10)};
for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) await d.setClipAudio({ clip, volumeDb: gain });
}
const saved = await d.commitAll("Podcast Hook Captions: B-roll, titles, captions and sound");
return { commitId: saved.commitId, graphic: g.clipId, placed, sound: sound ? sound.inserted : 0 };`,
    true
  );
}

// Take the reel back to its bare cut: remove this plugin's Look effects, its graphic, its B-roll and
// sound clips (by Resource), so a rebuild starts clean. Clip transforms are rewritten by applyLook.
// Everything this plugin generated for a reel lives in the reel's folder, so its clips are found by the
// path of their media (resource ids change between app sessions).
export async function stripReel(sdk: Sdk, rid: string, pid: string, folder: string) {
  return script(
    sdk,
    "Clear the previous reel layers",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
${SOURCE_FILES}const root = String(${J(folder)}).replace(/\\\\/g, "/").toLowerCase().replace(/\\/?$/, "/");
const ids: string[] = (await sourceFiles(p)).filter((f: any) => f.resourceId && String(f.path).replace(/\\\\/g, "/").toLowerCase().startsWith(root)).map((f: any) => f.resourceId);
let removedEffects = 0;
for (let guard = 0; guard < 200; guard += 1) {
  let hit: any = null;
  for (const c of await d.clips({ trackScope: "all" })) {
    if (c.resourceId == null || (c.trackKind !== "main" && c.trackKind !== "video")) continue;
    const e = (await d.videoEffects(c)).find((x: any) => x.name === ${J(LOOK_LABEL)});
    if (e) { hit = e; break; }
  }
  if (!hit) break;
  await d.removeVideoEffect(hit);
  removedEffects += 1;
}
const graphics = (await d.motionGraphics()).filter((g: any) => g.name === ${J(GRAPHIC_LABEL)});
for (const g of graphics) { const cur = (await d.motionGraphics()).find((x: any) => x.clip.clipId === g.clip.clipId); if (cur) await d.removeClips(cur.clip); }
const extra = (await d.clips({ trackScope: "all" })).filter((c: any) => c.resourceId != null && ids.includes(c.resourceId) && c.trackKind !== "main");
if (extra.length) await d.removeClips(extra);
// Back to unity voice gain (a build mutes the Main clips under its mastered soundtrack), so the next
// build renders the voice as it really is.
let reset = 0;
for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) { const r: any = await d.setClipAudio({ clip, volumeDb: 0 }); if (r.diff && r.diff.opCount) reset += 1; }
}
if (!removedEffects && !graphics.length && !extra.length && !reset) return { removedEffects, graphics: 0, clips: 0, commitId: null };
const saved = await d.commitAll("Podcast Hook Captions: clear for rebuild");
return { removedEffects, graphics: graphics.length, clips: extra.length, commitId: saved.commitId };`,
    true
  );
}
