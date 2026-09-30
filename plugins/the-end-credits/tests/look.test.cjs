// plugins/the-end-credits/tests/look.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'cinematic-look.tsx'), 'utf8');
const block = src.slice(src.indexOf('// tec-look:start'), src.indexOf('// tec-look:end'));
assert.ok(block.length > 100, 'tec-look markers present');
const box = { Math, Number, isFinite }; vm.createContext(box);
vm.runInContext(block + ';globalThis.L={tecLookChannel,tecLookPixel,tecLookTable,tecLookSaturateMatrix,tecLookWarmMatrix,tecLookMaskMatrix,tecLookStrength,TEC_LOOK_DEFAULT};', box);
const L = box.L, j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, msg + ': ' + a + ' vs ' + b);

assert.ok(src.includes('<Source />'), 'renders the clip');
assert.deepEqual([...src.matchAll(/from\s+"([^"]+)"/g)].map(m => m[1]).sort(), ['react', 'remotion']);
assert.ok(src.includes('colorInterpolationFilters="sRGB"'), 'the filter works in sRGB, like the maths');

// The filter: warm mask blend (arithmetic composites), overall saturation, then the tone tables, in that order.
const order = ['result="warmMuted"', 'result="warmMask"', 'result="keepMask"', 'result="kept"', 'result="muted"', 'result="blended"', 'result="desaturated"', '<feComponentTransfer in="desaturated">'];
order.reduce((at, k) => { const n = src.indexOf(k); assert.ok(n > at, 'filter order: ' + k); return n; }, -1);
assert.equal((src.match(/operator="arithmetic"/g) || []).length, 3, 'two products and a sum');

// Strength: default 0.5, clamps to 0-1.
assert.equal(L.TEC_LOOK_DEFAULT, 0.5);
assert.equal(L.tecLookStrength(undefined), 0.5);
assert.equal(L.tecLookStrength(-1), 0);
assert.equal(L.tecLookStrength(5), 1);

// Chroma (max - min) and Rec. 709 luma of a pixel.
const chroma = c => Math.max(...c) - Math.min(...c);
const luma = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

for (const s of [0, 0.3, 0.5, 1]) {
  // Black stays black, white stays near white.
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
  // No warm push anywhere on the grey ramp: red never ends above blue, and greys never gain red.
  for (let n = 0; n <= 64; n++) {
    const v = n / 64, o = L.tecLookPixel([v, v, v], s);
    assert.ok(o[0] <= o[2] + 1e-12 && o[0] <= v + 1e-12, 'no warm push at ' + v + ', strength ' + s + ': ' + o);
  }
  // Near-white highlights stay near white (soft, not dimmed): under 2 % off.
  L.tecLookPixel([0.95, 0.95, 0.95], s).forEach((v, i) => assert.ok(Math.abs(v - 0.95) < 0.02, 'near white ch' + i + ': ' + v));
}

// Strength 0 is the identity (the warm blend of a pixel with itself is exact).
for (let n = 0; n <= 20; n++) for (const rgb of [[n / 20, n / 20, n / 20], [n / 20, 0.3, 1 - n / 20], [1, n / 20, 0.1]]) L.tecLookPixel(rgb, 0).forEach((v, i) => near(v, rgb[i], 1e-12, 'identity'));
assert.deepEqual(j(L.tecLookSaturateMatrix(0)).map(v => Math.round(v * 1e9) / 1e9), [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]);
assert.ok(src.includes('if (s === 0) return'), 'strength 0 renders without a filter');
// The mask and its complement sum to 1 on every pixel, and the alpha row is a constant 1.
for (const rgb of [[1, 0.45, 0.1], [0.87, 0.62, 0.5], [0.2, 0.6, 0.65], [0.5, 0.5, 0.5], [1, 0, 0]]) {
  const m = L.tecLookMaskMatrix(false), k = L.tecLookMaskMatrix(true);
  const at = (M, c) => Math.max(0, Math.min(1, M[0] * c[0] + M[1] * c[1] + M[2] * c[2] + M[4]));
  near(at(m, rgb) + at(k, rgb), 1, 1e-12, 'mask + complement');
  assert.deepEqual(j(m.slice(15)), [0, 0, 0, 0, 1]); assert.deepEqual(j(k.slice(15)), [0, 0, 0, 0, 1]);
}

// Cool teal: mid grey at the default leans teal (blue and green above red), visibly (> 2/255) but not heavily (< 5 %).
const g = L.tecLookPixel([0.5, 0.5, 0.5], 0.5);
assert.ok(g[2] > g[0] + 2 / 255 && g[1] > g[0] && Math.abs(g[0] - 0.5) < 0.05, 'teal mid grey: ' + g);
// Shadows and mids lean teal at strength 1; highlights are slightly cool and a touch softer.
const sh = L.tecLookPixel([0.3, 0.3, 0.3], 1), hi = L.tecLookPixel([0.8, 0.8, 0.8], 1);
assert.ok(sh[0] < 0.3 && sh[2] > 0.3 && sh[1] > sh[0], 'teal shadows: ' + sh);
assert.ok(hi[2] > hi[0] && luma(hi) < 0.8 && luma(hi) > 0.77, 'soft cool highlights: ' + hi);
// Never a heavy grade: every tone channel moves under 10 % even at strength 1.
for (let n = 0; n <= 32; n++) for (let i = 0; i < 3; i++) assert.ok(Math.abs(L.tecLookChannel(i, n / 32, 1) - n / 32) < 0.1, 'bounded');
// Saturation -12 % at strength 1 (-6 % at the default).
{ const m = L.tecLookSaturateMatrix(1); near(m[0], 0.213 + 0.787 * 0.88, 1e-12, 'saturate 0.88'); }
{ const m = L.tecLookSaturateMatrix(0.5); near(m[0], 0.213 + 0.787 * 0.94, 1e-12, 'saturate 0.94'); }
// Hue-selective: a saturated orange loses far more chroma than a teal or a blue (which only get the overall -12 %
// plus the tone), and skin stays plausible (still r > g > b, at most ~25 % less chroma at strength 1).
const loss = (rgb, s) => 1 - chroma(L.tecLookPixel(rgb, s)) / chroma(rgb);
const orange = [1, 0.45, 0.1], red = [0.85, 0.15, 0.12], skin = [0.87, 0.62, 0.5], teal = [0.2, 0.6, 0.65], blue = [0.15, 0.3, 0.7];
assert.ok(loss(orange, 1) >= 0.4, 'orange chroma loss ' + loss(orange, 1));
assert.ok(loss(red, 1) >= 0.35, 'red chroma loss ' + loss(red, 1));
assert.ok(loss(orange, 0.5) >= 0.2, 'orange at the default ' + loss(orange, 0.5));
assert.ok(loss(teal, 1) < 0.15 && loss(blue, 1) < 0.15, 'cool colours keep their chroma: teal ' + loss(teal, 1) + ', blue ' + loss(blue, 1));
// (The teal tone itself also pulls warm colours towards cyan, so the chroma loss includes it.)
const darkSkin = [0.55, 0.38, 0.3];
for (const c of [skin, darkSkin]) for (const st of [0.5, 1]) { const o = L.tecLookPixel(c, st); assert.ok(o[0] > o[1] && o[1] > o[2], 'skin keeps its hue order: ' + c + ' -> ' + o); }
assert.ok(loss(skin, 0.5) > 0.05 && loss(skin, 0.5) <= 0.25, 'skin chroma loss at the default ' + loss(skin, 0.5));
assert.ok(loss(skin, 1) <= 0.4, 'skin chroma loss at strength 1 ' + loss(skin, 1));
assert.ok(loss(orange, 0.5) > 1.4 * loss(skin, 0.5), 'orange is muted much more than skin');
// Luma is roughly kept (a grade, not an exposure change): within 6 % on these colours at strength 1.
for (const c of [orange, red, skin, teal, blue]) assert.ok(Math.abs(luma(L.tecLookPixel(c, 1)) - luma(c)) < 0.06, 'luma kept ' + c);
console.log(JSON.stringify({ look: 'ok', midGrey05: g.map(v => +v.toFixed(4)), shadows1: sh.map(v => +v.toFixed(4)), highlights1: hi.map(v => +v.toFixed(4)),
  chromaLoss05: { orange: +loss(orange, 0.5).toFixed(3), skin: +loss(skin, 0.5).toFixed(3), teal: +loss(teal, 0.5).toFixed(3) },
  chromaLoss1: { orange: +loss(orange, 1).toFixed(3), red: +loss(red, 1).toFixed(3), skin: +loss(skin, 1).toFixed(3), teal: +loss(teal, 1).toFixed(3), blue: +loss(blue, 1).toFixed(3) } }));
