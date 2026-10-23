'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const {loadPanel}=require('./survey_harness.cjs');
const modules=process.env.SBS_PANEL_TEST_MODULES;

test('batched template file reads preserve errors, budgets and complete-template semantics',{skip:!modules},async t=>{
 const {exports:api,esbuild}=loadPanel(['sdkFiles','shellFiles','hostFiles','makeStore','makeTemplateRepository','readTemplatePack','templateDigest']);
 async function sdkFixture(){
  const files=new Map(),scripts=[],stats=[],ranges=[];let failRead=false,failStat=false;
  const selects={files:{environment:async()=>({platform:'win32',homedir:'C:\\Users\\u'}),stat:async p=>{if(failStat)throw Error('stat denied');stats.push(p);const b=files.get(p);return b===undefined?null:{size:b==='directory'?0:b.length,isDirectory:b==='directory',mtimeMs:1};},readRange:async({path:p,offset,length})=>{if(failRead)throw Error('read denied');assert.ok(length<=49152);ranges.push(p);const value=files.get(p);if(!value)throw Error('missing file');return {base64:value.subarray(offset,offset+length).toString('base64')};}}};
  const backend=await api.sdkFiles({runScript:async({script})=>{
   assert.ok(Buffer.byteLength(script)<256*1024,'input script cap');scripts.push(script);
   const code=esbuild.transformSync('return (async()=>{'+script+'})();',{loader:'ts'}).code;
   const result=await new Function('selects',code)(selects);assert.ok(Buffer.byteLength(JSON.stringify(result))<256*1024,'response cap');return {result};
  }});
  scripts.length=0;
  return {files,scripts,stats,ranges,fs:api.hostFiles(backend),failRead:()=>failRead=true,failStat:()=>failStat=true};
 }
 await t.test('mixed small/large, absent and empty files retain order and use bounded batches',async()=>{
  const f=await sdkFixture(),paths=['missing','empty','a','large','b','c','d'];
  f.files.set('empty',Buffer.alloc(0));for(const p of ['a','b','c','d'])f.files.set(p,Buffer.alloc(60*1024,p));f.files.set('large',Buffer.alloc(340*1024,7));
  const values=await f.fs.readFiles(paths);
  assert.equal(values[0],null);for(let i=1;i<paths.length;i++)assert.deepEqual(Buffer.from(values[i]),f.files.get(paths[i]));
  assert.equal(f.scripts.length,6,'one metadata, two small-file batches, three large-file scripts');assert.deepEqual(f.stats,paths);
  f.files.set('folder','directory');await assert.rejects(f.fs.readFiles(['folder']),/Expected a saved file/);
 });
 await t.test('many tiny records stay below the input/output caps and per-batch path limit',async()=>{
  const f=await sdkFixture(),paths=Array.from({length:105},(_,i)=>'tiny-'+i);
  for(const p of paths)f.files.set(p,Buffer.from('x'));
  assert.equal((await f.fs.readFiles(paths)).length,105);
  assert.equal(f.scripts.length,7,'two metadata scripts and five groups of at most 24 files');
 });
 await t.test('batch read/stat failures propagate, and empty batches issue no scripts',async()=>{
  const a=await sdkFixture();assert.deepEqual(await a.fs.readFiles([]),[]);assert.equal(a.scripts.length,0);
  a.files.set('one',Buffer.from('a'));a.failRead();await assert.rejects(a.fs.readFiles(['one']),/read denied/);
  const b=await sdkFixture();b.failStat();await assert.rejects(b.fs.readFiles(['one']),/stat denied/);
 });
 const fileService={join:path.join,homedir:()=>'/test',size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p)),readFolder:async()=>[]};
 const pack=await api.readTemplatePack(fileService,path.join(__dirname,'../template-packs/sbs-radio/pack.json'));
 function store(){const rows=new Map(),reads=[],batches=[];return {rows,reads,batches,fs:fileService,get:async(k,id)=>{reads.push(k+'/'+id);return structuredClone(rows.get(k+'/'+id)||null);},getMany:async(k,ids)=>{batches.push({kind:k,ids});return ids.map(id=>structuredClone(rows.get(k+'/'+id)||null));},list:async k=>[...rows].filter(([key])=>key.startsWith(k+'/')).map(([,v])=>structuredClone(v)),put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v)),del:async(k,id)=>rows.delete(k+'/'+id)};}
 await t.test('batch preload verifies settings before images, detects damage and never writes on load',async()=>{
  const f=store(),repo=api.makeTemplateRepository(f);await repo.importTemplates([pack.templates[0]],{kind:'file'});const before=structuredClone([...f.rows]);
  f.reads.length=0;f.batches.length=0;let result=await repo.load();assert.deepEqual(result.errors,[]);assert.equal(result.templates.length,1);
  assert.deepEqual(f.batches.map(b=>b.kind),['template-snapshots','template-assets']);assert.deepEqual([...f.rows],before);
  const key=[...f.rows.keys()].find(k=>k.startsWith('template-snapshots/')),saved=f.rows.get(key);
  f.rows.set(key,{...saved,data:{...saved.data,name:'corrupt'}});f.batches.length=0;result=await repo.load();assert.deepEqual(result.templates,[]);assert.match(result.errors.join(' '),/damaged template settings/);assert.equal(f.batches.length,1);
  f.rows.set(key,saved);const asset=[...f.rows.keys()].find(k=>k.startsWith('template-assets/')),image=f.rows.get(asset);f.rows.delete(asset);
  result=await repo.load();assert.deepEqual(result.templates,[]);assert.match(result.errors.join(' '),/damaged template image/);
  f.rows.set(asset,image);assert.deepEqual((await repo.load()).errors,[]);
 });
 await t.test('invalid references are rejected before batching arbitrary paths',async()=>{
  const f=store(),repo=api.makeTemplateRepository(f);await repo.importTemplates([pack.templates[0]],{kind:'file'});
  const index=f.rows.get('template-library/index');index.records[0].working='../not-a-snapshot';f.batches.length=0;
  assert.match((await repo.load()).errors.join(' '),/Invalid template snapshot reference/);assert.deepEqual(f.batches,[]);
 });
 await t.test('startup diagnostics contain timings/counts and no template data or paths',async()=>{
  const f=store(),repo=api.makeTemplateRepository(f);await repo.importTemplates([pack.templates[0]],{kind:'file'});
  const old=console.info,logs=[];console.info=(...args)=>logs.push(args);
  try{await repo.load();const key=[...f.rows.keys()].find(k=>k.startsWith('template-assets/'));f.rows.delete(key);await repo.load();}
  finally{console.info=old;}
  assert.equal(logs.length,2);assert.ok(logs.every(([tag])=>tag==='[shortform:template-load]'));
  const first=logs[0][1],second=logs[1][1];assert.equal(first.status,'ok');assert.equal(second.status,'error');
  for(const key of ['stateMs','snapshotsMs','assetsMs','hydrateMs','totalMs'])assert.ok(Number.isFinite(first[key])&&first[key]>=0);
  assert.equal(first.templates,1);assert.equal(first.assets,1);assert.equal(first.scriptCalls,null,'unsupported route counters are not reported as zero');
  assert.ok(!JSON.stringify(logs).includes('data:image/'));assert.ok(!JSON.stringify(logs).includes('/test'));assert.ok(!JSON.stringify(logs).includes(pack.templates[0].id));
 });
 await t.test('fallback adapters retain complete data and error handling without readFiles',async()=>{
  const disk=api.makeStore({join:path.join,homedir:()=>'/test',exists:async p=>!p.endsWith('missing.json'),readFile:async()=>Buffer.from('{"id":"saved"}')});
  assert.deepEqual(await disk.getMany('templates',['one','missing']),[{id:'saved'},null]);
 });
 await t.test('macOS shell adapter reads exact record batches through real shell commands',{skip:process.platform!=='darwin'},async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shortform-batch-'));const run=promisify(execFile);
  try{
   const shell=await api.shellFiles({runShell:async({command,maxOutputBytes})=>{const r=await run('/bin/sh',['-c',command],{maxBuffer:maxOutputBytes});return {stdout:r.stdout,stderr:r.stderr,exitCode:0};}});
   const files=api.hostFiles(shell),paths=['one.json','two with spaces.json','empty.json','large.json'].map(p=>path.join(dir,p));
   const contents=[Buffer.from('{"id":"one"}'),Buffer.from('{"id":"two"}'),Buffer.alloc(0),Buffer.alloc(70000,65)];
   paths.forEach((p,i)=>fs.writeFileSync(p,contents[i]));
   const got=await files.readFiles([...paths,path.join(dir,'missing.json')]);assert.equal(got.at(-1),null);contents.forEach((b,i)=>assert.deepEqual(Buffer.from(got[i]),b));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
});
