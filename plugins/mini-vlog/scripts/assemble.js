const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const notes = [];
const W = 1920, H = 1080;
let d, fps, endFrame;
const main = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
// Selects snaps the music's source start to a frame, which shifts the whole track by up to half a frame; every cut
// moves with it so it stays on the beat (planner.js mvMusicOffset, same expression).
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
  for (let i = 0; i < cfg.picks.length; i++) {
    const pick = cfg.picks[i];
    // Aim each clip's end at its planned boundary frame at the Draft's real rate so rounding never drifts.
    // cfg.boundaries are seconds from the start of the music section: the beat grid (beat * 60 / bpm), with the cuts the
    // planner snapped to music onsets (planner.js mvSnapCuts) moved onto them.
    const want = Math.round((cfg.boundaries[i + 1] + offset(fps)) * fps) - endFrame;
    // Selects snaps each end of a source range to a Draft frame on its own (round(end * fps) - round(start * fps)
    // frames), so a start on a half frame would lose or gain a frame. The window is aimed at whole Draft frames: it
    // starts on the frame nearest the planned start and lasts exactly `want` frames. A photo holds for the slot from
    // the start of its (5 s) image source.
    // At the real rate a slot can be a frame or two longer than planned, and Selects caps a source at its whole frames
    // (an end past floor(duration * fps) / fps is invalid_source_range), so a window planned near the end of its source
    // slides back to end inside it (pick.sourceDuration, from the planner).
    const cap = pick.sourceDuration > 0 ? Math.floor(pick.sourceDuration * fps + 1e-6) - want : Infinity;
    const k = pick.kind === 'photo' ? 0 : Math.max(0, Math.min(Math.round(pick.startSeconds * fps), cap));
    await d.insertResource({ resourceId: pick.rid, sourceRange: { startSeconds: k / fps, endSeconds: (k + want) / fps } });
    endFrame = (await main()).reduce((a, c) => Math.max(a, c.endFrame), 0);
    if (i === 0) {
      // The first insert adopted the clip's frame size, so the 16:9 canvas is set again before the rate is read.
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
// Photo sizes the inventory could not measure: an unsaved scratch Draft adopts the photo's frame size.
const crops = Object.assign({}, cfg.crops);
for (const pick of cfg.picks) {
  const size = crops[pick.rid];
  if (pick.kind !== 'photo' || (size && size.width > 0 && size.height > 0)) continue;
  try {
    const scratch = await p.createDraft({ name: 'Mini Vlog size check' });
    await scratch.insertResource({ resourceId: pick.rid, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
    crops[pick.rid] = (await scratch.meta()).frameSize;
  } catch (e) { notes.push('a photo could not be measured, so it may show bars'); }
}
const rows = await main();
for (let i = 0; i < rows.length; i++) {
  const size = crops[rows[i].resourceId];
  if (!size || !size.width || !size.height) continue;
  // Clips are conformed to fit the canvas; scaling by fill/fit makes them cover it with a centre crop.
  const fit = Math.min(W / size.width, H / size.height), fill = Math.max(W / size.width, H / size.height);
  const scale = fill / fit;
  if (scale <= 1.001) continue;
  const clip = (await main())[i];
  await d.setClipTransform({ clip, scale: { x: scale, y: scale }, position: { x: 0, y: 0 } });
}
// Clip sound: 'ambient' keeps the clips' own sound under the music at cfg.ambientDb (default -18 dB), 'full' leaves
// it at 0 dB, and 'off' mutes it in decorate.js after this commit (muting needs the saved Draft's audio inventory).
// Photos have no sound and are skipped. A clip whose level cannot be set keeps full sound and is reported in notes.
let ambientClips = 0;
if (cfg.clipSound === 'ambient') {
  const db = typeof cfg.ambientDb === 'number' ? cfg.ambientDb : -18;
  const photoRids = new Set(cfg.picks.filter(k => k.kind === 'photo').map(k => k.rid));
  let failed = 0;
  const count = (await main()).length;
  for (let i = 0; i < count; i++) {
    // Re-read each time: a sound edit makes earlier rows stale.
    const clip = (await main())[i];
    if (!clip || photoRids.has(clip.resourceId)) continue;
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
const commit = await d.commitAll('Mini Vlog: assemble');
return { sequenceId: commit.createdDraftId, fps, totalFrames: endFrame, placed: rows.length, ambientClips, notes };
