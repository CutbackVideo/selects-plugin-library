'use strict';
if (!require('./customer-fixtures.cjs').available()) {
  require('node:test')('customer template regression requires private fixtures', { skip: 'Customer packs migrated out of the public repository; see CUSTOMER_FIXTURES.md' }, () => {});
} else {
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('unified baseline and working templates',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {makeTemplateRepository,makeLegacyTemplateRepository,TemplateImportConflict,readTemplatePack,encodeSharedTemplate,templateCanonical,TemplatePackDialog};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,packDir=path.join(__dirname,'../template-packs/sbs-radio');
 const fileService={join:path.join,homedir:()=>'/test',size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p)),readFolder:async()=>[]};
 const pack=await api.readTemplatePack(fileService,path.join(packDir,'pack.json'));
 const template=()=>({...structuredClone(pack.templates[0]),id:'sbs-radio/political-show'});
 function setup(){const rows=new Map();const store={fs:fileService,list:async kind=>[...rows].filter(([k])=>k.startsWith(kind+'/')).map(([,v])=>structuredClone(v)),get:async(k,id)=>structuredClone(rows.get(k+'/'+id)||null),put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v)),del:async(k,id)=>rows.delete(k+'/'+id)};return {rows,store,repo:api.makeTemplateRepository(store)};}
 const only=async repo=>{const result=await repo.load();assert.deepEqual(result.errors,[]);return result.templates[0];};
 async function conflict(fn,reason){let error;try{await fn();}catch(e){error=e;}assert.ok(error instanceof api.TemplateImportConflict);assert.equal(error.conflicts[0].reason,reason);return error;}
 await t.test('file and link share identity; unchanged import does not write and newer unmodified settings replace fully',async()=>{
  const {repo,rows}=setup(),a=template();await repo.importFile(api.encodeSharedTemplate(a));const before=structuredClone([...rows]);
  await repo.importFile(api.encodeSharedTemplate(a));assert.deepEqual([...rows],before);
  const b=structuredClone(a);b.version++;b.headline.size1=130;delete b.headline.shadowCss;
  await repo.importTemplates([b],{kind:'pack',packId:'sbs-radio',packVersion:'2.0.0'});
  const current=await only(repo);assert.equal(current.id,a.id);assert.equal(current.headline.size1,130);assert.equal(current.headline.shadowCss,undefined);assert.equal(current.modified,false);
  assert.equal((await repo.history(a.id)).length,1);
 });
 await t.test('modified working settings require replace/copy; cancellation leaves every stored byte unchanged',async()=>{
  const {repo,rows}=setup(),a=template();await repo.importFile(api.encodeSharedTemplate(a));
  const edited=await only(repo);edited.headline.size1=150;await repo.put('templates',a.id,edited);
  const b=structuredClone(a);b.version++;b.layout.windowTop=450;const before=structuredClone([...rows]);
  const error=await conflict(()=>repo.importFile(api.encodeSharedTemplate(b)),'modified');assert.deepEqual([...rows],before);
  const result=await error.retry({[a.id]:'copy'},{[a.id]:error.conflicts[0].token});assert.notEqual(result.id,a.id);
  const list=(await repo.load()).templates;assert.equal(list.length,2);assert.equal(list.find(t=>t.id===a.id).headline.size1,150);assert.equal(list.find(t=>t.id===result.id).headline.size1,a.headline.size1);
 });
 await t.test('replace does not merge local fields, reset targets latest baseline, recovery restores prior baseline and working',async()=>{
  const {repo}=setup(),a=template();await repo.importFile(api.encodeSharedTemplate(a));
  const edited=await only(repo);edited.headline.size1=150;await repo.put('templates',a.id,edited);
  const b=structuredClone(a);b.version++;b.layout.windowTop=450;
  const error=await conflict(()=>repo.importFile(api.encodeSharedTemplate(b)),'modified');await error.retry({[a.id]:'replace'},{[a.id]:error.conflicts[0].token});
  assert.equal((await only(repo)).headline.size1,a.headline.size1);assert.equal((await only(repo)).modified,false);
  await repo.restore(a.id,0);assert.equal((await only(repo)).headline.size1,150);assert.equal((await only(repo)).modified,true);
  await repo.del('templates',a.id);assert.equal((await only(repo)).headline.size1,a.headline.size1);assert.equal((await only(repo)).version,a.version);
 });
 await t.test('same-version content changes and downgrades ask; edits reverted exactly are unmodified',async()=>{
  const {repo}=setup(),a=template();await repo.importFile(api.encodeSharedTemplate(a));
  const b=structuredClone(a);b.layout.windowTop=450;await conflict(()=>repo.importFile(api.encodeSharedTemplate(b)),'same-version');
  b.version=a.version-1;await conflict(()=>repo.importFile(api.encodeSharedTemplate(b)),'older');
  const edit=await only(repo);edit.headline.size1=140;await repo.put('templates',a.id,edit);await repo.put('templates',a.id,a);
  assert.equal((await only(repo)).modified,false);b.version=a.version+1;await repo.importFile(api.encodeSharedTemplate(b));assert.equal((await only(repo)).layout.windowTop,450);
 });
 await t.test('pack-level versions detect older packs even with unchanged per-template revision',async()=>{
  const {repo}=setup(),a=template();await repo.importTemplates([a],{kind:'pack',packVersion:'2.0.0'});
  const b=structuredClone(a);b.layout.windowTop=450;
  await conflict(()=>repo.importTemplates([b],{kind:'pack',packVersion:'1.0.0'}),'older');
  await repo.importTemplates([b],{kind:'pack',packVersion:'2.1.0'});assert.equal((await only(repo)).layout.windowTop,450);
 });
 await t.test('an unchanged design still records a newer pack version for subsequent downgrade checks',async()=>{
  const {repo}=setup(),a=template();
  await repo.importTemplates([a],{kind:'pack',packId:'sbs-radio',packVersion:'1.0.0'});
  await repo.importTemplates([a],{kind:'pack',packId:'sbs-radio',packVersion:'3.0.0'});
  assert.equal((await only(repo)).packVersion,'3.0.0');assert.equal((await repo.history(a.id)).length,0);
  const b=structuredClone(a);b.layout.windowTop=450;
  await conflict(()=>repo.importTemplates([b],{kind:'pack',packId:'sbs-radio',packVersion:'2.0.0'}),'older');
 });
 await t.test('a stale confirmation cannot replace settings edited while the dialog was open',async()=>{
  const {repo}=setup(),a=template();await repo.importFile(api.encodeSharedTemplate(a));const b=structuredClone(a);b.layout.windowTop=450;
  const err=await conflict(()=>repo.importFile(api.encodeSharedTemplate(b)),'same-version');
  const edit=await only(repo);edit.headline.size1=160;await repo.put('templates',a.id,edit);
  await conflict(()=>err.retry({[a.id]:'replace'},{[a.id]:err.conflicts[0].token}),'changed');assert.equal((await only(repo)).headline.size1,160);
 });
 await t.test('an index write failure leaves the previous library usable; staging images are deduplicated',async()=>{
  const {repo,store}=setup(),a=template();await repo.importFile(api.encodeSharedTemplate(a));const assetCount=(await store.list('template-assets')).length;
  const b=structuredClone(a);b.version++;b.headline.size1=150;
  const put=store.put;store.put=async(k,id,v)=>{if(k==='template-library')throw Error('disk full');return put(k,id,v);};
  await assert.rejects(repo.importFile(api.encodeSharedTemplate(b)),/disk full/);assert.equal((await only(api.makeTemplateRepository(store))).headline.size1,a.headline.size1);
  store.put=put;await repo.importFile(api.encodeSharedTemplate(b));assert.equal((await store.list('template-assets')).length,assetCount);
 });
 await t.test('legacy pack/custom baselines and overrides migrate without writing during load or changing old records',async()=>{
  const {repo,store,rows}=setup();await store.put('packs',pack.manifest.id,pack);
  const id='sbs-radio/political-show';await store.put('design-overrides',encodeURIComponent(id),{schemaVersion:1,id,patch:{headline:{size1:150}}});
  const custom={...template(),id:'custom/old',name:'Local copy'};await store.put('custom-templates',encodeURIComponent(custom.id),custom);
  const before=structuredClone([...rows]);const result=await repo.load();assert.deepEqual(result.errors,[]);assert.equal(result.templates.length,5);assert.deepEqual([...rows],before);
  assert.equal(result.templates.find(t=>t.id===id).headline.size1,150);
  await repo.del('templates',id);for(const [key,value] of before)assert.deepEqual(rows.get(key),value);
  const reopened=api.makeTemplateRepository(store);const current=(await reopened.load()).templates.find(t=>t.id===id);assert.equal(current.headline.size1,template().headline.size1);
  assert.equal((await reopened.load()).templates.find(t=>t.id===custom.id).name,'Local copy');
 });
 await t.test('multi-template conflict applies nothing until every conflicting choice is resolved',async()=>{
  const {repo,rows}=setup(),a=template(),b={...template(),id:'sbs-radio/second'};
  await repo.importTemplates([a,b],{kind:'pack',packVersion:'1.0.0'});const edit=(await repo.load()).templates[1];edit.headline.size1=150;await repo.put('templates',b.id,edit);
  const a2={...a,version:a.version+1},b2={...b,version:b.version+1};const before=structuredClone([...rows]);
  await conflict(()=>repo.importTemplates([a2,b2],{kind:'pack',packVersion:'2.0.0'}),'modified');assert.deepEqual([...rows],before);
 });
 await t.test('new imports use unified snapshots and never create pack/custom/override records',async()=>{
  const {repo,store}=setup();await repo.install(path.join(packDir,'pack.json'));assert.equal((await repo.load()).templates.length,4);
  for(const kind of ['packs','custom-templates','overrides','design-overrides'])assert.deepEqual(await store.list(kind),[]);
  const t=(await repo.load()).templates[0];t.headline.size1=130;await repo.put('templates',t.id,t);assert.equal((await only(repo)).modified,true);
  await repo.del('templates',t.id);assert.equal((await only(repo)).modified,false);
 });
 await t.test('conflict UI requires a choice, cancels without writes, and applies replacement',async()=>{
  const React=dep('react'),{act}=React,{JSDOM}=dep('jsdom'),dom=new JSDOM('<div id="root"></div>');
  const keys=['window','document','IS_REACT_ACT_ENVIRONMENT'],previous=Object.fromEntries(keys.map(k=>[k,global[k]]));
  Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  const root=dep('react-dom/client').createRoot(document.getElementById('root'));
  const start=source.indexOf('  const [importConflict,setImportConflict]'),handlers=source.slice(start,source.indexOf('  async function installPack(',start));
  const markupStart=source.indexOf('            <TemplatePackDialog ui={ui} open={!!importConflict}');
  const markup=source.slice(markupStart,source.indexOf('            {templates.length > 0 && <TemplateEditor',markupStart));
  let invoke,select;
  const ui={Button:p=>React.createElement('button',{disabled:p.disabled,onClick:p.onClick},p.children),Segmented:p=>{select=p;return React.createElement('select',{value:p.value,onChange:e=>p.onChange(e.target.value)},React.createElement('option',{value:''},'Choose'),...p.options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label)));}};
  const code=dep('esbuild').transformSync(`function Harness(){const lang='en',S={cancel:'Cancel'};${handlers}capture(resolveTemplateImport);return (<>${markup}</>);}return Harness;`,{loader:'tsx'}).code;
  const Harness=new Function('React','ui','TemplatePackDialog','TemplateImportConflict','capture',code)(React,ui,api.TemplatePackDialog,api.TemplateImportConflict,f=>invoke=f);
  try{
   const {repo,rows}=setup(),a=template();await repo.importFile(api.encodeSharedTemplate(a));const b=structuredClone(a);b.layout.windowTop=450;
   const before=structuredClone([...rows]);await act(async()=>root.render(React.createElement(Harness)));
   let pending;await act(async()=>{pending=invoke(()=>repo.importFile(api.encodeSharedTemplate(b)));});
   for(let i=0;i<100&&!select;i++)await act(async()=>new Promise(r=>setTimeout(r,5)));
   const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
   assert.equal(button('Apply').disabled,true);assert.ok(document.body.textContent.includes('same-version'));
   await act(async()=>button('Cancel').click());assert.equal(await pending,null);assert.deepEqual([...rows],before);
   select=null;await act(async()=>{pending=invoke(()=>repo.importFile(api.encodeSharedTemplate(b)));});
   for(let i=0;i<100&&!select;i++)await act(async()=>new Promise(r=>setTimeout(r,5)));
   await act(async()=>select.onChange('replace'));assert.equal(button('Apply').disabled,false);
   await act(async()=>{button('Apply').click();await pending;});assert.equal((await only(repo)).layout.windowTop,450);
  }finally{await act(async()=>root.unmount());dom.window.close();for(const k of keys)if(previous[k]===undefined)delete global[k];else global[k]=previous[k];}
 });

});

}
