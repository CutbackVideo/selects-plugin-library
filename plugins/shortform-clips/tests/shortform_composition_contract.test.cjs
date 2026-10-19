const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('common editorial contract preserves intent across source and multicam adapters',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {validateCompositionPlan,sourceCompositionAdapter,cameraCompositionAdapter,validateCompositionGeometry,compileTemplateCameraPlan,compileSourceCropPlan,measuredFaceShots,checkSourceCompositionGeometry};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const f=m.exports,L={windowTop:0,windowBottom:1920,widePolicy:'never',splitPolicy:'selective'};
 const plan={version:1,status:'planned',shots:[{startFrame:0,endFrame:90,compositionId:'A',layout:'speaker',panels:[{camera:'0',targets:[{subjectId:'A',refs:['F']}]}]}]};
 const source={resourceId:'0',meta:{frameSize:{width:1920,height:1080}}},face={id:'F',resourceId:'0',draftFrame:20,box:{xmin:800,xmax:1000,ymin:250,ymax:500}};
 const panel={videoIndex:0,resourceId:'0',startFrame:0,endFrame:90,sourceStartSeconds:0,playbackSpeed:{numerator:1,denominator:1},observation:{W:1920,H:1080}};
 const obs=[{unit:{startFrame:0,endFrame:90},available:[panel],options:[{id:'F',panel,x:900,y:375,w:200,h:250,headTop:250,headBottom:500}]}];
 await t.test('the same agent plan executes through both adapters without choosing another subject',()=>{
  const sourcePlan=f.sourceCompositionAdapter(plan,[source],90,L,[face]);assert.equal(sourcePlan.shots[0].subjects[0].faceId,'F');
  f.checkSourceCompositionGeometry(f.compileSourceCropPlan(f.measuredFaceShots(sourcePlan.shots,[face],[source],L),[source],90,L),L);
  const cam=f.cameraCompositionAdapter(plan,obs,L);assert.equal(cam.shots[0].primary,'F');assert.equal(cam.shots[0].style,'speaker');
  const rows=f.compileTemplateCameraPlan(plan,obs,L,30);assert.equal(rows[0].resourceId,'0');assert.equal(rows[0].compositionId,'A');
 });
 await t.test('time gaps, missing targets, unknown cameras and forbidden layouts fail before edits',()=>{
  for(const mutate of [p=>p.shots[0].startFrame=1,p=>p.shots[0].panels[0].targets=[],p=>p.shots[0].panels[0].camera='unknown',p=>p.shots[0].layout='wide']) {
   const p=structuredClone(plan);mutate(p);assert.throws(()=>f.validateCompositionPlan(p,90,L,['0'],['speaker','wide']),/composition:/);
  }
  assert.throws(()=>f.sourceCompositionAdapter({...plan,version:0},[source],90,L,[face]),/schema/);
 });
 await t.test('same composition cannot silently change subjects; same person cannot occupy both split panels',()=>{
  const p=structuredClone(plan);p.shots[0].endFrame=45;p.shots.push({...structuredClone(p.shots[0]),startFrame:45,endFrame:90});p.shots[1].panels[0].targets[0].subjectId='B';p.shots[1].panels[0].targets[0].refs=['different-ref'];
  assert.throws(()=>f.validateCompositionPlan(p,90,L,['0'],['speaker']),/continuity/);
  p.shots=[{...p.shots[0],endFrame:90,layout:'stacked',panels:[p.shots[0].panels[0],p.shots[0].panels[0]]}];
  assert.throws(()=>f.validateCompositionPlan(p,90,L,['0'],['stacked']),/same subject/);
 });
 await t.test('multicam never replaces an unavailable requested camera',()=>{
  const p={version:1,status:'planned',shots:[{startFrame:0,endFrame:90,compositionId:'wide',layout:'wide',panels:[{camera:'1',targets:[]}]}]};
  const observations=[{...obs[0],unit:{startFrame:0,endFrame:45},available:[panel,{...panel,videoIndex:1}]},{...obs[0],unit:{startFrame:45,endFrame:90},available:[panel]}];
  assert.throws(()=>f.compileTemplateCameraPlan(p,observations,{...L,widePolicy:'essential'},30),/No camera/);
 });
 await t.test('non-person detail needs no face and its selected area remains protected',()=>{
  const p=structuredClone(plan);Object.assign(p.shots[0],{layout:'detail',panels:[{camera:'0',targets:[],region:{x:.45,y:.3,width:.1,height:.2}}]});
  delete p.shots[0].panels[0].targets;
  const adapted=f.sourceCompositionAdapter(p,[source],90,L,[]),measured=f.measuredFaceShots(adapted.shots,[],[source],L);
  const rows=f.checkSourceCompositionGeometry(f.compileSourceCropPlan(measured,[source],90,L),L);assert.deepEqual(rows[0].regions[0].focus,p.shots[0].panels[0].region);
 });
 await t.test('geometry checks both target preservation and template occlusion, independently of face detection',()=>{
  const row={startFrame:0,endFrame:90,sourceWidth:100,sourceHeight:100,crop:{x:20,y:0,width:60,height:100},protectedRegions:[{x:30,y:20,width:10,height:20}],destination:{x:0,y:0,width:1080,height:1920}};
  f.validateCompositionGeometry([row],{});
  assert.throws(()=>f.validateCompositionGeometry([{...row,crop:{x:40,y:0,width:60,height:100}}],{}),/target/);
  assert.throws(()=>f.validateCompositionGeometry([row],{reservedAreas:[{x:0,y:0,width:1080,height:1000}]}),/occlusion/);
  assert.throws(()=>f.validateCompositionGeometry([{...row,crop:{x:-1,y:0,width:60,height:100}}],{}),/bounds/);
 });
 await t.test('returning to an explicit multicam composition reuses its crop after another shot',()=>{
  const observations=[0,30,60].map((start,i)=>({unit:{startFrame:start,endFrame:start+30},available:[panel],options:[{...obs[0].options[0],id:'F'+i,x:900+i*10}]}));
  const p={version:1,status:'planned',shots:observations.map((o,i)=>({startFrame:i*30,endFrame:(i+1)*30,compositionId:i===1?'reaction':'A',layout:'speaker',panels:[{camera:'0',targets:[{subjectId:'A',refs:[o.options[0].id]}]}]}))};
  const rows=f.compileTemplateCameraPlan(p,observations,L,30);assert.deepEqual(rows[0].crop,rows[2].crop);
 });
});
