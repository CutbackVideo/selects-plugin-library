import { asyncSdk } from './windows_host.mjs';
// The production photo helpers and worker run against shared-AI SDK job fixtures with real FFmpeg.
// Lossless fixture masks verify the unchanged sticker/scene transform against the independent Python baseline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {webcrypto} from 'node:crypto';
import { panelSource, loadPanelFunctions } from './windows_host.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN = path.join(ROOT, 'plugins/cutout-beat-gallery');
const E = require(path.join(PLUGIN, 'cutout-engine.js'));
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/cutout_beat_gallery/parity.json'), 'utf8'));
const HAVE_FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;
const source = panelSource('cutout-beat-gallery');
const NAMES = ['WIN_MIN_PHOTOS','FRAME_SIZE','startEngine','hostFFmpeg','encoderCache','encoders','pad2','fileName','winFrames','winCutouts','removeWork'];
const sharedAiJobs=require(path.join(ROOT,'shared/ai-job-client.cjs'));
const sharedAiResources=require(path.join(ROOT,'shared/ai-resources.cjs'));
const photoNames=['photoAiScript','photoAiCanonicalId','photoAiClient','photoAiMatte'];

// ---- the synthetic folder (make_parity.py's formulas) -------------------------------------------------------------
function src(p, sw, sh) {
  const out = new Uint8Array(sw * sh * 3);
  let o = 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    out[o] = (x * (3 + p % 5) + y * (1 + p % 3) + p * 37) % 256;
    out[o + 1] = (Math.floor((x * y) / (7 + p)) + p * 11) % 256;
    out[o + 2] = (((x ^ y) * (p + 1)) + Math.floor((x * x + y * y) / (50 + p))) % 256;
    o += 3;
  }
  return out;
}
function photo([, p, [sw, sh], [w, h], tweak]) {
  const raw = src(p, sw, sh);
  for (let k = 0; k < tweak * 40; k++) raw[(k * 7919) % raw.length] ^= 1;
  return E.resize(E.image(sw, sh, 3, raw), w, h, 'bicubic');
}
function mask(i, scenario) {
  const w = 270, h = 480;
  let cx = 135 + ((i * 29) % 61 - 30), cy = 300 + (i * 17) % 80;
  const rx = 60 + (i * 13) % 40, ry = 120 + (i * 7) % 60;
  if (i % 5 === 0) cx = 20;
  if (scenario === 'short' && (i % 3 === 0 || i === 26)) cy = 40;
  const R = BigInt(rx * rx * ry * ry), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = BigInt((x - cx) ** 2 * ry * ry + (y - cy) ** 2 * rx * rx);
    out[y * w + x] = d * 100n <= 90n * R ? 255 : d * 100n >= 110n * R ? 0 : Number(((110n * R - d * 100n) * 255n) / (20n * R));
  }
  return E.resize(E.image(w, h, 1, out), E.W, E.H, 'bicubic');
}
const ff = (args) => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...args], { maxBuffer: 1 << 26 });
const probeJson = (file, entries) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', entries, '-of', 'json', file]).toString());

// Writes the folder as PNG files (the copy is a byte copy, so its SHA-256 matches).
function writeFolder(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return FIXTURE.photos.map((entry) => {
    const file = path.join(dir, entry[0]);
    if (entry[0] === 'p03-copy.png') fs.copyFileSync(path.join(dir, 'p03.png'), file);
    else {
      const im = photo(entry), raw = file + '.rgb';
      fs.writeFileSync(raw, im.d);
      ff(['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-video_size', im.w + 'x' + im.h, '-i', raw, '-frames:v', '1', file]);
      fs.rmSync(raw);
    }
    return { name: entry[0], path: file, resourceId: "r"+FIXTURE.photos.indexOf(entry) };
  });
}

// ---- the mock host ------------------------------------------------------------------------------------------------
function mockHost({ home, scenario = 'full', delivery = { codec: 'ffv1', fps: 30 }, encodersList = null, version = '2.0.520', plugin = true } = {}) {
  const realm = vm.createContext({});
  const RealmBytes = vm.runInContext('Uint8Array', realm);
  const calls = [], submits = [];
  const runTool = (bin, args, signal) => new Promise((resolve, reject) => {
    const child = spawn(bin, args);
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    signal?.addEventListener('abort', () => child.kill());
    child.on('close', (code) => (code === 0 ? resolve({ stdout, stderr }) : reject(Object.assign(new Error(stderr || 'exit ' + code), { stderr }))));
  });
  const FileSystem = {
    join: (...p) => path.join(...p), homedir: () => home, basename: (p) => path.basename(p),
    existsSync: (p) => fs.existsSync(p), exists: async (p) => fs.existsSync(p),
    mkdirSync: (p, o) => fs.mkdirSync(p, o),
    // Bytes from the host realm, as Selects hands them to a panel.
    readFile: async (p) => RealmBytes.from(fs.readFileSync(p)),
    writeFile: async (p, data) => { calls.push(['writeFile', p]); fs.writeFileSync(p, data); },
    copyFile: async (a, b) => fs.copyFileSync(a, b),
    readdirSync: (p) => fs.readdirSync(p), rmSync: (p, o) => fs.rmSync(p, o),
    removeFile: async ({ filePath }) => fs.rmSync(filePath, { force: true }),
  };
  const Runtime = {
    getPlatform: () => 'win32', getHostingVersion: () => version,
    runFFmpeg: async (args, quiet, signal) => {
      calls.push(['runFFmpeg', args]);
      if (args[0] === '-hide_banner' && args[1] === '-encoders' && encodersList) return { stdout: encodersList, stderr: '' };
      return runTool('ffmpeg', args, signal);
    },
    runFFprobe: async (args, quiet, signal) => { calls.push(['runFFprobe', args]); return runTool('ffprobe', args, signal); },
  };
  const jobs=[],storage=new Map(),files=FIXTURE.photos.map((entry,i)=>({resourceId:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),name:entry[0],type:'Image'}));
  const photoMasks=path.join(home,'masks');fs.mkdirSync(photoMasks,{recursive:true});
  const project={resources:async()=>files.map((f,i)=>({...f,resourceId:'r'+i}))};
  const ai={imageSourceSupported:true,submit:async input=>{
    submits.push(structuredClone(input));
    const index=jobs.length+1,workflowId='ai:'+index,maskPath=path.join(photoMasks,index+'.png');
    const gray=mask(index,scenario),raw=maskPath+'.gray';fs.writeFileSync(raw,gray.d);
    ff(['-f','rawvideo','-pix_fmt','gray','-s','1080x1920','-i',raw,'-frames:v','1',maskPath]);fs.rmSync(raw);
    jobs.push({workflowId,resourceId:input.resourceId,input,maskPath});return {workflowId};
  },job:(id,pid)=>{
    const j=jobs.find(j=>j.workflowId===id);
    return {status:async()=>({workflowId:id,projectId:pid,runtimeId:'selects-ai-runtime',task:'person.matte',resourceId:j.resourceId,status:'succeeded'}),
      result:async()=>({workflowId:id,task:'person.matte',files:{manifest:{id,name:'matte.json',mediaType:'application/json',byteSize:1}}}),cancel:async()=>{}};
  },prepareMatte:async(file,pid,options)=>{
    assert.equal(options.sourceKind,'image');const j=jobs.find(j=>j.workflowId===file.id);
    return {sourceKind:'image',sourceResourceId:j.resourceId,frameSize:{width:1080,height:1920},alphaEncoding:'grayscale-png-8bit',maskUrl:'local://'+j.maskPath};
  }};
  const sdk={...asyncSdk({FileSystem,Runtime}),call:async(name,pid)=>{assert.equal(name,'listProjectResources');return files.map(f=>({...f}))},
    storage:{getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>{storage.set(key,value)}},
    runScript:async({script})=>{try{return {isError:false,result:await vm.runInNewContext('(async()=>{'+script+'})()',{selects:{project:()=>project,ai,files:{pathFromLocalUrl:url=>decodeURIComponent(new URL(url).pathname)}}})}}catch(e){return {isError:true,output:String(e.message||e)}}}};
  return {di:{FileSystem,Runtime},sdk,calls,submits,jobs,storage};
}

// A Web Worker for the panel's blob URL: the engine runs in its own context, with createImageBitmap/OffscreenCanvas
// decoding the photo with ffmpeg (PNG is lossless, so the pixels equal Pillow's). Messages are structured clones
// (with transfers) delivered on later turns, as between a page and its Worker.
function workerGlobals() {
  const blobs = new Map();
  let n = 0;
  class Worker {
    constructor(url) {
      if (!blobs.has(url)) throw new Error('no such blob');
      this.terminated = false;
      this.ready = blobs.get(url).then((text) => {
        const self = { postMessage: (data, transfer) => { const copy = structuredClone(data, { transfer }); setImmediate(() => { if (!this.terminated) this.onmessage?.({ data: copy }); }); } };
        const ctx = vm.createContext({ self, console, Blob, setTimeout,
          createImageBitmap: async (blob) => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbg-decode-')), file = path.join(dir, 'in');
            fs.writeFileSync(file, Buffer.from(await blob.arrayBuffer()));
            const info = probeJson(file, 'stream=width,height').streams[0];
            const rgba = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 });
            fs.rmSync(dir, { recursive: true });
            return { width: info.width, height: info.height, rgba: new Uint8Array(rgba), close() {} };
          },
          OffscreenCanvas: class { getContext() { let b = null; return { drawImage: (bitmap) => { b = bitmap; }, getImageData: () => ({ data: b.rgba }) }; } },
        });
        new vm.Script(text).runInContext(ctx);
        return self;
      });
    }
    postMessage(data, transfer) {
      const copy = structuredClone(data, { transfer });
      this.ready.then((self) => setImmediate(() => { if (!this.terminated) self.onmessage({ data: copy }); }));
    }
    terminate() { this.terminated = true; }
  }
  const URL_ = { createObjectURL: (blob) => { const url = 'blob:cbg/' + (++n); blobs.set(url, blob.text()); return url; }, revokeObjectURL: (u) => blobs.delete(u) };
  return { Worker, URL: URL_ };
}

async function load(host) {
  const w = workerGlobals();
  const fns = loadPanelFunctions(source, [...NAMES,...photoNames], {
    __sdk:host.sdk,sharedAiJobs,sharedAiResources,crypto:webcrypto,
        window: { parent: { __DI__: host.di, location: { pathname: '/libraries/lib-1/projects/proj-1' } } },
    navigator: { platform: 'Win32', userAgent: 'Windows NT 10.0' },
    Worker: w.Worker, URL: w.URL, Blob, AbortController,
  });
  return { fns };
}

function setup(t, options = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cbg-win-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const home = path.join(base, 'home'), data = path.join(home, '.selects', 'plugin-data', 'cutout-beat-gallery');
  fs.mkdirSync(data, { recursive: true });
  const photos = writeFolder(path.join(base, 'photos'));
  return { base, home, data, photos, host: mockHost({ home, ...options }) };
}

// The panel's Windows analysis: free frames, then (after consent) cutouts, as analyze() and sendCloud() run them.
async function analyse(env, fns, name = 'beat-cutout-test') {
  const engine = fns.startEngine(fs.readFileSync(path.join(PLUGIN, 'cutout-engine.js'), 'utf8'));
  const work = path.join(env.data, 'work', name);
  fs.mkdirSync(work, { recursive: true });
  try {
    const { frames, rejected } = await fns.winFrames({ engine, work, photos: env.photos, control: { canceled: false } });
    const result = await fns.winCutouts({ sdk:env.host.sdk, engine, plugin: PLUGIN, data: env.data, work, name, pid: 'proj-1', frames, rejected, control: { canceled: false } });
    return { result, frames, rejected, work };
  } finally {
    engine.stop();
    await fns.removeWork(work);
  }
}

const skip = HAVE_FFMPEG ? false : 'ffmpeg is not on PATH';

test('Windows analysis in a mock host equals prepare.py (lossless masks, 30 fps)', { skip, timeout: 600000 }, async (t) => {
  const env = setup(t);
  const { fns } = await load(env.host);
  const { result } = await analyse(env, fns);
  const want = FIXTURE.scenarios.full.result;
  const { outputDir, folder, ...rest } = result;
  assert.equal(folder, 'beat-cutout-test');
  assert.equal(outputDir, path.join(env.data, 'runs', 'beat-cutout-test'));
  assert.deepEqual(rest.rejected, want.rejected);
  assert.deepEqual(rest.rows, want.rows);
  assert.deepEqual(rest.cues, want.cues);
  assert.deepEqual(rest, want);
  assert.equal(env.host.submits.length,26,'each accepted source image is inferred once');
  for(const req of env.host.submits){assert.equal(req.task,'person.matte');assert.equal(req.runtimeId,'selects-ai-runtime');assert.equal(req.projectId,'proj-1');assert.equal(req.options.provider,'auto');assert.equal(req.options.outputMode,'alpha-frames');assert.equal(req.sourceRange,undefined);assert.match(req.resourceId,/^00000000-0000-4000-8000-/);}
  assert.equal(env.host.storage.size,1,'one persistent project journal');
  // Scene files retain two held source frames for fractional-fps boundary trims.
  const files = fs.readdirSync(outputDir).sort();
  const expected = [...Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0') + '-base.mp4'), ...Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, '0') + '-sticker.mov'), 'fixed-bgm.mp3'].sort();
  assert.deepEqual(files, expected);
  const edges = E.PHOTO_EDGES;
  for (let i = 0; i < 15; i++) {
    const info = probeJson(path.join(outputDir, String(i + 1).padStart(2, '0') + '-base.mp4'), 'stream=nb_read_frames,width,height,codec_name');
    assert.equal(info.streams.length, 1);
    assert.deepEqual([info.streams[0].codec_name, info.streams[0].width, info.streams[0].height, Number(info.streams[0].nb_read_frames)],
      ['h264', 1080, 1920, edges[i + 1] - edges[i] + (i === 14 ? 8 : 0) + 2]);
  }
  for (const f of files.filter((f) => f.endsWith('.mov'))) {
    const info = probeJson(path.join(outputDir, f), 'stream=nb_read_frames,codec_name,pix_fmt,codec_type');
    assert.equal(info.streams.length, 1, f + ': one stream (no timecode track)');
    assert.deepEqual([info.streams[0].codec_name, info.streams[0].pix_fmt, Number(info.streams[0].nb_read_frames)], ['prores', 'yuva444p12le', 60]);
  }
  assert.deepEqual(fs.readFileSync(path.join(outputDir, 'fixed-bgm.mp3')), fs.readFileSync(path.join(PLUGIN, 'fixed-bgm.mp3')));
  // The first sticker's alpha survives ProRes 4444.
  const alpha = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(outputDir, '01-sticker.mov'), '-frames:v', '1', '-vf', 'alphaextract', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
  const row = rest.rows.find((r) => r.stickerNumber === 1), frameRgb = photo(FIXTURE.photos.find((p) => p[0] === row.name));
  const layer = E.compose(E.fit(frameRgb, E.W, E.H, 'lanczos'), mask(row.index, 'full'), 'clean');
  let diff = 0, inter = 0, union = 0;
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i], b = layer.d[i * 4 + 3];
    diff += Math.abs(a - b);
    if (a >= 128 && b >= 128) inter++;
    if (a >= 128 || b >= 128) union++;
  }
  assert.ok(diff / alpha.length < 0.5, 'alpha mean difference ' + diff / alpha.length);
  assert.ok(inter / union > 0.999, 'alpha IoU ' + inter / union);
  // The work folder is gone; nothing else was written outside the data folder.
  assert.equal(fs.existsSync(path.join(env.data, 'work', 'beat-cutout-test')), false);
  for (const [kind, p] of env.host.calls) if (kind === 'writeFile') assert.ok(p.startsWith(env.data + path.sep), p);
});

test('a shared matte with the wrong source is refused before layer rendering', {skip},async t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'cbg-wrong-source-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const home=path.join(base,'home'),data=path.join(home,'.selects','plugin-data','cutout-beat-gallery'),work=path.join(data,'work');fs.mkdirSync(work,{recursive:true});
 const host=mockHost({home}),{fns}=await load(host),old=host.sdk.runScript;
 host.sdk.runScript=async args=>{
  const result=await old(args);
  if(args.script.includes('prepareMatte(')&&result.result)result.result.sourceResourceId='00000000-0000-4000-8000-999999999999';
  return result;
 };
 let rendered=false;
 const engine={call:()=>{rendered=true;throw Error('Must not render invalid source')}};
 await assert.rejects(fns.winCutouts({sdk:host.sdk,engine,plugin:PLUGIN,data,work,name:'wrong-source',pid:'proj-1',frames:[{name:FIXTURE.photos[0][0],resourceId:'r0',path:'/source.png'}],rejected:[],control:{canceled:false}}),/does not match the selected photo/);
 assert.equal(rendered,false);assert.equal(fs.existsSync(path.join(data,'runs','wrong-source')),false);
});

test('without ProRes and libx264 the stickers use QuickTime Animation and the scenes MPEG-4, same frame counts', { skip, timeout: 600000 }, async (t) => {
  const encodersList = ' V....D qtrle                QuickTime Animation (RLE) video\n V.S... mpeg4                MPEG-4 part 2\n V....D png                  PNG (Portable Network Graphics) image\n';
  const env = setup(t, { encodersList });
  const { fns } = await load(env.host);
  const { result } = await analyse(env, fns);
  assert.equal(result.ready, true);
  const sticker = probeJson(path.join(result.outputDir, '01-sticker.mov'), 'stream=nb_read_frames,codec_name,pix_fmt');
  assert.deepEqual([sticker.streams.length, sticker.streams[0].codec_name, sticker.streams[0].pix_fmt, Number(sticker.streams[0].nb_read_frames)], [1, 'qtrle', 'argb', 60]);
  const base = probeJson(path.join(result.outputDir, '15-base.mp4'), 'stream=nb_read_frames,codec_name');
  assert.deepEqual([base.streams[0].codec_name, Number(base.streams[0].nb_read_frames)], ['mpeg4', 67 + 8 + 2]);
});


test('reopening image analysis reuses the successful job without a person-class gate',{skip},async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'cbg-image-reopen-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const host=mockHost({home}),{fns}=await load(host);
 const first=await fns.photoAiMatte(host.sdk,'proj-1',{resourceId:'r0',subject:'animal'},{scope:'cutout-beat-gallery'});
 const second=await fns.photoAiMatte(host.sdk,'proj-1',{resourceId:'r0',subject:'object'},{scope:'cutout-beat-gallery'});
 assert.equal(first.workflowId,second.workflowId);assert.equal(host.submits.length,1);
 assert.equal(host.submits[0].task,'person.matte');assert.equal(host.submits[0].sourceRange,undefined);
 assert.equal(host.submits[0].options.provider,'auto');assert.equal('subject' in host.submits[0],false);
});


const clientRepo=process.env.SELECTS_CLIENT_REPO||path.join(os.homedir(),'job/repo/cutback-client');
const sdkDeclarations=path.join(clientRepo,'electron/mcp/script-runtime/sdk-declarations');
let ts;
try{ts=require(path.join(clientRepo,'node_modules/typescript'))}catch{}
const haveImageSdk=fs.existsSync(path.join(sdkDeclarations,'ai.d.ts'))&&fs.readFileSync(path.join(sdkDeclarations,'ai.d.ts'),'utf8').includes('sourceKind: "image"');
test('photo submit/prepare/path/source scripts typecheck against current public SDK',{skip:!ts||!haveImageSdk||!HAVE_FFMPEG?'requires image SDK app checkout and TypeScript (SELECTS_CLIENT_REPO)':false},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'photo-ai-sdk-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const host=mockHost({home:dir}),{fns}=await load(host),scripts=[],run=host.sdk.runScript;
 host.sdk.runScript=async args=>{scripts.push(args.script);return run(args)};
 await fns.photoAiMatte(host.sdk,'proj-1',{resourceId:'r0'},{scope:'cutout-beat-gallery'});
 const generated=[...new Set(scripts)].map((script,i)=>{
  const file=path.join(dir,'script-'+i+'.ts');fs.writeFileSync(file,'export {};\nasync function run(){\n'+script+'\n}\n');return file;
 });
 const declarations=fs.readdirSync(sdkDeclarations).filter(file=>file.endsWith('.d.ts')).map(file=>path.join(sdkDeclarations,file));
 const program=ts.createProgram([...declarations,...generated],{noEmit:true,strict:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
 const diagnostics=ts.getPreEmitDiagnostics(program);
 assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>dir,getCanonicalFileName:n=>n,getNewLine:()=>"\n"}));
});
