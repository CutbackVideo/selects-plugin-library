'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
test('automatic groups preserve people and optional placement constraints',{skip:!process.env.SBS_PANEL_TEST_MODULES},async t=>{
 const dep=createRequire(path.resolve(process.env.SBS_PANEL_TEST_MODULES,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {sourceCompositionAdapter,measuredFaceShots,compileSourceCropPlan,checkSourceCompositionGeometry,compileTemplateCameraPlan};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const f=m.exports,L={windowTop:421,windowBottom:1228,allowedLayouts:['columns-3','grid-4'],splitPolicy:'frequent'},sources=[{resourceId:'v',meta:{frameSize:{width:1920,height:1080}}}];
 const faces=[220,400,960,1420,1600].map((x,i)=>({id:'F'+i,resourceId:'v',draftFrame:0,box:{xmin:x-40,xmax:x+40,ymin:300,ymax:380}}));
 const people=faces.map((v,i)=>({camera:'v',subjectId:String(i),refs:[v.id]}));
 const plan=(ps=people,layout='columns-3')=>({version:1,status:'planned',shots:[{startFrame:0,endFrame:90,compositionId:'whole',layout,people:ps}]});
 const run=p=>{const a=f.sourceCompositionAdapter(p,sources,90,L,faces);const c=f.checkSourceCompositionGeometry(f.compileSourceCropPlan(f.measuredFaceShots(a.shots,faces,sources,L),sources,90,L),L);return {a,c};};
 await t.test('five people form AB | C | DE and all faces remain inside crops',()=>{
  const {a,c}=run(plan());assert.deepEqual(a.shots[0].panels.map(p=>p.targets.map(t=>t.subjectId)),[['0','1'],['2'],['3','4']]);assert.equal(c[0].panels.length,3);
  const scales=c[0].panels.map(p=>1080*p.destination.width/p.w);assert.ok(Math.max(...scales)-Math.min(...scales)<1e-9,'continuous-camera panels must share magnification');
  assert.doesNotThrow(()=>f.sourceCompositionAdapter(a,sources,90,L,faces));
 });
 await t.test('uneven face heights retain one vertical source band across side-by-side cells',()=>{
  const uneven=faces.map((f,i)=>({...f,box:{...f.box,ymin:i===2?200:350,ymax:i===2?280:430}}));
  const a=f.sourceCompositionAdapter(plan(),sources,90,L,uneven);
  const c=f.checkSourceCompositionGeometry(f.compileSourceCropPlan(f.measuredFaceShots(a.shots,uneven,sources,L),sources,90,L),L)[0];
  const y=c.panels.map(p=>p.cy-p.w*807*p.destination.height/(1080*p.destination.width)*.4);
  assert.ok(Math.max(...y)-Math.min(...y)<1e-6,'shared source y preserves table height');
  const scales=c.panels.map(p=>1080*p.destination.width/p.w);
  assert.ok(Math.max(...scales)-Math.min(...scales)<1e-6);
 });
 await t.test('outer groups retain estimated shoulders, not only detected faces',()=>{
  const a=f.sourceCompositionAdapter(plan(),sources,90,L,faces);
  const regions=f.measuredFaceShots(a.shots,faces,sources,L)[0].regions;
  for(const [slot,ids] of [[0,1],[2],[3,4]].entries())for(const id of ids){
   const b=faces[id].box,r=regions[slot];
   assert.ok(r.x*1920<=b.xmin-104+1e-6);
   assert.ok((r.x+r.width)*1920>=b.xmax+104-1e-6);
   assert.ok((r.y+r.height)*1080>=Math.min(1080,b.ymax+80)-1e-6);
  }
 });
 await t.test('large vertical separation releases alignment without sacrificing shoulder room',()=>{
  const moved=faces.map((f,i)=>({...f,box:{...f.box,ymin:i===2?40:950,ymax:i===2?120:1030}}));
  const a=f.sourceCompositionAdapter(plan(),sources,90,L,moved);
  const regions=f.measuredFaceShots(a.shots,moved,sources,L)[0].regions;
  assert.ok(Math.abs(regions[0].y-regions[1].y)>1e-3,'must release the common source band');
  assert.ok(Math.abs(regions[0].width-regions[1].width)<1e-6,'keep common scale when feasible');
  for(const [slot,ids] of [[0,1],[2],[3,4]].entries())for(const id of ids){
   const b=moved[id].box,r=regions[slot];
   assert.ok(r.y*1080<=Math.max(0,b.ymin-64)+1e-6);
   assert.ok((r.y+r.height)*1080>=Math.min(1080,b.ymax+80)-1e-6);
  }
 });
 await t.test('motion envelopes keep shoulders safe across a reused composition',()=>{
  const moving=faces.map(f=>({...f,envelope:{...f.box,xmin:f.box.xmin-30,xmax:f.box.xmax+30}}));
  const a=f.sourceCompositionAdapter(plan(),sources,90,L,moving);
  const regions=f.measuredFaceShots(a.shots,moving,sources,L)[0].regions;
  for(const [slot,ids] of [[0,1],[2],[3,4]].entries())for(const id of ids){
   const b=moving[id].envelope,r=regions[slot];
   assert.ok(r.x*1920<=b.xmin-104+1e-6);
   assert.ok((r.x+r.width)*1920>=b.xmax+104-1e-6);
  }
 });
 await t.test('wider groups use padding to retain shoulders and common scale',()=>{
  const spread=faces.map((f,i)=>({...f,box:{...f.box,xmin:f.box.xmin+[-20,20,0,-20,20][i],xmax:f.box.xmax+[-20,20,0,-20,20][i]}}));
  const a=f.sourceCompositionAdapter(plan(),sources,90,L,spread);
  const measured=f.measuredFaceShots(a.shots,spread,sources,L);
  const c=f.checkSourceCompositionGeometry(f.compileSourceCropPlan(measured,sources,90,L),L)[0];
  assert.ok(measured[0].regions.some(r=>r.letterbox));
  const scales=measured[0].regions.map(r=>Math.min(360/(r.width*1920),807/(r.height*1080)));
  assert.ok(Math.max(...scales)-Math.min(...scales)<1e-6);
  for(const [slot,ids] of [[0,1],[2],[3,4]].entries())for(const id of ids){
   const b=spread[id].box,r=measured[0].regions[slot];
   assert.ok(r.x*1920<=b.xmin-104+1e-6);
   assert.ok((r.x+r.width)*1920>=b.xmax+104-1e-6);
  }
  assert.equal(c.panels.length,3);
 });
 await t.test('three people use A | B | C',()=>{const {a}=run(plan([people[0],people[2],people[4]]));assert.deepEqual(a.shots[0].panels.map(p=>p.targets.length),[1,1,1]);});
 await t.test('whole shot can become four panels without dropping any of five people',()=>{const {a,c}=run(plan(people,'grid-4'));assert.equal(c[0].panels.length,4);assert.equal(a.shots[0].panels.flatMap(p=>p.targets).length,5);});
 await t.test('partial placement overrides defaults and leaves the rest automatic',()=>{const {a}=run(plan(people.map((p,i)=>({...p,...(i===0?{slot:1}:{})}))));assert.ok(a.shots[0].panels[1].targets.some(t=>t.subjectId==='0'));assert.equal(new Set(a.shots[0].panels.flatMap(p=>p.targets.map(t=>t.subjectId))).size,5);});
 await t.test('fully specified grouping is respected even against source order',()=>{const {a}=run(plan(people.map((p,i)=>({...p,slot:[2,2,1,0,0][i]}))));assert.deepEqual(a.shots[0].panels.map(p=>p.targets.map(t=>t.subjectId)),[['3','4'],['2'],['0','1']]);});
 await t.test('same composition links all samples and does not repartition after a cut',()=>{const p=plan();p.shots[0].endFrame=45;p.shots.push({...p.shots[0],startFrame:45,endFrame:90,people:[...people].reverse()});const {a,c}=run(p);assert.deepEqual(a.shots[0].panels,a.shots[1].panels);assert.deepEqual(c[0].panels,c[1].panels);});
 await t.test('invalid or duplicate identities cannot fabricate extra participants',()=>{assert.throws(()=>run(plan([...people,people[0]])),/distinct/);assert.throws(()=>run(plan(people.map(p=>({...p,slot:9})))),/slot/);});
 await t.test('synchronized camera groups retain five people in three output panels',()=>{
  const panel={videoIndex:0,resourceId:'v',startFrame:0,endFrame:90,sourceStartSeconds:0,playbackSpeed:{numerator:1,denominator:1},observation:{W:1920,H:1080}};
  const obs=[{unit:{startFrame:0,endFrame:90},available:[panel],options:faces.map((q,i)=>({id:q.id,panel,x:(q.box.xmin+q.box.xmax)/2,y:340,w:80,h:80,headTop:260,headBottom:400}))}];
  const rows=f.compileTemplateCameraPlan(plan(people.map(p=>({...p,camera:'0'}))),obs,L,30);assert.equal(rows.length,3);for(const [i,ids] of [[0,1],[2],[3,4]].entries()){const p=rows[i].crop,h=p.w*807*rows[i].destination.height/(1080*rows[i].destination.width),r=p.fit==='region'?p.rect:{x:p.cx-p.w/2,y:p.cy-h*.4,width:p.w,height:h};for(const id of ids){const b=faces[id].box;assert.ok(r.x<=b.xmin&&r.x+r.width>=b.xmax&&r.y<=b.ymin&&r.y+r.height>=b.ymax);}}
 });
});
