// plugins/torn-paper-love/tests/torn.test.cjs
// Pure helpers of the "Torn photo" effect, extracted from the TSX between markers and run with node:vm.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'assets', 'torn-photo.tsx'), 'utf8');
const between = (s, a, b) => {
  const i = s.indexOf(a), j = s.indexOf(b);
  assert.ok(i >= 0 && j > i, 'markers ' + a);
  return s.slice(i, j);
};
const block = between(src, '// tpl-torn:start', '// tpl-torn:end');
const box = { Math, Number, Array, String, JSON, Object, isFinite }; vm.createContext(box);
vm.runInContext(block + ';globalThis.T={tplHash,tplData,tplInsetRect,tplTornPolygon,tplGrow,tplRim,tplCentre,tplGeometry,tplClipPath,tplLookFilter,tplLocalFrame,tplPhaseAt,tplSlideY,tplMotion,tplPhotoFilter,tplTearStrips,tplBackdrop,TPL_W,TPL_H};', box);
const T = box.T, j = v => JSON.parse(JSON.stringify(v));
const W = 1440, H = 1080;
assert.equal(T.TPL_W, W); assert.equal(T.TPL_H, H);

// ---------- geometry utilities (test side) ----------
const bbox = pts => pts.reduce((b, [x, y]) => ({ x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
function inside(pt, poly) {
  let c = false;
  for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
    const [xi, yi] = poly[i], [xk, yk] = poly[k];
    if ((yi > pt[1]) !== (yk > pt[1]) && pt[0] < (xk - xi) * (pt[1] - yi) / (yk - yi) + xi) c = !c;
  }
  return c;
}
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
const distToPoly = (p, poly) => poly.reduce((m, a, i) => Math.min(m, segDist(p, a, poly[(i + 1) % poly.length])), Infinity);
const edgeSamples = (poly, per = 4) => {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    for (let s = 0; s < per; s++) out.push([a[0] + (b[0] - a[0]) * s / per, a[1] + (b[1] - a[1]) * s / per]);
  }
  return out;
};
const selfIntersects = poly => {
  const n = poly.length, cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < n; i++) for (let k = i + 2; k < n; k++) {
    if (i === 0 && k === n - 1) continue;
    const a = poly[i], b = poly[(i + 1) % n], c = poly[k], d = poly[(k + 1) % n];
    if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true;
  }
  return false;
};

// ---------- seeds and data defaults ----------
assert.equal(T.tplHash(123), 123);
assert.equal(T.tplHash('123'), 123, 'numeric strings are the same seed');
assert.equal(T.tplHash('rid-7:0'), T.tplHash('rid-7:0'));
assert.notEqual(T.tplHash('rid-7:0'), T.tplHash('rid-8:0'));
assert.ok(T.tplHash('x') >= 0 && T.tplHash('x') <= 0xffffffff);

const D = j(T.tplData(undefined));
assert.deepEqual(D, {
  seed: 0, vis: { x: 0, y: 0, w: 100, h: 100 }, inset: 0.88, edge: 1.4, backdrop: 'night', backdropColor: null,
  look: 0.35, tilt: 0, entry: 'none', exit: 'none', holdFrames: 0, phases: { entry: [], exit: [] },
  clock: 'clip', originFrame: 0, motion: 'off', motionStrength: 0.5, allowPhotoBackdrop: true,
});
const N = d => j(T.tplData(d));
assert.equal(N({ inset: 88 }).inset, 0.88, 'Photo size in percent');
assert.equal(N({ inset: 0.5 }).inset, 0.7, 'Photo size clamps to 70 %');
assert.equal(N({ inset: 99 }).inset, 0.95, 'Photo size clamps to 95 %');
assert.equal(N({ edge: 9 }).edge, 3); assert.equal(N({ edge: 0.1 }).edge, 0.5); assert.equal(N({ edge: 'x' }).edge, 1.4);
assert.equal(N({ look: 3 }).look, 1); assert.equal(N({ look: -1 }).look, 0); assert.equal(N({ look: 0 }).look, 0);
assert.equal(N({ tilt: 9 }).tilt, 5); assert.equal(N({ tilt: -9 }).tilt, -5);
assert.equal(N({ backdrop: 'weird' }).backdrop, 'night');
for (const b of ['night', 'red', 'kraft', 'photo']) assert.equal(N({ backdrop: b }).backdrop, b);
assert.equal(N({ backdrop: 'photo', allowPhotoBackdrop: false }).allowPhotoBackdrop, false);
assert.equal(N({ backdropColor: '#AA1122' }).backdropColor, '#aa1122');
assert.equal(N({ backdropColor: 'red; x' }).backdropColor, null);
assert.equal(N({ clock: 'source', originFrame: 90 }).clock, 'source');
assert.equal(N({ clock: 'nope' }).clock, 'clip');
assert.equal(N({ motion: 'spin' }).motion, 'off');
assert.equal(N({ motion: 'drift', motionStrength: 4 }).motionStrength, 1);
assert.deepEqual(N({ vis: { x: 12.5, y: 0, w: 75, h: 100 } }).vis, { x: 12.5, y: 0, w: 75, h: 100 });
assert.deepEqual(N({ vis: { x: 1, y: 2, w: 0, h: 50 } }).vis, { x: 0, y: 0, w: 100, h: 100 }, 'bad vis falls back to the whole box');
assert.equal(N({ seed: 'abc' }).seed, T.tplHash('abc'));

// ---------- torn polygon ----------
const rect = j(T.tplInsetRect(0.88, W, H));
assert.deepEqual(rect, { x: 86.4, y: 64.8, w: 1267.2, h: 950.4 });
const seeds = [1, 2, 3, 77, 4242, 'rid-a:1', 0xdeadbeef];
const counts = new Set();
for (const s of seeds) {
  const p = j(T.tplTornPolygon(s, rect));
  assert.ok(p.length >= 180 && p.length <= 260, 'vertex count ' + p.length);
  counts.add(p.length);
  assert.ok(p.every(v => v.length === 2 && isFinite(v[0]) && isFinite(v[1])), 'finite vertices');
  // Closed ring: the last vertex is not a repeat of the first, and the closing edge is an ordinary edge.
  const steps = p.map((v, i) => Math.hypot(p[(i + 1) % p.length][0] - v[0], p[(i + 1) % p.length][1] - v[1]));
  const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
  assert.ok(steps[steps.length - 1] > 0 && steps[steps.length - 1] < 3 * mean, 'closing edge');
  assert.ok(Math.max(...steps) < 3 * mean, 'no long jumps');
  assert.ok(!selfIntersects(p), 'no self-intersection, seed ' + s);
  // Displacement from the inset rectangle: wander ±1.2 % W + jag ±0.35 % W at most.
  const amp = (1.2 + 0.35) / 100 * W + 1e-6;
  const b = bbox(p);
  assert.ok(b.x0 >= rect.x - amp && b.x1 <= rect.x + rect.w + amp && b.y0 >= rect.y - amp && b.y1 <= rect.y + rect.h + amp, 'within the rect ± amplitude');
  // The polygon grown by the strip width stays inside vis at the defaults.
  const e = 1.4 / 100 * W;
  assert.ok(b.x0 >= e && b.y0 >= e && b.x1 <= W - e && b.y1 <= H - e, 'within vis expanded by the edge');
  // The shape really wanders: some vertices sit well outside and well inside the rectangle.
  const offs = p.map(([x, y]) => {
    const dx = Math.max(rect.x - x, x - rect.x - rect.w), dy = Math.max(rect.y - y, y - rect.y - rect.h);
    return Math.max(dx, dy);
  });
  assert.ok(Math.max(...offs) > 0.5 / 100 * W, 'wanders outward');
  assert.ok(Math.min(...offs) < -0.5 / 100 * W, 'wanders inward');
  // Deterministic.
  assert.deepEqual(j(T.tplTornPolygon(s, rect)), p, 'deterministic');
}
assert.ok(counts.size > 1, 'vertex count varies with the seed');
assert.notDeepEqual(j(T.tplTornPolygon(1, rect)), j(T.tplTornPolygon(2, rect)), 'different seeds differ');
assert.deepEqual(j(T.tplTornPolygon('5', rect)), j(T.tplTornPolygon(5, rect)), 'string and number seeds agree');

// ---------- paper, rim ----------
for (const s of [1, 2, 3, 'rid-a:1']) for (const edge of [0.5, 1.4, 3]) {
  const poly = j(T.tplTornPolygon(s, rect));
  const d = edge / 100 * W;
  const paper = j(T.tplGrow(poly, d, { seed: s }));
  assert.equal(paper.length, poly.length);
  assert.deepEqual(j(T.tplGrow(poly, d, { seed: s })), paper, 'grow deterministic');
  for (const pt of edgeSamples(poly)) assert.ok(inside(pt, paper), 'paper contains the photo outline');
  assert.ok(!selfIntersects(paper), 'paper outline simple');
  // Strip width (distance from each outer vertex to the inner outline): typical 1.2-1.6 % at the default, locally
  // up to ~2 %, never a hairline. At thin edges the inner edge's own teeth (±0.35 % W, fixed) widen the median.
  const widths = paper.map(v => distToPoly(v, poly)).sort((a, b) => a - b);
  const med = widths[widths.length >> 1], p95 = widths[Math.floor(widths.length * 0.95)];
  assert.ok(med >= 0.85 * d && med <= 1.6 * d, 'median width ' + (med / W * 100).toFixed(2) + ' % for edge ' + edge);
  assert.ok(widths[0] >= 0.5 * d, 'min width ' + widths[0]);
  if (edge === 1.4) {
    assert.ok(med / W * 100 >= 1.2 && med / W * 100 <= 1.6, 'default strip 1.2-1.6 % W: ' + (med / W * 100).toFixed(2));
    assert.ok(p95 / W * 100 <= 2.1, 'default strip locally up to ~2 % W: ' + (p95 / W * 100).toFixed(2));
    assert.ok(widths[widths.length - 1] / W * 100 <= 2.4, 'default strip never much over 2 % W');
  }
  // Rim: inside the paper, outside the photo outline; irregular width.
  const rim = j(T.tplRim(poly, d, { seed: s }));
  const c = j(T.tplCentre(poly));
  const r = (v) => Math.hypot(v[0] - c[0], v[1] - c[1]);
  for (let k = 0; k < poly.length; k++) {
    assert.ok(r(rim[k]) > r(poly[k]), 'rim outside the photo');
    assert.ok(r(rim[k]) < r(paper[k]), 'rim inside the paper');
  }
  const rw = rim.map(v => distToPoly(v, poly));
  assert.ok(Math.max(...rw) > 2 * Math.min(...rw), 'rim width is irregular');
}

// ---------- geometry bundle + clip path ----------
const g = j(T.tplGeometry(T.tplData({ seed: 9 })));
assert.deepEqual(g.poly, j(T.tplTornPolygon(9, rect)));
assert.equal(g.edgePx, 1.4 / 100 * W);
// The scaled photo (canvas scaled about its centre) covers the polygon's bounding box.
const gb = bbox(g.poly);
for (const [x, y] of [[gb.x0, gb.y0], [gb.x1, gb.y1], [gb.x0, gb.y1], [gb.x1, gb.y0]]) {
  assert.ok(Math.abs(x - W / 2) <= g.photoScale * W / 2 && Math.abs(y - H / 2) <= g.photoScale * H / 2, 'photo covers the torn shape');
}
assert.ok(g.photoScale > 0.88 && g.photoScale < 0.95, 'photo scale near the inset: ' + g.photoScale);
assert.equal(g.strips.length, 2);
// Clip path maps canvas px into the vis rectangle of the box (percent).
const cp = T.tplClipPath([[0, 0], [W, 0], [W, H], [0, H]], { x: 12.5, y: 0, w: 75, h: 100 });
assert.equal(cp, 'polygon(12.500% 0.000%, 87.500% 0.000%, 87.500% 100.000%, 12.500% 100.000%)');
assert.equal(T.tplClipPath([[720, 540]], { x: 0, y: 20, w: 100, h: 60 }), 'polygon(50.000% 50.000%)');

// ---------- look ----------
assert.equal(T.tplLookFilter(0), 'none');
assert.equal(T.tplLookFilter(-2), 'none');
assert.equal(T.tplLookFilter('x'), 'none');
assert.equal(T.tplLookFilter(5), T.tplLookFilter(1));
const parse = f => Object.fromEntries([...f.matchAll(/([a-z]+)\(([-0-9.]+)\)/g)].map(m => [m[1], Number(m[2])]));
let prev = null;
for (let i = 1; i <= 20; i++) {
  const s = i / 20, f = parse(T.tplLookFilter(s));
  assert.deepEqual(Object.keys(f), ['contrast', 'brightness', 'saturate', 'sepia']);
  const lift = f.brightness * (1 - f.contrast) / 2, slope = f.brightness * f.contrast;
  if (prev) {
    assert.ok(lift > prev.lift && slope < prev.slope && f.saturate < prev.sat && f.sepia > prev.sepia, 'monotone at ' + s);
  }
  prev = { lift, slope, sat: f.saturate, sepia: f.sepia };
}
{
  const f = parse(T.tplLookFilter(1));
  assert.ok(Math.abs(f.brightness * (1 - f.contrast) / 2 - 24 / 255) < 0.002, 'blacks lifted 24/255');
  assert.ok(Math.abs(f.brightness * f.contrast - 0.86) < 0.002, 'contrast -14 %');
  assert.equal(f.saturate, 0.82); assert.equal(f.sepia, 0.12);
}

// ---------- clocks ----------
assert.equal(T.tplLocalFrame(10, { clock: 'clip', originFrame: 90 }), 10);
assert.equal(T.tplLocalFrame(100, { clock: 'source', originFrame: 90 }), 10);
assert.equal(T.tplLocalFrame(10, {}), 10);
assert.equal(T.tplLocalFrame(10, undefined), 10);
assert.equal(T.tplLocalFrame(95, { clock: 'source' }), 95, 'missing origin = 0');

// ---------- phases ----------
// paper-flash at 30 fps (tplPhaseFrames shape): white 1, over 2, normal 1, full 2; glow-out 2 frames at the end.
const phases = {
  entry: [{ name: 'white', start: 0, end: 1 }, { name: 'over', start: 1, end: 3 }, { name: 'normal', start: 3, end: 4 }, { name: 'full', start: 4, end: 6 }],
  exit: [{ name: 'glow', start: 0, end: 2 }],
};
const at = (l, ph = phases, hold = 21) => j(T.tplPhaseAt(l, ph, hold));
assert.deepEqual(at(0), { name: 'white', i: 0, n: 1, side: 'entry' });
assert.deepEqual(at(1), { name: 'over', i: 0, n: 2, side: 'entry' });
assert.deepEqual(at(2), { name: 'over', i: 1, n: 2, side: 'entry' });
assert.deepEqual(at(3), { name: 'normal', i: 0, n: 1, side: 'entry' });
assert.deepEqual(at(5), { name: 'full', i: 1, n: 2, side: 'entry' });
assert.equal(at(6), null, 'end is exclusive');
assert.equal(at(18), null);
assert.deepEqual(at(19), { name: 'glow', i: 0, n: 2, side: 'exit' }, 'exit aligned to the clip end');
assert.deepEqual(at(20), { name: 'glow', i: 1, n: 2, side: 'exit' });
assert.equal(at(21), null, 'past the clip');
assert.equal(at(-1), null);
assert.equal(at(19, phases, 0), null, 'exit needs holdFrames');
assert.deepEqual(at(0, { exit: [{ name: 'glow', start: 0, end: 2 }] }, 2), { name: 'glow', i: 0, n: 2, side: 'exit' });
assert.deepEqual(at(0, { entry: [{ name: 'white', start: 0, end: 1 }], exit: [{ name: 'glow', start: 0, end: 2 }] }, 1), { name: 'white', i: 0, n: 1, side: 'entry' }, 'entry wins on overlap');
assert.equal(T.tplPhaseAt(0, undefined, 21), null); assert.equal(T.tplPhaseAt(0, {}, 21), null);
// Resampled at 25 fps with a gap-free, strictly increasing shape.
assert.deepEqual(at(4, { entry: [{ name: 'white', start: 0, end: 1 }, { name: 'over', start: 1, end: 2 }, { name: 'full', start: 2, end: 5 }] }), { name: 'full', i: 2, n: 3, side: 'entry' });

// Photo filter per phase: look + phase brightness; 'white' turns the photo into a white sheet.
assert.equal(T.tplPhotoFilter('none', null), 'none');
assert.equal(T.tplPhotoFilter('sepia(0.1)', null), 'sepia(0.1)');
assert.equal(T.tplPhotoFilter('sepia(0.1)', { name: 'normal', i: 0, n: 1 }), 'sepia(0.1)');
assert.equal(T.tplPhotoFilter('sepia(0.1)', { name: 'white', i: 0, n: 1 }), 'brightness(0) invert(1)');
assert.equal(T.tplPhotoFilter('none', { name: 'over', i: 0, n: 2 }), 'brightness(2.200)');
assert.equal(T.tplPhotoFilter('none', { name: 'over', i: 1, n: 2 }), 'brightness(1.500)');
assert.equal(T.tplPhotoFilter('none', { name: 'over', i: 0, n: 1 }), 'brightness(2.200)');
assert.equal(T.tplPhotoFilter('none', { name: 'over', i: 1, n: 3 }), 'brightness(1.850)');
assert.equal(T.tplPhotoFilter('sepia(0.1)', { name: 'glow', i: 0, n: 2 }), 'sepia(0.1) brightness(1.800)');

// ---------- slide ----------
const hold = 21;
assert.equal(T.tplSlideY(0, hold), -100);
assert.equal(T.tplSlideY(Math.floor(0.28 * hold), hold), -100, 'black until 0.28');
const ys = [];
for (let i = 0; i <= 1000; i++) ys.push(T.tplSlideY(i / 1000 * hold, hold));
for (let i = 1; i < ys.length; i++) assert.ok(ys[i] >= ys[i - 1], 'monotone');
for (let i = 1000 * 0.28 + 2; i < 1000 * 0.76 - 1; i++) assert.ok(ys[i + 1] - 2 * ys[i] + ys[i - 1] > 0, 'ease-in (accelerating) at ' + i);
for (let i = 760; i <= 1000; i++) assert.equal(ys[i], 0, 'landed after 0.76');
assert.ok(ys[500] < -50, 'ease-in: less than half way at the time midpoint');
assert.equal(T.tplSlideY(5, 0), 0, 'no hold: no slide');
assert.equal(T.tplSlideY(100, hold), 0);

// ---------- motion ----------
assert.deepEqual(j(T.tplMotion(0.5, 'off', 1)), { scale: 1, x: 0, y: 0 });
assert.deepEqual(j(T.tplMotion(0.5, 'push-in', 0)), { scale: 1, x: 0, y: 0 });
assert.equal(T.tplMotion(0, 'push-in', 1).scale, 1);
assert.ok(Math.abs(T.tplMotion(1, 'push-in', 1).scale - 1.08) < 1e-9);
assert.ok(Math.abs(T.tplMotion(0, 'pull-out', 1).scale - 1.08) < 1e-9);
assert.equal(T.tplMotion(1, 'pull-out', 1).scale, 1);
for (let i = 0; i <= 20; i++) for (const s of [0.25, 0.5, 1]) {
  const m = T.tplMotion(i / 20, 'drift', s);
  // Drift never exposes an edge: travel (in % of the photo) stays inside the overhang of the extra scale.
  assert.ok(Math.abs(m.x) <= (m.scale - 1) / 2 * 100 + 1e-9, 'drift overhang');
}
assert.ok(T.tplMotion(0, 'drift', 1).x < 0 && T.tplMotion(1, 'drift', 1).x > 0, 'drift travels');

// ---------- tear strips (§15.3) ----------
const vr = { x: 0, y: 0, w: W, h: H };
for (const s of [1, 2, 3, 99, 'rid-q:0']) {
  const st = j(T.tplTearStrips(s, vr));
  assert.equal(st.length, 2);
  assert.deepEqual(j(T.tplTearStrips(s, vr)), st, 'deterministic');
  const bands = [[0.30, 0.40], [0.60, 0.72]];
  st.forEach((k, i) => {
    assert.ok(k.cy >= bands[i][0] * H && k.cy <= bands[i][1] * H, 'strip ' + i + ' band');
    assert.ok(k.height >= 0.06 * H && k.height <= 0.09 * H, 'strip height');
    assert.ok(Math.abs(k.angle) <= 3, 'strip angle');
    for (const poly of [k.points, k.core]) {
      assert.ok(poly.length >= 40, 'jagged');
      for (const [x, y] of poly) assert.ok(x >= 0 && x <= W && y >= 0 && y <= H, 'inside vis');
    }
    // The white core sits inside the grey-rimmed outline.
    const bo = bbox(k.points), bc = bbox(k.core);
    assert.ok(bc.y0 >= bo.y0 && bc.y1 <= bo.y1, 'core inside outline');
    // It crosses the torn photo.
    assert.ok(bo.x0 <= rect.x && bo.x1 >= rect.x + rect.w, 'crosses the photo');
  });
}
assert.notDeepEqual(j(T.tplTearStrips(1, vr)), j(T.tplTearStrips(2, vr)));

// ---------- backdrops ----------
assert.equal(T.tplBackdrop('night', null).base, '#151113');
assert.equal(T.tplBackdrop('red', null).base, '#4a0f12');
assert.equal(T.tplBackdrop('kraft', null).base, '#6b5a45');
assert.ok(T.tplBackdrop('red', null).folds.length >= 6, 'red curtain has folds');
assert.equal(T.tplBackdrop('night', null).folds.length, 0);
assert.ok(T.tplBackdrop('night', null).grain > 0 && T.tplBackdrop('kraft', null).grain > T.tplBackdrop('night', null).grain);
assert.equal(T.tplBackdrop('red', '#102030').base, '#102030', 'colour override keeps the texture');
assert.ok(T.tplBackdrop('red', '#102030').folds.length >= 6);
assert.deepEqual(j(T.tplBackdrop('red', null)), j(T.tplBackdrop('red', null)), 'texture fixed across clips');
assert.equal(T.tplBackdrop('photo', null).base, '#151113', 'photo backdrop sits on night');

// ---------- render source checks ----------
const gated = between(src, '// tpl-photo-backdrop:start', '// tpl-photo-backdrop:end');
const outside = src.replace(gated, '');
assert.equal((outside.match(/<Source\b/g) || []).length, 1, 'exactly one <Source outside the photo-backdrop branch');
assert.equal((gated.match(/<Source\b/g) || []).length, 1, 'one more in the photo-backdrop branch');
assert.match(outside, /d\.backdrop === 'photo' && d\.allowPhotoBackdrop === true/, 'second render gated');
assert.ok(src.includes('export default function TornPhoto({ Source, children, data })'), 'contract signature');
assert.ok(!/useVideoConfig/.test(src), 'no layout from useVideoConfig');
assert.ok(!/[\u3131-\ud79d]/.test(src), 'no Hangul');
assert.ok(!src.includes('/Users/'), 'no local paths');
assert.ok(!/\d(\.\d+)?px/.test(src), 'no pixel units (the clip box size is unknown)');

console.log(JSON.stringify({ torn: 'ok' }));
