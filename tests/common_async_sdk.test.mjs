import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { panelSource, hostBlock, loadPanelFunctions, fakeHost, hostGlobals, asyncSdk } from './windows_host.mjs';

const common = ['archive-vlog', 'camera-shutter-dump', 'cinema-vlog-studio', 'city-weekend-vlog', 'cutout-beat-gallery',
  'daily-vlog-8', 'fast-switching-stopmotion', 'four-photo-stop-motion', 'gongju-gallery', 'mini-vlog',
  'no14-still-video', 'photo-gallery-no2', 'polaroid-photo-dump', 'portrait-beat-montage', 'six-clip-velocity',
  'thank-you-recap', 'travel-beat-vlog', 'vlog-opening'];
const tick = () => new Promise(resolve => setTimeout(resolve, 1));

for (const id of common) test(`${id}: roots and media use the asynchronous SDK with DI unavailable`, async () => {
  const host = fakeHost();
  const source = panelSource(id);
  const sdk = asyncSdk(host.di);
  const marker = sdk.files.join(sdk.files.homedir(), '.selects', 'skills', id, 'planner.js');
  host.store.set(marker, host.RealmBytes.from([65]));
  const calls = [];
  const exists = sdk.files.exists, mkdir = sdk.files.mkdir;
  sdk.files.exists = async path => { await tick(); calls.push('exists'); return exists(path); };
  sdk.files.mkdir = async (...args) => { await tick(); calls.push('mkdir'); return mkdir(...args); };
  const functions = loadPanelFunctions(source, [], { ...hostGlobals(host), __sdk: sdk, AbortController });
  const roots = await functions.hostRoots(sdk, id, 'planner.js');
  assert.deepEqual(calls, ['exists', 'mkdir']);
  assert.equal(roots.plugin, sdk.files.dirname ? sdk.files.dirname(marker) : marker.slice(0, -11));
  assert.equal(functions.hostIsWindows(), true);
  assert.equal(await functions.hostReadText(marker), 'A');
  await assert.rejects(functions.hostRoots(sdk, 'missing-plugin', 'planner.js'), { code: 'not-found' });
  const signal = new AbortController().signal;
  let relayed;
  sdk.media.runFFmpeg = async (_args, _quiet, receivedSignal) => { relayed = receivedSignal; throw Error('test decode failure'); };
  await assert.rejects(functions.hostDecodePcm('C:\\media\\clip.mp4', roots.data, 22050, 5, signal), /test decode failure/);
  assert.ok(relayed instanceof AbortSignal);
  assert.equal(Object.keys(sdk.files).some(name => name.endsWith('Sync')), false);
});

test('missing SDK never falls back to legacy DI file services', async () => {
  const host = fakeHost();
  const functions = loadPanelFunctions(panelSource('archive-vlog'), [], hostGlobals(host));
  functions.hostUseSdk({});
  await assert.rejects(functions.hostReadBytes('C:\\missing.txt'), /Update Selects/);
});

for (const [id, marker, prefix] of [['selfie-aesthetic', 'sae-host', 'sae'], ['summer-trip', 'st-host', 'host'], ['the-end-credits', 'tec-host', 'tecHost']]) {
  test(`${id}: custom directory helpers await SDK I/O`, async () => {
    const source = panelSource(id);
    const start = source.indexOf('// ' + marker + ':start');
    const end = source.indexOf('// ' + marker + ':end');
    assert.ok(start >= 0 && end > start, marker);
    const host = fakeHost();
    const sdk = asyncSdk(host.di);
    const dir = sdk.files.join(sdk.files.homedir(), '.selects', 'skills', id);
    host.store.set(sdk.files.join(dir, 'planner.js'), host.RealmBytes.from([65]));
    const context = vm.createContext({panelLocalClient: sdk => sdk,  sdk, TextDecoder, TextEncoder, Uint8Array, AbortController, setTimeout, clearTimeout,
      window: { get parent() { throw Error('No legacy host services'); } } });
    vm.runInContext(source.slice(start, end) + `\nhostUseSdk(sdk); this.api = { skills: ${prefix}SkillsDir, data: ${prefix}DataDir };`, context);
    assert.equal(await context.api.skills(id, 'planner.js'), dir);
    assert.equal(await context.api.skills('absent', 'planner.js'), null);
    assert.equal(await context.api.data(id), sdk.files.join(sdk.files.homedir(), '.selects', 'plugin-data', id));
  });
}

test('Photo Grid Reveal tells an unsupported SDK to update before importing music', async () => {
  const host = fakeHost();
  const { prepareBundledMusic } = loadPanelFunctions(panelSource('photo-gallery-no2'), ['prepareBundledMusic'], hostGlobals(host));
  let imports = 0;
  await assert.rejects(prepareBundledMusic({ files: {} }, {}, {
    projectId: 'project', durationFrames: 853, isCurrent: () => true, onImportStarted: () => { imports++; },
  }), /Update Selects/);
  assert.equal(imports, 0);
});
