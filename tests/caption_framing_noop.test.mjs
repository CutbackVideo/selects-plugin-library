import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule, disposePanelModule} from './panel_module_fixture.mjs';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

for (const [plugin, binding] of [
  ['doac-style', 'doacPortraitScript'],
  ['depth-type-captions', 'depthPortraitDraftScript'],
]) {
  const source = fs.readFileSync(new URL(`../plugins/${plugin}/panel.tsx`, import.meta.url), 'utf8');
  const api = loadPanelModule(source, {names: [binding]});
  test.after(() => disposePanelModule(api));

  function fixture({frameOps = 0, transformOps = [0], commitError} = {}) {
    let opCount = frameOps, commits = 0, transformed = 0;
    const diff = () => ({opCount, beforeDurationFrames: 300, afterDurationFrames: 300, deltaFrames: 0, removedDurationFrames: 0, warnings: []});
    const clips = transformOps.map((_, i) => ({clipId: i + 1, resourceId: `r${i}`, trackKind: 'main', startFrame: i * 100, endFrame: (i + 1) * 100}));
    const draft = {
      motionGraphics: async () => [],
      setFrameSize: async () => diff(),
      clips: async () => clips,
      setClipTransform: async () => { opCount += transformOps[transformed++]; return {diff: diff()}; },
      commitAll: async () => {
        commits++;
        if (!opCount) throw new Error('Nothing to stage — apply an edit verb first.');
        if (commitError) throw commitError;
      },
    };
    const selects = {draft: () => draft, project: () => ({resource: () => ({meta: async () => ({frameSize: {width: 1080, height: 1920}})})})};
    return {run: () => new AsyncFunction('selects', api[binding]('project', 'draft'))(selects), commits: () => commits, clips};
  }

  test(`${plugin}: an already framed portrait continues without an empty save`, async () => {
    const f = fixture();
    assert.equal(await f.run(), true);
    assert.equal(f.commits(), 0);
  });
  test(`${plugin}: a changed canvas is saved even when the transform is unchanged`, async () => {
    const f = fixture({frameOps: 1});
    assert.equal(await f.run(), true);
    assert.equal(f.commits(), 1);
  });
  test(`${plugin}: a changed early clip is saved when the last clip is unchanged`, async () => {
    const f = fixture({transformOps: [1, 0]});
    assert.equal(await f.run(), true);
    assert.equal(f.commits(), 1);
    assert.equal(f.clips[0].endFrame, 100);
  });
  test(`${plugin}: a real save failure remains a failure`, async () => {
    const error = new Error('Storage is full');
    const f = fixture({frameOps: 1, commitError: error});
    await assert.rejects(f.run(), error);
    assert.equal(f.commits(), 1);
  });
}
