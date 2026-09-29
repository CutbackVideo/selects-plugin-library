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

test('auto-assign keeps the 21 original photos selectable after their converted videos are imported', async () => {
  const photos = media.slice(0, 21);
  const converted = photos.map((item, i) => ({ ...item, kind: 'video', resourceId: `v${i + 1}`,
    name: `converted-${i + 1}.mp4`, path: `/cache/converted-${i + 1}.mp4`, durationFrames: 853 }));
  const sdk = { runScript: async request => {
    assert.equal(JSON.parse(request.script).operation, 'inspect');
    return { result: { status: 'inspected', projectId: 'project-1', media: [...photos, ...converted], audio: [] } };
  } };
  const view = render(React.createElement(Panel, { sdk,
    context: { projectId: 'project-1', sequenceId: null, language: 'en' }, ui: kit() }));
  fireEvent.click(view.getByRole('button', { name: 'Load project media' }));
  const assign = await waitFor(() => view.getByRole('button', { name: 'Assign all 21 in listed order' }));
  fireEvent.click(assign);
  assert.ok(view.container.textContent.includes('Assigned tiles: 21/21'));
  assert.equal(view.getByLabelText('Photo or video').value, photos[0].resourceId);
  view.unmount(); cleanup();
});

test('saving a new Draft remains a success when Selects opens that Draft during readback', async () => {
  let view;
  const sdk = { runShell: async () => ({ exitCode: 0, stdout: JSON.stringify({ status: 'converted', fps: 60,
      durationFrames: 853, images: media.slice(0, 21).map((item, i) => ({ inputIndex: i,
        sourcePath: item.path, outputPath: `/cache/still-${i + 1}.mp4` })) }) }),
    runScript: async request => { const input = JSON.parse(request.script);
      if (input.operation === 'inspect') return { result: { status: 'inspected', projectId: 'project-1', media: media.slice(0, 21), audio: [] } };
      if (input.operation === 'importConverted') return { result: { status: 'prepared', converted: input.converted.map(item =>
        ({ ...item, resourceId: `v${Number(item.path.match(/still-(\d+)/)[1])}` })) } };
      if (input.operation === 'create') return { result: { status: 'saved', draftId: 'created-1' } };
      if (input.operation === 'verifyCreated') {
        view.rerender(React.createElement(Panel, { sdk,
          context: { projectId: 'project-1', sequenceId: 'created-1', language: 'en' }, ui: kit() }));
        return { result: { status: 'verified', tileCount: 21, draftId: 'created-1' } };
      }
      throw new Error(`Unexpected ${input.operation}`);
    } };
  view = render(React.createElement(Panel, { sdk,
    context: { projectId: 'project-1', sequenceId: null, language: 'en' }, ui: kit() }));
  fireEvent.click(view.getByRole('button', { name: 'Load project media' }));
  const assign = await waitFor(() => view.getByRole('button', { name: 'Assign all 21 in listed order' }));
  fireEvent.click(assign);
  fireEvent.click(view.getByLabelText('Enter BPM manually'));
  fireEvent.click(view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.ok(view.container.textContent.includes('Saved and read back all 21 tiles')));
  view.unmount(); cleanup();
});

test('a short video is extended before placement while long videos remain untouched', async () => {
  const inputs = [...media.slice(0, 19), { resourceId: 'short-1', name: 'Short clip', kind: 'video',
    width: 128, height: 96, path: '/fixture/short.mp4', durationFrames: 6 },
  { resourceId: 'long-1', name: 'Long clip', kind: 'video', width: 128, height: 96,
    path: '/fixture/long.mp4', durationFrames: 900 }];
  const shellCalls = [], calls = [];
  const sdk = { runShell: async request => { shellCalls.push(request);
      if (request.command.includes('still_video.py')) return { exitCode: 0, stdout: JSON.stringify({
        status: 'converted', fps: 60, durationFrames: 853,
        images: inputs.slice(0, 19).map((item, i) => ({ inputIndex: i, sourcePath: item.path,
          outputPath: `/cache/still-${i + 1}.mp4` })) }) };
      assert.match(request.command, /hold_video\.py/);
      return { exitCode: 0, stdout: JSON.stringify({ status: 'converted', fps: 60, durationFrames: 853,
        videos: [{ inputIndex: 0, sourcePath: '/fixture/short.mp4', outputPath: '/cache/held-short.mp4' }] }) };
    }, runScript: async request => { const input = JSON.parse(request.script); calls.push(input);
      if (input.operation === 'inspect') return { result: { status: 'inspected', projectId: 'project-1', media: inputs, audio: [] } };
      if (input.operation === 'importConverted') return { result: { status: 'prepared', converted: input.converted.map(item =>
        ({ ...item, resourceId: item.sourceResourceId === 'short-1' ? 'held-1' : `converted-${item.sourceResourceId}` })) } };
      if (input.operation === 'create') return { result: { status: 'saved', draftId: 'created-mixed' } };
      if (input.operation === 'verifyCreated') return { result: { status: 'verified', tileCount: 21,
        draftId: 'created-mixed' } };
      throw new Error(`Unexpected ${input.operation}`);
    } };
  const view = render(React.createElement(Panel, { sdk,
    context: { projectId: 'project-1', sequenceId: null, language: 'en' }, ui: kit() }));
  fireEvent.click(view.getByRole('button', { name: 'Load project media' }));
  const assign = await waitFor(() => view.getByRole('button', { name: 'Assign all 21 in listed order' }));
  fireEvent.click(assign);
  fireEvent.click(view.getByLabelText('Enter BPM manually'));
  fireEvent.click(view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.ok(calls.some(item => item.operation === 'verifyCreated')));
  assert.equal(shellCalls.length, 2);
  const created = calls.find(item => item.operation === 'create');
  assert.equal(created.media[19].resourceId, 'held-1');
  assert.equal(created.media[20].resourceId, 'long-1');
  view.unmount(); cleanup();
});

test('21-slot create uses one shared script and does not save on load', async () => {
  const calls = [];
  const shellCalls = [];
  const sdk = { runShell: async request => {
      shellCalls.push(request);
      assert.match(request.command, /still_video\.py/);
      return { exitCode: 0, stdout: JSON.stringify({ status: 'converted', fps: 60, durationFrames: 853,
        images: media.slice(0, 21).map((item, i) => ({ inputIndex: i, sourcePath: item.path,
          outputPath: `/cache/still-${i + 1}.mp4` })) }) };
    },
    runScript: async request => { calls.push(request); const input = JSON.parse(request.script);
      if (input.operation === 'inspect') return { result: { status: 'inspected', projectId: 'project-1', media: media.slice(0, 21), audio: [] } };
      if (input.operation === 'importConverted') return { result: { status: 'prepared',
        converted: input.converted.map(item => ({ ...item, resourceId: `v${Number(item.path.match(/still-(\d+)/)[1])}` })) } };
      if (input.operation === 'create') return { result: { status: 'saved', draftId: 'created-1' } };
      if (input.operation === 'verifyCreated') return { result: { status: 'verified', tileCount: 21, draftId: 'created-1' } };
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
  await waitFor(() => assert.ok(calls.some(call => JSON.parse(call.script).operation === 'verifyCreated')));
  assert.equal(shellCalls.length, 1);
  const imports = calls.filter(call => JSON.parse(call.script).operation === 'importConverted');
  assert.equal(imports.length, 7);
  assert.ok(imports.every(call => call.allowCommit && JSON.parse(call.script).converted.length === 3));
  const mutation = calls.find(call => JSON.parse(call.script).operation === 'create');
  const request = JSON.parse(mutation.script);
  assert.equal(mutation.allowCommit, true);
  assert.equal(request.media.length, 21);
  assert.deepEqual(request.media.map(item => item.resourceId), media.slice(0, 21).map((_, i) => `v${i + 1}`));
  assert.ok(request.media.every(item => item.kind === 'video'));
  assert.equal(request.manualBpm, 113);
  assert.equal(request.music, null);
  view.unmount(); cleanup();
});

test('panel does not offer unsupported existing-Draft mutation', async () => {
  const calls = [];
  const sdk = { runShell: () => { throw new Error('not used'); },
    runScript: async request => { calls.push(request); const input = JSON.parse(request.script);
      if (input.operation === 'inspect') return { result: { status: 'inspected', projectId: 'project-1', media, audio: [] } };
      throw new Error(`Unexpected ${input.operation}`);
    } };
  const view = render(React.createElement(Panel, { sdk, context: { projectId: 'project-1', sequenceId: 'draft-existing', language: 'ko' }, ui: kit() }));
  fireEvent.click(view.getByRole('button', { name: '\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30' }));
  await waitFor(() => assert.ok(view.container.textContent.includes('21/21') === false));
  assert.equal(view.queryByRole('button', { name: '\uc774 \uce78 \ubcc0\uacbd \uc800\uc7a5' }), null);
  assert.equal(view.queryByLabelText('\uc791\uc5c5'), null);
  assert.deepEqual(calls.map(call => JSON.parse(call.script).operation), ['inspect']);
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

test('a mismatched photo conversion never imports files or creates a Draft', async () => {
  const calls = [];
  const sdk = { runShell: async () => ({ exitCode: 0, stdout: JSON.stringify({ status: 'converted', fps: 60,
      durationFrames: 853, images: media.slice(0, 21).map((item, i) => ({ inputIndex: i,
        sourcePath: i === 4 ? '/fixture/other-photo.jpg' : item.path, outputPath: `/cache/still-${i}.mp4` })) }) }),
    runScript: async request => { const input = JSON.parse(request.script); calls.push(input.operation);
      assert.equal(input.operation, 'inspect');
      return { result: { status: 'inspected', projectId: 'project-1', media: media.slice(0, 21), audio: [] } };
    } };
  const view = render(React.createElement(Panel, { sdk,
    context: { projectId: 'project-1', sequenceId: null, language: 'en' }, ui: kit() }));
  fireEvent.click(view.getByRole('button', { name: 'Load project media' }));
  await waitFor(() => assert.ok(view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  fireEvent.click(view.getByRole('button', { name: 'Assign all 21 in listed order' }));
  fireEvent.click(view.getByLabelText('Enter BPM manually'));
  fireEvent.click(view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(view.container.textContent, /does not match the requested inputs/));
  assert.deepEqual(calls, ['inspect']);
  assert.equal(view.getByRole('button', { name: 'Create Draft' }).disabled, false);
  view.unmount(); cleanup();
});
