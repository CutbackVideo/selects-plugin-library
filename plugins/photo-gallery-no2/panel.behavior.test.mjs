import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';

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

const template = fs.readFileSync(path.join(import.meta.dirname, 'panel.template.tsx'), 'utf8');
const source = template.replace('/*__SHARED_SCRIPT_BUILDER__*/', 'const buildScript = input => JSON.stringify(input);');
assert.notEqual(source, template, 'panel builder marker must be present');
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
    Segmented: ({ label, value, onChange, options, disabled }) => field('select', { label, value, disabled,
      onChange: e => onChange(e.target.value) }, options.map(o => h('option', { key: o.value, value: o.value }, o.label))),
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

const media = Array.from({ length: 22 }, (_, i) => ({ resourceId: `r${i + 1}`, name: `Photo ${i + 1}`,
  kind: 'image', width: 1000, height: 1000, path: `/fixture/photo-${i + 1}.jpg` }));
const existing = { draftId: 'draft-existing', instanceId: 'instance-1', durationFrames: 853, bpm: 113, timingEditable: true,
  media: media.slice(0, 21).map((item, i) => ({ ...item, slotKey: `tile-${String(i + 1).padStart(2, '0')}`, focusX: 0.5, focusY: 0.5 })) };

test('21-slot create uses one shared script and does not save on load', async () => {
  const calls = [];
  const sdk = { runShell: () => { throw new Error('manual BPM must not invoke tempo estimator'); },
    runScript: async request => { calls.push(request); const input = JSON.parse(request.script);
      if (input.operation === 'inspect') return { result: { status: 'inspected', projectId: 'project-1', media: media.slice(0, 21), audio: [] } };
      if (input.operation === 'create') return { result: { status: 'saved', draftId: 'created-1', instanceId: 'instance-1' } };
      throw new Error(`Unexpected ${input.operation}`);
    } };
  const view = render(React.createElement(Panel, { sdk, context: { projectId: 'project-1', sequenceId: null, language: 'ko' }, ui: kit() }));
  fireEvent.click(view.getByRole('button', { name: '\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30' }));
  await waitFor(() => assert.equal(calls.length, 1));
  assert.equal(calls[0].allowCommit, false);
  await waitFor(() => assert.ok(view.getByRole('button', { name: '21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815' })));
  fireEvent.click(view.getByRole('button', { name: '21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815' }));
  fireEvent.click(view.getByLabelText('BPM \uc9c1\uc811 \uc9c0\uc815'));
  fireEvent.click(view.getByRole('button', { name: '\uc0c8 \ud3b8\uc9d1\ubcf8 \ub9cc\ub4e4\uae30' }));
  await waitFor(() => assert.ok(calls.some(call => JSON.parse(call.script).operation === 'create')));
  const mutation = calls.find(call => JSON.parse(call.script).operation === 'create');
  const request = JSON.parse(mutation.script);
  assert.equal(mutation.allowCommit, true);
  assert.equal(request.media.length, 21);
  assert.deepEqual(request.media.map(item => item.resourceId), media.slice(0, 21).map(item => item.resourceId));
  assert.equal(request.manualBpm, 113);
  assert.equal(request.music, null);
  view.unmount(); cleanup();
});

test('update targets only the selected verified tile', async () => {
  const calls = [];
  const sdk = { runShell: () => { throw new Error('not used'); },
    runScript: async request => { calls.push(request); const input = JSON.parse(request.script);
      if (input.operation === 'inspect') return { result: { status: 'inspected', projectId: 'project-1', media, audio: [], existing } };
      if (input.operation === 'update') return { result: { status: 'saved', draftId: 'draft-existing', instanceId: 'instance-1' } };
      throw new Error(`Unexpected ${input.operation}`);
    } };
  const view = render(React.createElement(Panel, { sdk, context: { projectId: 'project-1', sequenceId: 'draft-existing', language: 'ko' }, ui: kit() }));
  fireEvent.change(view.getByLabelText('\uc791\uc5c5'), { target: { value: 'update' } });
  fireEvent.click(view.getByRole('button', { name: '\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30' }));
  await waitFor(() => assert.ok(view.getByRole('button', { name: '\uc774 \uce78 \ubcc0\uacbd \uc800\uc7a5' })));
  fireEvent.change(view.getByLabelText('\uce78'), { target: { value: '6' } });
  fireEvent.change(view.getByLabelText('\uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1'), { target: { value: 'r22' } });
  fireEvent.click(view.getByRole('button', { name: '\uc774 \uce78 \ubcc0\uacbd \uc800\uc7a5' }));
  await waitFor(() => assert.ok(calls.some(call => JSON.parse(call.script).operation === 'update')));
  const mutation = calls.find(call => JSON.parse(call.script).operation === 'update');
  assert.equal(mutation.allowCommit, true);
  assert.deepEqual(JSON.parse(mutation.script), { operation: 'update', projectId: 'project-1', draftId: 'draft-existing',
    instanceId: 'instance-1', slotKey: 'tile-07', resourceId: 'r22' });
  await waitFor(() => assert.ok(view.container.textContent.includes('\uc694\uccad\ud55c \uce78')));
  view.unmount(); cleanup();
});

test('uncertain automatic BPM blocks creation without an unknown-save lock', async () => {
  const calls = [];
  let shellCalls = 0;
  const sdk = { runShell: async () => { shellCalls++; return { exitCode: 0, stdout: JSON.stringify({ status: 'uncertain', reason: 'Tempo is ambiguous' }) }; },
    runScript: async request => { calls.push(request); const input = JSON.parse(request.script);
      if (input.operation === 'inspect') return { result: { status: 'inspected', projectId: 'project-1', media: media.slice(0, 21),
        audio: [{ resourceId: 'song-1', name: 'Song', path: '/fixture/song.mp3', durationFrames: 900 }] } };
      throw new Error('A mutating script must not run with uncertain BPM');
    } };
  const view = render(React.createElement(Panel, { sdk, context: { projectId: 'project-1', sequenceId: null, language: 'ko' }, ui: kit() }));
  fireEvent.click(view.getByRole('button', { name: '\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30' }));
  await waitFor(() => assert.ok(view.getByRole('button', { name: '21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815' })));
  fireEvent.click(view.getByRole('button', { name: '21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815' }));
  fireEvent.change(view.getByLabelText('\uc74c\uc545'), { target: { value: 'song-1' } });
  fireEvent.click(view.getByRole('button', { name: '\uc0c8 \ud3b8\uc9d1\ubcf8 \ub9cc\ub4e4\uae30' }));
  await waitFor(() => assert.equal(shellCalls, 1));
  assert.deepEqual(calls.map(call => JSON.parse(call.script).operation), ['inspect']);
  assert.ok(view.getByRole('button', { name: '\uc0c8 \ud3b8\uc9d1\ubcf8 \ub9cc\ub4e4\uae30' }).disabled === false);
  view.unmount(); cleanup();
});
