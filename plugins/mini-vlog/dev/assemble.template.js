const cfg = __CONFIG__;
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
validateMiniAssemblyConfig(cfg);
const p=selects.project(cfg.projectId),notes=[],W=1920,H=1080;
// Observe each source on its own native grid. Never infer an original clock
// from a resized output canvas or from the previous probe's first source.
const seenSources=new Set(),unique=[],timing=new Map();
for(const pick of cfg.picks)if(!seenSources.has(pick.rid)){seenSources.add(pick.rid);unique.push({rid:pick.rid,kind:pick.kind==='photo'?'image':'video'});}
for(let offset=0;offset<unique.length;offset+=50){
 const batch=unique.slice(offset,offset+50),facts=await resolveTemplateMedia(selects,cfg.projectId,batch,'Mini source timing check',{includeTiming:true,dimensions:false});
 if(facts.failed.length||facts.resolved.length!==batch.length||facts.resolved.some((row,i)=>row.rid!==batch[i].rid||row.alias!==batch[i].rid||!Number.isFinite(row.timing?.insertionFps)||row.timing.insertionFps<=0))throw Error('The planned source frame grid or identity could not be confirmed.');
 for(const row of facts.resolved)timing.set(row.rid,row.timing.insertionFps);
}
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
const offset=f=>cfg.music&&!cfg.music.referenceCuts?cfg.music.sectionStart-Math.round(cfg.music.sectionStart*f)/f:0;
const lay=async(rate,final)=>{
 d=await p.createDraft({name:cfg.draftName});if((await media()).length)throw Error('The new assembly working Draft is not empty.');await d.setFrameSize({width:W,height:H});fps=rate||(await meta()).fps;
 if(!Number.isFinite(fps)||fps<=0)throw Error('The assembly frame grid is unavailable.');endFrame=0;bindings=[];
 for(let i=0;i<cfg.picks.length;i++){
  const pick=cfg.picks[i],sourceFps=timing.get(pick.rid),targetEnd=Math.round((cfg.boundaries[i+1]+offset(fps))*fps),want=targetEnd-endFrame;
  if(!Number.isSafeInteger(targetEnd)||!Number.isSafeInteger(want)||want<1)throw Error('The assembly plan has no positive whole-frame interval.');
  // Insert a native-frame-aligned cover of the intended playback interval.
  // Then explicitly trim that known conformance surplus on the Draft grid;
  // never retime footage or trim an unexpected/unchecked insertion.
  const count=Math.max(1,Math.ceil(want/fps*sourceFps-1e-8)),cap=pick.sourceDuration>0?Math.floor(pick.sourceDuration*sourceFps+1e-6)-count:Infinity;
  if(!Number.isSafeInteger(count)||count<1||cap!==Infinity&&(!Number.isSafeInteger(cap)||cap<0))throw Error('The planned source cannot cover its playback interval.');
  const start=pick.kind==='photo'?0:Math.max(0,Math.min(Math.round(pick.startSeconds*sourceFps),cap)),before=await media();
  if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(start+count))throw Error('The planned source interval cannot be represented.');
  await d.insertResource({resourceId:pick.rid,sourceRange:{startSeconds:start/sourceFps,endSeconds:(start+count)/sourceFps}});
  const actualRate=(await meta()).fps;
  if(i===0&&actualRate!==fps){bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main'});if(final)throw Error('The source changed the assembly frame grid twice.');return actualRate;}
  const insertedFrames=Math.round(count/sourceFps*fps);
  if(!Number.isSafeInteger(insertedFrames)||insertedFrames<want)throw Error('The native source interval cannot cover the plan.');
  const added=bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main',startFrame:endFrame,endFrame:endFrame+insertedFrames});
  await sourceMatches(added,start/sourceFps);
  if(insertedFrames>want){
   if(typeof d.trimBoundary!=='function')throw Error('Update Selects to trim a native interval to the planned cut.');
   await d.trimBoundary({frame:added.endFrame,side:'before',byFrames:want-insertedFrames});
  }
  const placed=bindMediaPlacement(before,await media(),{resourceId:pick.rid,trackKind:'main',startFrame:endFrame,endFrame:targetEnd});
  await sourceMatches(placed,start/sourceFps);bindings.push({clipId:placed.clipId,trackId:placed.trackId,resourceId:placed.resourceId,startFrame:placed.startFrame,endFrame:placed.endFrame,sourceStart:start/sourceFps});endFrame=targetEnd;
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
const beforeCommit=Object(cfg).__beforeCommit;if(typeof beforeCommit==='function')await beforeCommit(d);
const commit=await d.commitAll('Mini Vlog: assemble');
return {sequenceId:commit.createdDraftId,fps,totalFrames:endFrame,placed:bindings.length,ambientClips,notes};
