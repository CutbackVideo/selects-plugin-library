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

// Whole-file hashing is supplied by the host media tool, so large source Videos
// are streamed without allocating their bytes in the browser. Stat is a change
// observation; the content digest, not size/mtime, is the source identity.
async function readAssetFileIdentity(files,path,hashFile,current){
 try{
 current();const before=await files.stat(path);current();
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<1)throw bundledAssetIssue('SOURCE','The media file is missing or unreadable.');
 const sha256=await hashFile(path);current();const after=await files.stat(path);current();
 if(typeof sha256!=='string'||!/^[0-9a-f]{64}$/.test(sha256)||!after||after.isDirectory!==false||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))throw bundledAssetIssue('CHANGED','The media file changed while its contents were checked. Start a new run.');
 return {sha256,bytes:before.size};
 }catch(error){
  if(error?.terminal||error?.code==='host-missing'||typeof error?.publicMessage==='string'||/^BUNDLED_ASSET_/.test(error?.code??''))throw error;
  throw bundledAssetIssue('SOURCE','The media file could not be read. Check the selected source and file access.',error);
 }
}

// One derived file from a frozen private source copy. Media objects are complete
// and content addressed before an atomic, bounded index points at them. Concurrent
// writers may publish different valid generations; neither mixes media/metadata.
async function prepareDerivedAsset(files,options){
 const {directory,key,sourcePath,source,extension='mp4',isCurrent=()=>true,signal,hashFile,produce,verify}=options??{};
 if(typeof isCurrent!=='function')throw bundledAssetIssue('INPUT','The derived media liveness check must be callable.');
 if(signal&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw bundledAssetIssue('INPUT','The derived media cancellation signal is invalid.');
 const current=()=>{if(signal?.aborted||!isCurrent())throw bundledAssetIssue('STOPPED','The template run ended before media preparation completed.');};
 const same=(a,b)=>a?.sha256===b?.sha256&&a?.bytes===b?.bytes;
 const valid=value=>value&&typeof value.sha256==='string'&&/^[0-9a-f]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>0;
 const freshSource=async()=>{if(!same(await readAssetFileIdentity(files,sourcePath,hashFile,current),source))throw bundledAssetIssue('CHANGED','The source media changed during preparation. Start a new run.');};
 current();
 if(typeof directory!=='string'||!directory||typeof sourcePath!=='string'||!sourcePath||!valid(source)||typeof key!=='string'||!/^[0-9a-f]{64}$/.test(key)||!['mp4','m4a','wav','mp3','png','f32'].includes(extension)||[isCurrent,hashFile,produce,verify].some(fn=>typeof fn!=='function'))throw bundledAssetIssue('INPUT','The derived media request is invalid.');
 if(['join','stat','readFile','readRange','exists','mkdir','writeFile','compareAndReplace','copyFile','rename','removeFile'].some(name=>typeof files?.[name]!=='function'))throw bundledAssetIssue('UNSUPPORTED','Update Selects to prepare media files safely.');
 const indexDirectory=files.join(directory,'index'),objectDirectory=files.join(directory,'objects',key),indexPath=files.join(indexDirectory,key+'.json');
 const cached=async()=>{
  current();let candidate;
  try{
   if(!await files.exists(indexPath)){current();return null;}
   const bytes=await readBundledAssetBytes(files,indexPath,49152,current),row=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   if(row?.version!==1||row.key!==key||!same(row.source,source)||!valid(row.output))return null;
   const path=files.join(objectDirectory,row.output.sha256+'.'+extension);
   if(!same(await readAssetFileIdentity(files,path,hashFile,current),row.output))return null;
   await verify(path);current();candidate={path,output:row.output,reused:true};
  }catch(error){current();if(error?.terminal||error?.code==='host-missing')throw error;return null;}
  await freshSource();return candidate;
 };
 const previous=await cached();current();if(previous)return previous;
 if(typeof globalThis.crypto?.randomUUID!=='function')throw bundledAssetIssue('UNSUPPORTED','Update Selects to prepare media files safely.');
 const owner=crypto.randomUUID();
 if(typeof owner!=='string'||!/^[0-9a-f-]{36}$/i.test(owner))throw bundledAssetIssue('UNSUPPORTED','The media preparation owner could not be created.');
 current();await files.mkdir(directory,{recursive:true});current();
 const snapshot=files.join(directory,'.source-'+owner),temporary=files.join(directory,'.output-'+owner+'.'+extension+'.tmp');
 const owned=new Set(),tokens=new Set();let result;
 const reservationUnknown=cause=>Object.assign(bundledAssetIssue('RESERVATION_UNKNOWN','The media file reservation could not be confirmed. Inspect the preparation workspace before starting again.',cause),{terminal:true});
 // Ownership observations are bounded and can run after cancellation so only
 // positively identified reservations enter cleanup. A filename alone is not proof.
 const observe=async path=>{
  try{
   const before=await files.stat(path);
   if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<0||before.size>1024)return null;
   const bytes=await files.readRange(path,0,before.size),after=await files.stat(path);
   if(!(bytes instanceof Uint8Array)||bytes.length!==before.size||!after||after.isDirectory!==false||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))return null;
   return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  }catch{return null;}
 };
 const reserve=async(path,role)=>{
  current();const token=crypto.randomUUID();
  if(typeof token!=='string'||!/^[0-9a-f-]{36}$/i.test(token)||token===owner||tokens.has(token))throw bundledAssetIssue('UNSUPPORTED','The media reservation owner could not be created.');
  tokens.add(token);const marker=JSON.stringify({version:1,kind:'derived-reservation',owner,token,role});let creationFailure;
  try{await files.writeFile(path,marker,{flag:'wx'});}catch(error){creationFailure=error;}
  if(await observe(path)!==marker)throw reservationUnknown(creationFailure);
  owned.add(path);current();
  // Consume exactly this marker to retain the established empty-output contract.
  // During an unobserved replacement, cleanup must not race a late rename.
  owned.delete(path);let replaced,clearFailure;
  try{replaced=await files.compareAndReplace(path,marker,'');}catch(error){clearFailure=error;}
  const cleared=await observe(path);
  if(replaced===false){if(cleared===marker)owned.add(path);throw reservationUnknown(clearFailure);}
  if(cleared!=='')throw reservationUnknown(clearFailure);
  owned.add(path);current();
 };
 try{
  // Reserve each private path exclusively before copying/encoding over it.
  await reserve(snapshot,'source');await reserve(temporary,'output');
  await files.copyFile(sourcePath,snapshot);current();
  if(!same(await readAssetFileIdentity(files,snapshot,hashFile,current),source))throw bundledAssetIssue('CHANGED','The source media changed while its working copy was prepared. Start a new run.');
  await produce(snapshot,temporary);current();await freshSource();
  await verify(temporary);current();const output=await readAssetFileIdentity(files,temporary,hashFile,current);
  current();await files.mkdir(objectDirectory,{recursive:true});current();
  const path=files.join(objectDirectory,output.sha256+'.'+extension);
  let have=false;
  try{have=same(await readAssetFileIdentity(files,path,hashFile,current),output);}catch{current();}
  if(!have){
   // A lost rename reply is observed, never retried or implemented as delete+move.
   try{current();await files.rename(temporary,path);}catch{}
   current();let confirmed=false;
   try{confirmed=same(await readAssetFileIdentity(files,path,hashFile,current),output);}catch(error){current();if(error?.terminal||error?.code==='host-missing')throw error;}
   if(!confirmed)throw bundledAssetIssue('PUBLISH','The prepared media publication could not be confirmed. Inspect the cache before starting again.');
  }
  await freshSource();current();await files.mkdir(indexDirectory,{recursive:true});current();
  const text=JSON.stringify({version:1,key,source,output});
  try{await files.writeFile(indexPath,text);}catch{/* Observe an acknowledged or concurrent complete index below. */}
  current();const confirmed=await cached();
  if(!confirmed)throw bundledAssetIssue('PUBLISH','The prepared media index could not be confirmed. Inspect the cache before starting again.');
  result={...confirmed,reused:false};
 }catch(error){
  if(error?.terminal||error?.code==='host-missing'||typeof error?.publicMessage==='string'||/^BUNDLED_ASSET_/.test(error?.code??''))throw error;
  throw bundledAssetIssue('DERIVED','Prepared media could not be completed. Check the source, available storage and media tools.',error);
 }finally{
  // Only this invocation's reserved staging paths are disposable. Published
  // objects/indexes may already be referenced by a different run or old Draft.
  for(const path of owned)await files.removeFile({filePath:path}).catch(()=>{});
 }
 // Cleanup is asynchronous too: a detached owner must not receive a late success.
 current();return result;
}

// A media process belongs to one captured client and one live invocation. Abort
// requests stop useful work; await host settlement before callers clean staging
// files. A late successful response never turns an ended invocation into success.
async function runAssetMediaTool(media,kind,args,options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))throw bundledAssetIssue('INPUT','The media process options are invalid.');
 const {isCurrent=()=>true,signal,timeoutMs=120000,deadline}=options;
 if(!['runFFmpeg','runFFprobe'].includes(kind)||!Array.isArray(args)||args.some(arg=>typeof arg!=='string')||typeof isCurrent!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>2147483647||deadline!==undefined&&!Number.isFinite(deadline)||signal&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw bundledAssetIssue('INPUT','The media process request or scope is invalid.');
 if(typeof media?.[kind]!=='function'||typeof AbortController!=='function')throw bundledAssetIssue('UNSUPPORTED','Update Selects to run and cancel media preparation safely.');
 const controller=new AbortController();let stopped=false,timedOut=false,watch,timer;
 const stop=()=>{stopped=true;controller.abort();};
 const live=()=>{try{return isCurrent()&&!signal?.aborted;}catch{return false;}};
 const check=()=>{if(!live())stop();else watch=setTimeout(check,50);};
 const expiresAt=Math.min(Date.now()+timeoutMs,deadline===undefined?Infinity:deadline),remaining=expiresAt-Date.now();
 signal?.addEventListener('abort',stop,{once:true});check();
 if(remaining<=0){timedOut=true;controller.abort();}
 else timer=setTimeout(()=>{timedOut=true;controller.abort();},remaining);
 try{
  if(stopped||timedOut)throw Error('The media process was not dispatched.');
  const result=await media[kind](args,true,controller.signal);
  if(!live())stop();
  if(Date.now()>=expiresAt){timedOut=true;controller.abort();}
  if(stopped||timedOut||controller.signal.aborted)throw Error('The media process ended after its scope.');
  return result;
 }catch(cause){
  if(!live())stop();
  if(Date.now()>=expiresAt){timedOut=true;controller.abort();}
  if(stopped)throw Object.assign(bundledAssetIssue('STOPPED','The template run ended before media preparation completed.',cause),{terminal:true});
  if(timedOut)throw Object.assign(bundledAssetIssue('TIMEOUT','Media preparation timed out.',cause),{terminal:true});
  if(cause?.terminal||cause?.code==='host-missing')throw cause;
  throw bundledAssetIssue('MEDIA','Media preparation could not be completed. Check the source file and media tools.',cause);
 }finally{clearTimeout(timer);clearTimeout(watch);signal?.removeEventListener('abort',stop);}
}
