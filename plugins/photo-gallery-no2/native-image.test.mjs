import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planGallery } from './format.mjs';

const source = readFileSync(new URL('./native-image-runtime.js', import.meta.url), 'utf8');
const createRuntime = new Function('window', `${source}\nreturn { galleryNativeResources, galleryNativeSetFps, galleryNativePlace };`);

function fixture({ mismatch = false } = {}) {
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: i === 20 ? 'video' : 'image',
    path: `/test/tile-${i}.png`, width: 1122, height: 1402,
    ...(i === 20 ? { durationFrames: 900 } : {}) }));
  const placed = [];
  const members = media.map((item, i) => ({
    getId: () => `native-${i}`,
    getType: () => item.kind === 'image' ? 'Image' : 'Video',
    getMedia: () => ({ path: mismatch && i === 4 ? '/other/tile-4.png' : item.path,
      width: item.width, height: item.height }),
    getAnalyzedSequence: async () => ({ getMainTrack: () => ({ getClips: () => [
      { isGap: () => false, getId: () => i + 1 },
    ] }) }),
  }));
  let commits = 0;
  const sequence = {
    getFrameRate: () => 60,
    getDuration: () => 853,
    clone: () => ({
      place: ({ primaryClipId }, at) => { placed.push({ primaryClipId, at }); return [placed.length]; },
      getClipPositionById: id => ({ trackId: `track-${id}`, clip: { getDuration: () => 300 } }),
      trimClipBoundary: ({ delta }) => ({ trimmedClipPosition: { clip: { getDuration: () => 300 + delta } } }),
    }),
  };
  const project = { getResources: () => members.map(item => item.getId()),
    getEditedSequences: () => ['draft-1'] };
  const di = {
    TimelineMutation: { run: async (_sequence, _command, callback) => {
      await callback(sequence); commits++; return { status: 'committed' };
    } },
    ProjectRepository: { findById: async () => project },
    ResourceRepository: { findById: async (_library, id) => members.find(item => item.getId() === id) },
    SequenceRepository: { findById: async () => sequence },
  };
  const runtime = createRuntime({ parent: { location: { pathname: '/libraries/library-1/projects/project-1/timeline' }, __DI__: di } });
  return { ...runtime, media, placed, get commits() { return commits; } };
}

test('native adapter places only original Images and leaves Video slots for the public SDK', async () => {
  const f = fixture();
  const plan = planGallery({ media: f.media, manualBpm: 113 });
  await f.galleryNativePlace('project-1', 'draft-1', f.media, plan);
  assert.equal(f.commits, 1);
  assert.equal(f.placed.length, 20);
  assert.deepEqual(f.placed.map(item => item.at), plan.tiles.slice(0, 20).map(item => item.revealFrame));
  assert.ok(!f.placed.some(item => item.primaryClipId === 21));
});

test('a changed Image path aborts before native timeline mutation', async () => {
  const f = fixture({ mismatch: true });
  const plan = planGallery({ media: f.media, manualBpm: 113 });
  await assert.rejects(f.galleryNativePlace('project-1', 'draft-1', f.media, plan), /Tile 5 has no unique Project Resource/);
  assert.equal(f.commits, 0);
  assert.equal(f.placed.length, 0);
});

test('native adapter refuses a different visible Project', async () => {
  const f = fixture();
  await assert.rejects(f.galleryNativeResources('another-project', f.media), /open Project changed/);
  assert.equal(f.commits, 0);
});
