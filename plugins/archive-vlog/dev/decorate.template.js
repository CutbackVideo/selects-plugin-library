const cfg=__CONFIG__;
if(!(cfg.videoEnd>0))throw Error('decorate: cfg.videoEnd missing');
const d=selects.draft(cfg.sequenceId),programs=imageProgramsFeature(selects);
const TITLE_LABEL='Archive title',CREDIT_LABEL='Archived credit',LETTERBOX_LABEL='Letterbox reveal',LOOK_LABEL='Cinematic look',FADE_LABEL='Fade out',MOTION_LABEL='Photo motion',SHOT_MOTION_LABEL='Shot motion';
const OUR_EFFECTS=[LETTERBOX_LABEL,LOOK_LABEL,FADE_LABEL,MOTION_LABEL,SHOT_MOTION_LABEL];
const LABELS={motion:'Motion',motionStrength:'Motion strength',reveal:'Reveal',letterbox:'Letterbox reveal',look:'Look strength',warmth:'Warmth',fade:'Fade out',...(cfg.adjustLabels||{})};
const num=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)?v:fallback;
const photoIds=new Set(cfg.photos||[]),photoEffects=cfg.photoEffects===true;
const all=await d.clips({trackScope:'all'}),fps=(await d.meta()).fps;
if(!Number.isFinite(fps)||fps<=0)throw Error('decorate: the Draft frame grid is unavailable');
const main=(await d.clips({trackScope:'main'})).filter(c=>c.resourceId!==null).sort((a,b)=>a.startFrame-b.startFrame),mainIds=new Set(main.map(c=>c.clipId));
const visual=[...main,...all.filter(c=>c.trackKind==='video'&&c.resourceId!==null&&!mainIds.has(c.clipId))];
if(!main.length)throw Error('decorate: the Draft has no clips');
const graphics=[];
if(cfg.title)graphics.push({name:TITLE_LABEL,startFrame:main[0].startFrame,endFrame:main[0].endFrame,tsxCode:cfg.title.tsx,parameters:cfg.title.parameters,editableParameters:cfg.title.editableParameters});
if(cfg.credit&&main.length>1)graphics.push({name:CREDIT_LABEL,startFrame:main[1].startFrame,endFrame:main[1].endFrame,tsxCode:cfg.credit.tsx,parameters:cfg.credit.parameters,editableParameters:cfg.credit.editableParameters});
const intents=visual.map(c=>({clipId:c.clipId,trackId:c.trackId,effects:[]})),planOf=c=>intents.find(p=>p.clipId===c.clipId&&p.trackId===c.trackId);
const motion=cfg.motion||null,video=motion?.video||null;
const motionEditable=(value,strength)=>[{key:'motion',label:LABELS.motion,type:'select',defaultValue:value,options:motion.options},{key:'strength',label:LABELS.motionStrength,type:'number',defaultValue:strength,min:0,max:2,step:.1}];
let photoEffectsSkipped=0;
const lookOn=c=>{if(cfg.look){const strength=num(cfg.look.strength,.3),warmth=num(cfg.look.warmth,1);planOf(c).effects.push({name:LOOK_LABEL,tsxCode:cfg.look.tsx,parameters:{strength,warmth},editableParameters:[{key:'strength',label:LABELS.look,type:'number',defaultValue:strength,min:0,max:1,step:.05},{key:'warmth',label:LABELS.warmth,type:'number',defaultValue:warmth,min:0,max:2,step:.1}]});}};
for(let i=0;i<main.length;i++){
 const c=main[i],photo=photoIds.has(c.resourceId);
 if(photo&&!photoEffects){photoEffectsSkipped++;continue;}
 const holdSeconds=Math.round((c.endFrame-c.startFrame)/fps*1000)/1000;
 const m=photo?motion?.byRid?.[c.resourceId]:i>0?video?.byIndex?.[String(i)]:null;
 if(m){const strength=photo?motion.strength:num(video.strength,.5);planOf(c).effects.push({name:photo?MOTION_LABEL:SHOT_MOTION_LABEL,tsxCode:motion.tsx,parameters:{motion:m.motion,strength,direction:m.direction,axis:m.axis,cover:photo?m.cover||1:1,holdSeconds},editableParameters:motionEditable(m.motion,strength)});}
 if(i===0&&cfg.letterbox){const p=cfg.letterbox.parameters||{},revealSeconds=num(p.revealSeconds,num(p.revealEnd,2.35)-num(p.revealStart,.22));planOf(c).effects.push({name:LETTERBOX_LABEL,tsxCode:cfg.letterbox.tsx,parameters:{...p,revealSeconds,enabled:p.enabled!==false},editableParameters:[{key:'revealSeconds',label:LABELS.reveal,type:'number',defaultValue:Math.round(revealSeconds*100)/100,min:0,max:5,step:.05},{key:'enabled',label:LABELS.letterbox,type:'boolean',defaultValue:p.enabled!==false}]});}
 if(i===main.length-1&&cfg.fade){const fadeSeconds=num(cfg.fade.fadeSeconds,1);planOf(c).effects.push({name:FADE_LABEL,tsxCode:cfg.fade.tsx,parameters:{durationFrames:c.endFrame-c.startFrame,fadeSeconds},editableParameters:[{key:'fadeSeconds',label:LABELS.fade,type:'number',defaultValue:fadeSeconds,min:0,max:3,step:.1}]});}
 lookOn(c);
}
if(cfg.look)for(const c of visual.filter(c=>!mainIds.has(c.clipId))){if(photoIds.has(c.resourceId)&&!photoEffects){photoEffectsSkipped++;continue;}lookOn(c);}
const beforeNames=new Set((await d.motionGraphics()).map(g=>g.name));
let muted=false,muteKept=false;
const applied=await programs.reconcile(d,{graphicNames:[TITLE_LABEL,CREDIT_LABEL],effectNames:OUR_EFFECTS,graphics,clips:intents},async()=>{
 if(!cfg.mute)return;
 const rows=(await d.clips({trackScope:'main'})).filter(c=>c.resourceId!==null),videos=rows.filter(c=>!photoIds.has(c.resourceId));
 if(videos.every(c=>Array.isArray(c.audioSourceIndexes)&&!c.audioSourceIndexes.length)){muteKept=true;return;}
 const end=rows.reduce((a,c)=>Math.max(a,c.endFrame),0);let diff;
 try{diff=await d.setAudioTracks({target:await d.rangeAtFrames(0,end),audioSourceIndexes:[]});}catch(e){throw Error('Could not mute the clips\' own sound: '+(e?.message||e));}
 if(diff?.opCount===0)muteKept=true;else muted=true;
});
const added=name=>applied.effects[name].added;
const effects=added(LOOK_LABEL),letterbox=added(LETTERBOX_LABEL),fades=added(FADE_LABEL),motions=added(MOTION_LABEL),videoMotions=added(SHOT_MOTION_LABEL),effectsKept=OUR_EFFECTS.reduce((n,name)=>n+applied.effects[name].kept,0);
const titleAdded=!!cfg.title&&!beforeNames.has(TITLE_LABEL),creditAdded=!!cfg.credit&&main.length>1&&!beforeNames.has(CREDIT_LABEL),committed=muted||applied.graphicsAdded>0||effects+letterbox+fades+motions+videoMotions>0;
if(typeof cfg.__beforeCommit==='function')await cfg.__beforeCommit(d,committed);
if(committed)await d.commitAll('Archive Vlog: title and look');
return {titleAdded,creditAdded,letterbox,fades,effects,effectsKept,motions,videoMotions,muted,muteKept,committed,alreadyDone:!committed,photoEffectsSkipped};
