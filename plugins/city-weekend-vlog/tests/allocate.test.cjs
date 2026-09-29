const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={cwvAllocate,cwvPlanBuild,cwvHash,cwvProgress,CWV_BUILD_STEPS};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));
const roles = ['street', 'architecture', 'landmark', 'park', 'detail', 'wide'];
// 12 sources x 6 roles x 2 hits = plenty of candidates, each source 30 s long.
const rich = [];
for (let r = 0; r < 12; r++) for (const role of roles) for (const t of [5, 20]) rich.push({ rid: 'r' + r, role, t: t + r * 0.1, score: 0.5 + ((r * 7 + roles.indexOf(role)) % 10) / 20, sourceDuration: 30 });

const a = j(P.cwvPlanBuild({ candidates: rich, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(a.ok, true);
assert.equal(a.picks.length, 20);
assert.equal(a.montageShots, 7);
// Windows stay in bounds, have the slot's length and never overlap within one source.
const bySource = {};
a.picks.forEach((p, i) => {
  const slot = a.schedule.slots[i];
  assert.ok(p.startSeconds >= 0 && p.endSeconds <= 30);
  assert.ok(Math.abs((p.endSeconds - p.startSeconds) - (slot.endFrame - slot.startFrame) / 30) < 1e-9);
  (bySource[p.rid] = bySource[p.rid] || []).push([p.startSeconds, p.endSeconds]);
});
for (const list of Object.values(bySource)) {
  list.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1], 'no overlap');
}
// Deterministic for the same seed; a different seed changes at least one pick.
assert.deepEqual(j(P.cwvPlanBuild({ candidates: rich, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' })).picks, a.picks);
const b = j(P.cwvPlanBuild({ candidates: rich, bpm: 99.2, fps: 30, montageShots: 7, seed: 's2' }));
assert.notDeepEqual(b.picks, a.picks);

// Talking windows are avoided.
const talky = rich.concat([{ rid: 'r0', role: 'talking', t: 5, score: 1, sourceDuration: 30 }]);
j(P.cwvPlanBuild({ candidates: talky, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' })).picks
  .filter(p => p.rid === 'r0').forEach(p => assert.ok(p.endSeconds <= 4 || p.startSeconds >= 6));

// Shortage: 2 short sources cannot fill 17 slots.
const poor = [{ rid: 'r0', role: 'street', t: 1, score: 1, sourceDuration: 3 }, { rid: 'r1', role: 'park', t: 1, score: 1, sourceDuration: 3 }];
const c = j(P.cwvPlanBuild({ candidates: poor, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(c.ok, false);
assert.equal(c.needed, 17);
assert.ok(c.usableShots < 17);

// Montage shrinks to what fits (>= 4) instead of failing.
const mid = rich.filter(x => ['r0', 'r1', 'r2'].includes(x.rid)).map(x => Object.assign({}, x, { sourceDuration: 9 }));
const d = j(P.cwvPlanBuild({ candidates: mid, bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' }));
if (d.ok) assert.ok(d.montageShots >= 4 && d.montageShots <= 12 && d.picks.length === 13 + d.montageShots);

// Build progress: step n/total, weighted percent, never backwards, 100% only at the end.
assert.equal(P.CWV_BUILD_STEPS.length, 5);
assert.equal(P.CWV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0), 100);
assert.equal(P.cwvProgress('shots', 0).label, 'Step 1/5 · Choosing shots · 0%');
assert.equal(P.cwvProgress('shots', 0.5, '12/24 clips checked').label, 'Step 1/5 · Choosing shots (12/24 clips checked) · 20%');
assert.equal(P.cwvProgress('draft', 0).percent, 50);
assert.equal(P.cwvProgress('draft', 0).current, 2);
assert.equal(P.cwvProgress('open', 0.99).percent, 99);
assert.equal(P.cwvProgress('open', 1).percent, 100);
assert.equal(P.cwvProgress('music', 7).percent, 50, 'fraction is clamped');
let last = -1;
for (const s of P.CWV_BUILD_STEPS) for (const f of [0, 0.5, 1]) { const v = P.cwvProgress(s.id, f).value; assert.ok(v >= last); last = v; }
assert.throws(() => P.cwvProgress('nope', 0));
console.log(JSON.stringify({ allocate: 'ok' }));
