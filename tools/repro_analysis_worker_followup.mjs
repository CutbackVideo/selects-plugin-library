// Standalone Chromium child only: no connection to running apps, CDP ports,
// Projects or installed user profiles. Requires an existing Playwright install.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {topLevel} from '../tests/windows_host.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require=createRequire(import.meta.url),dependencies=process.env.SBS_PANEL_TEST_MODULES;
if(!dependencies||!process.env.WORKER_BROWSER)throw Error('Set SBS_PANEL_TEST_MODULES and WORKER_BROWSER to existing dependencies/browser paths.');
const esbuild=require(path.resolve(dependencies,'esbuild')),{chromium}=require(path.resolve(dependencies,'playwright'));
const artifacts=fs.mkdtempSync(path.join(process.env.WORKER_ARTIFACTS_PARENT||os.tmpdir(),'worker-followup-'));
const plugins=['city-weekend-vlog','torn-paper-love','summer-trip','the-end-credits','mini-vlog','archive-vlog'];
const builders=['cwvBeatWorkerSource','tplBeatWorkerSource','stBeatWorkerSource','tecBeatWorkerSource','avBeatWorkerSource','avBeatWorkerSource'];
const shared=fs.readFileSync(path.join(root,'shared/analysis-worker.js'),'utf8'),cfg={shared,adapters:{},parents:{},sources:{},expected:{}};
const pcm=new Float32Array(22050*20);
for(let beat=0;beat*.5<20;beat++)for(let i=0,at=Math.round((.3+beat*.5)*22050);i<400&&at+i<pcm.length;i++)pcm[at+i]=Math.exp(-i/60)*(i%2?1:-1);
for(const [index,plugin] of plugins.entries()){
 const file='plugins/'+plugin+'/panel.tsx',source=fs.readFileSync(path.join(root,file),'utf8');
 const plain=esbuild.transformSync(source,{loader:'tsx',format:'esm',jsx:'preserve'}).code;
 cfg.adapters[plugin]=topLevel(plain,'analyseBeat');
 const parent=execFileSync('git',['show','dac6563:'+file],{cwd:root,encoding:'utf8'});
 cfg.parents[plugin]=topLevel(esbuild.transformSync(parent,{loader:'tsx',format:'esm',jsx:'preserve'}).code,'analyseBeat');
 const detector=fs.readFileSync(path.join(root,'plugins',plugin,'beat-detect.cjs'),'utf8');
 cfg.sources[plugin]=new Function(topLevel(plain,builders[index])+';return '+builders[index]+';')()(detector);
 cfg.expected[plugin]=JSON.parse(JSON.stringify(require(path.join(root,'plugins',plugin,'beat-detect.cjs')).analyze(pcm,22050,plugin==='summer-trip'?{dropPick:'largest'}:undefined)));
}
async function browserProbe(cfg){
 const rows=[],NativeWorker=Worker,NativeURL=URL,NativeSet=setTimeout,NativeClear=clearTimeout;
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 for(const plugin of Object.keys(cfg.adapters))for(const parent of [true,false])for(const mode of ['dispatch','late','cleanup','parity']){
  if(parent&&['mini-vlog','archive-vlog'].includes(plugin))continue;
  const workers=new Set(),urls=new Set(),timers=new Set(),listeners=new Set();let clock=1000;
  const controller=new AbortController(),signal=new Proxy(controller.signal,{get(target,key){
   if(key==='addEventListener')return(type,fn,options)=>{listeners.add(fn);target.addEventListener(type,fn,options);};
   if(key==='removeEventListener')return(type,fn)=>{listeners.delete(fn);target.removeEventListener(type,fn);};
   return Reflect.get(target,key,target);
  }});
  class TrackedWorker extends NativeWorker{
   constructor(url){super(url);workers.add(this);if(mode==='late')this.addEventListener('message',()=>{clock+=1001;},{once:true});}
   postMessage(payload,transfer){return super.postMessage(mode==='dispatch'?{uncloneable:()=>0}:payload,transfer??[]);}
   terminate(){super.terminate();workers.delete(this);if(mode==='cleanup')throw Error('controlled native cleanup failure');}
  }
  const scopedURL={createObjectURL:blob=>{const url=NativeURL.createObjectURL(blob);urls.add(url);return url;},revokeObjectURL:url=>{NativeURL.revokeObjectURL(url);urls.delete(url);}};
  const schedule=(fn,delay)=>{let id;id=NativeSet(()=>{timers.delete(id);fn();},delay);timers.add(id);return id;};
  const clear=id=>{NativeClear(id);timers.delete(id);};
  const source=(parent?'':cfg.shared)+'\nconst OWN_RATE=22050,BEAT_TIMEOUT_MS=60000,ST_PCM_RATE=22050,ST_BEAT_TIMEOUT_MS=90000,TEC_PCM_RATE=22050,TEC_BEAT_TIMEOUT_MS=60000,STALE=Error("Project changed");\n'+(parent?cfg.parents[plugin]:cfg.adapters[plugin])+'\nreturn analyseBeat;';
  const analyse=new Function('Worker','URL','Blob','setTimeout','clearTimeout','Date',source)(TrackedWorker,scopedURL,Blob,schedule,clear,{now:()=>clock});
  const samples=new Float32Array(22050*20);
  for(let beat=0;beat*.5<20;beat++)for(let i=0,at=Math.round((.3+beat*.5)*22050);i<400&&at+i<samples.length;i++)samples[at+i]=Math.exp(-i/60)*(i%2?1:-1);
  const reply=['summer-trip','the-end-credits'].includes(plugin)?{ok:true,result:{durationSeconds:1}}:{ok:{durationSeconds:1}};
  const workerSource=mode==='parity'?cfg.sources[plugin]:'onmessage=()=>postMessage('+JSON.stringify(reply)+');';
  let value,error;
  try{value=await analyse(workerSource,samples,signal,1000);}catch(cause){error=cause;}
  const remaining={workers:workers.size,urls:urls.size,timers:timers.size,listeners:listeners.size};
  try{
   if(parent&&mode==='dispatch')assert(error?.name==='DataCloneError'&&remaining.workers===1&&remaining.urls===1&&remaining.timers===1&&remaining.listeners===1,'Parent dispatch ownership failure did not reproduce: '+plugin);
   else{
    assert(Object.values(remaining).every(count=>count===0),'Resources remain after settlement: '+plugin+' '+mode);
    if(mode==='parity')assert(!error&&JSON.stringify(value)===JSON.stringify(cfg.expected[plugin]),'Detector output changed: '+plugin);
    else if(parent)assert(!error,'Parent control did not return its incorrect success: '+plugin+' '+mode);
    else if(mode==='dispatch')assert(error?.cause?.cause?.name==='DataCloneError','Native dispatch cause was lost: '+plugin);
    else if(mode==='late')assert(error?.cause?.code==='PANEL_WORKER_TIMEOUT','Late native response became success: '+plugin);
    else assert(error?.terminal===true,'Cleanup failure became success: '+plugin);
   }
   if(mode==='parity')assert(samples.byteLength===(plugin==='summer-trip'?0:22050*20*4),'Caller buffer ownership changed: '+plugin);
   rows.push({plugin,parent,mode,remaining,error:error?{name:error.name,code:error.code??null,terminal:error.terminal??false}:null,parity:mode==='parity',callerBytes:samples.byteLength});
  }finally{
   // Dispose only deliberate baseline leaks created inside this probe.
   for(const worker of workers)NativeWorker.prototype.terminate.call(worker);
   for(const url of urls)NativeURL.revokeObjectURL(url);
   for(const id of timers)NativeClear(id);
   for(const listener of listeners)controller.signal.removeEventListener('abort',listener);
  }
 }
 return {passed:true,rows};
}
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.WORKER_BROWSER,headless:true});
 const page=await browser.newPage();
 const result=await page.evaluate(browserProbe,cfg);
 result.browser=browser.version();result.sharedSha256=createHash('sha256').update(shared).digest('hex');
 result.scope='Owned standalone Chromium child: native Worker/Blob, controlled DataCloneError, delayed completion, cleanup error and exact detector parity. No Electron/SDK/Project/installed-panel/AV acceptance.';
 fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({artifacts,cases:result.rows.length,passed:result.passed,browser:result.browser}));
}finally{if(browser)await browser.close();}
