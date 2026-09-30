// plugins/the-end-credits/tests/scripts-edit.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
// The scripts run through run_script's TypeScript check, so they carry `: any` / `as any` annotations; those two forms
// (and only those: anything else fails to parse here) are stripped before node evaluates the body.
const plain = src => src.replace(/\s+as any\b/g, '').replace(/:\s*any(?:\[\])?(?=[\s=,);])/g, '');
const load = (name, cfg) => new Function('selects', `return (async()=>{${plain(fs.readFileSync(path.join(dir, name), 'utf8')).replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);

// Models Selects:
// - a Draft created in this run_script call has no saved audio-track inventory, so setAudioTracks throws until it is
//   reopened (selects.draft) in a later call; commitAll runs once per call;
// - `longAt` makes one insert a frame longer than asked;
// - a new Draft adopts its first clip's frame size (`adopt`) and, with `adoptFps`, its rate on the first insert;
// - photos (`photos`) and videos without an audio stream (`silent`) keep null audio routing after muting; the EditDiff
//   opCount counts the clips whose routing changed; image sources are 5 s long;
// - insertGap puts a blank Main row (resourceId null) before its position and ripples later Main clips;
// - videoEffects is the ordered per-clip stack; addVideoEffect appends.
function mockDraft(fps, { unsaved = false, adopt = { width: 1920, height: 1080 }, photos = [], silent = [], adoptFps = null, longAt = null } = {}) {
  const log = [], clips = [], graphics = [], effects = {};
  let committed = false, frameSize = { width: 1920, height: 1080 }, inserted = false, nextId = 1, inserts = 0;
  const mainEnd = () => clips.filter(c => c.trackKind === 'main').reduce((a, c) => Math.max(a, c.endFrame), 0);
  return { log, clips, graphics, effects, get fps() { return fps; }, reopen() { unsaved = false; committed = false; }, d: {
    meta: async () => ({ fps, frameSize: { ...frameSize }, durationFrames: mainEnd() }),
    setFrameSize: async (s) => { frameSize = { ...s }; log.push(['size', s]); },
    insertResource: async ({ resourceId, sourceRange, at }) => {
      assert.equal(at, undefined, 'shots append');
      if (!inserted) { inserted = true; frameSize = { ...adopt }; if (adoptFps) fps = adoptFps; }
      if (photos.includes(resourceId) && sourceRange.endSeconds > 5 + 1e-9) throw Error('invalid_source_range');
      // `longAt`: that insert (0-based) rounds one frame long, as Selects can when a source range is not frame-exact.
      const start = mainEnd(), len = Math.round((sourceRange.endSeconds - sourceRange.startSeconds) * fps) + (inserts++ === longAt ? 1 : 0);
      clips.push({ clipId: nextId++, resourceId, trackKind: 'main', startFrame: start, endFrame: start + len, audioSourceIndexes: null });
      log.push(['insert', resourceId, sourceRange]);
    },
    insertGap: async ({ at, seconds }) => {
      assert.ok(at && at.before, 'the gap goes before a Span');
      const pos = at.before.startFrame, len = Math.round(seconds * fps);
      assert.ok(len >= 1);
      for (const c of clips) if (c.trackKind === 'main' && c.startFrame >= pos) { c.startFrame += len; c.endFrame += len; }
      clips.push({ clipId: nextId++, resourceId: null, trackKind: 'main', startFrame: pos, endFrame: pos + len, audioSourceIndexes: null });
      clips.sort((a, b) => a.startFrame - b.startFrame);
      log.push(['gap', pos, seconds, len]);
      return { opCount: 1 };
    },
    clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(c => ({ ...c })),
    setClipTransform: async (o) => { log.push(['transform', o.clip.resourceId, o.scale, o.position]); return { clipId: o.clip.clipId }; },
    rangeAtFrames: async (a, b) => ({ startFrame: a, endFrame: b }),
    setAudioTracks: async (o) => {
      if (unsaved) throw Error('audio_track_inventory_unavailable: Could not load audio tracks for draft "x"');
      let opCount = 0;
      for (const c of clips) {
        if (c.trackKind !== 'main' || c.resourceId === null || photos.includes(c.resourceId) || silent.includes(c.resourceId)) continue;
        if (c.startFrame < o.target.startFrame || c.endFrame > o.target.endFrame) continue;
        if (JSON.stringify(c.audioSourceIndexes) !== JSON.stringify(o.audioSourceIndexes)) { c.audioSourceIndexes = [...o.audioSourceIndexes]; opCount++; }
      }
      log.push(['mute', o.target, o.audioSourceIndexes]);
      return { opCount };
    },
    overlayResource: async (o) => { clips.push({ clipId: 99, resourceId: o.resource.id, trackKind: 'audio', startFrame: o.over.startFrame, endFrame: o.over.endFrame }); log.push(['music', o.over, o.sourceStartSeconds]); return { inserted: 1 }; },
    setClipAudio: async (o) => {
      const c = clips.find(x => x.clipId === o.clip.clipId);
      if (o.volumeDb != null) { c.volumeDb = o.volumeDb; log.push(['volume', c.resourceId, o.volumeDb]); }
      if (o.fadeOutSeconds != null || o.fadeInSeconds != null) log.push(['fade', c.clipId === 99 ? 'music' : c.resourceId, o.fadeInSeconds, o.fadeOutSeconds]);
    },
    addMotionGraphic: async (o) => { graphics.push({ name: o.label, clip: {} }); log.push(['graphic', o.within, o.label, o.parameters]); },
    addVideoEffect: async (o) => {
      assert.ok(clips.some(c => c.clipId === o.clip.clipId && c.startFrame === o.clip.startFrame), 'a current clip row');
      (effects[o.clip.clipId] = effects[o.clip.clipId] || []).push({ name: o.label, effectName: o.label, parameters: o.parameters, editableParameters: o.editableParameters });
      log.push(['effect', o.clip.resourceId, o.label, o.parameters]);
    },
    motionGraphics: async () => graphics.map(g => ({ ...g })),
    videoEffects: async (clip) => (effects[clip.clipId] || []).map(e => ({ ...e })),
    commitAll: async (reason) => {
      if (committed) throw Error('Cannot commitAll draft: it was already committed in this run_script call.');
      committed = true; log.push(['commit', reason]); return { createdDraftId: 'seq-new', diff: {} };
    },
  } };
}
const project = (m, extra = {}) => ({ project: () => ({ createDraft: async () => m.d, resource: id => ({ id }) }), draft: () => m.d, ...extra });
const kinds = (log, k) => log.filter(x => x[0] === k);
const shotRows = m => m.clips.filter(c => c.trackKind === 'main' && c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
const close = (a, b, eps = 1e-4) => Math.abs(a - b) < eps;

// The time model (plan.md): boundaries [0, L, L+P, ..., L+N*P+T]; frame(b) = b === 0 ? 0 : round((b + delta) * fps) with
// delta = s - round(s * fps) / fps (s = the music section start; 0 without music).
const L = 5.1, T = 0.5, P = 4 * 60 / 62;
const bounds = N => [0, L].concat(Array.from({ length: N - 1 }, (_, k) => L + (k + 1) * P), [L + N * P + T]);
const expectFrames = (b, fps, s) => {
  const delta = s == null ? 0 : s - Math.round(s * fps) / fps;
  return b.map(x => (x === 0 ? 0 : Math.round((x + delta) * fps)));
};
const A = 16 / 9;
const sources = { v0: { aspect: 1920 / 1080 }, v1: { aspect: 1080 / 1920 }, v2: { aspect: 3840 / 2160 }, v3: { aspect: 1280 / 720 }, v4: { aspect: 1920 / 1080 }, p1: { aspect: 810 / 1080 } };
const vid = (rid, t) => ({ rid, kind: 'video', startSeconds: t, holdSeconds: P });
const pho = rid => ({ rid, kind: 'photo', startSeconds: 0, holdSeconds: P });
const tsxCfg = {
  graphic: { tsx: 'G', parameters: { title: 'THE END' }, editableParameters: [{ key: 'title', label: 'Title', type: 'text', defaultValue: 'THE END' }] },
  frame: { tsx: 'F' },
  look: { tsx: 'LK', strength: 0.5, on: true },
  // The planner's strength (0.6) is ignored: the Shot frame gets strength 1 and scales it itself.
  photoMotion: { byRid: { p1: { motion: 'push-in', direction: 1, axis: 'x', strength: 0.6 } } },
};
const record = (r, extra = {}) => ({ layout: 'classic', sequenceId: r.sequenceId, fps: r.fps, frames: r.frames, clipSound: 'ambient',
  sources, photos: { p1: { aspect: 810 / 1080, motion: 'push-in', direction: 1, axis: 'x' } }, fades: { inSec: 0.5, outSec: 1.13 }, musicFadeOut: 1.5, ...tsxCfg, ...extra });

(async () => {
  // 1. Frame maths at 23.976 / 25 / 29.97, with and without the music delta, in both layouts.
  for (const fps of [23.976, 25, 29.97]) {
    for (const s of [null, 12.345, 31.7, 4.845, 1.822]) {
      for (const layout of ['classic', 'full']) {
        const m = mockDraft(fps, { adoptFps: fps });
        const b = bounds(4);
        const picks = (layout === 'full' ? [vid('v4', 1)] : []).concat([vid('v0', 1), vid('v2', 2), vid('v3', 3), vid('v0', 9)]);
        const r = await load('assemble.js', { projectId: 'p', draftName: 'x', layout, picks, boundaries: b, L, music: s == null ? null : { resourceId: 'm', sectionStart: s },
          clipSound: 'ambient', ambientDb: -18, sources, musicFadeOut: 1.5 })(project(m));
        const want = expectFrames(b, fps, s);
        assert.deepEqual(r.frames, want, `frames at ${fps} fps, s=${s}`);
        assert.equal(r.fps, fps);
        const rows = shotRows(m);
        assert.deepEqual(rows.map(c => c.endFrame), want.slice(layout === 'full' ? 1 : 2), `cut frames at ${fps}/${s}/${layout}`);
        assert.equal(rows[0].startFrame, layout === 'full' ? 0 : want[1], 'first shot start');
        assert.deepEqual(r.clips, rows.map(c => ({ rid: c.resourceId, startFrame: c.startFrame, endFrame: c.endFrame })));
        assert.deepEqual(r.notes, [], 'no notes');
        if (s != null) assert.deepEqual(kinds(m.log, 'music')[0].slice(1), [{ startFrame: 0, endFrame: want[want.length - 1] }, s]);
      }
    }
  }
  // Pinned values (independent of the helper above).
  const pin = async (fps, b, s, layout = 'full') => {
    const m = mockDraft(fps, { adoptFps: fps });
    const picks = b.slice(1).map((_, i) => vid('v0', i));
    if (layout === 'classic') picks.shift();
    return load('assemble.js', { projectId: 'p', draftName: 'x', layout, picks, boundaries: b, L, music: s == null ? null : { resourceId: 'm', sectionStart: s }, clipSound: 'full', sources })(project(m));
  };
  // CWV's pin: a 4.845 s section start snaps to frame 145 at 30 fps, so 1.0056 s lands on frame 31, not 30.
  assert.deepEqual((await pin(30, [0, 1.0056, 2.0056], 4.845)).frames, [0, 31, 61]);
  assert.deepEqual((await pin(30, [0, 1.0056, 2.0056], null)).frames, [0, 30, 60]);
  // Checked by hand (decimal half-up): L = 5.1 s is 152.847 -> 153 at 29.97, 122.28 -> 122 at 23.976 and 127.5 at 25,
  // where 5.1 is 5.09999... in binary so it rounds to 127. The Standard end at 62 bpm is 32.70 s.
  const std = bounds(7);
  assert.ok(close(std[std.length - 1], 32.6968, 1e-3));
  assert.deepEqual((await pin(29.97, std, null, 'classic')).frames, [0, 153, 269, 385, 501, 617, 733, 849, 980]);
  assert.deepEqual((await pin(23.976, std, null, 'classic')).frames, [0, 122, 215, 308, 401, 494, 586, 679, 784]);
  assert.deepEqual((await pin(25, std, null, 'classic')).frames, [0, 127, 224, 321, 418, 515, 611, 708, 817]);

  // The music delta moves cuts by a frame (hand-checked): 29.97 with s = 1.822 snaps the section to frame 55 (1.8352 s),
  // so delta = -13.2 ms and L lands on 152, not 153; 25 with s = 4.845 lands L on 128; 23.976 with s = 12.345 moves the end.
  const b4 = bounds(4);
  assert.deepEqual((await pin(29.97, b4, 1.822, 'classic')).frames, [0, 152, 268, 384, 500, 631]);
  assert.deepEqual((await pin(29.97, b4, null, 'classic')).frames, [0, 153, 269, 385, 501, 632]);
  assert.deepEqual((await pin(25, b4, 4.845, 'classic')).frames, [0, 128, 224, 321, 418, 527]);
  assert.deepEqual((await pin(23.976, b4, 12.345, 'classic')).frames, [0, 122, 215, 308, 401, 505]);
  assert.deepEqual((await pin(23.976, b4, null, 'classic')).frames, [0, 122, 215, 308, 401, 506]);

  // 2. Classic: shots 1..N laid from frame 0, then the lead-in gap of exactly frames[1] frames before them.
  const mc = mockDraft(29.97, { unsaved: true, adopt: { width: 3840, height: 2160 }, photos: ['p1'] });
  const bc = bounds(4), sc = 12.345;
  const picksC = [vid('v0', 2), vid('v1', 3), pho('p1'), vid('v2', 7)];
  const rc = await load('assemble.js', { projectId: 'p', draftName: 'THE END Credits 1', layout: 'classic', picks: picksC, boundaries: bc, L,
    music: { resourceId: 'm', sectionStart: sc }, clipSound: 'ambient', ambientDb: -18, sources, musicFadeOut: 1.5 })(project(mc));
  const fc = expectFrames(bc, 29.97, sc);
  assert.equal(rc.sequenceId, 'seq-new');
  assert.deepEqual(rc.frames, fc);
  const ins = kinds(mc.log, 'insert');
  assert.deepEqual(ins.map(x => x[1]), ['v0', 'v1', 'p1', 'v2'], 'Classic inserts shots 1..N only');
  // Before the gap Main starts at 0: shot k ends on frames[k+1] - frames[1].
  assert.ok(close(ins[0][2].endSeconds - ins[0][2].startSeconds, (fc[2] - fc[1]) / 29.97, 1e-9));
  assert.deepEqual(ins[2][2].startSeconds, 0, 'a photo starts at 0');
  const gi = mc.log.findIndex(x => x[0] === 'gap');
  assert.ok(gi > mc.log.map(x => x[0]).lastIndexOf('insert'), 'the gap goes in after the shots');
  assert.deepEqual(mc.log[gi].slice(1), [0, fc[1] / 29.97, fc[1]]);
  const gapRow = mc.clips.find(c => c.resourceId === null);
  assert.deepEqual([gapRow.startFrame, gapRow.endFrame], [0, fc[1]]);
  assert.deepEqual(shotRows(mc).map(c => [c.startFrame, c.endFrame]), [[fc[1], fc[2]], [fc[2], fc[3]], [fc[3], fc[4]], [fc[4], fc[5]]]);
  assert.ok(gi < mc.log.findIndex(x => x[0] === 'music'), 'music after the gap, over the whole video');
  assert.deepEqual(kinds(mc.log, 'music')[0][1], { startFrame: 0, endFrame: fc[5] });
  // 1920x1080 is set again after the first insert adopted 3840x2160.
  assert.ok(mc.log.map(x => x[0]).lastIndexOf('size') > mc.log.findIndex(x => x[0] === 'insert'));
  assert.deepEqual((await mc.d.meta()).frameSize, { width: 1920, height: 1080 });
  // 3. Cover transforms: portrait 3.1605, 3:4 photo 2.3704, 16:9 none (a 3840x2160 source is 16:9 too).
  const tf = Object.fromEntries(kinds(mc.log, 'transform').map(x => [x[1], x]));
  assert.deepEqual(Object.keys(tf).sort(), ['p1', 'v1']);
  assert.ok(close(tf.v1[2].x, 3.1605), 'portrait ' + tf.v1[2].x);
  assert.ok(close(tf.p1[2].x, 2.3704), '3:4 photo ' + tf.p1[2].x);
  assert.ok(close(tf.v1[2].x, A / (1080 / 1920), 1e-9) && tf.v1[2].y === tf.v1[2].x);
  assert.deepEqual(tf.p1[3], { x: 0, y: 0 });
  assert.equal(rc.covered, 2);
  // Clip sound Ambient: -18 dB on the videos (not the photo, not the music); the last shot and the music fade 1.5 s.
  assert.deepEqual(kinds(mc.log, 'volume').map(x => x.slice(1)), [['v0', -18], ['v1', -18], ['v2', -18]]);
  assert.deepEqual(kinds(mc.log, 'fade').map(x => x.slice(1)), [['v2', undefined, 1.5], ['music', 0, 1.5]]);
  assert.equal(rc.soundClips, 3);
  assert.equal(kinds(mc.log, 'commit').length, 1);
  assert.equal(kinds(mc.log, 'mute').length, 0, 'assemble leaves Off to decorate');
  assert.deepEqual(Object.keys(rc).sort(), ['clips', 'covered', 'fps', 'frames', 'notes', 'plannedFrames', 'sequenceId', 'soundClips']);
  assert.deepEqual(rc.plannedFrames, rc.frames, 'on plan: the laid frames are the planned ones');

  // 2b. An insert that rounds one frame long: frames are the laid clips' own, plannedFrames the grid, and a note.
  for (const layout of ['classic', 'full']) {
    const ml = mockDraft(29.97, { longAt: 1 });
    const picksL = (layout === 'full' ? [vid('v4', 1)] : []).concat(picksC);
    const rl = await load('assemble.js', { projectId: 'p', draftName: 'x', layout, picks: picksL, boundaries: bc, L,
      music: { resourceId: 'm', sectionStart: sc }, clipSound: 'ambient', ambientDb: -18, sources, musicFadeOut: 1.5 })(project(ml));
    const laid = shotRows(ml);
    const fromClips = (layout === 'classic' ? [0, laid[0].startFrame] : [0]).concat(laid.map(c => c.endFrame));
    assert.deepEqual(rl.frames, fromClips, layout + ': frames from the laid clips');
    assert.deepEqual(rl.plannedFrames, fc, layout + ': the planned grid');
    // The long insert (index 1) ends a frame late; lay() re-aims the next one at the grid, so only that cut moves.
    const moved = rl.frames.map((f, i) => f - fc[i]);
    const at = layout === 'classic' ? 3 : 2;
    assert.deepEqual(moved, fc.map((_, i) => (i === at ? 1 : 0)), layout + ': one cut a frame late ' + JSON.stringify(moved));
    assert.deepEqual(rl.notes, ['the cuts are off the planned frames']);
  }

  // 4. Decorate (Classic): the graphic over [0, end), then per shot the look and the Shot frame, one commit.
  mc.reopen();
  const cfgC = record(rc);
  const dc = await load('decorate.js', cfgC)(project(mc));
  assert.deepEqual(dc, { graphicAdded: true, looks: 4, looksKept: 0, looksSkipped: 0, shotFrames: 4, shotFramesKept: 0, muted: false, muteKept: false, committed: true, alreadyDone: false, notes: [] });
  const g = kinds(mc.log, 'graphic');
  assert.deepEqual(g.map(x => [x[1], x[2]]), [[{ startFrame: 0, endFrame: fc[5] }, 'THE END credits']]);
  const rows = shotRows(mc);
  for (const c of rows) assert.deepEqual(mc.effects[c.clipId].map(e => e.name), ['Cinematic look', 'Shot frame'], 'look then frame');
  assert.equal(mc.effects[gapRow.clipId], undefined, 'the gap gets nothing');
  const fp = rows.map(c => mc.effects[c.clipId][1].parameters);
  // Without a per-shot record a video stays still, with the video motion strength (0.5) ready in Adjust.
  assert.deepEqual(fp[0], { x: 50.73, y: 12.69, w: 42.6, srcAspect: 16 / 9, fps: 29.97, durationFrames: fc[2] - fc[1], originFrame: 0, fadeInSeconds: 0.5, fadeOutSeconds: 0, motion: 'none',
    strength: 0.5, direction: 1, axis: 'x' });
  assert.deepEqual(fp.map(x => [x.fadeInSeconds, x.fadeOutSeconds]), [[0.5, 0], [0, 0], [0, 0], [0, 1.13]], 'first fades in, last fades out');
  assert.deepEqual(fp.map(x => x.durationFrames), [fc[2] - fc[1], fc[3] - fc[2], fc[4] - fc[3], fc[5] - fc[4]]);
  assert.ok(close(fp[1].srcAspect, 0.5625, 1e-9));
  assert.deepEqual(fp[2], { x: 50.73, y: 12.69, w: 42.6, srcAspect: 0.75, fps: 29.97, durationFrames: fc[4] - fc[3], originFrame: 0, fadeInSeconds: 0, fadeOutSeconds: 0, motion: 'push-in', strength: 1, direction: 1, axis: 'x' });
  assert.deepEqual(mc.effects[rows[0].clipId][0].parameters, { strength: 0.5 });
  // Editable definitions carry this clip's values as defaults; Classic exposes the window; every shot (video and
  // photo) gets its motion and motion strength.
  const ed = rows.map(c => mc.effects[c.clipId][1].editableParameters);
  const dv = e => [e.key, e.defaultValue];
  assert.deepEqual(ed[0], [
    { key: 'x', label: 'Window X (%)', type: 'number', defaultValue: 50.73, min: 0, max: 100, step: 0.1 },
    { key: 'y', label: 'Window Y (%)', type: 'number', defaultValue: 12.69, min: 0, max: 100, step: 0.1 },
    { key: 'w', label: 'Window size (%)', type: 'number', defaultValue: 42.6, min: 5, max: 100, step: 0.1 },
    { key: 'fadeInSeconds', label: 'Fade in (s)', type: 'number', defaultValue: 0.5, min: 0, max: 3, step: 0.05 },
    { key: 'fadeOutSeconds', label: 'Fade out (s)', type: 'number', defaultValue: 0, min: 0, max: 3, step: 0.05 },
    { key: 'motion', label: 'Motion', type: 'select', defaultValue: 'none', options: ed[0][5].options },
    { key: 'strength', label: 'Motion strength', type: 'number', defaultValue: 0.5, min: 0, max: 2, step: 0.1 }]);
  assert.deepEqual(ed[3].map(dv), [['x', 50.73], ['y', 12.69], ['w', 42.6], ['fadeInSeconds', 0], ['fadeOutSeconds', 1.13], ['motion', 'none'], ['strength', 0.5]]);
  assert.deepEqual(ed[2].map(dv), [['x', 50.73], ['y', 12.69], ['w', 42.6], ['fadeInSeconds', 0], ['fadeOutSeconds', 0], ['motion', 'push-in'], ['strength', 1]]);
  assert.deepEqual(ed[2][5].options.map(o => o.value), ['none', 'push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift']);
  assert.deepEqual(ed[2][5].options.map(o => o.label), ['None', 'Push in', 'Pull out', 'Drift left', 'Drift right', 'Drift up', 'Drift down', 'Tilt', 'Push and drift']);
  assert.deepEqual(ed[2][6], { key: 'strength', label: 'Motion strength', type: 'number', defaultValue: 1, min: 0, max: 2, step: 0.1 });
  assert.deepEqual(mc.effects[rows[0].clipId][0].editableParameters, [{ key: 'strength', label: 'Look strength', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.05 }]);
  assert.equal(kinds(mc.log, 'commit').length, 2);
  // 5. Idempotent: a retry adds nothing and does not commit; an Adjust edit on an existing effect survives.
  mc.effects[rows[1].clipId][1].parameters = { ...fp[1], w: 30 };
  mc.reopen();
  const dc2 = await load('decorate.js', cfgC)(project(mc));
  assert.deepEqual(dc2, { graphicAdded: false, looks: 0, looksKept: 4, looksSkipped: 0, shotFrames: 0, shotFramesKept: 4, muted: false, muteKept: false, committed: false, alreadyDone: true, notes: [] });
  assert.equal(kinds(mc.log, 'commit').length, 2);
  assert.equal(kinds(mc.log, 'graphic').length, 1);
  assert.equal(kinds(mc.log, 'effect').length, 8);
  assert.equal(mc.effects[rows[1].clipId][1].parameters.w, 30, 'the Adjust edit is kept');

  // 6. Full frame: N+1 shots, no gap, window {0,0,100}, no fade-in on shot 0.
  const mf = mockDraft(25, { photos: ['p1'] });
  const bf = bounds(4);
  const rf = await load('assemble.js', { projectId: 'p', draftName: 'x', layout: 'full', picks: [vid('v4', 1)].concat(picksC), boundaries: bf, L,
    music: null, clipSound: 'full', ambientDb: -18, sources, musicFadeOut: 1.5 })(project(mf));
  const ff = expectFrames(bf, 25, null);
  assert.equal(kinds(mf.log, 'gap').length, 0, 'no gap in Full frame');
  assert.deepEqual(shotRows(mf).map(c => [c.resourceId, c.startFrame, c.endFrame]), [['v4', 0, ff[1]], ['v0', ff[1], ff[2]], ['v1', ff[2], ff[3]], ['p1', ff[3], ff[4]], ['v2', ff[4], ff[5]]]);
  assert.equal(rf.clips.length, 5);
  assert.deepEqual(kinds(mf.log, 'volume').map(x => x[2]), [0, 0, 0, 0], 'Full keeps 0 dB');
  assert.deepEqual(kinds(mf.log, 'fade').map(x => x.slice(1)), [['v2', undefined, 1.5]], 'no music: only the last shot fades');
  assert.equal(kinds(mf.log, 'music').length, 0);
  mf.reopen();
  // Per-shot motions (tecShotMotions): still videos move gently at frame strength 0.5, a moving one stays none, the
  // photo keeps its move at 1. byShot wins over byRid.
  const byShot = [{ motion: 'push-in', direction: 1, axis: 'y', frameStrength: 0.5 }, { motion: 'none', direction: 1, axis: 'y', frameStrength: 0.5 },
    { motion: 'drift-up', direction: -1, axis: 'y', frameStrength: 0.5 }, { motion: 'tilt', direction: -1, axis: 'y', frameStrength: 1 }, { motion: 'drift-left', direction: -1, axis: 'x', frameStrength: 0.5 }];
  const df = await load('decorate.js', record(rf, { layout: 'full', clipSound: 'full', look: { tsx: 'LK', strength: 0.5, on: false },
    photoMotion: { byRid: { p1: { motion: 'push-in', direction: 1, axis: 'x' } }, byShot } }))(project(mf));
  assert.equal(df.shotFrames, 5);
  assert.equal(df.looks, 0);
  const pf = shotRows(mf).map(c => mf.effects[c.clipId].map(e => e.name).join('|') && mf.effects[c.clipId][0].parameters);
  assert.ok(shotRows(mf).every(c => mf.effects[c.clipId].length === 1 && mf.effects[c.clipId][0].name === 'Shot frame'), 'look off: frame only');
  assert.deepEqual(pf.map(x => [x.x, x.y, x.w]), Array(5).fill([0, 0, 100]));
  assert.deepEqual(pf.map(x => [x.fadeInSeconds, x.fadeOutSeconds]), [[0, 0], [0, 0], [0, 0], [0, 0], [0, 1.13]]);
  assert.deepEqual(pf.map(x => [x.motion, x.direction, x.axis, x.strength]), byShot.map(m => [m.motion, m.direction, m.axis, m.frameStrength]), 'motions per shot');
  // Full frame: no window fields in the Inspector; every shot has its motion fields.
  const edf = shotRows(mf).map(c => mf.effects[c.clipId][0].editableParameters.map(e => e.key));
  assert.deepEqual(edf[0], ['fadeInSeconds', 'fadeOutSeconds', 'motion', 'strength']);
  assert.deepEqual(edf[3], ['fadeInSeconds', 'fadeOutSeconds', 'motion', 'strength']);
  assert.deepEqual(shotRows(mf).map(c => mf.effects[c.clipId][0].editableParameters.find(e => e.key === 'strength').defaultValue), [0.5, 0.5, 0.5, 1, 0.5]);
  assert.deepEqual(kinds(mf.log, 'graphic')[0][1], { startFrame: 0, endFrame: ff[5] });

  // 7. The rate changes on the first insert (a new Draft at 29.97 adopts 23.976 footage): a fresh Draft is laid at the
  // real rate and only it is committed; every frame is computed at 23.976.
  const drafts = [];
  const selR = { project: () => ({ createDraft: async () => { const x = mockDraft(29.97, { adoptFps: 23.976 }); drafts.push(x); return x.d; }, resource: id => ({ id }) }) };
  const rr = await load('assemble.js', { projectId: 'p', draftName: 'x', layout: 'classic', picks: picksC.filter(k => k.kind === 'video').concat([vid('v3', 1)]), boundaries: bc, L,
    music: { resourceId: 'm', sectionStart: sc }, clipSound: 'ambient', sources, musicFadeOut: 1.5 })(selR);
  assert.equal(drafts.length, 2, 'a fresh Draft once the rate is known');
  assert.equal(kinds(drafts[0].log, 'commit').length, 0, 'the first attempt is not saved');
  assert.equal(kinds(drafts[0].log, 'insert').length, 1, 'the first attempt stops after one insert');
  assert.equal(kinds(drafts[1].log, 'commit').length, 1);
  assert.equal(rr.fps, 23.976);
  const fr = expectFrames(bc, 23.976, sc);
  assert.deepEqual(rr.frames, fr);
  assert.deepEqual(shotRows(drafts[1]).map(c => c.endFrame), fr.slice(2));
  assert.equal(kinds(drafts[1].log, 'gap')[0][3], fr[1]);
  // Footage at the Draft's own rate lays the shots once.
  const once = [];
  await load('assemble.js', { projectId: 'p', draftName: 'x', layout: 'full', picks: [vid('v0', 0), vid('v1', 0)], boundaries: [0, 1, 2], L, music: null, clipSound: 'off', sources })(
    { project: () => ({ createDraft: async () => { const x = mockDraft(30, { adoptFps: 30 }); once.push(x); return x.d; }, resource: id => ({ id }) }) });
  assert.equal(once.length, 1);
  assert.equal(kinds(once[0].log, 'volume').length + kinds(once[0].log, 'fade').length, 0, 'Off sets no level in assemble');

  // 8. Off: decorate mutes the shots first (the target starts at the first shot, after the gap), then adds the rest.
  const mo = mockDraft(29.97, { unsaved: true, photos: ['p1'] });
  const ro = await load('assemble.js', { projectId: 'p', draftName: 'x', layout: 'classic', picks: picksC, boundaries: bc, L, music: { resourceId: 'm', sectionStart: sc }, clipSound: 'off', sources })(project(mo));
  mo.reopen();
  const cfgO = record(ro, { clipSound: 'off' });
  const dO = await load('decorate.js', cfgO)(project(mo));
  assert.equal(dO.muted, true);
  const mi = mo.log.findIndex(x => x[0] === 'mute');
  assert.deepEqual(mo.log[mi].slice(1), [{ startFrame: ro.frames[1], endFrame: ro.frames[5] }, []]);
  assert.ok(mi < mo.log.findIndex(x => x[0] === 'graphic'), 'mute comes first');
  assert.deepEqual(shotRows(mo).map(c => c.audioSourceIndexes), [[], [], null, []], 'photos keep null routing');
  assert.equal(mo.clips.find(c => c.clipId === 99).audioSourceIndexes, undefined, 'the music keeps its sound');
  mo.reopen();
  const dO2 = await load('decorate.js', cfgO)(project(mo));
  assert.deepEqual([dO2.muted, dO2.muteKept, dO2.committed], [false, true, false]);
  assert.equal(kinds(mo.log, 'mute').length, 1);
  // A mute failure fails the step and commits nothing.
  const bad = mockDraft(30); bad.clips.push({ clipId: 1, resourceId: 'v0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null });
  bad.d.setAudioTracks = async () => { throw Error('nope'); };
  await assert.rejects(load('decorate.js', { ...cfgO, frames: [0, 30] })({ draft: () => bad.d }), /mute the clips' own sound: nope/);
  assert.equal(bad.log.filter(x => x[0] === 'commit' || x[0] === 'graphic').length, 0);
  // Silent sources: a retry where the mute changes nothing (opCount 0) and everything exists does not commit.
  const ms = mockDraft(30, { silent: ['v0'] });
  ms.clips.push({ clipId: 1, resourceId: 'v0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null });
  ms.graphics.push({ name: 'THE END credits', clip: {} });
  ms.effects[1] = [{ name: 'Cinematic look', effectName: 'Cinematic look' }, { name: 'Shot frame', effectName: 'Shot frame' }];
  ms.d.commitAll = async () => { throw Error('Nothing to stage'); };
  const dS = await load('decorate.js', { ...cfgO, layout: 'full', frames: [0, 30] })({ draft: () => ms.d });
  assert.deepEqual([dS.muted, dS.muteKept, dS.committed, dS.alreadyDone], [false, true, false, true]);

  // 9. Partial states: a clip that already has its Shot frame but no look keeps its stack (the look would land after
  // the frame and tint the surround); a clip with only the look gets the frame after it.
  const mp = mockDraft(30);
  mp.clips.push({ clipId: 1, resourceId: 'v0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null },
    { clipId: 2, resourceId: 'v1', trackKind: 'main', startFrame: 30, endFrame: 60, audioSourceIndexes: null },
    { clipId: 3, resourceId: 'v2', trackKind: 'main', startFrame: 60, endFrame: 90, audioSourceIndexes: null });
  mp.effects[1] = [{ name: 'Shot frame', effectName: 'Shot frame' }];
  mp.effects[2] = [{ name: 'Cinematic look', effectName: 'Cinematic look' }];
  const dp = await load('decorate.js', record({ sequenceId: 's', fps: 30, frames: [0, 30, 60, 90] }, { layout: 'full' }))({ draft: () => mp.d });
  assert.deepEqual([dp.looks, dp.looksKept, dp.looksSkipped, dp.shotFrames, dp.shotFramesKept, dp.committed], [1, 1, 1, 2, 1, true]);
  assert.deepEqual([1, 2, 3].map(id => mp.effects[id].map(e => e.name)), [['Shot frame'], ['Cinematic look', 'Shot frame'], ['Cinematic look', 'Shot frame']]);
  assert.deepEqual(dp.notes, ['1 shot keeps its frame without the look']);

  // A label may come back in effectName only (name differs): still counted, nothing added, no commit.
  const mn = mockDraft(30);
  mn.clips.push({ clipId: 1, resourceId: 'v0', trackKind: 'main', startFrame: 0, endFrame: 30, audioSourceIndexes: null });
  mn.graphics.push({ name: 'THE END credits', clip: {} });
  mn.effects[1] = [{ name: 'Effect 1', effectName: 'Cinematic look' }, { name: 'Effect 2', effectName: 'Shot frame' }];
  const dn = await load('decorate.js', record({ sequenceId: 's', fps: 30, frames: [0, 30] }, { layout: 'full' }))({ draft: () => mn.d });
  assert.deepEqual([dn.looksKept, dn.shotFramesKept, dn.looks, dn.shotFrames, dn.committed], [1, 1, 0, 0, false]);
  assert.equal(mn.effects[1].length, 2);

  // 10. Inputs that do not fit the layout are refused before anything is created.
  let created = 0;
  await assert.rejects(load('assemble.js', { projectId: 'p', draftName: 'x', layout: 'full', picks: picksC, boundaries: bc, L, music: null, clipSound: 'off', sources })(
    { project: () => ({ createDraft: async () => { created++; return mockDraft(30).d; } }) }), /4 picks do not fit 6 boundaries \(Full frame\)/);
  assert.equal(created, 0);
  // An unknown source size is reported and left uncropped.
  const mu = mockDraft(30);
  const ru = await load('assemble.js', { projectId: 'p', draftName: 'x', layout: 'full', picks: [vid('zz', 0)], boundaries: [0, 1], L, music: null, clipSound: 'off', sources })(project(mu));
  assert.deepEqual(ru.notes, ['the size of zz is unknown, so it may show bars']);
  assert.equal(kinds(mu.log, 'transform').length, 0);
  // A clip whose level cannot be set is reported, not fatal.
  const mfail = mockDraft(30);
  const orig = mfail.d.setClipAudio;
  mfail.d.setClipAudio = async (o) => { if (o.clip.resourceId === 'v1') throw Error('no audio'); return orig(o); };
  const rfail = await load('assemble.js', { projectId: 'p', draftName: 'x', layout: 'full', picks: [vid('v0', 0), vid('v1', 0)], boundaries: [0, 1, 2], L, music: null, clipSound: 'ambient', sources })(project(mfail));
  assert.equal(rfail.soundClips, 1);
  assert.deepEqual(rfail.notes, ['the sound of 1 clip could not be set']);
  console.log(JSON.stringify({ scriptsEdit: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
