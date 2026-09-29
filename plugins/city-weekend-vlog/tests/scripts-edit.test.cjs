// plugins/city-weekend-vlog/tests/scripts-edit.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(dir, name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
function mockDraft(fps) {
  const log = [], clips = [], graphics = [], effects = {};
  let frame = 0;
  return { log, clips, graphics, effects, d: {
    meta: async () => ({ fps, frameSize: { width: 1920, height: 1080 } }),
    setFrameSize: async (s) => log.push(['size', s]),
    insertResource: async ({ resourceId, sourceRange }) => { const len = Math.round((sourceRange.endSeconds - sourceRange.startSeconds) * fps); clips.push({ clipId: clips.length + 1, resourceId, trackKind: 'main', startFrame: frame, endFrame: frame + len }); frame += len; log.push(['insert', resourceId, sourceRange]); },
    clips: async () => clips.map(c => ({ ...c })),
    clipTransform: async () => ({ scale: { x: 1, y: 1 }, position: { x: 0, y: 0 } }),
    setClipTransform: async (o) => log.push(['transform', o.clip.clipId, o.scale]),
    rangeAtFrames: async (a, b) => ({ a, b }),
    setAudioTracks: async (o) => log.push(['mute', o.audioSourceIndexes]),
    overlayResource: async (o) => { clips.push({ clipId: 99, resourceId: o.resource.id, trackKind: 'audio', startFrame: 0, endFrame: frame }); log.push(['music', o.sourceStartSeconds]); return { inserted: 1 }; },
    setClipAudio: async (o) => log.push(['fade', o.clip.clipId, o.fadeInSeconds, o.fadeOutSeconds]),
    addMotionGraphic: async (o) => { graphics.push({ name: o.label, clip: {} }); log.push(['title', o.within, o.label]); },
    addVideoEffect: async (o) => { (effects[o.clip.clipId] = effects[o.clip.clipId] || []).push({ name: o.label, effectName: o.label }); log.push(['warm', o.clip.clipId, o.parameters.strength]); },
    motionGraphics: async () => graphics.map(g => ({ ...g })),
    videoEffects: async (clip) => (effects[clip.clipId] || []).map(e => ({ ...e })),
    commitAll: async (reason) => { log.push(['commit', reason]); return { createdDraftId: 'seq-new' }; },
  } };
}
(async () => {
  const m = mockDraft(30);
  const selects = { project: () => ({ createDraft: async () => m.d, resource: id => ({ id }) }), draft: () => m.d };
  const boundaries = [0, 1.0667, 1.9667, 2.5667];
  const r = await load('assemble.js', { projectId: 'p', draftName: 'City Weekend Vlog 1', picks: [
    { rid: 'r0', startSeconds: 2, endSeconds: 3.0667 }, { rid: 'r1', startSeconds: 5, endSeconds: 5.9 }, { rid: 'r0', startSeconds: 8, endSeconds: 8.6 }],
    boundaries, crops: { r0: { width: 1920, height: 1080 }, r1: { width: 1080, height: 1920 } }, mute: true, music: { resourceId: 'r9', sectionStart: 4.847 } })(selects);
  assert.equal(r.sequenceId, 'seq-new');
  assert.equal(r.fps, 30);
  assert.deepEqual(m.clips.filter(c => c.trackKind === 'main').map(c => [c.startFrame, c.endFrame]), [[0, 32], [32, 59], [59, 77]]);
  assert.ok(m.log.some(x => x[0] === 'size' && x[1].width === 1080 && x[1].height === 1920));
  const t = m.log.filter(x => x[0] === 'transform');
  assert.equal(t.length, 2, 'only the landscape clips are cropped');
  assert.ok(Math.abs(t[0][2].x - (1920 / 1080) / (1080 / 1920)) < 1e-6 || t[0][2].x > 1, 'cover scale');
  assert.deepEqual(m.log.find(x => x[0] === 'mute')[1], []);
  assert.equal(m.log.find(x => x[0] === 'music')[1], 4.847);
  assert.deepEqual(m.log.find(x => x[0] === 'fade').slice(1), [99, 0, 0.12]);
  assert.equal(m.log.filter(x => x[0] === 'commit').length, 1);

  // Pre-existing audio (one with the same resource id as the music) must not be mistaken for the new clip.
  const m3 = mockDraft(30);
  m3.clips.push({ clipId: 50, resourceId: 'r9', trackKind: 'audio', startFrame: 0, endFrame: 10 }, { clipId: 51, resourceId: 'other', trackKind: 'audio', startFrame: 0, endFrame: 10 });
  const sel4 = { project: () => ({ createDraft: async () => m3.d, resource: id => ({ id }) }) };
  const r3 = await load('assemble.js', { projectId: 'p', draftName: 'x', picks: [{ rid: 'r0', startSeconds: 0, endSeconds: 1 }], boundaries: [0, 1], crops: {}, mute: false, music: { resourceId: 'r9', sectionStart: 1 } })(sel4);
  assert.deepEqual(m3.log.filter(x => x[0] === 'fade').map(x => x[1]), [99], 'fade targets only the new music clip');
  assert.deepEqual(r3.notes, []);

  const bad = mockDraft(30); bad.d.setAudioTracks = async () => { throw Error('nope'); };
  const sel2 = { project: () => ({ createDraft: async () => bad.d, resource: id => ({ id }) }) };
  await assert.rejects(load('assemble.js', { projectId: 'p', draftName: 'x', picks: [{ rid: 'r0', startSeconds: 0, endSeconds: 1 }], boundaries: [0, 1], crops: {}, mute: true, music: null })(sel2), /mute/i);

  const m2 = mockDraft(30); m2.clips.push({ clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 30 }, { clipId: 2, resourceId: 'r1', trackKind: 'main', startFrame: 30, endFrame: 60 }, { clipId: 3, resourceId: 'm', trackKind: 'audio', startFrame: 0, endFrame: 60 });
  const sel3 = { draft: () => m2.d };
  const dres = await load('decorate.js', { sequenceId: 'seq-new', titleEnd: 45, title: { tsx: 'x', parameters: { line1: 'Saturday' }, editableParameters: [] }, warm: { tsx: 'y', strength: 0.35 } })(sel3);
  assert.deepEqual(dres, { title: true, titleAdded: true, effects: 2, effectsKept: 0, committed: true });
  assert.deepEqual(m2.log.find(x => x[0] === 'title')[1], { a: 0, b: 45 });
  assert.equal(m2.log.filter(x => x[0] === 'commit').length, 1);

  // Retrying on an already decorated Draft adds nothing and does not commit again.
  const cfgD = { sequenceId: 'seq-new', titleEnd: 45, title: { tsx: 'x', parameters: { line1: 'Saturday' }, editableParameters: [] }, warm: { tsx: 'y', strength: 0.35 } };
  const again = await load('decorate.js', cfgD)(sel3);
  assert.deepEqual(again, { title: true, titleAdded: false, effects: 0, effectsKept: 2, committed: false });
  assert.equal(m2.log.filter(x => x[0] === 'title').length, 1, 'title is not duplicated');
  assert.equal(m2.log.filter(x => x[0] === 'warm').length, 2, 'warm effects are not duplicated');
  assert.equal(m2.log.filter(x => x[0] === 'commit').length, 1, 'no second commit');

  // A partial earlier attempt: the title exists, one clip already has the warm look.
  const m4 = mockDraft(30); m4.clips.push({ clipId: 1, resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 30 }, { clipId: 2, resourceId: 'r1', trackKind: 'main', startFrame: 30, endFrame: 60 });
  m4.graphics.push({ name: 'City Weekend title', clip: {} }); m4.effects[1] = [{ name: 'Warm look', effectName: 'Warm look' }];
  const part = await load('decorate.js', cfgD)({ draft: () => m4.d });
  assert.deepEqual(part, { title: true, titleAdded: false, effects: 1, effectsKept: 1, committed: true });
  assert.deepEqual(m4.log.filter(x => x[0] === 'warm').map(x => x[1]), [2]);
  assert.equal(m4.log.filter(x => x[0] === 'title').length, 0);
  console.log(JSON.stringify({ scriptsEdit: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
