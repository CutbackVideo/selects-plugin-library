// plugins/summer-trip/dev/expect.mjs
// Dev-only, pure (no app calls, no kit imports; tests/adapter.test.cjs runs it offline). For one Summer Trip build:
//   stVisibleEvents(schedule, frames)  the cuts an export shows, for the beat evaluation (contracts.md "Visible events")
//   stEvalCuts(...)                     that list as an eval-beat-sync.cjs --cuts file
//   stExpectations(input)               what the Draft must contain (readback expectations)
//   stCheck(readback, expected)         compares a readback (kit readback.mjs rows + dev/drive.mjs extra) with them
// Frame numbers are timeline frames at the Draft's real fps, from assemble.js's frame schedule (`a.frames`).

export const ST_W = 1920, ST_H = 1080;
export const ST_NAMES = { title: 'Summer Trip title', labels: 'Summer Trip labels', look: 'Summer look', gridPanel: 'Grid panel', filmFrame: 'Film frame', motion: 'Photo motion' };
const QUADS = ['TL', 'TR', 'BR', 'BL'];
const PANELS = ['A', 'B', 'C', 'D'];

// Grid states 1-4 bring panels A-D into TL, TR, BR, BL; states 5-8 reveal the place shot in the same quadrants
// (TL, top half, three quarters, full). The Main cut at 9.5 (opener -> place) is hidden under the four panels and is
// not listed; nor is the end of the video. Main cuts from beat 14 on: the montage cuts and the ending cuts.
// frames: { fps, delta, mainFrames, gridStateFrames, bpm?, snaps? } (assemble's frames + the plan's bpm and snaps).
export function stVisibleEvents(schedule, frames) {
  const fps = frames.fps;
  const bpm = frames.bpm || schedule.bpm;
  const delta = frames.delta || 0;
  const snaps = frames.snaps || {};
  const planned = b => (snaps[b] != null && Number.isFinite(snaps[b]) ? snaps[b] : b * 60 / bpm) + delta;
  const ev = [];
  schedule.gridStates.forEach((b, i) => {
    const q = i % 4;
    ev.push({ beat: b, frame: frames.gridStateFrames[i], kind: 'grid', quad: QUADS[q], change: i < 4 ? 'panel ' + PANELS[q] + ' in' : 'place in' });
  });
  const last = schedule.mainBeats.length - 1;
  schedule.mainBeats.forEach((b, i) => {
    if (i === 0 || i === last || b < 14) return;
    ev.push({ beat: b, frame: frames.mainFrames[i], kind: 'cut', section: b >= schedule.endingStart ? 'ending' : 'montage', mainIndex: i });
  });
  for (const e of ev) {
    e.seconds = e.frame / fps;
    if (bpm > 0) {
      e.gridSeconds = e.beat * 60 / bpm + delta;
      e.plannedSeconds = planned(e.beat);
      e.snapped = snaps[e.beat] != null;
      e.quantErrorSeconds = e.seconds - e.plannedSeconds;
    }
  }
  return ev.sort((a, b) => a.frame - b.frame || a.beat - b.beat);
}

// eval-beat-sync.cjs --cuts file: fps, cut frames, beats (+ Summer Trip extras the evaluator ignores).
export function stEvalCuts(schedule, frames, extra = {}) {
  const ev = stVisibleEvents(schedule, frames);
  return { fps: frames.fps, cuts: ev.map(e => e.frame), beats: ev.map(e => e.beat), kinds: ev.map(e => e.kind), quads: ev.map(e => e.quad || null),
    plannedSeconds: ev.map(e => e.plannedSeconds), gridSeconds: ev.map(e => e.gridSeconds), snapped: ev.filter(e => e.snapped).map(e => e.beat), ...extra };
}

const is169 = size => !(size && size.width > 0 && size.height > 0) || Math.abs(size.width / size.height - ST_W / ST_H) < 0.01;

// input: {
//   frames: assemble's frame schedule (a.frames), fps: a.fps,
//   placed, gridPlaced, sizes: from assemble's return,
//   motionIndexes: [Main index] montage photos with a Photo motion (plan.motions keys),
//   look, clipSound, ambientDb, gridSound,
//   music: null | { dryId, wetId|null, introDuckDb? }   (wetId null or muffle off -> one dry clip to the end; introDuckDb
//          non-zero -> the dry carries the keyed intro lift: introDuckDb from 0 to F(8) - 1, 0 dB from F(8))
//   sfx: null | { shutterIds: [rid], shutterSeconds: [s], whooshId, whooshSeconds }
// }
export function stExpectations(input) {
  const fr = input.frames, fps = input.fps || fr.fps;
  const nMain = fr.mainFrames.length - 1;
  const endingFirst = nMain - 3, lastMontage = nMain - 4;
  const photoIdx = new Set((input.placed || []).filter(p => p.kind === 'photo').map(p => p.index));
  const motion = new Set((input.motionIndexes || []).map(Number));
  const effectsMain = [];
  for (let i = 0; i < nMain; i++) {
    const fx = [];
    if (motion.has(i) && photoIdx.has(i) && i >= 2 && i <= lastMontage) fx.push(ST_NAMES.motion);
    if (input.look || i === lastMontage) fx.push(ST_NAMES.look); // look off keeps a strength-0 look on the last montage clip (leak)
    if (i >= endingFirst) fx.push(ST_NAMES.filmFrame);
    effectsMain.push(fx);
  }
  const sizes = input.sizes || {};
  const grid = (input.gridPlaced || []).map(g => ({ quad: g.quad, rid: g.rid, startFrame: g.a, endFrame: g.b, scale: g.scale, position: g.position,
    effects: [...(input.look ? [ST_NAMES.look] : []), ...(is169(sizes[g.rid]) ? [] : [ST_NAMES.gridPanel])] }));
  const planGrid = fr.grid.map(g => ({ quad: g.quad, startFrame: g.aFrame, endFrame: g.bFrame }));
  const Fe = fr.endingFrame, Fend = fr.endFrame;
  const endFade = (Fend - fr.fadeStartFrame) / fps;
  let music = { none: true };
  if (input.music) {
    const X = Math.max(2, Math.round(0.06 * fps));
    const duck = Number(input.music.introDuckDb) || 0, f8 = fr.gridStateFrames[0];
    // The dry's level line (assemble.js): keyed, so its constant level reads null.
    const keys = duck ? [{ atSeconds: 0, volumeDb: duck }, { atSeconds: (f8 - 1) / fps, volumeDb: duck }, { atSeconds: f8 / fps, volumeDb: 0 }] : null;
    if (input.music.wetId) {
      music = { dry: { resourceId: input.music.dryId, startFrame: 0, endFrame: Math.min(Fend, Fe + X), fadeOutSeconds: X / fps, keys },
        wet: { resourceId: input.music.wetId, startFrame: Fe, endFrame: Fend, fadeInSeconds: 0, fadeOutSeconds: endFade }, crossfadeFrames: X, db: 0 };
    } else music = { dry: { resourceId: input.music.dryId, startFrame: 0, endFrame: Fend, fadeOutSeconds: endFade, keys }, wet: null, db: 0 };
  }
  let sfx = { none: true };
  if (input.sfx) {
    const list = [];
    const sh = input.sfx.shutterIds || [];
    for (let i = 0; i < 4 && sh.length; i++) {
      const secs = Array.isArray(input.sfx.shutterSeconds) ? input.sfx.shutterSeconds[i % input.sfx.shutterSeconds.length] : input.sfx.shutterSeconds;
      const a = fr.gridStateFrames[i];
      list.push({ key: 'shutter' + (i + 1), resourceId: sh[i % sh.length], startFrame: a, endFrame: Math.min(Fend, a + Math.floor(secs * fps)) });
    }
    if (input.sfx.whooshId && input.sfx.whooshSeconds > 0) {
      const len = Math.floor(input.sfx.whooshSeconds * fps);
      for (const [key, end] of [['whooshDrop', fr.gridStateFrames[0]], ['whooshEnding', Fe]]) list.push({ key, resourceId: input.sfx.whooshId, startFrame: Math.max(0, end - len), endFrame: end });
    }
    sfx = { clips: list };
  }
  return {
    frameSize: { width: ST_W, height: ST_H }, fps,
    cuts: fr.mainFrames.slice(1), noAdjacent: true,
    photoRids: [...new Set((input.placed || []).filter(p => p.kind === 'photo').map(p => p.rid))],
    graphics: [
      { name: ST_NAMES.title, count: 1, startFrame: 0, endFrame: fr.titleFrames[1] },
      { name: ST_NAMES.labels, count: 1, startFrame: fr.labelsFrames[fr.labelsFrames.length - 1][0], endFrame: fr.labelsFrames[fr.labelsFrames.length - 1][1] },
    ],
    effectsMain, grid, planGrid,
    effectCounts: {
      [ST_NAMES.look]: input.look ? nMain + grid.length : 1,
      [ST_NAMES.filmFrame]: 3,
      [ST_NAMES.gridPanel]: grid.filter(g => g.effects.includes(ST_NAMES.gridPanel)).length,
      [ST_NAMES.motion]: effectsMain.filter(fx => fx.includes(ST_NAMES.motion)).length,
    },
    music, sfx,
    clipSound: input.clipSound === 'off' ? { mode: 'off' } : { mode: 'level', db: input.clipSound === 'ambient' ? (input.ambientDb ?? -18) : 0 },
    gridSound: { mode: input.gridSound || 'none', db: -60 },
  };
}

// The subset build-driver.mjs's checkReadback understands (it expects one music clip and a uniform effect count,
// so music, effects, grid and sound are left to stCheck).
export function stKitExpectations(exp) {
  return { frameSize: exp.frameSize, fps: exp.fps, cuts: exp.cuts, noAdjacent: exp.noAdjacent, graphics: exp.graphics };
}

const sameList = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// rb: { frameSize, fps, rows: [{ rid, s, e, asi, fx }] (Main), graphics: [{ name, clip: { startFrame, endFrame } }],
//       hasAudio: { rid: bool|null }, st: { video: [{ rid, s, e, asi, fx, t }], levels: [{ kind, rid, s, e, db, keys?, fadeIn?, fadeOut }] } }
// Returns { checks, notes, pass, facts }.
export function stCheck(rb, exp) {
  const C = {}, notes = [];
  const rows = [...rb.rows].sort((x, y) => x.s - y.s);
  const end = rows.length ? rows[rows.length - 1].e : 0;
  const tolS = 1 / (rb.fps || exp.fps || 30) + 1e-6;
  C.size = !!rb.frameSize && rb.frameSize.width === exp.frameSize.width && rb.frameSize.height === exp.frameSize.height;
  if (!C.size) notes.push('frame size ' + JSON.stringify(rb.frameSize));
  C.fps = Math.abs(rb.fps - exp.fps) < 1e-6;
  C.contiguous = rows.length > 0 && rows[0].s === 0 && rows.every((r, i) => i === 0 || r.s === rows[i - 1].e);
  C.count = rows.length === exp.cuts.length;
  const mism = exp.cuts.map((f, i) => [i, rows[i] ? rows[i].e - f : null]).filter(([, d]) => d !== 0);
  C.cuts = mism.length === 0;
  if (mism.length) notes.push('Main cut mismatch (slot, actual - expected frames): ' + JSON.stringify(mism));
  const adj = rows.map((r, i) => (i && r.rid === rows[i - 1].rid ? i : -1)).filter(i => i > 0);
  C.noAdjacent = adj.length === 0;
  if (adj.length) notes.push('adjacent same resource at Main slots ' + adj.join(','));

  for (const g of exp.graphics) {
    const hits = (rb.graphics || []).filter(x => x.name === g.name);
    const c = hits[0] && hits[0].clip;
    const ok = hits.length === g.count && c && c.startFrame === g.startFrame && c.endFrame === g.endFrame;
    C['graphic:' + g.name] = !!ok;
    if (!ok) notes.push(`graphic "${g.name}": ${hits.length} found` + (c ? ` at [${c.startFrame}, ${c.endFrame})` : '') + `, expected at [${g.startFrame}, ${g.endFrame})`);
  }

  const fxBad = exp.effectsMain.map((fx, i) => [i, rows[i] ? rows[i].fx : null, fx]).filter(([, got, want]) => !got || !sameList(got, want));
  C.effectsMain = fxBad.length === 0;
  if (fxBad.length) notes.push('Main effects (slot, found, expected): ' + JSON.stringify(fxBad));

  const st = rb.st || { video: [], levels: [] };
  const video = st.video.filter(v => v.rid);
  C.gridCount = video.length === exp.grid.length;
  const gridBad = [];
  for (const g of exp.grid) {
    const v = video.find(x => x.s === g.startFrame && x.rid === g.rid) || video.find(x => x.s === g.startFrame);
    if (!v) { gridBad.push([g.quad, 'missing']); continue; }
    if (v.e !== g.endFrame) gridBad.push([g.quad, 'span', [v.s, v.e], [g.startFrame, g.endFrame]]);
    if (!sameList(v.fx || [], g.effects)) gridBad.push([g.quad, 'effects', v.fx, g.effects]);
    const t = v.t;
    if (t && t.scale && g.scale != null && (Math.abs(t.scale.x - g.scale) > 1e-3 || Math.abs(t.scale.y - g.scale) > 1e-3)) gridBad.push([g.quad, 'scale', t.scale, g.scale]);
    if (t && t.position && g.position && (Math.abs(t.position.x - g.position.x) > 0.01 || Math.abs(t.position.y - g.position.y) > 0.01)) gridBad.push([g.quad, 'position', t.position, g.position]);
  }
  // The planned spans (frame schedule) must match what assemble reported.
  for (const p of exp.planGrid) if (!exp.grid.some(g => g.quad === p.quad && g.startFrame === p.startFrame && g.endFrame === p.endFrame)) gridBad.push([p.quad, 'planned span', [p.startFrame, p.endFrame]]);
  const gridRids = exp.grid.map(g => g.rid);
  const mainFixed = rows.slice(0, 2).map(r => r.rid);
  if (new Set(gridRids.concat(mainFixed)).size !== gridRids.length + mainFixed.length) gridBad.push(['all', 'opener, place and panels A-D are not six different resources']);
  C.grid = C.gridCount && gridBad.length === 0;
  if (gridBad.length || !C.gridCount) notes.push('grid: ' + video.length + ' video clips; ' + JSON.stringify(gridBad));

  const levels = st.levels || [];
  const audioRows = levels.filter(l => l.kind === 'audio');
  const musicIds = exp.music.none ? [] : [exp.music.dry.resourceId, exp.music.wet && exp.music.wet.resourceId].filter(Boolean);
  const sfxIds = exp.sfx.none ? [] : [...new Set(exp.sfx.clips.map(c => c.resourceId))];
  const musicRows = audioRows.filter(l => musicIds.includes(l.rid) && !sfxIds.includes(l.rid));
  if (exp.music.none) C.music = audioRows.filter(l => !sfxIds.includes(l.rid)).length === 0;
  else {
    const bad = [];
    const want = [exp.music.dry, exp.music.wet].filter(Boolean);
    if (musicRows.length !== want.length) bad.push('clips ' + musicRows.length + ' vs ' + want.length);
    for (const w of want) {
      const r = musicRows.find(l => l.rid === w.resourceId && l.s === w.startFrame);
      if (!r) { bad.push('missing ' + JSON.stringify([w.resourceId, w.startFrame, w.endFrame])); continue; }
      if (r.e !== w.endFrame) bad.push('span ' + JSON.stringify([r.s, r.e]) + ' vs ' + JSON.stringify([w.startFrame, w.endFrame]));
      if (w.keys) {
        // Keyed intro lift: no constant level; the keys (when the readback reports them) on the expected frames and levels.
        if (r.db != null) bad.push('constant level ' + r.db + ' instead of the intro lift');
        if (Array.isArray(r.keys) && (r.keys.length !== w.keys.length || r.keys.some((k, i) => Math.round(k.atSeconds * (rb.fps || exp.fps)) !== Math.round(w.keys[i].atSeconds * (rb.fps || exp.fps)) || Math.abs(k.volumeDb - w.keys[i].volumeDb) > 0.05))) bad.push('intro lift ' + JSON.stringify(r.keys));
      } else if (exp.music.db != null && r.db != null && r.db !== exp.music.db) bad.push('level ' + r.db);
      if (w.fadeOutSeconds != null && r.fadeOut != null && Math.abs(r.fadeOut - w.fadeOutSeconds) > tolS) bad.push('fade-out ' + r.fadeOut + ' vs ' + w.fadeOutSeconds);
      if (w.fadeInSeconds != null && r.fadeIn != null && Math.abs(r.fadeIn - w.fadeInSeconds) > tolS) bad.push('fade-in ' + r.fadeIn + ' vs ' + w.fadeInSeconds);
    }
    C.music = bad.length === 0;
    if (bad.length) notes.push('music: ' + bad.join('; '));
  }
  if (exp.sfx.none) {
    const extra = audioRows.filter(l => !musicIds.includes(l.rid));
    C.sfx = extra.length === 0;
    if (extra.length) notes.push('sound effects present although off: ' + extra.length);
  } else {
    const sfxRows = audioRows.filter(l => sfxIds.includes(l.rid));
    const miss = exp.sfx.clips.filter(c => !sfxRows.some(l => l.rid === c.resourceId && l.s === c.startFrame && l.e === c.endFrame));
    C.sfx = miss.length === 0 && sfxRows.length === exp.sfx.clips.length;
    if (!C.sfx) notes.push('sound effects: ' + sfxRows.length + ' found; missing ' + JSON.stringify(miss.map(c => [c.key, c.startFrame, c.endFrame])));
  }

  // Clip sound: Main video clips (photos have no sound). Off = routed to no source where the source has audio.
  const has = rb.hasAudio || {};
  const photoRids = new Set(exp.photoRids || []);
  const mainVideo = rows.filter(r => !photoRids.has(r.rid));
  if (exp.clipSound.mode === 'off') {
    C.clipSound = mainVideo.every(r => (has[r.rid] ? Array.isArray(r.asi) && r.asi.length === 0 : r.asi == null || (Array.isArray(r.asi) && r.asi.length === 0)));
    if (!mainVideo.some(r => has[r.rid])) notes.push('clip sound off: no Main clip has an audio stream, so the mute is vacuous');
  } else {
    const lv = levels.filter(l => l.kind === 'main' && !photoRids.has(l.rid));
    C.clipSound = lv.length === mainVideo.length && lv.every(l => l.db === exp.clipSound.db) && mainVideo.every(r => !(Array.isArray(r.asi) && r.asi.length === 0));
    if (!C.clipSound) notes.push('Main clip levels ' + JSON.stringify(lv.map(l => l.db)) + ', expected ' + exp.clipSound.db);
  }
  if (exp.gridSound.mode === 'volume') {
    const lv = levels.filter(l => l.kind === 'video');
    C.gridSound = lv.length === exp.grid.length && lv.every(l => l.db === exp.gridSound.db);
    if (!C.gridSound) notes.push('grid panel levels ' + JSON.stringify(lv.map(l => l.db)) + ', expected ' + exp.gridSound.db);
  } else if (exp.gridSound.mode === 'routing') {
    // Routed to no source, or (SDK refused a clip target) lowered to -60 dB.
    const lv = levels.filter(l => l.kind === 'video');
    C.gridSound = video.every(v => !has[v.rid] || (Array.isArray(v.asi) && v.asi.length === 0) || lv.some(l => l.rid === v.rid && l.s === v.s && l.db === exp.gridSound.db));
    if (!C.gridSound) notes.push('grid panels still carry sound: ' + JSON.stringify(video.map(v => [v.rid, v.asi])));
  }
  return { checks: C, notes, pass: Object.values(C).every(Boolean), facts: { mainClips: rows.length, endFrame: end, fps: rb.fps, frameSize: rb.frameSize, cuts: rows.map(r => r.e) } };
}
