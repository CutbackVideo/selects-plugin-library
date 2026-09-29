// plugins/the-end-credits/tests/look.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'cinematic-look.tsx'), 'utf8');
const block = src.slice(src.indexOf('// tec-look:start'), src.indexOf('// tec-look:end'));
assert.ok(block.length > 100, 'tec-look markers present');
const box = { Math, Number, isFinite }; vm.createContext(box);
vm.runInContext(block + ';globalThis.L={tecLookChannel,tecLookPixel,tecLookTable,tecLookSaturateMatrix,tecLookStrength};', box);
const L = box.L, j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, msg + ': ' + a + ' vs ' + b);

assert.ok(src.includes('<Source />'), 'renders the clip');
assert.deepEqual([...src.matchAll(/from\s+"([^"]+)"/g)].map(m => m[1]).sort(), ['react', 'remotion']);
assert.ok(src.includes('colorInterpolationFilters="sRGB"'), 'the filter works in sRGB, like the maths');

// Strength: default 0.3, clamps to 0-1.
assert.equal(L.tecLookStrength(undefined), 0.3);
assert.equal(L.tecLookStrength(-1), 0);
assert.equal(L.tecLookStrength(5), 1);

for (const s of [0, 0.3, 0.5, 1]) {
  // Black stays black, white stays white (exactly; "near" allows float noise only).
  assert.deepEqual(j(L.tecLookPixel([0, 0, 0], s)), [0, 0, 0], 'black at ' + s);
  L.tecLookPixel([1, 1, 1], s).forEach((v, i) => near(v, 1, 2e-3, 'white ch' + i + ' at ' + s));
  for (let i = 0; i < 3; i++) {
    assert.equal(L.tecLookChannel(i, 0, s), 0, 'channel black');
    assert.equal(L.tecLookChannel(i, 1, s), 1, 'channel white');
    // Monotonic: the tone never inverts a gradient.
    for (let n = 1; n <= 255; n++) assert.ok(L.tecLookChannel(i, n / 255, s) >= L.tecLookChannel(i, (n - 1) / 255, s), 'monotonic ch' + i + ' at ' + s);
    const t = L.tecLookTable(i, s);
    assert.equal(t.length, 33); assert.equal(t[0], 0); assert.equal(t[32], 1);
  }
}

// Strength 0 is the identity.
for (let n = 0; n <= 20; n++) for (const rgb of [[n / 20, n / 20, n / 20], [n / 20, 0.3, 1 - n / 20]]) L.tecLookPixel(rgb, 0).forEach((v, i) => near(v, rgb[i], 1e-12, 'identity'));
assert.deepEqual(j(L.tecLookSaturateMatrix(0)).map(v => Math.round(v * 1e9) / 1e9), [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]);
assert.ok(src.includes('if (s === 0) return'), 'strength 0 renders without a filter');

// Mid-grey shifts subtly at the default: visible (> 1/255 on some channel) but under 3 %.
const g = L.tecLookPixel([0.5, 0.5, 0.5], 0.3), dg = g.map(v => v - 0.5);
assert.ok(Math.max(...dg.map(Math.abs)) > 1 / 255 && Math.max(...dg.map(Math.abs)) < 0.03, 'mid-grey subtle: ' + dg);
// Shadows lean teal (red down, blue up relative to red), highlights lean warm (red up, blue down).
const sh = L.tecLookPixel([0.25, 0.25, 0.25], 1), hi = L.tecLookPixel([0.75, 0.75, 0.75], 1);
assert.ok(sh[0] < 0.25 && sh[2] > sh[0] && sh[1] > sh[0], 'teal shadows: ' + sh);
assert.ok(hi[0] > 0.75 && hi[2] < 0.75 && hi[0] > hi[2], 'warm highlights: ' + hi);
// Never a heavy grade: every channel moves under 10 % even at strength 1.
for (let n = 0; n <= 32; n++) for (let i = 0; i < 3; i++) assert.ok(Math.abs(L.tecLookChannel(i, n / 32, 1) - n / 32) < 0.1, 'bounded');
// Saturation -8 % at strength 1, -2.4 % at 0.3: a saturated red loses chroma, its luma is kept.
{ const m = L.tecLookSaturateMatrix(1); near(m[0], 0.213 + 0.787 * 0.92, 1e-12, 'saturate 0.92'); }
{ const m = L.tecLookSaturateMatrix(0.3); near(m[0], 0.213 + 0.787 * 0.976, 1e-12, 'saturate 0.976'); }
console.log(JSON.stringify({ look: 'ok', midGrey03: g.map(v => +v.toFixed(4)), shadows1: sh.map(v => +v.toFixed(4)), highlights1: hi.map(v => +v.toFixed(4)) }));
