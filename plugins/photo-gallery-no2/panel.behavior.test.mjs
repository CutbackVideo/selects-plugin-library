import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { planGallery } from './format.mjs';

const appRoot = process.env.SELECTS_DEV_REPO;
assert.ok(appRoot, 'Set SELECTS_DEV_REPO to an installed Selects development checkout');
const appRequire = createRequire(path.join(appRoot, 'package.json'));
const React = appRequire('react');
const { JSDOM } = appRequire('jsdom');
const esbuild = appRequire('esbuild');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
const { render, fireEvent, waitFor, cleanup } = appRequire('@testing-library/react');
test.afterEach(() => cleanup());

const template = fs.readFileSync(path.join(import.meta.dirname, 'panel.template.tsx'), 'utf8');
const nativeMock = `
const galleryNativeResources = (...args) => globalThis.__native.resources(...args);
const galleryNativeSetFps = (...args) => globalThis.__native.setFps(...args);
const galleryNativePlace = (...args) => globalThis.__native.place(...args);`;
const source = template.replace('/*__SHARED_SCRIPT_BUILDER__*/',
  'const buildScript = input => JSON.stringify(input);' + nativeMock);
assert.notEqual(source, template);
const compiled = esbuild.transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'automatic' }).code;
const compiledModule = new Module(path.join(appRoot, '__photo_gallery_panel_test__.cjs'));
compiledModule.filename = path.join(appRoot, '__photo_gallery_panel_test__.cjs');
compiledModule.paths = Module._nodeModulePaths(appRoot);
compiledModule._compile(compiled, compiledModule.filename);
const Panel = compiledModule.exports.default;

function kit() {
  const h = React.createElement;
  const field = (tag, props, children) => h('label', null, props.label,
    h(tag, { 'aria-label': props.label, value: props.value, disabled: props.disabled,
      type: props.type, min: props.min, max: props.max, onChange: props.onChange }, children));
  return {
    Stack: ({ children }) => h('div', null, children),
    Section: ({ title, children }) => h('section', null, h('h3', null, title), children),
    Actions: ({ children }) => h('div', null, children),
    Message: ({ children }) => h('p', null, children),
    Button: ({ children, onClick, disabled, busy }) => h('button', { onClick, disabled: disabled || busy }, children),
    Select: ({ label, value, onChange, options, disabled }) => field('select', { label, value: value ?? '', disabled,
      onChange: e => onChange(e.target.value) }, [h('option', { key: '__empty', value: '' }, ''), ...options.map(o => h('option', { key: o.value, value: o.value }, o.label))]),
    Slider: ({ label, value, onChange, disabled }) => field('input', { label, type: 'range', value, disabled, min: 0, max: 1,
      onChange: e => onChange(Number(e.target.value)) }),
    NumberField: ({ label, value, onChange, disabled }) => field('input', { label, type: 'number', value, disabled,
      onChange: e => onChange(Number(e.target.value)) }),
    TextField: ({ label, value, onChange, disabled }) => field('input', { label, type: 'text', value, disabled,
      onChange: e => onChange(e.target.value) }),
    Toggle: ({ label, value, onChange, disabled }) => h('label', null, label,
      h('input', { 'aria-label': label, type: 'checkbox', checked: value, disabled, onChange: e => onChange(e.target.checked) })),
  };
}

const photos = Array.from({ length: 21 }, (_, i) => ({ resourceId: `r${i}`, name: `Photo ${i + 1}`,
  kind: 'image', width: 1000, height: 1000, path: `/fixture/photo-${i + 1}.jpg` }));
function harness(media = photos, options = {}) {
  const calls = [], nativeCalls = [];
  globalThis.__native = {
    resources: async (_projectId, rows) => {
      nativeCalls.push('resources');
      if (options.missingDimension && rows.some(row => row.resourceId === 'r4')) throw new Error('Tile 5 has no verified image dimensions');
      return { selected: rows.map(row => ({ ...row, nativeResource: {} })) };
    },
    setFps: async () => { nativeCalls.push('fps'); },
    place: async (_projectId, _draftId, rows, plan) => {
      nativeCalls.push('place');
      assert.equal(rows.length, 21);
      assert.equal(plan.tiles.length, 21);
      if (options.placeError) throw new Error(options.placeError);
      options.onPlace?.();
    },
  };
  const sdk = {
    runShell: async request => {
      if (request.summary === 'Locate bundled Photo Grid Reveal music') return { exitCode: 0, stdout: '/installed/photo-gallery-no2/assets/music.mp3' };
      if (options.runShell) return options.runShell(request);
      throw new Error('Unexpected media conversion');
    },
    runScript: async request => {
      const input = JSON.parse(request.script);
      calls.push({ input, allowCommit: request.allowCommit });
      if (input.operation === options.failOperation) return { isError: true, output: options.failOutput };
      if (options.coldBudget && ((input.operation === 'placeVideosExisting' && input.slotKeys?.length !== 1) ||
          (input.operation === 'styleExisting' && !(input.slotKeys?.length <= 3)))) return { isError: true, output: 'Script deadline of 30s exceeded' };
      if (input.operation === 'inspect') return { result: { status: 'inspected', projectId: 'project-1', media, audio: options.audio ?? [] } };
      if (input.operation === 'importBundledMusic') return options.musicResponse ?? { result: { status: 'musicReady', music: { resourceId: 'bundled-music', path: input.path, durationFrames: 853, startFrame: 0 } } };
      if (input.operation === 'importConverted') return { result: { status: 'prepared', converted: input.converted.map(item =>
        ({ ...item, resourceId: 'held-1', width: 128, height: 96, durationFrames: 853 })) } };
      if (input.operation === 'preflight') return { result: { status: 'ready', plan: planGallery(input) } };
      if (input.operation === 'createBase') return { result: { status: 'baseCreated', draftId: 'draft-new' } };
      if (input.operation === 'fillBase') return { result: { status: 'baseFilled', draftId: 'draft-new' } };
      if (input.operation === 'placeVideosExisting') return { result: { status: 'videosPlaced', draftId: 'draft-new' } };
      if (input.operation === 'styleExisting') return { result: { status: 'styled', draftId: 'draft-new' } };
      if (input.operation === 'verifyCreated') return { result: { status: 'verified', draftId: 'draft-new', tileCount: 21 } };
      throw new Error(`Unexpected operation ${input.operation}`);
    },
  };
  const view = render(React.createElement(Panel, { sdk,
    context: { projectId: 'project-1', sequenceId: null, language: 'en' }, ui: kit() }));
  return { view, calls, nativeCalls, changeSequence: sequenceId => view.rerender(React.createElement(Panel, { sdk,
    context: { projectId: 'project-1', sequenceId, language: 'en' }, ui: kit() })) };
}
async function assignAndCreate(view) {
  fireEvent.click(view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  fireEvent.change(view.getByLabelText('Music'), { target: { value: 'none' } });
  fireEvent.click(view.getByRole('button', { name: 'Create Draft' }));
}

test('21 original photos follow one panel action through preflight, native placement, styling, and readback', async () => {
  const h = harness();
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  assert.match(h.view.container.textContent, /reference moves in these tiles.*4, 6, 11, 17, 19, 21/);
  assert.deepEqual(h.calls.map(call => call.input.operation),
    ['inspect', 'preflight', 'createBase', 'fillBase', ...Array(7).fill('styleExisting'), 'verifyCreated']);
  assert.deepEqual(h.nativeCalls, ['resources', 'resources', 'fps', 'place']);
  assert.equal(h.calls.find(call => call.input.operation === 'createBase').allowCommit, true);
  assert.deepEqual(h.calls.find(call => call.input.operation === 'styleExisting').input.media.map(item => item.path), photos.map(item => item.path));
});

test('a mixed photo/video gallery preserves its selected video slot', async () => {
  const media = [...photos.slice(0, 20), { resourceId: 'video-1', name: 'Moving tile', kind: 'video',
    width: 128, height: 96, durationFrames: 900, path: '/fixture/moving.mp4' }];
  const h = harness(media);
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  const placed = h.calls.find(call => call.input.operation === 'styleExisting').input.media;
  assert.equal(placed[20].kind, 'video');
  assert.equal(placed[20].path, '/fixture/moving.mp4');
  assert.ok(h.calls.some(call => call.input.operation === 'placeVideosExisting'));
  assert.equal(h.nativeCalls.filter(item => item === 'place').length, 1);
});

test('an exact 15-photo/6-video selection assigns motion to the observed reference slots', async () => {
  const stills = photos.slice(0, 15);
  const videos = Array.from({ length: 6 }, (_, i) => ({ resourceId: `video-${i + 1}`,
    name: `Video ${i + 1}`, kind: 'video', width: 128, height: 96,
    durationFrames: 900, path: `/fixture/video-${i + 1}.mp4` }));
  const h = harness([...stills, ...videos]);
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign reference mix' })));
  fireEvent.change(h.view.getByLabelText('Music'), { target: { value: 'none' } });
  fireEvent.click(h.view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  const assigned = h.calls.find(call => call.input.operation === 'styleExisting').input.media;
  assert.deepEqual(assigned.flatMap((item, index) => item.kind === 'video' ? [index + 1] : []),
    [4, 6, 11, 17, 19, 21]);
  assert.deepEqual(assigned.filter(item => item.kind === 'video').map(item => item.resourceId),
    videos.map(item => item.resourceId));
});

test('a short video is extended before any Draft is created', async () => {
  const media = [...photos.slice(0, 20), { resourceId: 'short-1', name: 'Short tile', kind: 'video',
    width: 128, height: 96, durationFrames: 60, path: '/fixture/short.mp4' }];
  let conversions = 0;
  const h = harness(media, { runShell: async request => {
    conversions++;
    assert.match(request.command, /hold_video\.py/);
    return { exitCode: 0, stdout: JSON.stringify({ status: 'converted', fps: 60, durationFrames: 853,
      videos: [{ inputIndex: 0, sourcePath: '/fixture/short.mp4', outputPath: '/cache/held-short.mp4' }] }) };
  } });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  assert.equal(conversions, 1);
  assert.deepEqual(h.calls.slice(0, 3).map(call => call.input.operation), ['inspect', 'importConverted', 'preflight']);
  assert.equal(h.calls.find(call => call.input.operation === 'styleExisting').input.media[20].resourceId, 'held-1');
});

test('missing native dimensions prevent a Draft and do not lock the panel', async () => {
  const h = harness(photos, { missingDimension: true });
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Tile 5 has no verified image dimensions/));
  assert.deepEqual(h.calls.map(call => call.input.operation), ['inspect']);
  assert.deepEqual(h.nativeCalls, ['resources']);
});

test('an ambiguous save after native placement blocks blind duplicate creation', async () => {
  const h = harness(photos, { placeError: 'Source range exceeded' });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Save outcome is unknown/));
  assert.equal(h.view.getByRole('button', { name: 'Create Draft' }).disabled, true);
  assert.ok(h.calls.some(call => call.input.operation === 'fillBase'));
  assert.ok(!h.calls.some(call => call.input.operation === 'styleExisting'));
});

test('a failed video step exposes the host error and saved target without another Create', async () => {
  const media = [...photos.slice(0, 20), { resourceId: 'v1', name: 'Video',
    kind: 'video', width: 1000, height: 1000, path: '/video.mp4', durationFrames: 900 }];
  const h = harness(media, { failOperation: 'placeVideosExisting', failOutput: 'script_timeout: Deadline exceeded before commit' });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Deadline exceeded before commit/));
  assert.match(h.view.container.textContent, /Place Gallery video tiles/);
  assert.match(h.view.container.textContent, /draft-new/);
  assert.equal(h.view.getByRole('button', { name: 'Create Draft' }).disabled, true);
  assert.equal(h.calls.filter(call => call.input.operation === 'createBase').length, 1);
  assert.ok(!h.calls.some(call => call.input.operation === 'styleExisting'));
});

test('a cold 21-video gallery stays within per-call video and style budgets', async () => {
  const media = photos.map((p, i) => ({ ...p, resourceId: 'v' + i, kind: 'video', path: '/video-' + i + '.mp4', durationFrames: 900 }));
  const h = harness(media, { coldBudget: true });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  const videoCalls = h.calls.filter(c => c.input.operation === 'placeVideosExisting');
  const styleCalls = h.calls.filter(c => c.input.operation === 'styleExisting');
  assert.equal(videoCalls.length, 21);
  assert.equal(styleCalls.length, 7);
  assert.deepEqual(videoCalls.flatMap(c => c.input.slotKeys), styleCalls.flatMap(c => c.input.slotKeys));
  assert.equal(new Set(videoCalls.flatMap(c => c.input.slotKeys)).size, 21);
  assert.ok(styleCalls.slice(0, -1).every(c => c.input.placeMusic === false));
  assert.equal(styleCalls.at(-1).input.placeMusic, true);
  assert.equal(h.calls.filter(c => c.input.operation === 'createBase').length, 1);
});

test('opening the newly created Draft preserves panel inputs and its saved target', async () => {
  let h;
  h = harness(photos, { onPlace: () => h.changeSequence('draft-new') });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  assert.equal(h.view.getByLabelText('Photo or video').value, 'r0');
  assert.ok(h.view.getByRole('button', { name: 'Open saved Draft' }));
});

test('one Create action uses bundled B2 by default with reference timing and credit', async () => {
  const h = harness();
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  assert.equal(h.view.getByLabelText('Music').value, 'bundled');
  assert.match(h.view.container.textContent, /TAD MILLER.*CC BY 4.0/);
  fireEvent.click(h.view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  const styled = h.calls.find(c => c.input.operation === 'styleExisting').input;
  assert.equal(styled.music.resourceId, 'bundled-music');
  assert.equal(styled.manualBpm, 113);
  assert.equal(h.calls.filter(c => c.input.operation === 'importBundledMusic').length, 1);
});
test('custom Project music uses its exact resource without importing B2', async () => {
  const audio = [{ resourceId: 'custom', name: 'Custom', path: '/custom.mp3', durationFrames: 900 }];
  const h = harness(photos, { audio });
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  fireEvent.change(h.view.getByLabelText('Music'), { target: { value: 'custom' } });
  fireEvent.click(h.view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  assert.equal(h.calls.find(c => c.input.operation === 'styleExisting').input.music.path, '/custom.mp3');
  assert.ok(!h.calls.some(c => c.input.operation === 'importBundledMusic'));
});
test('unknown music import outcome blocks another Create and no Draft starts', async () => {
  const h = harness(photos, { musicResponse: { result: { status: 'outcomeUnknown', message: 'Music import response lost' } } });
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  fireEvent.click(h.view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Save outcome is unknown/));
  assert.equal(h.view.getByRole('button', { name: 'Create Draft' }).disabled, true);
  assert.ok(!h.calls.some(c => c.input.operation === 'createBase'));
});
