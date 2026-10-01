// plugins/selfie-aesthetic/tests/scripts-edit.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
// The scripts run through run_script's TypeScript check, so they carry `: any` / `as any` annotations (the inlined JSON
// config is typed `any`, so optional keys may be absent, and JSON-widened literals such as type: "select" are cast);
// those two forms (and only those: anything else fails to parse here) are stripped before node evaluates the body.
// The config is inlined as JSON, as the panel does.
const plain = src => src.replace(/\s+as any\b/g, '').replace(/:\s*any(?:\[\])?(?=[\s=,);])/g, '');
const source = name => fs.readFileSync(path.join(dir, name), 'utf8');
const load = (name, cfg) => new Function('selects', `return (async()=>{${plain(source(name)).replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// Models Selects:
// - a Draft created in this run_script call has no saved audio-track inventory, so setAudioTracks throws until it is
//   reopened (selects.draft) in a later call; commitAll runs once per call;
// - a new Draft adopts its first clip's frame size (`adopt`) and, with `adoptFps`, its rate on the first insert;
// - a source range is placed as round(end·fps) − round(start·fps) frames; a video source (`durations`) is capped at its
//   whole frames and an image source at 5 s (invalid_source_range beyond);
// - photos and silent videos keep null audio routing after muting; the EditDiff opCount counts changed clips;
// - videoEffects is the ordered per-clip stack; addTransition needs a clip after the cut.
function mockDraft(fps, { unsaved = false, adopt = { width: 1920, height: 1080 }, photos = [], silent = [], adoptFps = null, durations = {} } = {}) {
  const log = [], clips = [], effects = {}, trans = [];
  let committed = false, frameSize = { width: 1920, height: 1080 }, inserted = false, nextId = 1;
  const mainEnd = () => clips.filter(c => c.trackKind === 'main').reduce((a, c) => Math.max(a, c.endFrame), 0);
  const mains = () => clips.filter(c => c.trackKind === 'main').sort((a, b) => a.startFrame - b.startFrame);
  return { log, clips, effects, trans, get fps() { return fps; }, reopen() { unsaved = false; committed = false; }, d: {
    meta: async () => ({ fps, frameSize: { ...frameSize } }),
    setFrameSize: async (s) => { frameSize = { ...s }; log.push(['size', s]); },
    insertResource: async ({ resourceId, sourceRange }) => {
      if (!inserted) { inserted = true; frameSize = { ...adopt }; if (adoptFps) fps = adoptFps; }
      if (photos.includes(resourceId) && sourceRange.endSeconds > 5 + 1e-9) throw Error('invalid_source_range');
      const dur = durations[resourceId];
      if (dur != null && sourceRange.endSeconds > Math.floor(dur * fps) / fps + 1e-9) throw Error('invalid_source_range');
      const start = mainEnd(), len = Math.round(sourceRange.endSeconds * fps) - Math.round(sourceRange.startSeconds * fps);
      clips.push({ clipId: nextId++, resourceId, trackKind: 'main', startFrame: start, endFrame: start + len, audioSourceIndexes: null });
      log.push(['insert', resourceId, sourceRange]);
    },
    clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(c => ({ ...c })),
    setClipTransform: async (o) => log.push(['transform', o.clip.clipId, o.scale]),
    rangeAtFrames: async (a, b) => ({ a, b }),
    setAudioTracks: async (o) => {
      if (unsaved) throw Error('audio_track_inventory_unavailable: Could not load audio tracks for draft "x": Error: Project not found for sequence x');
      let opCount = 0;
      for (const c of clips) {
        if (c.trackKind !== 'main' || photos.includes(c.resourceId) || silent.includes(c.resourceId)) continue;
        if (JSON.stringify(c.audioSourceIndexes) !== JSON.stringify(o.audioSourceIndexes)) { c.audioSourceIndexes = [...o.audioSourceIndexes]; opCount++; }
      }
      log.push(['mute', o.audioSourceIndexes, o.target]);
      return { opCount };
    },
    overlayResource: async (o) => { clips.push({ clipId: 999, resourceId: o.resource.id, trackKind: 'audio', startFrame: 0, endFrame: mainEnd() }); log.push(['music', o.sourceStartSeconds, o.over]); return { inserted: 1 }; },
    setClipAudio: async (o) => {
      const c = clips.find(x => x.clipId === o.clip.clipId);
      if (o.volumeDb != null) c.volumeDb = o.volumeDb;
      log.push(['audio', o.clip.clipId, o.volumeDb, o.fadeInSeconds, o.fadeOutSeconds]);
    },
    videoEffects: async (clip) => (effects[clip.clipId] || []).map(e => ({ ...e })),
    addVideoEffect: async (o) => {
      assert.ok(clips.some(c => c.clipId === o.clip.clipId), 'a current clip row');
      (effects[o.clip.clipId] = effects[o.clip.clipId] || []).push({ name: o.label, effectName: o.label });
      log.push(['effect', o.clip.clipId, o.label, o.tsxCode, o.parameters, o.editableParameters]);
    },
    transitions: async () => trans.map(t => ({ ...t })),
    addTransition: async (o) => {
      const m = mains(), i = m.findIndex(c => c.clipId === o.after.clipId);
      if (i < 0 || i === m.length - 1) throw Error('no adjacent clip after the cut');
      const at = m[i].endFrame, a = Math.round(o.inOffsetSeconds * fps), b = Math.round(o.outOffsetSeconds * fps);
      if (a + b < 1) throw Error('transition shorter than a frame');
      trans.push({ transitionId: 't' + trans.length, trackId: 'main', name: o.label, mediaKind: 'video', transitionType: 'remotion', editPointFrame: at, startFrame: at - a, endFrame: at + b });
      log.push(['transition', o.after.clipId, o.label, o.tsxCode, o.inOffsetSeconds, o.outOffsetSeconds, o.parameters, o.editableParameters]);
      return { transitionId: 't' + (trans.length - 1) };
    },
    commitAll: async (reason) => {
      if (committed) throw Error('Cannot commitAll draft: it was already committed in this run_script call.');
      committed = true; log.push(['commit', reason]); return { createdDraftId: 'seq-new' };
    },
  } };
}

// A plan like the planner's: one standard bar (A 1 · B ½ · A ½ · B ½ · A ½ · B 1) and part of a finale, at 97.67 BPM,
// with the 0.15 s lead and the music offset δ (planned at 23.976 fps) baked into cutSeconds.
const FPS = 24000 / 1001;
const bpm = 97.67, lead = 0.15, sectionStart = 12.345;
const delta = sectionStart - Math.round(sectionStart * FPS) / FPS;
const beats = [0, 1, 1.5, 2, 2.5, 3, 4, 4.5, 5];
const cutSeconds = beats.map((b, i) => i === 0 ? 0 : lead + b * 60 / bpm + delta);
// `vshort` is a 1.2 s source whose window would run past duration − 0.15 s, so it slides back.
const holds = [
  { i: 0, bar: 0, kind: 'video', rid: 'v1', moment: 'A', srcStart: 2.002, cutIn: 'none', cutOut: 'dir', angle: 30, framing: null },
  { i: 1, bar: 0, kind: 'video', rid: 'v1', moment: 'B', srcStart: 4.1, cutIn: 'dir', cutOut: 'dir', angle: -28, framing: null },
  { i: 2, bar: 0, kind: 'video', rid: 'v1', moment: 'A', srcStart: 2.002, cutIn: 'dir', cutOut: 'dir', angle: 31, framing: null },
  { i: 3, bar: 0, kind: 'video', rid: 'vshort', moment: 'B', srcStart: 0.9, cutIn: 'dir', cutOut: 'dir', angle: -26, framing: null },
  { i: 4, bar: 0, kind: 'video', rid: 'v1', moment: 'A', srcStart: 2.002, cutIn: 'dir', cutOut: 'dir', angle: 33, framing: null },
  { i: 5, bar: 0, kind: 'video', rid: 'v1', moment: 'B', srcStart: 4.1, cutIn: 'dir', cutOut: 'spin', angle: -30, framing: null },
  { i: 6, bar: 1, kind: 'photo', rid: 'p1', moment: 'A', srcStart: 0, cutIn: 'spin', cutOut: 'dir', angle: 27, framing: 'full' },
  { i: 7, bar: 1, kind: 'photo', rid: 'p1', moment: 'B', srcStart: 0, cutIn: 'dir', cutOut: 'none', angle: -32, framing: 'punch' },
];
const durations = { v1: 10, vshort: 1.2 };
const crops = { v1: { width: 1920, height: 1080 }, vshort: { width: 1080, height: 1920 }, p1: { width: 3000, height: 4000 } };
const assembleCfg = (extra = {}) => ({ projectId: 'p', draftName: 'Selfie Aesthetic Edit \u2013 2026-10-01', holds, cutSeconds, durations, crops,
  music: { resourceId: 'm1', sourceStart: sectionStart - lead }, clipSound: 'ambient', ambientDb: -18, ...extra });
const project = (make) => ({ project: () => ({ createDraft: async (o) => make(o), resource: id => ({ id }) }) });

(async () => {
  // --- assemble at 23.976 fps (the Draft already runs at the footage rate) ---
  const m = mockDraft(FPS, { unsaved: true, photos: ['p1'], durations });
  const sel = { ...project(() => m.d), draft: () => m.d };
  const r = await load('assemble.js', assembleCfg())(sel);
  assert.equal(r.sequenceId, 'seq-new');
  assert.equal(r.fps, FPS);
  const mains = m.clips.filter(c => c.trackKind === 'main');
  // Every boundary is round(cutSeconds · fps): the hold lengths are the differences.
  const want = cutSeconds.map(s => Math.round(s * FPS));
  assert.deepEqual(mains.map(c => [c.startFrame, c.endFrame]), want.slice(0, -1).map((a, i) => [a, want[i + 1]]));
  assert.ok(mains.every(c => c.endFrame - c.startFrame >= 1));
  assert.equal(r.totalFrames, want[want.length - 1]);
  assert.equal(r.placed, holds.length);
  assert.deepEqual(r.notes, []);
  // 9:16 is set again after the first insert (which adopted the 16:9 source size).
  const lastSize = m.log.map(x => x[0]).lastIndexOf('size');
  assert.ok(lastSize > m.log.findIndex(x => x[0] === 'insert'), 'canvas set after the first insert');
  assert.deepEqual((await m.d.meta()).frameSize, { width: 1080, height: 1920 });
  // Source windows: whole-frame starts, exactly n frames, ≥ 0.15 s before the source end; photos from 0.
  const ins = m.log.filter(x => x[0] === 'insert');
  ins.forEach((x, i) => {
    const h = holds[i], n = want[i + 1] - want[i], { startSeconds: s, endSeconds: e } = x[2];
    assert.equal(x[1], h.rid);
    if (h.kind === 'photo') { assert.equal(s, 0); assert.ok(close(e, n / FPS), 'photo hold ' + i); return; }
    assert.ok(close(s * FPS, Math.round(s * FPS), 1e-6), 'whole-frame start ' + i);
    assert.equal(Math.round(e * FPS) - Math.round(s * FPS), n, 'n frames ' + i);
    assert.ok(e <= durations[h.rid] - 0.15 + 1e-9, 'tail kept ' + i);
  });
  assert.ok(close(ins[0][2].startSeconds, Math.round(2.002 * FPS) / FPS), 'srcStart snapped to a whole frame');
  assert.ok(ins[3][2].startSeconds < 0.9, 'the short source slides back');
  assert.equal(ins[0][2].startSeconds, ins[2][2].startSeconds, 'A holds replay the same start');
  // Cover: 16:9 videos and the 3:4 photo are cropped to fill 9:16; the portrait clip is not.
  const t = m.log.filter(x => x[0] === 'transform');
  const byRid = Object.fromEntries(t.map(x => [m.clips.find(c => c.clipId === x[1]).resourceId, x[2].x]));
  assert.deepEqual(Object.keys(byRid).sort(), ['p1', 'v1']);
  assert.ok(close(byRid.v1, (1920 / 1080) / (1080 / 1920)));
  assert.ok(close(byRid.p1, (1920 / 4000) / (1080 / 3000)));
  assert.equal(r.covers.length, holds.length);
  assert.equal(r.covers[3], 1);
  assert.ok(close(r.covers[0], byRid.v1) && close(r.covers[6], byRid.p1));
  // Ambient: −18 dB with 20 ms fades on every video hold, in one call each; photos untouched; the music keeps 0 dB.
  const audio = m.log.filter(x => x[0] === 'audio');
  const clipAudio = audio.filter(x => x[1] !== 999);
  assert.deepEqual(clipAudio.map(x => m.clips.find(c => c.clipId === x[1]).resourceId), ['v1', 'v1', 'v1', 'vshort', 'v1', 'v1']);
  assert.ok(clipAudio.every(x => x[2] === -18 && x[3] === 0.02 && x[4] === 0.02));
  assert.equal(r.ambientClips, 6);
  // Music: overlaid from 0 to the end at sourceStart, fade-in 0 and fade-out 0.12 s.
  const music = m.log.find(x => x[0] === 'music');
  assert.ok(close(music[1], sectionStart - lead));
  assert.deepEqual(music[2], { a: 0, b: r.totalFrames });
  assert.deepEqual(audio.filter(x => x[1] === 999).map(x => x.slice(2)), [[undefined, 0, 0.12]]);
  assert.equal(m.clips.find(c => c.clipId === 999).volumeDb, undefined);
  // Exactly one commit; assemble never mutes (the new Draft has no audio inventory yet).
  assert.deepEqual(m.log.filter(x => x[0] === 'commit'), [['commit', 'Selfie Aesthetic Edit: assemble']]);
  assert.equal(m.log.filter(x => x[0] === 'mute').length, 0);
  assert.ok(m.log.findIndex(x => x[0] === 'commit') === m.log.length - 1, 'the commit is the last edit');
  assert.deepEqual(Object.keys(r).sort(), ['ambientClips', 'covers', 'fps', 'notes', 'placed', 'sequenceId', 'totalFrames']);

  // --- the first insert switches a 30 fps Draft to 23.976: lay again on a fresh Draft, the first never committed ---
  const drafts = [];
  const r24 = await load('assemble.js', assembleCfg())(project(() => { const x = mockDraft(30, { adoptFps: FPS, photos: ['p1'], durations }); drafts.push(x); return x.d; }));
  assert.equal(drafts.length, 2, 'a fresh Draft once the rate is known');
  assert.equal(drafts[0].log.filter(x => x[0] === 'commit').length, 0, 'the first attempt is not saved');
  assert.equal(drafts[0].log.filter(x => x[0] === 'insert').length, 1, 'the first attempt stops after one insert');
  assert.equal(drafts[1].log.filter(x => x[0] === 'commit').length, 1);
  assert.equal(r24.fps, FPS);
  assert.deepEqual(drafts[1].clips.filter(c => c.trackKind === 'main').map(c => c.endFrame), want.slice(1));
  assert.deepEqual((await drafts[1].d.meta()).frameSize, { width: 1080, height: 1920 });
  // Footage at the Draft's own rate lays the holds once.
  const once = [];
  await load('assemble.js', assembleCfg())(project(() => { const x = mockDraft(FPS, { adoptFps: FPS, photos: ['p1'], durations }); once.push(x); return x.d; }));
  assert.equal(once.length, 1);
  // The same plan at 30 fps footage: boundaries follow round(cutSeconds · 30).
  const d30 = [];
  await load('assemble.js', assembleCfg())(project(() => { const x = mockDraft(FPS, { adoptFps: 30, photos: ['p1'], durations }); d30.push(x); return x.d; }));
  assert.deepEqual(d30[1].clips.filter(c => c.trackKind === 'main').map(c => c.endFrame), cutSeconds.slice(1).map(s => Math.round(s * 30)));

  // --- clip sound full / off, no music ---
  const sound = async (clipSound) => {
    const ms = mockDraft(FPS, { photos: ['p1'], durations });
    const out = await load('assemble.js', assembleCfg({ clipSound, music: null }))(project(() => ms.d));
    return { ms, out };
  };
  const full = await sound('full');
  const fa = full.ms.log.filter(x => x[0] === 'audio');
  assert.equal(fa.length, 6, 'fades on the video holds only');
  assert.ok(fa.every(x => x[2] === undefined && x[3] === 0.02 && x[4] === 0.02), 'full: fades, no level change');
  assert.equal(full.out.ambientClips, 0);
  assert.equal(full.ms.log.filter(x => x[0] === 'music').length, 0);
  const off = await sound('off');
  assert.equal(off.ms.log.filter(x => x[0] === 'audio').length, 0, 'off: left to decorate');
  assert.equal(off.ms.log.filter(x => x[0] === 'mute').length, 0);
  // An unmeasured photo is measured on a scratch Draft that is never committed.
  const scratch = [];
  const mp = mockDraft(FPS, { photos: ['p1'], durations });
  await load('assemble.js', assembleCfg({ crops: { v1: crops.v1, vshort: crops.vshort } }))(project(({ name }) => {
    if (name !== 'Selfie Aesthetic Edit size check') return mp.d;
    let size = { width: 1, height: 1 };
    const s = { commits: 0, meta: async () => ({ fps: 30, frameSize: size }), insertResource: async () => { size = { width: 3000, height: 4000 }; }, commitAll: async () => { s.commits++; } };
    scratch.push(s); return s;
  }));
  assert.equal(scratch.length, 1, 'one scratch per unmeasured photo resource');
  assert.ok(scratch.every(s => s.commits === 0));
  assert.equal(mp.log.filter(x => x[0] === 'transform').length, 7);

  // --- decorate, effect mode, Off: reopen the saved Draft, mute first, one effect per clip ---
  m.reopen();
  const lookOptions = [{ label: 'Soft glow', value: 'soft-glow' }, { label: 'Night glam', value: 'night-glam' }, { label: 'Clean', value: 'clean' }, { label: 'None', value: 'none' }];
  const decoCfg = (extra = {}) => ({ projectId: 'p', sequenceId: 'seq-new', holds, whipMode: 'effect', covers: r.covers,
    effect: { tsx: 'EFFECT_TSX', look: 'soft-glow', lookStrength: 0.35, whip: 1 }, transitionTsx: 'TRANSITION_TSX', clipSound: 'off', lookOptions, ...extra });
  const dr = await load('decorate.js', decoCfg())(sel);
  assert.deepEqual(dr, { mode: 'effect', effects: 8, effectsKept: 0, transitions: 0, transitionsKept: 0, muted: true, muteKept: false, committed: true, alreadyDone: false, notes: [] });
  const mi = m.log.findIndex(x => x[0] === 'mute');
  assert.deepEqual(m.log[mi][1], []);
  assert.deepEqual(m.log[mi][2], { a: 0, b: r.totalFrames });
  assert.ok(mi < m.log.findIndex(x => x[0] === 'effect'), 'mute comes first');
  assert.deepEqual(m.clips.filter(c => c.trackKind === 'main').map(c => c.audioSourceIndexes), [[], [], [], [], [], [], null, null]);
  const fx = m.log.filter(x => x[0] === 'effect');
  assert.deepEqual(fx.map(x => x[1]), mains.map(c => c.clipId), 'one effect per clip in order');
  assert.ok(fx.every(x => x[2] === 'Selfie whip + look' && x[3] === 'EFFECT_TSX'));
  assert.deepEqual(fx.map(x => [x[4].whipIn, x[4].whipOut]), [[0, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 0]]);
  assert.deepEqual(fx[5][4], { whipIn: 1, whipOut: 1, kindIn: 'dir', kindOut: 'spin', angle: -30, whip: 1, look: 'soft-glow', lookStrength: 0.35, framing: null, cover: r.covers[5] });
  assert.deepEqual([fx[6][4].framing, fx[7][4].framing, fx[7][4].cover], ['full', 'punch', r.covers[7]]);
  const defs = fx[0][5];
  assert.deepEqual(defs.map(e => [e.key, e.label, e.type]), [['look', 'Look', 'select'], ['lookStrength', 'Look strength', 'number'], ['whip', 'Whip strength', 'number']]);
  assert.deepEqual(defs[0].options, lookOptions);
  assert.equal(defs[0].defaultValue, 'soft-glow');
  assert.deepEqual([defs[1].min, defs[1].max, defs[1].step, defs[1].defaultValue], [0, 1, 0.05, 0.35]);
  assert.deepEqual([defs[2].min, defs[2].max, defs[2].step, defs[2].defaultValue], [0, 1.5, 0.1, 1]);
  assert.deepEqual(m.log.filter(x => x[0] === 'commit').map(x => x[1]), ['Selfie Aesthetic Edit: assemble', 'Selfie Aesthetic Edit: whip and look']);
  // Second run: nothing new, no mute, no commit.
  m.reopen();
  const dr2 = await load('decorate.js', decoCfg())(sel);
  assert.deepEqual(dr2, { mode: 'effect', effects: 0, effectsKept: 8, transitions: 0, transitionsKept: 0, muted: false, muteKept: true, committed: false, alreadyDone: true, notes: [] });
  assert.equal(m.log.filter(x => x[0] === 'effect').length, 8);
  assert.equal(m.log.filter(x => x[0] === 'mute').length, 1);
  assert.equal(m.log.filter(x => x[0] === 'commit').length, 2);

  // A partial earlier run (3 effects landed): only the rest is added. Ambient/full never mute.
  const mpart = mockDraft(FPS, { photos: ['p1'], durations });
  await load('assemble.js', assembleCfg())(project(() => mpart.d));
  mpart.reopen();
  for (const c of mpart.clips.filter(x => x.trackKind === 'main').slice(0, 3)) mpart.effects[c.clipId] = [{ name: 'Selfie whip + look', effectName: 'Selfie whip + look' }];
  const dp = await load('decorate.js', decoCfg({ clipSound: 'ambient' }))({ draft: () => mpart.d });
  assert.equal(dp.effects, 5); assert.equal(dp.effectsKept, 3); assert.equal(dp.muted, false); assert.equal(dp.committed, true);
  assert.equal(mpart.log.filter(x => x[0] === 'mute').length, 0);
  assert.deepEqual(mpart.log.filter(x => x[0] === 'effect').map(x => [x[4].whipIn, x[4].whipOut]).slice(-1), [[1, 0]]);
  // Retry after a landed but unreported commit on an all-silent, already decorated Draft: opCount 0, nothing committed.
  const ms = mockDraft(FPS, { photos: ['p1'], silent: ['v1', 'vshort'], durations });
  await load('assemble.js', assembleCfg())(project(() => ms.d));
  ms.reopen();
  for (const c of ms.clips.filter(x => x.trackKind === 'main')) ms.effects[c.clipId] = [{ name: 'Selfie whip + look', effectName: 'Selfie whip + look' }];
  ms.d.commitAll = async () => { throw Error('Nothing to stage'); };
  const dsil = await load('decorate.js', decoCfg())({ draft: () => ms.d });
  assert.equal(dsil.muteKept, true); assert.equal(dsil.muted, false); assert.equal(dsil.alreadyDone, true);
  assert.equal(ms.log.filter(x => x[0] === 'mute').length, 1, 'the mute was attempted');
  // A mute failure fails the step and commits nothing.
  const bad = mockDraft(FPS, { photos: ['p1'], durations });
  await load('assemble.js', assembleCfg())(project(() => bad.d));
  bad.reopen();
  bad.d.setAudioTracks = async () => { throw Error('nope'); };
  await assert.rejects(load('decorate.js', decoCfg())({ draft: () => bad.d }), /mute the clips' own sound: nope/);
  assert.equal(bad.log.filter(x => x[0] === 'effect').length, 0);
  assert.equal(bad.log.filter(x => x[0] === 'commit').length, 1);

  // --- decorate, transition mode (A/B): a look-only effect per clip + holds − 1 native transitions of w + w frames ---
  const mt = mockDraft(FPS, { photos: ['p1'], durations });
  await load('assemble.js', assembleCfg())(project(() => mt.d));
  mt.reopen();
  const dt = await load('decorate.js', decoCfg({ whipMode: 'transition', clipSound: 'full' }))({ draft: () => mt.d });
  assert.deepEqual(dt, { mode: 'transition', effects: 8, effectsKept: 0, transitions: 7, transitionsKept: 0, muted: false, muteKept: false, committed: true, alreadyDone: false, notes: [] });
  const tfx = mt.log.filter(x => x[0] === 'effect');
  assert.ok(tfx.every(x => x[4].whipIn === 0 && x[4].whipOut === 0), 'look-only effects');
  assert.deepEqual(tfx[0][5].map(e => e.key), ['look', 'lookStrength']);
  const tr = mt.log.filter(x => x[0] === 'transition');
  const tmains = mt.clips.filter(c => c.trackKind === 'main');
  assert.deepEqual(tr.map(x => x[1]), tmains.slice(0, -1).map(c => c.clipId), 'after every clip but the last');
  const w = Math.max(1, Math.round(0.067 * FPS));
  assert.equal(w, 2);
  assert.ok(tr.every(x => x[2] === 'Selfie whip' && x[3] === 'TRANSITION_TSX' && close(x[4], w / FPS) && close(x[5], w / FPS)));
  assert.deepEqual(tr.map(x => x[6].kind), ['dir', 'dir', 'dir', 'dir', 'dir', 'spin', 'dir']);
  assert.deepEqual(tr[0][6], { kind: 'dir', angle: 30, whip: 1 });
  assert.deepEqual(tr[0][7].map(e => e.key), ['whip']);
  assert.deepEqual(mt.trans.map(x => [x.startFrame, x.endFrame]), tmains.slice(0, -1).map(c => [c.endFrame - 2, c.endFrame + 2]));
  mt.reopen();
  const dt2 = await load('decorate.js', decoCfg({ whipMode: 'transition', clipSound: 'full' }))({ draft: () => mt.d });
  assert.equal(dt2.transitions, 0); assert.equal(dt2.transitionsKept, 7); assert.equal(dt2.committed, false);
  assert.equal(mt.log.filter(x => x[0] === 'transition').length, 7);
  assert.equal(mt.log.filter(x => x[0] === 'commit').length, 2, 'assemble + the first decorate only');

  // --- inspector labels from cfg.adjustLabels; effect names stay English; JSON-inlined literals survive ---
  const ml = mockDraft(FPS, { photos: ['p1'], durations });
  await load('assemble.js', assembleCfg())(project(() => ml.d));
  ml.reopen();
  const adjustLabels = { look: '\ub8e9', lookStrength: 'Look "strength" $& $1', whip: 'Wisch\u00adst\u00e4rke' };
  await load('decorate.js', decoCfg({ adjustLabels, clipSound: 'ambient' }))({ draft: () => ml.d });
  const lfx = ml.log.filter(x => x[0] === 'effect');
  assert.deepEqual(lfx[0][5].map(e => e.label), [adjustLabels.look, adjustLabels.lookStrength, adjustLabels.whip]);
  assert.ok(lfx.every(x => x[2] === 'Selfie whip + look'));
  // The TS casts sit on editableParameters (run_script type-checks the JSON-widened literals); nothing else is TS-only.
  const deco = source('decorate.js');
  assert.equal((deco.match(/editableParameters: [\w[\]]+ as any/g) || []).length, 2);
  for (const name of ['assemble.js', 'decorate.js', 'ensure-audio.js']) {
    const src = plain(source(name));
    assert.equal(src.split('__CONFIG__').length, 2, name + ' inlines the config once');
    assert.doesNotThrow(() => new Function('selects', `return (async()=>{${src.replace('__CONFIG__', '{}')}})`), name + ' parses');
  }

  // --- ensure-audio: reuse a matching Audio resource (normalised paths), else import once ---
  const audioProject = (stored, extra = []) => {
    const calls = { imports: [] };
    const tree = [{ type: 'dir', children: stored.map((p, i) => ({ type: 'file', resourceId: 'a' + i, path: p })) }];
    return { calls, selects: { project: () => ({
      sourceFiles: async () => ({ fileTree: tree }),
      resources: async () => [...stored.map((_, i) => ({ resourceId: 'a' + i, type: 'Audio' })), ...extra],
      importFiles: async ({ paths }) => { calls.imports.push(paths); return { addedResourceIds: ['new1'] }; },
    }) } };
  };
  const winCfg = 'C:\\Users\\a\\.selects\\skills\\selfie-aesthetic\\assets\\cues\\make-funk.mp3';
  const w1 = audioProject(['D:/other/song.mp3', 'C:/Users/A/.selects/skills/selfie-aesthetic/assets/cues/make-funk.mp3']);
  assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: winCfg })(w1.selects), { resourceId: 'a1', imported: false });
  assert.equal(w1.calls.imports.length, 0);
  // NFC: a decomposed stored path (macOS) matches the composed cfg path.
  const nfd = '/Users/\u1112\u1161\u11ab/cues/cue.mp3', nfc = nfd.normalize('NFC');
  assert.notEqual(nfd, nfc);
  const w2 = audioProject([nfd]);
  assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: nfc })(w2.selects), { resourceId: 'a0', imported: false });
  // POSIX paths stay case-sensitive for the full-path match.
  const w3 = audioProject(['/a/B/cue.mp3', '/a/b/cue.mp3']);
  assert.equal((await load('ensure-audio.js', { projectId: 'p', path: '/a/b/cue.mp3' })(w3.selects)).resourceId, 'a1');
  // Basename fallback: the same cue imported from another folder is reused.
  const w4 = audioProject(['/old/place/x.mp3', '/old/place/make-funk.mp3']);
  assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: winCfg })(w4.selects), { resourceId: 'a1', imported: false });
  // No match: imported once; a non-Audio resource with the same path is ignored.
  const w5 = audioProject(['/x/other.mp3'], [{ resourceId: 'vid', type: 'Video' }]);
  assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: '/cues/make-funk.mp3' })(w5.selects), { resourceId: 'new1', imported: true });
  assert.deepEqual(w5.calls.imports, [['/cues/make-funk.mp3']]);
  // A folder-style listing is walked per folder.
  const calls6 = [];
  const sel6 = { project: () => ({
    sourceFiles: async (o) => { calls6.push(o); return o ? { fileTree: [{ type: 'file', resourceId: 'f1', path: '/m/cue.mp3' }] } : { folders: [{ name: 'Music' }] }; },
    resources: async () => [{ resourceId: 'f1', type: 'Audio' }], importFiles: async () => { throw Error('should not import'); } }) };
  assert.equal((await load('ensure-audio.js', { projectId: 'p', path: '/m/cue.mp3' })(sel6)).resourceId, 'f1');
  assert.deepEqual(calls6, [undefined, { folder: 'Music' }]);
  const w7 = { project: () => ({ sourceFiles: async () => ({ fileTree: [] }), resources: async () => [], importFiles: async () => ({ addedResourceIds: [] }) }) };
  await assert.rejects(load('ensure-audio.js', { projectId: 'p', path: '/m/cue.mp3' })(w7), /not imported/);

  console.log(JSON.stringify({ scriptsEdit: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
