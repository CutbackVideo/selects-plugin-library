// plugins/selfie-aesthetic/tests/driver.test.cjs (run: node plugins/selfie-aesthetic/tests/driver.test.cjs)
// Offline checks of the headless driver adapter (dev/driver-adapter.mjs) and dev/matrix.json: the adapter loads, the
// matrix meets checkMatrix, the step configs carry exactly the keys panel.tsx build() sends (parsed from the panel's
// own literals), and the expected cut frames at the Draft's real fps follow assemble.js. Own music runs only when
// TEST_MUSIC points to an audio file and ffmpeg is on PATH (or FFMPEG_DIR).
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const panel = read('panel.tsx');
const matrix = JSON.parse(read('dev/matrix.json'));
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// Top-level keys of the object literal that starts at the first `{` after `marker` in panel.tsx.
function literalKeys(marker) {
  const at = panel.indexOf(marker);
  assert.ok(at >= 0, 'panel.tsx has ' + marker);
  let i = panel.indexOf('{', at + marker.length - 1), depth = 0, piece = '';
  const pieces = [];
  for (; i < panel.length; i++) {
    const ch = panel[i];
    if ('({['.includes(ch)) { depth++; if (depth === 1) continue; }
    if (')}]'.includes(ch)) { depth--; if (depth === 0) break; }
    if (depth === 1 && ch === ',') { pieces.push(piece); piece = ''; continue; }
    piece += ch;
  }
  pieces.push(piece);
  return pieces.map(p => p.trim()).filter(Boolean).map(p => (p.startsWith('...') ? p : /^(\w+)/.exec(p)[1]));
}

// A fake Project: four 12 s videos, two with clear face hits, and two photos.
const FAKE_INV = {
  resources: [
    { rid: 'r1', name: 'a.mov', duration: 12, width: 1080, height: 1920, path: '/src/a.mov' },
    { rid: 'r2', name: 'b.mov', duration: 12, width: 1920, height: 1080, path: '/src/b.mov' },
    { rid: 'r3', name: 'c.mov', duration: 12, width: 1080, height: 1920, path: '/src/c.mov' },
    { rid: 'r4', name: 'd.mov', duration: 12, width: 1080, height: 1920, path: '/src/d.mov' },
  ],
  photos: [{ rid: 'p1', width: 3024, height: 4032 }, { rid: 'p2', width: 0, height: 0 }],
  skipped: { unanalysed: 0, missing: 0, short: 0 }, counts: { analysed: 4, unanalysed: 0, analysing: 0 },
};
const hits = (rid, face) => ['selfie', 'hand', 'expression', 'glance', 'control'].flatMap((role, k) =>
  [1.5, 4.5, 7.5].map((t, n) => ({ rid, role, t: t + k * 0.3, score: role === 'control' ? 0.2 : face ? 0.3 + 0.01 * n : 0.15 })));
// The kit driver's search cache: batch order plus sourceDuration on every hit.
const FAKE_FOUND = { failed: [], list: ['r4', 'r3', 'r2', 'r1'].flatMap(rid => hits(rid, rid === 'r1' || rid === 'r3').map(c => ({ ...c, sourceDuration: 12 }))) };
const FPS = 24000 / 1001;
// Fake motion curves (the adapter's `measure` hook replaces the local ffmpeg): 8 fps over 12 s, each clip moving
// except for one still stretch that depends on the file, so a still weight moves the moments.
const STILL_AT = { '/src/a.mov': 6, '/src/b.mov': 2, '/src/c.mov': 9, '/src/d.mov': 4 };
const fakeCurve = file => (file in STILL_AT
  ? { fps: 8, values: Array.from({ length: 96 }, (_, i) => (Math.abs(i / 8 - STILL_AT[file]) < 1 ? 0.3 : 4 + (i % 5))) } : null);
const FAKE_MOTION = Object.fromEntries(FAKE_INV.resources.map(r => [r.rid, fakeCurve(r.path)]));

let A;
const mk = async () => {
  const { createAdapter } = await import(pathToFileURL(path.join(root, 'dev', 'driver-adapter.mjs')).href);
  return createAdapter({ pluginDir: root, installedDir: '/installed/selfie-aesthetic', read, measure: fakeCurve });
};
// One full offline pass of a row: every step the driver would send, with a fake ensure-audio / assemble result.
function pass(row, fps = FPS, seed = 1) {
  const inv = JSON.parse(JSON.stringify(FAKE_INV));
  const steps = { inventory: A.inventory(row), search: A.search(row, inv.resources.map(r => r.rid).slice(0, A.searchBatch)) };
  const s = A.plan({ row, seed, inv, found: FAKE_FOUND });
  steps.ensure = A.ensureAudio(s);
  const music = steps.ensure ? { resourceId: 'music-rid', imported: true } : null;
  steps.assemble = A.assemble(s, music);
  const a = { sequenceId: 'seq-1', fps, totalFrames: 0, placed: s.holds.length, covers: s.holds.map(() => 1), notes: [] };
  A.afterAssemble(s, a);
  steps.decorate = A.decorate(s, a);
  return { s, a, steps, exp: A.expected(s, a), rec: A.record(s, a) };
}
const base = { key: 't', pid: '28579d3f-de18-4af5-8f3d-f1bf9245fc20', cue: 'make-funk', preset: 'soft-glow', look: true, length: 'short', clipSound: 'ambient', photos: true, section: 'default', whipMode: 'effect' };

test('adapter loads and reads the panel constants', async () => {
  A = await mk();
  assert.equal(A.id, 'selfie-aesthetic');
  assert.equal(A.label, 'SAE');
  const c = A.panelConstants;
  assert.equal(A.searchBatch, 4);
  assert.deepEqual(Object.keys(c.QUERIES), ['selfie', 'hand', 'expression', 'glance', 'control']);
  assert.equal(c.AMBIENT_DB, -18);
  assert.equal(c.LOOK_STRENGTH, 0.35);
  assert.ok(['effect', 'transition'].includes(c.WHIP_MODE));
  assert.deepEqual(c.LOOK_PRESETS.map(p => p.id), ['soft-glow', 'night-glam', 'clean']);
  assert.deepEqual(c.LOOK_OPTIONS.map(o => o.value), ['soft-glow', 'night-glam', 'clean', 'none']);
  assert.equal(typeof A.planner.saePlanBuild, 'function');
  assert.equal(typeof A.planner.saeOwnCue, 'function');
  assert.equal(typeof A.planner.saeLoudestSection, 'function');
});

test('dev/matrix.json meets checkMatrix', () => {
  const r = A.checkMatrix(matrix);
  assert.ok(r.ok, JSON.stringify({ missing: r.missing, unknown: r.unknown }));
  assert.ok(matrix.length >= 20 && matrix.length <= 24, 'rows ' + matrix.length);
  // The stillness A/B pair: the same Project A inputs at weight 0 and 0.6, both exported.
  const st = matrix.filter(x => x.still !== undefined);
  assert.deepEqual(st.map(x => x.still), [0, 0.6]);
  const strip = ({ key, still, ...rest }) => rest;
  assert.deepEqual(strip(st[0]), strip(st[1]));
  assert.ok(st.every(x => x.export && x.project === 'A'), 'still rows export on Project A');
  assert.deepEqual(st.flatMap(x => (x.seeds || [1]).map(sd => A.draftNameOf(x, sd))),
    ['Selfie test A make-funk soft-glow short s1 still0', 'Selfie test A make-funk soft-glow short s1 still0.6']);
  const ex = matrix.filter(x => x.export && x.still === undefined && (x.project === 'A' || x.project === 'B'));
  assert.equal(ex.length, 4, 'export rows');
  assert.equal(new Set(ex.map(x => (x.cue.startsWith('own') ? 'own' : x.cue))).size, 4, 'export rows use different cues');
  assert.deepEqual([...new Set(ex.map(x => x.whipMode))].sort(), ['effect', 'transition']);
  for (const x of matrix) assert.ok(['28579d3f-de18-4af5-8f3d-f1bf9245fc20', '4a9c32f1-1b61-4962-b2db-51fec2637b0e', 'UNANALYSED_PID', 'MIXED_PID'].includes(x.pid), x.key + ' pid');
  // Build without analysis: an unanalysed Project (U) and a mixed one (M), pids from $SAE_UNANALYSED_PID / $SAE_MIXED_PID.
  // u-funk has a-funk's inputs (seed 1), so the two exports compare unanalysed vs analysed builds of the same footage.
  const u = matrix.filter(x => x.pid === 'UNANALYSED_PID'), m = matrix.filter(x => x.pid === 'MIXED_PID');
  assert.ok(u.length >= 2 && m.length >= 2 && u.every(x => x.project === 'U') && m.every(x => x.project === 'M'));
  const strip2 = ({ key, project, pid, seeds, capture, ...rest }) => rest;
  assert.deepEqual(strip2(matrix.find(x => x.key === 'u-funk')), strip2(matrix.find(x => x.key === 'a-funk')));
  assert.ok(matrix.find(x => x.key === 'u-funk').export && matrix.find(x => x.key === 'm-funk').export);
});

test('checkMatrix flags missing coverage, unknown values and duplicate Draft names', () => {
  const r = A.checkMatrix([{ ...base, key: 'x' }, { ...base, key: 'y', cue: 'nope', preset: 'loud' }]);
  assert.equal(r.ok, false);
  assert.ok(r.missing.some(m => m.startsWith('cue=own')));
  assert.ok(r.missing.includes('uiLang=ko (0)'));
  assert.ok(r.unknown.some(u => u === 'y: cue nope'));
  assert.ok(r.unknown.some(u => u === 'y: preset loud'));
  assert.ok(A.checkMatrix([{ ...base, key: 'w', still: -1 }]).unknown.includes('w: still must be a number >= 0'));
  assert.ok(A.checkMatrix([{ ...base, key: 'x' }, { ...base, key: 'z' }]).unknown.some(u => u.startsWith('duplicate Draft name')));
});

test('step configs carry exactly the keys panel.tsx build() sends', () => {
  const { s, steps } = pass(base);
  assert.deepEqual(Object.keys(steps.inventory.config), ['projectId', 'only', 'known']);
  assert.deepEqual(literalKeys('readInventoryPages((summary, make) => run(summary, make(0)), assets.scripts.inventoryJs, {'), ['projectId', 'only', 'known', '...(settings.usePhotos ? {} : { measureMs: 0 })']);
  assert.deepEqual(Object.keys(A.inventory({ ...base, photos: false }).config), ['projectId', 'only', 'known', 'measureMs']);
  assert.deepEqual(Object.keys(steps.search.config), literalKeys('fill(assets.scripts.searchJs, {'));
  assert.deepEqual(Object.keys(steps.ensure.config), ['projectId', 'path', 'durationSeconds']);
  assert.equal(steps.ensure.config.durationSeconds, JSON.parse(read('assets/cues/manifest.json')).cues.find(c => c.id === 'make-funk').durationSeconds);
  assert.equal(steps.ensure.config.path, '/installed/selfie-aesthetic/assets/cues/make-funk.mp3');
  assert.deepEqual(Object.keys(steps.assemble.config), literalKeys('fill(assets.scripts.assembleJs, {'));
  assert.deepEqual(Object.keys(steps.assemble.config.music), ['resourceId', 'sourceStart']);
  assert.deepEqual(Object.keys(steps.decorate.config), literalKeys('const deco = {'));
  assert.deepEqual(Object.keys(steps.decorate.config.effect), ['tsx', 'look', 'lookStrength', 'whip']);
  assert.deepEqual(Object.keys(steps.decorate.config.adjustLabels), ['look', 'lookStrength', 'whip', 'framing']);
  // Scripts read every key (the panel test's lists).
  const asm = read('scripts/assemble.js'), deco = read('scripts/decorate.js');
  for (const k of Object.keys(steps.assemble.config)) assert.ok(asm.includes('cfg.' + k), 'assemble.js reads cfg.' + k);
  for (const k of Object.keys(steps.decorate.config)) assert.ok(deco.includes('cfg.' + k), 'decorate.js reads cfg.' + k);
  // Values the panel would send.
  assert.deepEqual(steps.search.config.queries, A.panelConstants.QUERIES);
  assert.equal(steps.search.config.pageSize, A.panelConstants.PAGE_SIZE);
  assert.equal(steps.assemble.config.ambientDb, -18);
  assert.equal(steps.assemble.config.music.sourceStart, s.plan.musicSourceStart);
  assert.deepEqual(steps.assemble.config.cutSecondsRaw, s.plan.cutSecondsRaw);
  assert.deepEqual(Object.keys(steps.assemble.config.holds[0]), ['i', 'bar', 'kind', 'rid', 'moment', 'srcStart', 'frames', 'cutIn', 'cutOut', 'angleIn', 'angleOut', 'angle', 'whipIn', 'whipOut', 'framing']);
  assert.deepEqual(steps.assemble.config.crops.p1, { width: 3024, height: 4032 });
  assert.ok(!('p2' in steps.assemble.config.crops), 'unmeasured photos stay out of crops');
  assert.equal(steps.assemble.config.draftName, 'Selfie test A make-funk soft-glow short s1');
  assert.deepEqual(steps.decorate.config.effect, { tsx: read('assets/selfie-whip-look.tsx'), look: 'soft-glow', lookStrength: 0.5, whip: 1 });
  assert.equal(steps.decorate.config.transitionTsx, read('assets/selfie-whip-transition.tsx'));
  assert.deepEqual(steps.decorate.config.lookOptions, A.panelConstants.LOOK_OPTIONS);
  assert.deepEqual(steps.decorate.config.framingOptions, A.panelConstants.FRAMING_OPTIONS);
  assert.deepEqual(A.panelConstants.FRAMING_OPTIONS.map(o => o.value), ['tight', 'full']);
  for (const st of ['ensure', 'assemble', 'decorate']) assert.equal(steps[st].allowCommit, true, st + ' commits');
  for (const st of ['inventory', 'search']) assert.ok(!steps[st].allowCommit, st + ' is read only');
});

test('the plan equals the panel planner call with the default section and inventory-ordered hits', () => {
  const { s } = pass(base);
  const P = A.planner;
  const cue = JSON.parse(read('assets/cues/manifest.json')).cues.find(c => c.id === 'make-funk');
  const bars = P.SAE_LENGTHS.short, editBpm = P.saeTempo(cue).editBpm;
  const candidates = ['r1', 'r2', 'r3', 'r4'].flatMap(rid => hits(rid, rid === 'r1' || rid === 'r3'));
  const panelCall = (extra) => JSON.parse(JSON.stringify(P.saePlanBuild({ fps: 30, bars, seed: 1, cue, sectionStart: P.saeDefaultSection(cue, bars, editBpm), candidates,
    durations: { r1: 12, r2: 12, r3: 12, r4: 12 }, badSpans: {}, photos: ['p1', 'p2'], usePhotos: true, ...extra })));
  // A row without `still` plans like the panel: its SAE_STILL_WEIGHT_PANEL (0.6) with every video's motion.
  assert.equal(A.panelConstants.STILL_WEIGHT, 0.6);
  const want = panelCall({ motion: FAKE_MOTION, stillWeight: 0.6 });
  assert.deepEqual(s.plan, want);
  assert.deepEqual(s.still, { weight: 0.6, measured: 4, videos: 4 });
  // The weight moved moments (not cuts) compared with weight 0; a still: 0 row is the plain planner call.
  const off = A.plan({ row: { ...base, still: 0 }, seed: 1, inv: JSON.parse(JSON.stringify(FAKE_INV)), found: FAKE_FOUND });
  assert.deepEqual(off.plan, panelCall({}));
  assert.deepEqual(off.still, { weight: 0, measured: 0, videos: 4 });
  assert.deepEqual(s.plan.cutSecondsRaw, off.plan.cutSecondsRaw);
  assert.notDeepEqual(s.plan.holds.map(h => h.srcStart), off.plan.holds.map(h => h.srcStart));
  assert.equal(s.plan.holds.length, 6 * (s.plan.bars - 1) + 7);
  // Sections: early / late / seconds snap like the panel's waveform.
  const early = A.plan({ row: { ...base, section: 'early' }, seed: 1, inv: JSON.parse(JSON.stringify(FAKE_INV)), found: FAKE_FOUND });
  const late = A.plan({ row: { ...base, section: 'late' }, seed: 1, inv: JSON.parse(JSON.stringify(FAKE_INV)), found: FAKE_FOUND });
  assert.equal(early.section, P.saeSnapSection(0, cue, { bars, editBpm }));
  assert.equal(late.section, P.saeSnapSection(1e6, cue, { bars, editBpm }));
  assert.ok(early.section < s.section || early.section <= late.section);
  assert.ok(late.section > early.section);
  // Photos off: no photo holds and measureMs 0.
  const np = pass({ ...base, photos: false });
  assert.ok(np.s.holds.every(h => h.kind === 'video'));
});

test('expected() cut frames at 23.976 fps are round((cutSecondsRaw + offset) * fps)', () => {
  const { s, a, exp, rec } = pass(base, FPS);
  const ss = s.plan.musicSourceStart;
  assert.ok(typeof ss === 'number' && ss > 0);
  const offset = ss - Math.round(ss * FPS) / FPS;
  const want = s.plan.cutSecondsRaw.slice(1).map(x => Math.round((x + offset) * FPS));
  assert.deepEqual(exp.cuts, want);
  assert.equal(exp.cuts.length, s.holds.length);
  assert.deepEqual(exp.frameSize, { width: 1080, height: 1920 });
  assert.equal(exp.fps, FPS);
  assert.deepEqual(exp.effects, [{ name: 'Selfie whip + look', perMainClip: 1 }]);
  assert.deepEqual(exp.music, { resourceId: 'music-rid', db: 0, fadeOutSeconds: 0.12 });
  assert.ok(!('noAdjacent' in exp), 'per-clip adjacency does not apply (stutter holds share a source)');
  // Ambient with photo holds: the per-clip -18 dB check is left out (photos keep 0 dB).
  const photoHolds = s.holds.some(h => h.kind === 'photo');
  assert.equal('clipSound' in exp, !photoHolds);
  assert.equal(rec.rec.clipSoundUnchecked != null, photoHolds);
  // Cuts file for eval-whips.py / eval-beat-sync.cjs.
  const c = rec.cuts;
  assert.equal(c.fps, a.fps);
  assert.deepEqual(c.cuts, want.slice(0, -1));
  assert.equal(c.beats.length, c.cuts.length);
  assert.equal(c.beats[0], 1); // the first hold is one beat
  assert.deepEqual(c.gridCuts, c.cuts); // bundled cues never snap
  assert.equal(rec.rec.expectedTransitions, 0);
  // At 30 fps the cuts are the planner's own frames.
  assert.deepEqual(pass(base, 30).exp.cuts, pass(base, 30).s.plan.holds.map(h => h.endFrame));
});

test('no music, Clean without look, clip sound off and full', () => {
  const nm = pass({ ...base, cue: 'none', preset: 'clean', look: false, clipSound: 'off' });
  assert.equal(nm.steps.ensure, null);
  assert.equal(nm.steps.assemble.config.music, null);
  assert.deepEqual(nm.exp.music, { none: true });
  assert.deepEqual(nm.exp.clipSound, { mode: 'off' });
  assert.deepEqual(nm.exp.cuts, nm.s.plan.cutSecondsRaw.slice(1).map(x => Math.round(x * FPS)));
  assert.deepEqual(nm.steps.decorate.config.effect.look, 'none');
  assert.equal(nm.steps.decorate.config.effect.whip, 0.7);
  assert.equal(nm.steps.assemble.config.draftName, 'Selfie test A none clean short s1');
  const full = pass({ ...base, clipSound: 'full' });
  assert.deepEqual(full.exp.clipSound, { mode: 'level', db: 0 });
  const amb = pass({ ...base, photos: false });
  assert.deepEqual(amb.exp.clipSound, { mode: 'level', db: -18 });
});

test('transition mode and Korean Adjust labels', () => {
  const { steps, rec, exp, s } = pass({ ...base, pid: '4a9c32f1-1b61-4962-b2db-51fec2637b0e', whipMode: 'transition', uiLang: 'ko', preset: 'night-glam', length: 'standard' });
  const { extractStrings } = require(path.join(root, 'dev', 'i18n-check.cjs'));
  const ko = extractStrings(panel).strings.ko;
  assert.equal(steps.decorate.config.whipMode, 'transition');
  assert.deepEqual(steps.decorate.config.adjustLabels, { look: ko['param.look'], lookStrength: ko['param.lookStrength'], whip: ko['param.whip'], framing: ko['param.framing'] });
  assert.deepEqual(steps.decorate.config.framingOptions.map(o => o.label), ['tight', 'full'].map(v => ko['framing.' + v]));
  assert.deepEqual(steps.decorate.config.lookOptions.map(o => o.label), ['soft-glow', 'night-glam', 'clean', 'none'].map(v => ko['look.' + v]));
  assert.equal(rec.rec.expectedTransitions, s.holds.length - 1);
  assert.deepEqual(exp.effects, [{ name: 'Selfie whip + look', perMainClip: 1 }]);
  assert.equal(steps.assemble.config.draftName, 'Selfie test B make-funk night-glam standard s1 transition');
  // A row without whipMode follows the panel constant.
  const { whipMode, ...noMode } = base;
  assert.equal(pass(noMode).steps.decorate.config.whipMode, A.panelConstants.WHIP_MODE);
});

// ---- build without analysis ----
// Fake quick scores (measureLocal hook): a calm stretch per file, through the block's own window maths.
const fakeLocal = (Q) => (resources) => Object.fromEntries(resources.map((r) => {
  const calm = STILL_AT[r.path] || 5;
  const windows = [];
  for (let t = Q.QS_HEAD; t + Q.QS_BIN <= r.durationSeconds + 1e-9; t += Q.QS_BIN) windows.push({ start: t, end: t + Q.QS_BIN, motion: Math.abs(t - calm) < 1.5 ? 0.002 : 0.08, sharp: 0.1, luma: 0.45, clipped: 0,
    flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false } });
  return [r.rid, { rid: r.rid, windows, sceneCuts: [], ms: 7, fallback: false, cached: false, duration: r.durationSeconds }];
}));
test('unanalysed and mixed Projects: quick scores (any still weight), analysed-only search, the panel planner call', async () => {
  const { createAdapter } = await import(pathToFileURL(path.join(root, 'dev', 'driver-adapter.mjs')).href);
  let calls = 0;
  const probe = await createAdapter({ pluginDir: root, installedDir: '/installed/selfie-aesthetic', read, measure: fakeCurve });
  const local = fakeLocal(probe.quick);
  const U = await createAdapter({ pluginDir: root, installedDir: '/installed/selfie-aesthetic', read, measure: fakeCurve, measureLocal: (rs) => { calls++; return local(rs); } });
  // Mixed: r1 / r3 analysed (face hits), r2 / r4 unanalysed (no search hits for them).
  const inv = JSON.parse(JSON.stringify(FAKE_INV));
  inv.resources.forEach((r) => { r.analysed = r.rid === 'r1' || r.rid === 'r3'; });
  assert.deepEqual(U.videoRids(inv).rids, ['r1', 'r3'], 'scene search for analysed clips only');
  assert.deepEqual(Object.keys(U.videoRids(inv).durations), ['r1', 'r2', 'r3', 'r4']);
  const found = { failed: [], list: FAKE_FOUND.list.filter((c) => c.rid === 'r1' || c.rid === 'r3') };
  const P = U.planner, cue = JSON.parse(read('assets/cues/manifest.json')).cues.find((c) => c.id === 'make-funk');
  const bars = P.SAE_LENGTHS.short, editBpm = P.saeTempo(cue).editBpm;
  for (const still of [0, 0.6]) {
    const s = U.plan({ row: { ...base, still }, seed: 1, inv, found });
    const scores = local([{ rid: 'r2', path: '/src/b.mov', durationSeconds: 12 }, { rid: 'r4', path: '/src/d.mov', durationSeconds: 12 }]);
    const motion = still > 0 ? { r1: FAKE_MOTION.r1, r3: FAKE_MOTION.r3 } : {};
    motion.r2 = { local: scores.r2 }; motion.r4 = { local: scores.r4 };
    const want = JSON.parse(JSON.stringify(P.saePlanBuild({ fps: 30, bars, seed: 1, cue, sectionStart: P.saeDefaultSection(cue, bars, editBpm),
      candidates: ['r1', 'r3'].flatMap((rid) => hits(rid, true)), durations: { r1: 12, r2: 12, r3: 12, r4: 12 }, badSpans: {}, photos: ['p1', 'p2'], usePhotos: true,
      motion, stillWeight: still, analysed: { r2: false, r4: false }, local: { r2: scores.r2, r4: scores.r4 }, pickLocal: U.quick.pickWindowsLocal })));
    assert.deepEqual(s.plan, want, 'still ' + still + ': the panel planner call');
    assert.equal(s.plan.localClips, 2);
    assert.deepEqual(s.still, { weight: still, measured: still > 0 ? 2 : 0, videos: 4 }, 'motion curves for analysed clips only');
    assert.deepEqual({ videos: s.local.videos, scored: s.local.scored, fallback: s.local.fallback }, { videos: 2, scored: 2, fallback: 0 });
    assert.equal(U.record(s, { fps: 30 }).rec.local.videos, 2);
    assert.equal(s.planSummary.localClips, 2);
  }
  assert.equal(calls, 1, 'quick scores are cached per file across rows');
  // All unanalysed: no search, the plan still builds from quick scores; tight framing on the likely close-ups.
  const invU = JSON.parse(JSON.stringify(FAKE_INV));
  invU.resources.forEach((r) => { r.analysed = false; });
  assert.deepEqual(U.videoRids(invU).rids, []);
  const su = U.plan({ row: { ...base }, seed: 1, inv: invU, found: { failed: [], list: [] } });
  assert.equal(su.plan.ok, true);
  assert.equal(su.plan.faceClips, 0);
  assert.equal(su.plan.localClips, 4);
  assert.ok(su.plan.holds.filter((h) => h.kind === 'video').every((h) => h.framing === 'tight' && h.srcStart >= 0.5 - 1e-9));
});

test('pid placeholders take $SAE_UNANALYSED_PID / $SAE_MIXED_PID, in place, on the first step', async () => {
  const { resolvePid } = await import(pathToFileURL(path.join(root, 'dev', 'driver-adapter.mjs')).href);
  const keep = { u: process.env.SAE_UNANALYSED_PID, m: process.env.SAE_MIXED_PID };
  delete process.env.SAE_UNANALYSED_PID;
  assert.throws(() => resolvePid({ key: 'u-funk', pid: 'UNANALYSED_PID' }), /SAE_UNANALYSED_PID/);
  process.env.SAE_UNANALYSED_PID = 'pid-u'; process.env.SAE_MIXED_PID = 'pid-m';
  const row = { ...matrix.find((x) => x.key === 'u-funk') };
  const inv = A.inventory(row);
  assert.equal(row.pid, 'pid-u', 'the row object itself carries the real id afterwards (readback / export)');
  assert.equal(inv.config.projectId, 'pid-u');
  const mrow = { ...matrix.find((x) => x.key === 'm-funk') };
  assert.equal(A.search(mrow, ['r1']).config.projectId, 'pid-m');
  assert.equal(A.draftNameOf(row, 1), 'Selfie test U make-funk soft-glow short s1');
  const real = { key: 'a', pid: '28579d3f-de18-4af5-8f3d-f1bf9245fc20' };
  assert.equal(resolvePid(real).pid, '28579d3f-de18-4af5-8f3d-f1bf9245fc20');
  for (const [k, v] of [['SAE_UNANALYSED_PID', keep.u], ['SAE_MIXED_PID', keep.m]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
});

test('the child-process quick score equals the panel block run in-process (local ffmpeg)', async () => {
  let ff = true;
  try { execFileSync(process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { ff = false; }
  if (!ff) { console.log('  (skipped: no ffmpeg)'); return; }
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-drv-qs-'));
  const ffmpeg = (args) => execFileSync(process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg', ['-v', 'error', '-y', ...args]);
  ffmpeg(['-f', 'lavfi', '-i', 'testsrc2=size=360x640:rate=30', '-t', '6', '-vf', 'fade=t=in:st=0:d=1', '-pix_fmt', 'yuv420p', path.join(dir, 'a b.mp4')]);
  ffmpeg(['-f', 'lavfi', '-i', 'mandelbrot=size=360x640:rate=30', '-t', '5', '-pix_fmt', 'yuv420p', path.join(dir, 'c.mp4')]);
  const resources = [{ rid: 'u1', path: path.join(dir, 'a b.mp4'), durationSeconds: 6 }, { rid: 'u2', path: path.join(dir, 'c.mp4'), durationSeconds: 5 }];
  const keep = process.env.SAE_QS_DATA;
  process.env.SAE_QS_DATA = path.join(dir, 'drv');
  const { createAdapter } = await import(pathToFileURL(path.join(root, 'dev', 'driver-adapter.mjs')).href);
  const D = await createAdapter({ pluginDir: root, installedDir: '/installed/selfie-aesthetic', read });
  const viaChild = D.localScores(resources);
  if (keep === undefined) delete process.env.SAE_QS_DATA; else process.env.SAE_QS_DATA = keep;
  const QSN = require(path.join(root, 'dev', 'quick-score-node.cjs'));
  const inProc = await QSN.scoreAll(QSN.loadBlock(panel), resources, { dataDir: path.join(dir, 'inproc'), concurrency: 3, budgetMs: 20000 });
  const strip = (r) => { const { ms, cached, ...rest } = r; return rest; };
  for (const rid of ['u1', 'u2']) {
    assert.equal(viaChild.local[rid].fallback, false, rid + ' decoded');
    assert.deepEqual(strip(viaChild.local[rid]), strip(inProc.results[rid]), rid + ': same windows, cuts and flags');
  }
  assert.ok(viaChild.local.u1.windows[0].flags.fade || viaChild.local.u1.windows[0].flags.black, 'the fade-in is flagged');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('  child process ' + viaChild.ms + ' ms for 2 clips; identical to the in-process block');
});

test('own music: path from $VAR / --own, cue from beat-detect like saeOwnCue', async () => {
  const { ownPath } = await import(pathToFileURL(path.join(root, 'dev', 'driver-adapter.mjs')).href);
  const keep = process.env.SAE_DRIVER_TEST_X;
  process.env.SAE_DRIVER_TEST_X = path.join(path.sep, 'music', 'x.mp3');
  assert.equal(ownPath('own:$SAE_DRIVER_TEST_X'), path.resolve(path.sep, 'music', 'x.mp3'));
  assert.equal(ownPath('own:${SAE_DRIVER_TEST_X}'), path.resolve(path.sep, 'music', 'x.mp3'));
  delete process.env.SAE_DRIVER_TEST_X;
  assert.throws(() => ownPath('own:$SAE_DRIVER_TEST_X'), /not set/);
  if (keep !== undefined) process.env.SAE_DRIVER_TEST_X = keep;
  const file = process.env.TEST_MUSIC;
  let ff = true;
  try { execFileSync(process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { ff = false; }
  if (!file || !fs.existsSync(file) || !ff) { console.log('  (own-music build skipped: set TEST_MUSIC to an audio file)'); return; }
  const { s, steps, exp } = pass({ ...base, cue: 'own:$TEST_MUSIC', section: 'default' });
  assert.equal(s.cue.own, true);
  assert.deepEqual(Object.keys(s.cue), ['own', 'bpm', 'firstBeat', 'grid', 'durationSeconds', 'peaks', 'beatEnergy', 'onsets', 'onsetThresholds']);
  assert.deepEqual(steps.ensure.config, { projectId: base.pid, path: path.resolve(file), matchByName: false });
  const P = A.planner, bars = P.SAE_LENGTHS.short, editBpm = P.saeTempo(s.cue).editBpm;
  assert.equal(s.section, P.saeLoudestSection(s.cue, bars, editBpm) ?? P.saeDefaultSection(s.cue, bars, editBpm));
  assert.equal(exp.cuts.length, s.holds.length);
  assert.equal(steps.assemble.config.draftName, 'Selfie test A own soft-glow short s1');
  console.log('  own music: bpm ' + Math.round(s.cue.bpm) + ', grid ' + s.cue.grid + ', section ' + s.section.toFixed(3) + ' s');
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try { await fn(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + (e && e.stack || e)); }
  }
  console.log(JSON.stringify({ driver: failed ? 'FAIL' : 'ok', tests: tests.length, failed }));
  process.exit(failed ? 1 : 0);
})();
