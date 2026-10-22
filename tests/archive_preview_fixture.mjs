import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {topLevel} from './windows_host.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const source=fs.readFileSync(new URL('../plugins/archive-vlog/panel.tsx',import.meta.url),'utf8');
const plain=esbuild.transformSync(source,{loader:'tsx',format:'esm',target:'es2022',jsx:'preserve'}).code.replace(/^  /gm,'');
const block=name=>source.slice(source.indexOf('// '+name+':start'),source.indexOf('// '+name+':end')).replace(/^export /gm,'');
export const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};

export function archivePreviewFixture(t){
 const calls=[],audio=[],hooks={metadata:true,seek:true},timers=new Map();let clock=1000,next=1;
 const schedule=(fn,ms,interval=false)=>{const id=next++;timers.set(id,{fn,at:clock+ms,ms,interval});return id;};
 const clear=id=>timers.delete(id);
 const advance=async ms=>{const end=clock+ms;let steps=0;while(true){const row=[...timers].filter(([,r])=>r.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!row)break;if(++steps>10000)throw Error('timer failed to advance');const[id,r]=row;clock=r.at;timers.delete(id);if(r.interval)timers.set(id,{...r,at:clock+r.ms});r.fn();await settle();}clock=end;await settle();};
 class Media{
  constructor(url){this.handlers=new Map();this.duration=60;this.readyState=0;this.seeking=false;this._time=0;this._src='';this.volume=1;audio.push(this);if(url)this.src=url;}
  addEventListener(name,fn,options){const set=this.handlers.get(name)||new Map();set.set(fn,options);this.handlers.set(name,set);}
  removeEventListener(name,fn){this.handlers.get(name)?.delete(fn);}
  emit(name){if(name==='loadedmetadata')this.readyState=1;if(name==='seeked')this.seeking=false;this['on'+name]?.({target:this});for(const[fn,o]of[...(this.handlers.get(name)||[])]){if(o?.once)this.removeEventListener(name,fn);fn({target:this});}}
  set src(value){this._src=value;calls.push(['src',value]);if(value&&hooks.metadata)queueMicrotask(()=>this.emit('loadedmetadata'));}
  get src(){return this._src;}
  set currentTime(value){this._time=value;this.seeking=true;calls.push(['seek',value]);if(hooks.seek)queueMicrotask(()=>this.emit('seeked'));}
  get currentTime(){return this._time;}
  play(){calls.push(['play',this.currentTime]);return hooks.play?.(this)??Promise.resolve();}
  pause(){calls.push(['pause']);}
  removeAttribute(name){calls.push(['remove',name]);if(name==='src')this._src='';}
  load(){calls.push(['load',this.src]);}
 }
 const file='/music space \ud55c\uae00.wav',sha256='a'.repeat(64),files={
  join:(...parts)=>parts.join('/'),readRange:async()=>{calls.push(['binary-read']);throw Error('Full-byte source observation is outside this playback fixture.');},stat:async()=>({size:2**31+17,isDirectory:false,mtimeMs:1,ino:1}),
  pathToLocalURL:async path=>{calls.push(['localURL',path]);return hooks.url?.(path)??'local://'+encodeURI(path);},
  localURLToPath:async url=>{calls.push(['fromURL',url]);return decodeURIComponent(url.replace('local://.','').replace('local://',''));},
 };
 // This is a playback lifetime/streaming fixture. Its >2 GiB size is synthetic;
 // the full source fingerprint is an explicit observation boundary, not a native
 // SDK method or a claim that these tests hashed a multi-gigabyte file. The real
 // observeSourceFiles comparison remains in the caller; other suites hash bytes.
 const fingerprintTemplateFile=async(_files,path,check=()=>{})=>{check();calls.push(['fingerprint',path]);const value=await(hooks.fingerprint?hooks.fingerprint(path):{size:2**31+17,sha256});check();return value;};
 const globals={fingerprintTemplateFile,TextEncoder,TextDecoder,Uint8Array,AbortController,Blob,Audio:Media,console,queueMicrotask,
  Date:class extends Date{static now(){return clock;}},setTimeout:(f,ms)=>schedule(f,ms),clearTimeout:clear,setInterval:(f,ms)=>schedule(f,ms,true),clearInterval:clear,
  URL:{createObjectURL:()=>{calls.push(['blob']);return 'blob:whole-track';},revokeObjectURL:url=>calls.push(['revoke',url])},
  sdk:{files,environment:{platform:'darwin'}},panelLocalClient:value=>value,PREVIEW_TIMEOUT_MS:1000,PREVIEW_FADE:.4,
  previewTokenRef:{current:0},previewAbortRef:{current:null},previewCleanupRef:{current:null},previewTimerRef:{current:null},previewUrlRef:{current:null},audioRef:{current:null},mountedRef:{current:true},projectRef:{current:'p'},projectId:'p',
  playState:'idle',ownMusic:{path:file},ownGrid:{sourceObservation:{path:file,size:2**31+17,sha256}},cue:null,cueId:'own',roots:{plugin:'/install',data:'/data'},start:12.345,musicKind:'own',videoSeconds:5,
  readBytes:async path=>{calls.push(['whole-read',path]);return new Uint8Array(256);},pjoin:(...parts)=>parts.join('/'),uiError:say=>Error(say('en')),t:(_l,key)=>key,L:'en',sayError:(_l,e)=>e.message,
 };
 const states=[],errors=[];globals.setPlayState=value=>states.push(value);globals.setPlayingAudio=value=>calls.push(['playing',value]);globals.setStatus=value=>{if(value?.tone==='error')errors.push(value.say('en'));};
 const helpers=['stopPreview','preview','errorSay',...plain.includes('function audioType(')?['audioType']:[],...plain.includes('function prepareArchivePreview(')?['prepareArchivePreview']:[]].map(name=>topLevel(plain,name)).join('\n');
 const box=vm.createContext(globals);vm.runInContext(block('bundled-assets')+'\n'+block('native-image-input')+'\n'+helpers+'\nthis.api={stopPreview,preview};',box);
 t.after(()=>{box.api.stopPreview();for(const a of audio)a.emit('error');timers.clear();});
 return {box,files,file,calls,audio,hooks,states,errors,timers,advance,run:()=>box.api.preview(),stop:()=>box.api.stopPreview()};
}
