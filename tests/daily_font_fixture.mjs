// Daily-only whole production panel fixture with the actual bundled font bytes.
import vm from 'node:vm';import fs from 'node:fs';import path from 'node:path';import{createRequire}from'node:module';
import{loadPanelModule}from'./panel_module_fixture.mjs';
export const source=process.env.DAILY_VLOG_PANEL?fs.readFileSync(process.env.DAILY_VLOG_PANEL,'utf8'):fs.readFileSync(new URL('../plugins/daily-vlog-8/panel.tsx',import.meta.url),'utf8');
const modules=process.env.SBS_PANEL_TEST_MODULES;if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to existing panel dependencies.');
const require=createRequire(path.resolve(modules,'../package.json'));export const React=require('react');
export function dailyModule(names){return loadPanelModule(source,{names,React});}
export const fontEncodedBytes=fs.readFileSync(new URL('../plugins/daily-vlog-8/assets/fonts/chelseamarket/ChelseaMarket-Regular.ttf.b64',import.meta.url));
export const fontBytes=Buffer.from(fontEncodedBytes.toString(),'base64');
export const licenseBytes=fs.readFileSync(new URL('../plugins/daily-vlog-8/assets/fonts/chelseamarket/OFL.txt',import.meta.url));
export function fontFiles({failure,truncate=false,invalid=false,encodingCorrupt}={}){
 const reads=[];const bytes=path=>{if(failure)throw failure;if(!/[\\/]assets[\\/]fonts[\\/]chelseamarket[\\/](ChelseaMarket-Regular\.ttf\.b64|OFL\.txt)$/.test(path))throw Error('Unexpected font path');if(path.endsWith('OFL.txt'))return licenseBytes;if(invalid)return Buffer.alloc(fontEncodedBytes.length);if(encodingCorrupt){const b=Buffer.from(fontEncodedBytes);if(encodingCorrupt==='alphabet')b[20]=33;else b[b.length-3]+=1;return b;}return fontEncodedBytes;};
 return{reads,async stat(path){const b=bytes(path);return{size:b.length,isDirectory:false}},async readRange({path,offset,length}){if(!(length>0&&length<=49152))throw Error('Font reads must stay bounded');reads.push({path,offset,length});const b=bytes(path).subarray(offset,offset+length-(truncate?1:0));return{base64:b.toString('base64'),bytesRead:b.length};}};
}

const {buildDailyVlog}=dailyModule(['buildDailyVlog']);
const codeHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); };
const SECONDS = {'relaxed-urban-bed.wav': 69.84, 'transition-w2.wav': 1.389977, 'shutter-s2.wav': 0.516984, 'camera-r2.wav': 0.940726, 'shutter-c2.wav': 1, 'shutter-s6-1.wav': 0.213991, 'typing-k3.wav': 2.5};

// A fake Draft: inserts round to whole frames, overlays go to the first audio track free over their range, a
// transition spans round(offset * fps) frames each side of its cut.
export async function buildDailyFixture(fps, {clipSeconds = 30, durations = {}, clips = 8, frameSize = {width: 1920, height: 1080}, reported = fps, adopt = null, fontOptions = {}, lifecycle = {}} = {}) {
  const initialFps = fps, initialReported = reported; let draftCount=0, commits=0;
  const rows = [...Array.from({length: 9}, (_, i) => ({resourceId: 'v' + i, type: 'Video', name: 'v' + i, durationSeconds: durations['v' + i] ?? clipSeconds})),
    ...Object.entries(SECONDS).map(([name, s]) => ({resourceId: 'a:' + name, type: 'Audio', name, durationSeconds: s}))];
  const main = [], audio = [], transitions = [], graphics = [], transforms = [], inserts = [];
  let cursor = 0, next = 0;
  const draft = {
    meta: async () => ({fps: reported, frameSize}),
    insertResource: async (a) => { if (adopt && !main.length) fps = reported = adopt; inserts.push(a); const n = Math.round((a.sourceRange.endSeconds - a.sourceRange.startSeconds) * fps); main.push({clipId: 'c' + next++, resourceId: a.resourceId, startFrame: cursor, endFrame: cursor + n}); cursor += n; },
    clips: async ({trackScope}) => trackScope === 'main' ? main : [...main, ...audio],
    setClipAudio: async () => {},
    setClipTransform: async (a) => transforms.push({clipId: a.clip.clipId, scale: a.scale.x, x: a.position?.x || 0}),
    rangeAtFrames: async (a, b) => [a, b],
    addMotionGraphic: async (a) => graphics.push({name: a.label, start: a.within[0], end: a.within[1], codeHash: codeHash(a.tsxCode), parameters: a.parameters}),
    addTransition: async (a) => transitions.push({name: a.label, edit: a.after.endFrame, start: a.after.endFrame - Math.round(a.inOffsetSeconds * fps), end: a.after.endFrame + Math.round(a.outOffsetSeconds * fps)}),
    overlayResource: async ({resource, over, sourceStartSeconds = 0}) => {
      const name = resource.slice(2);
      if ((over[1] - over[0]) / fps > SECONDS[name] - sourceStartSeconds + 1e-3 / fps) throw new Error('overlay past the end of ' + name);
      let track = 0;
      while (audio.some((c) => c.track === track && c.startFrame < over[1] && over[0] < c.endFrame)) track++;
      audio.push({clipId: 'c' + next++, resourceId: resource, name, startFrame: over[0], endFrame: over[1], track, sourceStartSeconds});
    },
    commitAll: async () => { commits++; lifecycle.commits=commits; return {createdDraftId: 'd1'}; },
  };
  const project = {resources: async () => rows, importFiles: async () => { throw new Error('nothing to import'); }, createDraft: async () => { main.length=audio.length=transitions.length=graphics.length=transforms.length=inserts.length=0; cursor=0; next=0; fps=initialFps; reported=initialReported; draftCount++; lifecycle.drafts=draftCount; return draft; }, resource: (id) => id, sourceFiles: async () => ({fileTree: rows.filter((r) => r.type === 'Video').map((r) => ({type: 'file', resourceId: r.resourceId, frameSize: {width: 4096, height: 2160}}))})};
  const files=fontFiles(fontOptions);
  const sdk = {runScript: async ({summary, script}) => summary === 'Find the plugin files' ? {result: {plugin: '/plugin'}} : {result: await vm.runInNewContext('(async()=>{'+script+'})()', {selects:{project:()=>project,files}}, {codeGeneration:{strings:false,wasm:false}})}};
  const result = await buildDailyVlog(sdk, {projectId: 'p', titleId: 'v0', order: clips < 8 ? ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', null, 'v7'] : Array.from({length: 8}, (_, i) => 'v' + (i + 1))});
  return JSON.parse(JSON.stringify({result, main, audio, transitions, graphics, transforms, inserts, draftCount, commits, fontReads:files.reads}));
}
