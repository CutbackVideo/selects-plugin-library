const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('editorial choices drive shared person geometry',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {sourceCompositionAdapter,resolveSourceComposition,compileSourceCropPlan,checkSourceCompositionGeometry,compileTemplateCameraPlan};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const f=m.exports,source={resourceId:'0',meta:{frameSize:{width:1920,height:1080}}};
 const faces=[{id:'A',resourceId:'0',draftFrame:0,box:{xmin:300,xmax:500,ymin:280,ymax:520}},{id:'B',resourceId:'0',draftFrame:0,box:{xmin:1350,xmax:1550,ymin:250,ymax:490}}];
 const L={windowTop:570,windowBottom:1178,widePolicy:'never',splitPolicy:'selective'},target=id=>({subjectId:id,refs:[id]});
 const plan=(style='speaker')=>({version:1,status:'planned',shots:[{startFrame:0,endFrame:90,compositionId:'fixed',layout:style,panels:style==='stacked'?['A','B'].map(id=>({camera:'0',targets:[target(id)]})):[{camera:'0',targets:style==='two-shot'?['A','B'].map(target):[target('A')]}]}]});
 const run=(p,layout=L,catalog=faces)=>{const a=f.sourceCompositionAdapter(p,[source],90,layout,catalog),r=f.resolveSourceComposition(a.shots,catalog,[source],90,layout);assert.deepEqual(r.limitations,[]);return f.checkSourceCompositionGeometry(f.compileSourceCropPlan(r.shots,[source],90,layout),layout);};
 await t.test('agent zoom overrides remain ignored; template zoom controls single-person geometry',()=>{
  const expected=run(plan())[0].panels;
  for(const closeUp of [2,4.5,12]){const p=plan();p.shots[0].panels[0].closeUp=closeUp;assert.deepEqual(run(p,{...L,faceY:65})[0].panels,expected);}
 });
 await t.test('speaker excludes the distant neighbour while retaining measured head',()=>{
  const p=run(plan())[0].panels[0];assert.ok(p.cx+p.w/2<faces[1].box.xmin);assert.ok(p.cx-p.w/2<faces[0].box.xmin);
 });
 await t.test('together preserves both people and uses letterbox when portrait fill cannot fit',()=>{
  const result=run(plan('two-shot'),{...L,windowTop:0,windowBottom:1920})[0];
  assert.equal(result.style,'two-shot');assert.equal(result.panels.length,1);assert.equal(result.panels[0].fit,'region');
  assert.ok(result.panels[0].rect.x<=300);assert.ok(result.panels[0].rect.x+result.panels[0].rect.width>=1550);
 });
 await t.test('stacked preserves order with two separate face-protecting panels',()=>{
  const r=run(plan('stacked'))[0];assert.equal(r.panels.length,2);assert.ok(r.panels[0].cx<r.panels[1].cx);assert.equal(r.panels[0].slot,0);assert.equal(r.panels[1].slot,1);
 });
 await t.test('one composition is fixed across removed silence and changed reference boxes',()=>{
  const p=plan();p.shots[0].endFrame=45;p.shots.push({...structuredClone(p.shots[0]),startFrame:45,endFrame:90});p.shots[1].panels[0].targets[0].refs=['A2'];
  const rows=run(p,L,[...faces,{...faces[0],id:'A2',draftFrame:60,box:{xmin:330,xmax:530,ymin:300,ymax:540}}]);assert.deepEqual(rows[0].panels,rows[1].panels);
 });
 await t.test('invalid references and dimensions fail without a substitute subject',()=>{
  const p=plan();p.shots[0].panels[0].targets[0].refs=['missing'];assert.throws(()=>run(p),/reference/);
  assert.throws(()=>run(plan(),{...L,windowBottom:NaN}),/Invalid video window/);
 });
 await t.test('measured faces stay visible across source aspect ratios and window heights',()=>{
  for(const [W,H] of [[1920,1080],[3840,2160],[1080,1920],[1080,1080]])for(const windowH of [400,608,960,1920])for(const x of [.15,.5,.85]){
   const src={resourceId:'0',meta:{frameSize:{width:W,height:H}}},catalog=[{id:'A',resourceId:'0',draftFrame:0,box:{xmin:W*(x-.05),xmax:W*(x+.05),ymin:H*.2,ymax:H*.4}}],layout={...L,windowTop:0,windowBottom:windowH};
   const p=f.sourceCompositionAdapter(plan(),[src],90,layout,catalog),r=f.resolveSourceComposition(p.shots,catalog,[src],90,layout);
   assert.deepEqual(r.limitations,[]);f.checkSourceCompositionGeometry(f.compileSourceCropPlan(r.shots,[src],90,layout),layout);
  }
 });
 await t.test('multicam together uses the chosen camera even when it needs letterbox',()=>{
  const panel={videoIndex:0,resourceId:'0',startFrame:0,endFrame:90,sourceStartSeconds:0,playbackSpeed:{numerator:1,denominator:1},observation:{W:1920,H:1080}},options=faces.map(a=>({id:a.id,panel,x:(a.box.xmin+a.box.xmax)/2,y:(a.box.ymin+a.box.ymax)/2,w:200,h:240,headTop:a.box.ymin,headBottom:a.box.ymax}));
  const r=f.compileTemplateCameraPlan(plan('two-shot'),[{unit:{startFrame:0,endFrame:90},available:[panel],options}],{...L,windowTop:0,windowBottom:1920},30);
  assert.equal(r.length,1);assert.equal(r[0].style,'two-shot');assert.equal(r[0].videoIndex,0);assert.equal(r[0].crop.fit,'region');
 });
 await t.test('multicam preserves measured motion extrema rather than only the mean face box',()=>{
  const panel={videoIndex:0,resourceId:'0',startFrame:0,endFrame:90,sourceStartSeconds:0,playbackSpeed:{numerator:1,denominator:1},observation:{W:960,H:540}},options=[{id:'A',panel,x:300,y:250,w:75,h:102,headTop:20,headBottom:500}];
  const rows=f.compileTemplateCameraPlan(plan(),[{unit:{startFrame:0,endFrame:90},available:[panel],options}],{...L,windowTop:0,windowBottom:960},30),c=rows[0].crop;
  if(c.fit==='region'){assert.ok(c.rect.y<=20);assert.ok(c.rect.y+c.rect.height>=500);}else{const h=c.w*960/1080;assert.ok(c.cy-h*.4<=20+1e-6);assert.ok(c.cy+h*.6>=500-1e-6);}
 });

});
