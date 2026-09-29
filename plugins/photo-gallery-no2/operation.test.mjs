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

test('Image Resources without public dimensions remain selectable for conversion', async () => {
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

test('converted stills import once, then resolve to independent Video Resources', async () => {
  const { run, nodes, resources, project } = fixture();
  for (const node of nodes) { node.type = 'video'; delete node.frameSize; }
  let imports = 0;
  project.importFiles = async ({ paths }) => {
    imports++;
    assert.deepEqual(paths, ['/cache/still-a.mp4']);
    resources.push({ resourceId: 'converted-a', name: 'still-a.mp4', type: 'Video' });
    nodes.push({ type: 'video', resourceId: 'converted-a', name: 'still-a.mp4', path: paths[0], durationSeconds: 14.3,
      frameSize: { width: 1080, height: 1920 } });
    return { addedResourceIds: ['converted-a'] };
  };
  const request = { operation: 'importConverted', projectId: 'project-1', converted: [
    { sourceResourceId: 'r0', path: '/cache/still-a.mp4' },
  ] };
  const first = await run(request);
  assert.equal(first.status, 'prepared', first.message);
  assert.equal(first.converted[0].resourceId, 'converted-a');
  const second = await run(request);
  assert.equal(second.status, 'prepared');
  assert.equal(imports, 1);
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
    converted: [{ sourceResourceId: 'r0', path: '/cache/held-short.mp4' }] };
  const result = await run(request);
  assert.equal(result.status, 'prepared', result.message);
  assert.equal(result.converted[0].resourceId, 'held-0');
  assert.equal(imports, 1);
});

test('a prepared black Main video is imported once and validated before use', async () => {
  const { run, nodes, resources, project } = fixture();
  let imports = 0;
  project.importFiles = async ({ paths }) => {
    imports++;
    assert.deepEqual(paths, ['/cache/black-base.mp4']);
    resources.push({ resourceId: 'base', name: 'black-base.mp4', type: 'Video' });
    nodes.push({ type: 'video', resourceId: 'base', name: 'black-base.mp4', path: paths[0],
      durationSeconds: 853 / 60, frameSize: { width: 1080, height: 1920 } });
  };
  const request = { operation: 'importBase', projectId: 'project-1', path: '/cache/black-base.mp4', durationFrames: 853 };
  const first = await run(request);
  assert.equal(first.status, 'prepared', first.message);
  assert.equal(first.baseResourceId, 'base');
  assert.equal((await run(request)).baseResourceId, 'base');
  assert.equal(imports, 1);
});

test('a mismatched Main video never reaches Draft creation', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i) });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'video',
    width: 1920, height: 1080, durationFrames: 1800 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media,
    baseResourceId: 'r0', manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /black Main video/);
  assert.equal(fixture.createCount, 0);
});

test('bad converted duration and direct Image overlays fail before Draft creation', async () => {
  const { run, calls, project } = fixture();
  let imports = 0;
  project.importFiles = async () => { imports++; return { addedResourceIds: [] }; };
  const bad = await run({ operation: 'importConverted', projectId: 'project-1', durationFrames: -1,
    converted: [{ sourceResourceId: 'r0', path: '/cache/still-a.mp4' }] });
  assert.equal(bad.status, 'notSaved');
  assert.match(bad.message, /duration/);
  assert.equal(imports, 0);
  const direct = await run({ operation: 'create', projectId: 'project-1', baseResourceId: 'base', manualBpm: 113,
    media: Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'image', focusX: 0.5, focusY: 0.5 })) });
  assert.equal(direct.status, 'notSaved');
  assert.match(direct.message, /black Main video|Convert Project photos/);
  assert.equal(calls.create, 0);
});

test('unprepared short video fails before a Draft is created', async () => {
  const { run, calls } = fixture({ shortVideo: true });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'video', width: 1080, height: 1920, durationFrames: i === 0 ? 60 : 1800 }));
  const result = await run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /black Main video|too short/);
  assert.equal(calls.create, 0);
  assert.equal(calls.commit, 0);
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

function creationFixture({ failCommit = false, videoIndices = [], audio = false } = {}) {
  const inserted = [], effects = [], bindings = [], transforms = [];
  let createCount = 0;
  const fresh = () => inserted.map((item) => ({ ...item }));
  const draft = {
    meta: async () => ({ fps: 60, frameSize: { width: 1080, height: 1920 }, durationFrames: 853 }),
    setFrameSize: async () => {},
    insertGap: async () => { throw new Error('A gallery needs a real Main video clip'); },
    insertResource: async ({ resourceId }) => {
      inserted.push({ clipId: 'main-1', trackId: 'main', trackKind: 'main',
        resourceId, startFrame: 0, endFrame: 853 });
    },
    rangeAtFrames: async (startFrame, endFrame) => ({ startFrame, endFrame }),
    clips: async () => fresh(),
    overlayResource: async ({ resource, over, sourceStartSeconds }) => {
      const trackKind = resource.resourceId === 'song' ? 'audio' : 'video';
      inserted.push({ clipId: inserted.length + 1, trackId: `v${inserted.length}`, trackKind, resourceId: resource.resourceId, startFrame: over.startFrame, endFrame: over.endFrame, sourceStartSeconds });
    },
    addVideoEffect: async (entry) => effects.push(entry),
    setClipTransform: async (entry) => transforms.push(entry),
    clipTransform: async (clip) => {
      const value = transforms.find((entry) => entry.clip.clipId === clip.clipId);
      return value && { enabled: true, position: value.position, scale: value.scale };
    },
    videoEffects: async (clip) => effects.filter((effect) => effect.clip.clipId === clip.clipId)
      .map((effect) => ({ name: effect.label, enabled: true })),
    commitAll: async () => {
      if (failCommit) throw new Error('transport lost after commit started');
      return { createdDraftId: 'draft-new' };
    },
  };
  const resources = Array.from({ length: 21 }, (_, i) => videoIndices.includes(i) ? { resourceId: `r${i}`, name: `video-${i}.mp4`, type: 'Video' } : image(i));
  const files = Array.from({ length: 21 }, (_, i) => videoIndices.includes(i) ?
    { type: 'video', resourceId: `r${i}`, name: `video-${i}.mp4`, path: `/test/video-${i}.mp4`, frameSize: { width: 1920, height: 1080 }, durationSeconds: 30 } : file(i));
  resources.push({ resourceId: 'base', name: 'black-base.mp4', type: 'Video' });
  files.push({ type: 'video', resourceId: 'base', name: 'black-base.mp4', path: '/cache/black-base.mp4',
    frameSize: { width: 1080, height: 1920 }, durationSeconds: 853 / 60 });
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
    inserted, effects, bindings, transforms,
    get createCount() { return createCount; },
  };
}

test('create places 21 separately editable native resources at the reference reveal frames', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i) });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'video', width: 1920, height: 1080, durationFrames: 1800 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, baseResourceId: 'base', manualBpm: 113 });
  assert.equal(result.status, 'saved', result.message);
  assert.equal(result.draftId, 'draft-new');
  assert.equal(fixture.createCount, 1);
  assert.equal(fixture.inserted.length, 22);
  assert.deepEqual(fixture.inserted.filter((clip) => clip.trackKind === 'video').map((clip) => clip.startFrame), [0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205]);
  assert.ok(fixture.inserted.every((clip) => clip.endFrame === 853));
  assert.equal(fixture.effects.length, 21);
  assert.equal(fixture.transforms.length, 21);
  assert.equal(fixture.bindings.length, 0);
  assert.equal(fixture.effects[0].parameters.colorAfterLocalFrame, 270);
  assert.equal(fixture.effects[20].parameters.colorAfterLocalFrame, 65);
  const verified = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new', media, baseResourceId: 'base', manualBpm: 113 });
  assert.equal(verified.status, 'verified', verified.message);
  assert.equal(verified.tileCount, 21);
  const main = fixture.inserted.find((clip) => clip.trackKind === 'main');
  fixture.inserted.splice(fixture.inserted.indexOf(main), 1);
  const noMain = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new',
    media, baseResourceId: 'base', manualBpm: 113 });
  assert.equal(noMain.status, 'notSaved');
  assert.match(noMain.message, /black Main video/);
  fixture.inserted.unshift(main);
  fixture.transforms[0].position = { x: 999, y: 999 };
  const moved = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new', media, baseResourceId: 'base', manualBpm: 113 });
  assert.equal(moved.status, 'notSaved');
  assert.match(moved.message, /position|transform/i);
});

test('lost commit response is unknown, never reported as an unsaved retry', async () => {
  const fixture = creationFixture({ failCommit: true, videoIndices: Array.from({ length: 21 }, (_, i) => i) });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'video', width: 1920, height: 1080, durationFrames: 1800 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, baseResourceId: 'base', manualBpm: 113 });
  assert.equal(result.status, 'outcomeUnknown');
  assert.equal(fixture.createCount, 1);
});

test('21 sufficiently long videos and selected music remain independent native clips', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i), audio: true });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'video', width: 1920, height: 1080, durationFrames: 1800 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, baseResourceId: 'base', music: { resourceId: 'song', durationFrames: 1200, startFrame: 60 }, manualBpm: 120 });
  assert.equal(result.status, 'saved', result.message);
  assert.equal(result.colorFrame, Math.round(270 * 113 / 120));
  assert.equal(fixture.inserted.filter((clip) => clip.trackKind === 'video').length, 21);
  const song = fixture.inserted.find((clip) => clip.trackKind === 'audio');
  assert.equal(song.startFrame, 0);
  assert.equal(song.endFrame, 853);
  assert.equal(song.sourceStartSeconds, 1);
  assert.equal(fixture.bindings.length, 0);
  const checked = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new',
    media, baseResourceId: 'base', music: { resourceId: 'song', durationFrames: 1200, startFrame: 60 }, manualBpm: 120 });
  assert.equal(checked.status, 'verified', checked.message);
  fixture.inserted.splice(fixture.inserted.indexOf(song), 1);
  const missingMusic = await fixture.run({ operation: 'verifyCreated', projectId: 'project-1', draftId: 'draft-new',
    media, baseResourceId: 'base', music: { resourceId: 'song', durationFrames: 1200, startFrame: 60 }, manualBpm: 120 });
  assert.equal(missingMusic.status, 'notSaved');
  assert.match(missingMusic.message, /music/i);
});
