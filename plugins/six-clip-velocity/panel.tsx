// @name Six Clip Velocity
// @name:de Six Clip Velocity
// @name:en Six Clip Velocity
// @name:es Six Clip Velocity
// @name:fr Six Clip Velocity
// @name:it Six Clip Velocity
// @name:ja Six Clip Velocity
// @name:ko Six Clip Velocity
// @name:pt Six Clip Velocity
// @name:tr Six Clip Velocity
// @name:zh Six Clip Velocity
// @icon video
import React from 'react';

const SLOTS=6;
const BUILDER='node "$SELECTS_USER_SKILLS_ROOT/six-clip-velocity/build-script.mjs" ';
const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path,seconds:n.durationSeconds??null}));`;
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

// The public panel SDK cannot retime clips or place a clip from a chosen source point, so
// this uses the editor's existing timeline service, as Four Photo Reveal does for Images.
// It validates every selected path and rejects unknown hosts. No client code is changed.
export async function prepareVideos(app,projectId,videos){
 const match=app.location.pathname.match(/libraries\/([^/]+)\/projects\/([^/]+)/);
 if(!match||match[2]!==projectId)throw Error('Open the selected Project before creating the Draft.');
 const [libraryId]=match.slice(1),di=app.__DI__;
 if(typeof di?.ProjectRepository?.findById!=='function'||typeof di?.ResourceRepository?.findById!=='function'||typeof di?.SequenceRepository?.findById!=='function'||typeof di?.TimelineMutation?.run!=='function')throw Error('This Selects version does not support this plugin\'s video placement.');
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project)throw Error('The selected Project was not found.');
 const members=await Promise.all(project.getResources().map(id=>di.ResourceRepository.findById(libraryId,id)));
 const sources=[];
 for(const v of videos){
  const matches=members.filter(r=>r?.getType()==='Video'&&(r.getMedia()?.originalPath??r.getMedia()?.path)===v.path);
  if(matches.length!==1)throw Error('A selected video is missing or ambiguous in the Project: '+v.name);
  const resource=matches[0],media=resource.getMedia(),analyzed=await resource.getAnalyzedSequence();
  const main=analyzed?.getMainTrack(),primary=main?.getClips().find(clip=>!clip.isGap());
  if(!analyzed||!main||!primary||!Number.isSafeInteger(media?.width)||!Number.isSafeInteger(media?.height))throw Error('A selected video is not ready for editing: '+v.name);
  sources.push({analyzed,main,primary,width:media.width,height:media.height});
 }
 return {di,libraryId,projectId,sources};
}

// Place one piece: `frames` Draft frames at `at`, playing the video from `inSec` seconds
// at `speed`. The editor places a clip from its source start, so the piece is retimed,
// trimmed at the start to its source point (which moves it right), trimmed to length and
// shifted back to `at`.
export function placePiece(c,src,fps,at,inSec,speed,frames){
 const ids=c.place({working:src.analyzed,primaryTrack:src.main,primaryOffset:0,primaryClipId:src.primary.getId()},at,{kind:'overlay'});
 if(ids.length!==1)throw Error('Video placement did not create one clip.');
 const id=ids[0];let pos=c.getClipPositionById(id);
 const Rate=pos.clip.requireTiming().getPlaybackSpeed().constructor;
 if(speed!==1)pos.clip.retimeByRequestedRate({requestedRate:Rate.from({numerator:Math.round(speed*100),denominator:100}),preserveAudioPitch:true});
 const cut=Math.round(inSec*fps/speed);
 if(cut>0){pos=c.getClipPositionById(id);const r=c.trimClipBoundary({trackId:pos.trackId,clipId:id,position:'start',delta:cut});if(Math.abs(r.effectiveDelta)!==cut)throw Error('A video is too short for the format.');} // start trims report a negative delta
 pos=c.getClipPositionById(id);
 const d=frames-pos.clip.getDuration();
 if(d>0)throw Error('A video is too short for the format.');
 if(d<0)c.trimClipBoundary({trackId:pos.trackId,clipId:id,position:'end',delta:d});
 pos=c.getClipPositionById(id);
 if(pos.resolvedOffset!==at)c.shiftClipsInPlace({[pos.trackId]:[pos]},at-pos.resolvedOffset);
 pos=c.getClipPositionById(id);
 if(!pos||pos.resolvedOffset!==at||pos.clip.getDuration()!==frames)throw Error('A video piece moved during placement.');
 return {clipId:id,trackId:pos.trackId};
}

export async function placeVideos(prepared,draftId,plan){
 const {di,libraryId,projectId,sources}=prepared;
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project?.getEditedSequences().includes(draftId))throw Error('The new Draft is not owned by the selected Project.');
 const sequence=await di.SequenceRepository.findById(libraryId,draftId);
 if(!sequence||sequence.getFrameRate()!==plan.fps||sequence.getDuration('resolved')!==plan.durationFrames||JSON.stringify(sequence.getFrameSize())!==JSON.stringify(plan.canvas))throw Error('The Draft frame grid differs from the plan.');
 const placements=[];
 const outcome=await di.TimelineMutation.run(sequence,'six-clip-velocity:placeVideos',current=>{
  const c=current.clone();
  for(const s of plan.segments)for(const p of s.pieces){
   const r=placePiece(c,sources[s.video],plan.fps,p.startFrame,p.inSec,p.speed,p.frames);
   placements.push({video:s.video,clipId:r.clipId,trackId:r.trackId,startFrame:p.startFrame,endFrame:p.startFrame+p.frames});
  }
  const over=c.getDuration('resolved')-plan.durationFrames;
  if(over>0)c.slice([{startFrame:plan.durationFrames,endFrame:plan.durationFrames+over}],{coordinate:'resolved'});
  if(c.getDuration('resolved')!==plan.durationFrames)throw Error('Video placement changed the Draft duration.');
  return c;
 });
 if(outcome.status!=='committed')throw Error('Video placement was not confirmed.');
 for(const p of placements){const row=outcome.sequence?.getClipPositionById(p.clipId);if(!row||row.trackId!==p.trackId||row.resolvedOffset!==p.startFrame||row.clip.getDuration()!==p.endFrame-p.startFrame)throw Error('Saved video placement could not be read back.');}
 return {placements,videos:sources.map(s=>({width:s.width,height:s.height}))};
}

async function ensureMusic(sdk,projectId){
 const file=JSON.parse(await builder(sdk,{mode:'music'},'Locate bundled music',15000));
 let rows=await inventory(sdk,projectId,'Find bundled music');
 if(!rows.some(r=>r.path===file.path&&r.type==='Audio')){
  const r=await sdk.runScript({script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([file.path])}});`,summary:'Import velocity music',allowCommit:true});
  if(r.isError)throw Error(r.output||'Could not import the music.');
  rows=await inventory(sdk,projectId,'Confirm bundled music');
 }
 const m=rows.find(r=>r.path===file.path&&r.type==='Audio');
 if(!m)throw Error('The music is not ready in the Project yet. Try again in a moment.');
 return m.resourceId;
}

// The shell command is limited to 16 KB, so each piece travels as [clipId, trackIndex].
const compactPlacements=placements=>{const tracks=[...new Set(placements.map(p=>p.trackId))];return {tracks,clips:placements.map(p=>[p.clipId,tracks.indexOf(p.trackId)])};};
const DEFAULT_TEXT={line1:['MOVE','WITH','ME','TONIGHT'],line2:'SLOW',phrase2:['SLOW','DOWN']};
const ROLE=['Opening shot, 8 s or longer (subtitles play over it)','Second shot','Shot 3','Shot 4','Shot 5','Shot 6'];

export default function Panel({sdk,context,ui}){
 const empty=()=>Array(SLOTS).fill('');
 const [videos,setVideos]=React.useState([]),[slots,setSlots]=React.useState(empty),[loadedProject,setLoadedProject]=React.useState(null);
 const [need,setNeed]=React.useState(null),[text,setText]=React.useState(DEFAULT_TEXT);
 const [name,setName]=React.useState('Six clip velocity');
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setVideos([]);setSlots(empty());setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project videos…');
  try{
   const projectId=context.projectId,rows=(await inventory(sdk,projectId,'List project videos')).filter(r=>r.type==='Video');
   const plan=JSON.parse(await builder(sdk,{mode:'plan',fps:30},'Read velocity plan',49152));
   if(currentProject.current!==projectId)return;
   setVideos(rows);setNeed(plan.requiredSeconds);setLoadedProject(projectId);
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=SLOTS?'Check the order of videos 1–6 and their lengths.':rows.length?'This Project has '+rows.length+' videos. The format needs 6; import more or choose a video twice on purpose.':'This Project has no videos. Import videos first.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 const short=slots.map((id,i)=>{const v=videos.find(x=>x.resourceId===id);return v&&need&&v.seconds!=null&&v.seconds<need[i];});
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||short.some(Boolean)||!name.trim())return;
  running.current=true;setBusy(true);setStatus('Checking videos…');
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const m=videos.filter(v=>v.resourceId===id);if(m.length!==1)throw Error('Check the selected videos again.');return m[0];});
   const fresh=await inventory(sdk,projectId,'Confirm selected videos');
   if(selected.some(v=>fresh.filter(r=>r.resourceId===v.resourceId&&r.path===v.path&&r.type==='Video').length!==1))throw Error('The selected videos changed. Reload the Project videos.');
   const prepared=await prepareVideos(window.parent,projectId,selected);
   setStatus('Adding the music to the Project…');
   const musicResourceId=await ensureMusic(sdk,projectId);
   if(currentProject.current!==projectId)throw Error('The Project changed. Start again in the selected Project.');
   setStatus('Creating the Draft…');
   const grid=`const m=await d.meta(),want=Math.round(699*m.fps/30);if(m.durationFrames!==want||m.frameSize?.width!==1080||m.frameSize?.height!==1440)throw Error('Draft frame grid differs from the plan.');`;
   let draftId,fps;
   if(partialDraftId){
    const check=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id);${grid}if((await d.clips({trackScope:'all'})).some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id,fps:m.fps};`,summary:'Inspect partial Draft',allowCommit:false});
    if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
    ({draftId,fps}=check.result);
   }else{
    const seed=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim())}});await d.insertGap({seconds:699/30});await d.setFrameSize({width:1080,height:1440});${grid}const saved=await d.commitAll('Start Six Clip Velocity Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,summary:'Create velocity Draft',allowCommit:true});
    if(seed.isError||!seed.result?.draftId)throw Error(seed.output||'Could not create the Draft. Check the Project before retrying.');
    ({draftId,fps}=seed.result);
   }
   const plan=JSON.parse(await builder(sdk,{mode:'plan',fps},'Read velocity plan',49152));
   createdDraftId=draftId;
   setStatus('Placing and retiming '+plan.segments.reduce((a,s)=>a+s.pieces.length,0)+' video pieces…');
   const native=await placeVideos(prepared,draftId,plan);
   const request={mode:'finish',projectId,draftId,fps,videos:selected.map((v,i)=>({resourceId:v.resourceId,width:native.videos[i].width,height:native.videos[i].height})),...compactPlacements(native.placements),musicResourceId,text};
   const script=await builder(sdk,request,'Build velocity finishing step',49152);
   setStatus('Adding blur cuts, subtitles, flash, fade and music…');
   const result=await sdk.runScript({script,summary:'Finish velocity Draft',allowCommit:true,timeoutSeconds:120});
   if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
   if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
   if(result.result.status!=='saved')throw Error(result.result.message||'Could not save the Draft.');
   setPartialDraftId(null);setSaved(result.result);setStatus('Saved. Each velocity piece is its own clip; adjust a video\'s focus in its clip effects and the subtitle font in the subtitle graphic.');
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?' The partial Draft is '+createdDraftId+'; it will be checked before continuing.':''));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 const setWord=(key,i,v)=>setText(old=>{const n={...old,line1:[...old.line1],phrase2:[...old.phrase2]};if(key==='line2')n.line2=v;else n[key][i]=v;return n;});
 return <ui.Stack gap={16}><ui.Section title="Six Clip Velocity">
  <ui.Message>Six videos become a 23-second velocity edit (3:4): an opening shot with word-by-word subtitles, then a seven-shot block of speed ramps with vertical blur cuts, a white flash, the block again, and a fade to black. Music is included.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project videos</ui.Button>
  {slots.map((value,i)=><div key={i}><ui.Select label={'Video '+(i+1)+' — '+ROLE[i]} value={value} onChange={v=>setSlots(old=>old.map((x,j)=>j===i?v:x))} options={videos.map(v=>({value:v.resourceId,label:v.name+(v.seconds!=null?' ('+v.seconds.toFixed(1)+' s)':'')}))} placeholder="Choose video" disabled={!ready}/>{short[i]&&<ui.Message>{'Needs at least '+need[i].toFixed(1)+' s of footage.'}</ui.Message>}</div>)}
  <details><summary>Subtitle words (optional)</summary>
   {text.line1.map((w,i)=><ui.TextField key={i} label={'Line 1, word '+(i+1)} value={w} onChange={v=>setWord('line1',i,v)} disabled={busy}/>)}
   <ui.TextField label="Line 2" value={text.line2} onChange={v=>setWord('line2',0,v)} disabled={busy}/>
   {text.phrase2.map((w,i)=><ui.TextField key={'p'+i} label={'Second phrase, word '+(i+1)} value={w} onChange={v=>setWord('phrase2',i,v)} disabled={busy}/>)}
  </details>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||slots.some(x=>!x)||short.some(Boolean)||!name.trim()} busy={busy}>{partialDraftId?'Inspect and continue partial Draft':saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}
