// plugins/summer-trip/tests/effects.test.cjs — effect geometry, parameter schemas and the pure parts of the effects.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const block = (src, tag) => {
  const a = src.indexOf('// ' + tag + ':start'), b = src.indexOf('// ' + tag + ':end');
  assert.ok(a >= 0 && b > a, 'marker block ' + tag);
  return src.slice(a, b + ('// ' + tag + ':end').length);
};
const load = (code, names) => {
  const box = { Math, Number, String, Array, Object, isFinite, JSON };
  vm.createContext(box);
  vm.runInContext(code + '\n;globalThis.__x={' + names.join(',') + '};', box);
  return box.__x;
};
const j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, msg, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, msg + ': ' + a + ' vs ' + b);
const nearRect = (r, e, msg) => { for (const k of Object.keys(e)) near(r[k], e[k], msg + '.' + k); };

// ---------- geometry (the inlinable block is the module's whole logic) ----------
const geoSrc = read('effects-geometry.cjs');
const G = load(block(geoSrc, 'st-geometry'), ['stCanvasInBox', 'stGridPanelInset', 'stCoverScale', 'stRectInBox', 'stFitBox', 'ST_POSITION_Y_UP']);
const Gm = require(path.join(root, 'effects-geometry.cjs'));
assert.equal(typeof Gm.stCanvasInBox, 'function', 'module exports');
assert.ok(!/require\(/.test(block(geoSrc, 'st-geometry')), 'geometry block has no requires');
assert.equal(G.ST_POSITION_Y_UP, 1, 'position y is up (SDK doc; probe P1)');

const SOURCES = { '16:9': [1920, 1080], '9:16': [1080, 1920], '4:3': [4032, 3024], '3:2': [6000, 4000], '1:1': [898, 898], '4K 16:9': [3840, 2160] };
// Cover scales on the 1920x1080 canvas (the clip is conformed to fit first).
near(G.stCoverScale(1920, 1080), 1, 'cover 16:9');
near(G.stCoverScale(1080, 1920), 1920 / 607.5, 'cover 9:16');
near(G.stCoverScale(4032, 3024), 1920 / 1440, 'cover 4:3');
near(G.stCoverScale(6000, 4000), 1920 / 1620, 'cover 3:2');
near(G.stCoverScale(1920, 1080, 960, 540), 0.5, 'quadrant cover 16:9');

// canvasInBox for cover-scaled sources at the canvas centre.
nearRect(G.stCanvasInBox({ srcW: 1920, srcH: 1080, scale: 1, position: { x: 0, y: 0 } }), { x: 0, y: 0, w: 100, h: 100 }, '16:9');
nearRect(G.stCanvasInBox({ srcW: 1080, srcH: 1920, scale: G.stCoverScale(1080, 1920) }), { x: 0, w: 100, y: (1 - 1080 / 3413.3333333) / 2 * 100, h: 1080 / 3413.3333333 * 100 }, '9:16');
nearRect(G.stCanvasInBox({ srcW: 1080, srcH: 1920, scale: G.stCoverScale(1080, 1920) }), { y: 34.1796875, h: 31.640625 }, '9:16 literal');
nearRect(G.stCanvasInBox({ srcW: 4032, srcH: 3024, scale: G.stCoverScale(4032, 3024) }), { x: 0, y: 12.5, w: 100, h: 75 }, '4:3');
nearRect(G.stCanvasInBox({ srcW: 6000, srcH: 4000, scale: G.stCoverScale(6000, 4000) }), { x: 0, y: 7.8125, w: 100, h: 84.375 }, '3:2');
// An uncovered (fit) portrait: the canvas is wider than the box.
nearRect(G.stCanvasInBox({ srcW: 1080, srcH: 1920, scale: 1 }), { y: 0, h: 100, w: 1920 / 607.5 * 100, x: -(1920 / 607.5 - 1) / 2 * 100 }, '9:16 fit');
// Position: % of canvas height, +y up. Moving the clip right/up moves the canvas left/down inside the box.
nearRect(G.stCanvasInBox({ srcW: 1920, srcH: 1080, scale: 1, position: { x: 10, y: 10 } }), { x: -108 / 1920 * 100, y: 10, w: 100, h: 100 }, '16:9 moved');

// Every source gives the SAME canvas rectangle: map the returned box rect back to canvas pixels through the transform.
function boxToCanvas(srcW, srcH, scale, position, r) {
  const b = G.stFitBox(srcW, srcH), dw = b.w * scale, dh = b.h * scale;
  const cx = 960 + position.x / 100 * 1080, cy = 540 - position.y / 100 * 1080;
  return { x: cx - dw / 2 + r.x / 100 * dw, y: cy - dh / 2 + r.y / 100 * dh, w: r.w / 100 * dw, h: r.h / 100 * dh };
}
for (const [name, [w, h]] of Object.entries(SOURCES)) for (const extra of [1, 1.2]) for (const position of [{ x: 0, y: 0 }, { x: 3, y: -2 }]) {
  const scale = G.stCoverScale(w, h) * extra;
  const r = G.stCanvasInBox({ srcW: w, srcH: h, scale, position });
  nearRect(boxToCanvas(w, h, scale, position, r), { x: 0, y: 0, w: 1920, h: 1080 }, 'round trip ' + name);
  // The canvas rectangle is 16:9 in real pixels whatever the box aspect.
  const b = G.stFitBox(w, h);
  near((r.w / 100 * b.w) / (r.h / 100 * b.h), 16 / 9, 'canvas aspect ' + name);
}

// Grid panels: quadrant cover transform + insets.
const QUADS = { TL: [0, 0], TR: [960, 0], BR: [960, 540], BL: [0, 540] };
for (const q of Object.keys(QUADS)) {
  const land = G.stGridPanelInset({ srcW: 1920, srcH: 1080, quad: q });
  near(land.scale, 0.5, '16:9 quadrant scale');
  assert.deepEqual(j(land.insetPct), { top: 0, right: 0, bottom: 0, left: 0 }, '16:9 needs no mask ' + q);
  assert.equal(land.needsMask, false);
  near(land.position.x, (q === 'TL' || q === 'BL' ? -1 : 1) * 480 / 1080 * 100, q + ' position x');
  near(land.position.y, (q === 'TL' || q === 'TR' ? 1 : -1) * 25, q + ' position y (up)');
  // Portrait: full width, equal top/bottom crops. Photo 4:3 and 3:2: same shape, smaller crops.
  for (const [name, [w, h]] of [['9:16', SOURCES['9:16']], ['4:3', SOURCES['4:3']], ['3:2', SOURCES['3:2']], ['1:1', SOURCES['1:1']]]) {
    const g = G.stGridPanelInset({ srcW: w, srcH: h, quad: q });
    const b = G.stFitBox(w, h);
    near(g.scale, Math.max(960 / b.w, 540 / b.h), name + ' cover scale');
    assert.equal(g.needsMask, true, name + ' needs a mask');
    near(g.insetPct.left, 0, name + ' left'); near(g.insetPct.right, 0, name + ' right');
    near(g.insetPct.top, g.insetPct.bottom, name + ' centred crop');
    const vis = 100 - g.insetPct.top - g.insetPct.bottom; // visible % of the box height
    near(vis / 100 * b.h * g.scale, 540, name + ' visible height = quadrant height');
    // The unmasked part maps back exactly onto the quadrant.
    const r = { x: g.insetPct.left, y: g.insetPct.top, w: 100 - g.insetPct.left - g.insetPct.right, h: vis };
    nearRect(boxToCanvas(w, h, g.scale, g.position, r), { x: QUADS[q][0], y: QUADS[q][1], w: 960, h: 540 }, name + ' ' + q + ' round trip');
  }
  nearRect(G.stGridPanelInset({ srcW: 1080, srcH: 1920, quad: q }).insetPct, { top: 34.1796875, bottom: 34.1796875 }, 'portrait literal ' + q);
  nearRect(G.stGridPanelInset({ srcW: 4032, srcH: 3024, quad: q }).insetPct, { top: 12.5, bottom: 12.5 }, '4:3 literal ' + q);
}
// An ultra-wide source crops left/right instead.
{ const g = G.stGridPanelInset({ srcW: 2560, srcH: 1080, quad: 'TR' }); near(g.insetPct.top, 0, 'wide top'); assert.ok(g.insetPct.left > 0 && Math.abs(g.insetPct.left - g.insetPct.right) < 1e-6, 'wide crops sides'); }
// Caller-given transform is honoured.
{ const g = G.stGridPanelInset({ srcW: 1920, srcH: 1080, quad: 'TL', scale: 0.6, position: { x: -44.4444444444, y: 25 } }); near(g.scale, 0.6, 'given scale'); assert.equal(g.needsMask, true, 'overscaled 16:9 needs a mask'); }
// Unknown quadrant falls back to TL; bad sizes fall back to the canvas.
assert.equal(G.stGridPanelInset({ srcW: 1920, srcH: 1080, quad: 'XX' }).quad, 'TL');
nearRect(G.stCanvasInBox({ srcW: null, srcH: undefined }), { x: 0, y: 0, w: 100, h: 100 }, 'unknown size');

// ---------- effect sources: self-contained, only react + remotion ----------
for (const f of ['summer-look.tsx', 'film-frame.tsx', 'grid-panel.tsx', 'photo-motion.tsx', 'video-motion.tsx']) {
  const src = read('assets/' + f);
  const imports = [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map(m => m[1]);
  assert.deepEqual([...new Set(imports)].sort(), ['react', 'remotion'], f + ' imports');
  assert.ok(!/\brequire\(/.test(src), f + ' has no require');
  assert.ok(/export default function \w+\(\{ Source, children, data \}\)/.test(src), f + ' default export');
  assert.ok(src.includes('<Source />'), f + ' renders the clip');
  assert.ok(!/\{[^}]*\b(width|height)\b[^}]*\}\s*=\s*useVideoConfig\(\)/.test(src) || f === 'photo-motion.tsx', f + ' does not lay out with the sequence size');
}

// ---------- Summer look ----------
const lookSrc = read('assets/summer-look.tsx');
const L = load(block(lookSrc, 'st-look'), ['stLookParams', 'stLookTables', 'stLookCoolMatrix', 'stLookGrain', 'stLookTime', 'stLeakOutLayers', 'stLookFilterId', 'ST_LOOK_COOL_MASK']);
assert.deepEqual(j(L.stLookParams(undefined)), {
  strength: 0.45, grain: 0.35, leakOutSeconds: 0, leakStrength: 1, clipSeconds: null, sourceStartSeconds: 0, timeOrigin: 'clip',
  canvasInBox: { x: 0, y: 0, w: 100, h: 100 },
});
assert.equal(L.stLookParams({ strength: 5 }).strength, 1, 'strength clamps');
assert.equal(L.stLookParams({ strength: -1 }).strength, 0);
assert.equal(L.stLookParams({ strength: '0.5' }).strength, 0.5, 'numeric strings');
assert.equal(L.stLookParams({ strength: NaN }).strength, 0.45, 'NaN -> default');
assert.equal(L.stLookParams({ grain: 3 }).grain, 1, 'grain clamps');
assert.equal(L.stLookParams({ grain: 0 }).grain, 0, 'grain 0 is kept');
assert.equal(L.stLookParams({ strength: 0 }).strength, 0, 'zero is kept');
assert.equal(L.stLookParams({ timeOrigin: 'source' }).timeOrigin, 'source');
assert.equal(L.stLookParams({ timeOrigin: 'bogus' }).timeOrigin, 'clip');
for (const s of [0, 0.1, 0.3, 0.5, 1]) {
  const t = L.stLookTables(s);
  for (const ch of ['r', 'g', 'b']) {
    assert.equal(t[ch].length, 17);
    assert.equal(t[ch][0], 0, 'no black lift ' + ch + ' @' + s);
    assert.ok(t[ch][16] <= 1 && t[ch][16] >= 1 - 0.1 * s - 1e-9, 'whites roll off gently ' + ch + ' @' + s);
    for (let i = 1; i < 17; i++) assert.ok(t[ch][i] >= t[ch][i - 1], 'monotonic ' + ch + ' @' + s);
  }
  assert.ok(t.r[16] >= t.g[16] && t.g[16] >= t.b[16], 'a warm white @' + s);
  near(t.warm, 1 + 0.08 * s, 'warm saturation @' + s, 1e-3);
  const cm = t.cool.split(' ').map(Number);
  assert.equal(cm.length, 20, 'cool matrix is 4x5');
}
{ // Hue-split saturation: cyan desaturates (and turns toward teal) far more than orange; strength 0 is the identity.
  const apply = (m, c) => [0, 1, 2].map(r => m[r * 5] * c[0] + m[r * 5 + 1] * c[1] + m[r * 5 + 2] * c[2]);
  const sat = c => Math.max(...c) - Math.min(...c);
  const id = L.stLookCoolMatrix(0);
  assert.deepEqual(j(id.map(v => Math.round(v * 1e6) / 1e6 + 0)), [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0], 'identity at 0');
  const cyan = [0.1, 0.6, 0.8], cool = apply(L.stLookCoolMatrix(1), cyan);
  assert.ok(sat(cool) < 0.5 * sat(cyan), 'cyan loses saturation');
  assert.ok(cool[2] - cool[1] < cyan[2] - cyan[1], 'cyan moves toward teal');
  // The mask (alpha row) is 0 for warm colours and greys, high for cyan, partial for green.
  const row = L.ST_LOOK_COOL_MASK.split(/\s+/).map(Number).slice(15, 18);
  const mask = c => Math.max(0, Math.min(1, row[0] * c[0] + row[1] * c[1] + row[2] * c[2]));
  assert.equal(mask([0.9, 0.6, 0.3]), 0, 'orange keeps its saturation');
  assert.equal(mask([0.5, 0.5, 0.5]), 0, 'grey');
  assert.ok(mask([0.8, 0.65, 0.5]) === 0, 'skin / stone');
  assert.ok(mask([0.2, 0.7, 0.9]) > 0.9, 'cyan sky');
  const green = mask([0.4, 0.75, 0.2]);
  assert.ok(green > 0.3 && green < 0.9, 'neon green partly: ' + green);
}
{ // Grain: opacity grain * strength * 0.5, none at strength 0 or grain 0; the tile moves every frame.
  assert.equal(L.stLookGrain(5, L.stLookParams({ strength: 0 })), null);
  assert.equal(L.stLookGrain(5, L.stLookParams({ grain: 0 })), null);
  const g = L.stLookGrain(5, L.stLookParams({}));
  near(g.opacity, 0.35 * 0.45 * 0.5, 'default grain opacity', 1e-3);
  assert.ok(g.opacity < 0.12, 'restrained');
  assert.ok(/feTurbulence/.test(g.backgroundImage) && /%23g/.test(g.backgroundImage) && !/#/.test(g.backgroundImage), 'data URI noise tile (# escaped)');
  const pos = new Set([0, 1, 2, 3, 4, 5, 6, 7].map(f => L.stLookGrain(f, L.stLookParams({})).backgroundPosition));
  assert.ok(pos.size >= 7, 'animated: a new offset per frame');
  assert.deepEqual(j(L.stLookGrain(12, L.stLookParams({}))), j(L.stLookGrain(12, L.stLookParams({}))), 'deterministic per frame');
}
{ // strength 0 is the identity; strength 1 is a split tone (teal shadows, orange highlights) with an S-curve.
  const z = L.stLookTables(0), o = L.stLookTables(1);
  for (let i = 0; i <= 16; i++) for (const ch of ['r', 'g', 'b']) near(z[ch][i], i / 16, 'identity', 1e-4);
  assert.ok(o.r[5] < o.b[5] && o.r[5] < 5 / 16, 'shadows cool (less red than blue)');
  assert.ok(o.r[11] > o.b[11] && o.b[11] < 11 / 16, 'highlights warm (more red than blue)');
  assert.ok(o.g[4] < 4 / 16 && o.g[12] > 12 / 16, 'S-curve');
  near(o.g[8], 0.5, 'midpoint about fixed', 0.03);
}
assert.notEqual(L.stLookFilterId(0.3), L.stLookFilterId(0.5), 'filter ids differ by strength');
assert.ok(/strength > 0/.test(lookSrc) && /"none"/.test(lookSrc), 'strength 0 renders no filter');
// Time origin.
near(L.stLookTime(30, 30, L.stLookParams({})), 1, 'clip time');
near(L.stLookTime(30, 30, L.stLookParams({ timeOrigin: 'source', sourceStartSeconds: 4 })), -3, 'source time');
// Transition leak: only in the last leakOutSeconds, independent of strength, scaled by leakStrength.
{
  const base = { leakOutSeconds: 0.125, clipSeconds: 1, leakStrength: 1 };
  assert.deepEqual(j(L.stLeakOutLayers(0.5, L.stLookParams(base))), [], 'no leak before the window');
  assert.deepEqual(j(L.stLeakOutLayers(0.95, L.stLookParams({ ...base, leakOutSeconds: 0 }))), [], 'no leak without leakOutSeconds');
  assert.deepEqual(j(L.stLeakOutLayers(0.95, L.stLookParams({ leakOutSeconds: 0.125 }))), [], 'no leak without clipSeconds');
  assert.deepEqual(j(L.stLeakOutLayers(0.95, L.stLookParams({ ...base, leakStrength: 0 }))), [], 'leakStrength 0 removes it');
  for (const t of [0.875, 0.9, 0.95, 0.99]) {
    const a = L.stLeakOutLayers(t, L.stLookParams({ ...base, strength: 0 }));
    const b = L.stLeakOutLayers(t, L.stLookParams({ ...base, strength: 1 }));
    assert.equal(a.length, 4, 'leak drawn at strength 0');
    assert.deepEqual(j(a), j(b), 'leak independent of strength');
    assert.ok(a.every(l => l.mixBlendMode === 'screen' || l.mixBlendMode === 'overlay'));
  }
  const early = L.stLeakOutLayers(0.876, L.stLookParams(base)), late = L.stLeakOutLayers(0.995, L.stLookParams(base));
  const at = l => Number(/at ([\d.]+)%/.exec(l.find(x => x.key === 'bloom').background)[1]);
  assert.ok(at(late) < at(early) && at(late) < 50, 'bloom travels toward the left/centre');
  const alpha = l => Number(/rgba\(255,228,170,([\d.]+)\)/.exec(l.find(x => x.key === 'bloom').background)[1]);
  assert.ok(alpha(late) > alpha(early) && alpha(late) > 0.8, 'bloom builds up to a bright warm peak');
  // Never a near-white frame: every leak colour stop is warm (blue well under red), the bloom core is amber.
  for (const t of [0.876, 0.95, 0.999]) for (const l of L.stLeakOutLayers(t, L.stLookParams(base)))
    for (const m of l.background.matchAll(/rgba\((\d+),(\d+),(\d+),/g)) assert.ok(Number(m[3]) <= 180 && Number(m[1]) - Number(m[3]) >= 75, 'warm stop ' + m[0]);
  const half = L.stLeakOutLayers(0.95, L.stLookParams({ ...base, leakStrength: 0.5 })), full = L.stLeakOutLayers(0.95, L.stLookParams(base));
  assert.ok(alpha(half) < alpha(full), 'leakStrength scales');
}

// ---------- Video motion ----------
{
  const vmSrc = read('assets/video-motion.tsx');
  const V = load(block(vmSrc, 'st-vmotion'), ['stVMotionParams', 'stVMotionScale']);
  assert.deepEqual(j(V.stVMotionParams(undefined)), { strength: 1, clipSeconds: null, sourceStartSeconds: 0, timeOrigin: 'clip' });
  assert.equal(V.stVMotionParams({ strength: 9 }).strength, 2, 'strength clamps');
  const p = V.stVMotionParams({ clipSeconds: 2 });
  assert.equal(V.stVMotionScale(0, 30, p), 1, 'starts at 1');
  near(V.stVMotionScale(59, 30, p), 1.04, 'ends at 1.04 on the last frame');
  near(V.stVMotionScale(99, 30, p), 1.04, 'holds after the end');
  near(V.stVMotionScale(29.5, 30, p), 1.02, 'eased: half way at the middle');
  assert.ok(V.stVMotionScale(5, 30, p) - 1 < 0.1 * 0.04 * 1.5, 'eases in');
  for (let f = -5; f < 70; f++) {
    const s = V.stVMotionScale(f, 30, p);
    assert.ok(s >= 1 && s <= 1.04 + 1e-12, 'never below 1 (no edges), never past the push: ' + s);
    if (f > 0) assert.ok(s >= V.stVMotionScale(f - 1, 30, p), 'monotonic');
  }
  near(V.stVMotionScale(59, 30, V.stVMotionParams({ clipSeconds: 2, strength: 2 })), 1.08, 'strength 2');
  assert.equal(V.stVMotionScale(30, 30, V.stVMotionParams({ clipSeconds: 2, strength: 0 })), 1, 'strength 0 = still');
  assert.equal(V.stVMotionScale(30, 30, V.stVMotionParams({})), 1, 'no clip length = still');
  // Source time origin: the clip starts at its source start.
  const ps = V.stVMotionParams({ clipSeconds: 2, timeOrigin: 'source', sourceStartSeconds: 3 });
  assert.equal(V.stVMotionScale(90, 30, ps), 1); near(V.stVMotionScale(149, 30, ps), 1.04, 'source origin end');
  assert.ok(/transformOrigin: "50% 50%"/.test(vmSrc) && /overflow: "hidden"/.test(vmSrc), 'scales about the centre inside its box');
}

// ---------- Film frame ----------
const frameSrc = read('assets/film-frame.tsx'), motionSrc = read('assets/photo-motion.tsx');
assert.equal(block(frameSrc, 'st-motion'), block(motionSrc, 'st-motion'), 'film-frame carries the photo-motion block verbatim');
const F = load(block(frameSrc, 'st-motion') + '\n' + block(frameSrc, 'st-frame'),
  ['stFrameParams', 'stFrameWindow', 'stFrameTime', 'stFrameLeakLayers', 'stFrameFade', 'stFrameMotionCss', 'stFrameOverlayPath', 'stFrameRoundRect']);
assert.deepEqual(j(F.stFrameParams({})), {
  canvasInBox: { x: 0, y: 0, w: 100, h: 100 }, windowW: 0.87, windowH: 0.84, radius: 0.02, feather: 0.012, fringe: 1,
  leakInSeconds: 0, pulses: [], leakStrength: 1, fadeOutFrames: 0, clipSeconds: null, motion: null, sourceStartSeconds: 0, timeOrigin: 'clip',
});
assert.deepEqual(j(F.stFrameParams(null)), j(F.stFrameParams({})), 'null data');
assert.deepEqual(j(F.stFrameParams({ pulses: [{ at: 2 }, { at: 'x' }, null, { at: -0.1, dur: 0.5 }] }).pulses), [{ at: 2, dur: 0.4 }, { at: -0.1, dur: 0.5 }], 'pulses normalised');
assert.deepEqual(j(F.stFrameParams({ motion: { motion: 'push-in' } }).motion), { motion: 'push-in', direction: 1, axis: 'x', strength: 1 });
assert.equal(F.stFrameParams({ motion: {} }).motion, null);
{ // Window in canvas pixels: 87% x 84% centred, radius 2% H, feather 1.2% H.
  const w = F.stFrameWindow(F.stFrameParams({}));
  near(w.x, 124.8, 'window x'); near(w.y, 86.4, 'window y'); near(w.w, 1670.4, 'window w'); near(w.h, 907.2, 'window h');
  near(w.r, 21.6, 'radius'); near(w.blur, 12.96, 'feather');
  // The window does not depend on the clip box: canvasInBox only positions the canvas.
  assert.deepEqual(j(F.stFrameWindow(F.stFrameParams({ canvasInBox: { x: 0, y: 34.18, w: 100, h: 31.64 } }))), j(w));
  assert.ok(F.stFrameOverlayPath(F.stFrameParams({})).startsWith('M-400 -400H2320V1480H-400Z'), 'surround covers the canvas and beyond');
}
// Time origin.
near(F.stFrameTime(15, 30, F.stFrameParams({})), 0.5, 'clip time');
near(F.stFrameTime(15, 30, F.stFrameParams({ timeOrigin: 'source', sourceStartSeconds: 2 })), -1.5, 'source time');
// Fade: fadeOutFrames before the end, black on the last frame.
{
  const p = F.stFrameParams({ clipSeconds: 4, fadeOutFrames: 15 });
  assert.equal(F.stFrameFade(p, 104 / 30, 30), 0, 'before the fade');
  near(F.stFrameFade(p, 105 / 30, 30), 1 / 15, 'first fade frame');
  assert.equal(F.stFrameFade(p, 119 / 30, 30), 1, 'last frame black');
  assert.equal(F.stFrameFade(F.stFrameParams({ clipSeconds: 4 }), 119 / 30, 30), 0, 'no fade by default');
  assert.equal(F.stFrameFade(F.stFrameParams({ fadeOutFrames: 15 }), 119 / 30, 30), 0, 'no fade without clipSeconds');
}
// Leak-in and pulses: only in their windows; leakStrength 0 removes them.
{
  // Pulse `at` is the centre and `dur` the full width (decorate: centres at pulseFrames, half a beat wide).
  const p = F.stFrameParams({ leakInSeconds: 0.125, pulses: [{ at: 1.2, dur: 0.4 }, { at: 2.75, dur: 0.5 }] });
  assert.deepEqual(j(F.stFrameLeakLayers(p, 0.99).map(l => l.key)), [], 'before the pulse');
  assert.deepEqual(j(F.stFrameLeakLayers(p, 1.01).map(l => l.key)), ['pulse-0'], 'pulse starts at at - dur/2');
  assert.deepEqual(j(F.stFrameLeakLayers(p, 1.41).map(l => l.key)), [], 'pulse ends at at + dur/2');
  const peak = t => Number(/rgba\(255,70,40,([\d.]+)\)/.exec(F.stFrameLeakLayers(p, t)[0].background)[1]);
  assert.ok(peak(1.2) > peak(1.1) && peak(1.2) > peak(1.3), 'brightest at the centre');
  // A pulse centred before the clip start (straddling the cut) still shows its second half.
  assert.deepEqual(j(F.stFrameLeakLayers(F.stFrameParams({ pulses: [{ at: -0.05, dur: 0.25 }] }), 0.02).map(l => l.key)), ['pulse-0']);
  assert.deepEqual(j(F.stFrameLeakLayers(p, 0).map(l => l.key)), ['leak-in-wash', 'leak-in-tint', 'leak-in-band']);
  assert.deepEqual(j(F.stFrameLeakLayers(p, 0.3).map(l => l.key)), [], 'between leaks');
  assert.deepEqual(j(F.stFrameLeakLayers(p, 1.2).map(l => l.key)), ['pulse-0']);
  assert.deepEqual(j(F.stFrameLeakLayers(p, 2.75).map(l => l.key)), ['pulse-1']);
  // Shape by timing: a pulse on a cut is the edge flare (f548), one inside the clip the broad wash (f600).
  const flare = /at 97%/, broad = /ellipse 60% 50%/;
  const shape = (pulse, clipSeconds, t) => F.stFrameLeakLayers(F.stFrameParams({ clipSeconds, pulses: [pulse] }), t)[0].background;
  assert.match(shape({ at: 1.95, dur: 0.25 }, 2, 1.95), flare, 'straddles the clip end -> flare');
  assert.match(shape({ at: 0.03, dur: 0.25 }, 2, 0.05), flare, 'straddles the clip start -> flare');
  assert.match(shape({ at: 0.7, dur: 0.25 }, 1.67, 0.7), broad, 'mid-clip -> broad wash');
  assert.match(shape({ at: 0.7, dur: 0.25 }, undefined, 0.7), flare, 'unknown clip length -> flare');
  assert.deepEqual(j(F.stFrameLeakLayers(F.stFrameParams({ leakInSeconds: 0.125, leakStrength: 0 }), 0)), [], 'leakStrength 0');
  const band = t => Number(/at ([\d.]+)% 55%/.exec(F.stFrameLeakLayers(p, t).find(l => l.key === 'leak-in-band').background)[1]);
  assert.ok(band(0.01) > 75 && band(0.1) < band(0.01) && band(0.1) > 40, 'red band starts on the right and sweeps toward the middle');
  assert.ok(F.stFrameLeakLayers(p, 0).every(l => l.mixBlendMode === 'screen' || l.mixBlendMode === 'overlay'));
  // The opening wash is an orange/amber wash, not a near-white one (reference f520): warm stops, capped alpha.
  const wash = F.stFrameLeakLayers(p, 0).find(l => l.key === 'leak-in-wash').background;
  for (const m of wash.matchAll(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/g)) assert.ok(Number(m[3]) <= 130 && Number(m[4]) <= 0.7, 'orange wash stop ' + m[0]);
}
// The warm end flare (kind 'flare', ending + 7 beats): orange glow + amber tint inside the window, never white.
{
  assert.deepEqual(j(F.stFrameParams({ pulses: [{ at: 1.5, dur: 0.75, kind: 'flare' }, { at: 1, kind: 'x' }] }).pulses), [{ at: 1.5, dur: 0.75, kind: 'flare' }, { at: 1, dur: 0.4 }], 'kind flare kept, others dropped');
  const p = F.stFrameParams({ clipSeconds: 2, pulses: [{ at: 1.5, dur: 0.75, kind: 'flare' }] });
  assert.deepEqual(j(F.stFrameLeakLayers(p, 1.1).map(l => l.key)), [], 'before the flare');
  assert.deepEqual(j(F.stFrameLeakLayers(p, 1.5).map(l => l.key)), ['flare-0', 'flare-tint-0']);
  const a = t => Number(/rgba\(255,150,70,([\d.]+)\)/.exec(F.stFrameLeakLayers(p, t)[0].background)[1]);
  assert.ok(a(1.5) > a(1.3) && a(1.5) > a(1.7) && a(1.5) >= 0.6, 'peaks at its centre');
  for (const l of F.stFrameLeakLayers(p, 1.5)) for (const m of l.background.matchAll(/rgba\((\d+),(\d+),(\d+),/g)) assert.ok(Number(m[3]) <= 100, 'warm ' + m[0]);
  assert.deepEqual(j(F.stFrameLeakLayers(F.stFrameParams({ clipSeconds: 2, leakStrength: 0, pulses: [{ at: 1.5, dur: 0.75, kind: 'flare' }] }), 1.5)), [], 'leakStrength 0');
}
// Leaks are drawn under the black surround (inside the window only): the leak div precedes the surround svg.
assert.ok(frameSrc.indexOf('leaks.map') < frameSrc.indexOf('d={stFrameOverlayPath(p)}'), 'leaks under the surround');
assert.ok(frameSrc.indexOf('clipPath: inset') < frameSrc.indexOf('style={motion'), 'motion inside the fixed canvas clip');
// Motion inside the window: about the canvas centre, translations converted from canvas % to box %.
{
  assert.equal(F.stFrameMotionCss(F.stFrameParams({ clipSeconds: 4 }), 1), null, 'no motion by default');
  const c = { x: 0, y: 34.1796875, w: 100, h: 31.640625 };
  const m = F.stFrameMotionCss(F.stFrameParams({ clipSeconds: 4, canvasInBox: c, motion: { motion: 'drift-down' } }), 4);
  assert.equal(m.transformOrigin, '50.000% 50.000%');
  assert.match(m.transform, /^translate\(0\.000%, 0\.949%\) rotate\(0\.000deg\) scale\(1\.0800\)$/, 'drift 3% of the canvas = 0.949% of a portrait box');
  const push = F.stFrameMotionCss(F.stFrameParams({ clipSeconds: 2, motion: { motion: 'push-in', strength: 1 } }), 2);
  assert.match(push.transform, /scale\(1\.0700\)$/, 'push-in ends at 7%');
}

// ---------- Grid panel ----------
const gridSrc = read('assets/grid-panel.tsx');
const P = load(block(gridSrc, 'st-grid'), ['stGridInsetCss']);
assert.equal(P.stGridInsetCss({}), 'none', 'no insets, no clip');
assert.equal(P.stGridInsetCss(null), 'none');
assert.equal(P.stGridInsetCss({ insetPct: { top: 34.1796875, right: 0, bottom: 34.1796875, left: 0 } }), 'inset(34.1797% 0% 34.1797% 0%)');
assert.equal(P.stGridInsetCss({ insetPct: { top: -5, right: 120, bottom: '10', left: 'x' } }), 'inset(0% 100% 10% 0%)', 'clamped');
{ const g = G.stGridPanelInset({ srcW: 1080, srcH: 1920, quad: 'BR' }); assert.match(P.stGridInsetCss({ insetPct: g.insetPct }), /^inset\(34\.1797% 0% 34\.1797% 0%\)$/, 'geometry feeds the effect'); }

console.log(JSON.stringify({ effects: 'ok' }));
