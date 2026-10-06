import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const source = fs.readFileSync(process.env.TANG_PANEL || new URL('../plugins/tang-poetry-explainer/panel.tsx', import.meta.url), 'utf8');
const prefix = source.slice(0, source.indexOf('export default function Panel')).replace(/^import React from "react";\s*/m, '').replace(/^export /gm, '');
function load(extra = {}) {
  const ctx = {TextDecoder, TextEncoder, Uint8Array, AbortController, setTimeout, clearTimeout, ...extra};
  vm.runInNewContext(stripTypeScriptTypes(prefix) + '\nglobalThis.api={voxHostIO,voxImportScript,voxReadyScript,voxKenBurnsArgs,voxSheetJobs,voxFontOption,hostBytes,draftScript};', ctx);
  return ctx.api;
}
const execute = (script, selects) => vm.runInNewContext(stripTypeScriptTypes(`(async function(selects){${script}})`))(selects);
const response = (chunks, length = null) => ({ok:true,status:200,headers:{get:()=>length},body:new ReadableStream({start(c){for(const chunk of chunks)c.enqueue(Uint8Array.from(chunk));c.close();}})});
function network(fetcher, windows = true) {
  const writes = [], hostCalls = [];
  const api = load({fetch:fetcher, window:{parent:{__DI__:{Runtime:{getPlatform:()=>windows?'win32':'darwin'},FileSystem:{join:path.win32.join,existsSync:()=>true,mkdirSync(){},writeFile:async(p,b)=>writes.push([p,[...b]]),downloadFile:async(...args)=>hostCalls.push(args),readFile:async()=>new TextEncoder().encode('host article'),removeFile:async()=>{}}}}}});
  return {io:api.voxHostIO('C:\\Users\\\ud64d\uae38\ub3d9\\job', {}),writes,hostCalls};
}
test('Windows article and portrait reads bypass the unbounded host downloader',async()=>{
  const n=network(async()=>response([[65,66]]));
  assert.deepEqual({...await n.io.http('https://example.org/page','agent',1)},{code:200,text:'AB'});
  assert.equal(await n.io.download('https://example.org/image','C:\\Users\\\ud64d\uae38\ub3d9\\portrait.jpg'),200);
  assert.equal(n.hostCalls.length,0);assert.deepEqual(n.writes[0][1],[65,66]);
});
test('Windows rejects oversized headers and chunked bodies before a file write',async()=>{
  for(const fetcher of [async()=>response([],String(100*1024*1024)),async()=>response([new Uint8Array(9*1024*1024)])]){
    const n=network(fetcher);assert.equal(await n.io.download('https://example.org/big','dest'),599);assert.equal(n.writes.length,0);assert.equal(n.hostCalls.length,0);
  }
});
test('Windows aborts stalled requests at the requested article timeout',async()=>{
  let aborted=false;
  const n=network((_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));})));
  assert.equal((await n.io.http('https://example.org/stall','agent',0.01)).code,599);assert.equal(aborted,true);
});
test('Windows CORS failure returns the paste-text/optional-portrait fallback',async()=>{
  const n=network(async()=>{throw new TypeError('CORS');});
  assert.equal((await n.io.http('https://example.org/page','agent',1)).code,599);
  assert.equal(await n.io.download('https://example.org/image','dest'),599);assert.equal(n.hostCalls.length,0);
});
test('macOS keeps the host article download path',async()=>{
  const n=network(async()=>{throw Error('unexpected fetch');},false);
  assert.equal((await n.io.http('https://example.org/page','agent',1)).text,'host article');assert.equal(n.hostCalls.length,1);
});
test('resume matches Windows resource basenames case-insensitively and in NFC',async()=>{
  const api=load({window:{parent:{__DI__:{Runtime:{getPlatform:()=> 'win32'}}}}});
  const file='C:\\Users\\\ud64d\uae38\ub3d9\\'+ 'long-path-'.repeat(35)+'\\Caf\u00e9.MP4';
  const rows=[{name:'cafe\u0301.mp4',resourceId:'ready',durationSeconds:5,status:'pending'}];
  const imported=[];const selects={project:()=>({resources:async()=>rows,importFiles:async({paths})=>imported.push(...paths)})};
  assert.equal((await execute(api.voxImportScript('p',[file]),selects)).imported,0);
  const ready=await execute(api.voxReadyScript('p',[file]),selects);assert.equal(ready.map[file],'ready');assert.equal(ready.missing.length,0);assert.equal(imported.length,0);
});
test('cross-realm bytes preserve typed-array offsets',()=>{
  const api=load();assert.deepEqual([...api.hostBytes(vm.runInNewContext('new Uint8Array([1,2,3,4]).subarray(1,3)'))],[2,3]);
  assert.deepEqual([...api.hostBytes(vm.runInNewContext('new Uint8Array([5,6]).buffer'))],[5,6]);
});
test('filter paths quote Windows drive letters; every composite input has square pixels',()=>{
  const api=load();assert.equal(api.voxFontOption('C:\\Windows\\Fonts\\arial.ttf'),"'C\\:/Windows/Fonts/arial.ttf'");
  const args=api.voxKenBurnsArgs('C:\\Users\\\ud64d\uae38\ub3d9\\image.png','out.mp4',1);const f=args[args.indexOf('-filter_complex')+1];
  assert.match(f,/setsar=1\[bg\]/);assert.match(f,/setsar=1\[fg\]/);
  const [job]=api.voxSheetJobs(['1a','1b'],id=>id+'.png',null,()=> 'sheet.jpg');assert.equal((job.args[job.args.indexOf('-filter_complex')+1].match(/setsar=1/g)||[]).length,2);
});
for(const fps of [24000/1001,24,25,30000/1001,30,60000/1001])test(`Draft overlays use the post-insert ${fps} fps`,async()=>{
  const api=load();let inserted=false;const ranges=[];const end=Math.round(5*fps);
  const sel={draftName:'test',segments:[{file:'v',dur:5}],narration:[{file:'n',start:1,dur:2}],music:null,headlines:[],captions:[{start:1,end:3,text:'\u5510\u8a69'}],credit:{source:'',photos:''}};
  const d={insertResource:async()=>{inserted=true;},setFrameSize:async()=>{},meta:async()=>({fps:inserted?fps:30}),clips:async()=>[{endFrame:end}],rangeAtFrames:async(a,b)=>{assert.ok(b>a&&b<=end);ranges.push([a,b]);return {a,b};},overlayResource:async()=>{},addMotionGraphic:async()=>{},commitAll:async()=>({createdDraftId:'d'})};
  const out=await execute(api.draftScript('p',sel,{v:'v',n:'n'}),{project:()=>({meta:async()=>({draftIds:[]}),createDraft:async()=>d,resource:id=>id})});
  assert.equal(out.seconds,end/fps);assert.deepEqual(ranges[0],[Math.round(fps),Math.round(fps)+Math.floor(2*fps)]);assert.deepEqual(ranges[1],[Math.round(fps),Math.round(3*fps)]);
});

test('the deadline aborts a real response whose body stalls after headers',async()=>{
  const {createServer}=await import('node:http');
  const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.write('partial');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const n=network(fetch);const begin=Date.now();
    const r=await n.io.http(`http://127.0.0.1:${server.address().port}/stall`,'agent',0.1);
    assert.equal(r.code,599);assert.ok(Date.now()-begin<2000);assert.equal(n.writes.length,0);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('macOS resource names remain case-sensitive',async()=>{
  const api=load();const files=['/tmp/Clip.mp4'];const rows=[{name:'clip.mp4',resourceId:'other',durationSeconds:5}];
  const selects={project:()=>({resources:async()=>rows,importFiles:async()=>{}})};
  assert.equal((await execute(api.voxImportScript('p',files,false),selects)).imported,1);
  assert.equal((await execute(api.voxReadyScript('p',files,false),selects)).missing.length,1);
});

test('real ffmpeg accepts mixed SAR sheets, drive-letter fonts and the Ken Burns fallback',async(t)=>{
  const {spawnSync}=await import('node:child_process');const os=await import('node:os');
  if(spawnSync('ffmpeg',['-version']).status!==0||spawnSync('ffprobe',['-version']).status!==0)return t.skip('ffmpeg/ffprobe unavailable');
  const font=['/System/Library/Fonts/Supplemental/Arial.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','C:\\Windows\\Fonts\\arial.ttf'].find(p=>fs.existsSync(p));
  if(!font)return t.skip('test font unavailable');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tang-'));
  const ff=args=>{const r=spawnSync('ffmpeg',['-nostdin',...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
  try {
    const api=load(), one=path.join(dir,'one.mp4'),two=path.join(dir,'two.mp4'),img=path.join(dir,'image.png');
    ff(['-y','-v','error','-f','lavfi','-i','testsrc2=s=160x90:d=0.1','-vf','setsar=r=853/854:max=1000',one]);
    ff(['-y','-v','error','-f','lavfi','-i','testsrc2=s=160x90:d=0.1','-vf','setsar=1',two]);
    const fontDir=process.platform==='win32'?path.join(dir,'Fonts'):path.join(dir,'C:','Windows','Fonts');fs.mkdirSync(fontDir,{recursive:true});const localFont=path.join(fontDir,'arial.ttf');fs.copyFileSync(font,localFont);
    const [job]=api.voxSheetJobs(['1a','1b'],id=>id==='1a'?one:two,localFont,()=>path.join(dir,'sheet.jpg'));ff(job.args);
    ff(['-y','-v','error','-i',one,'-frames:v','1',img]);const out=path.join(dir,'fallback.mp4');ff(api.voxKenBurnsArgs(img,out,0.125));
    const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,sample_aspect_ratio','-of','json',out],{encoding:'utf8'});
    assert.equal(probe.status,0,probe.stderr);const stream=JSON.parse(probe.stdout).streams[0];assert.deepEqual(stream,{width:1920,height:1080,sample_aspect_ratio:'1:1'});
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('an empty or partial portrait response is skipped rather than reported as a saved file',async()=>{
  for(const status of [200,204,206]){
    const n=network(async()=>({...response([]),status}));
    assert.equal(await n.io.download('https://example.org/empty','dest'),599);
    assert.equal(n.writes.length,0);
  }
});
