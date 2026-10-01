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
// @collection visual-highlights
// @icon video
import React from 'react';

const VIDEO_SLOTS=Array.from({length:26},(_,i)=>'V'+(i+1));
const BUILDER='node "$SELECTS_USER_SKILLS_ROOT/travel-beat-vlog/build-script.mjs" ';
const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path,width:n.frameSize?.width??null,height:n.frameSize?.height??null,duration:n.durationSeconds??null}));`;
const encode=value=>{
 const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
// Right after the app opens a Project its file list can briefly fail to read, so try once more.
async function inventory(sdk,projectId,summary){
 const run=()=>sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false});
 let r=await run();
 if(r.isError||!Array.isArray(r.result)){await new Promise(done=>setTimeout(done,1500));r=await run();}
 if(r.isError||!Array.isArray(r.result))throw Error('Could not read the Project files. Wait a moment and load again.');
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
// `knownLibraryId` is the library a template run was handed (context.template.libraryId):
// that run goes on out of sight, after the app may have moved to another page.
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

// Registers a file the plugin wrote (hero cutout, song section) in the Project once, reusing an earlier import by path.
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

// Builds the vlog from 26 chosen videos (by slot), a hero photo and the user's song, all inventory rows:
// the panel's Create Draft and a template run share it. Resolves to the saved Draft.
async function buildTravelVlog(sdk,{projectId,chosen,heroPhoto,song,cuts,title,color,cutoutMode,grade,name,say,stillCurrent,libraryId=null,onDraft=_id=>{}}){
 say('Finding the beat of your song…');
 const fit=JSON.parse(await builder(sdk,{mode:'song',song:song.path,cuts},'Fit the vlog to the song',49152,240000));
 const timing=fit.timing;
 const needs=JSON.parse(await builder(sdk,{mode:'needs',timing},'Read slot lengths',15000));
 for(const s of VIDEO_SLOTS){const d=chosen[s].duration;if(d!=null&&d+1e-3<needs[s])throw Error(s+' ('+chosen[s].name+') is '+d.toFixed(2)+' s; it needs at least '+needs[s].toFixed(2)+' s.');}
 say('Cutting out the hero subject…');
 const cut=JSON.parse(await builder(sdk,{mode:'cutout',photo:heroPhoto.path,cutoutMode},'Cut out hero subject',15000,180000));
 const cutRow=await ensureImported(sdk,projectId,cut.path,'Image','hero cutout');
 const songRow=await ensureImported(sdk,projectId,fit.audio,'Audio','song section');
 say('Matching colour to the reference…');
 // Measured before the Draft exists (reference 30 fps timing; seconds are rate-free), so a failure leaves no partial Draft.
 const ref=JSON.parse(await builder(sdk,{mode:'plan',fps:30,timing},'Read travel vlog plan',30000));
 const clips=ref.clips.filter(c=>!c.image).map(c=>({key:c.slot+'@'+c.index,slot:c.slot,path:chosen[c.slot].path,inSeconds:c.inSeconds,seconds:(c.endFrame-c.startFrame)/30}));
 clips.push({key:'H',slot:'H',path:heroPhoto.path,inSeconds:0,seconds:0.1});
 const grades=JSON.parse(await builder(sdk,{mode:'grade',clips,strength:grade},'Measure colour',49152,240000));
 const prepared=await prepareNativeImages(window.parent,projectId,[{...heroPhoto},{...cutRow,name:'hero cutout'}],libraryId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating the Draft…');
 const seed=await script(sdk,`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim()||'Travel beat vlog')}});await d.insertGap({seconds:${timing.durationFrames}/30});await d.setFrameSize({width:1080,height:1920});const m=await d.meta();if(m.durationFrames!==Math.round(${timing.durationFrames}*m.fps/30)||m.frameSize?.width!==1080||m.frameSize?.height!==1920)throw Error('Draft frame grid differs from the reference.');const saved=await d.commitAll('Start Travel Beat Vlog Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,'Create travel vlog Draft',true);
 const {draftId,fps}=seed;onDraft(draftId);
 const plan=JSON.parse(await builder(sdk,{mode:'plan',fps,timing},'Read travel vlog plan',30000));
 say('Placing the hero photo…');
 const heroClip=plan.clips.find(c=>c.image);
 const placed=await placeNativeImages(prepared,draftId,plan,[{source:0,startFrame:heroClip.startFrame,endFrame:heroClip.endFrame}],'hero');
 say('Placing 35 video clips, grids, title and your song…');
 const request={mode:'finish',projectId,draftId,fps,videos:Object.fromEntries(VIDEO_SLOTS.map(s=>[s,{resourceId:chosen[s].resourceId,width:chosen[s].width,height:chosen[s].height}])),hero:{resourceId:heroPhoto.resourceId,width:placed.photos[0].width,height:placed.photos[0].height},placements:placed.placements,grades,songResourceId:songRow.resourceId,title:{text:title,color},timing};
 const fin=await script(sdk,await builder(sdk,request,'Build travel vlog finishing step',400000),'Finish travel vlog Draft',true,120);
 if(fin?.status!=='saved')throw Error((fin?.message||'Could not save the Draft.')+(fin?.stage?' ('+fin.stage+')':''));
 say('Putting the hero subject in front of the title…');
 const top=await placeNativeImages(prepared,draftId,plan,[{source:1,startFrame:plan.title.startFrame,endFrame:plan.title.endFrame}],'cutout');
 const fin2=await script(sdk,await builder(sdk,{mode:'cutoutFinish',fps,draftId,cutout:top.placements[0],hero:request.hero,grade:grades.H||null,timing},'Build cutout step',100000),'Finish hero cutout',true,60);
 if(fin2?.status!=='saved')throw Error(fin2?.message||'Could not save the hero cutout.');
 return {draftId};
}

// A template run (Clip highlights): the app hands over the hero photo, the three
// long shots (under the two grids and before the ending), the other 23 clips in the
// order picked, and the song; everything else is this panel's own default.
const LONG_SLOTS=['V12','V17','V22'],SHORT_SLOTS=VIDEO_SLOTS.filter(s=>!LONG_SLOTS.includes(s));
const TEMPLATE_DEFAULTS={title:'TRAVEL',color:'#F4C711',cutoutMode:'person',grade:0.7,name:'Travel beat vlog'};
const TEMPLATE_FAILED='Travel Beat Vlog could not make the timeline; try again.';
function templateIssue(message){return Object.assign(Error(message),{publicMessage:message});}
function templateMessage(error){
 if(error?.publicMessage)return error.publicMessage;
 const said=String(error?.message||'');
 if(/^This Selects version does not support/.test(said))return 'Update Selects to use Travel Beat Vlog.';
 if(/needs at least/.test(said))return said.replace(/^V\d+ \((.+?)\) is/,'$1 is');
 if(/song is too short|song file is missing/i.test(said))return said;
 if(/cutout|swiftc|Vision/i.test(said))return 'Travel Beat Vlog could not cut out the hero photo. Check that Xcode Command Line Tools are installed, then try again.';
 return TEMPLATE_FAILED;
}
// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order, so they pair up row by row; names and types are compared so a
// list that changed in between is refused rather than mismatched.
async function scriptResourceIds(sdk, projectId) {
  const [app, run] = await Promise.all([
    sdk.call("listProjectResources", projectId),
    sdk.runScript({ summary: "Match picked files", allowCommit: false, script: `return (await selects.project(${JSON.stringify(projectId)}).resources()).map(r=>({id:r.resourceId,name:r.name,type:r.type}));` }),
  ]);
  const rows = run?.result;
  if (!Array.isArray(app) || run.isError || !Array.isArray(rows) || app.length !== rows.length || app.some((a, i) => a.name !== rows[i].name || a.type !== rows[i].type)) throw new Error(run?.output || "Could not match the picked files to this project.");
  return new Map(app.map((a, i) => [a.resourceId, rows[i].id]));
}
async function templateMedia(sdk,projectId,inputs){
 const hero=(inputs?.hero||[]).filter(x=>x?.kind==='image'&&x.resourceId);
 const long=(inputs?.long||[]).filter(x=>x?.kind==='video'&&x.resourceId);
 const clips=(inputs?.clips||[]).filter(x=>x?.kind==='video'&&x.resourceId);
 const song=(inputs?.song||[]).filter(x=>x?.kind==='audio'&&x.resourceId);
 if(hero.length!==1)throw templateIssue('Pick one hero photo, then try again.');
 if(long.length!==LONG_SLOTS.length)throw templateIssue('Pick three long shots, then try again.');
 if(clips.length!==SHORT_SLOTS.length)throw templateIssue('Pick 23 clips, then try again.');
 if(song.length!==1)throw templateIssue('Pick one song, then try again.');
 const rows=await inventory(sdk,projectId,'List project media');
 const ids=await scriptResourceIds(sdk,projectId);
 const row=(pick,type)=>{
  const id=ids.get(pick.resourceId)??pick.resourceId;
  const m=rows.find(r=>r.resourceId===id&&r.type===type);
  if(!m)throw templateIssue((pick.name||'A picked file')+' is no longer in this project.');
  if(type==='Video'&&(!m.width||!m.height))throw templateIssue(m.name+' is still being read; wait a moment, then try again.');
  return m;
 };
 const chosen={};
 LONG_SLOTS.forEach((s,i)=>{chosen[s]=row(long[i],'Video');});
 SHORT_SLOTS.forEach((s,i)=>{chosen[s]=row(clips[i],'Video');});
 return {chosen,heroPhoto:row(hero[0],'Image'),song:row(song[0],'Audio')};
}
// Nobody sees this frame, so it shows one status line. It starts once per run id
// and reports once, unless a newer run replaced it.
function TravelTemplateRun({sdk,context}){
 const runId=context.template?.runId,[status,setStatus]=React.useState('Making your travel vlog…');
 const started=React.useRef(null),alive=React.useRef(true),latest=React.useRef(context);latest.current=context;
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 React.useEffect(()=>{
  if(!runId||started.current===runId)return;started.current=runId;
  const live=()=>alive.current&&latest.current.template?.runId===runId;
  let ended=false,draftId=null;
  const finish=result=>{if(ended)return;ended=true;if(!live())return;try{sdk.finishTemplate(result);}catch{}};
  const say=text=>{if(live())setStatus(text);};
  const projectId=context.projectId,template=context.template;
  (async()=>{
   try{
    if(!projectId)throw templateIssue('Open a project, then try again.');
    say('Finding your clips…');
    const {chosen,heroPhoto,song}=await templateMedia(sdk,projectId,template?.inputs);
    const cutoutMode=template?.options?.subject==='foreground'?'foreground':TEMPLATE_DEFAULTS.cutoutMode;
    const cuts=template?.options?.cuts==='reference'?'reference':'hits';
    const done=await buildTravelVlog(sdk,{projectId,chosen,heroPhoto,song,cuts,...TEMPLATE_DEFAULTS,cutoutMode,say,stillCurrent:live,libraryId:template?.libraryId||null,onDraft:id=>{draftId=id;}});
    finish({sequenceId:done.draftId});
   }catch(error){
    console.warn('[travel-beat-vlog] template run failed:',error?.message||String(error),{draftId});
    finish({error:draftId?'Travel Beat Vlog stopped partway; the unfinished timeline "'+TEMPLATE_DEFAULTS.name+'" may need removing.':templateMessage(error)});
   }finally{finish({error:TEMPLATE_FAILED});}
  })();
 },[runId]);
 return <p role="status" style={{margin:0,fontSize:12}}>{status}</p>;
}

export default function Panel(props){return props.context.template?<TravelTemplateRun {...props}/>:<TravelPanel {...props}/>;}
// The manual panel asks for the same things, in the same groups, as the template page:
// hero photo, three long shots, 23 clips, the song, and the template's two choices.
function TravelPanel({sdk,context,ui}){
 const [media,setMedia]=React.useState([]),[loadedProject,setLoadedProject]=React.useState(null);
 const [hero,setHero]=React.useState(''),[long,setLong]=React.useState(['','','']),[clips,setClips]=React.useState(Array(23).fill('')),[song,setSong]=React.useState('');
 const [cutoutMode,setCutoutMode]=React.useState('person'),[cuts,setCuts]=React.useState('hits');
 const [title,setTitle]=React.useState('TRAVEL'),[color,setColor]=React.useState('#F4C711'),[grade,setGrade]=React.useState(0.7),[name,setName]=React.useState('Travel beat vlog');
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setMedia([]);setHero('');setLong(['','','']);setClips(Array(23).fill(''));setSong('');setLoadedProject(null);setSaved(null);setStatus('');},[context.projectId]);
 // Files the plugin created itself (the hero cutout, the song section) are not user media.
 const own=m=>/\/\.selects\/plugin-data\//.test(m.path||'');
 const of=type=>media.filter(m=>m.type===type&&!own(m));
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project media…');
  try{
   const projectId=context.projectId,rows=await inventory(sdk,projectId,'List project media');
   if(currentProject.current!==projectId)return;
   setMedia(rows);setLoadedProject(projectId);
   const mine=r=>/\/\.selects\/plugin-data\//.test(r.path||''),v=rows.filter(r=>r.type==='Video'&&!mine(r)),im=rows.filter(r=>r.type==='Image'&&!mine(r)),au=rows.filter(r=>r.type==='Audio'&&!mine(r));
   setLong(old=>old.map((x,i)=>x||v[i]?.resourceId||''));setClips(old=>old.map((x,i)=>x||v[3+i]?.resourceId||''));
   setHero(old=>old||im[0]?.resourceId||'');setSong(old=>old||au[0]?.resourceId||'');
   setStatus(v.length>=26&&im.length&&au.length?'Check the hero photo, the long shots, the 23 clips and the song.':'The format needs 1 hero photo, 26 videos and 1 song; this Project has '+im.length+' photos, '+v.length+' videos and '+au.length+' songs.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId)return;
  running.current=true;setBusy(true);setStatus('Checking media…');
  try{
   const pick=(id,type,what)=>{const m=media.filter(x=>x.resourceId===id);if(m.length!==1)throw Error('Choose '+what+'.');if(m[0].type!==type)throw Error(m[0].name+' is not '+(type==='Video'?'a video':type==='Image'?'a photo':'a song')+'.');return m[0];};
   const chosen={};
   LONG_SLOTS.forEach((s,i)=>{chosen[s]=pick(long[i],'Video','long shot '+(i+1));});
   SHORT_SLOTS.forEach((s,i)=>{chosen[s]=pick(clips[i],'Video','clip '+(i+1));});
   for(const m of Object.values(chosen))if(!m.width||!m.height)throw Error(m.name+' has no frame size yet; wait for the Project to finish reading it.');
   const {draftId}=await buildTravelVlog(sdk,{projectId,chosen,heroPhoto:pick(hero,'Image','a hero photo'),song:pick(song,'Audio','a song'),cuts,title,color,cutoutMode,grade,name,say:setStatus,stillCurrent:()=>currentProject.current===projectId});
   setSaved({draftId});setStatus('Saved. Every shot is its own clip with focus controls; the title text and colour are editable.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 const opts=type=>of(type).map(m=>({value:m.resourceId,label:m.name}));
 const vOpts=opts('Video'),setAt=(setter,i)=>v=>setter(old=>old.map((x,j)=>j===i?v:x));
 return <ui.Stack gap={16}><ui.Section title="Travel Beat Vlog">
  <ui.Message>A travel beat vlog in 9:16 cut to your song: two fast montages on its drum hits, a hero photo with the title behind its subject, two 2×2 grids that fill on the beat, and a fade out.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project media</ui.Button>
  <ui.Select label="Hero photo" value={hero} onChange={setHero} options={opts('Image')} placeholder="Choose photo" disabled={!ready}/>
  {long.map((v,i)=><ui.Select key={'l'+i} label={'Long shot '+(i+1)} value={v} onChange={setAt(setLong,i)} options={vOpts} placeholder="Choose video" disabled={!ready}/>)}
  {clips.map((v,i)=><ui.Select key={'c'+i} label={'Clip '+(i+1)} value={v} onChange={setAt(setClips,i)} options={vOpts} placeholder="Choose video" disabled={!ready}/>)}
  <ui.Select label="Song" value={song} onChange={setSong} options={opts('Audio')} placeholder="Choose song" disabled={!ready}/>
  <ui.Select label="In front of the title" value={cutoutMode} onChange={setCutoutMode} options={[{value:'person',label:'People'},{value:'foreground',label:'Main subject'}]} disabled={busy}/>
  <ui.Select label="Cuts" value={cuts} onChange={setCuts} options={[{value:'hits',label:"Follow the song's hits"},{value:'reference',label:'Keep the original rhythm'}]} disabled={busy}/>
  <ui.TextField label="Title" value={title} onChange={setTitle} disabled={busy}/>
  <ui.TextField label="Title colour (#RRGGBB)" value={color} onChange={setColor} disabled={busy}/>
  <ui.Slider label="Match colour to the reference" min={0} max={1} step={0.05} value={grade} onChange={setGrade} disabled={busy}/>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||!hero||!song||long.some(v=>!v)||clips.some(v=>!v)||!/^#[0-9a-fA-F]{6}$/.test(color)} busy={busy}>{saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}
