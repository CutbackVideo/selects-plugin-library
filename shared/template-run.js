// Durable ownership of one app-supplied template run. Original source is embedded
// into its declared consumers; no cross-plugin runtime import is required.
function templateRunJSON(value,limit=49152) {
 // Request data may opt in to a larger budget. Receipt envelopes and their
 // exclusive/CAS writes retain the original 48 KiB default and exact bytes.
 if(!Number.isSafeInteger(limit)||limit<49152||limit>131072)throw Error('Invalid template request limit.');
 const text=JSON.stringify(value).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(text.length>limit)throw Error('The template run receipt exceeds the local file limit.');
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
// A canonical, bounded JSON value for snapshots/recipes. Unlike the small run
// envelope, state can include fonts/programs; it is stored in chunked files.
function templateStateJSON(value,limit=8388608){
 const text=JSON.stringify(value,(_key,item)=>{
  if(typeof item==='number'&&!Number.isFinite(item)||['function','symbol','bigint'].includes(typeof item))throw Error('Template state contains an unsupported value.');
  return item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item;
 }).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(text.length>limit)throw Error('Template state exceeds its input limit.');return text;
}
// SDK-safe state of every exposed timeline row. Read-only targets never cross
// edits or script calls. Working copies have no source-window read capability:
// null is explicitly pending, never a source window inferred from the recipe.
async function readTemplateSavedState(draft,sources=null,observeSource=null){
 const meta=await draft.meta(),graphics=await draft.motionGraphics(),rows=await draft.clips({trackScope:'all'});
 if(!Number.isFinite(meta.fps)||meta.fps<=0||!Number.isSafeInteger(meta.durationFrames)||meta.durationFrames<1||!Number.isSafeInteger(meta.frameSize?.width)||meta.frameSize.width<1||!Number.isSafeInteger(meta.frameSize?.height)||meta.frameSize.height<1||!Array.isArray(rows)||rows.length>1024||new Set(rows.map(r=>r.clipId)).size!==rows.length||!Array.isArray(graphics))throw Error('The Draft state is incomplete.');
 const clips=[];
 for(const row of rows){
  if(!Number.isSafeInteger(row.clipId)||typeof row.trackId!=='string'||!row.trackId||!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame)throw Error('The Draft row is incomplete.');
  const graphic=graphics.find(g=>g.clip.clipId===row.clipId&&g.clip.trackId===row.trackId),media=row.resourceId!=null&&['main','video','audio'].includes(row.trackKind),visual=['main','video'].includes(row.trackKind)&&(media||!!graphic);
  const effects=[];
  if(visual)for(const effect of await draft.videoEffects(row))effects.push({effectIndex:effect.effectIndex,name:effect.name,effectName:effect.effectName,enabled:effect.enabled,program:await draft.videoEffectProgram(effect)});
  clips.push({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId??null,startFrame:row.startFrame,endFrame:row.endFrame,videoIndex:row.videoIndex??null,audioSourceIndexes:row.audioSourceIndexes??null,color:row.color??null,playbackSpeed:row.playbackSpeed??null,preserveAudioPitch:row.preserveAudioPitch??null,text:row.text??null,
   source:media&&sources!==null?observeSource(sources,row):null,audio:media?await draft.clipAudio(row):null,transform:visual?await draft.clipTransform(row):null,effects,graphic:graphic?{name:graphic.name,program:await draft.motionGraphicProgram(row)}:null});
 }
 clips.sort((a,b)=>a.clipId-b.clipId);
 return {fps:meta.fps,durationFrames:meta.durationFrames,frameSize:{width:meta.frameSize.width,height:meta.frameSize.height},clips,...sources===null?{sourcesPending:true}:{}};
}
// SDK-safe immutable snapshot publication and comparison. Compare actual bytes
// in bounded chunks as well as their fresh fingerprint; no SDK encoding global
// or handwritten hash implementation is required.
async function templateStateFile(selects,path,text,encode,expected=null,fingerprint=null){
 const files=selects.files;
 if(!files||!['readRange','writeChunk'].every(key=>typeof files[key]==='function')||typeof fingerprint!=='function'||typeof text!=='string'||!text.length||text.length>8388608)throw Error('Update Selects to confirm template state files.');
 if(!expected){
  for(let offset=0;offset<text.length;offset+=49152){const chunk=text.slice(offset,offset+49152),reply=await files.writeChunk({path,offset,base64:encode(chunk),...offset===0?{mode:'exclusive'}:{}});if(reply?.bytesWritten!==chunk.length)throw Error('Template state file write was incomplete.');}
  const observed=await fingerprint(files,path);
  if(!observed||observed.size!==text.length||typeof observed.sha256!=='string'||!/^[a-f0-9]{64}$/.test(observed.sha256))throw Error('Template state file could not be fingerprinted.');
  expected={path,...observed};
 }
 if(expected.path!==path||expected.size!==text.length)throw Error('The saved template state has changed.');
 const before=await fingerprint(files,path);
 if(!before||before.size!==expected.size||before.sha256!==expected.sha256)throw Error('The template state file has changed.');
 for(let offset=0;offset<text.length;offset+=49152){const chunk=text.slice(offset,offset+49152),reply=await files.readRange({path,offset,length:chunk.length});if(reply?.bytesRead!==chunk.length||reply.base64!==encode(chunk))throw Error('The saved Draft differs from its owned state.');}
 const after=await fingerprint(files,path);if(!after||after.size!==expected.size||after.sha256!==expected.sha256)throw Error('The template state file changed while reading.');
 return expected;
}
function validateTemplateRun(row,scope,digest,recordPath=null) {
 const invalid=()=>templateRunIssue('TEMPLATE_RUN_INVALID','The saved run record could not be verified. Inspect the Project before starting a new run.');
 if(!row||row.version!==1||!row.scope||Object.keys(row.scope).length!==4||Object.keys(scope).some(key=>row.scope[key]!==scope[key])||row.requestDigest!==digest||
  typeof row.owner!=='string'||!/^[\da-f-]{36}$/i.test(row.owner)||!['claimed','saved','notSaved','outcomeUnknown','retired'].includes(row.status))throw invalid();
 if(row.savedDraftId!==undefined&&(row.status!=='outcomeUnknown'||typeof row.savedDraftId!=='string'||!row.savedDraftId||row.savedDraftId.length>1024||row.savedDraftId.includes('\0')))throw invalid();
 if(row.status==='saved'){
  const r=row.result;
  if(!r||typeof r.draftId!=='string'||!r.draftId||!Number.isFinite(r.fps)||r.fps<=0||!Number.isSafeInteger(r.durationFrames)||r.durationFrames<1||
   !Number.isSafeInteger(r.frameSize?.width)||r.frameSize.width<1||!Number.isSafeInteger(r.frameSize?.height)||r.frameSize.height<1||!Array.isArray(r.clips)||!r.clips.length||r.clips.length>256||
   r.clips.some(c=>!c||!Number.isSafeInteger(c.clipId)||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame||c.endFrame>r.durationFrames))throw invalid();
  if(new Set(r.clips.map(c=>c.clipId)).size!==r.clips.length)throw invalid();
  if(r.stateFile!==undefined){const file=r.stateFile;if(!file||Object.keys(file).length!==3||typeof file.path!=='string'||!recordPath||file.path!==recordPath+'.state-'+row.owner+'.json'||typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isSafeInteger(file.size)||file.size<1||file.size>8388608)throw invalid();}
  if(r.sourceGuard!==undefined){
   const g=r.sourceGuard;if(!g||typeof g!=='object'||Array.isArray(g))throw invalid();
   if(g.version===1){
    if(g.owner!==row.owner||!recordPath||g.path!==recordPath+'.sources-'+row.owner+'.json'||!Array.isArray(g.intent)||!g.intent.length||g.intent.length>1000)throw invalid();
   }else if(g.version===2){
    if(scope.pluginId!=='photo-gallery-no2'||Object.keys(g).length!==4||!recordPath||g.path!==recordPath+'.gallery-sources-'+row.owner+'.json'||!Number.isSafeInteger(g.size)||g.size<1||g.size>8388608||typeof g.sha256!=='string'||!/^[a-f0-9]{64}$/.test(g.sha256))throw invalid();
   }else{
    // Gallery guards source metadata/files; Vlog's versioned guard binds saved
    // clip windows to a separately retained planner intent. Keep both contracts.
    const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&!value.includes('\0');
    const identity=item=>item&&text(item.resourceId,1024)&&text(item.path,4096);
    if(scope.pluginId!=='photo-gallery-no2'||Object.keys(g).length!==4||!Array.isArray(g.media)||!g.media.length||g.media.length>21||!Array.isArray(g.files)||!g.files.length||g.files.length>22||!text(g.signature,32768))throw invalid();
    for(const item of g.media)if(!identity(item)||!['image','video'].includes(item.kind)||!Number.isSafeInteger(item.width)||item.width<1||!Number.isSafeInteger(item.height)||item.height<1||item.kind==='video'&&(!Number.isFinite(item.durationSeconds)||item.durationSeconds<=0)||['focusX','focusY'].some(key=>item[key]!==undefined&&(!Number.isFinite(item[key])||item[key]<0||item[key]>1)))throw invalid();
    if(g.music!==null&&(!identity(g.music)||!Number.isFinite(g.music.durationSeconds)||g.music.durationSeconds<=0||g.music.startFrame!==undefined&&(!Number.isSafeInteger(g.music.startFrame)||g.music.startFrame<0)))throw invalid();
    if(new Set(g.files.map(file=>file?.path)).size!==g.files.length||g.files.some(file=>!file||Object.keys(file).length!==3||!text(file.path,4096)||!Number.isSafeInteger(file.size)||file.size<1||typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256))||[...g.media,...g.music?[g.music]:[]].some(item=>!g.files.some(file=>file.path===item.path)))throw invalid();
    const signature=JSON.stringify({media:g.media.map(item=>[item.resourceId,item.path,item.kind,item.width,item.height,item.kind==='video'?item.durationSeconds:null]),music:g.music?[g.music.resourceId,g.music.path,g.music.durationSeconds]:null});
    if(signature!==g.signature)throw invalid();
   }
  }
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
   saved={draftId:result.draftId,fps:result.fps,durationFrames:result.durationFrames,frameSize:result.frameSize,clips:result.clips,...'graphics' in result?{graphics:result.graphics}:{},...'transforms' in result?{transforms:result.transforms}:{},...'audio' in result?{audio:result.audio}:{},...'programs' in result?{programs:result.programs}:{},...'stateFile' in result?{stateFile:result.stateFile}:{},...'sourceGuard' in result?{sourceGuard:result.sourceGuard}:{}};
  }
  const savedDraftId=status==='outcomeUnknown'?result.draftId:null;
  if(savedDraftId!=null&&(typeof savedDraftId!=='string'||!savedDraftId||savedDraftId.length>1024||savedDraftId.includes('\0')))throw Error('Invalid saved Draft identity');
  const next=json({...row,status,...saved?{result:saved}:{},...savedDraftId?{savedDraftId}:{}});
  const reply=await selects.files.compareAndReplace({path:claim.path,expectedBase64:encode(claim.expectedText),base64:encode(next)});
  return {...result,runReceiptSaved:reply?.replaced===true};
 }catch{return {...result,runReceiptSaved:false};}
}
async function executeTemplateRun(sdk,files,scope,request,isCurrent,perform,verify,options={}) {
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};
 check();
 if(!options||['existingOnly','retryNotSaved','retireUnstarted'].some(key=>options[key]!==undefined&&typeof options[key]!=='boolean')||options.existingOnly&&(options.retryNotSaved||options.retireUnstarted)||options.retryNotSaved&&options.retireUnstarted)fail('TEMPLATE_RUN_INVALID','Invalid run recovery options.');
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
 const digest=async(value,limit=49152)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(templateRunJSON(value,limit)))),n=>n.toString(16).padStart(2,'0')).join('');
 const key=await digest(scope),requestDigest=await digest(request,options.requestLimit??49152);
 const directory=files.join(files.homedir(),'.selects','plugin-data',scope.pluginId,'template-runs'),path=files.join(directory,key+'.json');
 let lastReadText=null;
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
   lastReadText=new TextDecoder().decode(bytes);row=JSON.parse(lastReadText);break;
   }
   if(row===undefined)fail('TEMPLATE_RUN_PENDING','The run record is changing. Check its saved result again.');
  }catch(error){if(error?.code==='TEMPLATE_RUN_PENDING')throw error;fail('TEMPLATE_RUN_INVALID','The saved run record could not be read. Inspect the Project before starting a new run.');}
  return validateTemplateRun(row,scope,requestDigest,path);
 };
 const recover=async row=>{
  if(row.status==='saved'){await targetCheck();return verify({...row.result,status:'saved',projectId:scope.projectId});}
  if(row.status==='retired')throw Object.assign(templateRunIssue('TEMPLATE_RUN_RETIRED','This old operation was retired before saving. Start a new template run with the updated version.'),{outcome:'notSaved'});
  if(row.status==='notSaved')fail('TEMPLATE_RUN_NOT_SAVED','This run stopped before saving a Draft. Start a new run to retry.');
  if(row.status==='outcomeUnknown'&&row.savedDraftId)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The saved Draft '+row.savedDraftId+' could not be confirmed. Inspect it before starting another run.'),{draftId:row.savedDraftId});
  fail('TEMPLATE_RUN_PENDING','This run may still be saving or awaiting confirmation. Inspect the Project before starting another run.');
 };
 const existing=await read(),retryText=lastReadText;
 if(existing&&!((options.retryNotSaved||options.retireUnstarted)&&existing.status==='notSaved'))return recover(existing);
 if(options.existingOnly)fail('TEMPLATE_RUN_MISSING','The owned assembly record is missing. Inspect the Project before starting another run.');
 if(typeof globalThis.crypto?.randomUUID!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 const capability=await sdk.runScript({summary:'Check durable template run support',allowCommit:false,script:"return {supported:'files' in selects&&typeof selects.files?.compareAndReplace==='function'&&typeof selects.files?.writeChunk==='function'};"});
 if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 await files.mkdir(directory,{recursive:true});check();
 const owner=crypto.randomUUID(),expectedText=templateRunJSON({version:1,scope,requestDigest,owner,status:'claimed'}),claim={path,expectedText};
 // Exclusive creation is a filesystem operation, including across app windows.
 // compareAndReplace alone serializes only one renderer bridge's own writes.
 if(existing){
  // Only a positive no-save is eligible. The exclusive generation lock covers
  // other renderer bridges too; a CAS alone does not provide that guarantee.
  const lock=path+'.retry-'+existing.owner;
  try{await files.writeFile(lock,owner,{flag:'wx'});}catch(cause){
   const stat=await files.stat(lock),bytes=stat?.size===owner.length?await files.readRange(lock,0,stat.size):null;
   if(!bytes||new TextDecoder().decode(bytes)!==owner)fail('TEMPLATE_RUN_PENDING','A retry of this known no-save run is awaiting confirmation.');
  }
  try{
   const replaced=await files.compareAndReplace(path,retryText,expectedText);
   if(!replaced){const row=await read();if(row?.owner!==owner)return recover(row);}
  }catch(cause){const row=await read();if(row?.owner!==owner)throw cause;}
 }else try{await files.writeFile(path,expectedText,{flag:'wx'});}catch(cause){
  const row=await read();
  if(!row)fail('TEMPLATE_RUN_STORAGE','The run could not be recorded. Nothing was dispatched. Check local file access and start a new run.');
  if(row.owner!==owner)return recover(row);
  // A lost claim ACK is safe to recover here: authoring has not been dispatched.
 }
 if(options.retireUnstarted){
  // An exclusive claim excludes older windows too. A distinct terminal state
  // cannot be mistaken for their retryable pre-save failure.
  const retired=templateRunJSON({...JSON.parse(expectedText),status:'retired'});
  try{await files.compareAndReplace(path,expectedText,retired);}catch{}
  const row=await read();if(row?.status==='retired')return recover(row);
  fail('TEMPLATE_RUN_PENDING','Retirement of this old operation could not be confirmed. Check the same run again.');
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
async function readTemplateAssemblyState(draft,sources=null,observeSource=null){
 const meta=await draft.meta(),rows=await draft.clips({trackScope:'main'});
 if(!Number.isFinite(meta.fps)||meta.fps<=0||!Number.isSafeInteger(meta.frameSize?.width)||meta.frameSize.width<1||!Number.isSafeInteger(meta.frameSize?.height)||meta.frameSize.height<1||!Array.isArray(rows))throw Error('The assembled Draft metadata is incomplete.');
 const clips=[];
 for(const row of rows.filter(row=>row.resourceId!=null))clips.push({clipId:row.clipId,trackId:row.trackId,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,
  videoIndex:row.videoIndex??null,audioSourceIndexes:row.audioSourceIndexes??null,playbackSpeed:row.playbackSpeed??null,preserveAudioPitch:row.preserveAudioPitch??null,
  source:sources!==null?observeSource(sources,row):null,transform:await draft.clipTransform(row),audio:await draft.clipAudio(row)});
 clips.sort((a,b)=>a.clipId-b.clipId);
 if(!clips.length||clips.length>256||new Set(clips.map(c=>c.clipId)).size!==clips.length||clips.some(c=>!Number.isSafeInteger(c.clipId)||c.clipId<0||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame))throw Error('The assembled Draft clips could not be confirmed.');
 const state={fps:meta.fps,durationFrames:Math.max(...clips.map(c=>c.endFrame)),frameSize:{width:meta.frameSize.width,height:meta.frameSize.height},clips,...sources===null?{sourcesPending:true}:{}};
 JSON.stringify(state,(_key,value)=>{if(typeof value==='number'&&!Number.isFinite(value)||['bigint','function','symbol'].includes(typeof value))throw Error('The assembly returned an invalid nonfinite or unsupported value.');return value;});
 return state;
}

async function readTemplateAssemblyFacts(selects,projectId,draftId,readState,sources=null,observeSource=null){
 if(typeof draftId!=='string'||!draftId)throw Error('The assembly returned no Draft identity.');
 const ids=(await selects.project(projectId).meta()).draftIds;
 if(!Array.isArray(ids)||!ids.includes(draftId))throw Error('The assembled Draft is not in its Project.');
 return {draftId,...await readState(selects.draft(draftId),sources,observeSource)};
}

// The pending working snapshot stays immutable. Its source fields cannot be
// treated as observations; the new, owner-bound guard records actual saved
// sources only after they match the planner's separately named intent.
function templatePendingSourceState(state){
 return {...state,clips:state.clips.map(row=>({...row,source:null})),sourcesPending:true};
}
function templateSourceIntentState(intent,sources,observeSource){
 if(!Array.isArray(intent)||!intent.length||intent.length>1000||!Array.isArray(sources?.clips)||sources.clips.length!==intent.length||typeof observeSource!=='function')throw Error('The planned source guard is incomplete.');
 const ids=new Set(),clips=[];
 const same=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
 for(const row of intent){
  const key=JSON.stringify([row?.trackId,row?.clipId]),want=row?.source;
  if(ids.has(key)||!Number.isSafeInteger(row?.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||!['main','video','audio'].includes(row.trackKind)||typeof row.resourceId!=='string'||!row.resourceId||!Number.isSafeInteger(row.startFrame)||!Number.isSafeInteger(row.endFrame)||row.startFrame<0||row.endFrame<=row.startFrame||want?.clipId!==row.clipId||!Number.isFinite(want.startSeconds)||want.startSeconds<0||!Number.isFinite(want.endSeconds)||want.endSeconds<=want.startSeconds)throw Error('The planned source intent is invalid.');
  ids.add(key);
  const actual=observeSource(sources,row),observed=sources.clips.find(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
  if(!same(actual.startSeconds,want.startSeconds)||!same(actual.endSeconds,want.endSeconds)||observed.playbackSpeed!==1)throw Error('The saved source differs from the original planned source window.');
  clips.push({...row,source:actual,playbackSpeed:observed.playbackSpeed});
 }
 return clips;
}
// SDK-safe exclusive publication/readback. Existence alone proves nothing;
// every caller compares all canonical bytes with a fresh file observation.
async function templateSourceGuardFile(selects,guard,clips,stateFile,stateJSON,encode,fingerprint){
 if(guard?.version!==1||typeof guard.owner!=='string'||typeof guard.path!=='string')throw Error('The source guard owner is invalid.');
 const text=stateJSON({version:1,owner:guard.owner,clips});
 if(!await selects.files.exists(guard.path)){
  try{return await stateFile(selects,guard.path,text,encode,null,fingerprint);}
  catch(error){if(!await selects.files.exists(guard.path))throw error;}
 }
 const observed=await fingerprint(selects.files,guard.path);
 if(!observed)throw Error('The source guard file could not be observed.');
 return stateFile(selects,guard.path,text,encode,{path:guard.path,...observed},fingerprint);
}
// Only a known historical read-only verifier receives this local adapter. It
// shadows one saved target's missing source reader from an independent saved
// observation; the SDK and private unsaved timing probes remain unchanged.
function templateLegacySavedDraft(selects,draftId,sources,observeSource){
 const reads=new Set(['meta','clips','motionGraphics','motionGraphicProgram','videoEffects','videoEffectProgram','clipTransform','clipAudio']);
 return new Proxy(selects,{get(target,key){
  if(key==='draft')return id=>{
   const draft=target.draft(id);if(id!==draftId)return draft;
   return new Proxy(draft,{has(handle,method){return method==='clipSourceWindow'||Reflect.has(handle,method);},get(handle,method){
    if(method==='clipSourceWindow')return async row=>observeSource(sources,row);
    if(!reads.has(method))throw Error('Historical source verification is read-only.');
    const value=Reflect.get(handle,method,handle);return typeof value==='function'?value.bind(handle):value;
   }});
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
}
function templateObservationScript(source=null,sources=null,draftId=null){
 const helpers=`const templateObservedSource=${templateObservedSource.toString()};const fingerprintTemplateFile=${fingerprintTemplateFile.toString()};`;
 if(source===null&&sources===null&&draftId===null)return helpers;
 if(typeof source!=='string'||!source||!Array.isArray(sources?.clips)||typeof sources.revision!=='string'||!sources.revision||typeof draftId!=='string'||!draftId)throw Error('Historical verification requires an independently observed saved target.');
 return `${helpers}return await(async(selects)=>{${source}\n})((${templateLegacySavedDraft.toString()})(selects,${JSON.stringify(draftId)},${templateStateJSON(sources)},templateObservedSource));`;
}
async function templateStableSavedRead(sdk,projectId,draftId,libraryId,check,read){
 check();const before=await readTemplateDraftSources(sdk,projectId,draftId,libraryId);check();
 const result=await read(before);check();
 const after=await readTemplateDraftSources(sdk,projectId,draftId,libraryId);check();
 if(before.revision!==after.revision)throw templateRunIssue('TEMPLATE_RUN_INVALID','The saved Draft changed during source verification. Inspect it before retrying.');
 return result;
}

// Extend the existing durable run owner for templates whose assembly script
// commits before a separate title/look step. A name never proves ownership.
async function executeTemplateAssembly(sdk,files,scope,config,source,isCurrent,options={}){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 if(typeof isCurrent!=='function'||!scope||typeof scope.projectId!=='string'||!scope.projectId||typeof scope.runId!=='string'||!scope.runId||!config||config.projectId!==scope.projectId||typeof source!=='string'||source.split('__CONFIG__').length!==2||!source.startsWith('// @template-assembly 1\n'))fail('TEMPLATE_RUN_INVALID','The assembly request is incomplete.');
 if(typeof globalThis.TextEncoder!=='function'||typeof sdk?.call!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 if(new TextEncoder().encode(source).length>131072)fail('TEMPLATE_RUN_INVALID','The assembly script exceeds its input limit.');
 scope={pluginId:scope.pluginId,projectId:scope.projectId,runId:scope.runId,libraryId:scope.libraryId};
 const requestLimit=options.requestLimit??49152;
 const frozen=JSON.parse(templateRunJSON(config,requestLimit));
 // A display label can be regenerated on remount; it is never run identity.
 const {draftName:displayName,...contentConfig}=frozen;
 const request={config:contentConfig,source};templateRunJSON(request,requestLimit);
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};check();
 const target=await sdk.call('getProjectDraftScaffold',scope.projectId);check();
 if(target?.owner?.projectId!==scope.projectId||typeof target.owner.libraryId!=='string'||!target.owner.libraryId||scope.libraryId!=null&&scope.libraryId!==target.owner.libraryId)fail('TEMPLATE_RUN_TARGET','The assembly belongs to a different Project or library.');
 scope={pluginId:scope.pluginId,libraryId:target.owner.libraryId,projectId:scope.projectId,runId:scope.runId};
 const query=async(script,allowCommit=false,summary='Confirm owned assembly Draft')=>{check();const reply=await sdk.runScript({summary,allowCommit,script});check();if(reply.isError||!reply.result)fail('TEMPLATE_RUN_INVALID','The owned Draft could not be read back. Inspect it before starting another run.');return reply.result;};
 const verify=async receipt=>{
  if(options.receiptOnly)return {sequenceId:receipt.draftId,fps:receipt.fps,totalFrames:receipt.durationFrames,stateFile:receipt.stateFile??null,sourceGuard:receipt.sourceGuard??null,assemblyConfirmed:false};
  check();const target=await sdk.call('getProjectDraftScaffold',scope.projectId);check();
  if(target?.owner?.projectId!==scope.projectId||target.owner.libraryId!==scope.libraryId)fail('TEMPLATE_RUN_TARGET','The assembly belongs to a different Project or library.');
  return templateStableSavedRead(sdk,scope.projectId,receipt.draftId,scope.libraryId,check,async sources=>{
   const observed=await query(`${templateObservationScript()}return await (${readTemplateAssemblyFacts.toString()})(selects,${JSON.stringify(scope.projectId)},${JSON.stringify(receipt.draftId)},${readTemplateAssemblyState.toString()},${templateStateJSON(sources)},templateObservedSource);`);
   const expected={draftId:receipt.draftId,fps:receipt.fps,durationFrames:receipt.durationFrames,frameSize:receipt.frameSize,clips:receipt.clips,...receipt.sourceGuard?{sourcesPending:true}:{}};
   let sourceClips;
   if(receipt.sourceGuard){try{sourceClips=templateSourceIntentState(receipt.sourceGuard.intent,sources,templateObservedSource);}catch(cause){throw Object.assign(templateRunIssue('TEMPLATE_RUN_INVALID','The saved assembly source differs from its original plan.'),{cause});}}
   if(templateRunJSON(receipt.sourceGuard?templatePendingSourceState(observed):observed)!==templateRunJSON(expected))fail('TEMPLATE_RUN_INVALID','The saved Draft has changed since its assembly receipt. Inspect it before starting another run.');
   if(options.captureState&&!receipt.stateFile)fail('TEMPLATE_RUN_INVALID','This assembly has no complete state receipt. Inspect it before finishing.');
   if(receipt.stateFile)await query(`${templateObservationScript()}const actual=await (${readTemplateSavedState.toString()})(selects.draft(${JSON.stringify(receipt.draftId)}),${templateStateJSON(sources)},templateObservedSource);await (${templateStateFile.toString()})(selects,${JSON.stringify(receipt.stateFile.path)},(${templateStateJSON.toString()})(${receipt.sourceGuard?`(${templatePendingSourceState.toString()})(actual)`:'actual'}),${templateRunBase64.toString()},${JSON.stringify(receipt.stateFile)},fingerprintTemplateFile);return {verified:true};`);
   if(receipt.sourceGuard)await query(`${templateObservationScript()}await (${templateSourceGuardFile.toString()})(selects,${templateStateJSON(receipt.sourceGuard)},${templateStateJSON(sourceClips)},${templateStateFile.toString()},${templateStateJSON.toString()},${templateRunBase64.toString()},fingerprintTemplateFile);return {verified:true};`,true,'Publish owned assembly source guard');
   return {sequenceId:receipt.draftId,fps:receipt.fps,totalFrames:receipt.durationFrames,notes:[],assemblyConfirmed:true,...receipt.stateFile?{stateFile:receipt.stateFile}:{},...receipt.sourceGuard?{sourceGuard:receipt.sourceGuard}:{}};
  });
 };
 return executeTemplateRun(sdk,files,scope,request,isCurrent,async(claim,onDispatch)=>{
  const capability=await sdk.runScript({summary:'Check assembly recovery support',allowCommit:false,script:`const p=selects.project(${JSON.stringify(scope.projectId)});const ids=(await p.meta()).draftIds;const d=ids?.length?selects.draft(ids[0]):await p.createDraft({name:'Template recovery support check'});return {supported:typeof d.clipTransform==='function'&&typeof d.clipAudio==='function'};`});
  check();if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to confirm saved assembly state before retrying.');
  const body=source.replace('__CONFIG__',()=>`Object.assign(JSON.parse(${JSON.stringify(templateRunJSON(frozen,requestLimit))}),{__beforeCommit:__templateBeforeCommit})`);
  const script=`return await(async(assemble,readFacts,readState,publish,json,encode,readFull,stateJSON,stateFile,fingerprint)=>{
   let result,preparedState,preparedFull,snapshot,sourceGuard,maySave=false;
   try{
    result=await assemble(async(draft,sourceIntent)=>{
     if(maySave)throw Error('The assembly pre-save hook ran more than once.');
     preparedState=await readState(draft);
     if(!Array.isArray(sourceIntent)||!sourceIntent.length||sourceIntent.length>1000)throw Error('The assembly did not retain its planned source intent.');
     const owner=JSON.parse(${templateRunJSON(claim)}.expectedText).owner;
     sourceGuard={version:1,owner,path:${JSON.stringify(claim.path)}+'.sources-'+owner+'.json',intent:JSON.parse(json(sourceIntent))};
     json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:'x'.repeat(1024),...preparedState,sourceGuard}});
     if(${options.captureState===true}){
      preparedFull=stateJSON(await readFull(draft));
      const path=${JSON.stringify(claim.path)}+'.state-'+JSON.parse(${templateRunJSON(claim)}.expectedText).owner+'.json';
      json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:'x'.repeat(1024),...preparedState,sourceGuard,stateFile:{path,size:preparedFull.length,sha256:'x'.repeat(64)}}});
      snapshot=await stateFile(selects,path,preparedFull,encode,null,fingerprint);
     }
     maySave=true;
    });
    if(!maySave)throw Error('The assembly skipped its pre-save confirmation.');
    const facts=await readFacts(selects,${JSON.stringify(scope.projectId)},result?.sequenceId,readState);
    const {draftId,...savedState}=facts;
    if(json(savedState)!==json(preparedState))throw Error('The saved Draft disagrees with its prepared state.');
    if(facts.fps!==result.fps||facts.durationFrames!==result.totalFrames)throw Error('The assembly result disagrees with its saved Draft.');
    if(snapshot)await stateFile(selects,snapshot.path,stateJSON(await readFull(selects.draft(facts.draftId))),encode,snapshot,fingerprint);
    const receipt=await publish(selects,${templateRunJSON(claim)},{status:'saved',...facts,sourceGuard,...snapshot?{stateFile:snapshot}:{}},json,encode);
    if(receipt.runReceiptSaved!==true)throw Error('The assembly receipt could not be confirmed.');
    return {assembly:result,facts:{...facts,sourceGuard,...snapshot?{stateFile:snapshot}:{}}};
   }catch(error){
    if(typeof result?.sequenceId==='string'&&result.sequenceId)await publish(selects,${templateRunJSON(claim)},{status:'outcomeUnknown',draftId:result.sequenceId},json,encode);
    else if(!maySave)await publish(selects,${templateRunJSON(claim)},{status:'notSaved'},json,encode);
    throw error;
   }
  })(async(__templateBeforeCommit)=>{${body}},${readTemplateAssemblyFacts.toString()},${readTemplateAssemblyState.toString()},${writeTemplateRunResult.toString()},${templateRunJSON.toString()},${templateRunBase64.toString()},${readTemplateSavedState.toString()},${templateStateJSON.toString()},${templateStateFile.toString()},${fingerprintTemplateFile.toString()});`;
  if(new TextEncoder().encode(script).length>256*1024)fail('TEMPLATE_RUN_INVALID','The assembly request exceeds the SDK transport limit.');
  await onDispatch();const reply=await sdk.runScript({summary:'Assemble template with owned receipt',allowCommit:true,script});
  if(reply.isError||!reply.result?.facts||!reply.result?.assembly)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The assembly response could not be confirmed. Inspect the Project before starting another run.'),{cause:Error(String(reply.output||'The SDK returned no complete assembly result.'))});
  const confirmed=await verify(reply.result.facts);
  return {...reply.result.assembly,...confirmed,notes:reply.result.assembly.notes??[]};
 },verify,{existingOnly:options.receiptOnly===true,retireUnstarted:options.retireUnstarted===true,requestLimit});
}

// The base assembly record proves which Draft belongs to this workflow. A phase
// receipt supersedes its earlier state for recovery; unknown outcomes never save
// again. Only positively recorded pre-save failures permit a new phase attempt.
async function executeTemplateDecoration(sdk,files,pending,config,source,isCurrent,options={}){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};check();
 if(!pending?.scope||!config||config.projectId!==pending.scope.projectId||typeof config.sequenceId!=='string'||!config.sequenceId||typeof source!=='string'||!source.startsWith('// @template-decoration 1\n')||source.split('__CONFIG__').length!==2)fail('TEMPLATE_RUN_INVALID','The title/look request is incomplete.');
 const stateLimit=options.stateLimit??262144;
 if(!Number.isSafeInteger(stateLimit)||stateLimit<262144||stateLimit>524288)fail('TEMPLATE_RUN_INVALID','Invalid continuation state limit.');
 templateStateJSON(pending,stateLimit);
 pending=JSON.parse(JSON.stringify(pending));
 const frozen=JSON.parse(templateStateJSON(config,262144)),recipe=templateStateJSON({config:frozen,source},262144);
 const base=await executeTemplateAssembly(sdk,files,pending.scope,pending.config,pending.source,isCurrent,{receiptOnly:true,requestLimit:options.requestLimit});check();
 if(base.sequenceId!==frozen.sequenceId||!base.stateFile)fail('TEMPLATE_RUN_INVALID','The title/look target has no complete owned assembly receipt.');
 const target=await sdk.call('getProjectDraftScaffold',pending.scope.projectId);check();
 if(target?.owner?.projectId!==pending.scope.projectId||typeof target.owner.libraryId!=='string')fail('TEMPLATE_RUN_TARGET','The title/look target belongs to a different Project.');
 const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
 const rootScope={pluginId:pending.scope.pluginId,libraryId:target.owner.libraryId,projectId:pending.scope.projectId,runId:pending.scope.runId};
 const scope={...rootScope,runId:'look-'+await digest(templateRunJSON(rootScope))},request={phase:'decoration',draftId:base.sequenceId,recipeDigest:await digest(recipe),assemblyState:base.stateFile};
 const query=async(script,summary,allowCommit=false)=>{check();const reply=await sdk.runScript({summary,allowCommit,script});check();if(reply.isError||reply.result?.verified!==true)fail('TEMPLATE_RUN_INVALID','The saved title/look state has changed or could not be read. Inspect the Draft before another run.');return reply.result;};
 const verify=async receipt=>{
  check();if(receipt.draftId!==frozen.sequenceId||!receipt.stateFile)fail('TEMPLATE_RUN_INVALID','The title/look receipt could not be verified.');
  return templateStableSavedRead(sdk,scope.projectId,receipt.draftId,scope.libraryId,check,async sources=>{
   let sourceClips;
   if(receipt.sourceGuard){try{sourceClips=templateSourceIntentState(receipt.sourceGuard.intent,sources,templateObservedSource);}catch(cause){throw Object.assign(templateRunIssue('TEMPLATE_RUN_INVALID','The saved title/look source differs from the original assembly.'),{cause});}}
   await query(`${templateObservationScript()}const p=selects.project(${JSON.stringify(scope.projectId)});if(!(await p.meta()).draftIds.includes(${JSON.stringify(receipt.draftId)}))throw Error('The title/look Draft is not in its Project.');const actual=await (${readTemplateSavedState.toString()})(selects.draft(${JSON.stringify(receipt.draftId)}),${templateStateJSON(sources)},templateObservedSource);await (${templateStateFile.toString()})(selects,${JSON.stringify(receipt.stateFile.path)},(${templateStateJSON.toString()})(${receipt.sourceGuard?`(${templatePendingSourceState.toString()})(actual)`:'actual'}),${templateRunBase64.toString()},${JSON.stringify(receipt.stateFile)},fingerprintTemplateFile);return {verified:true};`,'Confirm owned title and look');
   if(receipt.sourceGuard)await query(`${templateObservationScript()}await (${templateSourceGuardFile.toString()})(selects,${templateStateJSON(receipt.sourceGuard)},${templateStateJSON(sourceClips)},${templateStateFile.toString()},${templateStateJSON.toString()},${templateRunBase64.toString()},fingerprintTemplateFile);return {verified:true};`,'Publish owned title/look source guard',true);
   return {sequenceId:receipt.draftId,fps:base.fps,totalFrames:base.totalFrames,decorationConfirmed:true};
  });
 };
 const work=executeTemplateRun(sdk,files,scope,request,isCurrent,async(claim,onDispatch)=>{
  // Bind the saved base before opening its working copy. This observation is
  // not used as an observation of the later unsaved decoration.
  let sources;try{sources=await templateStableSavedRead(sdk,scope.projectId,base.sequenceId,scope.libraryId,check,async sources=>{
   if(base.sourceGuard)templateSourceIntentState(base.sourceGuard.intent,sources,templateObservedSource);
   await query(`${templateObservationScript()}const actual=await (${readTemplateSavedState.toString()})(selects.draft(${JSON.stringify(base.sequenceId)}),${templateStateJSON(sources)},templateObservedSource);await (${templateStateFile.toString()})(selects,${JSON.stringify(base.stateFile.path)},(${templateStateJSON.toString()})(${base.sourceGuard?`(${templatePendingSourceState.toString()})(actual)`:'actual'}),${templateRunBase64.toString()},${JSON.stringify(base.stateFile)},fingerprintTemplateFile);return {verified:true};`,'Confirm original assembly before title and look');
   return sources;
  });}catch(cause){
   if(cause?.code==='TEMPLATE_RUN_DETACHED')throw cause;
   throw Object.assign(templateRunIssue('TEMPLATE_RUN_NOT_SAVED','The original assembly changed or could not be read before title and look.'),{cause});
  }
  const phaseIntent=base.sourceGuard?.intent??sources.clips.map(row=>({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,source:row.source}));
  const body=source.replace('__CONFIG__',()=>`Object.assign(JSON.parse(${JSON.stringify(templateStateJSON(frozen,262144))}),{__sources:${templateStateJSON(sources)},__beforeCommit:__templateBeforeCommit})`);
  const script=`${templateObservationScript()}return await(async(decorate,readFull,stateJSON,stateFile,publish,json,encode,fingerprint)=>{
   let prepared,snapshot,sourceGuard,maySave=false,preparedOnce=false;
   try{
    const original=selects.draft(${JSON.stringify(frozen.sequenceId)});
    if(!(await selects.project(${JSON.stringify(scope.projectId)}).meta()).draftIds.includes(${JSON.stringify(frozen.sequenceId)}))throw Error('The title/look target is not in its Project.');
    await stateFile(selects,${JSON.stringify(base.stateFile.path)},stateJSON(${base.sourceGuard?'await readFull(original)':`await readFull(original,${templateStateJSON(sources)},templateObservedSource)`}),encode,${JSON.stringify(base.stateFile)},fingerprint);
    const result=await decorate(async(draft,committing)=>{
     if(preparedOnce)throw Error('The title/look pre-save hook ran more than once.');preparedOnce=true;
     prepared=await readFull(draft);const text=stateJSON(prepared),path=${JSON.stringify(claim.path)}+'.state-'+JSON.parse(${templateRunJSON(claim)}.expectedText).owner+'.json';
     snapshot=await stateFile(selects,path,text,encode,null,fingerprint);
     const owner=JSON.parse(${templateRunJSON(claim)}.expectedText).owner;sourceGuard={version:1,owner,path:${JSON.stringify(claim.path)}+'.sources-'+owner+'.json',intent:${templateStateJSON(phaseIntent)}};
     const clips=prepared.clips.filter(c=>c.trackKind==='main'&&c.resourceId).map(({clipId,trackId,resourceId,startFrame,endFrame})=>({clipId,trackId,resourceId,startFrame,endFrame}));
     json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:${JSON.stringify(frozen.sequenceId)},fps:prepared.fps,durationFrames:prepared.durationFrames,frameSize:prepared.frameSize,clips,stateFile:snapshot,sourceGuard}});
     maySave=committing===true;
    });
    if(!preparedOnce)throw Error('The title/look operation skipped its pre-save hook.');
    const observed=await readFull(selects.draft(${JSON.stringify(frozen.sequenceId)}));
    await stateFile(selects,snapshot.path,stateJSON(observed),encode,snapshot,fingerprint);
    const clips=observed.clips.filter(c=>c.trackKind==='main'&&c.resourceId).map(({clipId,trackId,resourceId,startFrame,endFrame})=>({clipId,trackId,resourceId,startFrame,endFrame}));
    const facts={draftId:${JSON.stringify(frozen.sequenceId)},fps:observed.fps,durationFrames:observed.durationFrames,frameSize:observed.frameSize,clips,stateFile:snapshot,sourceGuard};
    const receipt=await publish(selects,${templateRunJSON(claim)},{status:'saved',...facts},json,encode);if(!receipt.runReceiptSaved)throw Error('The title/look receipt could not be confirmed.');return {facts,result};
   }catch(error){await publish(selects,${templateRunJSON(claim)},{status:maySave?'outcomeUnknown':'notSaved',...maySave?{draftId:${JSON.stringify(frozen.sequenceId)}}:{}},json,encode);throw error;}
  })(async(__templateBeforeCommit)=>{${body}},${readTemplateSavedState.toString()},${templateStateJSON.toString()},${templateStateFile.toString()},${writeTemplateRunResult.toString()},${templateRunJSON.toString()},${templateRunBase64.toString()},${fingerprintTemplateFile.toString()});`;
  if(new TextEncoder().encode(script).length>262144)fail('TEMPLATE_RUN_INVALID','The title/look request exceeds the SDK transport limit.');
  await onDispatch();const reply=await sdk.runScript({summary:'Decorate template with owned receipt',allowCommit:true,script});
  if(reply.isError||!reply.result?.facts)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The title/look save is awaiting confirmation. Check the same run again.'),{draftId:frozen.sequenceId,cause:Error(String(reply.output||'No complete title/look result.'))});
  return verify(reply.result.facts);
 },verify,options.retireUnstarted?{retireUnstarted:true}:{retryNotSaved:true});
 return work.catch(cause=>{
  check();
  const known=cause?.outcome==='notSaved'||cause?.code==='TEMPLATE_RUN_NOT_SAVED';
  const message=cause?.code==='TEMPLATE_RUN_RETIRED'?cause.publicMessage:known?'The title/look attempt stopped before saving. Retry its original inputs.':cause?.publicMessage||'The title/look save is awaiting confirmation. Check the same run again.';
  throw Object.assign(templateRunIssue(cause?.code||'TEMPLATE_RUN_PENDING',message),{phase:'decoration',draftId:base.sequenceId,cause,...known?{outcome:'notSaved'}:{}});
 });
}

// Discover an uncertain standalone assembly after its renderer realm is gone.
// Payloads are published before their small exclusive manifest. Completed run
// tombstones prevent an old callback from republishing the same run identity.
async function openTemplateAssemblyContinuations(sdk,files,target,isCurrent){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const requestLimit=target?.requestLimit??49152,stateLimit=target?.stateLimit??262144;
 templateRunJSON(null,requestLimit);
 if(!Number.isSafeInteger(stateLimit)||stateLimit<262144||stateLimit>524288)fail('TEMPLATE_RUN_INVALID','Invalid continuation state limit.');
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
  if(text.length>stateLimit)fail('TEMPLATE_RUN_INVALID','The pending assembly exceeds its continuation input limit.');
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
 const validate=(value,row,kind='assembly')=>{
  if(!value||json(value.scope)!==json(row.scope)||value.config?.projectId!==target.projectId||typeof value.source!=='string'||!value.source.startsWith(kind==='look'?'// @template-decoration 1\n':'// @template-assembly 1\n')||value.source.split('__CONFIG__').length!==2)invalid();
  // Match the existing assembly adapter's request budget before any new save.
  if(kind==='look'){
   if(typeof value.config.sequenceId!=='string'||value.assembly?.sequenceId!==value.config.sequenceId)invalid();
   templateStateJSON({config:value.config,source:value.source},262144);
  }else{const {draftName,...content}=value.config;templateRunJSON({config:content,source:value.source},requestLimit);}
  return value;
 };
 const load=async(row,key,kind='assembly')=>{
  if(await manifest(row)!==key)invalid();
  const name=key+(kind==='look'?'.look':'')+'-'+row.digest+'.data';
  const text=await readText(files.join(directory,name),stateLimit)??await readText(files.join(completed,name),stateLimit);
  if(text===null)invalid();if(await hash(text)!==row.digest)invalid();
  return validate(parse(text),row,kind);
 };
 const recordOf=async(pending,kind='assembly')=>{
  if(!pending?.scope||Object.keys(target).some(key=>key==='libraryId'?pending.scope[key]!=null&&pending.scope[key]!==target[key]:pending.scope[key]!==target[key]))invalid();
  const scope={...target,runId:pending.scope.runId},text=json({...pending,scope}),row={version:1,scope,digest:await hash(text)},key=await manifest(row);
  return {row,key,text,value:validate(parse(text),row,kind)};
 };
 const store=async(pending,kind='assembly',allowCompleted=false)=>{
  pending=JSON.parse(json(pending));
  await current();const item=await recordOf(pending,kind),{row,key,text}=item,name=key+(kind==='look'?'.look':'');
  if(kind==='assembly'&&await done(row,key)){
   if(allowCompleted)return load(row,key);
   fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');
  }
  await files.mkdir(directory,{recursive:true});check();
  const file=files.join(directory,name+'.json'),expected=templateRunJSON(row),prior=await readText(file,49152);
  if(prior!==null&&prior!==expected)invalid();
  const dataPath=files.join(directory,name+'-'+row.digest+'.data');
  if(await files.exists(dataPath)){if(await readText(dataPath,stateLimit)!==text)invalid();}
  else{check();await files.writeFile(dataPath,text);check();}
  try{check();await files.writeFile(file,expected,{flag:'wx'});}catch(error){
   const actual=await readText(file,49152);if(actual===null)throw error;if(actual!==expected)invalid();
  }
  check();if(kind==='assembly'&&await done(row,key)){
   if(allowCompleted)return load(row,key);
   fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');
  }
  try{return await load(row,key,kind);}catch(error){if(kind==='assembly'&&await done(row,key))fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');throw error;}
 };
 const read=async(runId=null,includeCompleted=false)=>{
  if(runId!==null){
   await current();if(typeof runId!=='string'||!runId||runId.length>1024)invalid();
   const key=await hash(json({...target,runId})),text=await readText(files.join(directory,key+'.json'),49152);
   let row=text===null?null:parse(text);
   if(!row&&includeCompleted){const end=await readText(files.join(completed,key+'.json'),49152);if(end!==null){const value=parse(end);if(!['saved','notSaved'].includes(value?.status))invalid();row=value.record;}}
   if(!row)return null;if(await manifest(row)!==key)invalid();
   if(!includeCompleted&&await done(row,key))return null;
   return load(row,key);
  }
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
 const lookFor=async pending=>{
  const {row:root,key}=await recordOf(pending);
  const text=await readText(files.join(directory,key+'.look.json'),49152)??await readText(files.join(completed,key+'.look.json'),49152);
  if(text===null)return null;const row=parse(text);if(await manifest(row)!==key||json(row.scope)!==json(root.scope))invalid();return load(row,key,'look');
 };
 const acknowledge=async(pending,status,retain=false)=>{
  await current();const {row,key,text:rootText}=await recordOf(pending);
  await files.mkdir(completed,{recursive:true});check();
  let look=null,lookRow=null;
  if(retain){
   await files.writeFile(files.join(completed,key+'-'+row.digest+'.data'),rootText);check();
   look=await lookFor(pending);
   if(look){lookRow=await recordOf(look,'look');await files.writeFile(files.join(completed,key+'.look-'+lookRow.row.digest+'.data'),lookRow.text);check();await files.writeFile(files.join(completed,key+'.look.json'),templateRunJSON(lookRow.row));check();}
  }
  const path=files.join(completed,key+'.json'),text=templateRunJSON({record:row,status});
  try{await files.writeFile(path,text,{flag:'wx'});}catch(error){if(await readText(path,49152)!==text)throw error;}
  check();
  // Only this immutable run's files are removed. Its tombstone is retained.
  await files.rm(files.join(directory,key+'.json'),{force:true}).catch(()=>{});check();
  await files.rm(files.join(directory,key+'-'+row.digest+'.data'),{force:true}).catch(()=>{});check();
  if(lookRow){await files.rm(files.join(directory,key+'.look.json'),{force:true}).catch(()=>{});check();await files.rm(files.join(directory,key+'.look-'+lookRow.row.digest+'.data'),{force:true}).catch(()=>{});check();}
 };
 const resumeAssembly=async pending=>{
  const value=await store(pending);
  let result;
  try{result=await executeTemplateAssembly(sdk,files,value.scope,value.config,value.source,()=>{check();return true;},{requestLimit});}
  catch(error){if(error?.outcome==='notSaved'||error?.code==='TEMPLATE_RUN_NOT_SAVED')await acknowledge(value,'notSaved');throw error;}
  check();if(result?.assemblyConfirmed!==true)invalid();
  await acknowledge(value,'saved');return result;
 };
 const workflow=async(pending,prepareLook,onAssembly=()=>{},options={})=>{
  if(!options||typeof options!=='object'||options.retireUnstarted!==undefined&&typeof options.retireUnstarted!=='boolean'||options.verifyAssembly!==undefined&&typeof options.verifyAssembly!=='function')invalid();
  options={retireUnstarted:options.retireUnstarted===true,verifyAssembly:options.verifyAssembly};
 const value=await store(pending,'assembly',true);let look=await lookFor(value);
  if(!look){
   let assembly;
   try{assembly=await executeTemplateAssembly(sdk,files,value.scope,value.config,value.source,()=>{check();return true;},{captureState:true,retireUnstarted:options.retireUnstarted===true,requestLimit});}
   catch(error){if(error?.outcome==='notSaved'||error?.code==='TEMPLATE_RUN_NOT_SAVED')await acknowledge(value,'notSaved',true);throw error;}
   check();let prepared;
   try{prepared=await prepareLook(JSON.parse(json(value)),{...assembly});check();}catch(cause){check();throw Object.assign(templateRunIssue('TEMPLATE_LOOK_PREPARATION','The original title/look inputs could not be prepared. Check this run again.'),{phase:'decoration',draftId:assembly.sequenceId,cause});}
   look=await store({...prepared,scope:value.scope,assembly},'look');
  }
  await onAssembly(JSON.parse(json(value)),{...look.assembly});check();
  if(options.verifyAssembly){
   try{await options.verifyAssembly(JSON.parse(json(value)),{...look.assembly},JSON.parse(json(look)));check();}
   catch(cause){
    check();
    if(options.retireUnstarted&&cause?.code==='TEMPLATE_ASSEMBLY_MISMATCH'){
     // Revoke an unstarted/retryable old look as well. A claimed/unknown or
     // already-saved phase cannot be relabeled as a no-save.
     try{await executeTemplateDecoration(sdk,files,value,look.config,look.source,()=>{check();return true;},{retireUnstarted:true,requestLimit,stateLimit});}
     catch(error){throw Object.assign(error,{cause});}
    }
    throw cause;
   }
  }
  const result=await executeTemplateDecoration(sdk,files,value,look.config,look.source,()=>{check();return true;},{requestLimit,stateLimit});check();
  await acknowledge(value,'saved',true);
  return {...look.assembly,...result};
 };
 return {read,store:pending=>store(pending),run:resumeAssembly,workflow};
}
