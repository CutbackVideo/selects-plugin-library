import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFile,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {webcrypto,createHash} from 'node:crypto';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const compiled=new Map();
const localCode=esbuild.transformSync(fs.readFileSync(new URL('../shared/local-client.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs',target:'es2022'}).code;
export const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function picture(file,color='red'){
 execFileSync('ffmpeg',['-nostdin','-v','error','-y','-f','lavfi','-i','color=c='+color+':size=128x96:rate=30:duration=0.1','-an','-c:v','libx264','-pix_fmt','yuv420p',file]);
}
export function replaceSameFacts(source,other){
 const a=fs.readFileSync(source),b=fs.readFileSync(other),length=a.length;
 if(b.length>length)throw Error('Replacement fixture is not the same size');
 fs.writeFileSync(source,Buffer.concat([b,Buffer.alloc(length-b.length)]));fs.utimesSync(source,946684800,946684800);
 return length;
}
export function jsonFiles(root){return fs.existsSync(root)?fs.readdirSync(root,{recursive:true}).filter(p=>p.endsWith('.json')).map(p=>path.join(root,p)):[];}
export async function holdFixture(t,{minify=false,sourceName='source.mp4'}={}){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'gallery-held-')),data=path.join(root,'data'),source=path.join(root,sourceName),other=path.join(root,'blue.mp4');
 t.after(()=>fsp.rm(root,{recursive:true,force:true}));picture(source);picture(other,'blue');
 const bytes=fs.readFileSync(source),otherBytes=fs.readFileSync(other),length=Math.max(bytes.length,otherBytes.length)+128;
 fs.writeFileSync(source,Buffer.concat([bytes,Buffer.alloc(length-bytes.length)]));fs.utimesSync(source,946684800,946684800);
 const calls=[],reads=[],writes=[],renames=[],hooks={};let live=true;
 const stat=async p=>{try{const s=await fsp.stat(p);return {size:s.size,mtimeMs:s.mtimeMs,ino:s.ino,isDirectory:s.isDirectory()};}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const files={environment:async()=>({platform:process.platform,homedir:root,tempDirectory:root,version:'fixture'}),exists:async p=>fs.existsSync(p),stat,mkdir:(p,o)=>fsp.mkdir(p,o),remove:(p,o)=>fsp.rm(p,o),
  readRange:async({path:p,offset,length})=>{reads.push({path:p,offset,length});await hooks.beforeRead?.(p,offset,length);const handle=await fsp.open(p,'r');try{const bytes=Buffer.alloc(length),{bytesRead}=await handle.read(bytes,0,length,offset);return {bytesRead,base64:bytes.subarray(0,bytesRead).toString('base64')};}finally{await handle.close();}},
  writeChunk:async input=>{writes.push(input.path);await hooks.beforeWrite?.(input);const bytes=Buffer.from(input.base64,'base64');if(input.mode==='exclusive')await fsp.writeFile(input.path,bytes,{flag:'wx'});else if(input.mode==='append')await fsp.appendFile(input.path,bytes);else{const current=await fsp.stat(input.path);if(current.size!==input.offset)throw Error('Bad append offset');await fsp.appendFile(input.path,bytes);}await hooks.afterWrite?.(input);return {bytesWritten:bytes.length};},
  rename:async(from,to)=>{renames.push({from,to});await hooks.beforeRename?.(from,to);await fsp.rename(from,to);await hooks.afterRename?.(from,to);},copy:async(from,to)=>{await hooks.beforeCopy?.(from,to);await fsp.copyFile(from,to);await hooks.afterCopy?.(from,to);},
 };
 const sdk={runScript:async input=>{try{return {result:await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects:{files}})};}catch(e){return {isError:true,output:e.message};}}};
 const run=bin=>async(args,quiet,signal)=>{
  calls.push({bin,args:[...args],signal});await hooks.beforeTool?.(bin,args,signal);
  const result=await new Promise((resolve,reject)=>{
   if(signal?.aborted){reject(Error('Aborted'));return;}
   const child=execFile(bin,args,{encoding:'utf8',maxBuffer:4<<20},(error,stdout,stderr)=>{signal?.removeEventListener('abort',abort);if(error)reject(error);else resolve({stdout,stderr});});
   const abort=()=>child.kill();signal?.addEventListener('abort',abort,{once:true});
  });
  await hooks.afterTool?.(bin,args,result);return result;
 };
 const mount=async()=>{
  const module={exports:{}};vm.runInNewContext(localCode,{module,exports:module.exports,require:()=>({}),crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,btoa,atob,setTimeout,clearTimeout});
  const local=await module.exports.createPanelLocalClient(sdk);local.media={runFFmpeg:run('ffmpeg'),runFFprobe:run('ffprobe')};
  const key=String(minify);
  if(!compiled.has(key)){
   const source=fs.readFileSync(process.env.GALLERY_HOLD_PANEL||new URL('../plugins/photo-gallery-no2/panel.tsx',import.meta.url),'utf8');
   const extra='\nexport function __hold(sdk,local,request,data,options){panelLocalClients.set(sdk,local);hostUseSdk(sdk);return holdVideos(request,data,options);}';
   compiled.set(key,esbuild.transformSync(source+extra,{loader:'tsx',format:'cjs',jsx:'automatic',target:'es2022',minify}).code);
  }
  const panel={exports:{}};vm.runInNewContext(compiled.get(key),{module:panel,exports:panel.exports,require:()=>({}),crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,AbortController,setTimeout,clearTimeout,btoa,atob,console});
  return {run:(options={},request={videos:[{path:source}],durationFrames:18})=>panel.exports.__hold(sdk,local,request,data,{isCurrent:()=>live,...options}),local};
 };
 const api=await mount();return {root,data,source,other,calls,reads,writes,renames,hooks,files,run:api.run,local:api.local,mount,stop:()=>{live=false;},replace:()=>replaceSameFacts(source,other)};
}
