// @name Travel Beat Vlog
// @name:de Travel Beat Vlog
// @name:en Travel Beat Vlog
// @name:es Travel Beat Vlog
// @name:fr Travel Beat Vlog
// @name:it Travel Beat Vlog
// @name:ja Travel Beat Vlog
// @name:ko Travel Beat Vlog
// @name:pt Travel Beat Vlog
// @name:tr Travel Beat Vlog
// @name:zh Travel Beat Vlog
// @icon video
import React from 'react';

const VIDEO_SLOTS=Array.from({length:26},(_,i)=>'V'+(i+1));
const SLOT_HINTS={V1:'Montage 1',V11:'Montage 1 (last)',V12:'Long shot under grid 1',V13:'Grid 1 top-left',V14:'Grid 1 top-right',V15:'Grid 1 bottom-left',V16:'Grid 1 bottom-right',V17:'Long shot under grid 2',V18:'Grid 2 top-left',V19:'Grid 2 top-right',V20:'Grid 2 bottom-left',V21:'Grid 2 bottom-right',V22:'Long shot',V23:'Short shot',V24:'Montage 2',V25:'Montage 2',V26:'Ending (fades out)'};
const BUILDER='node "$SELECTS_USER_SKILLS_ROOT/travel-beat-vlog/build-script.mjs" ';
const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path,width:n.frameSize?.width??null,height:n.frameSize?.height??null,duration:n.durationSeconds??null}));`;
const encode=value=>{
 const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
async function inventory(sdk,projectId,summary){
 const r=await sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false});
 if(r.isError||!Array.isArray(r.result))throw Error(r.output||'Could not read the Project files.');
 return r.result;
}
async function builder(sdk,request,summary,maxOutputBytes=49152,timeoutMs=60000){
 const r=await sdk.runShell({summary,command:BUILDER+encode(request),timeoutMs,maxOutputBytes:Math.min(maxOutputBytes,49152)});
 if(r.isError||r.exitCode!==0||!r.stdout)throw Error(r.stderr||r.output||summary+' failed.');
 return r.stdout;
}
async function script(sdk,source,summary,allowCommit,timeoutSeconds=30){
 const r=await sdk.runScript({script:source,summary,allowCommit,timeoutSeconds});
 if(r.isError)throw Error(r.output||summary+' failed.');
 return r.result;
}

// The editor's existing Image placement path is not exposed by the public panel SDK
// (overlayResource rejects Image resources). Same narrow bridge as Four Photo Reveal:
// validate every selected path and reject unknown hosts. No client code is changed.
export async function prepareNativeImages(app,projectId,photos){
 const match=app.location.pathname.match(/libraries\/([^/]+)\/projects\/([^/]+)/);
 if(!match||match[2]!==projectId)throw Error('Open the selected Project before creating the Draft.');
 const [libraryId]=match.slice(1),di=app.__DI__;
 if(typeof di?.ProjectRepository?.findById!=='function'||typeof di?.ResourceRepository?.findById!=='function'||typeof di?.SequenceRepository?.findById!=='function'||typeof di?.TimelineMutation?.run!=='function')throw Error('This Selects version does not support original Image placement from this plugin.');
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project)throw Error('The selected Project was not found.');
 const members=await Promise.all(project.getResources().map(id=>di.ResourceRepository.findById(libraryId,id)));
 const sources=[];
 for(const photo of photos){
  const matches=members.filter(r=>r?.getType()==='Image'&&(r.getMedia()?.originalPath??r.getMedia()?.path)===photo.path);
  if(matches.length!==1)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const resource=matches[0],media=resource.getMedia(),analyzed=await resource.getAnalyzedSequence();
  const main=analyzed?.getMainTrack(),primary=main?.getClips().find(clip=>!clip.isGap());
  if(!analyzed||!main||!primary||!Number.isSafeInteger(media?.width)||!Number.isSafeInteger(media?.height))throw Error('A selected Image is not ready for editing: '+photo.name);
  sources.push({resource,analyzed,main,primary,width:media.width,height:media.height});
 }
 return {di,libraryId,projectId,sources};
}


// Places each item (a prepared Image source over [startFrame, endFrame)) as its own
// clip, holding stills past their 5 s source with sourceDuration (see Photo Grid Reveal).
export async function placeNativeImages(prepared,draftId,plan,items,label){
 const {di,libraryId,projectId,sources}=prepared;
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project)throw Error('The selected Project is unavailable.');
 if(!project.getEditedSequences().includes(draftId))throw Error('The new Draft is not owned by the selected Project.');
 const sequence=await di.SequenceRepository.findById(libraryId,draftId);
 if(!sequence||sequence.getFrameRate()!==plan.fps||sequence.getDuration('resolved')!==plan.durationFrames)throw Error('The Draft frame grid differs from the reference.');
 const placements=[];
 const outcome=await di.TimelineMutation.run(sequence,'travel-beat-vlog:'+label,current=>{
  const candidate=current.clone();
  for(const item of items){
   const source=sources[item.source];
   const ids=candidate.place({working:source.analyzed,primaryTrack:source.main,primaryOffset:0,primaryClipId:source.primary.getId()},item.startFrame,{kind:'overlay'});
   if(ids.length!==1)throw Error('Image placement did not create one independent clip.');
   const position=candidate.getClipPositionById(ids[0]),length=item.endFrame-item.startFrame;
   if(!position||position.resolvedOffset!==item.startFrame)throw Error('Image placement moved from the planned frame.');
   const delta=length-position.clip.getDuration();
   if(delta!==0){
    const result=candidate.trimClipBoundary({trackId:position.trackId,clipId:ids[0],position:'end',delta,sourceDuration:Math.max(length,position.clip.getDuration())});
    if(result.trimmedClipPosition?.clip.getDuration()!==length)throw Error('Image could not be held for the planned interval.');
   }
   const final=candidate.getClipPositionById(ids[0]);
   placements.push({clipId:ids[0],trackId:final.trackId,startFrame:item.startFrame,endFrame:item.endFrame});
  }
  const overflow=candidate.getDuration('resolved')-plan.durationFrames;
  if(overflow>0)candidate.slice([{startFrame:plan.durationFrames,endFrame:plan.durationFrames+overflow}],{coordinate:'resolved'});
  if(candidate.getDuration('resolved')!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
  return candidate;
 });
 if(outcome.status!=='committed'||placements.length!==items.length)throw Error('Original Image placement was not confirmed.');
 return {placements,photos:sources.map(s=>({width:s.width,height:s.height}))};
}

// Registers the bundled music in the Project once, reusing an earlier import by path.
async function ensureImported(sdk,projectId,file,type,summary){
 let rows=await inventory(sdk,projectId,'Find '+summary);
 if(!rows.some(r=>r.path===file&&r.type===type)){
  await script(sdk,`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([file])}});`,'Import '+summary,true);
  rows=await inventory(sdk,projectId,'Confirm '+summary);
 }
 const m=rows.find(r=>r.path===file&&r.type===type);
 if(!m)throw Error('The '+summary+' is not ready in the Project yet. Try again in a moment.');
 return m;
}

export default function Panel({sdk,context,ui}){
 const [media,setMedia]=React.useState([]),[videos,setVideos]=React.useState({}),[hero,setHero]=React.useState(''),[loadedProject,setLoadedProject]=React.useState(null);
 const [title,setTitle]=React.useState('TRAVEL'),[color,setColor]=React.useState('#F4C711'),[cutoutMode,setCutoutMode]=React.useState('person'),[grade,setGrade]=React.useState(0.7),[name,setName]=React.useState('Travel beat vlog');
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setMedia([]);setVideos({});setHero('');setLoadedProject(null);setSaved(null);setStatus('');},[context.projectId]);
 // Files the plugin created itself (the hero cutout) are not user media.
 const own=m=>/\/\.selects\/plugin-data\//.test(m.path||'');
 const vids=media.filter(m=>m.type==='Video'&&!own(m)),imgs=media.filter(m=>m.type==='Image'&&!own(m));
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project media…');
  try{
   const projectId=context.projectId,rows=await inventory(sdk,projectId,'List project media');
   if(currentProject.current!==projectId)return;
   setMedia(rows);setLoadedProject(projectId);
   const mine=r=>/\/\.selects\/plugin-data\//.test(r.path||''),v=rows.filter(r=>r.type==='Video'&&!mine(r)),im=rows.filter(r=>r.type==='Image'&&!mine(r));
   setVideos(old=>Object.fromEntries(VIDEO_SLOTS.map((s,i)=>[s,old[s]||v[i]?.resourceId||''])));
   setHero(old=>old||im[0]?.resourceId||'');
   setStatus(v.length>=26&&im.length?'Check the order of videos 1–26 and the hero photo.':'The format needs 26 videos and 1 hero photo; this Project has '+v.length+' videos and '+im.length+' photos.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId)return;
  running.current=true;setBusy(true);setStatus('Checking media…');
  try{
   const pick=id=>{const m=media.filter(x=>x.resourceId===id);if(m.length!==1)throw Error('Check the selected media again.');return m[0];};
   const chosen=Object.fromEntries(VIDEO_SLOTS.map(s=>{if(!videos[s])throw Error('Choose a video for '+s+'.');const m=pick(videos[s]);if(m.type!=='Video')throw Error(s+' must be a video.');if(!m.width||!m.height)throw Error(m.name+' has no frame size yet; wait for the Project to finish reading it.');return [s,m];}));
   const heroPhoto=pick(hero);if(heroPhoto.type!=='Image')throw Error('The hero must be a photo.');
   const needs=JSON.parse(await builder(sdk,{mode:'needs'},'Read slot lengths',15000));
   for(const s of VIDEO_SLOTS){const d=chosen[s].duration;if(d!=null&&d+1e-3<needs[s])throw Error(s+' ('+chosen[s].name+') is '+d.toFixed(2)+' s; it needs at least '+needs[s].toFixed(2)+' s.');}
   setStatus('Cutting out the hero subject…');
   const cut=JSON.parse(await builder(sdk,{mode:'cutout',photo:heroPhoto.path,cutoutMode},'Cut out hero subject',15000,180000));
   const cutRow=await ensureImported(sdk,projectId,cut.path,'Image','hero cutout');
   const music=await ensureImported(sdk,projectId,JSON.parse(await builder(sdk,{mode:'music'},'Locate bundled music',15000)).path,'Audio','bundled music');
   setStatus('Matching colour to the reference…');
   // Measured before the Draft exists (reference 30 fps timing; seconds are rate-free), so a failure leaves no partial Draft.
   const ref=JSON.parse(await builder(sdk,{mode:'plan',fps:30},'Read travel vlog plan',30000));
   const clips=ref.clips.filter(c=>!c.image).map(c=>({key:c.slot+'@'+c.index,slot:c.slot,path:chosen[c.slot].path,inSeconds:c.inSeconds,seconds:(c.endFrame-c.startFrame)/30}));
   clips.push({key:'H',slot:'H',path:heroPhoto.path,inSeconds:0,seconds:0.1});
   const grades=JSON.parse(await builder(sdk,{mode:'grade',clips,strength:grade},'Measure colour',49152,240000));
   const prepared=await prepareNativeImages(window.parent,projectId,[{...heroPhoto},{...cutRow,name:'hero cutout'}]);
   if(currentProject.current!==projectId)throw Error('The Project changed. Start again in the selected Project.');
   setStatus('Creating the Draft…');
   const seed=await script(sdk,`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim()||'Travel beat vlog')}});await d.insertGap({seconds:468/30});await d.setFrameSize({width:1080,height:1920});const m=await d.meta();if(m.durationFrames!==Math.round(468*m.fps/30)||m.frameSize?.width!==1080||m.frameSize?.height!==1920)throw Error('Draft frame grid differs from the reference.');const saved=await d.commitAll('Start Travel Beat Vlog Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,'Create travel vlog Draft',true);
   const {draftId,fps}=seed;
   const plan=JSON.parse(await builder(sdk,{mode:'plan',fps},'Read travel vlog plan',30000));
   setStatus('Placing the hero photo…');
   const heroClip=plan.clips.find(c=>c.image);
   const placed=await placeNativeImages(prepared,draftId,plan,[{source:0,startFrame:heroClip.startFrame,endFrame:heroClip.endFrame}],'hero');
   setStatus('Placing 35 video clips, grids, title and music…');
   const request={mode:'finish',projectId,draftId,fps,videos:Object.fromEntries(VIDEO_SLOTS.map(s=>[s,{resourceId:chosen[s].resourceId,width:chosen[s].width,height:chosen[s].height}])),hero:{resourceId:heroPhoto.resourceId,width:placed.photos[0].width,height:placed.photos[0].height},placements:placed.placements,grades,musicResourceId:music.resourceId,title:{text:title,color}};
   const fin=await script(sdk,await builder(sdk,request,'Build travel vlog finishing step',400000),'Finish travel vlog Draft',true,120);
   if(fin?.status!=='saved')throw Error((fin?.message||'Could not save the Draft.')+(fin?.stage?' ('+fin.stage+')':''));
   setStatus('Putting the hero subject in front of the title…');
   const top=await placeNativeImages(prepared,draftId,plan,[{source:1,startFrame:plan.title.startFrame,endFrame:plan.title.endFrame}],'cutout');
   const fin2=await script(sdk,await builder(sdk,{mode:'cutoutFinish',fps,draftId,cutout:top.placements[0],hero:request.hero,grade:grades.H||null},'Build cutout step',100000),'Finish hero cutout',true,60);
   if(fin2?.status!=='saved')throw Error(fin2?.message||'Could not save the hero cutout.');
   setSaved({draftId});setStatus('Saved. Every shot is its own clip with focus controls; the title text and colour are editable.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 const vOpts=vids.map(m=>({value:m.resourceId,label:m.name})),iOpts=imgs.map(m=>({value:m.resourceId,label:m.name}));
 return <ui.Stack gap={16}><ui.Section title="Travel Beat Vlog">
  <ui.Message>A 15.6 s travel music vlog in 9:16: two fast beat montages, a hero photo with the title behind its subject, two 2×2 grids that fill on the beat, and a fade out. Needs 26 videos and 1 hero photo. Music is included.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project media</ui.Button>
  <ui.Select label="Hero photo (title goes behind its subject)" value={hero} onChange={setHero} options={iOpts} placeholder="Choose photo" disabled={!ready}/>
  {VIDEO_SLOTS.map(s=><ui.Select key={s} label={'Video '+s.slice(1)+(SLOT_HINTS[s]?' · '+SLOT_HINTS[s]:'')} value={videos[s]||''} onChange={v=>setVideos(old=>({...old,[s]:v}))} options={vOpts} placeholder="Choose video" disabled={!ready}/>)}
  <ui.TextField label="Title" value={title} onChange={setTitle} disabled={busy}/>
  <ui.TextField label="Title colour (#RRGGBB)" value={color} onChange={setColor} disabled={busy}/>
  <ui.Select label="Subject in front of the title" value={cutoutMode} onChange={setCutoutMode} options={[{value:'person',label:'People'},{value:'foreground',label:'Main subject'}]} disabled={busy}/>
  <ui.Slider label="Match colour to the reference" min={0} max={1} step={0.05} value={grade} onChange={setGrade} disabled={busy}/>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||!hero||VIDEO_SLOTS.some(s=>!videos[s])||!/^#[0-9a-fA-F]{6}$/.test(color)} busy={busy}>{saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}
