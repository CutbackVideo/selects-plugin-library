import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const ts = require(require.resolve('typescript', {paths: [root, process.env.SELECTS_DEV_REPO || path.resolve(root, '../cutback-client')]}));
const source = fs.readFileSync(path.join(root, 'plugins/clip-studio/panel.tsx'), 'utf8');
const options = {jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true};
function transpile(text) {
  const result = ts.transpileModule(text, {compilerOptions: options, reportDiagnostics: true});
  assert.deepEqual(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), []);
  return result.outputText;
}
const ast = ts.createSourceFile('panel.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function fn(name) {
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(found, name);
  return transpile(found);
}
const copy = value => JSON.parse(JSON.stringify(value));
const react = {createElement: (type, props, ...children) => ({type, props: {...props, children}}), Fragment: 'fragment'};
function harness(panelSource = source) {
  const ctx = vm.createContext({exports: {}, require: () => react, TextEncoder, TextDecoder, Uint8Array, console, setTimeout, clearTimeout});
  vm.runInContext(transpile(panelSource) + '\nthis.api = {APP_CONFIG, BUILTIN_TEMPLATES, TEMPLATE_DEFAULTS, SCRIPT_BUILD, SCRIPT_TRANSCRIPT, STRINGS, resolveTemplates, makeStore, frameParams, captionParams, editableFrame, editableCaption, cropTransform, PreviewFrame, PreviewCaption, ClipsPanel, TemplateEditor};', ctx);
  Object.assign(ctx, {S: ctx.api.STRINGS.en, lang: 'en', guard: value => value});
  vm.runInContext(fn('identify') + '\n' + fn('choose'), ctx);
  return ctx;
}

test('installed panel and embedded scripts transpile; motion preview uses the export component', () => {
  const h = harness();
  for (const [constant, component, preview] of [
    ['FRAME_TSX', 'ClipFrame', h.api.PreviewFrame],
    ['CAPTION_TSX', 'ClipCaption', h.api.PreviewCaption],
  ]) {
    const code = JSON.parse(h.api.SCRIPT_BUILD.match(new RegExp(`const ${constant}: string = (.*);`))[1]);
    const exported = vm.createContext({exports: {}, require: () => react});
    vm.runInContext(transpile(code), exported);
    const data = h.api.frameParams(h.api.BUILTIN_TEMPLATES[0], 'A useful insight', 'The context');
    assert.deepEqual(copy(preview({data})), copy(exported.exports.default({data})), component);
  }
  transpile(h.api.SCRIPT_TRANSCRIPT);
  transpile(h.api.SCRIPT_BUILD);
});

test('a missing base template inherits neutral defaults and keeps saved overrides', () => {
  const h = harness();
  h.api.BUILTIN_TEMPLATES[0].prompt.role = 'Customer-specific editor';
  h.api.BUILTIN_TEMPLATES[0].headline.color1 = '#111111';
  const list = h.api.resolveTemplates([
    {id: 'standard', headline: {color2: '#123456'}},
    {id: 'custom', name: 'My template', baseId: 'removed', headline: {color1: '#ABCDEF'}},
  ]);
  assert.equal(list[0].headline.color2, '#123456');
  assert.equal(list[0].modified, true);
  assert.equal(list[1].headline.color1, '#ABCDEF');
  assert.equal(list[1].prompt.role, h.api.TEMPLATE_DEFAULTS.prompt.role);
  assert.equal(list[1].builtIn, false);
  assert.equal(h.api.resolveTemplates([])[0].headline.color2, '#FACC15', 'reset restores the shipped template');
});

test('copied apps with different IDs keep templates and jobs in separate namespaces', async () => {
  const alphaApp = harness(source.replaceAll('clip-studio', 'alpha-clips'));
  const betaApp = harness(source.replaceAll('clip-studio', 'beta-clips'));
  const disk = new Map();
  const files = {
    homedir: () => '/fixture', join: (...parts) => parts.join('/'),
    writeFile: async (p, bytes) => disk.set(p, bytes),
    readFolder: async folder => [...disk.entries()].filter(([p]) => p.startsWith(folder + '/')).map(([p, bytes]) => ({path: p, bytes})),
    remove: async p => disk.delete(p),
  };
  const alpha = alphaApp.api.makeStore(files);
  const beta = betaApp.api.makeStore(files);
  await alpha.put('templates', 'standard', {id: 'standard', name: 'Alpha'});
  await alpha.put('jobs', 'run1', {id: 'run1', key: 'standard'});
  assert.equal((await alpha.list('templates'))[0].name, 'Alpha');
  assert.equal((await beta.list('templates')).length, 0);
  assert.equal((await beta.list('jobs')).length, 0);
  await beta.put('templates', 'standard', {id: 'standard', name: 'Beta'});
  await alpha.del('templates', 'standard');
  assert.equal((await beta.list('templates'))[0].name, 'Beta');
  assert.notEqual(alpha.media, beta.media);
});

test('neutral auto detection works without a customer program or an AI classification call', async () => {
  const h = harness();
  h.sdk = {askAI: () => assert.fail('No classification is necessary for a neutral template')};
  assert.equal((await h.identify('An interview', [[0, 10, 'A useful insight']], h.api.BUILTIN_TEMPLATES)).key, 'standard');
  h.api.APP_CONFIG.defaultTemplate = null;
  assert.equal((await h.identify('Unknown', [], h.api.BUILTIN_TEMPLATES)).key, null);
});

test('customer program detection selects its template and falls back only when configured', async () => {
  const h = harness();
  const show = {...copy(h.api.BUILTIN_TEMPLATES[0]), id: 'science', name: 'Science Show', detect: {keywords: ['Science Show'], exclude: [], host: 'A science discussion'}};
  const list = [...h.api.BUILTIN_TEMPLATES, show];
  h.sdk = {askAI: () => assert.fail('Title should match before AI')};
  assert.equal((await h.identify('Science Show episode 8', [], list)).key, 'science');
  h.sdk.askAI = async () => ({text: '{"program":"science","reason":"The host matches"}'});
  assert.equal((await h.identify('Episode 8', [], list)).key, 'science');
  h.sdk.askAI = async () => ({text: '{"program":"unknown","reason":"No match"}'});
  assert.equal((await h.identify('Episode 8', [], list)).key, 'standard');
  h.api.APP_CONFIG.defaultTemplate = null;
  assert.equal((await h.identify('Episode 8', [], list)).key, null);
});

test('selection uses the customer editorial instructions and bounds returned source ranges', async () => {
  const h = harness();
  const template = copy(h.api.BUILTIN_TEMPLATES[0]);
  template.prompt.good = 'Prefer practical engineering examples';
  let prompt;
  h.sdk = {askAI: async args => {
    prompt = args.prompt;
    return {text: JSON.stringify({clips: [
      {headline1: 'Example', headline2: 'Context', segments: [[-1, 14], [30, 150]]},
      {headline1: 'Invalid', segments: [[60, 60]]},
      {headline1: 'Second', segments: [[20, 29]]},
    ]})};
  }};
  const result = await h.choose(template, 'Interview', [[0, 14, 'Hello']], 100, 'manual', 1, 'Keep the speaker context');
  assert.match(prompt, /Prefer practical engineering examples/);
  assert.match(prompt, /Keep the speaker context/);
  assert.match(prompt, /source video's language/);
  assert.doesNotMatch(prompt, /Chosun|TikTok|prosecutor/);
  assert.equal(result.clips.length, 1);
  assert.deepEqual(copy(result.clips[0].segments), [[0, 14], [30, 100]]);
});

function draftHost() {
  const records = {graphics: [], transforms: [], commits: [], created: 0};
  const words = ['Here', 'is', 'one', 'useful', 'idea.'].map((text, i) => ({text, startFrame: i * 30, endFrame: i * 30 + 24, sourceStartFrame: i * 30}));
  const clips = [{resourceId: 'video1', trackKind: 'main', endFrame: 150}];
  const draft = {
    insertResource: async () => {}, words: async () => words,
    silenceSpans: async () => [], remove: async () => {},
    setFrameSize: async size => { records.size = size; },
    clips: async () => clips, setClipTransform: async value => records.transforms.push(value),
    rangeAtFrames: async (startFrame, endFrame) => ({startFrame, endFrame}),
    meta: async () => ({fps: 30, name: records.name, durationSeconds: 5}),
    addMotionGraphic: async graphic => records.graphics.push(graphic),
    commitAll: async message => {records.commits.push(message); return {createdDraftId: 'draft1'};},
  };
  const project = {
    resources: async () => [{resourceId: 'video1', name: 'Interview.mp4'}],
    resource: () => ({meta: async () => ({fps: 30, durationSeconds: 180}), words: async () => words}),
    createDraft: async ({name}) => {records.created++; records.name = name; return draft;},
    meta: async () => ({draftIds: records.commits.length ? ['draft1'] : []}),
  };
  return {records, selects: {project: () => project, draft: () => draft}};
}

test('embedded build script creates an editable vertical Draft with customer visuals and captions', async () => {
  const h = harness(), host = draftHost(), template = copy(h.api.BUILTIN_TEMPLATES[0]);
  template.headline.color1 = '#123456';
  template.logo = {mode: 'image', image: 'data:image/png;base64,AA==', width: 300};
  const params = {
    projectId: 'project1', resourceId: 'stale-alias', resourceName: 'Interview.mp4', name: 'Customer clip',
    segments: [[0, 5]], transform: h.api.cropTransform(template.layout),
    frame: h.api.frameParams(template, 'A useful idea', 'The explanation'), editableFrame: h.api.editableFrame(h.S),
    captions: true, caption: h.api.captionParams(template), editableCaption: h.api.editableCaption(h.S),
    removeFillers: true, removeSilences: true, lineMax: 24, fixes: [],
  };
  const code = h.api.SCRIPT_BUILD.replace('const P: any = __P__;', 'const P: any = ' + JSON.stringify(params) + ';');
  h.selects = host.selects;
  const result = await vm.runInContext(transpile('(async () => {' + code + '})()'), h);
  assert.equal(result.draftId, 'draft1');
  assert.deepEqual(copy(host.records.size), {width: 1080, height: 1920});
  assert.equal(host.records.transforms.length, 1);
  assert.equal(host.records.graphics[0].parameters.headlineColor1, '#123456');
  assert.equal(host.records.graphics[0].parameters.logoImage, template.logo.image);
  assert.ok(host.records.graphics[0].editableParameters.some(p => p.key === 'headline1'));
  assert.ok(host.records.graphics.slice(1).every(g => g.editableParameters.some(p => p.key === 'text')));
  assert.ok(result.captions > 0);
  assert.equal(host.records.commits[0], 'Clip: Customer clip');
});

test('resume recovers an already committed Draft without creating it twice', async () => {
  const h = harness(), host = draftHost(), jobs = [];
  const state = {};
  for (const name of ['Error', 'Warn', 'Drafts', 'Info', 'Busy', 'RunInfo', 'Step', 'Status', 'Sub', 'Cancelling']) h['set' + name] = value => {state[name] = value;};
  Object.assign(h, {
    projectId: 'project1', runRef: {current: null},
    loadTemplates: async () => h.api.BUILTIN_TEMPLATES,
    saveJob: async job => jobs.push(copy(job)), setJobs: () => {}, loadJobs: () => {}, loadResources: () => {},
    readTranscript: async () => ({lines: [[0, 5, 'Here is one useful idea.']], duration: 180}),
    script: async code => vm.runInContext(transpile('(async () => {' + code + '})()'), Object.assign(h, {selects: host.selects})),
  });
  vm.runInContext(fn('run'), h);
  const job = {id: 'job1', projectId: 'project1', mode: 'project', resourceId: 'video1', resourceName: 'Interview.mp4', analyzed: true, key: 'standard', choice: {clips: [{name: 'Stable saved name', headline1: 'Literal $& example', headline2: 'Context', segments: [[0, 5]]}], fixes: []}};
  await h.run(copy(job));
  assert.equal(state.Error, '');
  assert.equal(jobs.at(-1).done, true);
  assert.equal(host.records.created, 1);
  assert.equal(host.records.graphics[0].parameters.headline1, 'Literal $& example');
  // Simulate losing the persistence reply immediately after the Draft was committed.
  await h.run(copy(job));
  assert.equal(state.Error, '');
  assert.equal(host.records.created, 1);
  assert.equal(jobs.at(-1).built[0].draftId, 'draft1');
});

test('cancelling a pending run keeps its checkpoint and stops before Draft creation', async () => {
  const h = harness(), jobs = [], state = {};
  let started;
  const reading = new Promise(resolve => {started = resolve;});
  for (const name of ['Error', 'Warn', 'Drafts', 'Info', 'Busy', 'RunInfo', 'Step', 'Status', 'Sub', 'Cancelling']) h['set' + name] = value => {state[name] = value;};
  Object.assign(h, {
    projectId: 'project1', runRef: {current: null},
    loadTemplates: async () => h.api.BUILTIN_TEMPLATES,
    saveJob: async job => jobs.push(copy(job)), setJobs: () => {}, loadJobs: () => {}, loadResources: () => {},
    readTranscript: () => {started(); return Promise.race([new Promise(() => {}), h.runRef.current.stop]);},
    script: () => assert.fail('Cancelled before any Draft operation'),
  });
  vm.runInContext(fn('run') + '\n' + fn('cancelRun'), h);
  const pending = h.run({id: 'job1', projectId: 'project1', resourceId: 'video1', analyzed: true});
  await reading;
  h.cancelRun();
  await pending;
  assert.equal(state.Busy, false);
  assert.equal(state.Error, '');
  assert.equal(state.Status, h.S.cancelled);
  assert.equal(jobs.at(-1).resourceId, 'video1');
  assert.equal(jobs.at(-1).done, undefined);
  assert.equal(h.runRef.current, null);
});
