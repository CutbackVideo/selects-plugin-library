// Torn Paper Love, commit 1: a new 1440x1080 Draft with the 2N pictures on Main, cover transforms, music, clip sound.
// cfg (JSON):
// {
//   projectId, draftName,
//   slots: [{ rid, kind: 'photo' | 'video', startSeconds }],   // 2N entries in Main order; photos use startSeconds 0,
//                                                               // a video's two occurrences carry the same start S
//   targets: number[],       // 2N+1 continuous boundary times in seconds from the section start, incl. 0 and the end
//                            // (grid or snapped-onset targets from the planner; never frames)
//   music: { resourceId, sectionStart } | null,
//   clipSound: 'off' | 'ambient' | 'full', ambientDb,            // ambient level for video clips (default -18)
//   vis: { [rid]: { cover, anchorY } },   // cover = native cover scale (fill/fit); anchorY = where the visible window's
//                                         // centre sits in the scaled image height (0.4 portrait, 0.5 otherwise).
//                                         // Must be 0.5 for sources wider than 4:3 (the shift is vertical only).
//   W: 1440, H: 1080
// }
// returns { sequenceId, fps, frames, totalFrames, placed, ambientClips, notes }
//   frames = the boundary frames read back from Main after the build (2N+1, frames[0] = 0).
const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const notes = [];
const W = cfg.W || 1440, H = cfg.H || 1080;
// tpl-cover:start
// Vertical transform position (setClipTransform: % of the frame height from its centre, +Y up) that crops a cover-
// scaled source taller than the canvas so the visible window's centre sits at `anchorY` of the scaled image height
// (0 = top, 1 = bottom), clamped so no bars show. In frame-height units the scaled image is `cover` tall and the
// window 1 tall; the centred crop's top is (cover - 1) / 2. Moving the image down shows its upper part: negative y.
// ASSUMPTION (to confirm live): the conformed image fills the frame height exactly, scale acts around its centre
// (anchor 0) and position is applied in frame units after scaling.
const tplCoverPositionY = (cover, anchorY) => {
  if (!(cover > 1)) return 0;
  const top = Math.max(0, Math.min(cover - 1, anchorY * cover - 0.5));
  const y = (top - (cover - 1) / 2) * 100;
  return Math.abs(y) < 1e-9 ? 0 : y;
};
// tpl-cover:end
if (!Array.isArray(cfg.slots) || !Array.isArray(cfg.targets) || cfg.targets.length !== cfg.slots.length + 1) {
  throw Error('assemble: targets must hold one more boundary than slots (' + (cfg.targets || []).length + ' targets, ' + (cfg.slots || []).length + ' slots)');
}
let d, fps, endFrame;
const main = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
// Selects snaps the music's source start to a frame, which shifts the whole track by up to half a frame; every cut
// moves with it so it stays on the beat (planner.js tplMusicOffset, same expression).
const offset = f => (cfg.music ? cfg.music.sectionStart - Math.round(cfg.music.sectionStart * f) / f : 0);
// Lays the Main clips on a new Draft, aiming every boundary at `rate` (or the new Draft's own rate).
// A new Draft adopts its first clip's rate and frame size on the first insert. When the rate changes there, the clips
// were aimed at the wrong rate, so this returns the real rate unless `final`; the caller then lays them again on a
// fresh Draft. The discarded Draft is never committed, so it is not saved.
const lay = async (rate, final) => {
  d = await p.createDraft({ name: cfg.draftName });
  await d.setFrameSize({ width: W, height: H });
  fps = rate || (await d.meta()).fps;
  endFrame = 0;
  for (let i = 0; i < cfg.slots.length; i++) {
    const slot = cfg.slots[i];
    // Aim each clip's end at its boundary frame, round((target + offset) * fps), from the absolute target so rounding
    // never accumulates; the clip's length is that frame minus the Main end read back.
    const want = Math.round((cfg.targets[i + 1] + offset(fps)) * fps) - endFrame;
    // A photo holds from the start of its (5 s) image source; a video plays [S, S + slot) - both passes use S.
    const start = slot.kind === 'photo' ? 0 : slot.startSeconds;
    await d.insertResource({ resourceId: slot.rid, sourceRange: { startSeconds: start, endSeconds: start + want / fps } });
    endFrame = (await main()).reduce((a, c) => Math.max(a, c.endFrame), 0);
    if (i === 0) {
      // The first insert adopted the clip's frame size, so the 4:3 canvas is set again before the rate is read.
      const size0 = (await d.meta()).frameSize;
      if (size0.width !== W || size0.height !== H) await d.setFrameSize({ width: W, height: H });
      const real = (await d.meta()).fps;
      if (real !== fps) {
        if (!final) return real;
        fps = real;
      }
    }
  }
  return null;
};
const real = await lay(null, false);
if (real) await lay(real, true);
// Cover transforms from the planner's measured sizes (the Torn photo effect lays out in the same visible rectangle).
const count = (await main()).length;
/** @type {Record<string, { cover: number, anchorY?: number }>} */
const visByRid = cfg.vis || {};
const unsized = new Set();
for (let i = 0; i < count; i++) {
  // Re-read each time: an edit makes earlier rows stale.
  const clip = (await main())[i];
  const v = visByRid[clip.resourceId];
  if (!v || !(v.cover > 0)) { unsized.add(clip.resourceId); continue; }
  if (v.cover <= 1.001) continue;
  const anchorY = typeof v.anchorY === 'number' ? v.anchorY : 0.5;
  await d.setClipTransform({ clip, scale: { x: v.cover, y: v.cover }, position: { x: 0, y: tplCoverPositionY(v.cover, anchorY) } });
}
if (unsized.size) notes.push(unsized.size + (unsized.size === 1 ? ' picture has' : ' pictures have') + ' no measured size, so it may show bars');
// Clip sound: 'ambient' keeps the video clips' own sound under the music at cfg.ambientDb (default -18 dB), 'full'
// leaves it at 0 dB, and 'off' mutes it in decorate.js after this commit (muting needs the saved Draft's audio
// inventory). Photos have no sound and are skipped. A clip whose level cannot be set keeps full sound (noted).
let ambientClips = 0;
if (cfg.clipSound === 'ambient') {
  const db = typeof cfg.ambientDb === 'number' ? cfg.ambientDb : -18;
  let failed = 0;
  for (let i = 0; i < count; i++) {
    if (!cfg.slots[i] || cfg.slots[i].kind !== 'video') continue;
    const clip = (await main())[i];
    if (!clip) continue;
    try { await d.setClipAudio({ clip, volumeDb: db }); ambientClips++; } catch (e) { failed++; }
  }
  if (failed) notes.push('the sound of ' + failed + (failed === 1 ? ' clip' : ' clips') + ' could not be lowered under the music');
}
if (cfg.music) {
  const audioBefore = new Set((await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'audio').map(c => c.clipId));
  await d.overlayResource({ resource: p.resource(cfg.music.resourceId), over: await d.rangeAtFrames(0, endFrame), sourceStartSeconds: cfg.music.sectionStart });
  // Find the clip the overlay just created: new audio clips only, preferring the music resource.
  const added = (await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'audio' && !audioBefore.has(c.clipId));
  const music = added.find(c => c.resourceId === cfg.music.resourceId) || added[0];
  if (music) await d.setClipAudio({ clip: music, fadeInSeconds: 0, fadeOutSeconds: 0.12 });
  else notes.push('music fade not applied');
}
const rows = await main();
const frames = rows.length ? [rows[0].startFrame, ...rows.map(c => c.endFrame)] : [0];
const commit = await d.commitAll('Torn Paper Love: pictures');
return { sequenceId: commit.createdDraftId, fps, frames, totalFrames: frames[frames.length - 1], placed: rows.length, ambientClips, notes };
