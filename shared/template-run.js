// Durable ownership of one app-supplied template run. Original source is embedded
// into its declared consumers; no cross-plugin runtime import is required.
function templateRunJSON(value) {
 const text=JSON.stringify(value).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(text.length>49152)throw Error('The template run receipt exceeds the local file limit.');
 return text;
}
// SDK scripts have no browser/Node encoding globals. The JSON above is ASCII.
function templateRunBase64(text) {
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';
 for(let i=0;i<text.length;i+=3){
  const a=text.charCodeAt(i),b=text.charCodeAt(i+1),c=text.charCodeAt(i+2);
  out+=alphabet[a>>2]+alphabet[((a&3)<<4)|(Number.isNaN(b)?0:b>>4)]+(Number.isNaN(b)?'=':alphabet[((b&15)<<2)|(Number.isNaN(c)?0:c>>6)])+(Number.isNaN(c)?'=':alphabet[c&63]);
 }
 return out;
}
function templateRunIssue(code,message) {
 return Object.assign(Error(message),{code,publicMessage:message});
}
function validateTemplateRun(row,scope,digest) {
 const invalid=()=>templateRunIssue('TEMPLATE_RUN_INVALID','The saved run record could not be verified. Inspect the Project before starting a new run.');
 if(!row||row.version!==1||!row.scope||Object.keys(row.scope).length!==4||Object.keys(scope).some(key=>row.scope[key]!==scope[key])||row.requestDigest!==digest||
  typeof row.owner!=='string'||!/^[\da-f-]{36}$/i.test(row.owner)||!['claimed','saved','notSaved','outcomeUnknown'].includes(row.status))throw invalid();
 if(row.savedDraftId!==undefined&&(row.status!=='outcomeUnknown'||typeof row.savedDraftId!=='string'||!row.savedDraftId||row.savedDraftId.length>1024||row.savedDraftId.includes('\0')))throw invalid();
 if(row.status==='saved'){
  const r=row.result;
  if(!r||typeof r.draftId!=='string'||!r.draftId||!Number.isFinite(r.fps)||r.fps<=0||!Number.isSafeInteger(r.durationFrames)||r.durationFrames<1||
   !Number.isSafeInteger(r.frameSize?.width)||r.frameSize.width<1||!Number.isSafeInteger(r.frameSize?.height)||r.frameSize.height<1||!Array.isArray(r.clips)||!r.clips.length||r.clips.length>256||
   r.clips.some(c=>!c||!Number.isSafeInteger(c.clipId)||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame||c.endFrame>r.durationFrames))throw invalid();
  if(new Set(r.clips.map(c=>c.clipId)).size!==r.clips.length)throw invalid();
  if(r.graphics!==undefined){
   if(!Array.isArray(r.graphics)||r.graphics.length>256||r.graphics.some(g=>!g||!Number.isSafeInteger(g.clipId)||g.clipId<0||typeof g.trackId!=='string'||!g.trackId||!Number.isSafeInteger(g.startFrame)||!Number.isSafeInteger(g.endFrame)||g.startFrame<0||g.endFrame<=g.startFrame||g.endFrame>r.durationFrames||!g.parameters||typeof g.parameters!=='object'||Array.isArray(g.parameters)||'tsxCode' in g))throw invalid();
   if(new Set(r.graphics.map(g=>g.clipId)).size!==r.graphics.length||r.graphics.some(g=>r.clips.some(c=>c.clipId===g.clipId)))throw invalid();
  }
  if(r.transforms!==undefined){
   const visual=[...r.clips,...(r.graphics??[])],point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
   if(!Array.isArray(r.transforms)||r.transforms.length!==visual.length||new Set(r.transforms.map(t=>t?.clipId)).size!==r.transforms.length)throw invalid();
   for(const row of r.transforms){
    const t=row?.transform;
    if(!row||!visual.some(c=>c.clipId===row.clipId&&c.trackId===row.trackId)||Object.keys(row).length!==3||!t||Object.keys(t).length!==10||typeof t.enabled!=='boolean'||typeof t.flipHorizontal!=='boolean'||typeof t.flipVertical!=='boolean'||!point(t.position)||!point(t.scale)||t.scale.x<=0||t.scale.y<=0||!point(t.anchor)||!Number.isFinite(t.rotation))throw invalid();
    for(const key of ['positionKeys','scaleKeys','rotationKeys'])if(!Array.isArray(t[key])||t[key].length>256||t[key].some(k=>!k||!Number.isFinite(k.atSeconds)||k.atSeconds<0||(key==='positionKeys'?!point(k):!Number.isFinite(k[key==='scaleKeys'?'scale':'rotation']))))throw invalid();
   }
  }
  if(r.audio!==undefined){
   if(!Array.isArray(r.audio)||r.audio.length>256||new Set(r.audio.map(a=>a?.clipId)).size!==r.audio.length)throw invalid();
   const db=value=>Number.isFinite(value)&&value>=-60&&value<=12,visual=[...r.clips,...(r.graphics??[])];
   for(const a of r.audio){
    const s=a?.settings;
    if(!a||Object.keys(a).length!==(a.source===undefined?8:9)||!Number.isSafeInteger(a.clipId)||a.clipId<0||typeof a.trackId!=='string'||!a.trackId||!['main','audio'].includes(a.trackKind)||typeof a.resourceId!=='string'||!a.resourceId||!Number.isSafeInteger(a.startFrame)||!Number.isSafeInteger(a.endFrame)||a.startFrame<0||a.endFrame<=a.startFrame||a.endFrame>r.durationFrames||visual.some(c=>c.clipId===a.clipId)||!s||Object.keys(s).length!==4)throw invalid();
    if(a.source!==undefined){
     const t=a.source,rate=t?.playbackSpeed;
     if(!t||Object.keys(t).length!==4||!Number.isFinite(t.startSeconds)||t.startSeconds<0||!Number.isFinite(t.endSeconds)||t.endSeconds<=t.startSeconds||!rate||Object.keys(rate).length!==2||!Number.isSafeInteger(rate.numerator)||rate.numerator<1||!Number.isSafeInteger(rate.denominator)||rate.denominator<1||rate.numerator/rate.denominator<.01||rate.numerator/rate.denominator>100||typeof t.preserveAudioPitch!=='boolean')throw invalid();
    }
    if(a.audioSourceIndexes!==null&&(!Array.isArray(a.audioSourceIndexes)||a.audioSourceIndexes.length>256||new Set(a.audioSourceIndexes).size!==a.audioSourceIndexes.length||a.audioSourceIndexes.some(i=>!Number.isSafeInteger(i)||i<0)))throw invalid();
    const duration=(a.endFrame-a.startFrame)/r.fps;
    if(!Array.isArray(s.volumeKeys)||s.volumeKeys.length>256||(s.volumeKeys.length?s.volumeDb!==null:!db(s.volumeDb))||s.volumeKeys.some(k=>!k||!Number.isFinite(k.atSeconds)||k.atSeconds<0||k.atSeconds>duration||!db(k.volumeDb))||!Number.isFinite(s.fadeInSeconds)||s.fadeInSeconds<0||s.fadeInSeconds>duration||!Number.isFinite(s.fadeOutSeconds)||s.fadeOutSeconds<0||s.fadeOutSeconds>duration)throw invalid();
   }
  }
  if(r.programs!==undefined){
   const p=r.programs,visual=[...r.clips,...(r.graphics??[])],used=new Set();
   if(!p||Object.keys(p).length!==2||!Array.isArray(p.sources)||p.sources.length>256||p.sources.some(s=>typeof s!=='string'||!s||s.length>49152)||new Set(p.sources).size!==p.sources.length||!Array.isArray(p.clips)||p.clips.length!==visual.length||new Set(p.clips.map(c=>c?.clipId)).size!==p.clips.length)throw invalid();
   const entry=(e,effect)=>{
    if(!e||Object.keys(e).length!==(effect?4:3)||!Number.isSafeInteger(e.source)||e.source<0||e.source>=p.sources.length||!e.parameters||typeof e.parameters!=='object'||Array.isArray(e.parameters)||!Array.isArray(e.editableParameters)||e.editableParameters.length>256||effect&&(typeof e.name!=='string'||!e.name))throw invalid();
    if(new Set(e.editableParameters.map(d=>d?.key)).size!==e.editableParameters.length||e.editableParameters.some(d=>!d||typeof d.key!=='string'||!d.key||typeof d.label!=='string'||!['text','number','color','boolean','select'].includes(d.type)||!Object.prototype.hasOwnProperty.call(e.parameters,d.key)))throw invalid();
    used.add(e.source);
   };
   for(const c of p.clips){
    if(!c||Object.keys(c).length!==4||!visual.some(v=>v.clipId===c.clipId&&v.trackId===c.trackId)||!Array.isArray(c.effects)||c.effects.length>64)throw invalid();
    c.effects.forEach(e=>entry(e,true));
    const graphic=(r.graphics??[]).some(g=>g.clipId===c.clipId);
    if(graphic)entry(c.graphic,false);else if(c.graphic!==null)throw invalid();
   }
   if(used.size!==p.sources.length)throw invalid();
  }
 }
 return row;
}
// Called inside the SAME Main SDK invocation after authoring, before the reply.
// Only the exclusive claim's owner can publish this receipt; no save is retried.
async function writeTemplateRunResult(selects,claim,result,json,encode) {
 try{
  const row=JSON.parse(claim.expectedText),status=result.status;
  if(row.status!=='claimed'||!['saved','notSaved','outcomeUnknown'].includes(status))throw Error('Invalid run receipt state');
  let saved;
  if(status==='saved'){
   if(!('fps' in result)||!('durationFrames' in result)||!('frameSize' in result)||!('clips' in result)||typeof result.draftId!=='string'||!result.draftId)throw Error('Saved run receipt is incomplete');
   saved={draftId:result.draftId,fps:result.fps,durationFrames:result.durationFrames,frameSize:result.frameSize,clips:result.clips,...'graphics' in result?{graphics:result.graphics}:{},...'transforms' in result?{transforms:result.transforms}:{},...'audio' in result?{audio:result.audio}:{},...'programs' in result?{programs:result.programs}:{}};
  }
  const savedDraftId=status==='outcomeUnknown'?result.draftId:null;
  if(savedDraftId!=null&&(typeof savedDraftId!=='string'||!savedDraftId||savedDraftId.length>1024||savedDraftId.includes('\0')))throw Error('Invalid saved Draft identity');
  const next=json({...row,status,...saved?{result:saved}:{},...savedDraftId?{savedDraftId}:{}});
  const reply=await selects.files.compareAndReplace({path:claim.path,expectedBase64:encode(claim.expectedText),base64:encode(next)});
  return {...result,runReceiptSaved:reply?.replaced===true};
 }catch{return {...result,runReceiptSaved:false};}
}
async function executeTemplateRun(sdk,files,scope,request,isCurrent,perform,verify) {
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};
 check();
 if(!scope||!['pluginId','libraryId','projectId','runId'].every(key=>typeof scope[key]==='string'&&scope[key].length>0&&scope[key].length<=1024)||!/^[a-z0-9-]+$/.test(scope.pluginId))fail('TEMPLATE_RUN_INVALID','The template run target is incomplete. Start again from the Project.');
 scope={pluginId:scope.pluginId,libraryId:scope.libraryId,projectId:scope.projectId,runId:scope.runId};
 const targetCheck=async()=>{
  const target=await sdk.call('getProjectDraftScaffold',scope.projectId);
  if(target?.owner?.libraryId!==scope.libraryId||target.owner.projectId!==scope.projectId)fail('TEMPLATE_RUN_TARGET','The template run belongs to a different Project or library. Start again from the intended Project.');
  check();
 };
 await targetCheck();
 if(!files||!['join','homedir','exists','stat','readRange','writeFile','compareAndReplace','mkdir'].every(key=>typeof files[key]==='function'))fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 if(typeof globalThis.crypto?.subtle?.digest!=='function'||typeof globalThis.TextEncoder!=='function'||typeof globalThis.TextDecoder!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(templateRunJSON(value)))),n=>n.toString(16).padStart(2,'0')).join('');
 const key=await digest(scope),requestDigest=await digest(request);
 const directory=files.join(files.homedir(),'.selects','plugin-data',scope.pluginId,'template-runs'),path=files.join(directory,key+'.json');
 const read=async()=>{
  if(!await files.exists(path))return null;
  let row;
  try{
   for(let attempt=0;attempt<3;attempt++){
   const stat=await files.stat(path);if(stat?.isDirectory===false&&stat.size===0)continue;
   if(!stat||stat.isDirectory!==false||!Number.isSafeInteger(stat.size)||stat.size<1||stat.size>49152)throw Error('Invalid record size');
   const bytes=await files.readRange(path,0,stat.size),after=await files.stat(path);
   if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]')throw Error('Invalid run record bytes');
   // A legitimate Main-side receipt may replace the claim between these reads.
   // Retry bounded observations; never parse a mixture or retry authoring.
   if(!after||['size','mtimeMs','ino'].some(key=>stat[key]!==after[key]))continue;
   if(bytes.byteLength!==stat.size)throw Error('Invalid run record bytes');
   row=JSON.parse(new TextDecoder().decode(bytes));break;
   }
   if(row===undefined)fail('TEMPLATE_RUN_PENDING','The run record is changing. Check its saved result again.');
  }catch(error){if(error?.code==='TEMPLATE_RUN_PENDING')throw error;fail('TEMPLATE_RUN_INVALID','The saved run record could not be read. Inspect the Project before starting a new run.');}
  return validateTemplateRun(row,scope,requestDigest);
 };
 const recover=async row=>{
  if(row.status==='saved'){await targetCheck();return verify({...row.result,status:'saved',projectId:scope.projectId});}
  if(row.status==='notSaved')fail('TEMPLATE_RUN_NOT_SAVED','This run stopped before saving a Draft. Start a new run to retry.');
  if(row.status==='outcomeUnknown'&&row.savedDraftId)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The saved Draft '+row.savedDraftId+' could not be confirmed. Inspect it before starting another run.'),{draftId:row.savedDraftId});
  fail('TEMPLATE_RUN_PENDING','This run may still be saving or awaiting confirmation. Inspect the Project before starting another run.');
 };
 const existing=await read();if(existing)return recover(existing);
 if(typeof globalThis.crypto?.randomUUID!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 const capability=await sdk.runScript({summary:'Check durable template run support',allowCommit:false,script:"return {supported:'files' in selects&&typeof selects.files?.compareAndReplace==='function'&&typeof selects.files?.writeChunk==='function'};"});
 if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 await files.mkdir(directory,{recursive:true});check();
 const owner=crypto.randomUUID(),expectedText=templateRunJSON({version:1,scope,requestDigest,owner,status:'claimed'}),claim={path,expectedText};
 // Exclusive creation is a filesystem operation, including across app windows.
 // compareAndReplace alone serializes only one renderer bridge's own writes.
 try{await files.writeFile(path,expectedText,{flag:'wx'});}catch(cause){
  const row=await read();
  if(!row)fail('TEMPLATE_RUN_STORAGE','The run could not be recorded. Nothing was dispatched. Check local file access and start a new run.');
  if(row.owner!==owner)return recover(row);
  // A lost claim ACK is safe to recover here: authoring has not been dispatched.
 }
 let dispatched=false;
 try{
  check();
  return await perform(claim,async()=>{await targetCheck();dispatched=true;});
 }catch(cause){
  if(!dispatched){
   // No authoring was dispatched. Never overwrite a later Main-side receipt.
   await files.compareAndReplace(path,expectedText,templateRunJSON({...JSON.parse(expectedText),status:'notSaved'})).catch(()=>{});
   if(cause&&typeof cause==='object')Object.assign(cause,{outcome:'notSaved'});
  }else{
   // Main may finish after the transport failed. Keep its expected claim intact
   // so the late receipt can land. A positively saved receipt permits readback.
   const row=await read();if(row?.status==='saved')return recover(row);
   if(row?.status==='notSaved')throw Object.assign(templateRunIssue('TEMPLATE_RUN_NOT_SAVED','This run stopped before saving a Draft. Start a new run to retry.'),{cause});
  }
  throw cause;
 }
}

// SDK-safe projection for an assembly receipt. Main media identity and frame
// intervals, routing, source windows, transforms and Main audio are confirmed
// here; this is not title/effect or other-track semantic approval.
async function readTemplateAssemblyState(draft){
 const meta=await draft.meta(),rows=await draft.clips({trackScope:'main'});
 if(!Number.isFinite(meta.fps)||meta.fps<=0||!Number.isSafeInteger(meta.frameSize?.width)||meta.frameSize.width<1||!Number.isSafeInteger(meta.frameSize?.height)||meta.frameSize.height<1||!Array.isArray(rows))throw Error('The assembled Draft metadata is incomplete.');
 const clips=[];
 for(const row of rows.filter(row=>row.resourceId!=null))clips.push({clipId:row.clipId,trackId:row.trackId,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,
  videoIndex:row.videoIndex??null,audioSourceIndexes:row.audioSourceIndexes??null,playbackSpeed:row.playbackSpeed??null,preserveAudioPitch:row.preserveAudioPitch??null,
  source:await draft.clipSourceWindow(row),transform:await draft.clipTransform(row),audio:await draft.clipAudio(row)});
 clips.sort((a,b)=>a.clipId-b.clipId);
 if(!clips.length||clips.length>256||new Set(clips.map(c=>c.clipId)).size!==clips.length||clips.some(c=>!Number.isSafeInteger(c.clipId)||c.clipId<0||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame))throw Error('The assembled Draft clips could not be confirmed.');
 const state={fps:meta.fps,durationFrames:Math.max(...clips.map(c=>c.endFrame)),frameSize:{width:meta.frameSize.width,height:meta.frameSize.height},clips};
 JSON.stringify(state,(_key,value)=>{if(typeof value==='number'&&!Number.isFinite(value)||['bigint','function','symbol'].includes(typeof value))throw Error('The assembly returned an invalid nonfinite or unsupported value.');return value;});
 return state;
}

async function readTemplateAssemblyFacts(selects,projectId,draftId,readState){
 if(typeof draftId!=='string'||!draftId)throw Error('The assembly returned no Draft identity.');
 const ids=(await selects.project(projectId).meta()).draftIds;
 if(!Array.isArray(ids)||!ids.includes(draftId))throw Error('The assembled Draft is not in its Project.');
 return {draftId,...await readState(selects.draft(draftId))};
}

// Extend the existing durable run owner for templates whose assembly script
// commits before a separate title/look step. A name never proves ownership.
async function executeTemplateAssembly(sdk,files,scope,config,source,isCurrent){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 if(typeof isCurrent!=='function'||!scope||typeof scope.projectId!=='string'||!scope.projectId||typeof scope.runId!=='string'||!scope.runId||!config||config.projectId!==scope.projectId||typeof source!=='string'||source.split('__CONFIG__').length!==2||!source.startsWith('// @template-assembly 1\n'))fail('TEMPLATE_RUN_INVALID','The assembly request is incomplete.');
 if(typeof globalThis.TextEncoder!=='function'||typeof sdk?.call!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 if(new TextEncoder().encode(source).length>131072)fail('TEMPLATE_RUN_INVALID','The assembly script exceeds its input limit.');
 scope={pluginId:scope.pluginId,projectId:scope.projectId,runId:scope.runId,libraryId:scope.libraryId};
 const frozen=JSON.parse(templateRunJSON(config));
 // A display label can be regenerated on remount; it is never run identity.
 const {draftName:displayName,...contentConfig}=frozen;
 const request={config:contentConfig,source};templateRunJSON(request);
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};check();
 const target=await sdk.call('getProjectDraftScaffold',scope.projectId);check();
 if(target?.owner?.projectId!==scope.projectId||typeof target.owner.libraryId!=='string'||!target.owner.libraryId||scope.libraryId!=null&&scope.libraryId!==target.owner.libraryId)fail('TEMPLATE_RUN_TARGET','The assembly belongs to a different Project or library.');
 scope={pluginId:scope.pluginId,libraryId:target.owner.libraryId,projectId:scope.projectId,runId:scope.runId};
 const query=async script=>{check();const reply=await sdk.runScript({summary:'Confirm owned assembly Draft',allowCommit:false,script});check();if(reply.isError||!reply.result)fail('TEMPLATE_RUN_INVALID','The owned Draft could not be read back. Inspect it before starting another run.');return reply.result;};
 const verify=async receipt=>{
  check();const target=await sdk.call('getProjectDraftScaffold',scope.projectId);check();
  if(target?.owner?.projectId!==scope.projectId||target.owner.libraryId!==scope.libraryId)fail('TEMPLATE_RUN_TARGET','The assembly belongs to a different Project or library.');
  const observed=await query(`return await (${readTemplateAssemblyFacts.toString()})(selects,${JSON.stringify(scope.projectId)},${JSON.stringify(receipt.draftId)},${readTemplateAssemblyState.toString()});`);
  const expected={draftId:receipt.draftId,fps:receipt.fps,durationFrames:receipt.durationFrames,frameSize:receipt.frameSize,clips:receipt.clips};
  if(templateRunJSON(observed)!==templateRunJSON(expected))fail('TEMPLATE_RUN_INVALID','The saved Draft has changed since its assembly receipt. Inspect it before starting another run.');
  return {sequenceId:receipt.draftId,fps:receipt.fps,totalFrames:receipt.durationFrames,notes:[],assemblyConfirmed:true};
 };
 return executeTemplateRun(sdk,files,scope,request,isCurrent,async(claim,onDispatch)=>{
  const capability=await sdk.runScript({summary:'Check assembly recovery support',allowCommit:false,script:`const p=selects.project(${JSON.stringify(scope.projectId)});const ids=(await p.meta()).draftIds;const d=ids?.length?selects.draft(ids[0]):await p.createDraft({name:'Template recovery support check'});return {supported:typeof d.clipSourceWindow==='function'&&typeof d.clipTransform==='function'&&typeof d.clipAudio==='function'};`});
  check();if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to confirm saved assembly state before retrying.');
  const body=source.replace('__CONFIG__',()=>`Object.assign(JSON.parse(${JSON.stringify(templateRunJSON(frozen))}),{__beforeCommit:__templateBeforeCommit})`);
  const script=`return await(async(assemble,readFacts,readState,publish,json,encode)=>{
   let result,preparedState,maySave=false;
   try{
    result=await assemble(async draft=>{
     if(maySave)throw Error('The assembly pre-save hook ran more than once.');
     preparedState=await readState(draft);
     json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:'x'.repeat(1024),...preparedState}});
     maySave=true;
    });
    if(!maySave)throw Error('The assembly skipped its pre-save confirmation.');
    const facts=await readFacts(selects,${JSON.stringify(scope.projectId)},result?.sequenceId,readState);
    const {draftId,...savedState}=facts;
    if(json(savedState)!==json(preparedState))throw Error('The saved Draft disagrees with its prepared state.');
    if(facts.fps!==result.fps||facts.durationFrames!==result.totalFrames)throw Error('The assembly result disagrees with its saved Draft.');
    const receipt=await publish(selects,${templateRunJSON(claim)},{status:'saved',...facts},json,encode);
    if(receipt.runReceiptSaved!==true)throw Error('The assembly receipt could not be confirmed.');
    return {assembly:result,facts};
   }catch(error){
    if(typeof result?.sequenceId==='string'&&result.sequenceId)await publish(selects,${templateRunJSON(claim)},{status:'outcomeUnknown',draftId:result.sequenceId},json,encode);
    else if(!maySave)await publish(selects,${templateRunJSON(claim)},{status:'notSaved'},json,encode);
    throw error;
   }
  })(async(__templateBeforeCommit)=>{${body}},${readTemplateAssemblyFacts.toString()},${readTemplateAssemblyState.toString()},${writeTemplateRunResult.toString()},${templateRunJSON.toString()},${templateRunBase64.toString()});`;
  if(new TextEncoder().encode(script).length>256*1024)fail('TEMPLATE_RUN_INVALID','The assembly request exceeds the SDK transport limit.');
  await onDispatch();const reply=await sdk.runScript({summary:'Assemble template with owned receipt',allowCommit:true,script});
  if(reply.isError||!reply.result?.facts||!reply.result?.assembly)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The assembly response could not be confirmed. Inspect the Project before starting another run.'),{cause:Error(String(reply.output||'The SDK returned no complete assembly result.'))});
  const confirmed=await verify(reply.result.facts);
  return {...reply.result.assembly,...confirmed,notes:reply.result.assembly.notes??[]};
 },verify);
}

// Discover an uncertain standalone assembly after its renderer realm is gone.
// Payloads are published before their small exclusive manifest. Completed run
// tombstones prevent an old callback from republishing the same run identity.
async function openTemplateAssemblyContinuations(sdk,files,target,isCurrent){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const invalid=()=>fail('TEMPLATE_RUN_INVALID','The pending assembly record could not be verified. Inspect the Project before starting another run.');
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};
 check();
 if(!target||typeof target.pluginId!=='string'||!/^[a-z0-9-]+$/.test(target.pluginId)||typeof target.projectId!=='string'||!target.projectId||target.projectId.length>1024)invalid();
 target={pluginId:target.pluginId,projectId:target.projectId,libraryId:target.libraryId};
 if(!files||!['join','homedir','exists','stat','readRange','writeFile','mkdir','readdir','rm'].every(key=>typeof files[key]==='function')||typeof sdk?.call!=='function'||typeof globalThis.crypto?.subtle?.digest!=='function'||typeof globalThis.TextEncoder!=='function'||typeof globalThis.TextDecoder!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to find pending template runs safely.');
 const owner=await sdk.call('getProjectDraftScaffold',target.projectId);check();
 if(owner?.owner?.projectId!==target.projectId||typeof owner.owner.libraryId!=='string'||!owner.owner.libraryId||target.libraryId!=null&&target.libraryId!==owner.owner.libraryId)fail('TEMPLATE_RUN_TARGET','The pending assembly belongs to a different Project or library.');
 target={pluginId:target.pluginId,projectId:target.projectId,libraryId:owner.owner.libraryId};
 const current=async()=>{check();const row=await sdk.call('getProjectDraftScaffold',target.projectId);check();if(row?.owner?.projectId!==target.projectId||row.owner.libraryId!==target.libraryId)fail('TEMPLATE_RUN_TARGET','The pending assembly belongs to a different Project or library.');};
 const json=value=>{
  let text;
  try{text=JSON.stringify(value,(_key,item)=>{if(typeof item==='number'&&!Number.isFinite(item)||['bigint','function','symbol'].includes(typeof item))throw Error('Unsupported value');return item;}).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));}catch{invalid();}
  if(text.length>262144)fail('TEMPLATE_RUN_INVALID','The pending assembly exceeds its 256 KiB input limit.');
  return text;
 };
 const hash=async text=>{const result=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');check();return result;};
 const directory=files.join(files.homedir(),'.selects','plugin-data',target.pluginId,'template-runs','assembly-pending',await hash(json(target)));
 const completed=files.join(directory,'acknowledged');
 const readText=async(path,limit)=>{
  for(let attempt=0;attempt<3;attempt++){
  check();const before=await files.stat(path);check();if(!before)return null;
  if(before.isDirectory===false&&before.size===0)continue;
  if(before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<1||before.size>limit)invalid();
  const bytes=await files.readRange(path,0,before.size);check();const after=await files.stat(path);check();
  if(!after)return null;
  if(['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))continue;
  if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]'||bytes.byteLength!==before.size)invalid();
  return new TextDecoder().decode(bytes);
  }
  fail('TEMPLATE_RUN_PENDING','The pending assembly record is changing. Check it again.');
 };
 const parse=text=>{try{return JSON.parse(text);}catch{invalid();}};
 const manifest=async row=>{
  if(!row||Object.keys(row).length!==3||row.version!==1||typeof row.digest!=='string'||!/^[a-f0-9]{64}$/.test(row.digest)||!row.scope||Object.keys(row.scope).length!==4||Object.keys(target).some(key=>row.scope[key]!==target[key])||typeof row.scope.runId!=='string'||!row.scope.runId||row.scope.runId.length>1024)invalid();
  return await hash(json(row.scope));
 };
 const done=async(row,key)=>{
  const text=await readText(files.join(completed,key+'.json'),49152);if(text===null)return false;
  const end=parse(text);if(!end||!['saved','notSaved'].includes(end.status)||json(end.record)!==json(row))invalid();return true;
 };
 const validate=(value,row)=>{
  if(!value||json(value.scope)!==json(row.scope)||value.config?.projectId!==target.projectId||typeof value.source!=='string'||!value.source.startsWith('// @template-assembly 1\n')||value.source.split('__CONFIG__').length!==2)invalid();
  // Match the existing assembly adapter's request budget before any new save.
  const {draftName,...content}=value.config;templateRunJSON({config:content,source:value.source});
  return value;
 };
 const load=async(row,key)=>{
  if(await manifest(row)!==key)invalid();
  const text=await readText(files.join(directory,key+'-'+row.digest+'.data'),262144);
  if(text===null)invalid();if(await hash(text)!==row.digest)invalid();
  return validate(parse(text),row);
 };
 const recordOf=async pending=>{
  if(!pending?.scope||Object.keys(target).some(key=>key==='libraryId'?pending.scope[key]!=null&&pending.scope[key]!==target[key]:pending.scope[key]!==target[key]))invalid();
  const scope={...target,runId:pending.scope.runId},text=json({...pending,scope}),row={version:1,scope,digest:await hash(text)},key=await manifest(row);
  return {row,key,text,value:validate(parse(text),row)};
 };
 const store=async pending=>{
  await current();const item=await recordOf(pending),{row,key,text}=item;
  if(await done(row,key))fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');
  await files.mkdir(directory,{recursive:true});check();
  const dataPath=files.join(directory,key+'-'+row.digest+'.data');
  if(await files.exists(dataPath)){if(await readText(dataPath,262144)!==text)invalid();}
  else{check();await files.writeFile(dataPath,text);check();}
  const file=files.join(directory,key+'.json'),expected=templateRunJSON(row);
  try{check();await files.writeFile(file,expected,{flag:'wx'});}catch(error){
   const actual=await readText(file,49152);if(actual===null)throw error;if(actual!==expected)invalid();
  }
  check();if(await done(row,key))fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');
  try{return await load(row,key);}catch(error){if(await done(row,key))fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');throw error;}
 };
 const read=async()=>{
  await current();if(!await files.exists(directory)){check();return null;}
  const names=await files.readdir(directory);check();
  if(!Array.isArray(names)||names.length>4096||names.some(name=>typeof name!=='string'||name.includes('/')||name.includes('\\')))invalid();
  const entries=names.filter(name=>/^[a-f0-9]{64}\.json$/.test(name));
  if(entries.length>64)fail('TEMPLATE_RUN_PENDING','Too many pending assemblies need inspection before another run.');
  const found=[];
  for(const name of entries.sort()){
   const text=await readText(files.join(directory,name),49152);if(text===null)continue;
   const row=parse(text),key=await manifest(row);if(name!==key+'.json')invalid();
   if(!await done(row,key)){
    try{found.push(await load(row,key));}catch(error){if(!await done(row,key))throw error;}
   }
  }
  if(found.length>1)fail('TEMPLATE_RUN_AMBIGUOUS','Several unfinished assemblies belong to this Project. Inspect their run records before starting another run.');
  return found[0]??null;
 };
 const acknowledge=async(pending,status)=>{
  await current();const {row,key}=await recordOf(pending);
  await files.mkdir(completed,{recursive:true});check();
  const path=files.join(completed,key+'.json'),text=templateRunJSON({record:row,status});
  try{await files.writeFile(path,text,{flag:'wx'});}catch(error){if(await readText(path,49152)!==text)throw error;}
  check();
  // Only this immutable run's files are removed. Its tombstone is retained.
  await files.rm(files.join(directory,key+'.json'),{force:true}).catch(()=>{});check();
  await files.rm(files.join(directory,key+'-'+row.digest+'.data'),{force:true}).catch(()=>{});check();
 };
 const resumeAssembly=async pending=>{
  const value=await store(pending);
  let result;
  try{result=await executeTemplateAssembly(sdk,files,value.scope,value.config,value.source,()=>{check();return true;});}
  catch(error){if(error?.outcome==='notSaved'||error?.code==='TEMPLATE_RUN_NOT_SAVED')await acknowledge(value,'notSaved');throw error;}
  check();if(result?.assemblyConfirmed!==true)invalid();
  await acknowledge(value,'saved');return result;
 };
 return {read,store,run:resumeAssembly};
}
