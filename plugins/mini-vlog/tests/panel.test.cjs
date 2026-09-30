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
// The title layout block of assets/title-lockup.tsx is embedded verbatim too (the preview uses the Draft's layout code).
const lockupTsx0 = fs.readFileSync(path.join(root, 'assets', 'title-lockup.tsx'), 'utf8');
const lStart = panel.indexOf('// mv-lockup:start'), lEnd = panel.indexOf('// mv-lockup:end');
assert.ok(lStart > pEnd && lEnd > lStart, 'lockup markers after the planner');
assert.equal(panel.slice(lStart, lEnd), lockupTsx0.slice(lockupTsx0.indexOf('// mv-lockup:start'), lockupTsx0.indexOf('// mv-lockup:end')), 'panel.tsx must embed the mv-lockup block verbatim');
assert.equal(panel.split('// mv-lockup:start').length, 2, 'one lockup block');
const ui = panel.slice(pEnd, lStart) + panel.slice(lEnd);
// The hook B helpers (motion bonus, punch frames) sit in their own plain-JS block outside the planner, which the
// headless driver loads next to planner.js.
const hStart = panel.indexOf('// mv-hook:start\n'), hEnd = panel.indexOf('// mv-hook:end');
assert.ok(hStart > pEnd && hEnd > hStart && hEnd < lStart, 'hook block between the planner and the lockup');
assert.equal(panel.split('// mv-hook:start').length, 2, 'one hook block');
const hookBlock = panel.slice(hStart, hEnd);
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
for (const name of ['inventory.js', 'search.js', 'ensure-audio.js', 'assemble.js', 'decorate.js', 'title-lockup.tsx', 'soft-look.tsx', 'photo-motion.tsx', 'beat-punch.tsx', 'manifest.json', 'presets.json', 'beat-detect.cjs']) assert.ok(panel.includes(name), 'panel reads ' + name);

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
assert.equal((q.match(/^  \w+: "/gm) || []).length, 8, 'eight queries (the motion query is added only with Beat punch)');
for (const [role, text] of Object.entries(QUERIES)) assert.ok(q.includes('  ' + role + ': "' + text + '",'), 'query ' + role);
for (const c of ['const AMBIENT_DB = -18;', 'const DEFAULT_CUE = "weekend-indie-pop";', 'const PREFERRED_CUE = "bedroom-pop-108";', 'const DEFAULT_PRESET = "mini-vlog";',
  'const DEFAULT_LENGTH = "standard";', 'const DEFAULT_PACE = "quick";', 'const DEFAULT_PUNCH = true;', 'const DEFAULT_HOOK = true;', 'const SOFT_STRENGTH = 0.35;', 'const MOTION_STRENGTH = 0.5;']) assert.ok(panel.includes(c), c);
for (const s of ['React.useState(DEFAULT_CUE)', 'React.useState(DEFAULT_PRESET)', 'React.useState<"short" | "standard" | "long">(DEFAULT_LENGTH)', 'React.useState<"quick" | "relaxed" | "groove">(DEFAULT_PACE)', 'const [beatPunch, setBeatPunch] = React.useState(DEFAULT_PUNCH)', 'const [hook, setHook] = React.useState(DEFAULT_HOOK)',
  'React.useState<"off" | "ambient" | "full">("ambient")', 'const [soft, setSoft] = React.useState(true)', 'const [usePhotos, setUsePhotos] = React.useState(true)']) assert.ok(panel.includes(s), s);
// The preferred cue replaces the default once, when the manifest has it.
assert.ok(/cues\.some\(\(c: any\) => c\.id === PREFERRED_CUE\)/.test(panel) && panel.includes('(cur === DEFAULT_CUE ? PREFERRED_CUE : cur)'), 'bedroom-pop-108 becomes the default when present');

// UI order (spec section 8).
const order = ['title="Title"', 'title="Music"', 'title="Length"', 'title="Advanced"', 'Creates a new 16:9 Draft'].map(s => ui.indexOf(s));
assert.ok(order.every(i => i > 0), 'all sections present');
assert.deepEqual(order.slice().sort((a, b) => a - b), order, 'Title, Music, Length, Advanced, Build');
for (const s of ['label="Length"', 'label="Pace"', 'value: "quick"', 'value: "relaxed"', '{ label: "Groove", value: "groove" }', 'label="Beat punch"', 'label="Start at the hook"', 'label="Clip sound"', 'label="Soft look"', 'label="Use photos"', 'Choose clips']) assert.ok(ui.includes(s), s);

// Title: three preset tiles, per-preset fields with max lengths, @year resolved, live preview from the shared layout code.
for (const s of ['aria-pressed', 'fieldsBy', '.slice(0, fl.max)', '"@year"', 'inventory?.latestYear', 'new Date().getFullYear()', 
  'mvLockupLayout(', 'mvSparklePath(', 'mvStarPath(', 'height: PREVIEW_HEIGHT', 'fontKerning: "none"', 'fontVariantLigatures: "none"', 'FontFace', 'Preview unavailable']) assert.ok(ui.includes(s), s);
assert.ok(!/states\b/.test(ui), 'no CWV font states');
assert.ok(!/new Function|\beval\(/.test(ui), 'no runtime evaluation in the panel');
assert.ok(ui.includes('} catch { return null; }') && ui.includes('{assets && previewItems ? ('), 'a layout error falls back to "Preview unavailable"');
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
for (const s of ['mvGridUsable({ bpm: grid.bpm, accepted: grid.accepted })', 'mvBeatsPerShot(pace, grid.bpm)', 'mvShotSeconds(', 'mvFitShots(', ' shots fit this track (', 'Quick uses 2 beats', 'Relaxed uses 1 beat', 'approximate timing', '"Tempo outside 70\\u2013160 bpm ("', 'No steady beat']) assert.ok(ui.includes(s), s);
assert.ok(ui.includes('"one-resource": "Add at least 2 clips or photos"') && ui.includes('"too-few": "Your footage fits fewer than 4 shots"')
  && ui.includes('"music-too-short": "This track is too short for 4 shots from this section"'), 'fail reason messages');
assert.equal((ui.match(/mvPlanBuild\(/g) || []).length, 2, 'the build plan and the readiness plan');
assert.equal((ui.match(/mvPlanBuild\(\{ candidates: [^;]*, bpm: grid\.bpm, accepted: grid\.accepted, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid\.usableEnd, \.\.\.snapCuts, seed: String\(/g) || []).length, 2, 'both plans get the same inputs');
assert.ok(ui.includes('const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };'));
// Use photos off drops the photo candidates before planning.
assert.ok(ui.includes('if (!usePhotos || !inventory) return [];'), 'photos off -> no photo candidates');
assert.equal((ui.match(/photoCandsOf\(inventory, onlyPhotos, usePhotos\)/g) || []).length, 2);
// Build is disabled with the reason.
assert.ok(ui.includes('disabled={busy || !canBuild}') && ui.includes('MV_FAIL[plan.reason]') && ui.includes('const blockReason = blockFor(readyPlan);'), 'disabled Build with the planner reason');

// Groove (spec 15.1): capacity, lines and the pace note follow the planner's beat spans, not shots x shotSeconds.
for (const s of ['const grooved = pace === "groove" && (gridded ? !!guard.groove : true);', 'const opener = guard.groove ? guard.opener : 2;',
  'mvGrooveFit({ requested, sectionStart: gridded ? grid.firstBeat : 0, usableEnd: grid.usableEnd, beatSeconds: shotSeconds, opener })',
  'const fitted = grooved ? grooveFit.shots : mvFitShots(', 'const wanted = grooved ? mvGrooveSpan(requested, opener).shots : requested;',
  'const fittedSeconds = grooved ? grooveFit.beats * shotSeconds : fitted * shotSeconds;', 'const wantedSeconds = grooved ? grooveFit.requestedBeats * shotSeconds : requested * shotSeconds;',
  'const videoSeconds = fitted ? fittedSeconds : wantedSeconds;', 'const planSeconds = (p: any) => (p.groove ? p.groove.beats * shotSeconds : p.shots * shotSeconds);',
  'const planShort = (p: any) => (grooved ? !!p.groove && p.groove.beats < grooveFit.beats : p.shots < fitted);',
  '"Groove opens phrases with 1 beat"', '"Groove uses 2 beats per shot"']) assert.ok(ui.includes(s), s);
assert.ok(!/fitted \* shotSeconds\)\.toFixed|requested \* shotSeconds\)\.toFixed|readyPlan\.shots \* shotSeconds|plannedShots \* shotSeconds/.test(ui), 'no shots x shotSeconds lines left');
assert.ok(ui.includes('const shortened = planShort(plan) ?') && ui.includes('readyPlan && readyPlan.ok && planShort(readyPlan)'), 'footage shortfall compares Groove beat spans');
// Start at the hook (spec 15.3): the default section is the hook window when the toggle is on and the cue has scores.
assert.ok(ui.includes('hookBars: cue.hookBars || null') && ui.includes('const hookSection = () => (hook && gridded && musicKind === "cue" ? mvHookSection({ hookBars: grid.hookBars, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, barPhaseBeats: cue?.barPhaseBeats }) : null);'), 'hook section from the manifest');
assert.ok(/const hookAt = hookSection\(\);\s*setSection\(hookAt \?\? mvDefaultSection\(/.test(ui), 'falls back to the energy default');
// With the hook on, a new length or pace moves the section to that length's hook window (else it only re-clamps).
assert.ok(ui.includes('React.useEffect(() => { const hookAt = hookSection(); setSection((s) => hookAt ?? snap(s ?? 0)); }, [length, pace]);'), 'hook re-picked on length / pace');
// No grid: the pace note states Groove's 0.55 s beat and its shot lengths.
assert.ok(ui.includes('const timing = grooved ? "Groove on a " + shotSeconds.toFixed(2) + " s beat: " + (2 * shotSeconds).toFixed(2) + ", " + shotSeconds.toFixed(2) + " and " + (shotSeconds / 2).toFixed(3) + " s shots"') && (ui.match(/approximate timing \(" \+ timing \+ "\)\."/g) || []).length === 3, 'no-grid timing note');
assert.ok(ui.includes('}, [assets, cueId, ownMusic?.path, ownGrid, hook]);'), 'toggling the hook re-picks the default section');
// Motion query and bonus only with Beat punch (off: the v1.2 search and plan); the search cache is keyed on it.
assert.ok(ui.includes('candidates: (frozen.punch ? mvMotionBonus(found.list) : found.list).concat(photoCands)') && ui.includes('const scored = beatPunch ? mvMotionBonus(list) : list;'), 'motion bonus before planning, with Beat punch only');
assert.ok(ui.includes('findCandidates(todo, pid, check, mvSearchQueries(MV_QUERIES, frozen.punch))') && ui.includes('queries, pageSize: 4 }'), 'motion query with Beat punch only');
assert.ok(ui.includes('const key = pid + "|" + JSON.stringify(only) + (frozen.punch ? "|motion" : "");') && ui.includes('const candKey = projectId + "|" + JSON.stringify(only) + (beatPunch ? "|motion" : "");'), 'search cache keyed on the query set');
// The helpers are plain JS (the driver evaluates them).
assert.ok(!/:\s*(any|number|string)\b|\bas any\b/.test(hookBlock), 'hook block is plain JS');
const H = new Function(planner + '\n' + hookBlock + '\nreturn { mvMotionBonus, mvPunchFrames, mvSchedule, mvSearchQueries, mvFillers, MV_MOTION_ROLE, MV_MOTION_QUERY, MV_MOTION_BONUS, MV_MOTION_REACH };')();
assert.equal(H.MV_MOTION_ROLE, 'motion'); assert.equal(H.MV_MOTION_BONUS, 0.1); assert.equal(H.MV_MOTION_REACH, 0.75);
assert.equal(H.MV_MOTION_QUERY, 'hands moving, pouring, walking or the camera moving');
assert.deepEqual(H.mvSearchQueries(QUERIES, false), QUERIES);
assert.deepEqual(H.mvSearchQueries(QUERIES, true), { ...QUERIES, motion: 'hands moving, pouring, walking or the camera moving' });
{
  const role = [{ rid: 'a', role: 'drink', t: 2.5, score: 0.3, sourceDuration: 9 }, { rid: 'b', role: 'park', t: 5.7, score: 0.3, sourceDuration: 9 },
    { rid: 'b', role: 'park', t: 6, score: 0.3, sourceDuration: 9 }, { rid: 'a', role: 'food', t: 5, score: 0.2, sourceDuration: 9 }];
  const motion = [{ rid: 'a', role: 'motion', t: 2, score: 0.4 }, { rid: 'b', role: 'motion', t: 5, score: 0.2 }, { rid: 'b', role: 'motion', t: 5.5, score: 0.3 }];
  // No motion hits, or all equally strong: the candidates are unchanged, and motion rows never reach the planner.
  assert.deepEqual(H.mvMotionBonus(role), role);
  assert.deepEqual(H.mvMotionBonus(role.concat([{ rid: 'a', role: 'motion', t: 2, score: 0.4 }, { rid: 'b', role: 'motion', t: 6, score: 0.4 }])), role);
  const out = H.mvMotionBonus(motion.concat(role));
  assert.equal(out.length, 4); assert.ok(out.every(c => c.role !== 'motion'));
  // Min-max normalised (0.2 -> 0, 0.3 -> 0.5, 0.4 -> 1), x 0.1: a's hit 0.5 s away +0.1; b's best hit within 0.75 s is
  // the 0.3 one (+0.05) for both b candidates; a hit on another clip gives nothing.
  assert.deepEqual(out.map(c => Math.round(c.score * 1000) / 1000), [0.4, 0.35, 0.35, 0.2]);
  assert.equal(role[0].score, 0.3, 'input not mutated');
  // A tie-break: the largest bonus stays below the allocator's role step (0.15) minus its jitter (0.05).
  // (jitter is in [0, 0.05), so 0.1 + jitter < 0.15 never overtakes a better role.)
  assert.ok(H.MV_MOTION_BONUS <= 0.15 - 0.05 + 1e-9);
  // A clip with motion hits only keeps a stub (no time or score), so the planner still makes its filler windows.
  const only = H.mvMotionBonus(role.concat([{ rid: 'c', role: 'motion', t: 1, score: 0.9, sourceDuration: 6 }, { rid: 'c', role: 'motion', t: 3, score: 0.1, sourceDuration: 6 }]));
  assert.deepEqual(only.filter(c => c.rid === 'c'), [{ rid: 'c', role: 'motion', sourceDuration: 6 }]);
  assert.ok(H.mvFillers(only).some(f => f.rid === 'c'), 'fillers for a motion-only clip');
}
{
  // Punch frames: bar downbeats from the section start at the real fps with the music offset, the same frames as the
  // Quick grid's slot starts on beats 0, 4, 8 ...; none without a grid.
  const F = 30000 / 1001, q = H.mvSchedule({ bpm: 108, fps: F, shots: 24, beatsPerShot: 1, sectionStart: 4.472 });
  const pf = H.mvPunchFrames({ bpm: 108, fps: F, sectionStart: 4.472, videoEnd: q.totalFrames });
  assert.deepEqual(pf, q.slots.filter(x => x.startBeat % 4 === 0).map(x => x.startFrame));
  assert.equal(pf.length, 6); assert.equal(pf[0], 0);
  assert.deepEqual(H.mvPunchFrames({ bpm: 108, fps: 25, sectionStart: 0, videoEnd: 100 }), [0, 56]);
  for (const bpm of [null, 0, undefined]) assert.deepEqual(H.mvPunchFrames({ bpm, fps: 25, sectionStart: null, videoEnd: 100 }), []);
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
assert.equal((ui.match(/run\("Assemble Mini Vlog"/g) || []).length, 1, 'assemble is called once and never resent');
assert.ok(build.includes('findDraftByName(pid, frozen.draftName)'), 'lost assemble reply -> look the Draft up by name');
assert.ok(ui.includes('(await p.meta()).draftIds') && ui.includes('m.name !== name'), 'lookup reads the Drafts by name');
assert.ok(ui.includes('.slice(-" + DRAFT_LOOKUP_MAX + ").reverse()') && panel.includes('const DRAFT_LOOKUP_MAX = 50;'), 'lookup reads at most the 50 most recent Drafts, newest first');
assert.ok(/if \(m\.name !== name\) continue;[^]*?return \{ sequenceId: id/.test(ui), 'first match returns');
// The readiness gate uses the seed each button builds with: Build = seed, Create another version = seed + 1.
assert.ok(ui.includes('planAt(seed)') && ui.includes('planAt(seed + 1)'), 'gates for both seeds');
assert.ok(ui.includes('onClick={buildAnother} disabled={busy || !canBuildAnother}'), 'another version gated with seed + 1');
assert.ok(build.includes('"Mini Vlog " + '), 'Draft name');
assert.ok(finish.includes('decorate(result, check)') && decorate.includes('const f = res.frozen;'), 'Finish title and look reuses the frozen inputs');
assert.ok(ui.includes('title, look and clip sound are not applied yet'), 'unfinished build message');
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
assert.ok(panel.includes('const MV_BUSY = "Selects is busy and didn\'t answer in time. Wait a moment and press Refresh. If it keeps happening, restart Selects.";'), 'actionable busy message');
// Inventory under load: the photo-size budget is small, and a retry skips measuring (assemble measures unsized photos).
assert.ok(ui.includes('measureMs: attempt === 0 ? INVENTORY_MEASURE_MS : 0') && panel.includes('const INVENTORY_MEASURE_MS = 4000;'), 'inventory measures less under load');
assert.ok(ui.includes('setInvError(e instanceof BusyError ? MV_BUSY : String(e?.message || e))'), 'busy inventory error message');
assert.ok(ui.includes('wanted: live'), 'inventory retries stop for a stale Project');
// A Project still loading after an app restart: the first inventory read that fails (not busy) is tried once more
// after 2 s, only from the mount effect (Refresh, focus and polling never auto-retry), and only while still wanted.
assert.ok(panel.includes('const INVENTORY_RETRY_MS = 2000;'), 'retry delay');
const mountFx = ui.slice(ui.indexOf('setStep("Checking clips");'), ui.indexOf('Mini Vlog could not start'));
assert.ok(/if \(await loadInventory\(projectId, \(\) => alive\) === "failed" && alive\) \{\s*await new Promise\(\(d\) => setTimeout\(d, INVENTORY_RETRY_MS\)\);\s*if \(alive && projectRef\.current === projectId\) \{ setInvError\(null\); await loadInventory\(projectId, \(\) => alive\); \}\s*\}/.test(mountFx), 'one retry after a failed first read');
assert.equal((mountFx.match(/loadInventory\(/g) || []).length, 2, 'exactly one retry');
assert.equal((ui.match(/INVENTORY_RETRY_MS/g) || []).length, 1, 'the retry is used only by the mount effect');
const loadInv = ui.slice(ui.indexOf('async function loadInventory('), ui.indexOf('React.useEffect(() => { mountedRef.current = true;'));
assert.ok(loadInv.includes('return e instanceof BusyError ? "busy" : "failed";') && loadInv.includes('return "ok";'), 'a busy failure is not retried again');
assert.ok(!/setTimeout/.test(loadInv), 'loadInventory itself never waits (Refresh / focus / poll do not auto-retry)');
// A non-busy failure reads as transient; the raw error stays in a details line and the console.
assert.ok(panel.includes('const MV_INV_FAILED = "Couldn\'t read this Project\'s clips yet. Press Refresh.";') && ui.includes('(invError === MV_BUSY ? MV_BUSY : MV_INV_FAILED)'), 'transient failure message');
assert.ok(ui.includes('{!inventory && invError && invError !== MV_BUSY ? <ui.Message tone="muted">{"Details: " + invError}</ui.Message> : null}') && loadInv.includes('console.warn('), 'raw error kept');
assert.ok(!ui.includes('Could not read the clips in this Project'), 'old message gone');
// A partial inventory (the Project was still loading) keeps polling and never reads as an empty Project.
assert.ok(/needsPoll = !!inventory && \(\(!!inventory\.incomplete && !incompleteStalled\) \|\|/.test(ui), 'incomplete inventory polls until stalled');
// Build and Create another version wait for the clip sizes: an incomplete inventory blocks both with a muted hint
// next to Build (blockReason), and build() refuses it; a later complete read clears the block.
assert.ok(panel.includes('const MV_SIZES_LOADING = "Clip sizes are still loading\u2026";') || panel.includes('const MV_SIZES_LOADING = "Clip sizes are still loading…";'), 'sizes hint text');
assert.ok(/const baseBlock: string \| null = !inventory \|\| !assets \? null\s*: inventory\.incomplete \? MV_SIZES_LOADING\s*:/.test(ui), 'incomplete blocks both buttons first');
assert.ok(ui.includes('const canBuild = ready && !blockReason;') && ui.includes('const canBuildAnother = ready && !anotherBlock;') && ui.includes('{blockReason && !busy ? <ui.Message tone="muted">{blockReason}</ui.Message> : null}'), 'the block disables Build / another version and shows the hint');
assert.ok(build.includes('!inventory || inventory.incomplete ||'), 'build() refuses an incomplete inventory');
// Incomplete polling is capped: INCOMPLETE_POLL_MAX (6) consecutive incomplete reads stop it with a Refresh hint;
// a complete read, a Project switch or Refresh restart the count.
assert.ok(panel.includes('const INCOMPLETE_POLL_MAX = 6;') && panel.includes('const MV_INV_PARTIAL = "Couldn\'t read all clips yet. Press Refresh.";'), 'cap constants');
assert.ok(loadInv.includes('if (inv.incomplete) { incompleteReadsRef.current++; if (incompleteReadsRef.current >= INCOMPLETE_POLL_MAX) setIncompleteStalled(true); }')
  && loadInv.includes('else { incompleteReadsRef.current = 0; setIncompleteStalled(false); }'), 'consecutive count, reset by a complete read');
assert.ok(ui.includes('const refreshInventory = () => { incompleteReadsRef.current = 0; setIncompleteStalled(false); loadInventory(); };'), 'Refresh restarts the cycle');
assert.ok(ui.includes('photoSizesRef.current = {}; incompleteReadsRef.current = 0; setIncompleteStalled(false);'), 'Project switch resets the cycle');
assert.ok(ui.includes(': inventory.incomplete && incompleteStalled ? MV_INV_PARTIAL'), 'stalled readiness message');
assert.ok(ui.indexOf('inventory.incomplete ? "Still reading this Project\'s clips') < ui.indexOf('No analysed video or photos in this Project yet'), 'incomplete before "no footage"');
assert.ok(/run\("Search shots"[^\n]*\{ wanted: \(\) => projectRef\.current === pid \}\)/.test(ui), 'search retries stop for a stale Project');
// Refresh stays available after a failure; a later successful read clears the error (Build is gated only by the inventory).
assert.ok(ui.includes('disabled={busy || !assets} onClick={refreshInventory}>Refresh<') && ui.includes('setInventory(inv); setInvError(null);'), 'Refresh stays enabled; success clears the error');
for (const s of ['run("Assemble Mini Vlog"', 'run("Add title and look"', 'run("Add music to the project"']) assert.ok(new RegExp(s.replace(/[()]/g, '\\$&') + '[^;]*, true\\);').test(ui), s + ' is a commit call');
// decorate cfg (scripts lane contract).
assert.ok(decorate.includes('fill(assets.scripts.decorateJs, { sequenceId: res.sequenceId, mute: f.clipSound === "off", videoEnd: res.videoEnd, title: { tsx: assets.titleTsx, parameters, editableParameters }, '
  + 'soft: f.soft ? { tsx: assets.softTsx, strength: SOFT_STRENGTH } : null, photos: photoRids, motion: { tsx: assets.motionTsx, strength: MOTION_STRENGTH, options: MOTION_OPTIONS, byRid }, photoEffects: true, punch })'), 'decorate cfg');
assert.ok(decorate.includes('const punch = f.punch ? { tsx: assets.punchTsx, strength: PUNCH_STRENGTH, push: PUNCH_PUSH, beatFrames: f.bpm ? 60 / f.bpm * res.fps : 0,')
  && decorate.includes('punchFrames: mvPunchFrames({ bpm: f.bpm, fps: res.fps, sectionStart: f.sectionStart, videoEnd: res.videoEnd }), picks: res.plan.picks } : null;'), 'Beat punch cfg at the real fps, off -> null');
assert.ok(build.includes('sectionStart: musicStart, pace, length, requested, clipSound, soft, punch: beatPunch, hook: hook && musicKind === "cue", bpm: gridded ? grid.bpm : null, usePhotos, only, onlyPhotos,'), 'punch, hook (bundled tracks only) and the grid tempo are frozen');
assert.ok(decorate.includes('seed: f.seed, clipSound: f.clipSound, punch: f.punch, hook: f.hook, groove: res.plan.groove || null, picks: res.plan.picks } };'), 'A/B provenance');
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
