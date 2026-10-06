import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../plugins/jared-vox-editorial/panel.tsx',import.meta.url),'utf8');
function panel(extra={}) {
 const ctx={TextDecoder,TextEncoder,Uint8Array,AbortController,setTimeout,clearTimeout,
  window:{parent:{__DI__:{Runtime:{getPlatform:()=> 'win32'},FileSystem:{join:(...p)=>p.join('\\'),writeFile:async()=>{},downloadFile:()=>{throw Error('unsafe main-process download');}}}}},...extra};
 const prefix=source.slice(0,source.indexOf('export default function Panel')).replace(/^import React from "react";\s*/m,'').replace(/^export /gm,'');
 vm.runInNewContext(stripTypeScriptTypes(prefix),ctx); return ctx;
}
test('article and portrait downloads avoid the unbounded host downloader',async()=>{
 const c=panel({fetch:async()=>new Response('bounded body')});
 const writes=[];c.window.parent.__DI__.FileSystem.writeFile=async(p,b)=>writes.push([p,new TextDecoder().decode(b)]);
 const io=c.voxHostIO('C:\\Users\\\ud64d\uae38\ub3d9\\job',{});
 assert.equal((await io.http('https://example.org/article','agent',1)).text,'bounded body');
 assert.equal(await io.download('https://example.org/photo.jpg','dest.jpg'),200);
 assert.deepEqual(writes,[['dest.jpg','bounded body']]);
});
test('stream limit rejects declared and chunked oversize; aborts stalled body',async()=>{
 const c=panel({fetch:async()=>new Response('12345',{headers:{'Content-Length':'5'}})});
 await assert.rejects(()=>c.voxFetchLimited('https://example.org',{},4,100),/large/i);
 let cancelled=false;
 c.fetch=async()=>new Response(new ReadableStream({start(s){s.enqueue(new Uint8Array(3));s.enqueue(new Uint8Array(3));},cancel(){cancelled=true;}}));
 await assert.rejects(()=>c.voxFetchLimited('https://example.org',{},4,100),/large/i);
 assert.equal(cancelled,true);
 c.fetch=async()=>new Response(new ReadableStream({cancel(){cancelled=true;}}));
 await assert.rejects(()=>c.voxFetchLimited('https://example.org',{},4,15),/timed out/i);
 c.fetch=async()=>new Response('1234');
 assert.equal((await c.voxFetchLimited('https://example.org',{},4,100)).bytes.length,4);
});
test('ready/import scripts normalize Windows basename case and Unicode',async()=>{
 const c=panel(); const file='C:\\Users\\\ud64d\uae38\ub3d9\\Cafe\u0301.MP4';
 const rows=[{name:'CAF\u00c9.mp4',durationSeconds:2,resourceId:'r'}];
 const run=script=>vm.runInNewContext(stripTypeScriptTypes('(async()=>{'+script+'})()'),{
  selects:{project:()=>({resources:async()=>rows,importFiles:async()=>{throw Error('duplicate import')}})}});
 assert.equal((await run(c.voxImportScript('p',[file]))).imported,0);
 assert.equal((await run(c.voxReadyScript('p',[file]))).map[file],'r');
});
test('filter paths quote drive colons and normalize SAR before composition',()=>{
 const c=panel();
 assert.equal(c.voxFontOption('C:\\Windows\\Fonts\\arial.ttf'),"'C\\:/Windows/Fonts/arial.ttf'");
 const args=c.voxKenBurnsArgs('C:\\Users\\\ud64d\uae38\ub3d9\\a.png','out.mp4',1); const graph=args[args.indexOf('-filter_complex')+1];
 assert.match(graph,/setsar=1[^;]*\[bg\]/); assert.match(graph,/setsar=1\[fg\]/);
 const sheet=c.voxSheetJobs(['1a','1b'],()=> 'image.png',null,()=> 'sheet.jpg')[0].args;
 assert.match(sheet[sheet.indexOf('-filter_complex')+1],/scale=480:270,setsar=1/);
});
test('host bytes accept foreign buffers and offset views',()=>{
 const c=panel();
 assert.deepEqual([...c.hostBytes(vm.runInNewContext('new Uint8Array([1,2,3]).subarray(1)'))],[2,3]);
 assert.deepEqual([...c.hostBytes(vm.runInNewContext('new Uint8Array([4,5]).buffer'))],[4,5]);
});
for (const fps of [24000/1001,24,25,30000/1001,30,60000/1001]) {
 test(`Draft placement uses its post-insert rate ${fps}`,async()=>{
  const c=panel(),frames=Math.round(5*fps),ranges=[]; let inserted=false;
  const draft={insertResource:async()=>{inserted=true;},setFrameSize:async()=>{},meta:async()=>({fps:inserted?fps:30}),
   clips:async()=>[{endFrame:frames}],rangeAtFrames:async(a,b)=>{assert.ok(a>=0&&b>a&&b<=frames);ranges.push([a,b]);return {a,b};},
   overlayResource:async()=>{},addMotionGraphic:async()=>{},commitAll:async()=>({createdDraftId:'d'})};
  const script=c.draftScript('p',{draftName:'test',segments:[{file:'clip',dur:5}],narration:[{file:'voice',start:1,dur:1}],music:null,
   headlines:[{beat:1,text:'\uc81c\ubaa9',start:1,end:2,evidence:[]}],captions:[{text:'\u5b57\u5e55',start:2,end:3}],credit:{}},{clip:'c',voice:'v'});
  const execute=vm.runInNewContext(stripTypeScriptTypes('(async function(selects){'+script+'})'));
  const result=await execute({project:()=>({meta:async()=>({draftIds:[]}),createDraft:async()=>draft,resource:()=>({})})});
  assert.equal(result.seconds,frames/fps);
  assert.deepEqual(ranges,[[Math.round(fps),Math.round(fps)+Math.floor(fps)],[Math.round(fps),Math.round(2*fps)],[Math.round(2*fps),Math.round(3*fps)]]);
 });
}
test('network failure is recoverable, never writes a failed portrait',async()=>{
 const c=panel({fetch:async()=>{throw Error('CORS');}}),io=c.voxHostIO('job',{});
 assert.equal((await io.http('https://example.org','agent',1)).code,599);
 assert.equal(await io.download('https://example.org','portrait.jpg'),599);
 c.fetch=async()=>new Response('not found',{status:404});
 assert.equal(await io.download('https://example.org','portrait.jpg'),404);
});
test('macOS basename matching remains case-sensitive',async()=>{
 const c=panel();c.window.parent.__DI__.Runtime.getPlatform=()=> 'darwin';
 const script=c.voxImportScript('p',['/tmp/job/clip.mp4']);const imported=[];
 await vm.runInNewContext(stripTypeScriptTypes('(async()=>{'+script+'})()'),{
  selects:{project:()=>({resources:async()=>[{name:'CLIP.mp4'}],importFiles:async x=>imported.push(...x.paths)})}});
 assert.deepEqual(imported,['/tmp/job/clip.mp4']);
});
