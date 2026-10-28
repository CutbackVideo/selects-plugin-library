import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule, disposePanelModule} from './panel_module_fixture.mjs';

const source = fs.readFileSync(new URL('../plugins/depth-type-captions/panel.tsx', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const speech = ['This', 'is', 'one', 'complete', 'spoken', 'sentence.'].map((text, i) => ({
  text, startFrame: i * 10, endFrame: (i + 1) * 10, wordId: 'w' + i, resourceId: 'r0',
}));

function fixture(t, {size = {width: 1920, height: 1080}, video = false, words = speech,
  existing = 0, commitError, frameError, maskError, wrongProject = false} = {}) {
  let frameSize = {...size}, next = 100, commits = 0, drafts = 0, sid = 'draft';
  const transform = {scale: {x: 1.2, y: 1.2}, position: {x: 12, y: -8}};
  const main = [{clipId: 1, trackId: 'main', resourceId: 'r0', trackKind: 'main', startFrame: 0, endFrame: 60, transform: plain(transform)}];
  let graphics = [{name: 'Other overlay', clip: {clipId: 10, trackId: 'other', startFrame: 0, endFrame: 60}},
    ...Array.from({length: existing}, (_, i) => ({name: 'Depth Type Captions', clip: {clipId: 20 + i, trackId: 'depth', startFrame: 0, endFrame: 60}}))];
  const changes = [], maskSizes = [], warnings = [], store = new Map(), effects = [], cleanups = [];
  let finish;
  const outcome = new Promise(resolve => { finish = resolve; });
  const draft = {
    meta: async () => ({name: 'Canvas fixture', fps: 30, durationFrames: 60, frameSize: {...frameSize}}),
    words: async () => words,
    clips: async ({trackScope}) => trackScope === 'main' ? main : [...main, ...graphics.map(g => g.clip)],
    setFrameSize: async size => { changes.push('canvas'); if (frameError) throw frameError; frameSize = {...size}; return {opCount: 1}; },
    setClipTransform: async ({clip, scale, position}) => { changes.push('transform'); clip.transform = plain({scale, position}); return {diff: {opCount: 2}}; },
    insertResource: async () => {},
    motionGraphics: async () => graphics,
    removeClips: async clips => { graphics = graphics.filter(g => !clips.some(c => c.clipId === g.clip.clipId && c.trackId === g.clip.trackId)); },
    rangeAtFrames: async (start, end) => ({start, end}),
    addMotionGraphic: async input => { const clip = {clipId: next++, trackId: 'new-depth', startFrame: input.within.start, endFrame: input.within.end}; graphics.push({name: input.label, clip}); return clip; },
    commitAll: async () => { commits++; if (commitError) throw commitError; return {createdDraftId: sid, commitId: 'saved'}; },
  };
  const project = {
    meta: async () => ({draftIds: [sid]}),
    resource: () => ({meta: async () => ({fps: 30, frameSize: {...size}, durationFrames: 60}), words: async () => words}),
    createDraft: async () => { drafts++; sid = 'created'; return draft; },
  };
  const selects = {draft: () => draft, project: () => project,
    listProjects: async () => [{id: 'project', title: 'Canvas QA', draftIds: wrongProject ? [] : [sid]}]};
  const sdk = {
    files: {}, media: {}, environment: {},
    storage: {getItem: async key => store.get(key) ?? null, setItem: async (key, value) => store.set(key, value)},
    finishTemplate: finish,
    runScript: async ({script}) => {
      let execution;
      try {
        execution = loadPanelModule('async function execute(){\n' + script + '\n}', {
          names: ['execute'], globals: {selects}, filename: 'depth-canvas-sdk-script.ts',
        });
        return {result: await execution.execute()};
      } catch (error) { return {isError: true, output: error.message}; }
      finally { if (execution) disposePanelModule(execution); }
    },
  };
  const React = {useState: value => [value, () => {}], useRef: value => ({current: value}),
    useEffect: effect => effects.push(effect), createElement: () => null};
  const api = loadPanelModule(source, {names: ['DepthTemplateRun', 'panelLocalClients', 'hostUseSdk'], React,
    globals: {console: {warn: (...args) => warnings.push(args.join(' '))}},
    overrides: {
      useAppUpdateGuard: () => {}, depthHostProblem: () => '', depthHostWarning: () => '', depthRequireHost: () => {},
      // Actual rendering/segmentation and DOM pixel measurement are host boundaries.
      depthMakeSpeakerMasks: async (_sdk, _pid, _sid, meta) => {
        if (maskError) throw maskError;
        maskSizes.push({width: meta.width, height: meta.height, duration: meta.duration});
        return {files: {dir: '/fixture/masks', base: '/fixture/mask_', count: 60, width: meta.width, height: meta.height},
          mask: {width: meta.width, height: meta.height, fps: 30, frames: [], faces: {status: 'unverified', samples: []}}};
      },
      depthComposeWithSpeaker: async phrase => phrase,
    }});
  api.panelLocalClients.set(sdk, sdk); api.hostUseSdk(sdk);
  t.after(() => { for (const cleanup of cleanups) cleanup(); disposePanelModule(api); });
  return {changes, maskSizes, warnings, main, graphics: () => graphics, commits: () => commits, drafts: () => drafts,
    size: () => frameSize, originalTransform: transform, run: async () => {
      api.DepthTemplateRun({sdk, context: {projectId: 'project', template: {runId: 'run', libraryId: 'library',
        inputs: {speaker: [video ? {kind: 'video', resourceId: 'r0', name: 'source.mp4'} : {kind: 'timeline', sequenceId: sid}]}}}});
      for (const effect of effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
      return await outcome;
    }};
}

for (const size of [{width: 1920, height: 1080}, {width: 1080, height: 1920}, {width: 1080, height: 1080}]) {
  test(`Depth template preserves ${size.width}x${size.height}, user framing and the original duration`, {timeout: 5000}, async t => {
    const f = fixture(t, {size}), result = await f.run();
    assert.equal(result.sequenceId, 'draft');
    assert.deepEqual(f.size(), size);
    assert.deepEqual(f.main[0].transform, f.originalTransform);
    assert.deepEqual(f.changes, []);
    assert.deepEqual(f.maskSizes, [{...size, duration: 2}]);
    assert.equal(f.main[0].endFrame, 60);
    assert.equal(f.commits(), 1, 'only the caption transaction is saved');
  });
}

test('Depth keeps a picked landscape video at its source size and saves its captions', {timeout: 5000}, async t => {
  const f = fixture(t, {video: true}), result = await f.run();
  assert.equal(result.sequenceId, 'created');
  assert.deepEqual(f.size(), {width: 1920, height: 1080});
  assert.deepEqual(f.changes, ['canvas'], 'only creating the new source-sized Draft sets the canvas');
  assert.equal(f.commits(), 2);
});

test('Depth replaces its own recovered captions without removing another overlay', {timeout: 5000}, async t => {
  const f = fixture(t, {existing: 2}), result = await f.run();
  assert.equal(result.sequenceId, 'draft');
  assert.equal(f.graphics().filter(g => g.name === 'Depth Type Captions').length, 1);
  assert.equal(f.graphics().filter(g => g.name === 'Other overlay').length, 1);
});

test('Depth rejects missing speech before any framing or caption commit', {timeout: 5000}, async t => {
  const f = fixture(t, {words: []}), result = await f.run();
  assert.match(result.error, /speech|dialogue/i, f.warnings.join('\n'));
  assert.deepEqual(f.changes, []);
  assert.equal(f.commits(), 0);
});

test('Depth preserves a genuine caption save failure as a failed outcome', {timeout: 5000}, async t => {
  const f = fixture(t, {commitError: new Error('Storage is full')}), result = await f.run();
  assert.ok(result.error); assert.equal(result.sequenceId, undefined);
  assert.ok(f.warnings.some(message => message.includes('Storage is full')));
  assert.deepEqual(f.changes, []);
});

test('Depth never changes an unrelated project Draft before ownership validation', {timeout: 5000}, async t => {
  const f = fixture(t, {wrongProject: true}), result = await f.run();
  assert.ok(result.error); assert.equal(result.sequenceId, undefined);
  assert.deepEqual(f.changes, []); assert.equal(f.commits(), 0);
});

test('Depth does not swallow a failure setting the source-sized canvas for a picked clip', {timeout: 5000}, async t => {
  const f = fixture(t, {video: true, frameError: new Error('Canvas storage unavailable')}), result = await f.run();
  assert.ok(result.error); assert.equal(f.commits(), 0);
});

for (const message of [
  'Not enough free space to export: needs about 2.0 GB, 1.7 GB available.',
  'Not enough free space to export: needs about 21.8 GB, 4.2 GB available.',
]) {
  test('Depth explains the native export storage shortage with its exact capacities: ' + message, {timeout: 5000}, async t => {
    const f = fixture(t, {maskError: new Error(message)}), result = await f.run();
    assert.equal(result.error, message + ' Free up space on the export drive, then try again.');
    assert.equal(result.sequenceId, undefined);
    assert.equal(f.commits(), 0);
    assert.deepEqual(f.changes, []);
  });
}

for (const message of [
  'EACCES: failed to render /private/qa/source.mov',
  'Not enough free space to export: needs about unknown GB, 1.7 GB available.',
  'Not enough free space to export: needs about 2.0 GB, 1.7 GB available. /private/qa/source.mov',
]) {
  test('Depth keeps unexpected render diagnostics private: ' + message, {timeout: 5000}, async t => {
    const f = fixture(t, {maskError: new Error(message)}), result = await f.run();
    assert.equal(result.error, 'Depth Type Captions could not make the captioned timeline. Try again.');
    assert.ok(f.warnings.some(warning => warning.includes(message)));
    assert.equal(f.commits(), 0);
  });
}
