// plugins/mini-vlog/tests/punch.test.cjs
// Beat punch: samples the pure scale curve of assets/beat-punch.tsx (spec §15.2 b and c).
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'beat-punch.tsx'), 'utf8');
const a = src.indexOf('// mv-punch:start'), z = src.indexOf('// mv-punch:end');
assert.ok(a >= 0 && z > a, 'mv-punch markers');
const box = { Math, Number, Array, isFinite }; vm.createContext(box);
vm.runInContext(src.slice(a, z) + ';globalThis.S=mvPunchScale;globalThis.L=mvPunchLocal;globalThis.K=MV_PUNCH_PEAK;globalThis.U=MV_PUNCH_PUSH;', box);
const { S, L, K, U } = box;
const near = (x, y, eps, msg) => assert.ok(Math.abs(x - y) <= eps, (msg || '') + ': ' + x + ' vs ' + y);

assert.ok(src.includes('<Source />'), 'renders the clip');
assert.ok(src.includes('transformOrigin: "50% 50%"'), 'scales about the centre');
assert.equal(K, 0.06);
assert.equal(U, 0.03);

// 108 bpm at 30 fps: a fractional beat of 16.67 frames.
const beat = 30 * 60 / 108, dur = 60;
const punchy = (strength, extra = {}) => ({ strength, push: 1, punches: [0, 40], beatFrames: beat, durationFrames: dur, ...extra });

// Strength 0 is identity everywhere, on a punch clip and on a push-in clip alike.
for (let f = -5; f <= dur + 5; f += 0.5) {
  assert.equal(S(f, punchy(0)), 1, 'punch identity at ' + f);
  assert.equal(S(f, { strength: 0, push: 1, punches: [], beatFrames: beat, durationFrames: dur }), 1, 'push identity at ' + f);
}

// Strength 1: 1.00 at the punch start, the peak 1.06 exactly at 0.25 beat (ease-out up), back to 1.00 by 0.5 beat.
near(S(0, punchy(1)), 1, 1e-12, 'starts at 1');
near(S(0.25 * beat, punchy(1)), 1.06, 1e-12, 'peak at 0.25 beat');
near(S(40 + 0.25 * beat, punchy(1)), 1.06, 1e-12, 'second punch peak');
let maxUp = 0;
for (let f = 0; f <= Math.floor(0.25 * beat); f++) maxUp = Math.max(maxUp, S(f, punchy(1)));
assert.ok(maxUp >= 1.058 && maxUp <= 1.06 + 1e-12, 'integer-frame peak within the first 0.25 beat: ' + maxUp);
// Ease-out: more than half the rise in the first half of the rise.
assert.ok(S(0.125 * beat, punchy(1)) - 1 > 0.03, 'ease-out rise');
// Monotone up, then monotone down.
for (let f = 0; f < 0.25 * beat - 0.1; f += 0.1) assert.ok(S(f + 0.1, punchy(1)) >= S(f, punchy(1)) - 1e-12, 'rising at ' + f);
for (let f = 0.25 * beat; f < 0.5 * beat - 0.1; f += 0.1) assert.ok(S(f + 0.1, punchy(1)) <= S(f, punchy(1)) + 1e-12, 'falling at ' + f);
near(S(0.5 * beat, punchy(1)), 1, 1e-12, 'back at 0.5 beat');
for (let f = Math.ceil(0.5 * beat); f < 40; f++) assert.equal(S(f, punchy(1)), 1, 'rest between punches at ' + f);
// A clip with punches gets no push-in, even with push 1.
assert.equal(S(dur - 1, punchy(1)), 1, 'no push on a punch clip');
// Half strength: half the peak.
near(S(0.25 * beat, punchy(0.5)), 1.03, 1e-12, 'half strength peak');
// A punch that started just before the clip (a cut snapped past the downbeat) shows its tail.
const tail = { strength: 1, push: 1, punches: [-3], beatFrames: beat, durationFrames: dur };
near(S(0.25 * beat - 3, tail), 1.06, 1e-12, 'tail peak');
assert.ok(S(0, tail) > 1, 'tail at the cut');

// Push-in on a clip without punches: 1.00 -> 1.03 linearly across the clip, scaled by push and strength.
const push = (p, strength = 1) => ({ strength, push: p, punches: [], beatFrames: beat, durationFrames: dur });
near(S(0, push(1)), 1, 1e-12, 'push start');
near(S(dur - 1, push(1)), 1.03, 1e-12, 'push end');
near(S((dur - 1) / 2, push(1)), 1.015, 1e-12, 'push halfway');
for (let f = 1; f < dur; f++) assert.ok(S(f, push(1)) > S(f - 1, push(1)), 'push grows at ' + f);
near(S(dur - 1, push(0.5)), 1.015, 1e-12, 'push 0.5');
assert.equal(S(dur - 1, push(0)), 1, 'push 0 is none');
near(S(dur - 1, push(1, 0.5)), 1.015, 1e-12, 'push follows strength');
near(S(dur + 20, push(1)), 1.03, 1e-12, 'push holds past the end');

// Never below 1, for any input (bad, negative or huge values included).
const odd = [
  { strength: -1, push: -1, punches: [0], beatFrames: beat, durationFrames: dur },
  { strength: 5, push: 5, punches: [], beatFrames: beat, durationFrames: dur },
  { strength: 1, push: 1, punches: [0], beatFrames: 0, durationFrames: 0 },
  { strength: 'x', push: null, punches: 'no', beatFrames: NaN, durationFrames: -4 },
  {}, null, undefined];
for (const o of odd) for (let f = -30; f <= 90; f += 0.7) {
  const s = S(f, o);
  assert.ok(isFinite(s) && s >= 1 && s <= 1.06 + 0.03 + 1e-12, 'bounded at ' + f + ' for ' + JSON.stringify(o) + ': ' + s);
}
for (let f = -10; f <= 70; f += 0.3) assert.ok(S(f, punchy(1)) >= 1, 'never below 1');
// Strength and push are clamped to 0-1: strength 5 is strength 1.
near(S(0.25 * beat, punchy(5)), 1.06, 1e-12, 'strength clamps');
near(S(dur - 1, push(5)), 1.03, 1e-12, 'push clamps');

// Clip-local frame: useCurrentFrame() starts at the clip's source time, so the effect subtracts sourceStartFrame.
assert.equal(L(250, 240), 10);
assert.equal(L(240, 240), 0);
assert.equal(L(12, 0), 12);
assert.equal(L(12, undefined), 12, 'no offset given');
// Fallback: a frame before the source start means the host counted from 0 after all; use it as is.
assert.equal(L(5, 240), 5);

console.log(JSON.stringify({ punch: 'ok' }));
