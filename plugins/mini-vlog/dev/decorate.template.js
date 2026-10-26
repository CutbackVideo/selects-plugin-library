const cfg = __CONFIG__;
if (!(cfg.videoEnd > 0)) throw Error('decorate: cfg.videoEnd missing');
const d = selects.draft(cfg.sequenceId), programs = imageProgramsFeature(selects);
const TITLE_LABEL = 'Mini vlog title', SOFT_LABEL = 'Soft look', MOTION_LABEL = 'Photo motion', PUNCH_LABEL = 'Beat punch';
const LABELS = { motion: 'Motion', motionStrength: 'Motion strength', punch: 'Punch', softness: 'Softness', ...(cfg.labels || {}) };
const photoIds = new Set(cfg.photos || []), photoEffects = cfg.photoEffects === true;
const all = await d.clips({trackScope:'all'}), fps = (await d.meta()).fps;
if (!Number.isFinite(fps) || fps <= 0) throw Error('decorate: the Draft frame rate is unavailable');
const visual = all.filter(c => (c.trackKind === 'main' || c.trackKind === 'video') && c.resourceId !== null);
const main = visual.filter(c => c.trackKind === 'main').sort((a,b) => a.startFrame-b.startFrame);
const intents = visual.map(clip => ({clipId:clip.clipId,trackId:clip.trackId,effects:[]}));
const planOf = clip => intents.find(row => row.clipId === clip.clipId && row.trackId === clip.trackId);
let photoEffectsSkipped = 0, punchSkipped = 0;
if (cfg.motion && photoEffects) {
  const byRid = cfg.motion.byRid || {};
  for (const clip of main.filter(c => photoIds.has(c.resourceId) && byRid[c.resourceId])) {
    const m = byRid[clip.resourceId], holdSeconds = Math.round((clip.endFrame-clip.startFrame)/fps*1000)/1000;
    planOf(clip).effects.push({name:MOTION_LABEL,tsxCode:cfg.motion.tsx,
      parameters:{motion:m.motion,strength:cfg.motion.strength,direction:m.direction,axis:m.axis,cover:m.cover||1,holdSeconds},
      editableParameters:[{key:'motion',label:LABELS.motion,type:'select',defaultValue:m.motion,options:cfg.motion.options},
        {key:'strength',label:LABELS.motionStrength,type:'number',defaultValue:cfg.motion.strength,min:0,max:2,step:.1}]});
  }
}
if (cfg.punch) {
  const picks = cfg.punch.picks || [], beat = Number(cfg.punch.beatFrames) || 0;
  const frames = (cfg.punch.punchFrames || []).filter(f => typeof f === 'number' && isFinite(f));
  for (let i=0;i<main.length;i++) {
    const clip=main[i],pick=picks[i];
    if (!pick || pick.rid !== clip.resourceId) { punchSkipped++;continue; }
    if (pick.kind === 'photo' || photoIds.has(clip.resourceId)) continue;
    const want=clip.endFrame-clip.startFrame;
    const source=templateObservedSource(cfg.__sources,clip);
    if(!source||!Number.isFinite(source.startSeconds)||source.startSeconds<0)throw Error('The placed source window is unavailable for Beat punch.');
    const sourceStartFrame=Math.round(source.startSeconds*fps);
    const punches=frames.map(f=>f-clip.startFrame).filter(t=>t>-.5*beat&&t<want);
    planOf(clip).effects.push({name:PUNCH_LABEL,tsxCode:cfg.punch.tsx,
      parameters:{strength:cfg.punch.strength,push:cfg.punch.push,punches,beatFrames:beat,sourceStartFrame,durationFrames:want},
      editableParameters:[{key:'strength',label:LABELS.punch,type:'number',defaultValue:cfg.punch.strength,min:0,max:1,step:.05}]});
  }
}
if (cfg.soft) for (const clip of visual) {
  if (photoIds.has(clip.resourceId) && !photoEffects) { photoEffectsSkipped++;continue; }
  planOf(clip).effects.push({name:SOFT_LABEL,tsxCode:cfg.soft.tsx,parameters:{strength:cfg.soft.strength},
    editableParameters:[{key:'strength',label:LABELS.softness,type:'number',defaultValue:cfg.soft.strength,min:0,max:1,step:.05}]});
}
let muted=false,muteKept=false;
const applied=await programs.reconcile(d,{
  graphicNames:[TITLE_LABEL],effectNames:[MOTION_LABEL,PUNCH_LABEL,SOFT_LABEL],
  graphics:[{name:TITLE_LABEL,startFrame:0,endFrame:cfg.videoEnd,tsxCode:cfg.title.tsx,parameters:cfg.title.parameters,editableParameters:cfg.title.editableParameters}],clips:intents,
},async()=>{
  if (!cfg.mute) return;
  const rows=(await d.clips({trackScope:'main'})).filter(c=>c.resourceId!==null),videos=rows.filter(c=>!photoIds.has(c.resourceId));
  if (videos.every(c=>Array.isArray(c.audioSourceIndexes)&&c.audioSourceIndexes.length===0)) { muteKept=true;return; }
  const end=rows.reduce((a,c)=>Math.max(a,c.endFrame),0);
  let diff;
  try { diff=await d.setAudioTracks({target:await d.rangeAtFrames(0,end),audioSourceIndexes:[]}); }
  catch(e) { throw Error('Could not mute the clips\' own sound: '+(e&&e.message||e)); }
  if (diff&&diff.opCount===0) muteKept=true;else muted=true;
});
const effects=applied.effects[SOFT_LABEL].added,effectsKept=applied.effects[SOFT_LABEL].kept;
const motions=applied.effects[MOTION_LABEL].added,motionsKept=applied.effects[MOTION_LABEL].kept;
const punchAdded=applied.effects[PUNCH_LABEL].added,punchKept=applied.effects[PUNCH_LABEL].kept;
const hasTitle=applied.graphicsKept===1;
const committed=muted||!hasTitle||effects>0||motions>0||punchAdded>0;
if(typeof cfg.__beforeCommit==='function')await cfg.__beforeCommit(d,committed);
if(committed)await d.commitAll('Mini Vlog: title and look');
const out={title:true,titleAdded:!hasTitle,effects,effectsKept,muted,muteKept,committed,alreadyDone:!committed,
  ...(cfg.punch?{punch:{added:punchAdded,kept:punchKept,skipped:punchSkipped}}:{})};
return photoIds.size?{...out,photos:{motions,motionsKept,effectsSkipped:photoEffectsSkipped}}:out;
