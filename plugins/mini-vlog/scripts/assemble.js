// @template-assembly 1
// @template-assembly-intent 1
// Generated from canonical input/placement checks and the Mini assembly policy.
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
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['includeTiming','dimensions'].includes(key))||['includeTiming','dimensions'].some(key=>options[key]!==undefined&&typeof options[key]!=='boolean'))throw Error('The source observation options are invalid.');
 if(!Array.isArray(files)||!files.length||files.length>50||files.some(file=>!file||typeof file.rid!=='string'||!file.rid||!['video','image'].includes(file.kind))||new Set(files.map(file=>file.rid)).size!==files.length)throw Error('The selected template source request is invalid.');
 const project=selects.project(projectId),resolved=[],failed=[];let shared=null;
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
   let size=null;
   if(photo&&Object(options).dimensions!==false){phase='dimensions';const sources=await nativeImageSourcesById(selects,projectId,[{resourceId:clip.resourceId,name:file.rid}]);size={width:sources[0].width,height:sources[0].height};}
   let timing=null;
   if(Object(options).includeTiming){phase='timing';const meta=await draft.meta();if(!Number.isFinite(meta.fps)||meta.fps<=0)throw unknown('The source frame grid could not be confirmed.');timing={insertionFps:meta.fps};}
   resolved.push({rid:file.rid,alias:clip.resourceId,size,...timing?{timing}:{}});
  }catch(error){
   const code=typeof Object(error).code==='string'?Object(error).code.slice(0,80):phase==='readback'?'source-resolution-unknown':'source-resolution-failed';
   failed.push({rid:file.rid,phase,code,error:text(error),...insertionError&&insertionError!==error?{insertionError:text(insertionError)}:{}});
  }
 }
 return {resolved,failed};
}
function requireSourceFileSupport(files) {
 if(typeof files?.fingerprint!=='function'){
  const message='Update Selects to verify complete source file contents before creating this template.';
  throw Object.assign(new Error(message),{code:'source-file-unsupported',publicMessage:message});
 }
}
async function observeSourceFiles(files,paths,expected=null) {
 const issue=(code,message,cause=null)=>Object.assign(new Error(message),{code,publicMessage:message,cause});
 if(!Array.isArray(paths)||paths.some(path=>typeof path!=='string'||!path||path.includes('\0')))throw issue('source-file-input','The selected source paths are invalid.');
 const selected=[...new Set(paths)];
 const valid=row=>row&&typeof row.path==='string'&&Number.isSafeInteger(row.size)&&row.size>0&&typeof row.sha256==='string'&&/^[0-9a-f]{64}$/.test(row.sha256);
 if(expected!==null&&(!Array.isArray(expected)||expected.length!==selected.length||new Set(expected.map(row=>row?.path)).size!==expected.length||expected.some(row=>!valid(row)||!selected.includes(row.path))))throw issue('source-file-input','The expected source observations do not match the selection.');
 if(!selected.length)return [];
 requireSourceFileSupport(files);
 const observed=[];
 for(const path of selected){
  let fingerprint;
  try{fingerprint=await files.fingerprint(path);}catch(cause){throw issue('source-file-unknown','The selected source file could not be confirmed. Check the Project file and try again.',cause);}
  if(fingerprint===null)throw issue('source-file-missing','The selected source file is missing. Check the Project file and try again.');
  const row={...fingerprint,path};
  if(!valid(row))throw issue('source-file-unknown','The selected source file has no complete, nonempty content identity.');
  const before=expected?.find(row=>row.path===path);
  if(before&&(before.size!==row.size||before.sha256!==row.sha256))throw issue('source-file-changed','The selected source file changed. Reload the Project inputs before trying again.');
  observed.push({path,size:row.size,sha256:row.sha256});
 }
 return observed;
}
async function confirmProjectSourcePaths(selects,projectId,bindings) {
 const issue=(code,message,cause=null)=>Object.assign(new Error(message),{code:'source-path-'+code,publicMessage:message,cause});
 const valid=value=>typeof value==='string'&&value.length>0&&value.length<=8192&&!value.includes('\0');
 if(!valid(projectId)||!Array.isArray(bindings)||bindings.length>16384||bindings.some(row=>!row||!valid(row.resourceId)||!valid(row.path))||new Set(bindings.map(row=>row.resourceId)).size!==bindings.length)throw issue('input','The selected source bindings are invalid.');
 const expected=bindings.map(row=>({resourceId:row.resourceId,path:row.path}));
 if(!expected.length)return {verified:true};
 const wanted=new Set(expected.map(row=>row.resourceId)),found=new Map(),deadline=Date.now()+25000;let nodes=0;
 const check=()=>{if(Date.now()>=deadline)throw issue('unknown','The current Project source paths could not be confirmed in time.');};
 const visit=(rows,depth=0)=>{
  check();if(!Array.isArray(rows)||depth>24)throw issue('unknown','The Project source tree is incomplete or unsupported.');
  for(const row of rows){
   if(++nodes>16384||!row||typeof row!=='object')throw issue('unknown','The Project source tree exceeds its observation budget or is incomplete.');
   if(row.type==='dir')visit(row.children,depth+1);
   else if(wanted.has(row.resourceId)){
    if(found.has(row.resourceId)||!valid(row.path))throw issue('changed','A selected source path is missing or ambiguous in the Project.');
    found.set(row.resourceId,row.path);
   }
  }
 };
 try{
  const project=selects.project(projectId),overview=await project.sourceFiles();check();
  if(!overview||typeof overview!=='object')throw issue('unknown','The current Project source tree could not be confirmed.');
  if('fileTree' in overview)visit(overview.fileTree);
  else{
   if(!Array.isArray(overview.folders)||overview.folders.length>512||overview.folders.some(row=>!row||!valid(row.name))||new Set(overview.folders.map(row=>row.name)).size!==overview.folders.length)throw issue('unknown','The Project source folder list is incomplete or unsupported.');
   for(const folder of overview.folders){check();const detail=await project.sourceFiles({folder:folder.name});check();if(!detail||typeof detail!=='object'||!('fileTree' in detail))throw issue('unknown','A Project source folder did not return its complete file tree.');visit(detail.fileTree);}
  }
 }catch(cause){if(cause?.code?.startsWith('source-path-'))throw cause;throw issue('unknown','The current Project source paths could not be read.',cause);}
 for(const row of expected)if(found.get(row.resourceId)!==row.path)throw issue('changed','A selected original has moved or changed its Project source link. Reload the Project inputs before trying again.');
 check();return {verified:true};
}
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
function validateMiniAssemblyConfig(cfg) {
 const invalid=()=>{throw Error('The Mini assembly plan is incomplete or invalid.');};
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
 if(cfg.music!=null&&(!id(cfg.music.resourceId)||!finite(cfg.music.sectionStart)||cfg.music.sectionStart<0||cfg.music.tailSeconds!==undefined&&(!finite(cfg.music.tailSeconds)||cfg.music.tailSeconds<0)||cfg.music.referenceCuts!==undefined&&typeof cfg.music.referenceCuts!=='boolean'))invalid();
}
// Mini policy only: source/draft clocks remain explicit arguments.
function miniAssemblyOffset(cfg,fps){return cfg.music&&!cfg.music.referenceCuts?cfg.music.sectionStart-Math.round(cfg.music.sectionStart*fps)/fps:0;}
function miniAssemblyShot(cfg,index,fps,sourceFps){
 const pick=cfg.picks[index],startFrame=index?Math.round((cfg.boundaries[index]+miniAssemblyOffset(cfg,fps))*fps):0,endFrame=Math.round((cfg.boundaries[index+1]+miniAssemblyOffset(cfg,fps))*fps),frames=endFrame-startFrame;
 if(!Number.isFinite(fps)||fps<=0||!Number.isFinite(sourceFps)||sourceFps<=0||!Number.isSafeInteger(startFrame)||!Number.isSafeInteger(endFrame)||!Number.isSafeInteger(frames)||frames<1)throw Error('The assembly plan has no positive whole-frame interval.');
 const count=Math.max(1,Math.ceil(frames/fps*sourceFps-1e-8)),cap=pick.sourceDuration>0?Math.floor(pick.sourceDuration*sourceFps+1e-6)-count:Infinity;
 if(!Number.isSafeInteger(count)||count<1||cap!==Infinity&&(!Number.isSafeInteger(cap)||cap<0))throw Error('The planned source cannot cover its playback interval.');
 const start=pick.kind==='photo'?0:Math.max(0,Math.min(Math.round(pick.startSeconds*sourceFps),cap));
 if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(start+count))throw Error('The planned source interval cannot be represented.');
 return {startFrame,endFrame,frames,sourceStart:start/sourceFps,sourceEnd:(start+count)/sourceFps,insertedFrames:Math.round(count/sourceFps*fps)};
}
async function miniAssemblyTiming(selects,cfg,resolveMedia){
const seenSources=new Set(),unique=[],timing=new Map();
for(const pick of cfg.picks)if(!seenSources.has(pick.rid)){seenSources.add(pick.rid);unique.push({rid:pick.rid,kind:pick.kind==='photo'?'image':'video'});}
for(let offset=0;offset<unique.length;offset+=50){
 const batch=unique.slice(offset,offset+50),facts=await resolveMedia(selects,cfg.projectId,batch,'Mini source timing check',{includeTiming:true,dimensions:false});
 if(facts.failed.length||facts.resolved.length!==batch.length||facts.resolved.some((row,i)=>row.rid!==batch[i].rid||row.alias!==batch[i].rid||!Number.isFinite(row.timing?.insertionFps)||row.timing.insertionFps<=0))throw Error('The planned source frame grid or identity could not be confirmed.');
 for(const row of facts.resolved)timing.set(row.rid,row.timing.insertionFps);
}
 return timing;
}

const cfg = __CONFIG__;
validateMiniAssemblyConfig(cfg);
const analysisSources=Object(cfg).analysisSources,sourceBindings=Object(cfg).sourceBindings;
const confirmAnalysisSources=async()=>{
 if(sourceBindings!==undefined)await confirmProjectSourcePaths(selects,cfg.projectId,sourceBindings);
 if(analysisSources!==undefined)await observeSourceFiles(selects.files,Array.isArray(analysisSources)?analysisSources.map(row=>row?.path):null,analysisSources);
};
await confirmAnalysisSources();

const p=selects.project(cfg.projectId),notes=[],W=1920,H=1080;
// Observe each source on its own native grid. Never infer an original clock
// from a resized output canvas or from the previous probe's first source.
const timing=await miniAssemblyTiming(selects,cfg,resolveTemplateMedia);
const same=(a,b)=>{
 if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
};
let d,fps,endFrame,bindings;
const all=()=>d.clips({trackScope:'all'}),meta=()=>d.meta();
const media=async()=> (await all()).filter(row=>['main','video','audio'].includes(row.trackKind));
const find=async binding=>{const rows=await all(),row=rows.find(c=>c.clipId===binding.clipId&&c.trackId===binding.trackId);if(!row||row.resourceId!==binding.resourceId||row.startFrame!==binding.startFrame||row.endFrame!==binding.endFrame)throw Error('The planned placement changed.');return row;};
const timeSame=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
const sourceMatches=async(binding,startSeconds)=>{
 const row=await find(binding),source=await d.clipSourceWindow(row),speed=row.playbackSpeed;
 if(speed&&(speed.numerator!==speed.denominator)||!source||!timeSame(source.startSeconds,startSeconds)||!timeSame(source.endSeconds,startSeconds+(row.endFrame-row.startFrame)/fps))throw Error('The planned source window changed during placement.');
};
const offset=f=>miniAssemblyOffset(cfg,f);
const lay=async(rate,final)=>{
 d=await p.createDraft({name:cfg.draftName});if((await media()).length)throw Error('The new assembly working Draft is not empty.');await d.setFrameSize({width:W,height:H});fps=rate||(await meta()).fps;
 if(!Number.isFinite(fps)||fps<=0)throw Error('The assembly frame grid is unavailable.');endFrame=0;bindings=[];
 for(let i=0;i<cfg.picks.length;i++){
  const pick=cfg.picks[i],intent=miniAssemblyShot(cfg,i,fps,timing.get(pick.rid)),targetEnd=intent.endFrame,want=intent.frames,before=await media();
  // Insert and verify a native-frame cover before trimming its declared surplus.
  await d.insertResource({resourceId:pick.rid,sourceRange:{startSeconds:intent.sourceStart,endSeconds:intent.sourceEnd}});
  const actualRate=(await meta()).fps;
  if(i===0&&actualRate!==fps){bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main'});if(final)throw Error('The source changed the assembly frame grid twice.');return actualRate;}
  const insertedFrames=intent.insertedFrames;
  if(!Number.isSafeInteger(insertedFrames)||insertedFrames<want)throw Error('The native source interval cannot cover the plan.');
  const added=bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main',startFrame:endFrame,endFrame:endFrame+insertedFrames});
  await sourceMatches(added,intent.sourceStart);
  if(insertedFrames>want){
   if(typeof d.trimBoundary!=='function')throw Error('Update Selects to trim a native interval to the planned cut.');
   await d.trimBoundary({frame:added.endFrame,side:'before',byFrames:want-insertedFrames});
  }
  const placed=bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main',startFrame:endFrame,endFrame:targetEnd});
  await sourceMatches(placed,intent.sourceStart);bindings.push({clipId:placed.clipId,trackId:placed.trackId,resourceId:placed.resourceId,startFrame:placed.startFrame,endFrame:placed.endFrame,sourceStart:intent.sourceStart});endFrame=targetEnd;
 }
 return null;
};
const real=await lay(null,false);if(real)await lay(real,true);
await d.setFrameSize({width:W,height:H});
const transforms=[];
for(const binding of bindings){
 const original=await d.clipTransform(await find(binding)),size=cfg.crops?.[binding.resourceId];
 const scale=size?.width>0&&size?.height>0?Math.max(W/size.width,H/size.height)/Math.min(W/size.width,H/size.height):1;
 const patch={scale:{x:scale,y:scale},position:{x:0,y:0}},expected={...original,...patch,positionKeys:[],scaleKeys:[]};
 if(!same(original,expected))await d.setClipTransform({clip:await find(binding),...patch});transforms.push({clipId:binding.clipId,trackId:binding.trackId,transform:expected});
}
await inspectImageTransforms(d,transforms,true);
let ambientClips=0;
if(cfg.clipSound==='ambient'){
 let failed=0;
 for(let i=0;i<bindings.length;i++){
  if(cfg.picks[i].kind==='photo')continue;const binding=bindings[i],db=cfg.ambientDb??-18;
  try{await d.setClipAudio({clip:await find(binding),volumeDb:db});const observed=await d.clipAudio(await find(binding));if(!same(observed.volumeDb,db)||observed.volumeKeys.length)throw Error('The sound level was not applied.');ambientClips++;}catch{failed++;}
 }
 if(failed)notes.push('the sound of '+failed+(failed===1?' clip':' clips')+' could not be lowered under the music');
}
let durationFrames=endFrame;
if(cfg.music){
 const tail=cfg.music.tailSeconds>0?Math.max(0,Math.round((cfg.boundaries.at(-1)+offset(fps)+cfg.music.tailSeconds)*fps)-endFrame):0;
 if(tail)await d.insertGap({seconds:tail/fps});durationFrames=endFrame+tail;
 const before=await media();
 await d.overlayResource({resource:p.resource(cfg.music.resourceId),over:await d.rangeAtFrames(0,durationFrames),sourceStartSeconds:cfg.music.sectionStart,playbackSpeed:{numerator:1,denominator:1}});
 const added=bindMediaPlacement(before,await media(),{resourceId:cfg.music.resourceId,trackKind:'audio',startFrame:0,endFrame:durationFrames}),prior=await d.clipAudio(added);
 const sourceStart=Math.round(cfg.music.sectionStart*fps)/fps;
 const audio=[{clipId:added.clipId,trackId:added.trackId,trackKind:'audio',resourceId:cfg.music.resourceId,startFrame:0,endFrame:durationFrames,audioSourceIndexes:null,settings:{volumeDb:prior.volumeDb,volumeKeys:prior.volumeKeys,fadeInSeconds:0,fadeOutSeconds:Math.min(durationFrames,Math.round(.12*fps))/fps},source:{startSeconds:sourceStart,endSeconds:sourceStart+durationFrames/fps,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true}}];
 const current=(await all()).find(row=>row.clipId===added.clipId&&row.trackId===added.trackId);
 await d.setClipAudio({clip:current,fadeInSeconds:0,fadeOutSeconds:audio[0].settings.fadeOutSeconds});
 await inspectImageAudio(d,audio,p,true);
}
// Bind the final working state to intent again, after every styling/sound edit.
const finalRows=await all(),main=finalRows.filter(row=>row.trackKind==='main'&&row.resourceId!=null),finalMeta=await meta();
if(main.length!==bindings.length||finalMeta.fps!==fps||finalMeta.durationFrames!==durationFrames||finalMeta.frameSize.width!==W||finalMeta.frameSize.height!==H)throw Error('The final assembly frame grid or placement differs from the plan.');
for(const binding of bindings)await sourceMatches(binding,binding.sourceStart);
await inspectImageTransforms(d,transforms,true);
await confirmAnalysisSources();
const beforeCommit=Object(cfg).__beforeCommit;if(typeof beforeCommit==='function')await beforeCommit(d);
const commit=await d.commitAll('Mini Vlog: assemble');
return {sequenceId:commit.createdDraftId,fps,totalFrames:endFrame,placed:bindings.length,ambientClips,notes};
