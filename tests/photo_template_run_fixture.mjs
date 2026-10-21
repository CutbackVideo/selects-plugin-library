import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {fixture} from './photo_authoring_fixture.mjs';
const require=createRequire(import.meta.url);
const esbuild=require(process.env.SELECTS_ESBUILD||(process.env.SBS_PANEL_TEST_MODULES?process.env.SBS_PANEL_TEST_MODULES+'/esbuild':'esbuild'));
const compiled=new Map();
export function templateFixture(id,{minify=false,cryptoFault=null,...options}={}){
 const f=fixture(id,options),files=new Map(),finishes=[],hooks={},requests=[];
 const watchers=new Set(),notify=()=>{for(const watcher of watchers)watcher();};
 const plugin='/user/.selects/skills/'+id,data='/user/.selects/plugin-data/'+id;
 if(id==='camera-shutter-dump'){
  const manifest=JSON.parse(fs.readFileSync(new URL('../plugins/'+id+'/sfx/manifest.json',import.meta.url),'utf8'));
  files.set(plugin+'/sfx/manifest.json',Buffer.from(JSON.stringify(manifest)));
  Object.entries(manifest).forEach(([key,value],i)=>{
   const bytes=fs.readFileSync(new URL('../plugins/'+id+'/sfx/'+value.file+'.b64',import.meta.url),'utf8');
   files.set(plugin+'/sfx/'+value.file+'.b64',Buffer.from(bytes));files.set(data+'/sfx/'+value.file,Buffer.from(bytes,'base64'));
   f.nodes.find(n=>n.resourceId==='a'+i).path=data+'/sfx/'+value.file;
  });
 }else if(id==='polaroid-photo-dump'){
  const manifest=JSON.parse(fs.readFileSync(new URL('../plugins/'+id+'/assets/manifest.json',import.meta.url),'utf8'));
  files.set(plugin+'/assets/manifest.json',Buffer.from(JSON.stringify(manifest)));
  for(const entry of Object.values(manifest))files.set(plugin+'/assets/'+entry.file+'.b64',fs.readFileSync(new URL('../plugins/'+id+'/assets/'+entry.file+'.b64',import.meta.url)));
 }else files.set(plugin+'/assets/music.mp3',Buffer.from('installed music'));
 const local={environment:{platform:'darwin'},files:{join:(...p)=>p.join('/'),homedir:()=>'/user',exists:async p=>files.has(p),mkdir:async()=>{},stat:async p=>files.has(p)?{size:files.get(p).length,isDirectory:false}:null,
  readRange:async(p,offset,length)=>{if(!files.has(p))throw Error('ENOENT');return new Uint8Array(files.get(p).subarray(offset,offset+length));},
  readFile:async(p,encoding)=>{if(!files.has(p))throw Error('ENOENT');return encoding==='utf8'?files.get(p).toString('utf8'):new Uint8Array(files.get(p));},
  writeFile:async(p,text,opts)=>{await hooks.beforeWrite?.(p);if(opts?.flag==='wx'&&files.has(p))throw Error('EEXIST');files.set(p,Buffer.from(text));await hooks.afterWrite?.(p);},
  compareAndReplace:async(p,expected,next)=>{const actual=files.has(p)?files.get(p).toString('utf8'):null;if(actual!==expected)return false;files.set(p,Buffer.from(next));notify();return true;},
 }};
 f.sdk.call=async(method,pid)=>{if(method==='getProjectDraftScaffold')return {owner:{libraryId:'library',projectId:pid}};if(method==='listProjectResources')return f.resources;throw Error('Unexpected SDK call '+method);};
 f.sdk.finishTemplate=result=>{finishes.push(result);notify();};
 f.selects.files.writeChunk=async input=>{if(input.mode==='exclusive'&&files.has(input.path))throw Error('EEXIST');const bytes=Buffer.from(input.base64,'base64');files.set(input.path,bytes);return {bytesWritten:bytes.length};};
 f.selects.files.compareAndReplace=async input=>{
  const expected=input.expectedBase64===null?null:Buffer.from(input.expectedBase64,'base64').toString('utf8');
  const replaced=await local.files.compareAndReplace(input.path,expected,Buffer.from(input.base64,'base64').toString('utf8'));return {replaced};
 };
 const original=f.sdk.runScript;f.sdk.runScript=async input=>{requests.push(input);const result=await original(input);notify();await hooks.afterReply?.(input,result);return result;};
 let effects,cleanups,cells,cursor;
 const React={useState:value=>{cursor++;return [value,()=>{}];},useRef:value=>{const index=cursor++;return cells[index]??(cells[index]={current:value});},useEffect:fn=>effects.push(fn)};
 const name=id==='no14-still-video'?'No14TemplateRun':'PhotoTemplateRun';
 const key=id+':'+minify;
 if(!compiled.has(key)){
  const source=fs.readFileSync(id==='polaroid-photo-dump'&&process.env.PHOTO_TEMPLATE_PANEL||new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
  // Only expose private entry points; the app-update guard has separate tests.
  const extra=`\nexport function __mount(props){useAppUpdateGuard=()=>{};return ${name}(props);}export function __bind(sdk,local){panelLocalClients.set(sdk,local);}`;
  compiled.set(key,esbuild.transformSync(source+extra,{loader:'tsx',format:'cjs',target:'es2022',jsx:'automatic',minify}).code);
 }
 const context={projectId:'p',template:{runId:id+':fixture',libraryId:'library',inputs:{photos:f.photos.map(p=>({resourceId:p.resourceId,name:p.name,kind:'image'}))}}};
 const mount=async(changes={},capabilities={})=>{
  const module={exports:{}};
  const fault=capabilities.cryptoFault??cryptoFault;
  const crypto=fault==='absent crypto'?undefined:fault==='missing digest'?{subtle:{},randomUUID:()=>webcrypto.randomUUID()}:fault==='missing UUID'?{subtle:webcrypto.subtle}:fault==='noncallable UUID'?{subtle:webcrypto.subtle,randomUUID:{}}:webcrypto;
  vm.runInNewContext(compiled.get(key),{module,exports:module.exports,require:name=>name==='react'?React:{jsx:()=>null},console,crypto,TextEncoder:fault==='missing encoder'?undefined:TextEncoder,TextDecoder:fault==='missing decoder'?undefined:TextDecoder,Uint8Array,setTimeout,clearTimeout,atob,btoa,window:{parent:{}}});
  module.exports.__bind(f.sdk,local);
  const ownCells=[],ownContext={...context,...changes};cells=ownCells;cursor=0;
  effects=[];cleanups=[];module.exports.__mount({sdk:f.sdk,context:ownContext});
  for(const effect of effects){const cleanup=effect();if(typeof cleanup==='function')cleanups.push(cleanup);}
  const ownCleanups=cleanups,close=()=>{for(const cleanup of ownCleanups)cleanup();};
  // Rerender the same realm with stable refs; these tests keep runId unchanged,
  // so its [runId] authoring effect must not restart. Only latest context changes.
  close.rerender=updates=>{cells=ownCells;cursor=0;effects=[];module.exports.__mount({sdk:f.sdk,context:{...ownContext,...updates}});};
  return close;
 };
 const until=predicate=>new Promise((resolve,reject)=>{
  const finish=(fn,value)=>{clearTimeout(timer);watchers.delete(check);fn(value);};
  const check=()=>{try{if(predicate())finish(resolve);}catch(error){finish(reject,error);}};
  const timer=setTimeout(()=>finish(reject,Error('Template did not settle: '+JSON.stringify(finishes))),3000);
  watchers.add(check);check();
 });
 return {...f,files,local,finishes,hooks,requests,context,mount,until};
}
