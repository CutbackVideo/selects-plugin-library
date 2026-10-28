import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDailyFixture as build} from './daily_font_fixture.mjs';

// Exercise the actual generated builder, including all split inserts and the final save.
for (const fps of [24000 / 1001, 24, 25, 30000 / 1001, 30, 50, 60000 / 1001, 60]) {
  test(`Daily ${fps.toFixed(3)}: a short but sufficient source advances through the split without reuse`, async () => {
    const b = await build(fps, {clipSeconds: 3.3, durations: {v0: 10}});
    const pieces = b.inserts.filter(x => x.resourceId === 'v3');
    assert.equal(pieces.length, 2);
    assert.ok(pieces[1].sourceRange.startSeconds >= pieces[0].sourceRange.endSeconds - 1e-9,
      'the second piece must never replay frames from the first');
    assert.ok(pieces[1].sourceRange.endSeconds <= 3.3);
    assert.equal(b.commits, 1);
    assert.equal(b.result.frames, Math.round(512 * fps / 25));
    assert.deepEqual([...new Set(b.main.map(x => x.resourceId))], Array.from({length: 9}, (_, i) => 'v' + i));
  });
}

test('Daily rejects an impossible third slot with its required duration before creating or saving a Draft', async () => {
  const lifecycle = {};
  await assert.rejects(build(25, {clipSeconds: 2.6, durations: {v0: 10}, lifecycle}), error => {
    assert.match(error.message, /clip 3.*v3/i);
    assert.match(error.message, /3\.\d+.*seconds/i);
    assert.match(error.message, /2\.60/);
    return true;
  });
  assert.equal(lifecycle.drafts ?? 0, 0);
  assert.equal(lifecycle.commits ?? 0, 0);
});

test('Daily validates the actual slot duration rather than requiring every clip to be long', async () => {
  const b = await build(25, {durations: {v0: 4.3, v1: 1.8, v2: 1.8, v3: 3.3, v4: 1.9, v5: 1.9, v6: 1.9, v7: 1.9, v8: 2.5}});
  assert.equal(b.commits, 1);
  assert.equal(b.main.length, 10);
});

test('Daily reports an insufficient Opening before creating a Draft', async () => {
  const lifecycle = {};
  await assert.rejects(build(25, {durations: {v0: 2.6}, lifecycle}), /Opening.*v0.*4\.\d+.*seconds/i);
  assert.equal(lifecycle.drafts ?? 0, 0);
  assert.equal(lifecycle.commits ?? 0, 0);
});

test('Daily keeps its intentional Opening reprise for seven other clips', async () => {
  const b = await build(25, {clips: 7, clipSeconds: 3.3, durations: {v0: 10}});
  assert.ok(b.main.some(c => c.startFrame === 411 && c.resourceId === 'v0'));
  assert.equal(b.result.frames, 512);
  assert.equal(b.commits, 1);
});
