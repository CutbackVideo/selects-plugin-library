// plugins/archive-vlog/tests/panel.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const planner = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const lockupTsx = fs.readFileSync(path.join(root, 'assets', 'title-lockup.tsx'), 'utf8');
const presets = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'fonts', 'presets.json'), 'utf8'));

// The planner is embedded verbatim between its markers.
const pStart = panel.indexOf('// av-planner:start\n'), pEnd = panel.indexOf('// av-planner:end');
assert.ok(pStart >= 0 && pEnd > pStart, 'planner markers');
assert.equal(panel.slice(pStart + '// av-planner:start\n'.length, pEnd).trim(), planner.trim(), 'panel.tsx must embed planner.js verbatim');
// The title layout block of assets/title-lockup.tsx is embedded verbatim too (the preview uses the Draft's layout code).
const lockupTsx0 = fs.readFileSync(path.join(root, 'assets', 'title-lockup.tsx'), 'utf8');
const lStart = panel.indexOf('// av-lockup:start'), lEnd = panel.indexOf('// av-lockup:end');
assert.ok(lStart > pEnd && lEnd > lStart, 'lockup markers after the planner');
assert.equal(panel.slice(lStart, lEnd), lockupTsx0.slice(lockupTsx0.indexOf('// av-lockup:start'), lockupTsx0.indexOf('// av-lockup:end')), 'panel.tsx must embed the av-lockup block verbatim');
assert.equal(panel.split('// av-lockup:start').length, 2, 'one lockup block');
const ui = panel.slice(pEnd, lStart) + panel.slice(lEnd);
// The hook B helpers (motion bonus, punch frames) sit in their own plain-JS block outside the planner, which the
// headless driver loads next to planner.js.
const hStart = panel.indexOf('// av-hook:start\n'), hEnd = panel.indexOf('// av-hook:end');
assert.ok(hStart > pEnd && hEnd > hStart && hEnd < lStart, 'hook block between the planner and the lockup');
assert.equal(panel.split('// av-hook:start').length, 2, 'one hook block');
const hookBlock = panel.slice(hStart, hEnd);
const outside = panel.slice(0, pStart) + ui;
// UI text lives in the STRINGS block (10 languages, tests/i18n.test.cjs), which sits before the planner, so `ui` is
// code only. `says` checks the English wording of a key and that the code reads the key with t() / tOr().
const { extractStrings } = require(path.join(root, 'dev', 'i18n-check.cjs'));
// Plain objects (the block is evaluated in another vm realm, where deepEqual fails on equal content).
const en = JSON.parse(JSON.stringify(extractStrings(panel).strings.en));
const textOf = key => (typeof en[key] === 'string' ? en[key] : Object.values(en[key] || {}).join('\n'));
const says = (key, text) => {
  assert.ok(key in en, 'STRINGS.en has ' + key);
  assert.ok(textOf(key).includes(text), 'STRINGS.en.' + key + ' says "' + text + '": ' + textOf(key));
  assert.ok(new RegExp('\\bt\\((L|l|lang|bl), "' + key.replace(/[.]/g, '\\.') + '"').test(ui), 't() reads ' + key);
};
// A dynamic family (`t(L, "step." + id)`, `tOr(bl, "motion." + o.value, o.label)`) and its English values.
const family = (prefix, values) => {
  assert.ok(ui.includes('"' + prefix + '." + '), 'family ' + prefix + ' read dynamically');
  for (const [k, v] of Object.entries(values)) assert.equal(en[prefix + '.' + k], v, prefix + '.' + k);
};

// Header: the name, ten localised names (ko in Latin letters), the icon and the plugin id.
const head = panel.split('\n').slice(0, 16).join('\n');
assert.match(head, /^\/\/ @name Archive Vlog$/m);
const langs = head.match(/^\/\/ @name:(\w+) .+$/gm) || [];
assert.equal(langs.length, 10, 'ten localised names');
assert.deepEqual(langs.map(l => l.slice(9, 11)).sort(), ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']);
assert.match(head, /^\/\/ @name:ko [A-Za-z ]+$/m, 'ko name in Latin letters');
assert.match(head, /^\/\/ @icon sparkles$/m);
assert.ok(panel.includes('const PLUGIN_ID = "archive-vlog";'));
assert.ok(!/^import .* from "(?!react")/m.test(panel), 'only react may be imported');
for (const name of ['inventory.js', 'search.js', 'ensure-audio.js', 'assemble.js', 'decorate.js', 'title-lockup.tsx', 'soft-look.tsx', 'photo-motion.tsx', 'beat-punch.tsx', 'manifest.json', 'presets.json', 'beat-detect.cjs']) assert.ok(panel.includes(name), 'panel reads ' + name);

// Unanalysed videos are worded by why (inventory.js's skipped split); the panel never claims clips are being analysed
// when their analysis was never started, and never starts analysis itself.
assert.ok(!panel.includes('still being analysed'), 'the old "still being analysed" wording is gone');
assert.ok(!/startAnalysis|analyzeResources|\.analyze\(/.test(panel), 'the panel does not start analysis');
{
  const vm = require('node:vm');
  const strings = require(path.join(root, 'dev', 'i18n-check.cjs')).extractStrings(panel).strings;
  const start = panel.indexOf('function avAnalysisCounts('), end = panel.indexOf('function SectionSlider(');
  assert.ok(start > 0 && end > start, 'the analysis wording helpers exist');
  const js = panel.slice(start, end).replace(/(\w)\??: (?:any|number|string|Lang)\b/g, '$1');
  // The panel's t() over its STRINGS block (plural by count; plain numbers are enough for these sentences).
  const tt = (lang, key, vars = {}) => {
    let msg = strings[lang][key] ?? strings.en[key];
    if (typeof msg !== 'string') msg = msg[new Intl.PluralRules(lang).select(vars.count)] ?? msg.other;
    return msg.replace(/\{(\w+)\}/g, (w, n) => (vars[n] === undefined ? w : String(vars[n])));
  };
  const box = { t: tt };
  vm.runInNewContext(js + '\nthis.api = { avAnalysisCounts, avAnalysisText, avAnalysisNotes };', box);
  const { avAnalysisCounts: counts } = box.api;
  const text = c => box.api.avAnalysisText('en', c);
  const note = c => box.api.avAnalysisNotes('en', c).filter(Boolean).map(x => ' · ' + x).join('');
  const sk = (analysing, notAnalysed, failed, statusKnown = true) => ({ unanalysed: analysing + notAnalysed + failed, missing: 0, analysing, notAnalysed, failed, statusKnown });
  // Other languages: whole sentences per status, joined by the language's gap (none in ja/zh).
  assert.equal(box.api.avAnalysisText('ja', counts(sk(3, 1, 0))), tt('ja', 'analysing', { count: 3 }) + tt('ja', 'notAnalysedAnalyse', { count: 1 }));
  assert.ok(!/undefined|\{\w+\}/.test(['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh'].map(l => box.api.avAnalysisText(l, counts(sk(3, 1, 2))) + box.api.avAnalysisNotes(l, counts(sk(1, 2, 3))).join('')).join()), 'every language fills the counts');
  assert.equal(text(counts(sk(160, 0, 0))), '160 clips are being analysed. This updates automatically when they finish.');
  assert.equal(text(counts(sk(1, 0, 0))), '1 clip is being analysed. This updates automatically when it finishes.');
  assert.equal(text(counts(sk(0, 160, 0))), '160 clips are not analysed yet. Analyse them in Selects to use them here.');
  assert.equal(text(counts(sk(0, 1, 0))), '1 clip is not analysed yet. Analyse it in Selects to use it here.');
  assert.equal(text(counts(sk(0, 0, 2))), '2 clips could not be analysed.');
  assert.equal(text(counts(sk(0, 0, 1))), '1 clip could not be analysed.');
  assert.equal(text(counts(sk(0, 160, 0, false))), '160 clips are not analysed yet. If Selects is analysing them, this updates automatically.');
  assert.equal(text(counts(sk(0, 1, 0, false))), '1 clip is not analysed yet. If Selects is analysing it, this updates automatically.');
  assert.equal(text(counts(sk(3, 1, 2))), '3 clips are being analysed. This updates automatically when they finish. 1 clip is not analysed yet. Analyse it in Selects to use it here. 2 clips could not be analysed.');
  assert.equal(text(counts(sk(0, 0, 0))), '', 'nothing to say when every video is analysed');
  // An inventory without the split (older script) counts every unanalysed clip as unknown: the neutral wording.
  assert.equal(text(counts({ unanalysed: 4, missing: 0 })), '4 clips are not analysed yet. If Selects is analysing them, this updates automatically.');
  assert.equal(note(counts(sk(2, 1, 0))), ' · 2 clips being analysed · 1 clip not analysed yet');
  assert.equal(note(counts(sk(0, 0, 1))), ' · 1 clip could not be analysed');
  assert.equal(note(counts(sk(0, 0, 0))), '');
  // Every readiness branch uses the same sentences, and a status change refreshes the inventory signature.
  for (const phrase of ['const analysisText = avAnalysisText(L, invAnalysis);', '(analysisText || t(L, "noFootage"))', '[analysisText, t(L, "turnOnPhotos")].filter(Boolean).join(t(L, "gap"))', '...avAnalysisNotes(L, invAnalysis)]',
    '[sk.unanalysed, sk.analysing, sk.notAnalysed, sk.failed, sk.statusKnown]']) assert.ok(panel.includes(phrase), phrase);
  // Polling: only while clips are being analysed, while the status is unknown, or while the Project has no footage at all.
  const poll = (panel.match(/const needsPoll = ([^\n]*);/) || [])[1];
  assert.ok(poll, 'needsPoll');
  const needsPoll = (inventory, incompleteStalled = false) => { const invAnalysis = counts(inventory && inventory.skipped); return vm.runInNewContext(poll, { inventory, invAnalysis, incompleteStalled }); };
  const inv = (skipped, resources = 0, photos = 0) => ({ skipped, resources: Array.from({ length: resources }, (_, i) => ({ rid: 'r' + i })), photos: Array.from({ length: photos }, (_, i) => ({ rid: 'p' + i })) });
  assert.equal(needsPoll(inv(sk(2, 0, 0), 5)), true, 'clips being analysed poll');
  assert.equal(needsPoll(inv(sk(0, 160, 0))), false, 'never-started clips alone do not poll');
  assert.equal(needsPoll(inv(sk(0, 3, 2), 5)), false, 'not analysed and failed clips do not poll');
  assert.equal(needsPoll(inv(sk(0, 3, 0, false), 5)), true, 'an unknown status polls');
  assert.equal(needsPoll(inv(sk(0, 0, 0))), true, 'an empty Project polls');
  assert.equal(needsPoll(inv(sk(0, 0, 0), 0, 3)), false, 'photos only: no poll');
  assert.equal(needsPoll(inv(sk(0, 0, 0), 5)), false, 'all analysed: no poll');
  assert.equal(needsPoll(null), false);
  // A partial read (the Project still loading) polls until stalled, whatever the analysis status.
  assert.equal(needsPoll({ ...inv(sk(0, 160, 0)), incomplete: true }), true, 'an incomplete read polls');
  assert.equal(needsPoll({ ...inv(sk(0, 160, 0)), incomplete: true }, true), false, 'a stalled incomplete read with never-started clips stops');
}

// Hangul audit across the plugin.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => /\.(tsx|js|cjs|json|md|sh)$/.test(f))) assert.ok(!/[\uac00-\ud7a3]/.test(fs.readFileSync(f, 'utf8')), 'Korean text in ' + f);
assert.ok(!/\/Users\//.test(panel), 'no user paths');

// Canvas size only through AV_W / AV_H.
assert.ok(panel.includes('const AV_W = 1920, AV_H = 1080;'));
assert.equal((outside.match(/\b(1920|1080)\b/g) || []).length, 2, 'W/H are not hard-coded outside AV_W / AV_H');

// Constants (spec section 4 queries, defaults).
const q = panel.slice(panel.indexOf('const AV_QUERIES'), panel.indexOf('};', panel.indexOf('const AV_QUERIES')));
const QUERIES = {
  drink: 'a coffee, matcha or drink in a cup held in hand or on a table',
  street: 'a sunny city street with buildings and blue sky',
  food: 'a plate of food, dessert or pastry on a table, seen from above',
  park: 'green grass or trees in a park on a sunny day',
  book: 'an open book or magazine on a lap or table',
  transit: 'inside a subway or train, or a train passing by',
  flowers: 'flowers, a bouquet or a flower shop close up',
  cafe: 'a cozy cafe interior or a window seat with daylight',
};
assert.equal((q.match(/^  \w+: "/gm) || []).length, 8, 'eight queries (the motion query is added only with Beat punch)');
for (const [role, text] of Object.entries(QUERIES)) assert.ok(q.includes('  ' + role + ': "' + text + '",'), 'query ' + role);
for (const c of ['const AMBIENT_DB = -18;', 'const DEFAULT_CUE = "weekend-indie-pop";', 'const PREFERRED_CUE = "bedroom-pop-108";', 'const DEFAULT_PRESET = "small-glimpse";',
  'const DEFAULT_LENGTH = "standard";', 'const DEFAULT_PACE = "quick";', 'const DEFAULT_PUNCH = true;', 'const DEFAULT_HOOK = true;', 'const SOFT_STRENGTH = 0.35;', 'const MOTION_STRENGTH = 0.5;']) assert.ok(panel.includes(c), c);
for (const s of ['React.useState(DEFAULT_CUE)', 'React.useState(DEFAULT_PRESET)', 'React.useState<"short" | "standard" | "long">(DEFAULT_LENGTH)', 'React.useState<"quick" | "relaxed" | "groove">(DEFAULT_PACE)', 'const [beatPunch, setBeatPunch] = React.useState(DEFAULT_PUNCH)', 'const [hook, setHook] = React.useState(DEFAULT_HOOK)',
  'React.useState<"off" | "ambient" | "full">("ambient")', 'const [soft, setSoft] = React.useState(true)', 'const [usePhotos, setUsePhotos] = React.useState(true)']) assert.ok(panel.includes(s), s);
// The default title preset is A small glimpse; the other presets stay selectable.
assert.ok(presets.presets.some(p => p.id === 'small-glimpse' && p.label === 'A small glimpse'), 'default preset exists');
assert.deepEqual(presets.presets.map(p => p.id).sort(), ['day-in-my-life', 'archive-vlog', 'small-glimpse'], 'all three presets selectable');
// The preferred cue replaces the default once, when the manifest has it.
assert.ok(/cues\.some\(\(c: any\) => c\.id === PREFERRED_CUE\)/.test(panel) && panel.includes('(cur === DEFAULT_CUE ? PREFERRED_CUE : cur)'), 'bedroom-pop-108 becomes the default when present');

// UI order (spec section 8).
const order = ['title={t(L, "title")}', 'title={t(L, "music")}', 'title={t(L, "length")}', 'title={t(L, "advanced")}', 't(L, "createsDraft")'].map(s => ui.indexOf(s));
assert.ok(order.every(i => i > 0), 'all sections present');
assert.deepEqual(order.slice().sort((a, b) => a - b), order, 'Title, Music, Length, Advanced, Build');
for (const [k, v] of [['title', 'Title'], ['music', 'Music'], ['length', 'Length'], ['advanced', 'Advanced'], ['createsDraft', 'Creates a new 16:9 Draft'], ['pace', 'Pace'], ['beatPunch', 'Beat punch'],
  ['startAtHook', 'Start at the hook'], ['clipSound', 'Clip sound'], ['softLook', 'Soft look'], ['usePhotos', 'Use photos'], ['chooseClips', 'Choose clips']]) says(k, v);
for (const s of ['label={t(L, "length")}', 'label={t(L, "pace")}', 'value: "quick"', 'value: "relaxed"', '{ label: t(L, "pace.groove"), value: "groove" }', 'label={t(L, "beatPunch")}', 'label={t(L, "startAtHook")}',
  'label={t(L, "clipSound")}', 'label={t(L, "softLook")}', 'label={t(L, "usePhotos")}']) assert.ok(ui.includes(s), s);
for (const [k, v] of [['pace.quick', 'Quick'], ['pace.relaxed', 'Relaxed'], ['pace.groove', 'Groove'], ['length.short', 'Short'], ['length.standard', 'Standard'], ['length.long', 'Long'],
  ['sound.off', 'Off'], ['sound.ambient', 'Ambient'], ['sound.full', 'Full']]) says(k, v);
// The UI language: context.language on every render (before the early return), the Build-time language for Inspector
// labels, the kit runtime pasted unchanged, and no literal UI text left in JSX.
// The panel UI is MiniVlogPanel; Panel only hands a Clip highlights run to TemplateRun.
assert.ok(ui.includes('function MiniVlogPanel({ sdk, context, ui }: any) {\n  // The UI language, read on every render: Selects can switch languages while the panel is open.\n  const L = uiLang(context);'), 'L first in the component');
assert.ok(ui.includes('const langRef = React.useRef(L);\n  langRef.current = L;') && ui.includes('const bl = langRef.current;'), 'Build-time language');
{
  // Compared with the kit copy when it is available (SELECTS_APP_KIT, else ~/Workspaces/selects-app-kit); CI checks the markers only.
  const kit = path.join(process.env.SELECTS_APP_KIT || path.join(require('node:os').homedir(), 'Workspaces', 'selects-app-kit'), 'tools', 'i18n', 'i18n-runtime.ts');
  const marker = '// i18n runtime for style-app panels (selects-app-kit tools/i18n/i18n-runtime.ts). Paste it below the STRINGS block.';
  assert.ok(panel.includes(marker) && panel.indexOf(marker) > panel.indexOf('// STRINGS:END'), 'kit runtime below the STRINGS block');
  for (const s of ['function uiLang(context?: { language?: string | null } | null): Lang {', 'function t(lang: Lang, key: string, vars: Vars = {}): string {', 'function tOr(lang: Lang, key: string, fallback: string, vars: Vars = {}): string {', 'function fieldLen(text: string): number {']) assert.ok(panel.includes(s), s);
  if (fs.existsSync(kit)) assert.ok(panel.includes(fs.readFileSync(kit, 'utf8').trimEnd()), 'runtime identical to the kit copy');
}
assert.ok(!/>[ \t]*[A-Z][a-z]+(?: [a-z]+)*[.…]?[ \t]*</.test(ui), 'no literal English text between JSX tags');
assert.ok(!/(?:label|title|aria-label|busyLabel)="[A-Z]/.test(ui), 'no literal English UI props');
// Korean breaks between words; other languages keep their own line breaking (keep-all would stop ja/zh wrapping).
assert.ok(ui.includes('<div style={{ wordBreak: L === "ko" ? "keep-all" : undefined }}>'), 'keep-all for Korean');

// Title: three preset tiles, per-preset fields with max lengths, @year resolved, live preview from the shared layout code.
for (const s of ['aria-pressed', 'fieldsBy', 'fieldClip(String(value), fl.max)', '"@year"',
  'avLockupLayout(', 'avSparklePath(', 'avStarPath(', 'height: PREVIEW_HEIGHT', 'fontKerning: "none"', 'fontVariantLigatures: "none"', 'FontFace', 't(L, "previewUnavailable")']) assert.ok(ui.includes(s), s);
says('previewUnavailable', 'Preview unavailable');
// Preset tiles and field labels by id, the presets.json English label as the fallback; the field counter and the limit
// count Hangul (and other wide characters) as 2.
assert.ok(ui.includes('{tOr(L, "preset." + p.id, p.label)}') && ui.includes('tOr(L, "field." + preset + "." + fl.key, fl.label)'), 'preset and field labels by id');
for (const p of presets.presets) {
  assert.equal(en['preset.' + p.id], p.label, 'preset.' + p.id);
  for (const f of p.fields) assert.equal(en['field.' + p.id + '.' + f.key], f.label, 'field.' + p.id + '.' + f.key);
}
assert.ok(ui.includes('used: fieldLen(fieldText(preset, fl)), max: fl.max'), 'counter in fieldLen units');
{
  const fl = /function fieldLen\(text: string\): number \{[^]*?\n\}/.exec(panel)[0].replace(': number', '').replace('text: string', 'text');
  const fc = /function fieldClip\(text: string, max: number\) \{[^]*?\n\}/.exec(panel)[0].replace(/: (string|number)/g, '');
  const re = /const WIDE_RE = [^\n]*;/.exec(panel)[0];
  const F = new Function(re + '\n' + fl + '\n' + fc + '\nreturn { fieldLen, fieldClip };')();
  const ga = '\uac00', na = '\ub098';
  assert.equal(F.fieldLen('mini'), 4); assert.equal(F.fieldLen(ga + na), 4); assert.equal(F.fieldLen('a' + ga), 3);
  assert.equal(F.fieldClip('glimpse of today', 12), 'glimpse of t'); assert.equal(F.fieldClip(ga.repeat(7), 12), ga.repeat(6)); assert.equal(F.fieldClip('ab' + ga + na, 5), 'ab' + ga);
}
// @year is the current year when the field shows (an edit in fieldsBy wins); recording dates never drive it.
assert.ok(ui.includes('function avCurrentYear() { return String(new Date().getFullYear()); }'), 'avCurrentYear');
assert.ok(ui.includes('const v = fieldsBy[presetId]?.[fl.key] ?? fl.initial ?? "";\n    return v === "@year" ? avCurrentYear() : v;'), '@year -> avCurrentYear() after the user edit');
assert.ok(!/latestYear|recordedAt|yearOf\(/.test(ui), 'no recording-date year in the panel');
{
  const fn = /^function avCurrentYear\(\) \{[^\n]*\}$/m.exec(ui);
  assert.equal(new Function(fn[0] + '\nreturn avCurrentYear();')(), String(new Date().getFullYear()), 'current year');
}
assert.ok(!/states\b/.test(ui), 'no CWV font states');
assert.ok(!/new Function|\beval\(/.test(ui), 'no runtime evaluation in the panel');
assert.ok(ui.includes('} catch { return null; }') && ui.includes('{assets && previewItems ? ('), 'a layout error falls back to "Preview unavailable"');
// The lockup block evaluates as plain JS, as the panel does it.
const lb = lockupTsx.slice(lockupTsx.indexOf('// av-lockup:start'), lockupTsx.indexOf('// av-lockup:end'));
const lockup = new Function(lb + '\nreturn { avLockupLayout: avLockupLayout, avSparklePath: avSparklePath, avStarPath: avStarPath };')();
const mini = presets.presets.find(p => p.id === 'archive-vlog');
const items = lockup.avLockupLayout({ preset: 'archive-vlog', fields: { big: 'mini', small: 'vlog' }, fonts: mini.fonts.map(f => ({ ...f, metrics: presets.metrics[f.family] })) }, 1920, 1080);
assert.ok(items.length >= 3 && items.some(i => i.part === 'small'), 'block runs stand-alone');
// Every preset field has a max; @year is the only token.
for (const p of presets.presets) for (const f of p.fields) assert.ok(f.max > 0, p.id + '.' + f.key);

// Music: reference cues first, then alternatives under a small label; own music and No music; section hidden for No music.
for (const s of ['group !== "alternative"', 'group === "alternative"', '>{t(L, "alternatives")}<', 'trackRow("own", t(L, "ownMusic"), "")', 'trackRow("none", t(L, "noMusic"), "")', 'role="radiogroup"', 'musicKind !== "none" ?']) assert.ok(ui.includes(s), s);
for (const [k, v] of [['alternatives', 'Alternatives'], ['ownMusic', 'Your own music'], ['noMusic', 'No music'], ['track', 'Track']]) says(k, v);

// Length, pace and capacity (spec 14.1 / 14.2).
for (const s of ['avGridUsable({ bpm: grid.bpm, accepted: grid.accepted })', 'avBeatsPerShot(pace, tempo)', 'avShotSeconds(', 'avFitShots(']) assert.ok(ui.includes(s), s);
says('fitPartial', ' shots fit this track ('); says('quickTwoBeats', 'Quick uses 2 beats'); says('relaxedOneBeat', 'Relaxed uses 1 beat'); says('noMusicTiming', 'approximate timing');
says('outsideTempoTiming', 'Tempo outside 70\u2013160 bpm ('); says('noBeatTiming', 'No steady beat');
// The failure reasons stay English in AV_FAIL (dev/driveAdapter.mjs reads it); the panel says STRINGS fail.<reason>.
assert.ok(ui.includes('"one-resource": "Add at least 2 clips or photos"') && ui.includes('"too-few": "Your footage fits fewer than 4 shots"')
  && ui.includes('"music-too-short": "This track is too short for 4 shots from this section"'), 'fail reason messages');
for (const r of ['one-resource', 'too-few', 'music-too-short']) assert.ok(en['fail.' + r].startsWith(/"[^"]+": "([^"]+)"/.exec(ui.slice(ui.indexOf('"' + r + '": "')))[1]), 'fail.' + r + ' matches AV_FAIL');
assert.ok(ui.includes('AV_FAIL[plan.reason] ? t(l, "fail." + plan.reason) : t(l, "noPlan")'), 'reasons through STRINGS');
assert.equal((ui.match(/avPlanBuild\(/g) || []).length, 3, 'the build plan, the readiness plan and the template run');
assert.equal((ui.match(/avPlanBuild\(\{ candidates: [^;]*, bpm: grid\.bpm, accepted: grid\.accepted, approxBpm: grid\.approxBpm, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid\.usableEnd, \.\.\.snapCuts, seed: String\(/g) || []).length, 3, 'every plan gets the same inputs');
assert.ok(ui.includes('const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };'));
// Own music with an approximate grid (beat-detect grid 'approximate'): fixed timing on its tempo and first beat, bpm stays
// null (no grid features); the pace note and the line under the file say so. The detection result is shown under the
// file, not in the status line at the bottom.
for (const s of ['const ownApprox = musicKind === "own" && ownGrid && !ownGrid.accepted && ownGrid.grid === "approximate" && ownGrid.bpm > 0;',
  'approxBpm: ownApprox ? ownGrid.bpm : null, firstBeat: ownApprox ? ownGrid.firstBeat : 0',
  'const approxTempo = avApproxTempo({ gridded, approxBpm: grid.approxBpm });', 'const tempo = gridded ? grid.bpm : approxTempo;',
  'avShotSeconds({ bpm: grid.bpm, beatsPerShot: guard.beats, pace, gridded, approxBpm: approxTempo })',
  'avSnapSection({ value, firstBeat: grid.firstBeat, bpm: tempo, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: !!tempo })',
  't(L, "faintTempoTiming", { bpm: Math.round(approxTempo), timing })', 't(L, "faintTempo", { bpm: Math.round(approxTempo) })',
  't(L, "beatFound", { bpm: Math.round(grid.bpm) })', ': t(L, "noBeat");',
  '{ownBeatLine ? <ui.Message tone="muted">{ownBeatLine}</ui.Message> : null}', 'bpm: gridded ? grid.bpm : null, usePhotos']) assert.ok(ui.includes(s), s);
assert.ok(ui.indexOf('{ownBeatLine ?') > ui.indexOf('<ui.FileDrop accept={["audio"]}') && ui.indexOf('{ownBeatLine ?') < ui.indexOf('<ui.Section title={t(L, "length")}>'), 'the beat line sits under the file drop');
assert.ok(!ui.includes('its beat could not be found reliably'), 'no detection result in the bottom status line');
// An approximate tempo outside 70-160 bpm: both the line under the file and the pace note say the tempo is out of range.
says('faintTempoTiming', 'Tempo found ({bpm} bpm) but the beat is faint: cuts follow a {bpm} bpm grid approximately ({timing}).');
says('faintTempo', 'Tempo found ({bpm} bpm) but the beat is faint, so cuts follow a {bpm} bpm grid approximately.');
says('beatFound', 'Beat found: {bpm} bpm. Cuts follow the beat.'); says('noBeat', 'No steady beat found, so cuts use approximate timing.');
assert.ok(ui.includes('const outsideBpm: number | null = grid.accepted ? grid.bpm : ownApprox ? ownGrid.bpm : null;')
  && ui.includes(': outsideBpm ? t(L, "outsideTempoTiming", { bpm: Math.round(outsideBpm), timing })') && ui.includes(': outsideBpm ? t(L, "outsideTempo", { bpm: Math.round(outsideBpm) })'), 'out-of-range messages agree');
says('outsideTempo', 'Its tempo ({bpm} bpm) is outside 70\u2013160 bpm');
// Use photos off drops the photo candidates before planning.
assert.ok(ui.includes('if (!usePhotos || !inventory) return [];'), 'photos off -> no photo candidates');
assert.equal((ui.match(/photoCandsOf\(inventory, onlyPhotos, usePhotos\)/g) || []).length, 2);
// Build is disabled with the reason.
assert.ok(ui.includes('disabled={busy || !canBuild}') && ui.includes('AV_FAIL[plan.reason]') && ui.includes('const blockReason = blockFor(readyPlan);'), 'disabled Build with the planner reason');

// Groove (spec 15.1): capacity, lines and the pace note follow the planner's beat spans, not shots x shotSeconds.
for (const s of ['const grooved = pace === "groove" && (tempo ? !!guard.groove : true);', 'const opener = guard.groove ? guard.opener : 2;',
  'avGrooveFit({ requested, sectionStart: tempo ? grid.firstBeat : 0, usableEnd: grid.usableEnd, beatSeconds: shotSeconds, opener })',
  'const fitted = grooved ? grooveFit.shots : avFitShots(', 'const wanted = grooved ? avGrooveSpan(requested, opener).shots : requested;',
  'const fittedSeconds = grooved ? grooveFit.beats * shotSeconds : fitted * shotSeconds;', 'const wantedSeconds = grooved ? grooveFit.requestedBeats * shotSeconds : requested * shotSeconds;',
  'const videoSeconds = fitted ? fittedSeconds : wantedSeconds;', 'const planSeconds = (p: any) => (p.groove ? p.groove.beats * shotSeconds : p.shots * shotSeconds);',
  'const planShort = (p: any) => (grooved ? !!p.groove && p.groove.beats < grooveFit.beats : p.shots < fitted);',
  't(L, "grooveOneBeat", { bpm: Math.round(tempo) })', 't(L, "grooveTwoBeats", { bpm: Math.round(tempo) })']) assert.ok(ui.includes(s), s);
says('grooveOneBeat', 'Groove opens phrases with 1 beat'); says('grooveTwoBeats', 'Groove uses 2 beats per shot');
assert.ok(!/fitted \* shotSeconds\)\.toFixed|requested \* shotSeconds\)\.toFixed|readyPlan\.shots \* shotSeconds|plannedShots \* shotSeconds/.test(ui), 'no shots x shotSeconds lines left');
assert.ok(ui.includes('const shortened = planShort(plan) ?') && ui.includes('readyPlan && readyPlan.ok && planShort(readyPlan)'), 'footage shortfall compares Groove beat spans');
// Start at the hook (spec 15.3): the default section is the hook window when the toggle is on and the cue has scores.
assert.ok(ui.includes('hookBars: cue.hookBars || null') && ui.includes('const hookSection = () => (hook && gridded && musicKind === "cue" ? avHookSection({ hookBars: grid.hookBars, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, barPhaseBeats: cue?.barPhaseBeats }) : null);'), 'hook section from the manifest');
assert.ok(/const hookAt = hookSection\(\);\s*setSection\(hookAt \?\? avDefaultSection\(/.test(ui), 'falls back to the energy default');
// With the hook on, a new length or pace moves the section to that length's hook window (else it only re-clamps).
assert.ok(ui.includes('React.useEffect(() => { const hookAt = hookSection(); setSection((s) => hookAt ?? snap(s ?? 0)); }, [length, pace]);'), 'hook re-picked on length / pace');
// No grid: the pace note states Groove's 0.55 s beat and its shot lengths.
assert.ok(ui.includes('const timing = grooved ? t(L, "grooveTiming", { beat: hundredths(shotSeconds), hold: hundredths(2 * shotSeconds), eighth: Math.round(shotSeconds / 2 * 1000) / 1000 })')
  && ['noMusicTiming', 'outsideTempoTiming', 'noBeatTiming'].every(k => en[k].includes('approximate timing ({timing}).')), 'no-grid timing note');
says('grooveTiming', 'Groove on a {beat} s beat: {hold}, {beat} and {eighth} s shots');
assert.ok(ui.includes('}, [assets, cueId, ownMusic?.path, ownGrid, hook]);'), 'toggling the hook re-picks the default section');
// Motion query and bonus only with Beat punch (off: the v1.2 search and plan); the search cache is keyed on it.
assert.ok(ui.includes('candidates: (frozen.punch ? avMotionBonus(found.list) : found.list).concat(photoCands)') && ui.includes('const scored = beatPunch ? avMotionBonus(list) : list;'), 'motion bonus before planning, with Beat punch only');
assert.ok(ui.includes('findCandidates(todo, pid, check, avSearchQueries(AV_QUERIES, frozen.punch))') && ui.includes('queries, pageSize: 4 }'), 'motion query with Beat punch only');
assert.ok(ui.includes('const key = pid + "|" + JSON.stringify(only) + (frozen.punch ? "|motion" : "");') && ui.includes('const candKey = projectId + "|" + JSON.stringify(only) + (beatPunch ? "|motion" : "");'), 'search cache keyed on the query set');
// The helpers are plain JS (the driver evaluates them).
assert.ok(!/:\s*(any|number|string)\b|\bas any\b/.test(hookBlock), 'hook block is plain JS');
const H = new Function(planner + '\n' + hookBlock + '\nreturn { avMotionBonus, avPunchFrames, avSchedule, avSearchQueries, avFillers, AV_MOTION_ROLE, AV_MOTION_QUERY, AV_MOTION_BONUS, AV_MOTION_REACH };')();
assert.equal(H.AV_MOTION_ROLE, 'motion'); assert.equal(H.AV_MOTION_BONUS, 0.1); assert.equal(H.AV_MOTION_REACH, 0.75);
assert.equal(H.AV_MOTION_QUERY, 'hands moving, pouring, walking or the camera moving');
assert.deepEqual(H.avSearchQueries(QUERIES, false), QUERIES);
assert.deepEqual(H.avSearchQueries(QUERIES, true), { ...QUERIES, motion: 'hands moving, pouring, walking or the camera moving' });
{
  const role = [{ rid: 'a', role: 'drink', t: 2.5, score: 0.3, sourceDuration: 9 }, { rid: 'b', role: 'park', t: 5.7, score: 0.3, sourceDuration: 9 },
    { rid: 'b', role: 'park', t: 6, score: 0.3, sourceDuration: 9 }, { rid: 'a', role: 'food', t: 5, score: 0.2, sourceDuration: 9 }];
  const motion = [{ rid: 'a', role: 'motion', t: 2, score: 0.4 }, { rid: 'b', role: 'motion', t: 5, score: 0.2 }, { rid: 'b', role: 'motion', t: 5.5, score: 0.3 }];
  // No motion hits, or all equally strong: the candidates are unchanged, and motion rows never reach the planner.
  assert.deepEqual(H.avMotionBonus(role), role);
  assert.deepEqual(H.avMotionBonus(role.concat([{ rid: 'a', role: 'motion', t: 2, score: 0.4 }, { rid: 'b', role: 'motion', t: 6, score: 0.4 }])), role);
  const out = H.avMotionBonus(motion.concat(role));
  assert.equal(out.length, 4); assert.ok(out.every(c => c.role !== 'motion'));
  // Min-max normalised (0.2 -> 0, 0.3 -> 0.5, 0.4 -> 1), x 0.1: a's hit 0.5 s away +0.1; b's best hit within 0.75 s is
  // the 0.3 one (+0.05) for both b candidates; a hit on another clip gives nothing.
  assert.deepEqual(out.map(c => Math.round(c.score * 1000) / 1000), [0.4, 0.35, 0.35, 0.2]);
  assert.equal(role[0].score, 0.3, 'input not mutated');
  // Candidates with a bonus carry their normalised motion (the planner's first-shot rule); the others stay untouched.
  assert.deepEqual(out.map(c => (c.motion === undefined ? c.motion : Math.round(c.motion * 1000) / 1000)), [1, 0.5, 0.5, undefined]);
  assert.ok(!('motion' in out[3]));
  assert.deepEqual(out[3], role[3]);
  // A tie-break: the largest bonus stays below the allocator's role step (0.15) minus its jitter (0.05).
  // (jitter is in [0, 0.05), so 0.1 + jitter < 0.15 never overtakes a better role.)
  assert.ok(H.AV_MOTION_BONUS <= 0.15 - 0.05 + 1e-9);
  // A clip with motion hits only keeps a stub (no time or score), so the planner still makes its filler windows.
  const only = H.avMotionBonus(role.concat([{ rid: 'c', role: 'motion', t: 1, score: 0.9, sourceDuration: 6 }, { rid: 'c', role: 'motion', t: 3, score: 0.1, sourceDuration: 6 }]));
  assert.deepEqual(only.filter(c => c.rid === 'c'), [{ rid: 'c', role: 'motion', sourceDuration: 6 }]);
  assert.ok(H.avFillers(only).some(f => f.rid === 'c'), 'fillers for a motion-only clip');
}
{
  // Punch frames: bar downbeats from the section start at the real fps with the music offset, the same frames as the
  // Quick grid's slot starts on beats 0, 4, 8 ...; none without a grid.
  const F = 30000 / 1001, q = H.avSchedule({ bpm: 108, fps: F, shots: 24, beatsPerShot: 1, sectionStart: 4.472 });
  const pf = H.avPunchFrames({ bpm: 108, fps: F, sectionStart: 4.472, videoEnd: q.totalFrames });
  assert.deepEqual(pf, q.slots.filter(x => x.startBeat % 4 === 0).map(x => x.startFrame));
  assert.equal(pf.length, 6); assert.equal(pf[0], 0);
  assert.deepEqual(H.avPunchFrames({ bpm: 108, fps: 25, sectionStart: 0, videoEnd: 100 }), [0, 56]);
  for (const bpm of [null, 0, undefined]) assert.deepEqual(H.avPunchFrames({ bpm, fps: 25, sectionStart: null, videoEnd: 100 }), []);
}
// Beat punch cfg (punch-report contract), from the frozen Build inputs at the Draft's real fps.
for (const s of ['const PUNCH_STRENGTH = 1;', 'const PUNCH_PUSH = 1;']) assert.ok(panel.includes(s), s);

// Orchestration: frozen inputs, project guard after every await, Draft id kept, recovery by name, one assemble call.
const build = ui.slice(ui.indexOf('async function build('), ui.indexOf('function buildAnother('));
const decorate = ui.slice(ui.indexOf('async function decorate('), ui.indexOf('// Clip selection'));
const finish = ui.slice(ui.indexOf('async function finishTitle('), ui.indexOf('async function decorate('));
assert.ok(build.includes('const frozen = Object.freeze({'), 'inputs frozen at Build');
for (const body of [build, decorate]) {
  const lines = body.split('\n');
  lines.forEach((l, i) => {
    if (!/\bawait\b/.test(l) || /await decorate\(/.test(l)) return;
    const next = lines.slice(i, i + 5).join('\n');
    assert.ok(/check\(\)|findCandidates\(|throw e|\/\/ no project write/.test(next), 'project check after: ' + l.trim());
  });
}
assert.equal((ui.match(/run\("Assemble Archive Vlog"/g) || []).length, 1, 'assemble is called once and never resent');
assert.ok(build.includes('findDraftByName(pid, frozen.draftName)'), 'lost assemble reply -> look the Draft up by name');
assert.ok(ui.includes('(await p.meta()).draftIds') && ui.includes('m.name !== name'), 'lookup reads the Drafts by name');
assert.ok(ui.includes('.slice(-" + DRAFT_LOOKUP_MAX + ").reverse()') && panel.includes('const DRAFT_LOOKUP_MAX = 50;'), 'lookup reads at most the 50 most recent Drafts, newest first');
assert.ok(/if \(m\.name !== name\) continue;[^]*?return \{ sequenceId: id/.test(ui), 'first match returns');
// The readiness gate uses the seed each button builds with: Build = seed, Try other shots = seed + 1.
assert.ok(ui.includes('planAt(seed)') && ui.includes('planAt(seed + 1)'), 'gates for both seeds');
assert.ok(ui.includes('onClick={buildAnother} disabled={busy || !canBuildAnother}'), 'another version gated with seed + 1');
assert.ok(build.includes('draftName: "Archive Vlog " + chosen.label + " " + stamp(new Date()),'), 'Draft name (English: the lost-reply lookup finds it by name)');
assert.ok(finish.includes('decorate(result, check)') && decorate.includes('const f = res.frozen;'), 'Finish title and look reuses the frozen inputs');
says('draftNotFinished', 'title, look and clip sound are not applied yet'); says('finishFailed', 'Press Finish title and look to try again');
assert.match(panel, /No valid session ID/);
assert.ok(ui.includes('!allowCommit && /No valid session ID/'), 'only non-committing calls are resent');
// A busy app: read-only calls ask for a longer deadline and retry host-busy / deadline failures after 5 s and 15 s,
// one attempt at a time and only while the caller still wants the answer; commit calls never do either.
assert.ok(panel.includes('const READ_TIMEOUT_SECONDS = 90;') && panel.includes('const BUSY_BACKOFF_MS = [5000, 15000];'), 'busy constants');
assert.ok(/const isBusyError = \(text: string\) => \/deadline\|did not finish\|hostWaitMs\|before the script started\/i\.test/.test(panel), 'busy detection');
const runBody = ui.slice(ui.indexOf('const run = async ('), ui.indexOf('const fontB64 ='));
assert.ok(runBody.includes('allowCommit ? { summary, script: scriptAt(0), allowCommit } : { summary, script: scriptAt(attempt), allowCommit, timeoutSeconds: READ_TIMEOUT_SECONDS }'), 'longer deadline for reads only');
assert.ok(runBody.includes('!allowCommit && isBusyError(') && runBody.includes('attempt < BUSY_BACKOFF_MS.length') && runBody.includes('opts.wanted && !opts.wanted()'), 'reads retry with backoff while wanted');
assert.ok(runBody.includes('await new Promise((d) => setTimeout(d, BUSY_BACKOFF_MS[attempt - 1]))'), 'sequential backoff, no parallel retries');
assert.ok(runBody.includes('throw new BusyError('), 'a final busy failure is a BusyError');
says('busy', "Selects is busy and didn't answer in time. Wait a moment and press Refresh. If it keeps happening, restart Selects.");
assert.ok(ui.includes('this.say = (l) => t(l, "busy");'), 'BusyError says it in the UI language');
// Inventory under load: the photo-size budget is small, and a retry skips measuring (assemble measures unsized photos).
assert.ok(ui.includes('measureMs: attempt === 0 ? INVENTORY_MEASURE_MS : 0') && panel.includes('const INVENTORY_MEASURE_MS = 4000;'), 'inventory measures less under load');
assert.ok(ui.includes('setInvError(e instanceof BusyError ? { busy: true, say: e.say } : { say: (l: Lang) => sayError(l, e) })'), 'busy inventory error message');
assert.ok(ui.includes('wanted: live'), 'inventory retries stop for a stale Project');
// A Project still loading after an app restart: the first inventory read that fails (not busy) is tried once more
// after 2 s, only from the mount effect (Refresh, focus and polling never auto-retry), and only while still wanted.
assert.ok(panel.includes('const INVENTORY_RETRY_MS = 2000;'), 'retry delay');
const mountFx = ui.slice(ui.indexOf('setStep("checkingClips");'), ui.indexOf('t(l, "startFailed"'));
assert.ok(/if \(await loadInventory\(projectId, \(\) => alive\) === "failed" && alive\) \{\s*await new Promise\(\(d\) => setTimeout\(d, INVENTORY_RETRY_MS\)\);\s*if \(alive && projectRef\.current === projectId\) \{ setInvError\(null\); await loadInventory\(projectId, \(\) => alive\); \}\s*\}/.test(mountFx), 'one retry after a failed first read');
assert.equal((mountFx.match(/loadInventory\(/g) || []).length, 2, 'exactly one retry');
assert.equal((ui.match(/INVENTORY_RETRY_MS/g) || []).length, 1, 'the retry is used only by the mount effect');
const loadInv = ui.slice(ui.indexOf('async function loadInventory('), ui.indexOf('React.useEffect(() => { mountedRef.current = true;'));
assert.ok(loadInv.includes('return e instanceof BusyError ? "busy" : "failed";') && loadInv.includes('return "ok";'), 'a busy failure is not retried again');
assert.ok(!/setTimeout/.test(loadInv), 'loadInventory itself never waits (Refresh / focus / poll do not auto-retry)');
// A non-busy failure reads as transient; the raw error stays in a details line and the console.
says('invFailed', "Couldn't read this Project's clips yet. Press Refresh."); assert.ok(ui.includes('(invError.busy ? invError.say(L) : t(L, "invFailed"))'), 'transient failure message');
assert.ok(ui.includes('{!inventory && invError && !invError.busy ? <ui.Message tone="muted">{t(L, "details", { detail: invError.say(L) })}</ui.Message> : null}') && loadInv.includes('console.warn('), 'raw error kept');
assert.ok(!ui.includes('Could not read the clips in this Project'), 'old message gone');
// A partial inventory (the Project was still loading) keeps polling and never reads as an empty Project.
assert.ok(/needsPoll = !!inventory && \(\(!!inventory\.incomplete && !incompleteStalled\) \|\|/.test(ui), 'incomplete inventory polls until stalled');
// Build and Try other shots wait for the clip sizes: an incomplete inventory blocks both with a muted hint
// next to Build (blockReason), and build() refuses it; a later complete read clears the block.
says('sizesLoading', 'Clip sizes are still loading\u2026');
assert.ok(/const baseBlock: Say \| null = !inventory \|\| !assets \? null\s*: inventory\.incomplete \? \(l\) => t\(l, "sizesLoading"\)\s*:/.test(ui), 'incomplete blocks both buttons first');
assert.ok(ui.includes('const canBuild = ready && !blockReason;') && ui.includes('const canBuildAnother = ready && !anotherBlock;') && ui.includes('{blockReason && !busy ? <ui.Message tone="muted">{blockReason(L)}</ui.Message> : null}'), 'the block disables Build / another version and shows the hint');
assert.ok(build.includes('!inventory || inventory.incomplete ||'), 'build() refuses an incomplete inventory');
// Incomplete polling is capped: INCOMPLETE_POLL_MAX (6) consecutive incomplete reads stop it with a Refresh hint;
// a complete read, a Project switch or Refresh restart the count.
assert.ok(panel.includes('const INCOMPLETE_POLL_MAX = 6;'), 'cap constant'); says('invPartial', "Couldn't read all clips yet. Press Refresh.");
assert.ok(loadInv.includes('if (inv.incomplete) { incompleteReadsRef.current++; if (incompleteReadsRef.current >= INCOMPLETE_POLL_MAX) setIncompleteStalled(true); }')
  && loadInv.includes('else { incompleteReadsRef.current = 0; setIncompleteStalled(false); }'), 'consecutive count, reset by a complete read');
assert.ok(ui.includes('const refreshInventory = () => { incompleteReadsRef.current = 0; setIncompleteStalled(false); loadInventory(); };'), 'Refresh restarts the cycle');
assert.ok(ui.includes('photoSizesRef.current = {}; incompleteReadsRef.current = 0; setIncompleteStalled(false);'), 'Project switch resets the cycle');
assert.ok(ui.includes(': inventory.incomplete && incompleteStalled ? t(L, "invPartial")'), 'stalled readiness message');
assert.ok(ui.indexOf('inventory.incomplete ? t(L, "stillReading")') > 0 && ui.indexOf('inventory.incomplete ? t(L, "stillReading")') < ui.indexOf('t(L, "noFootage")'), 'incomplete before "no footage"');
says('stillReading', "Still reading this Project's clips"); says('noFootage', 'No analysed video or photos in this Project yet');
assert.ok(/run\("Search shots"[^\n]*\{ wanted: \(\) => projectRef\.current === pid \}\)/.test(ui), 'search retries stop for a stale Project');
// Refresh stays available after a failure; a later successful read clears the error (Build is gated only by the inventory).
assert.ok(ui.includes('disabled={busy || !assets} onClick={refreshInventory}>{t(L, "refresh")}<') && ui.includes('setInventory(inv); setInvError(null);'), 'Refresh stays enabled; success clears the error');
for (const s of ['run("Assemble Archive Vlog"', 'run("Add title and look"', 'run("Add music to the project"']) assert.ok(new RegExp(s.replace(/[()]/g, '\\$&') + '[^;]*, true\\);').test(ui), s + ' is a commit call');
// decorate cfg (scripts lane contract).
assert.ok(decorate.includes('fill(assets.scripts.decorateJs, { sequenceId: res.sequenceId, mute: f.clipSound === "off", videoEnd: res.videoEnd, title: { tsx: assets.titleTsx, parameters, editableParameters }, '
  + 'soft: f.soft ? { tsx: assets.softTsx, strength: SOFT_STRENGTH } : null, photos: photoRids, motion: { tsx: assets.motionTsx, strength: MOTION_STRENGTH, options: motionOptions, byRid }, photoEffects: true, punch, labels })'), 'decorate cfg');
// Inspector labels in the Build-time language (bl): title parameters, motion options and the effects' labels (decorate.js
// cfg.labels). The effect and graphic names stay English in decorate.js.
assert.ok(decorate.includes('const motionOptions = MOTION_OPTIONS.map((o) => ({ label: tOr(bl, "motion." + o.value, o.label), value: o.value }));'), 'motion options by value');
assert.ok(decorate.includes('const labels = { motion: t(bl, "param.motion"), motionStrength: t(bl, "param.motionStrength"), punch: t(bl, "param.punch"), softness: t(bl, "param.softness") };'), 'effect labels');
for (const [k, v] of [['param.mainColor', 'Main color'], ['param.secondColor', 'Second color'], ['param.shadow', 'Shadow'], ['param.size', 'Size (%)'], ['param.x', 'Horizontal position (%)'],
  ['param.y', 'Vertical position (%)'], ['param.sparkles', 'Sparkles'], ['param.stars', 'Stars'], ['param.motion', 'Motion'], ['param.motionStrength', 'Motion strength'], ['param.punch', 'Punch'], ['param.softness', 'Softness']]) says(k, v);
assert.ok(decorate.includes('label: tOr(bl, "field." + p.id + "." + fl.key, fl.label)'), 'field labels in the Build-time language');
family('motion', { 'push-in': 'Push in', 'pull-out': 'Pull out', 'drift-left': 'Drift left', 'drift-right': 'Drift right', 'drift-up': 'Drift up', 'drift-down': 'Drift down', tilt: 'Tilt', 'push-drift': 'Push and drift' });
for (const o of /const MOTION_OPTIONS = (\[[^]*?\]);/.exec(panel)[1].match(/\{ label: "[^"]+", value: "[^"]+" \}/g)) { const m = /label: "([^"]+)", value: "([^"]+)"/.exec(o); assert.equal(en['motion.' + m[2]], m[1], 'motion.' + m[2] + ' matches MOTION_OPTIONS'); }
assert.ok(decorate.includes('const punch = f.punch ? { tsx: assets.punchTsx, strength: PUNCH_STRENGTH, push: PUNCH_PUSH, beatFrames: f.bpm ? 60 / f.bpm * res.fps : 0,')
  && decorate.includes('punchFrames: avPunchFrames({ bpm: f.bpm, fps: res.fps, sectionStart: f.sectionStart, videoEnd: res.videoEnd }), picks: res.plan.picks } : null;'), 'Beat punch cfg at the real fps, off -> null');
assert.ok(build.includes('sectionStart: musicStart, pace, length, requested, clipSound, soft, punch: beatPunch, hook: hook && musicKind === "cue", bpm: gridded ? grid.bpm : null, usePhotos, only, onlyPhotos,'), 'punch, hook (bundled tracks only) and the grid tempo are frozen');
assert.ok(decorate.includes('seed: f.seed, clipSound: f.clipSound, punch: f.punch, hook: f.hook, groove: res.plan.groove || null, picks: res.plan.picks } };'), 'A/B provenance');
assert.ok(!/titleEnd|warm/i.test(ui), 'no titleEnd / warm');
assert.ok(!/titleSlots|montageShots|burst|line1|connector/.test(ui), 'no CWV title burst or lines');
assert.ok(decorate.includes('avPhotoMotions(res.plan.picks, String(f.seed), sizes)'), 'photo motions without titleSlots');
assert.ok(decorate.includes('Math.max(AV_W / sz.width, AV_H / sz.height) / Math.min(AV_W / sz.width, AV_H / sz.height)'), '16:9 cover scale');
// Title parameters: flat keys, fonts with metrics (only the preset's), editable Adjust items.
for (const s of ['presets.metrics[x.family]', '...flat', 'fields: { ...flat }', 'type: "boolean"', 'key: "sparkles"', 'key: "primary"', 'key: "secondary"', 'key: "shadow"', 'key: "size"', 'key: "x"', 'key: "y"']) assert.ok(ui.includes(s), s);
for (const m of ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift']) assert.ok(panel.includes('value: "' + m + '"'), 'motion option ' + m);
assert.ok(ui.includes('clipSound: frozen.clipSound, ambientDb: AMBIENT_DB'), 'assemble gets the clip sound mode and level');
assert.ok(ui.includes('const boundaries: number[] = plan.schedule.cuts;') && ui.includes('picks: plan.picks, boundaries, crops,'), 'assemble gets the planned cuts');
assert.ok(build.includes('videoEnd: a.totalFrames'), 'the title ends at the last clip end');

// Inventory refresh: poll while pending, focus / visibility, Refresh button; project switch drops the cache.
says('analysing', 'This updates automatically when they finish.'); says('notAnalysedAnalyse', 'Analyse them in Selects to use them here.'); says('noFootage', 'this updates automatically'); says('refresh', 'Refresh');
for (const s of ['loadInventory(', 'visibilitychange', 'addEventListener("focus"', '10000', 'setCandidates(null)', 'invSigRef', 'projectRef']) assert.ok(ui.includes(s), s);
assert.ok(/needsPoll = [^\n]*inventory\.photos/.test(ui), 'a photos-only Project does not poll');
assert.ok(ui.includes('const candKey = projectId + "|" + JSON.stringify(only) + (beatPunch ? "|motion" : "");') && ui.includes('const key = pid + "|" + JSON.stringify(only) + (frozen.punch ? "|motion" : "");'), 'scene search cache keyed on the Project');
for (const hook of ['addEventListener("visibilitychange"', 'React.useMemo(', 'const [usePhotos', 'const [clipSound', '[cueId, ownMusic?.path, section, length, pace]']) assert.ok(ui.indexOf(hook) < ui.indexOf('if (!projectId) return <ui'), hook + ' before the early return');

// Shell: single-quoted user paths, Finder PATH, big outputs through files, fixed call count.
assert.ok(!/dq\((file|ownMusic|roots)/.test(panel), 'user paths must not be double-quoted into the shell');
for (const re of [/command: TOOL_PATH \+ "command -v ffmpeg/, /cmd = TOOL_PATH \+ "ffmpeg -nostdin -v error -y -t 360/, /command: TOOL_PATH \+ "ffprobe /, /cmd = TOOL_PATH \+ "rm -f "/]) assert.ok(re.test(panel), String(re));
assert.ok(panel.includes('/opt/homebrew/bin:/usr/local/bin') && panel.includes('.nvm/versions/node/*/bin'), 'Homebrew and nvm paths');
assert.ok(panel.includes('" 22050 " + sq(roots.data + "/own-music.json")') && panel.includes('JSON.parse(await readText(roots.data, "own-music.json"))') && panel.includes('!done.ok'), 'own-music analysis via a file');
assert.ok(panel.includes('"; s=$?; rm -f " + sq(pcm) + "; exit $s"') && panel.includes('" && rm -f " + sq(base + ".mp3")'), 'temporary audio files are removed');
assert.equal((panel.match(/runShell\(/g) || []).length, 6, 'one folder lookup, four tool steps and the preview cleanup');
assert.ok(panel.includes('"JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"'), 'fill passes the config through JSON.parse');

// Music section slider and preview (kit pitfalls).
for (const s of ['role="slider"', 'aria-valuenow', 'aria-valuetext', '--panel-accent', '--panel-muted-fg', 'ResizeObserver', 'devicePixelRatio', 'setPointerCapture', '"grabbing"', '"ArrowLeft"', '"Home"', '"End"',
  'fmtTime(total)', '"pause"', 'requestAnimationFrame', 'cancelAnimationFrame', '"Escape"', 'previewTokenRef', 'URL.createObjectURL', 'URL.revokeObjectURL',
  'onended', 'preview-*.mp3', 'readText(roots.data']) assert.ok(panel.includes(s), s);
says('sectionHint', 'drag to choose'); says('startsAt', 'Starts at '); says('stopPreview', 'Stop preview'); says('cancelPreview', 'Cancel preview'); says('installTools', 'Install ffmpeg and Node.js');
// The slider follows the panel language (lang prop); numbers are passed as rounded numbers so t() formats them.
assert.ok(ui.includes('<SectionSlider lang={L} peaks={peaks}') && ui.includes('aria-valuetext={section == null ? t(lang, "musicTooShort") : t(lang, "startsAt", { seconds: Math.round(section * 10) / 10 })}'), 'slider language');
assert.ok(/-t " \+ dur\.toFixed\(2\)/.test(panel), 'the preview length is the video length');
assert.ok(!/--text-tertiary/.test(panel) && !/var\(--accent\b/.test(panel), 'only --panel-* tokens');
assert.ok(build.includes('stopPreview()') && finish.includes('stopPreview()'), 'Build and Finish stop the preview');

// Results and flows.
for (const s of ['function buildAnother()', 'const s = seed + 1;', 'selects.editor.openDraft', 'linkToDraftFrame', 'avProgress(', 'steps={AV_BUILD_STEPS.map((s) => t(L, "step." + s.id))}',
  'unchecked: found.failed.length', 'type="checkbox"', 'chooseClips(allRids)', 'choosePhotos(allPhotoRids)']) assert.ok(ui.includes(s), s);
says('anotherVersion', 'Try other shots'); says('finishTitle', 'Finish title and look'); says('stoppedAt', 'Stopped at step'); says('draftCreatedAdding', 'Draft created; adding title and look');
says('silentVideo', 'Silent video'); says('unchecked', 'Build again to retry '); says('noClipsSelected', 'No clips selected'); says('build', 'Build'); says('building', 'Building');
family('step', { shots: 'Choosing shots', music: 'Preparing music', draft: 'Creating Draft', look: 'Adding title and look', open: 'Opening Draft' });
says('progress', 'Step {step}/{total} · {name} · {percent}%'); says('progressDetail', 'Step {step}/{total} · {name} ({detail}) · {percent}%');
// Text kept in state follows a language switch: status, inventory errors and progress details are functions of the
// language, and thrown errors carry one (uiError) while SDK details stay English after a translated prefix.
assert.ok(ui.includes('const [status, setStatus] = React.useState<{ tone: string; say: Say } | null>(null);') && ui.includes('{status.say(L)}'), 'status follows the language');
assert.ok(!/setStatus\(\{ tone: "[a-z]+", text:/.test(ui) && !/\bstatus\.text\b/.test(ui), 'no frozen status text');
assert.ok(ui.includes('const p = { ...avProgress(id, fraction), detail };') && ui.includes('progress.detail(L)'), 'progress detail follows the language');
assert.ok(ui.includes('return (l) => (at ? t(l, "stoppedAt", { step: at.current + 1, total: AV_BUILD_STEPS.length, name: t(l, "step." + at.id), detail: sayError(l, e) }) : sayError(l, e));'), 'stopAt keeps the error');
assert.ok(!/throw new Error\("[A-Z]/.test(ui), 'no English UI errors thrown');
assert.ok(!/\.(captureFrames|captureVisualFrames)\(/.test(panel), 'no frame capture in the panel');
// The search progress counts videos (photos are never searched), singular for one; a photos-only build says so.
assert.ok(ui.includes('advance("shots", i / rids.length, (l) => t(l, "videosChecked", { done, count: rids.length }));'), 'progress counts videos');
assert.deepEqual(en.videosChecked, { one: '{done}/{count} video checked', other: '{done}/{count} videos checked' });
assert.ok(!panel.includes('clips checked'), 'no "clips checked" wording');
assert.ok(ui.includes('const shotsDetail: Say | undefined = rids.length ? undefined : (l) => t(l, "photosOnly");') && ui.includes('advance("shots", 1, shotsDetail);'), 'photos-only detail');
says('photosOnly', 'photos only');
assert.deepEqual(en.retryUnchecked, { one: 'Could not check {count} video; press Build to retry it.', other: 'Could not check {count} videos; press Build to retry them.' });
assert.deepEqual(en.unchecked, { one: 'Could not check {count} video; it was skipped. Build again to retry it.', other: 'Could not check {count} videos; they were skipped. Build again to retry them.' });
// A plan failure is whole sentences joined with `gap` (no space after a full stop in ja and zh).
assert.ok(ui.includes('failed ? t(l, "retryUnchecked", { count: failed }) : ""].filter(Boolean).join(t(l, "gap")));'), 'sentences joined with gap');
// A sentence with two numbers takes its plural form from {count}, so the noun must sit next to {count}, not next to the
// other number ({selected}, {fitted}); checked in every language with plural nouns (the CWV fix, PR #93).
{
  const all = extractStrings(panel).strings, forms = v => (typeof v === 'string' ? [v] : Object.values(v));
  for (const lang of ['de', 'en', 'es', 'fr', 'it', 'pt']) for (const key of ['clipsSelected', 'photosSelected', 'fitPartial', 'footageFits', 'shortened'])
    for (const f of forms(all[lang][key])) assert.ok(/\{(selected|fitted)\} \S+ \{count\}/.test(f), lang + '.' + key + ': the other number must come before {count} and its noun: ' + f);
}
assert.equal(extractStrings(panel).strings.ja.gap, ''); assert.equal(extractStrings(panel).strings.zh.gap, ''); assert.equal(en.gap, ' ');

// decorate.js refuses a config without videoEnd.
assert.ok(fs.readFileSync(path.join(root, 'scripts', 'decorate.js'), 'utf8').includes("if (!(cfg.videoEnd > 0)) throw Error('decorate: cfg.videoEnd missing');"));
console.log(JSON.stringify({ panel: 'ok' }));
