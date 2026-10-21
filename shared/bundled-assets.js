// Installed bytes -> verified owned data file -> one confirmed Project Resource.
// File publication is delegated to the canonical asynchronous atomic client.
function bundledAssetIssue(code,message,cause){
 return Object.assign(Error(message),{code:'BUNDLED_ASSET_'+code,publicMessage:message,...cause?{cause}:{}});
}
async function readBundledAssetBytes(files,path,limit,current){
 current();const stat=await files.stat(path);current();
 if(!stat||stat.isDirectory!==false||!Number.isSafeInteger(stat.size)||stat.size<1||stat.size>limit)throw bundledAssetIssue('BYTES','The bundled file is missing, unreadable or exceeds its size limit.');
 const raw=await files.readFile(path);current();
 if(!ArrayBuffer.isView(raw)||raw.byteLength!==stat.size)throw bundledAssetIssue('CHANGED','The bundled file changed while reading. Start a new run.');
 return Uint8Array.from(new Uint8Array(raw.buffer,raw.byteOffset,raw.byteLength));
}
async function readBundledAssetResource(selects,projectId,path,platform,normalizeUnicode=false){
 const project=selects.project(projectId),resources=new Map(),matches=[];
 for(const resource of await project.resources())resources.set(resource.resourceId,resource);
 const key=value=>{const text=normalizeUnicode?String(value).normalize('NFC'):String(value);return platform==='win32'?text.replace(/\\/g,'/').toLowerCase():text;};
 const visit=items=>{for(const n of items||[]){if(matches.length>=2)return;if(n.type==='dir')visit(n.children);else if(n.path&&key(n.path)===key(path)&&resources.has(n.resourceId)){const r=resources.get(n.resourceId);matches.push({resourceId:r.resourceId,path:n.path,type:r.type,durationSeconds:r.durationSeconds,...r.type==='Image'?{frameSize:n.frameSize}:{}});}}};
 const tree=await project.sourceFiles();
 if('fileTree' in tree)visit(tree.fileTree);
 else for(const folder of tree.folders||[]){if(matches.length>=2)break;const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 return {matches};
}
async function prepareBundledAsset(sdk,files,options){
 const {projectId,pluginId,sourcePath,type,extension,encoding='binary',expectedBytes,expectedSha256,frameSize,platform='darwin',normalizeUnicode=false,minimumSeconds=0,label='asset',isCurrent=()=>true}=options??{};
 let importStarted=false;
 const current=()=>{if(!isCurrent())throw bundledAssetIssue('STOPPED',importStarted?'The template run ended after an asset import was requested. Check the Project files.':'The template run ended before importing the bundled asset.');};
 try{
  const pinned=expectedBytes!==undefined||expectedSha256!==undefined;
  if(typeof projectId!=='string'||!projectId||projectId!==projectId.trim()||typeof pluginId!=='string'||pluginId.length>63||!/^[a-z0-9][a-z0-9-]*$/.test(pluginId)||typeof sourcePath!=='string'||!sourcePath||!['Image','Audio'].includes(type)||!(type==='Image'?extension==='png':['mp3','m4a','wav'].includes(extension))||!['binary','base64'].includes(encoding)||!['asset','frame','music'].includes(label)||!Number.isFinite(minimumSeconds)||minimumSeconds<0||type==='Image'&&minimumSeconds!==0||encoding==='base64'&&!pinned||pinned&&(!Number.isSafeInteger(expectedBytes)||expectedBytes<1||expectedBytes>32*1024*1024||typeof expectedSha256!=='string'||!/^[0-9a-f]{64}$/.test(expectedSha256)))throw bundledAssetIssue('INPUT','The bundled asset request is invalid.');
  if(typeof normalizeUnicode!=='boolean'||typeof isCurrent!=='function'||frameSize&&(type!=='Image'||!Number.isSafeInteger(frameSize.width)||frameSize.width<1||!Number.isSafeInteger(frameSize.height)||frameSize.height<1))throw bundledAssetIssue('INPUT','The bundled asset comparison or Image dimensions are invalid.');
  const subtle=globalThis.crypto?.subtle;
  if(!subtle||encoding==='base64'&&typeof globalThis.atob!=='function'||['stat','readFile','writeFile','exists','mkdir','join','homedir'].some(name=>typeof files?.[name]!=='function'))throw bundledAssetIssue('UNSUPPORTED','Update Selects to verify and prepare the bundled asset.');
  const hash=async bytes=>{current();const digest=await subtle.digest('SHA-256',bytes);current();return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');};
  const installed=async()=>{
   // Base64 permits ordinary line wrapping, with bounded whitespace overhead.
   const limit=encoding==='binary'?32*1024*1024:4*Math.ceil(expectedBytes/3)+Math.max(4096,Math.ceil(expectedBytes*.1));
   const bytes=await readBundledAssetBytes(files,sourcePath,limit,current);
   let decoded=bytes;
   if(encoding==='base64'){
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/\s/g,'');
    if(text.length!==4*Math.ceil(expectedBytes/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw bundledAssetIssue('ENCODING','The encoded bundled asset is invalid.');
    const binary=globalThis.atob(text);current();decoded=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)decoded[i]=binary.charCodeAt(i);
   }
   if(pinned&&decoded.length!==expectedBytes)throw bundledAssetIssue('BYTES','The bundled asset byte count does not match its manifest.');
   const digest=await hash(decoded);
   if(pinned&&digest!==expectedSha256)throw bundledAssetIssue('HASH','The bundled asset does not match its manifest. Check the installed template files before starting again.');
   return {bytes:decoded,digest};
  };
  current();const original=await installed();current();const home=await files.homedir();current();
  const directory=files.join(home,'.selects','plugin-data',pluginId,'assets'),path=files.join(directory,original.digest+'.'+extension);
  current();await files.mkdir(directory,{recursive:true});current();const exists=await files.exists(path);current();const stored=exists?await files.stat(path):null;current();
  const have=stored?.isDirectory===false&&stored.size===original.bytes.length?await readBundledAssetBytes(files,path,32*1024*1024,current):null;
  if(!have||await hash(have)!==original.digest){current();await files.writeFile(path,original.bytes);current();}
  if(await hash(await readBundledAssetBytes(files,path,32*1024*1024,current))!==original.digest)throw bundledAssetIssue('COPY','The bundled asset data copy could not be confirmed.');
  if((await installed()).digest!==original.digest)throw bundledAssetIssue('CHANGED','The installed asset changed during preparation. Start a new run.');
  const read=async()=>{
   current();const reply=await sdk.runScript({summary:'Find bundled '+label+' Resource',allowCommit:false,script:`return await (${readBundledAssetResource.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(path)},${JSON.stringify(platform)},${JSON.stringify(normalizeUnicode)});`});current();
   if(reply?.isError||!Array.isArray(reply?.result?.matches)||reply.result.matches.length>1)throw bundledAssetIssue('READ','The bundled asset in this Project could not be uniquely confirmed. Check the Project files.');
   return reply.result.matches[0]??null;
  };
  const ready=row=>{
   if(!row||typeof row.resourceId!=='string'||!row.resourceId||typeof row.path!=='string'||!row.path||row.type!==type)throw bundledAssetIssue('METADATA','The bundled Resource type, path or identity could not be confirmed. Check the Project files.');
   if(type==='Audio'&&(!Number.isFinite(row.durationSeconds)||row.durationSeconds<=0||row.durationSeconds<minimumSeconds))throw bundledAssetIssue('METADATA','The bundled file could not be confirmed as full-length Audio. Check the Project files.');
   const size=row.frameSize;
   if(type==='Image'&&(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1||frameSize&&(size.width!==frameSize.width||size.height!==frameSize.height)))throw bundledAssetIssue('METADATA','The bundled Image dimensions could not be confirmed. Check the Project files.');
   return {resourceId:row.resourceId,path:row.path,...type==='Image'?{width:size.width,height:size.height}:{durationSeconds:row.durationSeconds}};
  };
  const existing=await read();if(existing)return ready(existing);
  current();let imported,importFailure;importStarted=true;
  try{imported=await sdk.runScript({summary:'Import bundled '+label,allowCommit:true,script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([path])}});`});}catch(error){importFailure=error;}
  const ids=imported?.result?.addedResourceIds,row=await read();
  if(row){if(Array.isArray(ids)&&ids.length&&(ids.length!==1||ids[0]!==row.resourceId))throw bundledAssetIssue('IMPORT_UNKNOWN','The added asset could not be confirmed. Check the Project files.');return ready(row);}
  if(!imported?.isError&&Array.isArray(ids)&&!ids.length)throw bundledAssetIssue('SKIPPED','Selects did not add the bundled asset. Check the Project import result before starting again.');
  throw bundledAssetIssue('IMPORT_UNKNOWN','The asset import outcome could not be confirmed. Inspect the Project before starting again.',importFailure);
 }catch(error){if(/^BUNDLED_ASSET_/.test(error?.code||''))throw error;throw bundledAssetIssue('PREPARE','The bundled asset could not be prepared. Check the installed files and Project resources.',error);}
}
// Compatibility API: existing MP3 consumers retain IDs, summaries and codes.
async function readBundledAudioResource(selects,projectId,path,platform){return readBundledAssetResource(selects,projectId,path,platform);}
async function prepareBundledAudio(sdk,files,options){
 try{const result=await prepareBundledAsset(sdk,files,{...options,type:'Audio',extension:'mp3',normalizeUnicode:false,label:'music'});return {resourceId:result.resourceId};}
 catch(error){if(/^BUNDLED_ASSET_/.test(error?.code||''))error.code=error.code.replace('BUNDLED_ASSET_','BUNDLED_AUDIO_');throw error;}
}
