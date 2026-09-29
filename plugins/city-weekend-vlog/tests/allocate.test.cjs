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
assert.ok(c.usableShots < c.needed);

// (a) Limited footage: montage shrinks to what fits (>= 4) instead of failing; deterministic per seed.
const mk = (n, dur, roleList) => { const out = []; for (let r = 0; r < n; r++) for (const role of roleList) out.push({ rid: 'm' + r, role, t: dur / 2, score: 0.6, sourceDuration: dur }); return out; };
let shrunk = null;
for (let n = 8; n <= 40 && !shrunk; n++) {
  const r = j(P.cwvPlanBuild({ candidates: mk(n, 4, roles), bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' }));
  if (r.ok && r.montageShots < 12) shrunk = { n, r };
}
assert.ok(shrunk, 'some footage level shrinks the montage');
assert.ok(shrunk.r.montageShots >= 4 && shrunk.r.montageShots < 12);
assert.equal(shrunk.r.picks.length, 13 + shrunk.r.montageShots);
assert.ok(shrunk.r.picks.every(Boolean));
// (e) Determinism for the shrunk case.
assert.deepEqual(j(P.cwvPlanBuild({ candidates: mk(shrunk.n, 4, roles), bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' })), shrunk.r);

// (b) No footage for the first montage role (architecture) or its fallbacks: a later-role fallback still fills it.
const noArch = rich.filter(x => x.role !== 'architecture' && x.role !== 'landmark');
const e2 = j(P.cwvPlanBuild({ candidates: noArch, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(e2.ok, true);
assert.equal(e2.picks.length, 13 + e2.montageShots);

// (c) Street/detail-only footage still builds (last-resort tier).
const sd = rich.filter(x => x.role === 'street' || x.role === 'detail');
const e3 = j(P.cwvPlanBuild({ candidates: sd, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(e3.ok, true);
assert.equal(e3.picks.length, 13 + e3.montageShots);

// A preferred role wins over the last-resort tier even with a much lower score.
const pref = P.cwvAllocate({ candidates: [{ rid: 'a', role: 'wide', t: 5, score: 1, sourceDuration: 30 }, { rid: 'b', role: 'street', t: 5, score: 0, sourceDuration: 30 }], slots: [{ index: 0, role: 'street', seconds: 1 }], seed: 'x' });
assert.equal(pref.picks[0].rid, 'b');
// Non-finite candidate fields are ignored.
const bad = P.cwvAllocate({ candidates: [{ rid: 'a', role: 'street', t: NaN, score: 1, sourceDuration: 30 }, { rid: 'b', role: 'street', t: 5, score: Infinity, sourceDuration: 30 }], slots: [{ index: 0, role: 'street', seconds: 1 }], seed: 'x' });
assert.equal(bad.filled, 0);

// Live case: 4 short portrait sources where nobody talks. searchScenes still returns 4 talking hits per clip with
// scores comparable to the other roles; they must not block the footage, so the plan succeeds without the relax.
const live = [];
[12, 12, 11, 33].forEach((dur, r) => ['street', 'architecture', 'landmark', 'park', 'detail', 'wide', 'talking'].forEach((role, ri) => {
  for (let k = 0; k < 4; k++) {
    const t = Math.round(((k + 0.5) * dur / 4 + (ri - 3) * 0.3) * 10) / 10;
    live.push({ rid: 'v' + r, role, t, score: (role === 'talking' ? 0.15 : 0.10) + ((r * 13 + ri * 7 + k * 5) % 25) / 100, sourceDuration: dur });
  }
}));
const lv = j(P.cwvPlanBuild({ candidates: live, bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' }));
assert.equal(lv.ok, true);
assert.equal(lv.relaxedTalking, undefined);
assert.ok(lv.montageShots >= 4);
assert.equal(a.relaxedTalking, undefined);

// A clearly dominant talking hit (0.6 against 0.2 nearby) is still avoided; a comparable one is not.
const dom = talk => P.cwvAllocate({ candidates: [
  { rid: 'a', role: 'street', t: 5, score: 0.3, sourceDuration: 30 },
  { rid: 'a', role: 'street', t: 15, score: 0.2, sourceDuration: 30 },
  { rid: 'a', role: 'detail', t: 5.5, score: 0.2, sourceDuration: 30 },
  { rid: 'a', role: 'talking', t: 5, score: talk, sourceDuration: 30 }], slots: [{ index: 0, role: 'street', seconds: 1 }], seed: 'x' });
assert.equal(dom(0.6).picks[0].startSeconds, 14.5);
assert.equal(dom(0.32).picks[0].startSeconds, 4.5);
// With no other-role hit within 1 s, a talking hit blocks only when its own score reaches CWV_TALKING_MIN.
const lone = talk => P.cwvAllocate({ candidates: [
  { rid: 'a', role: 'street', t: 3.8, score: 0.3, sourceDuration: 30 },
  { rid: 'a', role: 'talking', t: 5, score: talk, sourceDuration: 30 }], slots: [{ index: 0, role: 'street', seconds: 1 }], seed: 'x' });
assert.equal(lone(0.35).filled, 0);
assert.equal(lone(0.2).filled, 1);

// Avoidance makes every length infeasible; the retry without it succeeds and says so.
const talkAll = mk(40, 4, roles).concat(Array.from({ length: 40 }, (_, r) => ({ rid: 'm' + r, role: 'talking', t: 2, score: 0.9, sourceDuration: 4 })));
const rx = j(P.cwvPlanBuild({ candidates: talkAll, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(rx.ok, true);
assert.equal(rx.relaxedTalking, true);
assert.equal(rx.picks.length, 13 + rx.montageShots);
assert.ok(rx.picks.every(Boolean));
assert.equal(P.cwvAllocate({ candidates: talkAll, slots: rx.schedule.slots.map(s => ({ index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / 30 })), seed: 's1' }).filled, 0);

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
