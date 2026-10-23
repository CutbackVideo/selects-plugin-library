import { asyncSdk } from '../../tests/windows_host.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import {createHash} from 'node:crypto';
import { test } from 'node:test';
import { planGallery } from './format.mjs';

const appRoot = process.env.SELECTS_DEV_REPO || (process.env.SBS_PANEL_TEST_MODULES ? path.dirname(process.env.SBS_PANEL_TEST_MODULES) : null);
assert.ok(appRoot, 'Set SELECTS_DEV_REPO to an installed Selects development checkout');
const appRequire = createRequire(path.join(appRoot, 'package.json'));
const React = appRequire('react');
const { JSDOM } = appRequire('jsdom');
const esbuild = appRequire('esbuild');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
const { render, fireEvent, waitFor, cleanup, act } = appRequire('@testing-library/react');
test.afterEach(() => cleanup());

const template = fs.readFileSync(process.env.GALLERY_PANEL_TEMPLATE || path.join(import.meta.dirname, 'panel.template.tsx'), 'utf8');
const nativeMock = `
const readImageDraftFps = () => globalThis.__native.fps();
const verifyAtomicImageDraft = (...args) => globalThis.__native.verify(...args);
const galleryNativeResources = (...args) => globalThis.__native.resources(...args);
const galleryNativeSetFps = (...args) => globalThis.__native.setFps(...args);
const galleryNativePlace = (...args) => globalThis.__native.place(...args);`;
const assetSource=fs.readFileSync(new URL('../../shared/bundled-assets.js',import.meta.url),'utf8');
const formatSource=fs.readFileSync(new URL('./format.mjs',import.meta.url),'utf8').replace('export const REFERENCE','const REFERENCE').replace('export function planGallery','function planGallery');
// These tests own Gallery interactions; source verification endpoints and native
// authoring are explicit mocks. Their real byte/source contracts have separate suites.
const source = template.replace(/\/\/ local-sdk:start[\s\S]*?\/\/ local-sdk:end/, 'function panelLocalClient(sdk) { return sdk; }\nexport default Panel;').replace('/*__SHARED_SCRIPT_BUILDER__*/',
  'const buildScript = input => JSON.stringify(input);' + nativeMock + '\n' + assetSource + '\n' + formatSource);
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
  const resourceListeners = new Set();
  let savedSourceGuard;
  globalThis.__native = {
    fps:async()=>options.fps??60,
    verify:async(sdk,projectId,result)=>{const r=await sdk.runScript({script:JSON.stringify({operation:"verifyCreated",projectId,draftId:result.draftId}),allowCommit:false});if(r.isError||r.result?.status!=="verified")throw Object.assign(new Error("Saved Draft could not be confirmed"),{code:"IMAGE_SAVE_UNVERIFIED"});return result;},
    resources: async (_sdk, _projectId, rows) => {
      nativeCalls.push('resources');
      if (options.missingDimension && rows.some(row => row.resourceId === 'r4')) throw new Error('Tile 5 has no verified image dimensions');
      return { selected: rows.map(row => ({ ...row, nativeResource: {} })) };
    },
    setFps: async () => { nativeCalls.push('fps'); },
    place: async (_sdk, _projectId, _draftId, rows, plan) => {
      nativeCalls.push('place');
      assert.equal(rows.length, 21);
      assert.equal(plan.tiles.length, 21);
      if (options.placeError) throw new Error(options.placeError);
      options.onPlace?.();
    },
  };
  // The host's renderer services: the bundled music is found through FileSystem, the platform through Runtime.
  const sep = options.platform === 'win32' ? '\\' : '/';
  const home = options.platform === 'win32' ? 'C:\\Users\\tester' : '/installed';
  const disk=new Map();
  for(const audio of options.audio??[])disk.set(audio.path,Buffer.from('fixture audio '+audio.resourceId));
  if(!options.musicMissing)disk.set([home,'.selects','skills','photo-gallery-no2','assets','music.mp3'].join(sep),fs.readFileSync(new URL('./assets/music.mp3',import.meta.url)));
  const assetResources=[],assetNodes=[];
  const assetProject={resources:async()=>assetResources,sourceFiles:async()=>({fileTree:assetNodes}),importFiles:async({paths})=>{
    calls.push({input:{operation:'importOwnedMusic',path:paths[0]},allowCommit:true});
    for(const path of paths){assetResources.push({resourceId:'bundled-music',type:'Audio',durationSeconds:853/60});assetNodes.push({resourceId:'bundled-music',type:'audio',path});}
    return {addedResourceIds:['bundled-music']};
  }};
  // Short videos are held by the host's ffmpeg/ffprobe: a source probes at 30 fps, a held output at 60 fps.
  const tools = options.tools || [];
  const probed = path => JSON.stringify({ streams: [/\.tmp$|[0-9a-f]{64}\.mp4$/.test(path)
    ? { codec_type: 'video', codec_name: 'h264', width: 128, height: 96, r_frame_rate: '60/1', avg_frame_rate: '60/1', nb_read_frames: String(options.heldFrames ?? 853) }
    : { codec_type: 'video', codec_name: 'h264', width: 128, height: 96, r_frame_rate: '30/1', avg_frame_rate: '30/1', nb_read_frames: '30' }] });
  dom.window.__DI__ = {
    FileSystem: { join: (...parts) => parts.join(sep), homedir: () => home, mkdirSync: () => {},
      existsSync: path => disk.has(path) || (!options.musicMissing && path.endsWith('SKILL.md')) || /short\.mp4$/.test(path),
      statSync: p => disk.has(p)||/short\.mp4$/.test(p)?{size:disk.get(p)?.length??1000,mtimeMs:1,isDirectory:false}:null, renameSync: (from, to) => {tools.push(['rename', from, to]);disk.set(to,disk.get(from));disk.delete(from);},
      copyFile:async(from,to)=>{disk.set(to,Buffer.from(disk.get(from)??Buffer.alloc(1000)));},
      writeFile: async (p,bytes,options) => {
        if(options?.flag==='wx'&&disk.has(p))throw Object.assign(Error('EEXIST'),{code:'EEXIST'});
        disk.set(p,Buffer.from(bytes));
      }, removeFile: async ({filePath}) => {disk.delete(filePath);},
      readRange: async (p,offset,length) => {
        if(!disk.has(p))throw Object.assign(Error('ENOENT'),{code:'ENOENT'});
        return disk.get(p).subarray(offset,offset+length);
      },
      compareAndReplace: async (p,expected,replacement) => {
        if(!disk.has(p))throw Object.assign(Error('ENOENT'),{code:'ENOENT'});
        if(!disk.get(p).equals(Buffer.from(expected)))return false;
        disk.set(p,Buffer.from(replacement));return true;
      },
      readFile: async p => disk.get(p)??(options.pcm ? Buffer.from(options.pcm.buffer) : Buffer.alloc(0)) },
    Runtime: { getPlatform: () => options.platform || 'darwin',
      runFFprobe: async args => { tools.push(['ffprobe', ...args]); return { stdout: probed(args.at(-1)), stderr: '' }; },
      runFFmpeg: async (args,quiet,signal) => {
        tools.push(['ffmpeg', ...args]);await options.onMediaProcess?.(args,signal);
        if(args.includes('-hash'))return {stdout:'SHA256='+createHash('sha256').update(disk.get(args[args.indexOf('-i')+1])??Buffer.alloc(1000)).digest('hex'),stderr:''};
        if(args.includes('-vf'))disk.set(args.at(-1),Buffer.alloc(1000));
        if(args.includes('f32le'))disk.set(args.at(-1),Buffer.from((options.pcm??new Float32Array(0)).buffer));
        return { stdout: '', stderr: '' };
      } },
  };
  const sdk = {
    on(name, listener) { assert.equal(name,'resourcesChanged');resourceListeners.add(listener);return()=>resourceListeners.delete(listener); },
    maxScriptTimeoutSeconds:options.maxScriptTimeoutSeconds??120,
    ...asyncSdk(dom.window.__DI__),
    runShell: async request => {
      if (options.runShell) return options.runShell(request);
      throw new Error('Unexpected media conversion');
    },
    runScript: async request => {
      if(['Find bundled music Resource','Import bundled music'].includes(request.summary)){
        if(request.allowCommit&&options.musicResponse)return options.musicResponse;
        const result=await new Function('selects','return (async()=>{'+request.script+'})()')({project:()=>assetProject});return {result};
      }
      if(request.script.includes("name:'Gallery frame grid'"))return {result:{fps:options.fps??60}};
      const paged = request.script.startsWith('const value=await(async()=>{');
      const input = JSON.parse(paged ? request.script.slice('const value=await(async()=>{'.length, request.script.indexOf('\n})();const array')) : request.script);
      calls.push({ input, allowCommit: request.allowCommit, timeoutSeconds: request.timeoutSeconds });
      const inventorySnapshot=input.operation==='inspect'?{media:structuredClone(media),audio:structuredClone(options.audio??[])}:null;
      await options.beforeOperation?.(input);
      if (input.operation === options.failOperation) return { isError: true, output: options.failOutput };
      if (options.coldBudget && ((input.operation === 'placeVideosExisting' && input.slotKeys?.length !== 1) ||
          (input.operation === 'styleExisting' && !(input.slotKeys?.length <= 3)))) return { isError: true, output: 'Script deadline of 30s exceeded' };
      if (input.operation === 'inspect') {
        const value = { status: 'inspected', projectId: 'project-1', ...inventorySnapshot };
        return { result: paged ? { array: false, page: value, total: Math.max(media.length, value.audio.length) } : value };
      }
      if (input.operation === 'verifyInputs') return options.inputFailure ? { result: { status: 'notSaved', message: 'The original photo file is missing: Tile 1', code: 'image-source-missing' } } : { result: { status: 'inputsReady', media: input.media, music: input.music } };
      if (input.operation === 'verifyMusic') return options.musicInputFailure ? {result:{status:'notSaved',message:'Selected music changed'}} : {result:{status:'musicReady',music:{...input.music,durationSeconds:input.music.durationSeconds??input.music.durationFrames/60}}};
      if (input.operation === 'importBundledMusic') return options.musicResponse ?? { result: { status: 'musicReady', music: { resourceId: 'bundled-music', path: input.path, durationFrames: 853, startFrame: 0 } } };
      if (input.operation === 'importConverted') return { result: { status: 'prepared', converted: input.converted.map(item =>
        ({ ...item, resourceId: 'held-1', width: 128, height: 96, durationFrames: input.durationFrames, durationSeconds: input.durationFrames/60 })) } };
      if (input.operation === 'preflight') return { result: { status: 'ready', plan: planGallery(input) } };
      if(input.operation==='create'){if(options.coldBudget&&request.timeoutSeconds!==120)return {isError:true,output:'Script deadline exceeded'};if(options.placeError)return {result:{status:'outcomeUnknown',message:options.placeError}};options.onPlace?.();savedSourceGuard={media:input.media,music:input.music,files:[],signature:'UI endpoint fixture'};return {result:{status:'saved',draftId:'draft-new',sourceGuard:savedSourceGuard}};}
      if (input.operation === 'createBase') return { result: { status: 'baseCreated', draftId: 'draft-new' } };
      if (input.operation === 'fillBase') return { result: { status: 'baseFilled', draftId: 'draft-new' } };
      if (input.operation === 'placeVideosExisting') return { result: { status: 'videosPlaced', draftId: 'draft-new' } };
      if (input.operation === 'styleExisting') return { result: { status: 'styled', draftId: 'draft-new' } };
      if (input.operation === 'verifyCreated') return { result: { status: 'verified', draftId: 'draft-new', tileCount: 21 } };
      if (['verifySourceFiles','verifySourceMetadata'].includes(input.operation)) {assert.equal(request.allowCommit,false);assert.deepEqual(input.sourceGuard,savedSourceGuard);return {result:{status:'verified'}};}
      throw new Error(`Unexpected operation ${input.operation}`);
    },
  };
  const view = render(React.createElement(Panel, { sdk,
    context: { projectId: 'project-1', sequenceId: null, language: 'en' }, ui: kit() }));
  return { view, calls, nativeCalls, sdk, resourceListeners,emitResources:(event={})=>act(()=>{for(const listener of resourceListeners)listener({projectId:'project-1',added:['new-native-id'],removed:[],...event});}),changeProject: projectId=>view.rerender(React.createElement(Panel,{sdk,context:{projectId,sequenceId:null,language:'en'},ui:kit()})),changeAudio:(file,bytes)=>disk.set(file,bytes), changeSequence: sequenceId => view.rerender(React.createElement(Panel, { sdk,
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
    ['inspect', 'verifyInputs', 'verifyInputs', 'preflight', 'create', 'verifyCreated', 'verifySourceFiles', 'verifySourceMetadata']);
  assert.deepEqual(h.nativeCalls, ['resources', 'resources']);
  assert.equal(h.calls.find(call => call.input.operation === 'create').allowCommit, true);
  assert.deepEqual(h.calls.find(call => call.input.operation === 'create').input.media.map(item => item.path), photos.map(item => item.path));
});

test('a mixed photo/video gallery preserves its selected video slot', async () => {
  const media = [...photos.slice(0, 20), { resourceId: 'video-1', name: 'Moving tile', kind: 'video',
    width: 128, height: 96, durationFrames: 900, path: '/fixture/moving.mp4' }];
  const h = harness(media);
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  const placed = h.calls.find(call => call.input.operation === 'create').input.media;
  assert.equal(placed[20].kind, 'video');
  assert.equal(placed[20].path, '/fixture/moving.mp4');
  assert.equal(h.calls.filter(call => call.input.operation === 'create').length,1);
  assert.equal(h.nativeCalls.filter(item => item === 'place').length, 0);
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
  const assigned = h.calls.find(call => call.input.operation === 'create').input.media;
  assert.deepEqual(assigned.flatMap((item, index) => item.kind === 'video' ? [index + 1] : []),
    [4, 6, 11, 17, 19, 21]);
  assert.deepEqual(assigned.filter(item => item.kind === 'video').map(item => item.resourceId),
    videos.map(item => item.resourceId));
});

for (const platform of ['darwin', 'win32']) {
  test(`${platform}: a short video is held by the host ffmpeg, with no shell, before any Draft is created`, async () => {
    const source = platform === 'win32' ? 'C:\\fixture\\short.mp4' : '/fixture/short.mp4';
    const media = [...photos.slice(0, 20), { resourceId: 'short-1', name: 'Short tile', kind: 'video',
      width: 128, height: 96, durationFrames: 60, path: source }];
    const tools = [];
    const h = harness(media, { platform, tools, runShell: async () => { throw new Error('No shell'); } });
    await assignAndCreate(h.view);
    await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
    const encode = tools.find(call => call[0] === 'ffmpeg' && call.includes('libx264'));
    assert.notEqual(encode[encode.indexOf('-i') + 1], source);
    assert.match(encode[encode.indexOf('-i') + 1],/\.source-/);
    assert.equal(encode[encode.indexOf('-frames:v') + 1], '853');
    const held = tools.find(call => call[0] === 'rename' && call[2].endsWith('.mp4'))[2];
    const sep = platform === 'win32' ? '\\' : '/';
    assert.ok(held.includes(['.selects', 'plugin-data', 'photo-gallery-no2', 'held-v3', 'objects', ''].join(sep)), held);
    assert.deepEqual(h.calls.slice(0, 5).map(call => call.input.operation), ['inspect', 'verifyInputs', 'verifyInputs', 'importConverted', 'preflight']);
    assert.deepEqual(h.calls.find(call => call.input.operation === 'importConverted').input.converted, [{ sourceResourceId: 'short-1', sourcePath: source, path: held }]);
    assert.equal(h.calls.find(call => call.input.operation === 'create').input.media[20].resourceId, 'held-1');
  });
}

test('a held video that fails its frame check stops before any import or Draft', async () => {
  const media = [...photos.slice(0, 20), { resourceId: 'short-1', name: 'Short tile', kind: 'video',
    width: 128, height: 96, durationFrames: 60, path: '/fixture/short.mp4' }];
  const h = harness(media, { heldFrames: 852 });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Video 1: Cached video has the wrong frame count/));
  assert.deepEqual(h.calls.map(call => call.input.operation), ['inspect', 'verifyInputs', 'verifyInputs']);
  assert.equal(h.view.getByRole('button', { name: 'Create Draft' }).disabled, false);
});

test('unmounting the standalone panel cancels held preparation before import or Draft creation',async()=>{
  let enter,release,signal;const entered=new Promise(r=>{enter=r;}),gate=new Promise(r=>{release=r;});
  const media=[...photos.slice(0,20),{resourceId:'short-1',name:'Short tile',kind:'video',width:128,height:96,durationFrames:60,path:'/fixture/short.mp4'}];
  const h=harness(media,{onMediaProcess:async(args,current)=>{if(args.includes('-vf')){signal=current;enter();await Promise.race([gate,new Promise(r=>current.addEventListener('abort',r,{once:true}))]);}}});
  await assignAndCreate(h.view);await entered;h.view.unmount();await new Promise(r=>setTimeout(r,160));const aborted=signal.aborted;release();await new Promise(r=>setTimeout(r,30));
  assert.equal(aborted,true);assert.equal(h.calls.some(c=>['importConverted','create'].includes(c.input.operation)),false);
});

test('Windows: the default build finds the bundled music through the host FileSystem, with no shell', async () => {
  const h = harness(photos, { platform: 'win32', runShell: async () => { throw new Error('No shell on Windows'); } });
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  fireEvent.click(h.view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  assert.equal(h.calls.find(c => c.input.operation === 'importOwnedMusic').input.path,
    'C:\\Users\\tester\\.selects\\plugin-data\\photo-gallery-no2\\assets\\70146fa3ee1829efc1fff40ffe93f4a6a40394bca094d9b69877756432d8b8f0.mp3');
});

for (const platform of ['darwin', 'win32']) {
  test(`${platform}: the BPM estimate decodes the selected music with the host ffmpeg, with no shell`, async () => {
    // 14 s of 110 BPM clicks as the mono 11025 Hz floats the host's ffmpeg would write.
    const rate = 11025, pcm = new Float32Array(rate * 14);
    for (let beat = 0; beat * 60 / 110 < 14; beat++) {
      const at = Math.round(beat * 60 * rate / 110);
      for (let i = 0; i < 55 && at + i < pcm.length; i++) pcm[at + i] = Math.trunc(25000 * Math.exp(-i / 10)) / 32768;
    }
    const audio = [{ resourceId: 'custom', name: 'Custom', path: platform === 'win32' ? 'C:\\music\\custom.mp3' : '/custom.mp3', durationFrames: 900 }];
    const tools = [];
    const h = harness(photos, { platform, audio, tools, pcm, runShell: async () => { throw new Error('No shell'); } });
    fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
    fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign all 21 in listed order' })));
    fireEvent.change(h.view.getByLabelText('Music'), { target: { value: 'custom' } });
    fireEvent.click(h.view.getByLabelText('Enter BPM manually'));
    fireEvent.click(h.view.getByRole('button', { name: 'Estimate music BPM' }));
    await waitFor(() => assert.match(h.view.container.textContent, /Estimated BPM: 10[89]|Estimated BPM: 11[01]/));
    const decode = tools.find(call => call[0] === 'ffmpeg'&&call.includes('f32le'));
    assert.match(decode[decode.indexOf('-i') + 1],/\.source-/);
    assert.ok(tools.some(call=>call.includes('-hash')&&call[call.indexOf('-i')+1]===audio[0].path));
    assert.deepEqual(decode.slice(decode.indexOf('-ar'), decode.indexOf('-ar') + 2), ['-ar', '11025']);
    assert.ok(!h.calls.some(c => c.allowCommit));
  });
}

test('a missing bundled asset stops before any import', async () => {
  const h = harness(photos, { musicMissing: true });
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  fireEvent.click(h.view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Reinstall Photo Grid Reveal/));
  assert.ok(!h.calls.some(c => c.allowCommit));
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
  assert.ok(h.calls.some(call => call.input.operation === 'create'));
  assert.equal(h.calls.filter(call => call.input.operation === 'create').length,1);
});

test('an unknown complete-authoring reply exposes the host error without inventing a saved target', async () => {
  const media = [...photos.slice(0, 20), { resourceId: 'v1', name: 'Video',
    kind: 'video', width: 1000, height: 1000, path: '/video.mp4', durationFrames: 900 }];
  const h = harness(media, { failOperation: 'create', failOutput: 'script_timeout: Deadline exceeded before commit' });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Deadline exceeded before commit/));
  assert.ok(!h.view.queryByRole('button',{name:'Open saved Draft'}));
  assert.equal(h.view.getByRole('button', { name: 'Create Draft' }).disabled, true);
  assert.equal(h.calls.filter(call => call.input.operation === 'create').length, 1);
  assert.equal(h.calls.filter(call => call.input.operation === 'create').length,1);
});

test('a 21-video gallery requests the extended deadline for its one authoring call', async () => {
  const media = photos.map((p, i) => ({ ...p, resourceId: 'v' + i, kind: 'video', path: '/video-' + i + '.mp4', durationFrames: 900 }));
  const h = harness(media, { coldBudget: true });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  const creates=h.calls.filter(c=>c.input.operation==='create');
  assert.equal(creates.length,1);assert.equal(creates[0].timeoutSeconds,120);assert.equal(creates[0].input.media.length,21);
});

test('opening the newly created Draft preserves panel inputs and its saved target', async () => {
  let h;
  h = harness(photos, { onPlace: () => h.changeSequence('draft-new') });
  await assignAndCreate(h.view);
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  assert.equal(h.view.getByLabelText('Photo or video').value, 'r0');
  assert.ok(h.view.getByRole('button', { name: 'Open saved Draft' }));
});

const addedPhoto=()=>({resourceId:'added-photo',name:'Added photo',kind:'image',width:640,height:960,path:'/fixture/added-photo.jpg'});
const inspectCalls=h=>h.calls.filter(call=>call.input.operation==='inspect').length;
async function loadAndAssign(h){
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));
 fireEvent.click(await waitFor(()=>h.view.getByRole('button',{name:'Assign all 21 in listed order'})));
}

test('resource additions refresh choices without resetting the selected tiles or settings',{timeout:3000},async()=>{
 const media=[...photos],h=harness(media,{audio:[{resourceId:'custom',name:'Custom',path:'/custom.mp3',durationFrames:900}]});await loadAndAssign(h);
 fireEvent.change(h.view.getByLabelText('Music'),{target:{value:'custom'}});
 fireEvent.change(h.view.getByLabelText('BPM'),{target:{value:'137'}});
 fireEvent.change(h.view.getByLabelText('Video length'),{target:{value:'8.5'}});
 fireEvent.change(h.view.getByLabelText('Draft name'),{target:{value:'Keep this edit'}});
 fireEvent.change(h.view.getByLabelText('Horizontal focus'),{target:{value:'0.25'}});
 media.push(addedPhoto());h.emitResources();
 await waitFor(()=>assert.ok(h.view.queryByRole('option',{name:'Added photo · image'})));
 assert.equal(h.view.getByLabelText('Photo or video').value,'r0');assert.equal(h.view.getByLabelText('Horizontal focus').value,'0.25');
 assert.equal(h.view.getByLabelText('Music').value,'custom');assert.equal(h.view.getByLabelText('BPM').value,'137');
 assert.equal(h.view.getByLabelText('Video length').value,'8.5');assert.equal(h.view.getByLabelText('Draft name').value,'Keep this edit');
 fireEvent.change(h.view.getByLabelText('Photo or video'),{target:{value:'added-photo'}});assert.equal(h.view.getByLabelText('Photo or video').value,'added-photo');
 assert.equal(h.calls.some(call=>call.allowCommit),false);
});

test('resource events are project scoped and subscriptions end with the panel',{timeout:3000},async()=>{
 const h=harness([...photos]);await loadAndAssign(h);assert.equal(h.resourceListeners.size,1);
 const before=inspectCalls(h);h.emitResources({projectId:'other'});h.emitResources({added:[],removed:[]});
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(inspectCalls(h),before);
 h.view.unmount();assert.equal(h.resourceListeners.size,0);h.emitResources();assert.equal(inspectCalls(h),before);
});

test('resource changes during creation wait for verification and preserve its saved target',{timeout:3000},async()=>{
 let enter,release;const entered=new Promise(resolve=>{enter=resolve;}),gate=new Promise(resolve=>{release=resolve;}),media=[...photos];
 const h=harness(media,{beforeOperation:async input=>{if(input.operation==='create'){enter();await gate;}}});
 await assignAndCreate(h.view);await entered;const before=inspectCalls(h);media.push(addedPhoto());
 h.emitResources();h.emitResources();h.emitResources();await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(inspectCalls(h),before);assert.equal(h.view.getByLabelText('Photo or video').disabled,true);
 release();await waitFor(()=>assert.ok(h.view.queryByRole('option',{name:'Added photo · image'})));
 assert.equal(inspectCalls(h),before+1);assert.match(h.view.container.textContent,/Saved and read back all 21 tiles/);
 assert.ok(h.view.getByRole('button',{name:'Open saved Draft'}));assert.equal(h.calls.filter(call=>call.input.operation==='create').length,1);
 assert.equal(h.calls.find(call=>call.input.operation==='create').input.media.length,21);
});

test('a resource refresh that finishes after project navigation cannot repopulate the old panel',{timeout:3000},async()=>{
 let enter,release;const entered=new Promise(resolve=>{enter=resolve;}),gate=new Promise(resolve=>{release=resolve;}),media=[...photos];let inspections=0;
 const h=harness(media,{beforeOperation:async input=>{if(input.operation==='inspect'&&++inspections===2){enter();await gate;}}});await loadAndAssign(h);
 media.push(addedPhoto());h.emitResources();await entered;h.changeProject('project-2');release();
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(h.view.queryByLabelText('Photo or video'),null);
 assert.equal(h.calls.some(call=>call.allowCommit),false);
});

test('resource refresh failures retain settings and do not retry without a new event',{timeout:3000},async()=>{
 const media=[...photos],options={},h=harness(media,options);await loadAndAssign(h);
 fireEvent.change(h.view.getByLabelText('Draft name'),{target:{value:'Keep after failure'}});
 options.failOperation='inspect';options.failOutput='Controlled inventory read failed';const before=inspectCalls(h);
 media.push(addedPhoto());h.emitResources();await waitFor(()=>assert.equal(inspectCalls(h),before+1));
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(inspectCalls(h),before+1);assert.equal(h.view.getByLabelText('Photo or video').value,'r0');assert.equal(h.view.getByLabelText('Draft name').value,'Keep after failure');
 options.failOperation=null;h.emitResources();await waitFor(()=>assert.ok(h.view.queryByRole('option',{name:'Added photo · image'})));
});

test('a resource ID rebound to another path cannot silently replace a selected photo',{timeout:3000},async()=>{
 const media=[...photos],h=harness(media);await assignAndCreate(h.view);
 await waitFor(()=>assert.ok(h.view.queryByRole('button',{name:'Open saved Draft'})));
 media[0]={...media[0],path:'/fixture/different-original.jpg'};media.push(addedPhoto());h.emitResources();
 await waitFor(()=>assert.equal(!!h.view.queryByRole('button',{name:'Create Draft'}),false));
 assert.ok(h.view.getByRole('button',{name:'Open saved Draft'}));assert.equal(h.calls.filter(call=>call.input.operation==='create').length,1);
});

test('manual Load supersedes a pending automatic refresh without publishing its older response',{timeout:3000},async()=>{
 let enterOld,releaseOld,enterLatest,releaseLatest;const oldEntered=new Promise(r=>{enterOld=r;}),oldGate=new Promise(r=>{releaseOld=r;}),latestEntered=new Promise(r=>{enterLatest=r;}),latestGate=new Promise(r=>{releaseLatest=r;});let reads=0;
 const media=[...photos],h=harness(media,{beforeOperation:async input=>{if(input.operation==='inspect'){reads++;if(reads===2){enterOld();await oldGate;}if(reads===4){enterLatest();await latestGate;}}}});await loadAndAssign(h);
 media.push(addedPhoto());h.emitResources();await oldEntered;
 const newest={...addedPhoto(),resourceId:'newest',name:'Newest photo',path:'/fixture/newest.jpg'};media.push(newest);
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));await waitFor(()=>assert.ok(h.view.queryByRole('option',{name:'Newest photo · image'})));
 releaseOld();await latestEntered;assert.ok(h.view.queryByRole('option',{name:'Newest photo · image'}));releaseLatest();
 await waitFor(()=>assert.equal(inspectCalls(h),4));assert.equal(h.view.getByLabelText('Photo or video').value,'');
 assert.equal(h.calls.some(call=>call.allowCommit),false);
});

test('Create freezes the chosen tiles while an older inventory response settles',{timeout:3000},async()=>{
 let enterRead,releaseRead,enterCreate,releaseCreate;const readEntered=new Promise(r=>{enterRead=r;}),readGate=new Promise(r=>{releaseRead=r;}),createEntered=new Promise(r=>{enterCreate=r;}),createGate=new Promise(r=>{releaseCreate=r;});let reads=0;
 const media=[...photos],h=harness(media,{beforeOperation:async input=>{if(input.operation==='inspect'&&++reads===2){enterRead();await readGate;}if(input.operation==='create'){enterCreate();await createGate;}}});await loadAndAssign(h);
 fireEvent.change(h.view.getByLabelText('Music'),{target:{value:'none'}});media.push(addedPhoto());h.emitResources();await readEntered;
 fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));await createEntered;releaseRead();await new Promise(r=>setTimeout(r,20));
 assert.equal(!!h.view.queryByRole('option',{name:'Added photo · image'}),false);assert.equal(h.view.getByLabelText('Photo or video').value,'r0');
 releaseCreate();await waitFor(()=>assert.ok(h.view.queryByRole('option',{name:'Added photo · image'})));
 assert.equal(inspectCalls(h),3);assert.ok(h.view.getByRole('button',{name:'Open saved Draft'}));assert.equal(h.calls.find(call=>call.input.operation==='create').input.media.length,21);
});

for(const action of ['unmount','sequence change'])test('a pending inventory response is discarded after '+action,{timeout:3000},async()=>{
 let enter,release;const entered=new Promise(r=>{enter=r;}),gate=new Promise(r=>{release=r;});let reads=0;
 const media=[...photos],h=harness(media,{beforeOperation:async input=>{if(input.operation==='inspect'&&++reads===2){enter();await gate;}}});await loadAndAssign(h);
 const before=h.nativeCalls.length;media.push(addedPhoto());h.emitResources();await entered;
 if(action==='unmount')h.view.unmount();else h.changeSequence('different-draft');release();await new Promise(r=>setTimeout(r,30));
 assert.equal(h.nativeCalls.length,before,'no native mapping query after the stale inspect response');
 if(action==='unmount')assert.equal(h.resourceListeners.size,0);else assert.equal(!!h.view.queryByLabelText('Photo or video'),false);
 assert.equal(h.calls.some(call=>call.allowCommit),false);
});

test('removing a selected source invalidates Create while retaining the saved Draft link',{timeout:3000},async()=>{
 const media=[...photos],h=harness(media);await assignAndCreate(h.view);await waitFor(()=>assert.ok(h.view.queryByRole('button',{name:'Open saved Draft'})));
 media.splice(0,1);h.emitResources({added:[],removed:['native-r0']});
 await waitFor(()=>assert.equal(!!h.view.queryByRole('button',{name:'Create Draft'}),false));assert.ok(h.view.getByRole('button',{name:'Open saved Draft'}));
 assert.equal(h.calls.filter(call=>call.input.operation==='create').length,1);
});

test('adding a photo after an uncertain save preserves the duplicate-save lock and prior saved target',{timeout:3000},async()=>{
 const media=[...photos],options={},h=harness(media,options);await assignAndCreate(h.view);await waitFor(()=>assert.match(h.view.container.textContent,/Saved and read back all 21 tiles/));
 options.placeError='Controlled uncertain second save';fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));await waitFor(()=>assert.match(h.view.container.textContent,/Save outcome is unknown/));
 media.push(addedPhoto());h.emitResources();await waitFor(()=>assert.ok(h.view.queryByRole('option',{name:'Added photo · image'})));
 assert.equal(h.view.getByRole('button',{name:'Create Draft'}).disabled,true);assert.ok(h.view.getByRole('button',{name:'Open saved Draft'}));
 assert.match(h.view.container.textContent,/Save outcome is unknown/);assert.equal(h.calls.filter(call=>call.input.operation==='create').length,2);
});

test('one Create action uses bundled B2 by default with reference timing and credit', async () => {
  const h = harness();
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  assert.equal(h.view.getByLabelText('Music').value, 'bundled');
  assert.match(h.view.container.textContent, /TAD MILLER.*CC BY 4.0/);
  fireEvent.click(h.view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  const styled = h.calls.find(c => c.input.operation === 'create').input;
  assert.equal(styled.music.resourceId, 'bundled-music');
  assert.equal(styled.manualBpm, 113);
  assert.equal(h.calls.filter(c => c.input.operation === 'importOwnedMusic').length, 1);
});
for(const fps of [24000/1001,30,50,90])test('untouched default bundled duration fits the actual Project grid '+fps,async()=>{
 const h=harness(photos,{fps});
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));
 fireEvent.click(await waitFor(()=>h.view.getByRole('button',{name:'Assign all 21 in listed order'})));
 fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>assert.match(h.view.container.textContent,/Saved and read back all 21 tiles/));
 const input=h.calls.find(c=>c.input.operation==='create').input,plan=planGallery(input);
 const lastFrame=Math.floor(853/60*fps+1e-9);
 assert.ok(plan.durationFrames<=lastFrame&&lastFrame-plan.durationFrames<Math.ceil(fps/60));
 assert.ok(plan.durationFrames/fps<=853/60+1e-9);
 assert.throws(()=>planGallery({...input,durationFrames:input.durationFrames+1}),/music.*short/i);
 assert.equal(input.music.resourceId,'bundled-music');
});
for(const requested of [14.217,15])test('explicit bundled duration '+requested+' still rejects a shortage without importing',async()=>{
 const h=harness(photos,{fps:30});
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));
 fireEvent.click(await waitFor(()=>h.view.getByRole('button',{name:'Assign all 21 in listed order'})));
 fireEvent.change(h.view.getByLabelText('Video length'),{target:{value:'15.5'}});
 fireEvent.change(h.view.getByLabelText('Video length'),{target:{value:String(requested)}});
 fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>assert.match(h.view.container.textContent,/Bundled music is too short/));
 assert.equal(h.calls.some(c=>c.input.operation==='create'||c.input.operation==='importOwnedMusic'),false);
 assert.equal(Number(h.view.getByLabelText('Video length').value),requested);
});
test('custom Project music preserves the default requested length on a 30fps grid',async()=>{
 const h=harness(photos,{fps:30,audio:[{resourceId:'custom',name:'Custom',path:'/custom.mp3',durationSeconds:30,durationFrames:1800}]});
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));
 fireEvent.click(await waitFor(()=>h.view.getByRole('button',{name:'Assign all 21 in listed order'})));
 fireEvent.change(h.view.getByLabelText('Music'),{target:{value:'custom'}});
 fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>assert.match(h.view.container.textContent,/Saved and read back all 21 tiles/));
 const input=h.calls.find(c=>c.input.operation==='create').input;assert.equal(input.durationFrames,853);assert.equal(planGallery(input).durationFrames,427);
});
test('custom Project music uses its exact resource without importing B2', async () => {
  const audio = [{ resourceId: 'custom', name: 'Custom', path: '/custom.mp3', durationFrames: 900 }];
  const h = harness(photos, { audio });
  fireEvent.click(h.view.getByRole('button', { name: 'Load project media' }));
  fireEvent.click(await waitFor(() => h.view.getByRole('button', { name: 'Assign all 21 in listed order' })));
  fireEvent.change(h.view.getByLabelText('Music'), { target: { value: 'custom' } });
  fireEvent.click(h.view.getByRole('button', { name: 'Create Draft' }));
  await waitFor(() => assert.match(h.view.container.textContent, /Saved and read back all 21 tiles/));
  assert.equal(h.calls.find(c => c.input.operation === 'create').input.music.path, '/custom.mp3');
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

test('a 30 fps Project keeps reference seconds while creating and styling on its own grid',async()=>{
  const h=harness(photos,{fps:30});
  await assignAndCreate(h.view);
  await waitFor(()=>assert.ok(h.calls.some(call=>call.input.operation==='verifyCreated')));
  const creation=h.calls.find(call=>call.input.operation==='create').input;
  assert.equal(creation.fps,30);
  assert.equal(creation.durationFrames,853);
  const style=h.calls.find(call=>call.input.operation==='create').input;
  assert.equal(style.fps,30);
  assert.equal(planGallery(style).durationFrames,427);
});
test('selected-original failure stops before bundled music import or short-video conversion',async()=>{
 const tools=[],media=[...photos.slice(0,20),{resourceId:'short-1',name:'Short tile',kind:'video',width:128,height:96,durationFrames:60,path:'/fixture/short.mp4'}];
 const h=harness(media,{inputFailure:true,tools});
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));fireEvent.click(await waitFor(()=>h.view.getByRole('button',{name:'Assign all 21 in listed order'})));fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>assert.match(h.view.container.textContent,/original photo file is missing|Saved and read back/));
 assert.equal(h.calls.some(call=>call.allowCommit),false);assert.equal(tools.some(call=>call[0]==='ffmpeg'),false);assert.equal(h.view.getByRole('button',{name:'Create Draft'}).disabled,false);
});

for(const fps of [30,50,90])test('Project grid '+fps+' prepares 854 actual video frames while retaining the reference request',async()=>{
 const tools=[],media=[{resourceId:'short-1',name:'First moving tile',kind:'video',width:128,height:96,path:'/fixture/short.mp4',durationFrames:853,durationSeconds:853/60},...photos.slice(1)];
 const h=harness(media,{fps,heldFrames:854,tools});
 await assignAndCreate(h.view);
 await waitFor(()=>assert.match(h.view.container.textContent,/Saved and read back all 21 tiles/));
 const encode=tools.find(row=>row[0]==='ffmpeg'&&row.includes('-vf'));
 assert.equal(encode[encode.indexOf('-frames:v')+1],'854');
 const imported=h.calls.find(c=>c.input.operation==='importConverted');assert.equal(imported.input.durationFrames,854);
 const created=h.calls.find(c=>c.input.operation==='create').input;
 assert.equal(created.durationFrames,853);assert.equal(created.media[0].durationSeconds,854/60);
 const plan=planGallery(created);assert.ok(created.media[0].durationSeconds>=plan.durationFrames/fps);
});
for(const bpm of [0,1,999999])test('invalid manual BPM '+bpm+' stops before bundled asset publication/import',async()=>{
 const tools=[],h=harness(photos,{tools});
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));
 fireEvent.click(await waitFor(()=>h.view.getByRole('button',{name:'Assign all 21 in listed order'})));
 fireEvent.change(h.view.getByLabelText('BPM'),{target:{value:String(bpm)}});
 fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>assert.ok(h.view.container.textContent.match(/BPM|Color transition/)));
 await waitFor(()=>assert.equal(h.view.getByRole('button',{name:'Create Draft'}).disabled,false));
 assert.equal(h.calls.filter(c=>c.allowCommit).length,0);assert.equal(tools.length,0);
 assert.equal(h.calls.filter(c=>c.input.operation==='preflight'||c.input.operation==='create').length,0);
});

function clickPcm(bpm){
 const rate=11025,pcm=new Float32Array(rate*14);
 for(let n=0;n*60/bpm<14;n++){const at=Math.round(n*60*rate/bpm);for(let i=0;i<55&&at+i<pcm.length;i++)pcm[at+i]=Math.trunc(25000*Math.exp(-i/10))/32768;}
 return pcm;
}
async function openMusicEstimate(h){
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));
 fireEvent.click(await waitFor(()=>h.view.getByRole('button',{name:'Assign all 21 in listed order'})));
 fireEvent.change(h.view.getByLabelText('Music'),{target:{value:'custom'}});
 fireEvent.click(h.view.getByLabelText('Enter BPM manually'));
 fireEvent.click(h.view.getByRole('button',{name:'Estimate music BPM'}));
}
test('BPM UI does not reuse a Resource-ID estimate after the music bytes change',async()=>{
 const audio={resourceId:'custom',name:'Custom',path:'/custom.wav',durationFrames:900},options={audio:[audio],pcm:clickPcm(110),tools:[]},h=harness(photos,options);
 await openMusicEstimate(h);await waitFor(()=>assert.match(h.view.container.textContent,/Estimated BPM: 10[89]|Estimated BPM: 11[01]/));
 options.pcm=clickPcm(140);h.changeAudio(audio.path,Buffer.from('replacement audio'));
 fireEvent.click(h.view.getByRole('button',{name:'Estimate music BPM'}));
 await waitFor(()=>assert.match(h.view.container.textContent,/Estimated BPM: 1[34][0-9]/));
 assert.equal(options.tools.filter(c=>c.includes('f32le')).length,2);
});
for(const end of ['unmount','context','context-ABA'])test('BPM UI cancels active decode on '+end,{timeout:5000},async t=>{
 let entered,release,signal;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);t.after(()=>release());
 const options={audio:[{resourceId:'custom',name:'Custom',path:'/custom.wav',durationFrames:900}],pcm:clickPcm(110),tools:[],onMediaProcess:async(args,s)=>{if(args.includes('f32le')){signal=s;entered();await Promise.race([gate,new Promise(r=>s.addEventListener('abort',r,{once:true}))]);}}};
 const h=harness(photos,options);await openMusicEstimate(h);await started;
 if(end==='unmount')h.view.unmount();else {h.changeSequence('another-draft');if(end==='context-ABA')h.changeSequence(null);}
 await waitFor(()=>assert.equal(signal.aborted,true));release();
 await new Promise(r=>setTimeout(r,20));assert.equal(h.calls.filter(c=>c.allowCommit).length,0);
 if(end!=='unmount')assert.doesNotMatch(h.view.container.textContent,/Estimated BPM: 10[89]|Estimated BPM: 11[01]/);
});
test('BPM UI verifies selected music before starting media work',async()=>{
 const tools=[],h=harness(photos,{audio:[{resourceId:'custom',name:'Custom',path:'/custom.wav',durationFrames:900}],pcm:clickPcm(110),tools,musicInputFailure:true});
 await openMusicEstimate(h);await waitFor(()=>assert.match(h.view.container.textContent,/Selected music changed/));assert.equal(tools.length,0);
});
test('BPM UI binds creation to the exact music contents actually estimated',async()=>{
 const audio={resourceId:'custom',name:'Custom',path:'/custom.wav',durationFrames:900},h=harness(photos,{audio:[audio],pcm:clickPcm(110),tools:[]});
 await openMusicEstimate(h);await waitFor(()=>assert.match(h.view.container.textContent,/Estimated BPM: 10[89]|Estimated BPM: 11[01]/));
 fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>assert.ok(h.calls.some(call=>call.input.operation==='create')));
 const made=h.calls.find(call=>call.input.operation==='create').input;
 assert.equal(made.musicFingerprint?.path,audio.path);assert.equal(made.musicFingerprint.sha256,createHash('sha256').update(Buffer.from('fixture audio custom')).digest('hex'));
});

test('a host without existing runScript stops before music import or video preparation',async()=>{
 const tools=[],h=harness(photos,{tools});
 fireEvent.click(h.view.getByRole('button',{name:'Load project media'}));fireEvent.click(await waitFor(()=>h.view.getByRole('button',{name:'Assign all 21 in listed order'})));h.sdk.runScript=undefined;fireEvent.click(h.view.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>assert.match(h.view.container.textContent,/Update Selects/));assert.deepEqual(h.calls.map(c=>c.input.operation),['inspect']);assert.equal(tools.length,0);assert.equal(h.calls.some(c=>c.allowCommit),false);
});

test('a host without a new deadline capability still completes the existing panel path',async()=>{
 const h=harness();delete h.sdk.maxScriptTimeoutSeconds;await assignAndCreate(h.view);
 await waitFor(()=>assert.match(h.view.container.textContent,/Saved and read back all 21 tiles/));
 assert.equal(h.calls.filter(c=>c.input.operation==='create').length,1);
 assert.deepEqual(h.calls.filter(c=>c.input.operation.startsWith('verifySource')).map(c=>c.input.operation),['verifySourceFiles','verifySourceMetadata']);
});
