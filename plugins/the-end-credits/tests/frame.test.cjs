// plugins/the-end-credits/tests/frame.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'shot-frame.tsx'), 'utf8');
const block = src.slice(src.indexOf('// tec-frame:start'), src.indexOf('// tec-frame:end'));
assert.ok(block.length > 100, 'tec-frame markers present');
const box = { Math, Number, isFinite }; vm.createContext(box);
vm.runInContext(block + ';globalThis.F={tecVisibleRect,tecWindowRect,tecSourceTransform,tecFadeOpacity,tecMotion};', box);
const F = box.F, j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, msg + ': ' + a + ' vs ' + b);

// Static checks: renders the clip, imports only react and remotion, never lays out from useVideoConfig.
assert.ok(src.includes('<Source />'), 'renders the clip');
assert.deepEqual([...src.matchAll(/from\s+"([^"]+)"/g)].map(m => m[1]).sort(), ['react', 'remotion']);
assert.ok(!/useVideoConfig\(/.test(src) && !/import[^;]*useVideoConfig/.test(src), 'no useVideoConfig');
assert.ok(src.includes('backgroundColor: "#000"') && src.includes('clipPath'), 'black surround + clip-path window');

const A = 16 / 9;
const ASPECTS = { landscape: A, portrait: 9 / 16, photo: 3 / 4, scope: 2.39 };
const CLASSIC = { x: 50.73, y: 12.69, w: 42.6 }, FULL = { x: 0, y: 0, w: 100 };

// Visible rect per aspect.
assert.deepEqual(j(F.tecVisibleRect(A)), { x: 0, y: 0, w: 100, h: 100 });
{ const v = F.tecVisibleRect(9 / 16); near(v.w, 100, 1e-9, 'portrait vw'); near(v.h, 100 * (9 / 16) / A, 1e-9, 'portrait vh'); near(v.y, (100 - v.h) / 2, 1e-9, 'portrait centred'); near(v.x, 0, 1e-9, 'portrait x'); }
{ const v = F.tecVisibleRect(3 / 4); near(v.h, 42.1875, 1e-9, 'photo vh'); near(v.y, 28.90625, 1e-9, 'photo vy'); }
{ const v = F.tecVisibleRect(2.39); near(v.h, 100, 1e-9, 'scope vh'); near(v.w, 100 * A / 2.39, 1e-9, 'scope vw'); near(v.x, (100 - v.w) / 2, 1e-9, 'scope centred'); }
assert.deepEqual(j(F.tecVisibleRect(undefined)), j(F.tecVisibleRect(A)), 'missing aspect = 16:9');
assert.deepEqual(j(F.tecVisibleRect(0)), j(F.tecVisibleRect(A)), 'zero aspect = 16:9');

// Box % -> canvas px through the cover transform: the visible rect is the whole 1920x1080 canvas.
const toCanvas = (vis, bx, by) => [(bx - vis.x) / vis.w * 1920, (by - vis.y) / vis.h * 1080];
for (const [name, a] of Object.entries(ASPECTS)) {
  const vis = F.tecVisibleRect(a), win = F.tecWindowRect(vis, CLASSIC.x, CLASSIC.y, CLASSIC.w);
  const [x0, y0] = toCanvas(vis, win.left, win.top), [x1, y1] = toCanvas(vis, win.left + win.width, win.top + win.height);
  near(x0, 974, 1, name + ' left'); near(y0, 137, 1, name + ' top'); near(x1, 1791, 1, name + ' right'); near(y1, 597, 1, name + ' bottom');
  // The window is 16:9 in the box's pixels (box aspect = a).
  near(win.width * a / win.height, A, 1e-9, name + ' window aspect');
  // Full frame = the whole visible rect.
  const full = F.tecWindowRect(vis, FULL.x, FULL.y, FULL.w);
  near(full.left, vis.x, 1e-9, name + ' full left'); near(full.top, vis.y, 1e-9, name + ' full top');
  near(full.width, vis.w, 1e-9, name + ' full width'); near(full.height, vis.h, 1e-9, name + ' full height');
}
// Defaults are Classic; out-of-range values clamp.
assert.deepEqual(j(F.tecWindowRect(F.tecVisibleRect(A), undefined, undefined, undefined)), j(F.tecWindowRect(F.tecVisibleRect(A), 50.73, 12.69, 42.6)));
assert.equal(F.tecWindowRect(F.tecVisibleRect(A), 0, 0, 500).width, 100);

// The Source covers the window: every window corner, mapped back through the Source transform (CSS
// translate(tx%, ty%) rotate(r) scale(s) around the box centre), lands inside the Source (= the whole box).
function covers(a, win, t) {
  const Bw = 1000 * a, Bh = 1000;                         // box pixels (aspect a)
  const cx = Bw / 2 + t.tx / 100 * Bw, cy = Bh / 2 + t.ty / 100 * Bh;
  for (const r of [t.rotate, -t.rotate]) {               // either rotation sign convention
    const th = -r * Math.PI / 180;
    for (const [qx, qy] of [[win.left, win.top], [win.left + win.width, win.top], [win.left, win.top + win.height], [win.left + win.width, win.top + win.height]]) {
      const ux = qx / 100 * Bw - cx, uy = qy / 100 * Bh - cy;
      const px = (ux * Math.cos(th) - uy * Math.sin(th)) / t.scale, py = (ux * Math.sin(th) + uy * Math.cos(th)) / t.scale;
      if (Math.abs(px) > Bw / 2 + 1e-9 || Math.abs(py) > Bh / 2 + 1e-9) return false;
    }
  }
  return true;
}
const MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
let checks = 0;
for (const [name, a] of Object.entries(ASPECTS)) for (const W of [CLASSIC, FULL, { x: 0, y: 0, w: 30 }, { x: 70, y: 70, w: 30 }]) {
  const vis = F.tecVisibleRect(a), win = F.tecWindowRect(vis, W.x, W.y, W.w);
  const still = F.tecSourceTransform(vis, win, null);
  assert.ok(covers(a, win, still), 'still shot covers: ' + name);
  // The still cover crop is tight: the Source's short side meets the window (only the 0.2 % hair of overscale).
  const fit = Math.min(still.scale * 100 / win.width, still.scale * 100 / win.height);
  near(fit, 1.002, 1e-9, 'tight cover ' + name);
  near(still.tx + 50, win.left + win.width / 2, 1e-9, 'centred x ' + name); near(still.ty + 50, win.top + win.height / 2, 1e-9, 'centred y ' + name);
  for (const motion of MOTIONS) for (const strength of [0, 0.5, 1, 1.5, 2, 9]) for (const direction of [1, -1]) for (const axis of ['x', 'y']) for (let i = 0; i <= 40; i++) {
    const t = F.tecSourceTransform(vis, win, F.tecMotion(motion, i / 40, strength, direction, axis));
    assert.ok(covers(a, win, t), 'edge shows: ' + JSON.stringify({ name, W, motion, strength, direction, axis, i }));
    checks++;
  }
}

// Motion maths: CWV moves at 0.6 of the strength; eased; unknown/none is still.
near(F.tecMotion('push-in', 1, 1, 1, 'x').scale, 1 + 0.07 * 0.6, 1e-12, 'push-in end');
near(F.tecMotion('push-in', 0, 1, 1, 'x').scale, 1, 1e-12, 'push-in start');
near(F.tecMotion('pull-out', 0, 2, 1, 'x').scale, 1 + 0.07 * 1.2, 1e-12, 'pull-out start at 2');
near(F.tecMotion('push-in', 0.5, 1, 1, 'x').scale, 1 + 0.035 * 0.6, 1e-12, 'eased midpoint');
near(F.tecMotion('drift-left', 0, 1, 1, 'x').x, 1.8, 1e-12, 'drift-left starts right');
near(F.tecMotion('drift-left', 1, 1, 1, 'x').x, -1.8, 1e-12, 'drift-left ends left');
near(F.tecMotion('drift-down', 1, 1, 1, 'x').y, 1.8, 1e-12, 'drift-down ends low');
near(F.tecMotion('tilt', 1, 1, -1, 'x').rotate, -1.5, 1e-12, 'tilt angle and direction');
near(F.tecMotion('push-drift', 1, 1, -1, 'y').y, -1.2, 1e-12, 'push-drift drift');
near(F.tecMotion('push-in', 1, 9, 1, 'x').scale, F.tecMotion('push-in', 1, 2, 1, 'x').scale, 1e-12, 'strength clamps to 2');
near(F.tecMotion('push-in', 1, undefined, 1, 'x').scale, 1.042, 1e-12, 'strength defaults to 1');
assert.deepEqual(j(F.tecMotion('none', 0.5, 1, 1, 'x')), { scale: 1, x: 0, y: 0, rotate: 0 });
assert.deepEqual(j(F.tecMotion('nope', 0.5, 1, 1, 'x')), { scale: 1, x: 0, y: 0, rotate: 0 });

// Fades: 24 fps, a 100-frame clip, 0.5 s in, 1.13 s out.
const fade = f => F.tecFadeOpacity(f, 100, 24, 0.5, 1.13);
assert.equal(fade(0), 0, 'starts black');
near(fade(6), 0.5, 1e-12, 'half way in');
assert.equal(fade(12), 1, 'fully in after 0.5 s');
assert.equal(fade(50), 1, 'middle');
assert.equal(fade(99), 0, 'last frame black');
near(fade(99 - 1.13 * 24 / 2), 0.5, 1e-9, 'half way out');
assert.ok(fade(99 - 1.13 * 24) === 1 && fade(99 - 1.13 * 24 + 1) < 1, 'fade-out lasts 1.13 s');
for (let f = 1; f < 100; f++) if (f > 50) assert.ok(fade(f) <= fade(f - 1), 'fade-out monotonic');
assert.equal(F.tecFadeOpacity(0, 100, 24, 0, 0), 1, 'no fades');
assert.equal(F.tecFadeOpacity(99, 100, 24, 0.5, 0), 1, 'no fade-out');
assert.equal(F.tecFadeOpacity(-5, 100, 24, 0.5, 0), 0, 'before the origin');
assert.equal(F.tecFadeOpacity(0, 100, 24, 0, 1.13) < 1, false, 'fade-out alone leaves the start alone');
// The component uses the source-time origin.
assert.ok(/useCurrentFrame\(\)/.test(src) && /frame - tecNum\(d\.originFrame, 0\)/.test(src), 'local = frame - originFrame');
console.log(JSON.stringify({ frame: 'ok', coverageChecks: checks }));
