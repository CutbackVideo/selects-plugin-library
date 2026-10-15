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
const NAMES = ['speakerTurns', 'sentencesOf', 'planShots', 'cropRect', 'faceRanges', 'faceWindows', 'keyHash', 'settleFaceJob'];
const code = NAMES.map((name) => {
  const start = panel.search(new RegExp('^(async )?function ' + name + '\\(', 'm'));
  assert.ok(start >= 0, 'not found: ' + name);
  return panel.slice(start, panel.indexOf('\n}\n', start) + 2);
}).join('\n');
const ctx = {};
vm.runInNewContext(stripTypeScriptTypes(code) + '\nObject.assign(globalThis, {' + NAMES.join(', ') + '});', ctx);
const {planShots, speakerTurns, sentencesOf, cropRect, faceRanges, faceWindows, keyHash, settleFaceJob} = ctx;
const fx = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/sbs-clips/newsdirect_reframe.json'), 'utf8'));

// The TikTok layout of the News Direct template: an 850 px window, the source's full height.
const windowW = 1080 / (850 / 1080);
// This fixture's words carry no text, so sentences break only at pauses, speaker changes and 4 s.
const sentencesFor = (f) => sentencesOf(f.words.map((w) => (w.length === 3 ? [...w, ''] : w)));
const plan = (log) => planShots(fx.samples, speakerTurns(fx.words, fx.range[0], fx.range[1]), fx.frameW, windowW, 4.5, 12, false, windowW, 2.8, log, sentencesFor(fx));
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

test('a close-up at the picture edge offers wider views for the picture check', () => {
  // The right edge panellist sits about 225 px from the edge at 300 s: centred, the close-up is 450 px, which
  // looked cramped. The alternatives go up to 30 % wider, off centre but inside the picture; which of them
  // is clean of neighbours and set seams is judged on the frame itself (pickCrops).
  const s = at(plan(), 300);
  assert.equal(s.w, 2 * (fx.frameW - 12 - s.cx));
  const widths = s.alts.map((a) => a[1]);
  assert.ok(Math.max(...widths) >= s.w * 1.28, JSON.stringify(s.alts));
  for (const [cx, w] of s.alts) assert.ok(cx + w / 2 <= fx.frameW - 12 + 1 && cx - w / 2 >= 12 - 1, `${cx}±${w / 2} leaves the picture`);
});

test('the crop preview matches the Draft placement', () => {
  // A centred close-up shows w source pixels across and w × 850 / 1080 down, with the face 48 % down the window.
  const L = {windowTop: 450, windowBottom: 1300};
  const [x, y, w, h] = cropRect({cx: 960, w: 500, cy: 540}, L, 1920, 1080, 0.48, 12);
  assert.ok(Math.abs(x - 710) < 1e-6 && Math.abs(w - 500) < 1e-6 && Math.abs(h - (500 * 850) / 1080) < 1e-6, JSON.stringify([x, y, w, h]));
  assert.ok(Math.abs(540 - (y + h * 0.48)) < 1e-6, 'face 48 % down');
  // At the picture edge the view stops at the edge inset instead of showing past it.
  const [ex, , ew] = cropRect({cx: 1880, w: 500, cy: 540}, L, 1920, 1080, 0.48, 12);
  assert.ok(Math.abs(ex + ew - (1920 - 12)) < 1e-6, String(ex + ew));
  // The picture always covers the window top to bottom.
  const [, ty, , tht] = cropRect({cx: 960, w: 500, cy: 60}, L, 1920, 1080, 0.48, 12);
  assert.ok(ty >= -1e-6 && ty + tht <= 1080 + 1e-6, String([ty, tht]));
});

test('each sentence follows the panellist who actually talks, even when two share a speaker id', () => {
  // WaeCpJ4g7fk 680-762 s: the transcript gives speaker id 5 to both Cho Eung-cheon (right edge, x≈1700, talks until
  // 751 s) and Kim Geun-sik (x≈780, talks from 751.5 s), checked on the source frames. Matching one face per id put
  // the whole stretch on Kim Geun-sik. 746-751 s is still given to Kim Geun-sik (his mouth moves more while listening there).
  const mf = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/sbs-clips/newsdirect_merged_speaker.json'), 'utf8'));
  const shots = planShots(mf.samples, speakerTurns(mf.words, mf.range[0], mf.range[1]), mf.frameW, windowW, 4.5, 12, false, windowW, 2.8, undefined, sentencesFor(mf));
  for (const [t, x] of [[685, 1700], [692, 1700], [705, 1700], [718, 1700], [731, 1700], [740, 1700], [744, 1700], [755, 780], [761, 780]]) {
    const s = at(shots, t);
    assert.ok(s && s.cy && Math.abs(s.cx - x) < 150, `${t} s: x ${s && s.cx}, expected about ${x}`);
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

// A pretend AI runtime for settleFaceJob: jobs are kept by request key, as Selects does, so sending the same key and
// input again returns the job already started.
function runtime() {
  const jobs = new Map();
  const rt = {jobs, sent: [], checks: 0, lostAcks: 0, lostCode: 'AI_SUBMIT_OUTCOME_UNKNOWN', failChecks: 0, stuck: false, runFor: 0, cancelled: [],
    submit(key) {
      rt.sent.push(key);
      if (!jobs.has(key)) jobs.set(key, {wf: 'wf-' + jobs.size, status: 'running', left: rt.runFor});
      if (rt.lostAcks > 0) { rt.lostAcks--; throw Object.assign(new Error('lost'), {code: rt.lostCode}); }
      return {wf: jobs.get(key).wf};
    },
    status(cancel) {
      rt.checks++;
      if (rt.failChecks > 0) { rt.failChecks--; throw new Error('status read failed'); }
      const j = [...jobs.values()].at(-1);
      if (cancel) { rt.cancelled.push(j.wf); if (j.status === 'running') j.status = rt.stuck ? 'canceling' : 'canceled'; }
      else if (j.status === 'running' && j.left-- <= 0) j.status = 'succeeded';
      return {status: j.status, code: '', error: ''};
    },
  };
  return rt;
}
class Stopped extends Error {}
const io = (rt, key, more = {}) => {
  let clock = 0;
  return {submit: async () => rt.submit(key), status: async (cancel) => rt.status(cancel), wait: async (ms) => { clock += ms; }, deadline: 60000, now: () => clock, stop: (e) => e instanceof Stopped, ...more};
};

test('a lost submission answer recovers the same job with the same key', async () => {
  const rt = runtime();
  rt.lostAcks = 1;
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.deepEqual(rt.sent, ['k1', 'k1']);
  assert.equal(rt.jobs.size, 1);
  assert.equal(got.wf, 'wf-0');
  assert.equal(got.status.status, 'succeeded');
});

test('a submission script that timed out (no error code) is also recovered with the same key', async () => {
  const rt = runtime();
  rt.lostAcks = 1;
  rt.lostCode = '';
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.deepEqual(rt.sent, ['k1', 'k1']);
  assert.equal(rt.jobs.size, 1);
  assert.equal(got.status.status, 'succeeded');
});

test('a submission whose outcome stays unknown is held, never sent under another key', async () => {
  const rt = runtime();
  rt.lostAcks = 99;
  await assert.rejects(settleFaceJob(io(rt, 'k1')), (e) => e.unsettled === true && e.code === 'AI_SUBMIT_OUTCOME_UNKNOWN');
  assert.ok(rt.sent.length > 1 && rt.sent.every((k) => k === 'k1'));
});

test('a submission the host refused is not retried here', async () => {
  const rt = runtime();
  const refuse = async () => { throw Object.assign(new Error('bad input'), {code: 'AI_INPUT_INVALID'}); };
  await assert.rejects(settleFaceJob(io(rt, 'k1', {submit: refuse})), (e) => !e.unsettled && e.code === 'AI_INPUT_INVALID');
});

test('a failed status check asks the same job again', async () => {
  const rt = runtime();
  rt.runFor = 2;
  rt.failChecks = 1;
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.equal(rt.sent.length, 1);
  assert.equal(got.status.status, 'succeeded');
  assert.equal(rt.cancelled.length, 0);
});

test('status checks that keep failing hold the job instead of moving on', async () => {
  const rt = runtime();
  rt.failChecks = 99;
  await assert.rejects(settleFaceJob(io(rt, 'k1')), (e) => e.unsettled === true && e.wf === 'wf-0');
  assert.equal(rt.sent.length, 1);
});

test('a job past its time is cancelled and awaited; one that never stops is held', async () => {
  const rt = runtime();
  rt.runFor = 1e9;
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.equal(got.status.status, 'canceled');
  assert.equal(got.status.code, 'TIMEOUT');
  assert.deepEqual(rt.cancelled, ['wf-0']);

  const stuck = runtime();
  stuck.runFor = 1e9;
  stuck.stuck = true;
  await assert.rejects(settleFaceJob(io(stuck, 'k1')), (e) => e.unsettled === true && e.code === 'TIMEOUT' && e.wf === 'wf-0');
  assert.equal(stuck.sent.length, 1);
});

test('a run the user stopped picks up its job again when resumed', async () => {
  const rt = runtime();
  rt.runFor = 1e9;
  let polls = 0;
  const first = io(rt, 'k1', {wait: async () => { if (++polls === 2) throw new Stopped(); }});
  await assert.rejects(settleFaceJob(first), Stopped);
  assert.equal(rt.cancelled.length, 0);
  rt.jobs.get('k1').left = 0;
  const got = await settleFaceJob(io(rt, 'k1'));
  assert.equal(rt.jobs.size, 1);
  assert.equal(got.wf, 'wf-0');
  assert.equal(got.status.status, 'succeeded');
});
