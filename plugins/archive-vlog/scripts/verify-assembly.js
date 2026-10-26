// @template-assembly-verification 1
function templateObservedSource(observation,row){
 const invalid=()=>{throw Error('Saved source target could not be confirmed.');};
 if(!Array.isArray(observation?.clips)||!row||!Number.isSafeInteger(row.clipId)||typeof row.trackId!=='string')invalid();
 const found=observation.clips.filter(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
 if(found.length!==1)invalid();
 const actual=found[0],source=actual.source;
 if(actual.trackKind!==row.trackKind||actual.startFrame!==row.startFrame||actual.endFrame!==row.endFrame||source?.clipId!==row.clipId||!Number.isFinite(source.startSeconds)||source.startSeconds<0||!Number.isFinite(source.endSeconds)||source.endSeconds<=source.startSeconds)invalid();
 return {clipId:row.clipId,startSeconds:source.startSeconds,endSeconds:source.endSeconds};
}
async function nativeImageSources(selects, projectId, photos, { matchById=false }={}) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const sources=photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&(!matchById||node.resourceId===photo.resourceId)&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Image'));
  if(matches.length!==1||matches[0].resourceId!==photo.resourceId)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const row=matches[0],size=row.frameSize;
  if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('A selected Image has no verified native dimensions: '+photo.name);
  return {resourceId:row.resourceId,path:row.path,name:photo.name,width:size.width,height:size.height};
 });
 const fail=(code,photo,message)=>{throw Object.assign(new Error(message+': '+photo.name),{code,resourceId:photo.resourceId});};
 if(typeof selects.files?.stat!=='function'||typeof selects.files?.readRange!=='function')throw Error('This Selects version does not support original photo file checks.');
 const checked=new Set();
 for(const photo of sources){
  if(checked.has(photo.path))continue;
  let before;
  try{before=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file');}
  if(before===null)fail('image-source-missing',photo,'The original photo file is missing');
  if(!before||!Number.isSafeInteger(before.size)||before.size<0||typeof before.isDirectory!=='boolean')fail('image-source-unknown',photo,'Could not confirm the original photo file');
  if(before.isDirectory||before.size===0)fail('image-source-unreadable',photo,'The original photo file is not readable');
  let first;
  try{first=await selects.files.readRange({path:photo.path,offset:0,length:1});}catch{fail('image-source-unreadable',photo,'Could not read the original photo file');}
  if(!first||first.bytesRead!==1||typeof first.base64!=='string'||!/^[A-Za-z0-9+/]{2}==$/.test(first.base64))fail('image-source-unknown',photo,'Could not confirm reading the original photo file');
  let after;
  try{after=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file after reading');}
  if(!after||after.isDirectory||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))fail('image-source-changed',photo,'The original photo file changed while reading');
  checked.add(photo.path);
 }
 return sources;
}
async function nativeImageSourcesById(selects,projectId,photos) {
 const project=selects.project(projectId),nodes=[];
 const visit=items=>{for(const item of items||[]){if(!item)continue;item.type==='dir'?visit(item.children):nodes.push(item);}};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const selected=photos.map(photo=>{
  const matches=nodes.filter(node=>node.resourceId===photo.resourceId&&typeof node.path==='string'&&node.path);
  if(matches.length!==1)throw Error('The selected Image path is missing or ambiguous in the Project: '+photo.name);
  return {...photo,path:matches[0].path};
 });
 return nativeImageSources(selects,projectId,selected,{matchById:true});
}
async function resolveTemplateMedia(selects,projectId,files,scratchName='Template source check',options={}) {
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['includeTiming','dimensions','includeKind'].includes(key))||['includeTiming','dimensions','includeKind'].some(key=>options[key]!==undefined&&typeof options[key]!=='boolean'))throw Error('The source observation options are invalid.');
 if(!Array.isArray(files)||!files.length||files.length>50||files.some(file=>!file||typeof file.rid!=='string'||!file.rid||!['video','image'].includes(file.kind))||new Set(files.map(file=>file.rid)).size!==files.length)throw Error('The selected template source request is invalid.');
 const project=selects.project(projectId),resolved=[],failed=[];let shared=null,catalogRead=null;
 const text=error=>String(Object(error).message||error||'Source preparation could not be confirmed.').slice(0,300);
 const unknown=message=>Object.assign(Error(message),{code:'source-resolution-unknown'});
 for(const file of files){
  let phase='create',insertionError;
  try{
   const photo=file.kind==='image',draft=photo||Object(options).includeTiming||!shared?await project.createDraft({name:scratchName}):shared;
   if(!photo)shared=draft;
   phase='readback';const before=await draft.clips({trackScope:'main'});
   if(!Array.isArray(before)||before.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(before.map(row=>row.clipId)).size!==before.length)throw unknown('The private source check could not be observed before placement.');
   const ids=new Set(before.map(row=>row.clipId));
   const observe=async()=>{
    const rows=await draft.clips({trackScope:'main'});
    if(!Array.isArray(rows)||rows.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(rows.map(row=>row.clipId)).size!==rows.length)throw unknown('The private source check returned invalid clips.');
    const added=rows.filter(row=>!ids.has(row.clipId));
    if(added.length>1||added.length===1&&(typeof added[0].resourceId!=='string'||!added[0].resourceId))throw unknown('The placed source alias could not be uniquely confirmed.');
    return added[0]??null;
   };
   phase='insert';
   try{await draft.insertResource({resourceId:file.rid,sourceRange:{startSeconds:0,endSeconds:0.5}});}catch(error){insertionError=error;}
   phase='readback';let clip=await observe();
   // Only the SDK's pre-mutation range validation authorizes the old short-file
   // fallback. An empty observation after an arbitrary transport error does not.
   if(!clip&&insertionError&&/^invalid_source_range(?::|$)/.test(text(insertionError))){
    phase='insert';insertionError=null;
    try{await draft.insertResource({resourceId:file.rid});}catch(error){insertionError=error;}
    phase='readback';clip=await observe();
   }
   if(!clip){if(insertionError){phase='insert';throw insertionError;}throw unknown('Source placement returned no confirmed clip.');}
   let kind=null;
   if(Object(options).includeKind){
    phase='kind';
    const rows=await (catalogRead??=project.resources());
    if(!Array.isArray(rows)||rows.some(row=>!row||typeof row.resourceId!=='string'||!row.resourceId||typeof row.type!=='string')||new Set(rows.map(row=>row.resourceId)).size!==rows.length)throw unknown('The current Project Resource kinds could not be confirmed.');
    const row=rows.find(row=>row.resourceId===clip.resourceId);
    if(!row)throw unknown('The placed source has no confirmed Project Resource kind.');
    kind=row.type==='Video'?'video':row.type==='Image'?'image':null;
    if(kind!==file.kind)throw Object.assign(Error('The selected source kind differs from the handed video/photo declaration.'),{code:'source-kind-mismatch'});
   }
   let size=null;
   if(photo&&Object(options).dimensions!==false){phase='dimensions';const sources=await nativeImageSourcesById(selects,projectId,[{resourceId:clip.resourceId,name:file.rid}]);size={width:sources[0].width,height:sources[0].height};}
   let timing=null;
   if(Object(options).includeTiming){phase='timing';const meta=await draft.meta();if(!Number.isFinite(meta.fps)||meta.fps<=0)throw unknown('The source frame grid could not be confirmed.');timing={insertionFps:meta.fps};}
   resolved.push({rid:file.rid,alias:clip.resourceId,size,...kind?{kind}:{},...timing?{timing}:{}});
  }catch(error){
   const code=typeof Object(error).code==='string'?Object(error).code.slice(0,80):['readback','kind'].includes(phase)?'source-resolution-unknown':'source-resolution-failed';
   failed.push({rid:file.rid,phase,code,error:text(error),...insertionError&&insertionError!==error?{insertionError:text(insertionError)}:{}});
  }
 }
 return {resolved,failed};
}
function nativeMediaWindow({startFrame,endFrame,draftFps,sourceFps,sourceStartSeconds=0,sourceDurationSeconds=null,still=false}) {
 const frames=endFrame-startFrame;
 if(!Number.isFinite(draftFps)||draftFps<=0||!Number.isFinite(sourceFps)||sourceFps<=0||!Number.isSafeInteger(startFrame)||startFrame<0||!Number.isSafeInteger(endFrame)||!Number.isSafeInteger(frames)||frames<1||!Number.isFinite(sourceStartSeconds)||sourceStartSeconds<0||typeof still!=='boolean'||sourceDurationSeconds!==null&&(!Number.isFinite(sourceDurationSeconds)||sourceDurationSeconds<=0))throw Error('The media plan has no valid whole-frame interval.');
 const count=Math.max(1,Math.ceil(frames/draftFps*sourceFps-1e-8)),cap=sourceDurationSeconds!==null?Math.floor(sourceDurationSeconds*sourceFps+1e-6)-count:Infinity;
 if(!Number.isSafeInteger(count)||count<1||cap!==Infinity&&(!Number.isSafeInteger(cap)||cap<0))throw Error('The planned source cannot cover its playback interval.');
 const start=still?0:Math.max(0,Math.min(Math.round(sourceStartSeconds*sourceFps),cap));
 if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(start+count))throw Error('The planned source interval cannot be represented.');
 return {startFrame,endFrame,frames,sourceStart:start/sourceFps,sourceEnd:(start+count)/sourceFps,insertedFrames:Math.round(count/sourceFps*draftFps)};
}
async function inspectImageAudio(draft,expected,project,overlayOnly=false,observedSources=null,readSource=null){
 const mismatch=message=>Object.assign(Error(message),{code:'IMAGE_AUDIO_MISMATCH'});
 const rows=(await draft.clips({trackScope:'all'})).filter(row=>row.trackKind==='audio'||!overlayOnly&&row.trackKind==='main'&&row.resourceId);
 if(!Array.isArray(expected)||rows.length!==expected.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw mismatch('Audio clip count could not be confirmed.');
 if(!expected.length)return [];
 if(!('clipAudio' in draft))throw Error('Update Selects to verify Audio settings.');
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
  if(!Number.isSafeInteger(source.playbackSpeed?.numerator)||source.playbackSpeed.numerator<1||!Number.isSafeInteger(source.playbackSpeed?.denominator)||source.playbackSpeed.denominator<1||typeof source.preserveAudioPitch!=='boolean')throw Error('Audio source evidence is invalid.');
  if(row.playbackSpeed?.numerator!==source.playbackSpeed.numerator||row.playbackSpeed?.denominator!==source.playbackSpeed.denominator||row.preserveAudioPitch!==source.preserveAudioPitch)throw mismatch('Audio playback policy could not be confirmed.');
  // Time uses floating-point arithmetic noise only, not the relative tolerance
  // used for level/fades. A small changed source instant must remain detectable.
  const timeSame=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
  // An unsaved working copy has no persisted source read. Keep the requested
  // interval as intent; only saved verification supplies independently read
  // sources. Never infer the source offset from timeline placement.
  if(observedSources!==null){
   if(typeof readSource!=='function')throw Error('Audio source observation is unavailable.');
   let observed;try{observed=readSource(observedSources,row);}catch(cause){throw Object.assign(Error('Audio source timing could not be confirmed.'),{cause});}
   if(!observed||observed.clipId!==row.clipId||!timeSame(observed.startSeconds,source.startSeconds)||!timeSame(observed.endSeconds,source.endSeconds))throw mismatch('Audio source timing could not be confirmed.');
  }
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,trackKind:wanted.trackKind,resourceId:wanted.resourceId,startFrame:wanted.startFrame,endFrame:wanted.endFrame,audioSourceIndexes:wanted.audioSourceIndexes,settings,source});
 }
 return receipts;
}
function validateArchiveAssemblyConfig(cfg) {
 const invalid=()=>{throw Error('The Archive assembly plan is incomplete or invalid.');};
 const id=value=>typeof value==='string'&&value.length>0&&value.length<=1024&&!value.includes('\0');
 const finite=value=>typeof value==='number'&&Number.isFinite(value);
 if(!cfg||!id(cfg.projectId)||!id(cfg.draftName)||!Array.isArray(cfg.picks)||cfg.picks.length<1||cfg.picks.length>256||!Array.isArray(cfg.boundaries)||cfg.boundaries.length!==cfg.picks.length+1||cfg.boundaries[0]!==0||cfg.boundaries.some((value,index)=>!finite(value)||value<0||index>0&&value<=cfg.boundaries[index-1]))invalid();
 if(cfg.clipSound!==undefined&&!['off','ambient','full'].includes(cfg.clipSound)||cfg.ambientDb!==undefined&&(!finite(cfg.ambientDb)||cfg.ambientDb< -60||cfg.ambientDb>12))invalid();
 const photoIds=new Set();
 for(const pick of cfg.picks){
  if(!pick||!id(pick.rid)||pick.kind!==undefined&&!['photo','video'].includes(pick.kind))invalid();
  if(pick.kind!=='photo'&&(!finite(pick.startSeconds)||pick.startSeconds<0)||pick.sourceDuration!==undefined&&(!finite(pick.sourceDuration)||pick.sourceDuration<=0))invalid();
  if(pick.kind==='photo'){if(photoIds.has(pick.rid))invalid();photoIds.add(pick.rid);}
  const size=cfg.crops?.[pick.rid];
  if(pick.kind==='photo'&&(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1))invalid();
  if(size&&[size.width,size.height].some(value=>value!=null&&(!Number.isSafeInteger(value)||value<1)))invalid();
 }
 if(cfg.music!=null&&(!id(cfg.music.resourceId)||!finite(cfg.music.sectionStart)||cfg.music.sectionStart<0)||cfg.musicFadeOut!==undefined&&(!finite(cfg.musicFadeOut)||cfg.musicFadeOut<0))invalid();
}
// Archive policy only: source/draft clocks remain explicit arguments.
function archiveAssemblyOffset(cfg,fps){return cfg.music?cfg.music.sectionStart-Math.round(cfg.music.sectionStart*fps)/fps:0;}
function archiveAssemblyShot(cfg,index,fps,sourceFps){
 const pick=cfg.picks[index],startFrame=index?Math.round((cfg.boundaries[index]+archiveAssemblyOffset(cfg,fps))*fps):0,endFrame=Math.round((cfg.boundaries[index+1]+archiveAssemblyOffset(cfg,fps))*fps),frames=endFrame-startFrame;
 if(!Number.isFinite(fps)||fps<=0||!Number.isFinite(sourceFps)||sourceFps<=0||!Number.isSafeInteger(startFrame)||!Number.isSafeInteger(endFrame)||!Number.isSafeInteger(frames)||frames<1)throw Error('The assembly plan has no positive whole-frame interval.');
 return nativeMediaWindow({startFrame,endFrame,draftFps:fps,sourceFps,sourceStartSeconds:pick.kind==='photo'?0:pick.startSeconds,sourceDurationSeconds:pick.sourceDuration??null,still:pick.kind==='photo'});
}
async function archiveAssemblyTiming(selects,cfg,resolveMedia){
const seenSources=new Set(),unique=[],timing=new Map();
for(const pick of cfg.picks)if(!seenSources.has(pick.rid)){seenSources.add(pick.rid);unique.push({rid:pick.rid,kind:pick.kind==='photo'?'image':'video'});}
for(let offset=0;offset<unique.length;offset+=50){
 const batch=unique.slice(offset,offset+50),facts=await resolveMedia(selects,cfg.projectId,batch,'Archive source timing check',{includeTiming:true,dimensions:false});
 if(facts.failed.length||facts.resolved.length!==batch.length||facts.resolved.some((row,i)=>row.rid!==batch[i].rid||row.alias!==batch[i].rid||!Number.isFinite(row.timing?.insertionFps)||row.timing.insertionFps<=0))throw Error('The planned source frame grid or identity could not be confirmed.');
 for(const row of facts.resolved)timing.set(row.rid,row.timing.insertionFps);
}
 return timing;
}

// Read-only admission of an already-owned historical assembly. Source probes
// are private unsaved Drafts; no mutator is called on the saved target.
const input=__CONFIG__;
return await(async()=>{
const refuse=message=>{throw Object.assign(Error(message),{code:'ARCHIVE_PLAN_MISMATCH'});};
try{
const cfg=input.config;
try{validateArchiveAssemblyConfig(cfg);}catch(error){refuse(String(error.message));}
if(typeof input.draftId!=='string'||!input.draftId)refuse('The owned assembly target is missing.');
const p=selects.project(cfg.projectId);
if(!(await p.meta()).draftIds.includes(input.draftId))refuse('The owned assembly is not in its original Project.');
const d=selects.draft(input.draftId),meta=await d.meta(),fps=meta.fps;
if(!Number.isFinite(fps)||fps<=0)throw Error('The saved assembly frame grid could not be read.');
if(meta.frameSize.width!==1920||meta.frameSize.height!==1080)refuse('The saved assembly canvas or frame grid differs from the plan.');
const timing=await archiveAssemblyTiming(selects,cfg,resolveTemplateMedia),rows=await d.clips({trackScope:'all'}),main=rows.filter(row=>row.trackKind==='main'&&row.resourceId!=null).sort((a,b)=>a.startFrame-b.startFrame);
if(main.length!==cfg.picks.length||rows.some(row=>row.trackKind==='video'&&row.resourceId!=null))refuse('The saved assembly media count differs from the plan.');
const timeSame=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
for(let i=0;i<main.length;i++){
 const row=main[i],pick=cfg.picks[i],intent=archiveAssemblyShot(cfg,i,fps,timing.get(pick.rid));
 if(row.resourceId!==pick.rid||row.startFrame!==intent.startFrame||row.endFrame!==intent.endFrame)refuse('The saved assembly cut differs from the original plan.');
 const source=templateObservedSource(input.__sources,row),speed=row.playbackSpeed;
 if(!source||!speed||speed.numerator!==speed.denominator||!timeSame(source.startSeconds,intent.sourceStart)||!timeSame(source.endSeconds,intent.sourceStart+intent.frames/fps))refuse('The saved assembly source window differs from the original plan.');
 const size=cfg.crops?.[pick.rid],scale=size?.width>0&&size?.height>0?Math.max(1920/size.width,1080/size.height)/Math.min(1920/size.width,1080/size.height):1,transform=await d.clipTransform(row);
 if(!near(transform.scale.x,scale)||!near(transform.scale.y,scale)||!near(transform.position.x,0)||!near(transform.position.y,0)||transform.positionKeys.length||transform.scaleKeys.length)refuse('The saved assembly crop differs from the original plan.');

}
const endFrame=archiveAssemblyShot(cfg,cfg.picks.length-1,fps,timing.get(cfg.picks.at(-1).rid)).endFrame;
const durationFrames=endFrame;
if(meta.durationFrames!==durationFrames)refuse('The saved assembly duration differs from the original plan.');
const audio=rows.filter(row=>row.trackKind==='audio');
if(cfg.music){
 if(audio.length!==1)refuse('The saved assembly music count differs from the original plan.');
 const row=audio[0],start=Math.round(cfg.music.sectionStart*fps)/fps;
 await inspectImageAudio(d,[{clipId:row.clipId,trackId:row.trackId,trackKind:'audio',resourceId:cfg.music.resourceId,startFrame:0,endFrame:durationFrames,audioSourceIndexes:null,settings:{volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:Math.min(durationFrames,Math.round((cfg.musicFadeOut??1)*fps))/fps},source:{startSeconds:start,endSeconds:start+durationFrames/fps,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true}}],p,true,input.__sources,templateObservedSource);
}else if(audio.length)refuse('The saved assembly has unexpected music.');
return {verified:true,draftId:input.draftId,mainEnd:endFrame,fps,durationFrames};
}catch(error){return {verified:false,status:['ARCHIVE_PLAN_MISMATCH','IMAGE_AUDIO_MISMATCH'].includes(error?.code)?'mismatch':'unavailable',detail:String(error?.message||'The saved assembly could not be read.').slice(0,300)};}
})();
