import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {webcrypto,createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const esbuild=require(process.env.SELECTS_ESBUILD||(process.env.SBS_PANEL_TEST_MODULES?process.env.SBS_PANEL_TEST_MODULES+'/esbuild':'esbuild'));
const compiled=new Map();
const plugin='polaroid-photo-dump';
export function assetFixture({platform='darwin',home='/profile',cryptoSupported=true,minify=false}={}){
 const join=platform==='win32'?path.win32.join:path.posix.join;
 const root=join(home,'.selects','skills',plugin,'assets'),manifestPath=join(root,'manifest.json');
 const manifest=JSON.parse(fs.readFileSync(new URL('../plugins/'+plugin+'/assets/manifest.json',import.meta.url),'utf8'));
 const filesOnDisk=new Map(),decoded={};
 for(const [key,entry] of Object.entries(manifest)){
  const text=fs.readFileSync(new URL('../plugins/'+plugin+'/assets/'+entry.file+'.b64',import.meta.url));
  filesOnDisk.set(join(root,entry.file+'.b64'),text);decoded[key]=Buffer.from(text.toString(),'base64');
 }
 const saveManifest=()=>filesOnDisk.set(manifestPath,Buffer.from(JSON.stringify(manifest)));saveManifest();
 const reads=[],writes=[],imports=[],requests=[],rows=[],nodes=[],hooks={};let current=true;
 const files={join,homedir:()=>home,exists:async p=>filesOnDisk.has(p),mkdir:async()=>{},
  stat:async p=>filesOnDisk.has(p)?{size:filesOnDisk.get(p).length,isDirectory:false}:null,
  readFile:async(p,encoding)=>{reads.push(p);await hooks.beforeRead?.(p);if(!filesOnDisk.has(p))throw Error('ENOENT');const b=filesOnDisk.get(p);return encoding==='utf8'?b.toString('utf8'):new Uint8Array(b);},
  writeFile:async(p,bytes)=>{await hooks.beforeWrite?.(p);writes.push(p);filesOnDisk.set(p,Buffer.from(bytes));await hooks.afterWrite?.(p);},
  rename:async(a,b)=>{filesOnDisk.set(b,filesOnDisk.get(a));filesOnDisk.delete(a);},
  rm:async p=>{filesOnDisk.delete(p);},removeFile:async({filePath})=>{filesOnDisk.delete(filePath);},
 };
 const add=(p,{resourceId='asset-'+rows.length,type=/\.png$/i.test(p)?'Image':'Audio',durationSeconds=14.527007,frameSize={width:1080,height:1920}}={})=>{
  rows.push({resourceId,name:path.basename(p),type,durationSeconds});nodes.push({resourceId,name:path.basename(p),type:type.toLowerCase(),path:p,frameSize});return resourceId;
 };
 const project={resources:async()=>rows,sourceFiles:async()=>({fileTree:nodes}),importFiles:async({paths})=>{
  imports.push([...paths]);const actual=hooks.skip?[]:paths.map(p=>add(p,hooks.metadata??{}));
  return hooks.reply??{addedResourceIds:actual};
 }};
 const sdk={runScript:async input=>{const request={...input};requests.push(request);
  const result=await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects:{project:()=>project}});
  request.replyBytes=Buffer.byteLength(JSON.stringify(result));await hooks.afterScript?.(input,result);return {result};
 }};
 const key=String(minify);
 if(!compiled.has(key)){
  const source=fs.readFileSync(process.env.BUNDLED_ASSET_PANEL??new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8');
  const extra='\nexport function __bind(sdk,local){panelLocalClients.set(sdk,local);}export async function __prepare(sdk,projectId,isCurrent){hostUseSdk(sdk);return ensureAssets(sdk,projectId,isCurrent);}';
  compiled.set(key,esbuild.transformSync(source+extra,{loader:'tsx',format:'cjs',target:'es2022',jsx:'automatic',minify}).code);
 }
 const module={exports:{}};
 vm.runInNewContext(compiled.get(key),{module,exports:module.exports,require:()=>({}),console,crypto:cryptoSupported?webcrypto:undefined,atob,btoa,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout});
 module.exports.__bind(sdk,{files,environment:{platform}});
 return {prepare:()=>module.exports.__prepare(sdk,'p',()=>current),stop:()=>{current=false;},files,filesOnDisk,manifest,manifestPath,root,join,decoded,saveManifest,reads,writes,imports,requests,rows,nodes,add,hooks,sdk,
  dataPath:key=>join(home,'.selects','plugin-data',plugin,'assets',manifest[key].sha256+path.extname(manifest[key].file)),
  sourcePath:key=>join(root,manifest[key].file+'.b64'),
  updateMusic:()=>{const bytes=Buffer.concat([decoded.music,Buffer.from([0,0,0,8,102,114,101,101])]);manifest.music.bytes=bytes.length;manifest.music.sha256=createHash('sha256').update(bytes).digest('hex');filesOnDisk.set(join(root,manifest.music.file+'.b64'),Buffer.from(bytes.toString('base64')));saveManifest();return bytes;},
 };
}
