// SBS Radio Clips' speaker reframing on a real News Direct panel of four: faces from Selects' faces.detect
// every 0.1 s and the transcript's speakers, for 234.3-396 s of VuE82gQMENA (clip 2 of job mv9md6hb). The panellist
// on the right edge (x≈1658) talks through most of it; a match against each face's overall average missed him and
// the clip showed all four people with him cut in half. Also checks how a clip's faces are searched: short windows
// that keep each result under the runtime's 8 MiB file limit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const panel = fs.readFileSync(process.env.SBS_CLIPS_PANEL || path.join(root, 'plugins/sbs-clips/panel.tsx'), 'utf8');
// The pure reframing helpers, each a top-level function ending at its first unindented closing brace, with
// their TypeScript types removed.
const NAMES = ['speakerTurns', 'planShots', 'faceRanges', 'faceWindows', 'keyHash'];
const code = NAMES.map((name) => {
  const start = panel.search(new RegExp('^function ' + name + '\\(', 'm'));
  assert.ok(start >= 0, 'not found: ' + name);
  return panel.slice(start, panel.indexOf('\n}\n', start) + 2);
}).join('\n');
const ctx = {};
vm.runInNewContext(stripTypeScriptTypes(code) + '\nObject.assign(globalThis, {' + NAMES.join(', ') + '});', ctx);
const {planShots, speakerTurns, faceRanges, faceWindows, keyHash} = ctx;
const fx = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/sbs-clips/newsdirect_reframe.json'), 'utf8'));

// The TikTok layout of the News Direct template: an 850 px window, the source's full height.
const windowW = 1080 / (850 / 1080);
const plan = (log) => planShots(fx.samples, speakerTurns(fx.words, fx.range[0], fx.range[1]), fx.frameW, windowW, 4.5, 12, false, windowW, 2.8, log);
const at = (shots, t) => shots.find((s) => t >= s.start && t < s.end);

test('each passage of the clip is framed on the panellist who talks', () => {
  const shots = plan();
  for (const [t, x] of [[265, 1658], [300, 1658], [320, 1658], [360, 735]]) {
    const s = at(shots, t);
    assert.ok(s && s.cy, `close-up at ${t} s`);
    assert.ok(Math.abs(s.cx - x) < 60, `${t} s: x ${s.cx}, expected about ${x}`);
  }
});

test('a close-up leaves the neighbours out whole', () => {
  const shots = plan();
  // Typical face centres and widths of the panel: each neighbour's face stays outside the window, with at least
  // half a face of room (the window's edge sits about 1.3 face widths from the neighbour's centre in the piece).
  const seats = [[270, 135], [735, 135], [1170, 143], [1658, 137]];
  for (const t of [300, 360]) {
    const s = at(shots, t);
    for (const [x, w] of seats) {
      if (Math.abs(x - s.cx) < 100) continue;
      assert.ok(Math.abs(x - s.cx) - s.w / 2 >= w, `${t} s: window ${s.cx}±${s.w / 2} reaches the face at ${x}`);
    }
  }
});

test('the speaker matches and every decision are logged', () => {
  const log = {};
  plan(log);
  const byFace = Object.fromEntries(log.voice.filter((v) => v.face !== null).map((v) => [v.spk, v.face]));
  assert.ok(Math.abs(byFace[0] - 1658) < 100, `speaker 0 is the right edge panellist: ${JSON.stringify(log.voice)}`);
  assert.ok(Math.abs(byFace[1] - 735) < 100, `speaker 1 is the second from the left: ${JSON.stringify(log.voice)}`);
  assert.ok(log.pieces.length > 0 && log.pieces.every((p) => typeof p.how === 'string'));
});

test('faces in separate ranges continue across the gap', () => {
  // The passages alone, with a gap between them: the right edge panellist is still matched once for both.
  const ranges = [[254.3, 278], [286.2, 339.9], [345.6, 376]];
  const samples = fx.samples.filter(([t]) => ranges.some(([a, b]) => t >= a && t <= b));
  const words = fx.words.filter((w) => w[1] >= 254.3 && w[0] <= 376);
  const shots = planShots(samples, speakerTurns(words, 254.3, 376), fx.frameW, windowW, 4.5, 12, false, windowW, 2.8);
  assert.ok(Math.abs(at(shots, 300).cx - 1658) < 60, JSON.stringify(at(shots, 300)));
  assert.ok(Math.abs(at(shots, 360).cx - 735) < 60, JSON.stringify(at(shots, 360)));
});

test('a clip is searched over its whole stretch in windows under the size limit', () => {
  // Clip 1 of mv9md6hb: one search of 28.3-463 s failed with AI_ARTIFACT_TOO_LARGE (about 16 MiB).
  const ranges = faceRanges([[58.3, 80.2], [377, 394.7], [415.7, 433]], 694.66);
  assert.equal(ranges.length, 1);
  assert.ok(Math.abs(ranges[0][0] - 28.3) < 1e-6 && ranges[0][1] === 463);
  const windows = faceWindows(ranges[0][0], ranges[0][1], 0.1, 29.97);
  assert.ok(windows.every(([a, b]) => b - a <= 60 + 1e-6));
  assert.ok(Math.abs(windows[0][0] - 28.3) < 1e-6 && windows[windows.length - 1][1] === 463);
  for (let i = 1; i < windows.length; i++) assert.equal(windows[i][0], windows[i - 1][1]);
  // At 0.2 s a window may be twice as long, but never decodes more than the runtime's 20,000 frames.
  assert.ok(faceWindows(0, 1000, 0.2, 119.88).every(([a, b]) => (b - a) * 119.88 < 19000));
  // Passages far apart are searched separately; pad 0 searches the passages alone.
  // (JSON: the arrays come from the panel's own context.)
  assert.equal(JSON.stringify(faceRanges([[10, 40], [900, 930]], 2000)), '[[0,70],[870,960]]');
  assert.equal(JSON.stringify(faceRanges([[58.3, 80.2], [377, 394.7]], 694.66, 0)), '[[58.3,80.2],[377,394.7]]');
});

test('a face job request key changes with its inputs', () => {
  const k = (o) => keyHash(JSON.stringify(o));
  assert.equal(k({a: 1, b: 2, step: 0.1}), k({a: 1, b: 2, step: 0.1}));
  assert.notEqual(k({a: 1, b: 2, step: 0.1}), k({a: 1, b: 2, step: 0.2}));
  assert.notEqual(k({a: 1, b: 2, step: 0.1}), k({a: 1, b: 3, step: 0.1}));
});
