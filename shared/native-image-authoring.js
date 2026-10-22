// Bind one authoring mutation to its requested occurrence. Existing rows may
// not move or change identity; SDK array order is never a placement identity.
function bindMediaPlacement(before,rows,wanted) {
 const fail=()=>{throw Error('The media placement differs from its requested interval or source.');};
 const valid=list=>Array.isArray(list)&&list.length<=1024&&list.every(row=>row&&Number.isSafeInteger(row.clipId)&&row.clipId>=0&&typeof row.trackId==='string'&&row.trackId)&&new Set(list.map(row=>row.clipId)).size===list.length;
 if(!valid(before)||!valid(rows)||!wanted||typeof wanted.resourceId!=='string'||!wanted.resourceId)fail();
 const keys=['trackId','trackKind','resourceId','startFrame','endFrame'],ids=new Set(before.map(row=>row.clipId)),added=rows.filter(row=>!ids.has(row.clipId));
 if(rows.length!==before.length+1||added.length!==1||before.some(old=>{const current=rows.find(row=>row.clipId===old.clipId);return !current||keys.some(key=>current[key]!==old[key]);}))fail();
 const row=added[0];if(!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame)fail();
 for(const key of ['resourceId','trackKind','startFrame','endFrame'])if(wanted[key]!==undefined&&row[key]!==wanted[key])fail();
 return row;
}
// Prepare editable Image occurrences in one working copy. The caller owns its
// trusted Project/Draft handle and the sole final commit.
async function placeWorkingCopyImages(selects,projectId,draft,plan,sources,items,sourceFacts,bindPlacement){
 const project=selects.project(projectId),meta=await draft.meta();
 if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize.width!==plan.canvas.width||meta.frameSize.height!==plan.canvas.height)throw Error('The Draft frame grid differs from the plan.');
 const fresh=await sourceFacts(selects,projectId,sources);
 if(fresh.length!==sources.length||fresh.some((source,index)=>source.resourceId!==sources[index].resourceId||source.width!==sources[index].width||source.height!==sources[index].height))throw Error('A selected Image changed. Prepare the Images again.');
 const placements=[];
 for(const item of items){
  const source=fresh[item.source];if(!source)throw Error('An Image occurrence has no source.');
  const before=await draft.clips({trackScope:'all'});
  await draft.overlayResource({resource:project.resource(source.resourceId),over:await draft.rangeAtFrames(item.startFrame,item.endFrame)});
  const added=bindPlacement(before,await draft.clips({trackScope:'all'}),{resourceId:source.resourceId,trackKind:'video',startFrame:item.startFrame,endFrame:item.endFrame});
  placements.push({...item,clipId:added.clipId,trackId:added.trackId,resourceId:source.resourceId});
 }
 if((await draft.meta()).durationFrames!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
 return {placements,photos:fresh.map(source=>({width:source.width,height:source.height}))};
}
async function inspectImageGraphics(draft,expected){
 if(!('motionGraphics' in draft)||!('motionGraphicProgram' in draft))throw Error('Update Selects to verify editable graphics.');
 const same=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&same(a[key],b[key]));
 };
 const graphics=await draft.motionGraphics();
 if(!Array.isArray(graphics)||graphics.length!==expected.length)throw Error('Graphic count could not be confirmed.');
 for(const wanted of expected){
  const actual=graphics.find(g=>g.clip.clipId===wanted.clipId&&g.clip.trackId===wanted.trackId)?.clip;
  if(!actual||actual.startFrame!==wanted.startFrame||actual.endFrame!==wanted.endFrame)throw Error('Graphic placement could not be confirmed.');
  const program=await draft.motionGraphicProgram(actual);
  if(!program||!program.parameters||typeof program.parameters!=='object'||Array.isArray(program.parameters)||!Object.entries(wanted.parameters).every(([key,value])=>Object.prototype.hasOwnProperty.call(program.parameters,key)&&same(program.parameters[key],value)))throw Error('Graphic parameters could not be confirmed.');
 }
}
async function inspectImageTransforms(draft,expected,includeMain=false){
 // Both consumers author fixed intrinsic transforms; motion belongs to their
 // separate effects. Never adopt an observed transform as the expected value.
 if(!('clipTransform' in draft))throw Error('Update Selects to verify Image transforms.');
 const rows=(await draft.clips({trackScope:'all'})).filter(clip=>clip.trackKind==='video'||includeMain&&clip.trackKind==='main'&&clip.resourceId!=null);
 if(!Array.isArray(expected)||expected.length!==rows.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw Error('Visual transform count could not be confirmed.');
 const same=(a,b)=>{
  // Converting domain coordinates to the SDK may introduce floating-point noise.
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 const receipts=[];
 for(const wanted of expected){
  const clip=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);
  if(!clip)throw Error('Visual transform target could not be confirmed.');
  const patch=wanted.transform,transform={enabled:true,rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[],...patch,position:{x:0,y:0,...patch.position},scale:{x:1,y:1,...patch.scale},anchor:{x:0,y:0,...patch.anchor}};
  const actual=await draft.clipTransform(clip);
  if(!actual||!Object.entries(transform).every(([key,value])=>same(actual[key],value)))throw Error('Visual transform could not be confirmed.');
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,transform});
 }
 return receipts;
}
async function inspectImageAudio(draft,expected,project,overlayOnly=false){
 const mismatch=message=>Object.assign(Error(message),{code:'IMAGE_AUDIO_MISMATCH'});
 const rows=(await draft.clips({trackScope:'all'})).filter(row=>row.trackKind==='audio'||!overlayOnly&&row.trackKind==='main'&&row.resourceId);
 if(!Array.isArray(expected)||rows.length!==expected.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw mismatch('Audio clip count could not be confirmed.');
 if(!expected.length)return [];
 if(!('clipAudio' in draft))throw Error('Update Selects to verify Audio settings.');
 if(!('clipSourceWindow' in draft)||typeof draft.clipSourceWindow!=='function')throw Error('Update Selects to verify Audio source timing.');
 const types=new Map((await project.resources()).map(row=>[row.resourceId,row.type])),receipts=[];
 const same=(a,b)=>{
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 for(const wanted of expected){
  const row=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);
  if(!row||row.trackKind!==wanted.trackKind||row.resourceId!==wanted.resourceId||row.startFrame!==wanted.startFrame||row.endFrame!==wanted.endFrame||types.get(row.resourceId)!=='Audio'||!same(row.audioSourceIndexes,wanted.audioSourceIndexes))throw mismatch('Audio placement or routing could not be confirmed.');
  const settings={volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0,...wanted.settings},actual=await draft.clipAudio(row);
  if(!actual||actual.clipId!==row.clipId||!Object.entries(settings).every(([key,value])=>same(actual[key],value)))throw mismatch('Audio volume or fades could not be confirmed.');
  if(!wanted.source||!Number.isFinite(wanted.source.startSeconds)||wanted.source.startSeconds<0||!Number.isFinite(wanted.source.endSeconds)||wanted.source.endSeconds<=wanted.source.startSeconds)throw Error('Audio source evidence is unavailable.');
  const source={startSeconds:wanted.source.startSeconds,endSeconds:wanted.source.endSeconds,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,...wanted.source};
  // Time uses floating-point arithmetic noise only, not the relative tolerance
  // used for level/fades. A small changed source instant must remain detectable.
  const timeSame=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
  let observed;try{observed=await draft.clipSourceWindow(row);}catch(cause){throw Object.assign(Error('Audio source timing could not be confirmed.'),{cause});}
  if(!observed||observed.clipId!==row.clipId||!timeSame(observed.startSeconds,source.startSeconds)||!timeSame(observed.endSeconds,source.endSeconds)||row.playbackSpeed?.numerator!==source.playbackSpeed.numerator||row.playbackSpeed?.denominator!==source.playbackSpeed.denominator||row.preserveAudioPitch!==source.preserveAudioPitch)throw mismatch('Audio source timing or playback policy could not be confirmed.');
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,trackKind:wanted.trackKind,resourceId:wanted.resourceId,startFrame:wanted.startFrame,endFrame:wanted.endFrame,audioSourceIndexes:wanted.audioSourceIndexes,settings,source});
 }
 return receipts;
}
function imageProgramsFeature(selects,config=null,format=null){
 const issue=message=>Object.assign(Error(message),{code:'IMAGE_PROGRAM_INVALID',publicMessage:message});
 const guarded=fn=>async(...args)=>{try{return await fn(...args);}catch(cause){if(cause?.code==='IMAGE_PROGRAM_INVALID')throw cause;throw Object.assign(issue('Image program state could not be confirmed.'),{cause});}};
 const same=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 const normalized=program=>({tsxCode:program.tsxCode,editableParameters:program.editableParameters,parameters:{...Object.fromEntries(program.editableParameters.map(d=>[d.key,d.defaultValue])),...program.parameters}});
 const matches=(actual,wanted)=>actual&&actual.tsxCode===wanted.tsxCode&&same(actual.editableParameters,wanted.editableParameters)&&same(actual.parameters,wanted.parameters);
 // Reconcile a caller-owned program intent on Main or overlay visuals. Names
 // only locate candidates; code, values, controls, intervals and order prove a
 // match. Preflight the whole intent before the caller's optional mutation.
 const reconcile=guarded(async(draft,input,beforeApply=null)=>{
  if(!['clips','motionGraphics','motionGraphicProgram','videoEffects','videoEffectProgram','addMotionGraphic','addVideoEffect','rangeAtFrames'].every(key=>typeof draft[key]==='function'))throw issue('Update Selects to verify authored programs.');
  const text=JSON.stringify(input,(_key,value)=>{if(typeof value==='number'&&!Number.isFinite(value)||['function','bigint','symbol'].includes(typeof value))throw issue('Program intent contains an unsupported value.');return value;});
  if(!text||text.length>8*1024*1024)throw issue('Program intent exceeds its input limit.');
  const intent=JSON.parse(text),names=value=>Array.isArray(value)&&value.length<=32&&new Set(value).size===value.length&&value.every(name=>typeof name==='string'&&name.length>0&&name.length<=256);
  if(!intent||!names(intent.graphicNames)||!names(intent.effectNames)||!Array.isArray(intent.graphics)||intent.graphics.length>256||!Array.isArray(intent.clips)||intent.clips.length>256||new Set(intent.graphics.map(g=>g.name)).size!==intent.graphics.length||new Set(intent.clips.map(c=>c.clipId)).size!==intent.clips.length||beforeApply!==null&&typeof beforeApply!=='function')throw issue('Program intent is incomplete.');
  const prepare=program=>{
   if(!program||typeof program.tsxCode!=='string'||!program.tsxCode||!program.parameters||typeof program.parameters!=='object'||Array.isArray(program.parameters)||!Array.isArray(program.editableParameters)||program.editableParameters.length>256||new Set(program.editableParameters.map(d=>d?.key)).size!==program.editableParameters.length)throw issue('Program source or controls are incomplete.');
   return normalized(program);
  };
  const graphicPlans=intent.graphics.map(g=>{
   if(!g||!intent.graphicNames.includes(g.name)||!Number.isSafeInteger(g.startFrame)||g.startFrame<0||!Number.isSafeInteger(g.endFrame)||g.endFrame<=g.startFrame)throw issue('Graphic intent has an invalid interval.');
   return {...g,program:prepare(g)};
  });
  const clipPlans=intent.clips.map(c=>{
   if(!c||!Number.isSafeInteger(c.clipId)||c.clipId<0||typeof c.trackId!=='string'||!c.trackId||!Array.isArray(c.effects)||c.effects.length>32||new Set(c.effects.map(e=>e.name)).size!==c.effects.length)throw issue('Effect intent has an invalid target.');
   return {...c,effects:c.effects.map(e=>{if(!e||!intent.effectNames.includes(e.name))throw issue('Effect intent has an invalid name.');return {name:e.name,program:prepare(e)};})};
  });
  const rowFor=async wanted=>{
   const rows=await draft.clips({trackScope:'all'}),row=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);
   if(!row||!['main','video'].includes(row.trackKind)||!row.resourceId)throw issue('Effect intent target could not be confirmed.');return row;
  };
  const graphicPresent=async wanted=>{
   const candidates=(await draft.motionGraphics()).filter(g=>g.name===wanted.name);
   if(candidates.length>1)throw issue('Graphic intent matches several placements.');
   if(!candidates.length)return false;
   const clip=candidates[0].clip;
   if(clip.trackKind!=='video'||clip.startFrame!==wanted.startFrame||clip.endFrame!==wanted.endFrame||!matches(await draft.motionGraphicProgram(clip),wanted.program))throw issue('Graphic program, controls or interval differ from the intended result.');
   return true;
  };
  const effectState=async(wanted,complete)=>{
   const all=await draft.videoEffects(await rowFor(wanted));
   if(!Array.isArray(all)||all.some((e,index)=>e.effectIndex!==index||e.clipId!==wanted.clipId||e.trackId!==wanted.trackId))throw issue('Effect stack target could not be confirmed.');
   const managed=all.filter(e=>intent.effectNames.includes(e.name));
   if(managed.length>wanted.effects.length||complete&&managed.length!==wanted.effects.length)throw issue('Effect intent count could not be confirmed.');
   for(const [index,e] of managed.entries()){
    const expected=wanted.effects[index];
    if(e.name!==expected.name||e.enabled!==true||!matches(await draft.videoEffectProgram(e),expected.program))throw issue('Effect program, controls or prefix order differ from the intended result.');
   }
   return {count:managed.length,stack:all.map(e=>({name:e.name,effectName:e.effectName,enabled:e.enabled}))};
  };
  for(const g of graphicPlans)g.kept=await graphicPresent(g);
  for(const c of clipPlans)c.before=await effectState(c,false);
  // Muting and other caller policy run only after every existing program was
  // checked. All targets below are reread after that edit and each addition.
  if(beforeApply)await beforeApply();
  let graphicsAdded=0,graphicsKept=0;
  const effects=Object.fromEntries(intent.effectNames.map(name=>[name,{added:0,kept:0}]));
  for(const g of graphicPlans){
   if(g.kept){graphicsKept++;continue;}
   await draft.addMotionGraphic({within:await draft.rangeAtFrames(g.startFrame,g.endFrame),label:g.name,tsxCode:g.program.tsxCode,parameters:g.program.parameters,editableParameters:g.program.editableParameters});graphicsAdded++;
  }
  for(const c of clipPlans){
   for(const [index,e] of c.effects.entries()){
    if(index<c.before.count){effects[e.name].kept++;continue;}
    await draft.addVideoEffect({clip:await rowFor(c),label:e.name,tsxCode:e.program.tsxCode,parameters:e.program.parameters,editableParameters:e.program.editableParameters});effects[e.name].added++;
   }
  }
  // Writer acknowledgements are not evidence that a program was applied.
  for(const g of graphicPlans)if(!await graphicPresent(g))throw issue('The intended graphic was not applied.');
  for(const c of clipPlans){
   const after=await effectState(c,true);
   if(!same(after.stack.slice(0,c.before.stack.length),c.before.stack))throw issue('An existing effect stack changed while applying programs.');
  }
  return {graphicsAdded,graphicsKept,effects};
 });
 const inspect=async(draft,expected)=>{
  if(!('videoEffects' in draft)||!('videoEffectProgram' in draft)||!('motionGraphicProgram' in draft))throw issue('Update Selects to verify Image programs.');
  const rows=(await draft.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');
  if(!Array.isArray(expected)||expected.length!==rows.length||new Set(expected.map(c=>c.clipId)).size!==expected.length)throw issue('Visual program count could not be confirmed.');
  const sources=[],clips=[];
  const pack=program=>{const p=normalized(program);let source=sources.indexOf(p.tsxCode);if(source<0){source=sources.length;sources.push(p.tsxCode);}return {source,parameters:p.parameters,editableParameters:p.editableParameters};};
  for(const wanted of expected){
   const clip=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);if(!clip)throw issue('Visual program target could not be confirmed.');
   const effects=await draft.videoEffects(clip);
   if(!Array.isArray(effects)||effects.length!==wanted.effects.length)throw issue('Effect stack could not be confirmed.');
   const checked=[];
   for(const [index,entry] of wanted.effects.entries()){
    const actual=effects[index],program=normalized(entry);
    if(actual.effectIndex!==index||actual.name!==entry.name||actual.enabled!==true||!matches(await draft.videoEffectProgram(actual),program))throw issue('Effect program, order or controls could not be confirmed.');
    checked.push({name:entry.name,...pack(program)});
   }
   const graphic=await draft.motionGraphicProgram(clip);
   if(wanted.graphic?!matches(graphic,normalized(wanted.graphic)):graphic!==null)throw issue('Graphic program or controls could not be confirmed.');
   clips.push({clipId:clip.clipId,trackId:clip.trackId,effects:checked,graphic:wanted.graphic?pack(wanted.graphic):null});
  }
  return {sources,clips};
 };
 const presets=new Map();
 const preset=async id=>{
  if(!config)throw issue('Effect preset preparation requires an authoring target.');
  if(presets.has(id))return presets.get(id);
  const definition=await selects.effectPresets.get(id);
  if(definition?.id!==id||definition.kind!=='effect'||typeof definition.label!=='string'||!Array.isArray(definition.editableParameters)||!definition.parameters)throw issue('Effect preset definition could not be confirmed.');
  // The public preset definition omits effect TSX. Resolve a canonical program
  // in an isolated unsaved reference, never by adopting the target's output.
  const project=selects.project(config.projectId),probe=await project.createDraft({name:'Image preset reference'});
  await probe.insertGap({seconds:config.plan.durationFrames/config.plan.fps});await probe.setFrameSize(config.plan.canvas);
  await probe.overlayResource({resource:project.resource(config.sources[0].resourceId),over:await probe.rangeAtFrames(0,config.plan.durationFrames)});
  if(!('videoEffects' in probe)||!('videoEffectProgram' in probe))throw issue('Update Selects to verify effect presets.');
  let clips=(await probe.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');if(clips.length!==1)throw issue('Effect preset reference could not be confirmed.');
  const applied=await probe.applyEffectPreset({clip:clips[0],presetId:id,parameters:definition.parameters});
  if(applied?.presetId!==id)throw issue('Effect preset identity could not be confirmed.');
  clips=(await probe.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');
  const effects=await probe.videoEffects(clips[0]);if(effects.length!==1||effects[0].enabled!==true||effects[0].name!==definition.label)throw issue('Effect preset reference stack could not be confirmed.');
  const program=await probe.videoEffectProgram(effects[0]),expected=normalized({tsxCode:program?.tsxCode,parameters:definition.parameters,editableParameters:definition.editableParameters});
  if(typeof program?.tsxCode!=='string'||!program.tsxCode||!matches(program,expected))throw issue('Effect preset reference program could not be confirmed.');
  const value={name:definition.label,...expected};presets.set(id,value);return value;
 };
 const confirm=details=>{
  if(!config||!format)throw issue('Program receipt confirmation requires an authoring target.');
  const result={draftId:config.partialDraftId||'x'.repeat(120),fps:config.plan.fps,durationFrames:config.plan.durationFrames,frameSize:config.plan.canvas,clips:config.clips,...details};
  // Reserve more than a UUID for the post-commit identity. Check the actual
  // journal envelope and ASCII encoding before the only persistence boundary.
  try{format(config.runReceipt?{...JSON.parse(config.runReceipt.expectedText),status:'saved',result}:result);}catch(cause){throw Object.assign(issue('The Image program receipt exceeds its limit or could not be prepared.'),{cause});}
 };
 const verify=(draft,receipt)=>inspect(draft,receipt.clips.map(c=>{const expand=p=>({tsxCode:receipt.sources[p.source],parameters:p.parameters,editableParameters:p.editableParameters});return {...c,effects:c.effects.map(e=>({name:e.name,...expand(e)})),graphic:c.graphic?expand(c.graphic):null};}));
 return {inspect:guarded(inspect),preset:guarded(preset),confirm,verify:guarded(verify),reconcile};
}
async function authorAtomicImageDraft(selects,config,finish,placeImages,sourceFacts,inspectGraphics,inspectTransforms,inspectAudio,programFeature,format,bindPlacement){
 let stage='read';
 try{
  const {projectId,plan,sources,items,partialDraftId}=config,project=selects.project(projectId);
  if(partialDraftId&&!(await project.meta()).draftIds.includes(partialDraftId))throw Error('Partial Draft is not in this Project.');
  const draft=partialDraftId?selects.draft(partialDraftId):await project.createDraft({name:config.name});
  if(!('motionGraphics' in draft)||!('motionGraphicProgram' in draft))throw Error('Update Selects to verify editable graphics.');
  if(!('clipTransform' in draft))throw Error('Update Selects to verify Image transforms.');
  if(!partialDraftId){
   stage='working copy';
   if(config.main){await draft.insertResource({resourceId:config.main.resourceId,sourceRange:{startSeconds:config.main.startSeconds,endSeconds:config.main.startSeconds+plan.durationFrames/plan.fps}});}
   else await draft.insertGap({seconds:plan.durationFrames/plan.fps});
   await draft.setFrameSize(plan.canvas);
  }else{
   const rows=await draft.clips({trackScope:'all'});
   if(rows.some(row=>row.trackKind!=='main'||(config.main?row.resourceId!==config.main.resourceId:Boolean(row.resourceId)))||config.main&&rows.length!==1)throw Error('Partial Draft is not empty; inspect it before retrying.');
  }
  stage='placement';const native=await placeImages(selects,projectId,draft,plan,sources,items,sourceFacts,bindPlacement);
  const clips=native.placements.map(({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame})=>({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame}));
  stage='finish';const result=await finish(selects,config,draft,native,inspectGraphics,inspectTransforms,inspectAudio,programFeature(selects,{...config,clips},format));
  return {...result,fps:plan.fps,durationFrames:plan.durationFrames,frameSize:plan.canvas,clips};
 }catch(error){return {status:stage==='finish'?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:config.partialDraftId||null};}
}
function buildAtomicImageDraftScript(config,finishSource){
 const receipt=config.runReceipt?`await (${writeTemplateRunResult.toString()})(selects,config.runReceipt,result,${templateRunJSON.toString()},${templateRunBase64.toString()})`:'result';
 return `const config=${JSON.stringify(config)};const result=await (${authorAtomicImageDraft.toString()})(selects,config,${finishSource},${placeWorkingCopyImages.toString()},${nativeImageSources.toString()},${inspectImageGraphics.toString()},${inspectImageTransforms.toString()},${inspectImageAudio.toString()},${imageProgramsFeature.toString()},${templateRunJSON.toString()},${bindMediaPlacement.toString()});return ${receipt};`;
}
async function verifyAtomicImageDraft(sdk,projectId,result){
 const {draftId,fps,durationFrames,frameSize,clips,graphics,transforms,audio,programs}=result,expected={draftId,fps,durationFrames,frameSize,clips,graphics,transforms,audio,programs};
 const unverified=cause=>{const message='The saved Image Draft, graphics or sound could not be confirmed. Inspect the Draft before starting a new run.';return Object.assign(Error(message),{code:'IMAGE_SAVE_UNVERIFIED',draftId,publicMessage:message,cause});};
 if(!Array.isArray(graphics))throw Object.assign(Error('Saved graphic receipts are unavailable. Inspect the existing Draft before starting a new run.'),{code:'IMAGE_SAVE_UNVERIFIED',draftId});
 if(!Array.isArray(transforms))throw unverified('Saved transform receipts are unavailable.');
 if(!Array.isArray(audio))throw unverified('Saved Audio receipts are unavailable.');
 if(audio.some(row=>!row?.source))throw unverified('Saved Audio source evidence is unavailable.');
 if(!programs)throw unverified('Saved program receipts are unavailable.');
 let response;try{response=await sdk.runScript({summary:'Verify complete saved Image Draft',allowCommit:false,script:`const expected=${JSON.stringify(expected)};const project=selects.project(${JSON.stringify(projectId)});if(!(await project.meta()).draftIds.includes(expected.draftId))throw Error('Saved Draft is not in this Project');const draft=selects.draft(expected.draftId),meta=await draft.meta(),rows=await draft.clips({trackScope:'all'});if(meta.fps!==expected.fps||meta.durationFrames!==expected.durationFrames||meta.frameSize.width!==expected.frameSize.width||meta.frameSize.height!==expected.frameSize.height)throw Error('Saved Draft frame grid could not be confirmed');if(rows.filter(row=>row.trackKind==='video'&&row.resourceId).length!==expected.clips.length)throw Error('Saved Image count could not be confirmed');for(const wanted of expected.clips){const actual=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);if(!actual||actual.resourceId!==wanted.resourceId||actual.startFrame!==wanted.startFrame||actual.endFrame!==wanted.endFrame)throw Error('Saved Image placement could not be confirmed');}await (${inspectImageGraphics.toString()})(draft,expected.graphics);await (${inspectImageTransforms.toString()})(draft,expected.transforms);await (${inspectImageAudio.toString()})(draft,expected.audio,project);await (${imageProgramsFeature.toString()})(selects).verify(draft,expected.programs);return {verified:true};`});}catch(cause){throw unverified(cause);}
 if(response?.isError||response?.result?.verified!==true)throw unverified(response?.output);
 return result;
}
async function readImageDraftFps(sdk,projectId,draftId=null){
 const response=await sdk.runScript({summary:'Read the Project frame rate',allowCommit:false,script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(draftId)};if(id&&!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=id?selects.draft(id):await p.createDraft({name:'Image frame rate check'});return {fps:(await d.meta()).fps};`});
 if(response.isError||!Number.isFinite(response.result?.fps)||response.result.fps<=0)throw Error('Could not read the Project frame rate.');
 return response.result.fps;
}
