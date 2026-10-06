import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync(new URL('../shared/local-client.ts', import.meta.url), 'utf8');
function load(React = {}) {
  const plain = stripTypeScriptTypes(source.replace(/^import React from "react";\n/, '').replace(/^export \{[^\n]+\};?\s*$/m, ''), {mode:'strip'});
  const context = vm.createContext({React, console, Uint8Array, TextEncoder, TextDecoder, AbortController, DOMException, atob, btoa, setTimeout, clearTimeout});
  vm.runInContext(plain + '\nthis.api={createPanelLocalClient,panelLocalClient,withPanelLocalClient};', context);
  return context.api;
}
function host({platform='darwin', clipRead=false, onStart}={}) {
  const files = new Map(), calls=[], jobs=new Map();
  const fileService={
    environment:async()=>({platform,version:'test',homedir:platform==='win32'?'C:\\Users\\\ud64d\uae38\ub3d9':'/user',tempDirectory:platform==='win32'?'C:\\temp':'/tmp'}),
    stat:async path=>files.has(path)?{size:files.get(path).length}:null,
    exists:async path=>files.has(path),
    readRange:async({path,offset,length})=>{
      assert(length<=49152);
      const bytes=files.get(path).subarray(offset,offset+length);
      return {base64:Buffer.from(bytes).toString('base64'),bytesRead:bytes.length};
    },
    writeChunk:async({path,offset,base64})=>{
      const bytes=Buffer.from(base64,'base64');assert(bytes.length<=49152);
      if(offset)assert.equal(files.get(path)?.length,offset);
      files.set(path,offset?Buffer.concat([files.get(path),bytes]):bytes);
      return {bytesWritten:bytes.length};
    },
    remove:async path=>files.delete(path),
    localUrl:async path=>'local:'+path,
  };
  const start=async()=>{const jobId='job-'+jobs.size;jobs.set(jobId,{state:'succeeded',cancelled:0,events:[{cursor:1,stream:'stdout',text:'first'},{cursor:2,stream:'stderr',text:'progress'},{cursor:3,stream:'stdout',text:'second'}]});onStart?.();return {jobId};};
  const selects={files:fileService,media:{startFFmpeg:start,startFFprobe:start,job:id=>({cancel:async()=>{const job=jobs.get(id);job.cancelled++;job.state='cancelled';job.events=[];}})},editor:{pickDirectory:async()=>null}};
  const sdk={
    runScript:async input=>{
      calls.push(input);assert(Buffer.byteLength(input.script)<256*1024);
      if(/writeChunk|startFF|\.cancel\(/.test(input.script))assert.equal(input.allowCommit,true);
      if(clipRead&&input.script.includes('readRange'))return {isError:false,output:'{"clipped":true}'};
      const result=await new Function('selects',`return (async()=>{${input.script}})()`)(selects);
      return {isError:false,output:JSON.stringify({result}),result:result===undefined?undefined:JSON.parse(JSON.stringify(result))};
    },
    call:async(method,id,{cursor=0})=>{
      assert.equal(method,'getLocalMediaJobStatus');const job=jobs.get(id);
      const events=job.events.filter(event=>event.cursor>cursor).slice(0,1);
      return {state:job.state,events,nextCursor:events.at(-1)?.cursor??cursor,truncated:false};
    },
  };
  return {sdk,files,calls,jobs};
}

test('binary files exceeding script/result limits round-trip as bounded base64 chunks',async()=>{
  const h=host(),client=await load().createPanelLocalClient(h.sdk);
  const data=Uint8Array.from({length:400000},(_,index)=>index%256),path='/tmp/quote";throw Error("injection");.bin';
  await client.files.writeFile(path,data);
  assert.deepEqual(await client.files.readFile(path),data);
  assert(h.calls.filter(call=>call.script.includes('writeChunk')).length>8);
  assert(h.calls.filter(call=>call.script.includes('readRange')).length>8);
});
test('UTF-8 text, empty files, native Windows paths and cancelled picker preserve meaning',async()=>{
  const h=host({platform:'win32'}),client=await load().createPanelLocalClient(h.sdk);
  const path=client.files.join(client.files.homedir(),'\uc0ac\uc9c4','\ub300\ud654.txt'),text='\ud55c\uae00 🌊\n'.repeat(30000);
  assert.equal(path,'C:\\Users\\\ud64d\uae38\ub3d9\\\uc0ac\uc9c4\\\ub300\ud654.txt');
  await client.files.writeFile(path,text,'utf8');assert.equal(await client.files.readFile(path,'utf8'),text);
  await client.files.writeFile(path,'');assert.equal((await client.files.readFile(path)).length,0);
  assert.equal(await client.dialogs.pickDirectoryPath(),null);
});
test('clipped successful reports reject instead of returning empty or partial bytes',async()=>{
  const h=host({clipRead:true});h.files.set('/x',Buffer.from('data'));
  const client=await load().createPanelLocalClient(h.sdk);
  await assert.rejects(client.files.readFile('/x'),/incomplete result/);
});
test('terminal process output is drained across pages and delivered to callbacks',async()=>{
  const h=host(),client=await load().createPanelLocalClient(h.sdk),events=[];
  const result=await client.media.runFFmpeg(['-version'],true,undefined,text=>events.push(['out',text]),text=>events.push(['err',text]));
  assert.deepEqual({...result},{stdout:'firstsecond',stderr:'progress'});
  assert.deepEqual(events,[['out','first'],['err','progress'],['out','second']]);
});
test('abort during start cancels the returned host job, not just the local promise',async()=>{
  const controller=new AbortController(),h=host({onStart:()=>controller.abort()}),client=await load().createPanelLocalClient(h.sdk);
  await assert.rejects(client.media.runFFmpeg(['-i','/x'],true,controller.signal),error=>error.name==='AbortError');
  assert(h.jobs.get('job-0').cancelled>=1);
});
test('disposing while a media start is pending cancels the returned job',async()=>{
  let release;const h=host(),original=h.sdk.runScript;
  h.sdk.runScript=async input=>{if(input.script.includes('startFF'))await new Promise(resolve=>{release=resolve;});return original(input);};
  const client=await load().createPanelLocalClient(h.sdk),running=client.media.runFFmpeg([],true);
  client.dispose();release();
  await assert.rejects(running,error=>error.name==='AbortError');
  assert(h.jobs.get('job-0').cancelled>=1);
});
test('a signal already aborted never starts the host process',async()=>{
  const controller=new AbortController();controller.abort();
  const h=host(),client=await load().createPanelLocalClient(h.sdk);
  await assert.rejects(client.media.runFFprobe([],true,controller.signal),error=>error.name==='AbortError');
  assert.equal(h.jobs.size,0);
});
test('wrapper waits for environment, keeps original public sdk, and removes the private client on unmount',async()=>{
  let state=null,effect,cleanup;const React={useState:()=>[state,value=>{state=value;}],useEffect:fn=>{effect??=fn;},createElement:(type,props,...children)=>({type,props,children})};
  const api=load(React),h=host();let release;
  const original=h.sdk.runScript;
  h.sdk.runScript=async input=>{if(input.script.includes('environment'))await new Promise(resolve=>{release=resolve;});return original(input);};
  const Component=()=>null,Wrapped=api.withPanelLocalClient(Component),props={sdk:h.sdk,context:{}};
  assert.equal(Wrapped(props).props.role,'status');cleanup=effect();
  assert.throws(()=>api.panelLocalClient(h.sdk),/not initialized/);
  release();await new Promise(resolve=>setImmediate(resolve));
  const rendered=Wrapped(props);assert.equal(rendered.type,Component);assert.equal(rendered.props.sdk,h.sdk);
  assert(api.panelLocalClient(h.sdk).files);assert.equal(h.sdk.files,undefined);
  cleanup();assert.throws(()=>api.panelLocalClient(h.sdk),/not initialized/);
});
test('all plugins embedding the local helper wrap their component before use',()=>{
  let count=0;
  for(const directory of fs.readdirSync(new URL('../plugins/',import.meta.url))){
    const path=new URL(`../plugins/${directory}/panel.tsx`,import.meta.url);if(!fs.existsSync(path))continue;
    const panel=fs.readFileSync(path,'utf8');if(!panel.includes('function createPanelLocalClient('))continue;
    count++;assert.match(panel,/(?:export default|=)\s*withPanelLocalClient\(/,directory);
  }
  assert(count>=38,`expected migrated local panels, found ${count}`);
});
