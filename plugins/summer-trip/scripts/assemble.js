const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const W = cfg.W || 1920, H = cfg.H || 1080;
const notes = [];
// Grid quadrant centres for setClipTransform. Position is in % of the canvas HEIGHT from its centre, +y up
// (a 960x540 quadrant centre is 480 px = 44.444 % of 1080 from the centre horizontally, 270 px = 25 % vertically).
// Live probe P1 verifies the sign convention; change only this table if it differs.
const ST_QUADS = { TL: { x: -44.444, y: 25 }, TR: { x: 44.444, y: 25 }, BR: { x: 44.444, y: -25 }, BL: { x: -44.444, y: -25 } };
const ST_TAIL_SECONDS = 0.15;
const SIZE_CHECK = 'Summer Trip size check';

// Copy of the planner's stFrameSchedule (contracts.md "Frame schedule"): every event frame comes from one F().
// F(0) = 0; F(b) = round((b * 60 / bpm + delta) * fps); an anchor beat listed in `snaps` uses its snapped seconds,
// which moves every event defined at that beat with it.
const stFrameSchedule = ({ schedule, bpm, delta, fps, snaps }) => {
  const anchors = new Set(schedule.anchors || []);
  const sn = snaps || {};
  const planned = b => (anchors.has(b) && Number.isFinite(sn[String(b)]) ? sn[String(b)] : b * 60 / bpm);
  const F = b => (b === 0 ? 0 : Math.round((planned(b) + delta) * fps));
  const E = schedule.endingStart;
  const beats = new Set([...schedule.mainBeats, ...schedule.gridStates, ...schedule.title, ...schedule.place,
    ...schedule.labels.flat(), schedule.fadeStart, schedule.leak.a, schedule.leak.b, ...schedule.pulses]);
  return {
    fps, delta,
    mainFrames: schedule.mainBeats.map(F),
    grid: schedule.grid.map(g => ({ quad: g.quad, a: g.a, b: g.b, aFrame: F(g.a), bFrame: F(g.b) })),
    gridStateFrames: schedule.gridStates.map(F),
    titleFrames: schedule.title.map(F),
    labelsFrames: schedule.labels.map(([a, b]) => [F(a), F(b)]),
    placeFrames: schedule.place.map(F),
    endingFrame: F(E), endFrame: F(schedule.end), fadeStartFrame: F(schedule.fadeStart),
    leakFrames: { a: F(schedule.leak.a), b: F(schedule.leak.b) },
    pulseFrames: schedule.pulses.map(F),
    report: [...beats].sort((x, y) => x - y).map(b => {
      const frame = F(b);
      return { beat: b, gridSeconds: b * 60 / bpm, plannedSeconds: b === 0 ? 0 : planned(b), frame,
        quantErrorSeconds: b === 0 ? 0 : Math.abs(frame / fps - (planned(b) + delta)) };
    }),
  };
};
// Selects snaps the music's source start to a timeline frame, which shifts the whole track by up to half a frame;
// every event moves with it (delta, applied once). It depends on the rate, so it is recomputed at the real fps.
const deltaAt = f => (cfg.music ? cfg.music.sectionStart - Math.round(cfg.music.sectionStart * f) / f : (cfg.beats.delta || 0));
const framesAt = f => stFrameSchedule({ schedule: cfg.schedule, bpm: cfg.beats.bpm, delta: deltaAt(f), fps: f, snaps: cfg.beats.snaps });

const mainPicks = cfg.picks.main, gridPicks = cfg.picks.grid || [];
if (mainPicks.length !== cfg.schedule.mainBeats.length - 1) throw Error('Expected ' + (cfg.schedule.mainBeats.length - 1) + ' Main picks, got ' + mainPicks.length);

let d, fps, frames, placed;
const all = () => d.clips({ trackScope: 'all' });
const rowById = async id => (await all()).find(c => c.clipId === id);
const mainRows = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
// Source windows start on a whole Draft frame; a window that would end inside the last 0.15 s of a source of known
// length slides back (a window ending near the source end throws invalid_source_range).
const windowStart = (pick, want, f) => {
  if (pick.kind === 'photo') return 0;
  let k = Math.round(Math.max(0, Number(pick.startSeconds) || 0) * f);
  if (pick.duration > 0) {
    const last = Math.floor(pick.duration * f) - Math.ceil(ST_TAIL_SECONDS * f) - want;
    if (k > last) k = Math.max(0, last);
  }
  return k / f;
};
// Lays the Main clips on a new Draft with every boundary at F(b) for `rate` (or the new Draft's own rate).
// A new Draft adopts its first clip's rate and frame size on the first insert. When the rate changes there, the clips
// were aimed at the wrong rate, so this returns the real rate unless `final`; the caller then lays them again on a
// fresh Draft. The discarded Draft is never committed, so it is not saved.
const lay = async (rate, final) => {
  d = await p.createDraft({ name: cfg.draftName });
  await d.setFrameSize({ width: W, height: H });
  fps = rate || (await d.meta()).fps;
  frames = framesAt(fps);
  placed = [];
  let endFrame = 0;
  for (let i = 0; i < mainPicks.length; i++) {
    const pick = mainPicks[i];
    const want = frames.mainFrames[i + 1] - endFrame;
    if (want < 1) throw Error('Main slot ' + i + ' has no frames at ' + fps + ' fps');
    const start = windowStart(pick, want, fps);
    const before = new Set((await mainRows()).map(c => c.clipId));
    await d.insertResource({ resourceId: pick.rid, sourceRange: { startSeconds: start, endSeconds: start + want / fps } });
    const rows = await mainRows();
    const row = rows.find(c => !before.has(c.clipId) && c.resourceId === pick.rid) || rows.find(c => !before.has(c.clipId));
    if (!row) throw Error('Main clip ' + i + ' was not placed');
    endFrame = rows.reduce((a, c) => Math.max(a, c.endFrame), 0);
    placed.push({ index: i, clipId: row.clipId, rid: pick.rid, kind: pick.kind, role: pick.role || null, a: row.startFrame, b: row.endFrame, sourceStart: start });
    if (i === 0) {
      // The first insert adopted the clip's frame size, so the 16:9 canvas is set again before the rate is read.
      const size0 = (await d.meta()).frameSize;
      if (size0.width !== W || size0.height !== H) await d.setFrameSize({ width: W, height: H });
      const real = (await d.meta()).fps;
      if (real !== fps) {
        if (!final) return real;
        fps = real; frames = framesAt(fps);
      }
    }
  }
  if (endFrame !== frames.endFrame) notes.push('Main ends at frame ' + endFrame + ', planned ' + frames.endFrame);
  return null;
};
const real = await lay(cfg.fps || null, false);
if (real) await lay(real, true);

// Frame sizes the inventory could not measure: an unsaved scratch Draft adopts the clip's frame size.
const sizes = Object.assign({}, cfg.sizes);
const okSize = s => !!(s && s.width > 0 && s.height > 0);
for (const pick of [...mainPicks, ...gridPicks]) {
  if (okSize(sizes[pick.rid])) continue;
  try {
    const scratch = await p.createDraft({ name: SIZE_CHECK });
    const s = pick.kind === 'photo' ? 0 : Math.round((Number(pick.startSeconds) || 0) * fps) / fps;
    await scratch.insertResource({ resourceId: pick.rid, sourceRange: { startSeconds: s, endSeconds: s + 0.5 } });
    sizes[pick.rid] = (await scratch.meta()).frameSize;
  } catch (e) { sizes[pick.rid] = null; }
  if (!okSize(sizes[pick.rid])) notes.push('the size of ' + pick.rid + ' is unknown, so it may show bars');
}
// Clips are conformed to fit the canvas; scaling by fill/fit makes them cover it with a centre crop.
const coverOf = size => {
  if (!okSize(size)) return 1;
  const fit = Math.min(W / size.width, H / size.height), fill = Math.max(W / size.width, H / size.height);
  return fill / fit;
};
for (const m of placed) {
  const scale = coverOf(sizes[m.rid]);
  if (scale <= 1.001) continue;
  const clip = await rowById(m.clipId);
  if (!clip) continue;
  await d.setClipTransform({ clip, scale: { x: scale, y: scale }, position: { x: 0, y: 0 } });
}

// Grid panels A-D: video-track overlays over [F(a), F(b)), scaled to half size (x the cover factor for a
// non-16:9 source; decorate.js masks those to the quadrant) and moved to their quadrant centre.
const gridPlaced = [];
for (let j = 0; j < gridPicks.length; j++) {
  const pick = gridPicks[j];
  const g = frames.grid.find(x => x.quad === pick.quad) || frames.grid[j];
  const ss = pick.kind === 'photo' ? 0 : Math.round(Math.max(0, Number(pick.startSeconds) || 0) * fps) / fps;
  const before = new Set((await all()).map(c => c.clipId));
  await d.overlayResource({ resource: p.resource(pick.rid), over: await d.rangeAtFrames(g.aFrame, g.bFrame), sourceStartSeconds: ss });
  const added = (await all()).filter(c => !before.has(c.clipId));
  const row = added.find(c => c.trackKind === 'video' && c.resourceId === pick.rid) || added.find(c => c.trackKind === 'video');
  if (!row) throw Error('Grid panel ' + g.quad + ' was not placed');
  if (added.some(c => c.trackKind === 'audio')) notes.push('grid panel ' + g.quad + ' brought an audio clip');
  const scale = 0.5 * coverOf(sizes[pick.rid]);
  const position = ST_QUADS[g.quad];
  await d.setClipTransform({ clip: row, scale: { x: scale, y: scale }, position: { x: position.x, y: position.y } });
  gridPlaced.push({ quad: g.quad, clipId: row.clipId, rid: pick.rid, kind: pick.kind, a: row.startFrame, b: row.endFrame, sourceStart: ss, scale, position: { x: position.x, y: position.y } });
}
// Grid panels are visual-only (spec 15.2). 'volume' lowers them to the -60 dB floor here; 'routing' mutes them in
// decorate.js on the saved Draft (setAudioTracks needs the saved audio inventory); 'none' leaves them alone.
const gridSound = cfg.gridSound || 'none';
let gridApplied = 0;
if (gridSound === 'volume') {
  for (const gp of gridPlaced) {
    const clip = await rowById(gp.clipId);
    if (!clip || clip.trackKind !== 'video') continue;
    try { await d.setClipAudio({ clip, volumeDb: -60 }); gridApplied++; } catch (e) { notes.push('grid panel ' + gp.quad + ' sound could not be lowered'); }
  }
}

// Clip sound: 'ambient' keeps the Main videos' own sound under the music at cfg.ambientDb (default -18 dB); 'full'
// leaves it; 'off' mutes it in decorate.js. Photos, grid panels, music and SFX are never touched here.
let ambientClips = 0;
if (cfg.clipSound === 'ambient') {
  const db = typeof cfg.ambientDb === 'number' ? cfg.ambientDb : -18;
  let failed = 0;
  for (const m of placed) {
    if (m.kind === 'photo') continue;
    const clip = await rowById(m.clipId);
    if (!clip || clip.trackKind !== 'main') continue;
    try { await d.setClipAudio({ clip, volumeDb: db }); ambientClips++; } catch (e) { failed++; }
  }
  if (failed) notes.push('the sound of ' + failed + (failed === 1 ? ' clip' : ' clips') + ' could not be lowered under the music');
}

// Places one audio overlay and returns the clip it created (found by clipId diff, never by index).
const placeAudio = async (rid, a, b, ss) => {
  const before = new Set((await all()).map(c => c.clipId));
  const res = await d.overlayResource({ resource: p.resource(rid), over: await d.rangeAtFrames(a, b), sourceStartSeconds: ss });
  const added = (await all()).filter(c => !before.has(c.clipId) && c.trackKind === 'audio');
  const row = added.find(c => c.resourceId === rid) || added[0];
  if (!row) throw Error('the audio clip for ' + rid + ' was not found');
  return { row, res };
};
const errText = e => String(e && e.message || e);

// Music (spec 15.6, live-corrected). With a muffled copy: wet over [Fe, F(end)) at full level from the ending cut, at
// the same sample phase as the dry; dry over [0, Fe + X) fading out over its last X frames under the wet. Selects' fade
// curves do not sum to a constant, so a symmetric crossfade left a ~60 ms hole (-49 dB) in a Staging export. Without one: one dry overlay over [0, F(end)). Both end with the fade
// over [F(end - 0.5), F(end)). If the wet overlay cannot be placed, every clip placed here is removed and the dry
// music is placed again over the whole length, so a failure never leaves a truncated dry track.
let music = null;
if (cfg.music) {
  const X = cfg.crossfadeFrames != null ? cfg.crossfadeFrames : Math.max(2, Math.round(0.06 * fps));
  const Fe = frames.endingFrame, Fend = frames.endFrame;
  const endFade = (Fend - frames.fadeStartFrame) / fps;
  const ss = cfg.music.sectionStart;
  const beforeMusic = new Set((await all()).map(c => c.clipId));
  // The source start Selects applied: read back when the row or the overlay result reports it, else the frame-snapped
  // start (kit pitfall "music sourceStartSeconds is quantised to a timeline frame").
  const readS0 = placedAudio => {
    const r = Object(placedAudio.row), o = Object(placedAudio.res);
    if (Number.isFinite(r.sourceStartSeconds)) return { s0: r.sourceStartSeconds, from: 'clip' };
    if (Number.isFinite(o.sourceStartSeconds)) return { s0: o.sourceStartSeconds, from: 'overlay' };
    return { s0: Math.round(ss * fps) / fps, from: 'snapped' };
  };
  let dry, wet = null, s0 = null, muffle = 'off';
  if (cfg.music.wetResourceId) {
    dry = await placeAudio(cfg.music.resourceId, 0, Math.min(Fend, Fe + X), ss);
    s0 = readS0(dry);
    const wa = Fe;
    try {
      wet = await placeAudio(cfg.music.wetResourceId, wa, Fend, s0.s0 + wa / fps);
      muffle = 'on';
    } catch (e) {
      notes.push('ending muffle skipped: ' + errText(e));
      const leftovers = (await all()).filter(c => c.trackKind === 'audio' && !beforeMusic.has(c.clipId));
      if (leftovers.length) await d.removeClips(leftovers);
      wet = null; muffle = 'skipped';
      dry = await placeAudio(cfg.music.resourceId, 0, Fend, ss);
      s0 = readS0(dry);
    }
  } else {
    dry = await placeAudio(cfg.music.resourceId, 0, Fend, ss);
    s0 = readS0(dry);
  }
  const fade = async (id, fadeInSeconds, fadeOutSeconds) => {
    const clip = await rowById(id);
    try { if (!clip) throw Error('missing'); await d.setClipAudio({ clip, fadeInSeconds, fadeOutSeconds }); }
    catch (e) { notes.push('music fade not applied: ' + errText(e)); }
  };
  if (wet) {
    await fade(dry.row.clipId, 0, X / fps);
    await fade(wet.row.clipId, 0, endFade);
  } else await fade(dry.row.clipId, 0, endFade);
  const out = x => ({ clipId: x.row.clipId, a: x.row.startFrame, b: x.row.endFrame });
  music = {
    dry: { ...out(dry), sourceStart: s0.s0, sourceStartFrom: s0.from },
    wet: wet ? { ...out(wet), sourceStart: s0.s0 + Fe / fps } : null,
    crossfadeFrames: wet ? X : null, endFadeSeconds: endFade, muffle,
  };
}

// Sound effects (audio overlays, independent of the music): shutter i starts on grid state i (i = 0..3); a whoosh
// ends on the drop F(8) and another on the ending start Fe. Lengths are whole frames inside the file, so an
// overlay never runs past its source.
const sfxPlaced = [];
if (cfg.sfx) {
  const sfx = cfg.sfx;
  const Fend = frames.endFrame;
  const place = async (key, rid, a, b, ss) => {
    if (!rid || !(b > a)) return;
    try { const x = await placeAudio(rid, a, b, ss); sfxPlaced.push({ key, clipId: x.row.clipId, rid, a: x.row.startFrame, b: x.row.endFrame }); }
    catch (e) { notes.push('sound effect ' + key + ' skipped: ' + errText(e)); }
  };
  const shutters = sfx.shutter || [];
  for (let i = 0; i < 4 && shutters.length; i++) {
    const secs = Array.isArray(sfx.shutterSeconds) ? sfx.shutterSeconds[i % sfx.shutterSeconds.length] : sfx.shutterSeconds;
    if (!(secs > 0)) { notes.push('shutter length unknown; shutters skipped'); break; }
    const a = frames.gridStateFrames[i];
    await place('shutter' + (i + 1), shutters[i % shutters.length], a, Math.min(Fend, a + Math.floor(secs * fps)), 0);
  }
  if (sfx.whoosh && sfx.whooshSeconds > 0) {
    const len = Math.floor(sfx.whooshSeconds * fps);
    const anchors = [['whooshDrop', frames.gridStateFrames[0]], ['whooshEnding', frames.endingFrame]];
    for (const [key, end] of anchors) {
      // The file's end lands on the anchor frame; near the Draft start the head is trimmed instead.
      const a = Math.max(0, end - len);
      await place(key, sfx.whoosh, a, end, (a - (end - len)) / fps);
    }
  }
}

const commit = await d.commitAll('Summer Trip: assemble');
return {
  sequenceId: commit.createdDraftId, fps, frames, placed, gridPlaced, sizes, music, ambientClips,
  gridSoundApplied: { mode: gridSound, clips: gridApplied, deferred: gridSound === 'routing' }, sfxPlaced, notes,
};
