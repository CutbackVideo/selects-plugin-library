// plugins/mini-vlog/tests/look.test.cjs
// Soft look: samples the pure pixel mapping (the exact maths of the SVG filter chain) and checks spec §14.9.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'soft-look.tsx'), 'utf8');
const a = src.indexOf('// mv-soft:start'), z = src.indexOf('// mv-soft:end');
assert.ok(a >= 0 && z > a, 'mv-soft markers');
const block = src.slice(a, z);
const box = { Math, Number }; vm.createContext(box);
vm.runInContext(block + ';globalThis.P=mvSoftParams;globalThis.S=mvSoftSpec;globalThis.M=mvSoftMap;', box);
const { P, S, M } = box;
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const near = (x, y, eps = 1e-9) => Math.abs(x - y) <= eps;

// Strength 0 is identity: neutral params, no filter, and the mapping returns the pixel unchanged.
assert.deepEqual({ ...P(0) }, { lift: 0, contrast: 1, warmth: 0, pinkThreshold: 0.6 });
assert.equal(S(0), null, 'strength 0 renders no filter');
assert.equal(S(-1), null);
for (let r = 0; r <= 1; r += 0.125) for (let g = 0; g <= 1; g += 0.125) for (let b = 0; b <= 1; b += 0.125)
  assert.deepEqual([...M(r, g, b, 0)], [r, g, b]);
// Clamped like CWV: above 1 is 1.
assert.deepEqual({ ...P(5) }, { ...P(1) });
// −8 % contrast at full strength.
assert.ok(near(P(1).contrast, 0.92));

const s = 0.35;
// Shadow lift at luma 0.05: slight, at most 6/255.
const lift05 = M(0.05, 0.05, 0.05, s)[0] - 0.05;
assert.ok(lift05 > 0 && lift05 <= 6 / 255, `shadow lift ${(lift05 * 255).toFixed(2)}/255`);

// Mean luma over a neutral grey ramp 0..1 (256 steps) rises by at most 4 %.
let before = 0, after = 0;
for (let i = 0; i < 256; i++) { const v = i / 255; before += v; after += luma(M(v, v, v, s)); }
const change = (after - before) / before;
assert.ok(change <= 0.04, `ramp mean change ${(change * 100).toFixed(2)} %`);
// Not a uniform exposure raise: the highlight end is not brightened.
assert.ok(luma(M(1, 1, 1, s)) <= 1 && luma(M(0.9, 0.9, 0.9, s)) <= 0.9 + 1e-9, 'highlights not raised');

// Tint only where luma > 0.6: greys at or below 0.6 stay neutral, above it they turn pink (R > B > G).
for (let i = 0; i <= 153; i++) { const v = i / 255, o = M(v, v, v, s); assert.ok(near(o[0], o[1]) && near(o[1], o[2]), `neutral at ${v}`); }
const hi = M(0.85, 0.85, 0.85, s);
assert.ok(hi[0] > hi[2] && hi[2] > hi[1], `pink highlight ${hi}`);
// A saturated colour whose channel exceeds 0.6 but whose luma does not gets no tint: it equals the plain grade.
const grade = (x) => Math.min(1, Math.max(0, P(s).contrast * x + (1 - P(s).contrast) * 0.5 + P(s).lift));
for (const c of [[1, 0, 0], [0, 0, 1], [1, 0, 1], [0.9, 0.5, 0.2]]) {
  assert.ok(luma(c) <= 0.6);
  assert.deepEqual([...M(c[0], c[1], c[2], s)].map(x => +x.toFixed(12)), c.map(x => +grade(x).toFixed(12)), `no tint on ${c}`);
}

// The component renders the filter from the same spec numbers the mapping uses.
const spec = S(s);
assert.ok(spec && near(spec.grade.slope, P(s).contrast));
assert.ok(src.includes('<Source />'), 'renders the clip');
for (const needle of ['feComponentTransfer', 'feColorMatrix', 'feComposite', 'operator="arithmetic"', 'colorInterpolationFilters="sRGB"', 'mvSoftSpec(', 'url(#'])
  assert.ok(src.includes(needle), `tsx uses ${needle}`);
console.log(JSON.stringify({ soft: 'ok', lift05: +(lift05 * 255).toFixed(2), rampMeanChangePct: +(change * 100).toFixed(2), pinkAt085: hi.map(x => +x.toFixed(4)) }));
