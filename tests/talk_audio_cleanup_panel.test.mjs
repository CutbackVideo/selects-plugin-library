// Talk Audio Cleanup: the Panel's settings logic and the Draft scripts it sends, against a fake Draft.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../plugins/talk-audio-cleanup/panel.tsx', import.meta.url), 'utf8');
// Everything between the imports and the component is plain JavaScript.
const body = source.slice(source.indexOf('const ID ='), source.indexOf('export default function Panel'));
const { READ, APPLY, resolve, STRINGS, FPS } = await import(
  'data:text/javascript,' + encodeURIComponent(body + '\nexport { READ, APPLY, resolve, STRINGS, FPS };')
);
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

const item = (start, frames, action, rule, confidence) => ({ resourceId: 'r0', start, end: start + frames / FPS, frames, action, rule, confidence });
const ITEMS = [item(12, 3, 'delete', 'blemish', 0.9), item(20, 1, 'delete', 'blemish', 0.35), item(30, 9, 'lower', 'breath', 0.8), item(40, 6, 'delete', 'blemish', 0.4)];
const ALL = { blemish: true, breath: true, sniff: true, click: true };

// One Main clip of 100 s whose source starts at 5 s, with the edits a Draft supports.
function fakeDraft() {
  let clips = [{ clipId: 1, trackKind: 'main', resourceId: 'r0', sourceStartSeconds: 5, startFrame: 0, endFrame: 3000 }];
  let nextId = 2;
  const log = [];
  const draft = {
    clips: async () => clips.map((c) => ({ ...c })),
    splitAt: async ({ frame }) => {
      const c = clips.find((x) => x.startFrame < frame && x.endFrame > frame);
      clips.push({ ...c, clipId: nextId++, startFrame: frame, sourceStartSeconds: c.sourceStartSeconds + (frame - c.startFrame) / FPS });
      c.endFrame = frame;
      clips.sort((a, b) => a.startFrame - b.startFrame);
    },
    removeClips: async (piece) => {
      const length = piece.endFrame - piece.startFrame;
      clips = clips.filter((c) => c.clipId !== piece.clipId);
      for (const c of clips) if (c.startFrame >= piece.endFrame) { c.startFrame -= length; c.endFrame -= length; }
      log.push(`cut ${piece.startFrame}-${piece.endFrame}`);
    },
    clipAudio: async () => ({ volumeDb: 0 }),
    setClipAudio: async (o) => log.push(o.fadeInSeconds ? `fade ${o.clip.startFrame}` : `volume ${o.clip.startFrame} ${o.volumeDb}`),
    commitAll: async () => ({ createdDraftId: 'copy' }),
  };
  const selects = { project: () => ({ duplicateDraft: async () => draft }), draft: () => draft };
  return { selects, log, frames: () => clips.reduce((s, c) => s + c.endFrame - c.startFrame, 0) };
}

test('a cut the model is unsure of becomes a volume change, by its length', () => {
  const r = resolve(ITEMS, ALL, 0.5, 11);
  assert.deepEqual(r.map((i) => [i.action, i.softened]), [['delete', false], ['mute', true], ['lower', false], ['lower', true]]);
  assert.equal(r[3].lowerDb, 11);
  assert.equal(resolve(ITEMS, ALL, 0.3, 11).filter((i) => i.action === 'delete').length, 3);
});

test('a kind that is switched off is left out', () => {
  assert.deepEqual(resolve(ITEMS, { ...ALL, blemish: false }, 0.3, 11).map((i) => i.rule), ['breath']);
});

test('the scripts the Panel sends are valid script bodies', () => {
  new AsyncFunction('selects', READ('p', 'd'));
  new AsyncFunction('selects', APPLY('p', 'd', null, 'name', ITEMS, true));
  new AsyncFunction('selects', APPLY('p', 'd', 'copy', 'name', ITEMS, false));
});

test('every edit lands on its own frames, whatever came before it', async () => {
  const { selects, log, frames } = fakeDraft();
  // earliest first: the cut at 12 s shortens the Draft by 3 frames before the later items are placed
  const result = await new AsyncFunction('selects', APPLY('p', 'd', null, 'name', resolve(ITEMS, ALL, 0.5, 11), true))(selects);
  assert.deepEqual(result, { done: { delete: 1, lower: 2, mute: 1, fades: 1, skipped: 0 }, draftId: 'copy' });
  // source 12 s on a clip whose source starts at 5 s is frame 210; what follows moves 3 frames earlier
  assert.deepEqual(log, ['cut 210-213', 'fade 210', 'volume 447 -60', 'volume 747 -11', 'volume 1047 -11']);
  assert.equal(frames(), 2997);
});

test('without the fade switch no fade is set, and an item outside every clip is skipped', async () => {
  const { selects, log } = fakeDraft();
  const result = await new AsyncFunction('selects', APPLY('p', 'd', null, 'name', [item(500, 3, 'delete', 'blemish', 0.9), item(12, 3, 'delete', 'blemish', 0.9)], false))(selects);
  assert.deepEqual(result.done, { delete: 1, lower: 0, mute: 0, fades: 0, skipped: 1 });
  assert.deepEqual(log, ['cut 210-213']);
});

test('the Korean and English strings have the same keys', () => {
  const keys = (o) => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v).map((x) => `${k}.${x}`) : [k])).sort();
  assert.deepEqual(keys(STRINGS.ko), keys(STRINGS.en));
});
