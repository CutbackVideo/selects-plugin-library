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

// Highlights warmer than the input at 0.3: R > G > B, B down, R - B > 0.02, on greys and on a warm skin/sky tone (red
// no longer rises above the input everywhere: the shoulder rolls every channel off near white).
for (const v of [0.7, 0.8, 0.9]) {
  const o = px(v, v, v, s, 1);
  assert.ok(o[0] > o[1] && o[1] > o[2] && o[2] < v && o[0] - o[2] > 0.02, `warm highlight at ${v}: ${o}`);
}
const skin = [0.85, 0.72, 0.62], so = px(...skin, s, 1);
assert.ok(so[0] - so[2] > skin[0] - skin[2], 'warm tone warmer');
// Warmth multiplies the highlight warmth only (shadows stay identical).
const hw = (w) => { const o = px(0.8, 0.8, 0.8, s, w); return o[0] - o[2]; };
assert.ok(hw(1.4) > hw(1) && hw(1) > hw(0), 'warmth scales the highlights');
assert.ok(Math.abs(hw(0)) < 1e-9, 'warmth 0: no tint');
assert.deepEqual(px(0.2, 0.3, 0.25, s, 2), px(0.2, 0.3, 0.25, s, 1), 'warmth leaves shadows alone');

// Mid-contrast softened: the slope of the grey ramp at mid-grey is below 1, the ends are kept (measured over +-0.01:
// further down, the shadow toe deliberately steepens the low mids).
const mid = (luma(px(0.51, 0.51, 0.51, s, 1)) - luma(px(0.49, 0.49, 0.49, s, 1))) / 0.02;
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
// Through the whole filter, chroma (channel spread) grows by at most 5 % where the shadow toe does not reach (all
// channels at or above mid-grey; warmth 0 isolates the saturation), at any strength. Below mid-grey the toe deepens
// the darker channels more, which adds up to 10 % chroma at 0.3 (richer shadows, like the reference).
const spread = (c) => Math.max(...c) - Math.min(...c);
for (const c of [[0.75, 0.6, 0.5], [0.5, 0.6, 0.75], [0.6, 0.75, 0.55], [0.8, 0.6, 0.5], [0.9, 0.7, 0.6]]) for (const st of [0.3, 1]) {
  const r = spread(px(...c, st, 0)) / spread(c);
  assert.ok(r <= 1.05 + 1e-4, `chroma ratio ${r} on ${c} at ${st}`);
}
for (const c of [[0.45, 0.3, 0.2], [0.2, 0.3, 0.45], [0.3, 0.45, 0.25], [0.6, 0.4, 0.3], [0.15, 0.1, 0.08]]) {
  const r = spread(px(...c, s, 0)) / spread(c);
  assert.ok(r <= 1.1, `shadow chroma ratio ${r} on ${c}`);
}
// Ramp mean luma: a little darker (the toe and the shoulder deepen shadows and soften white, toward the reference's
// density), bounded so the grade never reads as an exposure change: -0.5 % to -3 % at 0.3.
let rb = 0, ra = 0;
for (let i = 0; i < 256; i++) { const v = i / 255; rb += v; ra += luma(px(v, v, v, s, 1)); }
const rampChange = (ra - rb) / rb;
assert.ok(rampChange < -0.005 && rampChange > -0.03, 'ramp mean change ' + rampChange);

// --- Toe, shoulder and hue-masked desaturation (closer to the reference: deeper shadows, softer near-white, restrained
// greens/cyans, no blazing sunsets).
const greyOut = (v, st = s, w = 1) => px(v, v, v, st, w);
// Black point kept exactly; near-black not crushed (the toe starts with slope 0); shadows deeper below mid-grey.
for (const st of [0.3, 1]) assert.deepEqual(greyOut(0, st, 2), [0, 0, 0], 'black stays black');
for (const v of [0.01, 0.02, 0.04]) assert.ok(greyOut(v)[1] >= v - 0.5 / 255, `near-black kept at ${v}: ${greyOut(v)}`);
for (const v of [0.15, 0.25, 0.35]) assert.ok(greyOut(v)[1] < v - 0.005, `shadow deepened at ${v}: ${greyOut(v)}`);
near5(C(1, 0.25, s, 1), 0.25 + 0.12 * s / (2 * Math.PI) - 0.1 * s, 'toe peak at 0.25');
// Neutral greys stay neutral through mid-grey (|R - G|, |G - B| <= 0.01 at 0.3; in fact exact), and the warm tint
// above it is the highlight warmth only (warmth 0: neutral everywhere).
for (let i = 0; i <= 255; i++) {
  const v = i / 255, o = greyOut(v, s, 0);
  assert.ok(Math.abs(o[0] - o[1]) <= 1e-9 && Math.abs(o[1] - o[2]) <= 1e-9, `grey neutral without warmth at ${v}: ${o}`);
  if (v <= 0.5) { const q = greyOut(v); assert.ok(Math.abs(q[0] - q[1]) <= 0.01 && Math.abs(q[1] - q[2]) <= 0.01, `grey neutral at ${v}`); }
}
// White rolls off below 1.0 on every channel (more with strength), never far: >= 0.9 at 0.3.
for (const w of [0, 1, 1.4]) for (const o of greyOut(1, s, w)) assert.ok(o < 1 && o >= 0.9, `white rolled off ${o} w ${w}`);
assert.ok(greyOut(1, 1, 0)[1] < greyOut(1, s, 0)[1], 'more roll-off at full strength');
near5(greyOut(1, 1, 0)[1], 0.94, 'white at strength 1, warmth 0');
// Hue masks: 0 on every grey (both blends are the identity there), the complement exact.
const spec = S(s, 1), apply = (m, c) => [0, 1, 2].map(r => Math.max(0, Math.min(1, m[r * 5] * c[0] + m[r * 5 + 1] * c[1] + m[r * 5 + 2] * c[2] + m[r * 5 + 4])));
assert.equal(spec.blends.length, 2);
const maskOf = (b, c) => { const m = apply(b.mask, c); if (!b.gate) return m; const g = apply(b.gate, c); return m.map((v, i) => v * g[i]); };
const keepOf = (b, c) => apply(b.keep, b.gate ? maskOf(b, c) : c);
assert.equal(spec.blends[0].gate.length, 20); assert.equal(spec.blends[1].gate, null);
for (const b of spec.blends) for (let i = 0; i <= 32; i++) {
  const v = i / 32;
  assert.equal(maskOf(b, [v, v, v])[0], 0, 'mask 0 on grey ' + v);
  assert.equal(keepOf(b, [v, v, v])[0], 1, 'keep 1 on grey ' + v);
}
for (const c of [[0.2, 0.7, 0.3], [0.9, 0.4, 0.1], [0.3, 0.3, 0.3], [0.5, 0.45, 0.9], [0.1, 0.5, 0.65]]) for (const b of spec.blends)
  near5(maskOf(b, c)[0] + keepOf(b, c)[0], 1, 'mask + keep = 1 on ' + c);
// The blend stage alone (no saturation lift, no tone curve), to isolate the hue masks.
const blendOnly = (c, st = s) => { let o = c; for (const b of S(st, 1).blends) { const k = keepOf(b, o), m = maskOf(b, o), u = apply(b.muted, o); o = o.map((v, i) => Math.max(0, Math.min(1, Math.max(0, Math.min(1, v * k[i])) + Math.max(0, Math.min(1, u[i] * m[i]))))); } return o; };
const sp = (c) => Math.max(...c) - Math.min(...c);
// Green desat only affects green/cyan hues (G > R): reds, oranges, yellows, magentas, pure blues and greys are untouched by
// the green blend; greens and cyans lose chroma (up to 0.7 x 0.3 = 21 % at 0.3), more with strength.
// The green mask is gated by B - G, so blue skies (B well above G) are left alone too.
const greenBlend = (c, st = s) => {
  const b = S(st, 1).blends[0], g = apply(b.gate, c), m = apply(b.mask, c).map((v, i) => v * g[i]), k = apply(b.keep, m), u = apply(b.muted, c);
  return c.map((v, i) => Math.min(1, v * k[i] + u[i] * m[i]));
};
for (const c of [[0.9, 0.2, 0.2], [0.9, 0.5, 0.1], [0.9, 0.85, 0.2], [0.8, 0.2, 0.7], [0.2, 0.2, 0.9], [0.6, 0.6, 0.6], [0.85, 0.72, 0.62], [0.5, 0.45, 0.3],
  [0.55, 0.7, 0.95], [0.3, 0.5, 0.85], [0.6, 0.75, 1]])
  for (const [o, i] of greenBlend(c).map((o, i) => [o, i])) near5(o, c[i], `green blend leaves ${c}`);
for (const c of [[0.2, 0.7, 0.3], [0.3, 0.6, 0.15], [0.1, 0.6, 0.6], [0.15, 0.3, 0.1]]) {
  const r = sp(greenBlend(c)) / sp(c);
  assert.ok(r < 0.85 && r >= 0.79 - 1e-4, `green/cyan chroma ratio ${r} on ${c}`);
  assert.ok(sp(greenBlend(c, 1)) < sp(greenBlend(c)), 'stronger at full strength');
  // Hue kept: the channel order does not change.
  const o = greenBlend(c); assert.ok(o[1] >= o[0] && o[1] >= o[2] - 1e-9, 'still green/cyan');
}
// Orange knee: skin, amber and moderate warm tones untouched; a saturated sunset orange loses chroma.
const orangeBlend = (c, st = s) => { const b = S(st, 1).blends[1], k = apply(b.keep, c), m = apply(b.mask, c), u = apply(b.muted, c); return c.map((v, i) => Math.min(1, v * k[i] + u[i] * m[i])); };
for (const c of [[0.85, 0.72, 0.62], [0.9, 0.75, 0.55], [0.7, 0.5, 0.35], [0.2, 0.7, 0.3], [0.2, 0.3, 0.9], [0.5, 0.5, 0.5]])
  for (const [o, i] of orangeBlend(c).map((o, i) => [o, i])) near5(o, c[i], `orange knee leaves ${c}`);
for (const c of [[0.95, 0.45, 0.05], [1, 0.6, 0.1]]) {
  const r = sp(orangeBlend(c)) / sp(c);
  assert.ok(r < 0.9 && r >= 0.82 - 1e-4, `sunset chroma ratio ${r} on ${c}`);
}
assert.ok(sp(px(0.95, 0.45, 0.05, s, 1)) < sp(px(0.95, 0.45, 0.05, 0, 1)), 'a sunset orange ends less saturated through the whole filter');
assert.deepEqual(blendOnly([0.4, 0.4, 0.4]), [0.4, 0.4, 0.4]);
// The component builds both blends with arithmetic composites like THE END Credits' look.
for (const needle of ['feComposite', 'operator="arithmetic"', 'spec.blends.map', 'result="saturated"'])
  assert.ok(src.includes(needle), `tsx uses ${needle}`);
// The component renders the filter from the same spec the mapping uses.
assert.ok(src.includes('<Source />'), 'renders the clip');
for (const needle of ['feComponentTransfer', 'feColorMatrix', 'type="table"', 'colorInterpolationFilters="sRGB"', 'avLookSpec(', 'url(#'])
  assert.ok(src.includes(needle), `tsx uses ${needle}`);
const hi8 = px(0.8, 0.8, 0.8, s, 1);
console.log(JSON.stringify({ look: 'ok', rampChange: +rampChange.toFixed(4), white: greyOut(1).map(x => +x.toFixed(4)), grey025: greyOut(0.25).map(x => +x.toFixed(4)), highlight080: hi8.map(x => +x.toFixed(4)), shadow010: sh.map(x => +x.toFixed(4)), midSlope: +mid.toFixed(4) }));
