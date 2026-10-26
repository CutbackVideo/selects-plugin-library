import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {holdFixture,jsonFiles} from './gallery_hold_fixture.mjs';

export function clickWav(file,bpm,seconds=14) {
 const rate=11025,samples=new Int16Array(rate*seconds);
 for(let n=0;n*60/bpm<seconds;n++){
  const at=Math.round(n*60*rate/bpm);
  for(let i=0;i<55&&at+i<samples.length;i++)samples[at+i]=Math.trunc(25000*Math.exp(-i/10));
 }
 const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+samples.byteLength,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(samples.byteLength,40);
 const bytes=Buffer.alloc(samples.byteLength);for(let i=0;i<samples.length;i++)bytes.writeInt16LE(samples[i],i*2);
 fs.writeFileSync(file,Buffer.concat([header,bytes]));return file;
}
const decodes=f=>f.calls.filter(c=>c.args.includes('f32le'));
const staging=f=>fs.existsSync(f.data)?fs.readdirSync(f.data,{recursive:true}).filter(p=>/\.source-|\.output-/.test(p)):[];
const setup=async(t,options={})=>{const f=await holdFixture(t,options);fs.mkdirSync(f.data,{recursive:true});f.music=clickWav(path.join(f.root,'music.wav'),110);return f;};
for(const minify of [false,true])test('Gallery tempo reuses verified PCM for unchanged music (minify='+minify+')',async t=>{
 const f=await setup(t,{minify}),a=await f.tempo(f.music),b=await f.tempo(f.music);
 assert.equal(a.status,'estimated');assert.ok(Math.abs(a.bpm-110)<2);assert.equal(b.bpm,a.bpm);assert.equal(decodes(f).length,1);assert.equal(staging(f).length,0);
});
test('Gallery tempo detects same-size same-time music replacement',async t=>{
 const f=await setup(t);fs.utimesSync(f.music,946684800,946684800);const before=fs.statSync(f.music),a=await f.tempo(f.music);
 clickWav(f.music,140);fs.utimesSync(f.music,946684800,946684800);const after=fs.statSync(f.music),b=await f.tempo(f.music);
 assert.equal(after.size,before.size);assert.equal(after.mtimeMs,before.mtimeMs);assert.ok(Math.abs(a.bpm-110)<2);assert.ok(Math.abs(b.bpm-140)<2);assert.equal(decodes(f).length,2);
});
test('Gallery tempo decodes its private snapshot across an A-B-A source change',async t=>{
 const f=await setup(t),original=fs.readFileSync(f.music);f.hooks.beforeTool=(bin,args)=>{if(args.includes('f32le'))clickWav(f.music,140);};f.hooks.afterTool=(bin,args)=>{if(args.includes('f32le'))fs.writeFileSync(f.music,original);};
 const r=await f.tempo(f.music);assert.ok(Math.abs(r.bpm-110)<2);assert.notEqual(decodes(f)[0].args[decodes(f)[0].args.indexOf('-i')+1],f.music);assert.equal(staging(f).length,0);
});
test('Gallery tempo refuses a source changed during decoding',async t=>{
 const f=await setup(t);f.hooks.afterTool=(bin,args)=>{if(args.includes('f32le'))clickWav(f.music,140);};
 await assert.rejects(f.tempo(f.music),/changed/i);assert.equal(jsonFiles(f.data).length,0);assert.equal(staging(f).length,0);
});
for(const stage of ['hash','decode'])test('Gallery tempo cancels a detached owner during '+stage,async t=>{
 const f=await setup(t);let signal;
 f.hooks.beforeTool=async(bin,args,s)=>{if(stage==='hash'?args.includes('-hash'):args.includes('f32le')){signal=s;f.stop();await new Promise(r=>setTimeout(r,80));}};
 await assert.rejects(f.tempo(f.music),/ended|stopped|cancel/i);assert.equal(signal.aborted,true);assert.equal(jsonFiles(f.data).length,0);assert.equal(staging(f).length,0);
});
test('Gallery tempo rejects a late successful decode after its deadline',async t=>{
 const f=await setup(t);let signal;
 f.hooks.afterTool=async(bin,args)=>{if(args.includes('f32le'))await new Promise(r=>setTimeout(r,1600));};
 f.hooks.beforeTool=(bin,args,s)=>{if(args.includes('f32le'))signal=s;};
 await assert.rejects(f.tempo(f.music,{timeoutMs:1500}),/timed out|deadline/i);assert.equal(signal.aborted,true);assert.equal(jsonFiles(f.data).length,0);
});
for(const corruption of ['unaligned','nonfinite','oversize'])test('Gallery tempo refuses '+corruption+' PCM before returning BPM',async t=>{
 const f=await setup(t);f.hooks.afterTool=(bin,args)=>{if(!args.includes('f32le'))return;const file=args.at(-1);if(corruption==='unaligned')fs.appendFileSync(file,Buffer.from([1]));if(corruption==='nonfinite'){const bytes=fs.readFileSync(file);bytes.writeFloatLE(NaN,0);fs.writeFileSync(file,bytes);}if(corruption==='oversize')fs.appendFileSync(file,Buffer.alloc(11025*31*4));};
 await assert.rejects(f.tempo(f.music),/PCM|audio|media|length|size|sample/i);assert.equal(jsonFiles(f.data).length,0);assert.equal(staging(f).length,0);
});
test('Gallery tempo keeps its captured client after another panel binds a host',async t=>{
 const a=await setup(t),b=await setup(t);let rebound=false;a.hooks.beforeTool=()=>{if(!rebound){rebound=true;a.bind(b);}};
 const r=await a.tempo(a.music);assert.equal(r.status,'estimated');assert.equal(b.calls.length,0);assert.equal(b.reads.length,0);assert.equal(b.writes.length,0);
});
test('Gallery tempo rejects an already cancelled request without file or media work',async t=>{
 const f=await setup(t),c=new AbortController();c.abort();await assert.rejects(f.tempo(f.music,{signal:c.signal}),/ended|cancel|stopped/i);assert.equal(f.calls.length,0);assert.equal(f.writes.length,0);
});
test('Gallery tempo file names are argv data',async t=>{
 const f=await setup(t),file=clickWav(path.join(f.root,"music 'quote' $() \uc74c\uc545.wav"),140),r=await f.tempo(file);assert.ok(Math.abs(r.bpm-140)<2);
});
test('Gallery tempo repairs changed cached PCM bytes before reuse',async t=>{
 const f=await setup(t);await f.tempo(f.music);
 const cached=fs.readdirSync(f.data,{recursive:true}).find(p=>p.endsWith('.f32'));assert.ok(cached);
 const file=path.join(f.data,cached),bytes=fs.readFileSync(file);bytes.writeFloatLE(NaN,0);fs.writeFileSync(file,bytes);
 const r=await f.tempo(f.music);assert.ok(Math.abs(r.bpm-110)<2);assert.equal(decodes(f).length,2);assert.equal(staging(f).length,0);
});
test('Gallery tempo concurrent realms keep coherent complete PCM objects',async t=>{
 const f=await setup(t),other=await f.mount(),values=await Promise.all([f.tempo(f.music),other.tempo(f.music)]);
 assert.ok(values.every(r=>r.status==='estimated'&&Math.abs(r.bpm-110)<2));assert.equal(jsonFiles(f.data).length,1);assert.equal(staging(f).length,0);
 assert.equal((await f.tempo(f.music)).status,'estimated');assert.equal(decodes(f).length,2);
});
test('Gallery tempo binds the PCM bytes actually analyzed to the verified output digest',async t=>{
 const f=await setup(t);let reads=0;
 f.hooks.afterRename=(from,to)=>{if(to.endsWith('.f32'))fs.utimesSync(to,946684800,946684800);};
 f.hooks.beforeRead=(file,offset)=>{if(file.endsWith('.f32')&&offset===0&&++reads===2){const bytes=fs.readFileSync(file);bytes.writeFloatLE(.125,0);fs.writeFileSync(file,bytes);fs.utimesSync(file,946684800,946684800);}};
 await assert.rejects(f.tempo(f.music),/PCM|changed|match|contents/i);
});
test('Gallery tempo rechecks source contents after reading and analyzing PCM',async t=>{
 const f=await setup(t);let reads=0;
 f.hooks.beforeRead=(file,offset)=>{if(file.endsWith('.f32')&&offset===0&&++reads===2)clickWav(f.music,140);};
 await assert.rejects(f.tempo(f.music),/source|music.*changed/i);
});
test('Gallery tempo keeps final PCM read failures private and safely retryable',async t=>{
 const f=await setup(t);let reads=0;
 f.hooks.beforeRead=(file,offset)=>{if(file.endsWith('.f32')&&offset===0&&++reads===2)throw Error('private /secret/path transport');};
 await assert.rejects(f.tempo(f.music),e=>typeof e.publicMessage==='string'&&!e.publicMessage.includes('private')&&!e.publicMessage.includes('/secret/path')&&e.safeNotSaved===true);
});
for(const member of ['stat','rename','readFile'])test('Gallery tempo asks for an update before work when '+member+' is unavailable',async t=>{
 const f=await setup(t),client={...f.local,files:{...f.local.files,[member]:undefined}};
 await assert.rejects(f.tempo(f.music,{client}),e=>e.code==='host-missing'&&/Update Selects/.test(e.publicMessage));assert.equal(f.calls.length,0);assert.equal(f.writes.length,0);
});
test('Gallery tempo reports unavailable storage without asking for a host update',async t=>{
 const f=await setup(t);await assert.rejects(f.tempo(f.music,{},null),e=>e.code==='tempo-storage'&&/storage|folder/i.test(e.publicMessage)&&!/Update Selects/.test(e.publicMessage));assert.equal(f.calls.length,0);
});
