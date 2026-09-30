import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildScript } from './operation-builder.mjs';

const effectSha = 'bf1d24dab2ac13a45fcd5a1ce5ff0587de86be31f900ab03976cbbc1fc5eba86';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const image = (i) => ({ resourceId: `r${i}`, name: `photo-${i}.png`, type: 'Image' });
const file = (i) => ({ type: 'image', resourceId: `r${i}`, name: `photo-${i}.png`, path: `/test/photo-${i}.png`, frameSize: { width: 1080, height: 1920 } });
function fixture({ shortVideo = false } = {}) {
  const calls = { create: 0, commit: 0 };
  const resources = Array.from({ length: 21 }, (_, i) => shortVideo ? { resourceId: `r${i}`, name: `clip-${i}.mp4`, type: 'Video' } : image(i));
  const nodes = Array.from({ length: 21 }, (_, i) => shortVideo ?
    { type: 'video', resourceId: `r${i}`, name: `clip-${i}.mp4`, path: `/test/clip-${i}.mp4`, frameSize: { width: 1080, height: 1920 }, durationSeconds: i === 0 ? 1 : 30 } : file(i));
  const draft = { commitAll: async () => { calls.commit++; return { commitId: 'commit-1' }; } };
  const project = {
    resources: async () => resources,
    sourceFiles: async () => ({ fileTree: nodes }),
    meta: async () => ({ draftIds: ['draft-1'] }),
    resource: (resourceId) => ({ resourceId }),
    createDraft: async () => { calls.create++; return draft; },
  };
  const selects = {
    project: (projectId) => { assert.equal(projectId, 'project-1'); return project; },
    draft: (draftId) => { assert.equal(draftId, 'draft-1'); return draft; },
    media: { probe: async ({ filePaths }) => ({ files: filePaths.map((path) => ({ path })), errors: [], summary: { failed: 0 } }) },
  };
  const run = (input) => new AsyncFunction('selects', buildScript(input))(selects);
  return { run, calls, nodes, resources, draft, project };
}

test('the effect identity readback matches the actual bundled source', () => {
  const source = readFileSync(new URL('./operation-runtime.js', import.meta.url), 'utf8');
  const match = source.match(/const TILE_EFFECT = (`[\s\S]*?`);/);
  assert.ok(match);
  const effectCode = Function(`return ${match[1]}`)();
  assert.equal(createHash('sha256').update(effectCode).digest('hex'), effectSha);
});

test('Image Resources without public dimensions remain visible for a clear native-image preflight error', async () => {
  const { run, calls, nodes } = fixture();
  for (const node of nodes) { node.type = 'video'; delete node.frameSize; }
  const result = await run({ operation: 'inspect', projectId: 'project-1' });
  assert.equal(result.status, 'inspected');
  assert.equal(result.media.length, 21);
  assert.ok(result.media.every((item) => item.kind === 'image' && item.width == null && item.height == null));
  assert.equal(calls.create, 0);
  assert.equal(calls.commit, 0);
});

test('unrelated missing Project media does not hide usable gallery inputs', async () => {
  const { run, resources } = fixture();
  resources.push({ resourceId: 'missing-unrelated', name: 'offline.mov', type: 'Video' });
  const result = await run({ operation: 'inspect', projectId: 'project-1' });
  assert.equal(result.status, 'inspected');
  assert.equal(result.media.length, 21);
  assert.deepEqual(result.unavailable, [{ resourceId: 'missing-unrelated', name: 'offline.mov' }]);
});

test('generated Video duration uses Resource metadata when the file tree omits it', async () => {
  const { run, resources, nodes, calls } = fixture({ shortVideo: true });
  delete nodes[0].durationSeconds;
  resources[0].durationSeconds = 15.042;
  const inspected = await run({ operation: 'inspect', projectId: 'project-1' });
  assert.equal(inspected.media[0].durationFrames, 903);
  nodes[1].durationSeconds = 1;
  resources[1].durationSeconds = 30;
  const reread = await run({ operation: 'inspect', projectId: 'project-1' });
  assert.equal(reread.media[1].durationFrames, 60);
  assert.equal(calls.create, 0);
});

test('original photos are not converted to MP4 through the held-video import operation', async () => {
  const { run, project } = fixture();
  let imports = 0;
  project.importFiles = async () => { imports++; };
  const result = await run({ operation: 'importConverted', projectId: 'project-1', converted: [
    { sourceResourceId: 'r0', sourcePath: '/test/photo-0.png', path: '/cache/still-a.mp4' },
  ] });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /Project video/i);
  assert.equal(imports, 0);
});

test('a held short Video Resource can be imported as a full-length replacement', async () => {
  const { run, nodes, resources, project } = fixture({ shortVideo: true });
  let imports = 0;
  project.importFiles = async ({ paths }) => {
    imports++;
    assert.deepEqual(paths, ['/cache/held-short.mp4']);
    resources.push({ resourceId: 'held-0', name: 'held-short.mp4', type: 'Video' });
    nodes.push({ type: 'video', resourceId: 'held-0', name: 'held-short.mp4', path: paths[0],
      durationSeconds: 853 / 60, frameSize: { width: 1080, height: 1920 } });
    return { addedResourceIds: ['held-0'] };
  };
  const request = { operation: 'importConverted', projectId: 'project-1',
    converted: [{ sourceResourceId: 'r0', sourcePath: '/test/clip-0.mp4', path: '/cache/held-short.mp4' }] };
  const result = await run(request);
  assert.equal(result.status, 'prepared', result.message);
  assert.equal(result.converted[0].resourceId, 'held-0');
  assert.equal(imports, 1);
});

test('prepared media import resolves a source by its path when a Resource alias has shifted', async () => {
  const { run, nodes, resources, project } = fixture({ shortVideo: true });
  project.importFiles = async ({ paths }) => {
    resources.push({ resourceId: 'converted-a', name: 'still-a.mp4', type: 'Video' });
    nodes.push({ type: 'video', resourceId: 'converted-a', name: 'still-a.mp4', path: paths[0],
      durationSeconds: 853 / 60, frameSize: { width: 1080, height: 1920 } });
  };
  const result = await run({ operation: 'importConverted', projectId: 'project-1',
    converted: [{ sourceResourceId: 'r1', sourcePath: '/test/clip-0.mp4', path: '/cache/still-a.mp4' }] });
  assert.equal(result.status, 'prepared', result.message);
  assert.equal(result.converted[0].sourceResourceId, 'r1');
  assert.equal(result.converted[0].resolvedSourceResourceId, 'r0');
  assert.equal(result.converted[0].resourceId, 'converted-a');
});

test('prepared media import rejects an ID without the source path', async () => {
  const { run, calls } = fixture();
  const result = await run({ operation: 'importConverted', projectId: 'project-1',
    converted: [{ sourceResourceId: 'r0', path: '/cache/still-a.mp4' }] });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /source path/i);
  assert.equal(calls.commit, 0);
});

test('missing native photo dimensions fail before Draft creation', async () => {
  const f = creationFixture();
  delete f.files[0].frameSize;
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: `/test/photo-${i}.png`, kind: 'image' }));
  const result = await f.run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /photo dimensions/i);
  assert.equal(f.createCount, 0);
});

test('bad held-video duration fails before Project import', async () => {
  const { run, calls, project } = fixture();
  let imports = 0;
  project.importFiles = async () => { imports++; return { addedResourceIds: [] }; };
  const bad = await run({ operation: 'importConverted', projectId: 'project-1', durationFrames: -1,
    converted: [{ sourceResourceId: 'r0', path: '/cache/still-a.mp4' }] });
  assert.equal(bad.status, 'notSaved');
  assert.match(bad.message, /duration/);
  assert.equal(imports, 0);
  assert.equal(calls.create, 0);
});

test('unprepared short video fails before a Draft is created', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i) });
  fixture.files[0].durationSeconds = 1;
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: `/test/video-${i}.mp4`, kind: 'video', width: 1920, height: 1080,
    durationFrames: i === 0 ? 60 : 1800, focusX: 0.5, focusY: 0.5 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media,
    manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /too short/i);
  assert.equal(fixture.createCount, 0);
});

test('existing-Draft mutation is rejected before an unsupported SDK call or commit', async () => {
  const { run, calls } = fixture();
  for (const operation of ['update', 'updateTiming']) {
    const result = await run({ operation, projectId: 'project-1', draftId: 'draft-1',
      slotKey: 'tile-07', resourceId: 'r6', durationFrames: 900 });
    assert.equal(result.status, 'notSaved');
    assert.match(result.message, /not supported|unknown gallery action/i);
  }
  assert.equal(calls.commit, 0);
});

function creationFixture({ failCommit = false, rejectNativeImages = false, videoIndices = [], audio = false, videoAudio = false, videoEndOffsets = {} } = {}) {
  const inserted = [], effects = [], bindings = [], transforms = [];
  let createCount = 0, gapCalls = 0;
  const fresh = () => inserted.map((item) => ({ ...item }));
  const draft = {
    meta: async () => ({ fps: 60, frameSize: { width: 1080, height: 1920 }, durationFrames: 853 }),
    setFrameSize: async () => {},
    insertGap: async ({ seconds }) => { assert.equal(seconds, 853 / 60); gapCalls++; },
    insertResource: async () => { throw new Error('A native gallery must not insert a Main video'); },
    rangeAtFrames: async (startFrame, endFrame) => ({ startFrame, endFrame }),
    clips: async () => fresh(),
    overlayResource: async ({ resource, over, sourceStartSeconds }) => {
      if (rejectNativeImages && !videoIndices.includes(Number(resource.resourceId.slice(1))) && resource.resourceId !== 'song') {
        throw new Error('Resource is not a Video/Audio asset');
      }
      const trackKind = resource.resourceId === 'song' ? 'audio' : 'video';
      const endOffset = trackKind === 'video' ? videoEndOffsets[resource.resourceId]?.(over.startFrame) ?? 0 : 0;
      inserted.push({ clipId: Math.max(0, ...inserted.map(item => item.clipId)) + 1, trackId: `v${inserted.length}`, trackKind, resourceId: resource.resourceId, startFrame: over.startFrame, endFrame: over.endFrame + endOffset, sourceStartSeconds });
      if (videoAudio && trackKind === 'video' && videoIndices.includes(Number(resource.resourceId.slice(1)))) {
        inserted.push({ clipId: Math.max(0, ...inserted.map(item => item.clipId)) + 1, trackId: `a${inserted.length}`, trackKind: 'audio',
          resourceId: resource.resourceId, startFrame: over.startFrame, endFrame: over.endFrame });
      }
    },
    removeClips: async rows => { for (const row of rows) {
      const index = inserted.findIndex(item => item.clipId === row.clipId);
      if (index >= 0) inserted.splice(index, 1);
    } },
    moveOverlayClip: async ({ clip, startFrame }) => {
      const row = inserted.find(item => item.clipId === clip.clipId);
      row.endFrame += startFrame - row.startFrame;
      row.startFrame = startFrame;
      return { clipId: row.clipId, trackId: row.trackId, startFrame };
    },
    remove: async (span, { tracks }) => {
      for (const row of inserted.filter(item => tracks.includes(item.trackId) && item.endFrame > span.startFrame)) {
        row.endFrame -= Math.min(row.endFrame, span.endFrame) - Math.max(row.startFrame, span.startFrame);
      }
      return { opCount: 1 };
    },
    addVideoEffect: async (entry) => effects.push(entry),
    setClipTransform: async (entry) => transforms.push(entry),
    clipTransform: async (clip) => {
      const value = transforms.find((entry) => entry.clip.clipId === clip.clipId);
      return value ? { enabled: true, position: value.position, scale: value.scale } :
        { enabled: true, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, anchor: { x: 0, y: 0 } };
    },
    videoEffects: async (clip) => effects.filter((effect) => effect.clip.clipId === clip.clipId)
      .map((effect) => ({ name: effect.label, enabled: true })),
    commitAll: async () => {
      if (failCommit) throw new Error('transport lost after commit started');
      return createCount ? { createdDraftId: 'draft-new' } : { commitId: 'commit-style' };
    },
  };
  const resources = Array.from({ length: 21 }, (_, i) => videoIndices.includes(i) ? { resourceId: `r${i}`, name: `video-${i}.mp4`, type: 'Video' } : image(i));
  const files = Array.from({ length: 21 }, (_, i) => videoIndices.includes(i) ?
    { type: 'video', resourceId: `r${i}`, name: `video-${i}.mp4`, path: `/test/video-${i}.mp4`, frameSize: { width: 1920, height: 1080 }, durationSeconds: 30 } : file(i));
  if (audio) {
    resources.push({ resourceId: 'song', name: 'song.wav', type: 'Audio' });
    files.push({ type: 'audio', resourceId: 'song', name: 'song.wav', path: '/test/song.wav', durationSeconds: 20 });
  }
  const project = {
    resources: async () => resources,
    sourceFiles: async () => ({ fileTree: files }),
    meta: async () => ({ draftIds: createCount ? ['known', 'draft-new'] : ['known'] }),
    createDraft: async () => { createCount++; return draft; },
    resource: (resourceId) => ({ resourceId }),
  };
  const selects = {
    project: () => project,
    draft: () => draft,
    media: { probe: async ({ filePaths }) => ({ files: filePaths.map((path) => ({ path })), errors: [], summary: { failed: 0 } }) },
  };
  return {
    run: (input) => new AsyncFunction('selects', buildScript(input))(selects),
    inserted, effects, bindings, transforms, files, draft,
    get createCount() { return createCount; },
    get gapCalls() { return gapCalls; },
  };
}

test('a preplaced native Image gallery receives editable effects and geometry without replacing its clips', async () => {
  const f = creationFixture();
  const reveals = [0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205];
  for (let i = 0; i < 21; i++) f.inserted.push({ clipId: i + 1, trackId: `v${i}`,
    trackKind: 'video', resourceId: `r${i}`, startFrame: reveals[i], endFrame: 853 });
  for (const item of f.files) { item.type = 'video'; delete item.frameSize; }
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: `/test/photo-${i}.png`, kind: 'image', width: 1080, height: 1920 }));
  const result = await f.run({ operation: 'styleExisting', projectId: 'project-1', draftId: 'known', media, manualBpm: 113 });
  assert.equal(result.status, 'styled', result.message);
  assert.equal(f.inserted.length, 21);
  assert.equal(f.effects.length, 21);
  assert.equal(f.transforms.length, 21);
  assert.deepEqual(f.effects.map(item => item.clip.resourceId), media.map(item => item.resourceId));
});

test('styling rejects a wrong reveal frame before editing the native gallery', async () => {
  const f = creationFixture();
  const reveals = [0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205];
  for (let i = 0; i < 21; i++) f.inserted.push({ clipId: i + 1, trackId: `v${i}`,
    trackKind: 'video', resourceId: `r${i}`, startFrame: reveals[i] + (i === 7 ? 1 : 0), endFrame: 853 });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: `/test/photo-${i}.png`, kind: 'image', width: 1080, height: 1920 }));
  const result = await f.run({ operation: 'styleExisting', projectId: 'project-1', draftId: 'known', media, manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /tile-08/);
  assert.equal(f.effects.length, 0);
  assert.equal(f.transforms.length, 0);
});

test('mixed gallery places Video through the public SDK while preserving preplaced original Images', async () => {
  const f = creationFixture({ videoIndices: [20], videoAudio: true });
  const reveals = [0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205];
  for (let i = 0; i < 20; i++) f.inserted.push({ clipId: i + 1, trackId: `v${i}`,
    trackKind: 'video', resourceId: `r${i}`, startFrame: reveals[i], endFrame: 853 });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: i === 20 ? '/test/video-20.mp4' : `/test/photo-${i}.png`,
    kind: i === 20 ? 'video' : 'image', width: i === 20 ? 1920 : 1080,
    height: i === 20 ? 1080 : 1920, ...(i === 20 ? { durationFrames: 1800 } : {}) }));
  const result = await f.run({ operation: 'placeVideosExisting', projectId: 'project-1',
    draftId: 'known', media, manualBpm: 113 });
  assert.equal(result.status, 'videosPlaced', result.message);
  assert.equal(result.tileCount, 1);
  assert.equal(f.inserted.length, 21);
  assert.deepEqual(f.inserted[20], { clipId: 21, trackId: 'v20', trackKind: 'video',
    resourceId: 'r20', startFrame: 205, endFrame: 853, sourceStartSeconds: undefined });
  assert.equal((await f.run({ operation: 'styleExisting', projectId: 'project-1',
    draftId: 'known', media, manualBpm: 113 })).status, 'styled');
});

test('Video placement normalizes a one-frame short or long SDK clip before saving', async () => {
  const f = creationFixture({ videoIndices: [3, 16], videoAudio: true, videoEndOffsets: {
    r3: start => start === 36 ? -1 : 0,
    r16: () => 1,
  } });
  const reveals = [0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205];
  for (let i = 0; i < 21; i++) if (i !== 3 && i !== 16) f.inserted.push({ clipId: i + 1, trackId: `v${i}`,
    trackKind: 'video', resourceId: `r${i}`, startFrame: reveals[i], endFrame: 853 });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: i === 3 || i === 16 ? `/test/video-${i}.mp4` : `/test/photo-${i}.png`,
    kind: i === 3 || i === 16 ? 'video' : 'image', width: i === 3 || i === 16 ? 1920 : 1080,
    height: i === 3 || i === 16 ? 1080 : 1920,
    ...((i === 3 || i === 16) ? { durationFrames: 1800 } : {}) }));
  const result = await f.run({ operation: 'placeVideosExisting', projectId: 'project-1',
    draftId: 'known', media, manualBpm: 113 });
  assert.equal(result.status, 'videosPlaced', result.message);
  assert.deepEqual(f.inserted.filter(row => row.resourceId === 'r3').map(row => [row.startFrame, row.endFrame]), [[36, 853]]);
  assert.deepEqual(f.inserted.filter(row => row.resourceId === 'r16').map(row => [row.startFrame, row.endFrame]), [[161, 853]]);
  assert.equal(f.inserted.filter(row => row.trackKind === 'video').length, 21);
  assert.equal(f.inserted.filter(row => row.trackKind === 'audio').length, 0);
});

test('21 original photos become 21 independent Image clips over a black gap', async () => {
  const f = creationFixture();
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: `/test/photo-${i}.png`, kind: 'image', width: 1080, height: 1920 }));
  const input = { projectId: 'project-1', media, manualBpm: 113 };
  const created = await f.run({ ...input, operation: 'create' });
  assert.equal(created.status, 'saved', created.message);
  assert.equal(f.gapCalls, 1);
  assert.equal(f.inserted.length, 21);
  assert.deepEqual(f.inserted.map(row => row.resourceId), media.map(item => item.resourceId));
  assert.deepEqual(f.inserted.map(row => row.startFrame),
    [0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205]);
  assert.equal(f.effects.length, 21);
  assert.equal(f.transforms.length, 21);
  const checked = await f.run({ ...input, operation: 'verifyCreated', draftId: 'draft-new' });
  assert.equal(checked.status, 'verified', checked.message);
});

test('a Selects build without native Image overlays stops before commit without MP4 fallback', async () => {
  const f = creationFixture({ rejectNativeImages: true });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: `/test/photo-${i}.png`, kind: 'image' }));
  const result = await f.run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /plugin SDK cannot place original Image Resources on video tracks/i);
  assert.equal(f.inserted.length, 0);
});

test('landscape, square, and portrait originals keep independent crop geometry', async () => {
  const f = creationFixture();
  f.files[0].frameSize = { width: 1920, height: 1080 };
  f.files[1].frameSize = { width: 700, height: 700 };
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: `/test/photo-${i}.png`, kind: 'image', focusX: i === 0 ? 0.2 : 0.5, focusY: 0.5 }));
  const input = { projectId: 'project-1', media, manualBpm: 113 };
  const result = await f.run({ ...input, operation: 'create' });
  assert.equal(result.status, 'saved', result.message);
  assert.deepEqual(f.effects.slice(0, 3).map(item => [item.parameters.sourceWidth, item.parameters.sourceHeight]),
    [[1920, 1080], [700, 700], [1080, 1920]]);
  assert.equal(f.effects[0].parameters.focusX, 0.2);
  assert.ok(f.transforms.slice(0, 3).every(item => item.scale.x > 0 && Number.isFinite(item.scale.x)));
  assert.equal((await f.run({ ...input, operation: 'verifyCreated', draftId: 'draft-new' })).status, 'verified');
});

test('an explicitly reused original photo occupies two independently identified slots', async () => {
  const f = creationFixture();
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`,
    path: `/test/photo-${i}.png`, kind: 'image' }));
  media[20] = { ...media[0], focusX: 0.8 };
  const input = { projectId: 'project-1', media, manualBpm: 113 };
  const created = await f.run({ ...input, operation: 'create' });
  assert.equal(created.status, 'saved', created.message);
  const repeated = f.inserted.filter(row => row.resourceId === 'r0');
  assert.deepEqual(repeated.map(row => row.startFrame), [0, 205]);
  assert.notEqual(repeated[0].clipId, repeated[1].clipId);
  assert.equal(f.effects[20].parameters.focusX, 0.8);
  assert.equal((await f.run({ ...input, operation: 'verifyCreated', draftId: 'draft-new' })).status, 'verified');
});

test('create and readback resolve shifted Resource aliases by exact media paths', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i), audio: true });
  const media = Array.from({ length: 21 }, (_, i) => ({
    resourceId: `stale-${i}`, path: `/test/video-${i}.mp4`, kind: 'video',
    width: 1920, height: 1080, durationFrames: 1800,
  }));
  const input = { projectId: 'project-1', media,
    music: { resourceId: 'r1', path: '/test/song.wav', durationFrames: 1200, startFrame: 0 },
    manualBpm: 113 };
  const created = await fixture.run({ ...input, operation: 'create' });
  assert.equal(created.status, 'saved', created.message);
  assert.equal(fixture.gapCalls, 1);
  assert.ok(fixture.inserted.every((row) => row.trackKind !== 'main'));
  assert.deepEqual(fixture.inserted.filter((row) => row.trackKind === 'video').map((row) => row.resourceId),
    Array.from({ length: 21 }, (_, i) => `r${i}`));
  assert.equal(fixture.inserted.find((row) => row.trackKind === 'audio').resourceId, 'song');
  const verified = await fixture.run({ ...input, operation: 'verifyCreated', draftId: 'draft-new' });
  assert.equal(verified.status, 'verified', verified.message);
});

test('an incorrect saved path cannot silently select a colliding Resource alias', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i) });
  const media = Array.from({ length: 21 }, (_, i) => ({
    resourceId: `r${i}`, path: `/test/video-${i}.mp4`, kind: 'video',
    width: 1920, height: 1080, durationFrames: 1800,
  }));
  media[0].path = '/test/unknown.mp4';
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /missing|moved|path/i);
  assert.equal(fixture.createCount, 0);
});

test('create rejects Resource IDs without stable paths before touching a Draft', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i) });
  const media = Array.from({ length: 21 }, (_, i) => ({
    resourceId: `r${i}`, path: `/test/video-${i}.mp4`, kind: 'video',
    width: 1920, height: 1080, durationFrames: 1800,
  }));
  delete media[0].path;
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /path/i);
  assert.equal(fixture.createCount, 0);
});

test('create places 21 separately editable native resources at the reference reveal frames', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i) });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, path: `/test/video-${i}.mp4`, kind: 'video', width: 1920, height: 1080, durationFrames: 1800 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'saved', result.message);
  assert.equal(result.draftId, 'draft-new');
  assert.equal(fixture.createCount, 1);
  assert.equal(fixture.inserted.length, 21);
  assert.equal(fixture.gapCalls, 1);
  assert.deepEqual(fixture.inserted.filter((clip) => clip.trackKind === 'video').map((clip) => clip.startFrame), [0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205]);
  assert.ok(fixture.inserted.every((clip) => clip.endFrame === 853));
  assert.equal(fixture.effects.length, 21);
  assert.equal(fixture.transforms.length, 21);
  assert.equal(fixture.bindings.length, 0);
  assert.equal(fixture.effects[0].parameters.colorAfterLocalFrame, 270);
  assert.equal(fixture.effects[20].parameters.colorAfterLocalFrame, 65);
  const verified = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new', media, manualBpm: 113 });
  assert.equal(verified.status, 'verified', verified.message);
  assert.equal(verified.tileCount, 21);
  const missing = fixture.inserted.shift();
  const missingTile = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new', media, manualBpm: 113 });
  assert.equal(missingTile.status, 'notSaved');
  assert.match(missingTile.message, /21 independent visual clips/);
  fixture.inserted.unshift(missing);
  fixture.transforms[0].position = { x: 999, y: 999 };
  const moved = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new', media, manualBpm: 113 });
  assert.equal(moved.status, 'notSaved');
  assert.match(moved.message, /position|transform/i);
});

test('lost commit response is unknown, never reported as an unsaved retry', async () => {
  const fixture = creationFixture({ failCommit: true, videoIndices: Array.from({ length: 21 }, (_, i) => i) });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, path: `/test/video-${i}.mp4`, kind: 'video', width: 1920, height: 1080, durationFrames: 1800 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'outcomeUnknown');
  assert.equal(fixture.createCount, 1);
});

test('21 sufficiently long videos and selected music remain independent native clips', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i), audio: true });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, path: `/test/video-${i}.mp4`, kind: 'video', width: 1920, height: 1080, durationFrames: 1800 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, music: { resourceId: 'song', path: '/test/song.wav', durationFrames: 1200, startFrame: 60 }, manualBpm: 120 });
  assert.equal(result.status, 'saved', result.message);
  assert.equal(result.colorFrame, Math.round(270 * 113 / 120));
  assert.equal(fixture.inserted.filter((clip) => clip.trackKind === 'video').length, 21);
  const song = fixture.inserted.find((clip) => clip.trackKind === 'audio');
  assert.equal(song.startFrame, 0);
  assert.equal(song.endFrame, 853);
  assert.equal(song.sourceStartSeconds, 1);
  assert.equal(fixture.bindings.length, 0);
  const checked = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new',
    media, music: { resourceId: 'song', path: '/test/song.wav', durationFrames: 1200, startFrame: 60 }, manualBpm: 120 });
  assert.equal(checked.status, 'verified', checked.message);
  fixture.inserted.splice(fixture.inserted.indexOf(song), 1);
  const missingMusic = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new',
    media, music: { resourceId: 'song', path: '/test/song.wav', durationFrames: 1200, startFrame: 60 }, manualBpm: 120 });
  assert.equal(missingMusic.status, 'notSaved');
  assert.match(missingMusic.message, /music/i);
});
