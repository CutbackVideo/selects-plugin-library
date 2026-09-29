// plugins/summer-trip/tests/scripts-edit.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(dir, name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// Models Selects (extends city-weekend-vlog's mock):
// - a Draft created in this run_script call has no saved audio inventory, so setAudioTracks throws until reopen();
// - commitAll runs once per call; a new Draft adopts its first clip's frame size (`adopt`) and rate (`adoptFps`);
// - insertResource places round(end*fps) - round(start*fps) frames; photos hold at most 5 s; a window past a
//   source's `durations` entry throws invalid_source_range;
// - overlayResource puts resources in `audioRids` on audio tracks and everything else on video tracks; the applied
//   source start is frame-snapped (kept in `src`, exposed on the row only with `exposeSource`);
// - setAudioTracks with a Span mutes playable Main clips it covers (not photos or `silent` sources); with a clip row
//   it routes that overlay only when `routeOverlays`, and `routeLeaks` makes it mute Main too (a bad SDK);
// - setClipAudio / setAudioTracks return EditDiffs whose opCount is 0 when nothing changed.
function mockDraft(fps, o = {}) {
  const { adopt = { width: 1920, height: 1080 }, photos = [], silent = [], adoptFps = null, audioRids = [], durations = {},
    failOverlay = [], exposeSource = false, routeOverlays = false, routeLeaks = false, noRemove = false } = o;
  let unsaved = !!o.unsaved;
  const log = [], clips = [], graphics = [], effects = {}, transforms = {}, audio = {}, src = {};
  let committed = false, frameSize = { width: 1920, height: 1080 }, inserted = false, nextId = 1;
  const mainEnd = () => clips.filter(c => c.trackKind === 'main').reduce((a, c) => Math.max(a, c.endFrame), 0);
  const row = c => ({ ...c, ...(exposeSource && src[c.clipId] != null ? { sourceStartSeconds: src[c.clipId] } : {}) });
  const diff = n => ({ beforeDurationFrames: 0, afterDurationFrames: 0, deltaFrames: 0, opCount: n, removedDurationFrames: 0, warnings: [] });
  const muteMain = (a, b, idx) => {
    let n = 0;
    for (const c of clips) {
      if (c.trackKind !== 'main' || photos.includes(c.resourceId) || silent.includes(c.resourceId)) continue;
      if (c.endFrame <= a || c.startFrame >= b) continue;
      if (JSON.stringify(c.audioSourceIndexes) !== JSON.stringify(idx)) { c.audioSourceIndexes = [...idx]; n++; }
    }
    return n;
  };
  const m = { log, clips, graphics, effects, transforms, audio, src,
    reopen() { unsaved = false; committed = false; },
    mainSpans: () => clips.filter(c => c.trackKind === 'main').map(c => [c.resourceId, c.startFrame, c.endFrame]),
    kind: k => clips.filter(c => c.trackKind === k),
    d: {
      meta: async () => ({ fps, frameSize: { ...frameSize } }),
      setFrameSize: async (s) => { frameSize = { ...s }; log.push(['size', s]); },
      insertResource: async ({ resourceId, sourceRange }) => {
        if (!inserted) { inserted = true; frameSize = { ...adopt }; if (adoptFps) fps = adoptFps; }
        if (photos.includes(resourceId) && sourceRange.endSeconds > 5 + 1e-9) throw Error('invalid_source_range');
        if (durations[resourceId] != null && sourceRange.endSeconds > durations[resourceId] + 1e-9) throw Error('invalid_source_range');
        const len = Math.round(sourceRange.endSeconds * fps) - Math.round(sourceRange.startSeconds * fps);
        const f = mainEnd();
        const c = { clipId: nextId++, trackId: 'main', resourceId, trackKind: 'main', startFrame: f, endFrame: f + len, audioSourceIndexes: null };
        clips.push(c); src[c.clipId] = sourceRange.startSeconds; log.push(['insert', resourceId, sourceRange]);
      },
      clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(row),
      clipTransform: async (clip) => transforms[clip.clipId] ? JSON.parse(JSON.stringify(transforms[clip.clipId])) : { enabled: true, scale: { x: 1, y: 1 }, position: { x: 0, y: 0 }, rotation: 0, anchor: { x: 0, y: 0 } },
      setClipTransform: async (x) => {
        const c = clips.find(k => k.clipId === x.clip.clipId); if (!c) throw Error('stale clip');
        transforms[c.clipId] = { enabled: true, scale: { ...x.scale }, position: { ...(x.position || { x: 0, y: 0 }) }, rotation: 0, anchor: { x: 0, y: 0 } };
        log.push(['transform', c.clipId, x.scale, x.position]);
        return { clipId: c.clipId, transform: transforms[c.clipId], diff: diff(1) };
      },
      rangeAtFrames: async (a, b) => ({ a, b }),
      overlayResource: async (x) => {
        const rid = x.resource.id, { a, b } = x.over;
        if (!(b > a)) throw Error('empty target');
        if (failOverlay.includes(rid)) throw Error('overlay failed for ' + rid);
        const c = { clipId: nextId++, trackId: audioRids.includes(rid) ? 'a1' : 'v1', resourceId: rid, trackKind: audioRids.includes(rid) ? 'audio' : 'video', startFrame: a, endFrame: b, audioSourceIndexes: null };
        clips.push(c); src[c.clipId] = Math.round((x.sourceStartSeconds || 0) * fps) / fps;
        log.push(['overlay', rid, a, b, x.sourceStartSeconds]);
        return { inserted: 1, sequenceId: 'x', resourceId: rid, atFrame: a, diff: diff(1) };
      },
      removeClips: async (rows) => {
        if (noRemove) throw Error('remove refused');
        const ids = [].concat(rows).map(r => r.clipId);
        for (const id of ids) { const i = clips.findIndex(c => c.clipId === id); if (i < 0 || clips[i].trackKind === 'main') throw Error('bad remove'); clips.splice(i, 1); }
        log.push(['remove', ids]);
        return { removedClipIds: ids, diff: diff(ids.length) };
      },
      setAudioTracks: async (x) => {
        if (unsaved) throw Error('audio_track_inventory_unavailable: Could not load audio tracks for draft "x": Error: Project not found for sequence x');
        let n;
        if (x.target && x.target.clipId != null) {
          if (!routeOverlays) throw Error('target must be a Span');
          const c = clips.find(k => k.clipId === x.target.clipId);
          n = JSON.stringify(c.audioSourceIndexes) === JSON.stringify(x.audioSourceIndexes) ? 0 : 1;
          c.audioSourceIndexes = [...x.audioSourceIndexes];
          if (routeLeaks) n += muteMain(c.startFrame, c.endFrame, x.audioSourceIndexes);
          log.push(['route', c.clipId]);
        } else { n = muteMain(x.target.a, x.target.b, x.audioSourceIndexes); log.push(['mute', x.audioSourceIndexes, x.target]); }
        return diff(n);
      },
      setClipAudio: async (x) => {
        const c = clips.find(k => k.clipId === x.clip.clipId); if (!c) throw Error('stale clip');
        const a = audio[c.clipId] = audio[c.clipId] || {};
        let n = 0;
        for (const k of ['volumeDb', 'fadeInSeconds', 'fadeOutSeconds']) if (x[k] != null && a[k] !== x[k]) { a[k] = x[k]; n++; }
        if (x.volumeDb != null) log.push(['volume', c.clipId, x.volumeDb]);
        if (x.fadeInSeconds != null || x.fadeOutSeconds != null) log.push(['fade', c.clipId, x.fadeInSeconds, x.fadeOutSeconds]);
        return { clipId: c.clipId, volumeDb: a.volumeDb ?? 0, volumeKeys: [], fadeInSeconds: a.fadeInSeconds || 0, fadeOutSeconds: a.fadeOutSeconds || 0, diff: diff(n) };
      },
      addMotionGraphic: async (x) => { graphics.push({ name: x.label, clip: {} }); log.push(['graphic', x.label, x.within]); return { clipId: nextId++, startFrame: x.within.a, endFrame: x.within.b, diff: diff(1) }; },
      motionGraphics: async () => graphics.map(g => ({ ...g })),
      addVideoEffect: async (x) => {
        if (!clips.some(c => c.clipId === x.clip.clipId)) throw Error('stale clip');
        (effects[x.clip.clipId] = effects[x.clip.clipId] || []).push({ name: x.label, effectName: x.label, parameters: x.parameters, editableParameters: x.editableParameters });
        log.push(['effect', x.clip.clipId, x.label]);
        return { clipId: x.clip.clipId, effectIndex: effects[x.clip.clipId].length - 1, diff: diff(1) };
      },
      videoEffects: async (clip) => (effects[clip.clipId] || []).map(e => ({ clipId: clip.clipId, name: e.name, effectName: e.effectName })),
      commitAll: async (reason) => {
        if (committed) throw Error('Cannot commitAll draft: it was already committed in this run_script call.');
        committed = true; log.push(['commit', reason]); return { createdDraftId: 'seq-new', diff: diff(1) };
      },
    } };
  return m;
}
const commits = m => m.log.filter(x => x[0] === 'commit').length;

// Beat schedule (contracts.md stSchedule) for N montage shots, written out independently of the scripts.
function schedule(N) {
  const hold = [Math.ceil(N / 2) + 1, Math.ceil(N / 2) + 2];
  const beats = Array.from({ length: N }, (_, i) => (hold.includes(i + 1) ? 3 : 2));
  const cuts = []; let b = 14;
  for (const x of beats) { b += x; cuts.push(b); }
  const E = 14 + 2 * N + 2;
  assert.equal(cuts[cuts.length - 1], E);
  return {
    mainBeats: [0, 9.5, 14, ...cuts.slice(0, -1), E, E + 2, E + 4, E + 8],
    grid: [{ quad: 'TL', a: 8, b: 10 }, { quad: 'TR', a: 8.5, b: 10.5 }, { quad: 'BR', a: 9, b: 11 }, { quad: 'BL', a: 9.5, b: 11.5 }],
    gridStates: [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5],
    title: [0, 8], labels: [[5, 8], [12, E]], place: [12, 14],
    endingStart: E, end: E + 8, fadeStart: E + 7.5,
    leak: { a: E - 0.25, b: E + 0.25 }, pulses: [E + 2, E + 5.5], anchors: [8, 14, E],
  };
}
const S8 = schedule(8);
assert.deepEqual(S8.mainBeats, [0, 9.5, 14, 16, 18, 20, 22, 25, 28, 30, 32, 34, 36, 40]);
// Main: opener, place, 8 montage shots, 3 ending shots. r3 and r11 are portrait videos, p1/p2 photos.
const mainPicks = [
  { rid: 'r0', kind: 'video', startSeconds: 1.013, role: 'opener' }, { rid: 'r1', kind: 'video', startSeconds: 2.5, role: 'place' },
  { rid: 'r2', kind: 'video', startSeconds: 3, role: 'beach' }, { rid: 'r3', kind: 'video', startSeconds: 0.51, role: 'town' },
  { rid: 'p1', kind: 'photo', startSeconds: 0, role: 'water' }, { rid: 'r4', kind: 'video', startSeconds: 4.2, role: 'street' },
  { rid: 'r5', kind: 'video', startSeconds: 1, role: 'food' }, { rid: 'r6', kind: 'video', startSeconds: 2, role: 'landmark' },
  { rid: 'r7', kind: 'video', startSeconds: 7.77, role: 'people' }, { rid: 'r8', kind: 'video', startSeconds: 0, role: 'detail' },
  { rid: 'r10', kind: 'video', startSeconds: 5, role: 'ending' }, { rid: 'p2', kind: 'photo', startSeconds: 0, role: 'ending' },
  { rid: 'r11', kind: 'video', startSeconds: 3.3, role: 'ending' }];
// Grid: g0 16:9, g1 portrait, g2 square photo of unknown size (measured on a scratch Draft), g3 4:3.
const gridPicks = [{ rid: 'g0', kind: 'video', startSeconds: 2.02, quad: 'TL' }, { rid: 'g1', kind: 'video', startSeconds: 1, quad: 'TR' },
  { rid: 'g2', kind: 'photo', startSeconds: 0, quad: 'BR' }, { rid: 'g3', kind: 'video', startSeconds: 0, quad: 'BL' }];
const L = { width: 1920, height: 1080 }, P = { width: 1080, height: 1920 };
const sizes = { r0: L, r1: L, r2: L, r3: P, p1: { width: 4032, height: 3024 }, r4: L, r5: L, r6: L, r7: L, r8: L, r10: L, p2: { width: 3000, height: 2000 }, r11: P,
  g0: L, g1: P, g2: null, g3: { width: 1440, height: 1080 } };
const PHOTOS = ['p1', 'p2', 'g2'];
const AUDIO = ['m9', 'w9', 'sh1', 'sh2', 'wh'];
const baseCfg = (extra = {}) => ({ projectId: 'p', draftName: 'Summer Trip 1', fps: null, W: 1920, H: 1080,
  beats: { bpm: 120, delta: 0, snaps: {} }, schedule: S8, picks: { main: mainPicks, grid: gridPicks }, sizes,
  music: { resourceId: 'm9', sectionStart: 4.847, wetResourceId: 'w9' }, crossfadeFrames: null,
  clipSound: 'ambient', ambientDb: -18, gridSound: 'none', sfx: null, ...extra });
// A project whose createDraft hands out mock Drafts; the scratch size-check Draft adopts the photo's size.
const project = (make, scratchLog = []) => ({
  project: () => ({
    createDraft: async ({ name }) => {
      if (name === 'Summer Trip size check') {
        let fsz = { width: 1920, height: 1080 };
        const s = { commits: 0, meta: async () => ({ fps: 30, frameSize: fsz }), insertResource: async ({ resourceId }) => { scratchLog.push(resourceId); fsz = resourceId === 'g2' ? { width: 900, height: 900 } : { width: 1, height: 1 }; }, commitAll: async () => { s.commits++; } };
        scratchLog.drafts = (scratchLog.drafts || []).concat([s]);
        return s;
      }
      return make().d;
    },
    resource: id => ({ id }),
  }),
});
// Independent F(): F(0) = 0, F(b) = round((b * 0.5 + delta) * fps) at 120 BPM.
const Fof = (fps, ss, snaps = {}) => b => (b === 0 ? 0 : Math.round(((snaps[b] != null ? snaps[b] : b * 0.5) + (ss == null ? 0 : ss - Math.round(ss * fps) / fps)) * fps));
const QUAD = { TL: [-44.444, 25], TR: [44.444, 25], BR: [44.444, -25], BL: [-44.444, -25] };

(async () => {
  // 1. Spans in frames at 30, 29.97, 25 and 23.976 fps: Main, grid, music dry/wet, SFX.
  for (const fps of [30, 30000 / 1001, 25, 24000 / 1001]) {
    const drafts = [], scratch = [];
    const cfg = baseCfg({ sfx: { shutter: ['sh1', 'sh2'], shutterSeconds: [0.4, 0.35], whoosh: 'wh', whooshSeconds: 1.2 } });
    const r = await load('assemble.js', cfg)(project(() => { const x = mockDraft(30, { adoptFps: fps, adopt: L, photos: PHOTOS, audioRids: AUDIO }); drafts.push(x); return x; }, scratch));
    const F = Fof(fps, 4.847);
    const tag = ' @' + fps.toFixed(3);
    const expectDrafts = fps === 30 ? 1 : 2;
    assert.equal(drafts.length, expectDrafts, 'rebuild only when the rate changes' + tag);
    if (expectDrafts === 2) assert.equal(commits(drafts[0]), 0, 'the discarded Draft is never committed' + tag);
    const m = drafts[drafts.length - 1];
    assert.equal(commits(m), 1, 'one commitAll' + tag);
    assert.equal(r.fps, fps);
    assert.deepEqual((await m.d.meta()).frameSize, { width: 1920, height: 1080 });
    const bounds = S8.mainBeats.map(F);
    assert.deepEqual(m.mainSpans().map(x => [x[1], x[2]]), bounds.slice(0, -1).map((a, i) => [a, bounds[i + 1]]), 'Main cuts on F(b)' + tag);
    assert.deepEqual(r.frames.mainFrames, bounds);
    assert.equal(r.frames.endingFrame, F(32)); assert.equal(r.frames.endFrame, F(40)); assert.equal(r.frames.fadeStartFrame, F(39.5));
    assert.deepEqual(r.frames.titleFrames, [0, F(8)]); assert.deepEqual(r.frames.labelsFrames, [[F(5), F(8)], [F(12), F(32)]]);
    assert.deepEqual(r.frames.leakFrames, { a: F(31.75), b: F(32.25) }); assert.deepEqual(r.frames.pulseFrames, [F(34), F(37.5)]);
    assert.ok(r.frames.report.every(x => x.quantErrorSeconds <= 0.5 / fps + 1e-9), 'half-frame quantisation' + tag);
    // Source windows: frame-aligned starts, exactly the slot's frames; photos from 0.
    const ins = m.log.filter(x => x[0] === 'insert');
    ins.forEach((x, i) => {
      const k = Math.round(x[2].startSeconds * fps);
      assert.ok(near(x[2].startSeconds, k / fps), 'frame-aligned start' + tag);
      assert.equal(Math.round(x[2].endSeconds * fps) - k, bounds[i + 1] - bounds[i]);
      if (mainPicks[i].kind === 'photo') assert.equal(x[2].startSeconds, 0);
    });
    // Grid overlays on video tracks over [F(a), F(b)), in their quadrants.
    const vids = m.kind('video');
    assert.deepEqual(vids.map(c => [c.resourceId, c.startFrame, c.endFrame]), [['g0', F(8), F(10)], ['g1', F(8.5), F(10.5)], ['g2', F(9), F(11)], ['g3', F(9.5), F(11.5)]]);
    assert.deepEqual(r.gridPlaced.map(g => g.clipId), vids.map(c => c.clipId));
    // Music: dry to Fe + X fading out under the wet, wet from Fe at full level at the same sample phase, X = max(2, round(0.06 fps)).
    const X = Math.max(2, Math.round(0.06 * fps)), Fe = F(32), Fend = F(40);
    const [dry, wet] = m.kind('audio').filter(c => c.resourceId === 'm9' || c.resourceId === 'w9');
    assert.deepEqual([dry.resourceId, dry.startFrame, dry.endFrame], ['m9', 0, Fe + X], 'dry span' + tag);
    assert.deepEqual([wet.resourceId, wet.startFrame, wet.endFrame], ['w9', Fe, Fend], 'wet span' + tag);
    const s0 = Math.round(4.847 * fps) / fps;
    assert.ok(near(m.log.find(x => x[0] === 'overlay' && x[1] === 'w9')[4], s0 + Fe / fps), 'wet phase' + tag);
    assert.ok(near(r.music.dry.sourceStart, s0)); assert.equal(r.music.dry.sourceStartFrom, 'snapped');
    assert.deepEqual(m.audio[dry.clipId], { fadeInSeconds: 0, fadeOutSeconds: X / fps });
    assert.deepEqual(m.audio[wet.clipId], { fadeInSeconds: 0, fadeOutSeconds: (Fend - F(39.5)) / fps });
    assert.equal(r.music.crossfadeFrames, X); assert.equal(r.music.muffle, 'on');
    // SFX: shutter i starts on grid state i; whooshes end on F(8) and Fe.
    const sfx = Object.fromEntries(r.sfxPlaced.map(s => [s.key, [s.rid, s.a, s.b]]));
    assert.deepEqual(sfx.shutter1, ['sh1', F(8), F(8) + Math.floor(0.4 * fps)]);
    assert.deepEqual(sfx.shutter2, ['sh2', F(8.5), F(8.5) + Math.floor(0.35 * fps)]);
    assert.deepEqual(sfx.shutter3, ['sh1', F(9), F(9) + Math.floor(0.4 * fps)]);
    assert.deepEqual(sfx.shutter4, ['sh2', F(9.5), F(9.5) + Math.floor(0.35 * fps)]);
    const wl = Math.floor(1.2 * fps);
    assert.deepEqual(sfx.whooshDrop, ['wh', F(8) - wl, F(8)]); assert.deepEqual(sfx.whooshEnding, ['wh', Fe - wl, Fe]);
    // Ambient -18 dB only on Main videos; never photos, grid panels, music or SFX.
    const vol = m.log.filter(x => x[0] === 'volume');
    assert.deepEqual(vol.map(x => m.clips.find(c => c.clipId === x[1])).map(c => [c.trackKind, c.resourceId]),
      mainPicks.filter(k => k.kind === 'video').map(k => ['main', k.rid]));
    assert.ok(vol.every(x => x[2] === -18));
    assert.equal(r.ambientClips, 11);
    // The measured grid photo came from an unsaved scratch Draft.
    assert.deepEqual([...scratch], ['g2']); assert.ok(scratch.drafts.every(s => s.commits === 0));
    assert.deepEqual(r.sizes.g2, { width: 900, height: 900 });
    assert.deepEqual(Object.keys(r).sort(), ['ambientClips', 'fps', 'frames', 'gridPlaced', 'gridSoundApplied', 'music', 'notes', 'placed', 'sequenceId', 'sfxPlaced', 'sizes']);
    assert.deepEqual(r.notes, [], tag);
  }

  // 2. Transforms: cover for non-16:9 Main clips; grid scale 0.5 x cover at the quadrant centres.
  const m2 = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO });
  const r2 = await load('assemble.js', baseCfg())(project(() => m2));
  const tf = id => m2.transforms[id];
  const cover = s => Math.max(1920 / s.width, 1080 / s.height) / Math.min(1920 / s.width, 1080 / s.height);
  const mainT = r2.placed.filter(x => tf(x.clipId)).map(x => x.rid);
  assert.deepEqual(mainT, ['r3', 'p1', 'p2', 'r11'], 'only non-16:9 Main clips are cover-scaled');
  for (const x of r2.placed.filter(x => tf(x.clipId))) {
    assert.ok(near(tf(x.clipId).scale.x, cover(sizes[x.rid])), x.rid);
    assert.deepEqual(tf(x.clipId).position, { x: 0, y: 0 });
  }
  for (const g of r2.gridPlaced) {
    const t = tf(g.clipId), s = g.rid === 'g2' ? { width: 900, height: 900 } : sizes[g.rid];
    assert.ok(near(t.scale.x, 0.5 * cover(s)) && near(t.scale.y, t.scale.x), 'grid scale ' + g.rid);
    assert.deepEqual([t.position.x, t.position.y], QUAD[g.quad], 'quadrant ' + g.quad);
  }
  assert.ok(near(tf(r2.gridPlaced[0].clipId).scale.x, 0.5), '16:9 panel: exactly half size');
  assert.deepEqual(r2.placed.map(x => x.index), mainPicks.map((_, i) => i));

  // 3. Music: crossfade X = 3 frames after the ending cut; s0 read back from the placed clip when Selects reports it.
  const m3 = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO, exposeSource: true });
  const r3 = await load('assemble.js', baseCfg({ crossfadeFrames: 3, music: { resourceId: 'm9', sectionStart: 4.847, wetResourceId: 'w9' } }))(project(() => m3));
  const F30 = Fof(30, 4.847);
  assert.deepEqual([r3.music.dry.a, r3.music.dry.b, r3.music.wet.a, r3.music.wet.b], [0, F30(32) + 3, F30(32), F30(40)]);
  assert.equal(r3.music.dry.sourceStartFrom, 'clip');
  assert.ok(near(r3.music.wet.sourceStart, Math.round(4.847 * 30) / 30 + F30(32) / 30));
  assert.equal(m3.audio[r3.music.dry.clipId].fadeOutSeconds, 3 / 30);

  // 4. Fallback: no wet resource -> one dry overlay over [0, F(end)) with the end fade.
  const m4 = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO });
  const r4 = await load('assemble.js', baseCfg({ music: { resourceId: 'm9', sectionStart: 4.847, wetResourceId: null } }))(project(() => m4));
  assert.deepEqual(m4.kind('audio').map(c => [c.resourceId, c.startFrame, c.endFrame]), [['m9', 0, F30(40)]]);
  assert.deepEqual(m4.audio[r4.music.dry.clipId], { fadeInSeconds: 0, fadeOutSeconds: (F30(40) - F30(39.5)) / 30 });
  assert.equal(r4.music.wet, null); assert.equal(r4.music.muffle, 'off');
  // Wet placement fails -> the truncated dry clip is removed and the dry music runs the whole length.
  const m5 = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO, failOverlay: ['w9'] });
  const r5 = await load('assemble.js', baseCfg())(project(() => m5));
  assert.deepEqual(m5.kind('audio').map(c => [c.resourceId, c.startFrame, c.endFrame]), [['m9', 0, F30(40)]], 'full-length dry after a wet failure');
  assert.equal(r5.music.wet, null); assert.equal(r5.music.muffle, 'skipped');
  assert.deepEqual(m5.audio[r5.music.dry.clipId], { fadeInSeconds: 0, fadeOutSeconds: (F30(40) - F30(39.5)) / 30 });
  assert.equal(m5.log.filter(x => x[0] === 'remove').length, 1);
  assert.ok(r5.notes.some(n => /ending muffle skipped/.test(n)));
  assert.equal(commits(m5), 1);
  // If the truncated dry cannot be removed, the run fails before committing (never a truncated dry saved).
  const m6 = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO, failOverlay: ['w9'], noRemove: true });
  await assert.rejects(load('assemble.js', baseCfg())(project(() => m6)), /remove refused/);
  assert.equal(commits(m6), 0);
  // No music: no audio clips, delta 0; SFX still placed.
  const m7 = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO });
  const r7 = await load('assemble.js', baseCfg({ music: null, sfx: { shutter: ['sh1'], shutterSeconds: 0.3, whoosh: 'wh', whooshSeconds: 0.5 } }))(project(() => m7));
  const F0 = Fof(30, null);
  assert.equal(r7.music, null);
  assert.deepEqual(r7.frames.mainFrames, S8.mainBeats.map(F0));
  assert.deepEqual(m7.kind('audio').map(c => c.resourceId), ['sh1', 'sh1', 'sh1', 'sh1', 'wh', 'wh'], 'SFX survive No music');
  // A whoosh longer than the time before the drop is trimmed at the head so its end still lands on F(8).
  const m8 = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO });
  const r8 = await load('assemble.js', baseCfg({ music: null, sfx: { shutter: [], whoosh: 'wh', whooshSeconds: 5 } }))(project(() => m8));
  const drop = r8.sfxPlaced.find(s => s.key === 'whooshDrop');
  assert.deepEqual([drop.a, drop.b], [0, F0(8)]);
  assert.ok(near(m8.log.find(x => x[0] === 'overlay' && x[1] === 'wh')[4], (150 - F0(8)) / 30));

  // 5. Snapped anchors (own music) move that beat's events together.
  const m9 = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO });
  const r9 = await load('assemble.js', baseCfg({ music: null, beats: { bpm: 120, delta: 0, snaps: { 14: 7.06, 9.5: 4.9 } } }))(project(() => m9));
  assert.equal(r9.frames.mainFrames[2], Math.round(7.06 * 30), 'anchor 14 snapped');
  assert.equal(r9.frames.placeFrames[1], Math.round(7.06 * 30), 'place title off moves with it');
  assert.equal(r9.frames.mainFrames[1], F0(9.5), 'non-anchor beats never snap');

  // 6. Clip sound modes and grid sound in assemble.
  const sound = async (extra) => { const m = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO }); const r = await load('assemble.js', baseCfg(extra))(project(() => m)); return { m, r }; };
  for (const mode of ['full', 'off']) {
    const { m, r } = await sound({ clipSound: mode });
    assert.equal(m.log.filter(x => x[0] === 'volume').length, 0, mode); assert.equal(r.ambientClips, 0);
  }
  const gv = await sound({ clipSound: 'full', gridSound: 'volume' });
  assert.deepEqual(gv.m.log.filter(x => x[0] === 'volume').map(x => [gv.m.clips.find(c => c.clipId === x[1]).trackKind, x[2]]), Array(4).fill(['video', -60]));
  assert.deepEqual(gv.r.gridSoundApplied, { mode: 'volume', clips: 4, deferred: false });
  const gr = await sound({ clipSound: 'full', gridSound: 'routing' });
  assert.equal(gr.m.log.filter(x => x[0] === 'volume' || x[0] === 'mute' || x[0] === 'route').length, 0, 'routing waits for decorate');
  assert.deepEqual(gr.r.gridSoundApplied, { mode: 'routing', clips: 0, deferred: true });
  // Source window near a known source end slides back to keep a 0.15 s tail.
  const mt = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO, durations: { r8: 2 } });
  await load('assemble.js', baseCfg({ picks: { main: mainPicks.map(k => (k.rid === 'r8' ? { ...k, startSeconds: 1.5, duration: 2 } : k)), grid: gridPicks } }))(project(() => mt));
  const r8ins = mt.log.find(x => x[0] === 'insert' && x[1] === 'r8')[2];
  assert.ok(r8ins.endSeconds <= 2 - 0.15 + 1e-9, 'tail kept');
  // A wrong number of Main picks is refused before any Draft is made.
  await assert.rejects(load('assemble.js', baseCfg({ picks: { main: mainPicks.slice(1), grid: gridPicks } }))(project(() => mockDraft(30))), /Expected 13 Main picks/);

  // 7. decorate on the saved Draft.
  const md = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO, unsaved: true });
  const ra = await load('assemble.js', baseCfg({ clipSound: 'off', gridSound: 'routing', sfx: { shutter: ['sh1'], shutterSeconds: 0.3, whoosh: 'wh', whooshSeconds: 0.5 } }))(project(() => md));
  md.reopen();
  const opts = ['push-in', 'pull-out', 'drift', 'tilt'].map(v => ({ label: v, value: v }));
  const decoCfg = (extra = {}) => ({
    sequenceId: ra.sequenceId, fps: ra.fps, frames: ra.frames, placed: ra.placed, gridPlaced: ra.gridPlaced, sizes: ra.sizes,
    mute: true, gridSound: 'routing',
    title: { tsx: 'T', parameters: { line1: 'that one trip in' }, editableParameters: [] }, labels: { tsx: 'L', parameters: {}, editableParameters: [] },
    look: { tsx: 'LOOK', strength: 0.3, leakStrength: 1 }, gridPanel: { tsx: 'GP' },
    filmFrame: { tsx: 'FF', window: { w: 0.87, h: 0.84, radius: 0.02, feather: 0.012 }, leakStrength: 0.8, timeOrigin: 'clip' },
    motion: { tsx: 'PM', strength: 1, options: opts, byClipIndex: { 4: { motion: 'push-in', direction: 1, axis: 'x' } } },
    endingMotion: { 1: { motion: 'drift', direction: -1, axis: 'x' } }, photos: PHOTOS, ...extra });
  const selD = { draft: () => md.d };
  // Routing refused by the SDK -> the panels fall back to -60 dB and the notes say so.
  const d1 = await load('decorate.js', decoCfg())(selD);
  assert.equal(commits(md), 2, 'decorate commits once');
  assert.equal(d1.muted, true); assert.equal(d1.titleAdded, true); assert.equal(d1.labelsAdded, true);
  assert.deepEqual(d1.gridSound, { mode: 'routing', routed: 0, kept: 0, lowered: 4 });
  assert.ok(d1.notes.includes('grid panel sound lowered to -60 dB (routing unavailable)'));
  const mi = md.log.findIndex(x => x[0] === 'mute');
  assert.ok(mi > 0 && mi < md.log.findIndex(x => x[0] === 'graphic'), 'mute first');
  assert.deepEqual(md.log[mi][2], { a: 0, b: ra.frames.endFrame });
  assert.ok(md.kind('main').filter(c => !PHOTOS.includes(c.resourceId)).every(c => c.audioSourceIndexes.length === 0));
  assert.ok(md.kind('audio').every(c => c.audioSourceIndexes === null), 'music and SFX keep their sound');
  const gs = md.log.filter(x => x[0] === 'graphic');
  assert.deepEqual(gs.map(x => [x[1], x[2].a, x[2].b]), [['Summer Trip title', 0, ra.frames.titleFrames[1]], ['Summer Trip labels', ra.frames.labelsFrames[1][0], ra.frames.endingFrame]]);
  // Effects: look on every Main + grid clip, motion only on the montage photo, masks only on non-16:9 panels,
  // film frame on the 3 ending clips after the look.
  const eff = id => (md.effects[id] || []).map(e => e.name);
  const mainIds = ra.placed.map(x => x.clipId);
  assert.deepEqual(mainIds.map(eff), [
    ['Summer look'], ['Summer look'], ['Summer look'], ['Summer look'], ['Photo motion', 'Summer look'], ['Summer look'], ['Summer look'],
    ['Summer look'], ['Summer look'], ['Summer look'], ['Summer look', 'Film frame'], ['Summer look', 'Film frame'], ['Summer look', 'Film frame']]);
  assert.deepEqual(ra.gridPlaced.map(g => eff(g.clipId)), [['Summer look'], ['Summer look', 'Grid panel'], ['Summer look', 'Grid panel'], ['Summer look', 'Grid panel']]);
  const par = (id, name) => md.effects[id].find(e => e.name === name).parameters;
  const fps = 30, fr = ra.frames;
  const quarter = (fr.endingFrame - fr.leakFrames.a) / fps;
  assert.ok(near(quarter, 0.125, 1 / 30), 'a quarter beat at 120 BPM');
  mainIds.forEach((id, i) => assert.equal(par(id, 'Summer look').leakOutSeconds, i === 9 ? quarter : 0, 'leak only on the last montage clip'));
  mainIds.forEach((id, i) => assert.equal('canvasInBox' in par(id, 'Summer look'), i === 9, 'canvasInBox only on the leak clip'));
  assert.deepEqual(par(mainIds[4], 'Photo motion'), { motion: 'push-in', strength: 1, direction: 1, axis: 'x', cover: 1, holdSeconds: Math.round((fr.mainFrames[5] - fr.mainFrames[4]) / 30 * 1000) / 1000 });
  assert.equal(par(mainIds[3], 'Summer look').sourceStartSeconds, Math.round(0.51 * 30) / 30);
  // Film frame per ending clip.
  const ff = [10, 11, 12].map(i => par(mainIds[i], 'Film frame'));
  assert.deepEqual(ff.map(p => p.leakInSeconds), [(fr.leakFrames.b - fr.endingFrame) / fps, 0, 0]);
  assert.deepEqual(ff.map(p => p.fadeOutFrames), [0, 0, fr.endFrame - fr.fadeStartFrame]);
  assert.deepEqual(ff.map(p => p.motion), [null, { motion: 'drift', direction: -1, axis: 'x', strength: 1 }, null]);
  assert.ok(ff.every(p => p.windowW === 0.87 && p.windowH === 0.84 && p.radius === 0.02 && p.feather === 0.012 && p.leakStrength === 0.8 && p.timeOrigin === 'clip'));
  const half = (fr.leakFrames.b - fr.leakFrames.a) / 2;
  const e0 = fr.mainFrames[10], e1 = fr.mainFrames[11], e2 = fr.mainFrames[12];
  assert.deepEqual(ff[0].pulses, [{ at: (fr.pulseFrames[0] - e0) / fps, dur: 2 * half / fps }], 'pulse +2 straddles the first cut');
  assert.deepEqual(ff[1].pulses, [{ at: 0, dur: 2 * half / fps }]);
  assert.deepEqual(ff[2].pulses, [{ at: (fr.pulseFrames[1] - e2) / fps, dur: 2 * half / fps }]);
  assert.ok(e1 === fr.pulseFrames[0]);
  assert.deepEqual(ff.map(p => p.clipSeconds), [(e1 - e0) / fps, (e2 - e1) / fps, (fr.endFrame - e2) / fps]);
  // canvasInBox: the canvas in % of each clip's own box (16:9 video, 3:2 photo, 9:16 video, all cover-scaled).
  const cib = s => { const fit = Math.min(1920 / s.width, 1080 / s.height), k = cover(s), bw = s.width * fit * k, bh = s.height * fit * k; return { x: (bw - 1920) / 2 / bw * 100, y: (bh - 1080) / 2 / bh * 100, w: 1920 / bw * 100, h: 1080 / bh * 100 }; };
  const close = (a, b) => ['x', 'y', 'w', 'h'].forEach(k => assert.ok(near(a[k], b[k], 1e-6), k + ' ' + a[k] + ' vs ' + b[k]));
  close(ff[0].canvasInBox, { x: 0, y: 0, w: 100, h: 100 });
  close(ff[1].canvasInBox, cib(sizes.p2)); close(ff[2].canvasInBox, cib(P));
  assert.ok(near(ff[2].canvasInBox.h, 100 * (1080 * 1080) / (1920 * 1920), 1e-6), '9:16: the canvas is 31.6 % of the box height');
  // Grid masks: the quadrant in % of the panel's own box.
  const gp = g => par(g.clipId, 'Grid panel').insetPct;
  const tr = gp(ra.gridPlaced[1]);
  // A portrait panel at 0.5 x cover is 960 px wide and 960 * 16/9 px tall. The table's 44.444 % (not 400/9) leaves
  // a 0.005 px offset, hence the 1e-3 tolerance on the horizontal insets.
  const trH = 960 * 1920 / 1080;
  assert.ok(near(tr.left, 0, 1e-3) && near(tr.right, 0, 1e-3), 'portrait panel: full width ' + JSON.stringify(tr));
  assert.ok(near(tr.top, (trH - 540) / 2 / trH * 100, 1e-6) && near(tr.bottom, tr.top, 1e-6), 'portrait panel: centre crop');
  const bl = gp(ra.gridPlaced[3]);
  // A 4:3 panel covering the 16:9 quadrant is 960 x 720 px: 12.5 % cropped at the top and at the bottom.
  assert.ok(near(bl.top, 12.5, 1e-3) && near(bl.bottom, 12.5, 1e-3) && near(bl.left, 0, 1e-3) && near(bl.right, 0, 1e-3), '4:3 panel: top and bottom cropped ' + JSON.stringify(bl));
  // Second run: nothing to add, no commit.
  md.reopen();
  const d2 = await load('decorate.js', decoCfg())(selD);
  assert.deepEqual([d2.committed, d2.alreadyDone, d2.titleAdded, d2.labelsAdded, d2.muted, d2.muteKept], [false, true, false, false, false, true]);
  assert.deepEqual(d2.effects.added, { look: 0, gridPanel: 0, filmFrame: 0, motion: 0 });
  assert.deepEqual(d2.effects.kept, { look: 17, gridPanel: 3, filmFrame: 3, motion: 1 });
  assert.deepEqual(d2.gridSound, { mode: 'routing', routed: 0, kept: 4, lowered: 0 });
  assert.equal(commits(md), 2, 'no empty commit');

  // Partial earlier run (look on some clips only) adds the rest in one commit.
  const mp = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO });
  const rp = await load('assemble.js', baseCfg())(project(() => mp));
  mp.reopen();
  mp.effects[rp.placed[0].clipId] = [{ name: 'Summer look', effectName: 'Summer look' }];
  mp.graphics.push({ name: 'Summer Trip title', clip: {} });
  const pcfg = decoCfg({ sequenceId: 's', frames: rp.frames, placed: rp.placed, gridPlaced: rp.gridPlaced, sizes: rp.sizes, mute: false, gridSound: 'volume' });
  const dp = await load('decorate.js', pcfg)({ draft: () => mp.d });
  assert.deepEqual([dp.titleAdded, dp.labelsAdded, dp.effects.kept.look, dp.effects.added.look, dp.committed], [false, true, 1, 16, true]);
  assert.equal(mp.log.filter(x => x[0] === 'mute' || x[0] === 'route').length, 0, 'no mute unless Off; volume mode leaves routing alone');
  assert.equal(commits(mp), 2);

  // Routing that works targets only the panels; routing that also mutes Main throws before committing.
  const route = async (o) => {
    const m = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO, ...o });
    const r = await load('assemble.js', baseCfg({ gridSound: 'routing' }))(project(() => m));
    m.reopen();
    const c = decoCfg({ frames: r.frames, placed: r.placed, gridPlaced: r.gridPlaced, sizes: r.sizes, mute: false, look: null, filmFrame: null, gridPanel: null, motion: null });
    return { m, run: () => load('decorate.js', c)({ draft: () => m.d }) };
  };
  const ok = await route({ routeOverlays: true });
  const dr = await ok.run();
  assert.deepEqual(dr.gridSound, { mode: 'routing', routed: 4, kept: 0, lowered: 0 });
  assert.ok(ok.m.kind('video').every(c => c.audioSourceIndexes.length === 0));
  assert.ok(ok.m.kind('main').every(c => c.audioSourceIndexes === null), 'Main keeps its sound');
  ok.m.reopen();
  assert.equal((await ok.run()).committed, false, 'routing retry is a no-op');
  const leak = await route({ routeOverlays: true, routeLeaks: true });
  await assert.rejects(leak.run(), /changed the Main clips/);
  assert.equal(commits(leak.m), 1, 'only the assemble commit');
  // A mute failure fails the step and commits nothing.
  const bad = await route({});
  bad.m.d.setAudioTracks = async () => { throw Error('nope'); };
  await assert.rejects(load('decorate.js', decoCfg({ mute: true, gridSound: 'none' }))({ draft: () => bad.m.d }), /mute the clips' own sound: nope/);
  assert.equal(commits(bad.m), 1);

  // 8. canvasInBox for 16:9, 9:16, 4:3 and 3:2 ending sources (Film frame) and last montage sources (the Summer
  // look's transition leak): the same canvas rectangle.
  for (const s of [L, P, { width: 1440, height: 1080 }, { width: 3000, height: 2000 }]) {
    const m = mockDraft(30, { photos: PHOTOS, audioRids: AUDIO });
    const sz = { ...sizes, r10: s, [mainPicks[9].rid]: s };
    const r = await load('assemble.js', baseCfg({ sizes: sz, music: null }))(project(() => m));
    m.reopen();
    await load('decorate.js', decoCfg({ frames: r.frames, placed: r.placed, gridPlaced: r.gridPlaced, sizes: r.sizes, mute: false, gridSound: 'none', title: null, labels: null, gridPanel: null, motion: null }))({ draft: () => m.d });
    const p = m.effects[r.placed[10].clipId].find(e => e.name === 'Film frame').parameters.canvasInBox;
    close(p, cib(s));
    const lk = m.effects[r.placed[9].clipId].find(e => e.name === 'Summer look').parameters;
    assert.ok(lk.leakOutSeconds > 0, 'the leak clip');
    close(lk.canvasInBox, cib(s));
    // Back to canvas px: the rectangle is the whole canvas.
    const fit = Math.min(1920 / s.width, 1080 / s.height), k = cover(s), bw = s.width * fit * k, bh = s.height * fit * k;
    assert.ok(near(p.w / 100 * bw, 1920, 1e-6) && near(p.h / 100 * bh, 1080, 1e-6));
  }
  console.log(JSON.stringify({ scriptsEdit: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
