'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const {createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;
test('legacy pack reader and source installation compatibility', {skip:!modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async t=>{
  const dep=createRequire(path.resolve(modulesRoot,'../package.json'));
  const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const ts=dep('typescript');
  const program=ts.createProgram([path.join(__dirname,'../panel.tsx')],{noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React,skipLibCheck:true});
  const undefinedNames=ts.getPreEmitDiagnostics(program).filter(d=>[2304,2552,2580,2591].includes(d.code));
  assert.deepEqual(undefinedNames.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[], 'The host rejects panels with undefined identifiers');
  const code=dep('esbuild').transformSync(source+'\nexport {readGitHubTemplatePack,parsePackLink,ShortformClipsPanel,TemplatePicker,TemplatePackDialog,PACK_STRINGS,readTemplatePack,makeLegacyTemplateRepository as makeTemplateRepository,validateTemplate,templatePatch,merge,cleanTemplate,TemplateEditor,STRINGS,RADIO_STRINGS};',{loader:'tsx',format:'cjs'}).code;
  const mod={exports:{}};new Function('require','module','exports',code)(()=>dep('react'),mod,mod.exports);
  const api=mod.exports;
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clip-packs-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const realPack=path.join(__dirname,'../template-packs/sbs-radio');
  const fileService={homedir:()=>temp,join:path.join,size:async p=>fs.existsSync(p)?fs.statSync(p).size:0,readFile:async p=>new Uint8Array(fs.readFileSync(p)),readFolder:async p=>!fs.existsSync(p)?[]:fs.readdirSync(p).map(name=>({name,bytes:new Uint8Array(fs.readFileSync(path.join(p,name)))}))};
  function storage(){const rows=new Map();return {fs:fileService,rows,list:async kind=>[...rows.entries()].filter(([k])=>k.startsWith(kind+'/')).map(([,v])=>structuredClone(v)),put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v)),del:async(k,id)=>rows.delete(k+'/'+id)};}
  function copyPack(id='sbs-radio') {const folder=fs.mkdtempSync(path.join(temp,'source-'));fs.cpSync(realPack,folder,{recursive:true});edit(folder,'pack.json',m=>{m.id=id;delete m.legacy;});return folder;}
  function edit(folder,file,fn){const p=path.join(folder,file),data=JSON.parse(fs.readFileSync(p,'utf8'));fn(data);fs.writeFileSync(p,JSON.stringify(data));}
  const install=(repo,folder)=>repo.install(path.join(folder,'pack.json'));
  await t.test('every checked-in pack validates and stays outside the app download manifest',async()=>{
    const packsRoot=path.join(__dirname,'../template-packs');
    const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../plugin.json')));
    assert.ok(manifest.files.every(name=>!name.startsWith('template-packs/') && !name.startsWith('tests/')));
    for(const entry of fs.readdirSync(packsRoot,{withFileTypes:true}).filter(e=>e.isDirectory())){
      const pack=await api.readTemplatePack(fileService,path.join(packsRoot,entry.name,'pack.json'));
      assert.equal(pack.manifest.id,entry.name);assert.ok(pack.templates.length>0);
    }
  });
  await t.test('scene component styles round-trip and cannot replace content or timing',async()=>{
    const pack=await api.readTemplatePack(fileService,path.join(__dirname,'../template-packs/hankook-ilbo/pack.json'));
    const template=pack.templates.find(t=>t.id.endsWith('huick-alpha'));
    assert.ok(template);
    const styles=template.editorial.components;
    assert.deepEqual(Object.keys(styles.text).sort(),['lime-tag','plain-white']);
    const clean=api.cleanTemplate(template);
    assert.deepEqual(clean.editorial.components,styles);
    for(const [kind,key,value] of [['article','body','Injected'],['article','fontSize',0],['text','startFrame',10],['text','style','question'],['text','backgroundPadding',-1]]){
      const changed=structuredClone(template);
      const target=kind==='text'?changed.editorial.components.text['plain-white']:changed.editorial.components.article;
      target[key]=value;
      assert.throws(()=>api.validateTemplate(changed,true),/Invalid component/);
    }
  });
  await t.test('picker appends an action without selecting it as a template',()=>{
    let picked=null,opened=0,options;
    const view=api.TemplatePicker({ui:{Select:()=>null},label:'Template',value:'existing',
      templates:[{id:'existing',name:'Existing'}],lang:'en',addLabel:'Add templates',
      onChange:id=>picked=id,onAdd:()=>opened++});
    options=view.props.options;
    assert.equal(options.at(-1).label,'+ Add templates');
    view.props.onChange(options.at(-1).value);assert.equal(opened,1);assert.equal(picked,null);
    assert.equal(view.props.value,'existing');view.props.onChange('existing');assert.equal(picked,'existing');
  });
  await t.test('new install has no templates until a valid pack is added; two packs do not collide',async()=>{
    const store=storage(),repo=api.makeTemplateRepository(store);
    assert.deepEqual((await repo.load()).templates,[]);assert.equal(store.rows.size,0,'Mount performs no writes');
    await install(repo,copyPack());await install(repo,copyPack('other-customer'));
    const got=await repo.load();assert.equal(got.templates.length,8);assert.equal(new Set(got.templates.map(t=>t.id)).size,8);
    assert.ok(got.templates.some(t=>t.id==='sbs-radio/political-show'));assert.deepEqual(got.errors,[]);
    assert.match(got.templates[0].logo.image,/^data:image\/png;base64,/);
    const names=Object.keys(got.templates[0]);assert.ok(!names.includes('sbsStyle')&&!names.includes('radioTemplate'));
  });
  await t.test('updates preserve only edited fields; untouched defaults change; reset uses latest defaults; duplicates are independent',async()=>{
    const folder=copyPack(),store=storage(),repo=api.makeTemplateRepository(store);await install(repo,folder);
    let original=(await repo.load()).templates.find(t=>t.id.endsWith('/money-lab'));
    let edited=structuredClone(original);edited.headline.color1='#123456';edited.layout.windowTop=600;
    await repo.put('templates',edited.id,api.cleanTemplate(edited));
    const saved=await store.list('design-overrides');assert.deepEqual(saved[0].patch,{layout:{windowTop:600},headline:{color1:'#123456'}});
    edit(folder,'pack.json',m=>m.version='1.1.0');edit(folder,'templates/money-lab.json',t=>{t.version++;t.headline.size1=111;t.headline.color1='#FF0000';t.layout.windowTop=580;});
    await install(repo,folder);const current=(await repo.load()).templates.find(t=>t.id===edited.id);
    assert.equal(current.headline.color1,'#123456');assert.equal(current.headline.size1,111);assert.equal(current.layout.windowTop,600);
    const custom={...api.cleanTemplate(current),id:'custom/copy',baseId:current.id,name:'My copy'};await repo.put('templates',custom.id,custom);
    await repo.del('templates',current.id);const reset=(await repo.load()).templates.find(t=>t.id===current.id);
    assert.equal(reset.headline.color1,'#FF0000');assert.equal(reset.layout.windowTop,580);assert.equal(reset.modified,false);
    assert.equal((await repo.load()).templates.find(t=>t.id===custom.id).headline.color1,'#123456');
    await repo.del('templates',custom.id);assert.equal((await repo.load()).templates.length,4);
    const reopened=api.makeTemplateRepository(store);assert.equal((await reopened.load()).templates.find(t=>t.id===current.id).headline.size1,111);
  });
  await t.test('single-layout packs preserve older TikTok edits without exposing layout choices',async()=>{
    const store=storage(),repo=api.makeTemplateRepository(store);
    await install(repo,path.join(__dirname,'../template-packs/hankook-ilbo'));
    for(const original of (await repo.load()).templates){
      assert.equal(original.platformLayouts,undefined);
      await store.put('overrides',encodeURIComponent(original.id),{schemaVersion:1,id:original.id,patch:{variants:{tiktok:{headline:{size1:120}}}}});
      const edited=(await repo.load()).templates.find(t=>t.id===original.id);
      assert.equal(edited.platformLayouts,undefined);assert.equal(edited.headline.size1,120);
      await repo.put('templates',edited.id,edited);
      const copy={...api.cleanTemplate(edited),id:'copy-'+original.id.split('/')[1],baseId:original.id};
      await repo.put('templates',copy.id,copy);
      assert.equal((await repo.load()).templates.find(t=>t.id===copy.id).platformLayouts,undefined);
    }
  });
  await t.test('removing a template persists without affecting siblings, saved edits or generated results',async()=>{
    const store=storage(),repo=api.makeTemplateRepository(store),folder=copyPack();
    await install(repo,folder);const initial=await repo.load();
    const target=structuredClone(initial.templates.find(t=>t.id.endsWith('/money-lab')));
    target.headline.color1='#123456';await repo.put('templates',target.id,target);
    await store.put('jobs','run',{id:'run',built:[{draftId:'saved-clip'}]});
    const untouched=structuredClone([...store.rows]);
    await repo.remove(target.id);
    assert.equal((await repo.load()).templates.length,3);
    assert.equal((await api.makeTemplateRepository(store).load()).templates.some(t=>t.id===target.id),false);
    for(const [key,value] of untouched)assert.deepEqual(store.rows.get(key),value,'Removal only changes the removed-template record');
    const duplicate={...api.cleanTemplate(target),id:'custom-copy'};
    await repo.put('templates',duplicate.id,duplicate);await repo.remove(duplicate.id);
    assert.equal((await repo.load()).templates.some(t=>t.id===duplicate.id),false);
    await install(repo,folder);
    const restored=await repo.load();assert.equal(restored.templates.length,4);
    assert.equal(restored.templates.find(t=>t.id===target.id).headline.color1,'#123456');
    assert.equal(restored.templates.some(t=>t.id===duplicate.id),false,'Pack reinstall does not restore removed custom copies');
    for(const t of restored.templates)await repo.remove(t.id);
    assert.equal((await repo.load()).templates.length,0);
    assert.deepEqual(await store.list('jobs'),[{id:'run',built:[{draftId:'saved-clip'}]}]);
  });
  await t.test('legacy layouts keep only edited TikTok design across reload, reset and pack update',async()=>{
    const legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy-template-packs.json'),'utf8'));
    const folder=copyPack();
    const paths=[];
    for(const [key,value] of Object.entries(legacy))if(key.startsWith('sbs-radio/')){
      const rel='templates/'+key.split('/')[1];paths.push(rel);
      fs.writeFileSync(path.join(folder,rel),JSON.stringify(value));
    }
    edit(folder,'pack.json',m=>{m.templates=paths;m.requiresApp.templateApi=1;});
    const store=storage(),repo=api.makeTemplateRepository(store);await install(repo,folder);
    const id='sbs-radio/money-lab',other=id+'-shorts';
    const legacyOverride={schemaVersion:1,id,patch:{layout:{windowTop:430},variants:{tiktok:{layout:{windowTop:610}}},headline:{color1:'#123456'}}};
    await store.put('overrides',encodeURIComponent(id),legacyOverride);
    const before=structuredClone([...store.rows]);
    let result=await repo.load();assert.deepEqual(result.errors,[]);assert.equal(result.templates.length,4);
    assert.deepEqual([...store.rows],before,'loading legacy layouts never writes data');
    assert.equal(result.templates.find(t=>t.id===id).layout.windowTop,610);
    assert.deepEqual(result.templates.find(t=>t.id===id).names,legacy['sbs-radio/money-lab.json'].names);
    assert.ok(!result.templates.some(t=>t.id===other));
    for(const item of result.templates){assert.equal(item.variants,undefined);assert.equal(item.platformLayouts,undefined);}
    const primary=result.templates.find(t=>t.id===id);primary.layout.windowTop=620;primary.name='Custom name';
    await repo.put('templates',id,primary);
    result=await api.makeTemplateRepository(store).load();
    assert.equal(result.templates.find(t=>t.id===id).layout.windowTop,620);
    assert.ok(!result.templates.some(t=>t.id===other));
    assert.deepEqual((await store.list('overrides'))[0],legacyOverride);
    // Installing the new source pack carries the TikTok edits forward atomically.
    await install(repo,copyPack());result=await repo.load();assert.deepEqual(result.errors,[]);
    assert.equal(result.templates.find(t=>t.id===id).layout.windowTop,620);
    assert.equal(result.templates.find(t=>t.id===id).name,'Custom name');
    assert.ok(!result.templates.some(t=>t.id===other));
    assert.equal(result.templates.find(t=>t.id===id).headline.color1,'#123456');
    await repo.del('templates',id);result=await repo.load();
    assert.equal(result.templates.find(t=>t.id===id).layout.windowTop,560);
    assert.ok(!result.templates.some(t=>t.id===other));
    assert.ok(result.templates.some(t=>t.id===id));assert.ok(!result.templates.some(t=>t.id===other));
  });
  await t.test('custom legacy templates retain only TikTok under their original name and ID',async()=>{
    const store=storage(),repo=api.makeTemplateRepository(store);
    const pack=await api.readTemplatePack(fileService,path.join(realPack,'pack.json'));
    const base={...structuredClone(pack.templates[0]),id:'custom/test',name:'My template',platformLayouts:true,variants:{tiktok:{layout:{windowTop:500}}}};
    await store.put('custom-templates',encodeURIComponent(base.id),base);
    let result=await repo.load();assert.equal(result.templates.length,1);
    const current=result.templates[0];assert.equal(current.id,base.id);assert.equal(current.name,base.name);
    assert.equal(current.layout.windowTop,500);assert.equal(current.variants,undefined);
    current.headline.size1=111;await repo.put('templates',current.id,current);
    result=await repo.load();assert.equal(result.templates.length,1);assert.equal(result.templates[0].headline.size1,111);
    await repo.remove(current.id);assert.equal((await repo.load()).templates.length,0);
  });
  await t.test('an invalid update never replaces a working installed pack',async()=>{
    const folder=copyPack(),store=storage(),repo=api.makeTemplateRepository(store);await install(repo,folder);const before=structuredClone(await store.list('packs'));
    edit(folder,'pack.json',m=>m.requiresApp.templateApi=99);await assert.rejects(install(repo,folder),/different app or template API/);assert.deepEqual(await store.list('packs'),before);
    edit(folder,'pack.json',m=>{m.requiresApp.templateApi=1;m.templates.push(m.templates[0]);});await assert.rejects(install(repo,folder),/Duplicate/);
    edit(folder,'pack.json',m=>m.templates.pop());edit(folder,'templates/political-show.json',x=>x.renderer='unknown');await assert.rejects(install(repo,folder),/Unsupported renderer/);
    assert.deepEqual(await store.list('packs'),before);
    const missing=copyPack();fs.unlinkSync(path.join(missing,'assets',fs.readdirSync(path.join(missing,'assets'))[0]));await assert.rejects(install(repo,missing),/Missing|ENOENT/);
    assert.deepEqual(await store.list('packs'),before);
  });
  await t.test('path escapes, prototype keys, undeclared images and duplicate IDs are rejected',async()=>{
    for(const mutate of [m=>m.templates=['../secret.json'],m=>m.assets=['assets/../../secret.png'],m=>m.assets=['assets/C:\\secret.png'],m=>m.templates=['/absolute.json']]){
      const folder=copyPack();edit(folder,'pack.json',mutate);await assert.rejects(api.readTemplatePack(fileService,path.join(folder,'pack.json')),/Invalid pack path/);
    }
    let folder=copyPack();edit(folder,'templates/political-show.json',v=>v.logo.image='https://example.com/logo.png');await assert.rejects(install(api.makeTemplateRepository(storage()),folder),/Invalid pack path/);
    folder=copyPack();edit(folder,'templates/political-show.json',v=>v.constructor={polluted:true});await assert.rejects(install(api.makeTemplateRepository(storage()),folder),/Invalid template key/);
    folder=copyPack();edit(folder,'templates/news-briefing.json',v=>v.id='political-show');await assert.rejects(install(api.makeTemplateRepository(storage()),folder),/Duplicate template ID/);
    assert.equal({}.polluted,undefined);
  });
  await t.test('incompatible user overrides and downgrades reject updates; failed writes leave old pack intact',async()=>{
    const folder=copyPack(),store=storage(),repo=api.makeTemplateRepository(store);await install(repo,folder);
    const original=(await repo.load()).templates[0],changed=structuredClone(original);changed.layout.windowTop=1000;
    await repo.put('templates',changed.id,changed);const before=await store.list('packs');
    edit(folder,'pack.json',m=>m.version='1.1.0');edit(folder,'templates/political-show.json',t=>{t.version++;t.layout.windowBottom=1050;});
    await assert.rejects(install(repo,folder),/Invalid video window/);assert.deepEqual(await store.list('packs'),before);
    const lower=copyPack();edit(lower,'pack.json',m=>m.version='0.9.0');await assert.rejects(install(repo,lower),/older/);
    const fail=copyPack();store.put=async()=>{throw Error('Disk full')};await assert.rejects(install(repo,fail),/Disk full/);assert.deepEqual(await store.list('packs'),before);
  });
  const sha='a'.repeat(40), folderLink='https://github.com/example/templates/tree/main/plugins/shortform-clips/template-packs/sbs-radio';
  function remoteFetch({ref='main', change, failFile, status=404}={}) {
    const calls=[];
    const fetcher=async(url,options)=>{
      calls.push(url);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
      if(url.startsWith('https://api.github.com/'))return new Response(decodeURIComponent(url.split('/commits/')[1])===ref?sha:'Not found',{status:decodeURIComponent(url.split('/commits/')[1])===ref?200:422});
      const prefix=`https://raw.githubusercontent.com/example/templates/${sha}/plugins/shortform-clips/template-packs/sbs-radio/`;
      assert.ok(url.startsWith(prefix),'All pack files come from one pinned commit');
      const file=url.slice(prefix.length);
      if(file===failFile)return new Response('Unavailable',{status});
      let bytes=fs.readFileSync(path.join(realPack,file));
      if(change)bytes=change(file,bytes);
      return new Response(bytes);
    };
    return {fetcher,calls};
  }
  await t.test('local and link imports accept 20 MiB images and reject larger files',async()=>{
    const asset='assets/news-briefing-logo-image.png';
    const image=Buffer.alloc(20*1024*1024);fs.readFileSync(path.join(realPack,asset)).copy(image);
    const local={...fileService,size:undefined,readFile:async p=>p.endsWith(asset)?image:fileService.readFile(p)};
    const pack=await api.readTemplatePack(local,path.join(realPack,'pack.json'));
    assert.equal(Buffer.from(pack.templates.find(t=>t.id==='news-briefing').logo.image.split(',')[1],'base64').length,image.length);
    const remote=remoteFetch({change:(file,bytes)=>file===asset?image:bytes});
    assert.equal((await api.readGitHubTemplatePack(folderLink,remote.fetcher)).templates.length,4);
    await assert.rejects(api.readTemplatePack({...local,readFile:async p=>p.endsWith(asset)?Buffer.concat([image,Buffer.from([0])]):fileService.readFile(p)},path.join(realPack,'pack.json')),/oversized pack file/);
  });
  await t.test('cumulative pack bytes remain bounded to 100 MiB',async()=>{
    const manifest=JSON.parse(fs.readFileSync(path.join(realPack,'pack.json')));
    manifest.assets=Array.from({length:6},(_,i)=>`assets/image-${i}.png`);
    const image=Buffer.alloc(20*1024*1024);fs.readFileSync(path.join(realPack,'assets/news-briefing-logo-image.png')).copy(image);
    const local={...fileService,size:undefined,readFile:async p=>p.endsWith('pack.json')?Buffer.from(JSON.stringify(manifest)):image};
    await assert.rejects(api.readTemplatePack(local,path.join(realPack,'pack.json')),/exceeds 100 MiB/);
    const remote=remoteFetch({change:(file,bytes)=>file==='pack.json'?Buffer.from(JSON.stringify({...manifest,assets:JSON.parse(bytes).assets})):file.startsWith('assets/')?image:bytes});
    await assert.rejects(api.readGitHubTemplatePack(folderLink,remote.fetcher),e=>e.code==='tooLarge');
  });
  await t.test('folder, manifest, raw and slash-branch links install only the declared files at one commit',async()=>{
    const links=[folderLink,folderLink.replace('/tree/','/blob/')+'/pack.json?raw=true',`https://raw.githubusercontent.com/example/templates/${sha}/plugins/shortform-clips/template-packs/sbs-radio/pack.json`,folderLink.replace('/main/','/codex/my-pack/')];
    for(const link of links){
      const remote=remoteFetch({ref:link.includes('/codex/')?'codex/my-pack':'main'});
      const pack=await api.readGitHubTemplatePack(link,remote.fetcher);
      assert.equal(pack.templates.length,4);assert.equal(pack.source.commit,sha);
      assert.match(pack.templates[0].logo.image,/^data:image\/png;base64,/);
      assert.equal(remote.calls.filter(u=>u.includes('raw.githubusercontent.com')).length,1+pack.manifest.templates.length+pack.manifest.assets.length);
    }
    const remote=remoteFetch();const store=storage(),repo=api.makeTemplateRepository(store);
    const previous=global.fetch;global.fetch=remote.fetcher;
    try {await repo.install(folderLink,true);assert.equal((await repo.load()).templates.length,4);assert.equal((await store.list('packs'))[0].source.commit,sha);}
    finally{global.fetch=previous;}
  });
  await t.test('invalid links make no requests; private/missing/rate-limited/network/oversize downloads fail clearly',async()=>{
    for(const link of ['http://github.com/example/templates/tree/main/pack','https://evil.test/pack.json','https://github.com@evil.test/x','https://user:secret@github.com/example/templates/tree/main/pack','https://github.com/example/templates','https://github.com/example/templates/blob/main/readme.md','https://github.com/example/templates/tree/main/%2e%2e/private','https://github.com/example/templates/tree/main/a%5Cb']){
      await assert.rejects(api.readGitHubTemplatePack(link,()=>{throw Error('must not fetch')}),e=>e.code==='invalidLink');
    }
    await assert.rejects(api.readGitHubTemplatePack(folderLink,async()=>new Response('',{status:404})),e=>e.code==='notFound');
    for(const status of [403,429,500])await assert.rejects(api.readGitHubTemplatePack(folderLink,async()=>new Response('',{status})),e=>e.code===(status===500?'network':'rateLimit'));
    await assert.rejects(api.readGitHubTemplatePack(folderLink,async()=>{throw new TypeError('fetch failed')}),e=>e.code==='network');
    let remote=remoteFetch({failFile:'pack.json'});await assert.rejects(api.readGitHubTemplatePack(folderLink,remote.fetcher),e=>e.code==='notFound');
    remote=remoteFetch({change:(file,bytes)=>file==='pack.json'?new Uint8Array(20*1024*1024+1):bytes});await assert.rejects(api.readGitHubTemplatePack(folderLink,remote.fetcher),e=>e.code==='tooLarge');
  });
  await t.test('incomplete and invalid remote updates preserve the installed pack and user overrides',async()=>{
    const store=storage(),repo=api.makeTemplateRepository(store);await install(repo,copyPack());
    const edited=structuredClone((await repo.load()).templates[0]);edited.headline.color1='#123456';await repo.put('templates',edited.id,edited);
    const before=structuredClone([...store.rows]);const previous=global.fetch;
    try {
      for(const options of [{failFile:'templates/news-briefing.json'},{change:(file,bytes)=>file==='pack.json'?Buffer.from(JSON.stringify({...JSON.parse(bytes),assets:['assets/../escape.png']})):bytes}]){
        global.fetch=remoteFetch(options).fetcher;await assert.rejects(repo.install(folderLink,true));assert.deepEqual([...store.rows],before);
      }
      global.fetch=remoteFetch({change:(file,bytes)=>{
        if(file==='pack.json'){const m=JSON.parse(bytes);delete m.legacy;m.version='1.1.0';return Buffer.from(JSON.stringify(m));}
        if(file==='templates/political-show.json'){const t=JSON.parse(bytes);t.version++;t.headline.size1=99;return Buffer.from(JSON.stringify(t));}return bytes;
      }}).fetcher;
      await repo.install(folderLink,true);const result=(await repo.load()).templates[0];assert.equal(result.headline.color1,'#123456');assert.equal(result.headline.size1,99);
    } finally {global.fetch=previous;}
  });
  await t.test('link-only controls disable duplicates and edits; successful install clears input',async()=>{
    const React=dep('react'),{act}=React,{JSDOM}=dep('jsdom');
    const dom=new JSDOM('<div id="root"></div>');const keys=['window','document','IS_REACT_ACT_ENVIRONMENT'];const previous=Object.fromEntries(keys.map(k=>[k,global[k]]));
    Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
    dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
    const root=dep('react-dom/client').createRoot(document.getElementById('root'));
    const start=source.indexOf('  const [importConflict,setImportConflict]'),handler=source.slice(start,source.indexOf('  React.useEffect(',start));
    const markupStart=source.indexOf('            {!templates.length && <ui.Actions>');
    const markup=source.slice(markupStart,source.indexOf('            {templates.length > 0 && <TemplateEditor',markupStart));
    const code=dep('esbuild').transformSync(`function Harness({ui,repository,loadTemplates,templateDirty=false,templateSaving=false,busy=false}){
      const K=${JSON.stringify(api.PACK_STRINGS.en)}, lang='en',files={},templates=[],packs=[],templatesLoading=false,S={cancel:'Cancel'};
      const [packDialogOpen,setPackDialogOpen]=React.useState(true);
      const [packLink,setPackLink]=React.useState(''),[packBusy,setPackBusy]=React.useState(false),[packMessage,setPackMessage]=React.useState(''),[packError,setPackError]=React.useState('');
      const packLock=React.useRef(false);
      ${handler}
      return (<>${markup}</>);
    } return Harness;`,{loader:'tsx'}).code;
    const Harness=new Function('React','TemplatePackDialog','TemplateImportConflict',code)(React,api.TemplatePackDialog,Error);
    let input,file,resolveInstall,calls=[],reloads=0;
    const box=p=>React.createElement('div',null,p.children);
    const ui={Stack:box,Row:box,Actions:box,Message:box,Progress:()=>React.createElement('span',null,'Loading'),IconButton:p=>React.createElement('button',{disabled:p.disabled,onClick:p.onClick},p.label),TextField:p=>{input=p;return React.createElement('input',{value:p.value,onChange:e=>p.onChange(e.target.value),disabled:p.disabled});},Button:p=>React.createElement('button',{disabled:p.disabled||p.busy,onClick:p.onClick},p.children),FileDrop:p=>{file=p;return React.createElement('button',{disabled:p.disabled,onClick:()=>p.onChange({path:'/pack.json'})},p.labels.choose);}};
    const repository={install:async(...args)=>{calls.push(args);return new Promise(resolve=>resolveInstall=resolve);}};
    const render=async extra=>act(async()=>root.render(React.createElement(Harness,{ui,repository,loadTemplates:async()=>{reloads++;},...extra})));
    const button=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label);
    try{
      await render();assert.equal(document.querySelector('dialog').open,true);assert.equal(button('Add').disabled,true);
      await act(async()=>input.onChange(folderLink));assert.equal(button('Add').disabled,false);
      await act(async()=>{button('Add').click();button('Add').click();});
      assert.deepEqual(calls,[[folderLink,true,{},{},'link']]);assert.equal(file,undefined);assert.equal(input.disabled,true);
      await act(async()=>resolveInstall({name:'SBS Radio'}));assert.equal(reloads,1);assert.equal(document.querySelector('dialog').open,false);assert.equal(input.value,'');assert.match(document.body.textContent,/Templates added. SBS Radio/);
      await act(async()=>input.onChange(folderLink));await render({templateDirty:true});assert.equal(button('Add').disabled,true);assert.equal(file,undefined);assert.match(document.body.textContent,/Save or discard/);
      await render({templateSaving:true});assert.equal(button('Add').disabled,true);
      await render();assert.equal(button('Choose pack.json'),undefined);assert.doesNotMatch(document.body.textContent,/GitHub|pack\.json/);assert.doesNotMatch(input.placeholder || '',/GitHub/);
    }finally{await act(async()=>root.unmount());dom.window.close();for(const k of keys)if(previous[k]===undefined)delete global[k];else global[k]=previous[k];}
  });
  await t.test('a host pack request waits for edits, imports once, selects its template and reports failures for retry',async()=>{
    const React=dep('react'),{act}=React,{JSDOM}=dep('jsdom');
    const dom=new JSDOM('<div id="root"></div>');const keys=['window','document','IS_REACT_ACT_ENVIRONMENT','fetch'];const previous=Object.fromEntries(keys.map(k=>[k,global[k]]));
    Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
    const root=dep('react-dom/client').createRoot(document.getElementById('root'));
    const start=source.indexOf('  const [importConflict,setImportConflict]');
    const handlers=source.slice(start,source.indexOf('  React.useEffect(() => {\n    loadTemplates();',start));
    const code=dep('esbuild').transformSync(`function Harness({context,repository,loadTemplates,sdk,files,templateDirty=false,templateSaving=false,busy=false,templatesLoading=false}){
      const K=${JSON.stringify(api.PACK_STRINGS.en)},lang='en';
      const [packLink,setPackLink]=React.useState(''),[packBusy,setPackBusy]=React.useState(false),[packMessage,setPackMessage]=React.useState(''),[packError,setPackError]=React.useState('');
      const [packDialogOpen,setPackDialogOpen]=React.useState(false),[tab,setTab]=React.useState('create'),[tplSel,setTplSel]=React.useState(''),[program,setProgram]=React.useState('');
      const packLock=React.useRef(false);
      ${handlers}
      report({packLink,packBusy,packMessage,packError,packDialogOpen,tab,tplSel,program,retry:installPack});
      return null;
    } return Harness;`,{loader:'tsx'}).code;
    let state,calls=[],finished=[];
    const Harness=new Function('React','report','TemplateImportConflict',code)(React,value=>state=value,Error);
    const store=storage(),repo=api.makeTemplateRepository(store);
    const repository={install:async(...args)=>{calls.push(args);return repo.install(...args);}};
    const request={requestId:'pack-1',url:folderLink};
    const sdk={finishTemplatePackInstall:id=>finished.push(id)};
    const render=async extra=>act(async()=>root.render(React.createElement(Harness,{context:{templatePack:request},repository,loadTemplates:async()=>(await repo.load()).templates,sdk,files:fileService,...extra})));
    try{
      global.fetch=remoteFetch().fetcher;
      await render({templatesLoading:true});await render({busy:true});await render({templateDirty:true});await render({templateSaving:true});assert.equal(calls.length,0);
      await render();
      assert.deepEqual(calls,[[folderLink,true,{},{},'catalog']]);assert.deepEqual(finished,['pack-1']);
      assert.equal(state.tab,'templates');assert.ok(state.tplSel.startsWith('sbs-radio/'));assert.equal(state.program,state.tplSel);assert.equal(state.packDialogOpen,false);
      await render();assert.equal(calls.length,1);
      const saved=structuredClone([...store.rows]);
      global.fetch=remoteFetch({failFile:'pack.json'}).fetcher;
      request.requestId='pack-2';await render();
      assert.equal(calls.length,2);assert.deepEqual(finished,['pack-1','pack-2']);assert.ok(state.packError);assert.equal(state.packLink,folderLink);assert.equal(state.packDialogOpen,true);assert.deepEqual([...store.rows],saved);
      await render();assert.equal(calls.length,2);
      global.fetch=remoteFetch().fetcher;
      await act(async()=>state.retry());assert.equal(calls.length,3);assert.equal(state.packError,'');assert.equal(state.packDialogOpen,false);
    }finally{await act(async()=>root.unmount());dom.window.close();for(const k of keys)if(previous[k]===undefined)delete global[k];else global[k]=previous[k];}
  });
  await t.test('legacy edits and copies migrate once without changing their source files',async()=>{
    const pack=await api.readTemplatePack(fileService,path.join(realPack,'pack.json'));
    const legacyDir=path.join(temp,'.selects/plugin-data/sbs-radio-clip/templates');fs.mkdirSync(legacyDir,{recursive:true});
    const old={...structuredClone(pack.templates[0]),id:'sbs-politics',sbsStyle:true};delete old.schemaVersion;delete old.renderer;old.headline.color1='#123456';
    const custom={...structuredClone(old),id:'tlegacy',baseId:'sbs-politics',name:'Copied'};
    const raw=JSON.stringify(old);fs.writeFileSync(path.join(legacyDir,'sbs-politics.json'),raw);fs.writeFileSync(path.join(legacyDir,'tlegacy.json'),JSON.stringify(custom));
    const store=storage(),repo=api.makeTemplateRepository(store);await install(repo,realPack);let data=await repo.load();assert.equal(data.templates.length,5);
    assert.equal(data.templates.find(t=>t.id==='sbs-radio/political-show').headline.color1,'#123456');
    assert.equal(data.templates.find(t=>t.id==='custom/sbs-radio-clip-tlegacy').name,'Copied');
    assert.equal(fs.readFileSync(path.join(legacyDir,'sbs-politics.json'),'utf8'),raw);
    await repo.del('templates','sbs-radio/political-show');await repo.del('templates','custom/sbs-radio-clip-tlegacy');
    await install(repo,realPack);data=await repo.load();assert.equal(data.templates.length,4);assert.equal(data.templates[0].modified,false);
  });
});
