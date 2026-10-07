import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import zlib from 'node:zlib';
import {loadPanelOperation,runPanelShell} from './panel_operation.mjs';

const {scenePlan,slotNeeds,colorTransfer,normalizeFinish,buildFinishScript,buildCutoutScript,VIDEO_SLOTS,REFERENCE_TIMING,validateTiming,withinLimits,LIMITS,
 songAnalysis,songWorkerSource,songDecodeArgs,songArrangeArgs,measureArgs,rgbStats,cutoutKey,cutoutCommand}=loadPanelOperation('travel-beat-vlog');
const {analyseSamples,timingFrom,opening,hits,rolls}=songAnalysis();

const dir=path.resolve(import.meta.dirname,'../plugins/travel-beat-vlog');
// Independent reference measurements (30 fps, 468 frames), typed from the frame analysis.
const MONTAGE1=[12,16,19,22,25,28,32,35,38,42,48];
const MONTAGE2=[364,368,374,379,384,390,395,400,405,410,416];
const GRID1={V13:149,V14:153,V15:158,V16:163}, GRID2={V18:229,V19:233,V20:237,V21:242};

test('plan matches the measured reference timeline',()=>{
 const p=scenePlan(30),c=p.clips;
 assert.equal(p.durationFrames,468);assert.deepEqual(p.canvas,{width:1080,height:1920});
 assert.deepEqual(c.slice(0,11).map(x=>x.startFrame),MONTAGE1);
 assert.deepEqual(c.slice(0,11).map(x=>x.slot),VIDEO_SLOTS.slice(0,11));
 const hero=c.find(x=>x.image);assert.deepEqual([hero.startFrame,hero.endFrame],[55,102]);
 assert.deepEqual([p.title.startFrame,p.title.endFrame],[62,102]);
 for(const [slot,start] of Object.entries({...GRID1,...GRID2})){const x=c.find(y=>y.slot===slot);assert.equal(x.startFrame,start);assert.notEqual(x.quad,'full');}
 assert.deepEqual(c.filter(x=>x.slot==='V13'||x.slot==='V14'||x.slot==='V15'||x.slot==='V16').map(x=>x.quad),['TL','TR','BL','BR']);
 const m2=c.filter(x=>x.startFrame>=364&&x.startFrame<424);
 assert.deepEqual(m2.map(x=>x.startFrame),MONTAGE2);
 assert.deepEqual(m2.map(x=>x.slot),['V1','V2','V3','V4','V5','V6','V7','V8','V9','V24','V25']);
 assert.deepEqual(m2.filter(x=>x.inSeconds>0).map(x=>[x.slot,Math.round(x.inSeconds*30)]),[['V6',4],['V7',3]]);
 const last=c.at(-1);assert.equal(last.slot,'V26');assert.deepEqual([last.startFrame,last.endFrame],[424,465]);assert.deepEqual([last.fade.startFrame,last.fade.endFrame],[449,464]);assert.ok(Math.abs(last.fade.startSeconds-449.45/30)<1e-9&&Math.abs(last.fade.endSeconds-463.7/30)<1e-9);
 assert.equal(new Set(c.filter(x=>!x.image).map(x=>x.slot)).size,26);
});

test('other frame rates keep the same times',()=>{
 for(const fps of [24000/1001,60]){const p=scenePlan(fps),k=fps/30;assert.equal(p.durationFrames,Math.round(468*k));
  assert.deepEqual(p.clips.slice(0,11).map(x=>x.startFrame),MONTAGE1.map(f=>Math.round(f*k)));}
});

test('slot needs cover the longest use of each video',()=>{
 const n=slotNeeds();assert.equal(Object.keys(n).length,26);
 assert.ok(Math.abs(n.V12-80/30)<1e-9);assert.ok(Math.abs(n.V6-(4+5)/30)<1e-9);assert.ok(Math.abs(n.V26-41/30)<1e-9);
});

test('colour transfer is identity when the clip already matches, and clamps extremes',()=>{
 const t={mean:[.4,.45,.5],std:[.2,.22,.25]};
 assert.deepEqual(colorTransfer(t,t,1).map(c=>[c.gain,c.offset]),[[1,0],[1,0],[1,0]]);
 const flat=colorTransfer(t,{mean:[.9,.9,.9],std:[.001,.001,.001]},1);
 assert.ok(flat.every(c=>c.gain<=1.6&&c.offset>=-0.35));
 assert.deepEqual(colorTransfer(t,{mean:[.2,.2,.2],std:[.1,.1,.1]},0).map(c=>[c.gain,c.offset]),[[1,0],[1,0],[1,0]]);
});

const plan=scenePlan(30);
const request=()=>({mode:'finish',projectId:'p',draftId:'d',fps:30,songResourceId:'m',timing:REFERENCE_TIMING,
 videos:Object.fromEntries(VIDEO_SLOTS.map((s,i)=>[s,{resourceId:'v'+i,width:1080,height:1920}])),
 hero:{resourceId:'h',width:3000,height:4000},placements:[{clipId:7,trackId:'th'}],grades:{},title:{text:'TRAVEL',color:'#F4C711'}});

test('finish input needs all 26 videos and the hero clip',()=>{
 const r=request();delete r.videos.V17;assert.throws(()=>normalizeFinish(r),/V17/);
 const n=normalizeFinish(request());assert.equal(n.framing.H,null);assert.equal(Object.keys(n.framing).length,27);
});

function fakeSelects(){
 const log={overlays:[],audio:[],effects:[],transforms:[],graphics:[],commits:0};let next=100;
 let clips=[{clipId:7,trackId:'th',trackKind:'video',resourceId:'h',startFrame:55,endFrame:102}];
 const types=new Map([...VIDEO_SLOTS.map((s,i)=>['v'+i,'Video']),['h','Image'],['m','Audio']]);
 const d={meta:async()=>({fps:30,durationFrames:468,frameSize:{width:1080,height:1920}}),clips:async()=>clips.map(c=>({...c})),
  rangeAtFrames:async(a,b)=>({a,b}),
  overlayResource:async({resource,over,sourceStartSeconds})=>{log.overlays.push({id:resource.id,a:over.a,b:over.b,in:sourceStartSeconds});clips.push({clipId:next++,trackId:'t'+next,trackKind:types.get(resource.id)==='Audio'?'audio':'video',resourceId:resource.id,startFrame:over.a,endFrame:over.b});return {atFrame:over.a};},
  setClipAudio:async o=>{log.audio.push(o);},setClipTransform:async o=>{log.transforms.push(o);},addVideoEffect:async o=>{log.effects.push(o);},addMotionGraphic:async o=>{log.graphics.push(o);},
  commitAll:async()=>{log.commits++;return {commitId:'c'};}};
 const project={meta:async()=>({draftIds:['d']}),resources:async()=>[...types].map(([resourceId,type])=>({resourceId,type})),resource:id=>({id})};
 return {selects:{project:()=>project,draft:()=>d},log};
}

test('finish places 35 muted video clips, grids, the hero, the title and the song, then saves once',async()=>{
 const {selects,log}=fakeSelects();
 const r=await vm.runInNewContext('(async()=>{'+buildFinishScript(request()).replace(/const (input|plan):any=/g,'const $1=')+'})()',{selects});
 assert.equal(r.status,'saved',r.message);
 const vids=log.overlays.filter(o=>o.id!=='m');assert.equal(vids.length,35);assert.equal(log.audio.length,35);assert.ok(log.audio.every(a=>a.volumeDb===-60));
 assert.deepEqual(vids.slice(0,11).map(o=>o.a),MONTAGE1);
 assert.ok(Math.abs(vids.find(o=>o.a===390).in-4/30)<1e-9);
 assert.equal(log.effects.length,36);
 assert.deepEqual([log.graphics[0].within.a,log.graphics[0].within.b],[62,102]);
 assert.deepEqual([log.graphics[1].within.a,log.graphics[1].within.b],[464,468]);assert.equal(log.graphics[1].parameters.color,plan.endColor);
 assert.equal(log.effects.find(e=>e.parameters.fade).parameters.fadeTo,plan.endColor);
 assert.deepEqual(log.overlays.find(o=>o.id==='m'),{id:'m',a:0,b:468,in:undefined});
 // A grid panel sits in its quadrant: top-left centre at (-25 %, +25 %) of the frame height... in x: -270/1920*100.
 const tl=log.transforms[vids.findIndex(o=>o.a===149)];assert.ok(Math.abs(tl.position.x-(-270/1920*100))<1e-9&&Math.abs(tl.position.y-(480/1920*100))<1e-9);
 assert.equal(log.commits,1);
});

test('the finishing steps the panel sends run_script',()=>{
 assert.equal(scenePlan(30).clips.length,36);
 assert.equal(Object.keys(slotNeeds()).length,26);
 assert.match(buildFinishScript(request()),/^const input:any=/);
 assert.match(buildCutoutScript({fps:30,draftId:'d',cutout:{clipId:1,trackId:'t'},hero:{width:10,height:10}}),/authorCutout/);
 assert.throws(()=>buildFinishScript({...request(),mode:'other'}),/Unsupported request/);
});

// Everything runs inside the panel: no Node.js, no runtime.sh, and the cutout needs no compiler.
test('the panel needs no Node.js, runtime.sh or Xcode tools',()=>{
 const panel=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');
 assert.doesNotMatch(panel,/['"`]node\s|runtime\.sh|build-script|swiftc|xcrun|python3/);
 const files=JSON.parse(fs.readFileSync(path.join(dir,'plugin.json'),'utf8')).files;
 assert.ok(files.includes('tools/cutout.js')&&files.includes('color-targets.json')&&!files.some(f=>/\.(mjs|sh|swift)$/.test(f)));
 for(const f of files)assert.ok(fs.existsSync(path.join(dir,f)),f);
});

// The ffmpeg steps (run by the host's Runtime.runFFmpeg) write to a file; colour statistics come from its bytes.
test('ffmpeg arguments write to the given file, and colour statistics read rgb24 bytes',()=>{
 for(const args of [songDecodeArgs('/s.m4a','/o.f32'),songArrangeArgs('/s.m4a',1.5,REFERENCE_TIMING,'/o.wav'),measureArgs('/v.mp4',0.2,1,'/o.rgb'),measureArgs('/p.JPG',0,0.1,'/o.rgb')]){
  assert.equal(args.at(-1).slice(0,2),'/o');assert.ok(args.includes('-y')&&args.every(a=>typeof a==='string'));
 }
 assert.deepEqual(songDecodeArgs('/s.m4a','/o.f32').slice(-7),['-ac','1','-ar','22050','-f','f32le','/o.f32']);
 assert.ok(measureArgs('/p.JPG',0,0.1,'/o.rgb').includes('-frames:v'));
 const s=rgbStats(Uint8Array.from([255,0,0,0,0,0]),'x');
 assert.deepEqual(s.mean,[0.5,0,0]);assert.deepEqual(s.std,[0.5,0,0]);
 assert.throws(()=>rgbStats(new Uint8Array(0),'clip.mp4'),/clip\.mp4/);
 assert.equal(cutoutKey('/a/b.jpg',10,20,'person'),Buffer.from('/a/b.jpg:10:20:person').toString('base64url').slice(-40));
});

// The song analysis runs in a Web Worker built from songWorkerSource: it answers with the fit and its timing.
test('the song worker answers with the same fit and timing as the analysis',async()=>{
 const x=synthSong(120,45,12.0);
 const got=await new Promise((resolve,reject)=>{const ctx={postMessage:m=>m.error?reject(Error(m.error)):resolve(m.ok)};vm.createContext(ctx);vm.runInContext(songWorkerSource(),ctx);ctx.onmessage({data:{samples:x,cuts:'hits'}});});
 const fit=analyseSamples(x);
 assert.equal(JSON.stringify(got.fit),JSON.stringify(fit));assert.equal(JSON.stringify(got.timing),JSON.stringify(timingFrom(fit,'hits')));
 assert.equal(got.start,opening(fit,'hits'));assert.equal(got.start,fit.window.m1[0]);
 const short=await new Promise(resolve=>{const ctx={postMessage:resolve};vm.createContext(ctx);vm.runInContext(songWorkerSource(),ctx);ctx.onmessage({data:{samples:new Float32Array(SR),cuts:'hits'}});});
 assert.match(short.error,/too short/);
});

// A flat RGB PNG with one filled box, written without any image tool.
function boxPng(file,w,h,box){
 const rows=[];
 for(let y=0;y<h;y++){const row=Buffer.alloc(1+w*3);for(let x=0;x<w;x++){const inside=box&&x>=box.x&&x<box.x+box.w&&y>=box.y&&y<box.y+box.h;row.set(inside?[255,48,32]:[64,96,128],1+x*3);}rows.push(row);}
 const crc=b=>{let c=~0;for(const v of b){c^=v;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return ~c>>>0;};
 const chunk=(type,data)=>{const t=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,sum]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr.set([8,2,0,0,0],8);
 fs.writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]));
}
test('cutout runs through osascript with only stock macOS tools',{skip:process.platform!=='darwin'},()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'travel cutout-'));
 const run=(photo,out,mode)=>runPanelShell(cutoutCommand(path.join(dir,'tools','cutout.js'),photo,out,mode),{home});
 const box=path.join(home,"box's.png"),plain=path.join(home,'plain.png'),out=path.join(home,'hero.png');
 boxPng(box,64,48,{x:22,y:14,w:20,h:20});boxPng(plain,64,48,null);
 const fg=run(box,out,'foreground');
 assert.equal(fg.status,0,fg.stderr);
 assert.equal(fs.readFileSync(out).subarray(1,4).toString(),'PNG');
 const none=run(plain,path.join(home,'none.png'),'person');
 assert.notEqual(none.status,0);assert.match(none.stderr,/^No person found\./);
});

// Native placement behavior is exercised through runScript in native_image_sdk_migration.test.mjs.
const panelSource=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');

// --- song fitting (analyze.mjs) ---
const SR=22050;
// A synthetic song: a kick on every beat, a pitched stab on every off-beat, and one 12-hit roll (0.12 s apart)
// that, like a drum fill, replaces the groove while it plays.
function synthSong(bpm,seconds,rollAt){
 const x=new Float32Array(Math.round(seconds*SR)),P=60/bpm;
 const add=(t,f,len,amp)=>{const i0=Math.round(t*SR);for(let i=0;i<len*SR&&i0+i<x.length;i++){const e=Math.exp(-i/(len*SR/4));x[i0+i]+=amp*e*Math.sin(2*Math.PI*f*i/SR);}};
 const fill=t=>t>rollAt-0.1&&t<rollAt+12*0.12;
 for(let t=0.05;t<seconds;t+=P){if(!fill(t))add(t,55,0.18,0.9);if(!fill(t+P/2))add(t+P/2,880,0.06,0.25);}
 for(let k=0;k<12;k++){add(rollAt+k*0.12,660,0.05,0.8);add(rollAt+k*0.12,1320,0.05,0.4);}
 return x;
}
test('a synthetic song: tempo found, the window opens on the drum roll, and its timing is valid',()=>{
 const fit=analyseSamples(synthSong(120,45,12.0));
 assert.ok(Math.abs(fit.bpm-120)<1.5,'bpm '+fit.bpm);
 assert.equal(fit.K,1.5);
 assert.ok(Math.abs(fit.window.m1[0]-12.0)<0.04,'window starts at '+fit.window.m1[0]);
 assert.ok(fit.window.roll>=10);
 const t=withinLimits(validateTiming(timingFrom(fit,'hits')));
 assert.equal(t.m1[0],12);
 const want=fit.window.m1.slice(0,11).map(v=>Math.round((v-fit.window.m1[0]+0.4)*30));
 assert.deepEqual(t.m1.slice(0,want.length),want);   // montage-1 cuts sit on the roll's hits
});
test('hits and rolls: 12 evenly spaced hits form one roll, a 16th-note groove does not',()=>{
 assert.deepEqual(rolls(Array.from({length:12},(_,i)=>1+i*0.12)).map(r=>r.count),[12]);
 assert.deepEqual(rolls(Array.from({length:20},(_,i)=>1+i*0.167)),[]);
});
test('every timing a song can produce stays within the lengths the template promises',()=>{
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const b=f=>(f-102)/(30*60/89.4);
 for(let bpm=75;bpm<=150;bpm+=2.5){
  const P=60/bpm,K=(2*bpm/89.4)>=2.5?1.5:1,D=20,T=f=>D+K*b(f)*P;
  for(let trial=0;trial<25;trial++){
   const some=(a,c,n)=>Array.from({length:n},()=>a+rnd()*(c-a)).sort((u,v)=>u-v).filter((v,i,arr)=>!i||v-arr[i-1]>=2/30);
   const first=trial%2?T(12):T(12)-P/2+rnd()*(T(55)-P/8-T(12)+P/2);   // the strongest hit can open anywhere in the window
   const m1=[first,...some(first+0.07,T(55)-P/8,Math.floor(rnd()*14))];
   const fit={P,K,bpm,window:{D,m1,m2:some(T(364)-P/4,T(424)-P/8,Math.floor(rnd()*14)),g1:some(T(147),T(182)-P/8,Math.floor(rnd()*6)),g2:some(T(227),T(263)-P/8,Math.floor(rnd()*6))}};
   for(const mode of ['hits','reference']){
    const t=withinLimits(validateTiming(timingFrom(fit,mode)));
    for(const [s,v] of Object.entries(slotNeeds(t)))assert.ok(v<=(['V12','V17','V22'].includes(s)?LIMITS.long:LIMITS.clip)+1e-9,`${bpm} BPM ${mode}: ${s} needs ${v.toFixed(2)} s`);
   }
  }
 }
});
// QA: a song with few hits fell back to the reference rhythm but opened on its first hit, ~1.17 s after the grid's
// first cut, so m1[1] came out at -19. The opening must keep the grid in order, and the song starts at that opening.
test('a song with few or no montage hits still yields a valid timing that starts the song on its opening',()=>{
 const bpm=89.4,P=60/bpm,K=1,D=20,b=f=>(f-102)/(30*60/89.4),T=f=>D+K*b(f)*P;
 const fit=m1=>({P,K,bpm,window:{D,m1,m2:[],g1:[],g2:[]}});
 const late=fit([T(12)+7/6,T(12)+1.25,T(12)+1.3]);
 const t=withinLimits(validateTiming(timingFrom(late,'hits')));
 assert.deepEqual(t.m1.slice(0,2),[12,16]);assert.ok(Math.abs(opening(late,'hits')-T(12))<1e-9);
 const early=fit([T(12)+0.05,T(12)+0.5]);
 assert.ok(Math.abs(opening(early,'hits')-early.window.m1[0])<1e-9);   // an early first hit still opens the vlog
 assert.ok(Math.abs(opening(early,'reference')-T(12))<1e-9);
 const crowded=fit(Array.from({length:6},(_,i)=>T(12)+0.9+i*0.07));   // 6 hits, too late to fill 11 cuts
 assert.ok(Math.abs(opening(crowded,'hits')-T(12))<1e-9);
 for(const f of [late,early,crowded,fit([])])for(const mode of ['hits','reference']){
  const t=withinLimits(validateTiming(timingFrom(f,mode))),o=opening(f,mode);
  assert.equal(t.m1[0],12);assert.equal(t.v12,Math.round((T(102)-o+0.4)*30));   // the cuts sit on the song from its opening
 }
});

// The template path: picks carry the app's Resource ids; the song is matched like the clips (SELECTS-1452).
const templateSource=['async function readMediaPages','const VIDEO_SLOTS=','const INVENTORY=','async function inventory','function templateIssue','async function scriptResourceIds','const LONG_SLOTS','async function templateMedia']
 .map(start=>{const i=panelSource.indexOf(start);let j=panelSource.indexOf('\n}',i);if(start.startsWith('const '))j=panelSource.indexOf('\n',i)-1;return panelSource.slice(i,j+2);}).join('\n');
const {templateMedia}=vm.runInThisContext('(function(){'+templateSource+';return {templateMedia};})()');
function fakeTemplateSdk(){
 const files=[...VIDEO_SLOTS.map((s,i)=>({name:'v'+i+'.mp4',type:'Video'})),{name:'hero.jpg',type:'Image'},{name:'song.m4a',type:'Audio'}].map((f,i)=>({...f,app:'uuid-'+i,short:'r'+i}));
 const rows=files.map(f=>({resourceId:f.short,type:f.type,name:f.name,path:'/m/'+f.name,width:f.type==='Video'?1080:null,height:f.type==='Video'?1920:null,duration:4}));
 return {files,sdk:{call:async()=>files.map(f=>({resourceId:f.app,name:f.name,type:f.type})),
  runScript:async({script})=>({isError:false,result:await vm.runInNewContext('(async()=>{'+script+'})()',{selects:{project:()=>({resources:async()=>files.map(f=>({resourceId:f.short,name:f.name,type:f.type})),sourceFiles:async()=>({fileTree:rows.map(r=>({...r,frameSize:{width:r.width,height:r.height},durationSeconds:r.duration}))})})}})})}};
}
test('template run: the picked song is found by its app id, and a run without a song is refused',async()=>{
 const {files,sdk}=fakeTemplateSdk(),pick=f=>({kind:f.type.toLowerCase(),resourceId:f.app,name:f.name});
 const vids=files.filter(f=>f.type==='Video');
 const inputs={hero:[pick(files.find(f=>f.type==='Image'))],long:vids.slice(0,3).map(pick),clips:vids.slice(3).map(pick),song:[pick(files.find(f=>f.type==='Audio'))]};
 const got=await templateMedia(sdk,'p',inputs);
 assert.equal(got.song.name,'song.m4a');assert.equal(got.song.type,'Audio');assert.equal(got.song.path,'/m/song.m4a');
 await assert.rejects(templateMedia(sdk,'p',{...inputs,song:[]}),/Pick one song/);
});
