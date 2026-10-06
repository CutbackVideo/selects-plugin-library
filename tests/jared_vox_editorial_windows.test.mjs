import {asyncSdk} from './windows_host.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../plugins/jared-vox-editorial/panel.tsx',import.meta.url),'utf8');
function panel(extra={}) {
 const ctx={TextDecoder,TextEncoder,Uint8Array,AbortController,setTimeout,clearTimeout,
  window:{parent:{__DI__:{Runtime:{getPlatform:()=> 'win32'},FileSystem:{join:(...p)=>p.join('\\'),writeFile:async()=>{},downloadFile:()=>{throw Error('unexpected host download');}}}}},...extra};
 const prefix=source.slice(0,source.indexOf('export default function Panel')).replace(/^import React from "react";\s*/m,'').replace(/^export /gm,'');
 ctx.__sdk = asyncSdk(ctx.window.parent.__DI__);
 ctx.files = ctx.__sdk.files;
 ctx.window.parent.__DI__ = new Proxy({}, {get() { throw Error('Migrated DI access'); }});
 vm.runInNewContext(stripTypeScriptTypes(prefix) + '\nhostUseSdk(__sdk);',ctx); return ctx;
}
test('article pages and portraits use FileSystem.downloadFile on win32',async()=>{
 const c=panel({fetch:async()=>{throw Error('article/portrait must use the host');}});
 const downloads=[],removed=[],files=new Map(),host=c.files;
 host.downloadFile=async(url,dest)=>{downloads.push([url,dest]);files.set(dest,new TextEncoder().encode('host body'));};
 host.readFile=async path=>files.get(path);
 host.exists=async path=>files.has(path);
 host.removeFile=async ({filePath:path})=>{removed.push(path);files.delete(path);};
 const io=c.voxHostIO('C:\\Users\\user\\job',{});
 const article=await io.http('https://example.org/article','agent',1);
 assert.equal(article.code,200);assert.equal(article.text,'host body');
 assert.equal(await io.download('https://example.org/photo.jpg','portrait.jpg'),200);
 assert.equal(downloads.length,2);
 assert.equal(downloads[0][0],'https://example.org/article');
 assert.match(downloads[0][1],/^C:\\Users\\user\\job\\dl-.*\.tmp$/);
 assert.deepEqual(downloads[1],['https://example.org/photo.jpg','portrait.jpg']);
 assert.deepEqual(removed,[downloads[0][1]]);
 assert.equal(files.has(downloads[0][1]),false);
 assert.equal(files.has('portrait.jpg'),true);
});
test('Wikimedia API replies use fetch with origin=* and Api-User-Agent',async()=>{
 const calls=[],c=panel({fetch:async(url,options)=>{calls.push([url,options]);return new Response('api body');}});
 const io=c.voxHostIO('job',{});
 for(const domain of ['en.wikipedia.org','commons.wikimedia.org']) {
  const url=`https://${domain}/w/api.php?action=query`;
  const answer=await io.http(url,'test-agent',1);
  assert.equal(answer.code,200);assert.equal(answer.text,'api body');
  assert.equal(calls.at(-1)[0],url+'&origin=*');
  assert.equal(calls.at(-1)[1].headers['Api-User-Agent'],'test-agent');
 }
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
test('macOS basename matching remains case-sensitive',async()=>{
 const c=panel();c.__sdk.environment.platform = 'darwin';
 const script=c.voxImportScript('p',['/tmp/job/clip.mp4']);const imported=[];
 await vm.runInNewContext(stripTypeScriptTypes('(async()=>{'+script+'})()'),{
  selects:{project:()=>({resources:async()=>[{name:'CLIP.mp4'}],importFiles:async x=>imported.push(...x.paths)})}});
 assert.deepEqual(imported,['/tmp/job/clip.mp4']);
});
