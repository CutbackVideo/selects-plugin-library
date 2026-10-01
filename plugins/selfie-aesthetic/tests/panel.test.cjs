// plugins/selfie-aesthetic/tests/panel.test.cjs (run: node plugins/selfie-aesthetic/tests/panel.test.cjs)
// Static and node:vm checks of panel.tsx: the embedded planner / host / beat blocks are verbatim copies, every UI
// string goes through t() and STRINGS, nothing in the runtime path needs a POSIX shell (Windows), the configs sent to
// each script have the shapes the scripts read, and the pure helpers (progress, spans, own-music section, the beat
// worker) behave.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const panel = read('panel.tsx');
const planner = read('planner.js');
const hostSrc = read('dev', 'host-block.ts');
const beatSrc = read('beat-detect.cjs');
const { extractStrings, checkPanel } = require(path.join(root, 'dev', 'i18n-check.cjs'));
const block = extractStrings(panel), en = block.strings.en;
// `code` is the panel without the STRINGS block; `own` is code without the three verbatim blocks (the panel's own code).
const code = panel.slice(0, block.begin) + panel.slice(block.end);
const between = (src, a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
  assert.ok(i >= 0 && j > i, 'markers ' + a + ' / ' + b);
  return src.slice(i + a.length, j);
};
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); return src.slice(0, i) + src.slice(j + b.length); };
const own = cut(cut(cut(code, '// sae-planner:start', '// sae-planner:end'), '// sae-host:start', '// sae-host:end'), '// sae-beat:start', '// sae-beat:end');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const plain = (x) => JSON.parse(JSON.stringify(x));

// ---- verbatim blocks ----
test('planner.js is embedded verbatim between the sae-planner markers', () => {
  assert.ok(panel.includes(planner.trim()), 'panel.tsx must embed planner.js verbatim');
  assert.equal(between(panel, '// sae-planner:start\n', '\n// sae-planner:end'), planner.trim());
});
test('the host block is identical to dev/host-block.ts', () => {
  assert.equal(between(panel, '// sae-host:start', '// sae-host:end'), between(hostSrc, '// sae-host:start', '// sae-host:end'));
});
const beatCore = beatSrc.slice(0, beatSrc.search(/^module\.exports\b/m));
test('the beat block wraps beat-detect.cjs up to its module.exports line', () => {
  const region = between(panel, '// sae-beat:start\n', '// sae-beat:end');
  assert.ok(region.startsWith('const saeBeat = (function () {\n'), 'IIFE head');
  assert.ok(region.endsWith('return { analyze };\n})();\n'), 'IIFE tail');
  assert.equal(between(region, 'const saeBeat = (function () {\n', 'return { analyze };\n})();'), beatCore);
});

// ---- i18n ----
test('STRINGS block and t() keys pass the kit checker (en defined, every key used, no Hangul, headers)', () => {
  const r = checkPanel(panel, { pluginJson: null, file: 'panel.tsx' });
  assert.ok(r.ok, r.report);
  for (const k of Object.keys(en)) assert.ok(new RegExp('\\bt(?:Or)?\\(\\s*\\w+\\s*,\\s*"' + k.replace(/[.]/g, '\\.') + '"').test(code) || k.startsWith('step.'), 'key used with t(): ' + k);
  const head = panel.split('\n').slice(0, 24).join('\n');
  assert.match(head, /^\/\/ @name Selfie Aesthetic Edit$/m);
  assert.match(head, /^\/\/ @name:ko Selfie Aesthetic Edit$/m);
  assert.match(head, /^\/\/ @icon \w+$/m);
});
test('readiness, progress and counters are whole sentences with {vars}', () => {
  const textOf = (k) => (typeof en[k] === 'string' ? en[k] : Object.values(en[k]).join('\n'));
  assert.equal(en.ready, 'Ready: {summary}');
  assert.deepEqual(plain(en.readyCloseUps), { one: '{count} close-up clip', other: '{count} close-up clips' });
  assert.deepEqual(plain(en.readyPhotos), { one: '{count} photo', other: '{count} photos' });
  assert.equal(en.aboutSeconds, 'about {seconds} s');
  assert.equal(en.progress, 'Step {step}/{total} · {name} · {percent}%');
  assert.equal(en.progressDetail, 'Step {step}/{total} · {name} ({detail}) · {percent}%');
  assert.equal(en.videosChecked.other, '{done}/{count} videos checked');
  assert.equal(en.barsFit.other, '{fit} of {count} bars fit');
  assert.equal(en['note.fewFaces'].other, 'Only {count} close-up clips found — the edit reuses them');
  assert.equal(en.beatNone, 'No steady beat found; cuts use a fixed length');
  assert.equal(en.needsNewerSelects, 'This needs a newer version of Selects.');
  // Two-number plurals keep the noun next to {count}.
  for (const k of ['barsFit', 'videosChecked', 'videosSearched', 'videosMeasured', 'note.shrunk']) for (const form of Object.values(en[k])) assert.match(form, /\{count\} (bars?|videos?)\b/, k);
  for (const k of ['ready', 'readyClips', 'readyCloseUps', 'readyPhotos', 'aboutSeconds', 'progress', 'progressDetail']) assert.match(textOf(k), /\{\w+\}/, k);
  // No sentence built by concatenation.
  assert.ok(!/"Step " \+|\+ " ?(clips?|photos?|videos?|bars?|s)"|"Ready: " \+/.test(own), 'no concatenated sentences');
  assert.ok(own.includes('t(L, "ready", { summary: readyFacts })'), 'ready line through t()');
  assert.ok(own.includes('t(L, "progressDetail", { step: progress.current + 1, total: SAE_BUILD_STEPS.length, name: t(L, "step." + progress.id), detail: progress.detail(L), percent: progress.percent })'));
});
test('UI text lives in STRINGS: no literal JSX text or labels, state text is a say(lang) function', () => {
  assert.ok(!/<ui\.\w+[^>]*>[A-Z][a-z]+[^<{]*</.test(own), 'no literal JSX text in ui components');
  assert.ok(!/\b(label|title|busyLabel|aria-label|aria-valuetext|placeholder)="[A-Za-z]/.test(own), 'no literal label props');
  assert.ok(!/text: "/.test(own) && !/setStatus\(\{ tone: "\w+", text:/.test(own), 'status messages are say closures');
  assert.ok(own.includes('const L = uiLang(context);') && own.indexOf('const L = uiLang(context);') < own.indexOf('if (!projectId) return <ui'), 'uiLang(context) every render');
  for (const s of ['{status.say(L)}', 'invError.say(L)', 'progress.detail(L)', 'ownStatus.say(L)', 'fatal.say(L)', '<SectionSlider lang={L}']) assert.ok(own.includes(s), s);
  // keep-all only under Korean.
  const keepAll = own.split('\n').filter((l) => l.includes('keep-all'));
  assert.ok(keepAll.length >= 1 && keepAll.every((l) => /=== "ko" \? "keep-all"/.test(l)), 'keep-all only when the UI is Korean');
});
test('Adjust labels and Look options: English defaults match decorate.js and STRINGS.en', () => {
  const deco = read('scripts', 'decorate.js');
  const m = deco.match(/const LABELS = \{ look: '([^']+)', lookStrength: '([^']+)', whip: '([^']+)', framing: '([^']+)'/);
  assert.ok(m, 'decorate.js LABELS');
  assert.deepEqual([en['param.look'], en['param.lookStrength'], en['param.whip'], en['param.framing']], [m[1], m[2], m[3], m[4]]);
  for (const id of ['tight', 'full']) {
    assert.ok(own.includes('{ label: "' + en['framing.' + id] + '", value: "' + id + '" }'), 'FRAMING_OPTIONS ' + id);
    assert.ok(deco.includes("{ label: '" + en['framing.' + id] + "', value: '" + id + "' }"), 'decorate.js framing default ' + id);
  }
  assert.ok(own.includes('framingOptions: FRAMING_OPTIONS.map((o) => ({ label: framingLabel(bl, o.value), value: o.value })),'));
  for (const id of ['soft-glow', 'night-glam', 'clean', 'none']) assert.ok(own.includes('{ label: "' + en['look.' + id] + '", value: "' + id + '" }'), 'LOOK_OPTIONS ' + id);
  assert.ok(own.includes('adjustLabels: { look: t(bl, "param.look"), lookStrength: t(bl, "param.lookStrength"), whip: t(bl, "param.whip"), framing: t(bl, "param.framing") }'));
  assert.ok(own.includes('lookOptions: LOOK_OPTIONS.map((o) => ({ label: lookLabel(bl, o.value), value: o.value }))'));
  assert.ok(/const bl = langRef\.current;/.test(own), 'labels use the build-time language');
});

// ---- Windows: no POSIX shell, host I/O only through the host block ----
test('no shell, no node spawn, no POSIX paths in the panel', () => {
  for (const token of ['runShell', 'mkdir -p', 'printf', '$HOME', 'rm -f', 'base64 ', 'export PATH', 'command -v', '/tmp', 'captureFrames']) {
    assert.ok(!panel.includes(token), 'panel.tsx contains ' + JSON.stringify(token));
  }
  assert.ok(!/["'`]node\s/.test(panel) && !/\bnode\s+["'`]/.test(panel) && !/child_process|execFile|spawn\(/.test(panel), 'no node spawn');
  assert.ok(!/\+ ?["']\/["']/.test(panel) && !/["']\/["'] ?\+/.test(panel), 'no "/" path building');
  assert.ok(!/metaKey/.test(panel), 'no metaKey-only shortcuts');
  // Paths come from FileSystem.join through the host block.
  for (const s of ['saeSkillsDir(PLUGIN_ID)', 'saeDataDir(PLUGIN_ID)', 'saeDI().fs.join(skillsDir, "assets", "cues", ', 'fs.join(dir, ...parts)', 'saeDecodePcm(file.path, dataDir, SAE_PCM_SECONDS)', 'saePreviewUrl(file, start, seconds, dataDir)', 'saeProbeDuration(']) assert.ok(own.includes(s), s);
  assert.ok(!/window\.parent/.test(own), 'the panel reaches __DI__ only through the host block');
  assert.ok(/new TextDecoder\(\)\.decode\(saeBytes\(raw\)\)/.test(own), 'file bytes decoded with TextDecoder');
  // Host error codes map to localized messages; a missing FileSystem stops the panel with "needs a newer Selects".
  for (const s of ['code === "host_tools"', 'code === "timeout"', 't(l, "needsNewerSelectsMusic")', 't(l, "musicTimeout")', 't(l, "previewTimeout")', 't(l, "musicUnreadable", { detail })', 't(l, "previewFailed", { detail })',
    'String(e?.message) === "host_tools"', 't(l, "needsNewerSelects")', 'saeHas(["rt.runFFmpeg", "fs.join", "fs.homedir", "fs.mkdirSync"])']) assert.ok(own.includes(s), s);
});
test('panel UI: canvas DPR backing, scrollbar gutter, slider keyboard, theme tokens, tiles', () => {
  for (const s of ['role="slider"', 'aria-valuenow', 'aria-valuetext', 'ResizeObserver', 'devicePixelRatio', 'Math.round(width * dpr)', 'Math.round(WAVE_HEIGHT * dpr)', 'setPointerCapture', 'hasPointerCapture', '"grabbing"', '"ArrowLeft"', '"ArrowRight"', '"Home"', '"End"',
    'scrollbarGutter: "stable"', 'aria-pressed={on}', 'height: "auto"', 'maxWidth: "none"', '--panel-fg', '--panel-muted-fg', '--panel-border', 'requestAnimationFrame', 'cancelAnimationFrame', '"Escape"']) assert.ok(own.includes(s), s);
  assert.ok(!/--text-tertiary|var\(--accent\b/.test(panel), 'only --panel-* tokens');
  // Hooks stay before the early returns.
  const early = own.indexOf('if (!projectId) return <ui');
  const comp = own.slice(own.indexOf('function SelfieAestheticPanel('), early);
  assert.ok(comp.includes('addEventListener("visibilitychange"') && comp.includes('React.useMemo('), 'hooks before the early return');
  assert.ok(!own.slice(early).includes('React.use'), 'no hook after the early return');
});

// ---- scripts, configs and the build pipeline ----
const assetFiles = vm.runInNewContext('(' + between(own, 'const ASSET_FILES = ', ';\n') + ')');
test('every plugin file the panel reads exists', () => {
  const files = Object.values(assetFiles).map((parts) => path.join(root, ...parts));
  assert.equal(files.length, 9);
  for (const f of files) assert.ok(fs.existsSync(f), 'missing ' + f);
  for (const s of ['inventory.js', 'search.js', 'ensure-audio.js', 'assemble.js', 'decorate.js', 'selfie-whip-look.tsx', 'selfie-whip-transition.tsx', 'manifest.json', 'beat-detect.cjs']) assert.ok(own.includes('"' + s + '"'), s);
});
test('whip mode defaults to effect; queries match the spec and search.js', () => {
  assert.match(own, /const SAE_WHIP_MODE: "effect" \| "transition" = "effect";/);
  const q = vm.runInNewContext('(' + between(own, 'const SAE_QUERIES = ', ';\n') + ')');
  const spec = {
    selfie: "close-up selfie of a person's face looking at the camera",
    hand: 'person touching their face or hair with a hand, close-up',
    expression: 'person making a face, pouting or smiling at the camera, close-up',
    glance: 'person glancing away and back to the camera, close-up portrait',
    control: 'a landscape, street, room, food or object with no person',
  };
  assert.deepEqual(JSON.parse(JSON.stringify(q)), spec);
  const search = read('scripts', 'search.js');
  for (const [role, text] of Object.entries(spec)) assert.ok(search.includes(role) && search.includes('"' + text + '"'), 'search.js documents ' + role);
  assert.ok(own.includes('const SAE_SEARCH_PAGE_SIZE = 8;') && own.includes('const SAE_SEARCH_BATCH = 4;'));
  assert.ok(own.includes('{ projectId: pid, rids: batch, queries: SAE_QUERIES, pageSize: SAE_SEARCH_PAGE_SIZE }'));
});
test('configs sent to each script carry what the scripts read', () => {
  assert.ok(own.includes('"JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"'), 'fill passes the config through JSON.parse');
  // inventory: measureMs 0 while Use photos is off.
  assert.ok(own.includes('fill(assets.scripts.inventoryJs, { projectId: pid, only: null, known: photoSizesRef.current, ...(settings.usePhotos ? {} : { measureMs: 0 }) })'));
  // bad spans via sdk.call, guarded.
  assert.ok(own.includes('sdk.call("getResourceVisualSpans", pid, id)') && own.includes('catch { return null; }'));
  // planner: photos / usePhotos / seed / section.
  assert.ok(own.includes('saePlanBuild({ fps: 30, bars: settings.bars, seed: nextSeed, cue: settings.cue, sectionStart: settings.section ?? undefined,'));
  assert.ok(own.includes('candidates, durations, badSpans, photos, usePhotos: settings.usePhotos, motion, stillWeight: SAE_STILL_WEIGHT_PANEL })'));
  // Stillness picker: off by default (no motion step, plans as before); on, motion per clip through the host block, guarded.
  assert.ok(own.includes('const SAE_STILL_WEIGHT_PANEL: number = 0;'), 'stillness picker off until the Staging A/B');
  assert.ok(own.includes('const stillOn = SAE_STILL_WEIGHT_PANEL > 0 && saeHas(["rt.runFFmpeg", "fs.join", "fs.homedir", "fs.mkdirSync"]).ok;'));
  assert.ok(own.includes('await saeMotionCurve(pathOf[rid], dataDir, {})') && own.includes('t(l, "videosMeasured", { done, count: total })'));
  assert.ok(own.includes('motion, stillWeight: SAE_STILL_WEIGHT_PANEL });'), 'the dry run uses the cached motion too');
  // ensure-audio: bundled cue path from the skills dir; own music never matched by name.
  assert.ok(own.includes('fill(assets.scripts.ensureJs, { projectId: pid, path, ...(own ? { matchByName: false } : {}) })'));
  // assemble.
  for (const s of ['projectId: pid, draftName: name, holds, cutSecondsRaw: plan.cutSecondsRaw,', 'music: music ? { resourceId: music.resourceId, sourceStart: plan.musicSourceStart } : null,', 'durations, crops, clipSound: settings.clipSound, ambientDb: AMBIENT_DB }), true)']) assert.ok(own.includes(s), s);
  const asm = read('scripts', 'assemble.js');
  for (const k of ['cfg.draftName', 'cfg.holds', 'cfg.cutSecondsRaw', 'cfg.music.sourceStart', 'cfg.music.resourceId', 'cfg.durations', 'cfg.crops', 'cfg.clipSound', 'cfg.ambientDb']) assert.ok(asm.includes(k), 'assemble.js reads ' + k);
  // decorate.
  for (const s of ['sequenceId: a.sequenceId, holds, whipMode: SAE_WHIP_MODE,', 'effect: { tsx: assets.effectTsx, look: settings.lookOn ? preset.id : "none", lookStrength: preset.strength ?? LOOK_STRENGTH, whip: preset.whip },',
    'transitionTsx: assets.transitionTsx, covers: a.covers || [], clipSound: settings.clipSound,']) assert.ok(own.includes(s), s);
  const deco = read('scripts', 'decorate.js');
  for (const k of ['cfg.sequenceId', 'cfg.holds', 'cfg.whipMode', 'cfg.effect', 'cfg.covers', 'cfg.clipSound', 'cfg.adjustLabels', 'cfg.lookOptions', 'cfg.transitionTsx']) assert.ok(deco.includes(k), 'decorate.js reads ' + k);
  assert.ok(own.includes('const LOOK_STRENGTH = 0.35;'));
  assert.ok(/\{ id: "clean", strength: 0\.35, whip: 0\.7,/.test(own) && /\{ id: "soft-glow", strength: 0\.5, whip: 1,/.test(own), 'Clean whips at 0.7; Soft glow ships at strength 0.5');
  // Commit calls are never resent; project-switch guard after the awaits of the build.
  assert.match(own, /No valid session ID/);
  assert.ok(own.includes('if (r.isError && !allowCommit &&'), 'only non-committing calls are resent');
  const buildBody = between(own, 'async function build(nextSeed: number) {', 'async function decorate(');
  const awaits = (buildBody.match(/await /g) || []).length, checks = (buildBody.match(/check\(\);/g) || []).length;
  assert.ok(checks >= 5 && awaits <= checks + 3, 'check() after the awaits (' + awaits + ' awaits, ' + checks + ' checks)');
  assert.ok(buildBody.includes('stopPreview()'), 'Build stops the preview');
  // Try other shots: new seed, cached search; Finish look re-runs decorate only with the frozen config.
  assert.ok(/const s = seed \+ 1;/.test(own) && own.includes('build(s);'));
  assert.ok(own.includes('await decorate(result.deco, check);'));
  assert.ok(own.includes('searchCache.current.get(pid + "|" + rid)') && own.includes('searchCache.current.set(pid + "|" + rid,'), 'search cache keyed on projectId|rid');
  assert.ok(!/toISOString/.test(own), 'the Draft name uses local time');
});

// ---- pure helpers in node:vm (planner + panel helpers + a t() over STRINGS) ----
const tt = (lang, key, vars = {}) => {
  let msg = block.strings[lang][key] ?? en[key];
  if (msg === undefined) return key;
  if (typeof msg !== 'string') msg = msg[new Intl.PluralRules(lang).select(Number(vars.count) || 0)] ?? msg.other;
  return msg.replace(/\{(\w+)\}/g, (w, n) => (vars[n] === undefined ? w : String(vars[n])));
};
const box = { t: tt, console };
vm.createContext(box);
vm.runInContext(planner + '\n' + between(own, '// sae-panel:start', '// sae-panel:end')
  + '\nthis.api = { SAE_BUILD_STEPS, saeProgress, saeSpansOf, saeRealIds, saeDraftName, saeTrimHolds, saeOwnCue, saeLoudestSection, saeAnalysisCounts, saeAnalysisText, saeAnalysisNotes, saePlanNotes, saePlanBuild, saeVideoSeconds, saeSectionRange, saeBarGrid, SAE_LEAD };', box);
const api = box.api;

test('progress: five steps, monotonic, 100% only at the very end', () => {
  assert.deepEqual(plain(api.SAE_BUILD_STEPS.map((s) => s.id)), ['check', 'search', 'plan', 'assemble', 'look']);
  assert.deepEqual(['check', 'search', 'plan', 'assemble', 'look'].map((id) => en['step.' + id]), ['Checking clips', 'Finding close-ups', 'Planning the edit', 'Building the Draft', 'Adding whip and look']);
  let prev = -1;
  for (const s of api.SAE_BUILD_STEPS) for (const f of [0, 0.25, 0.5, 0.99, 1]) {
    const p = api.saeProgress(s.id, f);
    assert.ok(p.value >= prev, 'never backwards');
    prev = p.value;
    if (!(s.id === 'look' && f === 1)) assert.ok(p.percent < 100, '100% only at the end: ' + s.id + ' ' + f);
  }
  assert.equal(api.saeProgress('look', 1).percent, 100);
  assert.equal(api.saeProgress('assemble', 0).current, 3);
  assert.throws(() => api.saeProgress('open', 0));
  // The panel keeps the bar where it is when a report comes in lower.
  assert.ok(own.includes('const p = prev && prev.value > next.value ? { ...prev, detail } : { ...next, detail };'));
});
test('bad-shot spans: every track merged, malformed entries skipped; alias ids mapped once', () => {
  assert.deepEqual(plain(api.saeSpansOf({ spans: { 1: { badShotSpans: [[4, 5], [1, 2]] }, 0: { badShotSpans: [[0.5, 0.8], [3, 3], ['x', 2], [7]] } } })), [[0.5, 0.8], [1, 2], [4, 5]]);
  assert.deepEqual(plain(api.saeSpansOf({ spans: {} })), []);
  assert.deepEqual(plain(api.saeSpansOf(null)), []);
  assert.deepEqual(plain(api.saeSpansOf({ spans: { 0: null } })), []);
  const resources = [{ rid: 'r0', name: 'a.mp4', duration: 4 }, { rid: 'r1', name: 'b.mp4', duration: 6 }, { rid: 'r2', name: 'c.mp4', duration: 2 }];
  assert.deepEqual(plain(api.saeRealIds([{ resourceId: 'r0' }, { resourceId: 'r1' }], resources)), { r0: 'r0', r1: 'r1' });
  const rows = [{ resourceId: 'u-a', name: 'a.mp4', type: 'Video', durationSeconds: 4.01 }, { resourceId: 'u-b', name: 'b.mp4', type: 'Video', durationSeconds: 6 },
    { resourceId: 'u-b2', name: 'b.mp4', type: 'Video', durationSeconds: 6.02 }, { resourceId: 'u-c', name: 'c.mp4', type: 'Image', durationSeconds: 2 }];
  assert.deepEqual(plain(api.saeRealIds(rows, resources)), { r0: 'u-a' }, 'ambiguous and non-video rows stay unmapped');
  assert.deepEqual(plain(api.saeRealIds(null, resources)), {});
});
test('Draft name is ASCII "Selfie Aesthetic Edit - YYYY-MM-DD HH:MM" in local time', () => {
  const name = api.saeDraftName(new Date(2026, 9, 1, 7, 5));
  assert.equal(name, 'Selfie Aesthetic Edit - 2026-10-01 07:05');
  assert.ok(/^[\x20-\x7e]+$/.test(name), 'ASCII');
  assert.match(api.saeDraftName(new Date()), /^Selfie Aesthetic Edit - \d{4}-\d\d-\d\d \d\d:\d\d$/);
});
test('holds sent to the scripts keep exactly the fields they read', () => {
  const h = { i: 0, bar: 0, kind: 'video', rid: 'r1', moment: 'A', srcStart: 1.25, frames: 9, startFrame: 0, endFrame: 9, beats: 1, startBeat: 0, endBeat: 1,
    cutIn: 'none', cutOut: 'dir', angleIn: 0, angleOut: 30.5, angle: 30.5, framing: null };
  assert.deepEqual(Object.keys(api.saeTrimHolds([h])[0]), ['i', 'bar', 'kind', 'rid', 'moment', 'srcStart', 'frames', 'cutIn', 'cutOut', 'angleIn', 'angleOut', 'angle', 'framing']);
  const deco = read('scripts', 'decorate.js'), asm = read('scripts', 'assemble.js');
  for (const k of ['cutIn', 'cutOut', 'angleIn', 'angleOut', 'angle', 'framing', 'kind', 'rid']) assert.ok(deco.includes('.' + k), 'decorate.js reads hold.' + k);
  for (const k of ['kind', 'rid', 'srcStart']) assert.ok(asm.includes('.' + k), 'assemble.js reads hold.' + k);
});
test('own music: cue from the analysis, loudest bar-aligned section inside the fit range', () => {
  const bpm = 100, first = 0.3, period = 60 / bpm;
  const beatEnergy = Array.from({ length: 300 }, (_, b) => (b >= 120 && b < 180 ? 0.9 : 0.2));
  const cue = api.saeOwnCue({ bpm, firstBeat: first, grid: 'accepted', durationSeconds: 200, peaks: [0.1], beatEnergy, onsets: [], onsetThresholds: { l: 3 } });
  assert.equal(cue.own, true);
  const s = api.saeLoudestSection(cue, 4, 100);
  const bar = api.saeBarGrid(cue).bar;
  assert.ok(Math.abs(((s - first) / bar) - Math.round((s - first) / bar)) < 1e-9, 'on a bar line');
  const b0 = Math.round((s - first) / period), span = Math.ceil(api.saeVideoSeconds(4, 100) / period);
  assert.ok(b0 >= 120 && b0 + span <= 180, 'inside the loud stretch: beat ' + b0);
  const r = api.saeSectionRange(cue, 4, 100);
  assert.ok(s >= r.min && s <= r.max);
  // No usable grid or energy: the planner's default applies.
  assert.equal(api.saeLoudestSection(api.saeOwnCue({ grid: 'none', durationSeconds: 100 }), 4, 97), null);
  assert.equal(api.saeLoudestSection(api.saeOwnCue(null, 30), 4, 97), null);
  assert.equal(api.saeOwnCue(null, 42).durationSeconds, 42);
  assert.equal(api.saeOwnCue(null, undefined).grid, 'none');
  // A failed analysis still plans (fixed tempo) and the build gets a plan.
  const plan = api.saePlanBuild({ fps: 30, bars: 4, seed: 1, cue: api.saeOwnCue(null, 60), candidates: [], durations: { r0: 5, r1: 6, r2: 4 }, photos: [], usePhotos: true });
  assert.equal(plan.ok, true);
  assert.ok(plan.notes.includes('fixed-tempo'));
});
test('readiness wording: analysis counts, short clips, plan notes', () => {
  const c = api.saeAnalysisCounts({ unanalysed: 3, analysing: 2, notAnalysed: 1, failed: 0, short: 2, statusKnown: true });
  assert.equal(api.saeAnalysisText('en', c), '2 clips are being analysed. This updates automatically when they finish. 1 clip is not analysed yet. Analyse it in Selects to use it here.');
  assert.deepEqual(plain(api.saeAnalysisNotes('en', c).filter(Boolean)), ['2 clips being analysed', '1 clip not analysed yet', '2 clips under 1.2 s skipped']);
  assert.equal(api.saeAnalysisText('en', api.saeAnalysisCounts({ unanalysed: 1 })), '1 clip is not analysed yet. If Selects is analysing it, this updates automatically.');
  const notes = (n, faceClips, fit) => plain(api.saePlanNotes('en', { notes: n, faceClips, fit }));
  assert.deepEqual(notes(['few-face'], 2), ['Only 2 close-up clips found — the edit reuses them']);
  assert.deepEqual(notes(['few-face'], 1), ['Only 1 close-up clip found — the edit reuses it']);
  assert.deepEqual(notes(['few-face'], 0), ['No close-up clips found, so the edit uses your other clips and photos']);
  assert.deepEqual(notes(['shrunk', 'fixed-tempo', 'no-music', 'pair-reuse', 'adjacent', 'reused', 'photo-run'], 3, { bars: 3, wanted: 6 }),
    ['Your footage fits 3 of 6 bars, so the edit is shorter. Add more clips or photos for the full length.', 'No steady beat found; cuts use a fixed length', 'No music: cuts follow a steady 97 BPM rhythm', 'Very few clips: some moments repeat', 'Very few clips: the same clip plays in neighbouring bars']);
  const poll = (own.match(/const needsPoll = ([^\n]*);/) || [])[1];
  assert.ok(poll, 'needsPoll');
  const needsPoll = (inventory) => vm.runInNewContext(poll, { inventory, invAnalysis: api.saeAnalysisCounts(inventory && inventory.skipped) });
  assert.equal(needsPoll({ skipped: { unanalysed: 2, analysing: 2, notAnalysed: 0, failed: 0 }, resources: [{}], photos: [] }), true);
  assert.equal(needsPoll({ skipped: { unanalysed: 2, analysing: 0, notAnalysed: 2, failed: 0 }, resources: [{}], photos: [] }), false);
  assert.equal(needsPoll({ skipped: { unanalysed: 0, analysing: 0, notAnalysed: 0, failed: 0 }, resources: [], photos: [] }), true);
  assert.ok(own.includes('setInterval(() => { loadInventory(pid); }, 10000)') && own.includes('addEventListener("focus"') && own.includes('>{t(L, "refresh")}<'));
});

// ---- own-music beat detection: worker source parity with beat-detect.cjs ----
const sr = 22050;
function clickTrack(bpm, first, seconds) {
  const x = new Float32Array(Math.round(seconds * sr));
  for (let t = first; t < seconds; t += 60 / bpm) {
    const i0 = Math.round(t * sr);
    for (let k = 0; k < 400 && i0 + k < x.length; k++) x[i0 + k] += Math.sin(2 * Math.PI * 1000 * k / sr) * Math.exp(-k / 80);
  }
  return x;
}
const workerBlock = between(own, '// sae-beat-worker:start', '// sae-beat-worker:end');
const wbox = {};
vm.runInNewContext(workerBlock + '\nthis.api = { saeBeatWorkerSource, SAE_PCM_RATE, SAE_PCM_SECONDS, SAE_FALLBACK_SECONDS };', wbox);
test('decode parameters match the CLI path (mono f32le 22050 Hz, 240 s, fallback 60 s)', () => {
  assert.equal(wbox.api.SAE_PCM_RATE, 22050);
  assert.equal(wbox.api.SAE_PCM_SECONDS, 240);
  assert.equal(wbox.api.SAE_FALLBACK_SECONDS, 60);
  assert.ok(hostSrc.includes("'-ac', '1', '-ar', '22050', '-f', 'f32le'"), 'saeDecodePcm decodes mono 22050 f32le');
  for (const s of ['saeBeatWorkerSource(assets.beatText)', 'new Worker(url)', 'worker.postMessage({ id, buf: pcm.buffer, rate: SAE_PCM_RATE }, [pcm.buffer])', 'worker.terminate()', 'URL.revokeObjectURL(url)',
    'pcm.slice(0, Math.min(pcm.length, SAE_FALLBACK_SECONDS * SAE_PCM_RATE))', 'saeBeat.analyze(head, SAE_PCM_RATE, undefined)', 'await saeYield();', 'reject({ fallback: true, cause: ev })', 'SAE_BEAT_TIMEOUT_MS']) assert.ok(own.includes(s), s);
  // The fallback copy is taken before the transfer detaches the buffer.
  assert.ok(own.indexOf('head = pcm.slice(0,') < own.indexOf('an = await beatInWorker(exact, id)'));
});
test('the worker source runs the unmodified beat-detect.cjs and matches analyze() on a synthetic 120 BPM click', () => {
  const src = wbox.api.saeBeatWorkerSource(beatSrc);
  assert.ok(src.includes(beatSrc), 'the file text is unmodified');
  const posted = [];
  const self = { postMessage: (m) => posted.push(m), onmessage: null };
  vm.runInNewContext(src, { self, Float32Array, Math, Number, Array, Object, String, JSON, Infinity, NaN, isFinite });
  assert.equal(typeof self.onmessage, 'function');
  const pcm = clickTrack(120, 0.5, 40);
  const direct = require(path.join(root, 'beat-detect.cjs')).analyze(pcm, sr);
  const copy = pcm.slice();
  self.onmessage({ data: { id: 7, buf: copy.buffer, rate: sr } });
  assert.equal(posted.length, 1);
  assert.equal(posted[0].id, 7);
  assert.equal(posted[0].ok, true, posted[0].error);
  const r = posted[0].result;
  assert.ok(Math.abs(r.bpm - 120) <= 1, 'bpm ' + r.bpm);
  assert.deepEqual([r.bpm, r.firstBeat, r.grid], [direct.bpm, direct.firstBeat, direct.grid]);
  assert.deepEqual(plain(r), plain(direct), 'the whole result matches');
  // An analysis error comes back as ok: false.
  self.onmessage({ data: { id: 8, buf: -1, rate: sr } });
  assert.equal(posted[1].ok, false);
  assert.equal(posted[1].id, 8);
  // The main-thread fallback (the pasted IIFE) gives the same result.
  const fbox = {};
  vm.runInNewContext(between(panel, '// sae-beat:start\n', '// sae-beat:end') + '\nthis.saeBeat = saeBeat;', fbox);
  assert.deepEqual(plain(fbox.saeBeat.analyze(pcm, sr)), plain(direct));
});

// ---- the plugin carries no literal Hangul (check_public) ----
test('no literal Hangul in the plugin', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(root).filter((f) => /\.(tsx|js|cjs|json|md|ts)$/.test(f))) assert.ok(!/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/.test(fs.readFileSync(f, 'utf8')), 'Hangul in ' + f);
});

(async () => {
  let failed = 0;
  for (const t of tests) {
    try { await t.fn(); console.log('ok   ' + t.name); } catch (e) { failed++; console.log('FAIL ' + t.name + '\n     ' + (e && e.stack || e)); }
  }
  console.log(failed ? failed + ' failed' : 'panel tests passed (' + tests.length + ')');
  process.exitCode = failed ? 1 : 0;
})();
