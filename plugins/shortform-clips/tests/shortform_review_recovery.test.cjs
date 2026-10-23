'use strict';
// Recovery of runs reviewed before framing: interrupted wide shots, deleted clips and pending edits.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;

test('runs reviewed before framing recover from interruptions',{skip:!modules&&'Set SBS_PANEL_TEST_MODULES'},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {createReframeWork,templateBuildScript,captionLineMax,wideShotScript,savedDraftResults,latestSavedJob,throttledSave,PROGRESS_SAVE_MS,musicPath,musicImportScript,musicPlaceScript,MUSIC_MIN_TRACK_SECONDS};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const start=src.indexOf('      const made: any[] =');
 const body=esbuild.transformSync(src.slice(start,src.indexOf('      setStatus(S.done(',start)),{loader:'ts'}).code;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function harness(initial) {
  let saved=clone(initial),stopAfterBuild=false;
  const calls={wide:0,framing:[],moves:[],builds:0};
  const env={createReframeWork:mod.exports.createReframeWork,templateBuildScript:mod.exports.templateBuildScript,captionLineMax:mod.exports.captionLineMax,wideShotScript:mod.exports.wideShotScript,throttledSave:mod.exports.throttledSave,PROGRESS_SAVE_MS:mod.exports.PROGRESS_SAVE_MS,musicPath:mod.exports.musicPath,musicImportScript:mod.exports.musicImportScript,musicPlaceScript:mod.exports.musicPlaceScript,MUSIC_MIN_TRACK_SECONDS:mod.exports.MUSIC_MIN_TRACK_SECONDS,findRunDraftScript:()=>'LOOKUP',withoutRunSuffix:n=>n,
   ensureRunFolder:async()=>'run-folder',moveRunDrafts:async(p,f,ids)=>{calls.moves.push(ids);},
   forceReframe:false,onlyDraftId:undefined,token:{cancelled:false},pickd:{clips:[{name:'A',segments:[[1,5]]}]},
   tpl:{layout:{reframe:true},logo:{image:''},captions:{on:false},editing:{}},STACKED_REFRAME_EFFECT:'effect',projectId:'p',
   S:{building:()=>'',reframing:'framing'},lang:'en',transform:{scale:1},buildLogo:'',SCRIPT_BUILD:'BUILD const P: any = __P__;',SCRIPT_LIMIT:1e7,RunCancelled:class extends Error{},
   setStatus:()=>{},setSub:()=>{},setDrafts:()=>{},setWarn:()=>{},nameOf:()=>'',radioFrameParams:()=>({}),splitDate:()=>({}),withEpisodeDate:()=>({}),radioEditableFrame:()=>[],editableCaption:()=>[],
   persist:async patch=>{saved={...saved,...clone(patch)};},
   script:async(code,label)=>{if(code.startsWith('BUILD')){calls.builds++;return {draftId:'d0',seconds:4};}if(label==='Place the full source as a wide shot'){calls.wide++;return {clips:1};}return null;},
   // Framing is the only caller of speaker and face analysis.
   runTemplateReframing:async id=>{calls.framing.push(id);return {status:'complete'};},guard:p=>p,
   loadDraftThumbnail:async()=>({thumbnailPath:'thumb.jpg'}),store:{},sdk:{},
   mark:async stage=>{if(stopAfterBuild&&stage==='built'){stopAfterBuild=false;throw new env.RunCancelled('interrupted after the Draft was saved');}}
  };
  return {env,calls,read:()=>clone(saved),setSaved:x=>{saved=clone(x);},interruptAfterBuild:()=>{stopAfterBuild=true;},
   run:async(input=saved)=>new Function(...Object.keys(env),'job','return (async()=>{let resultWarning="";'+body+';return made;})();')(...Object.values(env),clone(input))};
 }
 const panelFunction=(name,next)=>{const a=src.indexOf('  async function '+name+'('),b=src.indexOf('\n  async function '+next+'(',a);return esbuild.transformSync(src.slice(a,b),{loader:'ts'}).code;};

 await t.test('Make clips starts with framing off',()=>{
  assert.match(src,/const \[framing,setFraming\]=React\.useState\(false\);/);
 });
 await t.test('a run interrupted between saving a Draft and placing its wide shot resumes the wide shot only',async()=>{
  const h=harness({id:'j',projectId:'p',built:[],skipFraming:true});
  h.interruptAfterBuild();await assert.rejects(h.run(),h.env.RunCancelled);
  const checkpoint=h.read().built[0];
  assert.equal(checkpoint.reframeState,'wide-pending');assert.notEqual(checkpoint.wide,true);
  await h.run();
  const clip=h.read().built[0];
  assert.equal(h.calls.builds,1);assert.equal(h.calls.wide,1);assert.deepEqual(h.calls.framing,[]);
  assert.equal(clip.reframeState,'skipped');assert.equal(clip.wide,true);assert.equal(h.read().done,true);
 });

 await t.test('a failed wide shot stays pending and retries without framing',async()=>{
  const h=harness({id:'j',projectId:'p',built:[],skipFraming:true});
  const ok=h.env.script;h.env.script=async(code,label)=>{if(label==='Place the full source as a wide shot')throw Error('effect rejected');return ok(code,label);};
  await h.run();
  let clip=h.read().built[0];
  assert.equal(clip.reframeState,'wide-pending');assert.match(clip.error,/effect rejected/);assert.equal(h.read().done,false);
  h.env.script=ok;h.env.onlyDraftId='d0';await h.run();
  clip=h.read().built[0];
  assert.equal(h.calls.wide,1);assert.deepEqual(h.calls.framing,[]);assert.equal(clip.reframeState,'skipped');assert.equal(clip.error,undefined);assert.equal(h.read().done,true);
 });

 await t.test('resuming an unfinished run uses the saved job, so deleted clips stay deleted',async()=>{
  const old={id:'j',projectId:'p',done:false,skipFraming:true,choice:{clips:[{name:'A',segments:[[1,5]]}]},built:[{draftId:'d0',name:'A',reframeState:'failed',error:'previous framing failure'}]};
  const h=harness(old);let jobs=[old],resultJobs=[old],error='';
  const deleteEnv={overlayLock:{current:false},busy:false,packLock:{current:false},setBusy:()=>{},setError:s=>{error=s;},lang:'en',projectId:'p',
   script:async(code,label)=>label==='Prepare deleted shorts folder'?{folderId:'deleted-folder'}:label==='Check shorts to delete'?['d0']:{moved:['d0'],skipped:[]},
   saveJob:async job=>h.setSaved(job),setJobs:fn=>{jobs=fn(jobs);},setResultJobs:fn=>{resultJobs=fn(resultJobs);},savedDraftResults:mod.exports.savedDraftResults};
  const remove=new Function(...Object.keys(deleteEnv),panelFunction('deleteResultClips','run')+';return deleteResultClips;')(...Object.values(deleteEnv));
  await remove(old,['d0']);
  assert.equal(error,'');assert.equal(h.read().built[0].deleted,true);
  // The Unfinished work list no longer holds the pre-deletion copy.
  assert.equal(jobs[0].built[0].deleted,true);
  // Even a stale copy resolves to the saved job when the run starts.
  const store={get:async(kind,id)=>kind==='jobs'&&id==='j'?h.read():null};
  const resumed=await mod.exports.latestSavedJob(store,old);
  assert.equal(resumed.built[0].deleted,true);
  await h.run(resumed);
  assert.equal(h.read().built[0].deleted,true);assert.deepEqual(h.calls.framing,[]);assert.equal(h.calls.builds,0);
  assert.deepEqual(h.calls.moves[0],[null]);
  assert.equal(await mod.exports.latestSavedJob({get:async()=>{throw Error('offline');}},old),old);
  const runStart=src.indexOf('  async function run(resume?:');
  assert.ok(src.indexOf('resume = await latestSavedJob(store, resume);',runStart)>runStart);
  assert.ok(src.indexOf('resume = await latestSavedJob(store, resume);',runStart)<src.indexOf('let job: any = resume ??',runStart));
 });

 await t.test('a deleted clip with an interrupted framing edit never blocks the remaining clips',async()=>{
  const runStart=src.indexOf('  async function run(resume?:'),brace=src.indexOf('{',runStart),prefixEnd=src.indexOf('    resultsRevision.current++;',brace);
  const prefix=esbuild.transformSync(src.slice(brace+1,prefixEnd),{loader:'ts'}).code;
  let message='';
  const env={overlayLock:{current:false},busy:false,packLock:{current:false},templateDirty:false,templateSaving:false,setTab:()=>{},setError:s=>{message=s;},projectId:'p',templates:[{}],mode:'project',url:'',pick:'source',S:{},K:{}};
  const check=new Function(...Object.keys(env),'resume','return (async()=>{'+prefix+';return "continued";})();');
  assert.equal(await check(...Object.values(env),{built:[{draftId:'removed',deleted:true,framingEditPending:{pendingIndex:0}},{draftId:'kept'}]}),'continued');
  assert.equal(message,'');
  assert.equal(await check(...Object.values(env),{built:[{draftId:'kept',framingEditPending:{pendingIndex:0}}]}),undefined);
  assert.match(message,/previous framing edit was interrupted/);
  // Deleting a clip also drops its pending edit from the saved record.
  const h=harness({id:'j',projectId:'p',built:[{draftId:'d0',framingEditPending:{pendingIndex:0}}]});
  const deleteEnv={overlayLock:{current:false},busy:false,packLock:{current:false},setBusy:()=>{},setError:()=>{},lang:'en',projectId:'p',
   script:async(code,label)=>label==='Prepare deleted shorts folder'?{folderId:'f'}:label==='Check shorts to delete'?[]:null,
   saveJob:async job=>h.setSaved(job),setJobs:()=>{},setResultJobs:()=>{},savedDraftResults:mod.exports.savedDraftResults};
  await new Function(...Object.keys(deleteEnv),panelFunction('deleteResultClips','run')+';return deleteResultClips;')(...Object.values(deleteEnv))(h.read(),['d0']);
  assert.equal(h.read().built[0].deleted,true);assert.equal(h.read().built[0].framingEditPending,null);
 });
});
