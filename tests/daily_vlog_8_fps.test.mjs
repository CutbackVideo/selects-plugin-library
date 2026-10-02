// daily-vlog-8's Draft script at the frame rates a new Draft can take from its Project. The template's frames are
// 30000/1001 fps frames; the script converts them to the Draft's frames, and no sound overlay may ask past the end
// of its asset (Selects: "Resource overlay simulation covered only part of …"). At 29.97 and 30 every Draft call
// must match origin/main's script exactly. DAILY_VLOG_8_PANEL / DAILY_VLOG_8_BASE override the panels.
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
function scriptOf(src) {
  const start = src.indexOf('  const script = `', src.indexOf('async function buildDailyVlog(')) + '  const script = `'.length;
  const tpl = src.slice(start, src.indexOf('`;\n', start));
  const values = {
    projectId: 'p', draftName: 'n', DURATIONS: constant(src, 'DURATIONS'), SHOT_PLAN: constant(src, 'SHOT_PLAN'),
    ASSETS: constant(src, 'ASSETS'), ASSET_SECONDS: constant(src, 'ASSET_SECONDS'),
    inputs: Array.from({length: 8}, (_, i) => ({id: 'v' + i, path: null})),
    extraInputs: [{id: 'x0', path: null}, {id: 'x1', path: null}],
  };
  values.assetPaths = values.ASSETS.map((a) => '/assets/' + a);
  for (const t of TSX) values[t] = 'tsx';
  return new Function(...Object.keys(values), 'return `' + tpl + '`;')(...Object.values(values));
}

// The asset lengths Selects reports (ffprobe of plugins/daily-vlog-8/assets).
const SECONDS = {'projector-screen-vlog-bed.wav': 19.719728, 'transition-w2.wav': 1.389977, 'shutter-s2.wav': 0.516984, 'camera-r2.wav': 0.940726, 'shutter-c2.wav': 1, 'shutter-s6-1.wav': 0.213991, 'typing-k3.wav': 2.5};

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
    // The video ends on the template's last frame converted down, so the bed always reaches it.
    assert.equal(result.frames, Math.floor(591 / BASE * fps + 1e-6));
    assert.ok(result.frames / fps <= SECONDS['projector-screen-vlog-bed.wav'] + 1e-9);
    const bed = clips.find((c) => c.resourceId === 'a:projector-screen-vlog-bed.wav');
    assert.deepEqual([bed.startFrame, bed.endFrame], [0, result.frames], 'the bed covers the whole video');
  });
}

for (const [from, to] of [[30, 24000 / 1001], [30000 / 1001, 25], [24, 60000 / 1001]]) {
  test(`a Draft that adopts its first clip's rate (${from.toFixed(3)} -> ${to.toFixed(3)}) still fits the bed`, async () => {
    const {result, clips} = await run(scriptOf(panel), from, from, to);
    assert.equal(result.videoClips, 10);
    assert.ok(result.frames / to <= SECONDS['projector-screen-vlog-bed.wav'] + 1e-9, String(result.frames));
    const bed = clips.find((c) => c.resourceId === 'a:projector-screen-vlog-bed.wav');
    assert.deepEqual([bed.startFrame, bed.endFrame], [0, result.frames]);
  });
}

test('a Draft reporting a rounded 29.97 builds like the exact rate', async () => {
  const exact = await run(scriptOf(panel), BASE);
  const rounded = await run(scriptOf(panel), BASE, 29.97);
  assert.deepEqual(rounded.result.frames, exact.result.frames);
});

for (const fps of [BASE, 30]) {
  test(`at ${fps.toFixed(3)} fps every Draft call matches origin/main`, {skip: base ? false : 'origin/main not available'}, async () => {
    const before = await run(scriptOf(base), fps);
    const after = await run(scriptOf(panel), fps);
    assert.deepEqual(after.result, before.result);
    assert.equal(after.calls.length, before.calls.length);
    for (let i = 0; i < after.calls.length; i++) {
      // Insert ranges are compared in frames (x/(30000/1001) and x*1001/30000 can differ in the last bit).
      const norm = (c) => c.startsWith('insertResource') ? c.replace(/"endSeconds":([0-9.e-]+)/, (_, v) => '"endFrames":' + Math.round(Number(v) * fps)) : c;
      assert.equal(norm(after.calls[i]), norm(before.calls[i]), 'call ' + i);
    }
  });
}

test('origin/main fails where the frame rate makes the video outlast the bed', {skip: base ? false : 'origin/main not available'}, async () => {
  // 25 fps: ten shots rounded one by one end at frame 494, past the bed's 492.99 frames.
  await assert.rejects(run(scriptOf(base), 25), /covered only part of \[0, 494\)/);
});
