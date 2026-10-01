// plugins/archive-vlog/tests/look.test.cjs
// Cinematic look: samples the pure pixel mapping (the exact maths of the SVG filter chain) and checks spec §6.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'cinematic-look.tsx'), 'utf8');
const a = src.indexOf('// av-look:start'), z = src.indexOf('// av-look:end');
assert.ok(a >= 0 && z > a, 'av-look markers');
const box = { Math, Number, isFinite }; vm.createContext(box);
vm.runInContext(src.slice(a, z) + ';globalThis.L={C:avLookChannel,T:avLookTable,S:avLookSpec,P:avLookPixel,St:avLookStrength,W:avLookWarmth,M:avLookSaturate};', box);
const { C, T, S, P, St, W, M } = box.L;
const px = (r, g, b, s, w) => [...P([r, g, b], s, w)];
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const near5 = (x, y, msg) => assert.ok(Math.abs(x - y) <= 2e-5, msg + ': ' + x + ' vs ' + y);

// Defaults and clamping.
assert.equal(St(undefined), 0.3);
assert.equal(St(null), 0.3);
assert.equal(St(5), 1);
assert.equal(St(-1), 0);
assert.equal(W(undefined), 1);
assert.equal(W(9), 2);
assert.equal(W(-1), 0);

// Strength 0 is identity: no filter, the curves and the pixel map return the input.
assert.equal(S(0, 1), null, 'strength 0 renders no filter');
assert.equal(S(0, 2), null);
for (let i = 0; i < 3; i++) for (let v = 0; v <= 1; v += 1 / 64) assert.equal(C(i, v, 0, 1.4), v);
for (let r = 0; r <= 1; r += 0.125) for (let g = 0; g <= 1; g += 0.125) for (let b = 0; b <= 1; b += 0.125)
  assert.deepEqual(px(r, g, b, 0, 1), [r, g, b]);

// Monotone curves and tables at every strength and warmth (the filter never inverts a tone).
for (const s of [0.1, 0.3, 0.45, 0.7, 1]) for (const w of [0, 1, 1.4, 2]) for (let i = 0; i < 3; i++) {
  for (let v = 0; v < 1; v += 1 / 1024) assert.ok(C(i, v + 1 / 1024, s, w) >= C(i, v, s, w) - 1e-12, `curve ${i} monotone at ${v} s ${s} w ${w}`);
  const t = [...T(i, s, w)];
  assert.equal(t.length, 33);
  for (let k = 1; k < t.length; k++) assert.ok(t[k] >= t[k - 1], `table ${i} monotone s ${s} w ${w}`);
  // Black point kept on every channel.
  assert.equal(t[0], 0);
}

// Black point kept through the whole filter: input 0 -> output <= 0.02 (here exactly 0), at any setting.
for (const s of [0.3, 1]) for (const w of [1, 2]) for (const o of px(0, 0, 0, s, w)) assert.ok(o <= 0.02, 'black kept');

const s = 0.3;
// Shadows neutral: greys at or below mid-grey stay grey (no tint), |R - B| tiny at 0.1, and no milky lift.
for (let i = 0; i <= 128; i++) {
  const v = i / 256, o = px(v, v, v, s, 1);
  assert.ok(Math.abs(o[0] - o[2]) < 1e-9 && Math.abs(o[0] - o[1]) < 1e-9, `neutral at ${v}: ${o}`);
}
const sh = px(0.1, 0.1, 0.1, s, 1.4);
assert.ok(Math.abs(sh[0] - sh[2]) <= 0.005, `shadow |R-B| ${sh}`);
assert.ok(sh[0] - 0.1 <= 2 / 255, `shadow lift ${(sh[0] - 0.1) * 255}/255`);
const deep = px(0.03, 0.03, 0.03, 1, 2);
assert.ok(deep[0] - 0.03 <= 2 / 255, 'deep shadows not lifted at full strength');

// Highlights warmer than the input at 0.3: R up, B down, R - B grows, on greys and on a warm skin/sky tone.
for (const v of [0.7, 0.8, 0.9]) {
  const o = px(v, v, v, s, 1);
  assert.ok(o[0] > v && o[2] < v && o[0] - o[2] > 0.02, `warm highlight at ${v}: ${o}`);
}
const skin = [0.85, 0.72, 0.62], so = px(...skin, s, 1);
assert.ok(so[0] - so[2] > skin[0] - skin[2], 'warm tone warmer');
// Warmth multiplies the highlight warmth only (shadows stay identical).
const hw = (w) => { const o = px(0.8, 0.8, 0.8, s, w); return o[0] - o[2]; };
assert.ok(hw(1.4) > hw(1) && hw(1) > hw(0), 'warmth scales the highlights');
assert.ok(Math.abs(hw(0)) < 1e-9, 'warmth 0: no tint');
assert.deepEqual(px(0.2, 0.3, 0.25, s, 2), px(0.2, 0.3, 0.25, s, 1), 'warmth leaves shadows alone');

// Mid-contrast softened: the slope of the grey ramp at mid-grey is below 1, the ends are kept.
const mid = (luma(px(0.55, 0.55, 0.55, s, 1)) - luma(px(0.45, 0.45, 0.45, s, 1))) / 0.1;
assert.ok(mid < 1 && mid > 0.9, `mid slope ${mid}`);
assert.ok(Math.abs(px(0.5, 0.5, 0.5, s, 1)[0] - 0.5) < 1e-9, 'mid-grey stays');

// Saturation lift at most 5 % (at full strength), on a mid-tone colour that the tone curves barely touch.
const m = [...M(1)];
assert.ok(Math.abs(m[0] - (0.213 + 0.787 * 1.05)) < 1e-5);
// The matrix scales every colour's distance from its luma by exactly 1 + 0.05 strength.
const lum709 = (c) => 0.213 * c[0] + 0.715 * c[1] + 0.072 * c[2];
for (const c of [[0.45, 0.3, 0.2], [0.2, 0.3, 0.45], [0.3, 0.45, 0.25]]) for (const st of [0.3, 1]) {
  const mm = [...M(st)], L0 = lum709(c);
  const o = [0, 1, 2].map(r => mm[r * 5] * c[0] + mm[r * 5 + 1] * c[1] + mm[r * 5 + 2] * c[2]);
  for (let i = 0; i < 3; i++) near5(o[i] - L0, (c[i] - L0) * (1 + 0.05 * st), `saturate ${c} ${st}`);
}
// Through the whole filter, chroma (channel spread) grows by at most 5 % (warmth 0 isolates the saturation).
const spread = (c) => Math.max(...c) - Math.min(...c);
for (const c of [[0.45, 0.3, 0.2], [0.2, 0.3, 0.45], [0.3, 0.45, 0.25], [0.6, 0.4, 0.3]]) {
  const r = spread(px(...c, 1, 0)) / spread(c);
  assert.ok(r <= 1.05 + 1e-4, `chroma ratio ${r} on ${c}`);
}
// Ramp mean luma barely moves (no exposure change).
let rb = 0, ra = 0;
for (let i = 0; i < 256; i++) { const v = i / 255; rb += v; ra += luma(px(v, v, v, s, 1)); }
assert.ok(Math.abs(ra - rb) / rb <= 0.02, 'ramp mean change');

// The component renders the filter from the same spec the mapping uses.
assert.ok(src.includes('<Source />'), 'renders the clip');
for (const needle of ['feComponentTransfer', 'feColorMatrix', 'type="table"', 'colorInterpolationFilters="sRGB"', 'avLookSpec(', 'url(#'])
  assert.ok(src.includes(needle), `tsx uses ${needle}`);
const hi8 = px(0.8, 0.8, 0.8, s, 1);
console.log(JSON.stringify({ look: 'ok', highlight080: hi8.map(x => +x.toFixed(4)), shadow010: sh.map(x => +x.toFixed(4)), midSlope: +mid.toFixed(4) }));
