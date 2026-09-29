// plugins/summer-trip/tests/motion.test.cjs (adapted from city-weekend-vlog: transform + no-edge sweep; the planner's
// motion choice is tested with the planner when it exposes stPhotoMotions)
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'assets', 'photo-motion.tsx'), 'utf8');
const block = src.slice(src.indexOf('// st-motion:start'), src.indexOf('// st-motion:end'));
const box = { Math, Number, isFinite }; vm.createContext(box);
vm.runInContext(block + ';globalThis.T=stMotionTransform;', box);
const T = box.T;
const j = v => JSON.parse(JSON.stringify(v));
const MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, msg + ': ' + a + ' vs ' + b);

assert.ok(src.includes('<Source />'), 'renders the clip');

// Endpoints at strength 1.
near(T('push-in', 0, 1, 1, 'x', 1080, 1920, 1).scale, 1, 'push-in start');
near(T('push-in', 1, 1, 1, 'x', 1080, 1920, 1).scale, 1.07, 'push-in end');
near(T('pull-out', 0, 1, 1, 'x', 1080, 1920, 1).scale, 1.07, 'pull-out start');
near(T('pull-out', 1, 1, 1, 'x', 1080, 1920, 1).scale, 1, 'pull-out end');
near(T('drift-left', 0, 1, 1, 'x', 1080, 1920, 1).scale, 1.08, 'drift scale');
near(T('drift-left', 0, 1, 1, 'x', 1080, 1920, 1).x, 3, 'drift-left starts right');
near(T('drift-left', 1, 1, 1, 'x', 1080, 1920, 1).x, -3, 'drift-left ends left');
near(T('drift-down', 1, 1, 1, 'x', 1080, 1920, 1).y, 3, 'drift-down ends low');
near(T('tilt', 1, 1, -1, 'x', 1080, 1920, 1).rotate, -2.5, 'tilt angle and direction');
near(T('push-drift', 1, 1, -1, 'y', 1080, 1920, 1).y, -2, 'push-drift drift');
near(T('push-drift', 1, 1, -1, 'y', 1080, 1920, 1).scale, 1.07, 'push-drift scale');
// Ease-in-out: slow at both ends, halfway at the middle.
near(T('push-in', 0.5, 1, 1, 'x', 1080, 1920, 1).scale, 1.035, 'eased midpoint');
assert.ok(T('push-in', 0.1, 1, 1, 'x', 1080, 1920, 1).scale - 1 < 0.07 * 0.1, 'eases in');
// Strength scales the amounts; 0 is still; out-of-range values clamp; an unknown motion is still.
near(T('push-in', 1, 2, 1, 'x', 1080, 1920, 1).scale, 1.14, 'strength 2');
assert.deepEqual(j(T('drift-up', 0.3, 0, 1, 'x', 1080, 1920, 1)), { scale: 1.02, x: 0, y: 0, rotate: 0 });
near(T('push-in', 1, 9, 1, 'x', 1080, 1920, 1).scale, 1.14, 'strength clamps to 2');
assert.deepEqual(j(T('nope', 0.5, 1, 1, 'x', 1080, 1920, 1)), { scale: 1, x: 0, y: 0, rotate: 0 });
// Translations shrink by the cover-crop scale.
near(T('drift-right', 1, 1, 1, 'x', 1080, 1920, 2).x, 1.5, 'cover divides the drift');

// No edges ever show. The photo exactly covers the visible window (the worst case: no extra room on either side);
// every window corner, mapped back through the move, must land inside the photo. Checked with the cover-crop
// applied after the move (window = frame) and before it (window = frame / cover, translations in frame units).
for (const motion of MOTIONS) for (const strength of [0, 0.5, 1, 1.5, 2]) for (const direction of [1, -1])
  for (const axis of ['x', 'y']) for (const [w, h] of [[1080, 1920], [1920, 1080]]) for (const cover of [1, 1.333, 1.778]) for (let i = 0; i <= 40; i++) {
    const m = T(motion, i / 40, strength, direction, axis, w, h, cover);
    for (const before of [false, true]) {
      const k = before ? cover : 1;
      const W = w / k, H = h / k;                      // visible window in effect space
      const tx = m.x / 100 * w, ty = m.y / 100 * h;   // CSS translate(%) is relative to the frame box
      const r = -m.rotate * Math.PI / 180;
      for (const [cx, cy] of [[-W / 2, -H / 2], [W / 2, -H / 2], [-W / 2, H / 2], [W / 2, H / 2]]) {
        const ux = cx - tx, uy = cy - ty;
        const px = (ux * Math.cos(r) - uy * Math.sin(r)) / m.scale, py = (ux * Math.sin(r) + uy * Math.cos(r)) / m.scale;
        assert.ok(Math.abs(px) <= W / 2 + 1e-6 && Math.abs(py) <= H / 2 + 1e-6, 'edge shows: ' + JSON.stringify({ motion, strength, direction, axis, w, h, cover, i, before }));
      }
    }
  }


// Planner motion choice (lane 1), when the planner exposes it.
const plannerPath = path.join(root, 'planner.js');
if (fs.existsSync(plannerPath)) {
  const pbox = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON }; vm.createContext(pbox);
  vm.runInContext(fs.readFileSync(plannerPath, 'utf8') + ';globalThis.P={stPhotoMotions:typeof stPhotoMotions==="function"?stPhotoMotions:null,ST_PHOTO_MOTIONS:typeof ST_PHOTO_MOTIONS!=="undefined"?ST_PHOTO_MOTIONS:null};', pbox);
  if (pbox.P.ST_PHOTO_MOTIONS) assert.deepEqual(j(pbox.P.ST_PHOTO_MOTIONS), MOTIONS, 'planner motions match the effect');
}
console.log(JSON.stringify({ motion: 'ok' }));
