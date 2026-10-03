// cinema-vlog-studio's Draft script at the frame rates a new Draft can take from its Project. The cut table is in
// 30 fps reference frames; the script converts them to the Draft's frames, and no sound overlay may ask past the end
// of its asset (Selects: "Resource overlay simulation covered only part of …"). At 29.97 and 30 every Draft call must
// match origin/main's script exactly. CINEMA_VLOG_STUDIO_PANEL / CINEMA_VLOG_STUDIO_BASE override the panels.
import test from 'node:test';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {loadPanelFunctions, topLevel} from './windows_host.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const panel = read(process.env.CINEMA_VLOG_STUDIO_PANEL || path.join(root, 'plugins/cinema-vlog-studio/panel.tsx'));
const base = (() => {
  if (process.env.CINEMA_VLOG_STUDIO_BASE) return read(process.env.CINEMA_VLOG_STUDIO_BASE);
  try { return cp.execSync('git show origin/main:plugins/cinema-vlog-studio/panel.tsx', {cwd: root, encoding: 'utf8', maxBuffer: 1 << 26}); } catch { return null; }
})();

const NAMES = ['clean', 'TITLE', 'CURTAIN', 'GLITCH', 'FLASH', 'CARD', 'CARD_FLASH', 'ASSET_SECONDS', 'CUTS', 'STARTS',
  'GLITCH_SLOT', 'GLITCH_NOTE_KO', 'isGlitchNote', 'cinemaCuts', 'assembly'];
// The Draft script string the panel sends for the reference cut table, with stand-in ids.
function scriptOf(src) {
  const has = (n) => { try { topLevel(src, n); return true; } catch { return false; } };
  const {assembly, cinemaCuts, GLITCH_SLOT} = loadPanelFunctions(src, NAMES.filter(has));
  const {cuts, starts, cards, gapBeforeIndex, glitchRefFrame} = cinemaCuts(null);
  const videoIds = Array.from({length: GLITCH_SLOT}, (_, i) => 'v' + i);
  return assembly({
    projectId: 'p', name: 'n', cuts, starts, cards, gapBeforeIndex, glitchRefFrame, videoIds,
    musicId: 'a:music', introFxId: 'a:intro', effectSoundId: 'a:click',
    lengths: Object.fromEntries(videoIds.map((id) => [id, 20])),
    kicker: 'K', title: 'T', subtitle: 'S', font: 'Georgia',
  });
}

// The asset lengths Selects reports (ffprobe of plugins/cinema-vlog-studio/assets).
const SECONDS = {'a:intro': 6.798, 'a:music': 25.032, 'a:click': 0.33};

// A fake script SDK whose Draft counts frames at `fps` (inserts and gaps round to whole frames, gaps are blank Main
// rows) and refuses an overlay longer than its audio rounded to Draft frames: Selects refuses 408 frames of the intro
// at 59.94 (407.47 frames long) but plays 204 frames of it at 29.97 (203.74). `adopt`: the Draft takes that rate on
// its first clip insert, keeping the frames already placed. Resolves the Draft calls in order.
async function run(script, fps, reported = fps, adopt = null) {
  const calls = [], clips = [];
  let next = 0;
  const mainEnd = () => clips.filter((c) => c.trackKind === 'main').reduce((n, c) => Math.max(n, c.endFrame), 0);
  const rows = [...Array.from({length: 16}, (_, i) => ({resourceId: 'v' + i, type: 'Video', name: 'v' + i, durationSeconds: 20})),
    ...Object.entries(SECONDS).map(([id, s]) => ({resourceId: id, type: 'Audio', name: id, durationSeconds: s}))];
  const log = (name, arg) => calls.push(name + ' ' + JSON.stringify(arg));
  const draft = {
    meta: async () => ({fps: reported, frameSize: {width: 1920, height: 1080}}),
    setFrameSize: async (a) => log('setFrameSize', a),
    insertGap: async (a) => { log('insertGap', a); const s = mainEnd(); clips.push({clipId: 'c' + next++, resourceId: null, trackKind: 'main', startFrame: s, endFrame: s + Math.round(a.seconds * fps)}); },
    insertResource: async (a) => {
      if (adopt && !clips.some((c) => c.resourceId)) { fps = reported = adopt; }
      log('insertResource', a);
      const s = mainEnd(), n = Math.round((a.sourceRange.endSeconds - a.sourceRange.startSeconds) * fps);
      clips.push({clipId: 'c' + next++, resourceId: a.resourceId, trackKind: 'main', startFrame: s, endFrame: s + n});
    },
    clips: async ({trackScope}) => clips.filter((c) => trackScope === 'all' || c.trackKind === 'main').map((c) => ({...c})),
    setClipAudio: async (a) => log('setClipAudio', {...a, clip: a.clip.clipId}),
    addVideoEffect: async (a) => log('addVideoEffect', {...a, clip: a.clip.clipId}),
    rangeAtFrames: async (a, b) => [a, b],
    addMotionGraphic: async (a) => { log('addMotionGraphic', a); clips.push({clipId: 'c' + next++, resourceId: null, trackKind: 'graphic', startFrame: a.within[0], endFrame: a.within[1]}); },
    overlayResource: async (a) => {
      log('overlayResource', a);
      const [s, e] = a.over;
      if (e - s > Math.round(SECONDS[a.resource] * fps)) throw new Error(`Resource overlay simulation covered only part of [${s}, ${e}) for resource <${a.resource}>`);
      clips.push({clipId: 'c' + next++, resourceId: a.resource, trackKind: 'audio', startFrame: s, endFrame: e});
    },
    commitAll: async () => ({createdDraftId: 'd1'}),
  };
  const project = {resources: async () => rows, createDraft: async () => draft, resource: (id) => id};
  const AsyncFunction = (async () => {}).constructor;
  const result = await new AsyncFunction('selects', script)({project: () => project, draft: () => draft});
  return {result, calls, clips, fps};
}

const RATES = [24000 / 1001, 24, 25, 30000 / 1001, 30, 60000 / 1001];
const ref = (n, fps) => Math.round(n / 30 * fps);
const overlay = (clips, id) => clips.find((c) => c.resourceId === id);

for (const fps of RATES) {
  test(`builds at ${fps.toFixed(3)} fps with every sound inside its asset`, async () => {
    const {result, clips} = await run(scriptOf(panel), fps);
    assert.equal(result.mainClips, 25, '23 cuts and 2 gaps');
    assert.equal(result.endFrame, ref(641, fps));
    const intro = overlay(clips, 'a:intro');
    assert.deepEqual([intro.startFrame, intro.endFrame], [0, Math.min(ref(204, fps), Math.round(6.798 * fps))]);
    const music = overlay(clips, 'a:music');
    assert.deepEqual([music.startFrame, music.endFrame], [ref(204, fps), result.endFrame]);
    const click = overlay(clips, 'a:click');
    assert.equal(click.endFrame - click.startFrame, ref(7, fps), 'the click keeps its reference length');
  });
}

for (const [from, to] of [[30, 24000 / 1001], [30000 / 1001, 25], [24, 60000 / 1001], [30, 24]]) {
  test(`a Draft that adopts its first clip's rate (${from.toFixed(3)} -> ${to.toFixed(3)}) cuts and scores at the new rate`, async () => {
    const {result, clips} = await run(scriptOf(panel), from, from, to);
    assert.equal(result.fps, to);
    assert.equal(result.mainClips, 25);
    assert.equal(result.endFrame, ref(641, to), 'the last cut ends on frame 641 converted to the new rate');
    const main = clips.filter((c) => c.trackKind === 'main' && c.resourceId);
    // From the second cut on, every cut ends on its converted reference frame.
    const {cinemaCuts} = loadPanelFunctions(panel, NAMES.filter((n) => { try { topLevel(panel, n); return true; } catch { return false; } }));
    const {cuts} = cinemaCuts(null);
    for (let i = 1; i < cuts.length; i++) assert.equal(main[i].endFrame, ref(cuts[i][2], to), 'cut ' + i);
    const intro = overlay(clips, 'a:intro');
    assert.ok(intro.endFrame <= Math.round(SECONDS['a:intro'] * to), String(intro.endFrame));
  });
}

test('a Draft reporting a rounded 29.97 builds like the exact rate', async () => {
  const exact = await run(scriptOf(panel), 30000 / 1001);
  const rounded = await run(scriptOf(panel), 30000 / 1001, 29.97);
  assert.deepEqual(rounded.calls, exact.calls);
  assert.equal(rounded.result.endFrame, exact.result.endFrame);
});

for (const fps of [30000 / 1001, 30]) {
  test(`at ${fps.toFixed(3)} fps every Draft call matches origin/main`, {skip: base ? false : 'origin/main not available'}, async () => {
    const before = await run(scriptOf(base), fps);
    const after = await run(scriptOf(panel), fps);
    assert.deepEqual(after.result, before.result);
    assert.equal(after.calls.length, before.calls.length);
    for (let i = 0; i < after.calls.length; i++) assert.equal(after.calls[i], before.calls[i], 'call ' + i);
  });
}

test('origin/main asks for more intro than the asset holds at 59.94', {skip: base ? false : 'origin/main not available'}, async () => {
  await assert.rejects(run(scriptOf(base), 60000 / 1001), /covered only part of \[0, 408\) for resource <a:intro>/);
});
