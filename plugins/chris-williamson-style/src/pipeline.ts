// Every Main file needs its real picture size to be reframed to 9:16; Selects does not always report one.
async function probeFrameSizes(env:Env,files:Record<string,any>){
  for(const f of Object.values(files||{}) as any[]){
    if(!f?.path||f.frameSize?.width)continue;
    try{const s=JSON.parse(await ffprobeRun(['-v','error','-select_streams','v:0','-show_entries','stream=width,height:stream_side_data=rotation','-of','json',f.path])).streams?.[0];
      const rot=Math.abs(Number(s?.side_data_list?.find((x:any)=>x.rotation!=null)?.rotation||0))%180;
      if(s?.width&&s?.height)f.frameSize=rot===90?{width:s.height,height:s.width}:{width:s.width,height:s.height};}catch{}
  }
}
// The background music, downloaded once into the data folder by the host and checked with its ffprobe.
async function fetchMusic(dir:string,musicPath:string){
  const fs=hostNeed("FileSystem","downloadFile");
  mkdirs(dir);
  let size=0;try{size=fs.existsSync?.(musicPath)?Number(fs.statSync?.(musicPath)?.size||0):0;}catch{size=0;}
  if(!size)try{await fs.downloadFile(MUSIC.url,musicPath);}catch{/* reported below */}
  if(!await hostProbeSeconds(musicPath)){await hostRemove(musicPath);throw new Error("The background music could not be downloaded; check the internet connection and try again.");}
}
const stateFile =(env:Env,id:string) => hostJoin(env.dataDir,"states",id.replace(/[^a-zA-Z0-9_-]/g,"")+".json");
async function readState(env:Env,id:string) {
  let text:string;
  try{text=await env.readText(stateFile(env,id));}catch(e:any){if(/ENOENT|not found|does not exist/i.test(String(e?.message||e)))return null;throw e;}
  const data=JSON.parse(text);if(data.version!==2 || !data.items)throw new Error("Unrecognised run record; refusing to overwrite existing edits.");return data;
}
// Mean luma (0-255) and saturation of the caption band of a cutaway over the keyword's own seconds, read with
// ffmpeg's signalstats, so the letter fill can be chosen from the picture instead of guessed. The values are printed
// to ffmpeg's log (no file paths inside the filter graph).
async function measureBand(env:Env,jobDir:string,path:string,seconds:number,tag:string):Promise<{y:number;sat:number}|null> {
  const vf="crop=iw*0.76:ih*0.135:iw*0.12:ih*0.4325,signalstats,metadata=print:key=lavfi.signalstats.YAVG,metadata=print:key=lavfi.signalstats.SATAVG";
  try {
    const log=(await ffmpegRun(["-nostdin","-v","info","-y","-t",Math.max(0.2,seconds).toFixed(2),"-i",path,"-vf",vf,"-f","null","-"])).stderr;
    const mean=(key:string)=>{const v=[...log.matchAll(new RegExp("lavfi\\.signalstats\\."+key+"=([0-9.]+)","g"))].map(m=>Number(m[1]));return v.length?v.reduce((a,b)=>a+b,0)/v.length:NaN;};
    const y=mean("YAVG"),sat=mean("SATAVG");
    return Number.isFinite(y)&&Number.isFinite(sat)?{y:Math.round(y),sat:Math.round(sat)}:null;
  } catch { return null; }
}
async function inventory(env:Env,id:string) {
  return await env.runScript(`const d=selects.draft(${JSON.stringify(id)});const clips=await d.clips({trackScope:'all'});const graphics=await d.motionGraphics();const effects=[];for(const c of clips)if(c.resourceId&&(c.trackKind==='main'||c.trackKind==='video'))for(const e of await d.videoEffects(c))effects.push({clipId:c.clipId,name:e.name});return {clips,graphics,effects};`,"Inspect existing edits");
}
export async function runPipeline(env: Env, projectId: string, sequenceId: string, options: Options) {
  const t0=Date.now(), report:any={warnings:[]};
  if(!env.imageData)throw new Error("Image inspection is unavailable in this Selects host.");
  env.status("Checking the Draft and previous edits…");
  setMeasuredEm(env.textMeasure?await env.textMeasure().catch(()=>null):null);
  const src=await readDraft(env,projectId,sequenceId),fps=src.fps,total=src.endFrame;
  await probeFrameSizes(env,src.files);
  const words:W[]=src.words, mains:MainClip[]=src.mains;
  if(words.filter(w=>!w.nonSpeech&&w.text.trim()).length<12)throw new Error("This Draft needs an analysed transcript with at least a few sentences.");
  if(!mains.length || mains.some(m=>!src.files[m.resourceId]?.path))throw new Error("The Main footage could not be located.");
  const signature=JSON.stringify({fps,total,words:words.map(w=>[w.text,w.startFrame,w.endFrame])});
  let state=await readState(env,sequenceId);
  let scope:UpdateScope=options.scope||"preserve";
  if(state?.signature!==signature && state && scope!=="all")throw new Error("The spoken edit changed. Choose Rebuild all on a copy so caption timing can be recalculated.");
  let existing=await inventory(env,sequenceId);
  if(state&&!state.pending){
    state=JSON.parse(JSON.stringify(state));const sourceIds=new Set(existing.clips.map((c:any)=>c.clipId));
    for(const item of Object.values(state.items) as any[])if(item.status==='applied'&&!sourceIds.has(item.clipId)) {
      const renamed=existing.graphics.find((g:any)=>g.name===item.label);const effect=existing.effects.find((e:any)=>e.name===item.label);
      if(renamed)item.clipId=renamed.clip.clipId;else if(effect)item.clipId=effect.clipId;else item.status='deleted';
    }
  }
  const legacy=existing.graphics.some((g:any)=>g.name===PREFIX+"Captions");
  if(legacy&&!state&&(scope==='preserve'||scope==='broll'))throw new Error("This is a legacy Chris Draft. Choose Replace captions or Rebuild all, preferably on a copy. The old combined caption cannot be separated while preserving unknown manual parameter edits.");
  mkdirs(hostJoin(env.dataDir,"states"));
  let draftId=sequenceId;
  if(options.copy && !state?.pending) {
    const name=String(src.name||"Draft").replace(SUFFIX,"")+SUFFIX;
    const r=await env.runScript(`const p=selects.project(${JSON.stringify(projectId)});const d=await p.duplicateDraft({sourceDraftId:${JSON.stringify(sequenceId)},name:${JSON.stringify(name)}});return await d.commitAll('Chris Williamson Style: copy');`,"Copy the Draft",true);
    draftId=r.createdDraftId;if(!draftId)throw new Error("The copied Draft was not saved.");
    existing=await inventory(env,draftId);
  }
  if(env.cleanLegacy)await env.cleanLegacy(projectId,draftId);
  if(options.copy && !state?.pending) {
    // A styled copy carries one style: effects and graphics another style plugin left on the source are removed.
    const stripped=await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});const __own="Chris Williamson · ";const __foreign=/^(Chris(?: Williamson)?|Mike Sunday|Jude Kinetic|Diary Of A CEO|20VC|Ali Abdaal)\\b/;const __stripped:string[]=[];for(const c of await d.clips({trackScope:'all'})){if(c.trackKind!=='main'&&c.trackKind!=='video')continue;for(;;){const cur=(await d.clips({trackScope:'all'})).find((x:any)=>x.clipId===c.clipId);if(!cur)break;const f=(await d.videoEffects(cur)).find((e:any)=>__foreign.test(String(e.name))&&!String(e.name).startsWith(__own));if(!f)break;await d.removeVideoEffect(f);__stripped.push(String(f.name));}}const __mgs=(await d.motionGraphics()).filter((g:any)=>__foreign.test(String(g.name))&&!String(g.name).startsWith(__own));if(__mgs.length){await d.removeClips(__mgs.map((g:any)=>g.clip));for(const g of __mgs)__stripped.push(String(g.name));}await d.commitAll('Chris Williamson Style: remove other styles')${COMMIT_OK};return __stripped;`,"Remove other style plugins from the copy",true);
    if(stripped?.length){report.warnings.push("Removed effects left by other style plugins on the copy: "+Array.from(new Set(stripped)).join(", ")+".");existing=await inventory(env,draftId);}
  }
  options.onDraft?.(draftId);report.draftId=draftId;
  const idSet=new Set(existing.clips.map((c:any)=>c.clipId));
  if(state) {
    // Copies retain clip identities. Refuse to guess if a host changes that contract.
    if(options.copy && Object.values(state.items).some((i:any)=>i.status==='applied'&&!idSet.has(i.clipId))) {
      throw new Error("Copied clip identities changed. The copy was kept; inspect it before rebuilding.");
    }
    state=JSON.parse(JSON.stringify(state));
  }
  const newRun=!state || !state.pending;
  const job=String(draftId).slice(0,8)+"-"+Date.now().toString(36);
  const jobDir=newRun?hostJoin(env.dataDir,"runs",job):state.jobDir;
  const mediaFolder=newRun?"Chris Williamson Style "+job:state.mediaFolder;
  mkdirs(hostJoin(jobDir,mediaFolder));
  state=state||{version:2,items:{},keys:null};
  if(!newRun)scope=state.scope;
  state={...state,draftId,projectId,signature,jobDir,mediaFolder,pending:true,scope};
  const save=async()=>{await env.writeText(stateFile(env,draftId),JSON.stringify(state,null,2));};
  if(newRun) {
    state.completed=[];state.removed=false;state.assetsReady=false;delete state.keywordCarry;
    // Preserve deliberate deletion as well as edits/moves/renames on a completed run.
    for(const item of Object.values(state.items) as any[])if(item.status==='applied'&&!idSet.has(item.clipId))item.status='deleted';
  }
  await save();
  // mac-only:start
  const engine=async(cmd:string,file:string,summary:string,timeoutMs:number)=>env.runShell(q(await env.node())+" "+q(env.pluginDir+"/engine.mjs")+" "+cmd+" "+q(file),summary,timeoutMs);
  // mac-only:end
  // Replanning is explicit. Captions-only and B-roll-only updates retain the established keyword slots.
  if(!state.keys || scope==='all' && !state.completed.includes('plan')) {
    env.status("Planning keywords…");
    let plan=options.planOverride;
    if(!plan)plan=parseJsonLoose(await env.askAI(planPrompt(words,fps,total,options.instructions||""),240000));
    const keys=keysFromPlan(plan,words,fps);
    if(!keys.length)throw new Error("No valid keyword plan was returned.");
    state.keys=keys;state.plan=plan;state.completed.push('plan');await save();
  }
  const keys:Key[]=state.keys;
  const pulses:any[]=[];state.pulses=[];
  const reel=planReel(keys,fps,total);
  const needsAssets=(!state.assets && scope!=='captions')||scope==='all'||scope==='broll';
  if(needsAssets&&!state.assetsReady) {
    const firstWarnings:string[]=[];
    const freshAssets=await chooseAssets(env,jobDir,mediaFolder,reel,fps,projectId,options,firstWarnings);
    // Cutaways must stay evenly spread: every keyword whose picture was not found gets one more search with the
    // planner's broader query (or the keyword itself), so gaps are not left wherever the first search failed.
    const missing=reel.brolls.filter(b=>!freshAssets.some((a:any)=>a.keyStart===b.key.start));
    if(missing.length&&!options.searchOverride) {
      env.status(`Searching again for ${missing.length} missing B-roll…`);
      const again=missing.map(b=>({...b,query:b.key.alt&&b.key.alt!==b.query?b.key.alt:b.key.text.replace(/[^\p{L}\p{N}' -]/gu,"").trim()}));
      const retryWarnings:string[]=[];
      freshAssets.push(...await chooseAssets(env,jobDir,mediaFolder,{brolls:again},fps,projectId,options,retryWarnings,"r"));
      const filled=missing.filter(b=>freshAssets.some((a:any)=>a.keyStart===b.key.start)).map(b=>b.query);
      report.warnings.push(...firstWarnings.filter(w=>!filled.some(query=>w.includes("“"+query+"”"))),...retryWarnings);
    } else report.warnings.push(...firstWarnings);
    state.replaceBrollStarts=freshAssets.map((a:any)=>a.keyStart);
    state.assets=scope==='broll'?[...(state.assets||[]).filter((a:any)=>!state.replaceBrollStarts.includes(a.keyStart)),...freshAssets]:freshAssets;
    if(scope==='broll')report.warnings=report.warnings.map((w:string)=>w.replace('kept the speaker.','kept the existing cutaway when available.'));
    state.assetsReady=true;state.assetWarnings=report.warnings.slice();await save();
  }
  report.warnings.push(...(state.assetWarnings||[]).filter((w:string)=>!report.warnings.includes(w)));
  const assets:any[]=state.assets||[];
  // Import and file only when new assets exist. Project writes are separate from Draft commits.
  if(needsAssets&&assets.some(a=>a.path.startsWith(jobDir+'/'))&&!state.completed.includes('import')) {
    const imported=await env.runScript(`const p=selects.project(${JSON.stringify(projectId)});return await p.sourceFiles();`,"Check imported run media");
    if(!JSON.stringify(imported).includes(jobDir+"/"+mediaFolder))await env.runScript(`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:[${JSON.stringify(jobDir+"/"+mediaFolder)}]});`,"Import verified B-roll",true);
    await env.runScript(`const p=selects.project(${JSON.stringify(projectId)});const f=await p.readFootage();const media=f.folders.find(x=>x.name===${JSON.stringify(mediaFolder)});let home=f.folders.find(x=>x.name==='Chris'&&!String(x.path).includes('/'));const id=home?home.folderId:(await p.createFolder({name:'Chris'})).folderId;if(media&&!String(media.path).startsWith('Chris/'))await p.moveToFolder({targetFolderId:id,folderIds:[media.folderId]});return true;`,"File verified media under Chris",true);
    state.completed.push('import');await save();
  }
  // Refresh the video inside a separate keyword without losing edited text/style.
  // Unsupported custom visual edits stop this replacement before any clip is removed.
  if(scope==='broll'&&!state.removed&&!state.keywordCarry) {
    const linked=Object.entries(state.items).filter(([id,item]:any)=>item.resourceKeyword&&item.status==='applied'&&(state.replaceBrollStarts||[]).some((start:number)=>id==='keyword:'+start));
    state.keywordCarry={};
    if(linked.length){
      if(!env.readCore)throw Error('This host cannot preserve edited footage keywords during B-roll replacement.');
      const core=await env.readCore(draftId);const cues=captionCues(words,keys,fps,total);
      for(const [id,item] of linked as any[]){const cue=cues.find(c=>c.id===id)!;const row=existing.clips.find((c:any)=>c.clipId===item.clipId);if(!row||row.startFrame!==cue.start||row.endFrame!==cue.end)throw Error('This footage keyword was moved or trimmed; keep its edits, or replace captions explicitly before replacing B-roll.');state.keywordCarry[id]=readKeywordCarry(core,item,cue);}
    }
    await save();
  }
  if(!state.removed) {
    const chosenIds=new Set<number>();
    if(scope==='broll')for(const id of Object.keys(state.keywordCarry||{})){const item=state.items[id];if(item){chosenIds.add(item.clipId);delete state.items[id];}}

    for(const [id,item] of Object.entries(state.items) as any[])if(shouldReplace(item.category,scope)&&!(scope==='broll'&&item.category==='broll'&&!(state.replaceBrollStarts||[]).some((start:number)=>id==='broll:'+start))){chosenIds.add(item.clipId);delete state.items[id];}
    // Legacy cleanup happens only under an explicit replacement selection, never on Preserve.
    for(const g of existing.graphics)if(shouldReplace(categoryOf(g.name)||'',scope))chosenIds.add(g.clip.clipId);
    if(scope==='all'||scope==='broll')for(const e of existing.effects)if(e.name===PREFIX+'B-roll')chosenIds.add(e.clipId);
    if(chosenIds.size)await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});const ids=new Set(${JSON.stringify([...chosenIds])});const clips=(await d.clips({trackScope:'all'})).filter(c=>ids.has(c.clipId)&&c.trackKind!=='main');if(clips.length){await d.removeClips(clips);await d.commitAll('Chris Williamson Style: replace selected elements');}return true;`,"Replace selected style elements",true);
    if(scope==='all')await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});let removed=0;for(let n=0;n<500;n++){let target;for(const c of await d.clips({trackScope:'main'})){target=(await d.videoEffects(c)).find(e=>e.name===${JSON.stringify(PREFIX+'Look')});if(target)break;}if(!target)break;await d.removeVideoEffect(target);removed++;}if(removed)await d.commitAll('Chris Williamson Style: replace look');return true;`,"Replace previous look",true);
    state.removed=true;await save();
  }
  state.lookApplied=state.lookApplied||existing.effects.some((e:any)=>e.name===PREFIX+'Look');
  const doLook=(scope==='all'||!state.lookApplied)&&!state.completed.includes('look');
  if(doLook) {
    // Main-only splitting is not exposed by this SDK. Never razor unrelated overlays.
    const hasOverlays=existing.clips.some((c:any)=>c.trackKind==='video'||c.trackKind==='audio')||existing.graphics.length>0;
    if(!hasOverlays && !state.completed.includes('shots')) {
      const shotsFile=hostJoin(jobDir,'shots.json');
      await env.writeText(shotsFile,JSON.stringify({shots:{ffmpeg:env.ffmpeg,threshold:0.3,ranges:mains.filter(m=>m.sourceStartSeconds!=null).map((m,i)=>({key:String(i),path:src.files[m.resourceId].path,startSeconds:m.sourceStartSeconds,seconds:(m.endFrame-m.startFrame)/fps}))}}));
      await engine('shots',shotsFile,'Find source camera changes',240000);
      const cuts=JSON.parse(await env.readText(hostJoin(jobDir,'shots-result.json'))).cuts;
      const splitFrames=mains.flatMap((m,i)=>(cuts[String(i)]||[]).map((t:number)=>m.startFrame+Math.round(t*fps))).filter((f:number)=>f>0&&f<total);
      if(splitFrames.length)await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});const starts=new Set((await d.clips({trackScope:'main'})).map(c=>c.startFrame));for(const f of ${JSON.stringify(splitFrames)})if(!starts.has(f))await d.splitAt({frame:f});await d.commitAll('Chris Williamson Style: measured camera cuts')${COMMIT_OK};return true;`,"Split measured camera changes",true);
      state.completed.push('shots');await save();
    }
    const freshDraft=await readDraft(env,projectId,draftId);mains.splice(0,mains.length,...freshDraft.mains);
    const faceFile=hostJoin(jobDir,'faces.json');
    const samples=mains.flatMap((m,i)=>m.sourceStartSeconds==null?[]:[0.25,0.5,0.75].map(f=>({key:i+':'+f,path:src.files[m.resourceId].path,seconds:m.sourceStartSeconds!+(m.endFrame-m.startFrame)/fps*f})));
    await env.writeText(faceFile,JSON.stringify({ffmpeg:env.ffmpeg,faces:{samples}}));
    await engine('faces',faceFile,'Measure framing',240000);
    const faces=JSON.parse(await env.readText(hostJoin(jobDir,'faces-result.json'))).detected||{};
    // Every Main clip is reframed to 9:16; a clip with no measured face is covered from a centred default.
    const framed=mains.map((m,i)=>{const ff=[0.25,0.5,0.75].map(f=>faces[i+':'+f]).filter(r=>r?.faces?.length);const face=ff.length?[0,1,2,3].map(k=>median(ff.map(r=>r.faces[0][k]))):[0.25,0.2,0.5,0.3];const probe=Object.keys(faces).filter(k=>k.startsWith(i+':')).map(k=>faces[k]).find(r=>r?.w);const size=src.files[m.resourceId].frameSize||(probe?{width:probe.w,height:probe.h}:null);if(!size)return null;return {start:m.startFrame,t:headFraming(face,size.width,size.height,ff.length&&i%2?STYLE.head.tight:1),zoomIn:i%2===0};}).filter(Boolean);
    if(framed.length<mains.length)report.warnings.push(`${mains.length-framed.length} clip(s) were not reframed: their source size could not be read.`);
    if(mains.some((m,i)=>![0.25,0.5,0.75].some(f=>faces[i+':'+f]?.faces?.length)))report.warnings.push('Some clips had no measured face; they are centre-cropped to 9:16.');
    if(hasOverlays)report.warnings.push('Existing overlay edits were preserved; no global razor operation was used.');
    // One bounded commit per batch; re-read ClipInfo after every edit.
    for(let k=0;k<framed.length;k+=10)await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});await d.setFrameSize({width:1080,height:1920});for(const p of ${JSON.stringify(framed.slice(k,k+10))}){let c=(await d.clips({trackScope:'main'})).find(c=>c.startFrame===p.start);if(!c)throw Error('Main clip changed during styling');if((await d.videoEffects(c)).some(e=>e.name===${JSON.stringify(PREFIX+'Look')}))continue;await d.setClipTransform({clip:c,scale:{x:p.t.scale,y:p.t.scale},position:{x:p.t.x,y:p.t.y}});c=(await d.clips({trackScope:'main'})).find(c=>c.startFrame===p.start)!;await d.addVideoEffect({clip:c,label:${JSON.stringify(PREFIX+'Look')},tsxCode:${JSON.stringify(LOOK_TSX)},parameters:{fps:${fps},clipStart:0,clipFrames:c.endFrame-c.startFrame,zoom:0.06,zoomIn:p.zoomIn,faceX:p.t.faceX,faceY:p.t.faceY,warmth:1,vignette:0.55,grain:0.12,contrast:1.12},editableParameters:${JSON.stringify(LOOK_PARAMS)}});}await d.commitAll('Chris Williamson Style: measured framing')${COMMIT_OK};return true;`,"Apply measured framing",true);
    state.lookApplied=true;state.completed.push('look');await save();
  }
  await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});const m=await d.meta();if(m.frameSize.width!==1080||m.frameSize.height!==1920){await d.setFrameSize({width:1080,height:1920});await d.commitAll('Chris Williamson Style: vertical frame');}return true;`,"Check vertical frame",true);
  const putGraphic=async(id:string,category:string,a:number,b:number,label:string,tsxCode:string,parameters:any,defs:any[])=>{
    const prev=state.items[id];if(prev && prev.status!=='pending')return;
    env.status('Saving '+label+'…');
    state.items[id]={category,status:'pending'};await save();
    const made=await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});const found=(await d.motionGraphics()).find(g=>g.name===${JSON.stringify(label)});if(found)return {clipId:found.clip.clipId};const made=await d.addMotionGraphic({within:await d.rangeAtFrames(${a},${b}),label:${JSON.stringify(label)},tsxCode:${JSON.stringify(tsxCode)},parameters:${JSON.stringify(parameters)},editableParameters:${JSON.stringify(defs)}});await d.commitAll('Chris Williamson Style: editable element');return {clipId:made.clipId};`,"Add "+label,true);
    state.items[id]={category,status:'applied',clipId:made.clipId,label};await save();
  };
  // Place only a verified asset. Existing clips and deliberate deletions survive Preserve.
  for(const b of reel.brolls) {
    const id='broll:'+b.key.start,old=state.items[id];if(old&&old.status!=='pending')continue;
    const asset=assets.find(a=>a.keyStart===b.key.start);if(!asset)continue;
    const label=cueLabel(id,b.query);
    state.items[id]={category:'broll',status:'pending'};await save();
    const made=await env.runScript(`const S:any=selects;const project=selects.project(${JSON.stringify(projectId)});const d=selects.draft(${JSON.stringify(draftId)});${RESOLVE_PATHS}
const clips=await d.clips({trackScope:'all'});let found;for(const c of clips)if(c.trackKind==='video'&&c.resourceId&&(await d.videoEffects(c)).some(e=>e.name===${JSON.stringify(label)})){found=c;break;}
if(found)return {clipId:found.clipId};const resource=idByPath[${JSON.stringify(asset.path)}];if(!resource)throw Error('Verified media is not imported');const before=new Set(clips.map(c=>c.clipId));await d.overlayResource({resource:project.resource(resource),over:await d.rangeAtFrames(${b.start},${b.end})});let fresh=(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId));const audio=fresh.filter(c=>c.trackKind==='audio');if(audio.length)await d.removeClips(audio);const c=(await d.clips({trackScope:'all'})).find(c=>!before.has(c.clipId)&&c.trackKind==='video')!;await d.addVideoEffect({clip:c,label:${JSON.stringify(label)},tsxCode:${JSON.stringify(BROLL_TSX)},parameters:{clipStart:0,clipFrames:c.endFrame-c.startFrame,zoom:${asset.kind==='video'?0:0.12},zoomIn:true,originX:50,originY:50,warmth:0.8,vignette:0.5,keyText:''},editableParameters:${JSON.stringify(BROLL_PARAMS.filter(p=>!['keyText','fontFamily','keywordSize','captionY','fillBlur','fillWhite'].includes(p.key)))}});await d.commitAll('Chris Williamson Style: verified B-roll');return {clipId:c.clipId};`,"Place verified B-roll",true);
    state.items[id]={category:'broll',status:'applied',clipId:made.clipId,label};await save();
  }
  // Background music under the speech: one shared file in the plugin data folder, imported once, placed
  // across the whole Draft at a low level with fades. Kept on Preserve; replaced on Rebuild all.
  if(options.music!==false && !(state.items['music']&&state.items['music'].status!=='pending')) {
    env.status('Adding the background music…');
    const musicPath=hostJoin(env.dataDir,'music',MUSIC.file);
    await fetchMusic(hostJoin(env.dataDir,'music'),musicPath);
    const label=PREFIX+MUSIC.title+' [cws:music]';
    const level=Math.max(-40,Math.min(0,Number(options.musicDb??MUSIC.levelDb)));
    state.items['music']={category:'music',status:'pending'};await save();
    const made=await env.runScript(`const project=selects.project(${JSON.stringify(projectId)});const d=selects.draft(${JSON.stringify(draftId)});${RESOLVE_PATHS}
let rid=idByPath[${JSON.stringify(musicPath)}];
if(!rid){await project.importFiles({paths:[${JSON.stringify(musicPath)}]});const tree:any=await project.sourceFiles();const walk=(ns:any[])=>{for(const n of ns||[]){if(n.type==='dir')walk(n.children);else if(n.path===${JSON.stringify(musicPath)})rid=n.resourceId;}};if(tree.fileTree)walk(tree.fileTree);else for(const f of tree.folders||[])walk(((await project.sourceFiles({folder:String(f.name)})) as any).fileTree);
  const foot=await project.readFootage();let home=foot.folders.find((x:any)=>x.name==='Chris'&&!String(x.path).includes('/'));const id=home?home.folderId:(await project.createFolder({name:'Chris'})).folderId;if(rid)await project.moveToFolder({targetFolderId:id,resourceIds:[rid]});}
if(!rid)throw Error('The background music could not be imported.');return {rid};`,'Import the background music',true);
    const placed=await env.runScript(`const project=selects.project(${JSON.stringify(projectId)});const d=selects.draft(${JSON.stringify(draftId)});
const clips=await d.clips({trackScope:'all'});const end=clips.filter(c=>c.trackKind==='main').reduce((a,c)=>Math.max(a,c.endFrame),0);
const before=new Set(clips.map(c=>c.clipId));await d.overlayResource({resource:project.resource(${JSON.stringify(made.rid)}),over:await d.rangeAtFrames(0,end),sourceStartSeconds:${MUSIC.startSeconds}});
const fresh=(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId));const video=fresh.filter(c=>c.trackKind==='video');if(video.length)await d.removeClips(video);
const audio=(await d.clips({trackScope:'all'})).find(c=>!before.has(c.clipId)&&c.trackKind==='audio');if(!audio)throw Error('The music clip was not placed.');
await d.setClipAudio({clip:audio,volumeDb:${level},fadeInSeconds:${MUSIC.fadeInSeconds},fadeOutSeconds:${MUSIC.fadeOutSeconds}});
await d.commitAll('Chris Williamson Style: background music');return {clipId:audio.clipId};`,'Place the background music',true);
    state.items['music']={category:'music',status:'applied',clipId:placed.clipId,label,levelDb:level};await save();
    report.music={title:MUSIC.title,artist:MUSIC.artist,license:MUSIC.license,credit:MUSIC.credit,levelDb:level};
  }
  const fontCss=await env.readText(hostJoin(env.pluginDir,'fonts','font.css'));
  const cues=captionCues(words,keys,fps,total);state.cues=cues;
  // A keyword shrunk by the fit check below keeps its new size on a resumed run.
  const sizeOf=(cue:Cue)=>state.keywordSizes?.[cue.id]??cue.key?.size??keywordSize(cue.text);
  const placeCue=async(cue:Cue)=>{
    const b=state.items['broll:'+cue.start];
    const asset=assets.find(a=>a.keyStart===cue.start);
    if(cue.kind==='keyword'&&b?.status==='applied'&&asset) {
      const old=state.items[cue.id];if(old&&old.status!=='pending')return;
      const label=cueLabel(cue.id,cue.text);
      const band=await measureBand(env,jobDir,asset.path,(cue.end-cue.start)/fps,cue.id);
      const fill=keywordFill(band);
      if(fill.fillBrightness)report.warnings.push(`“${cue.text}”: light neutral footage under the line (luma ${band!.y}); the inverted fill was darkened.`);
      state.items[cue.id]={category:'captions',status:'pending'};await save();
      const made=await env.runScript(`const project=selects.project(${JSON.stringify(projectId)});const d=selects.draft(${JSON.stringify(draftId)});${RESOLVE_PATHS}
const clips=await d.clips({trackScope:'all'});for(const c of clips)if(c.trackKind==='video'&&c.resourceId&&(await d.videoEffects(c)).some(e=>e.name===${JSON.stringify(label)}))return {clipId:c.clipId};
const resource=idByPath[${JSON.stringify(asset.path)}];if(!resource)throw Error('Keyword media is not imported');const before=new Set(clips.map(c=>c.clipId));await d.overlayResource({resource:project.resource(resource),over:await d.rangeAtFrames(${cue.start},${cue.end})});const aud=(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId)&&c.trackKind==='audio');if(aud.length)await d.removeClips(aud);const c=(await d.clips({trackScope:'all'})).find(c=>!before.has(c.clipId)&&c.trackKind==='video')!;
await d.addVideoEffect({clip:c,label:${JSON.stringify(label)},tsxCode:${JSON.stringify(BROLL_TSX)},parameters:${JSON.stringify({keywordOnly:true,text:cue.text,keyStart:0,keyEnd:cue.end-cue.start,clipFrames:(reel.brolls.find(b=>b.start===cue.start)?.end||cue.end)-cue.start,zoom:asset.kind==='video'?0:0.12,zoomIn:true,originX:50,originY:50,warmth:0.8,fontCss,fontFamily:'Chris Reference Inter',fontWeight:'800',fontSize:sizeOf(cue),captionY:50,fillBlur:10,...fill,...(state.keywordCarry?.[cue.id]||{})})},editableParameters:${JSON.stringify(FOOTAGE_KEYWORD_PARAMS)}});await d.commitAll('Chris Williamson Style: editable footage keyword');return {clipId:c.clipId};`, 'Add editable footage keyword',true);
      state.items[cue.id]={category:'captions',status:'applied',clipId:made.clipId,label,resourceKeyword:true,band,fill};await save();return;
    }
    await putGraphic(cue.id,'captions',cue.start,cue.end,cueLabel(cue.id,cue.text),CAPTIONS_TSX,{cueId:cue.id,text:cue.text,keyword:cue.kind==='keyword',wordStartsSeconds:cue.wordStartsSeconds,revealStartSeconds:cue.wordStartsSeconds[0]||0,revealSpanSeconds:(cue.wordStartsSeconds.at(-1)||0)-(cue.wordStartsSeconds[0]||0),fontCss,fontFamily:'Chris Reference Inter',fontWeight:'800',fontSize:cue.kind==='keyword'?sizeOf(cue):STYLE.captions.phrase,captionY:STYLE.captions.line,trackingEm:-0.03,color:'#ffffff',dimSeconds:0.1,dimOpacity:0.55},CAPTION_V2_PARAMS);
  
  };
  for(const cue of cues)await placeCue(cue);
  // Fit check: every big keyword is rendered and looked at. One cut off by the frame edge is removed, set 15 % smaller
  // and placed again, for at most two rounds. Measured widths make this rare; the check catches what they miss.
  if(env.capture)for(let round=0;round<2;round++) {
    const kws=cues.filter(c=>c.kind==='keyword'&&state.items[c.id]?.status==='applied');
    const clipped:Cue[]=[];
    try {
      for(let k=0;k<kws.length;k+=6) {
        const part=kws.slice(k,k+6);
        env.status(`Checking that keywords fit ${k+1}–${k+part.length} / ${kws.length}…`);
        const images=await env.capture(draftId,part.map(c=>Math.min(c.end-1,c.start+Math.round(0.2*fps))));
        const verdict=parseJsonLoose(await env.askAI(`Only inspect the supplied image. Do not use tools, edit anything, or ask questions. It is a contact sheet of ${part.length} frames of a vertical video in reading order (left to right, then top to bottom), numbered 1-${part.length}. Each shows one big keyword: ${JSON.stringify(part.map((c,i)=>[i+1,c.text]))}. For each frame decide whether any letter of that keyword is cut off by the left or right edge of the frame or runs outside it. Return only {"clipped":[frame numbers]}.`,120000,images));
        for(const n of Array.isArray(verdict?.clipped)?verdict.clipped:[])if(part[Number(n)-1])clipped.push(part[Number(n)-1]);
      }
    } catch(e:any) {report.warnings.push('Keyword fit check could not finish: '+String(e?.message||e).slice(0,120));break;}
    if(!clipped.length)break;
    for(const cue of clipped) {
      const label=state.items[cue.id].label,size=Math.max(40,Math.round(sizeOf(cue)*0.85));
      env.status(`“${cue.text}” runs past the frame edge; setting it at ${size}px…`);
      await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});const label=${JSON.stringify(label)};const g=(await d.motionGraphics()).find(g=>g.name===label);let clips=g?[g.clip]:[];if(!g)for(const c of await d.clips({trackScope:'all'}))if(c.trackKind==='video'&&c.resourceId&&(await d.videoEffects(c)).some(e=>e.name===label)){clips=[c];break;}if(clips.length){await d.removeClips(clips);await d.commitAll('Chris Williamson Style: resize a keyword');}return clips.length;`,"Remove a keyword that ran past the frame",true);
      state.keywordSizes={...(state.keywordSizes||{}),[cue.id]:size};delete state.items[cue.id];await save();
      await placeCue(cue);
    }
    report.warnings.push(`Keywords that ran past the frame edge were set smaller: ${clipped.map(c=>'“'+c.text+'”').join(', ')}.`);
  }
  state.inversionOwners=[];
  const after=await inventory(env,draftId);
  for(const item of Object.values(state.items) as any[])if(item.status==='applied'){
    const g=after.graphics.find((g:any)=>g.name===item.label),e=after.effects.find((e:any)=>e.name===item.label);if(g)item.clipId=g.clip.clipId;else if(e)item.clipId=e.clipId;
  }
  await save();
  report.verification=await verifyDraft(env,projectId,draftId,state);
  if(report.verification.visual.status==='failed')report.warnings.push(...report.verification.visual.issues);
  if(report.verification.visual.status==='unverified')report.warnings.push('Visual review needs attention: '+report.verification.visual.reason);
  state.pending=false;state.verification=report.verification;await save();
  const inv=await inventory(env,draftId);
  report.counts={keywords:keys.length,brolls:Object.values(state.items).filter((i:any)=>i.category==='broll'&&i.status==='applied').length,captions:Object.values(state.items).filter((i:any)=>i.category==='captions'&&i.status==='applied').length,shots:mains.length,inversions:pulses.length};
  // The longest stretch that stays on the speaker between cutaways, as a check on the spread.
  const shown=reel.brolls.filter(b=>state.items['broll:'+b.key.start]?.status==='applied').map(b=>[b.start,b.end]).sort((a,b)=>a[0]-b[0]);
  let longest=0,at=0;for(const [a,b] of [...shown,[total,total]]){longest=Math.max(longest,a-at);at=Math.max(at,b);}
  report.counts.longestSpeakerSeconds=Math.round(longest/fps*10)/10;
  if(longest/fps>8)report.warnings.push(`The speaker stays on screen for ${report.counts.longestSpeakerSeconds} s without B-roll at one point; no usable picture was found there.`);
  report.seconds=Math.round((Date.now()-t0)/1000);report.jobDir=jobDir;report.name=src.name;
  await env.writeText(hostJoin(jobDir,'report.json'),JSON.stringify(report,null,2));return report;
}
