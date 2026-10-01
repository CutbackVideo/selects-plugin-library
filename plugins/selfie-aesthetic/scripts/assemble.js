const cfg: any = __CONFIG__;
const p = selects.project(cfg.projectId);
const notes = [];
const W = 1080, H = 1920;
// Source windows end at least this far before the end of a video source (Selects caps a source at its whole frames and
// throws invalid_source_range near the end).
const TAIL = 0.15;
// Short fades on every video hold remove the clicks between the stutter repeats.
const EDGE_FADE = 0.02;
const holds = cfg.holds;
const durations = cfg.durations || {};
let d, fps, endFrame;
const main = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
// The source window of one hold of `n` frames at `rate`: a video plays from srcStart snapped to a whole frame (slid back
// so it ends >= TAIL before the source end when the duration is known); a photo holds from the start of its image source.
const windowOf = (hold, n, rate) => {
  if (hold.kind === 'photo') return { startSeconds: 0, endSeconds: n / rate };
  let f0 = Math.max(0, Math.round((hold.srcStart || 0) * rate));
  const dur = durations[hold.rid];
  if (typeof dur === 'number' && dur > 0) {
    const last = Math.floor((dur - TAIL) * rate);
    if (f0 + n > last) f0 = Math.max(0, last - n);
  }
  return { startSeconds: f0 / rate, endSeconds: (f0 + n) / rate };
};
// Selects snaps the music's source start to a timeline frame, which shifts the whole track by
// delta = s - round(s * fps) / fps (s = cfg.music.sourceStart = section start minus the lead); every cut moves with it
// so it stays on the beat. It depends on the rate, so it is computed at the Draft's real rate (again after a re-lay).
const delta = f => (cfg.music ? cfg.music.sourceStart - Math.round(cfg.music.sourceStart * f) / f : 0);
// Boundary i in timeline seconds. cfg.cutSecondsRaw (preferred) has no music offset: delta is added here, once.
// Without it, cfg.cutSeconds already carries the offset the planner computed at the planned rate.
const boundary = (i, f) => (Array.isArray(cfg.cutSecondsRaw) ? (i === 0 ? 0 : cfg.cutSecondsRaw[i] + delta(f)) : cfg.cutSeconds[i]);
// Lays the holds on a new Draft, aiming every boundary at `rate` (or the new Draft's own rate).
// A new Draft adopts its first clip's rate and frame size on the first insert. When the rate changes there, the holds
// were aimed at the wrong rate, so this returns the real rate unless `final`; the caller then lays them again on a
// fresh Draft. The discarded Draft is never committed, so it is not saved.
const lay = async (rate, final) => {
  d = await p.createDraft({ name: cfg.draftName });
  await d.setFrameSize({ width: W, height: H });
  fps = rate || (await d.meta()).fps;
  endFrame = 0;
  for (let i = 0; i < holds.length; i++) {
    // Each hold ends on its boundary frame at the Draft's real rate, counted from where the previous hold really ended
    // so nothing drifts.
    const n = Math.max(1, Math.round(boundary(i + 1, fps) * fps) - endFrame);
    await d.insertResource({ resourceId: holds[i].rid, sourceRange: windowOf(holds[i], n, fps) });
    const before = endFrame;
    endFrame = (await main()).reduce((a, c) => Math.max(a, c.endFrame), 0);
    if (i === 0) {
      // The first insert adopted the clip's frame size, so the 9:16 canvas is set again before the rate is read.
      const size0 = (await d.meta()).frameSize;
      if (size0.width !== W || size0.height !== H) await d.setFrameSize({ width: W, height: H });
      const real = (await d.meta()).fps;
      if (real !== fps) {
        if (!final) return real;
        fps = real;
      }
    }
    if (endFrame !== before + n) notes.push('hold ' + i + ' placed ' + (endFrame - before) + ' frames instead of ' + n);
  }
  return null;
};
const real = await lay(null, false);
if (real) await lay(real, true);
// Photo sizes the inventory could not measure: an unsaved scratch Draft adopts the photo's frame size.
const crops = Object.assign({}, cfg.crops);
for (const hold of holds) {
  const size = crops[hold.rid];
  if (hold.kind !== 'photo' || (size && size.width > 0 && size.height > 0)) continue;
  try {
    const scratch = await p.createDraft({ name: 'Selfie Aesthetic Edit size check' });
    await scratch.insertResource({ resourceId: hold.rid, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
    crops[hold.rid] = (await scratch.meta()).frameSize;
  } catch (e) { notes.push('a photo could not be measured, so it may show bars'); }
}
// Cover scale per hold (1 when the source already fills 9:16 or its size is unknown); decorate passes it to the effect.
const covers = [];
const count = (await main()).length;
for (let i = 0; i < count; i++) {
  const clip = (await main())[i];
  const size = clip && crops[clip.resourceId];
  let scale = 1;
  if (size && size.width > 0 && size.height > 0) {
    // Clips are conformed to fit the canvas; scaling by fill/fit makes them cover it with a centre crop.
    const fit = Math.min(W / size.width, H / size.height), fill = Math.max(W / size.width, H / size.height);
    if (fill / fit > 1.001) scale = fill / fit;
  }
  if (scale > 1) await d.setClipTransform({ clip, scale: { x: scale, y: scale }, position: { x: 0, y: 0 } });
  covers.push(scale);
}
// Clip sound on video holds (photos have no sound): 'ambient' lowers them to cfg.ambientDb (default -18 dB) under the
// music, 'full' keeps 0 dB; both get 20 ms edge fades. 'off' mutes them in decorate.js after this commit (muting needs
// the saved Draft's audio inventory; the -60 dB floor of setClipAudio is not a mute).
let ambientClips = 0;
if (cfg.clipSound === 'ambient' || cfg.clipSound === 'full') {
  const db = typeof cfg.ambientDb === 'number' ? cfg.ambientDb : -18;
  let failed = 0;
  for (let i = 0; i < count; i++) {
    if (!holds[i] || holds[i].kind === 'photo') continue;
    // Re-read each time: a sound edit makes earlier rows stale.
    const clip = (await main())[i];
    if (!clip) continue;
    try {
      if (cfg.clipSound === 'ambient') { await d.setClipAudio({ clip, volumeDb: db, fadeInSeconds: EDGE_FADE, fadeOutSeconds: EDGE_FADE }); ambientClips++; }
      else await d.setClipAudio({ clip, fadeInSeconds: EDGE_FADE, fadeOutSeconds: EDGE_FADE });
    } catch (e) { failed++; }
  }
  if (failed) notes.push('the sound of ' + failed + (failed === 1 ? ' clip' : ' clips') + ' could not be set');
}
if (cfg.music) {
  const audioBefore = new Set((await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'audio').map(c => c.clipId));
  // cfg.music.sourceStart = the section start minus the lead, so beat 1 lands `lead` seconds into the edit.
  await d.overlayResource({ resource: p.resource(cfg.music.resourceId), over: await d.rangeAtFrames(0, endFrame), sourceStartSeconds: cfg.music.sourceStart });
  // Find the clip the overlay just created: new audio clips only, preferring the music resource.
  const added = (await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'audio' && !audioBefore.has(c.clipId));
  const music = added.find(c => c.resourceId === cfg.music.resourceId) || added[0];
  if (music) await d.setClipAudio({ clip: music, fadeInSeconds: 0, fadeOutSeconds: 0.12 });
  else notes.push('music fade not applied');
}
const commit = await d.commitAll('Selfie Aesthetic Edit: assemble');
return { sequenceId: commit.createdDraftId, fps, totalFrames: endFrame, placed: count, ambientClips, covers, notes };
