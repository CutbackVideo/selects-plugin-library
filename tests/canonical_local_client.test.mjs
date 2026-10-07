import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire, stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync(new URL('../shared/local-client.ts', import.meta.url), 'utf8');
function load(React = {}, clientSource = source) {
  const plain = stripTypeScriptTypes(clientSource.replace(/^import React from "react";\n/, '').replace(/^export \{[^\n]+\};?\s*$/m, ''), {mode:'strip'});
  const context = vm.createContext({React, console, crypto:webcrypto, Uint8Array, TextEncoder, TextDecoder, AbortController, DOMException, atob, btoa, setTimeout, clearTimeout});
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
    writeChunk:async({path,offset,base64,mode})=>{
      const bytes=Buffer.from(base64,'base64');assert(bytes.length<=49152);
      if(offset)assert.equal(files.get(path)?.length,offset);
      if(mode==='exclusive'&&files.has(path))throw new Error('EEXIST');
      files.set(path,offset||mode==='append'?Buffer.concat([files.get(path)||Buffer.alloc(0),bytes]):bytes);
      return {bytesWritten:bytes.length};
    },
    remove:async path=>files.delete(path),
    rename:async (from,to)=>{assert(files.has(from));files.set(to,files.get(from));files.delete(from);},
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

// Match the host's pre-execution check, which JavaScript-only tests cannot catch.
const sdkTypes = [process.env.SELECTS_SDK_TYPES,
  path.join(homedir(), '.selects-staging/resources/sdk'),
  path.join(homedir(), '.selects/resources/sdk')]
  .find(directory => directory && fs.existsSync(path.join(directory, 'local-files.d.ts')));
const require = createRequire(import.meta.url);
let typescript;
for (const directory of [process.cwd(), process.env.SELECTS_DEV_REPO,
  path.join(homedir(), 'cutback-workspace/cutback-client')].filter(Boolean)) {
  try { typescript = require(require.resolve('typescript', {paths: [directory]})); break; }
  catch { /* Try the next local installation. */ }
}

test('shared, Card News Maker and a16z file scripts pass the host SDK TypeScript check', {
  skip: !typescript || !sdkTypes ? 'requires local TypeScript and Selects SDK declarations' : false,
}, async () => {
  const panel = fs.readFileSync(new URL('../plugins/card-news-maker/panel.tsx', import.meta.url), 'utf8');
  const embedded = panel.split('// local-sdk:start\n')[1].split('// local-sdk:end')[0]
    .replace(/^export default withPanelLocalClient\(\w+\);\s*$/m, '');
  const a16zPanel = fs.readFileSync(process.env.A16Z_STYLE_CAPTIONS_PANEL ||
    new URL('../plugins/a16z-style-captions/panel.tsx', import.meta.url), 'utf8');
  const a16zClient = a16zPanel.split('// shared/local-client.ts\n')[1]
    .split('// plugins/a16z-style-captions/')[0];
  const directory = fs.mkdtempSync(path.join(tmpdir(), 'local-client-types-'));
  try {
    const scripts = [];
    for (const clientSource of [source, embedded, a16zClient]) {
      const h = host(), client = await load({}, clientSource).createPanelLocalClient(h.sdk);
      const file = '/tmp/\ud55c\uae00 "quoted"\\file.bin';
      await client.files.writeFile(file, new Uint8Array(100000));
      await client.files.writeFile(file, '', 'utf8');
      await client.files.writeFile('/lease', 'owner', {flag:'wx'});
      await client.files.writeFile('/lease', '\nnext', {flag:'a'});
      assert.equal(await client.files.readFile('/lease', 'utf8'), 'owner\nnext');
      scripts.push(...h.calls.map(call => call.script));
    }
    const file = path.join(directory, 'scripts.ts');
    fs.writeFileSync(file, 'declare const selects: {files: LocalFilesService};\n' +
      scripts.map((script, index) => `async function run${index}() { ${script} }`).join('\n'));
    const program = typescript.createProgram([path.join(sdkTypes, 'local-files.d.ts'), file], {
      noEmit: true, strict: true, skipLibCheck: true, target: typescript.ScriptTarget.ES2022,
    });
    const diagnostics = typescript.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, typescript.formatDiagnostics(diagnostics, {
      getCanonicalFileName: file => file, getCurrentDirectory: () => directory, getNewLine: () => '\n',
    }));
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

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

test('exclusive creation and bounded append preserve lease and journal contents',async()=>{
  const h=host(),client=await load().createPanelLocalClient(h.sdk);
  await client.files.writeFile('/lease','owner',{flag:'wx'});
  await assert.rejects(client.files.writeFile('/lease','loser',{flag:'wx'}),/EEXIST/);
  await client.files.writeFile('/lease','\nnext',{flag:'a',encoding:'utf8'});
  assert.equal(await client.files.readFile('/lease','utf8'),'owner\nnext');
  const calls=h.calls.length;
  await assert.rejects(client.files.writeFile('/lease','x'.repeat(49153),{flag:'a'}),/48 KiB/);
  assert.equal(h.calls.length,calls);
  assert.equal(await client.files.readFile('/lease','utf8'),'owner\nnext');
  const beforeExclusive=h.calls.length;
  await assert.rejects(client.files.writeFile('/large',new Uint8Array(100000),{flag:'wx'}),/48 KiB/);
  assert.equal(h.calls.length,beforeExclusive);
  assert.equal(h.files.has('/large'),false);
});


test('concurrent complete writes publish one intact file instead of mixing chunks',async()=>{
  const h=host(),client=await load().createPanelLocalClient(h.sdk);
  const first=new Uint8Array(100000).fill(65),second=new Uint8Array(100000).fill(66);
  await Promise.all([client.files.writeFile('/shared',first),client.files.writeFile('/shared',second)]);
  const result=await client.files.readFile('/shared');
  assert.equal(result.length,100000);
  assert(result.every(byte=>byte===65)||result.every(byte=>byte===66));
  assert.deepEqual([...h.files.keys()],['/shared']);
});

test('a failed replacement preserves the original and removes its temporary file',async()=>{
  for(const failure of ['chunk','rename']){
    const h=host(),client=await load().createPanelLocalClient(h.sdk);
    h.files.set('/existing',Buffer.from('original'));
    const original=h.sdk.runScript;
    h.sdk.runScript=async input=>{
      if(failure==='chunk'&&input.script.includes('writeChunk')&&input.script.includes('"offset":49152')||failure==='rename'&&input.script.includes('files.rename'))return {isError:true,output:'native write blocked'};
      return original(input);
    };
    await assert.rejects(client.files.writeFile('/existing',new Uint8Array(100000)),/native write blocked/);
    assert.equal(h.files.get('/existing').toString(),'original');
    assert.deepEqual([...h.files.keys()],['/existing']);
  }
});


test('concurrent 100 KiB writes publish intact bytes through native file operations',async()=>{
  const directory=await fs.promises.mkdtemp(path.join(tmpdir(),'canonical-write-'));
  const destination=path.join(directory,'media.bin');
  const nativeFiles={
    environment:async()=>({platform:'darwin',homedir:directory,tempDirectory:directory}),
    async writeChunk({path:file,offset,base64,mode}){
      const bytes=Buffer.from(base64,'base64');
      assert(bytes.length<=49152);
      if(offset)assert.equal((await fs.promises.stat(file)).size,offset);
      await fs.promises.writeFile(file,bytes,{flag:mode==='exclusive'?'wx':offset||mode==='append'?'a':'w'});
      return{bytesWritten:bytes.length};
    },
    rename:(from,to)=>fs.promises.rename(from,to),
    remove:(file,options)=>fs.promises.rm(file,options),
  };
  const sdk={runScript:async({script})=>({isError:false,result:await new Function('selects',`return(async()=>{${script}})()`)({files:nativeFiles})})};
  try{
    const first=await load().createPanelLocalClient(sdk),second=await load().createPanelLocalClient(sdk);
    await Promise.all([first.files.writeFile(destination,new Uint8Array(100*1024).fill(65)),second.files.writeFile(destination,new Uint8Array(100*1024).fill(66))]);
    const bytes=await fs.promises.readFile(destination);
    assert.equal(bytes.length,100*1024);
    assert(bytes.every(byte=>byte===65)||bytes.every(byte=>byte===66));
    assert.deepEqual(await fs.promises.readdir(directory),['media.bin']);
  }finally{await fs.promises.rm(directory,{recursive:true,force:true});}
});

test('atomic text comparison uses the bounded committed SDK verb and rejects unknown outcomes',async()=>{
  const files=new Map(),calls=[];
  const sdk={runScript:async input=>{
    calls.push(input);
    const result=await new Function('selects',`return (async()=>{${input.script}})()` )({files:{
      environment:async()=>({platform:'darwin',homedir:'/user',tempDirectory:'/tmp'}),
      compareAndReplace:async({path,expectedBase64,base64})=>{
        assert.equal(input.allowCommit,true);
        const expected=expectedBase64===null?null:Buffer.from(expectedBase64,'base64').toString('utf8');
        const current=files.has(path)?files.get(path):null;
        if(current!==expected)return {replaced:false};
        files.set(path,Buffer.from(base64,'base64').toString('utf8'));return {replaced:true};
      },
    }});
    return {isError:false,result};
  }};
  const client=await load().createPanelLocalClient(sdk),path='/pointer"name';
  assert.equal(await client.files.compareAndReplace(path,null,'🌊'),true);
  assert.equal(await client.files.compareAndReplace(path,null,'wrong'),false);
  assert.equal(await client.files.compareAndReplace(path,'🌊','next'),true);
  assert.equal(files.get(path),'next');
  const count=calls.length;
  await assert.rejects(client.files.compareAndReplace(path,'next','🌊'.repeat(12289)),/48 KiB/);
  assert.equal(calls.length,count);
  sdk.runScript=async()=>({isError:false});
  await assert.rejects(client.files.compareAndReplace(path,'next','unknown'),/incomplete result/);
});

test('panels that keep a module-level client bind the one the wrapper registered, not the bare panel sdk', () => {
  const methods=['homedir','join','dirname','readFile','writeFile','mkdir','exists','rename','pathToLocalURL','readdir','stat'];
  for(const [id,start,end,accessor] of [
    ['place-count','let localSdk=null;','\nasync function readText','getFS()'],
    ['postcard-cutout-studio','let localSdk = null;','\n// A host service that must have','hostApi("FileSystem", "exists")'],
  ]){
    const panel=fs.readFileSync(new URL(`../plugins/${id}/panel.tsx`,import.meta.url),'utf8');
    const from=panel.indexOf(start),binding=panel.slice(from,panel.indexOf(end,from));
    const sdk={runScript:async()=>({})},client={...sdk,files:Object.fromEntries(methods.map(name=>[name,()=>{}]))};
    const registered=value=>{assert.equal(value,sdk);return client;};
    const bindAndRead=new Function('panelLocalClient','issue',`${binding}\nreturn value=>{bindLocalSdk(value);return ${accessor};};`)(registered,message=>new Error(message));
    assert.equal(bindAndRead(sdk),client.files,id);
  }
});

test('file cleanup succeeds when the host forwards optional flags to Node',async()=>{
  const directory=await fs.promises.mkdtemp(path.join(tmpdir(),'canonical-remove-'));
  const calls=[];
  const sdk={runScript:async input=>{
    calls.push(input);
    const result=await new Function('selects',`return(async()=>{${input.script}})()`)({files:{
      environment:async()=>({platform:process.platform,homedir:directory,tempDirectory:directory}),
      remove:(file,options={})=>fs.promises.rm(file,{recursive:options.recursive,force:options.force}),
    }});
    return {isError:false,result};
  }};
  try{
    const client=await load().createPanelLocalClient(sdk);
    for(const operation of [file=>client.files.rm(file),file=>client.files.rm(file,{force:true}),file=>client.files.removeFile({filePath:file})]){
      const file=path.join(directory,'temporary.rgb');await fs.promises.writeFile(file,'pixels');
      await operation(file);assert.equal(fs.existsSync(file),false);
    }
    await client.files.rm(path.join(directory,'missing'),{force:true});
    const folder=path.join(directory,'nested');await fs.promises.mkdir(folder);await fs.promises.writeFile(path.join(folder,'mask.png'),'mask');
    await assert.rejects(client.files.rm(folder),/directory|EISDIR/);
    assert.equal(fs.existsSync(path.join(folder,'mask.png')),true);
    await client.files.rm(folder,{recursive:true,force:true});assert.equal(fs.existsSync(folder),false);
    assert(calls.filter(c=>c.script.includes('files.remove')).every(c=>c.allowCommit===true));
  }finally{await fs.promises.rm(directory,{recursive:true,force:true});}
});
