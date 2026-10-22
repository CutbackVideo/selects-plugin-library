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
 const source=await d.clipSourceWindow(row),speed=row.playbackSpeed;
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
 await inspectImageAudio(d,[{clipId:row.clipId,trackId:row.trackId,trackKind:'audio',resourceId:cfg.music.resourceId,startFrame:0,endFrame:durationFrames,audioSourceIndexes:null,settings:{volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:Math.min(durationFrames,Math.round((cfg.musicFadeOut??1)*fps))/fps},source:{startSeconds:start,endSeconds:start+durationFrames/fps,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true}}],p,true);
}else if(audio.length)refuse('The saved assembly has unexpected music.');
return {verified:true,draftId:input.draftId,mainEnd:endFrame,fps,durationFrames};
}catch(error){return {verified:false,status:['ARCHIVE_PLAN_MISMATCH','IMAGE_AUDIO_MISMATCH'].includes(error?.code)?'mismatch':'unavailable',detail:String(error?.message||'The saved assembly could not be read.').slice(0,300)};}
})();
