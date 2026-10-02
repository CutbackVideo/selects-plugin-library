// plugins/city-weekend-vlog/tests/no-analysis.test.cjs
// Builds without analysis: the quick local check's windows and candidates (cwv-local block), the planner's motion
// preference for quick-checked windows, and how the shared shot search wires the check in (Build and template run).
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const between = (a, b) => panel.slice(panel.indexOf(a), panel.indexOf(b) + b.length);
const box = { Math, Number, Object, Array, isFinite }; vm.createContext(box);
vm.runInContext(between('// cwv-local:start', '// cwv-local:end') + '\n;globalThis.X={cwvLocalWindows,cwvScoreRange,cwvLocalCandidates,cwvFlagged,CWV_LOCAL_EDGE,CWV_LOCAL_MAX_WINDOWS};', box);
const X = box.X;
const plain = v => JSON.parse(JSON.stringify(v));

// Windows: 1 s long from 0.5 s, never in the last 0.5 s; long clips are thinned evenly; very short clips get the middle.
assert.deepEqual(plain(X.cwvLocalWindows(4)), [{ start: 0.5, end: 1.5 }, { start: 1.5, end: 2.5 }, { start: 2.5, end: 3.5 }]);
const long = plain(X.cwvLocalWindows(300));
assert.equal(long.length, X.CWV_LOCAL_MAX_WINDOWS);
assert.ok(long[0].start === 0.5 && long[long.length - 1].end <= 299.5 && long[long.length - 1].start > 250, 'spread over the clip');
assert.deepEqual(plain(X.cwvLocalWindows(1.2)), [{ start: 0.3, end: 0.9 }]);
assert.deepEqual(plain(X.cwvLocalWindows(0.1)), []);

// One scale with the scene search: its 10th-90th percentile, or 0..1 without searched clips.
assert.deepEqual(plain(X.cwvScoreRange([])), { lo: 0, hi: 1 });
const r = X.cwvScoreRange([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1]);
assert.ok(Math.abs(r.lo - 0.2) < 1e-9 && Math.abs(r.hi - 1.0) < 1e-9);
const flat = X.cwvScoreRange([0.5, 0.5]);
assert.ok(Math.abs(flat.hi - flat.lo - 0.05) < 1e-9, 'a flat range is widened');

// Candidates: flagged windows and windows before 0.5 s are dropped; sharper, well-exposed windows score higher;
// motion is ranked 0..1 across the build; a clip without usable windows gets evenly spaced ones at the bottom.
assert.equal(X.cwvFlagged(['black']), true);
assert.equal(X.cwvFlagged({ black: false, fade: true }), true);
assert.equal(X.cwvFlagged({ black: false }), false);
assert.equal(X.cwvFlagged(null), false);
const results = [
  { rid: 'a', duration: 6, windows: [
    { start: 0.2, end: 1.2, sharp: 9, motion: 1, luma: 0.5 },
    { start: 1.5, end: 2.5, sharp: 9, motion: 0.1, luma: 0.5 },
    { start: 2.5, end: 3.5, sharp: 1, motion: 0.9, luma: 0.95 },
    { start: 3.5, end: 4.5, sharp: 8, motion: 0.5, luma: 0.02, flags: ['black'] }] },
  { rid: 'b', duration: 3, windows: null },
  { rid: 'c', duration: 5, windows: [{ start: 1, end: 2, sharp: 5, motion: 0.4, luma: 128 }] },
];
const cands = plain(X.cwvLocalCandidates(results, { lo: 0.2, hi: 0.6 }));
const ofA = cands.filter(c => c.rid === 'a');
assert.deepEqual(ofA.map(c => c.t), [2, 3], 'flagged and early windows dropped');
assert.ok(ofA[0].score > ofA[1].score, 'sharp, mid-grey beats blurry and bright');
assert.ok(ofA.every(c => c.role === 'quick' && c.sourceDuration === 6 && c.score >= 0.2 && c.score <= 0.6));
assert.deepEqual(ofA.map(c => c.motion), [0, 1], 'motion ranked across the build');
const ofB = cands.filter(c => c.rid === 'b');
assert.deepEqual(ofB.map(c => [c.t, c.score, c.motion]), [[1, 0.2, null], [2, 0.2, null]], 'fallback windows for a clip that could not be checked');
const ofC = cands.filter(c => c.rid === 'c');
assert.equal(ofC.length, 1);
assert.ok(Math.abs(ofC[0].motion - 0.5) < 1e-9 && ofC[0].score > 0.2, 'luma in 0..255 counts as mid-grey');
assert.deepEqual(plain(X.cwvLocalCandidates([{ rid: 'z', duration: 0.1, windows: null }], { lo: 0, hi: 1 })), [], 'no windows on a too-short clip');

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
  'controller.abort()', 'CWV_LOCAL_BUDGET_MS - (Date.now() - started)', 'CWV_LOCAL_CONCURRENCY', 'onDone(++done)', 'windows: cwvLocalWindows(item.duration)',
  '// quick-score:start', '// quick-score:end', 'async function quickScore(']) assert.ok(code.includes(phrase), phrase);
assert.equal((code.match(/searchShots\(run, /g) || []).length, 3, 'Build and the template run (search, retry) all go through searchShots');
// Windows-safe: the quick check never uses the shell.
const local = between('// cwv-local:start', '// quick-score:end') + between('async function searchShots(', 'return cwvLocalCandidates(results, cwvScoreRange(searchedScores));\n}');
assert.ok(!/runShell|TOOL_PATH|\bnode\b /.test(local), 'no shell in the quick check');
console.log(JSON.stringify({ noAnalysis: 'ok', candidates: cands.length }));
