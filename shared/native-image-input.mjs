// Original source facts and private unsaved identity checks. Canonical input feature.
export async function nativeImageSources(selects, projectId, photos, { matchById=false }={}) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const sources=photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&(!matchById||node.resourceId===photo.resourceId)&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Image'));
  if(matches.length!==1||matches[0].resourceId!==photo.resourceId)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const row=matches[0],size=row.frameSize;
  if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('A selected Image has no verified native dimensions: '+photo.name);
  return {resourceId:row.resourceId,path:row.path,name:photo.name,width:size.width,height:size.height};
 });
 const fail=(code,photo,message)=>{throw Object.assign(new Error(message+': '+photo.name),{code,resourceId:photo.resourceId});};
 if(typeof selects.files?.stat!=='function'||typeof selects.files?.readRange!=='function')throw Error('This Selects version does not support original photo file checks.');
 const checked=new Set();
 for(const photo of sources){
  if(checked.has(photo.path))continue;
  let before;
  try{before=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file');}
  if(before===null)fail('image-source-missing',photo,'The original photo file is missing');
  if(!before||!Number.isSafeInteger(before.size)||before.size<0||typeof before.isDirectory!=='boolean')fail('image-source-unknown',photo,'Could not confirm the original photo file');
  if(before.isDirectory||before.size===0)fail('image-source-unreadable',photo,'The original photo file is not readable');
  let first;
  try{first=await selects.files.readRange({path:photo.path,offset:0,length:1});}catch{fail('image-source-unreadable',photo,'Could not read the original photo file');}
  if(!first||first.bytesRead!==1||typeof first.base64!=='string'||!/^[A-Za-z0-9+/]{2}==$/.test(first.base64))fail('image-source-unknown',photo,'Could not confirm reading the original photo file');
  let after;
  try{after=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file after reading');}
  if(!after||after.isDirectory||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))fail('image-source-changed',photo,'The original photo file changed while reading');
  checked.add(photo.path);
 }
 return sources;
}
// Alias discovery does not carry a path. Resolve it by exact SDK identity, then
// keep the established native Image path/dimensions/file checks unchanged.
export async function nativeImageSourcesById(selects,projectId,photos) {
 const project=selects.project(projectId),nodes=[];
 const visit=items=>{for(const item of items||[]){if(!item)continue;item.type==='dir'?visit(item.children):nodes.push(item);}};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const selected=photos.map(photo=>{
  const matches=nodes.filter(node=>node.resourceId===photo.resourceId&&typeof node.path==='string'&&node.path);
  if(matches.length!==1)throw Error('The selected Image path is missing or ambiguous in the Project: '+photo.name);
  return {...photo,path:matches[0].path};
 });
 return nativeImageSources(selects,projectId,selected,{matchById:true});
}
// A source step is dispatched once, independently of persistence permission.
export async function nativeImageRun(sdk,script,summary,allowCommit=false,fallbackMessage='Image placement could not be confirmed. Inspect the Draft before retrying.') {
 const response=await sdk.runScript({script,summary,allowCommit,timeoutSeconds:120});
 if(response.isError||response.result==null)throw Error(response.output||fallbackMessage);
 return response.result;
}
export async function prepareNativeImages(sdk,projectId,photos,knownLibraryId=null) {
 const result=await nativeImageRun(sdk,`try{return {sources:await (${nativeImageSources.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(photos)})};}catch(error){const issue=Object(error);return {sourceError:{code:typeof issue.code==='string'?issue.code:'image-source-invalid',message:String(issue.message||error),resourceId:issue.resourceId??null}};}`,'Verify original Project Images');
 if(result.sourceError){
  const error=Object.assign(new Error(result.sourceError.message),result.sourceError);
  if(['image-source-missing','image-source-unreadable','image-source-unknown','image-source-changed'].includes(error.code))error.publicMessage=error.message+'. Check the original file in the Project, then try again.';
  throw error;
 }
 if(!Array.isArray(result.sources))throw Error('Original Image verification returned an incomplete result.');
 return {sdk,projectId,sources:result.sources};
}

// File contents are observations, not a filesystem lock. Keep the existing
// Image availability contract unchanged; templates opt into complete identity.
export function requireSourceFileSupport(files) {
 if(typeof files?.fingerprint!=='function'){
  const message='Update Selects to verify complete source file contents before creating this template.';
  throw Object.assign(new Error(message),{code:'source-file-unsupported',publicMessage:message});
 }
}
export async function observeSourceFiles(files,paths,expected=null) {
 const issue=(code,message,cause=null)=>Object.assign(new Error(message),{code,publicMessage:message,cause});
 if(!Array.isArray(paths)||paths.some(path=>typeof path!=='string'||!path||path.includes('\0')))throw issue('source-file-input','The selected source paths are invalid.');
 const selected=[...new Set(paths)];
 const valid=row=>row&&typeof row.path==='string'&&Number.isSafeInteger(row.size)&&row.size>0&&typeof row.sha256==='string'&&/^[0-9a-f]{64}$/.test(row.sha256);
 if(expected!==null&&(!Array.isArray(expected)||expected.length!==selected.length||new Set(expected.map(row=>row?.path)).size!==expected.length||expected.some(row=>!valid(row)||!selected.includes(row.path))))throw issue('source-file-input','The expected source observations do not match the selection.');
 if(!selected.length)return [];
 requireSourceFileSupport(files);
 const observed=[];
 for(const path of selected){
  let fingerprint;
  try{fingerprint=await files.fingerprint(path);}catch(cause){throw issue('source-file-unknown','The selected source file could not be confirmed. Check the Project file and try again.',cause);}
  if(fingerprint===null)throw issue('source-file-missing','The selected source file is missing. Check the Project file and try again.');
  const row={...fingerprint,path};
  if(!valid(row))throw issue('source-file-unknown','The selected source file has no complete, nonempty content identity.');
  const before=expected?.find(row=>row.path===path);
  if(before&&(before.size!==row.size||before.sha256!==row.sha256))throw issue('source-file-changed','The selected source file changed. Reload the Project inputs before trying again.');
  observed.push({path,size:row.size,sha256:row.sha256});
 }
 return observed;
}

// Persistent handed IDs -> SDK aliases, observed only on private unsaved Drafts.
// Placement failures are not evidence that a source file is absent.
export async function resolveTemplateMedia(selects,projectId,files,scratchName='Template source check') {
 if(!Array.isArray(files)||!files.length||files.length>50||files.some(file=>!file||typeof file.rid!=='string'||!file.rid||!['video','image'].includes(file.kind))||new Set(files.map(file=>file.rid)).size!==files.length)throw Error('The selected template source request is invalid.');
 const project=selects.project(projectId),resolved=[],failed=[];let shared=null;
 const text=error=>String(Object(error).message||error||'Source preparation could not be confirmed.').slice(0,300);
 const unknown=message=>Object.assign(Error(message),{code:'source-resolution-unknown'});
 for(const file of files){
  let phase='create',insertionError;
  try{
   const photo=file.kind==='image',draft=photo||!shared?await project.createDraft({name:scratchName}):shared;
   if(!photo)shared=draft;
   phase='readback';const before=await draft.clips({trackScope:'main'});
   if(!Array.isArray(before)||before.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(before.map(row=>row.clipId)).size!==before.length)throw unknown('The private source check could not be observed before placement.');
   const ids=new Set(before.map(row=>row.clipId));
   const observe=async()=>{
    const rows=await draft.clips({trackScope:'main'});
    if(!Array.isArray(rows)||rows.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(rows.map(row=>row.clipId)).size!==rows.length)throw unknown('The private source check returned invalid clips.');
    const added=rows.filter(row=>!ids.has(row.clipId));
    if(added.length>1||added.length===1&&(typeof added[0].resourceId!=='string'||!added[0].resourceId))throw unknown('The placed source alias could not be uniquely confirmed.');
    return added[0]??null;
   };
   phase='insert';
   try{await draft.insertResource({resourceId:file.rid,sourceRange:{startSeconds:0,endSeconds:0.5}});}catch(error){insertionError=error;}
   phase='readback';let clip=await observe();
   // Only the SDK's pre-mutation range validation authorizes the old short-file
   // fallback. An empty observation after an arbitrary transport error does not.
   if(!clip&&insertionError&&/^invalid_source_range(?::|$)/.test(text(insertionError))){
    phase='insert';insertionError=null;
    try{await draft.insertResource({resourceId:file.rid});}catch(error){insertionError=error;}
    phase='readback';clip=await observe();
   }
   if(!clip){if(insertionError){phase='insert';throw insertionError;}throw unknown('Source placement returned no confirmed clip.');}
   let size=null;
   if(photo){phase='dimensions';const sources=await nativeImageSourcesById(selects,projectId,[{resourceId:clip.resourceId,name:file.rid}]);size={width:sources[0].width,height:sources[0].height};}
   resolved.push({rid:file.rid,alias:clip.resourceId,size});
  }catch(error){
   const code=typeof Object(error).code==='string'?Object(error).code.slice(0,80):phase==='readback'?'source-resolution-unknown':'source-resolution-failed';
   failed.push({rid:file.rid,phase,code,error:text(error),...insertionError&&insertionError!==error?{insertionError:text(insertionError)}:{}});
  }
 }
 return {resolved,failed};
}

// A clipped or contradictory response cannot silently drop handed sources.
export function validateTemplateMediaResult(result,files) {
 const invalid=()=>{throw Object.assign(Error('The selected source resolution could not be confirmed. Check the Project inputs and try again.'),{code:'source-resolution-unknown'});};
 if(!result||!Array.isArray(result.resolved)||!Array.isArray(result.failed))invalid();
 const wanted=new Set(files.map(file=>file.rid)),rows=[...result.resolved,...result.failed];
 if(rows.length!==wanted.size||new Set(rows.map(row=>row?.rid)).size!==wanted.size||rows.some(row=>!wanted.has(row?.rid)))invalid();
 if(result.resolved.some(row=>typeof row.alias!=='string'||!row.alias||row.size!==null&&(!Number.isSafeInteger(row.size?.width)||row.size.width<1||!Number.isSafeInteger(row.size?.height)||row.size.height<1)))invalid();
 if(result.failed.some(row=>typeof row.phase!=='string'||typeof row.code!=='string'||typeof row.error!=='string'||row.error.length>300))invalid();
 return result;
}
