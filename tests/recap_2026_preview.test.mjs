import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {topLevel} from './windows_host.mjs';

const require = createRequire(import.meta.url);
const clientRepo = process.env.SELECTS_DEV_REPO || path.join(homedir(), 'cutback-workspace/cutback-client');
const ts = require(require.resolve('typescript', {paths: [process.cwd(), clientRepo]}));
const transpile = source => ts.transpileModule(source, {
  compilerOptions: {jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022},
}).outputText;
const panel = transpile(fs.readFileSync(new URL('../plugins/recap-2026/panel.tsx', import.meta.url), 'utf8'));
const localClient = transpile(fs.readFileSync(new URL('../shared/local-client.ts', import.meta.url), 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));

// The real private adapter executes its generated scripts against these SDK services.
async function exampleFiles(platform = 'win32') {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const home = platform === 'win32' ? 'C:\\Users\\Recap Tester' : paths.join('/', 'home', 'recap tester');
  const data = paths.join(home, '.selects', 'plugin-data', 'recap-2026');
  const files = new Map();
  const calls = [];
  const failures = {video: false, poster: false, truncated: false, url: false, dropDownloadReply: false};
  const fileService = {
    environment: async () => ({platform, homedir: home, tempDirectory: paths.join(home, 'Temp')}),
    stat: async file => files.has(file) ? {size: files.get(file), isDirectory: false} : null,
    download: async (url, file) => {
      assert.match(url, /^https:\/\/raw\.githubusercontent\.com\/CutbackVideo\/selects-plugin-library\/[a-f0-9]{40}\/plugins\/recap-2026\/(preview\.mp4|poster\.webp)$/);
      const video = url.endsWith('preview.mp4');
      if (video ? failures.video : failures.poster) throw new Error('Download unavailable');
      // The SDK publishes the destination only after its internal download succeeds.
      files.set(file, failures.truncated ? 1 : video ? 6706153 : 21664);
    },
    rename: async (from, to) => {
      assert(files.has(from));
      files.set(to, files.get(from));
      files.delete(from);
    },
    remove: async file => { files.delete(file); },
    localUrl: async file => {
      assert(files.has(file));
      return failures.url ? undefined : 'local://' + file;
    },
  };
  const sdk = {
    async runScript(input) {
      calls.push(input);
      if (/files\.(download|rename|remove)\(/.test(input.script)) assert.equal(input.allowCommit, true);
      const result = await new Function('selects', `return (async () => {${input.script}})()` )({files: fileService});
      if (input.script.includes('files.download(') && failures.dropDownloadReply) {
        failures.dropDownloadReply = false;
        // Native I/O finishes, but a disconnected iframe never receives the reply.
        return new Promise(() => {});
      }
      return {isError: false, result};
    },
  };
  const context = vm.createContext({crypto, console});
  vm.runInContext(topLevel(localClient, 'panelLocalPaths') + '\n' + topLevel(localClient, 'createPanelLocalClient'), context);
  const client = await context.createPanelLocalClient(sdk);
  Object.assign(context, {
    panelLocalClient: () => client,
    recapRoots: async () => ({data}),
    window: {get parent() {throw new Error('Parent access forbidden');}},
  });
  for (const name of ['EXAMPLE_REVISION', 'EXAMPLE_ASSETS', 'loadExampleMedia']) {
    vm.runInContext(topLevel(panel, name), context);
  }
  return {load: () => context.loadExampleMedia(sdk), files, calls, failures, paths, data};
}

for (const platform of ['win32', 'darwin']) {
  test(`Recap example uses SDK downloads and reuses the complete cache on ${platform}`, async () => {
    const h = await exampleFiles(platform);
    const first = await h.load();
    assert(first.src.startsWith('local://' + h.data));
    assert(first.poster.startsWith('local://' + h.data));
    assert.equal(h.calls.filter(call => call.script.includes('files.download(')).length, 2);
    assert.equal(h.files.size, 2);
    assert([...h.files.keys()].every(file => h.paths.dirname(file) === h.data));
    assert.deepEqual(await h.load(), first);
    assert.equal(h.calls.filter(call => call.script.includes('files.download(')).length, 2);
  });
}

test('Recap example can retry a failed video download', async () => {
  const h = await exampleFiles();
  h.failures.video = true;
  await assert.rejects(h.load(), /Download unavailable/);
  assert([...h.files.keys()].every(file => !file.endsWith('.part')));
  assert(![...h.files.keys()].some(file => file.endsWith('preview.mp4')));
  h.failures.video = false;
  assert((await h.load()).src);
});

test('Recap reuses a completed download after its panel loses the reply', async () => {
  const h = await exampleFiles();
  h.failures.dropDownloadReply = true;
  void h.load();
  await tick();
  assert.equal(h.files.size, 1, 'The native video download completed');
  const reopened = await h.load();
  assert(reopened.src);
  assert.equal(h.calls.filter(call => /files.download\(.*preview\.mp4/.test(call.script)).length, 1);
  assert.equal(h.files.size, 2, 'Only the video and poster cache files remain');
});

test('Recap example rejects truncated files instead of caching them', async () => {
  const h = await exampleFiles();
  h.failures.truncated = true;
  await assert.rejects(h.load(), /incomplete/i);
  assert.equal(h.files.size, 0);
});

test('Recap video still plays when its optional poster download fails', async () => {
  const h = await exampleFiles();
  h.failures.poster = true;
  const media = await h.load();
  assert(media.src);
  assert(!media.poster);
  assert([...h.files.keys()].every(file => !file.endsWith('.part')));
});

test('Recap example rejects a clipped local URL response', async () => {
  const h = await exampleFiles();
  h.failures.url = true;
  await assert.rejects(h.load(), /URL/i);
});

// A small hook runner follows the same testing pattern as critical_panel_storage.test.mjs.
function examplePlayer(load) {
  const states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, first = true, writes = 0;
  const video = {pause() {this.paused = true;}, removeAttribute(name) {this.removed = name;}, load() {this.loaded = true;}};
  const React = {
    useState(value) {
      const index = stateIndex++;
      if (first) states[index] = value;
      return [states[index], next => {writes++; states[index] = next;}];
    },
    useRef(value) {
      const index = refIndex++;
      if (first) refs[index] = {current: value};
      return refs[index];
    },
    useEffect(effect) {if (first) effects.push(effect);},
    createElement(type, props, ...children) {
      if (type === 'video' && props.ref) props.ref.current = video;
      return {type, props: props || {}, children};
    },
  };
  const t = {example: 'Example', exampleHint: 'Preview', exampleMissing: 'Example unavailable', hostTooOld: 'Update Selects'};
  const context = vm.createContext({React, loadExampleMedia: load, t,
    recapRoots: async () => ({plugin: '/plugin'}), hostJoin: path.posix.join,
    hostSdk: {files: {pathToLocalURL: async () => 'local:///preview.mp4'}},
    window: {get parent() {throw new Error('Parent access forbidden');}},
  });
  vm.runInContext(topLevel(panel, 'FinishedExample'), context);
  function render() {
    stateIndex = 0; refIndex = 0;
    const result = context.FinishedExample({sdk: {}, t, ui: {Section: 'section', Message: 'message'}});
    first = false;
    return result;
  }
  render();
  const cleanups = effects.map(effect => effect());
  return {render, video, states, get writes() {return writes;}, unmount() {cleanups.forEach(cleanup => cleanup?.());}};
}

function findElement(tree, type) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (tree.type === type) return tree;
  return tree.children?.map(child => findElement(child, type)).find(Boolean);
}

test('Recap renders a React video when the parent document is inaccessible', async () => {
  const h = examplePlayer(async () => ({src: 'local:///preview.mp4', poster: 'local:///poster.webp'}));
  await tick();
  const player = findElement(h.render(), 'video');
  assert(player, 'The player must be rendered by React inside the panel');
  assert.equal(player.props.src, 'local:///preview.mp4');
  assert.equal(player.props.poster, 'local:///poster.webp');
  assert.equal(player.props.controls, true);
  assert.equal(player.props.playsInline, true);
  player.props.onError();
  assert(h.states.includes('Example unavailable'));
  h.unmount();
  assert.equal(h.video.paused, true);
  assert.equal(h.video.removed, 'src');
});

test('Recap ignores example media and download errors after unmount', async () => {
  for (const fails of [false, true]) {
    let resolve, reject;
    const h = examplePlayer(() => new Promise((done, fail) => {resolve = done; reject = fail;}));
    h.unmount();
    const writes = h.writes;
    if (fails) reject(new Error('Offline')); else resolve({src: 'local:///late.mp4'});
    await tick();
    assert.equal(h.writes, writes);
  }
});

test('Recap shows download failures without affecting the rest of the panel', async () => {
  const h = examplePlayer(async () => {throw new Error('Offline');});
  await tick();
  assert(h.states.includes('Example unavailable'));
  h.unmount();
});
