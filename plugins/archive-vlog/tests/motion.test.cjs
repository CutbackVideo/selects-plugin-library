// plugins/archive-vlog/tests/motion.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'assets', 'photo-motion.tsx'), 'utf8');
const block = src.slice(src.indexOf('// av-motion:start'), src.indexOf('// av-motion:end'));
const box = { Math, Number, isFinite }; vm.createContext(box);
vm.runInContext(block + ';globalThis.T=avMotionTransform;', box);
const T = box.T;
const pbox = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON }; vm.createContext(pbox);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={avPhotoMotions,AV_PHOTO_MOTIONS};', pbox);
const P = pbox.P, j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, msg + ': ' + a + ' vs ' + b);

assert.deepEqual(j(P.AV_PHOTO_MOTIONS), ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift']);
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
for (const motion of P.AV_PHOTO_MOTIONS) for (const strength of [0, 0.5, 1, 1.5, 2]) for (const direction of [1, -1])
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

// Motion choice: every photo pick gets a motion (the title covers the whole video, so no slot is excluded); never the
// same motion or family twice in a row, alternating directions, deterministic per seed.
const land = { width: 1920, height: 1080 }, tall = { width: 1080, height: 1920 }, square = { width: 898, height: 898 };
const picks = [];
for (let i = 0; i < 60; i++) picks.push(i % 4 === 0 ? { slot: i, rid: 'v' + i, kind: 'video', startSeconds: 0, endSeconds: 1 } : { slot: i, rid: 'm' + i, kind: 'photo', holdSeconds: i < 13 ? 0.55 : 1.1 });
const sizes = {};
picks.forEach((p, i) => { sizes[p.rid] = [land, tall, square][i % 3]; });
const family = m => (m.startsWith('drift-') ? 'drift' : m);
for (const seed of ['1', '2', '3', '4']) {
  const ms = j(P.avPhotoMotions(picks, seed, sizes));
  assert.equal(ms.length, picks.length);
  picks.forEach((p, i) => { if (p.kind !== 'photo') assert.equal(ms[i], null, 'videos stay still'); else assert.ok(P.AV_PHOTO_MOTIONS.includes(ms[i].motion), 'photo ' + i + ' moves'); });
  // Photos in the first slots move too (CWV kept its title photos still).
  assert.ok(ms[1] && ms[2] && ms[3], 'the first photos move');
  const seq = ms.filter(Boolean);
  assert.equal(seq.length, picks.filter(p => p.kind === 'photo').length);
  for (let i = 1; i < seq.length; i++) {
    assert.notEqual(seq[i].motion, seq[i - 1].motion, 'no immediate repeat');
    assert.notEqual(family(seq[i].motion), family(seq[i - 1].motion), 'no immediate repeat of a family');
  }
  // Orientation: portrait photos drift vertically (the 16:9 crop has room top and bottom), landscape and square ones
  // horizontally.
  picks.forEach((p, i) => {
    if (!ms[i]) return;
    const portrait = sizes[p.rid].height > sizes[p.rid].width;
    if (ms[i].motion.startsWith('drift-')) assert.ok(portrait ? /up|down/.test(ms[i].motion) : /left|right/.test(ms[i].motion), 'drift follows orientation');
    assert.equal(ms[i].axis, portrait ? 'y' : 'x');
  });
  // Directions alternate within each kind.
  const signs = f => seq.filter(f).map(m => m.direction);
  for (const f of [m => m.motion === 'tilt', m => m.motion === 'push-drift', m => /left|right/.test(m.motion), m => /up|down/.test(m.motion)]) {
    const s = signs(f);
    for (let i = 1; i < s.length; i++) assert.equal(s[i], -s[i - 1], 'directions alternate');
  }
  assert.ok(new Set(seq.map(m => family(m.motion))).size === 5, 'all families appear over a long run');
  assert.deepEqual(j(P.avPhotoMotions(picks, seed, sizes)), ms, 'deterministic');
}
assert.notDeepEqual(j(P.avPhotoMotions(picks, '1', sizes)), j(P.avPhotoMotions(picks, '2', sizes)), 'another seed, other motions');
// A photo in slot 0 moves; unknown sizes count as landscape; no photos means no motions.
const first = j(P.avPhotoMotions([{ slot: 0, rid: 'x', kind: 'photo', holdSeconds: 0.55 }], '1', null))[0];
assert.ok(first && first.axis === 'x');
assert.deepEqual(j(P.avPhotoMotions([null, { slot: 0, rid: 'v', kind: 'video' }], '1', {})), [null, null]);
// The signature has no titleSlots: a fourth argument changes nothing.
assert.deepEqual(j(P.avPhotoMotions(picks, '1', sizes, 13)), j(P.avPhotoMotions(picks, '1', sizes)));
console.log(JSON.stringify({ motion: 'ok' }));
