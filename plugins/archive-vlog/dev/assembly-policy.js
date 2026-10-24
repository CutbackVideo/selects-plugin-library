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
