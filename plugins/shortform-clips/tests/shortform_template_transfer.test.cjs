'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('portable template files',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {encodeSharedTemplate,decodeSharedTemplate,importSharedTemplate,readTemplatePack,makeTemplateRepository};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports;
 const fileService={join:path.join,size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p))};
 const pack=await api.readTemplatePack(fileService,path.join(__dirname,'../template-packs/sbs-radio/pack.json'));
 const original=structuredClone(pack.templates.find(t=>t.variants?.tiktok)||pack.templates[0]);
 original.id='sbs-radio/private-template';original.builtIn=true;original.packId='private-pack';original.baseId='private-source';original.projectId='private-project';original.sourcePath='/private/video.mp4';
 original.thumbnail={enabled:true,mode:'preserve',instructions:'Keep the original title',references:[]};
 original.name='My edited template';original.layout.splitPolicy='never';original.prompt.rules='Keep clips under 60 seconds';
 function repo(){const rows=new Map();const storage={list:async kind=>[...rows].filter(([k])=>k.startsWith(kind+'/')).map(([,v])=>structuredClone(v)),put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v)),del:async(k,id)=>rows.delete(k+'/'+id)};return {rows,repository:api.makeTemplateRepository(storage)};}
 await t.test('new exports require API 2 while API 1 shared files remain readable',()=>{
  const bytes=api.encodeSharedTemplate(original);
  const envelope=JSON.parse(new TextDecoder().decode(bytes));
  assert.equal(envelope.templateApi,2);assert.equal(envelope.template.schemaVersion,1);
  envelope.templateApi=1;
  assert.deepEqual(api.decodeSharedTemplate(new TextEncoder().encode(JSON.stringify(envelope))),api.decodeSharedTemplate(bytes));
 });
 await t.test('round trip keeps actual edits, settings and embedded images with stable identity but no private metadata',()=>{
  const bytes=api.encodeSharedTemplate(original),text=new TextDecoder().decode(bytes),decoded=api.decodeSharedTemplate(bytes);
  for(const secret of ['private-pack','private-project','private-source','/private/video.mp4'])assert.ok(!text.includes(secret));
  for(const field of ['name','layout','prompt','variants','logo','background','captions'])assert.deepEqual(decoded[field],original[field]);
  const {enabled,...thumbnail}=original.thumbnail;assert.deepEqual(decoded.thumbnail,thumbnail);
  assert.equal(original.thumbnail.enabled,true,'Migration does not mutate the source export object');
  assert.ok(decoded.logo.image.startsWith('data:image/'));assert.equal(JSON.parse(text).identity,original.id);
 });
 await t.test('the same unchanged file is idempotent and retains its identity',async()=>{
  const r=repo(),bytes=api.encodeSharedTemplate(original);
  const a=await api.importSharedTemplate(r.repository,bytes),before=structuredClone([...r.rows]),b=await api.importSharedTemplate(r.repository,bytes);
  assert.equal(a.id,b.id);assert.deepEqual([...r.rows],before);
  const loaded=await r.repository.load();assert.equal(loaded.templates.length,1);assert.deepEqual(loaded.errors,[]);
  assert.equal(loaded.templates[0].layout.splitPolicy,'never');assert.equal(loaded.templates[0].builtIn,false);
 });
 await t.test('unsupported, malformed and oversized files never write to storage',async()=>{
  const r=repo();const bytes=api.encodeSharedTemplate(original),data=JSON.parse(new TextDecoder().decode(bytes));
  const encode=x=>new TextEncoder().encode(JSON.stringify(x));
  for(const bad of [encode({...data,version:999}),encode({...data,templateApi:999}),new TextEncoder().encode('{broken'),new Uint8Array(20*1024*1024+1),new TextEncoder().encode('{"__proto__":{"polluted":true}}')]) await assert.rejects(api.importSharedTemplate(r.repository,bad));
  assert.equal(r.rows.size,0);assert.equal({}.polluted,undefined);
 });
 await t.test('local/remote image dependencies and forged image bytes are rejected',()=>{
  for(const image of ['/private/logo.png','https://example.com/logo.png','data:image/png;base64,AAAA']){
   const data=JSON.parse(new TextDecoder().decode(api.encodeSharedTemplate(original)));data.template.logo.image=image;
   assert.throws(()=>api.decodeSharedTemplate(new TextEncoder().encode(JSON.stringify(data))));
  }
 });
});
