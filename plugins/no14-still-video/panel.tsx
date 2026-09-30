// @name Four Photo Reveal
// @name:de Four Photo Reveal
// @name:en Four Photo Reveal
// @name:es Four Photo Reveal
// @name:fr Four Photo Reveal
// @name:it Four Photo Reveal
// @name:ja Four Photo Reveal
// @name:ko Four Photo Reveal
// @name:pt Four Photo Reveal
// @name:tr Four Photo Reveal
// @name:zh Four Photo Reveal
// @icon image
import React from 'react';

const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const ids=new Set(resources.filter(r=>r.type==='Image').map(r=>r.resourceId));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>ids.has(n.resourceId)&&n.path).map(n=>({resourceId:n.resourceId,name:n.name,path:n.path}));`;
const encode=value=>{
 const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};

// The editor's existing Image placement path is not exposed by the public panel SDK.
// Keep this bridge narrow, validate every selected path, and reject unknown hosts.
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
 const outcome=await di.TimelineMutation.run(sequence,'no14:placeOriginalImages',current=>{
  const candidate=current.clone();
  for(const occurrence of plan.occurrences){
   const source=sources['ABCD'.indexOf(occurrence.slot)];
   const ids=candidate.place({working:source.analyzed,primaryTrack:source.main,primaryOffset:0,primaryClipId:source.primary.getId()},occurrence.startFrame,{kind:'overlay'});
   if(ids.length!==1)throw Error('Image placement did not create one independent clip.');
   const position=candidate.getClipPositionById(ids[0]),length=occurrence.endFrame-occurrence.startFrame;
   if(!position||position.resolvedOffset!==occurrence.startFrame)throw Error('Image placement moved from the planned frame.');
   const delta=length-position.clip.getDuration();
   if(delta!==0){
    const result=candidate.trimClipBoundary({trackId:position.trackId,clipId:ids[0],position:'end',delta});
    if(result.effectiveDelta!==delta)throw Error('Image could not be held for the planned interval.');
   }
   const final=candidate.getClipPositionById(ids[0]);
   if(!final||final.resolvedOffset!==occurrence.startFrame||final.clip.getDuration()!==length)throw Error('Image interval changed during placement.');
   placements.push({slot:occurrence.slot,appearance:occurrence.appearance,clipId:ids[0],trackId:final.trackId,startFrame:occurrence.startFrame,endFrame:occurrence.endFrame});
  }
  const overflow=candidate.getDuration('resolved')-plan.durationFrames;
  if(overflow>0)candidate.slice([{startFrame:plan.durationFrames,endFrame:plan.durationFrames+overflow}],{coordinate:'resolved'});
  if(candidate.getDuration('resolved')!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
  return candidate;
 });
 if(outcome.status!=='committed'||placements.length!==8)throw Error('Original Image placement was not confirmed.');
 if(outcome.sequence?.getDuration('resolved')!==plan.durationFrames)throw Error('Saved Image Draft duration differs from the reference.');
 for(const placement of placements){const row=outcome.sequence?.getClipPositionById(placement.clipId);if(!row||row.trackId!==placement.trackId||row.resolvedOffset!==placement.startFrame||row.clip.getDuration()!==placement.endFrame-placement.startFrame)throw Error('Saved Image placement could not be read back.');}
 return {placements,photos:sources.map(s=>({width:s.width,height:s.height})),status:outcome.status};
}

export default function Panel({sdk,context,ui}){
 const [photos,setPhotos]=React.useState([]),[slots,setSlots]=React.useState(['','','','']),[loadedProject,setLoadedProject]=React.useState(null);
 const [framing,setFraming]=React.useState({});
 const [music,setMusic]=React.useState('on');
 const [shape,setShape]=React.useState('heart'),[color,setColor]=React.useState('#ffffff'),[name,setName]=React.useState('No.14 photo format');
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setPhotos([]);setSlots(['','','','']);setFraming({});setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project photos…');
  try{
   const projectId=context.projectId;
   const r=await sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary:'List project photos',allowCommit:false});
   if(r.isError||!Array.isArray(r.result))throw Error(r.output||'Could not read project photos.');
   if(currentProject.current!==projectId)return;
   setPhotos(r.result);setLoadedProject(projectId);setStatus(r.result.length?'Choose photos for A, B, C, and D.':'This Project has no photos. Import photos first.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||!name.trim())return;
  running.current=true;setBusy(true);setStatus('Checking original Image sources…');
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const matches=photos.filter(p=>p.resourceId===id);if(matches.length!==1)throw Error('Check the selected photos again.');return matches[0];});
   const fresh=await sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary:'Confirm selected Image sources',allowCommit:false});
   if(fresh.isError||!Array.isArray(fresh.result)||selected.some(p=>fresh.result.filter(r=>r.resourceId===p.resourceId&&r.path===p.path).length!==1))throw Error('The selected photos changed. Reload the Project photos.');
   const prepared=await prepareNativeImages(window.parent,projectId,selected);
   if(currentProject.current!==projectId)throw Error('The Project changed. Start again in the selected Project.');
   const planBuild=await sdk.runShell({summary:'Read No.14 reference plan',command:'node "$SELECTS_USER_SKILLS_ROOT/no14-still-video/build-script.mjs" '+encode({mode:'native-plan'}),timeoutMs:30000,maxOutputBytes:15000});
   if(planBuild.isError||planBuild.exitCode!==0)throw Error(planBuild.stderr||planBuild.output||'Could not read the reference plan.');
   const plan=JSON.parse(planBuild.stdout||'{}');
   if(plan.fps!==30||plan.durationFrames!==266||plan.occurrences?.length!==8)throw Error('The reference plan is incomplete.');
   let musicResource=null;
   if(music==='on'){
    setStatus('Checking bundled music…');
    const root=await sdk.runShell({summary:'Locate bundled music',command:'printf %s "${SELECTS_USER_SKILLS_ROOT:-$HOME/.selects/skills}"'});
    if(root.isError||!root.stdout?.trim())throw Error('The installed music asset could not be located. Reinstall the plugin.');
    const musicPath=root.stdout.trim()+'/no14-still-video/assets/music.mp3';
    const imported=await sdk.runScript({summary:'Import bundled music',allowCommit:true,script:`const p=selects.project(${JSON.stringify(projectId)}),path=${JSON.stringify(musicPath)};const nodes=[];const walk=tree=>{for(const n of tree??[]){if(n.path)nodes.push(n);if(n.children)walk(n.children);}};const tree=await p.sourceFiles();if('fileTree' in tree)walk(tree.fileTree);else if('folders' in tree)for(const f of tree.folders){const part=await p.sourceFiles({folder:f.name});if('fileTree' in part)walk(part.fileTree);}const found=nodes.filter(n=>n.path===path);if(found.length>1)throw Error('Bundled music source is ambiguous.');const id=found[0]?.resourceId??(await p.importFiles({paths:[path]})).addedResourceIds[0];if(!id)throw Error('Bundled music is missing. Reinstall the plugin.');return {resourceId:id};`});
    if(imported.isError||!imported.result?.resourceId)throw Error(imported.output||'Could not import bundled music.');
    musicResource=imported.result;
    const ready=await sdk.runScript({summary:'Check music readiness',allowCommit:false,script:`const r=(await selects.project(${JSON.stringify(projectId)}).resources()).find(r=>r.resourceId===${JSON.stringify(musicResource.resourceId)});if(!r||r.type!=='Audio'||!Number.isFinite(r.durationSeconds)||r.durationSeconds<${plan.durationFrames/plan.fps})throw Error('Bundled music is not ready. Wait for the import to finish, then create the Draft again.');return true;`});
    if(ready.isError||ready.result!==true)throw Error(ready.output||'Bundled music is not ready.');
   }
   if(currentProject.current!==projectId)throw Error('The Project changed. Start again in the selected Project.');
   setStatus('Creating an editable Image Draft…');
   let draftId;
   if(partialDraftId){
    const checkScript=`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id),m=await d.meta(),rows=await d.clips({trackScope:'all'});if(m.fps!==${plan.fps}||m.durationFrames!==${plan.durationFrames}||m.frameSize?.width!==${plan.canvas.width}||m.frameSize?.height!==${plan.canvas.height}||rows.some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id};`;
    const check=await sdk.runScript({script:checkScript,summary:'Inspect partial Image Draft',allowCommit:false});
    if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
    draftId=partialDraftId;
   }else{
    const seedScript=`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim())}});await d.insertGap({seconds:${plan.durationFrames/plan.fps}});await d.setFrameSize(${JSON.stringify(plan.canvas)});const m=await d.meta();if(m.fps!==${plan.fps}||m.durationFrames!==${plan.durationFrames}||m.frameSize?.width!==${plan.canvas.width}||m.frameSize?.height!==${plan.canvas.height})throw Error('No.14 Draft frame grid differs from the reference.');const saved=await d.commitAll('Start No.14 original Image Draft');return {draftId:saved.createdDraftId};`;
    const seed=await sdk.runScript({script:seedScript,summary:'Create No.14 Image Draft',allowCommit:true});
    if(seed.isError||!seed.result?.draftId)throw Error(seed.output||'Could not create the Image Draft. Check the Project before retrying.');
    draftId=seed.result.draftId;
   }
   createdDraftId=draftId;
   const native=await placeNativeImages(prepared,draftId,plan);
   const request={mode:'native-finish',projectId,draftId,photos:selected.map((p,i)=>({resourceId:p.resourceId,path:p.path,width:native.photos[i].width,height:native.photos[i].height})),placements:native.placements,decoration:{shape,color},framing,music:musicResource};
   const builder=await sdk.runShell({summary:'Build No.14 Image finishing operation',command:'node "$SELECTS_USER_SKILLS_ROOT/no14-still-video/build-script.mjs" '+encode(request),timeoutMs:30000,maxOutputBytes:49152});
   if(builder.isError||builder.exitCode!==0||!builder.stdout)throw Error(builder.stderr||builder.output||'Could not build the editing operation.');
   const result=await sdk.runScript({script:builder.stdout,summary:'Finish No.14 Image Draft',allowCommit:true,timeoutSeconds:120});
   if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
   if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
   if(result.result.status!=='saved'||!result.result.draftId)throw Error(result.result.message||'Could not save the Draft.');
   setPartialDraftId(null);setSaved(result.result);setStatus('Saved Draft: '+result.result.draftId+'. To change one photo or the decoration, keep the other choices and create a revised Draft. The previous Draft stays available.');
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?' The partial Draft is '+createdDraftId+'; it will be checked before continuing.':''));}finally{running.current=false;setBusy(false);}
 }
 return <ui.Stack gap={16}><ui.Section title="No.14 photo format">
  <ui.Message>Four original photos become eight independently editable Image clips. Timing and transitions are still experimental.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project photos</ui.Button>
  {['A','B','C','D'].map((slot,i)=><ui.Select key={slot} label={'Photo '+slot} value={slots[i]} onChange={value=>setSlots(old=>old.map((x,j)=>j===i?value:x))} options={photos.map(p=>({value:p.resourceId,label:p.name}))} placeholder="Choose photo" disabled={busy||loadedProject!==context.projectId}/>)}
  <details><summary>Adjust photo framing (optional)</summary><ui.Message>Move the visible area for each photo. Grid and fullscreen can have different centers.</ui.Message>
   {['A','B','C','D'].flatMap(slot=>['grid','fullscreen'].map(scene=>{const key=scene+'-'+slot,point=framing[key]||{x:.5,y:.5};return <div key={key}><p>{'Photo '+slot+' · '+scene}</p>{['x','y'].map(axis=><ui.Slider key={axis} label={axis==='x'?'Horizontal focus':'Vertical focus'} min={0} max={1} step={.01} value={point[axis]} onChange={value=>setFraming(old=>({...old,[key]:{...(old[key]||{x:.5,y:.5}),[axis]:value}}))} disabled={busy}/>)}</div>;}))}
  </details>
  <ui.Select label="Decoration" value={shape} onChange={setShape} options={[{value:'heart',label:'Heart'},{value:'star',label:'Star'},{value:'circle',label:'Circle'},{value:'none',label:'None'}]} disabled={busy}/>
  <ui.TextField label="Decoration color (#RRGGBB)" value={color} onChange={setColor} disabled={busy}/>
  <ui.Select label="Music" value={music} onChange={setMusic} options={[{value:'on',label:'Lofi again (CC0)'},{value:'off',label:'Off'}]} disabled={busy}/>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={busy||loadedProject!==context.projectId||slots.some(x=>!x)||!/^#[0-9a-fA-F]{6}$/.test(color)||!name.trim()} busy={busy}>{partialDraftId?'Inspect and continue partial Draft':saved?'Create revised Draft':'Create new Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved No.14 Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}
