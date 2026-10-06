import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { hostBlock, panelSource, topLevel } from './windows_host.mjs';

const forbiddenDI = new Proxy({}, { get(_target, name) { throw Error(`Unexpected DI access: ${String(name)}`); } });
const pause = () => new Promise(resolve => setImmediate(resolve));

function memorySdk() {
  const files = new Map(), directories = new Set();
  const sdk = {
    environment: { platform: 'win32', version: '2.0.0' }, media: {}, dialogs: {},
    files: {
      join: path.win32.join, dirname: path.win32.dirname, normalize: path.win32.normalize,
      homedir: () => 'C:\\Users\\test',
      exists: async file => { await pause(); return files.has(file) || directories.has(file); },
      mkdir: async dir => { await pause(); directories.add(dir); },
      stat: async file => { await pause(); return { size: files.get(file)?.length || 0 }; },
      writeFile: async (file, bytes) => {
        assert.ok(directories.has(path.win32.dirname(file)), 'mkdir must finish before writing');
        await pause(); files.set(file, typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes);
      },
      readFile: async file => { await pause(); if (!files.has(file)) throw Error('ENOENT'); return files.get(file); },
      readdir: async dir => { await pause(); return [...files.keys()].filter(file => path.win32.dirname(file) === dir).map(file => path.win32.basename(file)); },
      rm: async file => { await pause(); files.delete(file); },
      removeFile: async ({filePath}) => { await pause(); files.delete(filePath); },
    },
  };
  return { sdk, files, directories };
}

for (const name of ['shortform-cloner', 'card-news-maker']) {
  test(`${name}: delayed SDK storage awaits mkdir, existence, stat, list and deletion`, async () => {
    const {sdk, files} = memorySdk();
    const source = panelSource(name);
    const start = source.indexOf('function hostFs()');
    const end = source.indexOf(name === 'shortform-cloner' ? 'function useWidth(' : 'async function imageSize(', start);
    const context = vm.createContext({panelLocalClient: sdk => sdk, hostSdk: sdk, APP_ID: name, IS_WIN: true,
      window: {parent: {__DI__: forbiddenDI}},
      enc: text => new TextEncoder().encode(text), dec: bytes => new TextDecoder().decode(bytes)});
    const store = vm.runInContext(stripTypeScriptTypes(source.slice(start, end)) + '\nmakeStore();', context);
    assert.equal(store.fs, sdk.files);
    await store.put('jobs', 'one', {id: 'one'});
    assert.deepEqual(JSON.parse(JSON.stringify(await store.list('jobs'))), [{id: 'one'}]);
    const file = store.join(store.root, 'jobs', 'one.json');
    if (store.exists) { assert.equal(await store.exists(file), true); assert.equal(await store.exists('missing'), false); }
    if (store.size) { assert.ok(await store.size(file) > 0); assert.equal(await store.size('missing'), 0); }
    await store.del('jobs', 'one');
    assert.equal(files.has(file), false);
    assert.deepEqual(Array.from(await store.list('jobs')), []);
  });
}

test('iMessage workspace binds its supplied SDK and waits for directory creation', async () => {
  const {sdk, files} = memorySdk(), source = panelSource('imessage-generator');
  const names = ['wsNorm', 'wsInside', 'workspaceIO'];
  const context = vm.createContext({panelLocalClient: sdk => sdk, window: {parent: {__DI__: forbiddenDI}}, TextDecoder, TextEncoder, Uint8Array});
  vm.runInContext(hostBlock(source) + '\n' + names.map(name => topLevel(source, name)).join('\n') + '\nthis.run = workspaceIO;', context);
  const roots = await context.run(sdk, '', {action: 'home'});
  const file = sdk.files.join(roots.base, 'job', 'voice.json');
  await context.run(sdk, '', {action: 'write', path: file, data: 'voice'});
  assert.equal(new TextDecoder().decode(files.get(file)), 'voice');
  const result = await context.run(sdk, '', {action: 'exists', paths: [file, 'missing']});
  assert.deepEqual(Array.from(result.exists), [true, false]);
  await assert.rejects(context.run(sdk, '', {action: 'write', path: 'C:\\outside.json', data: 'x'}), /outside/);
});

test('bespoke sources have no asynchronous React effects or Promise predicates', () => {
  const names = ['imessage-generator','shortform-cloner','timeline-shorts-builder','podcast-hook-captions','vox-explainer','doac-style','recap-2026','epidemic-sound-search','tetris','tang-poetry-explainer','card-news-maker','jared-vox-editorial','jude-kinetic-style','a16z-style-captions','chris-williamson-style','depth-type-captions'];
  for (const name of names) {
    const source = panelSource(name);
    assert.doesNotMatch(source, /useEffect\(async\b/, name);
    assert.doesNotMatch(source, /\.(?:filter|some|every|find)\(async\b/, name);
    assert.doesNotMatch(source, /\b(?:fs|fsx|fileSystem|dfs)\??\.\w+Sync\(/, name);
  }
});

test('depth preview waits for its local URL and ignores a result after unmount', async () => {
  const source = panelSource('depth-type-captions');
  const start = source.indexOf('  useEffect(', source.indexOf('// Reopening the panel'));
  const end = source.indexOf('  useEffect(', start + 1);
  for (const cancel of [false, true]) {
    const previews = [], url = 'local://speaker.mp4';
    let release, cleanup;
    const exists = new Promise(resolve => { release = resolve; });
    const context = {
      hostSdk: {files: {exists: () => exists, pathToLocalURL: async () => { await pause(); return url; }}},
      maskFiles: {render: 'C:\\speaker.mp4'}, alive: {current: true},
      useEffect: effect => { cleanup = effect(); },
      setPreview: preview => previews.push(preview), setMask() {},
      depthLoadLayoutMask: async () => null,
    };
    vm.runInNewContext(source.slice(start, end), context);
    assert.equal(typeof cleanup, 'function');
    if (cancel) cleanup();
    release(true);
    await pause(); await pause();
    assert.equal(previews.length, cancel ? 0 : 1);
    if (!cancel) assert.equal(previews[0].url, url);
  }
});

for (const url of ['local://thumbnail/source.jpg', 'file:///C:/Media/source%20image.jpg']) {
  test(`timeline thumbnail waits for local URL conversion: ${url}`, async () => {
    const source = panelSource('timeline-shorts-builder');
    const start = source.indexOf('async function toBlob(');
    const end = source.indexOf('async function imageData(', start);
    const toBlob = vm.runInNewContext(stripTypeScriptTypes(source.slice(start, end)) + '\ntoBlob;', {
      Blob, ArrayBuffer, Uint8Array, window: {parent: {__DI__: forbiddenDI}},
    });
    let finishConversion;
    const converted = new Promise(resolve => { finishConversion = resolve; });
    const reads = [], nativePath = 'C:\\Media\\source image.jpg';
    const files = {
      localURLToPath: actual => { assert.equal(actual, url); return converted; },
      readFile: async actual => { assert.equal(actual, nativePath); reads.push(actual); return Uint8Array.from([1, 2, 3]); },
    };
    const result = toBlob(url, files);
    await pause();
    assert.deepEqual(reads, [], 'readFile must wait for the converted path');
    finishConversion(nativePath);
    const blob = await result;
    assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [1, 2, 3]);
    assert.deepEqual(reads, [nativePath]);
  });
}

test('Epidemic waveform uses only SDK files/media when DI itself is blocked', async () => {
  const source = panelSource('epidemic-sound-search');
  const start = source.indexOf('const reducePcmPeaks =');
  const end = source.indexOf('const Wave =', start);
  const parent = Object.defineProperty({}, '__DI__', {get() { throw Error('DI is unavailable'); }});
  const calls = [];
  const hostSdk = {
    files: {
      join: path.win32.join,
      getOrCreateTmpDirPath: async () => { await pause(); return 'C:\\Temp'; },
      readFile: async file => { assert.equal(typeof file, 'string'); return new Uint8Array(new Int16Array([10, -20, 30]).buffer); },
      removeFile: async ({filePath}) => { await pause(); calls.push(['remove', filePath]); },
    },
    media: {runFFmpeg: async args => { calls.push(['ffmpeg', args]); return {stdout: '', stderr: ''}; }},
  };
  const run = vm.runInNewContext(stripTypeScriptTypes(source.slice(start, end)) + '\nhostLocalPeaks;', {
    hostSdk, window: {parent}, Uint8Array, Int16Array,
  });
  assert.deepEqual(Array.from(await run('C:\\Music\\track.mp3')), [0.333, 0.667, 1]);
  assert.equal(calls[0][0], 'ffmpeg');
  assert.equal(calls[1][0], 'remove');
  assert.equal(calls[1][1], calls[0][1].at(-1));
});

test('Recap timing entry keeps the real SDK through first and cached root lookup', async () => {
  const source = panelSource('recap-2026');
  const {sdk, files} = memorySdk();
  const timingPath = sdk.files.join(sdk.files.homedir(), '.selects', 'skills', 'recap-2026', 'timing.json');
  files.set(timingPath, new TextEncoder().encode(JSON.stringify({placements: [{startSeconds: 0}]})));
  const context = vm.createContext({panelLocalClient: sdk => sdk, TextDecoder, TextEncoder, Uint8Array,
    window: {parent: Object.defineProperty({}, '__DI__', {get() { throw Error('Unexpected DI'); }})}});
  vm.runInContext(hostBlock(source) + '\nconst SLUG="recap-2026"; let recapRootsPromise=null;\n' +
    topLevel(source, 'recapRoots') + '\n' + topLevel(source, 'readTiming') +
    '\nthis.loadTiming=readTiming; this.activeSdk=()=>hostSdk;', context);
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await context.loadTiming(sdk);
    assert.equal(result.placements[0].startSeconds, 0);
    assert.equal(context.activeSdk(), sdk);
  }
});
