import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadPanelFunctions} from './windows_host.mjs';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'shared/media-duration.js'), 'utf8');
const {mediaDurationFact, resolveMediaDurations, requireMediaDurations} = vm.runInNewContext(source + '\n({mediaDurationFact, resolveMediaDurations, requireMediaDurations})');
const plain = value => JSON.parse(JSON.stringify(value));

test('Resource duration wins; only finite positive seconds are facts', () => {
  assert.deepEqual(plain(mediaDurationFact(1.2, 19)), {durationSeconds: 1.2, durationSource: 'resource'});
  for (const invalid of [undefined, null, 0, -1, NaN, Infinity, -Infinity, '19']) {
    assert.deepEqual(plain(mediaDurationFact(invalid, 1.3)), {durationSeconds: 1.3, durationSource: 'source-tree'});
    assert.deepEqual(plain(mediaDurationFact(invalid, invalid)), {durationSeconds: null, durationSource: 'unknown'});
  }
});

test('probe fallback preserves row identity, ordering, provenance and caller snapshots', async () => {
  const input = [
    {resourceId: 'r2', name: 'same.mp4', path: '/b/same.mp4', ...mediaDurationFact(undefined, 19)},
    {resourceId: 'r1', name: 'same.mp4', path: '/a/same.mp4', ...mediaDurationFact()},
  ];
  const before = plain(input), calls = [];
  const rows = await resolveMediaDurations(input, async file => { calls.push(file); return 1.3; });
  assert.deepEqual(plain(input), before);
  assert.deepEqual(plain(rows), [before[0], {...before[1], durationSeconds: 1.3, durationSource: 'probe'}]);
  assert.deepEqual(calls, ['/a/same.mp4']);
  requireMediaDurations(rows);
});

for (const value of [null, undefined, 0, -1, NaN, Infinity, '19']) {
  test(`invalid probe ${String(value)} remains unknown`, async () => {
    const [row] = await resolveMediaDurations([{resourceId: 'r1', name: 'unknown.mp4', path: '/unknown.mp4'}], async () => value);
    assert.equal(row.durationSeconds, null);
    assert.equal(row.durationSource, 'unknown');
    assert.throws(() => requireMediaDurations([row]), error => error.code === 'media-duration-unknown' && error.resourceId === 'r1' && /unknown.mp4/.test(error.message));
  });
}

const recapSource = fs.readFileSync(path.join(root, 'plugins/recap-2026/panel.tsx'), 'utf8');
const recap = loadPanelFunctions(recapSource, ['embedded', 'core', 'RESOURCE_SECONDS', 'selectedVideosScript', 'withDurations'], {
  __sdk: {media: {runFFprobe: async () => ({stdout: '19'})}},
});

test('Recap consumes the same Resource/tree/probe contract with mixed source-tree shapes', async () => {
  const resources = [
    {resourceId: 'r0', name: 'resource.mp4', type: 'Video', durationSeconds: 1.7},
    {resourceId: 'r1', name: 'tree.mp4', type: 'Video', durationSeconds: NaN},
    {resourceId: 'r2', name: 'probe.mp4', type: 'Video', durationSeconds: Infinity},
  ];
  const tree = resources.map((row, i) => ({...row, type: 'video', path: `/${row.name}`, durationSeconds: i === 1 ? 19 : null}));
  for (const summary of [true, false]) {
    const project = {resources: async () => resources, sourceFiles: async opts => summary && !opts ? {folders: [{name: 'f'}]} : {fileTree: tree}};
    const script = recap.selectedVideosScript('p', ['r2', 'r0', 'r1']);
    const read = await vm.runInNewContext('(async()=>{' + script + '})()', {selects: {project: () => project}});
    const rows = await recap.withDurations(read);
    assert.deepEqual(Array.from(rows, row => [row.resourceId, row.durationSeconds, row.durationSource]), [
      ['r0', 1.7, 'resource'], ['r1', 19, 'source-tree'], ['r2', 19, 'probe'],
    ]);
  }
});
