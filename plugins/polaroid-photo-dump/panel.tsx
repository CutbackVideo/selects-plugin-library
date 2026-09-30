// @name Polaroid Photo Dump
// @name:de Polaroid Photo Dump
// @name:en Polaroid Photo Dump
// @name:es Polaroid Photo Dump
// @name:fr Polaroid Photo Dump
// @name:it Polaroid Photo Dump
// @name:ja Polaroid Photo Dump
// @name:ko Polaroid Photo Dump
// @name:pt Polaroid Photo Dump
// @name:tr Polaroid Photo Dump
// @name:zh Polaroid Photo Dump
// @icon image
import React from 'react';

const SLOTS=17;
const BUILDER='node "$SELECTS_USER_SKILLS_ROOT/polaroid-photo-dump/build-script.mjs" ';
const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path}));`;
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
async function builder(sdk,request,summary,maxOutputBytes=49152){
 const r=await sdk.runShell({summary,command:BUILDER+encode(request),timeoutMs:30000,maxOutputBytes});
 if(r.isError||r.exitCode!==0||!r.stdout)throw Error(r.stderr||r.output||summary+' failed.');
 return r.stdout;
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

export async function placeNativeImages(prepared,draftId,plan){
 const {di,libraryId,projectId,sources}=prepared;
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project)throw Error('The selected Project is unavailable.');
 if(!project.getEditedSequences().includes(draftId))throw Error('The new Draft is not owned by the selected Project.');
 const sequence=await di.SequenceRepository.findById(libraryId,draftId);
 if(!sequence||sequence.getFrameRate()!==plan.fps||sequence.getDuration('resolved')!==plan.durationFrames||JSON.stringify(sequence.getFrameSize())!==JSON.stringify(plan.canvas))throw Error('The Draft frame grid differs from the reference.');
 const placements=[];
 const outcome=await di.TimelineMutation.run(sequence,'polaroid-photo-dump:placeImages',current=>{
  const candidate=current.clone();
  // Photos first, then the frame image last so it sits on the top track.
  for(const [i,occurrence] of [...plan.occurrences,{slot:'frame',startFrame:0,endFrame:plan.durationFrames}].entries()){
   const source=sources[i];
   const ids=candidate.place({working:source.analyzed,primaryTrack:source.main,primaryOffset:0,primaryClipId:source.primary.getId()},occurrence.startFrame,{kind:'overlay'});
   if(ids.length!==1)throw Error('Image placement did not create one independent clip.');
   const position=candidate.getClipPositionById(ids[0]),length=occurrence.endFrame-occurrence.startFrame;
   if(!position||position.resolvedOffset!==occurrence.startFrame)throw Error('Image placement moved from the planned frame.');
   const delta=length-position.clip.getDuration();
   if(delta!==0){
    // A still's source is only a few seconds long; sourceDuration lets it hold to the end (as in Photo Grid Reveal).
    const result=candidate.trimClipBoundary({trackId:position.trackId,clipId:ids[0],position:'end',delta,sourceDuration:Math.max(length,position.clip.getDuration())});
    if(result.trimmedClipPosition?.clip.getDuration()!==length)throw Error('Image could not be held for the planned interval.');
   }
   const final=candidate.getClipPositionById(ids[0]);
   if(!final||final.resolvedOffset!==occurrence.startFrame||final.clip.getDuration()!==length)throw Error('Image interval changed during placement.');
   placements.push({slot:occurrence.slot,clipId:ids[0],trackId:final.trackId,startFrame:occurrence.startFrame,endFrame:occurrence.endFrame});
  }
  const overflow=candidate.getDuration('resolved')-plan.durationFrames;
  if(overflow>0)candidate.slice([{startFrame:plan.durationFrames,endFrame:plan.durationFrames+overflow}],{coordinate:'resolved'});
  if(candidate.getDuration('resolved')!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
  return candidate;
 });
 if(outcome.status!=='committed'||placements.length!==plan.occurrences.length+1)throw Error('Original Image placement was not confirmed.');
 for(const placement of placements){const row=outcome.sequence?.getClipPositionById(placement.clipId);if(!row||row.trackId!==placement.trackId||row.resolvedOffset!==placement.startFrame||row.clip.getDuration()!==placement.endFrame-placement.startFrame)throw Error('Saved Image placement could not be read back.');}
 return {placements:placements.slice(0,-1),frame:{...placements.at(-1),width:sources.at(-1).width,height:sources.at(-1).height},photos:sources.slice(0,-1).map(s=>({width:s.width,height:s.height}))};
}

// Registers the bundled frame image and music in the Project once, reusing earlier imports by path.
async function ensureAssets(sdk,projectId){
 const files=JSON.parse(await builder(sdk,{mode:'assets'},'Unpack polaroid frame and music',15000));
 const want={frame:'Image',music:'Audio'};
 let rows=await inventory(sdk,projectId,'Find polaroid assets');
 const missing=Object.entries(files).filter(([k,f])=>!rows.some(r=>r.path===f.path&&r.type===want[k])).map(([,f])=>f.path);
 if(missing.length){
  const r=await sdk.runScript({script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify(missing)}});`,summary:'Import polaroid frame and music',allowCommit:true});
  if(r.isError)throw Error(r.output||'Could not import the polaroid frame and music.');
  rows=await inventory(sdk,projectId,'Confirm polaroid assets');
 }
 const out={};
 for(const [key,f] of Object.entries(files)){const m=rows.filter(r=>r.path===f.path&&r.type===want[key]);if(m.length<1)throw Error('The polaroid '+key+' is not ready in the Project yet. Try again in a moment.');out[key]={...m[0]};}
 return out;
}

export default function Panel({sdk,context,ui}){
 const empty=()=>Array(SLOTS).fill('');
 const [photos,setPhotos]=React.useState([]),[slots,setSlots]=React.useState(empty),[loadedProject,setLoadedProject]=React.useState(null);
 const [framing,setFraming]=React.useState([]),[name,setName]=React.useState('Polaroid photo dump'),[caption,setCaption]=React.useState('\u201cphotos hold memories\u201d'),[grade,setGrade]=React.useState(1);
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setPhotos([]);setSlots(empty());setFraming([]);setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project photos…');
  try{
   const projectId=context.projectId,rows=(await inventory(sdk,projectId,'List project photos')).filter(r=>r.type==='Image'&&!r.path.includes('/plugin-data/polaroid-photo-dump/'));
   if(currentProject.current!==projectId)return;
   setPhotos(rows);setLoadedProject(projectId);
   // Fill empty slots in Project order; the user can change any slot.
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=SLOTS?'Check the order of photos 1–17.':rows.length?'This Project has '+rows.length+' photos. The format needs 17; import more or choose a photo twice on purpose.':'This Project has no photos. Import photos first.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||!name.trim())return;
  running.current=true;setBusy(true);setStatus('Checking photos…');
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const m=photos.filter(p=>p.resourceId===id);if(m.length!==1)throw Error('Check the selected photos again.');return m[0];});
   const fresh=await inventory(sdk,projectId,'Confirm selected photos');
   if(selected.some(p=>fresh.filter(r=>r.resourceId===p.resourceId&&r.path===p.path&&r.type==='Image').length!==1))throw Error('The selected photos changed. Reload the Project photos.');
   setStatus('Adding the polaroid frame and music to the Project…');
   const assets=await ensureAssets(sdk,projectId);
   const prepared=await prepareNativeImages(window.parent,projectId,[...selected,assets.frame]);
   if(currentProject.current!==projectId)throw Error('The Project changed. Start again in the selected Project.');
   setStatus('Creating the Draft…');
   // New Drafts take the app's default frame rate; the plan is converted to it.
   const grid=`const m=await d.meta(),want=Math.round(835*m.fps/60);if(m.durationFrames!==want||m.frameSize?.width!==1080||m.frameSize?.height!==1920)throw Error('Draft frame grid differs from the reference.');`;
   let draftId,fps;
   if(partialDraftId){
    const check=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id);${grid}if((await d.clips({trackScope:'all'})).some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id,fps:m.fps};`,summary:'Inspect partial Draft',allowCommit:false});
    if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
    ({draftId,fps}=check.result);
   }else{
    const seed=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim())}});await d.insertGap({seconds:835/60});await d.setFrameSize({width:1080,height:1920});${grid}const saved=await d.commitAll('Start Polaroid Photo Dump Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,summary:'Create polaroid Draft',allowCommit:true});
    if(seed.isError||!seed.result?.draftId)throw Error(seed.output||'Could not create the Draft. Check the Project before retrying.');
    ({draftId,fps}=seed.result);
   }
   const plan=JSON.parse(await builder(sdk,{mode:'plan',fps},'Read polaroid plan',15000));
   if(plan.fps!==fps||plan.occurrences?.length!==SLOTS)throw Error('The reference plan is incomplete.');
   createdDraftId=draftId;
   setStatus('Placing 17 photos and the frame…');
   const native=await placeNativeImages(prepared,draftId,plan);
   const request={mode:'finish',projectId,draftId,fps,photos:selected.map((p,i)=>({resourceId:p.resourceId,width:native.photos[i].width,height:native.photos[i].height})),placements:native.placements,frame:{...native.frame,resourceId:assets.frame.resourceId},framing:Array.from({length:SLOTS},(_,i)=>framing[i]||{x:.5,y:.5}),caption,grade,assets:{music:assets.music.resourceId}};
   const script=await builder(sdk,request,'Build polaroid finishing step');
   setStatus('Adding the zoom, film grade, caption and music…');
   const result=await sdk.runScript({script,summary:'Finish polaroid Draft',allowCommit:true,timeoutSeconds:120});
   if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
   if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
   if(result.result.status!=='saved')throw Error(result.result.message||'Could not save the Draft.');
   setPartialDraftId(null);setSaved(result.result);setStatus('Saved. Each photo is its own clip; adjust its focus and film grade in the clip effect, and the caption in its graphic. To use a different photo in a slot, change that slot here and create another Draft.');
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?' The partial Draft is '+createdDraftId+'; it will be checked before continuing.':''));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 return <ui.Stack gap={16}><ui.Section title="Polaroid Photo Dump">
  <ui.Message>Seventeen photos switch inside an instant-film frame on satin, one every two beats of the bundled CC0 track, while the scene slowly zooms in (13.9 s). Each photo stays an editable clip.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project photos</ui.Button>
  {slots.map((value,i)=><ui.Select key={i} label={'Photo '+(i+1)} value={value} onChange={v=>setSlots(old=>old.map((x,j)=>j===i?v:x))} options={photos.map(p=>({value:p.resourceId,label:p.name}))} placeholder="Choose photo" disabled={!ready}/>)}
  <details><summary>Adjust photo framing (optional)</summary><ui.Message>Move the visible part of each photo inside the frame window. You can also change it later in each clip's effect.</ui.Message>
   {slots.map((_,i)=>{const point=framing[i]||{x:.5,y:.5};return <div key={i}><p>{'Photo '+(i+1)}</p>{['x','y'].map(axis=><ui.Slider key={axis} label={axis==='x'?'Horizontal focus':'Vertical focus'} min={0} max={1} step={.01} value={point[axis]} onChange={value=>setFraming(old=>{const next=[...old];next[i]={...(old[i]||{x:.5,y:.5}),[axis]:value};return next;})} disabled={busy}/>)}</div>;})}
  </details>
  <ui.TextField label="Caption" value={caption} onChange={setCaption} disabled={busy}/>
  <ui.Slider label="Film grade" min={0} max={2} step={.05} value={grade} onChange={setGrade} disabled={busy}/>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||slots.some(x=>!x)||!name.trim()||caption.length>120} busy={busy}>{partialDraftId?'Inspect and continue partial Draft':saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}
