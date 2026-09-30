// plugins/torn-paper-love/tests/transitions.test.cjs
// Transition placement over the 2N slots and phase resampling at other frame rates (spec 5, 15.8).
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={tplTransitions,TPL_PHASES,TPL_SLIDE,tplPhaseFrames};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));

// Placement.
const expectFor = N => {
  const e = Array.from({ length: 2 * N }, (_, i) => ({ index: i, entry: 'none', exit: 'none' }));
  e[0].entry = 'slide';
  e[1].entry = 'paper-flash'; e[1].exit = 'glow-out';
  if (N - 1 > 1) e[N - 1].entry = 'glow-in';
  e[2 * N - 1].entry = 'paper-flash-short';
  return e;
};
for (let N = 3; N <= 12; N++) {
  const t = j(P.tplTransitions(N));
  assert.equal(t.length, 2 * N);
  assert.deepEqual(t, expectFor(N), 'N=' + N);
  // Every kind appears exactly once and no slot gets two entries.
  for (const kind of ['slide', 'paper-flash', 'glow-in', 'paper-flash-short']) assert.equal(t.filter(x => x.entry === kind).length, 1, kind + ' N=' + N);
  assert.equal(t.filter(x => x.exit === 'glow-out').length, 1);
  assert.ok(!t.some(x => x.entry === 'tear' || x.exit === 'tear'), 'no tear N=' + N);
  // Everything except the named slots is a hard cut.
  assert.equal(t.filter(x => x.entry === 'none').length, 2 * N - (N - 1 > 1 ? 4 : 3), 'hard cuts N=' + N);
}
{
// Spot checks: pass-2 shot 4 of Standard (slot 10), which used to tear, is a hard cut.
assert.equal(P.tplTransitions(7)[10].entry, 'none');
assert.equal(P.tplTransitions(7)[6].entry, 'glow-in');
assert.equal(P.tplTransitions(7)[13].entry, 'paper-flash-short');
assert.equal(P.tplTransitions(3)[4].entry, 'none');
assert.equal(P.tplTransitions(3)[2].entry, 'glow-in');
assert.equal(P.tplTransitions(4)[6].entry, 'none');
assert.equal(P.tplTransitions(5)[8].entry, 'none');
assert.equal(P.tplTransitions(10)[13].entry, 'none');
}

// Phase tables (30 fps counts).
assert.deepEqual(j(P.TPL_PHASES), {
  'paper-flash': [['white', 1], ['over', 2], ['normal', 1], ['full', 2]],
  'paper-flash-short': [['flare', 3]],
  'glow-in': [['glow', 2]],
  'glow-out': [['glow', 2]],
});
// The last flash never whites out the card or the frame.
for (const [name] of P.TPL_PHASES['paper-flash-short']) assert.ok(name !== 'white' && name !== 'full', 'short flash has no ' + name);
// At 30 fps the phases are the table.
assert.deepEqual(j(P.tplPhaseFrames('paper-flash', 30)), [
  { name: 'white', start: 0, end: 1 }, { name: 'over', start: 1, end: 3 }, { name: 'normal', start: 3, end: 4 }, { name: 'full', start: 4, end: 6 },
]);
assert.deepEqual(j(P.tplPhaseFrames('paper-flash-short', 30)), [{ name: 'flare', start: 0, end: 3 }]);
assert.throws(() => P.tplPhaseFrames('tear', 30), /unknown transition/);
// Survives at 23.976 / 25 / 29.97 / 30: every phase at least one frame, strictly increasing, cumulative resampling,
// growth at most 2 frames over the resampled total.
for (const kind of Object.keys(P.TPL_PHASES)) {
  for (const fps of [23.976, 25, 29.97, 30, 60]) {
    const ph = j(P.tplPhaseFrames(kind, fps));
    const table = P.TPL_PHASES[kind];
    assert.equal(ph.length, table.length, kind + '@' + fps);
    assert.equal(ph[0].start, 0);
    let B = 0;
    ph.forEach((p, k) => {
      assert.equal(p.name, table[k][0]);
      assert.ok(p.end - p.start >= 1, kind + '@' + fps + ' phase ' + p.name + ' survives');
      if (k) assert.equal(p.start, ph[k - 1].end, 'contiguous');
      B += table[k][1];
      assert.ok(p.end >= Math.round(B * fps / 30), 'never earlier than the cumulative resample');
    });
    assert.ok(ph[ph.length - 1].end - Math.round(B * fps / 30) <= 2, kind + '@' + fps + ' grows at most 2 frames');
  }
}
// Concrete resamples: 25 fps paper-flash cumulative [1,3,4,6] -> [0.83,2.5,3.33,5] -> round [1,3,3,5] -> [1,3,4,5].
assert.deepEqual(j(P.tplPhaseFrames('paper-flash', 25)).map(p => p.end), [1, 3, 4, 5]);
// 23.976 fps paper-flash-short [3] -> [2.4] -> [2]; glow [2] -> [1.6] -> [2].
assert.deepEqual(j(P.tplPhaseFrames('paper-flash-short', 23.976)).map(p => p.end), [2]);
assert.deepEqual(j(P.tplPhaseFrames('glow-in', 23.976)).map(p => p.end), [2]);
// 60 fps doubles.
assert.deepEqual(j(P.tplPhaseFrames('paper-flash', 60)).map(p => p.end), [2, 6, 8, 12]);
// Slide is in fractions of the slot; none has no phases.
assert.deepEqual(j(P.TPL_SLIDE), { black: 0.28, land: 0.76 });
assert.deepEqual(j(P.tplPhaseFrames('slide', 30)), [{ name: 'black', start: 0, end: 0.28, fraction: true }, { name: 'slide', start: 0.28, end: 0.76, fraction: true }]);
assert.deepEqual(j(P.tplPhaseFrames('none', 30)), []);
assert.throws(() => P.tplPhaseFrames('bogus', 30));

console.log('transitions tests passed');
