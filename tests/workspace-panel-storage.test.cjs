'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modulesRoot = process.env.AI_PANEL_TEST_MODULES;
const options = {skip: !modulesRoot && 'Set AI_PANEL_TEST_MODULES to existing Selects node_modules'};
const root = path.resolve(__dirname, '..');
const defer = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; };

for (const plugin of ['card-news-maker', 'shortform-cloner']) {
  test(`${plugin}: host storage serializes dictionary edits and preserves data after rejection`, options, async () => {
    const dependency = createRequire(path.join(path.resolve(modulesRoot), '..', 'package.json'));
    const source = fs.readFileSync(path.join(root, 'plugins', plugin, 'panel.tsx'), 'utf8');
    const start = source.indexOf('const metadataWrites =');
    const end = source.indexOf('\nfunction ', source.indexOf('function makeStore()', start) + 1);
    const body = source.slice(start, end).split('\nasync function ')[0];
    const compiled = dependency('esbuild').transformSync(body, {loader: 'ts', target: 'es2022'}).code;
    const records = new Map([[`${plugin}:jobs`, JSON.stringify({legacy: {id: 'legacy', version: 3}})]]);
    const firstWrite = defer();
    let writes = 0;
    let fail = false;
    const sdk = {storage: {
      getItem: async key => records.get(key) ?? null,
      setItem: async (key, value) => {
        writes++;
        if (writes === 1) await firstWrite.promise;
        if (fail) throw Error('Host quota exceeded');
        records.set(key, value);
      },
    }};
    const factory = new Function('hostFs', 'hostSdk', 'APP_ID', 'IS_WIN', 'localStorage', `${compiled};return makeStore;`)(
      () => null, sdk, plugin, false,
      new Proxy({}, {get() { throw Error('Iframe localStorage denied'); }}),
    );
    const store = factory();
    const first = store.put('jobs', 'one', {id: 'one'});
    await new Promise(resolve => setImmediate(resolve));
    const reopened = factory();
    let listed = false;
    const listing = reopened.list('jobs').then(rows => { listed = true; return rows; });
    const second = reopened.put('jobs', 'two', {id: 'two'});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(writes, 1, 'Another store must await the first read-modify-write');
    assert.equal(listed, false, 'A reopened store must wait for its predecessor write');
    firstWrite.resolve();
    await Promise.all([first, second, listing]);
    assert.deepEqual((await store.list('jobs')).map(row => row.id).sort(), ['legacy', 'one', 'two']);
    fail = true;
    await assert.rejects(store.put('jobs', 'failed', {id: 'failed'}), /quota/);
    fail = false;
    await store.put('jobs', 'retry', {id: 'retry'});
    assert.deepEqual((await store.list('jobs')).map(row => row.id).sort(), ['legacy', 'one', 'retry', 'two']);
    await store.del('jobs', 'one');
    assert.equal((await store.list('jobs')).some(row => row.id === 'one'), false);
    delete sdk.storage;
    await assert.rejects(store.put('jobs', 'missing', {}), /Update Selects/);
  });
}

test('depth captions: restoration blocks default state and ignores a detached Draft response', options, async () => {
  const dependency = createRequire(path.join(path.resolve(modulesRoot), '..', 'package.json'));
  const React = dependency('react');
  const {createRoot} = dependency('react-dom/client');
  const {JSDOM} = dependency('jsdom');
  const act = React.act ?? dependency('react-dom/test-utils').act;
  const dom = new JSDOM('<div id="root"></div>');
  const previous = new Map();
  for (const [name, value] of Object.entries({window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true})) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {value, configurable: true, writable: true});
  }
  Object.defineProperty(dom.window, 'localStorage', {get() { throw Error('Iframe storage denied'); }});
  const source = fs.readFileSync(path.join(root, 'plugins/depth-type-captions/panel.tsx'), 'utf8');
  const loader = source.slice(source.indexOf('function DepthEditor({'), source.indexOf('function DepthEditorReady('));
  const pendingA = defer();
  const writes = [];
  const storage = {
    getItem: async key => key.endsWith(':A') ? pendingA.promise : JSON.stringify({settings: {size: 44}, owned: {clipId: 'B-caption'}}),
    setItem: async (...args) => { writes.push(args); },
  };
  const Editor = new Function('h', 'useState', 'useEffect', 'depthStorage', 'depthWrites', 'DEPTH_TAG', 'DepthEditorReady', `${loader}; return DepthEditor;`)(
    React.createElement, React.useState, React.useEffect, () => storage, new Map(), 'depth-type-captions-v1',
    props => React.createElement('span', null, props.saved.owned.clipId),
  );
  const rendered = createRoot(dom.window.document.getElementById('root'));
  try {
    await act(async () => rendered.render(React.createElement(Editor, {key: 'A', context: {projectId: 'P', sequenceId: 'A'}})));
    assert.match(dom.window.document.body.textContent, /Restoring/);
    assert.equal(writes.length, 0, 'The loading boundary must not save defaults');
    await act(async () => rendered.render(React.createElement(Editor, {key: 'B', context: {projectId: 'P', sequenceId: 'B'}})));
    assert.match(dom.window.document.body.textContent, /B-caption/);
    await act(async () => { pendingA.resolve(JSON.stringify({owned: {clipId: 'A-caption'}})); });
    assert.match(dom.window.document.body.textContent, /B-caption/);
  } finally {
    await act(async () => rendered.unmount());
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

for (const plugin of ['card-news-maker', 'shortform-cloner']) {
  test(`${plugin}: reopened file store waits for the prior metadata write`, options, async () => {
    const dependency = createRequire(path.join(path.resolve(modulesRoot), '..', 'package.json'));
    const source = fs.readFileSync(path.join(root, 'plugins', plugin, 'panel.tsx'), 'utf8');
    const start = source.indexOf('const metadataWrites =');
    const end = source.indexOf('\nfunction ', source.indexOf('function makeStore()', start) + 1);
    const body = source.slice(start, end).split('\nasync function ')[0];
    const compiled = dependency('esbuild').transformSync(body, {loader: 'ts', target: 'es2022'}).code;
    const pendingWrite = defer();
    const records = new Map();
    const files = {
      join: path.posix.join, homedir: () => '/fixture', exists: async () => true,
      mkdir: async () => {}, readdir: async () => [...records.keys()].map(file => path.posix.basename(file)),
      readFile: async file => records.get(file),
      writeFile: async (file, contents) => { await pendingWrite.promise; records.set(file, contents); },
      rm: async file => { records.delete(file); },
    };
    const factory = new Function('hostFs', 'hostSdk', 'APP_ID', 'enc', 'dec', `${compiled};return makeStore;`)(
      () => files, {files}, plugin, value => value, value => value,
    );
    const first = factory().put('jobs', 'one', {id: 'one'});
    await new Promise(resolve => setImmediate(resolve));
    let listed = false;
    const listing = factory().list('jobs').then(rows => { listed = true; return rows; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(listed, false);
    pendingWrite.resolve();
    await first;
    assert.deepEqual(await listing, [{id: 'one'}]);
  });
}

async function depthModule(sdk, React = {}) {
  const {loadPanelModule} = await import('./panel_module_fixture.mjs');
  const source = fs.readFileSync(path.join(root, 'plugins/depth-type-captions/panel.tsx'), 'utf8');
  const api = loadPanelModule(source, {React, names: [
    'createPanelLocalClient', 'panelLocalClients', 'hostUseSdk',
    'DepthTemplateRun', 'depthMakeCaptions', 'DEPTH_DEFAULTS',
  ]});
  const local = await api.createPanelLocalClient(sdk);
  api.panelLocalClients.set(sdk, {...sdk, ...local});
  api.hostUseSdk(sdk);
  return api;
}

test('depth template: cancellation during a pending checkpoint prevents Draft creation', async () => {
  const checkpoint = defer(), checkpointStarted = defer(), effects = [];
  let commits = 0;
  const sdk = {
    storage: {getItem: async () => null, setItem: async (_key, value) => {
      if (JSON.parse(value).status === 'pending') { checkpointStarted.resolve(); await checkpoint.promise; }
    }},
    runScript: async input => {
      if (input.script.includes('selects.files.environment(')) return {result: {platform:'darwin',homedir:'/qa',version:'2.0.671'}};
      if (input.allowCommit) commits++;
      throw Error('Cancellation must prevent the Draft boundary');
    },
    finishTemplate: () => assert.fail('A detached run cannot finish'),
  };
  const api = await depthModule(sdk, {
    useRef: value => ({current: value}), useState: value => [value, () => {}],
    useEffect: effect => effects.push(effect), createElement: () => null,
  });
  api.DepthTemplateRun({sdk, context: {projectId: 'P', template: {runId: 'R', libraryId: 'L', inputs: {speaker: [{kind: 'video', resourceId: 'V', name: 'Video'}]}}}});
  const cleanups = effects.map(effect => effect()).filter(value => typeof value === 'function');
  await checkpointStarted.promise;
  cleanups.forEach(cleanup => cleanup());
  checkpoint.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(commits, 0, 'A released persistence checkpoint cannot resurrect a canceled template');
});

test('depth captions: cancellation during cutaway restoration prevents applying captions', async () => {
  const cutawayRead = defer(), cutawayStarted = defer();
  let reads = 0, commits = 0;
  const control = {canceled: false};
  const sdk = {
    storage: {getItem: async key => {
      if (key.includes(':broll:') && ++reads === 2) { cutawayStarted.resolve(); return cutawayRead.promise; }
      return null;
    }, setItem: async () => {}},
    runScript: async input => {
      if (input.script.includes('selects.files.environment(')) return {result: {platform:'darwin',homedir:'/qa',version:'2.0.671'}};
      if (input.allowCommit) commits++;
      return {result: {fps:30,width:1080,height:1920,duration:2,words:['This','is','one','complete','spoken','sentence'].map((text,i)=>({text,s:i*10,e:(i+1)*10}))}};
    },
  };
  const api = await depthModule(sdk);
  const operation = api.depthMakeCaptions({sdk, pid:'P', sid:'D', settings:{...api.DEPTH_DEFAULTS,depth:false}, control, progress:()=>{}});
  await cutawayStarted.promise;
  control.canceled = true;
  cutawayRead.resolve(null);
  await assert.rejects(operation, /Canceled/);
  assert.equal(commits, 0);
});
