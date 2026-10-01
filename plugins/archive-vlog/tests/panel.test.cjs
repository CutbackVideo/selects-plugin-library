// plugins/archive-vlog/tests/panel.test.cjs
// The panel: verbatim blocks (planner, decode title, credit), the beat detector's worker (beat-detect.cjs unmodified,
// av-beat-worker), the build contract's configs (av-build), shot motions (av-hook), host I/O without a POSIX shell
// (av-host), UI wiring and wording (STRINGS.en via t()).
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const panel = read('panel.tsx');
const planner = read('planner.js');
const presets = JSON.parse(read('assets/fonts/presets.json'));
const manifest = JSON.parse(read('assets/cues/manifest.json'));
const plugin = JSON.parse(read('plugin.json'));
const j = v => JSON.parse(JSON.stringify(v)); // vm objects -> plain objects (deepEqual across realms)
// Hangul syllables without literal Hangul in this file.
const HANGUL = new RegExp('[' + String.fromCharCode(0xac00) + '-' + String.fromCharCode(0xd7a3) + ']');
const ga = String.fromCharCode(0xac00), na = String.fromCharCode(0xb098);

// ---- Blocks -----------------------------------------------------------------------------------------------------
// The text between `// <name>:start\n` and `// <name>:end`; exactly one such block.
function block(src, name) {
  const a = '// ' + name + ':start\n', b = '// ' + name + ':end';
  assert.equal(src.split(a).length, 2, 'one ' + name + ' block');
  const i = src.indexOf(a), k = src.indexOf(b);
  assert.ok(i >= 0 && k > i, name + ' markers');
  return src.slice(i + a.length, k);
}
// The planner is embedded verbatim.
assert.equal(block(panel, 'av-planner').trim(), planner.trim(), 'panel.tsx must embed planner.js verbatim');
// The decode title and the credit layouts are embedded verbatim, each in a scope of its own (the decode block's
// avHash(a, b) would otherwise meet the planner's avHash(str)).
assert.equal(block(panel, 'av-decode'), block(read('assets/decode-title.tsx'), 'av-decode'), 'panel.tsx must embed the av-decode block verbatim');
assert.equal(block(panel, 'av-credit'), block(read('assets/archived-credit.tsx'), 'av-credit'), 'panel.tsx must embed the av-credit block verbatim');
assert.ok(/const AV_TITLE: any = \(function \(\) \{\n\/\/ av-decode:start\n/.test(panel), 'the decode block runs in its own function scope');
assert.ok(/const AV_CREDIT: any = \(function \(\) \{\n\/\/ av-credit:start\n/.test(panel), 'the credit block runs in its own function scope');
// The beat detector is one source: the panel reads beat-detect.cjs from the install folder and runs it unmodified in a
// Web Worker (av-beat-worker); no copy of its code is in panel.tsx.
const beatSrc = read('beat-detect.cjs');
for (const fn of ['function bandFlux(', 'function onsetEnvelope(', 'function gridState(', 'function analyze(']) assert.ok(!panel.includes(fn), 'no copy of beat-detect.cjs (' + fn + ')');
assert.ok(panel.includes('read("beat-detect.cjs")') && panel.includes('beatWorker: avBeatWorkerSource(beatDetect)'), 'the panel reads beat-detect.cjs');
const hookBlock = block(panel, 'av-hook'), buildBlock = block(panel, 'av-build'), hostBlock = block(panel, 'av-host'), workerBlock = block(panel, 'av-beat-worker');
const verbatim = ['av-planner', 'av-decode', 'av-credit'].map(n => block(panel, n));
// The panel's own code: no STRINGS block, no verbatim blocks.
const sBegin = panel.indexOf('// STRINGS:BEGIN'), sEnd = panel.indexOf('// STRINGS:END');
let own = panel.slice(0, sBegin) + panel.slice(sEnd);
for (const v of verbatim) own = own.replace(v, '');
const ui = own;

// The worker gives exactly beat-detect.cjs's result (a click track at 120 bpm with an offbeat hat), its CLI branch
// stays inert (the worker has no `process`), and an error comes back as a message.
{
  const rate = 22050, seconds = 24, x = new Float32Array(rate * seconds);
  for (let b = 0; b * 0.5 + 0.2 < seconds; b++) {
    const at = Math.round((0.2 + b * 0.5) * rate);
    for (let i = 0; i < 600 && at + i < x.length; i++) x[at + i] += Math.sin(i * 0.15) * Math.exp(-i / 120) * 0.8;
    const off = at + Math.round(0.25 * rate);
    for (let i = 0; i < 200 && off + i < x.length; i++) x[off + i] += (((i * 7919) % 97) / 97 - 0.5) * 0.2 * Math.exp(-i / 40);
  }
  const mk = {}; vm.createContext(mk); vm.runInContext(workerBlock + '\nthis.src = avBeatWorkerSource;', mk);
  const source = mk.src(beatSrc);
  const posted = [];
  const worker = { postMessage: (m) => posted.push(m) };
  vm.createContext(worker);
  vm.runInContext(source, worker);
  worker.onmessage({ data: { samples: x, rate } });
  const want = require(path.join(root, 'beat-detect.cjs')).analyze(x, rate);
  assert.equal(posted.length, 1);
  assert.deepEqual(j(posted[0].ok), j(want), 'the worker equals beat-detect.cjs');
  assert.equal(want.accepted, true, 'the click track is accepted');
  worker.onmessage({ data: { samples: null, rate } });
  assert.ok(typeof posted[1].error === 'string' && !posted[1].ok, 'an analysis error is posted, not thrown');
}

// ---- Header and files ---------------------------------------------------------------------------------------------
const head = panel.split('\n').slice(0, 16).join('\n');
assert.match(head, /^\/\/ @name Archive Vlog$/m);
const names = head.match(/^\/\/ @name:(\w+) .+$/gm) || [];
assert.deepEqual(names.map(l => l.slice(9, 11)).sort(), ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh'], 'ten localised names');
for (const l of names) assert.equal(l.slice(12), 'Archive Vlog', l);
assert.match(head, /^\/\/ @icon sparkles$/m);
assert.ok(panel.includes('const PLUGIN_ID = "archive-vlog";'));
assert.equal(/const PLUGIN_VERSION = "([^"]+)";/.exec(panel)[1], plugin.version, 'PLUGIN_VERSION = plugin.json version');
assert.ok(!/^import .* from "(?!react")/m.test(panel), 'only react may be imported');
// Everything a build reads, by name (paths are joined from parts).
for (const name of ['"inventory.js"', '"search.js"', '"ensure-audio.js"', '"assemble.js"', '"decorate.js"', '"decode-title.tsx"', '"archived-credit.tsx"',
  '"letterbox-reveal.tsx"', '"cinematic-look.tsx"', '"fade-out.tsx"', '"photo-motion.tsx"', '"manifest.json"', '"presets.json"']) assert.ok(ui.includes(name), 'panel reads ' + name);
for (const gone of ['title-lockup', 'soft-look', 'beat-punch', 'Beat punch', 'Groove', 'groove', 'startAtHook', 'avBeatsPerShot', 'avShotSeconds', 'avGroove', 'avHookSection',
  'SOFT_STRENGTH', 'PUNCH_', 'PREFERRED_CUE', 'installTools', 'MiniVlog', 'langRef']) assert.ok(!ui.includes(gone), 'no leftover ' + gone);
// No Korean text and no user paths in any shipped file (Korean UI text is \u escapes in STRINGS and plugin.json).
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.name === 'node_modules' || e.name.startsWith('.') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(root).filter(f => /\.(tsx|js|cjs|mjs|json|md|sh)$/.test(f))) assert.ok(!HANGUL.test(fs.readFileSync(f, 'utf8')), 'Korean text in ' + f);
assert.ok(!/\/Users\//.test(panel), 'no user paths');
// plugin.json: the files exist, Windows is declared, ten localised names, template choices match the bundled assets.
for (const f of plugin.files) assert.ok(fs.existsSync(path.join(root, f)), 'plugin.json file exists: ' + f);
for (const f of ['panel.tsx', 'planner.js', 'beat-detect.cjs', 'assets/decode-title.tsx', 'assets/archived-credit.tsx', 'assets/letterbox-reveal.tsx', 'assets/cinematic-look.tsx',
  'assets/fade-out.tsx', 'assets/photo-motion.tsx', 'assets/fonts/presets.json', 'assets/cues/manifest.json', 'scripts/assemble.js', 'scripts/decorate.js']) assert.ok(plugin.files.includes(f), 'ships ' + f);
assert.deepEqual(plugin.compatibility.platforms, ['macOS arm64', 'Windows x64']);
assert.ok(!/ffmpeg|node\.?js|homebrew/i.test(plugin.compatibility.selects), 'no tool requirements');
assert.deepEqual(Object.keys(plugin.localized).sort(), ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']);
for (const [lang, v] of Object.entries(plugin.localized)) assert.ok(v.name === 'Archive Vlog' && v.summary.length > 20, 'localized ' + lang);
const opt = id => plugin.options.find(o => o.id === id);
assert.deepEqual(opt('track').choices.map(c => c.id), manifest.cues.map(c => c.id), 'template tracks = bundled cues');
assert.deepEqual(opt('title').choices.map(c => c.id), presets.presets.map(p => p.id), 'template styles = presets');
for (const [id, want] of [['track', 'peaceful-drift'], ['title', 'cinematic'], ['length', 'standard']]) assert.equal(opt(id).default, want, id + ' default');

// ---- Strings ------------------------------------------------------------------------------------------------------
// UI text lives in the STRINGS block (10 languages, tests/i18n.test.cjs); wording is checked against STRINGS.en and the
// t() call that reads it.
const { extractStrings } = require(path.join(root, 'dev', 'i18n-check.cjs'));
const strings = j(extractStrings(panel).strings), en = strings.en;
const textOf = key => (typeof en[key] === 'string' ? en[key] : Object.values(en[key] || {}).join('\n'));
const says = (key, text) => {
  assert.ok(key in en, 'STRINGS.en has ' + key);
  assert.ok(textOf(key).includes(text), 'STRINGS.en.' + key + ' says "' + text + '": ' + textOf(key));
  assert.ok(new RegExp('\\bt\\((L|l|lang|bl), "' + key.replace(/[.]/g, '\\.') + '"').test(ui), 't() reads ' + key);
};
const family = (prefix, values) => {
  assert.ok(ui.includes('"' + prefix + '." + '), 'family ' + prefix + ' read dynamically');
  for (const [k, v] of Object.entries(values)) assert.equal(en[prefix + '.' + k], v, prefix + '.' + k);
};
says('build', 'Build'); says('anotherVersion', 'Try other shots'); says('finishTitle', 'Finish title and look');
says('style', 'Style'); says('creditShot', 'Credit shot'); says('creditName', 'Name on the credit'); says('cinematicLook', 'Cinematic look');
says('pace', 'Pace'); says('pace.cinematic', 'Cinematic'); says('pace.quick', 'Quick'); says('replayDecode', 'Replay');
says('fitPartial', 'montage shots fit this track'); says('fitFull', 'montage shots'); says('footageFits', 'Your footage fits');
says('hostTooOld', 'needs a newer version of Selects'); says('fail.no-video', 'at least one video clip');
says('typeTitle', 'Type a title'); says('creditSample', 'sample text'); says('creditCleared', 'without a credit'); says('fastTempo', 'Above 110 bpm');
says('ownMusicHint', 'first {count} minutes');
says('progress', 'Step {step}/{total}'); says('montageBeats', 'Montage shots hold');
family('step', { shots: 'Choosing shots', music: 'Preparing music', draft: 'Creating Draft', look: 'Adding title and look', open: 'Opening Draft' });
family('motion', { 'push-in': 'Push in', 'pull-out': 'Pull out', 'drift-left': 'Drift left', 'drift-right': 'Drift right', 'drift-up': 'Drift up', 'drift-down': 'Drift down',
  tilt: 'Tilt', 'push-drift': 'Push and drift' });
family('param', { motion: 'Motion', look: 'Look strength', speed: 'Decode speed' });
for (const p of presets.presets) assert.equal(en['preset.' + p.id], p.label, 'preset.' + p.id);
assert.ok(ui.includes('{tOr(L, "preset." + p.id, p.label)}') && ui.includes('i18n-used: preset.*'), 'preset labels by id');
// A quoted UI name inside a sentence equals that control's label.
assert.ok(en.turnOnPhotos.includes(en.usePhotos) && en.finishFailed.includes(en.finishTitle), 'quoted UI names');
// No literal English UI text in JSX.
assert.ok(!/>[ \t]*[A-Z][a-z]+(?: [a-z]+)*[.…]?[ \t]*</.test(ui), 'no literal English text between JSX tags');
assert.ok(!/(?:label|title|aria-label|busyLabel)="[A-Z]/.test(ui), 'no literal English UI props');
assert.ok(ui.includes('<div style={{ wordBreak: L === "ko" ? "keep-all" : undefined }}>'), 'keep-all for Korean only');
assert.ok(ui.includes('const L = uiLang(context);'), 'the language is read on every render');
// Two-number plurals keep the noun next to {count} in English.
for (const k of ['fitPartial', 'footageFits', 'shortened', 'clipsSelected', 'photosSelected']) for (const v of Object.values(en[k])) assert.match(v, /\{count\} (montage shots?|clips?|photos?)\b/, k);

// ---- Build constants and configs (av-hook + av-build in node:vm, next to the planner) ----------------------------
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, isFinite };
vm.createContext(box);
vm.runInContext(planner + '\n' + hookBlock + '\n' + buildBlock + `
this.P = { avPlanBuild, avMontageShots, avOpeningTiming, avSchedule, avMusicOffset, avPhotoMotions, avMotionBonus, avVideoMotions, avAssembleConfig, avDecorateConfig,
  avOpeningSeconds, avPreset, avPresetFonts, avLookStrength, AV_ROLES, AV_PHOTO_MOTIONS, AV_BUILD_STEPS,
  K: { AV_QUERIES, SEARCH_BATCH, AMBIENT_DB, DEFAULT_CUE, DEFAULT_PRESET, DEFAULT_LENGTH, DEFAULT_PACE, DEFAULT_CLIP_SOUND, LOOK_STRENGTH, MOTION_STRENGTH,
    VIDEO_MOTION_STRENGTH, FADE_SECONDS, MUSIC_FADE_OUT, TITLE_LOOK, CREDIT_LOOK, TITLE_FONT_OPTIONS, MOTION_OPTIONS, AV_ADJUST_LABELS, AV_FAIL, AV_W, AV_H, CREDIT_FAMILY } };`, box);
const P = box.P, K = j(P.K);
// Constants the build contract and dev/driveAdapter.mjs agree on.
assert.deepEqual(K.AV_QUERIES, {
  opening: 'wide city street with traffic and people walking', portrait: 'a person sitting outside, relaxed portrait',
  crowd: 'crowd of people walking on a busy street', transit: 'tram, train or bus passing by', water: 'ferry or boat on the water, harbour',
  architecture: 'historic building facade, landmark architecture', ride: 'cyclist or person walking, street level', food: 'street food stall or market',
  skyline: 'city skyline or golden hour light', ending: 'golden hour street or train station, sunset', motion: 'people walking, vehicles passing or the camera moving',
});
for (const r of j(P.AV_ROLES)) assert.ok(K.AV_QUERIES[r], 'a query for role ' + r);
assert.ok(K.SEARCH_BATCH * Object.keys(K.AV_QUERIES).length <= 22, 'a search call stays within search.js budget (22 searches)');
assert.equal(K.SEARCH_BATCH, 2);
assert.deepEqual([K.AMBIENT_DB, K.DEFAULT_CUE, K.DEFAULT_PRESET, K.DEFAULT_LENGTH, K.DEFAULT_PACE, K.DEFAULT_CLIP_SOUND, K.LOOK_STRENGTH, K.MOTION_STRENGTH,
  K.VIDEO_MOTION_STRENGTH, K.FADE_SECONDS, K.MUSIC_FADE_OUT], [-18, 'peaceful-drift', 'cinematic', 'standard', 'cinematic', 'ambient', 0.3, 0.5, 0.5, 1, 1]);
assert.ok(/const FADE_SECONDS = 1\.0;/.test(panel) && /const MUSIC_FADE_OUT = 1\.0;/.test(panel), 'the fades as the driver reads them');
assert.ok(manifest.cues.some(c => c.id === K.DEFAULT_CUE) && presets.presets.some(p => p.id === K.DEFAULT_PRESET), 'defaults exist');
assert.deepEqual(K.MOTION_OPTIONS.map(o => o.value), j(P.AV_PHOTO_MOTIONS), 'every photo motion is a choice');
assert.deepEqual(K.TITLE_LOOK, { font: 'anton', size: 100, speed: 100, shadow: 0.3 });
assert.deepEqual(K.TITLE_FONT_OPTIONS, [{ label: 'Anton', value: 'anton' }, { label: 'Oswald', value: 'oswald' }]);
assert.equal(K.CREDIT_FAMILY, 'AV Oswald Bold');
assert.ok(/const CREDIT_NAME_MAX = 24;/.test(panel), 'credit name limit 24');
assert.deepEqual(Object.keys(K.AV_ADJUST_LABELS), ['motion', 'motionStrength', 'reveal', 'letterbox', 'look', 'warmth', 'fade', 'kicker', 'title', 'tagline', 'titleColor',
  'textColor', 'size', 'font', 'speed', 'shadow', 'prefix', 'name'], 'adjustLabels keys (build contract)');
for (const [k, v] of Object.entries(K.AV_ADJUST_LABELS)) assert.equal(en['param.' + k], v, 'STRINGS.en param.' + k + ' = the English label');
// decorate.js's own English defaults are the same words.
{
  const m = /const LABELS = \{([^}]+)\.\.\./.exec(read('scripts/decorate.js'));
  assert.ok(m, 'decorate.js LABELS');
  const defaults = (0, eval)('({' + m[1] + '})');
  for (const [k, v] of Object.entries(defaults)) assert.equal(K.AV_ADJUST_LABELS[k], v, 'decorate.js label ' + k);
}
assert.ok(ui.includes('labels: adjustLabelsFor(L), motionOptions: motionOptionsFor(L),'), 'Inspector labels frozen at Build in the UI language');
assert.ok(ui.includes('return Object.fromEntries(Object.keys(AV_ADJUST_LABELS).map((k) => [k, t(lang, "param." + k)]));'), 'adjustLabels from STRINGS');
assert.equal(j(P.AV_BUILD_STEPS).length, 5, 'Step n/5');
for (const r of ['one-resource', 'too-few', 'music-too-short', 'no-video']) {
  assert.ok(K.AV_FAIL[r], 'AV_FAIL ' + r);
  assert.ok(ui.includes('if (reason === "' + r + '") return t(lang, "fail.' + r + '");'), 'fail.' + r + ' in the UI language');
}
// The planner's length failures name the seconds the shot needs (fix lane M6/M7; numbers from the plan).
for (const r of ['opening-too-short', 'ending-too-short']) {
  assert.ok(K.AV_FAIL[r] && ui.includes('if (reason === "' + r + '") return t(lang, "fail.' + r + '", { seconds });'), 'fail.' + r);
  assert.ok(en['fail.' + r].includes('{seconds} s'), 'fail.' + r + ' says the seconds');
}
assert.ok(ui.includes('failText(l, plan.reason, plan)') && ui.includes('failText(bl, plan.reason, plan)'), 'failures get the plan');

// A plan from the dev fixtures (videos and photos), and the configs built from it.
const inv = JSON.parse(read('dev/fixtures/daily-inventory.json')), found = JSON.parse(read('dev/fixtures/daily-search.json'));
const fonts = {}; for (const p of presets.presets) for (const f of p.fonts) fonts[f.file] = read('assets/fonts/' + f.file).replace(/\s+/g, '');
const tsx = { title: 'TITLE', credit: 'CREDIT', letterbox: 'BOX', look: 'LOOK', fade: 'FADE', motion: 'MOTION' };
const sizes = Object.fromEntries(inv.photos.map(p => [p.rid, { width: p.width, height: p.height }]));
const cue = manifest.cues.find(c => c.id === 'peaceful-drift');
const family0 = m => (m === 'push-in' ? 'push-in' : /^drift-/.test(m) ? 'drift' : m);
function planFor(seed, pace, music) {
  const cands = P.avMotionBonus(found.list).concat(inv.photos.map(p => ({ rid: p.rid, kind: 'photo' })));
  const plan = P.avPlanBuild({ candidates: cands, bpm: music ? cue.bpm : null, accepted: !!music, approxBpm: null, fps: 30, pace, requested: P.avMontageShots('short', pace),
    sectionStart: music ? cue.introStart : undefined, usableEnd: music ? cue.usableEnd : undefined, onsets: music ? cue.onsets : [], onsetThresholds: music ? cue.onsetThresholds : undefined,
    lowConfidence: !music, seed: String(seed) });
  assert.ok(plan.ok, 'fixture plan ' + JSON.stringify(plan.reason));
  return plan;
}
for (const [seed, pace, music, preset, creditOn, lookOn, clipSound] of [[1, 'cinematic', true, 'cinematic', true, true, 'ambient'], [2, 'quick', true, 'golden-hour', false, true, 'off'],
  [3, 'cinematic', false, 'a-day-out', true, false, 'full']]) {
  const plan = planFor(seed, pace, music);
  const p = presets.presets.find(x => x.id === preset);
  const sectionStart = music ? cue.introStart : null;
  // assemble.js cfg
  const asm = j(P.avAssembleConfig({ projectId: 'pid', draftName: 'Archive Vlog T', plan, inventory: inv, music: music ? { resourceId: 'm1' } : null, sectionStart, clipSound }));
  assert.deepEqual(Object.keys(asm), ['projectId', 'draftName', 'picks', 'boundaries', 'crops', 'clipSound', 'ambientDb', 'music', 'musicFadeOut']);
  assert.deepEqual(asm.boundaries, j(plan.schedule.cuts));
  assert.equal(asm.boundaries.length, plan.slots + 1);
  assert.equal(asm.ambientDb, -18); assert.equal(asm.musicFadeOut, 1); assert.equal(asm.clipSound, clipSound);
  assert.deepEqual(asm.music, music ? { resourceId: 'm1', sectionStart } : null);
  for (const ph of inv.photos) assert.deepEqual(asm.crops[ph.rid], { width: ph.width, height: ph.height });
  // decorate.js cfg at a real Draft rate
  const fps = 29.97;
  const frozen = { seed, preset, fields: { kicker: 'K', title: 'TITLE', tagline: 'T' }, credit: { on: creditOn, name: 'ME' }, clipSound, look: { on: lookOn, strength: 0.4 }, sectionStart };
  const cfg = j(P.avDecorateConfig({ sequenceId: 'seq', videoEnd: 900, fps, plan, presets, tsx, fonts, sizes, frozen, provenance: { plugin: 'archive-vlog' } }));
  assert.deepEqual(Object.keys(cfg), ['sequenceId', 'videoEnd', 'mute', 'photos', 'photoEffects', 'title', 'credit', 'letterbox', 'look', 'fade', 'motion', 'adjustLabels']);
  assert.equal(cfg.mute, clipSound === 'off'); assert.equal(cfg.photoEffects, true);
  // Opening timing from clip 0's length at the Draft's real rate, with the music offset (as assemble.js places it).
  const offset = P.avMusicOffset(sectionStart == null ? undefined : sectionStart, fps);
  const openFrames = Math.round((plan.schedule.cuts[1] + offset) * fps);
  assert.equal(P.avOpeningSeconds(plan, fps, sectionStart), openFrames / fps, 'opening seconds at the real fps');
  const timing = j(P.avOpeningTiming(openFrames / fps));
  assert.deepEqual(cfg.title.parameters.timing, timing);
  assert.deepEqual(cfg.letterbox, { tsx: 'BOX', parameters: { revealStart: timing.revealStart, revealEnd: timing.revealEnd, revealSeconds: timing.revealEnd - timing.revealStart, enabled: true } });
  // Title
  const tp = cfg.title.parameters;
  for (const [k, v] of Object.entries({ preset, kicker: 'K', title: 'TITLE', tagline: 'T', titleColor: p.colors.title, textColor: p.colors.text, taglineTracking: p.taglineTracking,
    font: 'anton', size: 100, speed: 100, shadow: 0.3 })) assert.deepEqual(tp[k], v, 'title ' + k);
  assert.deepEqual(tp.fields, { kicker: 'K', title: 'TITLE', tagline: 'T' });
  assert.deepEqual(tp.fonts.map(f => f.family).sort(), ['AV Anton', 'AV Inter', 'AV Inter Medium', 'AV Oswald Bold']);
  for (const f of tp.fonts) assert.ok(f.b64.length > 1000 && f.metrics && f.metrics.unitsPerEm > 0, 'title font ' + f.family);
  assert.deepEqual(tp.provenance.picks, j(plan.picks));
  assert.deepEqual(cfg.title.editableParameters.map(e => [e.key, e.type]), [['kicker', 'text'], ['title', 'text'], ['tagline', 'text'], ['titleColor', 'color'], ['textColor', 'color'],
    ['size', 'number'], ['font', 'select'], ['speed', 'number'], ['shadow', 'number']]);
  const ed = k => cfg.title.editableParameters.find(e => e.key === k);
  assert.deepEqual([ed('size').min, ed('size').max, ed('size').step, ed('speed').min, ed('speed').max, ed('speed').step, ed('shadow').min, ed('shadow').max, ed('shadow').step], [60, 160, 5, 25, 400, 5, 0, 1, 0.05]);
  assert.equal(ed('speed').label, 'Decode speed'); assert.deepEqual(ed('font').options, K.TITLE_FONT_OPTIONS);
  // Credit (null when off), Oswald only
  if (!creditOn) assert.equal(cfg.credit, null);
  else {
    assert.deepEqual(Object.keys(cfg.credit.parameters), ['prefix', 'name', 'color', 'size', 'shadow', 'fonts']);
    assert.deepEqual([cfg.credit.parameters.prefix, cfg.credit.parameters.name, cfg.credit.parameters.color], [p.credit.prefix, 'ME', p.colors.text]);
    assert.deepEqual(cfg.credit.parameters.fonts.map(f => f.family), ['AV Oswald Bold']);
    assert.ok(cfg.credit.parameters.fonts[0].b64.length > 1000);
    assert.deepEqual(cfg.credit.editableParameters.map(e => e.key), ['prefix', 'name']);
  }
  // Look (null when off): the strength frozen at Build, the preset's warmth (1 without one)
  assert.deepEqual(cfg.look, lookOn ? { tsx: 'LOOK', strength: 0.4, warmth: (p.look && p.look.warmth) || 1 } : null);
  assert.deepEqual(cfg.fade, { tsx: 'FADE', fadeSeconds: 1 });
  // Motion: photos by rid (montage photos only), a Shot motion on every video clip but the opening
  const photoPicks = plan.picks.map((k, i) => [k, i]).filter(([k]) => k && k.kind === 'photo');
  assert.deepEqual(cfg.photos, [...new Set(photoPicks.map(([k]) => k.rid))]);
  assert.deepEqual(Object.keys(cfg.motion.byRid).sort(), cfg.photos.slice().sort());
  assert.equal(cfg.motion.strength, 0.5); assert.equal(cfg.motion.video.strength, 0.5);
  const byIndex = cfg.motion.video.byIndex;
  const videoIdx = plan.picks.map((k, i) => (k && k.kind === 'video' && i > 0 ? String(i) : null)).filter(Boolean);
  assert.deepEqual(Object.keys(byIndex).sort(), videoIdx.slice().sort(), 'every video clip but the opening');
  const moves = j(P.avPhotoMotions(plan.picks, String(seed), sizes));
  for (const i of videoIdx) {
    const prev = Number(i) - 1, before = prev === 0 ? null : byIndex[String(prev)] ? family0(byIndex[String(prev)].motion) : moves[prev] ? family0(moves[prev].motion) : null;
    assert.ok(['push-in', 'drift-left', 'drift-right'].includes(byIndex[i].motion) && byIndex[i].axis === 'x', 'shot motion ' + i);
    assert.notEqual(family0(byIndex[i].motion), before, 'no two adjacent clips share a move (' + i + ')');
  }
  assert.ok(photoPicks.every(([k]) => k.holdSeconds > 0) && plan.picks.slice(0, 2).every(k => k.kind === 'video'), 'the intro is video');
  // adjustLabels: every key, English without labels
  assert.deepEqual(cfg.adjustLabels, K.AV_ADJUST_LABELS);
  // Deterministic per seed
  assert.deepEqual(j(P.avDecorateConfig({ sequenceId: 'seq', videoEnd: 900, fps, plan, presets, tsx, fonts, sizes, frozen, provenance: { plugin: 'archive-vlog' } })), cfg);
}
// Frozen labels replace the English ones (Inspector labels in the UI language at Build).
{
  const plan = planFor(1, 'cinematic', true);
  const cfg = j(P.avDecorateConfig({ sequenceId: 's', videoEnd: 900, fps: 25, plan, presets, tsx, fonts, sizes, provenance: {},
    frozen: { seed: 1, preset: 'cinematic', fields: { title: 'X' }, credit: { on: true, name: ga + na }, clipSound: 'ambient', look: { on: true }, sectionStart: cue.introStart,
      labels: { ...K.AV_ADJUST_LABELS, kicker: 'KICK', name: 'NOM' } } }));
  assert.equal(cfg.title.editableParameters[0].label, 'KICK'); assert.equal(cfg.credit.editableParameters[1].label, 'NOM'); assert.equal(cfg.adjustLabels.kicker, 'KICK');
  assert.equal(cfg.credit.parameters.name, ga + na, 'a Korean credit name passes as typed');
  assert.equal(cfg.look.strength, 0.3, 'no frozen strength: the preset look strength');
}
// avVideoMotions: no motion on the opening or photos, seeded, families alternate where they must.
{
  const v = { kind: 'video' }, ph = { kind: 'photo' };
  const picks = [v, v, ph, v, v, v, null, v];
  const photoMoves = [null, null, { motion: 'push-in' }, null, null, null, null, null];
  const out = j(P.avVideoMotions(picks, '7', photoMoves));
  assert.deepEqual(Object.keys(out), ['1', '3', '4', '5', '7']);
  assert.notEqual(family0(out['3'].motion), 'push-in', 'after a push-in photo');
  assert.notEqual(family0(out['4'].motion), family0(out['3'].motion)); assert.notEqual(family0(out['5'].motion), family0(out['4'].motion));
  const drifts = Object.values(out).filter(m => m.motion !== 'push-in').map(m => m.motion);
  for (let i = 1; i < drifts.length; i++) assert.notEqual(drifts[i], drifts[i - 1], 'drifts alternate right / left');
  assert.deepEqual(j(P.avVideoMotions(picks, '7', photoMoves)), out, 'deterministic');
  const seeds = new Set(['1', '2', '3', '4', '5', '6'].map(s => JSON.stringify(j(P.avVideoMotions([v, v, v, v], s, null)))));
  assert.ok(seeds.size > 1, 'the seed changes the moves');
}
// avMotionBonus: motion hits are a tie-break, never candidates of their own.
{
  const list = [{ rid: 'a', role: 'crowd', t: 2, score: 0.3, sourceDuration: 10 }, { rid: 'a', role: 'motion', t: 2.5, score: 0.4, sourceDuration: 10 },
    { rid: 'b', role: 'motion', t: 1, score: 0.2, sourceDuration: 8 }];
  const out = j(P.avMotionBonus(list));
  assert.equal(out[0].motion, 1); assert.ok(Math.abs(out[0].score - 0.4) < 1e-9);
  assert.deepEqual(out[1], { rid: 'b', role: 'motion', sourceDuration: 8 }, 'a clip with only motion hits keeps a stub row');
}
// The panel and its template run use the builders (one config path for both).
assert.equal((ui.match(/avAssembleConfig\(\{/g) || []).length, 2, 'assemble config: the panel and the template run');
assert.equal((ui.match(/avDecorateConfig\(\{/g) || []).length, 2, 'decorate config: the panel and the template run');
assert.ok(ui.includes('fill(assets.scripts.decorateJs, cfg)') && ui.includes('fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + SEARCH_BATCH), queries: AV_QUERIES, pageSize: 4 })'));

// ---- Host I/O: no POSIX shell, guarded host services --------------------------------------------------------------
// Runtime code never uses POSIX shell syntax, a data folder under the shell's HOME, Homebrew / nvm paths or a node
// spawn (kit references/windows.md).
for (const bad of ['mkdir -p', 'printf', '$HOME', 'rm -f', 'base64 ', 'export PATH', 'TOOL_PATH', '/opt/homebrew', '.nvm', '/tmp', '~/', 'sq(', 'dq(', '| sort']) assert.ok(!own.includes(bad), 'no ' + bad);
assert.ok(!/\bnode\s+["'\w./-]*\.c?js/.test(own) && !/\bffmpeg\s+-/.test(own) && !/\bffprobe\s+-/.test(own), 'no node / ffmpeg / ffprobe command lines');
assert.ok(!/(?:plugin|root|data|dir|path|Dir|Path)\)?\s*\+\s*["'][\\/]|["'][\\/]assets/.test(own), 'paths are joined, never built with "/"');
// One shell call, in the host block, for SELECTS_USER_SKILLS_ROOT only.
assert.equal((panel.match(/runShell\(/g) || []).length, 1, 'one runShell call');
assert.ok(hostBlock.includes('await sdk.runShell({ summary: "Locate the plugin folder", command, timeoutMs: 10000 })'));
assert.ok(hostBlock.includes(`const command = hostIsWindows() ? "echo(%SELECTS_USER_SKILLS_ROOT%" : 'echo "$SELECTS_USER_SKILLS_ROOT"';`), 'per-platform one-liner');
// The host's services are reached only through the host block's guards; ffmpeg only through Runtime with an argv.
const outsideHost = own.replace(hostBlock, '');
assert.ok(!/__DI__|window\.parent/.test(outsideHost.replace(/^\s*\/\/.*$/gm, '')), '__DI__ only in the av-host block');
assert.ok(!/runFFmpeg\(|runFFprobe\(/.test(outsideHost), 'ffmpeg only in the av-host block');
assert.ok(!/:\s*(any|string|number|boolean)\b|Promise<|\bas any\b/.test(hostBlock), 'the host block is plain JS');
assert.ok(ui.includes('const locateRoots = (sdk: any) => hostRoots(sdk, PLUGIN_ID, "planner.js");'));
assert.ok(ui.includes('return e?.code === "host-missing" ? (l) => t(l, "hostTooOld") : (l) => wrap(l, sayError(l, e));'), 'one "needs a newer Selects" message');
assert.ok(ui.includes('const canOwnMusic = !!hostApi("FileSystem", "readFile");'), 'own music hidden without file reads');
// The host block in node:vm against fake hosts.
function hostBox({ platform, files = new Set(), shell = null, ffmpeg = null, noJoin = false, readFile = null }) {
  const pathMod = platform === 'win32' ? path.win32 : path.posix;
  const calls = { shell: [], mkdir: [], removed: [], ffmpeg: [] };
  const FileSystem = {
    ...(noJoin ? {} : { join: (...a) => pathMod.join(...a) }),
    homedir: () => (platform === 'win32' ? 'C:\\Users\\me' : '/u/me'),
    existsSync: p => files.has(p),
    mkdirSync: (p, o) => calls.mkdir.push([p, o]),
    readFile: readFile || (async p => { throw Error('no file ' + p); }),
    removeFile: async ({ filePath }) => calls.removed.push(filePath),
  };
  const Runtime = { getPlatform: () => platform, ...(ffmpeg ? { runFFmpeg: async (argv, quiet, signal) => { calls.ffmpeg.push(argv); return ffmpeg(argv); } } : {}) };
  const ctx = { window: { parent: { __DI__: { FileSystem, Runtime } } }, navigator: { platform: '', userAgent: '' }, TextDecoder, Uint8Array, ArrayBuffer, Float32Array,
    setTimeout, clearTimeout, AbortController, Date, Math, String, Error, parseFloat };
  vm.createContext(ctx);
  vm.runInContext(hostBlock + '\nthis.H = { hostRoots, hostJoin, hostReadBytes, hostReadText, hostDecodePcm, hostNeed, hostApi, hostIsWindows, hostSkillsRoot };', ctx);
  const sdk = { runShell: async (o) => { calls.shell.push(o.command); return shell ? shell(o.command) : { stdout: '' }; } };
  return { H: ctx.H, calls, sdk };
}
const hostTests = (async () => {
  // macOS: the default skills folder, no shell; the data folder is created.
  {
    const { H, calls, sdk } = hostBox({ platform: 'darwin', files: new Set(['/u/me/.selects/skills/archive-vlog/planner.js']) });
    assert.deepEqual(j(await H.hostRoots(sdk, 'archive-vlog', 'planner.js')), { plugin: '/u/me/.selects/skills/archive-vlog', data: '/u/me/.selects/plugin-data/archive-vlog' });
    assert.deepEqual(calls.shell, []); assert.deepEqual(j(calls.mkdir), [['/u/me/.selects/plugin-data/archive-vlog', { recursive: true }]]);
  }
  // Windows: SELECTS_USER_SKILLS_ROOT through cmd.exe when the default folder is not the install.
  {
    const { H, calls, sdk } = hostBox({ platform: 'win32', files: new Set(['D:\\Skills\\archive-vlog\\planner.js']), shell: () => ({ stdout: 'D:\\Skills\r\n' }) });
    const r = j(await H.hostRoots(sdk, 'archive-vlog', 'planner.js'));
    assert.deepEqual(r, { plugin: 'D:\\Skills\\archive-vlog', data: 'C:\\Users\\me\\.selects\\plugin-data\\archive-vlog' });
    assert.deepEqual(calls.shell, ['echo(%SELECTS_USER_SKILLS_ROOT%']);
  }
  // An unset variable (cmd prints an empty line or the literal) and macOS's command.
  for (const stdout of ['\r\n', '%SELECTS_USER_SKILLS_ROOT%' + '\r\n', 'ECHO is on.\r\n']) {
    const { H, sdk } = hostBox({ platform: 'win32', shell: () => ({ stdout }) });
    await assert.rejects(H.hostRoots(sdk, 'archive-vlog', 'planner.js'), e => e.code === 'not-found', JSON.stringify(stdout));
  }
  {
    const { H, calls, sdk } = hostBox({ platform: 'darwin', files: new Set(['/opt/skills/archive-vlog/planner.js']), shell: () => ({ stdout: '/opt/skills\n' }) });
    assert.equal((await H.hostRoots(sdk, 'archive-vlog', 'planner.js')).plugin, '/opt/skills/archive-vlog');
    assert.deepEqual(calls.shell, ['echo "$SELECTS_USER_SKILLS_ROOT"']);
  }
  // Without the host's join: the OS separator.
  assert.equal(hostBox({ platform: 'win32', noJoin: true }).H.hostJoin('C:\\a\\', 'assets', 'x.mp3'), 'C:\\a\\assets\\x.mp3');
  assert.equal(hostBox({ platform: 'darwin', noJoin: true }).H.hostJoin('/a/', 'assets', 'x.mp3'), '/a/assets/x.mp3');
  // A missing member: one host-missing error, never a crash.
  {
    const { H } = hostBox({ platform: 'darwin' });
    assert.equal(H.hostApi('Runtime', 'runFFmpeg'), null);
    assert.throws(() => H.hostNeed('Runtime', 'runFFmpeg'), e => e.code === 'host-missing' && e.member === 'Runtime.runFFmpeg');
    assert.equal(await H.hostDecodePcm('/x.mp3', '/data', 22050, 240), null, 'no ffmpeg: null (the panel decodes with WebAudio)');
  }
  // Bytes from a Buffer that is a view into a larger pool.
  {
    const pool = Buffer.alloc(64, 7); Buffer.from('hello').copy(pool, 13);
    const { H } = hostBox({ platform: 'darwin', readFile: async () => pool.subarray(13, 18) });
    assert.equal(Buffer.from(await H.hostReadBytes('/f')).toString(), 'hello');
    assert.equal(await H.hostReadText('/f'), 'hello');
  }
  // ffmpeg decode: an argv (no shell), mono at the rate into an ASCII temp file in the data folder, read back and removed.
  {
    const samples = new Float32Array([0.5, -0.25, 1, 0]);
    const raw = Buffer.alloc(3 + samples.byteLength); Buffer.from(samples.buffer).copy(raw, 3);
    let wrote = null;
    const { H, calls } = hostBox({ platform: 'win32', ffmpeg: argv => { wrote = argv[argv.length - 1]; return { stdout: '', stderr: '' }; },
      readFile: async p => { assert.equal(p, wrote); return raw.subarray(3); } });
    const out = await H.hostDecodePcm('C:\\Users\\me\\Music\\my song.mp3', 'C:\\data', 22050, 240);
    assert.deepEqual(Array.from(out), Array.from(samples));
    const argv = j(calls.ffmpeg[0]);
    assert.deepEqual(argv.slice(0, 8), ['-nostdin', '-v', 'error', '-y', '-t', '240', '-i', 'C:\\Users\\me\\Music\\my song.mp3']);
    assert.deepEqual(argv.slice(8, 14), ['-ac', '1', '-ar', '22050', '-f', 'f32le']);
    assert.ok(/^C:\\data\\pcm-[\w-]+\.f32$/.test(wrote), 'temp file in the data folder, ASCII name: ' + wrote);
    assert.deepEqual(calls.removed, [wrote], 'the temp file is removed');
  }
})();

// ---- UI wiring --------------------------------------------------------------------------------------------------
// Sections in order: Style, Music, Length, Advanced, then Build.
const order = ['<ui.Section title={t(L, "style")}>', '<ui.Section title={t(L, "music")}>', '<ui.Section title={t(L, "length")}>', '<ui.Section title={t(L, "advanced")}>',
  'onClick={() => build(seed)}'].map(s => ui.indexOf(s));
assert.ok(order.every(i => i > 0), 'all sections present');
assert.deepEqual(order.slice().sort((a, b) => a - b), order, 'Style, Music, Length, Advanced, Build');
// Defaults (dev/driveAdapter.mjs reads the same constants).
for (const s of ['React.useState(DEFAULT_PRESET)', 'React.useState(DEFAULT_CUE)', 'React.useState<"short" | "standard" | "long">(DEFAULT_LENGTH)',
  'React.useState<"cinematic" | "quick">(DEFAULT_PACE)', 'React.useState<"off" | "ambient" | "full">(DEFAULT_CLIP_SOUND)', 'const [look, setLook] = React.useState(true);',
  'const [usePhotos, setUsePhotos] = React.useState(true);', 'const [creditOn, setCreditOn] = React.useState(true);']) assert.ok(ui.includes(s), s);
// Pace: Cinematic / Quick only.
assert.ok(ui.includes('options={[{ label: t(L, "pace.cinematic"), value: "cinematic" }, { label: t(L, "pace.quick"), value: "quick" }]}'));
// Style tiles: the sample and the name inside one bordered box (panel-ui.md section 2), one tile per preset.
for (const s of ['presetList.map((p) => {', 'aria-pressed={on}', 'onClick={() => choosePreset(p.id)}', 'height: "auto", maxHeight: "none", boxSizing: "border-box", padding: "8px 6px"',
  'display: "flex", flexDirection: "column", alignItems: "center", gap: 6', 'border: on ? "2px solid var(--panel-fg, #ffffff)"', 'overflowWrap: "anywhere", wordBreak: "keep-all"'])
  assert.ok(ui.includes(s), s);
assert.equal(presets.presets.length, 3);
for (const p of presets.presets) {
  assert.deepEqual(p.fields.map(f => f.key), ['kicker', 'title', 'tagline'], p.id + ' fields');
  for (const f of p.fields) assert.ok(f.max > 0, p.id + '.' + f.key);
  assert.ok(p.colors.title && p.colors.text && p.credit.prefix && p.credit.name && p.look.strength > 0, p.id);
}
// Title fields with their limits counted in fieldLen units (Hangul 2).
assert.ok(ui.includes('label={t(L, "fieldCount", { label: fieldLabel(L, fl.key), used: fieldLen(fieldText(fl)), max: fl.max })}'));
assert.ok(ui.includes('const v = fieldClip(String(value), fl.max);'));
{
  const runtime = panel.slice(panel.indexOf('// Field limits count Hangul'), panel.indexOf('// A message that follows the UI language'));
  const clip = panel.slice(panel.indexOf('function fieldClip('), panel.indexOf('const PLUGIN_ID'));
  const F = new Function(runtime.replace(/: string|: number/g, '') + clip.replace(/: string|: number/g, '') + '\nreturn { fieldLen, fieldClip };')();
  assert.equal(F.fieldLen('MINI'), 4); assert.equal(F.fieldLen(ga + na), 4); assert.equal(F.fieldLen('a' + ga), 3);
  assert.equal(F.fieldClip(ga.repeat(13), 24), ga.repeat(12)); assert.equal(F.fieldClip('ab' + ga + na, 5), 'ab' + ga);
}
// The live preview: the Draft's layout and decode code, fully decoded, Korean measured in the system face first, in
// a box of fixed height; a replay plays the decode.
for (const s of ['try { ko = AV_TITLE.avKoMeasure(base); } catch { ko = null; }', 'return ko ? Object.assign({}, base, ko) : base;',
  'AV_TITLE.avTitleLayout(previewData, AV_W, AV_H)', 'AV_TITLE.avDecodeFrame(previewLayout, previewData, replayFrame == null ? 1e9 : replayFrame, 30)',
  'transform={"translate(" + g.x + " " + g.y + ") scale(" + g.condense + " 1)"}', 'letterSpacing: p.tracking * p.size', 'height: PREVIEW_HEIGHT',
  'const ko = AV_CREDIT.avcKoMeasure(base);', 'AV_CREDIT.avCreditLayout(ko ? Object.assign({}, base, ko) : base, AV_W, AV_H)', 't(L, "previewUnavailable")', 'onClick={replayTitle}',
  'FontFace', 'timing: avOpeningTiming(openingSeconds)']) assert.ok(ui.includes(s), s);
// The preview really renders: the decode block lays out and fully decodes every preset's default title.
{
  const box2 = {}; vm.createContext(box2);
  vm.runInContext(block(panel, 'av-decode') + '\nthis.D = { avTitleLayout, avDecodeFrame };', box2);
  for (const p of presets.presets) {
    const data = { preset: p.id, ...Object.fromEntries(p.fields.map(f => [f.key, f.initial])), titleColor: p.colors.title, textColor: p.colors.text, taglineTracking: p.taglineTracking,
      size: 100, speed: 100, font: 'anton', fonts: p.fonts.map(f => ({ family: f.family, metrics: presets.metrics[f.family] })) };
    const layout = box2.D.avTitleLayout(data, 1920, 1080), state = box2.D.avDecodeFrame(layout, data, 1e9, 30);
    assert.equal(state.textOpacity, 1, p.id);
    assert.equal(state.glyphs.filter(g => !g.ghost).length, Array.from(layout.title.text).filter(c => !/\s/.test(c)).length, p.id + ' fully decoded');
    assert.equal(state.glyphs.map(g => g.ch).join(''), layout.title.text.replace(/\s/g, ''), p.id + ' shows the final text');
  }
}
// Credit: on by default, the preset's prefix and name, Credit shot off removes it from the build.
for (const s of ['const nameText = creditName ?? sampleName;', 'const creditUsed = creditOn && !!nameText.trim();',
  'credit: { on: creditUsed, prefix: prefixText.trim(), name: nameText.trim() }', 'onChange={(v: string) => setCreditName(fieldClip(String(v), nameMax))}',
  'onChange={(v: string) => setCreditPrefix(fieldClip(String(v), prefixMax))}', '{creditName == null && sampleName ? <ui.Message tone="muted">{t(L, "creditSample", { name: sampleName })}</ui.Message> : null}',
  ': !titleText ? (l) => t(l, "typeTitle")', ': listening ? (l) => t(l, "listening")']) assert.ok(ui.includes(s), s);
// Switching presets keeps typed text: only edits equal to the old preset's text (and the sample credit) follow the new preset.
for (const s of ['onClick={() => choosePreset(p.id)}', 'if (v != null && v !== (was?.initial ?? "")) out[fl.key] = fieldClip(v, fl.max);',
  'setCreditPrefix((v) => (v != null && v !== (old.credit?.prefix || "") ? v : null));', 'setCreditName((v) => (v != null && v !== (old.credit?.name || "") ? v : null));'])
  assert.ok(ui.includes(s), s);
// The readiness line counts the inventory; the output (montage shots, seconds) has its own line.
assert.ok(ui.includes('t(L, "ready", { summary: [clipCount, ...avAnalysisNotes(L, invAnalysis)].filter(Boolean).join(" · ") })'), 'readiness: inventory only');
// Length: "N of M shots fit" from the planner, durations from avVideoSeconds.
for (const s of ['const requested = avMontageShots(length, pace);', 'avFitShots({ requested, pace, bpm: tm.tempo, sectionStart: timed ? grid.firstBeat : 0, usableEnd: grid.usableEnd })',
  'const seconds = (n: number) => avVideoSeconds({ bpm: tm.tempo, pace, montageShots: n });', 't(L, "fitPartial", { length: lengthName, fitted, count: fit.top, seconds: tenths(videoSeconds) })',
  'readyPlan.shots < fitted', 'const shortened = plan.shots < fitted ?']) assert.ok(ui.includes(s), s);
// Music: four bundled cues, own music, no music; the default section is the cue's soft intro (avIntroSection).
assert.deepEqual(manifest.cues.map(c => c.id).sort(), ['before-everything', 'fractured', 'peaceful-drift', 'theta-frequency']);
for (const c of manifest.cues) assert.ok(c.introStart >= 0 && c.group === 'reference', c.id);
for (const s of ['{cues.map((c) => trackRow(c.id, c.label, bpmOf(c)))}', 'trackRow("own", t(L, "ownMusic"), "")', 'trackRow("none", t(L, "noMusic"), "")',
  'avIntroSection({ introStart: grid.introStart, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, beatEnergy: grid.beatEnergy, downbeatHigh: grid.downbeatHigh })',
  'introStart: cue.introStart', 'setSection(fit.defaultSection());', 'barSeconds={fit.timed ? (4 * 60) / tempo : 1}', 'snap={snap} onChange={moveSection}']) assert.ok(ui.includes(s), s);
for (const c of manifest.cues) {
  const box3 = {}; vm.createContext(box3); vm.runInContext(planner + '\nthis.P = { avIntroSection, avVideoSeconds, avMontageShots };', box3);
  for (const length of ['short', 'standard', 'long']) for (const pace of ['cinematic', 'quick']) {
    const videoSeconds = box3.P.avVideoSeconds({ bpm: c.bpm, pace, montageShots: box3.P.avMontageShots(length, pace) });
    assert.equal(box3.P.avIntroSection({ introStart: c.introStart, firstBeat: c.firstBeat, bpm: c.bpm, usableEnd: c.usableEnd, videoSeconds, beatEnergy: c.beatEnergy }), c.introStart, c.id + ' ' + length + ' ' + pace);
  }
}
// The section preview plays a blob of the track's bytes from the section start and fades out at its end (no shell).
for (const s of ['const bytes = await readBytes(file);', 'URL.createObjectURL(new Blob([bytes as any], { type: audioType(file) }))', 'audio.currentTime = from;',
  'audio.volume = Math.max(0, Math.min(1, (end - at) / PREVIEW_FADE));', 'if (at >= end) { stopPreview(); return; }', 'URL.revokeObjectURL(previewUrlRef.current)',
  'const file = musicKind === "own" ? ownMusic!.path : pjoin(roots.plugin, "assets", "cues", cue.file);']) assert.ok(ui.includes(s), s);
// Own music: decoded by the host's ffmpeg (WebAudio without it), analysed in a worker only, cancellable, stale results
// dropped; any failure falls back to fixed timing.
for (const s of ['samples = await decodeOwnMusic(file.path, roots.data, abort.signal);', 'const g = await analyseBeat(assets.beatWorker, samples, abort.signal);',
  'hostDecodePcm(path, dataDir, OWN_RATE, OWN_MAX_SECONDS, signal)', 'ctx.decodeAudioData(bytes.slice().buffer)', 'worker = new Worker(url);', 'try { worker?.terminate(); } catch',
  'const live = () => mountedRef.current && ownJobRef.current.id === id && projectRef.current === pid;', 'setOwnGrid({ accepted: false, grid: "none", failed: true, durationSeconds: duration, peaks: [] });',
  'if (v !== "own") { cancelOwnMusic(); setOwnMusic(null); setOwnGrid(null); }', 'if (cancelOwnMusic() && mountedRef.current) { setOwnMusic(null); setOwnGrid(null); }',
  'worker-src * data: blob:', 'const v = await hostProbeSeconds(file.path);', 't(L, "ownMusicHint", { count: OWN_MAX_SECONDS / 60 })']) assert.ok(ui.includes(s), s);
assert.ok(/const OWN_RATE = 22050;/.test(panel) && /const OWN_MAX_SECONDS = 240;/.test(panel));
assert.ok(!/analyze\(samples, OWN_RATE/.test(ui), 'never analysed on the panel thread');
// The music cue is imported from the install folder by a joined path.
assert.ok(ui.includes('musicPath: musicKind === "own" ? ownMusic!.path : musicKind === "cue" ? pjoin(roots.plugin, "assets", "cues", cue.file) : null'));
assert.ok(ui.includes('fill(assets.scripts.ensureJs, { projectId: pid, path: pjoin(roots.plugin, "assets", "cues", cue.file) })'), 'template run cue path');
// Advanced: Clip sound, the Cinematic look (strength follows the preset until moved), photos, Choose clips (thin stable
// scrollbar for Windows).
for (const s of ['label={t(L, "clipSound")}', 'label={t(L, "cinematicLook")}', '<ui.Slider label={t(L, "param.look")} value={strength} min={0} max={1} step={0.05}',
  'const strength = lookStrength ?? presetStrength;', 'label={t(L, "usePhotos")}', 'aria-label={t(L, "chooseClips")}', 'scrollbarGutter: "stable", scrollbarWidth: "thin"']) assert.ok(ui.includes(s), s);
assert.ok(ui.includes('const cw = Math.round(width * dpr), chh = Math.round(WAVE_HEIGHT * dpr);'), 'canvas backing store in whole device pixels');
// Build: plan, music, assemble, decorate (two commits), open; stale-project guards; retry and new seed.
for (const s of ['const check = () => { if (projectRef.current !== pid) throw STALE; };', 'a = await run("Assemble Archive Vlog",', 'await run("Add title and look",',
  'async function finishTitle() {', 'try { await decorate(result, check); }', 'const s = seed + 1;', 'const gate = nextSeed === seed ? blockReason : anotherBlock;',
  'saved = await findDraftByName(pid, frozen.draftName);', 'draftName: draftNameOf(titleFields.title, chosen.label, new Date()),']) assert.ok(ui.includes(s), s);
assert.equal((ui.match(/avPlanBuild\(\{/g) || []).length, 3, 'the build plan, the readiness plan and the template run');
assert.ok(ui.includes('const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };'));
assert.ok(!/startAnalysis|analyzeResources/.test(ui), 'the panel does not start analysis');
assert.ok(!/new Function|\beval\(/.test(ui), 'no runtime evaluation in the panel');
// The analysis wording helpers (inventory skipped counts), per status, in every language.
{
  const start = panel.indexOf('function avAnalysisCounts('), end = panel.indexOf('const WAVE_HEIGHT');
  const js = panel.slice(start, end).replace(/(\w)\??: (?:any|number|string|Lang)\b/g, '$1');
  const tt = (lang, key, vars = {}) => {
    let msg = strings[lang][key] ?? strings.en[key];
    if (typeof msg !== 'string') msg = msg[new Intl.PluralRules(lang).select(vars.count)] ?? msg.other;
    return msg.replace(/\{(\w+)\}/g, (w, n) => (vars[n] === undefined ? w : String(vars[n])));
  };
  const b = { t: tt }; vm.runInNewContext(js + '\nthis.api = { avAnalysisCounts, avAnalysisText };', b);
  const sk = (analysing, notAnalysed, failed) => ({ unanalysed: analysing + notAnalysed + failed, analysing, notAnalysed, failed, statusKnown: true });
  assert.equal(b.api.avAnalysisText('en', b.api.avAnalysisCounts(sk(1, 0, 0))), '1 clip is being analysed. This updates automatically when it finishes.');
  for (const l of ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']) assert.ok(!/undefined|\{\w+\}/.test(b.api.avAnalysisText(l, b.api.avAnalysisCounts(sk(3, 1, 2)))), l);
}

hostTests.then(() => console.log('panel ok'), e => { console.error(e); process.exit(1); });
