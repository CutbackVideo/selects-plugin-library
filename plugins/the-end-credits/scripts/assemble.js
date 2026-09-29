const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const notes = [];
const W = 1920, H = 1080, A = W / H;
// Optional keys are read through `opt`: a config inlined as a JSON literal has no type for keys it lacks.
const opt: any = cfg;
const classic = cfg.layout !== 'full';
// cfg.boundaries are seconds from the video start: [0, L, L+P, ..., L+N*P+T]. Classic places shots 1..N in the slots
// after the lead-in [0, L), which stays a black gap; Full frame places shot 0 in [0, L) too, so it has one more pick.
const first = classic ? 1 : 0;
if (!Array.isArray(cfg.boundaries) || cfg.boundaries.length < 2 || cfg.picks.length !== cfg.boundaries.length - 1 - first)
  throw Error('THE END Credits: ' + cfg.picks.length + ' picks do not fit ' + (cfg.boundaries || []).length + ' boundaries (' + (classic ? 'Classic' : 'Full frame') + ')');
const photoRids = new Set(cfg.picks.filter(k => k.kind === 'photo').map(k => k.rid));
let d, fps, frames;
const shots = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
const endOf = rows => rows.reduce((a, c) => Math.max(a, c.endFrame), 0);
// Selects snaps the music's source start to a frame, which shifts the whole track by delta; every cut moves with it so
// it stays on the phrase grid. frame(0) is always 0 (the video start is not a musical anchor).
const frameGrid = f => {
  const delta = cfg.music ? cfg.music.sectionStart - Math.round(cfg.music.sectionStart * f) / f : 0;
  return cfg.boundaries.map(b => (b === 0 ? 0 : Math.round((b + delta) * f)));
};
// Lays the shots on a new Draft, aiming every clip end at its boundary frame at `rate` (or the new Draft's own rate).
// In Classic, Main starts at frame 0 before the lead-in gap goes in, so every target is shifted back by frames[1].
// A new Draft adopts its first clip's rate and frame size on the first insert. When the rate changes there, the clips
// were aimed at the wrong rate, so this returns the real rate unless `final`; the caller then lays them again on a
// fresh Draft. The discarded Draft is never committed, so it is not saved.
const lay = async (rate, final) => {
  d = await p.createDraft({ name: cfg.draftName });
  await d.setFrameSize({ width: W, height: H });
  fps = rate || (await d.meta()).fps;
  frames = frameGrid(fps);
  let endFrame = 0;
  for (let i = 0; i < cfg.picks.length; i++) {
    const pick = cfg.picks[i];
    const want = frames[i + first + 1] - (classic ? frames[1] : 0) - endFrame;
    if (!(want > 0)) throw Error('THE END Credits: slot ' + (i + first) + ' is shorter than one frame');
    // A photo holds for its slot from the start of its image source; a video plays from the planned moment.
    const start = pick.kind === 'photo' ? 0 : pick.startSeconds;
    await d.insertResource({ resourceId: pick.rid, sourceRange: { startSeconds: start, endSeconds: start + want / fps } });
    endFrame = endOf(await shots());
    if (i === 0) {
      // The first insert adopted the clip's frame size, so the 16:9 canvas is set again before the rate is read.
      const size0 = (await d.meta()).frameSize;
      if (size0.width !== W || size0.height !== H) await d.setFrameSize({ width: W, height: H });
      const real = (await d.meta()).fps;
      if (real !== fps) {
        if (!final) return real;
        fps = real;
        frames = frameGrid(fps);
      }
    }
  }
  return null;
};
const real = await lay(null, false);
if (real) await lay(real, true);
const endFrame = frames[frames.length - 1];
// Classic lead-in: blank Main time before the first shot, exactly frames[1] frames, so the shots start on frames[1].
if (classic) await d.insertGap({ at: { before: await d.rangeAtFrames(0, 1) }, seconds: frames[1] / fps });
// Cover: a non-16:9 source is conformed to fit the canvas; scaling its box by max(A/a, a/A) makes it cover the canvas
// so the Shot frame effect can crop the window in canvas percent.
let covered = 0;
const count = (await shots()).length;
for (let i = 0; i < count; i++) {
  const clip = (await shots())[i];
  const src = (opt.sources || {})[clip.resourceId];
  const a = src && src.aspect > 0 ? src.aspect : null;
  if (!a) { notes.push('the size of ' + clip.resourceId + ' is unknown, so it may show bars'); continue; }
  if (Math.abs(a - A) <= 0.01) continue;
  const scale = Math.max(A / a, a / A);
  await d.setClipTransform({ clip, scale: { x: scale, y: scale }, position: { x: 0, y: 0 } });
  covered++;
}
// Clip sound: 'ambient' lowers the shots' own sound to cfg.ambientDb (default -18 dB) under the music, 'full' keeps
// 0 dB, and 'off' mutes in decorate.js after this commit (muting needs the saved Draft's audio inventory). The last
// shot's sound fades out with the music. Photos have no sound and are skipped.
const musicFadeOut = typeof opt.musicFadeOut === 'number' ? opt.musicFadeOut : 1.5;
let soundClips = 0;
if (cfg.clipSound === 'ambient' || cfg.clipSound === 'full') {
  const db = cfg.clipSound === 'full' ? 0 : (typeof opt.ambientDb === 'number' ? opt.ambientDb : -18);
  let failed = 0;
  for (let i = 0; i < count; i++) {
    // Re-read each time: a sound edit makes earlier rows stale.
    const rows = await shots();
    const clip = rows[i];
    if (!clip || photoRids.has(clip.resourceId)) continue;
    const last = clip.endFrame === endOf(rows);
    try {
      if (last) await d.setClipAudio({ clip, volumeDb: db, fadeOutSeconds: musicFadeOut });
      else await d.setClipAudio({ clip, volumeDb: db });
      soundClips++;
    } catch (e) { failed++; }
  }
  if (failed) notes.push('the sound of ' + failed + (failed === 1 ? ' clip' : ' clips') + ' could not be set');
}
if (cfg.music) {
  const audioBefore = new Set((await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'audio').map(c => c.clipId));
  await d.overlayResource({ resource: p.resource(cfg.music.resourceId), over: await d.rangeAtFrames(0, endFrame), sourceStartSeconds: cfg.music.sectionStart });
  // Find the clip the overlay just created: new audio clips only, preferring the music resource.
  const added = (await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'audio' && !audioBefore.has(c.clipId));
  const music = added.find(c => c.resourceId === cfg.music.resourceId) || added[0];
  if (music) await d.setClipAudio({ clip: music, fadeInSeconds: 0, fadeOutSeconds: musicFadeOut });
  else notes.push('music fade not applied');
}
const placed = await shots();
const clips = placed.map(c => ({ rid: c.resourceId, startFrame: c.startFrame, endFrame: c.endFrame }));
// The returned frames are the laid Main clips' own (Classic: [0, first shot start, each shot end]; Full frame:
// [0, each shot end]), so the credits reveal and end follow the Draft even when an insert rounded a frame off the
// plan. plannedFrames is the phrase grid the shots were aimed at.
const plannedFrames = frames;
const actual = clips.length ? (classic ? [0, clips[0].startFrame] : [0]).concat(clips.map(c => c.endFrame)) : plannedFrames;
if (actual.length !== plannedFrames.length || actual.some((f, i) => f !== plannedFrames[i])) notes.push('the cuts are off the planned frames');
const commit = await d.commitAll('THE END Credits: assemble');
if (!commit.createdDraftId) notes.push('the new Draft id was not reported');
return { sequenceId: commit.createdDraftId || null, fps, frames: actual, plannedFrames, clips, covered, soundClips, notes };
