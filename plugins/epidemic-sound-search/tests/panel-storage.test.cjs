const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const plugins = path.resolve(__dirname, '../..');
const files = ['a16z-style-captions/src/Panel.tsx', 'podcast-hook-captions/src/Panel.tsx', 'epidemic-sound-search/panel.tsx', 'tetris/panel.tsx', 'recap-2026/panel.tsx'];
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; }
function hooks() {
  let index = 0;
  const states = [], effects = [], pending = [];
  const React = {
    useState(initial) { const slot = index++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
    useRef(initial) { const slot = index++; if (!(slot in states)) states[slot] = {current: initial}; return states[slot]; },
    useEffect(effect, dependencies) {
      const slot = index++, previous = effects[slot];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        pending.push(() => { previous?.cleanup?.(); effects[slot] = {dependencies, cleanup: effect()}; });
      }
    },
    createElement(type, props, ...children) { return {type, props, children}; },
  };
  return {React, render(Component, props) { index = 0; const tree = Component(props); pending.splice(0).forEach(effect => effect()); return tree; }, unmount() { effects.forEach(effect => effect?.cleanup?.()); }};
}
function load(file, React = {}) {
  const source = fs.readFileSync(path.join(plugins, file), 'utf8');
  const block = source.slice(source.indexOf('// panel-storage:start'), source.indexOf('// panel-storage:end'));
  const context = vm.createContext({React, console});
  Object.defineProperty(context, 'localStorage', {get() { throw Error('Browser storage must never be accessed'); }});
  context.window = {};
  Object.defineProperty(context.window, 'localStorage', {get() { throw Error('Browser storage must never be accessed'); }});
  vm.runInContext(block + '\nthis.api = {panelStorage, withStoredPanel};', context);
  return {...context.api, context, source};
}
function memory() {
  const data = new Map();
  return {data, storage: {getItem: async key => data.get(key) ?? null, setItem: async (key, value) => {data.set(key, value);}, removeItem: async key => {data.delete(key);}}};
}
for (const file of files) {
  test(file + ': storage runs with throwing browser getter and ordered remount writes', async () => {
    const api = load(file), {storage, data} = memory(), held = deferred(), calls = [];
    storage.setItem = async (key, value) => { calls.push(value); if (value === 'first') await held.promise; data.set(key, value); };
    const sdk = {storage};
    const first = api.panelStorage(sdk).setItem('settings', 'first');
    const final = api.panelStorage(sdk).setItem('settings', 'final');
    await tick(); assert.deepEqual(calls, ['first']);
    held.resolve(); await Promise.all([first, final]);
    assert.equal(await api.panelStorage(sdk).getItem('settings'), 'final');
    assert.equal(data.get('settings'), 'final');
    assert.throws(() => api.panelStorage({}), /Update Selects.*sdk.storage/);
  });
  test(file + ': rejected saves stay observable and do not poison final write', async () => {
    const api = load(file), {storage, data} = memory();
    storage.setItem = async (key, value) => { if (value === 'bad') throw Error('storage quota exceeded'); data.set(key, value); };
    const client = api.panelStorage({storage});
    const bad = client.setItem('x', 'bad'), last = client.setItem('x', 'last');
    await assert.rejects(bad, /quota/); await last;
    assert.equal(data.get('x'), 'last');
  });
  test(file + ': restore gates actions/autosave and stale SDK reads cannot replace current state', async () => {
    const runner = hooks(), api = load(file, runner.React), old = deferred(), fresh = deferred();
    const Component = () => null;
    const Wrapped = api.withStoredPanel(Component, storage => storage.getItem('x'));
    const sdkA = {storage: {...memory().storage, getItem: () => old.promise}};
    const sdkB = {storage: {...memory().storage, getItem: () => fresh.promise}};
    assert.equal(runner.render(Wrapped, {sdk: sdkA}).props.role, 'status');
    await tick();
    assert.equal(runner.render(Wrapped, {sdk: sdkB}).props.role, 'status');
    await tick(); fresh.resolve('new project'); await tick();
    assert.equal(runner.render(Wrapped, {sdk: sdkB}).props.saved, 'new project');
    old.resolve('stale project'); await tick();
    const mounted = runner.render(Wrapped, {sdk: sdkB});
    assert.equal(mounted.type, Component); assert.equal(mounted.props.saved, 'new project');
    runner.unmount();
  });
  test(file + ': failed restore shows a retryable error without mounting defaults', async () => {
    const runner = hooks(), api = load(file, runner.React), {storage} = memory();
    storage.getItem = async () => {throw Error('disk unavailable');};
    const Wrapped = api.withStoredPanel(() => null, client => client.getItem('x')), props = {sdk: {storage}};
    runner.render(Wrapped, props); await tick();
    const failure = runner.render(Wrapped, props);
    assert.equal(failure.props.role, 'alert'); assert.match(failure.children[0], /disk unavailable/);
    assert.equal(failure.children[1].type, 'button');
  });
}
test('epidemic migrates v3 without project receipts and bounds disposable cover-art bytes', async () => {
  const {context, source, panelStorage} = load('epidemic-sound-search/panel.tsx');
  const start = source.indexOf('const loadState ='), end = source.indexOf('// A local file URL', start);
  vm.runInContext('const STATE_KEY="epidemic-sound-search.v4", OLD_STATE_KEY="epidemic-sound-search.v3";\n' + source.slice(start, end) + '\nthis.extra={loadState,savedThumbnails};', context);
  const {storage, data} = memory(); data.set('epidemic-sound-search.v3', JSON.stringify({queue:[{slug:'song'}],added:{oldProject:'resource'},log:['old']}));
  const saved = await context.extra.loadState(panelStorage({storage}));
  assert.equal(saved.queue[0].slug, 'song'); assert.equal(saved.added, undefined); assert.equal(saved.log, undefined);
  const images = Object.fromEntries(Array.from({length:60}, (_, i) => ['cover-'+i, 'data:image/jpeg;base64,'+'x'.repeat(399999)]));
  const limited = context.extra.savedThumbnails(images);
  assert(Object.keys(limited).length > 0);
  assert(JSON.stringify(limited).length < 512 * 1024 + 100);
});

const modules = process.env.AI_PANEL_TEST_MODULES;
function loadComponent(file, name, runner, globals) {
  const esbuild = require(path.join(modules, 'esbuild'));
  let source = fs.readFileSync(path.join(plugins, file), 'utf8');
  source = source.replace(/^import[^\n]+\n/gm, '').replace(/export default[\s\S]*$/, '');
  const plain = esbuild.transformSync(source, {loader: 'tsx'}).code;
  const context = vm.createContext({React: runner.React, ...runner.React, setInterval, clearInterval, console, ...globals});
  Object.defineProperty(context, 'localStorage', {get() { throw Error('No browser storage'); }});
  vm.runInContext(plain + '\nthis.Component=' + name + ';', context);
  return context.Component;
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...(tree.children || []).flat(Infinity).flatMap(nodes)]; }
function text(tree) { return !tree || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : (tree.children || []).flat(Infinity).map(text).join(''); }
function button(tree, label) { return nodes(tree).find(node => node.type === 'button' && text(node).includes(label)); }

test('a16z prevents generation when settings persistence fails', {skip: !modules}, async () => {
  const runner = hooks(); let calls = 0;
  const Component = loadComponent('a16z-style-captions/src/Panel.tsx', 'A16zShort', runner, {
    STEPS: [], hostUseSdk() {}, loadJob: async () => null, makeShort: async () => { calls++; },
  });
  const {storage} = memory(); storage.setItem = async () => {throw Error('disk full');};
  const props = {sdk: {storage}, context: {projectId: 'project', sequenceId: 'draft'}, saved: {name: 'Restored speaker'}};
  let tree = runner.render(Component, props);
  assert.equal(nodes(tree).find(node => node.type === 'input').props.value, 'Restored speaker');
  await button(tree, 'Make the Short').props.onClick();
  tree = runner.render(Component, props);
  assert.equal(calls, 0); assert.match(text(tree), /disk full/); runner.unmount();
});

test('podcast late Draft restore cannot replace the current Draft result', {skip: !modules}, async () => {
  const runner = hooks(), held = deferred();
  const Component = loadComponent('podcast-hook-captions/src/Panel.tsx', 'PodcastHookReel', runner, {
    STEPS: [], hostUseSdk() {}, loadJob: async () => null, FaceStage: () => null, app: () => ({}),
  });
  const {storage, data} = memory();
  data.set('podcast-hook-captions:v2:B', JSON.stringify({name:'Current B', reelId:'B', seconds:1}));
  const read = storage.getItem; storage.getItem = key => key.endsWith(':A') ? held.promise : read(key);
  const props = {sdk: {storage}, context: {projectId:'project', sequenceId:'A'}, saved: {}};
  runner.render(Component, props); await tick();
  const current = {...props, context: {...props.context, sequenceId:'B'}};
  assert.equal(button(runner.render(Component, current), 'Make reel').props.disabled, true);
  held.resolve(JSON.stringify({name:'Stale A', reelId:'A', seconds:1})); await tick(); await tick();
  const tree = runner.render(Component, current);
  assert.match(text(tree), /Current B/); assert.doesNotMatch(text(tree), /Stale A/); runner.unmount();
});

test('podcast retains the completed reel when its result receipt cannot be saved', {skip: !modules}, async () => {
  const runner = hooks(), host = {}; let builds = 0;
  const Component = loadComponent('podcast-hook-captions/src/Panel.tsx', 'PodcastHookReel', runner, {
    STEPS: [], hostUseSdk() {}, loadJob: async () => null, FaceStage: () => null, app: () => host,
    makeReel: async () => { builds++; return {name:'Completed reel', reelId:'new-reel', seconds:3}; },
  });
  const {storage} = memory(); storage.setItem = async key => {if(key.endsWith(':draft')) throw Error('receipt write failed');};
  const props = {sdk: {storage}, context: {projectId:'project', sequenceId:'draft'}, saved:{}};
  runner.render(Component, props); await tick();
  let tree = runner.render(Component, props); await button(tree, 'Make reel').props.onClick();
  tree = runner.render(Component, props);
  assert.equal(builds, 1); assert.match(text(tree), /Completed reel/); assert.match(text(tree), /receipt write failed/);
  assert(button(tree, 'Open the reel')); runner.unmount();
});

test('recap discards a late Project read and saves selections before creating a Draft', {skip: !modules}, async () => {
  const runner = hooks(), api = load('recap-2026/panel.tsx', runner.React), held = deferred();
  const esbuild = require(path.join(modules, 'esbuild'));
  const componentSource = api.source.slice(api.source.indexOf('function RecapPanel('), api.source.indexOf('// av-host:start'));
  let builds = 0;
  Object.assign(api.context, {
    SLUG: 'recap-2026', WORDS: {en: new Proxy({}, {get: (_, key) => key})}, gallerySize: 8,
    core: config => JSON.stringify(config), RESOURCE_SECONDS: '', scriptResult: value => value, thumbnailKey: video => video.resourceId,
    readMediaPages: async (_sdk, request) => [{resourceId: request.script.includes('"B"') ? 'clip-B' : 'clip-A', name: 'clip', folderName:'footage', durationSeconds:10}],
    withDurations: async value => value,
    buildSlots: (videos, intro) => videos.length ? [intro, ...Array.from({length:159}, () => ({resourceId:videos[0].resourceId, startSeconds:0}))] : [],
    FinishedExample: () => null, SourceWindowPicker: () => null,
    buildRecap: async () => {builds++; return {name:'recap', mainCount:160};},
    hostMessage: error => error.message,
  });
  vm.runInContext(esbuild.transformSync(componentSource, {loader:'tsx'}).code + '\nthis.Component=RecapPanel;', api.context);
  const {storage, data} = memory(), writes = [];
  const read = storage.getItem;
  storage.getItem = key => key === 'recap-2026:A:folders' ? held.promise : read(key);
  storage.setItem = async (key, value) => {writes.push(key); data.set(key, value);};
  const sdk = {storage, runScript: async () => [{name:'footage',count:1}]};
  const ui = new Proxy({}, {get: (_, key) => key});
  const a = {sdk, ui, context: {projectId:'A',language:'en'}};
  runner.render(api.context.Component, a); await tick();
  assert.deepEqual(writes, []);
  const b = {...a, context: {projectId:'B',language:'en'}};
  runner.render(api.context.Component, b); held.resolve('["footage"]');
  let tree;
  for (let i = 0; i < 6; i++) {await tick(); tree = runner.render(api.context.Component, b);}
  assert(writes.length > 0); assert(writes.every(key => key.startsWith('recap-2026:B:')));
  assert(!JSON.stringify(tree).includes('clip-A'));
  const make = nodes(tree).find(node => node.type === 'Button' && text(node) === 'full');
  assert.equal(make.props.disabled, false);
  storage.setItem = async () => {throw Error('selection save rejected');};
  await make.props.onClick(); tree = runner.render(api.context.Component, b);
  assert.equal(builds, 0); assert.match(text(tree), /selection save rejected/);
  runner.unmount();
});
