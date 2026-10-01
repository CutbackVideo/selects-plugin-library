// @name Camera Shutter Dump
// @name:de Camera Shutter Dump
// @name:en Camera Shutter Dump
// @name:es Camera Shutter Dump
// @name:fr Camera Shutter Dump
// @name:it Camera Shutter Dump
// @name:ja Camera Shutter Dump
// @name:ko Camera Shutter Dump
// @name:pt Camera Shutter Dump
// @name:tr Camera Shutter Dump
// @name:zh Camera Shutter Dump
// @collection visual-highlights
// @icon image
import React from 'react';

const SLOTS=12;
const BUILDER='node "$SELECTS_USER_SKILLS_ROOT/camera-shutter-dump/build-script.mjs" ';
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
// A template run passes the library it was handed (`context.template.libraryId`),
// because it keeps running while the person moves to another page; the Panel
// reads the open Project from the app's address.
export async function prepareNativeImages(app,projectId,photos,knownLibraryId=null){
 let libraryId=knownLibraryId;
 if(!libraryId){
  const match=app.location.pathname.match(/libraries\/([^/]+)\/projects\/([^/]+)/);
  if(!match||match[2]!==projectId)throw Error('Open the selected Project before creating the Draft.');
  libraryId=match[1];
 }
 const di=app.__DI__;
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
 const outcome=await di.TimelineMutation.run(sequence,'camera-shutter-dump:placeImages',current=>{
  const candidate=current.clone();
  for(const [i,occurrence] of plan.occurrences.entries()){
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
 if(outcome.status!=='committed'||placements.length!==plan.occurrences.length)throw Error('Original Image placement was not confirmed.');
 for(const placement of placements){const row=outcome.sequence?.getClipPositionById(placement.clipId);if(!row||row.trackId!==placement.trackId||row.resolvedOffset!==placement.startFrame||row.clip.getDuration()!==placement.endFrame-placement.startFrame)throw Error('Saved Image placement could not be read back.');}
 return {placements,photos:sources.map(s=>({width:s.width,height:s.height}))};
}

// Registers the bundled shutter sounds in the Project once, reusing earlier imports by path.
async function ensureSounds(sdk,projectId){
 const files=JSON.parse(await builder(sdk,{mode:'sounds'},'Unpack shutter sounds',15000));
 let rows=await inventory(sdk,projectId,'Find shutter sounds');
 const missing=Object.values(files).map(f=>f.path).filter(p=>!rows.some(r=>r.path===p&&r.type==='Audio'));
 if(missing.length){
  const r=await sdk.runScript({script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify(missing)}});`,summary:'Import shutter sounds',allowCommit:true});
  if(r.isError)throw Error(r.output||'Could not import the shutter sounds.');
  rows=await inventory(sdk,projectId,'Confirm shutter sounds');
 }
 const ids={};
 for(const [key,f] of Object.entries(files)){const m=rows.filter(r=>r.path===f.path&&r.type==='Audio');if(m.length<1)throw Error('Shutter sound is not ready in the Project yet. Try again in a moment.');ids[key]=m[0].resourceId;}
 return ids;
}

export const DEFAULT_DRAFT_NAME='Camera shutter dump';

// The create steps, shared by the Panel and a template run. `stillCurrent` says the
// run still belongs to its Project; `onSeed` runs just before the first save and
// `onDraft` with the Draft the later steps fill. Returns the saved result.
export async function createPhotoDraft(sdk,{projectId,selected,framing,name,partialDraftId=null,libraryId=null,stillCurrent,say,onSeed=()=>{},onDraft=_id=>{}}){
 const fresh=await inventory(sdk,projectId,'Confirm selected photos');
 if(selected.some(p=>fresh.filter(r=>r.resourceId===p.resourceId&&r.path===p.path&&r.type==='Image').length!==1))throw Error('The selected photos changed. Reload the Project photos.');
 const prepared=await prepareNativeImages(window.parent,projectId,selected,libraryId);
 say('Adding shutter sounds to the Project…');
 const sounds=await ensureSounds(sdk,projectId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating the Draft…');
 // New Drafts take the app's default frame rate; the plan is converted to it.
 const grid=`const m=await d.meta(),want=Math.round(279*m.fps/30);if(m.durationFrames!==want||m.frameSize?.width!==720||m.frameSize?.height!==1280)throw Error('Draft frame grid differs from the reference.');`;
 let draftId,fps;
 if(partialDraftId){
  const check=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id);${grid}if((await d.clips({trackScope:'all'})).some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id,fps:m.fps};`,summary:'Inspect partial Draft',allowCommit:false});
  if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
  ({draftId,fps}=check.result);
 }else{
  onSeed();
  const seed=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name)}});await d.insertGap({seconds:9.3});await d.setFrameSize({width:720,height:1280});${grid}const saved=await d.commitAll('Start Camera Shutter Dump Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,summary:'Create shutter dump Draft',allowCommit:true});
  if(seed.isError||!seed.result?.draftId){const error=Error(seed.output||'Could not create the Draft. Check the Project before retrying.');error.seedOutput=seed.output;throw error;}
  ({draftId,fps}=seed.result);
 }
 const plan=JSON.parse(await builder(sdk,{mode:'plan',fps},'Read shutter dump plan',15000));
 if(plan.fps!==fps||plan.occurrences?.length!==SLOTS||plan.sounds?.length!==SLOTS)throw Error('The reference plan is incomplete.');
 onDraft(draftId);
 say('Placing 12 photos…');
 const native=await placeNativeImages(prepared,draftId,plan);
 const request={mode:'finish',projectId,draftId,fps,photos:selected.map((p,i)=>({resourceId:p.resourceId,width:native.photos[i].width,height:native.photos[i].height})),placements:native.placements,framing:Array.from({length:SLOTS},(_,i)=>framing[i]||{x:.5,y:.5}),sounds};
 const script=await builder(sdk,request,'Build shutter dump finishing step');
 say('Cropping photos and adding shutter sounds…');
 const result=await sdk.runScript({script,summary:'Finish shutter dump Draft',allowCommit:true,timeoutSeconds:120});
 if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
 if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
 if(result.result.status!=='saved')throw Error(result.result.message||'Could not save the Draft.');
 return result.result;
}

// A template run gets its own component, so it never touches the Panel's state.
export default function Panel(props){return props.context?.template?<PhotoTemplateRun {...props}/>:<PhotoPanel {...props}/>;}

function PhotoPanel({sdk,context,ui}){
 const empty=()=>Array(SLOTS).fill('');
 const [photos,setPhotos]=React.useState([]),[slots,setSlots]=React.useState(empty),[loadedProject,setLoadedProject]=React.useState(null);
 const [framing,setFraming]=React.useState([]),[name,setName]=React.useState(DEFAULT_DRAFT_NAME);
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setPhotos([]);setSlots(empty());setFraming([]);setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project photos…');
  try{
   const projectId=context.projectId,rows=(await inventory(sdk,projectId,'List project photos')).filter(r=>r.type==='Image');
   if(currentProject.current!==projectId)return;
   setPhotos(rows);setLoadedProject(projectId);
   // Fill empty slots in Project order; the user can change any slot.
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=SLOTS?'Check the order of photos 1–12.':rows.length?'This Project has '+rows.length+' photos. The format needs 12; import more or choose a photo twice on purpose.':'This Project has no photos. Import photos first.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||!name.trim())return;
  running.current=true;setBusy(true);setStatus('Checking photos…');
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const m=photos.filter(p=>p.resourceId===id);if(m.length!==1)throw Error('Check the selected photos again.');return m[0];});
   const done=await createPhotoDraft(sdk,{projectId,selected,framing,name:name.trim(),partialDraftId,stillCurrent:()=>currentProject.current===projectId,say:setStatus,onDraft:id=>{createdDraftId=id;}});
   setPartialDraftId(null);setSaved(done);setStatus('Saved. Each photo is its own clip; adjust its focus in the clip effect. To use a different photo in a slot, change that slot here and create another Draft — the crop is sized for the original photo.');
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?' The partial Draft is '+createdDraftId+'; it will be checked before continuing.':''));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 return <ui.Stack gap={16}><ui.Section title="Camera Shutter Dump">
  <ui.Message>Twelve photos stack into a collage on black, one per camera shutter sound (9.3 s). Each photo is cropped to its slot and stays editable.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project photos</ui.Button>
  {slots.map((value,i)=><ui.Select key={i} label={'Photo '+(i+1)+(i>=10?' (landscape slot)':'')} value={value} onChange={v=>setSlots(old=>old.map((x,j)=>j===i?v:x))} options={photos.map(p=>({value:p.resourceId,label:p.name}))} placeholder="Choose photo" disabled={!ready}/>)}
  <details><summary>Adjust photo framing (optional)</summary><ui.Message>Move the visible part of each photo inside its slot. You can also change it later in each clip's effect.</ui.Message>
   {slots.map((_,i)=>{const point=framing[i]||{x:.5,y:.5};return <div key={i}><p>{'Photo '+(i+1)}</p>{['x','y'].map(axis=><ui.Slider key={axis} label={axis==='x'?'Horizontal focus':'Vertical focus'} min={0} max={1} step={.01} value={point[axis]} onChange={value=>setFraming(old=>{const next=[...old];next[i]={...(old[i]||{x:.5,y:.5}),[axis]:value};return next;})} disabled={busy}/>)}</div>;})}
  </details>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||slots.some(x=>!x)||!name.trim()} busy={busy}>{partialDraftId?'Inspect and continue partial Draft':saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}

// --- Template run ------------------------------------------------------------
// A built-in app can run this Panel as a template: the person picks the photos
// in the app (input `photos`, in slot order) and the app mounts the Panel out of
// sight with `context.template`. It makes a new Draft through the Panel's own
// create steps with every choice at its default, never opens it, and ends with
// one `sdk.finishTemplate`.
const TEMPLATE_FAILED='Camera Shutter Dump could not make the Draft; try again.';
const TEMPLATE_UNSUPPORTED='This version of Selects cannot place photos for Camera Shutter Dump; update Selects, then try again.';
const templatePartial=name=>'Camera Shutter Dump stopped part way, so the Draft "'+name+'" may be incomplete; check it in this Project before trying again.';
const templateUncertain=name=>'Camera Shutter Dump could not confirm whether the Draft "'+name+'" was created; check this Project\'s Drafts before trying again.';
function templateIssue(message){const error=Error(message);error.publicMessage=message;return error;}
// The run report of the step that creates the Draft: its leading JSON object.
function templateReport(output){
 const text=String(output||'');
 for(let end=text.lastIndexOf('}');end>=0;end=text.lastIndexOf('}',end-1)){try{const value=JSON.parse(text.slice(0,end+1));return value&&typeof value==='object'?value:null;}catch{}}
 return null;
}
// That step failed without a Draft id: a report with an error and no committed
// edit means nothing was saved; anything else may have saved.
function templateSeedMessage(error,name){
 const report=templateReport(error?.seedOutput);
 const edits=Array.isArray(report?.edits)?report.edits:[];
 if(typeof report?.error!=='string'||edits.some(edit=>edit?.committed!==false))return templateUncertain(name);
 return 'Camera Shutter Dump could not create the Draft, so nothing was saved; try again.';
}
// The library the run works in: the one the app handed over, else (an older app)
// the open Project's page or the tab on screen, read once as the run starts.
function templateLibrary(app,projectId,template){
 if(template?.libraryId)return template.libraryId;
 const match=String(app?.location?.pathname||'').match(/libraries\/([^/]+)\/projects\/([^/]+)/);
 if(match&&match[2]===projectId)return match[1];
 return app?.__DI__?.SequenceState?.getOnScreenTab?.()?.libraryId||null;
}
// The app hands over its own Resource ids; the Panel works from the run_script
// Image rows, so each pick is joined to its row by its original file, the same
// file prepareNativeImages later checks the Project's Image against.
async function templateSelection(sdk,app,projectId,libraryId,inputs){
 const picks=Array.isArray(inputs?.photos)?inputs.photos:[];
 if(picks.length!==SLOTS||picks.some(x=>x?.kind!=='image'||!x.resourceId))throw templateIssue('Pick exactly 12 photos, then try again.');
 const di=app?.__DI__;
 if(typeof di?.ProjectRepository?.findById!=='function'||typeof di?.ResourceRepository?.findById!=='function')throw templateIssue(TEMPLATE_UNSUPPORTED);
 const project=libraryId?await di.ProjectRepository.findById(libraryId,projectId):null;
 if(!project)throw templateIssue('Could not find this Project; open it, then try again.');
 const members=new Set(project.getResources()||[]);
 const rows=(await inventory(sdk,projectId,'List project photos')).filter(r=>r.type==='Image');
 const selected=[];
 for(const pick of picks){
  const label=pick.name||'A picked photo';
  const resource=members.has(pick.resourceId)?await di.ResourceRepository.findById(libraryId,pick.resourceId):null;
  if(!resource)throw templateIssue(label+' is missing from this Project.');
  if(resource.getType()!=='Image')throw templateIssue(label+' is not a photo Camera Shutter Dump can use.');
  const media=resource.getMedia(),path=media?.originalPath??media?.path;
  const matches=path?rows.filter(row=>row.path===path):[];
  if(matches.length!==1)throw templateIssue(label+' is missing from this Project or matches more than one photo.');
  selected.push(matches[0]);
 }
 return selected;
}
// One plain sentence for the person, from a failure before anything was saved.
function templateMessage(error){
 if(error?.publicMessage)return error.publicMessage;
 const said=String(error?.message||'');
 let match=said.match(/^A selected Image is not ready for editing: (.+)$/);
 if(match)return match[1]+' is not ready yet; wait for it to finish importing, then try again.';
 match=said.match(/^A selected Image is missing or ambiguous in the Project: (.+)$/);
 if(match)return match[1]+' is missing from this Project or matches more than one photo.';
 if(/^This Selects version does not support/.test(said))return TEMPLATE_UNSUPPORTED;
 if(/^The selected photos changed/.test(said))return 'The picked photos changed while the Draft was being made; try again.';
 if(/not ready in the Project yet/.test(said))return 'Camera Shutter Dump is still adding its sounds to this Project; try again in a moment.';
 return TEMPLATE_FAILED;
}
// Nobody sees this frame, so it shows one status line. It starts once per run
// id and reports once, unless a newer run replaced it; a save that began is
// reported as a possibly incomplete Draft and never retried.
function PhotoTemplateRun({sdk,context}){
 const runId=context.template?.runId,[status,setStatus]=React.useState('Making your Draft…');
 const started=React.useRef(null),alive=React.useRef(true),latest=React.useRef(context);latest.current=context;
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 React.useEffect(()=>{
  if(!runId||started.current===runId)return;started.current=runId;
  const live=()=>alive.current&&latest.current.template?.runId===runId;
  let ended=false;
  const finish=result=>{if(ended)return;ended=true;if(!live())return;try{sdk.finishTemplate(result);}catch{}};
  const say=text=>{if(live())setStatus(text);};
  const projectId=context.projectId,template=context.template;
  let seeding=false,draftId=null;
  (async()=>{
   try{
    if(!projectId)throw templateIssue('Open a Project, then try again.');
    const app=window.parent,libraryId=templateLibrary(app,projectId,template);
    say('Finding your photos…');
    const selected=await templateSelection(sdk,app,projectId,libraryId,template?.inputs);
    if(!live())throw Error('The template run ended before the Draft was made.');
    const done=await createPhotoDraft(sdk,{projectId,selected,framing:[],name:DEFAULT_DRAFT_NAME,libraryId,stillCurrent:live,say,
     onSeed:()=>{if(!live())throw Error('The template run ended before the Draft was made.');seeding=true;},onDraft:id=>{draftId=id;}});
    if(!done?.draftId||done.draftId!==draftId)throw Error('The saved Draft did not report its id.');
    say('Done.');
    finish({sequenceId:done.draftId});
   }catch(error){
    console.warn('[Camera Shutter Dump] template run failed:',error?.message||String(error),{draftId,seeding});
    say('Stopped.');
    finish({error:draftId?templatePartial(DEFAULT_DRAFT_NAME):seeding?templateSeedMessage(error,DEFAULT_DRAFT_NAME):templateMessage(error)});
   }finally{
    finish({error:TEMPLATE_FAILED});
   }
  })();
 },[runId]);
 return <p role="status" style={{margin:0,fontSize:12,color:'var(--panel-muted-fg)'}}>{status}</p>;
}
