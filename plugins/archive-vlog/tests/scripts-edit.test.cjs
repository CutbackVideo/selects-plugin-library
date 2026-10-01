// plugins/archive-vlog/tests/scripts-edit.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(dir, name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
// Models Selects: a Draft created in this run_script call has no saved audio-track inventory, so
// setAudioTracks throws until it is reopened (selects.draft) in a later call; commitAll runs once per call.
// Like Selects, a new Draft adopts its first clip's frame size (`adopt`) on the first insert, over an earlier setFrameSize.
// Photo resources (`photos`) and videos without an audio stream (`silent`) have no sound: muting leaves their audio
// routing null. setAudioTracks returns an EditDiff whose opCount counts the clips whose routing changed.
// `adoptFps` models footage at another rate: the first insert switches the Draft to it before the clip is conformed.
// Like Selects (probed on Staging), a source range is placed as round(end * fps) - round(start * fps) frames: each end
// snaps to a Draft frame on its own, so a start on a half frame loses or gains one. `durations` ({ rid: seconds }) caps
// a video's source at its whole Draft frames: an end past floor(duration * fps) / fps is invalid_source_range.
function mockDraft(fps, { unsaved = false, adopt = { width: 1920, height: 1080 }, photos = [], silent = [], adoptFps = null, durations = {} } = {}) {
  const log = [], clips = [], graphics = [], effects = {};
  let frame = 0, committed = false, frameSize = { width: 1920, height: 1080 }, inserted = false;
  return { log, clips, graphics, effects, reopen() { unsaved = false; committed = false; }, d: {
    meta: async () => ({ fps, frameSize: { ...frameSize } }),
    setFrameSize: async (s) => { frameSize = { ...s }; log.push(['size', s]); },
    insertResource: async ({ resourceId, sourceRange }) => {
      if (!inserted) { inserted = true; frameSize = { ...adopt }; if (adoptFps) fps = adoptFps; }
      if (photos.includes(resourceId) && sourceRange.endSeconds > 5 + 1e-9) throw Error('invalid_source_range');
      if (sourceRange.startSeconds < 0 || (durations[resourceId] != null && sourceRange.endSeconds > Math.floor(durations[resourceId] * fps) / fps + 1e-9)) throw Error('invalid_source_range');
      const len = Math.round(sourceRange.endSeconds * fps) - Math.round(sourceRange.startSeconds * fps); clips.push({ clipId: clips.length + 1, resourceId, trackKind: 'main', startFrame: frame, endFrame: frame + len, audioSourceIndexes: null }); frame += len; log.push(['insert', resourceId, sourceRange]); },
    clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(c => ({ ...c })),
    clipTransform: async () => ({ scale: { x: 1, y: 1 }, position: { x: 0, y: 0 } }),
    setClipTransform: async (o) => log.push(['transform', o.clip.clipId, o.scale]),
    rangeAtFrames: async (a, b) => ({ a, b }),
    setAudioTracks: async (o) => {
      if (unsaved) throw Error('audio_track_inventory_unavailable: Could not load audio tracks for draft "x": Error: Project not found for sequence x');
      let opCount = 0;
      for (const c of clips) {
        if (c.trackKind !== 'main' || photos.includes(c.resourceId) || silent.includes(c.resourceId)) continue;
        if (JSON.stringify(c.audioSourceIndexes) !== JSON.stringify(o.audioSourceIndexes)) { c.audioSourceIndexes = [...o.audioSourceIndexes]; opCount++; }
      }
      log.push(['mute', o.audioSourceIndexes]);
      return { beforeDurationFrames: frame, afterDurationFrames: frame, deltaFrames: 0, opCount, removedDurationFrames: 0, warnings: [] };
    },
    overlayResource: async (o) => { clips.push({ clipId: 99, resourceId: o.resource.id, trackKind: 'audio', startFrame: 0, endFrame: frame }); log.push(['music', o.sourceStartSeconds]); return { inserted: 1 }; },
    setClipAudio: async (o) => {
      if (o.volumeDb != null) { const c = clips.find(x => x.clipId === o.clip.clipId); c.volumeDb = o.volumeDb; log.push(['volume', o.clip.clipId, o.volumeDb]); }
      if (o.fadeOutSeconds != null || o.fadeInSeconds != null) log.push(['fade', o.clip.clipId, o.fadeInSeconds, o.fadeOutSeconds]);
    },
    addMotionGraphic: async (o) => { graphics.push({ name: o.label, clip: {} }); log.push(['graphic', o.within, o.label, o.parameters, o.editableParameters, o.tsxCode]); },
    addVideoEffect: async (o) => {
      if (!clips.some(c => c.clipId === o.clip.clipId)) throw Error('unknown clip');
      (effects[o.clip.clipId] = effects[o.clip.clipId] || []).push({ name: o.label, effectName: o.label });
      log.push(['fx', o.clip.clipId, o.label, o.parameters, o.editableParameters, o.tsxCode]);
    },
    motionGraphics: async () => graphics.map(g => ({ ...g })),
    videoEffects: async (clip) => (effects[clip.clipId] || []).map(e => ({ ...e })),
    commitAll: async (reason) => {
      if (committed) throw Error('Cannot commitAll draft: it was already committed in this run_script call.');
      committed = true; log.push(['commit', reason]); return { createdDraftId: 'seq-new' };
    },
  } };
}
(async () => {
  const m = mockDraft(30, { unsaved: true, adopt: { width: 1080, height: 1920 } });
  const selects = { project: () => ({ createDraft: async () => m.d, resource: id => ({ id }) }), draft: () => m.d };
  const boundaries = [0, 1.0667, 1.9667, 2.5667];
  const r = await load('assemble.js', { projectId: 'p', draftName: 'Archive Vlog 1', picks: [
    { rid: 'r0', startSeconds: 2, endSeconds: 3.0667 }, { rid: 'r1', startSeconds: 5, endSeconds: 5.9 }, { rid: 'r0', startSeconds: 8, endSeconds: 8.6 }],
    boundaries, crops: { r0: { width: 1920, height: 1080 }, r1: { width: 1080, height: 1920 } }, music: { resourceId: 'r9', sectionStart: 4.847 } })(selects);
  assert.equal(r.sequenceId, 'seq-new');
  assert.equal(r.fps, 30);
  assert.deepEqual(m.clips.filter(c => c.trackKind === 'main').map(c => [c.startFrame, c.endFrame]), [[0, 32], [32, 59], [59, 77]]);
  assert.ok(m.log.some(x => x[0] === 'size' && x[1].width === 1920 && x[1].height === 1080));
  // The first insert adopts the clip's 9:16 size, so the 16:9 canvas is set again after it.
  const lastSize = m.log.map(x => x[0]).lastIndexOf('size');
  assert.ok(lastSize > m.log.findIndex(x => x[0] === 'insert'), 'canvas set after the first insert');
  assert.deepEqual((await m.d.meta()).frameSize, { width: 1920, height: 1080 });
  const t = m.log.filter(x => x[0] === 'transform');
  assert.equal(t.length, 1, 'only the portrait clip is cropped');
  assert.equal(m.clips.find(c => c.clipId === t[0][1]).resourceId, 'r1');
  // Cover scale for a 9:16 source on the 16:9 canvas: fill / fit = (1920/1080) / (1080/1920) ≈ 3.16.
  for (const x of t) { assert.ok(Math.abs(x[2].x - (1920 / 1080) / (1080 / 1920)) < 1e-6, 'cover scale ' + x[2].x); assert.equal(x[2].y, x[2].x); }
  assert.equal(m.log.filter(x => x[0] === 'mute').length, 0, 'assemble leaves muting to decorate');
  assert.equal(m.log.find(x => x[0] === 'music')[1], 4.847);
  assert.deepEqual(m.log.find(x => x[0] === 'fade').slice(1), [99, 0, 1.0], 'the music fades out over 1.0 s by default');
  assert.equal(m.log.filter(x => x[0] === 'commit').length, 1);
  assert.deepEqual(Object.keys(r).sort(), ['ambientClips', 'fps', 'notes', 'placed', 'sequenceId', 'totalFrames']);
  assert.equal(m.log.filter(x => x[0] === 'volume').length, 0, 'no clipSound: the clips keep their level');

  // 24 fps footage in a Draft that starts at 30 fps: the first insert switches the rate, so assembly starts again on a
  // fresh Draft aimed at 24 fps. Only that Draft is committed, and every boundary (the first included) lands on it.
  const drafts = [];
  const sel24 = { project: () => ({ createDraft: async () => { const x = mockDraft(30, { adoptFps: 24 }); drafts.push(x); return x.d; }, resource: id => ({ id }) }) };
  const r24 = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [
    { rid: 'r0', startSeconds: 2, endSeconds: 3.0667 }, { rid: 'r1', startSeconds: 5, endSeconds: 5.9 }, { rid: 'r0', startSeconds: 8, endSeconds: 8.6 }],
    boundaries, crops: {}, music: { resourceId: 'r9', sectionStart: 4.847 } })(sel24);
  assert.equal(drafts.length, 2, 'a fresh Draft once the rate is known');
  assert.equal(drafts[0].log.filter(x => x[0] === 'commit').length, 0, 'the first attempt is not saved');
  assert.equal(drafts[1].log.filter(x => x[0] === 'commit').length, 1);
  assert.equal(r24.fps, 24);
  const off24 = 4.847 - Math.round(4.847 * 24) / 24;
  const want24 = boundaries.slice(1).map(b => Math.round((b + off24) * 24));
  assert.deepEqual(drafts[1].clips.filter(c => c.trackKind === 'main').map(c => c.endFrame), want24);
  assert.equal(r24.totalFrames, want24[2]);
  assert.deepEqual((await drafts[1].d.meta()).frameSize, { width: 1920, height: 1080 });
  // Footage at the Draft's own rate lays the clips once.
  const once = [];
  await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [{ rid: 'r0', startSeconds: 0, endSeconds: 1 }], boundaries: [0, 1], crops: {}, music: null })(
    { project: () => ({ createDraft: async () => { const x = mockDraft(30, { adoptFps: 30 }); once.push(x); return x.d; }, resource: id => ({ id }) }) });
  assert.equal(once.length, 1);

  // Pre-existing audio (one with the same resource id as the music) must not be mistaken for the new clip.
  const m3 = mockDraft(30);
  m3.clips.push({ clipId: 50, resourceId: 'r9', trackKind: 'audio', startFrame: 0, endFrame: 10 }, { clipId: 51, resourceId: 'other', trackKind: 'audio', startFrame: 0, endFrame: 10 });
  const sel4 = { project: () => ({ createDraft: async () => m3.d, resource: id => ({ id }) }) };
  const r3 = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [{ rid: 'r0', startSeconds: 0, endSeconds: 1 }], boundaries: [0, 1], crops: {}, music: { resourceId: 'r9', sectionStart: 1 } })(sel4);
  assert.deepEqual(m3.log.filter(x => x[0] === 'fade').map(x => x[1]), [99], 'fade targets only the new music clip');
  assert.deepEqual(r3.notes, []);


  // Photos: placed from 0 for the slot's frame-snapped hold, cover-cropped like videos; an unmeasured photo is measured
  // on an unsaved scratch Draft (it adopts the photo's size) and nothing but the real Draft is committed.
  const mp = mockDraft(30, { unsaved: true, adopt: { width: 898, height: 898 }, photos: ['p1', 'p2', 'p3'] });
  const scratch = [];
  const selP = { project: () => ({ createDraft: async ({ name }) => {
    if (name !== 'Archive Vlog size check') return mp.d;
    let fs = { width: 1920, height: 1080 };
    const s = { name, commits: 0, meta: async () => ({ fps: 30, frameSize: fs }), insertResource: async ({ resourceId }) => { fs = resourceId === 'p2' ? { width: 756, height: 1008 } : { width: 1, height: 1 }; }, commitAll: async () => { s.commits++; } };
    scratch.push(s); return s;
  }, resource: id => ({ id }) }), draft: () => mp.d };
  const pb = [0, 1.0667, 1.9667, 2.5667, 3.7667];
  const rp = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [
    { slot: 0, rid: 'p1', kind: 'photo', holdSeconds: 1.0667 }, { slot: 1, rid: 'r0', kind: 'video', startSeconds: 5, endSeconds: 5.9 },
    { slot: 2, rid: 'p2', kind: 'photo', holdSeconds: 0.6 }, { slot: 3, rid: 'p3', kind: 'photo', holdSeconds: 1.2 }],
    boundaries: pb, crops: { p1: { width: 898, height: 898 }, r0: { width: 1080, height: 1920 }, p3: { width: 1920, height: 1080 } }, music: null })(selP);
  assert.equal(rp.placed, 4);
  assert.deepEqual(mp.clips.map(c => [c.resourceId, c.startFrame, c.endFrame]), [['p1', 0, 32], ['r0', 32, 59], ['p2', 59, 77], ['p3', 77, 113]]);
  const ins = mp.log.filter(x => x[0] === 'insert');
  assert.deepEqual(ins.filter(x => x[1] !== 'r0').map(x => x[2].startSeconds), [0, 0, 0], 'photos start at 0');
  assert.ok(Math.abs(ins[0][2].endSeconds - 32 / 30) < 1e-9, 'hold = frame-snapped slot length');
  assert.equal(scratch.length, 1, 'only the unmeasured photo is measured');
  assert.equal(scratch[0].commits, 0, 'the scratch Draft is never committed');
  const tp = Object.fromEntries(mp.log.filter(x => x[0] === 'transform').map(x => [mp.clips.find(c => c.clipId === x[1]).resourceId, x[2].x]));
  assert.deepEqual(Object.keys(tp).sort(), ['p1', 'p2', 'r0'], 'the square, 3:4 and 9:16 clips are cropped; the 16:9 photo is not');
  assert.ok(Math.abs(tp.p1 - (1920 / 898) / (1080 / 898)) < 1e-9);
  assert.ok(Math.abs(tp.p2 - (1920 / 756) / (1080 / 1008)) < 1e-9);
  assert.ok(Math.abs(tp.r0 - (1920 / 1080) / (1080 / 1920)) < 1e-9);
  assert.deepEqual((await mp.d.meta()).frameSize, { width: 1920, height: 1080 });
  assert.deepEqual(rp.notes, []);


  // Music offset: a section start of 4.845 s is snapped to 4.8333 s (frame 145), so the music plays 0.35 frame early
  // on the timeline and every cut moves by the same offset (planner avMusicOffset): 1.0056 s lands on frame 31, not 30.
  const mo = mockDraft(30);
  await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [{ rid: 'r0', startSeconds: 0, endSeconds: 1 }, { rid: 'r1', startSeconds: 0, endSeconds: 1 }],
    boundaries: [0, 1.0056, 2.0056], crops: {}, music: { resourceId: 'r9', sectionStart: 4.845 } })({ project: () => ({ createDraft: async () => mo.d, resource: id => ({ id }) }) });
  assert.deepEqual(mo.clips.filter(c => c.trackKind === 'main').map(c => [c.startFrame, c.endFrame]), [[0, 31], [31, 61]]);
  const mn = mockDraft(30);
  await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [{ rid: 'r0', startSeconds: 0, endSeconds: 1 }], boundaries: [0, 1.0056], crops: {}, music: null })({ project: () => ({ createDraft: async () => mn.d, resource: id => ({ id }) }) });
  assert.deepEqual(mn.clips.map(c => c.endFrame), [30], 'no music, no offset');

  // Live paris-soul (25 fps): a source start on a half frame (1.7 s = frame 42.5) made Selects place 14 frames for a
  // 15-frame slot, so the cut landed a frame early and the next clip made up for it. Source windows are aimed at whole
  // Draft frames, so every clip gets exactly the frames its slot wants.
  const half = mockDraft(25);
  const hb = [0, 0.6060606060606061, 1.2121212121212122, 1.8181818181818183];
  const rh = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [
    { rid: 'r4', kind: 'video', startSeconds: 11.7, endSeconds: 12.3 }, { rid: 'r14', kind: 'video', startSeconds: 1.7, endSeconds: 2.3 },
    { rid: 'r12', kind: 'video', startSeconds: 9.7, endSeconds: 10.3 }],
    boundaries: hb, crops: {}, music: { resourceId: 'r9', sectionStart: 24.27042424242424 } })({ project: () => ({ createDraft: async () => half.d, resource: id => ({ id }) }) });
  const offH = 24.27042424242424 - Math.round(24.27042424242424 * 25) / 25;
  assert.deepEqual(half.clips.filter(c => c.trackKind === 'main').map(c => c.endFrame), hb.slice(1).map(b => Math.round((b + offH) * 25)), 'every cut on its planned frame');
  assert.deepEqual(half.clips.filter(c => c.trackKind === 'main').map(c => c.endFrame), [15, 30, 45]);
  assert.equal(rh.totalFrames, 45);
  for (const x of half.log.filter(y => y[0] === 'insert')) assert.ok(Math.abs(x[2].startSeconds * 25 - Math.round(x[2].startSeconds * 25)) < 1e-6, 'source start on a Draft frame');

  // Live d-lofi (23.976 fps): the plan (at 30 fps) ended a 1.333 s window 0.05 s before the source's 21.292 s, but at
  // the real rate the slot is 33 frames (1.376 s) and Selects caps the source at its whole frames (510 = 21.271 s), so
  // the insert failed. The window slides back to end inside the source (the pick carries its sourceDuration).
  const F24 = 24000 / 1001;
  const tb = [0, 1.3636363636363635, 2.727272727272727];
  // The live start (19.9087 s) and one a frame later, where snapping the start to a frame alone does not help.
  for (const late of [19.9087, 19.95]) {
    const tail = mockDraft(F24, { durations: { r12: 21.292 } });
    const rt = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [
      { rid: 'r4', kind: 'video', startSeconds: 2, endSeconds: 3.3333, sourceDuration: 9.4 },
      { rid: 'r12', kind: 'video', startSeconds: late, endSeconds: late + 1.3333, sourceDuration: 21.292 }],
      boundaries: tb, crops: {}, music: { resourceId: 'r9', sectionStart: 0.026 } })({ project: () => ({ createDraft: async () => tail.d, resource: id => ({ id }) }) });
    const offT = 0.026 - Math.round(0.026 * F24) / F24;
    assert.deepEqual(tail.clips.map(c => c.endFrame).slice(0, 2), tb.slice(1).map(b => Math.round((b + offT) * F24)));
    const lastIns = tail.log.filter(y => y[0] === 'insert')[1][2];
    assert.ok(lastIns.endSeconds <= Math.floor(21.292 * F24) / F24 + 1e-9, 'window ends inside the source');
    assert.ok(late - lastIns.startSeconds < 0.1, 'slid back by a few frames only');
    assert.equal(rt.placed, 2);
  }

  // Clip sound. Ambient lowers every video clip on Main to cfg.ambientDb (the music stays at 0 dB), before the one
  // commit; photos have no sound and are skipped. Full and Off leave the level alone (Off mutes in decorate).
  const soundPicks = [{ slot: 0, rid: 'r0', kind: 'video', startSeconds: 2, endSeconds: 3 }, { slot: 1, rid: 'p1', kind: 'photo', holdSeconds: 1 }, { slot: 2, rid: 'r1', kind: 'video', startSeconds: 5, endSeconds: 6 }];
  const sound = async (clipSound, extra = {}) => {
    const ms = mockDraft(30, { photos: ['p1'] });
    const sel = { project: () => ({ createDraft: async () => ms.d, resource: id => ({ id }) }) };
    const out = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: soundPicks, boundaries: [0, 1, 2, 3], crops: {}, music: { resourceId: 'r9', sectionStart: 0 }, clipSound, ...extra })(sel);
    return { ms, out };
  };
  const amb = await sound('ambient', { ambientDb: -18 });
  assert.deepEqual(amb.ms.log.filter(x => x[0] === 'volume').map(x => [amb.ms.clips.find(c => c.clipId === x[1]).resourceId, x[2]]), [['r0', -18], ['r1', -18]]);
  assert.equal(amb.out.ambientClips, 2);
  assert.equal(amb.ms.clips.find(c => c.clipId === 99).volumeDb, undefined, 'the music keeps 0 dB');
  assert.ok(amb.ms.log.findIndex(x => x[0] === 'volume') < amb.ms.log.findIndex(x => x[0] === 'commit'), 'lowered before the commit');
  assert.equal(amb.ms.log.filter(x => x[0] === 'commit').length, 1);
  assert.deepEqual((await sound('ambient')).ms.log.filter(x => x[0] === 'volume').map(x => x[2]), [-18, -18], 'default level');
  for (const mode of ['full', 'off']) {
    const o = await sound(mode);
    assert.equal(o.ms.log.filter(x => x[0] === 'volume').length, 0, mode + ' keeps the level');
    assert.equal(o.out.ambientClips, 0);
  }
  // A clip whose level cannot be set is reported, not fatal.
  const failing = mockDraft(30);
  const origAudio = failing.d.setClipAudio;
  failing.d.setClipAudio = async (o) => { if (o.volumeDb != null && o.clip.resourceId === 'r1') throw Error('no audio'); return origAudio(o); };
  const fo = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: soundPicks.filter(k => k.kind === 'video'), boundaries: [0, 1, 2], crops: {}, music: null, clipSound: 'ambient' })({ project: () => ({ createDraft: async () => failing.d, resource: id => ({ id }) }) });
  assert.equal(fo.ambientClips, 1);
  assert.deepEqual(fo.notes, ['the sound of 1 clip could not be lowered under the music']);

  // A music fade other than the default (cfg.musicFadeOut) is passed through.
  {
    const mf = mockDraft(30);
    await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [{ rid: 'r0', startSeconds: 0, endSeconds: 1 }], boundaries: [0, 1], crops: {}, music: { resourceId: 'r9', sectionStart: 0 }, musicFadeOut: 0.5 })(
      { project: () => ({ createDraft: async () => mf.d, resource: id => ({ id }) }) });
    assert.deepEqual(mf.log.find(x => x[0] === 'fade').slice(1), [99, 0, 0.5]);
  }

  // ---- decorate.js ----
  const fxOf = (mk, id) => (mk.effects[id] || []).map(e => e.name);
  const fxLog = (mk, label) => mk.log.filter(x => x[0] === 'fx' && x[2] === label);
  const RESULT_KEYS = ['alreadyDone', 'committed', 'creditAdded', 'effects', 'effectsKept', 'fades', 'letterbox', 'motions', 'muteKept', 'muted', 'photoEffectsSkipped', 'titleAdded', 'videoMotions'];

  // The saved Draft from the first assemble (clips [0, 32), [32, 59), [59, 77)): decorate mutes the Main clips, then
  // adds the title within clip 0's range, in one commit.
  m.reopen();
  const cfgM = { sequenceId: 'seq-new', mute: true, videoEnd: 77, title: { tsx: 'x', parameters: {}, editableParameters: [] }, credit: null, letterbox: null, look: null, fade: null };
  const dm = await load('decorate.js', cfgM)(selects);
  assert.deepEqual(dm, { titleAdded: true, creditAdded: false, letterbox: 0, fades: 0, effects: 0, effectsKept: 0, motions: 0, videoMotions: 0, muted: true, muteKept: false, committed: true, alreadyDone: false, photoEffectsSkipped: 0 });
  const mi = m.log.findIndex(x => x[0] === 'mute');
  assert.deepEqual(m.log[mi][1], []);
  assert.ok(mi < m.log.findIndex(x => x[0] === 'graphic'), 'mute comes first');
  assert.deepEqual(m.log.find(x => x[0] === 'graphic').slice(1, 3), [{ a: 0, b: 32 }, 'Archive title'], 'the title spans the opening shot only');
  assert.ok(m.clips.filter(c => c.trackKind === 'main').every(c => c.audioSourceIndexes.length === 0));
  assert.equal(m.clips.find(c => c.clipId === 99).audioSourceIndexes, undefined, 'music keeps its sound');
  assert.deepEqual(m.log.filter(x => x[0] === 'commit').map(x => x[1]), ['Archive Vlog: assemble', 'Archive Vlog: title and look']);
  // Retrying an already muted and titled Draft neither mutes nor commits again.
  m.reopen();
  const dm2 = await load('decorate.js', cfgM)(selects);
  assert.deepEqual(dm2, { titleAdded: false, creditAdded: false, letterbox: 0, fades: 0, effects: 0, effectsKept: 0, motions: 0, videoMotions: 0, muted: false, muteKept: true, committed: false, alreadyDone: true, photoEffectsSkipped: 0 });
  assert.equal(m.log.filter(x => x[0] === 'mute').length, 1);

  // A mute failure fails the step (the panel reports it and offers the retry) and commits nothing.
  const bad = mockDraft(30); bad.clips.push({ clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null });
  bad.d.setAudioTracks = async () => { throw Error('nope'); };
  await assert.rejects(load('decorate.js', { ...cfgM, sequenceId: 's', videoEnd: 30 })({ draft: () => bad.d }), /mute the clips' own sound: nope/);
  assert.equal(bad.log.filter(x => x[0] === 'commit' || x[0] === 'graphic').length, 0);
  // A missing or non-positive videoEnd fails before anything is touched.
  for (const videoEnd of [undefined, 0, -5, 'x']) {
    const g = mockDraft(30); g.clips.push({ clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null });
    await assert.rejects(load('decorate.js', { ...cfgM, sequenceId: 's', videoEnd })({ draft: () => g.d }), /decorate: cfg\.videoEnd missing/);
    assert.equal(g.log.length, 0, 'nothing is changed without videoEnd');
  }
  // Silent sources (no audio stream) keep null routing after muting. A first run on an all-silent Draft mutes nothing:
  // muted is false and the title still commits.
  const ms = mockDraft(30, { silent: ['s0', 's1'] });
  ms.clips.push({ clipId: 1, resourceId: 's0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null }, { clipId: 2, resourceId: 's1', trackKind: 'main', startFrame: 30, endFrame: 60, audioSourceIndexes: null });
  const dsil = await load('decorate.js', { ...cfgM, sequenceId: 's', videoEnd: 60 })({ draft: () => ms.d });
  assert.deepEqual([dsil.muted, dsil.muteKept, dsil.titleAdded, dsil.committed], [false, true, true, true]);
  // Retry after a landed but unreported commit on a Draft with one silent and one muted video: the null routing sends
  // the mute again, it changes nothing (opCount 0), and nothing is committed ("Nothing to stage" otherwise).
  const mr = mockDraft(30, { silent: ['s0'] });
  mr.clips.push({ clipId: 1, resourceId: 's0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null }, { clipId: 2, resourceId: 'r0', trackKind: 'main', startFrame: 30, endFrame: 60, audioSourceIndexes: [] });
  mr.graphics.push({ name: 'Archive title', clip: {} });
  mr.d.commitAll = async () => { throw Error('Nothing to stage'); };
  const dret = await load('decorate.js', { ...cfgM, sequenceId: 's', videoEnd: 60 })({ draft: () => mr.d });
  assert.deepEqual([dret.muted, dret.muteKept, dret.committed, dret.alreadyDone], [false, true, false, true]);
  assert.equal(mr.log.filter(x => x[0] === 'mute').length, 1, 'the mute was attempted');

  // The full decorate on a built Draft: opening (clip 0), credit (clip 1), a montage video, a montage photo, the final
  // shot, plus a clip on another video track (Cinematic look only). The Main clips come back out of order: decorate
  // sorts them by start frame.
  const opts = ['push-in', 'pull-out', 'drift-left', 'drift-right'].map(v => ({ label: v, value: v }));
  const fullCfg = (extra = {}) => ({ sequenceId: 's', videoEnd: 392, mute: false,
    title: { tsx: 'TITLE', parameters: { title: 'CINEMATIC', timing: { textIn: 2.14 } }, editableParameters: [{ key: 'title', label: 'Title', type: 'text', defaultValue: 'CINEMATIC' }] },
    credit: { tsx: 'CREDIT', parameters: { prefix: 'ARCHIVED BY', name: 'YOURNAME' }, editableParameters: [{ key: 'name', label: 'Name', type: 'text', defaultValue: 'YOURNAME' }] },
    letterbox: { tsx: 'BOX', parameters: { revealStart: 0.2, revealEnd: 2.05, revealSeconds: 1.85, enabled: true } },
    look: { tsx: 'LOOK', strength: 0.3, warmth: 1 },
    fade: { tsx: 'FADE', fadeSeconds: 1.0 },
    photos: ['p1'], photoEffects: true,
    motion: { tsx: 'MOTION', strength: 0.5, options: opts, byRid: { p1: { motion: 'pull-out', direction: 1, axis: 'x', cover: 1.333 } },
      // '0' is never used: the opening has the letterbox reveal instead of a shot motion.
      video: { strength: 0.5, byIndex: { 0: { motion: 'drift-right', direction: 1, axis: 'x' }, 1: { motion: 'push-in', direction: 1, axis: 'x' },
        2: { motion: 'drift-left', direction: -1, axis: 'x' }, 4: { motion: 'push-in', direction: 1, axis: 'x' } } } },
    ...extra });
  const built = (opts2 = {}) => {
    const mk = mockDraft(30, { photos: ['p1'], ...opts2 });
    mk.clips.push({ clipId: 3, resourceId: 'r2', trackKind: 'main', startFrame: 200, endFrame: 236, audioSourceIndexes: null },
      { clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 150, audioSourceIndexes: null },
      { clipId: 2, resourceId: 'r1', trackKind: 'main', startFrame: 150, endFrame: 200, audioSourceIndexes: null },
      { clipId: 4, resourceId: 'p1', trackKind: 'main', startFrame: 236, endFrame: 272, audioSourceIndexes: null },
      { clipId: 5, resourceId: 'r3', trackKind: 'main', startFrame: 272, endFrame: 392, audioSourceIndexes: null },
      { clipId: 6, resourceId: 'r9', trackKind: 'video', startFrame: 0, endFrame: 30 },
      { clipId: 99, resourceId: 'm', trackKind: 'audio', startFrame: 0, endFrame: 392 });
    return mk;
  };
  const mk = built();
  const dk = await load('decorate.js', fullCfg())({ draft: () => mk.d });
  assert.deepEqual(Object.keys(dk).sort(), RESULT_KEYS);
  assert.deepEqual(dk, { titleAdded: true, creditAdded: true, letterbox: 1, fades: 1, effects: 6, effectsKept: 0, motions: 1, videoMotions: 3, muted: false, muteKept: false, committed: true, alreadyDone: false, photoEffectsSkipped: 0 });
  // Title within clip 0's range, credit within clip 1's, each with the panel's parameters and Adjust items.
  const gr = mk.log.filter(x => x[0] === 'graphic');
  assert.deepEqual(gr.map(x => [x[2], x[1], x[5]]), [['Archive title', { a: 0, b: 150 }, 'TITLE'], ['Archived credit', { a: 150, b: 200 }, 'CREDIT']]);
  assert.deepEqual(gr[0][3], { title: 'CINEMATIC', timing: { textIn: 2.14 } });
  assert.deepEqual(gr[1][4], [{ key: 'name', label: 'Name', type: 'text', defaultValue: 'YOURNAME' }]);
  // Effects per clip, in stacking order.
  assert.deepEqual(fxOf(mk, 1), ['Letterbox reveal', 'Cinematic look'], 'opening: reveal, no shot motion');
  assert.deepEqual(fxOf(mk, 2), ['Shot motion', 'Cinematic look'], 'credit shot');
  assert.deepEqual(fxOf(mk, 3), ['Shot motion', 'Cinematic look']);
  assert.deepEqual(fxOf(mk, 4), ['Photo motion', 'Cinematic look'], 'photo');
  assert.deepEqual(fxOf(mk, 5), ['Shot motion', 'Fade out', 'Cinematic look'], 'final shot');
  assert.deepEqual(fxOf(mk, 6), ['Cinematic look'], 'another video track: look only');
  assert.deepEqual(fxOf(mk, 99), [], 'music untouched');
  // Parameters.
  const box = fxLog(mk, 'Letterbox reveal')[0];
  assert.equal(box[5], 'BOX');
  assert.deepEqual(box[3], { revealStart: 0.2, revealEnd: 2.05, revealSeconds: 1.85, enabled: true });
  assert.deepEqual(box[4], [{ key: 'revealSeconds', label: 'Reveal', type: 'number', defaultValue: 1.85, min: 0, max: 5, step: 0.05 },
    { key: 'enabled', label: 'Letterbox reveal', type: 'boolean', defaultValue: true }]);
  const fade = fxLog(mk, 'Fade out');
  assert.deepEqual(fade.map(x => [x[1], x[3], x[5]]), [[5, { durationFrames: 120, fadeSeconds: 1 }, 'FADE']], 'durationFrames = the last clip length');
  assert.deepEqual(fade[0][4], [{ key: 'fadeSeconds', label: 'Fade out', type: 'number', defaultValue: 1, min: 0, max: 3, step: 0.1 }]);
  const shots = fxLog(mk, 'Shot motion');
  assert.deepEqual(shots.map(x => [x[1], x[3]]), [
    [2, { motion: 'push-in', strength: 0.5, direction: 1, axis: 'x', cover: 1, holdSeconds: 1.667 }],
    [3, { motion: 'drift-left', strength: 0.5, direction: -1, axis: 'x', cover: 1, holdSeconds: 1.2 }],
    [5, { motion: 'push-in', strength: 0.5, direction: 1, axis: 'x', cover: 1, holdSeconds: 4 }]]);
  assert.ok(shots.every(x => x[5] === 'MOTION'), 'shot motion uses photo-motion.tsx');
  assert.deepEqual(shots[0][4].map(e => [e.key, e.type, e.label, e.defaultValue]), [['motion', 'select', 'Motion', 'push-in'], ['strength', 'number', 'Motion strength', 0.5]]);
  assert.deepEqual(shots[0][4][0].options, opts);
  const pm = fxLog(mk, 'Photo motion');
  assert.deepEqual(pm.map(x => [x[1], x[3]]), [[4, { motion: 'pull-out', strength: 0.5, direction: 1, axis: 'x', cover: 1.333, holdSeconds: 1.2 }]]);
  const looks = fxLog(mk, 'Cinematic look');
  assert.deepEqual(looks.map(x => x[1]), [1, 2, 3, 4, 5, 6]);
  assert.ok(looks.every(x => JSON.stringify(x[3]) === JSON.stringify({ strength: 0.3, warmth: 1 }) && x[5] === 'LOOK'));
  assert.deepEqual(looks[0][4], [{ key: 'strength', label: 'Look strength', type: 'number', defaultValue: 0.3, min: 0, max: 1, step: 0.05 },
    { key: 'warmth', label: 'Warmth', type: 'number', defaultValue: 1, min: 0, max: 2, step: 0.1 }]);
  assert.deepEqual(mk.log.filter(x => x[0] === 'commit').map(x => x[1]), ['Archive Vlog: title and look'], 'one commit');
  // Idempotent: a second run finds every graphic and effect by name, adds nothing and does not commit.
  const logLen = mk.log.length;
  mk.reopen();
  const dk2 = await load('decorate.js', fullCfg())({ draft: () => mk.d });
  assert.deepEqual(dk2, { titleAdded: false, creditAdded: false, letterbox: 0, fades: 0, effects: 0, effectsKept: 12, motions: 0, videoMotions: 0, muted: false, muteKept: false, committed: false, alreadyDone: true, photoEffectsSkipped: 0 });
  assert.equal(mk.log.slice(logLen).filter(x => x[0] !== 'mute').length, 0, 'nothing added, nothing committed');
  assert.deepEqual(fxOf(mk, 5), ['Shot motion', 'Fade out', 'Cinematic look']);

  // adjustLabels: the Inspector labels in the panel's UI language; effect names stay English (identity).
  {
    const ml = built();
    await load('decorate.js', fullCfg({ adjustLabels: { look: 'Staerke', warmth: 'Waerme', reveal: 'Aufdecken', letterbox: 'Kasch', fade: 'Abblende', motion: 'Bewegung', motionStrength: 'Bewegungsstaerke' } }))({ draft: () => ml.d });
    assert.deepEqual(fxOf(ml, 5), ['Shot motion', 'Fade out', 'Cinematic look']);
    assert.deepEqual(fxLog(ml, 'Cinematic look')[0][4].map(e => e.label), ['Staerke', 'Waerme']);
    assert.deepEqual(fxLog(ml, 'Letterbox reveal')[0][4].map(e => e.label), ['Aufdecken', 'Kasch']);
    assert.deepEqual(fxLog(ml, 'Fade out')[0][4].map(e => e.label), ['Abblende']);
    assert.deepEqual(fxLog(ml, 'Shot motion')[0][4].map(e => e.label), ['Bewegung', 'Bewegungsstaerke']);
  }
  // Credit off (null): no credit graphic; Cinematic look off (null): no look anywhere; the rest unchanged.
  {
    const mc = built();
    const dc = await load('decorate.js', fullCfg({ credit: null, look: null }))({ draft: () => mc.d });
    assert.deepEqual(mc.log.filter(x => x[0] === 'graphic').map(x => x[2]), ['Archive title']);
    assert.equal(dc.creditAdded, false);
    assert.equal(dc.effects, 0);
    assert.equal(fxLog(mc, 'Cinematic look').length, 0);
    assert.deepEqual(fxOf(mc, 1), ['Letterbox reveal']);
    assert.deepEqual(fxOf(mc, 5), ['Shot motion', 'Fade out']);
    assert.equal(dc.committed, true);
  }
  // Letterbox and fade off, no shot motions (no cfg.motion.video), a fade length from cfg.
  {
    const mo = built();
    const cfgO = fullCfg({ letterbox: null, fade: { tsx: 'FADE', fadeSeconds: 0.5 } });
    delete cfgO.motion.video;
    const dO = await load('decorate.js', cfgO)({ draft: () => mo.d });
    assert.deepEqual([dO.letterbox, dO.fades, dO.videoMotions, dO.motions], [0, 1, 0, 1]);
    assert.deepEqual(fxOf(mo, 1), ['Cinematic look']);
    assert.deepEqual(fxLog(mo, 'Fade out')[0][3], { durationFrames: 120, fadeSeconds: 0.5 });
    const mf2 = built();
    const dF = await load('decorate.js', fullCfg({ fade: null }))({ draft: () => mf2.d });
    assert.equal(dF.fades, 0);
    assert.deepEqual(fxOf(mf2, 5), ['Shot motion', 'Cinematic look']);
  }
  // photoEffects not exactly true: the photo clip gets no effect at all; video clips are decorated as usual.
  {
    const mp2 = built();
    const dp = await load('decorate.js', fullCfg({ photoEffects: 'yes' }))({ draft: () => mp2.d });
    assert.deepEqual(fxOf(mp2, 4), []);
    assert.equal(dp.photoEffectsSkipped, 1);
    assert.equal(dp.motions, 0);
    assert.deepEqual(fxOf(mp2, 2), ['Shot motion', 'Cinematic look']);
  }
  // A partial earlier run: the title and the opening's reveal exist; only the rest is added, reveal not duplicated.
  {
    const mpart = built();
    mpart.graphics.push({ name: 'Archive title', clip: {} });
    mpart.effects[1] = [{ name: 'Letterbox reveal', effectName: 'Letterbox reveal' }];
    const dpart = await load('decorate.js', fullCfg())({ draft: () => mpart.d });
    assert.deepEqual([dpart.titleAdded, dpart.creditAdded, dpart.letterbox, dpart.effectsKept, dpart.committed], [false, true, 0, 1, true]);
    assert.deepEqual(fxOf(mpart, 1), ['Letterbox reveal', 'Cinematic look']);
    assert.equal(mpart.log.filter(x => x[0] === 'graphic').length, 1);
  }
  // A one-clip Draft: the clip is both the opening and the last: reveal, then fade, then look; no credit (no clip 1).
  {
    const one = mockDraft(30);
    one.clips.push({ clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 90, audioSourceIndexes: null });
    const d1 = await load('decorate.js', fullCfg({ videoEnd: 90 }))({ draft: () => one.d });
    assert.deepEqual(fxOf(one, 1), ['Letterbox reveal', 'Fade out', 'Cinematic look']);
    assert.equal(d1.creditAdded, false);
    assert.deepEqual(one.log.filter(x => x[0] === 'graphic').map(x => [x[2], x[1]]), [['Archive title', { a: 0, b: 90 }]]);
  }
  // Mute with photos: their null routing does not force another mute on a retry.
  {
    const mm = built({ unsaved: false });
    const cfgMute = fullCfg({ mute: true });
    const d1 = await load('decorate.js', cfgMute)({ draft: () => mm.d });
    assert.equal(d1.muted, true);
    assert.deepEqual(mm.clips.filter(c => c.trackKind === 'main').sort((a, b) => a.startFrame - b.startFrame).map(c => c.audioSourceIndexes), [[], [], [], null, []]);
    mm.reopen();
    const d2 = await load('decorate.js', cfgMute)({ draft: () => mm.d });
    assert.deepEqual([d2.muted, d2.muteKept, d2.committed], [false, true, false]);
  }
  console.log(JSON.stringify({ scriptsEdit: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
