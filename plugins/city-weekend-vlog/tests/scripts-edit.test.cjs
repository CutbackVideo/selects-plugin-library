// plugins/city-weekend-vlog/tests/scripts-edit.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(dir, name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
// Models Selects: a Draft created in this run_script call has no saved audio-track inventory, so
// setAudioTracks throws until it is reopened (selects.draft) in a later call; commitAll runs once per call.
// Like Selects, a new Draft adopts its first clip's frame size (`adopt`) on the first insert, over an earlier setFrameSize.
// Photo resources (`photos`) have no sound: muting leaves their audio routing null.
function mockDraft(fps, { unsaved = false, adopt = { width: 1920, height: 1080 }, photos = [] } = {}) {
  const log = [], clips = [], graphics = [], effects = {};
  let frame = 0, committed = false, frameSize = { width: 1920, height: 1080 }, inserted = false;
  return { log, clips, graphics, effects, reopen() { unsaved = false; committed = false; }, d: {
    meta: async () => ({ fps, frameSize: { ...frameSize } }),
    setFrameSize: async (s) => { frameSize = { ...s }; log.push(['size', s]); },
    insertResource: async ({ resourceId, sourceRange }) => {
      if (!inserted) { inserted = true; frameSize = { ...adopt }; }
      if (photos.includes(resourceId) && sourceRange.endSeconds > 5 + 1e-9) throw Error('invalid_source_range');
      const len = Math.round((sourceRange.endSeconds - sourceRange.startSeconds) * fps); clips.push({ clipId: clips.length + 1, resourceId, trackKind: 'main', startFrame: frame, endFrame: frame + len, audioSourceIndexes: null }); frame += len; log.push(['insert', resourceId, sourceRange]); },
    clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(c => ({ ...c })),
    clipTransform: async () => ({ scale: { x: 1, y: 1 }, position: { x: 0, y: 0 } }),
    setClipTransform: async (o) => log.push(['transform', o.clip.clipId, o.scale]),
    rangeAtFrames: async (a, b) => ({ a, b }),
    setAudioTracks: async (o) => {
      if (unsaved) throw Error('audio_track_inventory_unavailable: Could not load audio tracks for draft "x": Error: Project not found for sequence x');
      for (const c of clips) if (c.trackKind === 'main' && !photos.includes(c.resourceId)) c.audioSourceIndexes = [...o.audioSourceIndexes];
      log.push(['mute', o.audioSourceIndexes]);
    },
    overlayResource: async (o) => { clips.push({ clipId: 99, resourceId: o.resource.id, trackKind: 'audio', startFrame: 0, endFrame: frame }); log.push(['music', o.sourceStartSeconds]); return { inserted: 1 }; },
    setClipAudio: async (o) => log.push(['fade', o.clip.clipId, o.fadeInSeconds, o.fadeOutSeconds]),
    addMotionGraphic: async (o) => { graphics.push({ name: o.label, clip: {} }); log.push(['title', o.within, o.label]); },
    addVideoEffect: async (o) => { (effects[o.clip.clipId] = effects[o.clip.clipId] || []).push({ name: o.label, effectName: o.label }); log.push(['warm', o.clip.clipId, o.parameters.strength]); },
    motionGraphics: async () => graphics.map(g => ({ ...g })),
    videoEffects: async (clip) => (effects[clip.clipId] || []).map(e => ({ ...e })),
    commitAll: async (reason) => {
      if (committed) throw Error('Cannot commitAll draft: it was already committed in this run_script call.');
      committed = true; log.push(['commit', reason]); return { createdDraftId: 'seq-new' };
    },
  } };
}
(async () => {
  const m = mockDraft(30, { unsaved: true });
  const selects = { project: () => ({ createDraft: async () => m.d, resource: id => ({ id }) }), draft: () => m.d };
  const boundaries = [0, 1.0667, 1.9667, 2.5667];
  const r = await load('assemble.js', { projectId: 'p', draftName: 'City Weekend Vlog 1', picks: [
    { rid: 'r0', startSeconds: 2, endSeconds: 3.0667 }, { rid: 'r1', startSeconds: 5, endSeconds: 5.9 }, { rid: 'r0', startSeconds: 8, endSeconds: 8.6 }],
    boundaries, crops: { r0: { width: 1920, height: 1080 }, r1: { width: 1080, height: 1920 } }, music: { resourceId: 'r9', sectionStart: 4.847 } })(selects);
  assert.equal(r.sequenceId, 'seq-new');
  assert.equal(r.fps, 30);
  assert.deepEqual(m.clips.filter(c => c.trackKind === 'main').map(c => [c.startFrame, c.endFrame]), [[0, 32], [32, 59], [59, 77]]);
  assert.ok(m.log.some(x => x[0] === 'size' && x[1].width === 1080 && x[1].height === 1920));
  // The first insert adopts the clip's 16:9 size, so the 9:16 canvas is set again after it.
  const lastSize = m.log.map(x => x[0]).lastIndexOf('size');
  assert.ok(lastSize > m.log.findIndex(x => x[0] === 'insert'), 'canvas set after the first insert');
  assert.deepEqual((await m.d.meta()).frameSize, { width: 1080, height: 1920 });
  const t = m.log.filter(x => x[0] === 'transform');
  assert.equal(t.length, 2, 'only the landscape clips are cropped');
  assert.ok(Math.abs(t[0][2].x - (1920 / 1080) / (1080 / 1920)) < 1e-6 || t[0][2].x > 1, 'cover scale');
  assert.equal(m.log.filter(x => x[0] === 'mute').length, 0, 'assemble leaves muting to decorate');
  assert.equal(m.log.find(x => x[0] === 'music')[1], 4.847);
  assert.deepEqual(m.log.find(x => x[0] === 'fade').slice(1), [99, 0, 0.12]);
  assert.equal(m.log.filter(x => x[0] === 'commit').length, 1);
  assert.deepEqual(Object.keys(r).sort(), ['fps', 'notes', 'placed', 'sequenceId', 'totalFrames']);

  // The next call reopens the saved Draft: decorate mutes the Main clips, then adds the title and look, in one commit.
  m.reopen();
  const cfgM = { sequenceId: 'seq-new', mute: true, titleEnd: 45, title: { tsx: 'x', parameters: {}, editableParameters: [] }, warm: null };
  const dm = await load('decorate.js', cfgM)(selects);
  assert.deepEqual(dm, { title: true, titleAdded: true, effects: 0, effectsKept: 0, muted: true, muteKept: false, committed: true });
  const mi = m.log.findIndex(x => x[0] === 'mute');
  assert.deepEqual(m.log[mi][1], []);
  assert.ok(mi < m.log.findIndex(x => x[0] === 'title'), 'mute comes first');
  assert.ok(m.clips.filter(c => c.trackKind === 'main').every(c => c.audioSourceIndexes.length === 0));
  assert.equal(m.clips.find(c => c.clipId === 99).audioSourceIndexes, undefined, 'music keeps its sound');
  assert.equal(m.log.filter(x => x[0] === 'commit').length, 2);
  // Retrying an already muted and titled Draft neither mutes nor commits again.
  m.reopen();
  const dm2 = await load('decorate.js', cfgM)(selects);
  assert.deepEqual(dm2, { title: true, titleAdded: false, effects: 0, effectsKept: 0, muted: false, muteKept: true, committed: false });
  assert.equal(m.log.filter(x => x[0] === 'mute').length, 1);

  // Pre-existing audio (one with the same resource id as the music) must not be mistaken for the new clip.
  const m3 = mockDraft(30);
  m3.clips.push({ clipId: 50, resourceId: 'r9', trackKind: 'audio', startFrame: 0, endFrame: 10 }, { clipId: 51, resourceId: 'other', trackKind: 'audio', startFrame: 0, endFrame: 10 });
  const sel4 = { project: () => ({ createDraft: async () => m3.d, resource: id => ({ id }) }) };
  const r3 = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [{ rid: 'r0', startSeconds: 0, endSeconds: 1 }], boundaries: [0, 1], crops: {}, music: { resourceId: 'r9', sectionStart: 1 } })(sel4);
  assert.deepEqual(m3.log.filter(x => x[0] === 'fade').map(x => x[1]), [99], 'fade targets only the new music clip');
  assert.deepEqual(r3.notes, []);

  // A mute failure fails the step (the panel reports it and offers the retry) and commits nothing.
  const bad = mockDraft(30); bad.clips.push({ clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null });
  bad.d.setAudioTracks = async () => { throw Error('nope'); };
  await assert.rejects(load('decorate.js', { sequenceId: 's', mute: true, titleEnd: 10, title: { tsx: 'x', parameters: {}, editableParameters: [] }, warm: null })({ draft: () => bad.d }), /mute the clips' own sound: nope/);
  assert.equal(bad.log.filter(x => x[0] === 'commit' || x[0] === 'title').length, 0);

  const m2 = mockDraft(30); m2.clips.push({ clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 30 }, { clipId: 2, resourceId: 'r1', trackKind: 'main', startFrame: 30, endFrame: 60 }, { clipId: 3, resourceId: 'm', trackKind: 'audio', startFrame: 0, endFrame: 60 });
  const sel3 = { draft: () => m2.d };
  const dres = await load('decorate.js', { sequenceId: 'seq-new', titleEnd: 45, title: { tsx: 'x', parameters: { line1: 'Saturday' }, editableParameters: [] }, warm: { tsx: 'y', strength: 0.35 } })(sel3);
  assert.deepEqual(dres, { title: true, titleAdded: true, effects: 2, effectsKept: 0, muted: false, muteKept: false, committed: true });
  assert.deepEqual(m2.log.find(x => x[0] === 'title')[1], { a: 0, b: 45 });
  assert.equal(m2.log.filter(x => x[0] === 'commit').length, 1);

  // Retrying on an already decorated Draft adds nothing and does not commit again.
  const cfgD = { sequenceId: 'seq-new', titleEnd: 45, title: { tsx: 'x', parameters: { line1: 'Saturday' }, editableParameters: [] }, warm: { tsx: 'y', strength: 0.35 } };
  const again = await load('decorate.js', cfgD)(sel3);
  assert.deepEqual(again, { title: true, titleAdded: false, effects: 0, effectsKept: 2, muted: false, muteKept: false, committed: false });
  assert.equal(m2.log.filter(x => x[0] === 'title').length, 1, 'title is not duplicated');
  assert.equal(m2.log.filter(x => x[0] === 'warm').length, 2, 'warm effects are not duplicated');
  assert.equal(m2.log.filter(x => x[0] === 'commit').length, 1, 'no second commit');

  // A partial earlier attempt: the title exists, one clip already has the warm look.
  const m4 = mockDraft(30); m4.clips.push({ clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 30 }, { clipId: 2, resourceId: 'r1', trackKind: 'main', startFrame: 30, endFrame: 60 });
  m4.graphics.push({ name: 'City Weekend title', clip: {} }); m4.effects[1] = [{ name: 'Warm look', effectName: 'Warm look' }];
  const part = await load('decorate.js', cfgD)({ draft: () => m4.d });
  assert.deepEqual(part, { title: true, titleAdded: false, effects: 1, effectsKept: 1, muted: false, muteKept: false, committed: true });
  assert.deepEqual(m4.log.filter(x => x[0] === 'warm').map(x => x[1]), [2]);
  assert.equal(m4.log.filter(x => x[0] === 'title').length, 0);

  // Photos: placed from 0 for the slot's frame-snapped hold, cover-cropped like videos; an unmeasured photo is measured
  // on an unsaved scratch Draft (it adopts the photo's size) and nothing but the real Draft is committed.
  const mp = mockDraft(30, { unsaved: true, adopt: { width: 898, height: 898 }, photos: ['p1', 'p2', 'p3'] });
  const scratch = [];
  const selP = { project: () => ({ createDraft: async ({ name }) => {
    if (name !== 'City Weekend Vlog size check') return mp.d;
    let fs = { width: 1920, height: 1080 };
    const s = { name, commits: 0, meta: async () => ({ fps: 30, frameSize: fs }), insertResource: async ({ resourceId }) => { fs = resourceId === 'p2' ? { width: 756, height: 1008 } : { width: 1, height: 1 }; }, commitAll: async () => { s.commits++; } };
    scratch.push(s); return s;
  }, resource: id => ({ id }) }), draft: () => mp.d };
  const pb = [0, 1.0667, 1.9667, 2.5667, 3.7667];
  const rp = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [
    { slot: 0, rid: 'p1', kind: 'photo', holdSeconds: 1.0667 }, { slot: 1, rid: 'r0', kind: 'video', startSeconds: 5, endSeconds: 5.9 },
    { slot: 2, rid: 'p2', kind: 'photo', holdSeconds: 0.6 }, { slot: 3, rid: 'p3', kind: 'photo', holdSeconds: 1.2 }],
    boundaries: pb, crops: { p1: { width: 898, height: 898 }, r0: { width: 1080, height: 1920 }, p3: { width: 1080, height: 1920 } }, music: null })(selP);
  assert.equal(rp.placed, 4);
  assert.deepEqual(mp.clips.map(c => [c.resourceId, c.startFrame, c.endFrame]), [['p1', 0, 32], ['r0', 32, 59], ['p2', 59, 77], ['p3', 77, 113]]);
  const ins = mp.log.filter(x => x[0] === 'insert');
  assert.deepEqual(ins.filter(x => x[1] !== 'r0').map(x => x[2].startSeconds), [0, 0, 0], 'photos start at 0');
  assert.ok(Math.abs(ins[0][2].endSeconds - 32 / 30) < 1e-9, 'hold = frame-snapped slot length');
  assert.equal(scratch.length, 1, 'only the unmeasured photo is measured');
  assert.equal(scratch[0].commits, 0, 'the scratch Draft is never committed');
  const tp = Object.fromEntries(mp.log.filter(x => x[0] === 'transform').map(x => [mp.clips.find(c => c.clipId === x[1]).resourceId, x[2].x]));
  assert.deepEqual(Object.keys(tp).sort(), ['p1', 'p2'], 'the square and the 3:4 photo are cropped; tall clips are not');
  assert.ok(Math.abs(tp.p1 - (1920 / 898) / (1080 / 898)) < 1e-9);
  assert.ok(Math.abs(tp.p2 - (1920 / 1008) / (1080 / 756)) < 1e-9);
  assert.deepEqual((await mp.d.meta()).frameSize, { width: 1080, height: 1920 });
  assert.deepEqual(rp.notes, []);

  // Decorate with photos: the mute tolerates their null routing (and counts as kept on retry); by default photo clips
  // get no effects (the renderer cannot draw effects on image clips yet).
  mp.reopen();
  const opts = ['push-in', 'pull-out', 'tilt'].map(v => ({ label: v, value: v }));
  const cfgP = { sequenceId: 'seq-new', mute: true, titleEnd: 59, title: { tsx: 'x', parameters: {}, editableParameters: [] }, warm: { tsx: 'y', strength: 0.35 }, photos: ['p1', 'p2', 'p3'],
    motion: { tsx: 'motion', strength: 1, options: opts, byRid: { p2: { motion: 'tilt', direction: -1, axis: 'x', cover: 1.333 }, p3: { motion: 'push-in', direction: 1, axis: 'y', cover: 1 } } }, photoEffects: false };
  const dp = await load('decorate.js', cfgP)(selP);
  assert.deepEqual(dp, { title: true, titleAdded: true, effects: 1, effectsKept: 0, muted: true, muteKept: false, committed: true, photos: { motions: 0, motionsKept: 0, effectsSkipped: 3 } });
  assert.deepEqual(mp.clips.map(c => c.audioSourceIndexes), [null, [], null, null]);
  mp.reopen();
  const dp2 = await load('decorate.js', cfgP)(selP);
  assert.equal(dp2.muteKept, true, 'photo clips without routing do not force another mute');
  assert.equal(dp2.committed, false);
  assert.equal(mp.log.filter(x => x[0] === 'mute').length, 1);
  // With photo effects on: one motion per montage photo (from titleEnd on), stacked with the warm look; idempotent.
  mp.reopen();
  const cfgE = { ...cfgP, photoEffects: true };
  mp.d.addVideoEffect = (orig => async (o) => { if (o.label === 'Photo motion') mp.log.push(['motion', o.clip.clipId, o.parameters, o.editableParameters]); return orig(o); })(mp.d.addVideoEffect);
  const de = await load('decorate.js', cfgE)(selP);
  assert.deepEqual(de.photos, { motions: 2, motionsKept: 0, effectsSkipped: 0 });
  assert.equal(de.effects, 3);
  assert.equal(de.effectsKept, 1);
  const moves = mp.log.filter(x => x[0] === 'motion');
  assert.deepEqual(moves.map(x => mp.clips.find(c => c.clipId === x[1]).resourceId), ['p2', 'p3'], 'the title photo p1 stays still');
  assert.deepEqual(moves[0][2], { motion: 'tilt', strength: 1, direction: -1, axis: 'x', cover: 1.333, holdSeconds: 0.6 });
  assert.deepEqual(moves[1][2], { motion: 'push-in', strength: 1, direction: 1, axis: 'y', cover: 1, holdSeconds: 1.2 });
  assert.deepEqual(moves[0][3].map(e => [e.key, e.type]), [['motion', 'select'], ['strength', 'number']]);
  assert.deepEqual(moves[0][3][0].options, opts);
  assert.deepEqual([moves[0][3][1].min, moves[0][3][1].max, moves[0][3][1].defaultValue], [0, 2, 1]);
  assert.deepEqual(Object.keys(mp.effects).map(Number).sort(), [1, 2, 3, 4], 'every clip has an effect');
  assert.deepEqual(mp.effects[3].map(e => e.name), ['Photo motion', 'Warm look'], 'motion and warm look stack on a photo');
  mp.reopen();
  const de2 = await load('decorate.js', cfgE)(selP);
  assert.deepEqual(de2.photos, { motions: 0, motionsKept: 2, effectsSkipped: 0 });
  assert.equal(de2.committed, false);
  assert.equal(mp.log.filter(x => x[0] === 'motion').length, 2, 'no second motion effect');
  console.log(JSON.stringify({ scriptsEdit: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
