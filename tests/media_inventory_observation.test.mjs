import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {topLevel} from './windows_host.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const fill=(source,cfg)=>source.replace('__CONFIG__',()=>`JSON.parse(${JSON.stringify(JSON.stringify(cfg))})`);
function fixture(plugin){
 const panel=fs.readFileSync(root+'plugins/'+plugin+'/panel.tsx','utf8'),script=fs.readFileSync(root+'plugins/'+plugin+'/scripts/inventory.js','utf8');
 const read=vm.runInNewContext(topLevel(panel,'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout,clearTimeout});
 let rows=Array.from({length:64},(_,i)=>({resourceId:'r'+i,name:'Video '+i,type:'Video',hasAnalysis:true,durationSeconds:10}));
 const source=rows.map(row=>({resourceId:row.resourceId,type:'video',path:'/media/'+row.resourceId+'.mp4',frameSize:{width:1920,height:1080}}));
 const project={resources:async()=>rows,sourceFiles:async()=>({fileTree:source})};let calls=0;const hooks={};
 const run=async(_summary,make)=>{calls++;await hooks.before?.(calls);const result=await vm.runInNewContext('(async()=>{'+make(0)+'})()',{selects:{project:()=>project}});await hooks.after?.(calls,result);return result;};
 return {read:options=>read(run,script,{projectId:'p',measureMs:0,probeMs:0},fill,()=>hooks.live!==false,options),hooks,rows,source,rotate:()=>{rows=[...rows.slice(1),rows[0]];}};
}
for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': stable two-page inventory preserves every identity',async()=>{const f=fixture(plugin),actual=await f.read();assert.equal(actual.resources.length,64);assert.equal(new Set(actual.resources.map(row=>row.rid)).size,64);});
 test(plugin+': same-count row reordering must reject instead of returning a mixed inventory',async()=>{const f=fixture(plugin);f.hooks.before=call=>{if(call===2)f.rotate();};await assert.rejects(f.read(),/changed|snapshot/i);});
 test(plugin+': owner detachment during the final response cannot return success',async()=>{const f=fixture(plugin);f.hooks.after=call=>{if(call===2)f.hooks.live=false;};await assert.rejects(f.read(),/changed|stopped|ended/i);});
}

for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': reobservation detects a prior page metadata change',async()=>{const f=fixture(plugin);f.hooks.before=call=>{if(call===2)f.rows[0].durationSeconds=11;};await assert.rejects(f.read(),/changed|snapshot/i);});
 test(plugin+': verified final reply still checks owner lifetime',async()=>{const f=fixture(plugin);f.hooks.after=call=>{if(call===4)f.hooks.live=false;};await assert.rejects(f.read(),/changed|stopped|ended/i);});
 test(plugin+': malformed negative total cannot become an empty success',async()=>{const f=fixture(plugin);f.hooks.after=(_call,result)=>{result.page.total=-1;};await assert.rejects(f.read(),/invalid|confirm|incomplete/i);});
 test(plugin+': a response already outside the row budget must stop immediately',async()=>{const f=fixture(plugin);f.hooks.after=(call,result)=>{if(call>2)throw Error('test fence stopped runaway paging');result.page.total=20000;};await assert.rejects(f.read(),/budget|limit/i);});
 test(plugin+': shared reads do not mutate frozen transport data',async()=>{const f=fixture(plugin);f.hooks.after=(_call,result)=>{Object.freeze(result.page);Object.freeze(result.resources);Object.freeze(result.photos);Object.freeze(result.skipped);Object.freeze(result);};assert.equal((await f.read()).resources.length,64);});
}
test('a never-returning read is bounded by the overall observation deadline',async()=>{
 const panel=fs.readFileSync(root+'plugins/mini-vlog/panel.tsx','utf8'),read=vm.runInNewContext(topLevel(panel,'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout,clearTimeout});
 let fence;try{const result=await Promise.race([read(()=>new Promise(()=>{}),'script',{projectId:'p'},fill,()=>true,{timeoutMs:10}).then(()=>({success:true}),error=>({error})),new Promise(resolve=>{fence=setTimeout(()=>resolve({fence:true}),200);})]);assert.equal(result.error?.code,'MEDIA_INVENTORY_TIMEOUT');}finally{clearTimeout(fence);}
});
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
function actualRun(plugin,sdk,extra={}){
 const panel=fs.readFileSync(root+'plugins/'+plugin+'/panel.tsx','utf8'),plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code.replace(/^  /gm,'');
 const settings=vm.runInNewContext(['READ_TIMEOUT_SECONDS','BUSY_BACKOFF_MS','isBusyError'].map(name=>topLevel(plain,name)).join('\n')+'\n({READ_TIMEOUT_SECONDS,BUSY_BACKOFF_MS,isBusyError});');
 return vm.runInNewContext(topLevel(plain,'run')+';run;',{sdk,...settings,BusyError:class extends Error{},uiError:()=>Error('read failed'),setTimeout:fn=>{fn();},...extra});
}
for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': actual read runner cannot replay a lost-session read after the owner ends',async()=>{
  let live=true,calls=0;const run=actualRun(plugin,{runScript:async()=>{calls++;live=false;return calls===1?{isError:true,output:'No valid session ID'}:{result:{ok:true}};}});
  await assert.rejects(run('Read footage','return {};',false,{wanted:()=>live}),error=>error.code==='MEDIA_INVENTORY_STOPPED');assert.equal(calls,1);
 });
 test(plugin+': actual read runner passes only the remaining observation timeout',async()=>{
  let request;const run=actualRun(plugin,{runScript:async value=>{request=value;return {result:{ok:true}};}},{Date:{now:()=>1000}});
  await run('Read footage','return {};',false,{wanted:()=>true,deadline:2500});assert.equal(request.timeoutSeconds,2);assert.equal(request.allowCommit,false);
 });
}
for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': committing calls remain independent of read deadline and retry policy',async()=>{
 let sent;const run=actualRun(plugin,{runScript:async request=>{sent=request;return {result:{createdDraftId:'saved'}};}},{READ_TIMEOUT_SECONDS:undefined,Date:{now:()=>{throw Error('a read clock must not control a committing call');}}});
 assert.equal((await run('Save Draft','return {};',true,{wanted:()=>false,deadline:0})).createdDraftId,'saved');assert.equal(sent.allowCommit,true);assert.equal('timeoutSeconds' in sent,false);
});
for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': a zero total cannot carry nonempty source rows',async()=>{const f=fixture(plugin);f.hooks.after=(_call,result)=>{result.page.total=0;};await assert.rejects(f.read(),error=>error.code==='MEDIA_INVENTORY_INVALID');});
 test(plugin+': pages with different counter keys cannot be added as complete',async()=>{const f=fixture(plugin);f.hooks.after=(call,result)=>{if(call===2||call===4)delete result.skipped.missing;};await assert.rejects(f.read(),/counter|shape|invalid/i);});
 test(plugin+': failed verification cannot return the assembled first pass',async()=>{const f=fixture(plugin);f.hooks.before=call=>{if(call===3)throw Error('verification query failed');};await assert.rejects(f.read(),/verification query failed/);});
}
for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': actual retry wait ends with the observation owner and releases all timers',async()=>{
 const timers=new Set(),schedule=(fn,delay)=>{let id;id=setTimeout(()=>{timers.delete(id);fn();},delay);timers.add(id);return id;},clear=id=>{clearTimeout(id);timers.delete(id);};
 const panel=fs.readFileSync(root+'plugins/'+plugin+'/panel.tsx','utf8'),read=vm.runInNewContext(topLevel(panel,'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout:schedule,clearTimeout:clear});
 let live=true,calls=0;const run=actualRun(plugin,{runScript:async()=>{calls++;return {isError:true,output:'No valid session ID'};}},{setTimeout:schedule});
 const work=read(run,'script',{projectId:'p'},fill,()=>live,{timeoutMs:1000});const external=setTimeout(()=>{live=false;},10);
 try{await assert.rejects(work,error=>error.code==='MEDIA_INVENTORY_STOPPED');assert.equal(calls,1);assert.equal(timers.size,0);}finally{clearTimeout(external);for(const id of timers)clear(id);}
});

for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': a regular read retains the declared 90-second host cap',async()=>{let sent;const run=actualRun(plugin,{runScript:async request=>{sent=request;return {result:{ok:true}};}});await run('Read','return {};');assert.equal(sent.timeoutSeconds,90);});
 test(plugin+': ordinary lost-session recovery remains one sequential read retry',async()=>{let calls=0;const waits=[];const run=actualRun(plugin,{runScript:async()=>++calls===1?{isError:true,output:'No valid session ID'}:{result:{ok:true}}},{setTimeout:(fn,delay)=>{waits.push(delay);fn();}});assert.equal((await run('Read','return {};')).ok,true);assert.equal(calls,2);assert.deepEqual(waits,[1500]);});
 test(plugin+': ordinary busy reads retain their bounded sequential backoff',async()=>{let calls=0;const waits=[];const run=actualRun(plugin,{runScript:async()=>++calls<3?{isError:true,output:'hostWaitMs'}:{result:{ok:true}}},{setTimeout:(fn,delay)=>{waits.push(delay);fn();}});assert.equal((await run('Read','return {};')).ok,true);assert.equal(calls,3);assert.deepEqual(waits,[5000,15000]);});
 test(plugin+': a committing busy response is never replayed',async()=>{let calls=0;const run=actualRun(plugin,{runScript:async()=>{calls++;return {isError:true,output:'hostWaitMs'};}});await assert.rejects(run('Save','return {};',true),/hostWaitMs/);assert.equal(calls,1);});
}
test('paging retains the supplied work budget and removes measurement from read retries and verification',async()=>{
 const panel=fs.readFileSync(root+'plugins/mini-vlog/panel.tsx','utf8'),read=vm.runInNewContext(topLevel(panel,'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout,clearTimeout});const requests=[];
 const run=async(_summary,make,write,options)=>{assert.equal(write,false);assert.ok(Number.isFinite(options.deadline));assert.equal(typeof options.wait,'function');for(const attempt of [0,1])requests.push(vm.runInNewContext(make(attempt)));return {page:{total:0,elapsedMs:0},resources:[],photos:[],skipped:{missing:0},incomplete:false};};
 await read(run,'__CONFIG__',{projectId:'p',measureMs:4000,probeMs:2000,probeMax:20},fill);assert.deepEqual(requests.map(value=>value.measureMs),[4000,0,0,0]);
});
for(const mode of ['stopped','deadline'])test('final handoff rechecks '+mode+' after cleanup',async()=>{
 const panel=fs.readFileSync(root+'plugins/mini-vlog/panel.tsx','utf8');let live=true,now=1000;
 const read=vm.runInNewContext(topLevel(panel,'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout,Date:{now:()=>now},clearTimeout:id=>{clearTimeout(id);if(mode==='stopped')live=false;else now=2001;}});
 const run=async()=>({page:{total:0,elapsedMs:0},resources:[],photos:[],skipped:{missing:0},incomplete:false});
 await assert.rejects(read(run,'script',{projectId:'p'},fill,()=>live,{timeoutMs:1000}),error=>error.code===(mode==='stopped'?'MEDIA_INVENTORY_STOPPED':'MEDIA_INVENTORY_TIMEOUT'));
});
for(const primary of [false,true])test('cleanup failure attempts every timer and cannot become '+(primary?'a lost primary error':'successful observation'),async()=>{
 const owned=new Set();let clears=0;
 const schedule=(fn,ms)=>{let id;id=setTimeout(()=>{owned.delete(id);fn();},ms);owned.add(id);return id;};
 const clear=id=>{clears++;if(clears===1)throw Error('private clear failure');clearTimeout(id);owned.delete(id);};
 const panel=fs.readFileSync(root+'plugins/mini-vlog/panel.tsx','utf8'),read=vm.runInNewContext(topLevel(panel,'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout:schedule,clearTimeout:clear});
 const run=async()=>{if(primary)throw Error('private read failure');return {page:{total:0,elapsedMs:0},resources:[],photos:[],skipped:{missing:0},incomplete:false};};
 try{await assert.rejects(read(run,'script',{projectId:'p'},fill,()=>true,{timeoutMs:1000}),error=>error.terminal===true&&error.cleanupFailures?.length===1&&!error.message.includes('private')&&(!primary||error.cause?.message==='private read failure'));assert.equal(clears,2);}finally{for(const id of owned)clearTimeout(id);}
});
test('a read rejected without an Error value still rejects rather than returning empty success',async()=>{
 const panel=fs.readFileSync(root+'plugins/mini-vlog/panel.tsx','utf8'),read=vm.runInNewContext(topLevel(panel,'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout,clearTimeout});
 await assert.rejects(read(()=>Promise.reject(),'script',{projectId:'p'},fill,()=>true));
});
