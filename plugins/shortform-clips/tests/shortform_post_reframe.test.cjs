'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('post-build reframing preserves editable drafts',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {SCRIPT_APPLY_REFRAME,createReframeWork,templateBuildScript,captionLineMax,wideShotScript,STACKED_REFRAME_EFFECT,savedDraftResults};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const P={projectId:'p',draftId:'d',resourceId:'v',resourceName:'Video',sourceKind:'video',transform:{scale:2,posX:0,posY:0},frame:{windowTop:450,windowBottom:1300},reframe:[{start:0,end:10,cx:450,w:800},{start:10,end:30,cx:1400,w:800}]};
 async function run({fail=false,owned=true}={}){
  let committed=0,transforms=[],splits=[];
  const clips=[{resourceId:'v',trackKind:'main',startFrame:0,endFrame:120},{resourceId:'v',trackKind:'main',startFrame:120,endFrame:240}];
  const draft={words:async()=>[{startFrame:0,sourceStartFrame:125},{startFrame:120,sourceStartFrame:500}],splitAt:async({frame})=>splits.push(frame),clips:async()=>clips,setClipTransform:async value=>{if(fail)throw Error('transform failed');transforms.push(value);},commitAll:async()=>{committed++;}};
  const sm={fps:25,frameSize:{width:1920,height:1080}};
  const project={meta:async()=>({draftIds:owned?['d']:[]}),resources:async()=>[{resourceId:'v',name:'Video',hasAnalysis:true}],resource:()=>({meta:async()=>sm,words:async()=>[]})};
  const selects={project:()=>project,draft:()=>draft};
  const code=mod.exports.SCRIPT_APPLY_REFRAME.replace('const P: any = __P__;','const P: any = '+JSON.stringify(P)+';');
  const execute=()=>new Function('selects',esbuild.transformSync('return (async()=>{'+code+'})();',{loader:'ts'}).code)(selects);
  return {execute,read:()=>({committed,transforms,splits})};
 }
 await t.test('applies source-time shot changes to edited Draft time and commits the existing Draft',async()=>{
  const r=await run();const result=await r.execute();const state=r.read();
  assert.equal(result.draftId,'d');assert.equal(state.committed,1);assert.deepEqual(state.splits,[120]);assert.equal(state.transforms.length,2);
  assert.ok(state.transforms[0].position.x>0);assert.ok(state.transforms[1].position.x<0);
 });
 await t.test('transform failure is visible and never commits partial changes',async()=>{
  const r=await run({fail:true});await assert.rejects(r.execute,/transform failed/);assert.equal(r.read().committed,0);
 });
 await t.test('rejects output belonging to another project before mutation',async()=>{
  const r=await run({owned:false});await assert.rejects(r.execute,/no longer in this project/);assert.deepEqual(r.read(),{committed:0,transforms:[],splits:[]});
 });
 await t.test('failed framing resumes the saved Draft without building or selecting again',async()=>{
  const loop=src.slice(src.indexOf('      const made: any[] ='),src.indexOf('      setStatus(S.done(',src.indexOf('      const made: any[] =')));
  const body=esbuild.transformSync(loop,{loader:'ts'}).code;
  let job={built:[]},builds=0,applies=0,thumbnails=0,fail=true;const events=[];
  const pickd={clips:[{name:'One',segments:[[1,5]]}]};
  const env={templateBuildScript:mod.exports.templateBuildScript,captionLineMax:mod.exports.captionLineMax,wideShotScript:mod.exports.wideShotScript,findRunDraftScript:()=>"LOOKUP",withoutRunSuffix:(name)=>name,ensureRunFolder:async()=>"run-folder",moveRunDrafts:async()=>{},forceReframe:false,onlyDraftId:undefined,token:{cancelled:false},createReframeWork:mod.exports.createReframeWork,pickd,tpl:{renderer:'series',layout:{reframe:true},logo:{image:''},captions:{on:false},editing:{}},
   STACKED_REFRAME_EFFECT:'effect',projectId:'p',S:{building:()=>'',reframing:'framing'},lang:'en',transform:{scale:1},buildLogo:'',SCRIPT_APPLY_REFRAME:'APPLY const P: any = __P__;',
   RADIO_SCRIPT_BUILD:'BUILD const P: any = __P__;',SCRIPT_BUILD:'BUILD const P: any = __P__;',SCRIPT_LIMIT:1e7,RunCancelled:class extends Error{},
   setStatus:()=>{},setSub:()=>{},setDrafts:()=>{},setWarn:()=>{},nameOf:()=>'',radioFrameParams:()=>({}),
   splitDate:()=>({}),withEpisodeDate:()=>({}),radioEditableFrame:()=>[],editableCaption:()=>[],
   persist:async patch=>{job={...job,...JSON.parse(JSON.stringify(patch))};events.push(['save',job.built[0]?.reframeState]);},
   script:async code=>{if(code.startsWith('BUILD')){builds++;events.push(['build']);return {draftId:'d',seconds:4};}if(code.startsWith('APPLY')){applies++;events.push(['apply']);if(fail)throw Error('apply failed');return {};}return null;},
   runTemplateReframing:async()=>{applies++;events.push(['apply']);if(fail)throw Error('agent failed');return {status:'complete'};},
   prepareCameraFraming:async()=>({cameraShots:[],cameraPanels:[]}),
   reframeClips:async clips=>{clips[0].reframe=[{start:0,end:9,cx:500,w:1000}];},
   guard:p=>p,loadDraftThumbnail:async()=>{thumbnails++;events.push(['thumbnail',job.built.map(d=>d?.progressStage)]);return {thumbnailPath:'thumb.jpg'};},store:{},sdk:{},
   mark:async stage=>{events.push(['mark',stage]);}};
  async function attempt(){const keys=Object.keys(env);return new Function(...keys,'job','return (async()=>{let resultWarning="";'+body+';return made;})();')(...Object.values(env),job);}
  await attempt();assert.equal(builds,1);assert.equal(job.built[0].draftId,'d');assert.equal(job.built[0].reframeState,'failed');assert.equal(job.done,false);assert.equal(thumbnails,0);
  assert.ok(events.findIndex(x=>x[0]==='save'&&x[1]==='pending')<events.findIndex(x=>x[0]==='apply'));
  fail=false;await attempt();assert.equal(builds,1);assert.equal(applies,2);assert.equal(job.built[0].reframeState,'done');assert.equal(job.done,true);assert.equal(thumbnails,1);
  // Headline-based templates must also run the selected AI framing on new Drafts.
  job={built:[]};env.tpl.renderer='separate-headlines';env.frameParams=()=>({});env.editableFrame=()=>[];env.SCRIPT_BUILD='BUILD const P: any = __P__;';
  await attempt();assert.equal(builds,2);assert.equal(applies,3);assert.equal(job.built[0].reframeState,'done');
  // Explicitly disabled framing remains disabled for either renderer.
  job={built:[]};env.tpl.layout.reframe=false;
  await attempt();assert.equal(builds,3);assert.equal(applies,3);assert.equal(job.built[0].reframeState,'skipped');
  env.tpl.layout.reframe=true;
  // All five must start before any can finish; no hidden two-worker cap.
  job={built:Array.from({length:5},(_,i)=>({draftId:'d'+i,reframeState:'pending'}))};
  pickd.clips=Array.from({length:5},(_,i)=>({name:'Clip '+i,segments:[[1,5]]}));
  const waiting=new Map();
  env.runTemplateReframing=(id,job,tpl,note)=>new Promise((resolve,reject)=>waiting.set(id,{resolve,reject,note}));
  const parallel=attempt();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(waiting.size,5);
  for (const i of [4,2,0,3,1]) {
    waiting.get('d'+i).note({plan:'reframe-usage',usage:{input_tokens:100+i,output_tokens:10}});
    if(i===2)waiting.get('d'+i).reject(Error('isolated failure'));
    else waiting.get('d'+i).resolve({status:'complete'});
  }
  await parallel;
  assert.deepEqual(job.built.map(d=>d.reframeState),['done','done','failed','done','done']);
  // Previews wait until every clip is editable, so they never delay another clip's framing.
  const shots=events.slice(events.findLastIndex(x=>x[0]==='mark'&&x[1]==='reframing-done')).filter(x=>x[0]==='thumbnail');
  assert.equal(shots.length,4);
  for(const [,stages] of shots)assert.deepEqual(stages,['done','done','failed','done','done']);
  assert.ok(job.built.every(d=>!d.previewPending));
  assert.deepEqual(job.built.map(d=>d.reframeUsageCalls[0].input_tokens),[100,101,102,103,104]);
  assert.equal(job.done,false);
  // Retrying one card must leave other failed cards untouched.
  job={built:job.built.map(d=>({...d,reframeState:'failed'}))};waiting.clear();env.onlyDraftId='d2';
  const single=attempt();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual([...waiting.keys()],['d2']);waiting.get('d2').resolve({status:'complete'});await single;
  assert.deepEqual(job.built.map(d=>d.reframeState),['failed','failed','done','failed','failed']);
  env.onlyDraftId=undefined;
  // Cancellation drains every worker before the batch rejects.
  job={built:job.built.map(d=>({...d,reframeState:'pending'}))};waiting.clear();
  const cancelled=attempt();void cancelled.catch(()=>{});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(waiting.size,5);
  for(const waiter of waiting.values())waiter.reject(new env.RunCancelled());
  await assert.rejects(cancelled,env.RunCancelled);
  // Framing off: every clip becomes a wide shot without any framing or analysis call.
  const framed=[],wide=[];let made=0;
  env.runTemplateReframing=async id=>{framed.push(id);return {status:'complete'};};
  env.script=async(code,label)=>{if(code.startsWith('BUILD'))return {draftId:'w'+(made++),seconds:4};if(label==='Place the full source as a wide shot'){wide.push(code);return {clips:1};}return null;};
  job={built:[],skipFraming:true};pickd.clips=[{name:'A',segments:[[1,5]]},{name:'B',segments:[[1,5]]}];
  await attempt();
  assert.deepEqual(framed,[]);assert.equal(wide.length,2);
  assert.match(wide[0],/selects\.draft\("w0"\)/);assert.match(wide[0],/backdrop:"blur"/);
  assert.deepEqual(job.built.map(d=>[d.reframeState,d.wide,d.progressStage]),[['skipped',true,'done'],['skipped',true,'done']]);
  assert.equal(job.done,true);
  // A resumed run neither rebuilds nor re-applies finished wide shots.
  await attempt();assert.equal(made,2);assert.equal(wide.length,2);
  // Framing the selected clips later replaces only their wide shots.
  env.onlyDraftId=['w1'];env.forceReframe=true;
  await attempt();
  assert.deepEqual(framed,['w1']);assert.equal(wide.length,2);
  assert.deepEqual(job.built.map(d=>[d.reframeState,d.wide]),[['skipped',true],['done',false]]);
  // A failed framing retry stays a framing retry rather than turning back into a wide shot.
  env.onlyDraftId=['w0'];env.runTemplateReframing=async()=>{throw Error('agent failed');};
  await attempt();assert.equal(job.built[0].reframeState,'failed');
  env.forceReframe=false;env.runTemplateReframing=async id=>{framed.push(id);return {status:'complete'};};
  await attempt();
  assert.deepEqual(framed,['w1','w0']);assert.equal(wide.length,2);assert.equal(job.built[0].reframeState,'done');
  env.onlyDraftId=undefined;
  // Deleted clips keep their index: resuming neither rebuilds nor re-files them, and the run still completes.
  const moves=[];env.moveRunDrafts=async(p,f,ids)=>{moves.push(ids);};
  job={...job,done:false,built:job.built.map((d,i)=>i===0?{...d,deleted:true}:{...d,reframeState:'pending'})};
  await attempt();
  assert.equal(made,2);assert.deepEqual(moves[0],[null,'w1']);assert.deepEqual(framed,['w1','w0','w1']);
  assert.equal(job.built[0].deleted,true);assert.equal(job.done,true);
  const listed=mod.exports.savedDraftResults([{...job,projectId:'p'}],'p');
  assert.equal(listed.length,1);
  assert.equal(mod.exports.savedDraftResults([{...job,projectId:'p',built:job.built.map(d=>({...d,deleted:true}))}],'p').length,0);

 });
 await t.test('generation saves the Draft before reframing and captures thumbnails afterwards',()=>{
  const build=src.indexOf('made[i] = { ...c, name, draftId: r?.draftId');
  const save=src.indexOf('await persist({ built: made, resultWarning });',build);
  const apply=src.indexOf('await runTemplateReframing(',save);
  const thumb=src.indexOf('const image = await guard(loadDraftThumbnail',apply);
  assert.ok(build>0&&save>build&&apply>save&&thumb>apply);
  assert.match(src,/reframeState !== "failed" && m.reframeState !== "pending"/);
 });
});
