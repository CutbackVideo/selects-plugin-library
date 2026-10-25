'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('template lists do not hydrate images; use boundaries require complete templates',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {makeTemplateRepository,readTemplatePack,templateDigest,encodeSharedTemplate,manualTimelineParams,useResolvedTemplate,TemplateEditor,ManualTimelinePanel,scoreProgram,merge,STRINGS,RADIO_STRINGS,MANUAL_TEXT};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports;
 const fileService={join:path.join,homedir:()=>'/test',size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p)),readFolder:async()=>[]};
 const pack=await api.readTemplatePack(fileService,path.join(__dirname,'../template-packs/sbs-radio/pack.json'));
 const templates=Array.from({length:12},(_,i)=>{const value=structuredClone(pack.templates[0]);value.id='lazy-'+i;value.name='Template '+i;value.detect.keywords=['unique-word-'+i];value.logo.image='data:image/png;base64,'+Buffer.concat([Buffer.from(value.logo.image.split(',')[1],'base64'),Buffer.from([i])]).toString('base64');return value;});
 function setup(seed=[]){
  const rows=new Map(structuredClone(seed)),reads=[],writes=[];
  const store={fs:fileService,get:async(k,id)=>{reads.push(k+'/'+id);return structuredClone(rows.get(k+'/'+id)||null);},list:async k=>[...rows].filter(([key])=>key.startsWith(k+'/')).map(([,v])=>structuredClone(v)),put:async(k,id,v)=>{writes.push(k+'/'+id);rows.set(k+'/'+id,structuredClone(v));},del:async(k,id)=>rows.delete(k+'/'+id)};
  return {rows,reads,writes,store,repo:api.makeTemplateRepository(store)};
 }
 const seed=setup();await seed.repo.importTemplates(templates,{kind:'file'});

 await t.test('12 different images: list reads zero assets; selecting one reads only its image',async()=>{
  const f=setup([...seed.rows]);
  const list=await f.repo.listTemplates();assert.deepEqual(list.errors,[]);assert.equal(list.templates.length,12);
  assert.equal(f.reads.filter(k=>k.startsWith('template-assets/')).length,0);
  assert.equal(f.writes.length,0);
  for(const summary of list.templates){assert.equal(summary.templateSummary,true);for(const field of ['layout','logo','background','headline','thumbnail'])assert.equal(summary[field],undefined);}
  assert.ok(!JSON.stringify(list).includes('templateAsset'));assert.ok(!JSON.stringify(list).includes('data:image/'));
  assert.equal(api.scoreProgram('unique-word-7',list.templates),'lazy-7');
  const ready=await f.repo.resolveTemplate(list.templates[7]);
  assert.equal(ready.id,'lazy-7');assert.equal(ready.logo.image,templates[7].logo.image);assert.equal(ready.templateSummary,undefined);
  assert.equal(f.reads.filter(k=>k.startsWith('template-assets/')).length,1);
  assert.equal(f.writes.length,0);
 });

 await t.test('a damaged unselected image does not block the list or other templates; repair can retry',async()=>{
  const f=setup([...seed.rows]),list=await f.repo.listTemplates(),item=list.templates[0];
  const snapshot=f.rows.get('template-snapshots/'+item.snapshotId),key='template-assets/'+snapshot.data.logo.image.templateAsset;
  const saved=f.rows.get(key);f.rows.delete(key);
  assert.deepEqual((await f.repo.listTemplates()).errors,[]);
  await assert.rejects(f.repo.resolveTemplate(item),/damaged template image/);
  assert.equal((await f.repo.resolveTemplate(list.templates[1])).id,'lazy-1');
  f.rows.set(key,{...saved,data:saved.data+'corrupt'});await assert.rejects(f.repo.resolveTemplate(item),/damaged template image/);
  f.rows.set(key,saved);assert.equal((await f.repo.resolveTemplate(item)).logo.image,templates[0].logo.image);
 });

 await t.test('saving, importing, exporting, applying and restoring summaries cannot write partial templates',async()=>{
  const f=setup([...seed.rows]),item=(await f.repo.listTemplates()).templates[0];
  const before=structuredClone([...f.rows]);
  await assert.rejects(f.repo.put('templates',item.id,item),/Load template images/);
  await assert.rejects(f.repo.importTemplates([item],{kind:'file'}),/Load template images/);
  assert.throws(()=>api.encodeSharedTemplate(item),/Load template images/);
  assert.throws(()=>api.manualTimelineParams(item,{},{}),/Load template images/);
  assert.deepEqual([...f.rows],before);assert.deepEqual(f.writes,[]);
  // Even a checksum-valid summary planted in history cannot pass restore validation.
  const id=await api.templateDigest(item),index=f.rows.get('template-library/index');
  f.rows.set('template-snapshots/'+id,{id,data:item});
  index.records[0].history=[{baseline:id,working:id,source:{kind:'file'}}];
  const planted=structuredClone([...f.rows]);
  await assert.rejects(f.repo.restore(item.id,0),/Load template images/);
  assert.deepEqual([...f.rows],planted);assert.deepEqual(f.writes,[]);
 });

 await t.test('edits, import, reset and removal invalidate old selection entries',async()=>{
  const f=setup([...seed.rows]),old=(await f.repo.listTemplates()).templates[0],ready=await f.repo.resolveTemplate(old);
  ready.name='Edited';await f.repo.put('templates',old.id,ready);
  await assert.rejects(f.repo.resolveTemplate(old),/settings changed/);
  let item=(await f.repo.listTemplates()).templates[0];assert.equal(item.name,'Edited');assert.equal((await f.repo.resolveTemplate(item)).name,'Edited');
  await f.repo.del('templates',item.id);await assert.rejects(f.repo.resolveTemplate(item),/settings changed/);
  item=(await f.repo.listTemplates()).templates[0];assert.equal(item.name,templates[0].name);
  const newer=structuredClone(templates[0]);newer.version++;newer.name='New version';await f.repo.importTemplates([newer],{kind:'file'});
  await assert.rejects(f.repo.resolveTemplate(item),/settings changed/);
  item=(await f.repo.listTemplates()).templates[0];assert.equal(item.name,'New version');
  await f.repo.remove(item.id);await assert.rejects(f.repo.resolveTemplate(item),/no longer available/);
  assert.equal((await f.repo.listTemplates()).templates.length,11);
 });

 await t.test('generation paths resolve only a manually chosen or automatically identified template',async()=>{
  const f=setup([...seed.rows]),entries=(await f.repo.listTemplates()).templates,ids=[];
  const repository={resolveTemplate:async item=>{ids.push(item.id);return f.repo.resolveTemplate(item);}};
  const a=source.indexOf('      const list = (await loadTemplates()) || templates;');
  const b=source.indexOf("      if(templateInputKind(direct)",a);
  const direct=new Function('repository','loadTemplates','templates','job','guard',dep('esbuild').transformSync(`return (async()=>{${source.slice(a,b)}return {list,direct};})();`,{loader:'ts'}).code);
  let result=await direct(repository,async()=>entries,entries,{program:'lazy-7'},p=>p);
  assert.equal(result.direct.logo.image,templates[7].logo.image);assert.deepEqual(ids,['lazy-7']);
  ids.length=0;result=await direct(repository,async()=>entries,entries,{program:'auto'},p=>p);assert.equal(result.direct,null);assert.deepEqual(ids,[]);
  const c=source.indexOf('      const chosen = list.find('),d=source.indexOf('      const tpl=',c);
  const chosen=new Function('repository','list','direct','job','guard',dep('esbuild').transformSync(`return (async()=>{${source.slice(c,d)}return baseTemplate;})();`,{loader:'ts'}).code);
  const ready=await chosen(repository,entries,null,{key:api.scoreProgram('unique-word-3',entries)},p=>p);
  assert.equal(ready.id,'lazy-3');assert.equal(ready.logo.image,templates[3].logo.image);assert.deepEqual(ids,['lazy-3']);
 });
 await t.test('legacy libraries still list and resolve without writing a migration index',async()=>{
  const f=setup([['packs/'+pack.manifest.id,pack]]),before=structuredClone([...f.rows]);
  const list=await f.repo.listTemplates();assert.deepEqual(list.errors,[]);assert.equal(list.templates.length,4);
  assert.ok((await f.repo.resolveTemplate(list.templates[0])).logo.image.startsWith('data:image/'));
  assert.deepEqual([...f.rows],before);assert.deepEqual(f.writes,[]);
 });

 const React=dep('react'),{act}=React,{JSDOM}=dep('jsdom');
 async function domTest(fn){
  const dom=new JSDOM('<div id="root"></div>'),keys=['window','document','IS_REACT_ACT_ENVIRONMENT'],previous=Object.fromEntries(keys.map(k=>[k,global[k]]));
  Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
  const root=dep('react-dom/client').createRoot(document.getElementById('root'));
  try{await fn(root);}finally{await act(async()=>root.unmount());dom.window.close();for(const k of keys)if(previous[k]===undefined)delete global[k];else global[k]=previous[k];}
 }
 const S=api.merge(api.RADIO_STRINGS.en,api.STRINGS.en);
 const ui={};
 for(const k of ['Stack','Actions','Message'])ui[k]=({children})=>React.createElement('div',null,children);
 ui.Select=p=>React.createElement('select',{'aria-label':p.label,value:p.value,disabled:p.disabled,onChange:e=>p.onChange(e.target.value)},...p.options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label)));
 ui.Button=p=>React.createElement('button',{disabled:p.disabled,onClick:p.onClick},p.children);
 ui.TextField=p=>React.createElement('input',{'aria-label':p.label,value:p.value,disabled:p.disabled,onChange:e=>p.onChange(e.target.value)});
 const entries=(await setup([...seed.rows]).repo.listTemplates()).templates;

 await t.test('selection hook ignores late success and errors, does not load inactive tabs, and retries',async()=>domTest(async root=>{
  const requests=[],repository={resolveTemplate:entry=>{const request=deferred();requests.push({entry,...request});return request.promise;}};let loaded;
  function Harness({entry,active}){loaded=api.useResolvedTemplate(repository,entry,active);return React.createElement('div',null,loaded.template?.id||loaded.error||'loading');}
  const render=(entry,active=true)=>act(async()=>root.render(React.createElement(Harness,{entry,active})));
  await render(entries[0],false);assert.equal(requests.length,0);
  await render(entries[0]);await render(entries[1]);
  await act(async()=>requests[0].resolve(templates[0]));assert.equal(loaded.template,null);
  await act(async()=>requests[1].resolve(templates[1]));assert.equal(loaded.template.id,'lazy-1');
  await render(entries[2]);assert.equal(loaded.template,null);
  await act(async()=>requests[2].reject(Error('missing image')));assert.match(loaded.error,/missing image/);assert.equal(loaded.template,null);
  await act(async()=>loaded.retry());assert.equal(requests.length,4);
  await act(async()=>requests[3].resolve(templates[2]));assert.equal(loaded.template.id,'lazy-2');
  await render(entries[3]);await render(entries[4]);
  await act(async()=>requests[4].reject(Error('late failure')));assert.equal(loaded.error,'');
  await render(entries[4],false);await act(async()=>requests[5].resolve(templates[4]));assert.equal(loaded.template,null);
 }));

 await t.test('editor keeps the picker usable during loading/failure and exposes no save or export actions',async()=>domTest(async root=>{
  const requests=[],store={resolveTemplate:entry=>{const d=deferred();requests.push({entry,...d});return d.promise;}};
  function Harness(){const [selId,setSelId]=React.useState(entries[0].id);return React.createElement(api.TemplateEditor,{ui,S,lang:'en',templates:entries,store,state:{selId,setSelId},onExportTemplate:()=>{throw Error('must not export');}});}
  await act(async()=>root.render(React.createElement(Harness)));
  assert.equal(document.querySelector('select').disabled,false);assert.equal(document.querySelectorAll('button').length,0);
  await act(async()=>{const select=document.querySelector('select');select.value=entries[1].id;select.dispatchEvent(new window.Event('change',{bubbles:true}));});
  await act(async()=>requests[0].resolve(templates[0]));assert.equal(document.querySelectorAll('button').length,0);
  await act(async()=>requests[1].reject(Error('image missing')));assert.match(document.body.textContent,/image missing/);
  assert.deepEqual([...document.querySelectorAll('button')].map(b=>b.textContent),['Retry']);
  await act(async()=>document.querySelector('button').click());assert.equal(requests.length,3);
 }));

 await t.test('manual apply blocks unresolved selection and revalidates the selected image before writing',async()=>domTest(async root=>{
  const pending=deferred();let ready=false,calls=0,scripts=0;
  const repository={resolveTemplate:async()=>{calls++;return ready?templates[0]:pending.promise;}};
  const props={ui,S,lang:'en',projectId:'p',draftId:'d',templates:[entries[0]],repository,store:{get:async()=>null,put:async()=>{}},onBusy:()=>{},script:async()=>{scripts++;return {draftId:'d'};}};
  await act(async()=>root.render(React.createElement(api.ManualTimelinePanel,props)));
  const apply=()=>[...document.querySelectorAll('button')].find(b=>b.textContent===api.MANUAL_TEXT.en.make);
  assert.ok(apply(),'apply button is visible');assert.equal(apply().disabled,true);assert.equal(document.querySelector('select').disabled,false);
  await act(async()=>apply().click());assert.equal(scripts,0);
  ready=true;await act(async()=>pending.resolve(templates[0]));assert.equal(apply().disabled,false);
  await act(async()=>apply().click());assert.equal(scripts,1);assert.equal(calls,2);
 }));
});
