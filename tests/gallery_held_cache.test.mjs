import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {holdFixture,hash,jsonFiles} from './gallery_hold_fixture.mjs';

for(const minify of [false,true])test('Gallery hold: whole-file identities survive same-size/same-time source replacement (minify='+minify+')',async t=>{
 const f=await holdFixture(t,{minify}),a=(await f.run()).videos[0],before=hash(a.outputPath);f.replace();const b=(await f.run()).videos[0];
 assert.equal(b.cacheHit,false);assert.notEqual(b.outputPath,a.outputPath);assert.notEqual(hash(b.outputPath),before);assert.equal(hash(a.outputPath),before,'old published media must remain stable');
});
test('Gallery hold: a same-size decodable cache change is detected and repaired',async t=>{
 const f=await holdFixture(t),a=(await f.run()).videos[0],before=hash(a.outputPath),bytes=fs.readFileSync(a.outputPath),at=bytes.indexOf('Lavf');assert.ok(at>=0);bytes[at+3]=bytes[at+3]===102?103:102;fs.writeFileSync(a.outputPath,bytes);
 assert.notEqual(hash(a.outputPath),before);const b=(await f.run()).videos[0];assert.equal(b.cacheHit,false);assert.equal(hash(b.outputPath),before);
});
test('Gallery hold: a changed source during encoding cannot publish or return the wrong generation',async t=>{
 const f=await holdFixture(t);let enter,release,held=false;const entered=new Promise(r=>{enter=r;}),gate=new Promise(r=>{release=r;});
 f.hooks.beforeTool=async(bin,args)=>{if(bin==='ffmpeg'&&args.includes('-vf')&&!held){held=true;enter();await gate;}};
 const first=f.run(),settled=Promise.allSettled([first]);await entered;f.replace();release();const [r]=await settled;
 assert.equal(r.status,'rejected');assert.equal(jsonFiles(f.data).length,0);assert.equal((await f.run()).videos[0].cacheHit,false);
});
test('Gallery hold: concurrent panel realms publish coherent content and one complete cache index',async t=>{
 const f=await holdFixture(t),other=await f.mount(),results=await Promise.all([f.run(),other.run()]);
 for(const r of results){const p=r.videos[0].outputPath;assert.equal(path.basename(p,'.mp4'),hash(p));}
 const rows=jsonFiles(f.data).map(p=>JSON.parse(fs.readFileSync(p,'utf8')));assert.equal(rows.length,1);assert.equal(rows[0].source.sha256,hash(f.source));
 const next=(await f.run()).videos[0];assert.equal(next.cacheHit,true);assert.equal(path.basename(next.outputPath,'.mp4'),hash(next.outputPath));
});
test('Gallery hold: a stale run aborts active conversion and cannot publish',async t=>{
 const f=await holdFixture(t);let enter,release,aborted=false;const entered=new Promise(r=>{enter=r;}),gate=new Promise(r=>{release=r;});
 f.hooks.beforeTool=async(bin,args,signal)=>{if(bin==='ffmpeg'&&args.includes('-vf')){enter();await new Promise(resolve=>{signal.addEventListener('abort',()=>{aborted=true;resolve();},{once:true});gate.then(resolve);});}};
 const result=Promise.allSettled([f.run()]);await entered;f.stop();await new Promise(r=>setTimeout(r,180));release();const [r]=await result;
 assert.equal(aborted,true);assert.equal(r.status,'rejected');assert.equal(jsonFiles(f.data).length,0);
});
test('Gallery hold: oversized cache descriptions are refused before reading the body',async t=>{
 const f=await holdFixture(t);await f.run();const meta=jsonFiles(f.data)[0];fs.writeFileSync(meta,Buffer.alloc(100000,32));f.reads.length=0;
 const r=await f.run();assert.equal(r.videos[0].cacheHit,false);assert.equal(f.reads.filter(x=>x.path===meta&&x.length>49152).length,0);assert.ok(f.reads.filter(x=>x.path===meta).reduce((n,x)=>n+x.length,0)<=49152);
});
test('Gallery hold: lost cache-index publication reply is recovered without another encode',async t=>{
 const f=await holdFixture(t);let lost=false;f.hooks.afterRename=async(from,to)=>{if(to.endsWith('.json')&&!lost){lost=true;throw Error('reply lost');}};
 const r=await f.run();assert.equal(r.status,'converted');assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,1);assert.equal((await f.run()).videos[0].cacheHit,true);
});
test('Gallery hold: a late missing input is checked before any conversion or publication',async t=>{
 const f=await holdFixture(t);fs.unlinkSync(f.source);await assert.rejects(f.run());assert.equal(f.calls.length,0);assert.equal(jsonFiles(f.data).length,0);
});
test('Gallery hold: a cache validation timeout cannot start a replacement encode',async t=>{
 const f=await holdFixture(t);await f.run();const before=f.calls.filter(c=>c.args.includes('-vf')).length;
 f.hooks.beforeTool=(bin,args)=>{if(bin==='ffprobe'&&args.at(-1).includes(path.sep+'objects'+path.sep))throw Object.assign(Error('Media conversion timed out'),{terminal:true});};
 await assert.rejects(f.run());assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,before);
});
test('Gallery hold: a noncallable liveness predicate is rejected rather than silently ignored',async t=>{
 const f=await holdFixture(t);await assert.rejects(f.run({isCurrent:false}),/options|current|liveness/i);assert.equal(f.calls.length,0);assert.equal(jsonFiles(f.data).length,0);
});
test('Gallery hold: a source changing A-B-A during encode cannot change the frozen picture',async t=>{
 const f=await holdFixture(t),a=(await f.run()).videos[0],expected=hash(a.outputPath),original=fs.readFileSync(f.source);
 for(const p of jsonFiles(f.data))fs.unlinkSync(p);
 f.hooks.beforeTool=(bin,args)=>{if(bin==='ffmpeg'&&args.includes('-vf'))f.replace();};
 f.hooks.afterTool=(bin,args)=>{if(bin==='ffmpeg'&&args.includes('-vf')){fs.writeFileSync(f.source,original);fs.utimesSync(f.source,946684800,946684800);}};
 const b=(await f.run()).videos[0];assert.equal(hash(b.outputPath),expected,'encoding must consume the verified private snapshot');
});
test('Gallery hold: unsupported media capability keeps a safe actionable public error',async t=>{
 const f=await holdFixture(t);delete f.local.media.runFFprobe;await assert.rejects(f.run(),e=>/Update Selects/.test(e.publicMessage??''));assert.equal(f.calls.length,0);
});
test('Gallery hold: failed media publication reports uncertainty without retry or index',async t=>{
 const f=await holdFixture(t);f.hooks.beforeRename=(from,to)=>{if(to.endsWith('.mp4'))throw Error('EACCES');};
 await assert.rejects(f.run(),e=>/publication/.test(e.publicMessage??''));assert.equal(jsonFiles(f.data).length,0);assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,1);
 assert.equal(fs.readdirSync(path.join(f.data,'held-v3')).some(p=>p.startsWith('.source-')||p.startsWith('.output-')),false);
});
test('Gallery hold: a missing later source is found before any generation is published',async t=>{
 const f=await holdFixture(t);await assert.rejects(f.run({},{videos:[{path:f.source},{path:path.join(f.root,'missing.mp4')}],durationFrames:18}));
 assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,0);assert.equal(jsonFiles(f.data).length,0);
});
test('Gallery hold: copying cannot fail into encoding or a leaked private working file',async t=>{
 const f=await holdFixture(t);f.hooks.beforeCopy=()=>{throw Error('ENOSPC');};await assert.rejects(f.run(),/Prepared media could not be completed/);
 assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,0);assert.equal(jsonFiles(f.data).length,0);assert.equal(fs.readdirSync(path.join(f.data,'held-v3')).some(p=>p.startsWith('.source-')||p.startsWith('.output-')),false);
});
test('Gallery hold: index failure keeps verified objects but never claims a completed cache',async t=>{
 const f=await holdFixture(t);f.hooks.beforeRename=(from,to)=>{if(to.endsWith('.json'))throw Error('EACCES');};await assert.rejects(f.run(),/index could not be confirmed/);
 assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,1);assert.equal(jsonFiles(f.data).length,0);f.hooks.beforeRename=null;
 const r=await f.run();assert.equal(path.basename(r.videos[0].outputPath,'.mp4'),hash(r.videos[0].outputPath));
});
test('Gallery hold: identical bytes in different selected files preserve independent source mapping',async t=>{
 const f=await holdFixture(t),copy=path.join(f.root,'copy.mp4');fs.copyFileSync(f.source,copy);
 const r=await f.run({},{videos:[{path:f.source},{path:copy},{path:f.source}],durationFrames:18});
 assert.deepEqual(Array.from(r.videos,v=>v.sourcePath),[f.source,copy,f.source]);assert.equal(r.videos[0].outputPath,r.videos[2].outputPath);assert.notEqual(r.videos[0].outputPath,r.videos[1].outputPath);assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,2);
 for(const p of jsonFiles(f.data)){const text=fs.readFileSync(p,'utf8');assert.ok(!text.includes(f.source)&&!text.includes(copy));}
});
test('Gallery hold: legacy cache files are preserved while new generations use held-v3',async t=>{
 const f=await holdFixture(t),legacy=path.join(f.data,'held-v2');fs.mkdirSync(legacy,{recursive:true});const old=path.join(legacy,'old.mp4');fs.writeFileSync(old,'old owned bytes');
 const r=await f.run();assert.ok(r.videos[0].outputPath.includes(path.sep+'held-v3'+path.sep));assert.equal(fs.readFileSync(old,'utf8'),'old owned bytes');
});
test('Gallery hold: non-ASCII and shell-looking file names remain argv data',async t=>{
 const f=await holdFixture(t,{sourceName:"source $() 'quote' \uc601\uc0c1.mp4"}),before=hash(f.source),r=await f.run();assert.equal(r.videos[0].sourcePath,f.source);assert.equal(hash(f.source),before);assert.equal(path.basename(r.videos[0].outputPath,'.mp4'),hash(r.videos[0].outputPath));
});
test('Gallery hold: large sources are streamed without reading them into browser byte buffers',async t=>{
 const f=await holdFixture(t);fs.appendFileSync(f.source,Buffer.alloc(33*1024*1024));const r=await f.run();assert.ok(fs.statSync(f.source).size>32*1024*1024);assert.equal(r.status,'converted');assert.ok(f.reads.every(x=>x.path.endsWith('.json')&&x.length<=49152));
});
test('Gallery shared owner: invalid liveness is a structured input failure before file I/O',async t=>{
 const f=await holdFixture(t);await assert.rejects(f.derive({isCurrent:false}),e=>e.code==='BUNDLED_ASSET_INPUT'&&typeof e.publicMessage==='string');assert.equal(f.writes.length,0);assert.equal(f.calls.length,0);
});
