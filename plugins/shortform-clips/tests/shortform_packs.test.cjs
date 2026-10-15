'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const {createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;
test('external template pack lifecycle', {skip:!modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async t=>{
  const dep=createRequire(path.resolve(modulesRoot,'../package.json'));
  const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const ts=dep('typescript');
  const program=ts.createProgram([path.join(__dirname,'../panel.tsx')],{noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React,skipLibCheck:true});
  const undefinedNames=ts.getPreEmitDiagnostics(program).filter(d=>[2304,2552,2580,2591].includes(d.code));
  assert.deepEqual(undefinedNames.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[], 'The host rejects panels with undefined identifiers');
  const code=dep('esbuild').transformSync(source+'\nexport {readGitHubTemplatePack,parsePackLink,ShortformClipsPanel,TemplatePicker,TemplatePackDialog,PACK_STRINGS,readTemplatePack,makeTemplateRepository,validateTemplate,templatePatch,merge,cleanTemplate,TemplateEditor,STRINGS,RADIO_STRINGS};',{loader:'tsx',format:'cjs'}).code;
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
    let edited=structuredClone(original);edited.headline.color1='#123456';edited.variants.tiktok.layout.windowTop=600;
    await repo.put('templates',edited.id,api.cleanTemplate(edited));
    const saved=await store.list('overrides');assert.deepEqual(saved[0].patch,{headline:{color1:'#123456'},variants:{tiktok:{layout:{windowTop:600}}}});
    edit(folder,'pack.json',m=>m.version='1.1.0');edit(folder,'templates/money-lab.json',t=>{t.version++;t.headline.size1=111;t.headline.color1='#FF0000';t.variants.tiktok.layout.windowTop=580;});
    await install(repo,folder);const current=(await repo.load()).templates.find(t=>t.id===edited.id);
    assert.equal(current.headline.color1,'#123456');assert.equal(current.headline.size1,111);assert.equal(current.variants.tiktok.layout.windowTop,600);
    const custom={...api.cleanTemplate(current),id:'custom/copy',baseId:current.id,name:'My copy'};await repo.put('templates',custom.id,custom);
    await repo.del('templates',current.id);const reset=(await repo.load()).templates.find(t=>t.id===current.id);
    assert.equal(reset.headline.color1,'#FF0000');assert.equal(reset.variants.tiktok.layout.windowTop,580);assert.equal(reset.modified,false);
    assert.equal((await repo.load()).templates.find(t=>t.id===custom.id).headline.color1,'#123456');
    await repo.del('templates',custom.id);assert.equal((await repo.load()).templates.length,4);
    const reopened=api.makeTemplateRepository(store);assert.equal((await reopened.load()).templates.find(t=>t.id===current.id).headline.size1,111);
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
    remote=remoteFetch({change:(file,bytes)=>file==='pack.json'?new Uint8Array(4*1024*1024+1):bytes});await assert.rejects(api.readGitHubTemplatePack(folderLink,remote.fetcher),e=>e.code==='tooLarge');
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
    const start=source.indexOf('  async function installPack('),handler=source.slice(start,source.indexOf('  React.useEffect(',start));
    const markupStart=source.indexOf('            {!templates.length && <ui.Actions>');
    const markup=source.slice(markupStart,source.indexOf('            {templates.length > 0 && <TemplateEditor',markupStart));
    const code=dep('esbuild').transformSync(`function Harness({ui,repository,loadTemplates,templateDirty=false,templateSaving=false,busy=false}){
      const K=${JSON.stringify(api.PACK_STRINGS.en)}, lang='en',files={},templates=[],templatesLoading=false,S={cancel:'Cancel'};
      const [packDialogOpen,setPackDialogOpen]=React.useState(true);
      const [packLink,setPackLink]=React.useState(''),[packBusy,setPackBusy]=React.useState(false),[packMessage,setPackMessage]=React.useState(''),[packError,setPackError]=React.useState('');
      const packLock=React.useRef(false);
      ${handler}
      return (<>${markup}</>);
    } return Harness;`,{loader:'tsx'}).code;
    const Harness=new Function('React','TemplatePackDialog',code)(React,api.TemplatePackDialog);
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
      assert.deepEqual(calls,[[folderLink,true]]);assert.equal(file,undefined);assert.equal(input.disabled,true);
      await act(async()=>resolveInstall({name:'SBS Radio'}));assert.equal(reloads,1);assert.equal(document.querySelector('dialog').open,false);assert.equal(input.value,'');assert.match(document.body.textContent,/Templates added. SBS Radio/);
      await act(async()=>input.onChange(folderLink));await render({templateDirty:true});assert.equal(button('Add').disabled,true);assert.equal(file,undefined);assert.match(document.body.textContent,/Save or discard/);
      await render({templateSaving:true});assert.equal(button('Add').disabled,true);
      await render();assert.equal(button('Choose pack.json'),undefined);assert.doesNotMatch(document.body.textContent,/GitHub|pack\.json/);assert.doesNotMatch(input.placeholder || '',/GitHub/);
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
