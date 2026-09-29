import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildScript } from './operation-builder.mjs';

const effectSha = 'bf1d24dab2ac13a45fcd5a1ce5ff0587de86be31f900ab03976cbbc1fc5eba86';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const image = (i) => ({ resourceId: `r${i}`, name: `photo-${i}.png`, type: 'Image' });
const file = (i) => ({ type: 'image', resourceId: `r${i}`, name: `photo-${i}.png`, path: `/test/photo-${i}.png`, frameSize: { width: 1080, height: 1920 } });
const row = (i) => ({ clipId: i + 1, trackId: `v${i}`, trackKind: 'video', resourceId: `r${i}`, startFrame: i * 10, endFrame: 853 });
const slot = (i) => `tile-${String(i + 1).padStart(2, '0')}`;

function fixture({ imageTree = true, binding = true, shortVideo = false } = {}) {
  const calls = { create: 0, replace: [], focus: [], commit: 0 };
  const resources = Array.from({ length: 21 }, (_, i) => shortVideo ? { resourceId: `r${i}`, name: `clip-${i}.mp4`, type: 'Video' } : image(i));
  const nodes = imageTree ? Array.from({ length: 21 }, (_, i) => shortVideo ?
    { type: 'video', resourceId: `r${i}`, name: `clip-${i}.mp4`, path: `/test/clip-${i}.mp4`, frameSize: { width: 1080, height: 1920 }, durationSeconds: i === 0 ? 1 : 30 } : file(i)) : [];
  const clips = Array.from({ length: 21 }, (_, i) => row(i));
  const focuses = clips.map(() => ({ focusX: 0.5, focusY: 0.5 }));
  const draft = {
    meta: async () => ({ fps: 60, frameSize: { width: 1080, height: 1920 }, durationFrames: 853, name: 'Gallery' }),
    clips: async () => clips.map((clip) => ({ ...clip })),
    clipTemplateBinding: binding ? async (clip) => ({ templateId: 'photo-gallery-no2', templateVersion: '1', instanceId: 'instance-1', slotKey: slot(clip.clipId - 1), occurrenceKey: slot(clip.clipId - 1) }) : undefined,
    bindTemplateClips: binding ? async () => ({ instanceId: 'instance-1' }) : undefined,
    videoEffects: async (clip) => [{
      name: `Gallery ${slot(clip.clipId - 1)}`,
      sourceIdentity: { sha256: effectSha },
      editableParameters: { definitions: [{ key: 'focusX', defaultValue: 0.5 }, { key: 'focusY', defaultValue: 0.5 }], values: { ...focuses[clip.clipId - 1] } },
    }],
    setVideoEffectParameters: async ({ effects, values }) => {
      calls.focus.push({ effects, values });
      for (const effect of effects) focuses[Number(effect.name.slice(-2)) - 1] = { ...focuses[Number(effect.name.slice(-2)) - 1], ...values };
    },
    replaceImageResource: async ({ clips: targets, resource }) => {
      calls.replace.push({ targets, resource });
      for (const target of targets) clips[target.clipId - 1].resourceId = resource.resourceId;
    },
    commitAll: async () => { calls.commit++; return { commitId: 'commit-1' }; },
  };
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
  return { run, calls, clips, nodes, resources, draft };
}

test('the effect identity readback matches the actual bundled source', () => {
  const source = readFileSync(new URL('./operation-runtime.js', import.meta.url), 'utf8');
  const match = source.match(/const TILE_EFFECT = (`[\s\S]*?`);/);
  assert.ok(match);
  const effectCode = Function(`return ${match[1]}`)();
  assert.equal(createHash('sha256').update(effectCode).digest('hex'), effectSha);
});

test('an Image Resource without publicly exposed dimensions stops inspection before mutation', async () => {
  const { run, calls, nodes } = fixture();
  for (const node of nodes) { node.type = 'video'; delete node.frameSize; }
  const result = await run({ operation: 'inspect', projectId: 'project-1' });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /no readable path or dimensions/);
  assert.equal(calls.create, 0);
  assert.equal(calls.commit, 0);
});

test('unsupported template binding stops before creating a Draft', async () => {
  const { run, calls } = fixture({ binding: false });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'image', width: 1080, height: 1920 }));
  const result = await run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /cannot preserve gallery slot identity/);
  assert.equal(calls.create, 0);
  assert.equal(calls.commit, 0);
});

test('short video hold fails before a Draft is created when native hold is absent', async () => {
  const { run, calls } = fixture({ shortVideo: true });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'video', width: 1080, height: 1920, durationFrames: i === 0 ? 60 : 1800 }));
  const result = await run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /cannot hold the last frame/);
  assert.equal(calls.create, 0);
  assert.equal(calls.commit, 0);
});

test('inspection identifies exactly the bound 21 tiles of the requested Draft', async () => {
  const { run } = fixture();
  const result = await run({ operation: 'inspect', projectId: 'project-1', draftId: 'draft-1' });
  assert.equal(result.status, 'inspected');
  assert.equal(result.existing.draftId, 'draft-1');
  assert.equal(result.existing.instanceId, 'instance-1');
  assert.deepEqual(result.existing.media.map((item) => item.slotKey), Array.from({ length: 21 }, (_, i) => slot(i)));
  assert.equal(result.existing.timingEditable, false);
});

test('single-tile focus edit commits only that verified effect', async () => {
  const { run, calls } = fixture();
  const result = await run({ operation: 'update', projectId: 'project-1', draftId: 'draft-1', instanceId: 'instance-1', slotKey: 'tile-07', resourceId: 'r6', focusX: 0.7 });
  assert.equal(result.status, 'saved');
  assert.equal(calls.focus.length, 1);
  assert.deepEqual(calls.focus[0].values, { focusX: 0.7, focusY: 0.5 });
  assert.equal(calls.focus[0].effects[0].name, 'Gallery tile-07');
  assert.equal(calls.replace.length, 0);
  assert.equal(calls.commit, 1);
});

test('single-tile image replacement leaves the other 20 clips unchanged', async () => {
  const { run, calls, clips, nodes, resources } = fixture();
  resources.push({ resourceId: 'replacement', name: 'new.png', type: 'Image' });
  nodes.push({ type: 'image', resourceId: 'replacement', name: 'new.png', path: '/test/new.png', frameSize: { width: 1080, height: 1920 } });
  const before = clips.map((clip) => clip.resourceId);
  const result = await run({ operation: 'update', projectId: 'project-1', draftId: 'draft-1', instanceId: 'instance-1', slotKey: 'tile-07', resourceId: 'replacement' });
  assert.equal(result.status, 'saved');
  assert.equal(calls.replace.length, 1);
  assert.deepEqual(calls.replace[0].targets.map((clip) => clip.clipId), [7]);
  assert.deepEqual(clips.map((clip, i) => i === 6 ? before[i] : clip.resourceId), before);
  assert.equal(clips[6].resourceId, 'replacement');
});

test('a differently sized image cannot silently reuse stale crop geometry', async () => {
  const { run, calls, nodes, resources } = fixture();
  resources.push({ resourceId: 'square', name: 'square.png', type: 'Image' });
  nodes.push({ type: 'image', resourceId: 'square', name: 'square.png', path: '/test/square.png', frameSize: { width: 720, height: 720 } });
  const result = await run({ operation: 'update', projectId: 'project-1', draftId: 'draft-1', instanceId: 'instance-1', slotKey: 'tile-07', resourceId: 'square' });
  assert.equal(result.status, 'notSaved');
  assert.match(result.message, /different dimensions.*crop/i);
  assert.equal(calls.replace.length, 0);
  assert.equal(calls.commit, 0);
});

test('wrong instance and unsupported timing changes do not mutate', async () => {
  const { run, calls } = fixture();
  const wrong = await run({ operation: 'update', projectId: 'project-1', draftId: 'draft-1', instanceId: 'wrong', slotKey: 'tile-07', resourceId: 'r6' });
  assert.equal(wrong.status, 'notSaved');
  const timing = await run({ operation: 'updateTiming', projectId: 'project-1', draftId: 'draft-1', instanceId: 'instance-1', durationFrames: 900 });
  assert.equal(timing.status, 'notSaved');
  assert.equal(calls.replace.length, 0);
  assert.equal(calls.focus.length, 0);
  assert.equal(calls.commit, 0);
});

function creationFixture({ failCommit = false, videoIndices = [], audio = false } = {}) {
  const inserted = [], effects = [], bindings = [], transforms = [];
  let createCount = 0;
  const fresh = () => inserted.map((item) => ({ ...item }));
  const draft = {
    meta: async () => ({ fps: 60, frameSize: { width: 1080, height: 1920 }, durationFrames: 853 }),
    setFrameSize: async () => {},
    insertGap: async () => {},
    rangeAtFrames: async (startFrame, endFrame) => ({ startFrame, endFrame }),
    clips: async () => fresh(),
    overlayResource: async ({ resource, over, sourceStartSeconds }) => {
      const trackKind = resource.resourceId === 'song' ? 'audio' : 'video';
      inserted.push({ clipId: inserted.length + 1, trackId: `v${inserted.length}`, trackKind, resourceId: resource.resourceId, startFrame: over.startFrame, endFrame: over.endFrame, sourceStartSeconds });
    },
    addVideoEffect: async (entry) => effects.push(entry),
    setClipTransform: async (entry) => transforms.push(entry),
    bindTemplateClips: async (entry) => { bindings.push(entry); return { instanceId: 'created-instance' }; },
    commitAll: async () => {
      if (failCommit) throw new Error('transport lost after commit started');
      return { commitId: 'commit-new', createdDraftId: 'draft-new' };
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
    meta: async () => ({ draftIds: ['known'] }),
    createDraft: async () => { createCount++; return draft; },
    resource: (resourceId) => ({ resourceId }),
  };
  const selects = {
    project: () => project,
    draft: () => ({ meta: draft.meta, bindTemplateClips: draft.bindTemplateClips }),
    media: { probe: async ({ filePaths }) => ({ files: filePaths.map((path) => ({ path })), errors: [], summary: { failed: 0 } }) },
  };
  return {
    run: (input) => new AsyncFunction('selects', buildScript(input))(selects),
    inserted, effects, bindings, transforms,
    get createCount() { return createCount; },
  };
}

test('create places 21 separately editable native resources at the reference reveal frames', async () => {
  const fixture = creationFixture();
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'image', width: 1080, height: 1920 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'saved', result.message);
  assert.equal(result.draftId, 'draft-new');
  assert.equal(fixture.createCount, 1);
  assert.equal(fixture.inserted.length, 21);
  assert.deepEqual(fixture.inserted.map((clip) => clip.startFrame), [0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205]);
  assert.ok(fixture.inserted.every((clip) => clip.endFrame === 853));
  assert.equal(fixture.effects.length, 21);
  assert.equal(fixture.transforms.length, 21);
  assert.equal(fixture.bindings.length, 1);
  assert.deepEqual(fixture.bindings[0].clips.map((entry) => entry.slotKey), Array.from({ length: 21 }, (_, i) => slot(i)));
  assert.equal(fixture.effects[0].parameters.colorAfterLocalFrame, 270);
  assert.equal(fixture.effects[20].parameters.colorAfterLocalFrame, 65);
});

test('lost commit response is unknown, never reported as an unsaved retry', async () => {
  const fixture = creationFixture({ failCommit: true });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'image', width: 1080, height: 1920 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, manualBpm: 113 });
  assert.equal(result.status, 'outcomeUnknown');
  assert.equal(fixture.createCount, 1);
});

test('21 sufficiently long videos and selected music remain independent native clips', async () => {
  const fixture = creationFixture({ videoIndices: Array.from({ length: 21 }, (_, i) => i), audio: true });
  const media = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, kind: 'video', width: 1920, height: 1080, durationFrames: 1800 }));
  const result = await fixture.run({ operation: 'create', projectId: 'project-1', media, music: { resourceId: 'song', durationFrames: 1200, startFrame: 60 }, manualBpm: 120 });
  assert.equal(result.status, 'saved', result.message);
  assert.equal(result.colorFrame, Math.round(270 * 113 / 120));
  assert.equal(fixture.inserted.filter((clip) => clip.trackKind === 'video').length, 21);
  const song = fixture.inserted.find((clip) => clip.trackKind === 'audio');
  assert.equal(song.startFrame, 0);
  assert.equal(song.endFrame, 853);
  assert.equal(song.sourceStartSeconds, 1);
  assert.equal(fixture.bindings[0].clips.length, 21);
});
