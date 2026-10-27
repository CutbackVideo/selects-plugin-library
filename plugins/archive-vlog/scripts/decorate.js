// @template-decoration 1
// @template-decoration-intent 1
// Generated from the existing program owner and Archive decoration policy.
function templateObservedSource(observation,row){
 const invalid=()=>{throw Error('Saved source target could not be confirmed.');};
 if(!Array.isArray(observation?.clips)||!row||!Number.isSafeInteger(row.clipId)||typeof row.trackId!=='string')invalid();
 const found=observation.clips.filter(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
 if(found.length!==1)invalid();
 const actual=found[0],source=actual.source;
 if(actual.trackKind!==row.trackKind||actual.startFrame!==row.startFrame||actual.endFrame!==row.endFrame||source?.clipId!==row.clipId||!Number.isFinite(source.startSeconds)||source.startSeconds<0||!Number.isFinite(source.endSeconds)||source.endSeconds<=source.startSeconds)invalid();
 return {clipId:row.clipId,startSeconds:source.startSeconds,endSeconds:source.endSeconds};
}
function imageProgramsFeature(selects,config=null,format=null){
 const issue=message=>Object.assign(Error(message),{code:'IMAGE_PROGRAM_INVALID',publicMessage:message});
 const guarded=fn=>async(...args)=>{try{return await fn(...args);}catch(cause){if(cause?.code==='IMAGE_PROGRAM_INVALID')throw cause;throw Object.assign(issue('Image program state could not be confirmed.'),{cause});}};
 const same=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 const source=program=>program.shader?{shader:program.shader}:{tsxCode:program.tsxCode};
 const validSource=program=>program&&((typeof program.tsxCode==='string'&&program.tsxCode.length>0&&!program.shader)||(!program.tsxCode&&program.shader?.graph?.schema==='Cutback.ShaderEffect.1'));
 const normalized=program=>({...source(program),editableParameters:program.editableParameters,parameters:{...Object.fromEntries(program.editableParameters.map(d=>[d.key,d.defaultValue])),...program.parameters}});
 const matches=(actual,wanted)=>actual&&same(source(actual),source(wanted))&&same(actual.editableParameters,wanted.editableParameters)&&same(actual.parameters,wanted.parameters);
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
   if(!validSource(program)||!program.parameters||typeof program.parameters!=='object'||Array.isArray(program.parameters)||!Array.isArray(program.editableParameters)||program.editableParameters.length>256||new Set(program.editableParameters.map(d=>d?.key)).size!==program.editableParameters.length)throw issue('Program source or controls are incomplete.');
   return normalized(program);
  };
  const graphicPlans=intent.graphics.map(g=>{
   if(!g||typeof g.tsxCode!=='string'||g.shader||!intent.graphicNames.includes(g.name)||!Number.isSafeInteger(g.startFrame)||g.startFrame<0||!Number.isSafeInteger(g.endFrame)||g.endFrame<=g.startFrame)throw issue('Graphic intent has an invalid interval.');
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
    await draft.addVideoEffect({clip:await rowFor(c),label:e.name,...source(e.program),parameters:e.program.parameters,editableParameters:e.program.editableParameters});effects[e.name].added++;
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
  const pack=program=>{const p=normalized(program);const value=p.shader||p.tsxCode;let source=sources.findIndex(s=>same(s,value));if(source<0){source=sources.length;sources.push(value);}return {source,parameters:p.parameters,editableParameters:p.editableParameters};};
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
 const preset=async (id,overrides={})=>{
  if(!config)throw issue('Effect preset preparation requires an authoring target.');
  const key=JSON.stringify([id,overrides]);
  if(presets.has(key))return presets.get(key);
  const definition=await selects.effectPresets.get(id);
  if(definition?.id!==id||definition.kind!=='effect'||typeof definition.label!=='string'||!Array.isArray(definition.editableParameters)||!definition.parameters)throw issue('Effect preset definition could not be confirmed.');
  const parameters={...definition.parameters,...overrides};
  // The public preset definition omits effect TSX. Resolve a canonical program
  // in an isolated unsaved reference, never by adopting the target's output.
  const project=selects.project(config.projectId),probe=await project.createDraft({name:'Image preset reference'});
  await probe.insertGap({seconds:config.plan.durationFrames/config.plan.fps});await probe.setFrameSize(config.plan.canvas);
  await probe.overlayResource({resource:project.resource(config.sources[0].resourceId),over:await probe.rangeAtFrames(0,config.plan.durationFrames)});
  if(!('videoEffects' in probe)||!('videoEffectProgram' in probe))throw issue('Update Selects to verify effect presets.');
  let clips=(await probe.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');if(clips.length!==1)throw issue('Effect preset reference could not be confirmed.');
  const applied=await probe.applyEffectPreset({clip:clips[0],presetId:id,parameters});
  if(applied?.presetId!==id)throw issue('Effect preset identity could not be confirmed.');
  clips=(await probe.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');
  const effects=await probe.videoEffects(clips[0]);if(effects.length!==1||effects[0].enabled!==true||effects[0].name!==definition.label)throw issue('Effect preset reference stack could not be confirmed.');
  const program=await probe.videoEffectProgram(effects[0]),expected=normalized({...source(program||{}),parameters,editableParameters:definition.editableParameters});
  if(!validSource(program)||!matches(program,expected))throw issue('Effect preset reference program could not be confirmed.');
  const value={name:definition.label,...expected};presets.set(key,value);return value;
 };
 const confirm=details=>{
  if(!config||!format)throw issue('Program receipt confirmation requires an authoring target.');
  const result={draftId:config.partialDraftId||'x'.repeat(120),fps:config.plan.fps,durationFrames:config.plan.durationFrames,frameSize:config.plan.canvas,clips:config.clips,...details};
  // Reserve more than a UUID for the post-commit identity. Check the actual
  // journal envelope and ASCII encoding before the only persistence boundary.
  try{format(config.runReceipt?{...JSON.parse(config.runReceipt.expectedText),status:'saved',result}:result);}catch(cause){throw Object.assign(issue('The Image program receipt exceeds its limit or could not be prepared.'),{cause});}
 };
 const verify=(draft,receipt)=>inspect(draft,receipt.clips.map(c=>{const expand=p=>({...typeof receipt.sources[p.source]==='string'?{tsxCode:receipt.sources[p.source]}:{shader:receipt.sources[p.source]},parameters:p.parameters,editableParameters:p.editableParameters});return {...c,effects:c.effects.map(e=>({name:e.name,...expand(e)})),graphic:c.graphic?expand(c.graphic):null};}));
 return {inspect:guarded(inspect),preset:guarded(preset),confirm,verify:guarded(verify),reconcile};
}
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
