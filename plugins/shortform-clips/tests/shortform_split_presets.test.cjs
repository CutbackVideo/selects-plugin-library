'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('split presets preserve geometry, identity and manual edits',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const exports=['compositionRects','sourceCompositionAdapter','compileSourceCropPlan','measuredFaceShots','checkSourceCompositionGeometry','compileTemplateCameraPlan','mergeLockedSourceShots','mergeLockedCameraRows','applyManualCrop','framingMediaKey','retainLockedSourceContext','retainLockedCameraContext','STACKED_REFRAME_EFFECT','CompositionEditor','editCompositionShot'];
 new Function('require','module','exports',esbuild.transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {'+exports.join(',')+'};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const f=m.exports,styles=['stacked','side-by-side','top-main-3','left-main-3','grid-4'],L={windowTop:200,windowBottom:1700,splitPolicy:'selective',allowedLayouts:styles};
 const sources=[{resourceId:'0',meta:{frameSize:{width:1920,height:1080}}}];
 const faces=Array.from({length:4},(_,i)=>({id:'F'+i,resourceId:'0',draftFrame:10,box:{xmin:350+(i%2)*960,xmax:410+(i%2)*960,ymin:120+Math.floor(i/2)*540,ymax:180+Math.floor(i/2)*540}}));
 const plan=style=>({version:1,status:'planned',shots:[{startFrame:0,endFrame:90,compositionId:style,layout:style,panels:f.compositionRects(style).map((_,i)=>({camera:'0',targets:[{subjectId:'person'+i,refs:['F'+i]}],sourcePane:{x:(i%2)*.5,y:Math.floor(i/2)*.5,width:.5,height:.5}}))}]});
 for(const style of styles)await t.test(style+' fills the video window and keeps crops inside 2×2 source panes',()=>{
  const rects=f.compositionRects(style);assert.equal(rects.reduce((a,r)=>a+r.width*r.height,0),1);
  for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++){const p=rects[a],q=rects[b];assert.ok(p.x+p.width<=q.x||q.x+q.width<=p.x||p.y+p.height<=q.y||q.y+q.height<=p.y);}
  const adapted=f.sourceCompositionAdapter(plan(style),sources,90,L,faces),measured=f.measuredFaceShots(adapted.shots,faces,sources,L);
  const result=f.checkSourceCompositionGeometry(f.compileSourceCropPlan(measured,sources,90,L),L);
  assert.equal(result[0].panels.length,rects.length);assert.deepEqual(result[0].panels.map(p=>p.destination),rects);
 });
 const panels=faces.map((_,i)=>({videoIndex:i,resourceId:'camera'+i,startFrame:0,endFrame:90,sourceStartSeconds:2,playbackSpeed:{numerator:1,denominator:1},observation:{W:1920,H:1080}}));
 const obs=[{unit:{startFrame:0,endFrame:90},available:panels,options:panels.map((panel,i)=>({id:'C'+i,panel,x:960,y:300,w:60,h:60,headTop:260,headBottom:340}))}];
 for(const style of styles)await t.test(style+' uses every chosen synchronized camera in order',()=>{
  const p=plan(style);p.shots[0].panels.forEach((x,i)=>{x.camera=String(i);x.targets[0].refs=['C'+i];delete x.sourcePane;});
  const rows=f.compileTemplateCameraPlan(p,obs,L,30);assert.equal(rows.length,f.compositionRects(style).length);assert.deepEqual(rows.map(r=>r.resourceId),panels.slice(0,rows.length).map(p=>p.resourceId));assert.ok(rows.every(r=>r.sourceStartSeconds===2));
  const unavailable=structuredClone(obs);unavailable[0].options.pop();if(style==='grid-4')assert.throws(()=>f.compileTemplateCameraPlan(p,unavailable,L,30),/reference|cover/);
 });
 await t.test('new measured geometry preserves every split choice with letterboxing when heads cannot fill the cells',()=>{
  const broad=faces.map((face,i)=>({...face,box:{xmin:150+i%2*960,xmax:810+i%2*960,ymin:180+Math.floor(i/2)*540,ymax:260+Math.floor(i/2)*540}}));
  for(const style of styles){
   const adapted=f.sourceCompositionAdapter(plan(style),sources,90,L,broad),measured=f.measuredFaceShots(adapted.shots,broad,sources,L);
   const result=f.checkSourceCompositionGeometry(f.compileSourceCropPlan(measured,sources,90,L),L)[0];
   assert.equal(result.style,style);assert.equal(result.panels.length,f.compositionRects(style).length);
   assert.ok(result.panels.some(p=>p.fit==='region'),style);
   for(const [i,p] of result.panels.entries())if(p.fit==='region'){
    assert.deepEqual(p.destination,f.compositionRects(style)[i]);assert.ok(p.rect.y>=Math.floor(i/2)*540-1e-6);assert.ok(p.rect.y+p.rect.height<=(Math.floor(i/2)+1)*540+1e-6);
   }
  }
 });
 await t.test('legacy templates permit only stacked; fixed requests never silently substitute',()=>{
  assert.throws(()=>f.sourceCompositionAdapter(plan('grid-4'),sources,90,{...L,allowedLayouts:undefined},faces),/forbids/);
  assert.throws(()=>f.sourceCompositionAdapter(plan('stacked'),sources,90,{...L,fixedLayout:'grid-4'},faces),/fixed/);
  const p=plan('grid-4');p.shots[0].panels[3].targets=p.shots[0].panels[0].targets;assert.throws(()=>f.sourceCompositionAdapter(p,sources,90,L,faces),/same subject/);
 });
 await t.test('locked intervals survive changed AI boundaries and preserve source clock on retimed cameras',()=>{
  const next=[{startFrame:0,endFrame:40},{startFrame:40,endFrame:90}],locked={startFrame:20,endFrame:60,locked:true,style:'grid-4'};
  const merged=f.mergeLockedSourceShots(next,[locked]);assert.deepEqual(merged.map(s=>[s.startFrame,s.endFrame]),[[0,20],[20,40],[40,60],[60,90]]);assert.ok(merged.slice(1,3).every(s=>s.locked&&s.style==='grid-4'));
  const rows=f.mergeLockedCameraRows(next.map(s=>({...s,sourceStartSeconds:s.startFrame/30,playbackSpeed:{numerator:1,denominator:1}})),[{...locked,sourceStartSeconds:5,playbackSpeed:{numerator:2,denominator:1}}],30);assert.equal(rows[2].sourceStartSeconds,5+20/30*2);
 });
 await t.test('locked multicam references retain their own observations after a new analysis',()=>{
  const p=plan('stacked');p.shots[0].locked=true;p.shots[0].panels.forEach((x,i)=>{x.camera=String(i);x.targets[0].refs=['C'+i];delete x.sourcePane;});
  const retained=f.retainLockedCameraContext({plan:p,observations:obs},obs,p);
  assert.equal(retained.observations.length,1);assert.notEqual(retained.plan.shots[0].panels[0].targets[0].refs[0],'C0');
  assert.equal(f.compileTemplateCameraPlan(retained.plan,retained.observations,L,30).length,2);
 });
 await t.test('manual crop maintains destination aspect and rejects source/pane escapes',()=>{
  const p={cx:960,cy:500,w:200,destination:{width:.5,height:1}};
  const adjusted=f.applyManualCrop(p,{dx:.01,dy:.01,zoom:1.2},1920,1080,1500);assert.equal(adjusted.w,200/1.2);assert.equal(adjusted.cx,979.2);
  assert.throws(()=>f.applyManualCrop(p,{dx:2},1920,1080,1500),/Invalid/);
  assert.throws(()=>f.applyManualCrop({...p,w:1800},{zoom:.5},1920,1080,1500),/leaves/);
  const p4=plan('grid-4');p4.shots[0].panels[0].adjustment={dx:.25};const a=f.sourceCompositionAdapter(p4,sources,90,L,faces);assert.throws(()=>f.checkSourceCompositionGeometry(f.compileSourceCropPlan(f.measuredFaceShots(a.shots,faces,sources,L),sources,90,L),L),/pane|source|target/);
 });
 await t.test('letterboxed manual crops change the selected region and remain bounded',()=>{
  const p={fit:'region',rect:{x:300,y:100,width:600,height:700},destination:{x:.5,y:0,width:.5,height:1}};
  const changed=f.applyManualCrop(p,{dx:.01,zoom:1.1},1920,1080,1500);
  assert.equal(changed.fit,'region');assert.equal(changed.rect.width,600/1.1);assert.notDeepEqual(changed.rect,p.rect);
  assert.throws(()=>f.applyManualCrop(p,{dy:-.25},1920,1080,1500),/source/);
 });
 await t.test('source fingerprint tolerates framing cuts but detects changed footage',()=>{
  const c={trackKind:'main',resourceId:'v',startFrame:0,endFrame:90,sourceStartSeconds:1,sourceEndSeconds:4,playbackSpeed:1};
  const key=f.framingMediaKey({clips:[c]});assert.equal(key,f.framingMediaKey({clips:[{...c,endFrame:30,sourceEndSeconds:2},{...c,startFrame:30,sourceStartSeconds:2}]}));assert.notEqual(key,f.framingMediaKey({clips:[{...c,resourceId:'other'}]}));
 });
 await t.test('saved identities do not collide with freshly measured IDs and new slots remain empty',()=>{
  const p=plan('stacked');p.shots[0].locked=true;const retained=f.retainLockedSourceContext({plan:p,catalog:faces},faces,plan('grid-4'));
  assert.equal(new Set(retained.catalog.map(f=>f.id)).size,8);assert.notEqual(retained.plan.shots[0].panels[0].targets[0].refs[0],'F0');
  const edited=f.editCompositionShot(p.shots[0],'grid-4');assert.equal(edited.panels.length,4);assert.deepEqual(edited.panels[2].targets,[]);
 });
});
