// gongju-gallery's Draft script at the frame rates a new Draft can take from its Project. CUTS are frames at
// 30000/1001; the script converts them to the Draft's frames, so the shots, title and music line up in time,
// 29.97 stays exactly as before, and every shot fits inside its crop (CROP_SPARE_FRAMES).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(process.env.GONGJU_GALLERY_PANEL || path.resolve(import.meta.dirname, '../plugins/gongju-gallery/panel.tsx'), 'utf8');
const line = (name) => { const m = new RegExp('^const ' + name + ' = .*;$', 'm').exec(src); assert.ok(m, name); return m[0]; };
const fn = (name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i) + 2); };
const {galleryScript, CUTS, AUDIO_END_FRAME, CROP_SPARE_FRAMES} = new Function(
  [line('CUTS'), line('AUDIO_END_FRAME'), line('TITLE_GRAPHIC'), line('CROP_SPARE_FRAMES'), fn('galleryScript')].join('\n') +
  '\nreturn {galleryScript, CUTS, AUDIO_END_FRAME, CROP_SPARE_FRAMES};')();
const BASE = 30000 / 1001;

// A fake script SDK with a timeline that counts frames at `fps`.
async function run(fps) {
  const log = {clips: [], title: null, music: null};
  let cursor = 0;
  const frames = (s) => Math.round(s * fps);
  const draft = {
    setFrameSize: async () => {}, meta: async () => ({fps}),
    insertGap: async ({seconds}) => { cursor += frames(seconds); },
    insertResource: async ({resourceId, sourceRange}) => {
      const len = frames(sourceRange.endSeconds - sourceRange.startSeconds);
      log.clips.push({resourceId, startFrame: cursor, endFrame: cursor + len, seconds: sourceRange.endSeconds - sourceRange.startSeconds});
      cursor += len;
    },
    clips: async () => log.clips,
    rangeAtFrames: async (a, b) => [a, b],
    addMotionGraphic: async ({within}) => { log.title = within; },
    overlayResource: async ({over}) => { log.music = over; },
    validate: async () => ({ok: true}),
    commitAll: async () => ({createdDraftId: 'd1'}),
  };
  const selects = {project: () => ({createDraft: async () => draft, resource: (id) => id})};
  const ids = CUTS.slice(1).map((_, i) => 'r' + i);
  const script = galleryScript({projectId: 'p', draftName: 'n', shotIds: ids, audioId: 'a', title: 't'});
  const AsyncFunction = (async () => {}).constructor;
  const result = await new AsyncFunction('selects', script)(selects);
  return {result, log};
}

for (const fps of [24000 / 1001, BASE, 60000 / 1001, 25, 30]) {
  test(`frame math at ${fps.toFixed(3)} fps`, async () => {
    const {result, log} = await run(fps);
    const cuts = CUTS.map((f) => Math.round(f / BASE * fps));
    assert.equal(result.clips, CUTS.length - 1);
    assert.deepEqual(log.clips.map((c) => c.startFrame), cuts.slice(0, -1));
    assert.equal(result.frames, cuts[cuts.length - 1]);
    assert.deepEqual(log.title, [0, cuts[0]]);
    assert.deepEqual(log.music, [0, Math.round(AUDIO_END_FRAME / BASE * fps)]);
    for (let i = 0; i < log.clips.length; i++) {
      // Each cut lands within half a Draft frame of its 29.97 time, and the shot fits inside its crop.
      assert.ok(Math.abs(cuts[i] / fps - CUTS[i] / BASE) <= 0.5 / fps + 1e-9);
      assert.ok(log.clips[i].seconds <= (CUTS[i + 1] - CUTS[i] + CROP_SPARE_FRAMES) / BASE + 1e-9, 'shot ' + i + ' fits its crop');
    }
  });
}

test('29.97 keeps the template frames exactly', async () => {
  const {log, result} = await run(BASE);
  assert.deepEqual(log.clips.map((c) => c.startFrame), CUTS.slice(0, -1));
  assert.equal(result.frames, CUTS[CUTS.length - 1]);
  assert.deepEqual(log.music, [0, AUDIO_END_FRAME]);
  for (let i = 0; i < log.clips.length; i++) assert.equal(log.clips[i].seconds, (CUTS[i + 1] - CUTS[i]) / BASE);
});
