// daily-vlog-8 builds the team's reference edit (tests/fixtures/daily-vlog-8/reference-edit.json, read from the
// Clip highlights draft at 25 fps): the real buildDailyVlog runs against a fake Selects Draft and every Main clip,
// transition, motion graphic and sound must land on its frames. Other rates scale by round(f * fps / 25).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {panelSource, loadPanelFunctions, fakeHost, hostGlobals} from './windows_host.mjs';

const REF = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures/daily-vlog-8/reference-edit.json'), 'utf8'));
const source = process.env.DAILY_VLOG_PANEL ? fs.readFileSync(process.env.DAILY_VLOG_PANEL, 'utf8') : panelSource('daily-vlog-8');
const NAMES = ['ASSETS', 'ASSET_SECONDS', 'OPENING', 'MIDDLE', 'ENDING', 'FILM_PRISM', 'AMBER_REFERENCE', 'FILM_GATE', 'VERTICAL_SMEAR',
  'REFERENCE', 'castReference', 'buildDailyVlog'];
const {buildDailyVlog} = loadPanelFunctions(source, NAMES, hostGlobals(fakeHost({})));
// The Selects motion-graphic code hash (the dump's codeHash).
const codeHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); };
const SECONDS = {'relaxed-urban-bed.wav': 69.84, 'transition-w2.wav': 1.389977, 'shutter-s2.wav': 0.516984, 'camera-r2.wav': 0.940726, 'shutter-c2.wav': 1, 'shutter-s6-1.wav': 0.213991, 'typing-k3.wav': 2.5};

// A fake Draft: inserts round to whole frames, overlays go to the first audio track free over their range, a
// transition spans round(offset * fps) frames each side of its cut.
async function build(fps, {clipSeconds = 30, clips = 8, frameSize = {width: 1920, height: 1080}, reported = fps, adopt = null} = {}) {
  const initialFps = fps, initialReported = reported; let draftCount=0, commits=0;
  const rows = [...Array.from({length: 9}, (_, i) => ({resourceId: 'v' + i, type: 'Video', name: 'v' + i, durationSeconds: clipSeconds})),
    ...Object.entries(SECONDS).map(([name, s]) => ({resourceId: 'a:' + name, type: 'Audio', name, durationSeconds: s}))];
  const main = [], audio = [], transitions = [], graphics = [], transforms = [], inserts = [];
  let cursor = 0, next = 0;
  const draft = {
    meta: async () => ({fps: reported, frameSize}),
    insertResource: async (a) => { if (adopt && !main.length) fps = reported = adopt; inserts.push(a); const n = Math.round((a.sourceRange.endSeconds - a.sourceRange.startSeconds) * fps); main.push({clipId: 'c' + next++, resourceId: a.resourceId, startFrame: cursor, endFrame: cursor + n}); cursor += n; },
    clips: async ({trackScope}) => trackScope === 'main' ? main : [...main, ...audio],
    setClipAudio: async () => {},
    setClipTransform: async (a) => transforms.push({clipId: a.clip.clipId, scale: a.scale.x, x: a.position?.x || 0}),
    rangeAtFrames: async (a, b) => [a, b],
    addMotionGraphic: async (a) => graphics.push({name: a.label, start: a.within[0], end: a.within[1], codeHash: codeHash(a.tsxCode), parameters: a.parameters}),
    addTransition: async (a) => transitions.push({name: a.label, edit: a.after.endFrame, start: a.after.endFrame - Math.round(a.inOffsetSeconds * fps), end: a.after.endFrame + Math.round(a.outOffsetSeconds * fps)}),
    overlayResource: async ({resource, over, sourceStartSeconds = 0}) => {
      const name = resource.slice(2);
      if ((over[1] - over[0]) / fps > SECONDS[name] - sourceStartSeconds + 1e-3 / fps) throw new Error('overlay past the end of ' + name);
      let track = 0;
      while (audio.some((c) => c.track === track && c.startFrame < over[1] && over[0] < c.endFrame)) track++;
      audio.push({clipId: 'c' + next++, resourceId: resource, name, startFrame: over[0], endFrame: over[1], track, sourceStartSeconds});
    },
    commitAll: async () => { commits++; return {createdDraftId: 'd1'}; },
  };
  const project = {resources: async () => rows, importFiles: async () => { throw new Error('nothing to import'); }, createDraft: async () => { main.length=audio.length=transitions.length=graphics.length=transforms.length=inserts.length=0; cursor=0; next=0; fps=initialFps; reported=initialReported; draftCount++; return draft; }, resource: (id) => id, sourceFiles: async () => ({fileTree: rows.filter((r) => r.type === 'Video').map((r) => ({type: 'file', resourceId: r.resourceId, frameSize: {width: 4096, height: 2160}}))})};
  const AsyncFunction = (async () => {}).constructor;
  const sdk = {runScript: async ({summary, script}) => summary === 'Find the plugin files' ? {result: {plugin: '/plugin'}} : {result: await new AsyncFunction('selects', script)({project: () => project})}};
  const result = await buildDailyVlog(sdk, {projectId: 'p', titleId: 'v0', order: clips < 8 ? ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', null, 'v7'] : Array.from({length: 8}, (_, i) => 'v' + (i + 1))});
  return {result, main, audio, transitions, graphics, transforms, inserts, draftCount, commits};
}
const at = (f, fps) => Math.round(f * fps / REF.fps);

test('at 25 fps the default build is the reference timeline, frame for frame', async () => {
  const b = await build(25);
  assert.equal(b.result.frames, 512);
  // Main: every clip's frames and which input fills it (fixture clip 0 = the opening, 1-8 = the clips in order).
  assert.deepEqual(b.main.map((c) => [c.startFrame, c.endFrame, c.resourceId]), REF.main.map((c) => [c.start, c.end, 'v' + c.clip]));
  // At the split the same clip's source jumps on as in the reference (draft.seams()).
  const [a, s] = b.inserts.filter((x) => x.resourceId === 'v3');
  assert.ok(Math.abs(s.sourceRange.startSeconds - a.sourceRange.endSeconds - REF.sourceJumps[0].frames / REF.fps) < 1e-9);
  // Reframes (the fake reports 4096x2160 sources, as the reference's 1.1 clips are; none of them needs a cover scale).
  const byClip = new Map(b.transforms.map((t) => [t.clipId, t]));
  assert.deepEqual(b.main.map((c) => [byClip.get(c.clipId)?.scale ?? 1, byClip.get(c.clipId)?.x ?? 0]), REF.main.map((c) => [c.scale, c.x]));
  assert.ok(REF.main.every((c) => c.effects.length === 0 && c.opacity === 100), 'the reference has no clip effects to add');
  assert.deepEqual(b.transitions, REF.transitions);
  assert.deepEqual(b.graphics, REF.motionGraphics);
  assert.deepEqual(REF.overlayVideo, REF.motionGraphics.map((m) => [m.start, m.end]), 'the overlay video track is the motion graphics');
  // Music: Relaxed Urban Bed from 36.04 s over the whole video, on its own track.
  const music = b.audio.find((c) => c.name === 'relaxed-urban-bed.wav');
  assert.deepEqual([music.startFrame, music.endFrame, music.sourceStartSeconds], [0, 512, REF.musicSourceStartSeconds]);
  // Sounds: asset and frames, and which share a track (first-fit placement in call order, as Selects places overlays;
  // the dump's track ids are arbitrary).
  const refAudio = REF.audio.map((c) => ({...c, name: c.name === 'Relaxed Urban Bed.wav' ? 'relaxed-urban-bed.wav' : c.name}));
  const groups = (rows) => Object.values(rows.reduce((g, c) => ((g[c.track] ??= []).push([c.name, c.start ?? c.startFrame, c.end ?? c.endFrame]), g), {})).map((x) => JSON.stringify(x.sort((p, q) => p[1] - q[1]))).sort();
  assert.deepEqual(groups(b.audio), groups(refAudio));
});

for (const fps of [24000 / 1001, 24, 30000 / 1001, 30, 50, 60000 / 1001]) {
  test(`at ${fps.toFixed(3)} fps every reference frame scales by round(f * fps / 25)`, async () => {
    const b = await build(fps);
    assert.equal(b.result.frames, at(512, fps));
    assert.deepEqual(b.main.map((c) => [c.startFrame, c.endFrame]), REF.main.map((c) => [at(c.start, fps), at(c.end, fps)]));
    assert.deepEqual(b.transitions.map((t) => [t.edit, t.start, t.end]), REF.transitions.map((t) => [at(t.edit, fps), at(t.edit, fps) - at(t.edit - t.start, fps), at(t.edit, fps) + at(t.end - t.edit, fps)]));
    assert.deepEqual(b.graphics.map((g) => [g.start, g.end]), REF.motionGraphics.map((m) => [at(m.start, fps), at(m.end, fps)]));
    // A sound never runs past its asset, so it may stop a frame short of the scaled reference end.
    for (const c of REF.audio) {
      const name = c.name === 'Relaxed Urban Bed.wav' ? 'relaxed-urban-bed.wav' : c.name;
      assert.ok(b.audio.some((x) => x.name === name && x.startFrame === at(c.start, fps) && Math.abs(x.endFrame - at(c.end, fps)) <= 1), name + ' at ' + c.start);
    }
  });
}

test('short clips repeat and a missing eighth clip reuses the opening clip, on the same frames', async () => {
  const b = await build(25, {clipSeconds: 2.6, clips: 7});
  assert.equal(b.result.frames, 512);
  const cuts = [...new Set(b.main.map((c) => c.endFrame))];
  for (const c of REF.main) assert.ok(cuts.includes(c.end), 'cut at ' + c.end);
  assert.ok(b.main.some((c) => c.startFrame === 411 && c.resourceId === 'v0'));
});

test('a Draft reporting a rounded 29.97 builds like the exact rate', async () => {
  const exact = await build(30000 / 1001), rounded = await build(30000 / 1001, {reported: 29.97});
  assert.deepEqual(rounded.main, exact.main);
});

for (const [from, to] of [[24000 / 1001, 30000 / 1001], [30, 24000 / 1001], [30000 / 1001, 25], [24, 60000 / 1001]]) {
  test(`a Draft that adopts its first clip's rate (${from.toFixed(3)} -> ${to.toFixed(3)}) keeps the reference frames`, async () => {
    const b = await build(from, {adopt: to});
    // The SDK can adopt the source rate on first insert: the saved opening must already end at its transition frame.
    assert.equal(b.main[0].endFrame, at(REF.main[0].end, to));
    assert.deepEqual(b.main.slice(1).map((c) => c.endFrame), REF.main.slice(1).map((c) => at(c.end, to)));
    const music = b.audio.find((c) => c.name === 'relaxed-urban-bed.wav');
    assert.deepEqual([music.startFrame, music.endFrame], [0, at(512, to)]);
    assert.equal(b.draftCount,2); assert.equal(b.commits,1, 'only the correctly timed attempt is saved');
  });
}
