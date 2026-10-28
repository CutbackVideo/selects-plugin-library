import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule, disposePanelModule} from './panel_module_fixture.mjs';

const panel = loadPanelModule(fs.readFileSync(new URL('../plugins/ali-abdaal-style/panel.tsx', import.meta.url), 'utf8'), {
  names: ['inPlaceDraftScript', 'styleScript', 'inPlaceCommitScript'],
});
test.after(() => disposePanelModule(panel));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const words = [{text: 'hello', startFrame: 2, endFrame: 12}];
const plan = {camera: [], scenes: [{start: 0, end: 1, title: 'hello', body: ''}], captions: [words]};

function fixture({writeError} = {}) {
  // Existing SDK targets are tied to the revision of their clips() read.
  // Every edit invalidates ALL older targets, including other clips' rows.
  let revision = 0, commits = 0;
  const revisions = new WeakMap(), transforms = [], effects = [], graphics = [];
  const rows = [
    {clipId: 1, resourceId: 'landscape', startFrame: 0, endFrame: 20},
    {clipId: 2, resourceId: null, startFrame: 20, endFrame: 25},
    {clipId: 3, resourceId: 'portrait', startFrame: 25, endFrame: 45},
    {clipId: 4, resourceId: 'landscape', startFrame: 45, endFrame: 60},
  ];
  const write = (target, output) => {
    assert.equal(revisions.get(target), revision, 'stale_clip_target: read clips() again');
    if (writeError) throw writeError;
    output.push({...target});
    revision++;
  };
  const d = {
    motionGraphics: async () => [], words: async () => words,
    setFrameSize: async () => { revision++; },
    clips: async () => rows.map(row => {
      const target = {...row, trackKind: 'main'};
      revisions.set(target, revision);
      return target;
    }),
    setClipTransform: async ({clip}) => write(clip, transforms),
    addVideoEffect: async ({clip}) => write(clip, effects),
    rangeAtFrames: async (start, end) => ({start, end}),
    addMotionGraphic: async x => { graphics.push(x); revision++; },
    commitAll: async () => { commits++; },
  };
  const selects = {draft: () => d, project: () => ({resource: id => ({meta: async () => ({frameSize:
    id === 'landscape' ? {width: 1920, height: 1080} : {width: 1080, height: 1920}})})})};
  return {d, selects, transforms, effects, graphics, commits: () => commits};
}

test('Ali reframes every cut with a live target, skipping gaps and preserving placement', async () => {
  const f = fixture();
  await new AsyncFunction('selects', panel.inPlaceDraftScript('p', {sequenceId: 'd'}, words, 0, 60))(f.selects);
  assert.deepEqual(f.transforms.map(x => [x.clipId, x.startFrame, x.endFrame]), [[1, 0, 20], [3, 25, 45], [4, 45, 60]]);
});

test('Ali attaches camera effects to every cut after preceding effects invalidate old targets', async () => {
  const f = fixture();
  await new AsyncFunction('d', panel.styleScript(words, plan))(f.d);
  assert.deepEqual(f.effects.map(x => x.clipId), [1, 3, 4]);
  assert.equal(f.graphics.length, 2);
});

test('Ali completes framing, camera, captions and one save on a multi-cut timeline', async () => {
  const f = fixture();
  const script = panel.inPlaceDraftScript('p', {sequenceId: 'd'}, words, 0, 60)
    + panel.styleScript(words, plan) + panel.inPlaceCommitScript('d');
  assert.equal((await new AsyncFunction('selects', script)(f.selects)).id, 'd');
  assert.equal(f.transforms.length, 3);
  assert.equal(f.effects.length, 3);
  assert.equal(f.commits(), 1);
});

test('Ali preserves real mutation errors and never saves a partial failed treatment', async () => {
  const error = new Error('Storage is full'), f = fixture({writeError: error});
  const script = panel.inPlaceDraftScript('p', {sequenceId: 'd'}, words, 0, 60)
    + panel.styleScript(words, plan) + panel.inPlaceCommitScript('d');
  await assert.rejects(new AsyncFunction('selects', script)(f.selects), error);
  assert.equal(f.commits(), 0);
});
