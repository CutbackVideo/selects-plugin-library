// @name Portrait Stage
// @icon palette
// Create an editable Draft with separate audio, person, background and title.
import React, { useEffect, useRef, useState } from 'react';
export default function PortraitStage({ sdk, context }) {
  const [input,setInput]=useState(''); const [outputDir,setOutputDir]=useState('');
  const [color,setColor]=useState('#2455E8'); const [title,setTitle]=useState('PORTRAIT STAGE');
  const [job,setJob]=useState(null); const [busy,setBusy]=useState(true);
  const [error,setError]=useState(''); const [note,setNote]=useState('Loading settings...');
  const [drafts,setDrafts]=useState([]); const [draftId,setDraftId]=useState(''); const [link,setLink]=useState('');
  const active=useRef(false), mounted=useRef(true), stopped=useRef(false), current=useRef(context.projectId);
  current.current=context.projectId;
  const quote=v=>"'"+String(v).replace(/'/g,"'\"'\"'")+"'";
  async function invoke(args) {
    const command='if [ -x "$SELECTS_USER_SKILLS_ROOT/portrait-stage/.local/run" ]; then "$SELECTS_USER_SKILLS_ROOT/portrait-stage/.local/run" '+args.map(quote).join(' ')+'; else printf \'%s\\n\' \'{"status":"error","error":"The local runtime is missing. Follow INSTALL.md."}\'; exit 2; fi';
    const r=await sdk.runShell({summary:'Run portrait stage',command,timeoutMs:240000,maxOutputBytes:24000});
    let v; try{v=JSON.parse(r.stdout||'{}');}catch{throw Error(r.stderr||r.output||'Invalid response');}
    if(r.isError||r.exitCode!==0||r.timedOut||v.error)throw Error(v.error||r.stderr||r.output||'Execution failed');
    if(v.scriptPath){
      const fs=window.parent.__DI__?.FileSystem;
      if(typeof fs?.readFile!=='function')throw Error('This Selects build cannot load the assembly file.');
      const bytes=await fs.readFile(v.scriptPath);v.script=new TextDecoder().decode(bytes);
      if(new TextEncoder().encode(v.script).length!==v.scriptBytes)throw Error('The assembly file changed. Check the job status.');
    }
    return v;
  }
  async function script(source,summary,allowCommit=false){
    const r=await sdk.runScript({script:source,summary,allowCommit});
    if(r.isError||r.result==null)throw Error(r.output||'No result returned. Check the project state.');
    return r.result;
  }
  async function inventory(pid){
    return script(`const p=selects.project(${JSON.stringify(pid)}); const m=await p.meta(); const rows=[]; for(const id of m.draftIds){const d=await selects.draft(id).meta(); if(d.name?.startsWith('Portrait Stage · ')) rows.push({id,name:d.name});} return rows;`,'Read portrait Drafts');
  }
  function checkProject(pid){
    const app=window.parent;const route=app.location.pathname.match(/libraries\/([^/]+)\/projects\/([^/]+)/);
    if(!pid||current.current!==pid||!route||route[2]!==pid)throw Error('The active project changed. Run again in the intended project.');
    return {app,libraryId:route[1]};
  }
  async function generators(pid,id){
    const {app,libraryId}=checkProject(pid); const di=app.__DI__;
    if(typeof di?.SequenceRepository?.findById!=='function'||typeof di?.SequenceEdit?.describeEditableParameters!=='function'||typeof di?.SequenceEdit?.updateEditableParameter!=='function')throw Error('Quick editing is unavailable in this Selects build. Use the Inspector.');
    const rows=await inventory(pid); if(!rows.some(r=>r.id===id))throw Error('Select a Portrait Stage Draft from this project.');
    const seq=await di.SequenceRepository.findById(libraryId,id);if(!seq)throw Error('Draft not found.');
    const catalog=di.SequenceEdit.describeEditableParameters(seq);
    const bg=catalog.generators.filter(g=>g.label==='Portrait Stage · Background');
    const text=catalog.generators.filter(g=>g.label==='Portrait Stage · Title');
    if(bg.length!==1||text.length!==1||!bg[0].values.portraitStageJob||bg[0].values.portraitStageJob!==text[0].values.portraitStageJob)throw Error('The background or title clip is missing or ambiguous.');
    return {di,seq,bg:bg[0],text:text[0]};
  }
  async function loadDraft(pid,id){
    const g=await generators(pid,id);
    if(mounted.current&&current.current===pid){setTitle(g.text.values.title);setColor(g.bg.values.color);}
    const v=await script(`const d=selects.draft(${JSON.stringify(id)}); return {meta:await d.meta(),clips:await d.clips({trackScope:'all'}),link:await selects.editor.linkToDraftFrame(${JSON.stringify(id)},0)};`,'Verify portrait Draft');
    if(mounted.current&&current.current===pid)setLink(v.link.deepLinkUrl);return v;
  }
  useEffect(()=>{
    mounted.current=true;const pid=context.projectId;setBusy(true);setDraftId('');setDrafts([]);setLink('');setError('');
    (async()=>{try{
      const d=await invoke(['defaults']);const j=await invoke(['status']);if(!mounted.current||current.current!==pid)return;
      setInput(d.input||'');setOutputDir(d.outputDir||'');setTitle(d.title||'PORTRAIT STAGE');setColor(d.color||'#2455E8');setJob(j.status==='idle'?null:j);
      if(pid){const rows=await inventory(pid);if(current.current!==pid)return;setDrafts(rows);const selected=rows.find(r=>r.id===context.sequenceId)||rows[rows.length-1];if(selected){setDraftId(selected.id);await loadDraft(pid,selected.id);}}
      setNote('Ready.');
    }catch(e){if(mounted.current)setError(String(e.message||e));}finally{if(mounted.current&&current.current===pid)setBusy(false);}})();
    return()=>{mounted.current=false;stopped.current=true;};
  },[context.projectId]);
  async function locked(action){
    if(active.current)return;const pid=context.projectId;let app;try{app=checkProject(pid).app;}catch(e){setError(e.message);return;}
    const key='__portraitStageStageBusy';if(app[key]){setError('Another Portrait Stage job is running.');return;}
    active.current=true;app[key]=true;stopped.current=false;setBusy(true);setError('');
    try{await action(pid);}catch(e){if(mounted.current)setError(String(e.message||e));}
    finally{active.current=false;app[key]=false;if(mounted.current)setBusy(false);}
  }
  const valid=!!context.projectId&&input.trim().startsWith('/')&&outputDir.trim().startsWith('/')&&/^#[0-9a-fA-F]{6}$/.test(color)&&title.trim().length>0&&title.length<=120&&!/[\r\n]/.test(title);
  const pending=job&&!['done','cancelled'].includes(job.status);
  async function create(){if(!valid)return;await locked(async pid=>{
    setNote('Preparing person layer...');
    let j=await invoke(['start','--input',input.trim(),'--output-dir',outputDir.trim(),'--color',color,'--title',title]);setJob(j);
    while(!['done','cancelled'].includes(j.status)&&!stopped.current&&mounted.current){checkProject(pid);j=await invoke(['step','--job',j.jobId]);setJob(j);setNote(j.phase);}
    if(j.status!=='done'||stopped.current||!mounted.current){setNote('Paused. Resume to continue the saved job.');return;}
    checkProject(pid);setNote('Saving editable Draft...');
    const code=await invoke(['draft-script','--job',j.jobId,'--project',pid,'--title',title,'--color',color]);checkProject(pid);
    const v=await script(code.script,'Create editable portrait Draft',true);
    checkProject(pid);setDraftId(v.draftId);setDrafts(await inventory(pid));const verified=await loadDraft(pid,v.draftId);
    await script(`await selects.editor.openDraft(${JSON.stringify(v.draftId)}); return {opened:true};`,'Open portrait Draft');
    setNote(`${v.reused?'Opened existing Draft':'Draft saved'} · ${verified.meta.frameSize.width}×${verified.meta.frameSize.height} · ${verified.meta.fps}fps · Separate person, background and title clips.`);
  });}
  async function edit(kind){await locked(async pid=>{
    const id=draftId;const g=await generators(pid,id);const target=kind==='title'?g.text:g.bg;const key=kind==='title'?'title':'color';const value=kind==='title'?title:color.toUpperCase();
    if(kind==='title'&&(!value.trim()||value.length>120||/[\r\n]/.test(value)))throw Error('Enter a single-line title of 1 to 120 characters.');
    if(kind==='color'&&!/^#[0-9A-F]{6}$/.test(value))throw Error('Use a #RRGGBB background color.');
    checkProject(pid);await g.di.SequenceEdit.updateEditableParameter({sequence:g.seq,target:target.target,key,value});
    const after=await generators(pid,id);const changed=kind==='title'?after.text:after.bg;
    if(changed.values[key]!==value)throw Error('The saved value could not be verified. Inspect the Draft before retrying.');
    if(after.bg.ownerClipId!==g.bg.ownerClipId||after.text.ownerClipId!==g.text.ownerClipId||(kind==='title'?after.bg.values.color!==g.bg.values.color:after.text.values.title!==g.text.values.title))throw Error('Independent edit verification failed.');
    await loadDraft(pid,id);setNote(`${kind==='title'?'Title':'Background'} updated.`);
  });}
  async function choose(id){if(busy)return;await locked(async pid=>{setDraftId(id);await loadDraft(pid,id);setNote('Draft settings loaded.');});}
  async function cancel(){await locked(async()=>{const j=await invoke(['cancel','--job',job.jobId]);setJob(j);setNote('Job cancelled.');});}
  return <div style={{display:'grid',gap:8,minWidth:0}}>
    <h2>Portrait Stage</h2>
    <small>Create or edit a Draft in this project. Export through Handoff.</small>
    {!context.projectId&&<strong>Open a project first.</strong>}
    <label htmlFor="qa-input">Video path</label><input id="qa-input" value={input} disabled={busy} onChange={e=>setInput(e.target.value)} placeholder="/absolute/path/video.mp4"/>
    <label htmlFor="qa-output">Working media folder</label><input id="qa-output" value={outputDir} disabled={busy} onChange={e=>setOutputDir(e.target.value)} placeholder="/absolute/path/outputs"/>
    <label htmlFor="qa-color">Background color · #RRGGBB</label><input id="qa-color" value={color} disabled={busy} onChange={e=>setColor(e.target.value)}/>
    <input aria-label="Choose background color" type="color" value={/^#[0-9a-fA-F]{6}$/.test(color)?color:'#2455E8'} disabled={busy} onChange={e=>setColor(e.target.value)}/>
    <label htmlFor="qa-title">Title (up to 120 characters)</label><input id="qa-title" value={title} maxLength={120} disabled={busy} onChange={e=>setTitle(e.target.value)}/>
    <small>540×960 Draft with separate editable layers and original audio.</small>
    <small>Experimental: short clips only; person layer at 360×640.</small>
    <button id="qa-run" disabled={busy||!valid} onClick={create}>{busy?'Processing...':pending?'Resume':'Create Draft'}</button>
    {busy&&active.current&&<button data-variant="secondary" onClick={()=>{stopped.current=true;setNote('Pausing after the current batch...');}}>Pause</button>}
    {!busy&&pending&&<button id="qa-cancel" data-variant="secondary" onClick={cancel}>Cancel job</button>}
    {job&&<div style={{display:'grid',gap:4,overflowWrap:'anywhere'}}><progress aria-label="Progress" max={100} value={job.progress||0} style={{width:'100%'}}/><small>{job.phase} · {job.progress||0}% · {job.processedFrames}/{job.totalFrames} frames</small></div>}
    <hr/><label htmlFor="qa-draft">Draft to edit</label>
    <select id="qa-draft" value={draftId} disabled={busy||!drafts.length} onChange={e=>choose(e.target.value)}><option value="">Create a Draft first</option>{drafts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
    <button id="qa-edit-title" data-variant="secondary" disabled={busy||!draftId} onClick={()=>edit('title')}>Apply title</button>
    <button id="qa-edit-color" data-variant="secondary" disabled={busy||!draftId} onClick={()=>edit('color')}>Apply background</button>
    {draftId&&<small style={{overflowWrap:'anywhere'}}>Draft ID: <code id="qa-draft-id">{draftId}</code></small>}
    {link&&<a href={link}>Open Draft</a>}
    <small role="status" style={{overflowWrap:'anywhere'}}>{note}</small>
    {error&&<div role="alert" style={{color:'var(--panel-danger)',overflowWrap:'anywhere'}}>Error: {error}</div>}
    <small>You can also edit the background and title in the Inspector.</small>
    <a href="selects-action://document?path=skills%2Fportrait-stage%2FINSTALL.md">Setup instructions</a>
  </div>;
}
