// Talk Audio Cleanup: the Panel's settings logic and the Draft scripts it sends, against a fake Draft.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../plugins/talk-audio-cleanup/panel.tsx', import.meta.url), 'utf8');
// Everything between the imports and the component is plain JavaScript.
const body = source.slice(source.indexOf('const ID ='), source.indexOf('export default function Panel'));
const { READ, APPLY, resolve, segments, inClips, batches, STRINGS, FPS, BATCH } = await import(
  'data:text/javascript,' + encodeURIComponent(body + '\nexport { READ, APPLY, resolve, segments, inClips, batches, STRINGS, FPS, BATCH };')
);
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const script = (text, selects) => new AsyncFunction('selects', text)(selects);

const item = (start, frames, action, rule, confidence, resourceId = 'r0') => ({ resourceId, start, end: start + frames / FPS, frames, action, rule, confidence });
const ITEMS = [item(12, 3, 'delete', 'blemish', 0.9), item(20, 1, 'delete', 'blemish', 0.35), item(30, 9, 'lower', 'breath', 0.8), item(40, 6, 'delete', 'blemish', 0.4)];
const ALL = { blemish: true, breath: true, sniff: true, click: true };
const ONE = { numerator: 1, denominator: 1 };

// A Draft with the edits the Panel uses, behaving as the host's does: removeClips refuses Main clips,
// remove(span, { tracks: "main" }) cuts the span out and closes the gap, splitAt cuts a clip in two.
// Default: one Main clip of 100 s whose source starts at 5 s.
function fakeDraft(rows = [{ resourceId: 'r0', sourceStartSeconds: 5, frames: 3000 }]) {
  let nextId = 1, at = 0;
  let clips = rows.map((r) => {
    const c = { clipId: nextId++, trackKind: r.trackKind ?? 'main', resourceId: r.resourceId, sourceStartSeconds: r.sourceStartSeconds, startFrame: at, endFrame: at + r.frames, playbackSpeed: r.playbackSpeed ?? ONE, volumeDb: 'volumeDb' in r ? r.volumeDb : 0 };
    at += r.frames;
    return c;
  });
  const log = [];
  let commits = 0;
  const live = (row) => clips.find((c) => c.clipId === row.clipId);
  const splitAt = async ({ frame }) => {
    const c = clips.find((x) => x.trackKind === 'main' && x.startFrame < frame && x.endFrame > frame);
    if (!c) throw Error(`no clip to split at ${frame}`);
    clips.push({ ...c, clipId: nextId++, startFrame: frame, sourceStartSeconds: c.sourceStartSeconds + (frame - c.startFrame) / FPS });
    c.endFrame = frame;
    clips.sort((a, b) => a.startFrame - b.startFrame);
  };
  const draft = {
    clips: async () => clips.map(({ volumeDb, ...c }) => ({ ...c })),
    splitAt,
    rangeAtFrames: async (startFrame, endFrame) => ({ startFrame, endFrame }),
    remove: async (range, options) => {
      assert.deepEqual(options, { tracks: 'main' });
      for (const frame of [range.startFrame, range.endFrame]) if (clips.some((c) => c.startFrame < frame && c.endFrame > frame)) await splitAt({ frame });
      const length = range.endFrame - range.startFrame;
      clips = clips.filter((c) => !(c.startFrame >= range.startFrame && c.endFrame <= range.endFrame));
      for (const c of clips) if (c.startFrame >= range.endFrame) { c.startFrame -= length; c.endFrame -= length; }
      log.push(`cut ${range.startFrame}-${range.endFrame}`);
    },
    removeClips: async (row) => { if (row.trackKind === 'main') throw Error('unsupported_clip_target: removeClips only accepts whole clips on separate Video/Audio tracks'); },
    clipAudio: async (row) => ({ volumeDb: live(row).volumeDb }),
    setClipAudio: async (o) => {
      if (o.volumeDb != null) live(o.clip).volumeDb = o.volumeDb;
      log.push(o.fadeInSeconds ? `fade ${o.clip.startFrame}` : `volume ${o.clip.startFrame}-${o.clip.endFrame} ${o.volumeDb}`);
    },
    commitAll: async () => { commits++; return { createdDraftId: 'copy' }; },
  };
  const selects = { project: () => ({ duplicateDraft: async () => draft }), draft: (id) => { assert.equal(id, 'copy'); return draft; } };
  return { selects, log, frames: () => clips.reduce((s, c) => s + c.endFrame - c.startFrame, 0), commits: () => commits };
}
const applyAll = async (selects, items, fade = true) => {
  const total = { delete: 0, lower: 0, mute: 0, fades: 0, skipped: 0 };
  let target = null;
  for (const batch of batches(items)) {
    const r = await script(APPLY('p', 'd', target, 'name', batch, fade), selects);
    target = r.draftId;
    for (const k of Object.keys(total)) total[k] += r.done[k];
  }
  return total;
};

test('a cut the model is unsure of becomes a volume change, by its length', () => {
  const r = resolve(ITEMS, ALL, 0.5, 11);
  assert.deepEqual(r.map((i) => [i.action, i.softened]), [['delete', false], ['mute', true], ['lower', false], ['lower', true]]);
  assert.equal(r[3].lowerDb, 11);
  assert.equal(resolve(ITEMS, ALL, 0.3, 11).filter((i) => i.action === 'delete').length, 3);
});

test('a kind that is switched off is left out', () => {
  assert.deepEqual(resolve(ITEMS, { ...ALL, blemish: false }, 0.3, 11).map((i) => i.rule), ['breath']);
});

test('every edit lands on its own frames, latest first', async () => {
  const { selects, log, frames } = fakeDraft();
  const done = await applyAll(selects, resolve(ITEMS, ALL, 0.5, 11));
  assert.deepEqual(done, { delete: 1, lower: 2, mute: 1, fades: 1, skipped: 0 });
  // source 12 s on a clip whose source starts at 5 s is frame 210
  assert.deepEqual(log, ['volume 1050-1056 -11', 'volume 750-759 -11', 'volume 450-451 -60', 'cut 210-213', 'fade 210']);
  assert.equal(frames(), 2997);
});

test('items that touch each other are all applied, in either order', async () => {
  const pair = [item(17, 3, 'delete', 'blemish', 0.9), { ...item(17.1, 9, 'lower', 'breath', 0.8), lowerDb: 11 }];   // frames 360-363 and 363-372
  for (const order of [pair, [...pair].reverse()]) {
    const { selects, log } = fakeDraft();
    const r = await script(APPLY('p', 'd', null, 'name', order, true), selects);
    assert.deepEqual(r.done, { delete: 1, lower: 1, mute: 0, fades: 1, skipped: 0 });
    assert.ok(log.includes('cut 360-363'));
  }
  const { selects } = fakeDraft();
  const twoVolumes = [{ ...item(17, 2, 'mute', 'click', 0.9) }, { ...item(17 + 2 / FPS, 9, 'lower', 'breath', 0.8), lowerDb: 11 }];
  assert.deepEqual((await script(APPLY('p', 'd', null, 'name', twoVolumes, true), selects)).done, { delete: 0, lower: 1, mute: 1, fades: 0, skipped: 0 });
});

test('an edit may use a clip\'s own first or last frame', async () => {
  const { selects, log } = fakeDraft();
  const r = await script(APPLY('p', 'd', null, 'name', [item(5, 2, 'mute', 'click', 0.9), item(105 - 3 / FPS, 3, 'delete', 'blemish', 0.9)], true), selects);
  assert.deepEqual(r.done, { delete: 1, lower: 0, mute: 1, fades: 0, skipped: 0 });   // nothing follows the last cut, so no fade
  assert.deepEqual(log, ['volume 0-2 -60', 'cut 2997-3000']);
});

test('more than one batch continues on the same copy and adds up', async () => {
  const many = Array.from({ length: BATCH * 2 + 5 }, (_, i) => item(10 + i, 2, i % 2 ? 'mute' : 'delete', i % 2 ? 'click' : 'blemish', 0.9));
  assert.deepEqual(batches(many).map((b) => b.length), [BATCH, BATCH, 5]);
  assert.ok(batches(many).flat().every((it, i, all) => i === 0 || it.start < all[i - 1].start));
  const { selects, frames, commits } = fakeDraft();
  const done = await applyAll(selects, many);
  assert.deepEqual(done, { delete: 33, lower: 0, mute: 32, fades: 33, skipped: 0 });
  assert.equal(frames(), 3000 - 33 * 2);
  assert.equal(commits(), 3);
});

test('lowering starts from the clip\'s own volume, stops at -60 and leaves a keyed volume alone', async () => {
  const { selects, log } = fakeDraft([
    { resourceId: 'r0', sourceStartSeconds: 0, frames: 300, volumeDb: -6 },
    { resourceId: 'r0', sourceStartSeconds: 10, frames: 300, volumeDb: -55 },
    { resourceId: 'r0', sourceStartSeconds: 20, frames: 300, volumeDb: null },
  ]);
  const lower = (start) => ({ ...item(start, 6, 'lower', 'breath', 0.8), lowerDb: 11 });
  const r = await script(APPLY('p', 'd', null, 'name', [lower(1), lower(11), lower(21)], true), selects);
  assert.deepEqual(r.done, { delete: 0, lower: 2, mute: 0, fades: 0, skipped: 1 });
  assert.deepEqual(log, ['volume 30-36 -17', 'volume 330-336 -60']);
});

test('only a 1x Main clip of the same source is edited; anything else is skipped', async () => {
  const { selects, log } = fakeDraft([
    { resourceId: 'r0', sourceStartSeconds: 0, frames: 300, playbackSpeed: { numerator: 2, denominator: 1 } },
    { resourceId: 'r1', sourceStartSeconds: 0, frames: 300 },
    { resourceId: 'r0', sourceStartSeconds: 0, frames: 300, trackKind: 'video' },
    { resourceId: 'r0', sourceStartSeconds: 0, frames: 300 },
  ]);
  const r = await script(APPLY('p', 'd', null, 'name', [item(2, 3, 'delete', 'blemish', 0.9), item(500, 3, 'delete', 'blemish', 0.9)], false), selects);
  assert.deepEqual(r.done, { delete: 1, lower: 0, mute: 0, fades: 0, skipped: 1 });
  assert.deepEqual(log, ['cut 960-963']);   // the fourth clip; no fade without the switch
});

test('the audio to analyze: clips of one source are joined when close, and start on the clip\'s frame grid', () => {
  const clip = (resourceId, sourceStart, frames) => ({ resourceId, path: `/m/${resourceId}.mp4`, sourceStart, frames });
  const s = segments([clip('b', 0.02, 300), clip('a', 3600, 300), clip('a', 100.01, 300), clip('a', 115, 300)]);
  assert.deepEqual(s.map((x) => [x.resourceId, x.from, x.to]), [['a', 100.01, 125], ['a', 3600, 3610], ['b', 0.02, 10.02]]);
  assert.ok(Math.abs(s[0].t0 - (100.01 - 5)) < 1e-9);   // 5 s early
  assert.ok(Math.abs(s[2].t0 - 0.02) < 1e-9);           // no room for a lead-in: start at the clip itself
  for (const x of s) assert.ok(Math.abs(((x.from - x.t0) * FPS) - Math.round((x.from - x.t0) * FPS)) < 1e-6);
});

test('an item outside every clip (the lead-in, a gap between clips) is not offered', () => {
  const clips = [{ resourceId: 'r0', sourceStart: 10, frames: 300 }, { resourceId: 'r0', sourceStart: 30, frames: 300 }];
  const keep = (start, frames, resourceId) => inClips(item(start, frames, 'delete', 'blemish', 0.9, resourceId), clips);
  assert.deepEqual([keep(10, 3), keep(8, 3), keep(19.95, 3), keep(25, 3), keep(39.9, 3), keep(12, 3, 'r1')], [true, false, false, false, true, false]);
});

test('reading the Draft keeps 1x Main clips that have a source file', async () => {
  const row = (o) => ({ trackKind: 'main', resourceId: 'r0', sourceStartSeconds: 0, startFrame: 0, endFrame: 300, playbackSpeed: ONE, ...o });
  const selects = {
    files: { environment: async () => ({ tempDirectory: '/tmp' }) },
    draft: () => ({
      meta: async () => ({ fps: 30, name: 'Talk' }),
      clips: async () => [row({}), row({ trackKind: 'video' }), row({ playbackSpeed: { numerator: 2, denominator: 1 } }), row({ resourceId: 'seq' }), row({ resourceId: 'deep', sourceStartSeconds: 4, startFrame: 300, endFrame: 390 }), row({ resourceId: null })],
    }),
    project: () => ({
      sourceFiles: async (o) => (o ? { fileTree: [{ type: 'dir', children: [{ type: 'video', resourceId: 'deep', path: '/m/deep.mp4' }] }] } : { folders: [{ name: 'A' }] }),
    }),
  };
  const r = await script(READ('p', 'd'), selects);
  assert.deepEqual(r, { fps: 30, name: 'Talk', clips: [{ resourceId: 'deep', path: '/m/deep.mp4', sourceStart: 4, frames: 90 }], skipped: 0, env: { tempDirectory: '/tmp' } });
  selects.project = () => ({ sourceFiles: async () => ({ fileTree: [{ type: 'video', resourceId: 'r0', path: '/m/r0.mp4' }, { type: 'sequence', resourceId: 'seq', path: '/m/seq' }] }) });
  const flat = await script(READ('p', 'd'), selects);
  assert.deepEqual([flat.clips.map((c) => c.resourceId), flat.skipped], [['r0'], 1]);
});

test('the Korean and English strings have the same keys', () => {
  const keys = (o) => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v).map((x) => `${k}.${x}`) : [k])).sort();
  assert.deepEqual(keys(STRINGS.ko), keys(STRINGS.en));
});
