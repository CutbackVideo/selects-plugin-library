'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('template pack update button follows the published catalog without the GitHub API',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 const esbuild=dep('esbuild');
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {readGitHubTemplatePack,makeTemplateRepository,isOfficialPackSource,officialPackUrl,readCatalogPackManifest,comparePackVersions,PACK_STRINGS,TemplatePackUpdates,packUpdateEligibility};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,realPack=path.join(__dirname,'../template-packs/sbs-radio');
 const commit='b'.repeat(40),repo='CutbackVideo/selects-plugin-library';
 const official=ref=>`https://github.com/${repo}/tree/${ref}/plugins/shortform-clips/template-packs/sbs-radio`;
 function memoryStore(){const rows=new Map();return {rows,store:{fs:null,list:async kind=>[...rows].filter(([k])=>k.startsWith(kind+'/')).map(([,v])=>structuredClone(v)),get:async(k,id)=>structuredClone(rows.get(k+'/'+id)||null),put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v)),del:async(k,id)=>rows.delete(k+'/'+id)}};}
 async function withRemote(fn){const r=remote(),previous=global.fetch;global.fetch=r.fetcher;try{return await fn(r);}finally{global.fetch=previous;}}
 function remote({version,manifestStatus=200}={}){
  const calls=[];
  const fetcher=async(url,options)=>{
   calls.push(url);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
   const prefix=`https://raw.githubusercontent.com/${repo}/${commit}/plugins/shortform-clips/template-packs/sbs-radio/`;
   assert.ok(url.startsWith(prefix),'Only raw files at the catalog commit are read: '+url);
   const file=url.slice(prefix.length);
   if(file==='pack.json'&&manifestStatus!==200)return new Response('',{status:manifestStatus});
   let bytes=fs.readFileSync(path.join(realPack,file));
   if(file==='pack.json'&&version)bytes=Buffer.from(JSON.stringify({...JSON.parse(bytes),version}));
   return new Response(bytes);
  };
  return {fetcher,calls};
 }

 await t.test('a commit-pinned link installs from raw files only',async()=>{
  const r=remote();const pack=await api.readGitHubTemplatePack(official(commit),r.fetcher);
  assert.equal(pack.source.commit,commit);assert.equal(pack.templates.length,4);
  assert.equal(r.calls.filter(u=>u.startsWith('https://api.github.com/')).length,0);
 });

 await t.test('only official library pack links are updatable from the catalog',()=>{
  assert.equal(api.isOfficialPackSource(official(commit),'sbs-radio'),true);
  assert.equal(api.isOfficialPackSource(official('main'),'sbs-radio'),true);
  assert.equal(api.isOfficialPackSource(`https://raw.githubusercontent.com/${repo}/${commit}/plugins/shortform-clips/template-packs/sbs-radio/pack.json`,'sbs-radio'),true);
  assert.equal(api.isOfficialPackSource(official(commit),'hankook-ilbo'),false);
  assert.equal(api.isOfficialPackSource(official(commit).replace(repo,'someone/fork'),'sbs-radio'),false);
  assert.equal(api.isOfficialPackSource(official(commit).replace('/shortform-clips/','/other-app/'),'sbs-radio'),false);
  for(const none of ['',undefined,'not a link'])assert.equal(api.isOfficialPackSource(none,'sbs-radio'),false);
  assert.equal(api.officialPackUrl('sbs-radio',commit),official(commit));
  assert.throws(()=>api.officialPackUrl('sbs-radio','main'),/Invalid catalog pack reference/);
  assert.throws(()=>api.officialPackUrl('../x',commit),/Invalid catalog pack reference/);
 });

 await t.test('version check reads one pack.json at the catalog commit',async()=>{
  const r=remote({version:'9.0.0'});
  const manifest=await api.readCatalogPackManifest('sbs-radio',commit,r.fetcher);
  assert.equal(manifest.version,'9.0.0');assert.deepEqual(r.calls.map(u=>u.split('/').pop()),['pack.json']);
  assert.equal(await api.readCatalogPackManifest('sbs-radio',commit,remote({manifestStatus:404}).fetcher),null);
  await assert.rejects(api.readCatalogPackManifest('sbs-radio',commit,remote({manifestStatus:500}).fetcher),e=>e.code==='network');
  await assert.rejects(api.readCatalogPackManifest('sbs-radio',commit,async()=>{throw new TypeError('offline');}),e=>e.code==='network');
  await assert.rejects(api.readCatalogPackManifest('sbs-radio',commit,async()=>new Response(Buffer.alloc(70*1024))),e=>e.code==='tooLarge');
  await assert.rejects(api.readCatalogPackManifest('sbs-radio',commit,async()=>new Response('{not json')),e=>e.code==='network');
  const other=JSON.parse(fs.readFileSync(path.join(realPack,'pack.json')));other.id='hankook-ilbo';
  await assert.rejects(api.readCatalogPackManifest('sbs-radio',commit,async()=>new Response(JSON.stringify(other))),e=>e.code==='notFound');
  assert.ok(api.comparePackVersions('1.10.0','1.9.9')>0);assert.equal(api.comparePackVersions('1.2.3','1.2.3'),0);assert.ok(api.comparePackVersions('1.2.3','2.0.0')<0);
 });

 await t.test('the pack entry records how it was installed: pasted link, catalog link, local folder',async()=>{
  const {rows,store}=memoryStore(),repository=api.makeTemplateRepository(store);
  await withRemote(()=>repository.install(official(commit),true));
  let pack=(await repository.load()).packs[0];
  assert.deepEqual(pack.installSource,{kind:'link',url:official(commit),commit});
  await withRemote(()=>repository.install(official(commit),true,{},{},'catalog'));
  pack=(await repository.load()).packs[0];
  assert.deepEqual(pack.installSource,{kind:'catalog',url:official(commit),commit},'same content, new origin is still recorded');
  const tpl=(await repository.load()).templates[0];assert.equal(tpl.modified,false);assert.equal(tpl.historyCount,0,'settings untouched');
  const local=memoryStore(),folder=api.makeTemplateRepository({...local.store,fs:{join:path.join,size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p))}});
  await folder.install(path.join(realPack,'pack.json'));
  assert.deepEqual((await folder.load()).packs[0].installSource,{kind:'folder'});
 });

 await t.test('restore, delete and copy of templates keep the pack install source',async()=>{
  const {rows,store}=memoryStore();
  await withRemote(()=>api.makeTemplateRepository(store).install(official(commit),true,{},{},'catalog'));
  // Give one template a history entry from a different source, as an older install would.
  const index=structuredClone(rows.get('template-library/index')),first=index.records[0];
  first.history=[{baseline:first.baseline,working:first.working,source:{...first.source,url:official('main').replace('CutbackVideo/selects-plugin-library','someone/fork')},at:'2026-01-01T00:00:00.000Z'}];
  rows.set('template-library/index',index);
  const repository=api.makeTemplateRepository(store),[a,b]=(await repository.load()).templates;
  await repository.restore(a.id,0);
  assert.match(JSON.stringify(rows.get('template-library/index').records.find(r=>r.id===a.id).source),/someone\/fork/,'the template source really changed');
  await repository.remove(b.id);
  await repository.put('templates','tcopy',{...structuredClone(a),id:'tcopy',baseId:a.id});
  assert.deepEqual((await repository.load()).packs[0].installSource,{kind:'catalog',url:official(commit),commit});
 });

 await t.test('legacy packs keep a link only when every template agrees, and never become catalog',async()=>{
  const {rows,store}=memoryStore();
  await withRemote(()=>api.makeTemplateRepository(store).install(official(commit),true,{},{},'catalog'));
  const strip=edit=>{const index=structuredClone(rows.get('template-library/index'));index.packs=index.packs.map(({installSource,...m})=>m);index.records.forEach(edit);rows.set('template-library/index',index);};
  strip(()=>{});
  assert.deepEqual((await api.makeTemplateRepository(store).load()).packs[0].installSource,{kind:'link',url:official(commit)});
  strip((r,i)=>{if(i===0)r.source={...r.source,url:official('main')};});
  assert.equal((await api.makeTemplateRepository(store).load()).packs[0].installSource,null,'conflicting links are not guessed');
  strip((r,i)=>{if(i===0){const {url,...rest}=r.source;r.source=rest;}});
  assert.equal((await api.makeTemplateRepository(store).load()).packs[0].installSource,null,'a template without a link makes it ambiguous');
 });

 await t.test('only catalog installs and official main links follow the catalog; commit links stay pinned',()=>{
  const e=(installSource,id='sbs-radio')=>api.packUpdateEligibility({id,installSource});
  assert.equal(e({kind:'catalog',url:official(commit)}),'catalog');
  assert.equal(e({kind:'link',url:official('main')}),'catalog');
  assert.equal(e({kind:'link',url:official(commit)}),'pinned');
  assert.equal(e({kind:'link',url:official('codex/feature')}),'none');
  assert.equal(e({kind:'link',url:official(commit).replace('CutbackVideo/selects-plugin-library','someone/fork')}),'none');
  assert.equal(e({kind:'catalog',url:official(commit)},'hankook-ilbo'),'none');
  for(const none of [{kind:'folder'},null,undefined])assert.equal(e(none),'none');
 });

 // The panel's handlers, run against a fake host that re-checks the catalog on each registration.
 function harness({latest=commit,installedVersion='1.0.0',installSource={kind:'catalog',url:official('a'.repeat(40))},hostAnswers=true,catalogVersion='2.0.0',dirty=false,registers=true,becomesBusy=false}={}){
  const start=source.indexOf('  const catalogWaiters = React.useRef');
  const end=source.indexOf('  React.useEffect(() => {\n    if (!sdk.updates?.register || !sdk.runShell) return;',start);
  const updStart=source.indexOf('  const [packUpdate, setPackUpdate]');
  const updEnd=source.indexOf('  async function transferTemplate(',updStart);
  const code=esbuild.transformSync(source.slice(start,end)+source.slice(updStart,updEnd)+';return {readCatalogLatest,updatePack};',{loader:'tsx'}).code;
  const state={installs:[],registrations:0,status:null,messages:[]};
  // useRef holds the catalog waiters; useState covers setUpdateRegistration (a number) and setPackUpdate.
  const refs=[];
  const React={useRef:v=>{const r={current:v};refs.push(r);return r;},useState:v=>{let value=v;return [value,f=>{
   value=typeof f==='function'?f(value):f;
   if(typeof value==='number'){state.registrations++;if(hostAnswers)setTimeout(()=>{if(becomesBusy)env.updateBlocked.current=true;for(const w of refs[0].current.splice(0))w(latest?{commit:latest}:null);},1);}
   else state.status=value;
  }];}};
  const env={updateBlocked:{current:false},React,sdk:registers?{updates:{register(){}},runShell(){}}:{},K:api.PACK_STRINGS.ko,lang:'ko',packLock:{current:false},busy:false,templateDirty:dirty,templateSaving:false,
   setPackError:()=>{},setPackMessage:m=>state.messages.push(m),
   packUpdateEligibility:api.packUpdateEligibility,officialPackUrl:api.officialPackUrl,comparePackVersions:api.comparePackVersions,
   readCatalogPackManifest:async(id,c)=>{state.manifestCommit=c;return {version:catalogVersion};},
   installPack:async(url,requestId,origin)=>{state.installs.push(url);state.origin=origin;return {name:'SBS',version:catalogVersion};},
   CATALOG_CHECK_TIMEOUT_MS:50};
  const handlers=new Function(...Object.keys(env),code)(...Object.values(env));
  return {handlers,state,pack:{id:'sbs-radio',name:'SBS',version:installedVersion,installSource}};
 }

 await t.test('a newer catalog pack is installed from the catalog commit after a fresh host check',async()=>{
  const h=harness();await h.handlers.updatePack(h.pack);
  assert.equal(h.state.registrations,1,'one re-registration asks the host to read the catalog again');
  assert.equal(h.state.manifestCommit,commit);
  assert.deepEqual(h.state.installs,[official(commit)]);assert.equal(h.state.origin,'catalog','an update from the catalog is recorded as a catalog install');
  assert.match(h.state.messages.at(-1),/v2\.0\.0/);
 });

 await t.test('same or older catalog version reports up to date without installing',async()=>{
  for(const catalogVersion of ['1.0.0','0.9.0']){
   const h=harness({catalogVersion});await h.handlers.updatePack(h.pack);
   assert.deepEqual(h.state.installs,[]);assert.equal(h.state.status.tone,'success');assert.match(h.state.status.message,/1\.0\.0/);
  }
 });

 await t.test('a silent host, missing catalog entry or unsupported host never claims up to date',async()=>{
  let h=harness({hostAnswers:false});await h.handlers.updatePack(h.pack);
  assert.equal(h.state.status.tone,'error');assert.equal(h.state.status.message,api.PACK_STRINGS.ko.checkFailed);assert.deepEqual(h.state.installs,[]);
  h=harness({latest:null});await h.handlers.updatePack(h.pack);
  assert.equal(h.state.status.tone,'error');assert.deepEqual(h.state.installs,[]);
  h=harness({registers:false});await h.handlers.updatePack(h.pack);
  assert.equal(h.state.status.message,api.PACK_STRINGS.ko.unsupported);assert.equal(h.state.registrations,0);
 });

 await t.test('non-official packs and unsaved edits do not start a check',async()=>{
  let h=harness({installSource:null});await h.handlers.updatePack(h.pack);
  assert.equal(h.state.status.message,api.PACK_STRINGS.ko.notUpdatable);assert.equal(h.state.registrations,0);
  h=harness({installSource:{kind:'link',url:official(commit)}});await h.handlers.updatePack(h.pack);
  assert.equal(h.state.status.message,api.PACK_STRINGS.ko.pinned);assert.equal(h.state.registrations,0);
  h=harness({becomesBusy:true});await h.handlers.updatePack(h.pack);
  assert.equal(h.state.status.message,api.PACK_STRINGS.ko.blocked,'edits or a job started while waiting stop the install');assert.deepEqual(h.state.installs,[]);
  h=harness({dirty:true});await h.handlers.updatePack(h.pack);
  assert.equal(h.state.status.message,api.PACK_STRINGS.ko.blocked);assert.equal(h.state.registrations,0);assert.deepEqual(h.state.installs,[]);
 });
 await t.test('the Templates tab lists each pack with its version, an Update button and its status',async()=>{
  const React=dep('react'),{renderToStaticMarkup}=dep('react-dom/server'),h=React.createElement;
  const ui={Button:p=>h('button',{disabled:p.disabled},p.children),Message:p=>h('p',{'data-tone':p.tone||'info'},p.children)};
  const K=api.PACK_STRINGS.ko,packs=[{id:'sbs-radio',name:'SBS',names:{ko:'SBS \ub77c\ub514\uc624'},version:'1.2.0'},{id:'huick',name:'Huick',version:'0.1.0'}];
  const html=renderToStaticMarkup(h(api.TemplatePackUpdates,{ui,K,lang:'ko',packs,status:{id:'huick',tone:'success',message:'ok'},disabled:false,onUpdate(){}}));
  assert.ok(html.includes('SBS \ub77c\ub514\uc624'),'localized pack name');assert.ok(html.includes('Huick'));
  assert.ok(html.includes('v1.2.0')&&html.includes('v0.1.0'));
  assert.equal((html.match(/<button>/g)||[]).length,2);
  assert.ok(html.includes('data-tone="success">ok'));
  const busy=renderToStaticMarkup(h(api.TemplatePackUpdates,{ui,K,lang:'ko',packs,status:null,disabled:true,onUpdate(){}}));
  assert.equal((busy.match(/disabled=""/g)||[]).length,2);
 });

 await t.test('the real checkUpdate hands the host catalog commit to waiting pack checks',async()=>{
  const start=source.indexOf('      async checkUpdate(checkContext: any) {');
  const end=source.indexOf('      async prepareUpdate(id: string) {',start);
  const check=source.slice(start,end).trim().replace(/,$/,'').replace('checkContext: any','checkContext').replace('let offer: any','let offer');
  const provider=new Function('sdk','catalogWaiters','selectedUpdateContext','shortformUpdateCommand','shortformUpdateText','lang','IS_WIN',`return {${check}};`)(
   {runShell:async()=>({exitCode:0,stdout:'null'})},{current:[]},{current:null},()=>'check',(l,k)=>k,'ko',false);
  const seen=[];const ref={current:[l=>seen.push(l),l=>seen.push(l)]};
  const provider2=new Function('sdk','catalogWaiters','selectedUpdateContext','shortformUpdateCommand','shortformUpdateText','lang','IS_WIN',`return {${check}};`)(
   {runShell:async()=>({exitCode:0,stdout:'null'})},ref,{current:null},()=>'check',(l,k)=>k,'ko',false);
  assert.equal(await provider2.checkUpdate({installed:null,latest:{commit}}),null);
  assert.deepEqual(seen,[{commit},{commit}]);assert.equal(ref.current.length,0,'each waiter resolves once');
  await provider.checkUpdate({installed:null,latest:null});
 });

 await t.test('re-adding the same pack link records the pack source without touching settings',async()=>{
  const {rows,store}=memoryStore();
  await withRemote(()=>api.makeTemplateRepository(store).install(official(commit),true));
  const index=structuredClone(rows.get('template-library/index'));
  index.packs=index.packs.map(({installSource,...m})=>m);
  for(const record of index.records)record.source={kind:'pack',packId:'sbs-radio',packVersion:record.source.packVersion};
  rows.set('template-library/index',index);
  assert.equal((await api.makeTemplateRepository(store).load()).packs[0].installSource,null);
  const again=api.makeTemplateRepository(store);await withRemote(()=>again.install(official(commit),true));
  const loaded=await again.load();
  assert.deepEqual(loaded.packs[0].installSource,{kind:'link',url:official(commit),commit});
  assert.ok(loaded.templates.every(t=>!t.modified&&t.historyCount===0),'relinking does not touch settings');
 });
});
