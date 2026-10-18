const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('multicam motion evidence and stable references',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {cameraFixedCropRange,cameraHeadroom,scopeCameraReferences,cameraIdentitySamples,stabilizeCameraCandidates,cameraMotionBursts,cameraDialogueTurns,cameraReviewFrames,compileTemplateCameraPlan};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const panel={videoIndex:0,resourceId:'r',startFrame:0,endFrame:300,sourceStartSeconds:0,playbackSpeed:{numerator:1,denominator:1},observation:{W:1920,H:1080}};
 const face=x=>({id:'local',panel,x,y:400,w:150,h:180,headTop:220,headBottom:540});
 const observations=[{unit:{startFrame:0,endFrame:100},available:[panel],options:[face(300),face(1000)]},{unit:{startFrame:100,endFrame:200},available:[panel],options:[face(1010)]},{unit:{startFrame:200,endFrame:300},available:[panel],options:[face(310),face(1005)]}];
 await t.test('fixed two-shot feasibility detects a pan that fits individually but not together',()=>{
  const box=x=>({xmin:x,xmax:x+100,ymin:300,ymax:500});
  const a=[box(400),box(650)],b=[box(800),box(1050)];
  const first=m.exports.cameraFixedCropRange(a,1920,1080,1920),next=m.exports.cameraFixedCropRange(b,1920,1080,1920);
  assert.ok(first&&next);
  assert.ok(Math.max(first.x[0],next.x[0])>Math.min(first.x[1],next.x[1]));
  assert.equal(m.exports.cameraHeadroom([...a,...b],1920,1080,1920).fit,'contain');
  const close=[box(410),box(660)],stable=m.exports.cameraFixedCropRange(close,1920,1080,1920);
  assert.ok(Math.max(first.x[0],stable.x[0])<=Math.min(first.x[1],stable.x[1]));
  assert.notEqual(m.exports.cameraHeadroom([...a,...close],1920,1080,1920).fit,'contain');
  assert.equal(m.exports.cameraFixedCropRange([],1920,1080,1920),null);
 });
 await t.test('a camera pan cannot reuse one positional reference as a persistent person',()=>{
  const first={unit:{startFrame:0,endFrame:100},available:[panel],options:[{...face(300),id:'0:0'}]};
  const next={unit:{startFrame:100,endFrame:200},available:[panel],options:[{...face(300),id:'0:0'}]};
  const scoped=m.exports.scopeCameraReferences([first,next]);
  assert.notEqual(scoped[0].options[0].id,scoped[1].options[0].id);
  assert.equal(first.options[0].id,'0:0');
  const shot={startFrame:0,endFrame:200,style:'speaker',primary:scoped[0].options[0].id,confidence:.8};
  assert.throws(()=>m.exports.compileTemplateCameraPlan({shots:[shot]},scoped,{windowTop:0,windowBottom:1920},30),/not observed/);
  const linked={shots:[shot],speakerMap:[{candidateIds:scoped.map(o=>o.options[0].id)}]};
  assert.equal(m.exports.compileTemplateCameraPlan(linked,scoped,{windowTop:0,windowBottom:1920},30).length,2);
 });
 await t.test('identity sheets cover candidates missed by dialogue samples without inventing identity',()=>{
  const obs=[['0:0'],['0:0','1:2','2:2'],['0:5','1:2','2:2'],['0:0']].map((ids,i)=>({unit:{startFrame:i*30,endFrame:(i+1)*30},options:ids.map(id=>({id}))}));
  const bursts=[{observation:obs[0]}],samples=m.exports.cameraIdentitySamples(obs,bursts);
  const covered=new Set([...bursts.map(b=>b.observation),...samples.map(s=>s.observation)].flatMap(o=>o.options.map(f=>f.id)));
  assert.deepEqual([...covered].sort(),['0:0','0:5','1:2','2:2']);assert.equal(samples.length,1);
  assert.ok(samples.every(s=>s.frame>=s.observation.unit.startFrame&&s.frame<s.observation.unit.endFrame));
  assert.deepEqual(m.exports.cameraIdentitySamples(obs,obs.map(observation=>({observation}))),[]);
  assert.deepEqual(m.exports.cameraIdentitySamples([],[]),[]);
 });
 await t.test('a disappearing neighbour does not renumber or move the remaining person',()=>{
  m.exports.stabilizeCameraCandidates(observations,30);
  assert.deepEqual(observations.map(o=>o.options.map(f=>f.id)),[['0:0','0:1'],['0:1'],['0:0','0:1']]);
  const rows=m.exports.compileTemplateCameraPlan({shots:[{startFrame:0,endFrame:300,style:'speaker',primary:'0:1',confidence:.8}]},observations,{windowTop:0,windowBottom:1920},30);
  assert.deepEqual(rows[0].crop,rows[1].crop);assert.deepEqual(rows[1].crop,rows[2].crop);
 });
 await t.test('ambiguous position matches do not assert identity',()=>{
  const input=[{unit:{startFrame:0,endFrame:30},options:[face(300),face(450)]},{unit:{startFrame:30,endFrame:60},options:[face(375)]}];
  m.exports.stabilizeCameraCandidates(input,30);assert.equal(input[1].options[0].id,'0:2');
 });
 await t.test('agent identity aliases retain a fixed crop without changing camera or duplicating people',()=>{
  const a={...face(1000),id:'0:0'},b={...face(1020),id:'0:4'};
  const obs=[{unit:{startFrame:0,endFrame:150},available:[panel],options:[a]},{unit:{startFrame:150,endFrame:300},available:[panel],options:[b]}];
  const plan={speakerMap:[{speakerId:1,candidateIds:['0:0','0:4']}],shots:[{startFrame:0,endFrame:300,style:'speaker',primary:'0:0',confidence:.8}]};
  const rows=m.exports.compileTemplateCameraPlan(plan,obs,{windowTop:0,windowBottom:1920},30);
  assert.equal(rows.length,2);assert.deepEqual(rows[0].crop,rows[1].crop);
  assert.ok(rows.every(r=>r.videoIndex===0));
  assert.throws(()=>m.exports.compileTemplateCameraPlan(plan,[{...obs[0],unit:{startFrame:0,endFrame:300},options:[a,b]}],{windowTop:0,windowBottom:1920},30),/simultaneous/);
  const foreign={...plan,speakerMap:[{candidateIds:['0:0','9:0']}]};
  assert.throws(()=>m.exports.compileTemplateCameraPlan(foreign,obs,{windowTop:0,windowBottom:1920},30),/unobserved/);
 });
 await t.test('bursts retain all speaker labels and never cross a turn or source placement seam',()=>{
  const words=[{startFrame:0,endFrame:75,text:'Opening',speakerId:7},{startFrame:75,endFrame:140,text:'Answer',speakerId:8},{startFrame:140,endFrame:200,text:'Again',speakerId:7},{startFrame:200,endFrame:299,text:'Third',speakerId:9}];
  const bursts=m.exports.cameraMotionBursts(observations,words,30);
  assert.ok(bursts.length<=8);assert.deepEqual([...new Set(bursts.map(b=>b.speakerId))].sort(),[7,8,9]);
  for(const b of bursts){assert.equal(new Set(b.frames).size,4);assert.ok(b.frames[0]>=Math.max(b.startFrame,b.observation.unit.startFrame));assert.ok(b.frames.at(-1)<Math.min(b.endFrame,b.observation.unit.endFrame));}
 });
 await t.test('preview follows editorial shots rather than every face-analysis fragment',()=>{
  const panels=Array.from({length:20},(_,i)=>({shotIndex:i<10?0:1,startFrame:i*10}));
  assert.deepEqual(m.exports.cameraReviewFrames(panels,200),[0,100,199]);
 });
});
