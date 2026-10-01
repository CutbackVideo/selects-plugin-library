// plugins/selfie-aesthetic/tests/effect.test.cjs
// The whip + look maths: extracts the marked block from both TSX files (they must be identical), evaluates it and
// checks ramps, short clips, coverage, the look filter (simulated on a neutral grey ramp) and, when an esbuild
// binary is around, bundles both components and renders them against stub React / remotion modules.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const assert = require('node:assert/strict'), cp = require('node:child_process'), Module = require('node:module');
const root = path.resolve(__dirname, '..');
const LOOK = path.join(root, 'assets', 'selfie-whip-look.tsx'), TRANS = path.join(root, 'assets', 'selfie-whip-transition.tsx');
const lookSrc = fs.readFileSync(LOOK, 'utf8'), transSrc = fs.readFileSync(TRANS, 'utf8');
const blockOf = s => { const a = s.indexOf('// sae-whip:start'), b = s.indexOf('// sae-whip:end'); assert.ok(a >= 0 && b > a, 'marked block'); return s.slice(a, b); };
const block = blockOf(lookSrc);
assert.equal(blockOf(transSrc), block, 'both files carry the identical sae-whip block');

const box = { Math, Number, isFinite }; vm.createContext(box);
vm.runInContext(block + ';globalThis.F={saeWhipAt,saeWhipFrames,saeLookFilter,saeWhipPose,saeNum,saeBlurStd,SAE_BLUR_BOX};', box);
// The transition's pose helper lives outside the block; evaluate it on top of the block.
const tp = transSrc.slice(transSrc.indexOf('export function saeWhipTransitionPose'), transSrc.indexOf('export default'));
vm.runInContext(tp.replace('export function', 'function') + ';globalThis.F.tpose=saeWhipTransitionPose;', box);
const F = box.F, j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, msg, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, msg + ': ' + a + ' vs ' + b);
const ID = { amount: 0, side: null, blurX: 0, blurY: 0, angleDeg: 0, txPct: 0, tyPct: 0, rotDeg: 0, scale: 1 };
const both = (kind, extra) => Object.assign({ whipIn: 1, whipOut: 1, kindIn: kind, kindOut: kind, angle: 30, whip: 1 }, extra || {});

// Frames per side: w = max(1, round(0.067 fps)).
for (const [fps, w] of [[15, 1], [23.976, 2], [24, 2], [25, 2], [29.97, 2], [30, 2], [45, 3], [50, 3], [59.94, 4], [60, 4]]) assert.equal(F.saeWhipFrames(fps), w, 'w at ' + fps);
assert.equal(F.saeWhipFrames(0), 2, 'unknown fps falls back to 30');

// Ramps: amount rises toward the cut on the tail, falls away from it on the head; identity elsewhere.
const ramps = { 1: [1], 2: [1, 0.6], 3: [1, 0.8, 0.6], 4: [1, 1 - 0.4 / 3, 1 - 0.8 / 3, 0.6] };
for (const fps of [15, 23.976, 25, 30, 45, 60]) for (const kind of ['dir', 'spin']) {
  const w = F.saeWhipFrames(fps), dur = 24, r = ramps[w];
  for (let f = 0; f < dur; f++) {
    const m = j(F.saeWhipAt(f, dur, fps, both(kind)));
    if (f < w) { assert.equal(m.side, 'in'); near(m.amount, r[f], `head ${fps} ${f}`); }
    else if (f >= dur - w) { assert.equal(m.side, 'out'); near(m.amount, r[dur - 1 - f], `tail ${fps} ${f}`); }
    else assert.deepEqual(m, ID, `identity at ${fps} f${f}`);
  }
}
// Out-of-range frames and empty clips are untouched.
for (const f of [-1, 24, 99, NaN]) assert.deepEqual(j(F.saeWhipAt(f, 24, 25, both('dir'))), ID);
assert.deepEqual(j(F.saeWhipAt(0, 0, 25, both('dir'))), ID);

// Exact maths at w = 2 (dir, angle 30, strength 1, 1080x1920, cover 1).
{
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
  for (const [f, side, a] of [[0, 'in', 1], [1, 'in', 0.6], [22, 'out', 0.6], [23, 'out', 1]]) {
    const m = F.saeWhipAt(f, 24, 25, both('dir')), dir = side === 'out' ? 1 : -1;
    near(m.blurX, 3.5 * a, 'blurX'); near(m.blurY, 0.08 * 3.5 * a, 'blurY ~8% of blurX');
    near(m.txPct, dir * 6 * a * c, 'tx along the angle (% of width)');
    near(m.tyPct, dir * 6 * a * s * 1080 / 1920, 'ty along the angle (% of height, same px length)');
    assert.equal(m.rotDeg, 0, 'dir has no rotation'); near(m.angleDeg, 30, 'angle');
    assert.ok(m.scale >= 1 + 0.08 * a - 1e-12, 'dir zoom at least 1 + 0.08 amount');
  }
}

// Consistent motion across the cut: in px along the angle, the outgoing tail and the incoming head keep moving
// forward (positions increase frame by frame through the cut), for both signs of the angle.
for (const angle of [-35, -25, 25, 35]) for (const kind of ['dir', 'spin']) {
  const th = angle * Math.PI / 180, along = m => m.txPct / 100 * 1080 * Math.cos(th) + m.tyPct / 100 * 1920 * Math.sin(th);
  const seq = [F.saeWhipAt(8, 10, 25, both(kind, { angle })), F.saeWhipAt(9, 10, 25, both(kind, { angle })),
    F.saeWhipAt(0, 10, 25, both(kind, { angle })), F.saeWhipAt(1, 10, 25, both(kind, { angle })), F.saeWhipAt(2, 10, 25, both(kind, { angle }))];
  for (let i = 1; i < seq.length; i++) if (i !== 2) assert.ok(along(seq[i]) > along(seq[i - 1]), 'moves forward ' + angle + ' ' + i);
  assert.ok(along(seq[1]) > 0 && along(seq[2]) < 0, 'tail ahead, head behind');
  if (kind === 'spin') {
    const sg = Math.sign(angle), rots = seq.map(m => m.rotDeg);
    near(rots[1], sg * 8, 'spin tail +8 deg with the angle sign'); near(rots[2], -sg * 8, 'spin head arrives from -8 deg');
    for (let i = 1; i < rots.length; i++) if (i !== 2) assert.ok(sg * rots[i] > sg * rots[i - 1], 'rotation keeps one direction');
  }
}

// Per-side angles (planner holds: angleIn / angleOut, alternating sign cut by cut). Clip j's tail and clip j + 1's
// head share the cut's angle, so the motion keeps its direction across every cut; a clip's head and tail can differ.
{
  const cuts = [31.2, -27.5, 33.9, -25.4]; // cut k between clip k and clip k + 1
  const clips = [0, 1, 2, 3, 4].map(k => ({ whipIn: k ? 1 : 0, whipOut: k < 4 ? 1 : 0, kindIn: k ? (k === 2 ? 'spin' : 'dir') : 'none',
    kindOut: k < 4 ? (k === 1 ? 'spin' : 'dir') : 'none', angle: k < 4 ? cuts[k] : cuts[3], angleIn: k ? cuts[k - 1] : 0, angleOut: k < 4 ? cuts[k] : 0, whip: 1 }));
  const dur = 10, fps = 25;
  for (let k = 0; k < 4; k++) {
    const a = cuts[k], th = a * Math.PI / 180;
    const along = m => m.txPct / 100 * 1080 * Math.cos(th) + m.tyPct / 100 * 1920 * Math.sin(th);
    const seq = [F.saeWhipAt(dur - 2, dur, fps, clips[k]), F.saeWhipAt(dur - 1, dur, fps, clips[k]),
      F.saeWhipAt(0, dur, fps, clips[k + 1]), F.saeWhipAt(1, dur, fps, clips[k + 1])];
    for (const m of seq) near(m.angleDeg, a, 'both sides of cut ' + k + ' use its angle');
    assert.ok(along(seq[0]) < along(seq[1]) && along(seq[1]) > 0 && along(seq[2]) < 0 && along(seq[2]) < along(seq[3]), 'continuous direction across cut ' + k);
    // The slide is colinear with the cut's direction on both sides (same unit vector, opposite ends).
    for (const m of [seq[1], seq[2]]) near(m.txPct / 100 * 1080 * Math.sin(th) - m.tyPct / 100 * 1920 * Math.cos(th), 0, 'colinear ' + k, 1e-6);
    if (k) assert.equal(Math.sign(cuts[k]), -Math.sign(cuts[k - 1]), 'alternating signs');
  }
  // Clip 1: head on cut 0 (+31.2), tail on cut 1 (-27.5).
  near(F.saeWhipAt(0, dur, fps, clips[1]).angleDeg, 31.2, 'head uses angleIn');
  near(F.saeWhipAt(dur - 1, dur, fps, clips[1]).angleDeg, -27.5, 'tail uses angleOut');
  // Spin on a per-side angle rotates with that side's sign (clip 1 tail spins with -27.5, clip 2 head arrives from +8).
  near(F.saeWhipAt(dur - 1, dur, fps, clips[1]).rotDeg, -8, 'spin tail follows angleOut sign');
  near(F.saeWhipAt(0, dur, fps, clips[2]).rotDeg, 8, 'spin head follows angleIn sign');
  // Fallback: without angleIn / angleOut both sides use angle (older data).
  const old = both('dir', { angle: -30 });
  near(F.saeWhipAt(0, dur, fps, old).angleDeg, -30, 'head falls back to angle');
  near(F.saeWhipAt(dur - 1, dur, fps, old).angleDeg, -30, 'tail falls back to angle');
  near(F.saeWhipAt(0, dur, fps, both('dir', { angle: 20, angleIn: 'x' })).angleDeg, 20, 'a non-number angleIn falls back');
}

// spin vs dir.
{
  const d = F.saeWhipAt(23, 24, 25, both('dir')), s = F.saeWhipAt(23, 24, 25, both('spin'));
  assert.equal(d.rotDeg, 0); near(s.rotDeg, 8, 'spin rotation');
  assert.ok(s.scale >= 1.12 && s.scale > d.scale, 'spin zooms more');
  near(s.blurX, d.blurX, 'same blur'); near(s.txPct, d.txPct, 'same slide');
  near(F.saeWhipAt(0, 24, 25, both('spin', { angle: -30 })).rotDeg, 8, 'negative angle: head rotates back from +8');
}

// First / last clip flags and kinds: whipIn 0 or kindIn 'none' leaves the head alone (likewise the tail).
for (const d of [{ whipIn: 0, kindIn: 'dir' }, { whipIn: 1, kindIn: 'none' }, { whipIn: 1 }]) {
  const data = Object.assign({ whipOut: 1, kindOut: 'dir', angle: 30 }, d);
  for (let f = 0; f < 22; f++) assert.deepEqual(j(F.saeWhipAt(f, 24, 25, data)), ID, 'no head ' + JSON.stringify(d));
  assert.equal(F.saeWhipAt(23, 24, 25, data).side, 'out');
}
for (const d of [{ whipOut: 0, kindOut: 'spin' }, { whipOut: 1, kindOut: 'none' }]) {
  const data = Object.assign({ whipIn: 1, kindIn: 'spin', angle: -30 }, d);
  for (let f = 2; f < 24; f++) assert.deepEqual(j(F.saeWhipAt(f, 24, 25, data)), ID, 'no tail ' + JSON.stringify(d));
  assert.equal(F.saeWhipAt(0, 24, 25, data).side, 'in');
}
// Strengths: per-side strength and the global multiplier scale the magnitudes, not the ramp; 0 is identity.
{
  const base = F.saeWhipAt(23, 24, 25, both('dir'));
  const half = F.saeWhipAt(23, 24, 25, both('dir', { whipOut: 0.5 }));
  const big = F.saeWhipAt(23, 24, 25, both('dir', { whip: 1.5 }));
  near(half.amount, 1, 'ramp unchanged'); near(half.blurX, base.blurX / 2, 'side strength'); near(big.blurX, base.blurX * 1.5, 'global multiplier');
  near(F.saeWhipAt(23, 24, 25, both('dir', { whip: 9, whipOut: 9 })).blurX, 3.5 * 2.25, 'clamps to 1.5 x 1.5');
  for (let f = 0; f < 24; f++) assert.deepEqual(j(F.saeWhipAt(f, 24, 25, both('spin', { whip: 0 }))), ID, 'whip 0');
}

// Short clips: head and tail never overlap; exact frames for 3, 2 and 1 frame clips.
const sides = (dur, fps, data) => Array.from({ length: dur }, (_, f) => F.saeWhipAt(f, dur, fps, data).side);
assert.deepEqual(sides(3, 25, both('dir')), ['in', null, 'out']);
assert.deepEqual(sides(2, 25, both('dir')), ['in', 'out']);
assert.deepEqual(sides(1, 25, both('dir')), ['out'], '1 frame, tie: the tail');
assert.deepEqual(sides(1, 25, both('dir', { whipIn: 1.2 })), ['in'], '1 frame: the stronger head');
assert.deepEqual(sides(1, 25, both('dir', { whipOut: 0 })), ['in']);
assert.deepEqual(sides(3, 25, both('dir', { whipIn: 0 })), [null, 'out', 'out'], 'one side keeps its full w');
near(F.saeWhipAt(0, 3, 25, both('dir')).amount, 1, '3 frames: head at full'); near(F.saeWhipAt(2, 3, 25, both('dir')).amount, 1, 'tail at full');
for (const fps of [15, 23.976, 30, 45, 60]) for (let dur = 1; dur <= 12; dur++) {
  const ss = sides(dur, fps, both('spin'));
  const lastIn = ss.lastIndexOf('in'), firstOut = ss.indexOf('out');
  assert.ok(lastIn < 0 || firstOut < 0 || lastIn < firstOut, 'no overlap ' + fps + ' ' + dur);
  assert.ok(ss.filter(Boolean).length >= Math.min(dur, 2), 'both cuts still whip when there is room');
}

// Coverage: no edge ever shows. The picture exactly covers the frame; the blur fades its own edges over 2 sigma
// along (and across) the blur axis; every frame corner mapped back through the outer transform (translate % of
// the box, rotate, scale) must land inside the opaque part. Checked with the native cover-crop applied after the
// effect (window = frame) and before it (window = frame / cover), with and without photo punch framing.
function covered(m, punch, W, H, cover, before) {
  const k = cover > 1 ? cover : 1;
  const tx = m.txPct / 100 * W, ty = (m.tyPct + (punch ? 4 / k : 0)) / 100 * H, sc = (punch ? 1.12 : 1) * m.scale;
  const th = m.angleDeg * Math.PI / 180, sx = m.blurX / 100 * W, sy = m.blurY / 100 * W;
  const fx = 2 * (sx * Math.abs(Math.cos(th)) + sy * Math.abs(Math.sin(th))), fy = 2 * (sx * Math.abs(Math.sin(th)) + sy * Math.abs(Math.cos(th)));
  const ww = before ? W / k : W, wh = before ? H / k : H, r = -m.rotDeg * Math.PI / 180;
  let worst = Infinity;
  for (const [cx, cy] of [[-ww / 2, -wh / 2], [ww / 2, -wh / 2], [-ww / 2, wh / 2], [ww / 2, wh / 2]]) {
    const ux = cx - tx, uy = cy - ty;
    const px = (ux * Math.cos(r) - uy * Math.sin(r)) / sc, py = (ux * Math.sin(r) + uy * Math.cos(r)) / sc;
    worst = Math.min(worst, W / 2 - fx - Math.abs(px), H / 2 - fy - Math.abs(py));
  }
  return worst; // px of overhang left (>= 0 means covered)
}
let maxScale = { dir: 0, spin: 0 };
for (const kind of ['dir', 'spin']) for (const angle of [-90, -60, -35, -30, -25, -10, 0, 10, 25, 30, 35, 60, 90])
  for (const st of [0.3, 1, 1.5]) for (const g of [0.7, 1, 1.5]) for (const [W, H] of [[1080, 1920], [1920, 1080], [1080, 1080]])
    for (const cover of [1, 1.333, 1.778]) for (const f of [0, 1, 2, 3, 20, 21, 22, 23]) {
      const m = F.saeWhipAt(f, 24, 60, both(kind, { angle, whipIn: st, whipOut: st, whip: g, cover, width: W, height: H }));
      if (W === 1080 && H === 1920 && cover === 1 && g === 1 && st === 1 && Math.abs(angle) <= 35) maxScale[kind] = Math.max(maxScale[kind], m.scale);
      for (const punch of [false, true]) for (const before of [false, true]) {
        const o = covered(m, punch, W, H, cover, before);
        assert.ok(o >= -1e-6, 'edge shows: ' + JSON.stringify({ kind, angle, st, g, W, H, cover, f, punch, before, o }));
      }
    }
// Punch framing alone keeps the frame covered (the 4% shift uses 4 of the 6% top/bottom overhang).
for (const cover of [1, 1.333, 1.778]) for (const before of [false, true]) {
  const o = covered(ID, true, 1080, 1920, cover, before);
  assert.ok(o >= 0, 'punch overhang ' + cover + ' ' + before);
}
near(covered(ID, true, 1080, 1920, 1, false), 0.02 * 1920 / 1.12, 'punch leaves 2% of the height at the top (in picture px)');

// Blur container: the rotated container (SAE_BLUR_BOX % of the clip's box on both axes) holds the upright frame
// counter-rotated by any planner angle (<= 35 deg) for box aspects from 9:16 to 16:9, and is smaller than the old 250%.
{
  const B = F.SAE_BLUR_BOX / 100;
  assert.ok(B < 2.5, 'smaller than 250%');
  for (const [W, H] of [[1080, 1920], [1080, 1080], [1920, 1080], [1080, 1350]]) for (let a = 0; a <= 35; a += 0.5) {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    assert.ok(c + s * H / W <= B && s * W / H + c <= B, 'container holds the rotated frame ' + W + 'x' + H + ' ' + a);
  }
  // stdDeviation in objectBoundingBox units of the container: x = blurX % of the box width over the container width
  // (no frame size needed); y = blurY % of the box width, converted with the box aspect.
  const m = F.saeWhipAt(23, 24, 25, both('dir'));
  const sd = j(F.saeBlurStd(m, 1080 / 1920));
  near(sd.x * B * 1080, m.blurX / 100 * 1080, 'x sigma in box px');
  near(sd.y * B * 1920, m.blurY / 100 * 1080, 'y sigma in box px');
  for (const [W, H] of [[720, 1280], [1080, 1920], [2160, 3840]]) near(j(F.saeBlurStd(m, W / H)).x * B * W, m.blurX / 100 * W, 'scales with the box ' + W);
  assert.deepEqual(j(F.saeBlurStd(F.saeWhipAt(10, 24, 25, both('dir')), 0.5625)), { x: 0, y: 0 }, 'identity: no blur');
}

// Look filter.
const L = (look, s) => j(F.saeLookFilter(look, s));
for (const look of ['none', 'nope', undefined]) assert.deepEqual(L(look, 1), { filter: '', overlay: null });
for (const look of ['soft-glow', 'night-glam', 'clean']) {
  assert.deepEqual(L(look, 0), { filter: '', overlay: null }, 'strength 0 is a no-op');
  assert.deepEqual(L(look, 0.35), L(look, 0.35), 'deterministic');
  assert.deepEqual(L(look, 5), L(look, 1), 'strength clamps to 1');
  assert.deepEqual(L(look, undefined), L(look, 0.35), 'default strength 0.35');
  assert.match(L(look, 0.35).filter, /^sepia\(\d\.\d{3}\) saturate\(\d\.\d{3}\) hue-rotate\(-?\d+\.\d{2}deg\) contrast\(\d\.\d{3}\) brightness\(\d\.\d{3}\)$/);
}
assert.equal(L('soft-glow', 1).filter, 'sepia(0.850) saturate(1.100) hue-rotate(-3.00deg) contrast(0.950) brightness(0.860)');
assert.deepEqual(L('soft-glow', 1).overlay, { color: '#ff7a9a', blend: 'lighten', opacity: 0.045 });
assert.equal(L('soft-glow', 0.35).filter, 'sepia(0.297) saturate(1.035) hue-rotate(-1.05deg) contrast(0.982) brightness(0.951)');

// Simulate CSS filter functions (Filter Effects spec matrices, clamped after each function) and the overlay's
// blend on a neutral grey ramp.
const clamp = v => Math.max(0, Math.min(1, v));
const mul = (m, c) => [0, 1, 2].map(i => clamp(m[i][0] * c[0] + m[i][1] * c[1] + m[i][2] * c[2]));
const FN = {
  sepia: (a, c) => { const k = 1 - a; return mul([[0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k], [0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k], [0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k]], c); },
  saturate: (s, c) => mul([[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s], [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s], [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]], c),
  'hue-rotate': (d, c) => { const r = d * Math.PI / 180, C = Math.cos(r), S = Math.sin(r); return mul([[0.213 + C * 0.787 - S * 0.213, 0.715 - C * 0.715 - S * 0.715, 0.072 - C * 0.072 + S * 0.928], [0.213 - C * 0.213 + S * 0.143, 0.715 + C * 0.285 + S * 0.140, 0.072 - C * 0.072 - S * 0.283], [0.213 - C * 0.213 - S * 0.787, 0.715 - C * 0.715 + S * 0.715, 0.072 + C * 0.928 + S * 0.072]], c); },
  contrast: (k, c) => c.map(v => clamp((v - 0.5) * k + 0.5)),
  brightness: (b, c) => c.map(v => clamp(v * b)),
};
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
function grade(look, strength, grey) {
  const { filter, overlay } = F.saeLookFilter(look, strength);
  let c = [grey, grey, grey];
  for (const [, name, arg] of filter.matchAll(/([a-z-]+)\(([-\d.]+)(?:deg)?\)/g)) { assert.ok(FN[name], 'simulatable: ' + name); c = FN[name](Number(arg), c); }
  if (overlay) {
    const C = hex(overlay.color);
    c = c.map((v, i) => { const t = overlay.blend === 'screen' ? 1 - (1 - v) * (1 - C[i]) : overlay.blend === 'lighten' ? Math.max(v, C[i]) : NaN; return v + (t - v) * overlay.opacity; });
  }
  return c.map(v => v * 255);
}
const luma = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const looks = {};
for (const look of ['soft-glow', 'night-glam', 'clean']) {
  const mid = grade(look, 1, 0.5), white = grade(look, 1, 1), black = grade(look, 1, 0);
  looks[look] = { midRB: +(mid[0] / mid[2]).toFixed(3), mid: mid.map(Math.round), whiteLuma: +luma(white).toFixed(1), blackLuma: +luma(black).toFixed(1), black: black.map(Math.round) };
}
{
  const g = looks['soft-glow'];
  assert.ok(g.midRB >= 1.25 && g.midRB <= 1.55, 'soft glow warm: mid-grey R/B ' + g.midRB);
  assert.ok(g.whiteLuma <= 220, 'soft glow rolls highlights off: ' + g.whiteLuma);
  assert.ok(Math.max(...grade('soft-glow', 1, 1)) <= 225, 'no channel near pure white');
  assert.ok(g.blackLuma >= 4, 'soft glow lifts blacks: ' + g.blackLuma);
  assert.ok(g.black[0] > g.black[1] && g.black[2] > g.black[1], 'rose-tinted blacks');
  for (let i = 1; i <= 10; i++) assert.ok(luma(grade('soft-glow', 1, i / 10)) > luma(grade('soft-glow', 1, (i - 1) / 10)), 'monotone ramp');
  const mild = grade('soft-glow', 0.35, 0.5); assert.ok(mild[0] / mild[2] > 1.08 && mild[0] / mild[2] < 1.25, 'default strength is gentle');
  const n = looks['night-glam'];
  assert.ok(n.mid[0] > n.mid[1] && n.mid[2] > n.mid[1], 'night glam magenta cast');
  assert.ok(n.blackLuma < g.blackLuma, 'night glam deeper blacks');
  assert.ok(luma(grade('night-glam', 1, 0.75)) - luma(grade('night-glam', 1, 0.25)) > luma(grade('soft-glow', 1, 0.75)) - luma(grade('soft-glow', 1, 0.25)), 'more contrast');
  const c = looks['clean'];
  assert.ok(c.midRB > 1 && c.midRB < 1.15, 'clean: mild warmth ' + c.midRB);
  assert.deepEqual(grade('none', 1, 0.5).map(Math.round), [128, 128, 128]);
}

// Transition pose: exiting = tail maths rising with progress, entering = head maths falling, entering fades in.
{
  const D = { kind: 'spin', angle: 30, strength: 1 };
  const ex = [0, 0.25, 0.5, 0.75, 1].map(p => F.tpose('exiting', p, D, 1080, 1920));
  const en = [0, 0.25, 0.5, 0.75, 1].map(p => F.tpose('entering', p, D, 1080, 1920));
  assert.deepEqual(j(ex[0].m), ID, 'exiting starts untouched'); assert.deepEqual(j(en[4].m), ID, 'entering ends untouched');
  for (let i = 1; i < 5; i++) { assert.ok(ex[i].m.amount >= ex[i - 1].m.amount); assert.ok(en[i].m.amount <= en[i - 1].m.amount); assert.ok(en[i].opacity >= en[i - 1].opacity); }
  assert.equal(ex[2].m.side, 'out'); assert.equal(en[2].m.side, 'in'); near(ex[4].m.rotDeg, 8, 'exit spin'); near(en[0].m.rotDeg, -8, 'enter spin');
  assert.equal(en[0].opacity, 0); assert.equal(en[4].opacity, 1); near(en[2].opacity, 0.5, 'cross-fade midpoint');
  assert.ok(ex.every(e => e.opacity === 1), 'exiting stays opaque underneath');
  assert.equal(F.tpose('exiting', 0.75, { kind: 'dir', angle: 30 }, 1080, 1920).m.rotDeg, 0);
}
assert.ok(lookSrc.includes('<Source />') && lookSrc.includes('children'), 'renders the clip');
assert.ok(!/from\s+["'](?!react["']|remotion["'])/.test(lookSrc + transSrc), 'react and remotion imports only');

// Bundle check and stub render (needs an esbuild binary on PATH or in ~/.npm/_npx).
function findEsbuild() {
  const names = process.platform === 'win32' ? ['esbuild.cmd', 'esbuild.exe', 'esbuild'] : ['esbuild'];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) for (const n of names) { const p = path.join(dir, n); if (dir && fs.existsSync(p)) return p; }
  const npx = path.join(os.homedir(), '.npm', '_npx');
  try { for (const d of fs.readdirSync(npx)) for (const n of names) { const p = path.join(npx, d, 'node_modules', '.bin', n); if (fs.existsSync(p)) return p; } } catch (e) { /* none */ }
  return null;
}
const esbuild = findEsbuild();
let bundle = 'skipped (no esbuild binary)';
if (esbuild) {
  const build = file => cp.execFileSync(esbuild, [file, '--bundle', '--format=cjs', '--platform=node', '--jsx=transform', '--log-level=error', '--external:react', '--external:remotion'], { encoding: 'utf8', shell: process.platform === 'win32' });
  // Stub React / remotion: createElement builds a plain tree; the frame and props are set per render.
  let frame = 0, ids = 0;
  const React = { createElement: (type, props, ...kids) => ({ type, props: Object.assign({}, props, { children: kids.flat() }) }), Fragment: 'Fragment', useRef: v => ({ current: v }), useId: () => ':r' + (ids++) + ':' };
  const remotion = { AbsoluteFill: 'AbsoluteFill', useCurrentFrame: () => frame, useVideoConfig: () => ({ fps: 25, width: 1080, height: 1920, durationInFrames: 999 }) };
  const load = code => { const m = new Module('sae'); const orig = Module._load; Module._load = (req, ...a) => req === 'react' ? React : req === 'remotion' ? remotion : orig(req, ...a); try { m._compile(code, 'sae.cjs'); } finally { Module._load = orig; } return m.exports; };
  const Look = load(build(LOOK)).default, Trans = load(build(TRANS)).default;
  const walk = (n, f) => { if (!n || typeof n !== 'object') return; f(n); for (const k of (n.props && n.props.children) || []) walk(k, f); };
  const find = (n, t) => { const out = []; walk(n, x => { if (x.type === t) out.push(x); }); return out; };
  const call = (C, props) => { const out = C(props); walk(out, x => { if (typeof x.type === 'function') { Object.assign(x, call(x.type, x.props)); } }); return out; };
  const Source = function Source() { return { type: 'video', props: {} }; };
  // [type, key, child index] from the root to the first node of type t (filter ids excluded: they differ per call).
  const pathTo = (root, t) => {
    const go = (n, acc) => {
      if (!n || typeof n !== 'object') return null;
      if (n.type === t) return acc;
      const kids = (n.props && n.props.children) || [];
      for (let i = 0; i < kids.length; i++) { const r = go(kids[i], acc.concat([[typeof kids[i] === 'object' && kids[i] ? kids[i].type : typeof kids[i], kids[i] && kids[i].props ? kids[i].props.key : undefined, i]])); if (r) return r; }
      return null;
    };
    return go(root, [[root.type, root.props.key, 0]]);
  };
  // The rotated container the blur filter is applied to.
  const blurBox = root => find(root, 'div').find(x => x.props.style && 'filter' in x.props.style);
  const data = { whipIn: 1, whipOut: 1, kindIn: 'dir', kindOut: 'spin', angle: 30, look: 'soft-glow', lookStrength: 0.35, framing: null, cover: 1 };
  frame = 10;
  let t = call(Look, { Source, data, rangeDurationInFrames: 24, sequenceFps: 25 });
  // Plain frame: the same tree as a whip frame (no remount of <Source /> at the whip edges), the filter idle.
  assert.equal(find(t, 'feGaussianBlur').length, 1, 'plain frame keeps the svg filter element');
  assert.equal(find(t, 'feGaussianBlur')[0].props.stdDeviation, '0 0', 'idle blur');
  assert.equal(blurBox(t).props.style.filter, 'none', 'plain frame: no filter applied');
  assert.match(blurBox(t).props.style.transform, /^rotate\(0\.000deg\)$/, 'plain frame: no rotation');
  assert.equal(t.props.style.transform, undefined, 'plain frame: no transform');
  const plainPath = pathTo(t, 'video');
  assert.equal(find(t, 'video').length, 1, 'renders <Source /> (expanded by the stub)');
  frame = 23;
  t = call(Look, { Source, data, rangeDurationInFrames: 24, sequenceFps: 25 });
  const f1 = find(t, 'filter'); assert.equal(f1.length, 1, 'whip frame: svg filter');
  assert.deepEqual(pathTo(t, 'video'), plainPath, 'the element path to <Source /> is the same on plain and whip frames');
  assert.match(blurBox(t).props.style.filter, /^url\(#/, 'whip frame: filter applied');
  for (const f of [0, 1, 2, 21, 22, 23]) { frame = f; assert.deepEqual(pathTo(call(Look, { Source, data, rangeDurationInFrames: 24, sequenceFps: 25 }), 'video'), plainPath, 'stable path f' + f); }
  frame = 23;
  assert.ok(find(t, 'feGaussianBlur')[0].props.stdDeviation.split(' ').length === 2);
  // Blur in the clip's own box: objectBoundingBox units, the fractions from saeBlurStd.
  assert.equal(f1[0].props.primitiveUnits, 'objectBoundingBox');
  { const sd = F.saeBlurStd(F.saeWhipAt(23, 24, 25, Object.assign({}, data, { width: 1080, height: 1920 })), 1080 / 1920);
    assert.equal(find(t, 'feGaussianBlur')[0].props.stdDeviation, sd.x.toFixed(6) + ' ' + sd.y.toFixed(6)); }
  { const bb = blurBox(t).props.style, up = find(blurBox(t), 'div').find(x => x !== blurBox(t)).props.style, B = F.SAE_BLUR_BOX;
    near(parseFloat(bb.width), B, 'container width', 1e-3); near(parseFloat(bb.height), B, 'container height', 1e-3);
    near(parseFloat(bb.left), -(B - 100) / 2, 'container centred', 1e-3);
    near(parseFloat(up.width) * B / 100, 100, 'upright box = the clip box', 1e-3); near((parseFloat(up.left) + parseFloat(up.width) / 2) * B / 100 + parseFloat(bb.left), 50, 'upright box centred', 1e-3); }
  assert.match(t.props.style.transform, /rotate\(8\.000deg\)/, 'tail spin');
  const t2 = call(Look, { Source, data, rangeDurationInFrames: 24, sequenceFps: 25 });
  assert.notEqual(find(t2, 'filter')[0].props.id, f1[0].props.id, 'unique filter id per instance');
  frame = 10;
  const p = call(Look, { Source, data: Object.assign({}, data, { framing: 'punch' }), rangeDurationInFrames: 24, sequenceFps: 25 });
  assert.equal(p.props.style.transform, 'translate(0.000%, 4.000%) rotate(0.000deg) scale(1.1200)', 'punch framing');
  const tr = call(Trans, { children: 'clip', presentationDirection: 'entering', presentationProgress: 0.25, data: { kind: 'dir', angle: -30 } });
  assert.equal(find(tr, 'feGaussianBlur').length, 1); near(tr.props.style.opacity, 0, 'entering hidden at 0.25');
  assert.equal(find(tr, 'filter')[0].props.primitiveUnits, 'objectBoundingBox');
  near(parseFloat(blurBox(tr).props.style.width), F.SAE_BLUR_BOX, 'transition container width', 1e-3);
  // The transition keeps one tree from progress 0 to 1 (the children never remount at its ends).
  const clipEl = { type: 'clip', props: {} };
  const tpath = (dir, p) => pathTo(call(Trans, { children: clipEl, presentationDirection: dir, presentationProgress: p, data: { kind: 'spin', angle: 30 } }), 'clip');
  for (const dir of ['entering', 'exiting']) {
    const ref = tpath(dir, 0.5);
    assert.ok(ref.length > 1, 'transition renders its children');
    for (const p of [0, 0.1, 0.9, 1]) assert.deepEqual(tpath(dir, p), ref, 'stable transition path ' + dir + ' ' + p);
  }
  const idle = call(Trans, { children: clipEl, presentationDirection: 'exiting', presentationProgress: 0, data: { kind: 'dir', angle: 30 } });
  assert.equal(blurBox(idle).props.style.filter, 'none', 'idle transition: no filter applied');
  bundle = 'ok (' + path.basename(path.dirname(path.dirname(path.dirname(esbuild)))) + ')';
}

console.log(JSON.stringify({ effect: 'ok', bundle, maxScale, looks }));
