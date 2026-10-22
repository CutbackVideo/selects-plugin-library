// Plugin-private saved-state observation. Uses existing Panel read methods only.
// A working copy inside run_script is deliberately not observable here.
async function readTemplateDraftSources(sdk,projectId,draftId,libraryId=null){
 const fail=message=>{throw Object.assign(Error(message),{code:'TEMPLATE_SOURCE_UNVERIFIED'});};
 if(typeof sdk?.call!=='function'||typeof projectId!=='string'||!projectId||typeof draftId!=='string'||!draftId)fail('Saved Draft source target is invalid.');
 const core=await sdk.call('getDraftCore',draftId),owner=core?.owner,sequence=core?.sequenceJson;
 if(owner?.projectId!==projectId||typeof owner.libraryId!=='string'||!owner.libraryId||libraryId!==null&&owner.libraryId!==libraryId||sequence?.id!==draftId||sequence.libraryId!==undefined&&sequence.libraryId!==owner.libraryId||core.isEditedDraft===false)fail('Saved Draft source owner could not be confirmed.');
 // The complete saved JSON also witnesses non-source edits across independent reads.
 const witness=JSON.stringify(sequence);
 if(typeof witness!=='string'||witness.length>8388608)fail('Saved Draft observation exceeds its input limit.');
 let snapshot,missingMethod=false;
 try{snapshot=await sdk.call('getDraftMediaSnapshot',projectId,draftId);}
 catch(error){
  // Compatibility only for an absent read method. Real read failures stay failures.
  if(!/^(?:Panels cannot call ["']getDraftMediaSnapshot["']|No such method: getDraftMediaSnapshot|Unknown (?:method|read method):? getDraftMediaSnapshot)/.test(String(error?.message||error)))throw error;
  missingMethod=true;
 }
 let clips=[],revision;
 if(!missingMethod){
  if(typeof snapshot?.revision!=='string'||!snapshot.revision||!Number.isFinite(snapshot.fps)||snapshot.fps<=0||!Array.isArray(snapshot.clips)||snapshot.clips.length>1000||snapshot.clips.some(row=>!row||typeof row!=='object'))fail('Saved Draft media observation is incomplete.');
  clips=snapshot.clips.filter(row=>row?.resourceId!=null).map(row=>({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,source:{clipId:row.clipId,startSeconds:row.sourceStartSeconds,endSeconds:row.sourceEndSeconds},playbackSpeed:row.playbackSpeed}));
  revision=JSON.stringify({core:witness,media:snapshot.revision,clips});
 }else{
  // getDraftCore is an existing public read. Interpret only documented persisted
  // Clip.1 (frames) / Clip.2 (ticks) ranges, never application/user database files.
  if(sequence.schema!=='Cutback.Timeline.1'||!Array.isArray(sequence.tracks?.children))fail('Saved Draft schema is unsupported.');
  const fps=sequence.frameRate;
  if(!Number.isFinite(fps)||fps<=0||fps>1000)fail('Saved Draft frame grid is invalid.');
  const rate=sequence.frameRateRatio;
  let tickFrame;
  if(rate!==undefined){
   if(!Number.isSafeInteger(rate?.numerator)||rate.numerator<=0||!Number.isSafeInteger(rate.denominator)||rate.denominator<=0||Math.abs(fps-rate.numerator/rate.denominator)>8*Number.EPSILON*Math.max(1,fps))fail('Saved Draft rational frame grid is invalid.');
   tickFrame=Number((705600000n*BigInt(rate.denominator)+BigInt(Math.floor(rate.numerator/2)))/BigInt(rate.numerator));
  }else tickFrame=Math.round(705600000/fps);
  if(!Number.isSafeInteger(tickFrame)||tickFrame<1)fail('Saved Draft Tick grid is invalid.');
  for(const track of sequence.tracks.children){
   if(!track||typeof track.id!=='string'||!track.id||!Array.isArray(track.children))fail('Saved Draft track is invalid.');
   const kind={Main:'main',Video:'video',Audio:'audio'}[track.kind];
   if(!kind)continue;
   let offset=0;
   for(const row of track.children){
    const current=row?.schema==='Cutback.Clip.2'||row?.schema==='Cutback.Gap.2',legacy=row?.schema==='Cutback.Clip.1'||row?.schema==='Cutback.Gap.1';
    if(!current&&!legacy)fail('Saved Draft source schema is unsupported.');
    const start=row.sourceRange?.startTime,duration=row.sourceRange?.duration;
    if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(duration)||duration<0||row.cut!==undefined&&typeof row.cut!=='boolean')fail('Saved Draft source range is invalid.');
    const frames=current?duration/tickFrame:duration;
    if(!Number.isSafeInteger(frames)||frames<0)fail('Saved Draft source is not aligned to its frame grid.');
    if(row.cut)continue;
    const resourceId=row.mediaReferences?.defaultMedia?.id;
    if(resourceId!=null){
     if(!Number.isSafeInteger(row.id)||row.id<0||frames<1||typeof resourceId!=='string'||!resourceId)fail('Saved Draft source identity is invalid.');
     const policy=row.timing??{playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true};
     const n=policy.playbackSpeed?.numerator,d=policy.playbackSpeed?.denominator,r=policy.sourceTickRoundingRemainder??0;
     if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(d)||d<1||!Number.isSafeInteger(r)||r<0||r>=d||typeof policy.preserveAudioPitch!=='boolean'||legacy&&(n!==1||d!==1||r!==0))fail('Saved Draft timing policy is unsupported.');
     // Match ClipTiming's nonnegative round-half-up mapping, including its origin
     // remainder. BigInt avoids losing a source Tick in large rational products.
     const round=(a,b)=>(2n*a+b)/(2n*b);
     const delta=current?Number(round(BigInt(r)+BigInt(n)*BigInt(duration),BigInt(d))-round(BigInt(r),BigInt(d))):duration;
     if(!Number.isSafeInteger(delta)||!Number.isSafeInteger(start+delta))fail('Saved Draft source time exceeds its exact range.');
     const unit=current?705600000:fps;
     clips.push({clipId:row.id,trackId:track.id,trackKind:kind,resourceId,startFrame:offset,endFrame:offset+frames,source:{clipId:row.id,startSeconds:start/unit,endSeconds:(start+delta)/unit},playbackSpeed:n/d});
    }
    offset+=frames;
    if(!Number.isSafeInteger(offset))fail('Saved Draft placement exceeds its exact range.');
   }
  }
  revision=witness;
 }
 const ids=new Set();
 if(clips.length>1000)fail('Saved Draft contains too many media clips.');
 for(const row of clips){
  const key=JSON.stringify([row.trackId,row.clipId]);
  if(ids.has(key)||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||!['main','video','audio'].includes(row.trackKind)||typeof row.resourceId!=='string'||!row.resourceId||!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame||!Number.isFinite(row.source.startSeconds)||row.source.startSeconds<0||!Number.isFinite(row.source.endSeconds)||row.source.endSeconds<=row.source.startSeconds||!Number.isFinite(row.playbackSpeed)||row.playbackSpeed<=0)fail('Saved Draft source observation is invalid.');
  ids.add(key);
 }
 // This function runs in the panel, where Web Crypto already backs durable run
 // receipts. Keep the revision witness bounded when it is passed into scripts.
 if(!globalThis.crypto?.subtle||typeof TextEncoder!=='function')fail('Saved Draft revision hashing is unavailable.');
 revision=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(revision))),n=>n.toString(16).padStart(2,'0')).join('');
 return {revision,owner:{projectId,libraryId:owner.libraryId},clips};
}

// SDK-safe projection of a caller-supplied *actual saved* observation. Resource
// aliases are checked by the existing SDK structural verifier, not guessed here.
function templateObservedSource(observation,row){
 const invalid=()=>{throw Error('Saved source target could not be confirmed.');};
 if(!Array.isArray(observation?.clips)||!row||!Number.isSafeInteger(row.clipId)||typeof row.trackId!=='string')invalid();
 const found=observation.clips.filter(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
 if(found.length!==1)invalid();
 const actual=found[0],source=actual.source;
 if(actual.trackKind!==row.trackKind||actual.startFrame!==row.startFrame||actual.endFrame!==row.endFrame||source?.clipId!==row.clipId||!Number.isFinite(source.startSeconds)||source.startSeconds<0||!Number.isFinite(source.endSeconds)||source.endSeconds<=source.startSeconds)invalid();
 return {clipId:row.clipId,startSeconds:source.startSeconds,endSeconds:source.endSeconds};
}

export {readTemplateDraftSources,templateObservedSource};
