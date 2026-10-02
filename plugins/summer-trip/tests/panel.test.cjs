// plugins/summer-trip/tests/panel.test.cjs (adapted from city-weekend-vlog): the panel's embedded modules, headers,
// defaults and pitfall guards, and its run_script configs: shapes against contracts.md, an end-to-end run of
// assemble.js and decorate.js on a mock Draft with the configs the panel builds, and the payload per preset.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const panel = read('panel.tsx');
const between = (text, a, b) => { const i = text.indexOf(a), j = text.indexOf(b); assert.ok(i >= 0 && j > i, 'markers ' + a); return text.slice(i, j + b.length); };
// UI wording lives in the STRINGS block (10 languages): `says(key, text)` checks the English text of a key and that the
// panel reads it with t(). Code phrases are asserted on `code`, the panel without STRINGS, so English sitting in
// STRINGS can never satisfy them.
const en = require(path.join(root, 'dev', 'i18n-check.cjs')).extractStrings(panel).strings.en;
const code = panel.slice(0, panel.indexOf('// STRINGS:BEGIN')) + panel.slice(panel.indexOf('// STRINGS:END'));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const says = (key, text) => {
  assert.equal(typeof en[key] === 'string' ? en[key] : JSON.stringify(en[key]), text, 'STRINGS.en.' + key);
  assert.ok(new RegExp('\\bt\\((L|lang|l), "' + esc(key) + '"').test(code), key + ' is read with t()');
};

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
// Build without analysis: nothing waits for Selects analysis. Readiness counts usable clips and photos; clips without
// analysis only add a small note; the panel never starts analysis itself and has no blocking analysis wording.
assert.ok(!panel.includes('still being analysed'), 'the old "still being analysed" wording is gone');
assert.ok(!/startAnalysis|analyzeResources|\.analyze\(/.test(panel), 'the panel does not start analysis');
for (const key of ['notAnalysed', 'analysing', 'notAnalysedAnalyse', 'notAnalysedMaybe', 'analysisFailed', 'noteAnalysing', 'noteFailed', 'videosChecked']) assert.ok(!(key in en), 'STRINGS.' + key + ' is gone');
assert.ok(!/[Aa]nalyse (it|them) (in Selects|first)|No analysed video/.test(JSON.stringify(en)), 'no wording asks to analyse first');
{
  const vm = require('node:vm');
  const strings = require(path.join(root, 'dev', 'i18n-check.cjs')).extractStrings(panel).strings;
  const start = panel.indexOf('function stFootageCounts('), end = panel.indexOf('function SectionSlider(');
  assert.ok(start > 0 && end > start, 'the footage wording helpers exist');
  const js = panel.slice(start, end).replace(/(\w)\??: (?:any|number|string|Lang)\b/g, '$1');
  // The panel's t() over its STRINGS block (plural by count; plain numbers are enough for these sentences).
  const tt = (lang, key, vars = {}) => {
    let msg = strings[lang][key] ?? strings.en[key];
    if (typeof msg !== 'string') msg = msg[new Intl.PluralRules(lang).select(vars.count)] ?? msg.other;
    return msg.replace(/\{(\w+)\}/g, (w, n) => (vars[n] === undefined ? w : String(vars[n])));
  };
  const box = { t: tt };
  vm.runInNewContext(js + '\nthis.api = { stFootageCounts, stFootageNotes };', box);
  const { stFootageCounts: counts, stFootageNotes: notes } = box.api;
  const note = (inv, lang = 'en') => notes(lang, counts(inv)).filter(Boolean).map(x => ' · ' + x).join('');
  const inv = (skipped, analysed = 0, unanalysed = 0, photos = 0) => ({ skipped,
    resources: Array.from({ length: analysed + unanalysed }, (_, i) => ({ rid: 'r' + i, hasAnalysis: i < analysed })), photos: Array.from({ length: photos }, (_, i) => ({ rid: 'p' + i })) });
  const sk = (o = {}) => ({ unanalysed: 0, withoutAnalysis: 0, missing: 0, analysing: 0, notAnalysed: 0, failed: 0, statusKnown: true, ...o });
  // All analysed: nothing to add. Some without analysis (mixed) or all without: one small note, never a blocker.
  assert.equal(note(inv(sk(), 5)), '');
  assert.equal(note(inv(sk({ withoutAnalysis: 2, notAnalysed: 2 }), 3, 2)), ' · Analysed clips give better picks');
  assert.equal(note(inv(sk({ withoutAnalysis: 6, notAnalysed: 4, analysing: 2 }), 0, 6)), ' · Analysed clips give better picks');
  // Clips that cannot be used yet (importing: no length or file path; or analysed without a length).
  assert.equal(note(inv(sk({ unanalysed: 2, missing: 1, notAnalysed: 2 }), 3)), ' · 3 clips not ready yet');
  assert.equal(note(inv(sk({ unanalysed: 1 }), 3)), ' · 1 clip not ready yet');
  // An inventory without withoutAnalysis counts the listed clips without analysis.
  assert.equal(counts({ skipped: {}, resources: [{ hasAnalysis: false }, { hasAnalysis: true }] }).without, 1);
  assert.equal(counts(null).without, 0);
  assert.ok(!/undefined|\{\w+\}/.test(['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh'].map(l => note(inv(sk({ unanalysed: 3, withoutAnalysis: 2 }), 1, 2), l)).join()), 'every language fills the counts');
  for (const phrase of ['const foot = stFootageCounts(inventory);', '(foot.notReady ? t(L, "clipsNotReadyWait", { count: foot.notReady }) : t(L, "noFootage"))',
    '...stFootageNotes(L, foot)].filter(Boolean).join(" · ")', '[sk.unanalysed, sk.withoutAnalysis, sk.missing]', 'r.rid + (r.hasAnalysis === false ? "-" : "+")'])
    assert.ok(panel.includes(phrase), phrase);
  // Polling: while clips are not ready or being analysed, or while the Project has no footage at all. Clips without
  // analysis never make the panel wait.
  const poll = (panel.match(/const needsPoll = ([^\n]*);/) || [])[1];
  assert.ok(poll, 'needsPoll');
  const needsPoll = (inventory) => { const foot = counts(inventory); return vm.runInNewContext(poll, { inventory, foot }); };
  assert.equal(needsPoll(inv(sk({ analysing: 2, withoutAnalysis: 2 }), 3, 2)), true, 'clips being analysed poll (they switch to scene search)');
  assert.equal(needsPoll(inv(sk({ notAnalysed: 160, withoutAnalysis: 160 }), 0, 160)), false, 'never-started clips are usable: no poll');
  assert.equal(needsPoll(inv(sk({ failed: 2, withoutAnalysis: 2 }), 5, 2)), false, 'failed analysis: usable, no poll');
  assert.equal(needsPoll(inv(sk({ unanalysed: 1 }), 5)), true, 'a clip still importing polls');
  assert.equal(needsPoll(inv(sk())), true, 'an empty Project polls');
  assert.equal(needsPoll(inv(sk(), 0, 0, 3)), false, 'photos only: no poll');
  assert.equal(needsPoll(inv(sk(), 5)), false, 'all analysed: no poll');
  assert.equal(needsPoll(null), false);
}
// New wording (and the merged "Checking clips N/M" progress for scene search + quick score).
for (const [key, text] of [['noFootage', 'No video clips or photos in this Project yet. Add some; this updates automatically.'], ['betterWithAnalysis', 'Analysed clips give better picks'],
  ['clipsNotReady', '{"one":"{count} clip not ready yet","other":"{count} clips not ready yet"}'],
  ['clipsNotReadyWait', '{"one":"{count} clip is not ready yet. This updates automatically.","other":"{count} clips are not ready yet. This updates automatically."}']]) says(key, text);
assert.equal(en.checkingClipsCount, 'Checking clips {done}/{count}');
assert.ok(code.includes('t(l, "checkingClipsCount", { done: d, count: total })'), 'progress reads checkingClipsCount');
// The quick-score block: the kit file verbatim, used through quickScoreAll + pickWindowsLocal (no shell for it).
{
  // With SELECTS_APP_KIT set (a kit checkout), the block must equal the kit file.
  const kitBlock = (() => { try { return process.env.SELECTS_APP_KIT ? fs.readFileSync(path.join(process.env.SELECTS_APP_KIT, 'tools', 'panel', 'quick-score.js'), 'utf8').replace(/\n+$/, '') : null; } catch { return null; } })();
  const qs = between(panel, '// quick-score:start', '// quick-score:end');
  if (kitBlock) assert.equal(qs, kitBlock, 'quick-score block is the kit file verbatim');
  assert.equal((panel.match(/\/\/ quick-score:start/g) || []).length, 1);
  for (const phrase of ['await quickScoreAll(stQuickResources(pid, res), { concurrency: ST_QUICK_CONCURRENCY, budgetMs: ST_QUICK_BUDGET_MS, signal,',
    'stQuickCandidates(pid, res, results, pickWindowsLocal)', 'buildAbortRef.current.abort()', 'Promise.all([findCandidates(todo, pid, check, tick), scoreLocal(']) assert.ok(code.includes(phrase), phrase);
  const local = code.slice(code.indexOf('async function scoreLocal('), code.indexOf('// The muffled copy of the user'));
  assert.ok(local && !/runShell|shell\(|\bsq\(|dq\(/.test(local), 'the quick score path uses no shell');
  const dd = code.slice(code.indexOf('function hostDataDir('), code.indexOf('// Double quotes let'));
  assert.ok(dd.includes('fs.join(fs.homedir(), ".selects", "plugin-data", PLUGIN_ID)') && !/runShell|\$HOME/.test(dd), 'the quick-score data folder comes from the host FileSystem');
}

// Hangul audit across the plugin, as place-count does (check_public rejects it too).
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => /\.(tsx|js|cjs|json|md|sh)$/.test(f))) assert.ok(!/[\uac00-\ud7a3]/.test(fs.readFileSync(f, 'utf8')), 'Korean text in ' + f);

// ---- Files the panel reads at runtime ----
for (const rel of ['assets/cues/manifest.json', 'assets/cues/dev-manifest.json', 'assets/fonts/presets.json', 'sfx/manifest.json', 'scripts/inventory.js', 'scripts/search.js',
  'scripts/ensure-audio.js', 'scripts/assemble.js', 'scripts/decorate.js', 'assets/title-graphic.tsx', 'assets/labels-graphic.tsx', 'assets/summer-look.tsx',
  'assets/grid-panel.tsx', 'assets/film-frame.tsx', 'assets/photo-motion.tsx', 'assets/video-motion.tsx', '"assets/fonts/" + file', '"/beat-detect.cjs"']) assert.ok(panel.includes(rel), 'panel reads ' + rel);
for (const rel of ['assets/cues/manifest.json', 'assets/fonts/presets.json', 'sfx/manifest.json', 'scripts/inventory.js', 'scripts/search.js', 'scripts/ensure-audio.js',
  'scripts/assemble.js', 'scripts/decorate.js', 'assets/title-graphic.tsx', 'assets/labels-graphic.tsx', 'assets/summer-look.tsx', 'assets/grid-panel.tsx',
  'assets/film-frame.tsx', 'assets/photo-motion.tsx', 'assets/video-motion.tsx', 'beat-detect.cjs']) assert.ok(fs.existsSync(path.join(root, rel)), rel + ' exists');

// ---- Defaults ----
const ui = panel.slice(panel.indexOf('// st-panel:end'));
for (const re of [/React\.useState<"off" \| "ambient" \| "full">\("ambient"\)/, /React\.useState<"short" \| "standard" \| "long">\("standard"\)/, /\[preset, setPreset\] = React\.useState\("summer"\)/,
  /\[sfxOn, setSfxOn\] = React\.useState\(false\)/, /\[muffleOn, setMuffleOn\] = React\.useState\(true\)/, /\[usePhotos, setUsePhotos\] = React\.useState\(true\)/,
  /\[lookStrength, setLookStrength\] = React\.useState\(ST_LOOK_DEFAULT\)/, /\[line1, setLine1\] = React\.useState\(ST_LINE1_DEFAULT\)/, /\[topItalic, setTopItalic\] = React\.useState\(ST_TOP_ITALIC_DEFAULT\)/]) assert.ok(re.test(ui), String(re));
assert.ok(panel.includes("const ST_LOOK_DEFAULT = 0.45;") && panel.includes("const ST_LINE1_DEFAULT = 'that one trip in';") && panel.includes("const ST_TOP_ITALIC_DEFAULT = 'VLOG';") && panel.includes("const ST_CREDIT_PREFIX = 'By';"));
assert.ok(panel.includes("const ST_GRID_SOUND = 'volume';") && panel.includes("const ST_TIME_ORIGIN = 'clip';") && panel.includes('const ST_AMBIENT_DB = -18;') && panel.includes('const ST_INTRO_DUCK_DB = -7;'), 'live rulings');
// No Pace option; Length is Short / Standard / Long; three presets; muffle hidden with No music.
assert.ok(!/label="Pace"/.test(ui) && !('pace' in en));
for (const phrase of ['label={t(L, "length")}', 'label={t(L, "clipSound")}', 'label={t(L, "lookStrength")}', 'label={t(L, "soundEffects")}', 'label={t(L, "endingMuffle")}',
  'label={t(L, "usePhotos")}', 'label={t(L, "style")}', '{ label: t(L, "preset.summer"), value: "summer" }', '{ label: t(L, "preset.poster"), value: "poster" }',
  '{ label: t(L, "preset.postcard"), value: "postcard" }', 'placeholder={t(L, "placeOptional")}', 'label={t(L, "creditName")}', 'label={t(L, "season")}',
  't(L, "resetTo", { season: inferredSeason })', 'label={t(L, "topLabel")}', 'label={t(L, "topItalic")}', '{music.kind !== "none" ? <ui.Toggle label={t(L, "endingMuffle")}',
  '<ui.Toggle label={t(L, "summerLook")} value={lookOn}', 'label={t(L, "lookStrength")} value={lookStrength} onChange={setLookStrength} min={0} max={1} step={0.05} disabled={busy || !lookOn}',
  'label={t(L, "placePrefix")} value={placePrefix}', 'label={t(L, "creditPrefix")} value={creditPrefix}', 'creditPrefix={creditPrefix}',
  'setLine1(stLimitText(v, ST_LIMITS.line1.chars, ST_LIMITS.line1.words))', 'setSeasonEdit(stLimitText(v, ST_LIMITS.season.chars, 0))', 'setPlace(stLimitText(v, ST_LIMITS.place.chars, 0))',
  't(L, "line1Limit", { chars: ST_LIMITS.line1.chars, words: ST_LIMITS.line1.words })', 't(L, "seasonLimit", { chars: ST_LIMITS.season.chars })',
  't(L, "placeLimit", { chars: ST_LIMITS.place.chars })']) assert.ok(ui.includes(phrase), phrase);
for (const [key, text] of [['length', 'Length'], ['clipSound', 'Clip sound'], ['lookStrength', 'Look strength'], ['soundEffects', 'Sound effects'], ['endingMuffle', 'Ending muffle'],
  ['usePhotos', 'Use photos'], ['chooseClips', 'Choose clips'], ['style', 'Style'], ['preset.summer', 'Summer'], ['preset.poster', 'Poster'], ['preset.postcard', 'Postcard'],
  ['placeOptional', 'Optional \u2014 leave blank to hide'], ['creditName', 'Credit name'], ['season', 'Season'], ['resetTo', 'reset to {season}'], ['topLabel', 'Top label'],
  ['topItalic', 'Top label (italic part)'], ['summerLook', 'Summer look'], ['placePrefix', 'Place prefix'], ['creditPrefix', 'Credit prefix'],
  ['line1Limit', 'Line 1 takes up to {chars} characters and {words} words.'], ['seasonLimit', 'The season takes up to {chars} characters.'],
  ['placeLimit', 'The place takes up to {chars} characters.'], ['wideCounts', 'Korean, Japanese and Chinese characters count as 2.']]) says(key, text);
for (const re of [/\[lookOn, setLookOn\] = React\.useState\(true\)/, /\[creditPrefix, setCreditPrefix\] = React\.useState\(ST_CREDIT_PREFIX\)/, /\[placePrefix, setPlacePrefix\] = React\.useState\(ST_PLACE_PREFIX\)/])
  assert.ok(re.test(ui), String(re));

// ---- Pitfall guards (kit) ----
for (const phrase of ['linkToDraftFrame', 'selects.editor.openDraft', 'FontFace', 'projectRef', 'ffprobe', 'loadInventory(', 'visibilitychange', 'onClick={() => loadInventory()}>{t(L, "refresh")}<',
  'addEventListener("focus"', '10000', 'setCandidates(null)', 'invSigRef', 'No valid session ID', 'readFootage()', 't(l, "nothingSaved"', 'Never resend a committing call',
  'role="slider"', 'aria-valuenow', 'aria-valuetext', '--panel-accent', '--panel-muted-fg', 'ResizeObserver', 'devicePixelRatio', 'setPointerCapture', '"grabbing"',
  '"ArrowLeft"', '"Home"', '"End"', 'fmtTime(total)', '"pause"', 'requestAnimationFrame', 'cancelAnimationFrame', '"Escape"',
  'previewTokenRef', 'URL.revokeObjectURL', 'preview-*.mp3', 'readText(roots.data', 'height: PREVIEW_HEIGHT', 'Your footage fits', 'disabledReason',
  'style: "normal", weight: "400"']) assert.ok(code.includes(phrase), phrase);
for (const [key, text] of [['anotherVersion', 'Try other shots'], ['finishTitle', 'Finish title and look'], ['stoppedAt', 'Stopped at step {step}/{total}, {name}: {detail}'],
  ['installTools', 'Install ffmpeg to preview music or use your own track.'], ['preparingTools', 'Preparing beat detection (first time only)'], ['draftCreatedAdding', 'Draft created; adding title and look\u2026'],
  ['refresh', 'Refresh'],
  ['nothingSaved', '{detail} Nothing was saved; press Build to try again.'], ['sectionHint', 'Music section \u2014 drag to choose'], ['stopPreview', 'Stop preview'],
  ['cancelPreview', 'Cancel preview'], ['dropStartsAt', 'Drop \u00b7 starts at {seconds} s'], ['sectionStartsAt', 'Section \u00b7 starts at {seconds} s'],
  ['dropAt', 'Drop at {seconds} s'], ['sectionAt', 'Section at {seconds} s'], ['noMusicTiming', 'No music: the cuts use approximate timing (a fixed 0.5 s beat).'],
  ['noDrop', 'No drop found: the grid starts after the 2-bar title.'], ['muffleSkippedPlain', 'ending muffle skipped'],
  ['fitDistinct', '{"one":"{count} different clip or photo","other":"{count} different clips and photos"}']]) says(key, text);
// A sentence with two numbers takes its plural form from {count}, so the noun must sit next to {count}, never next to
// the other number ({selected}, {done}, {distinct}); a part with the other number must read the same in every form.
{
  const all = require(path.join(root, 'dev', 'i18n-check.cjs')).extractStrings(panel).strings, forms = v => (typeof v === 'string' ? [v] : Object.values(v));
  for (const lang of ['de', 'en', 'es', 'fr', 'it', 'pt']) for (const key of ['clipsSelected', 'photosSelected']) for (const f of forms(all[lang][key]))
    assert.ok(/\{selected\} \S+ \{count\} \S/.test(f), lang + '.' + key + ': {selected} before {count} and its noun: ' + f);
  for (const lang of Object.keys(all)) {
    for (const f of forms(all[lang].checkingClipsCount)) assert.ok(/\{done\}\/\{count\}/.test(f), lang + '.checkingClipsCount: {done}/{count} together: ' + f);
    assert.equal(new Set(forms(all[lang].fitShrunk).map(f => f.split(/[.\u3002]/)[0])).size, 1, lang + '.fitShrunk: the {distinct} sentence is the same in every form');
    for (const k of Object.keys(all[lang])) for (const f of forms(all[lang][k])) assert.ok(!/of them|davon \{|\{photos\} (photos|Fotos|son|s\u00e3o|en photo)/.test(f), lang + '.' + k + ': no partial count agreeing with another number: ' + f);
  }
}
// The language is read on every render, first in the component (before any early return), and never cached.
// The panel UI is SummerTripPanel; Panel only hands a Clip highlights run to TemplateRun.
const comp = code.slice(code.indexOf('function SummerTripPanel('));
assert.ok(/^function SummerTripPanel\(\{ sdk, context, ui \}: any\) \{\n(?:\s*\/\/[^\n]*\n)*\s*const L = uiLang\(context\);/.test(comp), 'uiLang(context) first in the component');
assert.ok(!/useMemo\([^)]*uiLang|useEffect\([^)]*uiLang|useState\([^)]*uiLang/.test(code), 'the language is not memoised');
// Text kept in state renders in the language of the moment: status, progress detail and build-time notes are closures.
assert.ok(code.includes('React.useState<{ tone: string; say: (lang: Lang) => string } | null>') && !/setStatus\(\{ tone: "\w+", text:/.test(code), 'status is a say(lang) closure');
assert.ok(code.includes('{status.say(L)}') && code.includes('label={progressText(L, progress)}') && code.includes('typeof n === "function" ? n(L) : n'));
assert.ok(!/new Error\("[A-Z]/.test(code.slice(code.indexOf('export default function Panel('))), 'panel errors that reach the UI are uiError(say)');
assert.ok(!/--text-tertiary/.test(panel), '--text-tertiary is not a panel token');
assert.ok(!/var\(--accent\b/.test(panel), '--accent is not a panel token');
assert.ok(!/icon="stop"/.test(panel), 'the kit has no stop icon');
assert.ok(!/\.(captureFrames|captureVisualFrames)\(/.test(panel), 'no frame capture in the panel');
// Hooks stay before the early return.
const early = panel.indexOf('if (!projectId) return <ui');
for (const hook of ['addEventListener("visibilitychange"', 'React.useMemo<any>(', 'const lengthRef = React.useRef', '[cueId, ownMusic?.path, section, length]', 'const [sfxOn']) assert.ok(panel.indexOf(hook) > 0 && panel.indexOf(hook) < early, hook + ' before the early return');
// Shell: PATH prefix on every tool step, user paths single-quoted, big outputs through files, one decode per SFX.
assert.ok(panel.includes('/opt/homebrew/bin:/usr/local/bin') && !panel.includes('.nvm/'), 'Homebrew path, no nvm hunting');
// Own music runs beat-detect.cjs on the pinned Node.js that runtime.sh fetches; there is no bare `node` command.
assert.ok(panel.includes('dq(SKILLS_DIR + "/runtime.sh") + " node"') && panel.includes('" && " + sq(node) + " " + sq(roots.plugin + "/beat-detect.cjs")'), 'beat detection uses the runtime Node.js');
assert.ok(!/["'`]\s*node\s/.test(panel.replace(/\/\/.*$/gm, '')) && !panel.includes('command -v node'), 'no bare node command or probe');
assert.equal(read('runtime.sh'), fs.readFileSync(path.join(__dirname, '..', '..', '..', 'tools', 'runtime.sh'), 'utf8'), 'runtime.sh is the library copy');
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
assert.ok(buildBody.includes('before.indexOf(d.sequenceId) < 0') && buildBody.includes('stRecoverAssembly(cfg, foundFps, newIds[0])') && buildBody.includes('t(l, "draftUnconfirmedFinish"'));
assert.ok(/press Finish title and look/.test(en.draftUnconfirmedFinish) && buildBody.includes('t(l, "draftUnconfirmed", {'), 'a recovered Draft offers Finish title and look');
assert.ok(/It has no title or look yet/.test(en.draftUnconfirmed), 'an unrecoverable saved Draft says it has no title or look');
// Real-fps planning: plans use the Project's learnt Draft rate, assemble lays at the real rate, decorate uses assemble's frames.
assert.ok(buildBody.includes('const planFps = fpsRef.current[pid!] || ST_GUESS_FPS;') && buildBody.includes('if (a.fps > 0) fpsRef.current[pid!] = a.fps;'));

// English Adjust labels from two sources must agree: the JS defaults (headless driver: ST_TITLE_EDITABLE /
// ST_LABELS_EDITABLE, decorate.js lab() defaults, ST_MOTION_OPTIONS) and STRINGS.en through inspectorLabels() (panel).
{
  const labelKey = { line1: 'line1', season: 'param.seasonWord', topMain: 'topLabel', topItalic: 'topItalic', creditPrefix: 'creditPrefix', creditName: 'param.creditName',
    placePrefix: 'placePrefix', place: 'param.place' };
  const G = {}; vm.createContext(G); vm.runInContext(read('graphics-defs.js') + ';globalThis.D={ST_TITLE_EDITABLE,ST_LABELS_EDITABLE};', G);
  for (const d of [...G.D.ST_TITLE_EDITABLE, ...G.D.ST_LABELS_EDITABLE]) {
    const k = labelKey[d.key] || 'param.' + d.key;
    assert.equal(en[k], d.label, 'STRINGS.en.' + k + ' = ' + d.key + ' default');
    assert.ok(code.includes(d.key + ': t(lang, "' + k + '")'), 'inspectorLabels sends ' + d.key);
  }
  const deco = read('scripts/decorate.js');
  for (const [k, sk] of [['look', 'summerLook'], ['grain', 'param.grain'], ['leak', 'param.leak'], ['motion', 'param.motion'], ['motionStrength', 'param.motionStrength'], ['videoMotion', 'param.videoMotion']]) {
    assert.ok(deco.includes("lab('" + k + "', '" + en[sk] + "')"), 'decorate.js default for ' + k + ' = STRINGS.en.' + sk);
    assert.ok(code.includes(k + ': t(lang, "' + sk + '")'), 'inspectorLabels sends ' + k);
  }
  const mo = [...code.matchAll(/\{ label: '([^']+)', value: '([^']+)' \}/g)];
  assert.equal(mo.length, 8);
  for (const [, label, value] of mo) assert.equal(en['motion.' + value], label, 'motion.' + value);
}

// ---- The pure helpers and configs (planner + graphics + muffle + panel blocks in node:vm) ----
const block = [between(panel, '// st-planner:start', '// st-planner:end'), between(panel, '// st-graphics:start', '// st-graphics:end'),
  between(panel, '// st-muffle:start', '// st-muffle:end'), between(panel, '// st-panel:start', '// st-panel:end')].join('\n');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, NaN, Error, JSON, Date, isFinite, parseFloat }; vm.createContext(box);
vm.runInContext(block + '\n;globalThis.X = { stMonthList, stInferSeason, stCoverFor, stOwnMuffledName, stOwnCue, stMusicFor, stSnapSection, stDefaultStart, stPseudoCandidates, stPlanOptions, stSfxFiles, stFieldLen, stHasWide, stPlanText, ST_PLAN_TEXT, ST_MOTION_OPTIONS, stSfxFiles, stSfxConfig, stDraftName, stLimitText, stAtLimit, stTitleHitsFor, stRecoverAssembly, ST_LIMITS, stAssembleConfig, stDecorateConfig, stPlanBuild, stSchedule, stTitleSchedule, stTitleTimes, stPresetFontFiles, stFrameSchedule, ST_MUFFLE_FILTER, ST_MUFFLE_TAG, stMuffleCommand, ST_FILM_WINDOW };', box);
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
// Own-music muffled copy: <base>-muffled-<filter tag>-<hash8>.wav (stable, the cache key; ensure-audio.js may reuse it by
// file name). The filter tag changes with the filter, so a new filter never reuses a copy baked with the old one.
assert.equal(X.ST_MUFFLE_TAG, require(path.resolve(__dirname, '..', 'muffle.cjs')).ST_MUFFLE_TAG);
assert.equal(X.stOwnMuffledName('My Song (final).mp3', '0a1b2c3d'), 'My-Song-final--muffled-' + X.ST_MUFFLE_TAG + '-0a1b2c3d.wav');
assert.equal(X.stOwnMuffledName('/x/y/summer.m4a', 'deadbeef'), 'summer-muffled-a263eda4-deadbeef.wav');
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
// Wide characters (Hangul, kana, CJK) count as 2 (kit i18n policy): a 10-column season holds 5 syllables.
const yeoreum = '\uc5ec\ub984', seoul = '\uc11c\uc6b8'; // escapes: no literal Hangul in the plugin
assert.equal(X.stFieldLen(yeoreum), 4); assert.equal(X.stFieldLen('ab' + seoul), 6); assert.equal(X.stFieldLen('SUMMER'), 6);
assert.equal(X.stLimitText(yeoreum.repeat(3), 10, 0), yeoreum.repeat(2) + yeoreum[0], 'Hangul cut at 10 columns');
assert.equal(X.stLimitText('a' + yeoreum.repeat(3), 10, 0), 'a' + yeoreum.repeat(2), 'a wide character never straddles the limit');
assert.equal(X.stFieldLen(X.stLimitText(seoul.repeat(10), 18, 0)), 18);
assert.ok(X.stAtLimit(yeoreum.repeat(2) + yeoreum[0], 10, 0) && X.stAtLimit('a' + yeoreum.repeat(2), 10, 0) && !X.stAtLimit(yeoreum, 10, 0), 'at the limit when no wide character fits');
assert.ok(X.stHasWide(seoul) && !X.stHasWide('Seoul'));
// Planner text maps to "plan.<id>" keys (the planner stays English). Every planner sentence and the panel's own section
// note is recognised; the planner sources hold no other disabledReason / note sentence.
const planSentences = [
  ['Needs at least 6 different clips or photos (found 3)', 'needDistinct', { count: 6, found: 3 }],
  ['Needs one video clip at least 5.0 s long for the opening', 'needOpener', { seconds: 5 }],
  ['Needs a second clip at least 2.4 s long (or a photo) for the place shot', 'needPlace', { seconds: 2.4 }],
  ['Needs at least 6 different clips or photos long enough for the grid panels (found 5)', 'needGrid', { count: 6, found: 5 }],
  ['Your footage is too short for 4 montage shots', 'tooShort', { count: 4 }],
  ['Some shots reuse footage from the same moment of a clip', 'reuseMoments', {}],
  ['More than 2 photos play in a row (not enough video)', 'photoRun', { count: 2 }],
  ['Some photos are used twice', 'reusedPhotos', {}],
  ['The drop is too close to the start of the track; the title runs over the first two bars', 'dropTooEarly', {}],
  ['The drop section does not fit this length; moved to the latest start that fits', 'dropNoFit', {}],
  ['The section did not fit this length; moved to the latest start that fits', 'sectionMoved', {}],
];
for (const [text, id, vars] of planSentences) {
  assert.deepEqual(j(X.stPlanText(text)), { id, vars }, text);
  assert.ok(typeof en['plan.' + id] === 'string' && Object.keys(vars).every(k => en['plan.' + id].includes('{' + k + '}')), 'plan.' + id);
}
assert.equal(X.ST_PLAN_TEXT.length, planSentences.length);
assert.equal(X.stPlanText('stPlanBuild needs bpm and fps'), null, 'anything else shows as written');
const plannerSrc = read('planner.js');
assert.equal((plannerSrc.match(/\bfail\('/g) || []).length, 5, 'planner fail() sentences: needDistinct, needOpener, needPlace, needGrid, tooShort');
assert.equal((plannerSrc.match(/notes\.push\('/g) || []).length, 4, 'planner notes: reuseMoments, (footage fits: shown by the panel), photoRun, reusedPhotos');
assert.ok(plannerSrc.includes("'The drop is too close to the start of the track; the title runs over the first two bars'") && plannerSrc.includes("'The drop section does not fit this length; moved to the latest start that fits'"));
assert.ok(code.includes('c.note || "The section did not fit this length; moved to the latest start that fits"'), 'the panel section note is the mapped sentence');
assert.ok(code.includes('sayPlan(L, readyPlan.disabledReason)') && code.includes('sayPlan(L, sectionNote)') && code.includes('.map((n: string) => sayPlan(L, n))') && code.includes('sayPlan(l, reason)'));
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
// Section kinds that decide the intro line (stAssembleConfig): only a drop section is 'drop'.
assert.equal(X.stDefaultStart(X.stMusicFor({ choice: 'c1', cue: { ...cue, dropBeat: null, dropSeconds: null }, own: null }), 8).kind, 'section', 'cue without a drop');
assert.equal(X.stDefaultStart(X.stMusicFor({ choice: 'own', cue: null, own: { ...own, drop: null } }), 8).kind, 'section', 'own music without a drop');
assert.equal(X.stDefaultStart(mFixed, 8).kind, 'section', 'fixed timing');
assert.equal(X.stSnapSection(mCue, 8, 0).kind, 'section', 'a cue section moved off the drop');
assert.ok(panel.includes('sectionKind: sectionInfo ? sectionInfo.kind : null') && panel.includes('sfx, sectionKind: musicAt.sectionKind }'), 'Build passes the slider section kind to stAssembleConfig');
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
// Own music with an approximate grid (beat-detect.cjs grid 'approximate': tempo and first beat tight, beat faint): the
// detected tempo (octave-folded) and first beat, sections snapped to that grid's bars, the drop found on it as the
// default section (so the intro level line follows it, as for any drop section), low-band snapping as for fixed timing,
// and the panel says so. 'none' and a missing grid state keep the fixed 0.5 s fallback.
{
  const faintOwn = { accepted: false, grid: 'approximate', bpm: 100, firstBeat: 0.37, durationSeconds: 90, beatEnergy: [1, 2], peaks: [0.1], onsets: [[1, 'l', 3]], onsetThresholds: { l: 2 }, drop: null };
  const mFaint = X.stMusicFor({ choice: 'own', cue: null, own: faintOwn });
  assert.deepEqual([mFaint.kind, mFaint.bpm, mFaint.faint, mFaint.approximate, mFaint.noDrop], ['own', 100, true, true, true]);
  assert.deepEqual(j(X.stOwnCue(faintOwn)), { bpm: 100, firstBeat: 0.37, dropSeconds: null, duration: 90, beatEnergy: [1, 2] });
  // Bars of 2.4 s from 0.37 s: 10 s snaps to 0.37 + 4 bars = 9.97 s.
  const sf = X.stSnapSection(mFaint, 8, 10);
  assert.ok(near(sf.start, 0.37 + 4 * 2.4) && sf.kind === 'section', JSON.stringify(sf));
  const df = X.stDefaultStart(mFaint, 8);
  const bars = (df.start - 0.37) / 2.4;
  assert.ok(df.kind === 'section' && near(bars, Math.round(bars)), 'default on a bar: ' + JSON.stringify(df));
  const of = X.stPlanOptions({ music: mFaint, section: sf.start, candidates: [], fps: 30, montageShots: 8, seed: 1 });
  assert.ok(of.bpm === 100 && of.lowConfidence === true && near(of.sectionStart, 9.97) && of.onsets.length === 1 && !of.bundled, JSON.stringify(of));
  // A slow detection is octave-folded (60 -> 120) like an accepted one.
  assert.equal(X.stMusicFor({ choice: 'own', cue: null, own: { ...faintOwn, bpm: 60 } }).bpm, 120);
  // A drop found on the approximate grid places the default section (kind 'drop': the intro level line applies).
  const withDrop = { ...faintOwn, bpm: 120, firstBeat: 0.3, drop: { dropBeat: 16, dropSeconds: 8.3, stepDb: 6, bpm: 120, firstBeat: 0.3 } };
  const mFaintDrop = X.stMusicFor({ choice: 'own', cue: null, own: withDrop });
  const dd = X.stDefaultStart(mFaintDrop, 8);
  assert.ok(near(dd.start, 4.3) && dd.kind === 'drop' && mFaintDrop.noDrop === false, JSON.stringify(dd));
  // The texts: tempo found, beat faint, approximate timing on the detected tempo.
  assert.equal(mFaint.noDrop, true); assert.equal(mFaintDrop.noDrop, false);
  says('faintTiming', 'Approximate timing on the detected tempo ({bpm} BPM): the tempo was found but the beat is faint, so the cuts may miss it.');
  // Two whole sentences joined with `gap` (no space in ja/zh), the second only without a drop.
  assert.ok(code.includes('t(lang, "faintTiming", { bpm: Math.round(music.bpm) }) + (music.noDrop ? t(lang, "gap") + t(lang, "noDrop") : "")'));
  assert.ok(code.includes(': m.faint ? { tone: "info", say: (l) => faintText(l, m) }') && code.includes(': music.kind === "own" && music.faint ? faintText(L, music)'), 'status and timing note use the faint text');
  // An accepted grid is not faint.
  assert.equal(mOwn.faint, false); assert.equal(mOwn.approximate, false);
  // 'none' (and an analysis without a grid state, e.g. the length-only fallback) keep the fixed 0.5 s fallback.
  const mNone = X.stMusicFor({ choice: 'own', cue: null, own: { ...faintOwn, grid: 'none' } });
  assert.deepEqual([mNone.kind, mNone.bpm, mNone.approximate], ['fixed', 120, true]);
  assert.deepEqual(j(X.stSnapSection(mNone, 8, 12.34)), { start: 12.3, kind: 'section', moved: false });
  assert.equal(X.stPlanOptions({ music: mNone, section: 2, candidates: [], fps: 30, montageShots: 8, seed: 1 }).bpm, 120);
  assert.equal(X.stMusicFor({ choice: 'own', cue: null, own: { accepted: false, durationSeconds: 60, peaks: [] } }).kind, 'fixed');
}
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
      addVideoEffect: async x => { (effects[x.clip.clipId] = effects[x.clip.clipId] || []).push({ name: x.label, parameters: x.parameters, editableParameters: x.editableParameters }); return {}; },
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
  filmFrame: read('assets/film-frame.tsx'), motion: read('assets/photo-motion.tsx'), videoMotion: read('assets/video-motion.tsx') };
const assembleJs = read('scripts/assemble.js'), decorateJs = read('scripts/decorate.js');
// contracts.md keys.
const contracts = read('dev/contracts.md');
const ASSEMBLE_KEYS = ['projectId', 'draftName', 'fps', 'W', 'H', 'beats', 'schedule', 'picks', 'sizes', 'music', 'crossfadeFrames', 'clipSound', 'ambientDb', 'gridSound', 'sfx', 'introDuckDb'];
const DECORATE_KEYS = ['sequenceId', 'fps', 'frames', 'placed', 'gridPlaced', 'sizes', 'mute', 'gridSound', 'title', 'labels', 'look', 'gridPanel', 'filmFrame', 'motion', 'videoMotion', 'endingMotion', 'photos'];
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
    const sec = music.kind === 'none' ? null : X.stDefaultStart(music, 8);
    const section = sec ? sec.start : 0;
    assert.equal(sec && sec.kind, music.kind === 'none' ? null : 'drop', 'default sections of the drop cue and the own music with a drop');
    const plan = X.stPlanBuild(X.stPlanOptions({ music, section, candidates: cands, fps: 30, montageShots: 8, seed: 3, sizes }));
    assert.ok(plan.ok, plan.disabledReason);
    assert.equal(plan.frames.fps, 30, 'planned at the guess');
    const sfx = sfxOn ? X.stSfxConfig(sfxManifest, sfxIds) : null;
    const musicCfg = music.kind === 'none' ? null : { resourceId: 'm1', sectionStart: section, wetResourceId: 'm2' };
    const acfg = j(X.stAssembleConfig({ projectId: 'proj', draftName: X.stDraftName('', 'SUMMER', new Date(2026, 6, 1, 12, 0)), fps: 30, plan, sizes, durations, music: musicCfg, clipSound, sfx, sectionKind: sec ? sec.kind : null }));
    assert.deepEqual(Object.keys(acfg), ASSEMBLE_KEYS, 'assemble config keys (contracts.md order)');
    assert.deepEqual(acfg.beats, { bpm: plan.frames.bpm, delta: plan.frames.delta, snaps: j(plan.frames.snaps) }, 'frames.snaps from the plan');
    assert.equal(acfg.gridSound, 'volume'); assert.equal(acfg.ambientDb, -18); assert.equal(acfg.crossfadeFrames, null);
    assert.equal(acfg.introDuckDb, music.kind === 'none' ? 0 : -7, 'intro line only in a drop section (never without music)');
    // The same plan in an ordinary section, or without a known section kind: no intro line.
    for (const sectionKind of ['section', null, undefined]) {
      assert.equal(X.stAssembleConfig({ projectId: 'proj', draftName: 'x', fps: 30, plan, sizes, durations, music: musicCfg, clipSound, sfx, sectionKind }).introDuckDb, 0, String(sectionKind));
    }
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
    assert.deepEqual(j(dcfg.videoMotion), { tsx: tsx.videoMotion, strength: 1 }, 'Video motion on by default');
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
    // Adjust labels in the UI language at Build (here a partial set): given keys replace the English label, the rest and
    // every effect / graphic name stay English. Without labels the config is the English one (no `labels` key).
    const labels = { graphic: { line1: 'Zeile 1', place: 'Ort (leer blendet ihn aus)' }, effect: { look: 'Sommer-Look', leak: 'Lichteinfall', motion: 'Bewegung' },
      motion: { 'push-in': 'Heranfahren' } };
    const inputs2 = { ...inputs, lookOn: false, creditPrefix: 'Shot by', placePrefix: 'at', labels };
    const dcfg2 = X.stDecorateConfig({ a: ra, plan, inputs: inputs2, presets, fontsB64, tsx });
    assert.ok(!('adjustLabels' in dcfg) && dcfg.labels.tsx === tsx.labels, 'no labels: English config');
    assert.deepEqual(Object.keys(dcfg2), [...DECORATE_KEYS, 'adjustLabels'], 'the panel config (always labelled) keys, contracts.md order');
    assert.ok(/\badjustLabels\b/.test(decorateDoc) && /koFamily/.test(contracts), 'contracts.md documents adjustLabels and koFamily');
    assert.deepEqual(j(dcfg.title.editableParameters.map(e => e.label).slice(0, 2)), ['Line 1', 'Season word']);
    assert.deepEqual(j(dcfg2.title.editableParameters.map(e => e.label).slice(0, 2)), ['Zeile 1', 'Season word']);
    assert.equal(dcfg2.labels.editableParameters.find(e => e.key === 'place').label, 'Ort (leer blendet ihn aus)');
    assert.deepEqual(j(dcfg2.motion.options.slice(0, 2)), [{ label: 'Heranfahren', value: 'push-in' }, { label: 'Pull out', value: 'pull-out' }]);
    assert.deepEqual(j(dcfg.motion.options), j(X.ST_MOTION_OPTIONS));
    assert.deepEqual(j(dcfg2.adjustLabels), labels.effect); assert.equal(dcfg2.labels.tsx, tsx.labels);
    assert.deepEqual(j(dcfg2.look), { tsx: tsx.look, strength: 0, leakStrength: 1, gradeOff: true }, 'look off: gradeOff, strength 0');
    assert.equal(dcfg2.title.parameters.creditPrefix, 'Shot by'); assert.equal(dcfg2.labels.parameters.placePrefix, 'at');
    const d2 = await loadScript('decorate.js', dcfg2)({ draft: () => last2 });
    assert.ok(d2.committed && d2.titleAdded && d2.labelsAdded && !d2.notes.some(n => /not found/.test(n)), JSON.stringify(d2));
    const main2 = last2.rows.filter(c => c.trackKind === 'main');
    assert.equal(main2.filter(c => (last2.effects[c.clipId] || []).some(e => e.name === 'Summer look')).length, 1, 'look off: only the leak clip keeps a (strength 0) look');
    assert.equal(main2.filter(c => (last2.effects[c.clipId] || []).some(e => e.name === 'Film frame')).length, 3);
    const eff2 = Object.values(last2.effects).flat();
    const labelOf = (name, key) => eff2.find(e => e.name === name).editableParameters.find(p => p.key === key).label;
    assert.deepEqual([labelOf('Summer look', 'strength'), labelOf('Summer look', 'grain'), labelOf('Summer look', 'leakStrength'), labelOf('Film frame', 'leakStrength')],
      ['Sommer-Look', 'Film grain', 'Lichteinfall', 'Lichteinfall'], 'decorate.js takes cfg.adjustLabels, English for the rest');
    assert.equal(last2.graphics.find(g => g.name === 'Summer Trip title').editableParameters[0].label, 'Zeile 1');
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
