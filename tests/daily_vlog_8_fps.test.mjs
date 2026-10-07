// daily-vlog-8's Draft script at the frame rates a new Draft can take from its Project. Shot times come from the
// song's plan (seconds); template offsets are 30000/1001 fps frames converted to the Draft's frames, and no sound
// overlay may ask past the end of its asset (Selects: "Resource overlay simulation covered only part of …").
// Given the reference's own ten-shot plan, every Draft call at 29.97 and 30 must match the fixed-plan script of
// origin/main (before the song plan). DAILY_VLOG_8_PANEL / DAILY_VLOG_8_BASE override the panels.
import test from 'node:test';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const panel = read(process.env.DAILY_VLOG_8_PANEL || path.join(root, 'plugins/daily-vlog-8/panel.tsx'));
const base = (() => {
  if (process.env.DAILY_VLOG_8_BASE) return read(process.env.DAILY_VLOG_8_BASE);
  try { return cp.execSync('git show origin/main:plugins/daily-vlog-8/panel.tsx', {cwd: root, encoding: 'utf8', maxBuffer: 1 << 26}); } catch { return null; }
})();

const constant = (src, name) => { const m = new RegExp('^const ' + name + ' = (.*);$', 'm').exec(src); return m ? JSON.parse(JSON.stringify(eval('(' + m[1] + ')'))) : undefined; };
const TSX = ['OPENING', 'MIDDLE', 'ENDING', 'SWISH', 'FILM_PRISM', 'AMBER_SHUTTER', 'AMBER_REFERENCE', 'FILM_GATE', 'VERTICAL_SMEAR', 'PRISM_SIX_SEVEN', 'LONG_DISSOLVE', 'ONE_FRAME_HOLD'];
// The Draft script string buildDailyVlog sends, with stand-in ids.
function scriptOf(src, cast = REFERENCE_CAST) {
  const start = src.indexOf('  const script = `', src.indexOf('async function buildDailyVlog(')) + '  const script = `'.length;
  const tpl = src.slice(start, src.indexOf('`;\n', start));
  const values = {
    projectId: 'p', draftName: 'n', DURATIONS: constant(src, 'DURATIONS'), SHOT_PLAN: constant(src, 'SHOT_PLAN'),
    ASSETS: constant(src, 'ASSETS'), ASSET_SECONDS: constant(src, 'ASSET_SECONDS'),
    inputs: Array.from({length: 8}, (_, i) => ({id: 'v' + i, path: null})),
    extraInputs: [{id: 'x0', path: null}, {id: 'x1', path: null}],
    cast, plan: {durationSeconds: cast[cast.length - 1].end},
  };
  values.assetPaths = values.ASSETS.map((a) => '/assets/' + a);
  for (const t of TSX) values[t] = 'tsx';
  return new Function(...Object.keys(values), 'return `' + tpl + '`;')(...Object.values(values));
}

// The reference's plan (origin/main's SHOT_PLAN, 30000/1001 fps frames) as song-plan shots: the opening, one
// phrase (j = phrase position; inserts at 3 and 5) and the closing shot, cast as origin/main casts them.
const REFERENCE_CAST = (() => {
  const rows = [['open', -1, 'v0', 129], ['slot', 0, 'v1', 78], ['slot', 1, 'v2', 49], ['slot', 2, 'v3', 52], ['insert', 3, 'x0', 31],
    ['slot', 4, 'v4', 21], ['insert', 5, 'x1', 45], ['slot', 6, 'v5', 54], ['slot', 7, 'v6', 54], ['close', 8, 'v7', 78]];
  let at = 0;
  return rows.map(([role, j, id, frames]) => ({role, j, id, pass: 0, start: at * 1001 / 30000, end: (at += frames) * 1001 / 30000}));
})();
// The asset lengths Selects reports (ffprobe of plugins/daily-vlog-8/assets).
const SECONDS = {'relaxed-urban-bed.wav': 69.84, 'projector-screen-vlog-bed.wav': 19.719728, 'transition-w2.wav': 1.389977, 'shutter-s2.wav': 0.516984, 'camera-r2.wav': 0.940726, 'shutter-c2.wav': 1, 'shutter-s6-1.wav': 0.213991, 'typing-k3.wav': 2.5};

// A fake script SDK whose Draft counts frames at `fps` (inserts round to whole frames) and refuses an overlay
// longer than its audio, as Selects does. Resolves the Draft calls in order.
async function run(script, fps, reported = fps, adopt = null) {
  const calls = [], clips = [];
  let cursor = 0, next = 0;
  const rows = [...Array.from({length: 8}, (_, i) => ({resourceId: 'v' + i, type: 'Video', name: 'v' + i, durationSeconds: 10})),
    {resourceId: 'x0', type: 'Video', name: 'x0', durationSeconds: 10}, {resourceId: 'x1', type: 'Video', name: 'x1', durationSeconds: 10},
    ...Object.entries(SECONDS).map(([name, s]) => ({resourceId: 'a:' + name, type: 'Audio', name, durationSeconds: s}))];
  const log = (name, arg) => calls.push(name + ' ' + JSON.stringify(arg));
  const draft = {
    meta: async () => ({fps: reported, frameSize: {width: 1080, height: 1920}}),
    insertResource: async (a) => { if (adopt && !clips.length) { fps = reported = adopt; } log('insertResource', a); const n = Math.round((a.sourceRange.endSeconds - a.sourceRange.startSeconds) * fps); clips.push({clipId: 'c' + next++, resourceId: a.resourceId, startFrame: cursor, endFrame: cursor + n, main: true}); cursor += n; },
    clips: async ({trackScope}) => clips.filter((c) => trackScope === 'all' || c.main),
    setClipAudio: async (a) => log('setClipAudio', a),
    setClipTransform: async (a) => log('setClipTransform', a),
    rangeAtFrames: async (a, b) => [a, b],
    addMotionGraphic: async (a) => log('addMotionGraphic', {label: a.label, within: a.within}),
    addTransition: async (a) => log('addTransition', {after: a.after.clipId, label: a.label, in: a.inOffsetSeconds, out: a.outOffsetSeconds}),
    overlayResource: async ({resource, over}) => {
      log('overlayResource', {resource, over});
      const name = resource.slice(2);
      if ((over[1] - over[0]) / fps > SECONDS[name] + 1e-3 / fps) throw new Error(`Resource overlay simulation covered only part of [${over[0]}, ${over[1]}) for resource <${name}>`);
      clips.push({clipId: 'c' + next++, resourceId: resource, startFrame: over[0], endFrame: over[1], main: false});
    },
    commitAll: async () => ({createdDraftId: 'd1'}),
  };
  const project = {resources: async () => rows, importFiles: async () => { throw new Error('nothing to import'); }, createDraft: async () => draft, resource: (id) => id, sourceFiles: async () => ({fileTree: []})};
  const AsyncFunction = (async () => {}).constructor;
  const result = await new AsyncFunction('selects', script)({project: () => project});
  return {result, calls, clips};
}

const RATES = [24000 / 1001, 24, 25, 30000 / 1001, 30, 60000 / 1001];
const BASE = 30000 / 1001;

for (const fps of RATES) {
  test(`builds at ${fps.toFixed(3)} fps with every sound inside its asset`, async () => {
    const {result, clips} = await run(scriptOf(panel), fps);
    assert.equal(result.videoClips, 10);
    // The video ends on the plan's last frame converted down, so the song always reaches it.
    assert.equal(result.frames, Math.floor(591 / BASE * fps + 1e-6));
    assert.ok(result.frames / fps <= SECONDS['relaxed-urban-bed.wav'] + 1e-9);
    const bed = clips.find((c) => c.resourceId === 'a:relaxed-urban-bed.wav');
    assert.deepEqual([bed.startFrame, bed.endFrame], [0, result.frames], 'the bed covers the whole video');
  });
}

for (const [from, to] of [[30, 24000 / 1001], [30000 / 1001, 25], [24, 60000 / 1001]]) {
  test(`a Draft that adopts its first clip's rate (${from.toFixed(3)} -> ${to.toFixed(3)}) still fits the bed`, async () => {
    const {result, clips} = await run(scriptOf(panel), from, from, to);
    assert.equal(result.videoClips, 10);
    assert.ok(result.frames / to <= SECONDS['relaxed-urban-bed.wav'] + 1e-9, String(result.frames));
    const bed = clips.find((c) => c.resourceId === 'a:relaxed-urban-bed.wav');
    assert.deepEqual([bed.startFrame, bed.endFrame], [0, result.frames]);
  });
}

test('a Draft reporting a rounded 29.97 builds like the exact rate', async () => {
  const exact = await run(scriptOf(panel), BASE);
  const rounded = await run(scriptOf(panel), BASE, 29.97);
  assert.deepEqual(rounded.result.frames, exact.result.frames);
});

for (const fps of [BASE, 30]) {
  test(`at ${fps.toFixed(3)} fps the reference plan makes origin/main's Draft calls`, {skip: base ? false : 'origin/main not available'}, async () => {
    const before = await run(scriptOf(base), fps);
    const after = await run(scriptOf(panel), fps);
    assert.deepEqual([after.result.frames, after.result.videoClips], [before.result.frames, before.result.videoClips]);
    assert.equal(after.calls.length, before.calls.length);
    after.calls = after.calls.map((c) => c.replaceAll('relaxed-urban-bed.wav', 'projector-screen-vlog-bed.wav'));
    for (let i = 0; i < after.calls.length; i++) {
      // Insert ranges are compared in frames (x/(30000/1001) and x*1001/30000 can differ in the last bit).
      const norm = (c) => c.startsWith('insertResource') ? c.replace(/"endSeconds":([0-9.e-]+)/, (_, v) => '"endFrames":' + Math.round(Number(v) * fps)).replace(/"startSeconds":([0-9.e-]+)/, (_, v) => '"startSeconds":' + Number(v).toFixed(6)) : c;
      assert.equal(norm(after.calls[i]), norm(before.calls[i]), 'call ' + i);
    }
  });
}

test('a song plan longer than the reference cycles the phrase and fills the whole song', async () => {
  const shots = [REFERENCE_CAST[0]];
  const phrase = REFERENCE_CAST.slice(1, 9);
  for (let k = 0; k < 4; k++) for (const p of phrase) { const s0 = shots[shots.length - 1].end, len = p.end - p.start; shots.push({...p, start: s0, end: s0 + len, pass: k}); }
  const s0 = shots[shots.length - 1].end;
  shots.push({...REFERENCE_CAST[9], start: s0, end: 69.84});
  const {result, clips, calls} = await run(scriptOf(panel, shots), BASE);
  assert.equal(result.shots, shots.length);
  assert.equal(result.frames, Math.floor(69.84 * BASE + 1e-6));
  const bed = clips.find((c) => c.resourceId === 'a:relaxed-urban-bed.wav');
  assert.deepEqual([bed.startFrame, bed.endFrame], [0, result.frames]);
  assert.equal(calls.filter((c) => c.startsWith('addTransition')).length, shots.length - 1);
  // The closing shot (v7, 10 s clip) is longer than its clip here, so it repeats the clip under the end card.
  assert.ok(clips.filter((c) => c.resourceId === 'v7').length >= 2);
});
