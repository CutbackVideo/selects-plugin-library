import fs from 'node:fs';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {webcrypto} from 'node:crypto';
import {holdFixture} from './gallery_hold_fixture.mjs';
export async function clipAnalysisFixture(t,options={}){
 const f=await holdFixture(t,options);for(const [file,color] of [[f.source,'red'],[f.other,'blue']])execFileSync('ffmpeg',['-nostdin','-v','error','-y','-f','lavfi','-i','color=c='+color+':size=128x96:rate=30:duration=4','-an','-c:v','libx264','-pix_fmt','yuv420p',file]);
 const bytes=[f.source,f.other].map(p=>fs.readFileSync(p)),length=Math.max(...bytes.map(b=>b.length))+128;[f.source,f.other].forEach((p,i)=>{fs.writeFileSync(p,Buffer.concat([bytes[i],Buffer.alloc(length-bytes[i].length)]));fs.utimesSync(p,946684800,946684800);});
 const fingerprint=f.local.files.fingerprint;f.local.files.fingerprint=async p=>{await f.hooks.beforeFingerprint?.(p);return fingerprint(p);};
 const box=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,DataView,Float32Array,AbortController,setTimeout,clearTimeout,console});
 vm.runInContext(fs.readFileSync(new URL('../shared/bundled-assets.js',import.meta.url),'utf8')+'\n'+fs.readFileSync(new URL('../shared/clip-analysis.js',import.meta.url),'utf8')+'\nthis.api={quickScore,quickScoreAll};',box);
 const input={rid:'r0',path:f.source,durationSeconds:4};
 return {...f,box,input,score:(opts={})=>box.api.quickScore(input,{client:f.local,dataDir:f.data,...opts}),scoreAll:(inputs=[input],opts={})=>box.api.quickScoreAll(inputs,{client:f.local,dataDir:f.data,...opts}),decodes:()=>f.calls.filter(c=>c.args.includes('-vf')).length};
}
