// plugins/summer-trip/tests/adapter.test.cjs
// Offline test of the headless driver's Summer Trip half (dev/adapter.mjs + dev/expect.mjs): plan, run_script configs
// (checked by running the real scripts/assemble.js and scripts/decorate.js on a small Selects mock), the real-fps
// re-plan, the visible-events list, readback expectations and their check. No app, no kit, no ffmpeg.
'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const PLUGIN = path.resolve(__dirname, '..');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(PLUGIN, 'scripts', name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);

// A minimal Selects: a new Draft adopts `adoptFps` on its first insert; overlays of AUDIO rids go to audio tracks.
function mockProject({ adoptFps = null, audioRids = [] } = {}) {
  const drafts = [];
  const make = () => {
    let fps = 30, inserted = false, committed = false, next = 1, frameSize = { width: 1920, height: 1080 };
    const clips = [], graphics = [], effects = {}, transforms = {}, audio = {};
    const mainEnd = () => clips.filter(c => c.trackKind === 'main').reduce((a, c) => Math.max(a, c.endFrame), 0);
    const d = {
      meta: async () => ({ fps, frameSize: { ...frameSize } }),
      setFrameSize: async s => { frameSize = { ...s }; },
      insertResource: async ({ resourceId, sourceRange }) => {
        if (!inserted) { inserted = true; frameSize = { width: 1280, height: 720 }; if (adoptFps) fps = adoptFps; }
        const len = Math.round(sourceRange.endSeconds * fps) - Math.round(sourceRange.startSeconds * fps);
        const f = mainEnd();
        clips.push({ clipId: next++, resourceId, trackKind: 'main', startFrame: f, endFrame: f + len, audioSourceIndexes: null });
      },
      clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(c => ({ ...c })),
      clipTransform: async c => transforms[c.clipId] || { scale: { x: 1, y: 1 }, position: { x: 0, y: 0 } },
      setClipTransform: async x => { transforms[x.clip.clipId] = { scale: { ...x.scale }, position: { ...x.position } }; return {}; },
      rangeAtFrames: async (a, b) => ({ a, b }),
      overlayResource: async x => {
        const rid = x.resource.id, { a, b } = x.over;
        clips.push({ clipId: next++, resourceId: rid, trackKind: audioRids.includes(rid) ? 'audio' : 'video', startFrame: a, endFrame: b, audioSourceIndexes: null });
        return {};
      },
      removeClips: async rows => { for (const r of [].concat(rows)) clips.splice(clips.findIndex(c => c.clipId === r.clipId), 1); return {}; },
      setAudioTracks: async x => { let n = 0; for (const c of clips) if (c.trackKind === 'main' && c.endFrame > x.target.a && c.startFrame < x.target.b) { c.audioSourceIndexes = []; n++; } return { opCount: n }; },
      setClipAudio: async x => {
        const a = audio[x.clip.clipId] = audio[x.clip.clipId] || {};
        if (x.volumeDb != null && x.volumeKeys) throw Error('provide volumeDb or volumeKeys, not both');
        for (const k of ['volumeDb', 'fadeInSeconds', 'fadeOutSeconds']) if (x[k] != null) a[k] = x[k];
        if (x.volumeKeys) { a.volumeKeys = x.volumeKeys.map(k => ({ ...k })); delete a.volumeDb; }
        return { volumeDb: a.volumeKeys ? null : a.volumeDb ?? 0, volumeKeys: a.volumeKeys || [], fadeInSeconds: a.fadeInSeconds || 0, fadeOutSeconds: a.fadeOutSeconds || 0, diff: { opCount: 1 } };
      },
      addMotionGraphic: async x => { graphics.push({ name: x.label, clip: { startFrame: x.within.a, endFrame: x.within.b }, x }); return {}; },
      motionGraphics: async () => graphics.map(g => ({ name: g.name, clip: g.clip })),
      addVideoEffect: async x => { (effects[x.clip.clipId] = effects[x.clip.clipId] || []).push({ name: x.label, parameters: x.parameters }); return {}; },
      videoEffects: async c => (effects[c.clipId] || []).map(e => ({ name: e.name })),
      commitAll: async () => { if (committed) throw Error('already committed'); committed = true; return { createdDraftId: 'seq-' + drafts.length }; },
    };
    const m = { d, clips, graphics, effects, transforms, audio, reopen() { committed = false; } };
    drafts.push(m);
    return m;
  };
  const selects = { project: () => ({ createDraft: async () => make().d, resource: id => ({ id }) }), draft: () => drafts[drafts.length - 1].d };
  return { selects, drafts };
}
// The readback drive.mjs assembles (kit rows + graphics + the Summer Trip extra), taken from the mock.
function readbackOf(m, fps) {
  const rows = m.clips.filter(c => c.trackKind === 'main').sort((a, b) => a.startFrame - b.startFrame)
    .map(c => ({ rid: c.resourceId, s: c.startFrame, e: c.endFrame, asi: c.audioSourceIndexes, fx: (m.effects[c.clipId] || []).map(e => e.name) }));
  const video = m.clips.filter(c => c.trackKind === 'video').map(c => ({ rid: c.resourceId, s: c.startFrame, e: c.endFrame, asi: c.audioSourceIndexes,
    fx: (m.effects[c.clipId] || []).map(e => e.name), t: m.transforms[c.clipId] || null }));
  const levels = m.clips.map(c => { const a = m.audio[c.clipId] || {}; return { kind: c.trackKind, rid: c.resourceId, s: c.startFrame, e: c.endFrame, db: a.volumeKeys ? null : a.volumeDb ?? 0, keys: a.volumeKeys || [], fadeIn: a.fadeInSeconds || 0, fadeOut: a.fadeOutSeconds || 0 }; });
  return { frameSize: { width: 1920, height: 1080 }, fps, rows, graphics: m.graphics.map(g => ({ name: g.name, clip: g.clip })), hasAudio: {}, st: { video, levels } };
}

(async () => {
  const { createAdapter, ROW_DEFAULTS, ST_PANEL, loadScript, musicKind, expandEnv } = await import(pathToFileURL(path.join(PLUGIN, 'dev', 'adapter.mjs')).href);
  const { stVisibleEvents, stEvalCuts, stCheck, stKitExpectations, ST_NAMES } = await import(pathToFileURL(path.join(PLUGIN, 'dev', 'expect.mjs')).href);

  // An installed-plugin folder with one development cue (120 BPM, drop on beat 8 after 0.05 s) and a work dir.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-adapter-'));
  fs.mkdirSync(path.join(tmp, 'inst', 'assets', 'cues'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'inst', 'assets', 'cues', 'dev-manifest.json'), JSON.stringify({ version: 1, cues: [
    { id: 'dev-test', title: 'Dev: test', file: 'dev-test.mp3', muffledFile: 'dev-test-muffled.mp3', bpm: 120, firstBeat: 0.05, dropBeat: 8, dropSeconds: 4.05,
      duration: 60, usableEnd: 59, accepted: true, titleHits: null }] }));
  const A = await createAdapter({ pluginDir: PLUGIN, installedDir: path.join(tmp, 'inst'), workDir: path.join(tmp, 'work') });
  assert.equal(A.id, 'summer-trip');
  assert.ok(A.cues.some(c => c.id === 'dev-test' && c.dev));
  assert.equal(typeof A.P.stPlanBuild, 'function');
  assert.equal(typeof A.G.stTitleParameters, 'function');
  assert.equal(loadScript('const ST_X = 2;\nfunction stY() { return ST_X; }').stY(), 2);
  assert.equal(musicKind('none'), 'none'); assert.equal(musicKind({ own: '' }), 'own'); assert.equal(musicKind('dev-test'), 'cue');
  process.env.ST_TEST_PID = 'proj-1';
  assert.deepEqual(expandEnv({ pid: '${ST_TEST_PID}', music: { own: '${ST_TEST_PID}.mp3' } }), { pid: 'proj-1', music: { own: 'proj-1.mp3' } });

  // Footage: 8 videos of 20 s (v3 portrait, v5 4:3), 4 photos; capture months mostly July.
  const resources = Array.from({ length: 8 }, (_, i) => ({ rid: 'v' + i, name: 'v' + i, duration: 20, width: i === 3 ? 1080 : i === 5 ? 1440 : 1920, height: 1080 + (i === 3 ? 840 : 0), kind: 'video' }));
  const photos = Array.from({ length: 4 }, (_, i) => ({ rid: 'p' + i, name: 'p' + i, width: i ? 4000 : 3000, height: i ? 3000 : 4000, kind: 'photo' }));
  const months = Array(12).fill(0); months[6] = 5; months[0] = 2;
  const inv = { resources, photos, months };
  const roles = Object.keys(A.P.ST_QUERIES);
  const list = [];
  resources.forEach((r, i) => roles.forEach((role, k) => list.push({ rid: r.rid, role, t: 2 + ((i + k) % 8) * 2, score: 0.5 + 0.01 * k, sourceDuration: 20 })));
  const found = { list, failed: [] };

  // Search / inventory steps.
  const invStep = A.inventory({ pid: 'P', only: null }, { readOnly: true });
  assert.equal(invStep.script, 'scripts/inventory.js');
  assert.deepEqual(invStep.config, { projectId: 'P', only: null, known: {}, measureMs: 0, probeMs: 0 });
  const sStep = A.search({ pid: 'P' }, ['v0', 'v1']);
  assert.deepEqual(Object.keys(sStep.config.queries), [...roles, 'avoid', 'motion'], 'the roles and the two signal queries');
  assert.equal(A.searchBatch, ST_PANEL.SEARCH_BATCH);

  // ---- 1. Bundled-style cue, sound effects on, Draft at 29.97 fps (planned at 30).
  const row = { key: 'k1', pid: 'P', music: 'dev-test', sfx: true, place: 'ITALY', creditName: 'Quincy' };
  const s = A.plan({ row, seed: 1, inv, found });
  assert.ok(s.plan.ok);
  assert.equal(s.plan.montageShots, 8);
  assert.equal(s.texts.season, 'SUMMER', 'July is the most common capture month');
  assert.equal(s.texts.topMain, 'SUMMER');
  assert.equal(s.music.sectionKind, 'drop');
  assert.ok(Math.abs(s.music.sectionStart - 0.05) < 1e-9, 'drop section = dropBeat - 8 beats');
  assert.equal(s.music.grid.bundled, true);
  assert.equal(s.fpsGuess, 30);
  assert.ok(s.draftName.startsWith('SUMMER test k1 dev-test summer standard'));
  assert.equal(s.row.gridSound, ROW_DEFAULTS.gridSound);
  assert.equal(s.row.gridSound, 'volume');

  const audioStep = A.ensureAudio(s);
  assert.equal(audioStep.script, 'scripts/ensure-audio.js');
  assert.equal(audioStep.allowCommit, true);
  assert.deepEqual(audioStep.config.files.map(f => f.key), ['dry', 'wet', 'shutter-1', 'shutter-2', 'shutter-3', 'shutter-4', 'whoosh-1']);
  assert.equal(path.basename(audioStep.config.files[0].path), 'dev-test.mp3');
  assert.equal(path.basename(audioStep.config.files[1].path), 'dev-test-muffled.mp3');
  assert.ok(audioStep.config.files.every(f => !('matchByName' in f)), 'bundled cue and plugin files keep the name fallback');
  assert.ok(fs.readFileSync(path.join(PLUGIN, 'dev/adapter.mjs'), 'utf8').includes("{ key: 'dry', path: m.files.dry, matchByName: false }"), 'own music matches by path only');
  const sfxMan = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'sfx', 'manifest.json'), 'utf8'));
  for (const f of audioStep.config.files.slice(2)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex'), sfxMan[f.key].sha256, f.key + ' decoded');
  }
  const ids = { dry: 'm1', wet: 'w1', 'shutter-1': 's1', 'shutter-2': 's2', 'shutter-3': 's3', 'shutter-4': 's4', 'whoosh-1': 'wh' };
  const aStep = A.assemble(s, { ids, imported: Object.keys(ids), missing: [] });
  const ac = aStep.config;
  assert.equal(aStep.script, 'scripts/assemble.js');
  assert.deepEqual(Object.keys(ac).sort(), ['H', 'W', 'ambientDb', 'beats', 'clipSound', 'crossfadeFrames', 'draftName', 'fps', 'gridSound', 'introDuckDb', 'music', 'picks', 'projectId', 'schedule', 'sfx', 'sizes'].sort());
  assert.equal(ac.W, 1920); assert.equal(ac.H, 1080); assert.equal(ac.fps, 30);
  assert.deepEqual(Object.keys(ac.beats).sort(), ['bpm', 'delta', 'snaps']);
  assert.deepEqual(ac.beats.snaps, {}, 'bundled cues never snap');
  assert.equal(ac.picks.main.length, ac.schedule.mainBeats.length - 1);
  assert.ok(ac.picks.main.filter(p => p.kind === 'video').every(p => p.duration === 20), 'videos carry their source duration');
  assert.deepEqual(ac.picks.grid.map(p => p.quad), ['TL', 'TR', 'BR', 'BL']);
  assert.deepEqual(ac.music, { resourceId: 'm1', sectionStart: s.music.sectionStart, wetResourceId: 'w1' });
  assert.deepEqual(ac.sfx, { shutter: ['s1', 's2', 's3', 's4'], shutterSeconds: [0.17, 0.171, 0.171, 0.17], whoosh: 'wh', whooshSeconds: 0.864 });
  assert.equal(ac.clipSound, 'ambient'); assert.equal(ac.ambientDb, -18); assert.equal(ac.gridSound, 'volume');
  assert.equal(ac.introDuckDb, -7, 'intro lift on by default, as in the panel'); assert.equal(ROW_DEFAULTS.introDuckDb, -7);

  // Run the real assemble.js: the Draft adopts 29.97 fps, so the script re-lays at the real rate.
  const mock = mockProject({ adoptFps: 29.97, audioRids: Object.values(ids) });
  const a = await load('assemble.js', ac)(mock.selects);
  assert.equal(a.fps, 29.97);
  A.afterAssemble(s, a);
  assert.equal(s.fpsCheck.plannerAgrees, true, 'the planner F() and assemble.js agree at the real fps');
  assert.equal(s.replan.fps, 29.97);
  assert.equal(typeof s.replan.samePicks, 'boolean');
  const m1 = mock.drafts[mock.drafts.length - 1];
  m1.reopen();
  const dStep = A.decorate(s, a);
  const dc = dStep.config;
  assert.deepEqual(Object.keys(dc).sort(), ['endingMotion', 'filmFrame', 'fps', 'frames', 'gridPanel', 'gridPlaced', 'gridSound', 'labels', 'look', 'motion', 'mute', 'photos', 'placed', 'sequenceId', 'sizes', 'title', 'videoMotion'].sort());
  assert.deepEqual(dc.filmFrame.window, { w: 0.87, h: 0.84, radius: 0.02, feather: 0.012 });
  assert.equal(dc.look.strength, 0.45);
  const F = b => (b === 0 ? 0 : Math.round((b * 60 / 120 + a.frames.delta) * 29.97));
  assert.deepEqual(dc.title.parameters.wordTimes, [0.5, 1.5, 2.5, 3.5].map(b => F(b) / 29.97), 'title words on beats 0.5-3.5 at the real fps');
  assert.equal(dc.title.parameters.seasonPartTime, F(5) / 29.97);
  assert.equal(dc.title.parameters.seasonFullTime, F(6) / 29.97);
  assert.equal(dc.title.parameters.seasonPartLength, 3);
  assert.equal(dc.title.parameters.creditName, 'Quincy');
  assert.deepEqual(Object.keys(dc.title.parameters.fonts).sort(), ['ST Poppins Black', 'ST Poppins Bold', 'ST Poppins Light', 'ST Poppins Light Italic'], 'the title embeds its four Summer faces');
  assert.deepEqual(Object.keys(dc.labels.parameters.fonts).sort(), ['ST Gloock', 'ST Poppins Light', 'ST Poppins Light Italic']);
  assert.equal(dc.labels.parameters.place, 'ITALY');
  assert.equal(dc.labels.parameters.placeSeconds, (F(14) - F(12)) / 29.97);
  assert.ok(dc.title.editableParameters.every(e => 'defaultValue' in e));
  for (const [i, mm] of Object.entries(dc.motion.byClipIndex)) assert.ok(a.placed[Number(i)].kind === 'photo' && mm.cover >= 1 && mm.motion, 'motion on photo ' + i);
  const dec = await load('decorate.js', dc)({ draft: () => m1.d });
  assert.equal(dec.committed, true);

  // Visible events: 8 grid states by quadrant, Main cuts from beat 14 (not 9.5, not the end).
  const ev = A.visibleEvents(s);
  const grid = ev.filter(e => e.kind === 'grid');
  assert.deepEqual(grid.map(e => e.quad), ['TL', 'TR', 'BR', 'BL', 'TL', 'TR', 'BR', 'BL']);
  assert.deepEqual(grid.map(e => e.beat), [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5]);
  assert.deepEqual(grid.map(e => e.change).slice(0, 5), ['panel A in', 'panel B in', 'panel C in', 'panel D in', 'place in']);
  const cuts = ev.filter(e => e.kind === 'cut');
  assert.deepEqual(cuts.map(e => e.beat), [14, 16, 18, 20, 22, 25, 28, 30, 32, 34, 36]);
  assert.ok(!ev.some(e => e.beat === 9.5 && e.kind === 'cut'), 'the hidden opener -> place cut is not visible');
  assert.deepEqual(cuts.map(e => e.frame), cuts.map(e => a.frames.mainFrames[e.mainIndex]));
  assert.ok(ev.every(e => Math.abs(e.quantErrorSeconds) <= 0.5 / 29.97 + 1e-9), 'every visible event within half a frame');
  assert.deepEqual(cuts.filter(e => e.section === 'ending').map(e => e.beat), [32, 34, 36]);
  const evalCuts = stEvalCuts(s.plan.schedule, s.frames);
  assert.equal(evalCuts.fps, 29.97);
  assert.deepEqual(evalCuts.cuts, ev.map(e => e.frame));

  // Expectations and the check against the mock's resulting Draft.
  const exp = A.stExpected(s, a);
  assert.deepEqual(exp.frameSize, { width: 1920, height: 1080 });
  assert.deepEqual(exp.cuts, a.frames.mainFrames.slice(1));
  assert.deepEqual(exp.graphics.map(g => [g.name, g.startFrame, g.endFrame]), [[ST_NAMES.title, 0, F(8)], [ST_NAMES.labels, F(12), F(32)]]);
  assert.deepEqual(exp.effectsMain.slice(-3), [[ST_NAMES.look, ST_NAMES.filmFrame], [ST_NAMES.look, ST_NAMES.filmFrame], [ST_NAMES.look, ST_NAMES.filmFrame]]);
  assert.equal(exp.effectCounts[ST_NAMES.filmFrame], 3);
  const X = Math.max(2, Math.round(0.06 * 29.97));
  assert.deepEqual([exp.music.dry.startFrame, exp.music.dry.endFrame, exp.music.wet.startFrame, exp.music.wet.endFrame], [0, F(32) + X, F(32), F(40)]);
  assert.deepEqual(exp.sfx.clips.map(c => c.key), ['shutter1', 'shutter2', 'shutter3', 'shutter4', 'whooshDrop', 'whooshEnding']);
  assert.equal(exp.sfx.clips[4].endFrame, F(8));
  assert.equal(exp.sfx.clips[5].endFrame, F(32));
  assert.deepEqual(exp.clipSound, { mode: 'level', db: -18 });
  assert.equal(exp.grid.filter(g => g.effects.includes(ST_NAMES.gridPanel)).length, exp.effectCounts[ST_NAMES.gridPanel]);
  const kitExp = A.expected(s, a);
  assert.deepEqual(Object.keys(kitExp).sort(), ['cuts', 'fps', 'frameSize', 'graphics', 'noAdjacent']);
  assert.deepEqual(stKitExpectations(exp).cuts, kitExp.cuts);

  const rb = readbackOf(m1, 29.97);
  const ok = stCheck(rb, exp);
  assert.equal(ok.pass, true, JSON.stringify(ok.notes));
  // A shifted cut, a missing muffled clip, an extra film frame and a louder panel all fail their checks.
  const bad = JSON.parse(JSON.stringify(rb));
  bad.rows[5].e += 1; bad.rows[6].s += 1;
  assert.equal(stCheck(bad, exp).checks.cuts, false);
  const noWet = JSON.parse(JSON.stringify(rb));
  noWet.st.levels = noWet.st.levels.filter(l => l.rid !== 'w1');
  assert.equal(stCheck(noWet, exp).checks.music, false);
  const fx = JSON.parse(JSON.stringify(rb));
  fx.rows[2].fx.push(ST_NAMES.filmFrame);
  assert.equal(stCheck(fx, exp).checks.effectsMain, false);
  const loud = JSON.parse(JSON.stringify(rb));
  loud.st.levels.find(l => l.kind === 'video').db = 0;
  assert.equal(stCheck(loud, exp).checks.gridSound, false);
  const noSfx = JSON.parse(JSON.stringify(rb));
  noSfx.st.levels = noSfx.st.levels.filter(l => l.rid !== 'wh');
  assert.equal(stCheck(noSfx, exp).checks.sfx, false);
  // The dry music carries the intro lift (keyed, no constant level); a flat dry or a lift on the wrong frame fails.
  assert.deepEqual(exp.music.dry.keys.map(k => [Math.round(k.atSeconds * a.fps), k.volumeDb]), [[0, -7], [F(8) - 1, -7], [F(8), 0]]);
  assert.equal(exp.music.wet.keys, undefined);
  const flat = JSON.parse(JSON.stringify(rb));
  Object.assign(flat.st.levels.find(l => l.rid === 'm1'), { db: 0, keys: [] });
  assert.equal(stCheck(flat, exp).checks.music, false);
  const late = JSON.parse(JSON.stringify(rb));
  late.st.levels.find(l => l.rid === 'm1').keys[2].atSeconds += 2 / a.fps;
  assert.equal(stCheck(late, exp).checks.music, false);

  const rec = A.record(s, a);
  assert.deepEqual(rec.rec.visibleEvents, ev);
  assert.equal(rec.cuts.music, 'dev-test');
  assert.ok(A.captureFrames(s).every(f => Number.isInteger(f) && f >= 0 && f < a.frames.endFrame));

  // ---- 2. No music, Clip sound Off, look off, no photos, sfx off, Poster, Long, grid routing.
  const row2 = { key: 'k2', pid: 'P', music: 'none', length: 'long', preset: 'poster', clipSound: 'off', look: false, usePhotos: false, sfx: false, muffle: true, gridSound: 'routing', season: 'AUTUMN', line1: 'the best week of the whole' };
  const s2 = A.plan({ row: row2, seed: 2, inv, found });
  assert.equal(s2.music.kind, 'none');
  assert.equal(s2.music.grid.bpm, 120);
  assert.equal(s2.music.sectionStart, null);
  assert.equal(s2.plan.frames.delta, 0);
  assert.ok(s2.candidates.every(c => c.kind !== 'photo'), 'Use photos off');
  assert.equal(A.ensureAudio(s2), null, 'nothing to import');
  const ac2 = A.assembleConfig(s2, null);
  assert.equal(ac2.music, null);
  assert.equal(ac2.sfx, null);
  assert.equal(ac2.gridSound, 'routing');
  const mock2 = mockProject({ adoptFps: 29.97 });
  const a2 = await load('assemble.js', ac2)(mock2.selects);
  A.afterAssemble(s2, a2);
  assert.equal(s2.replan, null, 'planned at the real fps (the last one seen)');
  assert.equal(s2.fpsGuess, 29.97, 'later plans start from the real fps seen before');
  const dc2 = A.decorateConfig(s2, a2);
  assert.equal(dc2.look.gradeOff, true); assert.equal(dc2.look.strength, 0); // look off keeps the leak on the last montage clip
  assert.equal(dc2.mute, true);
  assert.deepEqual(dc2.title.parameters.wordTimes.length, 6);
  assert.equal(dc2.title.parameters.preset, 'poster');
  const exp2 = A.stExpected(s2, a2);
  assert.deepEqual(exp2.music, { none: true });
  assert.deepEqual(exp2.sfx, { none: true });
  assert.deepEqual(exp2.clipSound, { mode: 'off' });
  const lastM2 = exp2.effectsMain.length - 4;
  const noVm = fx2 => fx2.filter(n => n !== 'Video motion');
  assert.ok(exp2.effectsMain.every((fx2, i) => noVm(fx2).length === (i >= exp2.effectsMain.length - 3 || i === lastM2 ? 1 : 0)), 'look off: film frame on the ending, a strength-0 look (leak) only on the last montage clip');
  // Video motion: every montage video on Main (look on or off), never the opener, place, photos or ending clips.
  const photoIdx2 = new Set(a2.placed.filter(p => p.kind === 'photo').map(p => p.index));
  exp2.effectsMain.forEach((fx2, i) => assert.equal(fx2.includes('Video motion'), i >= 2 && i <= lastM2 && !photoIdx2.has(i), 'video motion @' + i));
  assert.equal(exp2.effectCounts['Video motion'], exp2.effectsMain.filter(fx2 => fx2.includes('Video motion')).length);
  assert.ok(exp2.effectCounts['Video motion'] > 0);
  assert.deepEqual(dc2.videoMotion, { tsx: dc2.videoMotion.tsx, strength: 1 });
  assert.ok(/export default function VideoMotion/.test(dc2.videoMotion.tsx));
  const ev2 = stVisibleEvents(s2.plan.schedule, s2.frames);
  assert.equal(ev2.filter(e => e.kind === 'cut').length, 12 + 3);

  // ---- 3. Muffle off -> one dry clip to the end; shortage -> the planner's reason.
  const s3 = A.plan({ row: { key: 'k3', pid: 'P', music: 'dev-test', muffle: false, section: 'late', length: 'short' }, seed: 1, inv, found });
  assert.deepEqual(A.ensureAudio(s3).config.files.map(f => f.key), ['dry']);
  assert.equal(A.assembleConfig(s3, { ids: { dry: 'm1' } }).music.wetResourceId, null);
  assert.ok(s3.music.sectionStart > 0.05, 'late section');
  const few = { resources: resources.slice(0, 3), photos: [], months };
  assert.throws(() => A.plan({ row: { key: 'k4', pid: 'P', music: 'none', usePhotos: false }, seed: 1, inv: few, found: { list: list.filter(c => ['v0', 'v1', 'v2'].includes(c.rid)), failed: [] } }),
    /Needs at least 6 different clips or photos \(found 3\)/);
  assert.throws(() => A.plan({ row: { key: 'k5', pid: 'P', music: 'dev-nope' }, seed: 1, inv, found }), /unknown cue dev-nope/);

  // ---- 4. The example matrix covers every option at least twice.
  const matrix = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'dev', 'matrix.example.json'), 'utf8')).rows;
  const cov = A.checkMatrix(matrix);
  assert.equal(cov.ok, true, JSON.stringify(cov.missing.concat(cov.unknown)));
  assert.equal(cov.counts.music.own >= 2 && cov.counts.music.none >= 2 && cov.counts.music.cue >= 2, true);
  assert.equal(A.checkMatrix(matrix.slice(0, 2)).ok, false);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('adapter tests passed');
})().catch(e => { console.error(e); process.exit(1); });
