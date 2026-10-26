'use strict';
if (!require('./customer-fixtures.cjs').available()) {
  require('node:test')('customer template regression requires private fixtures', { skip: 'Customer packs migrated out of the public repository; see CUSTOMER_FIXTURES.md' }, () => {});
} else {
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('portable template files',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {encodeSharedTemplate,decodeSharedTemplate,importSharedTemplate,readTemplatePack,makeTemplateRepository,cleanTemplate};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports;
 const fileService={join:path.join,size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p))};
 const pack=await api.readTemplatePack(fileService,path.join(__dirname,'../template-packs/sbs-radio/pack.json'));
 const original=structuredClone(pack.templates.find(t=>t.variants?.tiktok)||pack.templates[0]);
 original.id='sbs-radio/private-template';original.builtIn=true;original.packId='private-pack';original.baseId='private-source';original.projectId='private-project';original.sourcePath='/private/video.mp4';
 original.thumbnail={enabled:true,mode:'preserve',instructions:'Keep the original title',references:[]};
 original.name='My edited template';original.layout.splitPolicy='never';original.prompt.rules='Keep clips under 60 seconds';
 function repo(fsApi=fileService){const rows=new Map();const storage={fs:fsApi,list:async kind=>[...rows].filter(([k])=>k.startsWith(kind+'/')).map(([,v])=>structuredClone(v)),put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v)),del:async(k,id)=>rows.delete(k+'/'+id)};return {rows,storage,repository:api.makeTemplateRepository(storage)};}
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

 await t.test('Huick scene instructions and visual guide survive pack install, edits, duplication and JSON transfer',async()=>{
  const r=repo(),packPath=path.join(__dirname,'../template-packs/hankook-ilbo/pack.json');
  const installed=await api.readTemplatePack(fileService,packPath);
  const expected=installed.templates.find(t=>t.id==='huick-alpha');assert.ok(expected);
  await r.repository.install(packPath);
  const load=async()=>{const result=await api.makeTemplateRepository(r.storage).load();assert.deepEqual(result.errors,[]);return result.templates;};
  const id='hankook-ilbo/huick-alpha',current=(await load()).find(t=>t.id===id);assert.ok(current);
  assert.deepEqual(current.editorial,expected.editorial);
  assert.ok(current.editorial.visualGuide.image.startsWith('data:image/jpeg;base64,'));
  const bytes=api.encodeSharedTemplate(current),envelope=JSON.parse(new TextDecoder().decode(bytes));
  assert.equal(envelope.templateApi,5);assert.deepEqual(api.decodeSharedTemplate(bytes).editorial,current.editorial);
  const ordinary=(await load()).find(t=>t.editorial?.mode!=='scenes');assert.ok(ordinary);
  assert.equal(JSON.parse(new TextDecoder().decode(api.encodeSharedTemplate(ordinary))).templateApi,2);
  const edited=api.cleanTemplate(structuredClone(current));edited.editorial.instructions+='\nPrefer a supplied episode concept.';edited.captions.color='#EEEEEE';
  await r.repository.put('templates',id,edited);
  const saved=(await load()).find(t=>t.id===id);assert.deepEqual(saved.editorial,edited.editorial);assert.equal(saved.captions.color,'#EEEEEE');assert.equal(saved.modified,true);
  const copy={...api.cleanTemplate(structuredClone(saved)),id:'custom/huick-copy',name:'Huick copy'};
  await r.repository.put('templates',copy.id,copy);
  const duplicated=(await load()).find(t=>t.id===copy.id);assert.deepEqual(duplicated.editorial,saved.editorial);assert.deepEqual(duplicated.captions,saved.captions);assert.equal(duplicated.builtIn,false);
  const guideRecords=[...r.rows].filter(([key,value])=>key.startsWith('template-assets/')&&value.data===current.editorial.visualGuide.image);assert.equal(guideRecords.length,1);
  const imported=repo(),result=await api.importSharedTemplate(imported.repository,api.encodeSharedTemplate(duplicated));
  const transferred=(await imported.repository.load()).templates.find(t=>t.id===result.id);
  assert.deepEqual(transferred.editorial,duplicated.editorial);assert.deepEqual(transferred.captions,duplicated.captions);
 });
 await t.test('Chosun installation and upgrade expose both politics templates without losing edits',async()=>{
  const packPath=path.join(__dirname,'../template-packs/chosun-ilbo/pack.json');
  const currentManifest=JSON.parse(fs.readFileSync(packPath,'utf8'));
  const previous={...currentManifest,version:'1.3.1',requiresApp:{id:'shortform-clips',templateApi:2},templates:currentManifest.templates.filter(p=>!p.includes('jeongjwippul')&&!p.includes('politics-landscape'))};
  for(const upgrade of [false,true]) {
   let old=upgrade;
   const r=repo({...fileService,readFile:async p=>old&&p===packPath?new TextEncoder().encode(JSON.stringify(previous)):fileService.readFile(p)});
   if(upgrade){
    await r.repository.install(packPath);
    const before=await r.repository.load();assert.equal(before.templates.length,7);
    const edited=api.cleanTemplate(structuredClone(before.templates.find(t=>t.id==='chosun-ilbo/panilgi')));
    edited.prompt.rules='Keep my editorial settings';await r.repository.put('templates',edited.id,edited);
    old=false;
   }
   if(upgrade){
    let conflict;try{await r.repository.install(packPath);}catch(e){conflict=e;}
    assert.ok(conflict);assert.equal(conflict.conflicts[0].id,'chosun-ilbo/panilgi');assert.equal(conflict.conflicts[0].reason,'modified');
    await conflict.retry({'chosun-ilbo/panilgi':'copy'},{'chosun-ilbo/panilgi':conflict.conflicts[0].token});
   }else await r.repository.install(packPath);
   const loaded=await api.makeTemplateRepository(r.storage).load();assert.deepEqual(loaded.errors,[]);
   const jeong=loaded.templates.find(t=>t.id==='chosun-ilbo/jeongjwippul');assert.ok(jeong);
   assert.equal(jeong.headline.font,'SDMyeongjo-cBd');assert.equal(jeong.captions.font,'SDMyeongjo-bMd');
   const wide=loaded.templates.find(t=>t.id==='chosun-ilbo/politics-landscape');assert.ok(wide);
   assert.equal(wide.landscape.version,1);assert.equal(wide.layout.reframe,false);
   assert.deepEqual(api.decodeSharedTemplate(api.encodeSharedTemplate(wide)).landscape,wide.landscape);
   if(upgrade)assert.equal(loaded.templates.find(t=>t.id==='chosun-ilbo/panilgi').prompt.rules,'Keep my editorial settings');
  }
 });
 await t.test('unsupported, malformed and oversized files never write to storage',async()=>{
  const r=repo();const bytes=api.encodeSharedTemplate(original),data=JSON.parse(new TextDecoder().decode(bytes));
  const encode=x=>new TextEncoder().encode(JSON.stringify(x));
  for(const bad of [encode({...data,version:999}),encode({...data,templateApi:999}),new TextEncoder().encode('{broken'),new TextEncoder().encode('{"__proto__":{"polluted":true}}')]) await assert.rejects(api.importSharedTemplate(r.repository,bad));
  assert.equal(r.rows.size,0);assert.equal({}.polluted,undefined);assert.throws(()=>api.decodeSharedTemplate({length:256*1024*1024+1}),/256 MiB/);
 });
 await t.test('local/remote image dependencies and forged image bytes are rejected',()=>{
  for(const image of ['/private/logo.png','https://example.com/logo.png','data:image/png;base64,AAAA']){
   const data=JSON.parse(new TextDecoder().decode(api.encodeSharedTemplate(original)));data.template.logo.image=image;
   assert.throws(()=>api.decodeSharedTemplate(new TextEncoder().encode(JSON.stringify(data))));
  }
 });
 await t.test('BOM JSON keeps stable identity and imports without duplicates',async()=>{
  const r=repo(),bytes=api.encodeSharedTemplate(original);
  const bom=new TextEncoder().encode('\uFEFF'+new TextDecoder().decode(bytes));
  await api.importSharedTemplate(r.repository,bom);await api.importSharedTemplate(r.repository,bytes);
  assert.equal((await r.repository.load()).templates.length,1);
  assert.equal((await r.repository.load()).templates[0].id,original.id);
 });
 await t.test('file transfer uses JSON export and picker, and cancellation releases the lock',async()=>{
  const r=repo(),saved=new Map(),calls=[];let cancelled=false,selected;
  const files={join:(...p)=>p.join('/'),homedir:()=>'/test',size:async p=>saved.get(p).length,readFile:async p=>saved.get(p),writeFile:async(p,b)=>saved.set(p,b)};
  const globals={files,packLock:{current:false},busy:false,templateDirty:false,templateSaving:false,setPackBusy:()=>{},setPackError:m=>{if(m)throw Error(m)},setPackMessage:()=>{},script:async code=>{calls.push(code);return cancelled?null:'/template.json';},packAssert:(v,m)=>assert.ok(v,m),TEMPLATE_SHARE_MAX_BYTES:256*1024*1024,resolveTemplateImport:f=>f(),importSharedTemplate:api.importSharedTemplate,repository:r.repository,loadTemplates:()=>r.repository.load(),setTplSel:id=>selected=id,setProgram:()=>{},setPackDialogOpen:()=>{},lang:'en',encodeSharedTemplate:api.encodeSharedTemplate,nameOf:()=>original.name};
  const start=source.indexOf('  async function transferTemplate('),handler=source.slice(start,source.indexOf('  const attemptedPack =',start));
  const transfer=new Function(...Object.keys(globals),dep('esbuild').transformSync(handler,{loader:'tsx'}).code+';return transferTemplate;')(...Object.values(globals));
  await transfer('export',original);assert.ok(calls[0].includes('.shortform-template.json'));assert.equal(JSON.parse(new TextDecoder().decode(saved.get('/template.json'))).identity,original.id);
  await transfer('import');assert.ok(calls[1].includes('extensions:["json"]'));assert.equal(selected,original.id);
  cancelled=true;await transfer('import');assert.equal(globals.packLock.current,false);
 });
 await t.test('ZIP input is rejected without changing stored templates',async()=>{
  const r=repo();await api.importSharedTemplate(r.repository,api.encodeSharedTemplate(original));const before=structuredClone([...r.rows]);
  await assert.rejects(api.importSharedTemplate(r.repository,new Uint8Array([80,75,3,4,0,0])));assert.deepEqual([...r.rows],before);
 });

});

}
