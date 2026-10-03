// portrait-beat-montage's Draft script at the frame rates a new Draft can take from its Project. The manifest's frames
// (pipeline.py / pbmAssemble) are 30000/1001 fps frames; the script converts them to the Draft's frames, and no sound
// overlay may ask past the end of its asset (Selects: "Resource overlay simulation covered only part of ..."). At 29.97
// and 30 every Draft call must match origin/main's script exactly. PORTRAIT_BEAT_MONTAGE_PANEL /
// PORTRAIT_BEAT_MONTAGE_BASE override the panels.
import test from 'node:test';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const panel = read(process.env.PORTRAIT_BEAT_MONTAGE_PANEL || path.join(root, 'plugins/portrait-beat-montage/panel.tsx'));
const base = (() => {
  if (process.env.PORTRAIT_BEAT_MONTAGE_BASE) return read(process.env.PORTRAIT_BEAT_MONTAGE_BASE);
  try { return cp.execSync('git show origin/main:plugins/portrait-beat-montage/panel.tsx', {cwd: root, encoding: 'utf8', maxBuffer: 1 << 26}); } catch { return null; }
})();

// The manifest both builds hand to buildMontage (pipeline.py op_assemble / panel.tsx pbmAssemble).
const FPS = 60, BASE = 30000 / 1001, BLACK = 370, PERIOD = .6445104895, TAIL = 30, RISER_START = 300;
const pyRound = (x) => { const f = Math.floor(x), d = x - f; return d > .5 || (d === .5 && f % 2 !== 0) ? f + 1 : f; };
const BEATS = Array.from({length: 16}, (_, i) => pyRound(i * PERIOD * FPS));
const STROBE_START = BLACK - 120;
const draftFrame = (m) => Math.floor(m / FPS * BASE + .5);
const marks = [STROBE_START, ...BEATS.slice(0, -1).map((b) => BLACK + b), BLACK + BEATS[15], BLACK + BEATS[15] + TAIL];
const names = ['strobe', ...Array.from({length: 15}, (_, n) => 'shot' + String(n + 1).padStart(2, '0')), 'glow'];
const segs = names.map((name, i) => ({name, start: draftFrame(marks[i]), end: draftFrame(marks[i + 1])}));
const TOTAL = segs[segs.length - 1].end;

// The asset lengths Selects reports (ffprobe of plugins/portrait-beat-montage/assets: 784000, 96000 and 56000 samples at 48 kHz).
const SECONDS = {'music-bed.wav': 784000 / 48000, 'shutter.wav': 2, 'riser.wav': 56000 / 48000};

const constant = (src, name) => { const m = new RegExp('^const ' + name + ' = (.*);$', 'm').exec(src); return m ? eval('(' + m[1] + ')') : {}; };
// The Draft script string buildMontage sends, with stand-in ids.
function scriptOf(src) {
  const start = src.indexOf('  const script = `', src.indexOf('async function buildMontage(')) + '  const script = `'.length;
  const tpl = src.slice(start, src.indexOf('`;\n', start));
  const seconds = constant(src, 'ASSET_SECONDS');
  const cfg = {
    projectId: 'p', name: 'n', gap: segs[0].start, end: TOTAL,
    clips: segs.map((s) => ({id: 'v:' + s.name, frames: s.end - s.start, start: s.start, name: s.name})),
    audio: [['music-bed.wav', 0, TOTAL], ['shutter.wav', draftFrame(STROBE_START), draftFrame(BLACK)], ['riser.wav', draftFrame(RISER_START), draftFrame(BLACK)]]
      .map(([name, s, e]) => ({id: 'a:' + name, start: s, end: e, name, ...(name in seconds ? {seconds: seconds[name]} : {})})),
  };
  return new Function('json', 'cfg', 'return `' + tpl + '`;')(JSON.stringify, cfg);
}

// A fake script SDK, after Selects (cutback-client McpRendererBridge.simulatePlaceBroll, MediaClipTiming): the Draft
// counts frames at `fps` (inserts round to whole frames); an audio asset is round(seconds * projectFps) frames on the
// Project's grid, an overlay of n Draft frames asks round(n / fps * projectFps) of them, and asking more is refused.
// `adopt`: the rate the Draft switches to at its first inserted clip.
async function run(script, fps, reported = fps, adopt = null) {
  const projectFps = fps, calls = [], main = [], overlays = [];
  let next = 0;
  const rows = [...segs.map((s) => ({resourceId: 'v:' + s.name, type: 'Video', name: s.name + '.mp4', durationSeconds: (s.end - s.start) / BASE})),
    ...Object.entries(SECONDS).map(([name, s]) => ({resourceId: 'a:' + name, type: 'Audio', name, durationSeconds: s}))];
  const log = (name, arg) => calls.push(name + ' ' + JSON.stringify(arg));
  const cursor = () => (main.length ? main[main.length - 1].endFrame : 0);
  const draft = {
    setFrameSize: async (a) => log('setFrameSize', a),
    meta: async () => ({fps: reported, frameSize: {width: 1080, height: 1440}}),
    insertGap: async (a) => { log('insertGap', a); const n = Math.round(a.seconds * fps); main.push({clipId: 'g' + next++, startFrame: cursor(), endFrame: cursor() + n}); },
    insertResource: async (a) => {
      if (adopt && !main.some((c) => c.resourceId)) {
        // The Draft takes the clip's rate; what is already there keeps its time.
        for (const c of main) { c.startFrame = Math.round(c.startFrame / fps * adopt); c.endFrame = Math.round(c.endFrame / fps * adopt); }
        fps = reported = adopt;
      }
      log('insertResource', a);
      // The piece is round(seconds * projectFps) frames on the Project's grid (timeline-edit.ts insertResource).
      const row = rows.find((r) => r.resourceId === a.resourceId), have = Math.round(row.durationSeconds * projectFps);
      if (a.sourceRange.endSeconds > have / projectFps) throw new Error('invalid_source_range: ' + row.name + ' ' + a.sourceRange.endSeconds + ' > ' + have / projectFps);
      const src = Math.round(a.sourceRange.endSeconds * projectFps) - Math.round(a.sourceRange.startSeconds * projectFps);
      const n = Math.round(src / projectFps * fps);
      main.push({clipId: 'c' + next++, resourceId: a.resourceId, startFrame: cursor(), endFrame: cursor() + n});
    },
    clips: async ({trackScope}) => (trackScope === 'all' ? [...main, ...overlays] : main).map((c) => ({...c})),
    rangeAtFrames: async (a, b) => [a, b],
    overlayResource: async ({resource, over}) => {
      log('overlayResource', {resource, over});
      const name = resource.slice(2);
      const have = Math.round(SECONDS[name] * projectFps), want = Math.max(1, Math.round((over[1] - over[0]) / fps * projectFps));
      if (over[0] < 0 || over[0] >= cursor()) throw new Error(`atFrame ${over[0]} is out of range`);
      if (want > have) throw new Error(`Resource overlay simulation covered only part of [${over[0]}, ${over[1]}) for resource ${name}`);
      overlays.push({clipId: 'o' + next++, resourceId: resource, startFrame: over[0], endFrame: over[1]});
    },
    commitAll: async (m) => { log('commitAll', m); return {createdDraftId: 'd1'}; },
  };
  const project = {resources: async () => rows, createDraft: async (a) => { log('createDraft', a); return draft; }, resource: (id) => id};
  const AsyncFunction = (async () => {}).constructor;
  const result = await new AsyncFunction('selects', script)({project: () => project});
  return {result, calls, main, overlays, fps};
}

// `drift`: how many Draft frames a cut may land off the converted plan. Selects counts each rendered piece in whole
// Project frames (round(seconds * projectFps)), so off 29.97/30 a piece can be up to half a Project frame short, and
// the shortfall adds up until a longer piece catches it up.
const conv = (f, fps) => Math.floor(f / BASE * fps + 1e-6);
function assertFits({result, main, overlays, fps}, label, drift) {
  assert.equal(result.shots, segs.length, label);
  const shots = main.filter((c) => c.resourceId);
  for (let i = 1; i < shots.length; i++) assert.equal(shots[i].startFrame, shots[i - 1].endFrame, label + ' contiguous');
  shots.forEach((c, i) => assert.ok(Math.abs(c.startFrame - conv(segs[i].start, fps)) <= drift, label + ' ' + segs[i].name + ' at ' + c.startFrame));
  assert.ok(Math.abs(result.end - conv(TOTAL, fps)) <= drift, label + ' end ' + result.end);
  const bed = overlays.find((c) => c.resourceId === 'a:music-bed.wav');
  assert.equal(bed.startFrame, 0);
  // The bed runs to the end of the video, or to its own last whole frame.
  assert.ok(bed.endFrame <= result.end && bed.endFrame >= Math.min(result.end, Math.floor(SECONDS['music-bed.wav'] * fps + 1e-3)), label + ' bed ' + bed.endFrame + '/' + result.end);
  const shutter = overlays.find((c) => c.resourceId === 'a:shutter.wav'), riser = overlays.find((c) => c.resourceId === 'a:riser.wav');
  assert.equal(shutter.startFrame, shots[0].startFrame, label + ' shutter starts with the strobe');
  assert.ok(riser.endFrame <= shots[1].startFrame && shutter.endFrame <= shots[1].startFrame, label + ' sounds end by shot 1');
}

const RATES = [24000 / 1001, 24, 25, BASE, 30, 50, 60000 / 1001, 60];
for (const fps of RATES) {
  test(`builds at ${fps.toFixed(3)} fps with every sound inside its asset`, async () => {
    assertFits(await run(scriptOf(panel), fps), fps.toFixed(3), 2);
  });
}

// The pieces are 29.97 fps files, so a real switch lands on 29.97; the others stress the conversion.
for (const [from, to, drift] of [[24000 / 1001, BASE, 1], [25, BASE, 1], [30, 24000 / 1001, 2], [BASE, 25, 1], [24, 60000 / 1001, 10]]) {
  test(`a Draft that adopts its first clip's rate (${from.toFixed(3)} -> ${to.toFixed(3)}) still fits every sound`, async () => {
    const r = await run(scriptOf(panel), from, from, to);
    assert.equal(r.fps, to);
    assertFits(r, from.toFixed(3) + '->' + to.toFixed(3), drift);
  });
}

test('a Draft reporting a rounded 29.97 builds like the exact rate', async () => {
  const exact = await run(scriptOf(panel), BASE);
  const rounded = await run(scriptOf(panel), BASE, 29.97);
  assert.deepEqual(rounded.result, exact.result);
  assert.deepEqual(rounded.overlays, exact.overlays);
});

test('at 29.97 the bed, shutter and riser keep their 490, 60 and 35 frames', async () => {
  const {overlays} = await run(scriptOf(panel), BASE);
  assert.deepEqual(overlays.map((o) => [o.resourceId, o.startFrame, o.endFrame]),
    [['a:music-bed.wav', 0, 490], ['a:shutter.wav', 125, 185], ['a:riser.wav', 150, 185]]);
});

for (const fps of [BASE, 30]) {
  test(`at ${fps.toFixed(3)} fps every Draft call matches origin/main`, {skip: base ? false : 'origin/main not available'}, async () => {
    const before = await run(scriptOf(base), fps);
    const after = await run(scriptOf(panel), fps);
    assert.deepEqual(after.result, before.result);
    assert.equal(after.calls.length, before.calls.length);
    // Insert ranges are compared in frames (c.frames/fps and c.frames*1001/30000 can differ in the last bit).
    const norm = (c) => c.startsWith('insertResource') ? c.replace(/"endSeconds":([0-9.e-]+)/, (_, v) => '"endFrames":' + Math.round(Number(v) * fps)) : c;
    for (let i = 0; i < after.calls.length; i++) assert.equal(norm(after.calls[i]), norm(before.calls[i]), 'call ' + i);
  });
}
