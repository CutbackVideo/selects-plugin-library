'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');

// Optional authoring check using an existing Selects source dependency tree.
// React/esbuild/jsdom are test dependencies, never dependencies of inference.
const modulesRoot = process.env.AI_PANEL_TEST_MODULES;
test('real Panel consumer lifecycle', { skip: !modulesRoot && 'Set AI_PANEL_TEST_MODULES to existing Selects node_modules' }, async t => {
  const dependency = createRequire(path.join(path.resolve(modulesRoot), '..', 'package.json'));
  const React = dependency('react');
  const { createRoot } = dependency('react-dom/client');
  const { JSDOM } = dependency('jsdom');
  const act = React.act ?? dependency('react-dom/test-utils').act;
  const source = await fs.readFile(path.join(__dirname, '..', 'panel.tsx'), 'utf8');
  const esbuild = dependency('esbuild');
  const appRoot = path.dirname(path.resolve(modulesRoot));
  const typecheckerModule = { exports: {} };
  const typecheckerBuild = await esbuild.build({
    entryPoints: [path.join(appRoot, 'electron/mcp/script-runtime/typecheck.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs', external: ['typescript'],
    plugins: [{ name: 'sdk-raw-declarations', setup(build) {
      build.onResolve({ filter: /\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'sdk-raw' }));
      build.onLoad({ filter: /.*/, namespace: 'sdk-raw' }, async args => ({ contents: await fs.readFile(args.path, 'utf8'), loader: 'text' }));
    } }],
  });
  new Function('require', 'module', 'exports', typecheckerBuild.outputFiles[0].text)(dependency, typecheckerModule, typecheckerModule.exports);
  const typecheckQueryScript = typecheckerModule.exports.typecheckQueryScript;
  const scriptChecks = [];
  const compiled = await esbuild.transform(source, { loader: 'tsx', format: 'cjs', jsx: 'transform', target: 'es2022' });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', compiled.code)(name => {
    assert.equal(name, 'react', 'The Panel may import only React'); return React;
  }, loaded, loaded.exports);
  const Panel = loaded.exports.default;
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://selects-test.invalid' });
  const previous = new Map();
  const stored = new Map();
  const storage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), clear: () => stored.clear() };
  Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('Iframe storage is denied'); } });
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, localStorage: { getItem() { throw Error("Iframe storage is denied"); }, setItem() { throw Error("Iframe storage is denied"); } }, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const h = React.createElement;
  const U = {
    Section: props => h('section', null, props.children), Stack: props => h('div', null, props.children),
    Message: props => h('p', null, props.children), Actions: props => h('div', null, props.children),
    Select: props => h('select', { 'data-label': props.label, value: props.value ?? '', disabled: props.disabled,
      onChange: event => props.onChange(event.target.value) }, props.placeholder && h('option', { value: '', disabled: true }, props.placeholder),
      props.options.map(option => h('option', { key: option.value, value: option.value }, option.label))),
    NumberField: props => h('input', { 'data-label': props.label, type: 'number', value: props.value, min: props.min, max: props.max,
      onChange: event => props.onChange(Number(event.target.value)) }),
    Button: props => h('button', { 'data-label': props.children, disabled: props.disabled || props.busy, onClick: props.onClick }, props.children),
    Tabs: props => h('div', null,
      h('div', { role: 'tablist' }, props.tabs.map(tab => h('button', {
        key: tab.value, role: 'tab', 'data-label': tab.label, 'aria-selected': props.value === tab.value,
        onClick: () => props.onChange(tab.value),
      }, tab.label))),
      props.tabs.find(tab => tab.value === props.value)?.content),
    Progress: props => h('div', { role: 'progressbar' }, props.label),
  };
  const UUID_A = '11111111-1111-4111-8111-111111111111';
  const UUID_B = '22222222-2222-4222-8222-222222222222';
  const IMPORTED = '44444444-4444-4444-8444-444444444444';
  const recoveryKey = (projectId, task = 'faces.detect') => `selects-ai-runtime:lab:${projectId}:${task}`;
  const row = (id, name) => ({ resourceId: id, name, type: 'Video', durationSeconds: 10 });
  const status = (workflowId, phase = 'running') => ({ workflowId, status: phase, projectId: 'A', progress: 0.5 });
  const answer = value => ({ isError: false, result: value, output: JSON.stringify({ result: value }) });
  const error = (code, message) => ({ isError: true, output: JSON.stringify({ code, error: message }) });
  const pane = () => dom.window.document.querySelector('[data-task]:not([hidden])') ?? dom.window.document;
  const button = label => pane().querySelector(`button[data-label="${label}"]`) ?? dom.window.document.querySelector(`[role="tab"][data-label="${label}"]`);
  const field = label => pane().querySelector(`select[data-label="${label}"]`);
  const durationField = () => pane().querySelector('input[data-label="Source duration"]');
  const text = () => pane().textContent;
  const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); };
  const select = async (label, value) => { await act(async () => {
    const input = field(label);
    assert.ok(input, `Visible field ${label} must exist`);
    input.value = value; input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  }); await flush(); };
  const click = async label => { await act(async () => {
    const target = button(label); assert.ok(target, `Visible action ${label} must exist`); assert.equal(target.disabled, false, `${label} must be enabled`);
    target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  }); await flush(); };
  let root;
  const mount = async (sdk, projectId, language = 'en') => {
    root ??= createRoot(dom.window.document.getElementById('root'));
    const checkedSdk = { storage: { getItem: async key => storage.getItem(key), setItem: async (key, value) => { storage.setItem(key, value); } }, ...sdk, runScript: async input => {
      scriptChecks.push({ script: input.script, checked: typecheckQueryScript(input.script, { generatedMediaAuthoring: true }) });
      return sdk.runScript(input);
    } };
    await act(async () => root.render(h(Panel, { sdk: checkedSdk, context: { projectId, language }, ui: U }))); await flush();
  };
  const unmount = async () => { if (root) { await act(async () => root.unmount()); root = null; } };
  const reset = async () => { await unmount(); storage.clear(); };
  try {
    await t.test('waits for host recovery before accepting actions and ignores a late project restore', async () => {
      await reset(); let finishA; let submissions = 0;
      const sdk = { storage: {
        getItem: async key => key === recoveryKey('A') ? new Promise(resolve => { finishA = resolve; }) : null,
        setItem: async (key, value) => storage.setItem(key, value),
      }, call: async (_method, project) => [row(project === 'A' ? UUID_A : UUID_B, project)],
        runScript: async () => { submissions++; return answer({}); } };
      await mount(sdk, 'A');
      assert.equal(button('Run task').disabled, true);
      await mount(sdk, 'B');
      finishA(JSON.stringify({ version: 1, input: { runtimeId: 'selects-ai-runtime', projectId: 'A', resourceId: UUID_A,
        task: 'faces.detect', requestKey: 'old', sourceRange: { startSeconds: 0, endSeconds: 3 } } }));
      await flush();
      assert.equal(field('Source video').value, UUID_B);
      assert.equal(submissions, 0);
      assert.equal(storage.getItem(recoveryKey('B')), null);
    });
    await t.test('a rejected checkpoint stops submission and can retry the same request', async () => {
      await reset(); let fail = true; let submissions = 0;
      const sdk = { storage: {
        getItem: async key => storage.getItem(key),
        setItem: async (key, value) => { if (fail) throw Error('Host storage offline'); storage.setItem(key, value); },
      }, call: async () => [row(UUID_A, 'A video')], runScript: async input => {
        if (input.script.includes('selects.ai.submit')) { submissions++; return answer({ workflowId: 'ai:retry' }); }
        return answer(status('ai:retry'));
      } };
      await mount(sdk, 'A'); await click('Run task');
      assert.equal(submissions, 0);
      assert.match(text(), /Host storage offline/);
      fail = false; await click('Recover same request');
      assert.equal(submissions, 1);
      assert.equal(JSON.parse(storage.getItem(recoveryKey('A'))).workflowId, 'ai:retry');
    });
    await t.test('an older host reports an actionable update message and cannot submit', async () => {
      await reset();
      await mount({ storage: undefined, call: async () => [row(UUID_A, 'A video')], runScript: async () => { throw Error('Unexpected submit'); } }, 'A');
      assert.match(text(), /Update Selects/);
      assert.equal(button('Run task').disabled, true);
    });
    await t.test('uses persistent Resource ids and prevents a late inventory from replacing another Project', async () => {
      await reset(); const finishA = [];
      const sdk = { call: async (method, project) => {
        assert.equal(method, 'listProjectResources');
        return project === 'A' ? new Promise(resolve => { finishA.push(resolve); }) : [row(UUID_B, 'B video')];
      }, runScript: async () => { throw new Error('No script needed for inventory'); } };
      await mount(sdk, 'A'); await mount(sdk, 'B');
      finishA.forEach(resolve => resolve([row(UUID_A, 'A video')])); await flush();
      const select = field('Source video');
      assert.equal(select.value, UUID_B); assert.equal(select.selectedOptions[0].textContent, 'B video');
      assert.equal(button('Run task').disabled, false);
    });
    await t.test('preserves an old Project acknowledgment without overwriting the new Project UI', async () => {
      await reset(); let complete;
      const sdk = { call: async (_method, project) => [row(project === 'A' ? UUID_A : UUID_B, `${project} video`)],
        runScript: async input => {
          assert.ok(input.script.includes('selects.ai.submit'));
          assert.ok(!input.script.includes('job.status()'), 'Submission identity must survive a subsequent status outage');
          return new Promise(resolve => { complete = resolve; });
        } };
      await mount(sdk, 'A'); await click('Run task'); await mount(sdk, 'B');
      complete(answer({ workflowId: 'ai:old-project-job' })); await flush();
      assert.ok(!dom.window.document.body.textContent.includes('ai:old-project-job'));
      assert.equal(button('Run task').disabled, false);
      const saved = JSON.parse(storage.getItem(recoveryKey('A')));
      assert.equal(saved.workflowId, 'ai:old-project-job'); assert.equal(saved.input.resourceId, UUID_A);
      assert.equal(storage.getItem(recoveryKey('B')), null);
    });
    await t.test('does not replace a newer same-Project recovery record with a detached old submission acknowledgment', async () => {
      await reset(); let finishOld; const submitted = [];
      const sdk = { call: async (_method, project) => [row(project === 'A' ? UUID_A : UUID_B, `${project} video`)],
        runScript: async input => {
          if (input.script.includes('selects.ai.submit')) {
            submitted.push(JSON.parse(input.script.match(/selects\.ai\.submit\((\{.*\})\)/s)[1]));
            if (submitted.length === 1) return new Promise(resolve => { finishOld = resolve; });
            return answer({ workflowId: submitted.length === 2 ? 'ai:first' : 'ai:newer' });
          }
          if (input.script.includes('job.result()')) return answer({ task: 'faces.detect', metrics: { totalMs: 1 }, data: { sampleCount: 0, faceCount: 0, samples: [] } });
          return answer(status(input.script.includes('ai:newer') ? 'ai:newer' : 'ai:first', 'succeeded'));
        } };
      await mount(sdk, 'A'); await click('Run task'); await mount(sdk, 'B'); await mount(sdk, 'A');
      await click('Recover same request'); await click('Run task');
      assert.equal(submitted.length, 3); assert.equal(submitted[0].requestKey, submitted[1].requestKey);
      assert.notEqual(submitted[2].requestKey, submitted[0].requestKey);
      finishOld(answer({ workflowId: 'ai:first' })); await flush();
      const saved = JSON.parse(storage.getItem(recoveryKey('A')));
      assert.equal(saved.workflowId, 'ai:newer'); assert.equal(saved.input.requestKey, submitted[2].requestKey);
      await unmount(); await mount(sdk, 'A');
      assert.ok(dom.window.document.body.textContent.includes('ai:newer'));
      assert.equal(submitted.length, 3, 'Reopening observes the durable newer job without inferring again');
    });
    await t.test('refreshes media from scoped events without changing selection and ignores older same-Project reads', async () => {
      await reset(); const changed = [], finishOld = []; let stage = 0, calls = 0, unsubscribes = 0;
      const UUID_C = '55555555-5555-4555-8555-555555555555';
      const sdk = { on: (event, listener) => { assert.equal(event, 'resourcesChanged'); changed.push(listener); return () => { unsubscribes++; }; },
        call: async () => {
          calls++;
          if (stage === 1) return new Promise(resolve => { finishOld.push(resolve); });
          return stage === 0 ? [row(UUID_A, 'First'), row(UUID_B, 'Chosen')] : [row(UUID_A, 'First'), row(UUID_B, 'Chosen'), row(UUID_C, 'New media')];
        }, runScript: async () => { throw new Error('Inventory must not submit inference'); } };
      await mount(sdk, 'A'); await select('Source video', UUID_B);
      const initialCalls = calls;
      await act(async () => changed.forEach(listener => listener({ projectId: 'B' }))); assert.equal(calls, initialCalls);
      stage = 1; await act(async () => changed.forEach(listener => listener({ projectId: 'A' })));
      stage = 2; await act(async () => changed.forEach(listener => listener({ projectId: 'A' }))); await flush();
      assert.ok(finishOld.length > 0); finishOld.forEach(resolve => resolve([row(UUID_A, 'Obsolete inventory')])); await flush();
      const source = field('Source video');
      assert.equal(source.value, UUID_B); assert.ok([...source.options].some(option => option.value === UUID_C));
      const beforeManual = calls; await click('Refresh media list'); assert.equal(calls, beforeManual + 1); assert.equal(source.value, UUID_B);
      await unmount(); assert.equal(unsubscribes, changed.length);
    });
    await t.test('reopens an unknown acknowledgment and retries the identical key and persistent source', async () => {
      await reset(); const submitted = []; let interrupted = true;
      const sdk = { call: async () => [row(UUID_A, 'A video')], runScript: async input => {
        if (input.script.includes('selects.ai.submit')) {
          submitted.push(JSON.parse(input.script.match(/selects\.ai\.submit\((\{.*\})\)/s)[1]));
          return interrupted ? error('AI_SUBMIT_OUTCOME_UNKNOWN', 'Recover the same request') : answer({ workflowId: 'ai:recovered-job' });
        }
        return answer(status('ai:recovered-job'));
      } };
      await mount(sdk, 'A'); await click('Run task');
      assert.equal(button('Run task').disabled, true); assert.ok(button('Recover same request'));
      await unmount(); interrupted = false; await mount(sdk, 'A');
      assert.ok(button('Recover same request'), 'Recovery remains available without a newly displayed error');
      await click('Recover same request');
      assert.deepEqual(submitted[1], submitted[0]); assert.equal(submitted[1].resourceId, UUID_A);
      assert.ok(dom.window.document.body.textContent.includes('ai:recovered-job'));
    });
    await t.test('warns when a known acknowledgment cannot be saved without losing its visible identity', async () => {
      await reset(); const original = storage.setItem; let writes = 0;
      storage.setItem = function (...args) {
        if (++writes === 2) throw new Error('Storage quota exceeded');
        return original.apply(this, args);
      };
      try {
        const sdk = { call: async () => [row(UUID_A, 'A video')], runScript: async input =>
          answer(input.script.includes('selects.ai.submit') ? { workflowId: 'ai:unsaved-job' } : status('ai:unsaved-job')) };
        await mount(sdk, 'A'); await click('Run task');
        assert.ok(dom.window.document.body.textContent.includes('Recovery storage is unavailable'));
        assert.ok(dom.window.document.body.textContent.includes('ai:unsaved-job'));
        assert.ok(dom.window.document.querySelector('pre').textContent.includes('ai:unsaved-job'));
        assert.equal(button('Run task').disabled, true);
      } finally { storage.setItem = original; }
    });
    await t.test('refreshes a known job after status transport failure without resubmitting', async () => {
      await reset(); let failed = true, submits = 0;
      storage.setItem('selects-ai-runtime:lab:A', JSON.stringify({ version: 1, input: {
        runtimeId: 'selects-ai-runtime', projectId: 'A', resourceId: UUID_A, requestKey: 'old-key',
        task: 'faces.detect', sourceRange: { startSeconds: 0, endSeconds: 2 } }, workflowId: 'ai:known-job' }));
      const sdk = { call: async () => [row(UUID_A, 'A video')], runScript: async input => {
        if (input.script.includes('selects.ai.submit')) submits++;
        return failed ? error('AI_STATUS_TRANSPORT', 'Temporary status outage') : answer(status('ai:known-job'));
      } };
      await mount(sdk, 'A'); assert.ok(button('Refresh job'));
      failed = false; await click('Refresh job');
      assert.equal(submits, 0); assert.ok(dom.window.document.body.textContent.includes('running'));
    });
    await t.test('does not let an old Project cancellation replace the new Project UI', async () => {
      await reset(); let completeCancel;
      const sdk = { call: async (_method, project) => [row(project === 'A' ? UUID_A : UUID_B, `${project} video`)], runScript: async input => {
        if (input.script.includes('selects.ai.submit')) return answer({ workflowId: 'ai:cancel-A' });
        if (input.script.includes('.cancel()')) return new Promise(resolve => { completeCancel = resolve; });
        return answer(status('ai:cancel-A'));
      } };
      await mount(sdk, 'A'); await click('Run task'); await click('Cancel job'); await mount(sdk, 'B');
      completeCancel(answer(status('ai:cancel-A', 'canceled'))); await flush();
      assert.equal(button('Run task').disabled, false);
      assert.ok(!dom.window.document.body.textContent.includes('ai:cancel-A'));
    });
    await t.test('keeps complete counts while showing only a bounded result projection', async () => {
      await reset(); let projectionScript;
      const sdk = { call: async () => [row(UUID_A, 'A video')], runScript: async input => {
        if (input.script.includes('selects.ai.submit')) return answer({ workflowId: 'ai:result-job' });
        if (input.script.includes('job.result()')) {
          projectionScript = input.script;
          return answer({ task: 'faces.detect', metrics: { totalMs: 20 }, diagnostics: {},
            data: { sampleCount: 1000, faceCount: 3000, samples: [{ faces: [] }] } });
        }
        return answer(status('ai:result-job', 'succeeded'));
      } };
      await mount(sdk, 'A'); await click('Run task');
      assert.ok(projectionScript.includes('samples.slice(0,3)'));
      assert.ok(projectionScript.includes('frames.slice(0,3)'));
      assert.ok(dom.window.document.body.textContent.includes('1000 samples · 3000 faces'));
    });
    const BG = '33333333-3333-4333-8333-333333333333';
    const MANIFEST = { id: 'ai-artifact:manifest', name: 'matte.json', mediaType: 'application/json', byteSize: 500 };
    const preparedMatte = { sourceResourceId: UUID_A, sourceRange: { startSeconds: 0.25, endSeconds: 2.25 },
      frameSize: { width: 1920, height: 1080 }, alphaEncoding: 'grayscale-png-8bit', frameCount: 48 };
    const matteResult = { task: 'person.matte', manifest: MANIFEST, metrics: { totalMs: 20 }, diagnostics: {},
      data: { frameCount: 48, frames: [], foregroundVideo: { sourceStartSeconds: 0.25, durationSeconds: 2, frameCount: 48, frameRate: { numerator: 24, denominator: 1 } } } };
    function consumerSdk(overrides = {}) {
      const scripts = [];
      const sdk = { scripts, call: async (method, project) => method === 'readFootage' ? { drafts: [] } :
        [row(project === 'A' ? UUID_A : UUID_B, `${project} video`), { resourceId: BG, name: 'Blue background', type: 'Image' }],
        runScript: async input => {
          scripts.push(input);
          if (input.script.includes('supportedMatteEncodings')) return answer('grayscale-png-8bit');
          if (input.script.includes('selects.ai.prepareMatte') && !input.script.includes('createDraft')) return answer(preparedMatte);
          if (input.script.includes('createDraft')) return answer({ draftId: 'draft-persistent-id' });
          if (input.script.includes('openDraft')) return answer({ requested: true, sequenceId: 'draft-persistent-id' });
          if (input.script.includes('selects.ai.submit')) return answer({ workflowId: 'ai:matte-job' });
          if (input.script.includes('job.result()')) return answer(matteResult);
          return answer(status('ai:matte-job', 'succeeded'));
        }, ...overrides };
      return sdk;
    }
    const prepareMatte = async sdk => { await mount(sdk, 'A'); await click('Remove background'); await click('Run task'); };
    await t.test('uses independent AVIF only when the current host advertises it and submits compatible PNG to older hosts', async () => {
      for (const encodings of [undefined, ['grayscale-png-8bit'], ['grayscale-png-8bit', 'grayscale-avif-8bit']]) {
        await reset(); const base = consumerSdk();
        const sdk = { ...base, runScript: async input => {
          if (!input.script.includes('supportedMatteEncodings')) return base.runScript(input);
          base.scripts.push(input);
          assert.equal(input.allowCommit, false, 'Format negotiation is a read');
          const build = esbuild.transformSync(`async function inspect(selects) {${input.script}}`, { loader: 'ts', format: 'cjs' });
          return answer(await new Function('selects', `${build.code}\nreturn inspect(selects);`)({ ai: {
            ...(encodings ? { supportedMatteEncodings: encodings } : {}),
          } }));
        } };
        await prepareMatte(sdk);
        const submission = base.scripts.find(input => input.script.includes('selects.ai.submit'));
        const input = JSON.parse(submission.script.match(/selects\.ai\.submit\((\{.*\})\)/s)[1]);
        const avif = encodings?.includes('grayscale-avif-8bit');
        assert.equal(input.options.outputMode, 'alpha-frames');
        assert.equal(input.options.alphaEncoding, avif ? 'grayscale-avif-8bit' : undefined);
        if (!avif) assert.deepEqual(Object.keys(input.options), ['outputMode'], 'Older validators must receive no newly added option');
        assert.deepEqual(JSON.parse(storage.getItem(recoveryKey('A', 'person.matte'))).input, input);
        assert.equal(field('Mask format'), null, 'Encoding selection adds no setting to the simple two-task UI');
        assert.equal(base.scripts.filter(input => input.script.includes('supportedMatteEncodings')).length, 1);
      }
    });
    await t.test('recovery preserves the exact saved AVIF request even when the current host advertisement changes', async () => {
      await reset(); const submitted = []; let lost = true, inspections = 0; const base = consumerSdk();
      const sdk = { ...base, runScript: async input => {
        if (input.script.includes('supportedMatteEncodings')) { inspections++; return answer(lost ? 'grayscale-avif-8bit' : 'grayscale-png-8bit'); }
        if (input.script.includes('selects.ai.submit')) {
          submitted.push(JSON.parse(input.script.match(/selects\.ai\.submit\((\{.*\})\)/s)[1]));
          return lost ? error('AI_SUBMIT_OUTCOME_UNKNOWN', 'Recover identical input') : answer({ workflowId: 'ai:avif-recovered' });
        }
        return base.runScript(input);
      } };
      await prepareMatte(sdk);
      assert.equal(submitted[0].options.alphaEncoding, 'grayscale-avif-8bit');
      await unmount(); lost = false; await mount(sdk, 'A'); await click('Remove background'); await click('Recover same request');
      assert.deepEqual(submitted[1], submitted[0]); assert.equal(inspections, 1, 'A saved key never negotiates a different input');
    });
    await t.test('a detached encoding read never starts or saves a fresh job in the former Project', async () => {
      await reset(); let finish; const base = consumerSdk();
      const sdk = { ...base, runScript: input => input.script.includes('supportedMatteEncodings')
        ? new Promise(resolve => { finish = resolve; }) : base.runScript(input) };
      await mount(sdk, 'A'); await click('Remove background'); await click('Run task'); await mount(sdk, 'B');
      finish(answer('grayscale-avif-8bit')); await flush();
      assert.ok(!base.scripts.some(input => input.script.includes('selects.ai.submit')));
      assert.equal(storage.getItem(recoveryKey('A', 'person.matte')), null);
      assert.equal(storage.getItem(recoveryKey('B', 'person.matte')), null);
    });
    await t.test('an old completed job cannot repaint the new task while format negotiation is pending', async () => {
      await reset(); const base = consumerSdk(); let inspections = 0, submissions = 0, refreshOld = false, finishOld, finishEncoding;
      const sdk = { ...base, runScript: input => {
        if (input.script.includes('supportedMatteEncodings')) return ++inspections === 1 ? answer('grayscale-png-8bit')
          : new Promise(resolve => { finishEncoding = resolve; });
        if (input.script.includes('selects.ai.submit')) return ++submissions === 1 ? answer({ workflowId: 'ai:matte-job' })
          : error('AI_SUBMIT_OUTCOME_UNKNOWN', 'Recover the new request');
        if (refreshOld && input.script.includes('.status()')) return new Promise(resolve => { finishOld = resolve; });
        return base.runScript(input);
      } };
      await prepareMatte(sdk); refreshOld = true; await click('Refresh job');
      const resultReads = base.scripts.filter(input => input.script.includes('job.result()')).length;
      await click('Run task'); assert.equal(submissions, 1, 'The new submit waits for the read');
      finishOld(answer(status('ai:matte-job', 'succeeded'))); await flush();
      assert.ok(!text().includes('48 frames processed')); assert.equal(button('Open in editor'), null);
      assert.equal(base.scripts.filter(input => input.script.includes('job.result()')).length, resultReads);
      finishEncoding(answer('grayscale-avif-8bit')); await flush();
      assert.equal(submissions, 2); assert.ok(button('Recover same request'));
      assert.ok(!text().includes('48 frames processed'));
    });
    await t.test('a fresh unknown matte submission clears the prior success and ignores late old status or result acknowledgments', async () => {
      for (const delayed of ['status', 'result']) {
        await reset(); let refreshOld = false, finishOld; const submissions = [], oldCalls = [];
        const base = consumerSdk();
        const sdk = { ...base, runScript: async input => {
          if (input.script.includes('supportedMatteEncodings')) return base.runScript(input);
          if (input.script.includes('selects.ai.submit')) {
            submissions.push(JSON.parse(input.script.match(/selects\.ai\.submit\((\{.*\})\)/s)[1]));
            return submissions.length === 1 ? answer({ workflowId: 'ai:matte-job' })
              : error('AI_SUBMIT_OUTCOME_UNKNOWN', 'Recover the new request');
          }
          oldCalls.push(input.script);
          const isResult = input.script.includes('job.result()');
          if (refreshOld && (delayed === 'result' ? isResult : input.script.includes('.status()')))
            return new Promise(resolve => { finishOld = resolve; });
          return base.runScript(input);
        } };
        await prepareMatte(sdk);
        assert.ok(text().includes('48 frames processed')); assert.equal(button('Open in editor').disabled, false);
        refreshOld = true; await click('Refresh job'); assert.equal(typeof finishOld, 'function');
        const readsBeforeNew = oldCalls.length;
        await click('Run task');
        assert.equal(submissions.length, 2); assert.notEqual(submissions[0].requestKey, submissions[1].requestKey);
        assert.equal(button('Refresh job'), null); assert.equal(button('Open in editor'), null);
        assert.ok(button('Recover same request')); assert.equal(button('Run task').disabled, true);
        finishOld(answer(delayed === 'result' ? matteResult : status('ai:matte-job', 'succeeded'))); await flush();
        assert.equal(oldCalls.length, readsBeforeNew, 'An old status acknowledgment must not fetch its result after the new request');
        assert.equal(button('Refresh job'), null); assert.equal(button('Open in editor'), null);
        assert.ok(!text().includes('48 frames processed')); assert.ok(!text().includes('ai:matte-job'));
        assert.ok(button('Recover same request'));
        const saved = JSON.parse(storage.getItem(recoveryKey('A', 'person.matte')));
        assert.deepEqual(saved.input, submissions[1]); assert.equal(saved.workflowId, undefined);
        assert.ok(!base.scripts.some(input => input.script.includes('selects.ai.prepareMatte') || input.script.includes('createDraft')));
      }
    });
    await t.test('keeps face and matte jobs independently polling while switching tabs without canceling or losing either result', async () => {
      await reset(); const submissions = [], calls = [], pending = new Map();
      const faces = { task: 'faces.detect', metrics: { totalMs: 7 }, data: { frameSize: { width: 100, height: 100 },
        sampleCount: 12, faceCount: 18, samples: [{ sourceTimeSeconds: 0, faces: [] }] } };
      const sdk = { call: async () => [row(UUID_A, 'Face source'), row(UUID_B, 'Matte source'), { resourceId: BG, name: 'Background', type: 'Image' }],
        runScript: async input => {
          calls.push(input.script);
          if (input.script.includes('supportedMatteEncodings')) return answer('grayscale-png-8bit');
          if (input.script.includes('selects.ai.submit')) {
            const request = JSON.parse(input.script.match(/selects\.ai\.submit\((\{.*\})\)/s)[1]); submissions.push(request);
            return answer({ workflowId: request.task === 'faces.detect' ? 'ai:faces-independent' : 'ai:matte-independent' });
          }
          const id = input.script.includes('ai:faces-independent') ? 'ai:faces-independent' : 'ai:matte-independent';
          if (input.script.includes('job.result()')) return answer(id === 'ai:faces-independent' ? faces : matteResult);
          if (input.script.includes('.status()')) return new Promise(resolve => pending.set(id, resolve));
          throw new Error('Tab switching must not issue cancellation or another side effect');
        } };
      await mount(sdk, 'A'); assert.equal(field('Task'), null); assert.equal(field('Matte output'), null);
      await click('Run task'); await click('Remove background');
      assert.equal(button('Run task').disabled, false, 'A running face job must not block the matte channel');
      await select('Source video', UUID_B); await click('Run task');
      assert.equal(pending.size, 2); assert.equal(submissions.length, 2);
      assert.equal(submissions[0].task, 'faces.detect'); assert.equal(submissions[0].resourceId, UUID_A);
      assert.equal(submissions[0].options?.outputMode, undefined);
      assert.equal(submissions[1].task, 'person.matte'); assert.equal(submissions[1].resourceId, UUID_B);
      assert.equal(submissions[1].options.outputMode, 'alpha-frames');
      pending.get('ai:faces-independent')(answer(status('ai:faces-independent', 'succeeded'))); await flush();
      assert.ok(!text().includes('12 samples'), 'A hidden face result must not replace the visible matte result');
      pending.get('ai:matte-independent')(answer(status('ai:matte-independent', 'succeeded'))); await flush();
      assert.ok(text().includes('48 frames processed')); await click('Find faces');
      assert.ok(text().includes('12 samples')); assert.ok(text().includes('18 faces')); assert.equal(field('Source video').value, UUID_A);
      await click('Remove background'); assert.ok(text().includes('48 frames processed')); assert.equal(field('Source video').value, UUID_B);
      assert.ok(!calls.some(script => script.includes('.cancel()'))); assert.equal(submissions.length, 2);
      assert.equal(JSON.parse(storage.getItem(recoveryKey('A'))).workflowId, 'ai:faces-independent');
      assert.equal(JSON.parse(storage.getItem(recoveryKey('A', 'person.matte'))).workflowId, 'ai:matte-independent');
    });
    await t.test('reopens both unknown submissions with each task own saved key and does not mix recovery channels', async () => {
      await reset(); let lost = true; const submissions = [];
      const sdk = { call: async () => [row(UUID_A, 'A video')], runScript: async input => {
        if (input.script.includes('selects.ai.submit')) {
          const request = JSON.parse(input.script.match(/selects\.ai\.submit\((\{.*\})\)/s)[1]); submissions.push(request);
          return lost ? error('AI_SUBMIT_OUTCOME_UNKNOWN', 'Recover identical request') : answer({ workflowId: request.task === 'faces.detect' ? 'ai:face-recovered' : 'ai:matte-recovered' });
        }
        return answer(status(input.script.includes('ai:face-recovered') ? 'ai:face-recovered' : 'ai:matte-recovered'));
      } };
      await mount(sdk, 'A'); await click('Run task'); await click('Remove background'); await click('Run task');
      assert.equal(submissions.length, 2); assert.notEqual(submissions[0].requestKey, submissions[1].requestKey);
      await unmount(); lost = false; await mount(sdk, 'A'); await click('Recover same request');
      await click('Remove background'); await click('Recover same request');
      assert.equal(submissions.length, 4); assert.deepEqual(submissions[2], submissions[0]); assert.deepEqual(submissions[3], submissions[1]);
      await click('Find faces'); assert.ok(text().includes('ai:face-recovered')); assert.ok(!text().includes('ai:matte-recovered'));
      await click('Remove background'); assert.ok(text().includes('ai:matte-recovered')); assert.ok(!text().includes('ai:face-recovered'));
    });
    await t.test('keeps a successful RVM result and source settings while live inventory adds a usable background', async () => {
      await reset(); const changed = []; let hasBackground = false; const base = consumerSdk();
      const sdk = { ...base, on: (_event, listener) => { changed.push(listener); return () => {}; },
        call: async () => [row(UUID_A, 'A video'), ...(hasBackground ? [{ resourceId: BG, name: 'Added background', type: 'Image' }] : [])] };
      await prepareMatte(sdk);
      assert.equal(button('Open in editor').disabled, true);
      const saved = storage.getItem(recoveryKey('A', 'person.matte'));
      hasBackground = true; await act(async () => changed.forEach(listener => listener({ projectId: 'A' }))); await flush();
      assert.equal(button('Open in editor').disabled, false);
      assert.equal(pane().getAttribute('data-task'), 'person.matte');
      assert.equal(field('Source video').value, UUID_A);
      assert.equal(durationField().value, '2');
      assert.ok(text().includes('48 frames processed'));
      assert.equal(storage.getItem(recoveryKey('A', 'person.matte')), saved);
      assert.equal(base.scripts.filter(input => input.script.includes('selects.ai.submit')).length, 1);
      assert.ok(!base.scripts.some(input => input.script.includes('selects.ai.prepareMatte') || input.script.includes('createDraft')));
    });
    await t.test('renders bounded face coordinate diagrams from the real xyxy contract and skips invalid geometry', async () => {
      await reset(); const box = { xmin: 20, ymin: 10, xmax: 60, ymax: 80 };
      const samples = Array.from({ length: 4 }, (_, index) => ({ sourceTimeSeconds: index * 0.5, faces: [
        { box, score: 0.9 }, { score: 0.8 }, { box: { ...box, xmax: NaN }, score: 0.8 },
        { box: { ...box, xmin: -1 }, score: 0.7 }, { box, score: Infinity },
      ] }));
      const sdk = { call: async () => [row(UUID_A, 'A video')], runScript: async input => answer(input.script.includes('selects.ai.submit')
        ? { workflowId: 'ai:diagram' } : input.script.includes('job.result()')
          ? { task: 'faces.detect', metrics: { totalMs: 1 }, data: { frameSize: { width: 100, height: 100 }, sampleCount: 4, faceCount: 20, samples } }
          : status('ai:diagram', 'succeeded')) };
      await mount(sdk, 'A'); await click('Run task');
      const diagrams = [...dom.window.document.querySelectorAll('svg')];
      assert.equal(diagrams.length, 3); assert.equal(diagrams[0].getAttribute('viewBox'), '0 0 100 100');
      assert.equal(diagrams.filter(svg => !svg.closest('details')).length, 1, 'Only one face diagram is in the main flow');
      assert.equal(diagrams.filter(svg => svg.closest('details') && !svg.closest('details').open).length, 2,
        'Other bounded samples stay in collapsed Details');
      assert.equal(diagrams[0].querySelectorAll('rect').length, 2, 'One frame outline and one valid detection');
      assert.equal(diagrams[0].querySelectorAll('rect')[1].getAttribute('width'), '40');
      assert.ok(dom.window.document.querySelectorAll('figcaption')[1].textContent.includes('0.500 s'));
      assert.ok(dom.window.document.querySelector('figcaption').textContent.includes('90%'));
      assert.ok(dom.window.document.body.textContent.includes('not the source image'));
    });
    await t.test('does not silently substitute another background when the selected image disappears', async () => {
      await reset(); const changed = []; let removed = false;
      const other = '66666666-6666-4666-8666-666666666666'; const base = consumerSdk();
      const sdk = { ...base, on: (_event, listener) => { changed.push(listener); return () => {}; },
        call: async () => [row(UUID_A, 'A video'), { resourceId: other, name: 'Other background', type: 'Image' },
          ...(!removed ? [{ resourceId: BG, name: 'Chosen background', type: 'Image' }] : [])] };
      await prepareMatte(sdk); await select('Background image', BG);
      removed = true; await act(async () => changed.forEach(listener => listener({ projectId: 'A' }))); await flush();
      assert.equal(field('Background image').value, '');
      assert.equal(button('Open in editor').disabled, true);
      assert.ok(text().includes('48 frames processed'));
      removed = false; await click('Refresh media list');
      assert.equal(field('Background image').value, BG);
      assert.equal(button('Open in editor').disabled, false);
    });
    await t.test('uses Korean controls while keeping the canonical public script summary in English', async () => {
      await reset(); const scripts = [];
      const sdk = { call: async () => [row(UUID_A, '\ud55c\uad6d\uc5b4 \uc601\uc0c1')], runScript: async input => {
        scripts.push(input); return answer(input.script.includes('selects.ai.submit') ? { workflowId: 'ai:korean' } : status('ai:korean'));
      } };
      await mount(sdk, 'A', 'ko-KR');
      assert.ok(button('\ubbf8\ub514\uc5b4 \ubaa9\ub85d \uc0c8\ub85c\uace0\uce68')); assert.ok(!button('Run task'));
      assert.equal(field('\uc6d0\ubcf8 \uc601\uc0c1').value, UUID_A);
      await click('\uc2e4\ud589'); assert.ok(button('\uc791\uc5c5 \ucde8\uc18c'));
      assert.equal(scripts[0].summary, 'Test AI runtime'); assert.equal(scripts[0].allowCommit, true);
      assert.ok(dom.window.document.body.textContent.includes('\uc2e4\ud589 \uc911'));
    });
    await t.test('restores the saved RVM form after delayed inventory and keeps results readable if its source disappeared', async () => {
      for (const sourceExists of [true, false]) {
        await reset(); const finishInventory = [], scripts = [];
        storage.setItem('selects-ai-runtime:lab:A', JSON.stringify({ version: 1,
          input: { runtimeId: 'selects-ai-runtime', projectId: 'A', resourceId: UUID_B, requestKey: 'saved-rvm-key',
            task: 'person.matte', sourceRange: { startSeconds: 0, endSeconds: 3.5 }, options: { outputMode: 'alpha-frames' } },
          workflowId: 'ai:saved-rvm' }));
        const sdk = consumerSdk({ call: async () => new Promise(resolve => { finishInventory.push(resolve); }),
          runScript: async input => { scripts.push(input.script); return answer(input.script.includes('job.result()')
            ? { ...matteResult, manifest: undefined } : status('ai:saved-rvm', 'succeeded')); } });
        await mount(sdk, 'A'); await click('Remove background');
        assert.equal(field('Task'), null); assert.equal(field('Matte output'), null);
        const firstVideo = { ...row(UUID_A, 'Default clip'), durationSeconds: 0.5 };
        finishInventory.forEach(resolve => resolve(sourceExists ? [firstVideo, row(UUID_B, 'Saved RVM source')] : [firstVideo])); await flush();
        assert.equal(durationField().value, '3.5');
        assert.equal(field('Source video').value, sourceExists ? UUID_B : '');
        assert.ok(text().includes('48 frames processed'));
        if (!sourceExists) {
          assert.ok(dom.window.document.body.textContent.includes('Saved source video is no longer available'));
          assert.equal(button('Run task').disabled, true);
        }
        assert.ok(!scripts.some(script => script.includes('selects.ai.submit')));
      }
    });
    await t.test('one explicit editor action prepares masks before an editable layered Draft without importing a foreground movie', async () => {
      await reset(); const sdk = consumerSdk(); await prepareMatte(sdk);
      const submission = sdk.scripts.find(input => input.script.includes('selects.ai.submit'));
      assert.ok(submission.script.includes('"outputMode":"alpha-frames"'));
      assert.equal(button('Open in editor').disabled, false);
      assert.equal(button('Import foreground'), null); assert.equal(button('Create layered Draft'), null);
      assert.ok(!sdk.scripts.some(input => input.script.includes('selects.ai.prepareMatte') || input.script.includes('createDraft')));
      await click('Open in editor');
      const imported = sdk.scripts.find(input => input.script.includes('selects.ai.prepareMatte'));
      assert.equal(imported.allowCommit, true); assert.ok(!imported.script.includes('createDraft'));
      const create = sdk.scripts.find(input => input.script.includes('createDraft'));
      assert.equal(create.allowCommit, true);
      assert.ok(create.script.includes('resourceId:matte.sourceResourceId,sourceRange:matte.sourceRange'));
      assert.ok(create.script.includes('selects.ai.prepareMatte'));
      assert.equal((create.script.match(/overlayResource/g) || []).length, 2);
      assert.equal((create.script.match(/rangeAtFrames/g) || []).length, 2, 'Re-read the live Span after the background edit');
      assert.ok(create.script.includes(`p.resource(${JSON.stringify(BG)})`));
      assert.ok(create.script.includes('p.resource(matte.sourceResourceId)'));
      assert.ok(create.script.includes('sourceStartSeconds:matte.sourceRange.startSeconds'));
      assert.ok(create.script.includes('addVideoEffect'));
      assert.ok(!create.script.includes('importArtifact'));
      assert.ok(create.script.includes('commitAll')); assert.ok(!create.script.includes('openDraft'));
      const saved = JSON.parse(storage.getItem(recoveryKey('A', 'person.matte')));
      assert.equal(saved.draftAttempt.status, 'saved'); assert.equal(saved.draftAttempt.draftId, 'draft-persistent-id');
      assert.ok(!JSON.stringify(saved).includes('r9'), 'App-lifetime Resource aliases must not be persisted');
      assert.equal(sdk.scripts.filter(input => input.script.includes('openDraft')).length, 1);
      assert.ok(sdk.scripts.indexOf(imported) < sdk.scripts.indexOf(create));
      await click('Open in editor');
      assert.equal(sdk.scripts.filter(input => input.script.includes('createDraft')).length, 1);
      assert.equal(sdk.scripts.filter(input => input.script.includes('selects.ai.prepareMatte') && !input.script.includes('createDraft')).length, 1);
      assert.equal(sdk.scripts.filter(input => input.script.includes('openDraft')).length, 2);
      assert.ok(sdk.scripts.at(-1).script.includes('selects.editor.openDraft'));
    });
    for (const alphaEncoding of ['grayscale-png-8bit', 'grayscale-avif-8bit']) await t.test(`opens the existing long fractional-rate ${alphaEncoding} result without exceeding the source grid or dropping its last frame`, async () => {
      await reset(); const count = 2878, fps = 24000 / 1001, sourceEnd = count / fps;
      const foreground = { sourceStartSeconds: 0, durationSeconds: count * 1001 / 24000,
        frameCount: count, frameRate: { numerator: 24000, denominator: 1001 } };
      assert.ok(foreground.durationSeconds > sourceEnd, 'The real manifest duration is one ULP above the strict SDK source bound');
      assert.equal(Math.round(120 * fps), count - 1, 'Clamping to the requested seconds would discard the last decoded frame');
      const input = { runtimeId: 'selects-ai-runtime', projectId: 'A', resourceId: UUID_A, requestKey: 'long-matte-existing',
        task: 'person.matte', sourceRange: { startSeconds: 0, endSeconds: 120 }, options: { outputMode: 'foreground-video',
          ...(alphaEncoding === 'grayscale-avif-8bit' ? { alphaEncoding } : {}) } };
      storage.setItem(recoveryKey('A', 'person.matte'), JSON.stringify({ version: 1, input, workflowId: 'ai:matte-job' }));
      let insertedFrames = 0, insertions = 0, commits = 0; const overlays = [], effects = [];
      const extension = alphaEncoding === 'grayscale-avif-8bit' ? 'avif' : 'png';
      const masks = Array.from({ length: count }, (_, index) => ({ index, sourceTimeSeconds: index / fps, url: `local://mask/${index}.${extension}` }));
      const prepared = { ...preparedMatte, alphaEncoding, sourceRange: { startSeconds: 0, endSeconds: sourceEnd }, frames: masks };
      const draft = {
        insertResource: async opts => {
          assert.equal(opts.resourceId, UUID_A, 'The original Resource remains the Main audio/video source');
          const range = opts.sourceRange;
          // SDK timeline-edit.ts compares to the placement source frame-grid
          // quotient before rounding either endpoint; inventory seconds differ.
          if (!range || range.startSeconds < 0 || range.endSeconds <= range.startSeconds || range.endSeconds > sourceEnd)
            throw new Error('invalid_source_range: endSeconds exceeds source duration');
          assert.equal(range.startSeconds, 0); assert.equal(range.endSeconds, sourceEnd);
          insertedFrames = Math.round(range.endSeconds * fps) - Math.round(range.startSeconds * fps); insertions++;
          return {};
        },
        meta: async () => ({ fps, durationFrames: insertedFrames, durationSeconds: insertedFrames / fps }),
        rangeAtFrames: async (startFrame, endFrame) => {
          assert.equal(startFrame, 0); assert.equal(endFrame, count); return { startFrame, endFrame };
        },
        overlayResource: async opts => { overlays.push(opts); return {}; },
        clips: async () => [{ clipId: 1, trackKind: 'main' }, ...(overlays.length ? [{ clipId: 2, trackKind: 'video' }] : []),
          ...(overlays.length > 1 ? [{ clipId: 3, trackKind: 'video' }] : [])],
        addVideoEffect: async opts => { effects.push(opts); return {}; },
        commitAll: async () => {
          assert.equal(insertedFrames, count); assert.equal(overlays.length, 2); assert.equal(effects.length, 1); commits++;
          return { createdDraftId: 'long-fractional-draft' };
        },
      };
      const project = { readFootage: async () => ({ drafts: [] }), createDraft: async () => draft, resource: id => ({ id }) };
      const base = consumerSdk();
      const sdk = { ...base, call: async () => [{ ...row(UUID_A, 'Long FHD source'), durationSeconds: 120.037 },
        { resourceId: BG, name: 'Blue background', type: 'Image' }], runScript: async request => {
        if (request.script.includes('createDraft')) {
          base.scripts.push(request);
          const build = esbuild.transformSync(`async function create(selects) {${request.script}}`, { loader: 'ts', format: 'cjs' });
          return answer(await new Function('selects', `${build.code}\nreturn create(selects);`)({ project: id => {
            assert.equal(id, 'A'); return project;
          }, ai: { job: () => ({ result: async () => ({ files: { manifest: MANIFEST } }) }), prepareMatte: async (file, projectId) => {
            assert.deepEqual(file, MANIFEST); assert.equal(projectId, 'A'); return prepared;
          } } }));
        }
        if (request.script.includes('selects.ai.prepareMatte')) {
          base.scripts.push(request);
          const build=esbuild.transformSync(`async function prepare(selects) {${request.script}}`,{loader:'ts',format:'cjs'});
          const value=await new Function('selects',`${build.code}\nreturn prepare(selects);`)({ai:{
            job:()=>({result:async()=>({files:{manifest:MANIFEST}})}),prepareMatte:async()=>prepared,
          }});
          assert.equal(value.frameCount,count); assert.equal(value.frames,undefined);
          assert.ok(Buffer.byteLength(JSON.stringify(value))<1024,'Thousands of durable URLs must not cross the Panel inline result limit');
          return answer(value);
        }
        if (request.script.includes('job.result()')) {
          base.scripts.push(request); return answer({ ...matteResult, data: { frameCount: count, frames: [], foregroundVideo: foreground } });
        }
        return base.runScript(request);
      } };
      await mount(sdk, 'A'); await click('Remove background');
      assert.equal(durationField().value, '120'); assert.ok(text().includes('2878 frames processed'));
      await click('Open in editor');
      assert.equal(insertions, 1, text()); assert.equal(insertedFrames, count); assert.equal(commits, 1);
      assert.deepEqual(overlays.map(overlay => overlay.resource.id), [BG, UUID_A]);
      assert.ok(overlays.every(overlay => overlay.over.startFrame === 0 && overlay.over.endFrame === count));
      assert.equal(overlays[1].sourceStartSeconds, 0);
      assert.ok(!base.scripts.some(request => request.script.includes('selects.ai.submit')), 'The successful long job is reused without inference');
      assert.equal(base.scripts.filter(request => request.script.includes('selects.ai.prepareMatte') && !request.script.includes('createDraft')).length, 1);
      assert.equal(effects[0].clip.clipId, 3); assert.equal(effects[0].parameters.frames.length, count);
      assert.equal(effects[0].parameters.sourceEndSeconds, sourceEnd);
      assert.ok(!base.scripts.some(request => request.script.includes('importArtifact')), 'No foreground MOV Resource is adopted');
      assert.ok(base.scripts.at(-1).script.includes('selects.editor.openDraft("long-fractional-draft")'));
      assert.equal(JSON.parse(storage.getItem(recoveryKey('A', 'person.matte'))).draftAttempt.draftId, 'long-fractional-draft');
      // Execute the exact RawTSX effect emitted by the real Panel. Its clock
      // is source-relative, so a trim/seek does not replay mask frame zero.
      const effectModule = { exports: {} }; let effectFrame = 0, effectFps = fps;
      const effectCode = await esbuild.transform(effects[0].tsxCode, { loader: 'tsx', format: 'cjs', jsx: 'transform' });
      new Function('require', 'module', 'exports', effectCode.code)(name => name === 'react' ? React : {
        AbsoluteFill: 'mask-frame', useCurrentFrame: () => effectFrame, useVideoConfig: () => ({ fps: effectFps }),
      }, effectModule, effectModule.exports);
      const Source = () => h('video');
      const renderMask = frame => { effectFrame = frame; return effectModule.exports.default({ Source, data: effects[0].parameters }); };
      for (const frame of [0, 1439, count - 1]) {
        const output = renderMask(frame);
        assert.equal(output.props.style.maskMode, 'luminance', 'Opaque grayscale images need luminance rather than alpha masking');
        assert.equal(output.props.style.maskImage, `url(${JSON.stringify(masks[frame].url)})`);
        assert.equal(output.props.children.type, Source, 'The original pixels remain the effect input');
      }
      assert.equal(renderMask(count), null, 'Do not expose an unmasked source outside the adopted range');
      effectFrame = 1; effectFps = 30;
      const crossRate = { ...effects[0].parameters, sourceStartSeconds: 0.25, sourceEndSeconds: 1,
        frames: [{ sourceTimeSeconds: 0.25, url: 'local://first.png' }, { sourceTimeSeconds: 0.291708, url: 'local://second.png' }] };
      // A mismatched editor FPS still selects by source PTS, never by array ordinal.
      const atFractional = effectModule.exports.default({ Source, data: crossRate });
      assert.equal(atFractional.props.style.maskImage, 'url("local://first.png")');
      effectFrame = 2;
      assert.equal(effectModule.exports.default({ Source, data: crossRate }).props.style.maskImage, 'url("local://second.png")');
    });
    await t.test('a preparation failure or source mismatch never records an unknown Draft or starts a commit', async () => {
      for (const outcome of [error('AI_ARTIFACT_TAMPERED','The masks cannot be verified'),answer({...preparedMatte,sourceResourceId:UUID_B}),
          answer({...preparedMatte,alphaEncoding:'rgba'})]) {
        await reset(); const base=consumerSdk();
        const sdk={...base,runScript:request=>{
          if(request.script.includes('selects.ai.prepareMatte')&&!request.script.includes('createDraft')) {
            base.scripts.push(request); return Promise.resolve(outcome);
          }
          return base.runScript(request);
        }};
        await prepareMatte(sdk); await click('Open in editor');
        assert.ok(!base.scripts.some(request=>request.script.includes('createDraft')||request.script.includes('importArtifact')));
        assert.equal(JSON.parse(storage.getItem(recoveryKey('A','person.matte'))).draftAttempt,undefined);
        assert.equal(button('Run task').disabled,false,'A pre-commit preparation failure must not invent an unknown commit');
        assert.equal(button('Open in editor').disabled,false,'The same artifact can be prepared again explicitly');
      }
    });
    await t.test('blocks layered Draft creation without a Project background image', async () => {
      await reset(); const sdk = consumerSdk({ call: async () => [row(UUID_A, 'A video')] });
      await prepareMatte(sdk);
      assert.equal(button('Open in editor').disabled, true);
      assert.ok(dom.window.document.body.textContent.includes('Add an image to this Project'));
    });
    await t.test('does not persist or apply a late mask preparation to another Project', async () => {
      await reset(); let finishImport; const base = consumerSdk();
      const sdk = { ...base, runScript: input => input.script.includes('selects.ai.prepareMatte') ? new Promise(resolve => { finishImport = resolve; }) : base.runScript(input) };
      await prepareMatte(sdk); await click('Open in editor'); await mount(sdk, 'B');
      finishImport(answer({ resourceId: IMPORTED })); await flush();
      assert.ok(!dom.window.document.body.textContent.includes(`Foreground Resource: ${IMPORTED}`));
      assert.equal(storage.getItem(recoveryKey('B', 'person.matte')), null);
      assert.ok(!base.scripts.some(input => input.script.includes('createDraft') || input.script.includes('openDraft')),
        'A detached import must not continue into a Draft edit or editor navigation');
    });
    await t.test('retains a missing commit acknowledgment across reopening and inspects instead of creating again', async () => {
      await reset(); let visible = false, creates = 0; const base = consumerSdk();
      const sdk = { ...base,
        call: async (method, project) => method === 'readFootage' ? { drafts: visible ? [{ sequenceId: 'recovered-draft-id', name: 'AI Runtime layered · ai:matte-job' }] : [] } : base.call(method, project),
        runScript: async input => {
          if (input.script.includes('createDraft')) { creates++; return error('COMMIT_TRANSPORT_LOST', 'Commit acknowledgment lost'); }
          return base.runScript(input);
        } };
      await prepareMatte(sdk); await click('Open in editor');
      assert.equal(button('Run task').disabled, true);
      await unmount(); await mount(sdk, 'A'); await click('Remove background');
      assert.ok(button('Open in editor'));
      await click('Open in editor');
      assert.ok(dom.window.document.body.textContent.includes('No saved Draft is visible yet'));
      assert.equal(creates, 1); assert.equal(button('Run task').disabled, true);
      visible = true; await click('Open in editor');
      assert.equal(creates, 1);
      assert.equal(JSON.parse(storage.getItem(recoveryKey('A', 'person.matte'))).draftAttempt.draftId, 'recovered-draft-id');
      assert.equal(base.scripts.filter(input => input.script.includes('selects.ai.prepareMatte') && !input.script.includes('createDraft')).length, 1);
      assert.ok(base.scripts.at(-1).script.includes('openDraft'));
    });
    await t.test('saves a late Draft acknowledgment under its original Project only', async () => {
      await reset(); let completeDraft; const base = consumerSdk();
      const sdk = { ...base, runScript: input => input.script.includes('createDraft') ? new Promise(resolve => { completeDraft = resolve; }) : base.runScript(input) };
      await prepareMatte(sdk); await click('Open in editor'); await mount(sdk, 'B');
      completeDraft(answer({ draftId: 'A-draft-id' })); await flush();
      assert.ok(!dom.window.document.body.textContent.includes('A-draft-id'));
      assert.equal(JSON.parse(storage.getItem(recoveryKey('A', 'person.matte'))).draftAttempt.draftId, 'A-draft-id');
      assert.equal(storage.getItem(recoveryKey('B', 'person.matte')), null);
      assert.ok(!base.scripts.some(input => input.script.includes('openDraft')), 'A late A-project commit must not navigate B');
    });
    await t.test('requires recovery storage before dispatching a new Draft', async () => {
      await reset(); const sdk = consumerSdk(); await prepareMatte(sdk);
      const original = storage.setItem;
      storage.setItem = () => { throw new Error('Storage unavailable'); };
      try {
        await click('Open in editor');
        assert.ok(dom.window.document.body.textContent.includes('Draft creation is blocked'));
        assert.ok(!sdk.scripts.some(input => input.script.includes('createDraft')));
      } finally { storage.setItem = original; }
    });
    const legacyInput = () => ({ runtimeId: 'selects-ai-runtime', projectId: 'A', resourceId: UUID_A,
      requestKey: 'legacy-matte-key', task: 'person.matte', sourceRange: { startSeconds: 0, endSeconds: 2 }, options: { outputMode: 'foreground-video' } });
    const legacyRecord = attempt => ({ version: 1, input: legacyInput(), workflowId: 'ai:legacy-matte',
      draftAttempt: { workflowId: 'ai:legacy-matte', name: 'AI Runtime layered \u00b7 ai:legacy-matte', backgroundId: BG, ...attempt } });
    await t.test('opens or inspects a durable legacy Draft even when its AI job or result is unavailable', async () => {
      for (const attemptStatus of ['saved', 'unknown']) for (const failure of ['missing-job', 'status-outage', 'missing-result']) {
        await reset(); const draftId = 'durable-legacy-draft';
        const original = JSON.stringify(legacyRecord({ status: attemptStatus, ...(attemptStatus === 'saved' ? { draftId } : {}) }));
        storage.setItem('selects-ai-runtime:lab:A', original);
        const scripts = [], footageReads = [];
        const sdk = { call: async (method, project) => {
          if (method !== 'readFootage') return [];
          footageReads.push(project);
          return { drafts: [{ sequenceId: draftId, name: legacyRecord({}).draftAttempt.name }] };
        }, runScript: async input => {
          scripts.push(input.script);
          if (input.script.includes('openDraft')) return answer({ requested: true, sequenceId: draftId });
          if (input.script.includes('job.result()')) return error('AI_RESULT_UNAVAILABLE', 'The result cache is unavailable');
          assert.ok(input.script.includes('.status()'));
          return failure === 'missing-result' ? answer(status('ai:legacy-matte', 'succeeded'))
            : error(failure === 'missing-job' ? 'AI_JOB_NOT_FOUND' : 'AI_STATUS_TRANSPORT', 'The AI job is unavailable');
        } };
        await mount(sdk, 'A'); await click('Remove background');
        assert.ok(!text().includes('48 frames processed')); assert.equal(button('Open in editor').disabled, false);
        await click('Open in editor');
        assert.equal(footageReads.length, attemptStatus === 'unknown' ? 1 : 0);
        assert.equal(scripts.filter(script => script.includes('openDraft')).length, 1);
        assert.ok(scripts.at(-1).includes(draftId));
        assert.ok(!scripts.some(script => script.includes('selects.ai.prepareMatte') || script.includes('createDraft') || script.includes('selects.ai.submit')));
        const saved = JSON.parse(storage.getItem(recoveryKey('A', 'person.matte')));
        assert.equal(saved.draftAttempt.status, 'saved'); assert.equal(saved.draftAttempt.draftId, draftId);
        assert.equal(saved.workflowId, 'ai:legacy-matte'); assert.deepEqual(saved.input, legacyInput());
        assert.equal(storage.getItem('selects-ai-runtime:lab:A'), original);
      }
    });
    await t.test('opens a legacy saved matte Draft without importing or creating again and keeps legacy storage unchanged', async () => {
      await reset(); const original = JSON.stringify(legacyRecord({ status: 'saved', draftId: 'legacy-persistent-draft' }));
      storage.setItem('selects-ai-runtime:lab:A', original);
      const base = consumerSdk(), sdk = { ...base, runScript: input => input.script.includes('.status()')
        ? answer(status('ai:legacy-matte', 'succeeded')) : base.runScript(input) };
      await mount(sdk, 'A'); await click('Remove background'); await click('Open in editor');
      assert.equal(base.scripts.filter(input => input.script.includes('openDraft')).length, 1);
      assert.ok(base.scripts.at(-1).script.includes('legacy-persistent-draft'));
      assert.ok(!base.scripts.some(input => input.script.includes('selects.ai.prepareMatte') || input.script.includes('createDraft') || input.script.includes('selects.ai.submit')));
      assert.equal(storage.getItem('selects-ai-runtime:lab:A'), original);
    });
    await t.test('inspects a legacy unknown Draft once and writes its recovered persistent identity to the matching task key before opening', async () => {
      await reset(); const original = JSON.stringify(legacyRecord({ status: 'unknown' }));
      storage.setItem('selects-ai-runtime:lab:A', original);
      const base = consumerSdk(), reads = [];
      const sdk = { ...base, call: async (method, project) => {
        reads.push({ method, project });
        return method === 'readFootage' ? { drafts: [{ sequenceId: 'legacy-recovered-draft', name: legacyRecord({}).draftAttempt.name }] } : base.call(method, project);
      }, runScript: input => input.script.includes('.status()') ? answer(status('ai:legacy-matte', 'succeeded')) : base.runScript(input) };
      await mount(sdk, 'A'); await click('Remove background'); await click('Open in editor');
      assert.equal(reads.filter(read => read.method === 'readFootage').length, 1);
      const saved = JSON.parse(storage.getItem(recoveryKey('A', 'person.matte')));
      assert.equal(saved.workflowId, 'ai:legacy-matte'); assert.deepEqual(saved.input, legacyInput());
      assert.equal(saved.draftAttempt.status, 'saved'); assert.equal(saved.draftAttempt.draftId, 'legacy-recovered-draft');
      assert.equal(storage.getItem('selects-ai-runtime:lab:A'), original);
      assert.ok(base.scripts.at(-1).script.includes('legacy-recovered-draft'));
      assert.ok(!base.scripts.some(input => input.script.includes('selects.ai.prepareMatte') || input.script.includes('createDraft') || input.script.includes('selects.ai.submit')));
    });
    for (const count of [0, 2]) await t.test(`a legacy unknown Draft with ${count} matching saved Drafts remains pending without another creation`, async () => {
      await reset(); const original = JSON.stringify(legacyRecord({ status: 'unknown' }));
      storage.setItem('selects-ai-runtime:lab:A', original);
      const base = consumerSdk(), sdk = { ...base, call: async (method, project) => method === 'readFootage'
        ? { drafts: Array.from({ length: count }, (_, index) => ({ sequenceId: `ambiguous-${index}`, name: legacyRecord({}).draftAttempt.name })) }
        : base.call(method, project),
        runScript: input => input.script.includes('.status()') ? answer(status('ai:legacy-matte', 'succeeded')) : base.runScript(input) };
      await mount(sdk, 'A'); await click('Remove background'); await click('Open in editor');
      assert.equal(button('Run task').disabled, true);
      assert.ok(text().includes(count ? 'Multiple matching Drafts' : 'No saved Draft is visible yet'));
      assert.ok(!base.scripts.some(input => input.script.includes('selects.ai.prepareMatte') || input.script.includes('createDraft') || input.script.includes('openDraft')));
      assert.equal(storage.getItem('selects-ai-runtime:lab:A'), original);
    });
    await t.test('prefers an existing task recovery record over legacy data without changing the legacy record or the other task', async () => {
      await reset(); const original = JSON.stringify(legacyRecord({ status: 'saved', draftId: 'stale-legacy-draft' }));
      storage.setItem('selects-ai-runtime:lab:A', original);
      const newer = { version: 1, input: { ...legacyInput(), requestKey: 'newer-matte-key', resourceId: UUID_B }, workflowId: 'ai:newer-matte' };
      storage.setItem(recoveryKey('A', 'person.matte'), JSON.stringify(newer));
      const scripts = [], sdk = consumerSdk({ call: async () => [row(UUID_A, 'A'), row(UUID_B, 'B')], runScript: async input => {
        scripts.push(input.script); return answer(input.script.includes('job.result()') ? matteResult : status('ai:newer-matte', 'succeeded'));
      } });
      await mount(sdk, 'A'); assert.equal(button('Run task').disabled, false, 'A legacy matte job cannot lock the face channel');
      await click('Remove background'); assert.equal(field('Source video').value, UUID_B);
      assert.ok(scripts.every(script => script.includes('ai:newer-matte'))); assert.ok(!scripts.some(script => script.includes('selects.ai.submit')));
      assert.equal(storage.getItem(recoveryKey('A')), null);
      assert.deepEqual(JSON.parse(storage.getItem(recoveryKey('A', 'person.matte'))), newer);
      assert.equal(storage.getItem('selects-ai-runtime:lab:A'), original);
    });
    await t.test('checks the actual consumer script literals against the shipped SDK, including unknown JSON', () => {
      const invalid = typecheckQueryScript(`const r=await selects.ai.job('ai:job','A').result();
        const d=await selects.ai.readJSON(r.files.detections,'A'); return d.samples;`);
      assert.equal(invalid.ok, false, 'The same SDK checker must reject direct access to unknown JSON');
      assert.ok(scriptChecks.some(row => row.script.includes('selects.ai.submit')));
      assert.ok(scriptChecks.some(row => row.script.includes('.cancel()')));
      assert.ok(scriptChecks.some(row => row.script.includes('job.result()')));
      for (const { script, checked } of scriptChecks) assert.deepEqual(checked, { ok: true }, `${JSON.stringify(checked)}\n${script}`);
      const effectScript=scriptChecks.find(row=>row.script.includes('addVideoEffect')).script;
      assert.equal(typecheckQueryScript(effectScript,{generatedMediaAuthoring:false}).ok,false, 'The existing effect authoring access policy remains enforced');
    });
    await t.test('executes the typed literal projection for both face and matte output contracts', async () => {
      const { script } = scriptChecks.find(row => row.script.includes('job.result()'));
      const compiled = await esbuild.transform(`async function project(selects) {${script}}`, { loader: 'ts', format: 'cjs' });
      const project = new Function('selects', `${compiled.code}\nreturn project(selects);`);
      const samples = Array.from({ length: 1000 }, (_, index) => ({ index, sourceTimeSeconds: index, faces: Array(15).fill({ score: 0.9 }) }));
      const frames = Array.from({ length: 1000 }, (_, index) => ({ index, sourceTimeSeconds: index, file: `alpha/${index}.png` }));
      const runProjection = (task, document) => project({ ai: {
        job: () => ({ result: async () => ({ task, files: task === 'faces.detect' ? { detections: {} } : { manifest: {} }, metrics: {}, diagnostics: {} }) }),
        readJSON: async () => document,
      } });
      const face = await runProjection('faces.detect', { frameSize: { width: 10, height: 10 }, samples });
      assert.equal(face.data.sampleCount, 1000); assert.equal(face.data.faceCount, 15000);
      assert.equal(face.data.samples.length, 3); assert.equal(face.data.samples[0].faces.length, 10);
      const matte = await runProjection('person.matte', { frameSize: { width: 10, height: 10 }, frames });
      assert.equal(matte.data.frameCount, 1000); assert.equal(matte.data.frames.length, 3);
    });
  } finally {
    await unmount(); dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  }
});
