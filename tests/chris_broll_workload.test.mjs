import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const source=fs.readFileSync(new URL('../plugins/chris-williamson-style/panel.tsx',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(t,count=4){
 const api=loadPanelModule(source,{names:['keysFromPlan','captionCues','planPrompt','chooseAssets'],overrides:{mkdirs:async()=>{}}});
 const controller=new AbortController(),files=new Map(),requests=[],waiters=[];let pending,cleaning=false;
 const stageOf=prompt=>prompt.includes('Review this candidate')?'candidate':prompt.includes('Check these final')?'crop':'unexpected';
 const env={signal:controller.signal,ffmpeg:'/ffmpeg',pluginDir:'/plugin',node:async()=>'/node',status:()=>{},imageData:async()=> 'data:image/jpeg;base64,fixture',
  writeText:async(p,text)=>files.set(p,text),readText:async p=>{
   if(p.endsWith('candidates-result.json'))return JSON.stringify({items:JSON.parse(files.get(p.replace('candidates-result.json','candidates.json'))).candidates.items.map(item=>({...item,candidates:[0,1].map(n=>({id:item.id+'-'+n,kind:'video',duration:10,frames:['/'+item.id+'-'+n+'.jpg']}))}))});
   if(p.endsWith('assets-result.json'))return JSON.stringify({items:JSON.parse(files.get(p.replace('assets-result.json','assets.json'))).assets.items.map(item=>({id:item.id,ok:true,frames:['/'+item.id+'-crop.jpg'],source:'project',path:'/'+item.id+'.mp4'}))});
   return files.get(p);
  },runShell:async()=>{},askAI:async(prompt,_timeout,images)=>{
   if(cleaning)throw Object.assign(Error('Fixture detached'),{name:'AbortError'});
   assert.match(prompt,/^Use only the supplied images; no tools, edits or questions/);assert.ok(images.length);
   const stage=stageOf(prompt);assert.notEqual(stage,'unexpected','image review must never start a browser search');
   return new Promise((resolve,reject)=>{const request={stage,prompt,images,resolve,reject,done:false};requests.push(request);for(const wake of waiters)wake();});
  }};
 const reel={brolls:Array.from({length:count},(_,i)=>({key:{text:'camera '+i,start:i*100,end:i*100+30},start:i*100,end:i*100+60,query:'camera '+i}))};
 const warnings=[];
 const start=()=>{pending=api.chooseAssets(env,'/owned/job','/owned/media',reel,30,'project',{searchOverride:{}},warnings);void pending.catch(()=>{});return pending;};
 const request=async(stage,index)=>{
  const get=()=>requests.filter(r=>r.stage===stage)[index];if(get())return get();
  let timer,wake;try{return await new Promise((resolve,reject)=>{wake=()=>{if(get())resolve(get());};waiters.push(wake);timer=setTimeout(()=>reject(Error('No '+stage+' request '+index+'; observed '+requests.filter(r=>r.stage===stage).length)),1000);});}
  finally{clearTimeout(timer);if(wake)waiters.splice(waiters.indexOf(wake),1);}
 };
 const finish=(r,value)=>{r.done=true;r.resolve(JSON.stringify(value??(r.stage==='candidate'?{accepted:true,focusX:.5,focusY:.5}:{ok:true})));};
 t.after(async()=>{cleaning=true;controller.abort();for(const r of requests)if(!r.done)finish(r);await pending?.catch(()=>{});disposePanelModule(api);});
 return {api,env,files,requests,request,finish,start,controller,warnings};
}
test('explicit unillustrated keywords remain on the speaker without changing caption text or clocks',t=>{
 const f=fixture(t),words=['camera','feeling','pipeline','server','idea','promise.'].map((text,i)=>({i,text,startFrame:i*100,endFrame:i*100+30,sourceStartFrame:i*100}));
 const plan={keys:words.map((w,i)=>({word:i,n:1,broll:i===0?'camera body':i===3?'server racks':'',alt:''}))};
 const keys=f.api.keysFromPlan(plan,words,30);
 assert.deepEqual(Array.from(keys,k=>k.query),['camera body','','','server racks','','']);
 assert.deepEqual(Array.from(keys,k=>[k.start,k.end]),words.map(w=>[w.startFrame,w.endFrame]));
 const captions=f.api.captionCues(words,keys,30,600).filter(c=>c.kind==='keyword');
 assert.deepEqual(Array.from(captions,c=>[c.text,c.start,c.end]),Array.from(keys,k=>[k.text,k.start,k.end]));
 const prompt=f.api.planPrompt(words,30,600);assert.match(prompt,/actual spoken subject or action/);assert.doesNotMatch(prompt,/clear visual metaphor|at least 60%|at most 40%/i);
});
test('image-only candidate and actual-crop reviews run two at a time and retain output order',async t=>{
 const f=fixture(t),pending=f.start();
 const first=await f.request('candidate',0),second=await f.request('candidate',1);assert.equal(f.requests.filter(r=>!r.done).length,2);
 f.finish(second);const third=await f.request('candidate',2);assert.equal(f.requests.filter(r=>!r.done).length,2);
 f.finish(third);const fourth=await f.request('candidate',3);f.finish(fourth);f.finish(first);
 const crop0=await f.request('crop',0),crop1=await f.request('crop',1);assert.equal(f.requests.filter(r=>!r.done).length,2);
 f.finish(crop1);const crop2=await f.request('crop',2);f.finish(crop2);const crop3=await f.request('crop',3);f.finish(crop3);f.finish(crop0);
 const rows=await pending;assert.deepEqual(Array.from(rows,r=>r.keyStart),[0,100,200,300]);assert.equal(f.requests.length,8);assert.deepEqual(f.warnings,[]);
 assert.deepEqual(JSON.parse(f.files.get('/owned/job/assets.json')).assets.items.map(i=>i.id),['b001','b002','b003','b004']);
});
test('abort does not queue another review or render assets after either in-flight observation returns',async t=>{
 const f=fixture(t),pending=f.start(),one=await f.request('candidate',0),two=await f.request('candidate',1);
 f.controller.abort();f.finish(one);f.finish(two);await assert.rejects(pending);assert.equal(f.requests.length,2);assert.equal(f.files.has('/owned/job/assets.json'),false);
});
test('recoverable review failures and rejections retain their original warning order',async t=>{
 const f=fixture(t,2),pending=f.start(),one=await f.request('candidate',0),two=await f.request('candidate',1);
 two.done=true;two.reject(Error('review unavailable'));const retryTwo=await f.request('candidate',2);f.finish(retryTwo,{accepted:false});
 one.done=true;one.reject(Error('review unavailable'));const retryOne=await f.request('candidate',3);f.finish(retryOne,{accepted:false});
 assert.deepEqual(plain(await pending),[]);assert.deepEqual(f.warnings,['Candidate review failed for camera 0','No visually verified B-roll for “camera 0”; kept the speaker.','Candidate review failed for camera 1','No visually verified B-roll for “camera 1”; kept the speaker.']);
});
test('fallback caption selection never invents a picture query without a contextual plan',t=>{
 const f=fixture(t),words=['A','feeling.','The','pipeline.'].map((text,i)=>({i,text,startFrame:i*100,endFrame:i*100+30,sourceStartFrame:i*100}));
 const keys=f.api.keysFromPlan({keys:[]},words,30);assert.ok(keys.length);assert.ok(keys.every(k=>k.query===''));
});
test('a fatal image read drains the other owned review and cannot queue another item',async t=>{
 const f=fixture(t),failure=Error('Image could not be read');let rejectImage;
 f.env.imageData=async p=>p.includes('b001')?await new Promise((_,reject)=>{rejectImage=reject;}):'data:image/jpeg;base64,fixture';
 const pending=f.start(),other=await f.request('candidate',0);rejectImage(failure);await new Promise(r=>setImmediate(r));f.finish(other);
 await assert.rejects(pending,error=>error===failure);assert.equal(f.requests.length,1);assert.equal(f.files.has('/owned/job/assets.json'),false);
});
test('cancel during final crops discards late observations without dispatching another crop or success log',async t=>{
 const f=fixture(t),pending=f.start();for(let i=0;i<4;i++)f.finish(await f.request('candidate',i));
 const one=await f.request('crop',0),two=await f.request('crop',1);f.controller.abort();f.finish(one);f.finish(two);
 await assert.rejects(pending);assert.equal(f.requests.filter(r=>r.stage==='crop').length,2);assert.equal(f.files.has('/owned/job/asset-review-b.json'),false);
});
test('final crop failure and rejection warnings follow original item order after out-of-order completion',async t=>{
 const f=fixture(t,2),pending=f.start();for(let i=0;i<2;i++)f.finish(await f.request('candidate',i));
 const one=await f.request('crop',0),two=await f.request('crop',1);two.done=true;two.reject(Error('Unavailable crop review'));f.finish(one,{ok:false,reason:'wrong subject'});
 assert.deepEqual(plain(await pending),[]);assert.deepEqual(f.warnings,['Final B-roll crop rejected: wrong subject','Final B-roll crop could not be verified; omitted b002']);
});
