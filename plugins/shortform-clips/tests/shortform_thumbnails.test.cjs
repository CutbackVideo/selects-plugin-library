'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const root=process.env.SBS_PANEL_TEST_MODULES;
test('generated thumbnail lifecycle', {skip:!root&&'Set SBS_PANEL_TEST_MODULES'}, async t=>{
  const dep=createRequire(path.resolve(root,'../package.json')),React=dep('react');
  const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const exportsList='organizeCoverRun,deleteCover,CoverQualityIssue,allowCoverQualityResult,warnCoverQuality,safeCoverLayouts,selectedCoverLayout,parallelCovers,setCoverTestWorkers,directCover,saveCoverManifest,coverCachedStore,coverSettings,validateCoverSettings,coverDirectory,coverPrompt,generateCovers,resumeCovers,refreshCovers,readCoverManifest,coverPlacementScript,TemplateThumbnailSection,validatePhotoCoverPlan,renderPhotoCover,finishPhotoCover,applyCoverAlpha,prepareCoverCutouts,validateDirectedCoverPlan,isolateCoverPerson,validateCoverCompositionRevision,coverRenderPlan,validateCoverSearch,searchCoverPhotos,drawCoverTypography,validateCoverTypography,coverBackgroundBrief,redesignSavedCover,validateGeneratedCoverLayout,generatedCoverArtworkPrompt,coverPlacementPhotos,coverOverlapReport';
  const hooks=`\nfunction setCoverTestWorkers(prepare,finish){const oldPrepare=prepareDirectedCoverRequest,oldFinish=finishPhotoCover;prepareDirectedCoverRequest=prepare;finishPhotoCover=finish;return ()=>{prepareDirectedCoverRequest=oldPrepare;finishPhotoCover=oldFinish;};}\n`;
  const code=dep('esbuild').transformSync(source+hooks+'\nexport {'+exportsList+'};',{loader:'tsx',format:'cjs'}).code;
  const mod={exports:{}};new Function('require','module','exports',code)(()=>React,mod,mod.exports);
  const api=mod.exports;
  await t.test('quality failures permit rendering but execution failures still propagate',async()=>{
    const item={};
    assert.equal(await api.allowCoverQualityResult(item,async()=>{throw new api.CoverQualityIssue('Face uncertain');}),true);
    assert.deepEqual(item.qualityWarnings,['Face uncertain']);
    assert.equal(item.placementReview.skipped,true);
    assert.equal(await api.allowCoverQualityResult({},async()=>false),false);
    await assert.rejects(api.allowCoverQualityResult({},async()=>{throw Error('File missing');}),/File missing/);
  });
  const config={enabled:true,references:[{name:'style',data:'data:image/jpeg;base64,YQ=='}],instructions:'Yellow type'};
  function fixture(){
    const files=new Map(),requests=[],placements=[];let lost=true,submits=0,captures=0;
    const store={root:'/plugins/app',join:(...p)=>p.join('/'),ensure:async()=>{},exists:async p=>files.has(p),fs:{writeFile:async(p,v)=>files.set(p,v),readFile:async p=>files.get(p)}};
    const sdk={call:async(name)=>{if(name==='getDraftCore')return {owner:{projectId:'p'}};captures++;return {mimeType:'image/jpeg',data:'YQ=='};},runScript:async({script})=>{
      if(script.includes('selects.generation.submit(')){const request=JSON.parse(script.split('selects.generation.submit(')[1].split(');return')[0]);requests.push(request);submits++;if(lost){lost=false;throw Error('Transport lost after acceptance');}return {result:{jobId:'paid-job'}};}
      if(script.includes('.status()'))return {result:{status:'succeeded',deliveryStatus:'delivered',chargedCredits:'3',outputs:[{path:'/generated/image.png'}]}};
      if(script.includes('selects.export.still(')){captures++;return {result:true};}
      if(script.includes('return {meta,'))return {result:{meta:{durationFrames:120},words:'Actual clip words'}};
      placements.push(script);return {result:{folderId:'folder'}};
    }};
    return {store,sdk,requests,placements,job:{id:'run',projectId:'p'},clip:{draftId:'draft',headline1:'Headline'},get submits(){return submits},get captures(){return captures}};
  }
  await t.test('thumbnail imports reuse the timeline run folder',async()=>{
    let script='';const job={id:'run',folderId:'existing-folder',folderName:'Existing run'};
    await api.organizeCoverRun({runScript:async args=>{script=args.script;return {result:{}};}},'project',job.id,'draft','cover.png',job);
    assert.ok(script.includes('x.folderId==="existing-folder"'));
    assert.ok(script.includes('"Existing run"'));
    assert.ok(script.includes('resourceIds:[resource.resourceId]'));
  });
  await t.test('deletion detaches an active thumbnail and cannot be revived by refresh or resume',async()=>{
    const f=fixture(),item={id:'deleted-cover',status:'ready',resourceName:'cover.png',jobId:'old-job',config};
    await api.saveCoverManifest(f.store,f.job.id,f.clip.draftId,{version:1,items:[item],placement:item.id});
    const result=await api.deleteCover(f.sdk,f.store,f.job,f.clip,item.id);
    assert.equal(result.placement,null);assert.equal(result.items[0].status,'deleted');assert.ok(result.items[0].deletedAt);
    const calls=f.placements.length;await api.resumeCovers(f.sdk,f.store,f.job,f.clip);
    assert.equal(f.placements.length,calls);assert.equal((await api.readCoverManifest(f.store,f.job.id,f.clip.draftId)).items[0].status,'deleted');
  });
  await t.test('configuration checkpoints deduplicate image bytes and survive a cold read',async()=>{
    const f=fixture(),configuration={references:[{data:'x'.repeat(100000)}],logo:{data:'y'.repeat(100000)}};
    const m={version:1,items:[{id:'a',config:configuration},{id:'b',config:configuration}],placement:null};
    await api.saveCoverManifest(f.store,'run','draft',m);
    const path='/plugins/app/runs/run/draft/covers.json',bytes=await f.store.fs.readFile(path);
    assert.ok(bytes.length<1000);assert.equal(m.items[0].config,configuration);
    const cold={...f.store,fs:{...f.store.fs}};
    assert.deepEqual((await api.readCoverManifest(cold,'run','draft')).items.map(x=>x.config),[configuration,configuration]);
    m.items[1].config={...configuration,instructions:'changed'};await api.saveCoverManifest(f.store,'run','draft',m);
    const read=await api.readCoverManifest(cold,'run','draft');assert.equal(read.items[1].config.instructions,'changed');assert.equal(read.items[0].config.instructions,undefined);
  });
  await t.test('image reads are shared within an operation and invalidated on write',async()=>{
    let calls=0,value=new Uint8Array([1]);const store=api.coverCachedStore({fs:{readFile:async()=>{calls++;return value;},writeFile:async(_,v)=>{value=v;}}});
    await Promise.all([store.fs.readFile('a'),store.fs.readFile('a')]);assert.equal(calls,1);
    await store.fs.writeFile('a',new Uint8Array([2]));assert.deepEqual(await store.fs.readFile('a'),new Uint8Array([2]));assert.equal(calls,2);
  });
  await t.test('prepared cutouts and delivered artwork bypass recropping and remote generation',async()=>{
    const f=fixture(),item={id:'reuse',preparedCutouts:['a','b'],photoPlan:{subjects:[{},{}],backgroundPath:'art'},generatedTypography:true,cutoutLayout:{reason:'saved'}};
    for(const p of ['a','b','art'])await f.store.fs.writeFile(p,new Uint8Array([1]));
    f.sdk.runScript=async()=>{throw Error('Unexpected generation or import');};
    assert.deepEqual(await api.directCover(f.sdk,f.store,f.job,f.clip,item,{items:[item]},[]),['a','b']);
  });
  for(const operation of ['generate','resume','refresh'])await t.test(operation+' starts all three photo workers and isolates one failure',async()=>{
    const f=fixture();let active=0,peak=0,started=0,release,allStarted;
    const gate=new Promise(r=>release=r),began=new Promise(r=>allStarted=r);
    const restore=api.setCoverTestWorkers(async()=>({uploads:{}}),async(_sdk,store,job,clip,item,m)=>{
      active++;peak=Math.max(peak,active);if(++started===3)allStarted();
      try{await gate;if(item.variant===1)throw Error('One thumbnail failed');item.status='ready';await api.saveCoverManifest(store,job.id,clip.draftId,m);}finally{active--;}
    });
    let task,timer;
    try{
      const cfg={...config,mode:'preserve'};
      if(operation!=='generate')await api.saveCoverManifest(f.store,'run','draft',{version:1,placement:null,items:Array.from({length:3},(_,i)=>({id:'item-'+i,variant:i,config:cfg,status:operation==='refresh'?'matting':'prepare-failed',request:{uploads:{}}}))});
      task=operation==='generate'?api.generateCovers(f.sdk,f.store,f.job,f.clip,cfg,3):operation==='resume'?api.resumeCovers(f.sdk,f.store,f.job,f.clip):api.refreshCovers(f.sdk,f.store,f.job,f.clip);
      await Promise.race([began,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Workers are serialized')),1000);})]);
      assert.equal(peak,3);release();await task;
      const result=await api.readCoverManifest(f.store,'run','draft');assert.equal(result.items.filter(i=>i.status==='ready').length,2);assert.match(result.items[1].error,/One thumbnail failed/);
    }finally{clearTimeout(timer);release();await task?.catch(()=>{});restore();}
  });
  await t.test('parallel cancellation drains other workers before releasing the caller',async()=>{
    let release,finished=false,settled=false;const gate=new Promise(r=>release=r);
    const task=api.parallelCovers([0,1,2],async i=>{if(i===0)throw Error('cancelled');await gate;finished=true;}).catch(e=>{settled=true;assert.match(e.message,/cancelled/);});
    await new Promise(r=>setTimeout(r,10));assert.equal(settled,false);release();await task;assert.equal(finished,true);
  });
  await t.test('concurrent progress writes cannot overwrite a newer checkpoint',async()=>{
    const f=fixture();let release,entered;const gate=new Promise(r=>release=r),began=new Promise(r=>entered=r);let active=0,peak=0,first=true;
    const write=f.store.fs.writeFile;f.store.fs.writeFile=async(p,v)=>{if(!p.endsWith('covers.json'))return write(p,v);active++;peak=Math.max(peak,active);try{if(first){first=false;entered();await gate;}await write(p,v);}finally{active--;}};
    const m={version:1,items:[{id:'a',status:'preparing'},{id:'b',status:'preparing'}]};
    const a=api.saveCoverManifest(f.store,'run','draft',m);await began;m.items[1].status='ready';const b=api.saveCoverManifest(f.store,'run','draft',m);release();await Promise.all([a,b]);
    assert.equal(peak,1);assert.equal((await api.readCoverManifest(f.store,'run','draft')).items[1].status,'ready');
  });
  await t.test('measured candidates preserve all portraits and cannot accept invented coordinates',()=>{
    const assets=Array.from({length:3},(_,frame)=>({frame,width:500,height:800,face:{xmin:170,ymin:50,xmax:330,ymax:250},maskWidth:125,maskHeight:200,alpha:new Uint8Array(25000).fill(255)}));
    for(const a of assets)for(let y=0;y<63;y++)for(let x=0;x<125;x++)if(x<42||x>83)a.alpha[y*125+x]=0;
    const candidates=api.safeCoverLayouts(assets,[{frame:0},{frame:1},{frame:2}],1390,null);assert.ok(candidates.length>=2);
    for(const c of candidates){assert.equal(c.placements.length,3);const photos=api.coverPlacementPhotos(c.placements,assets,1390);assert.ok(api.coverOverlapReport(photos,assets,null).maxCoveredFraction<=.005);}
    const selected=api.selectedCoverLayout({candidateId:candidates[0].id,reason:'Balanced group',placements:[{frame:9}]},candidates);assert.deepEqual(selected.placements,candidates[0].placements);
    assert.throws(()=>api.selectedCoverLayout({candidateId:'invented',reason:'x'},candidates),/available/);
  });
  await t.test('face protection detects opaque hands but allows transparent box overlap',()=>{
    const a={width:100,height:100,face:{xmin:30,ymin:20,xmax:60,ymax:50},maskWidth:100,maskHeight:100,alpha:new Uint8Array(10000)};
    const b={...a,alpha:new Uint8Array(10000)};
    const photos=[{frame:0,x:0,y:0,width:100,height:100},{frame:1,x:0,y:0,width:100,height:100}];
    assert.equal(api.coverOverlapReport(photos,[a,b],null).maxCoveredFraction,0);
    for(let y=20;y<50;y++)for(let x=30;x<60;x++)b.alpha[y*100+x]=255;
    assert.ok(api.coverOverlapReport(photos,[a,b],null).faces[0].coveredFraction>.5);
    assert.equal(api.coverOverlapReport([...photos].reverse(),[a,b],null).maxCoveredFraction,0);
    const p=api.coverPlacementPhotos([{frame:0,x:20,y:30,scale:2}],[a],300)[0];assert.equal(p.width,200);assert.equal(p.height,200);
    assert.throws(()=>api.coverPlacementPhotos([{frame:0,x:20,y:30,scale:4}],[a],300),/outside/);
    assert.throws(()=>api.coverPlacementPhotos([{frame:0,x:20,y:30,scale:NaN}],[a],300),/scale/);
  });
  await t.test('photo research enables advanced and records the actual mode',async()=>{
    const f=fixture();f.sdk.askAI=async request=>{assert.equal(request.advanced,true);return {text:JSON.stringify({concept:'Clean portraits',done:true,preferredFrames:[],requests:[]})};};
    const item={id:'advanced',config:{references:[]},request:{uploads:{}}};
    await api.searchCoverPhotos(f.sdk,f.store,f.job,f.clip,item,{items:[item]},[],{sources:[{resourceId:'source',durationSeconds:100}],candidates:[],transcript:'words'});
    assert.equal(item.photoSearch.rounds[0].advanced,true);
  });
  await t.test('generated title layout protects title and rejects cropped portraits',()=>{
    const plan={background:'#102030',backgroundPrompt:'Continuous newsroom texture',subjects:[{frame:0,crop:[0,0,1,1]}],photos:[],texts:[{text:'\uc815\uba74\ub3cc\ud30c?',x:40,y:1450,width:1000,height:300,size:100,color:'#ffff00'}]};
    const revision={photos:[{frame:0,x:100,y:100,width:800,height:1250,fit:'contain'}],titleRegion:{x:40,y:1350,width:1000,height:500},artworkDirection:'Yellow outlined first line, black lettering on yellow strip in the second line.'};
    const next=api.validateGeneratedCoverLayout(plan,revision,1);assert.equal(next.generatedTypography,true);
    assert.ok(api.validateGeneratedCoverLayout(plan,{...revision,photos:[{...revision.photos[0],height:1400}]},1).qualityWarnings.length);
    assert.ok(api.validateGeneratedCoverLayout(plan,{...revision,photos:[{...revision.photos[0],fit:'cover'}]},1).qualityWarnings.length);
    assert.throws(()=>api.validateGeneratedCoverLayout(plan,{...revision,titleRegion:{...revision.titleRegion,y:NaN}},1),/title region/);
    const prompt=api.generatedCoverArtworkPrompt(next);assert.match(prompt,/\uc815\uba74\ub3cc\ud30c/);assert.match(prompt,/BACKGROUND AND HEADLINE/);assert.match(prompt,/NO PEOPLE/);assert.match(prompt,/BOTTOM QUARTER/);
  });
  await t.test('generated title is not painted a second time by canvas',async()=>{
    const oldDocument=global.document,oldBitmap=global.createImageBitmap;let draws=0;
    global.createImageBitmap=async()=>({width:600,height:800,close(){}});
    global.document={fonts:{ready:Promise.resolve()},createElement:()=>({getContext:()=>({fillRect(){},drawImage(){draws++;},createLinearGradient(){return {addColorStop(){}}},fillText(){throw Error('Duplicate canvas headline');}}),toBlob:cb=>cb(new Blob(['png']))})};
    try{const f=fixture();const plan={generatedTypography:true,artDirected:true,background:'#102030',backgroundPath:'/art.png',photos:[{frame:0,x:0,y:0,width:1080,height:1300,fit:'contain'}],texts:[{text:'\uc81c\ubaa9',x:40,y:1400,width:1000,height:400,size:100,color:'#ffff00',fontId:'not-installed'}]};
      await api.renderPhotoCover({...f.store,fs:{...f.store.fs,readFile:async()=>new Uint8Array([1])}},['face.png'],plan,'result.png');assert.equal(draws,3);
    }finally{global.document=oldDocument;global.createImageBitmap=oldBitmap;}
  });
  await t.test('photo research only accepts bounded requests to known originals',()=>{
    const sources=[{resourceId:'original',durationSeconds:100}];
    const plan={concept:'Two large portraits facing the title',done:false,preferredFrames:[0],requests:[{resourceId:'original',seconds:42.5,reason:'Find a clearer shoulder pose'}]};
    assert.equal(api.validateCoverSearch(plan,sources),plan);
    for(const request of [{...plan.requests[0],resourceId:'foreign'},{...plan.requests[0],seconds:100},{...plan.requests[0],seconds:-1},{...plan.requests[0],seconds:NaN}])assert.throws(()=>api.validateCoverSearch({...plan,requests:[request]},sources),/outside/);
    assert.throws(()=>api.validateCoverSearch({...plan,requests:Array(9).fill(plan.requests[0])},sources),/Invalid/);
    assert.throws(()=>api.validateCoverSearch({...plan,done:true},sources),/Finished/);
    assert.throws(()=>api.validateCoverSearch({...plan,requests:[]},sources),/must request/);
    api.validateCoverSearch({...plan,done:true,requests:[]},sources);
  });
  await t.test('resumes saved research without repeating AI calls or losing frame indices',async()=>{
    const f=fixture();f.store.exists=async()=>true;
    const candidates=[{resourceId:'original',seconds:10}];
    const item={id:'cover',request:{uploads:{clip0:{pluginFile:'/initial.png'}}},photoSearch:{rounds:[{applied:false,plan:{concept:'Portrait group',done:true,requests:[]}}],candidates,complete:false}};
    f.sdk.askAI=()=>{throw Error('Must not repeat acknowledged research');};
    await api.searchCoverPhotos(f.sdk,f.store,f.job,f.clip,item,{items:[item]},['/initial.png'],{sources:[{resourceId:'original',durationSeconds:100}],candidates});
    assert.equal(item.photoSearch.complete,true);assert.equal(item.photoSearch.rounds[0].applied,true);assert.equal(item.photoSearch.candidates.length,1);
  });
  await t.test('interrupted frame requests resume with stable indices and deduplicate timestamps',async()=>{
    const f=fixture();f.store.exists=async()=>true;f.sdk.askAI=()=>{throw Error('Research budget should prevent another call');};
    const request={resourceId:'original',seconds:42,reason:'Better portrait'};
    const candidates=[{resourceId:'original',seconds:10},request];
    const item={id:'cover',request:{uploads:{clip0:{pluginFile:'/first.png'},clip1:{pluginFile:'/second.png'}}},photoSearch:{rounds:[{applied:true},{applied:true},{applied:false,plan:{concept:'Group',done:false,requests:[request,{...request,seconds:43}]}}],candidates,complete:false}};
    const frames=['/first.png','/second.png'];
    await api.searchCoverPhotos(f.sdk,f.store,f.job,f.clip,item,{items:[item]},frames,{sources:[{resourceId:'original',durationSeconds:100,path:'/original.mp4'}],candidates});
    assert.equal(frames.length,3);assert.match(frames[2],/candidate-2.png$/);assert.equal(item.photoSearch.candidates[2].seconds,43);assert.equal(item.photoSearch.stopReason,'search-budget');assert.equal(item.photoSearch.rounds[2].applied,true);
  });
  await t.test('reference typography preserves AI choices and renders scaled tracked outlined text',()=>{
    const text={text:'\uac00\ub098\ub2e4',x:0,y:0,width:700,height:220,size:100,color:'#ffee00',fontId:'gmarket',scaleX:.8,letterSpacing:-3,lineHeight:1,strokes:[{color:'#ffffff',width:8},{color:'#000000',width:16}],shadow:{color:'#000000',x:3,y:4,blur:2}};
    const result=api.coverRenderPlan({artDirected:true,texts:[text]},{titleStyle:'reference'});assert.deepEqual(result.texts[0],text);assert.equal(api.coverRenderPlan({artDirected:true,texts:[{...text,plate:'#ffff00'}]},{titleStyle:'reference'}).texts[0].plate,'#ffff00');
    const calls=[],ctx={save(){},restore(){},translate(){},scale:(...v)=>calls.push(['scale',...v]),measureText:s=>({width:s.length*100}),fillText:(...v)=>calls.push(['fill',...v]),strokeText(...v){calls.push(['stroke',this.lineWidth,...v]);}};
    api.drawCoverTypography(ctx,text,'Gmarket');assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===.8));assert.equal(calls.find(c=>c[0]==='stroke')[1],16);assert.ok(calls.some(c=>c[0]==='fill'&&c[1]==='\ub098'&&c[2]===97));
    for(const bad of [{scaleX:0},{letterSpacing:100},{fontId:'invented'},{strokes:[{color:'red',width:2}]},{shadow:{color:'#000000',blur:NaN,x:0,y:0}}])assert.throws(()=>api.validateCoverTypography({...text,...bad}));
    assert.throws(()=>api.drawCoverTypography(ctx,{...text,width:10},'Gmarket'),/exceed/);
    assert.equal(api.coverBackgroundBrief('Dark navy studio texture. Keep the top-left 300x150 area empty for a logo. Subtle red light.'),'Dark navy studio texture. Subtle red light.');
  });
  await t.test('redesign preserves approved photos and the previous finished result',async()=>{
    const f=fixture();f.store.exists=async()=>true;
    const old={id:'approved',status:'ready',photoPipeline:3,path:'/old.png',photoPlan:{background:'#102030',backgroundPrompt:'Dark studio texture with red light',backgroundPath:'/old-art.png',subjects:[{frame:0,crop:[0,0,1,1]}],photos:[{frame:0,x:10,y:30,width:500,height:800,fit:'contain'}],texts:[]},mattes:[{path:'/cutout.png',source:'/source.png'}],request:{uploads:{clip0:{pluginFile:'/source.png'},reference0:{pluginFile:'/ref.png'}}}};
    const original=structuredClone(old),manifest={version:1,items:[old]};f.store.fs.readFile=async()=>new TextEncoder().encode(JSON.stringify(manifest));
    const result=await api.redesignSavedCover(f.sdk,f.store,f.job,f.clip,'approved',{...config,mode:'preserve',titleStyle:'reference'});
    assert.deepEqual(result.items[0],original);const next=result.items[1];assert.notEqual(next.id,old.id);assert.equal(next.redesignOf,'approved');assert.equal(next.lockPortraitLayout,true);assert.deepEqual(next.photoPlan.photos,original.photoPlan.photos);assert.equal(next.photoPlan.backgroundPath,undefined);assert.deepEqual(next.mattes,old.mattes);assert.equal(next.config.titleStyle,'reference');assert.notEqual(next.backgroundRequest.requestKey,'cover-art-approved');
  });
  await t.test('no-review experiment finishes the first design without an AI review call',async()=>{
    const f=fixture();f.store.exists=async()=>true;f.sdk.askAI=()=>{throw Error('Review must not be called');};
    const item={id:'unreviewed',skipCompositionReview:true,photoPipeline:3,config:{...config,mode:'preserve'},request:{uploads:{clip0:{pluginFile:'/original.png'}}},photoPlan:{background:'#123456',subjects:[{frame:0,crop:[0,0,1,1]}],photos:[],texts:[]},mattes:[{path:'/cutout.png'}],backgroundRequest:{saved:true},backgroundJobId:'existing-art'};
    await api.finishPhotoCover(f.sdk,f.store,f.job,f.clip,item,{items:[item]});
    assert.equal(item.status,'ready');assert.equal(item.compositionReviewed,undefined);assert.equal(item.compositionReview,undefined);assert.equal(item.resourceName,'cover-unreviewed.png');assert.ok(item.completedAt);assert.equal(item.skipCompositionReview,true);
  });
  await t.test('person isolation removes disconnected bystanders without changing RGB',()=>{
    const p=new Uint8ClampedArray(6*3*4);for(let i=0;i<18;i++){p[i*4]=37;p[i*4+1]=89;p[i*4+2]=123;}
    for(const i of [0,1,6,7,12,13,5,11])p[i*4+3]=200;
    const original=p.slice();api.isolateCoverPerson(p,6,3);
    for(let i=0;i<18;i++)assert.deepEqual([...p.slice(i*4,i*4+3)],[...original.slice(i*4,i*4+3)]);
    assert.equal(p[0*4+3],200);assert.equal(p[13*4+3],200);assert.equal(p[5*4+3],0);assert.equal(p[11*4+3],0);
    assert.throws(()=>api.isolateCoverPerson(new Uint8ClampedArray(4),1,1),/No person/);
  });
  await t.test('art direction allows torso overlays but rejects invalid source crops and styles',()=>{
    const plan={background:'#102030',backgroundPrompt:'A photographic editing desk without people or lettering',subjects:[{frame:2,crop:[.1,.1,.7,.8]}],photos:[{frame:0,x:0,y:0,width:1080,height:1600}],texts:[{text:'NO MOUSE?',x:60,y:1300,width:960,height:300,size:140,color:'#ffff00',font:'condensed',stroke:'#000000',strokeWidth:8}]};
    assert.equal(api.validateDirectedCoverPlan(structuredClone(plan),3).artDirected,true);
    const splitHeadline={...structuredClone(plan),texts:Array.from({length:4},(_,i)=>({...plan.texts[0],text:'Line '+i}))};assert.equal(api.validateDirectedCoverPlan(splitHeadline,3).texts.length,4);
    api.validateCoverSettings({...config,logo:{name:'Original logo',data:'data:image/webp;base64,YQ=='}});
    const revision={photos:[{...plan.photos[0],fit:'contain'}],texts:plan.texts,backgroundPath:'/untrusted.png',subjects:[]};
    const revised=api.validateCoverCompositionRevision({...plan,backgroundPath:'/original-art.png'},revision,3);
    assert.equal(revised.backgroundPath,'/original-art.png');assert.deepEqual(revised.subjects,plan.subjects);
    assert.ok(api.validateCoverCompositionRevision(plan,{...revision,photos:[{...plan.photos[0],fit:'cover'}]},3).qualityWarnings.length);

    assert.throws(()=>api.validateDirectedCoverPlan({...structuredClone(plan),subjects:[{frame:3,crop:[0,0,1,1]}]},3),/crop/);
    assert.throws(()=>api.validateDirectedCoverPlan({...structuredClone(plan),subjects:[{frame:0,crop:[.5,0,.8,1]}]},3),/crop/);
    const invalid=structuredClone(plan);invalid.texts[0].font='arbitrary-font';assert.throws(()=>api.validateDirectedCoverPlan(invalid,3),/font/);
    assert.match(source,/No original-person pixels are supplied to image generation/);
  });
  await t.test('fixed branding overrides AI typography and removes hard plates without mutating saved design',()=>{
    const plan={artDirected:true,photos:[],texts:[{text:'Headline',color:'#ffffff',plate:'#000000'}]};
    const c=api.coverSettings({thumbnail:{titleStyle:'fixed',titleColor:'#ffee00',titleOutline:'#112233',titleFont:'heavy'}});
    const out=api.coverRenderPlan(plan,c);assert.equal(out.texts[0].plate,undefined);assert.equal(out.texts[0].color,'#ffee00');assert.equal(out.texts[0].stroke,'#112233');assert.equal(plan.texts[0].plate,'#000000');
    assert.equal(c.sourceScope,'source');
    const branded=api.coverRenderPlan({artDirected:true,texts:[{text:'fake logo',x:42,y:46,width:285,height:68},{text:'headline',x:48,y:1200,width:980,height:300}]},{...c,logo:{data:'data:image/webp;base64,YQ=='}});assert.equal(branded.texts.length,1);assert.equal(branded.texts[0].text,'headline');assert.equal(branded.texts[0].color,'#ffee00');
    assert.throws(()=>api.validateCoverSettings({...config,logo:{name:'bad',data:'https://example.org/logo'}}),/logo/);
  });
  await t.test('manifest reads retry a replacement race without losing saved jobs',async()=>{
    const f=fixture();let reads=0;f.store.exists=async()=>true;
    f.store.fs.readFile=async()=>new TextEncoder().encode(++reads===1?'{"version":1,"items":':'{"version":1,"items":[{"id":"retained"}]}');
    const m=await api.readCoverManifest(f.store,'run','draft');assert.equal(reads,2);assert.equal(m.items[0].id,'retained');
  });
  await t.test('defaults off, preserves up to five references, rejects malformed settings',()=>{
    assert.equal(api.coverSettings({}).enabled,false);
    api.validateCoverSettings(config);
    assert.throws(()=>api.validateCoverSettings({...config,references:Array(6).fill(config.references[0])}),/five/);
    assert.throws(()=>api.validateCoverSettings({...config,references:[{name:'bad',data:'https://untrusted'}]}),/reference/);
    assert.throws(()=>api.coverDirectory({fs:{},root:'/data',join:path.join},'../escape','draft'),/owner/);
    assert.match(api.coverPrompt({},config,'spoken fact',0,1),/DESIGN REFERENCES ONLY/);
  });
  await t.test('photo mode defaults to original pixels and rejects unsafe compositions',async()=>{
    assert.equal(api.coverSettings({}).mode,'preserve');
    assert.equal(api.coverSettings({thumbnail:{mode:'generate'}}).mode,'generate');
    assert.throws(()=>api.validateCoverSettings({...config,mode:'other'}),/mode/);
    const plan={background:'#102030',photos:[{frame:0,x:0,y:300,width:1080,height:1400}],texts:[{text:'Real people',x:60,y:40,width:960,height:220,size:90,color:'#ffffff'}]};
    api.validatePhotoCoverPlan(plan,1);
    assert.throws(()=>api.validatePhotoCoverPlan({...plan,photos:[{...plan.photos[0],frame:9}]},1),/placement/);
    assert.ok(api.validatePhotoCoverPlan({...plan,texts:[{...plan.texts[0],y:400}]},1).qualityWarnings.length);
    const oldDocument=global.document,oldBitmap=global.createImageBitmap,draws=[];
    const original={width:1920,height:1080,close(){}};
    global.createImageBitmap=async()=>original;
    global.document={fonts:{ready:Promise.resolve()},createElement:()=>({getContext:()=>({save(){},restore(){},translate(){},scale(){},fillRect(){},createLinearGradient(){return {addColorStop(){}}},drawImage:(...args)=>draws.push(args),measureText:s=>({width:s.length*30}),fillText(){}}),toBlob:cb=>cb(new Blob(['png']))})};
    try {const f=fixture();await api.renderPhotoCover({...f.store,fs:{...f.store.fs,readFile:async()=>new Uint8Array([1,2])}},['original.png'],plan,'result.png');
      assert.equal(draws[0][0],original);assert.equal(draws[1].length,5);assert.equal(draws[1][3]/draws[1][4],1920/1080);
      const directed={...plan,artDirected:true,photos:[{...plan.photos[0],fit:'cover'}]};
      await api.renderPhotoCover({...f.store,fs:{...f.store.fs,readFile:async()=>new Uint8Array([1,2])}},['original.png'],directed,'filled.png');
      const filled=draws[3];assert.equal(draws[2][0],original);assert.equal(filled.length,9);assert.equal(filled[2],0);assert.ok(filled[1]>0);assert.equal(filled[7],1080);assert.equal(filled[8],1400);assert.ok(filled[1]+filled[3]<=1920);

    }finally{global.document=oldDocument;global.createImageBitmap=oldBitmap;}
  });
  await t.test('portrait fade is isolated to its layer and uploaded logo is drawn last',async()=>{
    const oldDocument=global.document,oldBitmap=global.createImageBitmap,events=[],contexts=[];
    global.createImageBitmap=async()=>({width:600,height:800,close(){}});
    global.document={fonts:{ready:Promise.resolve()},createElement:()=>{const n=contexts.length;const ctx={save(){},restore(){},translate(){},scale(){},fillRect(){},drawImage(...a){events.push({n,a});},measureText:s=>({width:s.length*20}),strokeText(){},fillText(){},createLinearGradient(...a){events.push({gradient:a,n});return {addColorStop(){}}}};contexts.push(ctx);return {getContext:()=>ctx,toBlob:cb=>cb(new Blob(['png']))};}};
    try{
      const f=fixture();const plan={artDirected:true,background:'#112233',photos:[{frame:0,x:0,y:0,width:1000,height:1400,fit:'contain'}],texts:[{text:'Test',x:50,y:1450,width:950,height:200,size:90,color:'#ffffff'}]};
      await api.renderPhotoCover({...f.store,fs:{...f.store.fs,readFile:async()=>new Uint8Array([1])}},['face.png'],plan,'out.png',{logo:{data:'data:image/png;base64,YQ=='},logoPosition:'right'});
      assert.equal(contexts[1].globalCompositeOperation,'destination-in');assert.equal(contexts[0].globalCompositeOperation,undefined);
      assert.deepEqual(events.find(e=>e.gradient).gradient,[0,624,0,800]);
      const last=events.at(-1);assert.equal(last.n,0);assert.equal(last.a[1]+last.a[3],1032);assert.equal(last.a[2],48);
    }finally{global.document=oldDocument;global.createImageBitmap=oldBitmap;}
  });
  await t.test('photo import retries reuse saved design and pixels without another AI call',async()=>{
    const f=fixture();f.store.exists=async()=>true;
    f.sdk.askAI=async()=>{throw Error('Must not redesign');};
    const item={id:'photo',config:{...config,mode:'preserve'},request:{uploads:{clip0:{pluginFile:'/original.png'}}},photoPlan:{saved:true}};
    const manifest={version:1,items:[item],placement:null};
    await api.finishPhotoCover(f.sdk,f.store,f.job,f.clip,item,manifest);
    assert.equal(item.status,'ready');assert.equal(f.submits,0);assert.equal(item.resourceName,'cover-photo.png');
    assert.ok(f.placements.some(s=>s.includes('importFiles')));
  });
  await t.test('RVM luminance becomes alpha without changing original RGB',()=>{
    const rgb=new Uint8ClampedArray([10,20,30,255,40,50,60,255]);
    api.applyCoverAlpha(rgb,new Uint8ClampedArray([0,0,0,255,127,127,127,255]));
    assert.deepEqual([...rgb],[10,20,30,0,40,50,60,127]);
    assert.throws(()=>api.applyCoverAlpha(rgb,new Uint8ClampedArray(4)),/dimensions/);
  });
  await t.test('RVM jobs recover the same keys after lost acknowledgment and reuse workflow IDs',async()=>{
    const f=fixture(),submitted=[];let fail=true;
    f.sdk.runScript=async({script})=>{
      if(script.includes('selects.ai.submit')){submitted.push(script);if(fail){fail=false;throw Error('lost acknowledgment');}return {result:{workflowId:'matte-job'}};}
      if(script.includes('.status()'))return {result:{status:'running',step:'inference'}};
      return {result:{folderId:'folder'}};
    };
    const item={id:'photo',config:{...config,mode:'preserve'}},manifest={version:1,items:[item],placement:null};
    await assert.rejects(api.prepareCoverCutouts(f.sdk,f.store,f.job,f.clip,item,manifest,['/source.png']),/lost acknowledgment/);
    const key=item.mattes[0].requestKey;
    assert.equal(await api.prepareCoverCutouts(f.sdk,f.store,f.job,f.clip,item,manifest,['/source.png']),null);
    assert.equal(item.mattes[0].requestKey,key);assert.equal(item.mattes[0].workflowId,'matte-job');assert.equal(submitted[0],submitted[1]);
    await api.prepareCoverCutouts(f.sdk,f.store,f.job,f.clip,item,manifest,['/source.png']);assert.equal(submitted.length,2);
  });
  await t.test('unknown submission reuses frozen request and does not charge a new key on auto resume',async()=>{
    const f=fixture();let m=await api.generateCovers(f.sdk,f.store,f.job,f.clip,config,1,true);
    assert.equal(m.items[0].status,'unknown');assert.equal(f.captures,3);
    const key=f.requests[0].requestKey;assert.match(key,/^[A-Za-z0-9_-]{8,64}$/);
    m=await api.generateCovers(f.sdk,f.store,f.job,f.clip,{...config,instructions:'changed'},1,true);
    assert.equal(m.items.length,1);assert.equal(m.items[0].jobId,'paid-job');assert.equal(f.captures,3);
    assert.deepEqual(f.requests[0],f.requests[1]);assert.equal(f.requests[1].requestKey,key);
    await api.generateCovers(f.sdk,f.store,f.job,f.clip,config,1,true);assert.equal(f.submits,2);
    assert.equal(f.requests[0].input.image_urls.length,4);assert.equal(f.requests[0].input.aspect_ratio,'9:16');
  });
  await t.test('delivered outputs are imported and grouped once, with credits retained',async()=>{
    const f=fixture();await api.generateCovers(f.sdk,f.store,f.job,f.clip,config,1,true);await api.resumeCovers(f.sdk,f.store,f.job,f.clip);
    const m=await api.readCoverManifest(f.store,'run','draft');assert.equal(m.items[0].status,'ready');assert.equal(m.items[0].credits,'3');
    const before=f.placements.length;await api.refreshCovers(f.sdk,f.store,f.job,f.clip);assert.equal(f.placements.length,before);
    assert.ok(f.placements.some(x=>x.includes('moveToFolder')));
  });
  await t.test('first-frame replacement does not shift audio or delete unrelated overlays',async()=>{
    const input=api.coverPlacementScript('p','draft','new.png',['old.png','new.png'],{width:1536,height:2752});
    const clips=[{clipId:'old',trackKind:'video',resourceId:'old',startFrame:0,endFrame:1},{clipId:'main',trackKind:'main',resourceId:'old',startFrame:0,endFrame:90},{clipId:'other',trackKind:'video',resourceId:'other',startFrame:0,endFrame:1},{clipId:'long',trackKind:'video',resourceId:'old',startFrame:0,endFrame:20}];
    let removed,range,placed,transform;const draft={meta:async()=>({frameSize:{width:1080,height:1920}}),setClipTransform:async x=>transform=x,clips:async()=>placed?[...clips,{clipId:'new',trackId:'top',resourceId:'new'}]:clips,removeClips:async x=>removed=x,rangeAtFrames:async(a,b)=>(range=[a,b]),overlayResource:async x=>placed=x,commitAll:async()=>{}};
    const selects={project:()=>({meta:async()=>({draftIds:['draft']}),resources:async()=>[{name:'old.png',resourceId:'old'},{name:'new.png',resourceId:'new'}],resource:id=>({id,meta:async()=>({frameSize:{width:1536,height:2752}})})}),draft:()=>draft};
    const js=dep('esbuild').transformSync('async function run(){'+input+'}',{loader:'ts'}).code;
    await new Function('selects',js+';return run();')(selects);
    assert.deepEqual(removed.map(x=>x.clipId),['old']);assert.deepEqual(range,[0,1]);assert.equal(placed.withSound,false);assert.equal(placed.resource.id,'new');assert.ok(transform.scale.x>1);assert.equal(transform.scale.x,transform.scale.y);
  });
});
