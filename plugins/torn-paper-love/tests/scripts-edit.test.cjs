// plugins/torn-paper-love/tests/scripts-edit.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'scripts');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(dir, name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
const W = 1440, H = 1080;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// Models Selects: a Draft created in this run_script call has no saved audio-track inventory, so setAudioTracks throws
// until it is reopened (selects.draft) in a later call; commitAll runs once per call. A new Draft adopts its first
// clip's frame size (`adopt`) and often its rate (`adoptFps`) on the first insert, over an earlier setFrameSize.
// Photo resources (`photos`) and videos without an audio stream (`silent`) have no sound: muting leaves their routing
// null. setAudioTracks returns an EditDiff whose opCount counts the clips whose routing changed. clips() returns only
// the fields the real ClipInfo has (no source start, no volume).
function mockDraft(fps, { unsaved = false, adopt = { width: 1920, height: 1080 }, photos = [], silent = [], adoptFps = null } = {}) {
  const log = [], clips = [], graphics = [], effects = {};
  let frame = 0, committed = false, frameSize = { width: 1920, height: 1080 }, inserted = false;
  const info = c => ({ clipId: c.clipId, trackId: c.trackKind, resourceId: c.resourceId, trackKind: c.trackKind, startFrame: c.startFrame, endFrame: c.endFrame, videoIndex: null, audioSourceIndexes: c.audioSourceIndexes === undefined ? null : c.audioSourceIndexes, color: null });
  const addMain = (resourceId, len) => { clips.push({ clipId: clips.length + 1, resourceId, trackKind: 'main', startFrame: frame, endFrame: frame + len, audioSourceIndexes: null }); frame += len; };
  return { log, clips, graphics, effects, addMain, reopen() { unsaved = false; committed = false; }, d: {
    meta: async () => ({ fps, frameSize: { ...frameSize } }),
    setFrameSize: async (s) => { frameSize = { ...s }; log.push(['size', s]); },
    insertResource: async ({ resourceId, sourceRange }) => {
      if (!inserted) { inserted = true; frameSize = { ...adopt }; if (adoptFps) fps = adoptFps; }
      if (photos.includes(resourceId) && sourceRange.endSeconds > 5 + 1e-9) throw Error('invalid_source_range');
      addMain(resourceId, Math.round((sourceRange.endSeconds - sourceRange.startSeconds) * fps));
      log.push(['insert', resourceId, sourceRange]);
    },
    clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(info),
    clipTransform: async () => ({ enabled: true, scale: { x: 1, y: 1 }, position: { x: 0, y: 0 }, rotation: 0, anchor: { x: 0, y: 0 } }),
    setClipTransform: async (o) => log.push(['transform', o.clip.clipId, o.scale, o.position]),
    rangeAtFrames: async (a, b) => ({ a, b }),
    setAudioTracks: async (o) => {
      if (unsaved) throw Error('audio_track_inventory_unavailable: Could not load audio tracks for draft "x"');
      let opCount = 0;
      for (const c of clips) {
        if (c.trackKind !== 'main' || photos.includes(c.resourceId) || silent.includes(c.resourceId)) continue;
        if (JSON.stringify(c.audioSourceIndexes) !== JSON.stringify(o.audioSourceIndexes)) { c.audioSourceIndexes = [...o.audioSourceIndexes]; opCount++; }
      }
      log.push(['mute', o.audioSourceIndexes, o.target]);
      return { beforeDurationFrames: frame, afterDurationFrames: frame, deltaFrames: 0, opCount, removedDurationFrames: 0, warnings: [] };
    },
    overlayResource: async (o) => { clips.push({ clipId: 99, resourceId: o.resource.id, trackKind: 'audio', startFrame: 0, endFrame: frame }); log.push(['music', o.sourceStartSeconds, o.over]); return { inserted: 1 }; },
    setClipAudio: async (o) => {
      if (o.volumeDb != null) { const c = clips.find(x => x.clipId === o.clip.clipId); c.volumeDb = o.volumeDb; log.push(['volume', o.clip.clipId, o.volumeDb]); }
      if (o.fadeOutSeconds != null || o.fadeInSeconds != null) log.push(['fade', o.clip.clipId, o.fadeInSeconds, o.fadeOutSeconds]);
    },
    addMotionGraphic: async (o) => { graphics.push({ name: o.label, clip: {} }); log.push(['letters', o.within, o.label, o.parameters, o.editableParameters, o.tsxCode]); return { clipId: 200, startFrame: o.within.a, endFrame: o.within.b }; },
    addVideoEffect: async (o) => { (effects[o.clip.clipId] = effects[o.clip.clipId] || []).push({ name: o.label, effectName: o.label }); log.push(['effect', o.clip.clipId, o.label, o.parameters, o.editableParameters, o.tsxCode]); return { clipId: o.clip.clipId, effectIndex: 0 }; },
    motionGraphics: async () => graphics.map(g => ({ ...g })),
    videoEffects: async (clip) => (effects[clip.clipId] || []).map(e => ({ ...e })),
    commitAll: async (reason) => {
      if (committed) throw Error('Cannot commitAll draft: it was already committed in this run_script call.');
      committed = true; log.push(['commit', reason]); return { createdDraftId: 'seq-new' };
    },
  } };
}
const mains = m => m.clips.filter(c => c.trackKind === 'main');
const count = (m, k) => m.log.filter(x => x[0] === k).length;

// The cover-position helper, pulled from assemble.js between its markers.
const src = fs.readFileSync(path.join(dir, 'assemble.js'), 'utf8');
const block = src.slice(src.indexOf('// tpl-cover:start'), src.indexOf('// tpl-cover:end'));
assert.ok(block.length > 20, 'tpl-cover markers');
const ctx = {}; vm.runInNewContext(block + '\nthis.tplCoverPositionY = tplCoverPositionY;', ctx);
const posY = ctx.tplCoverPositionY;

// Standard fixture shape for N = 3 (Quick): units 0,2,4,6,7,8,10 at 85.6 BPM's 8th note.
const unit = 60 / 85.6 / 2;
const targets = [0, 2, 4, 6, 7, 8, 10].map(u => u * unit);
const order = [['p1', 'photo'], ['v1', 'video'], ['p2', 'photo']];
const slots = [...order, ...order].map(([rid, kind]) => kind === 'video' ? { rid, kind, startSeconds: 2 } : { rid, kind, startSeconds: 0 });
const PORTRAIT = 1440 / (1080 * 3000 / 4000); // 3000x4000 cover-fills 1440x1080 at 1.7778
const vis = { p1: { cover: PORTRAIT, anchorY: 0.4 }, p2: { cover: 4 / 3, anchorY: 0.5 }, v1: { cover: 1, anchorY: 0.5 } };
const music = { resourceId: 'r9', sectionStart: 4.847 };
const delta = (fps, s = music.sectionStart) => s - Math.round(s * fps) / fps;
const aim = (fps, s) => targets.slice(1).map(t => Math.round((t + delta(fps, s)) * fps));
const cfgA = (extra = {}) => ({ projectId: 'p', draftName: 'Torn Paper Love Night 1', slots, targets, music, clipSound: 'ambient', ambientDb: -18, vis, W, H, ...extra });

(async () => {
  // ---- Cover position (SDK: % of the frame height from the centre, +Y up). The visible window's centre sits at
  // anchorY of the scaled image height, clamped so no bars show; 0.5 = centre crop = 0.
  assert.equal(posY(PORTRAIT, 0.5), 0);
  assert.equal(posY(1, 0.4), 0, 'no excess, no shift');
  // Scaled height 1.7778 H; window centre at 0.4 * 1.7778 H = 0.7111 H, top at 0.2111 H; centred top 0.3889 H;
  // the image moves down by 0.1778 H = 17.78 % of H, which is -17.78 with +Y up.
  assert.ok(near(posY(PORTRAIT, 0.4), -(0.1 * PORTRAIT) * 100), 'portrait 40 % ' + posY(PORTRAIT, 0.4));
  // Too little excess to centre the window at 40 %: clamped to the image's top edge (shift = half the excess).
  assert.ok(near(posY(1.1, 0.4), -(0.1 / 2) * 100), 'clamped at the top edge ' + posY(1.1, 0.4));
  assert.ok(near(posY(1.1, 0), -(0.1 / 2) * 100));
  assert.ok(near(posY(1.1, 1), (0.1 / 2) * 100));

  // ---- Assemble at the Draft's own rate: 2N clips, 1440x1080 after the first insert, cover transforms, ambient on
  // videos, music overlay with a 0.12 s fade, one commit.
  const m = mockDraft(30, { unsaved: true, photos: ['p1', 'p2'], adopt: { width: 3000, height: 4000 } });
  const selects = { project: () => ({ createDraft: async () => m.d, resource: id => ({ id }) }), draft: () => m.d };
  const r = await load('assemble.js', cfgA())(selects);
  assert.deepEqual(Object.keys(r).sort(), ['ambientClips', 'fps', 'frames', 'notes', 'placed', 'sequenceId', 'totalFrames']);
  assert.equal(r.sequenceId, 'seq-new');
  assert.equal(r.fps, 30);
  const want30 = aim(30);
  assert.deepEqual(mains(m).map(c => c.endFrame), want30);
  assert.deepEqual(r.frames, [0, ...want30], 'frames read back from Main');
  assert.equal(r.totalFrames, want30[5]);
  assert.equal(r.placed, 6);
  const firstInsert = m.log.findIndex(x => x[0] === 'insert');
  assert.ok(m.log.findIndex(x => x[0] === 'size') < firstInsert, 'canvas set on the new Draft');
  assert.ok(m.log.map(x => x[0]).lastIndexOf('size') > firstInsert, 'canvas set again after the first insert');
  assert.deepEqual(m.log.filter(x => x[0] === 'size').map(x => x[1]), [{ width: W, height: H }, { width: W, height: H }]);
  assert.deepEqual((await m.d.meta()).frameSize, { width: W, height: H });
  // Photos hold from 0 for their frame-snapped slot; a video uses the same source start on both passes.
  const ins = m.log.filter(x => x[0] === 'insert');
  assert.deepEqual(ins.map(x => x[1]), ['p1', 'v1', 'p2', 'p1', 'v1', 'p2']);
  const lens = want30.map((f, i) => f - (i ? want30[i - 1] : 0));
  ins.forEach((x, i) => {
    const s0 = x[1] === 'v1' ? 2 : 0;
    assert.equal(x[2].startSeconds, s0, 'source start ' + i);
    assert.ok(near(x[2].endSeconds, s0 + lens[i] / 30), 'source end ' + i);
  });
  // Transforms: the portrait photo is anchored 40 % from the top, the landscape one centred; the 4:3 video is untouched.
  const t = m.log.filter(x => x[0] === 'transform').map(x => [m.clips.find(c => c.clipId === x[1]).resourceId, x[2], x[3]]);
  assert.deepEqual(t.map(x => x[0]), ['p1', 'p2', 'p1', 'p2']);
  for (const [rid, scale, position] of t) {
    assert.equal(scale.x, vis[rid].cover); assert.equal(scale.y, vis[rid].cover);
    assert.equal(position.x, 0);
    assert.ok(near(position.y, posY(vis[rid].cover, vis[rid].anchorY)), rid + ' position ' + position.y);
  }
  assert.ok(t[0][2].y < 0, 'portrait moves down (+Y is up)');
  // Ambient on the two video clips only; the music keeps 0 dB and gets its fade.
  assert.deepEqual(m.log.filter(x => x[0] === 'volume').map(x => [m.clips.find(c => c.clipId === x[1]).resourceId, x[2]]), [['v1', -18], ['v1', -18]]);
  assert.equal(r.ambientClips, 2);
  assert.equal(m.clips.find(c => c.clipId === 99).volumeDb, undefined);
  const mus = m.log.find(x => x[0] === 'music');
  assert.equal(mus[1], 4.847);
  assert.deepEqual(mus[2], { a: 0, b: want30[5] }, 'music over the whole edit');
  assert.deepEqual(m.log.find(x => x[0] === 'fade').slice(1), [99, 0, 0.12]);
  assert.equal(count(m, 'mute'), 0, 'assemble leaves muting to decorate');
  assert.deepEqual(m.log.filter(x => x[0] === 'commit'), [['commit', 'Torn Paper Love: pictures']]);
  assert.ok(m.log.findIndex(x => x[0] === 'volume') < m.log.findIndex(x => x[0] === 'commit'));
  assert.deepEqual(r.notes, []);

  // ---- Footage at another rate: the first insert switches the Draft, so the clips are laid again on a fresh Draft
  // aimed at the real rate (frames recomputed from the second targets). Only that Draft is committed.
  for (const real of [25, 29.97]) {
    const drafts = [];
    const sel = { project: () => ({ createDraft: async () => { const x = mockDraft(30, { adoptFps: real, photos: ['p1', 'p2'] }); drafts.push(x); return x.d; }, resource: id => ({ id }) }) };
    const rr = await load('assemble.js', cfgA())(sel);
    assert.equal(drafts.length, 2, real + ': a fresh Draft once the rate is known');
    assert.equal(count(drafts[0], 'commit'), 0, real + ': the first attempt is not saved');
    assert.equal(count(drafts[1], 'commit'), 1);
    assert.equal(rr.fps, real);
    const want = aim(real);
    assert.deepEqual(mains(drafts[1]).map(c => c.endFrame), want, real + ' frames');
    assert.deepEqual(rr.frames, [0, ...want]);
    assert.equal(rr.totalFrames, want[5]);
    const vIns = drafts[1].log.filter(x => x[0] === 'insert' && x[1] === 'v1').map(x => x[2].startSeconds);
    assert.deepEqual(vIns, [2, 2], 'same video start on both passes');
    assert.deepEqual((await drafts[1].d.meta()).frameSize, { width: W, height: H });
  }
  // Footage at the Draft's own rate lays the clips once.
  const once = [];
  await load('assemble.js', cfgA({ music: null }))({ project: () => ({ createDraft: async () => { const x = mockDraft(30, { adoptFps: 30 }); once.push(x); return x.d; }, resource: id => ({ id }) }) });
  assert.equal(once.length, 1);
  assert.equal(count(once[0], 'music'), 0, 'no music, no overlay');
  assert.deepEqual(mains(once[0]).map(c => c.endFrame), aim(30, 0), 'no music, no offset');

  // Clip sound Full and Off keep the level (Off mutes in decorate).
  for (const mode of ['full', 'off']) {
    const x = mockDraft(30);
    const o = await load('assemble.js', cfgA({ clipSound: mode }))({ project: () => ({ createDraft: async () => x.d, resource: id => ({ id }) }) });
    assert.equal(count(x, 'volume'), 0, mode);
    assert.equal(o.ambientClips, 0);
  }
  // A clip whose level cannot be set is reported, not fatal.
  const failing = mockDraft(30);
  const origAudio = failing.d.setClipAudio;
  failing.d.setClipAudio = async (o) => { if (o.volumeDb != null && o.clip.clipId === 5) throw Error('no audio'); return origAudio(o); };
  const fo = await load('assemble.js', cfgA())({ project: () => ({ createDraft: async () => failing.d, resource: id => ({ id }) }) });
  assert.equal(fo.ambientClips, 1);
  assert.deepEqual(fo.notes, ['the sound of 1 clip could not be lowered under the music']);
  // A picture without a vis entry is left uncropped and reported.
  const nv = mockDraft(30);
  const no = await load('assemble.js', cfgA({ vis: { p1: vis.p1, v1: vis.v1 } }))({ project: () => ({ createDraft: async () => nv.d, resource: id => ({ id }) }) });
  assert.deepEqual(nv.log.filter(x => x[0] === 'transform').map(x => nv.clips.find(c => c.clipId === x[1]).resourceId), ['p1', 'p1']);
  assert.deepEqual(no.notes, ['1 picture has no measured size, so it may show bars']);
  // Targets must hold one more boundary than there are slots; nothing is placed or committed otherwise.
  const bad = mockDraft(30);
  await assert.rejects(load('assemble.js', cfgA({ targets: targets.slice(1) }))({ project: () => ({ createDraft: async () => bad.d, resource: id => ({ id }) }) }), /targets/);
  assert.equal(count(bad, 'insert') + count(bad, 'commit'), 0);

  // ---- Decorate: next call reopens the saved Draft. Mute first (Off), then one Torn photo per Main clip in Main order
  // with holdFrames and originFrame filled in, then the Ransom letters over [startFrame, endFrame), one commit.
  m.reopen();
  const tornEditable = [{ key: 'look', label: 'Faded film', type: 'number', defaultValue: 0.35, min: 0, max: 1, step: 0.05 }];
  const lettersEditable = [{ key: 'word1', label: 'Word 1', type: 'text', defaultValue: 'MY' }];
  const cfgD = (extra = {}) => ({ sequenceId: 'seq-new', mute: true, photos: ['p1', 'p2'],
    torn: { tsx: 'TORN', editable: tornEditable, clips: slots.map((s, i) => ({ rid: s.rid, sourceStartSeconds: s.kind === 'video' ? 2 : 0, data: { seed: 100 + (i % 3), entry: i === 0 ? 'slide' : 'none', vis: { x: 0, y: 0, w: 100, h: 100 } } })) },
    letters: { tsx: 'LETTERS', parameters: { word1: 'MY', word2: 'LOVE', ticks: [11, 21] }, editable: lettersEditable, startFrame: want30[0], endFrame: want30[5] }, ...extra });
  const d1 = await load('decorate.js', cfgD())(selects);
  assert.deepEqual(d1, { effects: 6, effectsKept: 0, lettersAdded: true, muted: true, muteKept: false, committed: true, alreadyDone: false });
  const mi = m.log.findIndex(x => x[0] === 'mute');
  assert.deepEqual(m.log[mi][1], []);
  assert.deepEqual(m.log[mi][2], { a: 0, b: want30[5] });
  assert.ok(mi < m.log.findIndex(x => x[0] === 'effect') && mi < m.log.findIndex(x => x[0] === 'letters'), 'mute comes first');
  assert.deepEqual(mains(m).map(c => c.audioSourceIndexes), [null, [], null, null, [], null], 'photos keep null routing');
  const eff = m.log.filter(x => x[0] === 'effect');
  assert.deepEqual(eff.map(x => x[1]), mains(m).map(c => c.clipId), 'one Torn photo per Main clip, in order');
  eff.forEach((x, i) => {
    const c = mains(m)[i];
    assert.equal(x[2], 'Torn photo');
    assert.equal(x[5], 'TORN');
    assert.deepEqual(x[3], { ...cfgD().torn.clips[i].data, holdFrames: c.endFrame - c.startFrame, originFrame: c.resourceId === 'v1' ? 60 : 0 });
    assert.deepEqual(x[4], tornEditable);
  });
  const lt = m.log.find(x => x[0] === 'letters');
  assert.deepEqual(lt[1], { a: want30[0], b: want30[5] }, 'letters range');
  assert.equal(lt[2], 'Ransom letters');
  assert.deepEqual(lt[3], cfgD().letters.parameters);
  assert.deepEqual(lt[4], lettersEditable);
  assert.equal(lt[5], 'LETTERS');
  assert.deepEqual(m.log.filter(x => x[0] === 'commit').map(x => x[1]), ['Torn Paper Love: pictures', 'Torn Paper Love: letters and paper']);
  // A second run is a no-op: nothing added, no mute change, nothing committed.
  m.reopen();
  const d2 = await load('decorate.js', cfgD())(selects);
  assert.deepEqual(d2, { effects: 0, effectsKept: 6, lettersAdded: false, muted: false, muteKept: true, committed: false, alreadyDone: true });
  assert.equal(count(m, 'effect'), 6);
  assert.equal(count(m, 'letters'), 1);
  assert.equal(count(m, 'mute'), 1);
  assert.equal(count(m, 'commit'), 2, 'no second decorate commit');

  // A partial earlier attempt: letters exist and one clip already has its Torn photo.
  const mp = mockDraft(30, { photos: ['p1', 'p2'] });
  lens.forEach((n, i) => mp.addMain(slots[i].rid, n));
  mp.graphics.push({ name: 'Ransom letters', clip: {} }); mp.effects[2] = [{ name: 'Torn photo', effectName: 'Torn photo' }];
  const part = await load('decorate.js', cfgD({ mute: false }))({ draft: () => mp.d });
  assert.deepEqual(part, { effects: 5, effectsKept: 1, lettersAdded: false, muted: false, muteKept: false, committed: true, alreadyDone: false });
  assert.deepEqual(mp.log.filter(x => x[0] === 'effect').map(x => x[1]), [1, 3, 4, 5, 6]);
  assert.equal(count(mp, 'mute'), 0, 'no mute unless asked');

  // originFrame follows the Draft's rate: a 2 s source start is frame 50 at 25 fps.
  const m25 = mockDraft(25, { photos: ['p1', 'p2'] });
  aim(25).forEach((f, i, a) => m25.addMain(slots[i].rid, f - (i ? a[i - 1] : 0)));
  await load('decorate.js', cfgD({ mute: false }))({ draft: () => m25.d });
  assert.deepEqual(m25.log.filter(x => x[0] === 'effect').map(x => x[3].originFrame), [0, 50, 0, 0, 50, 0]);

  // Stale config: a clip count or resource that doesn't match Main rejects before any change.
  for (const extra of [{ torn: { ...cfgD().torn, clips: cfgD().torn.clips.slice(1) } }, { torn: { ...cfgD().torn, clips: cfgD().torn.clips.map((c, i) => i === 2 ? { ...c, rid: 'zz' } : c) } }]) {
    const ms = mockDraft(30, { photos: ['p1', 'p2'] });
    lens.forEach((n, i) => ms.addMain(slots[i].rid, n));
    await assert.rejects(load('decorate.js', cfgD(extra))({ draft: () => ms.d }), /don't match/);
    assert.equal(count(ms, 'mute') + count(ms, 'effect') + count(ms, 'letters') + count(ms, 'commit'), 0);
  }

  // A mute failure fails the step and commits nothing.
  const bm = mockDraft(30, { photos: ['p1', 'p2'] });
  lens.forEach((n, i) => bm.addMain(slots[i].rid, n));
  bm.d.setAudioTracks = async () => { throw Error('nope'); };
  await assert.rejects(load('decorate.js', cfgD())({ draft: () => bm.d }), /mute the clips' own sound: nope/);
  assert.equal(count(bm, 'commit') + count(bm, 'effect') + count(bm, 'letters'), 0);

  // Silent videos keep null routing after muting: opCount 0 means nothing to mute; the rest still commits.
  const sil = mockDraft(30, { photos: ['p1', 'p2'], silent: ['v1'] });
  lens.forEach((n, i) => sil.addMain(slots[i].rid, n));
  const ds = await load('decorate.js', cfgD())({ draft: () => sil.d });
  assert.deepEqual(ds, { effects: 6, effectsKept: 0, lettersAdded: true, muted: false, muteKept: true, committed: true, alreadyDone: false });
  // Retry after a landed but unreported commit: the silent clip's null routing sends the mute again, it changes
  // nothing (opCount 0), and nothing is committed ("Nothing to stage" otherwise).
  sil.reopen();
  sil.d.commitAll = async () => { throw Error('Nothing to stage'); };
  const dsr = await load('decorate.js', cfgD())({ draft: () => sil.d });
  assert.deepEqual(dsr, { effects: 0, effectsKept: 6, lettersAdded: false, muted: false, muteKept: true, committed: false, alreadyDone: true });
  assert.equal(count(sil, 'mute'), 2, 'the mute was attempted again');

  // Payload size with the real fonts (the letters' parameters carry them), once the fonts lane is merged.
  const fontDir = path.join(root, 'assets', 'fonts');
  if (fs.existsSync(fontDir)) {
    const fonts = {};
    for (const f of fs.readdirSync(fontDir).filter(f => f.endsWith('.woff2.b64'))) fonts[f] = 'data:font/woff2;base64,' + fs.readFileSync(path.join(fontDir, f), 'utf8').trim();
    const looks = fs.existsSync(path.join(fontDir, 'looks.json')) ? JSON.parse(fs.readFileSync(path.join(fontDir, 'looks.json'), 'utf8')) : {};
    const lettersTsx = fs.existsSync(path.join(root, 'assets', 'ransom-letters.tsx')) ? fs.readFileSync(path.join(root, 'assets', 'ransom-letters.tsx'), 'utf8') : '';
    const cfg = cfgD({ letters: { ...cfgD().letters, tsx: lettersTsx, parameters: { ...cfgD().letters.parameters, looks, fonts } } });
    const payload = fs.readFileSync(path.join(dir, 'decorate.js'), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg));
    assert.ok(payload.length < 250 * 1024, 'decorate payload ' + payload.length);
  } else console.log('payload size check skipped: assets/fonts not merged yet');
  console.log(JSON.stringify({ scriptsEdit: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
