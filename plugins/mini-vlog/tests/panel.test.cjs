// plugins/mini-vlog/tests/panel.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const planner = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const lockupTsx = fs.readFileSync(path.join(root, 'assets', 'title-lockup.tsx'), 'utf8');
const presets = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'fonts', 'presets.json'), 'utf8'));

// The planner is embedded verbatim between its markers.
const pStart = panel.indexOf('// mv-planner:start\n'), pEnd = panel.indexOf('// mv-planner:end');
assert.ok(pStart >= 0 && pEnd > pStart, 'planner markers');
assert.equal(panel.slice(pStart + '// mv-planner:start\n'.length, pEnd).trim(), planner.trim(), 'panel.tsx must embed planner.js verbatim');
const ui = panel.slice(pEnd);
const outside = panel.slice(0, pStart) + ui;

// Header: the name, ten localised names (ko in Latin letters), the icon and the plugin id.
const head = panel.split('\n').slice(0, 16).join('\n');
assert.match(head, /^\/\/ @name Mini Vlog$/m);
const langs = head.match(/^\/\/ @name:(\w+) .+$/gm) || [];
assert.equal(langs.length, 10, 'ten localised names');
assert.deepEqual(langs.map(l => l.slice(9, 11)).sort(), ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']);
assert.match(head, /^\/\/ @name:ko [A-Za-z ]+$/m, 'ko name in Latin letters');
assert.match(head, /^\/\/ @icon sparkles$/m);
assert.ok(panel.includes('const PLUGIN_ID = "mini-vlog";'));
assert.ok(!/^import .* from "(?!react")/m.test(panel), 'only react may be imported');
for (const name of ['inventory.js', 'search.js', 'ensure-audio.js', 'assemble.js', 'decorate.js', 'title-lockup.tsx', 'soft-look.tsx', 'photo-motion.tsx', 'manifest.json', 'presets.json', 'beat-detect.cjs']) assert.ok(panel.includes(name), 'panel reads ' + name);

// Hangul audit across the plugin.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => /\.(tsx|js|cjs|json|md|sh)$/.test(f))) assert.ok(!/[\uac00-\ud7a3]/.test(fs.readFileSync(f, 'utf8')), 'Korean text in ' + f);
assert.ok(!/\/Users\//.test(panel), 'no user paths');

// Canvas size only through MV_W / MV_H.
assert.ok(panel.includes('const MV_W = 1920, MV_H = 1080;'));
assert.equal((outside.match(/\b(1920|1080)\b/g) || []).length, 2, 'W/H are not hard-coded outside MV_W / MV_H');

// Constants (spec section 4 queries, defaults).
const q = panel.slice(panel.indexOf('const MV_QUERIES'), panel.indexOf('};', panel.indexOf('const MV_QUERIES')));
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
assert.equal((q.match(/^  \w+: "/gm) || []).length, 8, 'eight queries');
for (const [role, text] of Object.entries(QUERIES)) assert.ok(q.includes('  ' + role + ': "' + text + '",'), 'query ' + role);
for (const c of ['const AMBIENT_DB = -18;', 'const DEFAULT_CUE = "weekend-indie-pop";', 'const PREFERRED_CUE = "bedroom-pop-108";', 'const DEFAULT_PRESET = "mini-vlog";',
  'const DEFAULT_LENGTH = "standard";', 'const DEFAULT_PACE = "quick";', 'const SOFT_STRENGTH = 0.35;', 'const MOTION_STRENGTH = 0.5;']) assert.ok(panel.includes(c), c);
for (const s of ['React.useState(DEFAULT_CUE)', 'React.useState(DEFAULT_PRESET)', 'React.useState<"short" | "standard" | "long">(DEFAULT_LENGTH)', 'React.useState<"quick" | "relaxed">(DEFAULT_PACE)',
  'React.useState<"off" | "ambient" | "full">("ambient")', 'const [soft, setSoft] = React.useState(true)', 'const [usePhotos, setUsePhotos] = React.useState(true)']) assert.ok(panel.includes(s), s);
// The preferred cue replaces the default once, when the manifest has it.
assert.ok(/cues\.some\(\(c: any\) => c\.id === PREFERRED_CUE\)/.test(panel) && panel.includes('(cur === DEFAULT_CUE ? PREFERRED_CUE : cur)'), 'bedroom-pop-108 becomes the default when present');

// UI order (spec section 8).
const order = ['title="Title"', 'title="Music"', 'title="Length"', 'title="Advanced"', 'Creates a new 16:9 Draft'].map(s => ui.indexOf(s));
assert.ok(order.every(i => i > 0), 'all sections present');
assert.deepEqual(order.slice().sort((a, b) => a - b), order, 'Title, Music, Length, Advanced, Build');
for (const s of ['label="Length"', 'label="Pace"', 'value: "quick"', 'value: "relaxed"', 'label="Clip sound"', 'label="Soft look"', 'label="Use photos"', 'Choose clips']) assert.ok(ui.includes(s), s);

// Title: three preset tiles, per-preset fields with max lengths, @year resolved, live preview from the shared layout code.
for (const s of ['aria-pressed', 'fieldsBy', '.slice(0, fl.max)', '"@year"', 'inventory?.latestYear', 'new Date().getFullYear()', '// mv-lockup:start', '// mv-lockup:end', 'new Function(',
  'mvLockupLayout(', 'mvSparklePath(', 'mvStarPath(', 'height: PREVIEW_HEIGHT', 'fontKerning: "none"', 'fontVariantLigatures: "none"', 'FontFace', 'Preview unavailable']) assert.ok(ui.includes(s), s);
assert.ok(!/states\b/.test(ui), 'no CWV font states');
// The lockup block evaluates as plain JS, as the panel does it.
const lb = lockupTsx.slice(lockupTsx.indexOf('// mv-lockup:start'), lockupTsx.indexOf('// mv-lockup:end'));
const lockup = new Function(lb + '\nreturn { mvLockupLayout: mvLockupLayout, mvSparklePath: mvSparklePath, mvStarPath: mvStarPath };')();
const mini = presets.presets.find(p => p.id === 'mini-vlog');
const items = lockup.mvLockupLayout({ preset: 'mini-vlog', fields: { big: 'mini', small: 'vlog' }, fonts: mini.fonts.map(f => ({ ...f, metrics: presets.metrics[f.family] })) }, 1920, 1080);
assert.ok(items.length >= 3 && items.some(i => i.part === 'small'), 'block runs stand-alone');
// Every preset field has a max; @year is the only token.
for (const p of presets.presets) for (const f of p.fields) assert.ok(f.max > 0, p.id + '.' + f.key);

// Music: reference cues first, then alternatives under a small label; own music and No music; section hidden for No music.
for (const s of ['group !== "alternative"', 'group === "alternative"', '>Alternatives<', '"Your own music"', '"No music"', 'role="radiogroup"', 'musicKind !== "none" ?']) assert.ok(ui.includes(s), s);

// Length, pace and capacity (spec 14.1 / 14.2).
for (const s of ['mvGridUsable({ bpm: grid.bpm, accepted: grid.accepted })', 'mvBeatsPerShot(pace, grid.bpm)', 'mvShotSeconds(', 'mvFitShots(', ' shots fit this track (', 'Quick uses 2 beats', 'Relaxed uses 1 beat', 'approximate timing']) assert.ok(ui.includes(s), s);
assert.ok(ui.includes('"one-resource": "Add at least 2 clips or photos"') && ui.includes('"too-few": "Your footage fits fewer than 4 shots"')
  && ui.includes('"music-too-short": "This track is too short for 4 shots from this section"'), 'fail reason messages');
assert.equal((ui.match(/mvPlanBuild\(/g) || []).length, 2, 'the build plan and the readiness plan');
assert.equal((ui.match(/mvPlanBuild\(\{ candidates: [^;]*, bpm: grid\.bpm, accepted: grid\.accepted, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid\.usableEnd, \.\.\.snapCuts, seed: String\(/g) || []).length, 2, 'both plans get the same inputs');
assert.ok(ui.includes('const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };'));
// Use photos off drops the photo candidates before planning.
assert.ok(ui.includes('if (!usePhotos || !inventory) return [];'), 'photos off -> no photo candidates');
assert.equal((ui.match(/photoCandsOf\(inventory, onlyPhotos, usePhotos\)/g) || []).length, 2);
// Build is disabled with the reason.
assert.ok(ui.includes('disabled={busy || !canBuild}') && ui.includes('MV_FAIL[readyPlan.reason]'), 'disabled Build with the planner reason');

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
assert.equal((ui.match(/run\("Assemble Mini Vlog"/g) || []).length, 1, 'assemble is called once and never resent');
assert.ok(build.includes('findDraftByName(pid, frozen.draftName)'), 'lost assemble reply -> look the Draft up by name');
assert.ok(ui.includes('(await p.meta()).draftIds') && ui.includes('m.name !== name'), 'lookup reads the Drafts by name');
assert.ok(build.includes('"Mini Vlog " + '), 'Draft name');
assert.ok(finish.includes('decorate(result, check)') && decorate.includes('const f = res.frozen;'), 'Finish title and look reuses the frozen inputs');
assert.ok(ui.includes('title, look and clip sound are not applied yet'), 'unfinished build message');
assert.match(panel, /No valid session ID/);
assert.ok(ui.includes('!allowCommit && /No valid session ID/'), 'only non-committing calls are resent');
// decorate cfg (scripts lane contract).
assert.ok(decorate.includes('fill(assets.scripts.decorateJs, { sequenceId: res.sequenceId, mute: f.clipSound === "off", videoEnd: res.videoEnd, title: { tsx: assets.titleTsx, parameters, editableParameters }, '
  + 'soft: f.soft ? { tsx: assets.softTsx, strength: SOFT_STRENGTH } : null, photos: photoRids, motion: { tsx: assets.motionTsx, strength: MOTION_STRENGTH, options: MOTION_OPTIONS, byRid }, photoEffects: true })'), 'decorate cfg');
assert.ok(!/titleEnd|warm/i.test(ui), 'no titleEnd / warm');
assert.ok(!/titleSlots|montageShots|burst|line1|connector/.test(ui), 'no CWV title burst or lines');
assert.ok(decorate.includes('mvPhotoMotions(res.plan.picks, String(f.seed), sizes)'), 'photo motions without titleSlots');
assert.ok(decorate.includes('Math.max(MV_W / sz.width, MV_H / sz.height) / Math.min(MV_W / sz.width, MV_H / sz.height)'), '16:9 cover scale');
// Title parameters: flat keys, fonts with metrics (only the preset's), editable Adjust items.
for (const s of ['presets.metrics[x.family]', '...flat', 'fields: { ...flat }', 'type: "boolean"', 'key: "sparkles"', 'key: "primary"', 'key: "secondary"', 'key: "shadow"', 'key: "size"', 'key: "x"', 'key: "y"']) assert.ok(ui.includes(s), s);
for (const m of ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift']) assert.ok(panel.includes('value: "' + m + '"'), 'motion option ' + m);
assert.ok(ui.includes('clipSound: frozen.clipSound, ambientDb: AMBIENT_DB'), 'assemble gets the clip sound mode and level');
assert.ok(ui.includes('const boundaries: number[] = plan.schedule.cuts;') && ui.includes('picks: plan.picks, boundaries, crops,'), 'assemble gets the planned cuts');
assert.ok(build.includes('videoEnd: a.totalFrames'), 'the title ends at the last clip end');

// Inventory refresh: poll while pending, focus / visibility, Refresh button; project switch drops the cache.
for (const s of ['loadInventory(', 'still being analysed', 'this updates automatically', '>Refresh<', 'visibilitychange', 'addEventListener("focus"', '10000', 'setCandidates(null)', 'invSigRef', 'projectRef']) assert.ok(ui.includes(s), s);
assert.ok(/needsPoll = [^\n]*inventory\.photos/.test(ui), 'a photos-only Project does not poll');
assert.ok(ui.includes('const candKey = projectId + "|" + JSON.stringify(only);') && ui.includes('const key = pid + "|" + JSON.stringify(only);'), 'scene search cache keyed on the Project');
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
  'drag to choose', 'fmtTime(total)', 'Starts at ', 'Stop preview', 'Cancel preview', '"pause"', 'requestAnimationFrame', 'cancelAnimationFrame', '"Escape"', 'previewTokenRef', 'URL.createObjectURL', 'URL.revokeObjectURL',
  'onended', 'preview-*.mp3', 'readText(roots.data', 'Install ffmpeg and Node.js']) assert.ok(panel.includes(s), s);
assert.ok(/-t " \+ dur\.toFixed\(2\)/.test(panel), 'the preview length is the video length');
assert.ok(!/--text-tertiary/.test(panel) && !/var\(--accent\b/.test(panel), 'only --panel-* tokens');
assert.ok(build.includes('stopPreview()') && finish.includes('stopPreview()'), 'Build and Finish stop the preview');

// Results and flows.
for (const s of ['Create another version', 'function buildAnother()', 'const s = seed + 1;', 'selects.editor.openDraft', 'linkToDraftFrame', 'Finish title and look', 'mvProgress(', 'steps={MV_BUILD_STEPS', 'Stopped at step',
  'Draft created; adding title and look', 'Silent video', 'unchecked: found.failed.length', 'Build again to retry ', 'type="checkbox"', 'chooseClips(allRids)', 'choosePhotos(allPhotoRids)', 'No clips selected']) assert.ok(ui.includes(s), s);
assert.ok(!/\.(captureFrames|captureVisualFrames)\(/.test(panel), 'no frame capture in the panel');

// decorate.js refuses a config without videoEnd.
assert.ok(fs.readFileSync(path.join(root, 'scripts', 'decorate.js'), 'utf8').includes("if (!(cfg.videoEnd > 0)) throw Error('decorate: cfg.videoEnd missing');"));
console.log(JSON.stringify({ panel: 'ok' }));
