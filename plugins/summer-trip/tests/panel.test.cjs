// plugins/summer-trip/tests/panel.test.cjs (adapted from city-weekend-vlog): the panel's embedded modules, headers,
// defaults and pitfall guards, and its run_script configs: shapes against contracts.md, an end-to-end run of
// assemble.js and decorate.js on a mock Draft with the configs the panel builds, and the payload per preset.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const panel = read('panel.tsx');
const between = (text, a, b) => { const i = text.indexOf(a), j = text.indexOf(b); assert.ok(i >= 0 && j > i, 'markers ' + a); return text.slice(i, j + b.length); };

// ---- Embedded modules: byte-identical to their source files ----
const planner = read('planner.js');
assert.equal(between(panel, '// st-planner:start', '// st-planner:end'), '// st-planner:start\n' + planner.replace(/\n+$/, '') + '\n// st-planner:end', 'planner.js embedded verbatim');
assert.ok(panel.includes(between(read('graphics-defs.js'), '// st-graphics:start', '// st-graphics:end')), 'graphics-defs.js block embedded verbatim');
assert.ok(panel.includes(between(read('muffle.cjs'), '// st-muffle:start', '// st-muffle:end')), 'muffle.cjs block embedded verbatim');
assert.equal((panel.match(/\/\/ st-graphics:start/g) || []).length, 1);
assert.equal((panel.match(/\/\/ st-muffle:start/g) || []).length, 1);

// ---- Headers, imports, text rules ----
const head = panel.split('\n').slice(0, 16).join('\n');
assert.match(head, /^\/\/ @name Summer Trip$/m);
for (const lang of ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']) assert.match(head, new RegExp('^// @name:' + lang + ' \\S', 'm'), '@name:' + lang);
assert.match(head, /^\/\/ @icon (sparkles|wand|video|image)$/m);
assert.ok(!/^import .* from "(?!react")/m.test(panel), 'only react may be imported');
assert.ok(!/\/Users\//.test(panel), 'no user paths');
// Hangul audit across the plugin, as place-count does (check_public rejects it too).
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => /\.(tsx|js|cjs|json|md|sh)$/.test(f))) assert.ok(!/[\uac00-\ud7a3]/.test(fs.readFileSync(f, 'utf8')), 'Korean text in ' + f);

// ---- Files the panel reads at runtime ----
for (const rel of ['assets/cues/manifest.json', 'assets/cues/dev-manifest.json', 'assets/fonts/presets.json', 'sfx/manifest.json', 'scripts/inventory.js', 'scripts/search.js',
  'scripts/ensure-audio.js', 'scripts/assemble.js', 'scripts/decorate.js', 'assets/title-graphic.tsx', 'assets/labels-graphic.tsx', 'assets/summer-look.tsx',
  'assets/grid-panel.tsx', 'assets/film-frame.tsx', 'assets/photo-motion.tsx', '"assets/fonts/" + file', '"/beat-detect.cjs"']) assert.ok(panel.includes(rel), 'panel reads ' + rel);
for (const rel of ['assets/cues/manifest.json', 'assets/fonts/presets.json', 'sfx/manifest.json', 'scripts/inventory.js', 'scripts/search.js', 'scripts/ensure-audio.js',
  'scripts/assemble.js', 'scripts/decorate.js', 'assets/title-graphic.tsx', 'assets/labels-graphic.tsx', 'assets/summer-look.tsx', 'assets/grid-panel.tsx',
  'assets/film-frame.tsx', 'assets/photo-motion.tsx', 'beat-detect.cjs']) assert.ok(fs.existsSync(path.join(root, rel)), rel + ' exists');

// ---- Defaults ----
const ui = panel.slice(panel.indexOf('// st-panel:end'));
for (const re of [/React\.useState<"off" \| "ambient" \| "full">\("ambient"\)/, /React\.useState<"short" \| "standard" \| "long">\("standard"\)/, /\[preset, setPreset\] = React\.useState\("summer"\)/,
  /\[sfxOn, setSfxOn\] = React\.useState\(false\)/, /\[muffleOn, setMuffleOn\] = React\.useState\(true\)/, /\[usePhotos, setUsePhotos\] = React\.useState\(true\)/,
  /\[lookStrength, setLookStrength\] = React\.useState\(ST_LOOK_DEFAULT\)/, /\[line1, setLine1\] = React\.useState\(ST_LINE1_DEFAULT\)/, /\[topItalic, setTopItalic\] = React\.useState\(ST_TOP_ITALIC_DEFAULT\)/]) assert.ok(re.test(ui), String(re));
assert.ok(panel.includes("const ST_LOOK_DEFAULT = 0.3;") && panel.includes("const ST_LINE1_DEFAULT = 'that one trip in';") && panel.includes("const ST_TOP_ITALIC_DEFAULT = 'VLOG';") && panel.includes("const ST_CREDIT_PREFIX = 'By';"));
assert.ok(panel.includes("const ST_GRID_SOUND = 'volume';") && panel.includes("const ST_TIME_ORIGIN = 'clip';") && panel.includes('const ST_AMBIENT_DB = -18;'), 'live rulings');
// No Pace option; Length is Short / Standard / Long; three presets; muffle hidden with No music.
assert.ok(!/label="Pace"/.test(ui));
for (const phrase of ['label="Length"', 'label="Clip sound"', 'label="Look strength"', 'label="Sound effects"', 'label="Ending muffle"', 'label="Use photos"', 'Choose clips',
  'label="Style"', '"Summer", value: "summer"', '"Poster", value: "poster"', '"Postcard", value: "postcard"', 'placeholder="Optional — leave blank to hide"', 'label="Credit name"',
  'label="Season"', 'reset to ', 'label="Top label"', 'label="Top label (italic part)"', '{music.kind !== "none" ? <ui.Toggle label="Ending muffle"',
  '<ui.Toggle label="Summer look" value={lookOn}', 'label="Look strength" value={lookStrength} onChange={setLookStrength} min={0} max={1} step={0.05} disabled={busy || !lookOn}',
  'label="Place prefix" value={placePrefix}', 'label="Credit prefix" value={creditPrefix}', 'creditPrefix={creditPrefix}',
  'setLine1(stLimitText(v, ST_LIMITS.line1.chars, ST_LIMITS.line1.words))', 'setSeasonEdit(stLimitText(v, ST_LIMITS.season.chars, 0))', 'setPlace(stLimitText(v, ST_LIMITS.place.chars, 0))',
  'Line 1 takes up to 32 characters and 6 words.', 'The season takes up to 10 characters.', 'The place takes up to 18 characters.']) assert.ok(ui.includes(phrase), phrase);
for (const re of [/\[lookOn, setLookOn\] = React\.useState\(true\)/, /\[creditPrefix, setCreditPrefix\] = React\.useState\(ST_CREDIT_PREFIX\)/, /\[placePrefix, setPlacePrefix\] = React\.useState\(ST_PLACE_PREFIX\)/])
  assert.ok(re.test(ui), String(re));

// ---- Pitfall guards (kit) ----
for (const phrase of ['Create another version', 'Finish title and look', 'Stopped at step', 'Install ffmpeg and Node.js', 'linkToDraftFrame', 'selects.editor.openDraft', 'FontFace',
  'Draft created; adding title and look', 'projectRef', 'ffprobe', 'loadInventory(', 'still being analysed', 'this updates automatically', '>Refresh<', 'visibilitychange',
  'addEventListener("focus"', '10000', 'setCandidates(null)', 'invSigRef', 'No valid session ID', 'readFootage()', 'Nothing was saved', 'Never resend a committing call',
  'role="slider"', 'aria-valuenow', 'aria-valuetext', '--panel-accent', '--panel-muted-fg', 'ResizeObserver', 'devicePixelRatio', 'setPointerCapture', '"grabbing"',
  '"ArrowLeft"', '"Home"', '"End"', 'drag to choose', 'fmtTime(total)', 'Stop preview', 'Cancel preview', '"pause"', 'requestAnimationFrame', 'cancelAnimationFrame', '"Escape"',
  'previewTokenRef', 'URL.revokeObjectURL', 'preview-*.mp3', 'readText(roots.data', 'height: PREVIEW_HEIGHT', 'Drop', '"Section"', 'approximate timing',
  'No drop found: the grid starts after the 2-bar title', 'ending muffle skipped', 'Your footage fits ', 'different clips and photos', 'disabledReason',
  'style: "normal", weight: "400"']) assert.ok(panel.includes(phrase), phrase);
assert.ok(!/--text-tertiary/.test(panel), '--text-tertiary is not a panel token');
assert.ok(!/var\(--accent\b/.test(panel), '--accent is not a panel token');
assert.ok(!/icon="stop"/.test(panel), 'the kit has no stop icon');
assert.ok(!/\.(captureFrames|captureVisualFrames)\(/.test(panel), 'no frame capture in the panel');
// Hooks stay before the early return.
const early = panel.indexOf('if (!projectId) return <ui');
for (const hook of ['addEventListener("visibilitychange"', 'React.useMemo<any>(', 'const lengthRef = React.useRef', '[cueId, ownMusic?.path, section, length]', 'const [sfxOn']) assert.ok(panel.indexOf(hook) > 0 && panel.indexOf(hook) < early, hook + ' before the early return');
// Shell: PATH prefix on every tool step, user paths single-quoted, big outputs through files, one decode per SFX.
assert.ok(panel.includes('/opt/homebrew/bin:/usr/local/bin') && panel.includes('.nvm/versions/node/*/bin'), 'Homebrew and nvm paths');
for (const re of [/command: TOOL_PATH \+ "command -v ffmpeg/, /cmd = TOOL_PATH \+ "ffmpeg -nostdin -v error -y -t 360/, /command: TOOL_PATH \+ "ffprobe /, /cmd = TOOL_PATH \+ "rm -f "/,
  /shell\("Read your music", TOOL_PATH \+ "shasum/, /shell\("Muffle the ending of your music", TOOL_PATH \+/, /const cmd = TOOL_PATH \+ "mkdir -p "/]) assert.ok(re.test(panel), String(re));
assert.ok(!/dq\((file|ownMusic|roots|path|out|src|dry)/.test(panel), 'user paths must not be double-quoted into the shell');
assert.ok(panel.includes('" 22050 " + sq(roots.data + "/own-music.json") + " largest"') && panel.includes('JSON.parse(await readText(roots.data, "own-music.json"))'), 'own-music analysis via a file, drop pick largest');
assert.ok(panel.includes('stMuffleCommand(path, part)') && panel.includes('roots!.data + "/" + stOwnMuffledName(name, hash)') && panel.includes('shasum -a 256 < " + sq(path) + " | cut -c1-8'), 'own music muffled as a cached .wav');
assert.ok(panel.includes('base64 -d < ') && panel.includes('base64 -D < '), 'SFX decode works with both base64 flavours');
assert.ok(panel.includes('{ key: "dry", path: dry, matchByName: false }'), 'own music matches an existing resource by path only');
assert.ok(panel.includes('"JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"'), 'fill passes the config through JSON.parse');
// Commits are never resent: run() resends only a non-committing call on a lost session.
assert.ok(/if \(r\.isError && !allowCommit && \/No valid session ID\//.test(panel));
const buildBody = panel.slice(panel.indexOf('async function build('), panel.indexOf('function buildAnother()'));
assert.ok(buildBody.includes('stopPreview()'), 'Build stops the preview');
assert.equal((buildBody.match(/assembleJs/g) || []).length, 1, 'assemble runs once per Build');
// Project switch: check() after every await in the build.
const awaits = (buildBody.match(/await (run|shell|findCandidates|bakeOwnMuffle|decodeSfx|decorate)\(/g) || []).length;
// Each await is followed by check() or hands check to the step, which runs it after its own awaits.
assert.ok(awaits >= 7 && (buildBody.match(/check\(\)|, check\)/g) || []).length >= awaits, 'stale guards');
for (const fn of ['async function findCandidates(', 'async function bakeOwnMuffle(', 'async function decodeSfx(', 'async function decorate(']) {
  const body = panel.slice(panel.indexOf(fn), panel.indexOf('\n  }\n', panel.indexOf(fn)));
  assert.ok((body.match(/check\(\)/g) || []).length >= 1, fn + ' checks for a Project switch');
}
const anotherBody = panel.slice(panel.indexOf('function buildAnother()'), panel.indexOf('async function finishTitle('));
assert.ok(anotherBody.indexOf('setResult(null)') < anotherBody.indexOf('build(s)') && /const s = seed \+ 1;/.test(anotherBody), 'another version: new seed, old result cleared');
const finishBody = panel.slice(panel.indexOf('async function finishTitle('), panel.indexOf('async function decorate('));
assert.ok(finishBody.includes('await decorate(result, check)') && !finishBody.includes('assembleJs'), 'Finish retries decorate only');
// Title hits only for the drop section; every title/look input is captured at Build.
assert.ok(buildBody.includes('titleHits: stTitleHitsFor(music, sectionInfo ? sectionInfo.kind : null)') && !/titleHits: music\.kind === "cue"/.test(buildBody), 'titleHits only in the drop section');
assert.ok(/const inputs = \{[^}]*creditPrefix[^}]*placePrefix[^}]*lookOn/.test(buildBody), 'prefixes and the look toggle go into inputs');
// A lost assemble reply: the new Draft is found by comparing Draft ids with the list taken before assemble (never by
// name when that list is known), and a single new Draft is offered Finish title and look from a recovered result.
assert.ok(buildBody.indexOf('run("List Drafts"') > 0 && buildBody.indexOf('run("List Drafts"') < buildBody.indexOf('assembleJs'), 'Draft ids listed before assemble');
assert.ok(buildBody.includes('before.indexOf(d.sequenceId) < 0') && buildBody.includes('stRecoverAssembly(cfg, foundFps, newIds[0])') && buildBody.includes('press Finish title and look'));
assert.ok(buildBody.includes('It has no title or look yet'), 'an unrecoverable saved Draft says it has no title or look');
// Real-fps planning: plans use the Project's learnt Draft rate, assemble lays at the real rate, decorate uses assemble's frames.
assert.ok(buildBody.includes('const planFps = fpsRef.current[pid!] || ST_GUESS_FPS;') && buildBody.includes('if (a.fps > 0) fpsRef.current[pid!] = a.fps;'));

// ---- The pure helpers and configs (planner + graphics + muffle + panel blocks in node:vm) ----
const block = [between(panel, '// st-planner:start', '// st-planner:end'), between(panel, '// st-graphics:start', '// st-graphics:end'),
  between(panel, '// st-muffle:start', '// st-muffle:end'), between(panel, '// st-panel:start', '// st-panel:end')].join('\n');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, NaN, Error, JSON, Date, isFinite, parseFloat }; vm.createContext(box);
vm.runInContext(block + '\n;globalThis.X = { stMonthList, stInferSeason, stCoverFor, stOwnMuffledName, stOwnCue, stMusicFor, stSnapSection, stDefaultStart, stPseudoCandidates, stPlanOptions, stSfxFiles, stSfxConfig, stDraftName, stLimitText, stAtLimit, stTitleHitsFor, stRecoverAssembly, ST_LIMITS, stAssembleConfig, stDecorateConfig, stPlanBuild, stSchedule, stTitleSchedule, stTitleTimes, stPresetFontFiles, stFrameSchedule, ST_MUFFLE_FILTER, stMuffleCommand, ST_FILM_WINDOW };', box);
const X = box.X;
const j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// Season from inventory month counts (12 counts, January first): expanded before stSeasonFor.
assert.deepEqual(j(X.stMonthList([0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0])), [7, 7, 8]);
assert.equal(X.stInferSeason({ months: [0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0] }), 'SPRING', 'three March clips: not "month 3 of the counts"');
assert.equal(X.stInferSeason({ months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 1, 0] }), 'AUTUMN');
assert.equal(X.stInferSeason({ months: Array(12).fill(0) }), 'SUMMER');
assert.equal(X.stInferSeason(null), 'SUMMER');
// Cover factor on the 16:9 canvas.
assert.equal(X.stCoverFor({ width: 1920, height: 1080 }), 1);
assert.ok(near(X.stCoverFor({ width: 1080, height: 1920 }), (1920 / 1080) ** 2));
assert.ok(near(X.stCoverFor({ width: 1440, height: 1080 }), (16 / 9) / (4 / 3)));
assert.equal(X.stCoverFor(null), 1);
// Own-music muffled copy: <base>-muffled-<hash8>.wav (stable, the cache key; ensure-audio.js may reuse it by file name).
assert.equal(X.stOwnMuffledName('My Song (final).mp3', '0a1b2c3d'), 'My-Song-final-.wav'.replace('.wav', '') + '-muffled-0a1b2c3d.wav');
assert.equal(X.stOwnMuffledName('/x/y/summer.m4a', 'deadbeef'), 'summer-muffled-deadbeef.wav');
// The muffle command quotes user paths.
assert.ok(X.stMuffleCommand("/tmp/it's.mp3", '/tmp/o.wav').includes("'/tmp/it'\\''s.mp3'") && X.stMuffleCommand('a', '/x/o.wav').includes('pcm_s16le'));
// Draft name.
assert.equal(X.stDraftName('Italy', 'SUMMER', new Date(2026, 6, 1, 9, 5, 7)), 'Summer Trip Italy 09:05:07');
assert.equal(X.stDraftName('  ', 'AUTUMN', new Date(2026, 9, 1, 18, 30, 0)), 'Summer Trip AUTUMN 18:30:00');
// Title text limits: line 1 <= 32 characters and <= 6 words, season <= 10, place <= 18.
assert.deepEqual(j(X.ST_LIMITS), { line1: { chars: 32, words: 6 }, season: { chars: 10, words: 0 }, place: { chars: 18, words: 0 } });
assert.equal(X.stLimitText('one two three four five six seven', 32, 6), 'one two three four five six');
assert.equal(X.stLimitText('one two three four five six ', 32, 6), 'one two three four five six ', 'a space after the 6th word is kept while typing');
assert.equal(X.stLimitText('a'.repeat(40), 32, 6), 'a'.repeat(32));
assert.equal(X.stLimitText('SUMMERTIMES!', 10, 0), 'SUMMERTIME');
assert.equal(X.stLimitText('Santa Margherita Ligure', 18, 0), 'Santa Margherita L');
assert.equal(X.stLimitText('that one trip in', 32, 6), 'that one trip in');
assert.ok(X.stAtLimit('a b c d e f', 32, 6) && X.stAtLimit('x'.repeat(10), 10, 0) && !X.stAtLimit('that one trip in', 32, 6));
// Title hits (a bundled cue's measured beats) only when the chosen section is the drop section.
const hitsCue = { kind: 'cue', titleHits: [0, 1, 2, 3, 4, 5] };
assert.deepEqual(j(X.stTitleHitsFor(hitsCue, 'drop')), [0, 1, 2, 3, 4, 5]);
assert.equal(X.stTitleHitsFor(hitsCue, 'section'), null);
assert.equal(X.stTitleHitsFor(hitsCue, null), null);
assert.equal(X.stTitleHitsFor({ kind: 'own', titleHits: [0, 1, 2, 3, 4, 5] }, 'drop'), null);

// Own music: the drop's grid (tempo octave, re-anchored first beat) wins; no grid -> fixed timing.
const own = { accepted: true, bpm: 60, firstBeat: 0.3, durationSeconds: 90, beatEnergy: [1, 2], peaks: [0.1], onsets: [[1, 'l', 3]], onsetThresholds: { l: 2 },
  drop: { dropBeat: 16, dropSeconds: 8.3, stepDb: 6, bpm: 120, firstBeat: 0.3 } };
assert.deepEqual(j(X.stOwnCue(own)), { bpm: 120, firstBeat: 0.3, dropSeconds: 8.3, duration: 90, beatEnergy: null });
assert.equal(X.stOwnCue({ ...own, drop: null }).bpm, 120, 'octave without a drop');
assert.deepEqual(j(X.stOwnCue({ ...own, bpm: 120, drop: null }).beatEnergy), [1, 2], 'same grid keeps the energy');
assert.equal(X.stOwnCue({ ...own, accepted: false }), null);
const mOwn = X.stMusicFor({ choice: 'own', cue: null, own });
assert.equal(mOwn.kind, 'own'); assert.equal(mOwn.noDrop, false);
assert.equal(X.stMusicFor({ choice: 'own', cue: null, own: { ...own, drop: null } }).noDrop, true);
const mFixed = X.stMusicFor({ choice: 'own', cue: null, own: { accepted: false, durationSeconds: 60, peaks: [], onsets: [[1, 'l', 3]] } });
assert.deepEqual([mFixed.kind, mFixed.bpm, mFixed.approximate], ['fixed', 120, true]);
assert.equal(X.stMusicFor({ choice: 'own', cue: null, own: null }).missing, true);
assert.deepEqual([X.stMusicFor({ choice: 'none', cue: null, own: null }).kind, X.stMusicFor({ choice: 'none', cue: null, own: null }).approximate], ['none', true]);
// Bundled cue: drop section by default, bar-snapped, re-clamped for a longer length; "drop" vs "section".
const cue = { id: 'c1', title: 'Cue', file: 'c1.mp3', muffledFile: 'c1-muffled.mp3', bpm: 120, firstBeat: 0.2, dropBeat: 16, dropSeconds: 8.2, duration: 40, usableEnd: 39.5, peaks: [0.5], titleHits: null, accepted: true };
const mCue = X.stMusicFor({ choice: 'c1', cue, own: null });
assert.equal(mCue.kind, 'cue');
const d8 = X.stDefaultStart(mCue, 8);
assert.ok(near(d8.start, 4.2) && d8.kind === 'drop', JSON.stringify(d8));
assert.equal(X.stSnapSection(mCue, 8, 4.2 + 2).kind, 'section');
assert.ok(near(X.stSnapSection(mCue, 8, 5.1).start, 4.2), 'bar snap');
// Long (48 beats = 24 s) no longer fits from the drop section in a 40 s cue: 4.2 + 24 + 0.5 > 40? no, fits; 12 s later does not.
const late = X.stSnapSection(mCue, 12, 30);
assert.ok(late.moved && late.start + 24 + 0.5 <= 40 + 1e-9, JSON.stringify(late));
// Fixed timing: 0.1 s steps inside the music.
assert.deepEqual(j(X.stSnapSection(mFixed, 8, 12.34)), { start: 12.3, kind: 'section', moved: false });
assert.equal(X.stSnapSection(mFixed, 8, 100).moved, true);
assert.equal(X.stSnapSection({ kind: 'fixed', duration: 10 }, 8, 0), null, 'too short');
// Plan options per music kind: bundled never snaps; own music snaps with its onsets; fixed timing low-band only.
assert.equal(X.stPlanOptions({ music: mCue, section: 4.2, candidates: [], fps: 30, montageShots: 8, seed: 1 }).bundled, true);
const oo = X.stPlanOptions({ music: mOwn, section: 2, candidates: [], fps: 30, montageShots: 8, seed: 1 });
assert.ok(oo.onsets.length === 1 && oo.lowConfidence === false && oo.sectionStart === 2 && !oo.bundled);
assert.equal(X.stPlanOptions({ music: mFixed, section: 2, candidates: [], fps: 30, montageShots: 8, seed: 1 }).lowConfidence, true);
assert.equal('sectionStart' in X.stPlanOptions({ music: X.stMusicFor({ choice: 'none' }), section: 2, candidates: [], fps: 30, montageShots: 8, seed: 1 }), false);
// SFX: decoded under their stable names (ensure-audio reuses them by path or file name), shutter lengths per take.
const sfxManifest = JSON.parse(read('sfx/manifest.json'));
const sfxFiles = X.stSfxFiles(sfxManifest, '/data/sfx');
assert.deepEqual(j(sfxFiles.map(f => f.path)), ['/data/sfx/shutter-1.wav', '/data/sfx/shutter-2.wav', '/data/sfx/shutter-3.wav', '/data/sfx/shutter-4.wav', '/data/sfx/whoosh-1.wav']);
for (const f of sfxFiles) assert.ok(fs.existsSync(path.join(root, f.b64)), f.b64);
const sfxIds = { 'shutter-1': 'a1', 'shutter-2': 'a2', 'shutter-3': 'a3', 'shutter-4': 'a4', 'whoosh-1': 'a5' };
assert.deepEqual(j(X.stSfxConfig(sfxManifest, sfxIds)), { shutter: ['a1', 'a2', 'a3', 'a4'], shutterSeconds: [0.17, 0.171, 0.171, 0.17], whoosh: 'a5', whooshSeconds: 0.864 });
assert.equal(X.stSfxConfig(sfxManifest, {}), null);

// Readiness before a search: one filler set per clip gives the distinct count, the fitted N and the disabled reason.
const vids = Array.from({ length: 10 }, (_, i) => ({ rid: 'r' + i, duration: 12 + i }));
const ready = X.stPlanBuild(X.stPlanOptions({ music: mCue, section: 4.2, candidates: X.stPseudoCandidates(vids), fps: 30, montageShots: 8, seed: 1, sizes: {} }));
assert.ok(ready.ok && ready.distinct === 10 && ready.montageShots === 8, ready.disabledReason);
const few = X.stPlanBuild(X.stPlanOptions({ music: mCue, section: 4.2, candidates: X.stPseudoCandidates(vids.slice(0, 4)), fps: 30, montageShots: 8, seed: 1, sizes: {} }));
assert.equal(few.ok, false); assert.match(few.disabledReason, /Needs at least 6 different clips or photos \(found 4\)/);
const short = X.stPlanBuild(X.stPlanOptions({ music: mCue, section: 4.2, candidates: X.stPseudoCandidates(vids.map(v => ({ ...v, duration: 3 }))), fps: 30, montageShots: 8, seed: 1, sizes: {} }));
assert.equal(short.ok, false); assert.match(short.disabledReason, /opening/);

// ---- End to end: the panel's configs through assemble.js and decorate.js on a mock Draft ----
// The mock adopts 23.976 fps on the first insert (Staging Drafts adopt the first clip's rate), so a plan made at the
// 30 fps guess is laid again at the real rate by assemble.js.
const loadScript = (name, cfg) => new Function('selects', `return (async()=>{${read('scripts/' + name).replace('__CONFIG__', () => 'JSON.parse(' + JSON.stringify(JSON.stringify(cfg)) + ')')}})();`);
function mockProject(o) {
  const drafts = [];
  const make = name => {
    let fps = 30, inserted = false, committed = false, frameSize = { width: 1920, height: 1080 }, id = 1;
    const clips = [], effects = {}, graphics = [], transforms = {}, audio = {};
    const mainEnd = () => clips.filter(c => c.trackKind === 'main').reduce((a, c) => Math.max(a, c.endFrame), 0);
    const d = {
      name, rows: clips, effects, graphics, transforms, audio,
      meta: async () => ({ fps, frameSize: { ...frameSize } }),
      setFrameSize: async s => { frameSize = { ...s }; },
      insertResource: async ({ resourceId, sourceRange }) => {
        if (!inserted) { inserted = true; fps = o.adoptFps; frameSize = { ...(o.sizes[resourceId] || { width: 1920, height: 1080 }) }; }
        if (o.photos.includes(resourceId) && sourceRange.endSeconds > 5 + 1e-9) throw Error('invalid_source_range');
        const dur = o.durations[resourceId];
        if (dur != null && sourceRange.endSeconds > dur + 1e-9) throw Error('invalid_source_range');
        const len = Math.round(sourceRange.endSeconds * fps) - Math.round(sourceRange.startSeconds * fps), f = mainEnd();
        clips.push({ clipId: 'c' + id++, resourceId, trackKind: 'main', startFrame: f, endFrame: f + len, audioSourceIndexes: null });
      },
      clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(c => ({ ...c })),
      rangeAtFrames: async (a, b) => ({ a, b }),
      overlayResource: async x => {
        const rid = x.resource.id, kind = o.audio.includes(rid) ? 'audio' : 'video';
        clips.push({ clipId: 'c' + id++, resourceId: rid, trackKind: kind, startFrame: x.over.a, endFrame: x.over.b, audioSourceIndexes: null });
        return { inserted: 1 };
      },
      setClipTransform: async x => { transforms[x.clip.clipId] = { scale: { ...x.scale }, position: { ...x.position } }; return {}; },
      clipTransform: async c => transforms[c.clipId] || { scale: { x: 1, y: 1 }, position: { x: 0, y: 0 } },
      setClipAudio: async x => { audio[x.clip.clipId] = { ...(audio[x.clip.clipId] || {}), ...x, clip: undefined }; return { diff: { opCount: 1 } }; },
      removeClips: async rows => { for (const r of [].concat(rows)) clips.splice(clips.findIndex(c => c.clipId === r.clipId), 1); return {}; },
      setAudioTracks: async x => { let n = 0; for (const c of clips) if (c.trackKind === 'main' && !o.photos.includes(c.resourceId) && c.startFrame < x.target.b && c.endFrame > x.target.a) { c.audioSourceIndexes = []; n++; } return { opCount: n }; },
      motionGraphics: async () => graphics.map(g => ({ name: g.name })),
      addMotionGraphic: async x => { graphics.push({ name: x.label, within: x.within, parameters: x.parameters, editableParameters: x.editableParameters }); return {}; },
      videoEffects: async c => (effects[c.clipId] || []).map(e => ({ name: e.name, effectName: e.name })),
      addVideoEffect: async x => { (effects[x.clip.clipId] = effects[x.clip.clipId] || []).push({ name: x.label, parameters: x.parameters }); return {}; },
      commitAll: async () => { if (committed) throw Error('already committed'); committed = true; return { createdDraftId: 'seq-' + drafts.indexOf(d) }; },
      reopen() { committed = false; },
    };
    drafts.push(d);
    return d;
  };
  return { drafts, selects: { project: () => ({ createDraft: async ({ name }) => make(name), resource: rid => ({ id: rid }) }), draft: id => drafts[Number(String(id).slice(4))] } };
}

const presets = JSON.parse(read('assets/fonts/presets.json'));
const fontsAll = Object.fromEntries(Object.keys(presets.fonts).map(f => [f, read('assets/fonts/' + f).replace(/\s+/g, '')]));
const tsx = { title: read('assets/title-graphic.tsx'), labels: read('assets/labels-graphic.tsx'), look: read('assets/summer-look.tsx'), gridPanel: read('assets/grid-panel.tsx'),
  filmFrame: read('assets/film-frame.tsx'), motion: read('assets/photo-motion.tsx') };
const assembleJs = read('scripts/assemble.js'), decorateJs = read('scripts/decorate.js');
// contracts.md keys.
const contracts = read('dev/contracts.md');
const ASSEMBLE_KEYS = ['projectId', 'draftName', 'fps', 'W', 'H', 'beats', 'schedule', 'picks', 'sizes', 'music', 'crossfadeFrames', 'clipSound', 'ambientDb', 'gridSound', 'sfx'];
const DECORATE_KEYS = ['sequenceId', 'fps', 'frames', 'placed', 'gridPlaced', 'sizes', 'mute', 'gridSound', 'title', 'labels', 'look', 'gridPanel', 'filmFrame', 'motion', 'endingMotion', 'photos'];
const assembleDoc = contracts.slice(contracts.indexOf('### assemble.js'), contracts.indexOf('Returns:', contracts.indexOf('### assemble.js')));
const decorateDoc = contracts.slice(contracts.indexOf('### decorate.js'), contracts.indexOf('Effect labels'));
for (const k of ASSEMBLE_KEYS) assert.ok(new RegExp('\\b' + k + '\\b').test(assembleDoc), 'assemble key ' + k + ' is in contracts.md');
for (const k of DECORATE_KEYS) assert.ok(new RegExp('\\b' + k + '\\b').test(decorateDoc), 'decorate key ' + k + ' is in contracts.md');

// Footage: 10 videos (two portrait), four photos (4:3, 9:16, 3:2, unknown size).
const L = { width: 1920, height: 1080 }, P = { width: 1080, height: 1920 };
const inv = Array.from({ length: 10 }, (_, i) => ({ rid: 'r' + i, duration: 10 + 3 * i, ...(i === 3 || i === 7 ? P : L) }));
const photos = [{ rid: 'p0', width: 4032, height: 3024 }, { rid: 'p1', ...P }, { rid: 'p2', width: 3000, height: 2000 }, { rid: 'p3', width: null, height: null }];
const sizes = {};
for (const r of [...inv, ...photos]) if (r.width > 0) sizes[r.rid] = { width: r.width, height: r.height };
const durations = Object.fromEntries(inv.map(r => [r.rid, r.duration]));
const hits = [];
const ROLES = ['opener', 'grid', 'place', 'beach', 'town', 'water', 'street', 'food', 'landmark', 'people', 'detail', 'ending'];
inv.forEach((r, i) => ROLES.forEach((role, k) => { if ((i + k) % 3 === 0) hits.push({ rid: r.rid, role, t: 1 + (k % 5), score: 0.5 + ((i * 7 + k) % 10) / 20, sourceDuration: r.duration }); }));
const cands = hits.concat(photos.map(p => ({ rid: p.rid, kind: 'photo' })));
const payloads = {};
(async () => {
  for (const [presetId, clipSound, music, sfxOn] of [['summer', 'ambient', mCue, false], ['poster', 'off', mOwn, true], ['postcard', 'full', X.stMusicFor({ choice: 'none' }), true]]) {
    const section = music.kind === 'none' ? 0 : X.stDefaultStart(music, 8).start;
    const plan = X.stPlanBuild(X.stPlanOptions({ music, section, candidates: cands, fps: 30, montageShots: 8, seed: 3, sizes }));
    assert.ok(plan.ok, plan.disabledReason);
    assert.equal(plan.frames.fps, 30, 'planned at the guess');
    const sfx = sfxOn ? X.stSfxConfig(sfxManifest, sfxIds) : null;
    const musicCfg = music.kind === 'none' ? null : { resourceId: 'm1', sectionStart: section, wetResourceId: 'm2' };
    const acfg = j(X.stAssembleConfig({ projectId: 'proj', draftName: X.stDraftName('', 'SUMMER', new Date(2026, 6, 1, 12, 0)), fps: 30, plan, sizes, durations, music: musicCfg, clipSound, sfx }));
    assert.deepEqual(Object.keys(acfg), ASSEMBLE_KEYS, 'assemble config keys (contracts.md order)');
    assert.deepEqual(acfg.beats, { bpm: plan.frames.bpm, delta: plan.frames.delta, snaps: j(plan.frames.snaps) }, 'frames.snaps from the plan');
    assert.equal(acfg.gridSound, 'volume'); assert.equal(acfg.ambientDb, -18); assert.equal(acfg.crossfadeFrames, null);
    assert.ok(acfg.picks.main.every(p => (p.kind === 'video') === (p.duration > 0)), 'every video pick carries its source duration');
    assert.deepEqual(Object.keys(acfg.picks.grid[0]).sort(), ['kind', 'quad', 'rid', 'startSeconds']);
    assert.equal(acfg.picks.main.length, acfg.schedule.mainBeats.length - 1);
    const mock = mockProject({ adoptFps: 24000 / 1001, sizes, durations, photos: photos.map(p => p.rid), audio: ['m1', 'm2', 'a1', 'a2', 'a3', 'a4', 'a5'] });
    const a = await loadScript('assemble.js', acfg)(mock.selects);
    assert.ok(near(a.fps, 24000 / 1001), 'laid at the real rate');
    assert.equal(mock.drafts.filter(d => d.name === acfg.draftName).length, 2, 'the 30 fps Draft was discarded and the clips laid again');
    const last = mock.drafts.filter(d => d.name === acfg.draftName).pop();
    last.reopen();
    const inputs = { presetId, line1: 'that one trip in', season: 'SUMMER', topMain: 'SUMMER', topItalic: 'VLOG', creditName: 'Mina', place: 'Italy', lookStrength: 0.3, clipSound, titleHits: null };
    const fontsB64 = Object.fromEntries(X.stPresetFontFiles(presets, presetId).map(f => [f, fontsAll[f]]));
    const dcfg = X.stDecorateConfig({ a, plan, inputs, presets, fontsB64, tsx });
    assert.deepEqual(Object.keys(dcfg), DECORATE_KEYS, 'decorate config keys (contracts.md order)');
    assert.equal(dcfg.frames, a.frames, "decorate uses assemble's frames");
    assert.equal(dcfg.mute, clipSound === 'off');
    assert.deepEqual(j(dcfg.filmFrame), { tsx: tsx.filmFrame, window: { w: 0.87, h: 0.84, radius: 0.02, feather: 0.012 }, leakStrength: 1, timeOrigin: 'clip' });
    assert.deepEqual(j(dcfg.look), { tsx: tsx.look, strength: 0.3, leakStrength: 1 });
    // Title times sit on frames of the real rate, from the same F() as the cuts.
    const tp = dcfg.title.parameters, fpsR = a.fps;
    for (const t of [...tp.wordTimes, tp.seasonPartTime, tp.seasonFullTime, tp.labelsTime]) assert.ok(near(t * fpsR, Math.round(t * fpsR), 1e-6), 'title time on a frame: ' + t);
    assert.ok(near(tp.seasonFullTime * fpsR, Math.round((6 * 60 / plan.frames.bpm + a.frames.delta) * fpsR), 1e-6), 'SUMMER complete on F(6)');
    assert.ok(near(tp.wordTimes[0] * fpsR, Math.round((0.5 * 60 / plan.frames.bpm + a.frames.delta) * fpsR), 1e-6) && tp.wordTimes[0] > 0, 'a clean start: the first word on F(0.5)');
    assert.equal(tp.creditPrefix, 'By'); assert.equal(dcfg.labels.parameters.placePrefix, 'in'); assert.equal(dcfg.labels.parameters.place, 'Italy');
    const span = a.frames.labelsFrames[a.frames.labelsFrames.length - 1];
    assert.ok(near(dcfg.labels.parameters.placeSeconds, (a.frames.placeFrames[1] - span[0]) / fpsR), 'place title over [F(12), F(14))');
    // Only the chosen preset's fonts are embedded.
    const fams = Object.keys(tp.fonts).concat(Object.keys(dcfg.labels.parameters.fonts));
    for (const fam of fams) assert.ok(presets.presets.find(p => p.id === presetId).fonts.some(f => presets.fonts[f].family === fam), fam + ' belongs to ' + presetId);
    assert.deepEqual(dcfg.title.editableParameters.map(e => e.defaultValue), dcfg.title.editableParameters.map(e => tp[e.key]));
    // Photo motions carry the cover factor of the photo on the 16:9 canvas.
    for (const [k, m] of Object.entries(dcfg.motion.byClipIndex)) assert.ok(near(m.cover, X.stCoverFor(a.sizes[plan.picks.main[k].rid])), 'cover ' + k);
    // Recovery: the result rebuilt from the assemble config at the Draft's rate matches what assemble.js returned.
    const ra = j(X.stRecoverAssembly(acfg, a.fps, a.sequenceId));
    for (const k of ['mainFrames', 'gridStateFrames', 'titleFrames', 'labelsFrames', 'placeFrames', 'endingFrame', 'endFrame', 'fadeStartFrame', 'leakFrames', 'pulseFrames', 'delta'])
      assert.deepEqual(ra.frames[k], j(a.frames[k]), 'recovered frames.' + k);
    assert.deepEqual(ra.placed.map(x => [x.rid, x.a, x.b, x.sourceStart]), a.placed.map(x => [x.rid, x.a, x.b, x.sourceStart]), 'recovered Main windows');
    assert.deepEqual(ra.gridPlaced.map(x => [x.quad, x.rid, x.a, x.b, x.sourceStart]), a.gridPlaced.map(x => [x.quad, x.rid, x.a, x.b, x.sourceStart]), 'recovered grid panels');
    assert.equal(ra.notes.length, 1, 'the unmeasured photo size is reported');
    // decorate.js finishes a second, identical Draft from the recovered result (look off and custom prefixes here).
    const mock2 = mockProject({ adoptFps: 24000 / 1001, sizes, durations, photos: photos.map(p => p.rid), audio: ['m1', 'm2', 'a1', 'a2', 'a3', 'a4', 'a5'] });
    await loadScript('assemble.js', acfg)(mock2.selects);
    const last2 = mock2.drafts.filter(dd => dd.name === acfg.draftName).pop();
    last2.reopen();
    const inputs2 = { ...inputs, lookOn: false, creditPrefix: 'Shot by', placePrefix: 'at' };
    const dcfg2 = X.stDecorateConfig({ a: ra, plan, inputs: inputs2, presets, fontsB64, tsx });
    assert.deepEqual(j(dcfg2.look), { tsx: tsx.look, strength: 0, leakStrength: 1, gradeOff: true }, 'look off: gradeOff, strength 0');
    assert.equal(dcfg2.title.parameters.creditPrefix, 'Shot by'); assert.equal(dcfg2.labels.parameters.placePrefix, 'at');
    const d2 = await loadScript('decorate.js', dcfg2)({ draft: () => last2 });
    assert.ok(d2.committed && d2.titleAdded && d2.labelsAdded && !d2.notes.some(n => /not found/.test(n)), JSON.stringify(d2));
    const main2 = last2.rows.filter(c => c.trackKind === 'main');
    assert.equal(main2.filter(c => (last2.effects[c.clipId] || []).some(e => e.name === 'Summer look')).length, 1, 'look off: only the leak clip keeps a (strength 0) look');
    assert.equal(main2.filter(c => (last2.effects[c.clipId] || []).some(e => e.name === 'Film frame')).length, 3);
    const d = await loadScript('decorate.js', dcfg)({ draft: () => last });
    assert.ok(d.committed && d.titleAdded && d.labelsAdded, JSON.stringify(d));
    assert.equal(d.muted, clipSound === 'off');
    assert.deepEqual(last.graphics.map(g => g.name), ['Summer Trip title', 'Summer Trip labels']);
    const main = last.rows.filter(c => c.trackKind === 'main');
    assert.ok(main.every(c => (last.effects[c.clipId] || []).some(e => e.name === 'Summer look')), 'look on every Main clip');
    assert.equal(main.filter(c => (last.effects[c.clipId] || []).some(e => e.name === 'Film frame')).length, 3);
    // Payload of each run_script call, as the panel sends it.
    const bytes = s => Buffer.byteLength(s, 'utf8');
    payloads[presetId] = { assemble: bytes(assembleJs.replace('__CONFIG__', () => 'JSON.parse(' + JSON.stringify(JSON.stringify(acfg)) + ')')),
      decorate: bytes(decorateJs.replace('__CONFIG__', () => 'JSON.parse(' + JSON.stringify(JSON.stringify(dcfg)) + ')')) };
    for (const [k, v] of Object.entries(payloads[presetId])) assert.ok(v < 260 * 1024, presetId + ' ' + k + ' payload ' + v + ' bytes');
  }
  console.log(JSON.stringify({ panel: 'ok', payloadBytes: payloads }));
})().catch(e => { console.error(e); process.exit(1); });
