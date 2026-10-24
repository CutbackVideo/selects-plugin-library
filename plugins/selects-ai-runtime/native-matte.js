// Prepare the original picture and its saved luminance masks side by side.
// The WGSL effect samples both halves and applies the mask on the GPU. The
// intermediate contains no baked composite and retains the original Main audio.
export async function preparePackedMatte(run, storage, workflowId, projectId, image, current) {
 const key='wgsl-matte-input:'+workflowId;
 const call=(fn,arg)=>run('return await ('+fn.toString()+')(selects,'+JSON.stringify(arg)+');',true);
 const read=async()=>{const text=await storage.getItem(key);return text?JSON.parse(text):null;};
 let state=await read();
 if(!state) {
  state=await call(async function(selects,cfg){
   const result=await selects.ai.job(cfg.workflowId,cfg.projectId).result();
   if(!result.files.manifest)throw Error('This job has no matte manifest.');
   const matte=cfg.image?await selects.ai.prepareMatte(result.files.manifest,cfg.projectId,{sourceKind:'image'}):await selects.ai.prepareMatte(result.files.manifest,cfg.projectId);
   const p=selects.project(cfg.projectId),files=[];
   const walk=nodes=>{for(const n of nodes||[])if(n.type==='dir')walk(n.children);else files.push(n);};
   const root=await p.sourceFiles();if('fileTree' in root)walk(root.fileTree);else for(const folder of root.folders||[]){const child=await p.sourceFiles({folder:folder.name});if('fileTree' in child)walk(child.fileTree);}
   const source=files.find(f=>f.resourceId===matte.sourceResourceId);if(!source?.path)throw Error('The original matte source is unavailable.');
   const first=await selects.files.pathFromLocalUrl((matte.sourceKind==='image')?matte.maskUrl:matte.frames[0].url);
   const slash=Math.max(first.lastIndexOf('/'),first.lastIndexOf('\\')),folder=first.slice(0,slash+1);
   const extension=(matte.sourceKind==='image')?'.png':'.mov',path=folder+'packed-wgsl-source-v1'+extension;
   const metadata={sourceKind:(matte.sourceKind==='image')?'image':'video',sourceResourceId:matte.sourceResourceId,sourceRange:(matte.sourceKind==='image')?null:matte.sourceRange,frameSize:matte.frameSize,alphaEncoding:matte.alphaEncoding,frameCount:(matte.sourceKind==='image')?1:matte.frames.length,maskUrl:(matte.sourceKind==='image')?matte.maskUrl:null};
   // The final name is published only after verification. A retry can reuse it.
   if(await selects.files.exists(path))return {...metadata,path,status:'ready'};
   if(matte.frameSize.width*matte.frameSize.height*2>33554432)throw Error('The packed mask input exceeds the native image pixel budget.');
   const temp=folder+'packed-wgsl-source-'+Date.now()+'-'+Math.random().toString(36).slice(2)+extension;
   const args=['-v','error','-nostdin','-n'];
   if((matte.sourceKind==='image'))args.push('-i',source.path,'-i',first);
   else {
    const frames=matte.frames;if(!frames.length)throw Error('The matte contains no frames.');
    const list=[];for(let i=0;i<frames.length;i++){
     const path=await selects.files.pathFromLocalUrl(frames[i].url);if(/[\r\n]/.test(path))throw Error('A mask path contains a newline.');
     const duration=(frames[i+1]?.sourceTimeSeconds??matte.sourceRange.endSeconds)-frames[i].sourceTimeSeconds;
     if(!(duration>0))throw Error('The matte frame times are not increasing.');
     list.push("file '"+path.replace(/\\/g,'/').replace(/'/g,"'\\''")+"'\noption framerate 1000000\nduration "+duration);
    }
    const listPath=temp+'.ffconcat',bytes=Array.from(encodeURIComponent('ffconcat version 1.0\n'+list.join('\n')+'\n').replace(/%([0-9A-F]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16))),c=>c.charCodeAt(0));
    const base64=bytes=>{const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1]||0,c=bytes[i+2]||0;out+=alphabet[a>>2]+alphabet[((a&3)<<4)|(b>>4)]+(i+1<bytes.length?alphabet[((b&15)<<2)|(c>>6)]:'=')+(i+2<bytes.length?alphabet[c&63]:'=');}return out;};
    for(let offset=0;offset<bytes.length;offset+=49152){const part=bytes.slice(offset,offset+49152);const wrote=await selects.files.writeChunk({path:listPath,offset,base64:base64(part)});if(wrote.bytesWritten!==part.length)throw Error('The matte input list was truncated.');}
    args.push('-ss',String(matte.sourceRange.startSeconds),'-t',String(matte.sourceRange.endSeconds-matte.sourceRange.startSeconds),'-i',source.path,'-f','concat','-safe','0','-i',listPath);
   }
   // Match the prepared upright display raster and preserve the original RGB.
   const w=matte.frameSize.width,h=matte.frameSize.height;
   args.push('-filter_complex',`[0:v]setpts=PTS-STARTPTS,scale=${w}:${h},setsar=1,format=rgba[src];[1:v]setpts=PTS-STARTPTS,scale=${w}:${h},setsar=1,format=rgba[mask];[src]pad=${w*2}:${h}:0:0:color=black@0[canvas];[canvas][mask]overlay=x=${w}:y=0:shortest=0:repeatlast=1:format=auto[out]`,'-map','[out]','-an');
   if((matte.sourceKind==='image'))args.push('-frames:v','1','-c:v','png','-pix_fmt','rgba');
   else args.push('-t',String(matte.sourceRange.endSeconds-matte.sourceRange.startSeconds),'-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16','-fps_mode','vfr');
   args.push(temp);return {...metadata,path,temp,args,status:'prepared'};
  },{workflowId,projectId,image});
  await storage.setItem(key,JSON.stringify(state));
 }
 if(!current())throw Error('The project changed while preparing a matte.');
 if(state.status==='prepared'){
  state={...state,status:'starting'};await storage.setItem(key,JSON.stringify(state));
  const ack=await run('return await selects.media.startFFmpeg({args:'+JSON.stringify(state.args)+'});',true);
  state={...state,jobId:ack.jobId,status:'encoding'};await storage.setItem(key,JSON.stringify(state));
 }
 if(state.status==='starting')throw Error('The mask-input encoder acknowledgment is unknown. Preserve this preparation record and inspect the local media job before retrying.');
 const wait=async jobId=>{for(;;){if(!current())throw Error('The project changed while preparing a matte.');const status=await run('return await selects.media.job('+JSON.stringify(jobId)+').status();');if(status.state==='succeeded')return;if(status.state==='failed'||status.state==='cancelled')throw Error(status.error||'Mask input preparation failed.');await new Promise(resolve=>setTimeout(resolve,200));}};
 if(state.status==='encoding'){
  try{await wait(state.jobId);}catch(error){await run('return await selects.media.job('+JSON.stringify(state.jobId)+').cancel();',true).catch(()=>{});throw error;}
  // Decoding the entire result catches a truncated or corrupt intermediate.
  const check=await run('return await selects.media.startFFmpeg({args:'+JSON.stringify(['-v','error','-nostdin','-i',state.temp,'-map','0:v:0','-f','null','-'])+'});',true);
  try{await wait(check.jobId);}catch(error){await run('return await selects.media.job('+JSON.stringify(check.jobId)+').cancel();',true).catch(()=>{});throw error;}
  await call(async function(selects,state){if(!await selects.files.exists(state.path))await selects.files.rename(state.temp,state.path);return true;},state);
  state={...state,status:'ready'};await storage.setItem(key,JSON.stringify(state));
 }
 if(state.status!=='ready')throw Error('The prepared mask input is not ready.');
 const imported=await call(async function(selects,cfg){
  const p=selects.project(cfg.projectId);await p.importFiles({paths:[cfg.path]});const files=[];const walk=nodes=>{for(const n of nodes||[])if(n.type==='dir')walk(n.children);else files.push(n);};const root=await p.sourceFiles();if('fileTree' in root)walk(root.fileTree);else for(const folder of root.folders||[]){const child=await p.sourceFiles({folder:folder.name});if('fileTree' in child)walk(child.fileTree);}
  const normalize=p=>String(p).replace(/\\/g,'/');const source=files.find(f=>normalize(f.path)===normalize(cfg.path));if(!source)throw Error('The packed matte input was not imported.');return source.resourceId;
 },{projectId,path:state.path});
 return {...state,packedResourceId:imported};
}
