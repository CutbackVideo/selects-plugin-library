import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScript } from './operation-builder.mjs';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const path = '/installed/photo-gallery-no2/assets/music.mp3';
// `hostPath` is the form the host reports back for the imported file (Windows may differ in case or separators).
function fixture({ existing = false, duration = 853 / 60, corrupt = false, lostResponse = false, hostPath = path } = {}) {
  const resources = [], nodes = [], calls = [];
  const add = () => { resources.push({ resourceId: 'music', type: 'Audio', durationSeconds: duration }); nodes.push({ resourceId: 'music', path: hostPath, name: 'music.mp3', durationSeconds: duration }); };
  if (existing) add();
  const project = {
    resources: async () => resources,
    sourceFiles: async () => ({ fileTree: nodes }),
    importFiles: async ({ paths }) => { calls.push(paths); add(); if (lostResponse) throw Error('Transport lost'); },
  };
  const selects = { project: () => project, media: { probe: async () => corrupt ? { errors: ['corrupt'] } : { files: [{ path: hostPath, type: 'audio' }] } } };
  return { resources, nodes, calls, run: (extra = {}) => new AsyncFunction('selects', buildScript({ operation: 'importBundledMusic', projectId: 'project', path, durationFrames: 853, ...extra }))(selects) };
}

test('bundled B2 imports as one full-length Audio without creating a Draft', async () => {
  const f = fixture(), result = await f.run();
  assert.equal(result.status, 'musicReady', result.message);
  assert.deepEqual(result.music, { resourceId: 'music', name: 'music.mp3', path, durationFrames: 853, startFrame: 0 });
  assert.equal(f.calls.length, 1);
});
test('repeat preparation reuses the exact Project path without another import', async () => {
  const f = fixture(); await f.run(); const result = await f.run();
  assert.equal(result.status, 'musicReady'); assert.equal(f.calls.length, 1);
});
test('missing or corrupt bundled music is rejected before import', async () => {
  const f = fixture({ corrupt: true }); assert.equal((await f.run()).status, 'notSaved'); assert.equal(f.calls.length, 0);
});
test('an insufficient existing excerpt is rejected without mutation or looping', async () => {
  const f = fixture({ existing: true, duration: 5 }); const result = await f.run();
  assert.equal(result.status, 'notSaved'); assert.match(result.message, /short|length/i); assert.equal(f.calls.length, 0);
});
test('an ambiguous Project path is rejected before import', async () => {
  const f = fixture({ existing: true }); f.nodes.push({ ...f.nodes[0], resourceId: 'another' });
  f.resources.push({ ...f.resources[0], resourceId: 'another' });
  assert.equal((await f.run()).status, 'notSaved'); assert.equal(f.calls.length, 0);
});
test('lost import response is unknown and retry resolves the existing resource', async () => {
  const f = fixture({ lostResponse: true }); assert.equal((await f.run()).status, 'outcomeUnknown');
  assert.equal((await f.run()).status, 'musicReady'); assert.equal(f.calls.length, 1);
});
test('invalid paths and result lengths fail before import', async () => {
  for (const input of [{ path: 'relative.mp3' }, { durationFrames: 0 }, { durationFrames: 1.5 }]) {
    const f = fixture(); assert.equal((await f.run(input)).status, 'notSaved'); assert.equal(f.calls.length, 0);
  }
});
test('a Windows path matches the host form of the same file without a second import', async () => {
  const winPath = 'C:\\Users\\\uD64D\uAE38\uB3D9\\.selects\\skills\\photo-gallery-no2\\assets\\music.mp3';
  const f = fixture({ hostPath: 'c:/users/\uD64D\uAE38\uB3D9/.selects/skills/photo-gallery-no2/assets/MUSIC.mp3' });
  const first = await f.run({ path: winPath });
  assert.equal(first.status, 'musicReady', first.message);
  assert.equal((await f.run({ path: winPath })).status, 'musicReady');
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0], [winPath]);
});
test('POSIX paths stay case-sensitive', async () => {
  const f = fixture({ existing: true, hostPath: path.toUpperCase() });
  assert.equal((await f.run()).status, 'notSaved');
  assert.equal(f.calls.length, 0);
});
