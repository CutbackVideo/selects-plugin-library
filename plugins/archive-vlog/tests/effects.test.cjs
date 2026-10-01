// plugins/archive-vlog/tests/effects.test.cjs
// Letterbox reveal (spec §4) and Fade out (spec §3): samples the pure maths of assets/letterbox-reveal.tsx and
// assets/fade-out.tsx.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function load(file, tag, names) {
  const src = fs.readFileSync(path.join(root, 'assets', file), 'utf8');
  const a = src.indexOf(`// ${tag}:start`), z = src.indexOf(`// ${tag}:end`);
  assert.ok(a >= 0 && z > a, `${tag} markers`);
  const box = { Math, Number, isFinite, NaN }; vm.createContext(box);
  vm.runInContext(src.slice(a, z) + `;globalThis.X={${names.join(',')}};`, box);
  return { src, ...box.X };
}
const near = (x, y, eps, msg) => assert.ok(Math.abs(x - y) <= eps, (msg || '') + ': ' + x + ' vs ' + y);

// ---- Letterbox reveal ----
const B = load('letterbox-reveal.tsx', 'av-box', ['avBoxTimes', 'avBoxBand', 'avBoxInset']);
assert.ok(B.src.includes('<Source />'), 'letterbox renders the clip');
assert.ok(B.src.includes('clipPath'), 'letterbox masks with clip-path');
assert.ok(!/scale\(/.test(B.src), 'a mask, not a zoom');
assert.ok(B.src.includes('frame / '), 'seconds from frame / fps');
// Defaults: the reference's 0.22 s -> 2.35 s, on.
assert.deepEqual({ ...B.avBoxTimes(undefined) }, { enabled: true, start: 0.22, end: 2.35 });
assert.deepEqual({ ...B.avBoxTimes({ revealStart: 0.2, revealEnd: 2.05 }) }, { enabled: true, start: 0.2, end: 2.05 });
// revealSeconds (the Adjust duration) wins over revealEnd.
assert.deepEqual({ ...B.avBoxTimes({ revealStart: 0.2, revealEnd: 2.05, revealSeconds: 1 }) }, { enabled: true, start: 0.2, end: 1.2 });
assert.equal(B.avBoxTimes({ enabled: false }).enabled, false);
// An end before the start is clamped to the start; negative start to 0.
assert.deepEqual({ ...B.avBoxTimes({ revealStart: -1, revealEnd: -2 }) }, { enabled: true, start: 0, end: 0 });

// Scaled reference at k = 0.89 (72 BPM): 0.1958 s -> 2.0915 s.
const k = 0.89, rs = 0.22 * k, re = 2.35 * k;
for (const fps of [23.976, 25, 29.97, 30, 60]) {
  const band = (f) => B.avBoxBand(f / fps, rs, re);
  // Black on frame 0 and until revealStart.
  assert.equal(band(0), 0, 'black at frame 0');
  for (let f = 0; f / fps < rs; f++) assert.equal(band(f), 0, `black before the reveal at ${f}@${fps}`);
  // Linear: halfway in time is half the height, at any fps (seconds, not frames).
  near(B.avBoxBand((rs + re) / 2, rs, re), 0.5, 1e-12, 'linear midpoint');
  near(B.avBoxBand(rs + 0.25 * (re - rs), rs, re), 0.25, 1e-12, 'linear quarter');
  // Monotone and full from revealEnd on.
  for (let f = 1; f < 4 * fps; f++) assert.ok(band(f) >= band(f - 1), 'opens monotonically');
  assert.equal(band(Math.ceil(re * fps)), 1, 'full at revealEnd');
  assert.equal(band(Math.ceil(re * fps) + 30), 1, 'stays full');
}
// Edge speed on a 1080 frame ~ 250-260 px/s per edge (reference 0.22 -> 2.35 s).
const edgeSpeed = 540 / (2.35 - 0.22);
assert.ok(edgeSpeed > 240 && edgeSpeed < 270, 'edge speed ' + edgeSpeed);
// A zero-length reveal cuts from black to full at the start.
assert.equal(B.avBoxBand(0.1, 0.22, 0.22), 0);
assert.equal(B.avBoxBand(0.22, 0.22, 0.22), 1);
assert.equal(B.avBoxBand(NaN, 0.22, 2.35), 0);
// The mask: symmetric insets, 50 % each at 0 (nothing), 0 at 1 (everything), 25 % at half.
assert.equal(B.avBoxInset(0), 'inset(50.0000% 0% 50.0000% 0%)');
assert.equal(B.avBoxInset(0.5), 'inset(25.0000% 0% 25.0000% 0%)');
assert.equal(B.avBoxInset(1), 'inset(0.0000% 0% 0.0000% 0%)');
assert.equal(B.avBoxInset(2), 'inset(0.0000% 0% 0.0000% 0%)');

// ---- Fade out ----
const F = load('fade-out.tsx', 'av-fade', ['avFadeAlpha', 'avFadeSeconds']);
assert.ok(F.src.includes('<Source />'), 'fade renders the clip');
assert.ok(F.src.includes('useCurrentFrame') && F.src.includes('useVideoConfig'), 'fade uses the frame and fps');
assert.equal(F.avFadeSeconds(undefined), 1);
assert.equal(F.avFadeSeconds({ fadeSeconds: 0 }), 0);
assert.equal(F.avFadeSeconds({ fadeSeconds: -2 }), 0);
assert.equal(F.avFadeSeconds({ fadeSeconds: '1.5' }), 1.5);
for (const fps of [23.976, 25, 29.97, 30, 60]) {
  // A 4-beat final shot at 72 BPM: 3.33 s.
  const dur = Math.round(10 / 3 * fps), n = 1 * fps, start = dur - n;
  const A = (f) => F.avFadeAlpha(f, dur, n);
  assert.equal(A(0), 0, 'clip start untouched');
  for (let f = 0; f <= Math.floor(start); f++) assert.equal(A(f), 0, `no fade before the last second at ${f}@${fps}`);
  near(A(start), 0, 1e-12, 'fade start');
  near(A(start + (n - 1) / 2), 0.5, 1e-12, 'linear middle');
  const last = A(dur - 1);
  assert.ok(last >= 0.97, `last frame black ${last}@${fps}`);
  assert.equal(last, 1);
  for (let f = 1; f < dur; f++) assert.ok(A(f) >= A(f - 1), 'monotone');
  // The fade really takes ~1 s: the first non-zero frame is within a frame of dur - fps.
  const first = [...Array(dur).keys()].find(f => A(f) > 0);
  assert.ok(Math.abs(first - start) <= 1, 'fade begins one second before the end');
  assert.equal(A(dur + 5), 1, 'black after the end');
}
// Off and bad inputs: no fade, no crash (a photo clip or a missing duration).
assert.equal(F.avFadeAlpha(10, 60, 0), 0);
assert.equal(F.avFadeAlpha(10, undefined, 30), 0);
assert.equal(F.avFadeAlpha(NaN, 60, 30), 0);
// A fade longer than the clip starts at the clip's first frame.
assert.equal(F.avFadeAlpha(0, 20, 30), 0);
assert.equal(F.avFadeAlpha(19, 20, 30), 1);
// A one-frame fade blacks out only the last frame.
assert.equal(F.avFadeAlpha(18, 20, 1), 0);
assert.equal(F.avFadeAlpha(19, 20, 1), 1);
console.log(JSON.stringify({ effects: 'ok', edgeSpeedPxPerS: +edgeSpeed.toFixed(1) }));
