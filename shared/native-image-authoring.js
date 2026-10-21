// Prepare editable Image occurrences in one working copy. The caller owns its
// trusted Project/Draft handle and the sole final commit.
async function placeWorkingCopyImages(selects,projectId,draft,plan,sources,items,sourceFacts){
 const project=selects.project(projectId),meta=await draft.meta();
 if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize.width!==plan.canvas.width||meta.frameSize.height!==plan.canvas.height)throw Error('The Draft frame grid differs from the plan.');
 const fresh=await sourceFacts(selects,projectId,sources);
 if(fresh.length!==sources.length||fresh.some((source,index)=>source.resourceId!==sources[index].resourceId||source.width!==sources[index].width||source.height!==sources[index].height))throw Error('A selected Image changed. Prepare the Images again.');
 const placements=[];
 for(const item of items){
  const source=fresh[item.source];if(!source)throw Error('An Image occurrence has no source.');
  const before=new Set((await draft.clips({trackScope:'all'})).map(clip=>clip.clipId));
  await draft.overlayResource({resource:project.resource(source.resourceId),over:await draft.rangeAtFrames(item.startFrame,item.endFrame)});
  const added=(await draft.clips({trackScope:'all'})).filter(clip=>!before.has(clip.clipId));
  if(added.length!==1||added[0].resourceId!==source.resourceId||added[0].startFrame!==item.startFrame||added[0].endFrame!==item.endFrame)throw Error('The Image interval changed during placement.');
  placements.push({...item,clipId:added[0].clipId,trackId:added[0].trackId,resourceId:source.resourceId});
 }
 if((await draft.meta()).durationFrames!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
 return {placements,photos:fresh.map(source=>({width:source.width,height:source.height}))};
}
async function authorAtomicImageDraft(selects,config,finish,placeImages,sourceFacts){
 let stage='read';
 try{
  const {projectId,plan,sources,items,partialDraftId}=config,project=selects.project(projectId);
  if(partialDraftId&&!(await project.meta()).draftIds.includes(partialDraftId))throw Error('Partial Draft is not in this Project.');
  const draft=partialDraftId?selects.draft(partialDraftId):await project.createDraft({name:config.name});
  if(!partialDraftId){
   stage='working copy';
   if(config.main){await draft.insertResource({resourceId:config.main.resourceId,sourceRange:{startSeconds:config.main.startSeconds,endSeconds:config.main.startSeconds+plan.durationFrames/plan.fps}});}
   else await draft.insertGap({seconds:plan.durationFrames/plan.fps});
   await draft.setFrameSize(plan.canvas);
  }else{
   const rows=await draft.clips({trackScope:'all'});
   if(rows.some(row=>row.trackKind!=='main'||(config.main?row.resourceId!==config.main.resourceId:Boolean(row.resourceId)))||config.main&&rows.length!==1)throw Error('Partial Draft is not empty; inspect it before retrying.');
  }
  stage='placement';const native=await placeImages(selects,projectId,draft,plan,sources,items,sourceFacts);
  stage='finish';const result=await finish(selects,config,draft,native);
  const clips=native.placements.map(({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame})=>({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame}));
  return {...result,fps:plan.fps,durationFrames:plan.durationFrames,frameSize:plan.canvas,clips};
 }catch(error){return {status:stage==='finish'?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:config.partialDraftId||null};}
}
function buildAtomicImageDraftScript(config,finishSource){
 return `return await (${authorAtomicImageDraft.toString()})(selects,${JSON.stringify(config)},${finishSource},${placeWorkingCopyImages.toString()},${nativeImageSources.toString()});`;
}
async function verifyAtomicImageDraft(sdk,projectId,result){
 const {draftId,fps,durationFrames,frameSize,clips}=result,expected={draftId,fps,durationFrames,frameSize,clips};
 const response=await sdk.runScript({summary:'Verify complete saved Image Draft',allowCommit:false,script:`const expected=${JSON.stringify(expected)};const project=selects.project(${JSON.stringify(projectId)});if(!(await project.meta()).draftIds.includes(expected.draftId))throw Error('Saved Draft is not in this Project');const draft=selects.draft(expected.draftId),meta=await draft.meta(),rows=await draft.clips({trackScope:'all'});if(meta.fps!==expected.fps||meta.durationFrames!==expected.durationFrames||meta.frameSize.width!==expected.frameSize.width||meta.frameSize.height!==expected.frameSize.height)throw Error('Saved Draft frame grid could not be confirmed');for(const wanted of expected.clips){const actual=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);if(!actual||actual.resourceId!==wanted.resourceId||actual.startFrame!==wanted.startFrame||actual.endFrame!==wanted.endFrame)throw Error('Saved Image placement could not be confirmed');}return {verified:true};`});
 if(response.isError||response.result?.verified!==true)throw Object.assign(Error(response.output||'The saved Draft could not be confirmed. Inspect it before retrying.'),{code:'IMAGE_SAVE_UNVERIFIED',draftId:result.draftId});
 return result;
}
async function readImageDraftFps(sdk,projectId,draftId=null){
 const response=await sdk.runScript({summary:'Read the Project frame rate',allowCommit:false,script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(draftId)};if(id&&!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=id?selects.draft(id):await p.createDraft({name:'Image frame rate check'});return {fps:(await d.meta()).fps};`});
 if(response.isError||!Number.isFinite(response.result?.fps)||response.result.fps<=0)throw Error('Could not read the Project frame rate.');
 return response.result.fps;
}
