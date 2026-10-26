'use strict';
if (!require('./customer-fixtures.cjs').available()) {
  require('node:test')('customer template regression requires private fixtures', { skip: 'Customer packs migrated out of the public repository; see CUSTOMER_FIXTURES.md' }, () => {});
} else {
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{webcrypto}=require('node:crypto');
const modules=process.env.SBS_PANEL_TEST_MODULES;

test('template startup shares verified images and reduces Windows host calls',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),mod={exports:{}};
 const digests=[];
 const crypto={subtle:{digest:async(algorithm,bytes)=>{digests.push(Buffer.from(bytes).toString());return webcrypto.subtle.digest(algorithm,bytes);}},randomUUID:()=>webcrypto.randomUUID()};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports','crypto',esbuild.transformSync(source+'\nexport {makeTemplateRepository,makeStore,hostFiles,sdkFiles,readTemplatePack};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports,crypto);
 const api=mod.exports;
 const fileService={join:path.join,homedir:()=>'/test',size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p)),readFolder:async()=>[]};
 const pack=await api.readTemplatePack(fileService,path.join(__dirname,'../template-packs/sbs-radio/pack.json'));
 const rows=new Map(),reads=[];
 const store={fs:fileService,get:async(k,id)=>{reads.push(k+'/'+id);await Promise.resolve();return structuredClone(rows.get(k+'/'+id)||null);},list:async()=>[],put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v)),del:async(k,id)=>rows.delete(k+'/'+id)};
 const templates=Array.from({length:12},(_,i)=>({...structuredClone(pack.templates[0]),id:'startup-'+i,name:'Template '+i}));
 await api.makeTemplateRepository(store).importTemplates(templates,{kind:'file'});
 const assets=[...rows.keys()].filter(k=>k.startsWith('template-assets/'));
 assert.ok(assets.length>0);
 const imageDigests=()=>digests.filter(s=>s.startsWith('"data:image/'));

 await t.test('concurrent snapshots read and verify each shared image once per load',async()=>{
  const repo=api.makeTemplateRepository(store);
  reads.length=0;digests.length=0;
  const result=await repo.load();
  assert.deepEqual(result.errors,[]);assert.equal(result.templates.length,12);
  for(const key of assets)assert.equal(reads.filter(k=>k===key).length,1,key);
  assert.equal(imageDigests().length,assets.length);
  assert.equal(result.templates[0].logo.image,templates[0].logo.image);
  result.templates[0].headline.size1=999;
  assert.notEqual(result.templates[1].headline.size1,999,'settings remain independent');
  reads.length=0;digests.length=0;
  assert.deepEqual((await repo.load()).errors,[]);
  for(const key of assets)assert.equal(reads.filter(k=>k===key).length,1,'fresh cache per reload');
  assert.equal(imageDigests().length,assets.length);
 });

 await t.test('reload detects damaged/missing assets and recovers after repair on the same repository',async()=>{
  const repo=api.makeTemplateRepository(store),key=assets[0],saved=structuredClone(rows.get(key));
  assert.deepEqual((await repo.load()).errors,[]);
  rows.set(key,{...saved,data:saved.data+'corrupt'});
  let result=await repo.load();assert.deepEqual(result.templates,[]);assert.match(result.errors.join(' '),/damaged template image/);
  rows.delete(key);result=await repo.load();assert.match(result.errors.join(' '),/damaged template image/);
  rows.set(key,saved);result=await repo.load();assert.deepEqual(result.errors,[]);assert.equal(result.templates.length,12);
 });

 await t.test('SDK-backed startup uses one stat per record and one read per unique image',async()=>{
  const scripts=[],files=new Map(),stats=[],ranges=[];
  const root='C:\\Users\\u\\.selects\\plugin-data\\shortform-clips';
  for(const [key,value] of rows)files.set(root+'\\'+key.replaceAll('/','\\')+'.json',Buffer.from(JSON.stringify(value)));
  const selects={files:{environment:async()=>({platform:'win32',homedir:'C:\\Users\\u'}),stat:async p=>{stats.push(p);const b=files.get(p);return b?{size:b.length,isDirectory:false,mtimeMs:1}:null;},readRange:async({path:p,offset,length})=>{ranges.push(p);assert.ok(length<=49152);return {base64:files.get(p).subarray(offset,offset+length).toString('base64')};}}};
  const sdk={runScript:async({script})=>{scripts.push(script);const code=esbuild.transformSync('return (async()=>{'+script+'})();',{loader:'ts'}).code;return {result:await new Function('selects',code)(selects)};}};
  const filesApi=api.hostFiles(await api.sdkFiles(sdk)),disk=api.makeStore(filesApi),repo=api.makeTemplateRepository(disk);
  scripts.length=0;digests.length=0;
  const list=await repo.listTemplates();assert.deepEqual(list.errors,[]);assert.equal(list.templates.length,12);
  assert.equal(scripts.length,4,'index and all settings each use a metadata + read batch');
  assert.equal(ranges.filter(p=>p.includes('template-assets')).length,0);assert.equal(imageDigests().length,0);
  scripts.length=0;stats.length=0;ranges.length=0;digests.length=0;
  const beforeLoad=filesApi.readMetrics();
  const result=await repo.load();assert.deepEqual(result.errors,[]);assert.equal(result.templates.length,12);
  t.diagnostic(`12 templates: ${scripts.length} host scripts, ${imageDigests().length} image verifications`);
  const expected=['template-library/index',...rows.keys()].filter((k,i,a)=>a.indexOf(k)===i).map(k=>root+'\\'+k.replaceAll('/','\\')+'.json');
  assert.equal(stats.length,expected.length);
  for(const p of expected)assert.equal(stats.filter(x=>x===p).length,1,p);
  for(const key of assets){const p=root+'\\'+key.replaceAll('/','\\')+'.json';assert.equal(ranges.filter(x=>x===p).length,Math.ceil(files.get(p).length/49152));}
  assert.equal(imageDigests().length,assets.length);
  // Index, all 12 settings, and the shared image each use one metadata + one read script.
  assert.equal(scripts.length,6);
  const metrics=filesApi.readMetrics();assert.equal(metrics.scriptCalls-beforeLoad.scriptCalls,6);
  assert.equal(metrics.readBytes-beforeLoad.readBytes,expected.reduce((n,p)=>n+files.get(p).length,0));
  // Large records still respect the SDK's per-read and script response limits.
  const large={id:'large',data:'x'.repeat(340*1024)},largePath=root+'\\template-library\\large.json';
  files.set(largePath,Buffer.from(JSON.stringify(large)));stats.length=0;scripts.length=0;
  assert.deepEqual(await disk.get('template-library','large'),large);
  assert.equal(stats.length,1);assert.equal(scripts.length,4);
  stats.length=0;assert.equal(await disk.get('template-library','missing'),null);assert.equal(stats.length,1);
  files.set(root+'\\template-library\\empty.json',Buffer.alloc(0));assert.equal(await disk.get('template-library','empty'),null);
  files.set(root+'\\template-library\\invalid.json',Buffer.from('{'));await assert.rejects(disk.get('template-library','invalid'),SyntaxError);
  await assert.rejects(filesApi.readFile(root+'\\missing'),/No such file/);
  selects.files.stat=async()=>{throw Error('access denied');};await assert.rejects(disk.get('template-library','index'),/access denied/);
 });

 await t.test('storage adapters without optional reads retain the original get behavior',async()=>{
  let exists=true;
  const disk=api.makeStore({...fileService,exists:async()=>exists,readFile:async()=>Buffer.from('{"id":"record"}')});
  assert.deepEqual(await disk.get('templates','one'),{id:'record'});
  exists=false;assert.equal(await disk.get('templates','one'),null);
 });
});

}
