// Panel-owned preparation; host files and Project imports keep their existing
// canonical transports. SDK inventory is bounded before leaving the worker.
async function readBundledAudioResource(selects,projectId,path,platform){
 const project=selects.project(projectId),resources=new Map((await project.resources()).map(r=>[r.resourceId,r])),matches=[];
 const key=value=>platform==='win32'?String(value).replace(/\\/g,'/').toLowerCase():String(value);
 const visit=items=>{for(const n of items||[]){if(n.type==='dir')visit(n.children);else if(n.path&&key(n.path)===key(path)&&resources.has(n.resourceId)){const r=resources.get(n.resourceId);matches.push({resourceId:r.resourceId,type:r.type,durationSeconds:r.durationSeconds});}}};
 const tree=await project.sourceFiles();
 if('fileTree' in tree)visit(tree.fileTree);
 else for(const folder of tree.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 return {matches:matches.slice(0,2)};
}
async function prepareBundledAudio(sdk,files,{projectId,pluginId,sourcePath,platform='darwin',minimumSeconds=0,isCurrent=()=>true}){
 const issue=(code,message,cause)=>Object.assign(Error(message),{code:'BUNDLED_AUDIO_'+code,publicMessage:message,...cause?{cause}:{}});
 let importStarted=false;
 const current=()=>{if(!isCurrent())throw issue('STOPPED',importStarted?'The template run ended after a music import was requested. Check the Project files.':'The template run ended before importing music.');};
 try{
  if(typeof projectId!=='string'||!projectId||projectId!==projectId.trim()||typeof pluginId!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(pluginId)||typeof sourcePath!=='string'||!sourcePath||!Number.isFinite(minimumSeconds)||minimumSeconds<0)throw issue('INPUT','The bundled music request is invalid.');
  const subtle=globalThis.crypto?.subtle;if(!subtle)throw issue('UNSUPPORTED','Update Selects to check the bundled music.');
  const bytes=async path=>{
   const stat=await files.stat(path);
   if(!stat||stat.isDirectory!==false||!Number.isSafeInteger(stat.size)||stat.size<1||stat.size>32*1024*1024)throw issue('BYTES','The bundled music must be a readable file between 1 byte and 32 MiB.');
   const raw=await files.readFile(path);if(!ArrayBuffer.isView(raw)||raw.byteLength!==stat.size)throw issue('CHANGED','The bundled music file changed while reading. Start a new run.');
   return Uint8Array.from(new Uint8Array(raw.buffer,raw.byteOffset,raw.byteLength));
  };
  const hash=async value=>Array.from(new Uint8Array(await subtle.digest('SHA-256',value)),b=>b.toString(16).padStart(2,'0')).join('');
  current();const original=await bytes(sourcePath),digest=await hash(original);
  const directory=files.join(await files.homedir(),'.selects','plugin-data',pluginId,'assets'),path=files.join(directory,digest+'.mp3');
  current();await files.mkdir(directory,{recursive:true});
  const stored=await files.exists(path)?await files.stat(path):null;
  const have=stored?.isDirectory===false&&stored.size===original.length?await bytes(path):null;
  if(!have||await hash(have)!==digest){current();await files.writeFile(path,original);}
  current();if(await hash(await bytes(path))!==digest)throw issue('COPY','The bundled music data copy could not be confirmed.');
  if(await hash(await bytes(sourcePath))!==digest)throw issue('CHANGED','The installed music changed while it was being prepared. Start a new run.');
  const read=async()=>{
   current();const response=await sdk.runScript({summary:'Find bundled music Resource',allowCommit:false,script:`return await (${readBundledAudioResource.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(path)},${JSON.stringify(platform)});`});
   if(response?.isError||!Array.isArray(response?.result?.matches)||response.result.matches.length>1)throw issue('READ','The music in this Project could not be uniquely confirmed. Check the Project files.');
   return response.result.matches[0]??null;
  };
  const ready=row=>{
   if(!row||typeof row.resourceId!=='string'||!row.resourceId||row.type!=='Audio'||!Number.isFinite(row.durationSeconds)||row.durationSeconds<=0||row.durationSeconds<minimumSeconds)throw issue('METADATA','The bundled file could not be confirmed as full-length audio. Check the Project files.');
   return {resourceId:row.resourceId};
  };
  const existing=await read();if(existing)return ready(existing);
  current();let imported,importFailure;importStarted=true;
  try{imported=await sdk.runScript({summary:'Import bundled music',allowCommit:true,script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([path])}});`});}catch(error){importFailure=error;}
  const ids=imported?.result?.addedResourceIds;
  const row=await read();
  if(row){
   if(Array.isArray(ids)&&ids.length&&(ids.length!==1||ids[0]!==row.resourceId))throw issue('IMPORT_UNKNOWN','The added music could not be confirmed. Check the Project files.');
   return ready(row);
  }
  if(!imported?.isError&&Array.isArray(ids)&&!ids.length)throw issue('SKIPPED','Selects did not add the bundled music. Check the file and Project import result before starting again.');
  throw issue('IMPORT_UNKNOWN','The music import outcome could not be confirmed. Check the Project files before starting again.',importFailure);
 }catch(error){if(/^BUNDLED_AUDIO_/.test(error?.code||''))throw error;throw issue('PREPARE','The bundled music could not be prepared. Check the installed music and Project files.',error);}
}
