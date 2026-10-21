import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import test from 'node:test';
const require=createRequire(import.meta.url);
const esbuild=require(process.env.SELECTS_ESBUILD||(process.env.SBS_PANEL_TEST_MODULES?process.env.SBS_PANEL_TEST_MODULES+'/esbuild':'esbuild'));
const scope={pluginId:'no14-still-video',libraryId:'library',projectId:'project',runId:'filesystem-test'};
const saved={status:'saved',projectId:'project',draftId:'saved',fps:25,durationFrames:25,frameSize:{width:720,height:1280},clips:[{clipId:1,trackId:'image',resourceId:'r0',startFrame:0,endFrame:25}]};
function sourceAPI(){
 const context={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,btoa,atob,setTimeout,clearTimeout};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(new URL('../shared/template-run.js',import.meta.url),'utf8')+'\nthis.api={executeTemplateRun,writeTemplateRunResult,templateRunJSON,templateRunBase64,validateTemplateRun};',context);
 return context.api;
}
function localFactory(){
 const source=fs.readFileSync(new URL('../shared/local-client.ts',import.meta.url),'utf8');
 const {code}=esbuild.transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}),module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:()=>({}),crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,btoa,atob,setTimeout,clearTimeout});
 return module.exports.createPanelLocalClient;
}
test('independent canonical local clients exclusively claim one real temporary run file',{timeout:4000},async()=>{
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'template-run-files-'));
 try{
  const localFiles={
   environment:async()=>({platform:process.platform,homedir:root,tempDirectory:root,version:'test'}),
   exists:async p=>fs.existsSync(p),mkdir:(p,opts)=>fsp.mkdir(p,opts),
   stat:async p=>{try{const s=await fsp.stat(p);return {size:s.size,mtimeMs:s.mtimeMs,ino:s.ino,isDirectory:s.isDirectory()};}catch(e){if(e.code==='ENOENT')return null;throw e;}},
   readRange:async({path:p,offset,length})=>{const f=await fsp.open(p,'r');try{const bytes=Buffer.alloc(length),{bytesRead}=await f.read(bytes,0,length,offset);return {base64:bytes.subarray(0,bytesRead).toString('base64'),bytesRead};}finally{await f.close();}},
   writeChunk:async input=>{assert.equal(input.offset,0);assert.equal(input.mode,'exclusive');const bytes=Buffer.from(input.base64,'base64');await fsp.writeFile(input.path,bytes,{flag:'wx'});return {bytesWritten:bytes.length};},
   compareAndReplace:async input=>{const current=await fsp.readFile(input.path),expected=Buffer.from(input.expectedBase64,'base64');if(!current.equals(expected))return {replaced:false};const temporary=input.path+'.'+randomUUID();await fsp.writeFile(temporary,Buffer.from(input.base64,'base64'),{flag:'wx'});await fsp.rename(temporary,input.path);return {replaced:true};},
  };
  const selects={files:localFiles},makeSdk=()=>({call:async()=>({owner:{libraryId:'library',projectId:'project'}}),runScript:async input=>{try{return {result:await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects})};}catch(e){return {isError:true,output:e.message};}}});
  const clients=await Promise.all([makeSdk(),makeSdk()].map(async sdk=>({sdk,local:await localFactory()(sdk),api:sourceAPI()})));
  let writes=0;
  const run=({sdk,local,api})=>api.executeTemplateRun(sdk,local.files,scope,{ids:['\uc0ac\uc9c4-1']},()=>true,async(claim,dispatch)=>{await dispatch();writes++;return api.writeTemplateRunResult(selects,claim,saved,api.templateRunJSON,api.templateRunBase64);},async r=>r);
  const result=await Promise.allSettled(clients.map(run));assert.equal(writes,1);assert.ok(result.some(r=>r.status==='fulfilled'&&r.value.draftId==='saved'));
  const recovered=await run(clients[1]);assert.equal(recovered.draftId,'saved');assert.equal(writes,1);
  const folder=path.join(root,'.selects/plugin-data/no14-still-video/template-runs'),files=await fsp.readdir(folder);
  assert.equal(files.length,1);assert.equal(JSON.parse(await fsp.readFile(path.join(folder,files[0]),'utf8')).status,'saved');
 }finally{await fsp.rm(root,{recursive:true,force:true});}
});
test('Main receipt encoding needs no browser globals and preserves Unicode JSON',()=>{
 const api=sourceAPI(),value={title:'\uacf5\uc8fc 🎬 café',path:'C:\\\uc0ac\uc9c4\\\uc5ec\ud589.png'};
 const text=api.templateRunJSON(value);assert.ok(!/[^\x00-\x7f]/.test(text));
 assert.deepEqual(JSON.parse(Buffer.from(api.templateRunBase64(text),'base64').toString('utf8')),value);
});

test('an unconfirmed post-save run durably preserves its acknowledged Draft identity',async()=>{
 const api=sourceAPI(),row={version:1,scope,requestDigest:'digest',owner:randomUUID(),status:'claimed'},claim={path:'/run',expectedText:api.templateRunJSON(row)};let written;
 const selects={files:{compareAndReplace:async input=>{written=JSON.parse(Buffer.from(input.base64,'base64'));return {replaced:true};}}};
 const result=await api.writeTemplateRunResult(selects,claim,{status:'outcomeUnknown',draftId:'saved-but-unverified'},api.templateRunJSON,api.templateRunBase64);
 assert.equal(result.runReceiptSaved,true);assert.equal(written.status,'outcomeUnknown');assert.equal(written.savedDraftId,'saved-but-unverified');
 assert.equal(api.validateTemplateRun(written,scope,'digest').savedDraftId,'saved-but-unverified');
});
for(const savedDraftId of ['',4,'x'.repeat(1025)])test('unknown-run saved identity rejects malformed '+JSON.stringify(savedDraftId).slice(0,40),()=>{
 const api=sourceAPI(),row={version:1,scope,requestDigest:'digest',owner:randomUUID(),status:'outcomeUnknown',savedDraftId};
 assert.throws(()=>api.validateTemplateRun(row,scope,'digest'),/verified/i);
});
