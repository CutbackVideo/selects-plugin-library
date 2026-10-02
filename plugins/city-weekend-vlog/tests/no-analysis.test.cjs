// plugins/city-weekend-vlog/tests/no-analysis.test.cjs
// Builds without analysis: the quick local check's windows and candidates (cwv-local block), the planner's motion
// preference for quick-checked windows, and how the shared shot search wires the check in (Build and template run).
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const between = (a, b) => panel.slice(panel.indexOf(a), panel.indexOf(b) + b.length);
const box = { Math, Number, Object, Array, Set, Map, isFinite }; vm.createContext(box);
vm.runInContext(between('// cwv-local:start', '// cwv-local:end') + '\n' + between('// quick-score:start', '// quick-score:end') +
  '\n;globalThis.X={cwvScoreRange,cwvQuickCandidates,cwvHostDataDir,qsWindowScores,qsFallback,qsBins};', box);
const X = box.X;
const plain = v => JSON.parse(JSON.stringify(v));

// One scale with the scene search: its 10th-90th percentile, or 0..1 without searched clips.
assert.deepEqual(plain(X.cwvScoreRange([])), { lo: 0, hi: 1 });
const r = X.cwvScoreRange([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1]);
assert.ok(Math.abs(r.lo - 0.2) < 1e-9 && Math.abs(r.hi - 1.0) < 1e-9);
const flat = X.cwvScoreRange([0.5, 0.5]);
assert.ok(Math.abs(flat.hi - flat.lo - 0.05) < 1e-9, 'a flat range is widened');

// Candidates from kit scores: a scored clip gives steady and moving windows (no black or fade windows while clean ones
// fit), mapped onto the range, motion ranked 0..1; a clip the check could not decode gets whole-second windows from 1 s.
const bin = (start, o) => ({ start, end: start + 0.5, motion: 0.02, sharp: 0.3, luma: 0.45, clipped: 0,
  flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false }, ...o });
const scored = { rid: 'a', duration: 6, sceneCuts: [], fallback: false, windows: [
  bin(0.5, { luma: 0.02, flags: { black: true, fade: false, flash: false, blur: false, dark: true, bright: false, cut: false } }),
  bin(1, {}), bin(1.5, {}), bin(2, { motion: 0.2 }), bin(2.5, { motion: 0.22 }), bin(3, { motion: 0.2 }), bin(3.5, { motion: 0.01 }), bin(4, { motion: 0.01 }), bin(4.5, {}), bin(5, {})] };
const cands = plain(X.cwvQuickCandidates([{ rid: 'a', duration: 6, scores: scored }, { rid: 'b', duration: 3.2, scores: X.qsFallback({ rid: 'b', durationSeconds: 3.2 }, 0, null) },
  { rid: 'c', duration: 4, scores: null }], { lo: 0.2, hi: 0.6 }));
const ofA = cands.filter(c => c.rid === 'a');
assert.ok(ofA.length >= 3, 'several windows from a scored clip');
assert.ok(ofA.every(c => c.role === 'quick' && c.sourceDuration === 6 && c.score >= 0.2 && c.score <= 0.6 && c.motion >= 0 && c.motion <= 1));
assert.ok(ofA.every(c => c.t - 0.25 >= 0.75), 'no window over the black first second');
for (let i = 0; i < ofA.length; i++) for (let j = i + 1; j < ofA.length; j++) assert.ok(Math.abs(ofA[i].t - ofA[j].t) >= 0.5, 'windows at least 0.5 s apart');
const busy = ofA.filter(c => c.t >= 2 && c.t <= 3.5), calm = ofA.filter(c => c.t >= 3.75 && c.t <= 4.5);
if (busy.length && calm.length) assert.ok(Math.max(...busy.map(c => c.motion)) > Math.min(...calm.map(c => c.motion)), 'moving windows rank higher in motion');
assert.deepEqual(cands.filter(c => c.rid === 'b').map(c => [c.t, c.score, c.motion]), [[1, 0.2, null], [2, 0.2, null]], 'fallback: whole seconds from 1 s');
assert.deepEqual(cands.filter(c => c.rid === 'c'), [], 'no scores and no windows: nothing (fillers still cover the clip)');
// Without the host's FileSystem there is no data folder (the check then falls back).
assert.equal(X.cwvHostDataDir('x'), null);

// Planner: quick candidates join the any-role tier; calm ones go to the title opening and hold, moving ones to the
// montage. Analysed candidates (no motion) are unaffected, so plans of analysed footage do not change.
const pbox = { Math, Number, Object, Array, String, Set, Map, Infinity, NaN, Error, JSON, isFinite }; vm.createContext(pbox);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={cwvAllocate,cwvPlanBuild};', pbox);
const P = pbox.P;
const quick = (rid, t, motion, score = 0.5, dur = 30) => ({ rid, role: 'quick', t, score, motion, sourceDuration: dur });
const slots = [{ index: 0, role: 'street', section: 'opening', seconds: 0.9 }, { index: 1, role: 'park', section: 'montage', seconds: 0.9 }];
const alloc = P.cwvAllocate({ candidates: [quick('calm', 5, 0), quick('busy', 5, 1)], slots, seed: '1', photoShare: 0 });
assert.deepEqual(plain(alloc.picks.map(k => k.rid)), ['calm', 'busy']);
// A whole build from quick candidates only (an unanalysed Project): it plans, with no missing slots.
const many = [];
for (let k = 0; k < 8; k++) for (let w = 0; w < 10; w++) many.push(quick('v' + k, 1 + w * 2, ((k * 10 + w) % 7) / 6, 0.3 + (w % 3) * 0.1, 22));
const plan = P.cwvPlanBuild({ candidates: many, bpm: 100, fps: 30, montageShots: 7, seed: '1', burst: 'eighth' });
assert.equal(plan.ok, true);
assert.equal(plan.picks.filter(Boolean).length, plan.picks.length);

// Wiring: search.js hands back clips without analysis, the shared searchShots (Build and template run) checks them with
// quickScore, on one score scale, cancellable, within a time budget and with progress per clip; quickScore lives
// between the quick-score markers (the shared kit block replaces the placeholder unchanged).
const code = panel.slice(0, panel.indexOf('// STRINGS:BEGIN')) + panel.slice(panel.indexOf('// STRINGS:END'));
for (const phrase of ['local.push(...(r.local || []));', 'await scoreLocalClips(local, list.map((c) => c.score), check,', 'cwvScoreRange(searchedScores)',
  'controller.abort()', 'budgetMs: CWV_LOCAL_BUDGET_MS', 'concurrency: CWV_LOCAL_CONCURRENCY', 'dataDir: cwvHostDataDir(PLUGIN_ID)', 'onDone(p.done)',
  '// quick-score:start', '// quick-score:end', 'await quickScoreAll(']) assert.ok(code.includes(phrase), phrase);
// The kit block is pasted unchanged (tests/quick-score.test.cjs tests it; selects-app-kit tools/panel/quick-score.js).
const kitPath = path.join(require('node:os').homedir(), 'Workspaces', 'selects-app-kit', 'tools', 'panel', 'quick-score.js');
if (fs.existsSync(kitPath)) assert.equal(between('// quick-score:start', '// quick-score:end'), fs.readFileSync(kitPath, 'utf8').trim(), 'kit block verbatim');
assert.equal((code.match(/searchShots\(run, /g) || []).length, 3, 'Build and the template run (search, retry) all go through searchShots');
// Windows-safe: the quick check never uses the shell.
const local = between('// cwv-local:start', '// quick-score:end') + between('async function searchShots(', 'cwvScoreRange(searchedScores));\n}');
assert.ok(!/runShell|TOOL_PATH|\bnode\b /.test(local), 'no shell in the quick check');
console.log(JSON.stringify({ noAnalysis: 'ok', candidates: cands.length }));
