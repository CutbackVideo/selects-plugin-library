const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('wide protected subjects share an aligned three-column band without clipping',{skip:!modules},()=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {editorialPersonRegions,compileSourceCropPlan,checkSourceCompositionGeometry};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const f=m.exports;
 for(const factor of [1,2])for(const height of [608,807,1200,1920]){
  const W=1920*factor,H=1080*factor,source={resourceId:'source',meta:{frameSize:{width:W,height:H}}};
  const catalog=[[0,160,180,460],[880,1200,160,500],[1570,1840,130,470]].map(([xmin,xmax,ymin,ymax],i)=>({id:String(i),resourceId:'source',draftFrame:0,box:{xmin:xmin*factor,xmax:xmax*factor,ymin:ymin*factor,ymax:ymax*factor}}));
  const shot={startFrame:0,endFrame:90,resourceId:'source',style:'columns-3',compositionId:'stable',autoFrame:true,subjects:catalog.map(f=>({faceId:f.id})),subjectGroups:catalog.map(f=>[{faceId:f.id}])};
  const layout={...(height===1920?{}:{windowTop:300,windowBottom:300+height}),allowedLayouts:['columns-3']};
  const measured=f.editorialPersonRegions([shot],catalog,[source],layout),compiled=f.checkSourceCompositionGeometry(f.compileSourceCropPlan(measured,[source],90,layout),layout)[0];
  const panels=compiled.panels;assert.ok(panels.every(p=>p.destination));
  const scale=panels[0].destination.width*1080/panels[0].rect.width;
  for(const [i,p] of panels.entries()){
   assert.ok(Math.abs(p.destination.y-panels[0].destination.y)<1e-9);
   assert.ok(Math.abs(p.destination.height-panels[0].destination.height)<1e-9);
   assert.ok(Math.abs(p.rect.y-panels[0].rect.y)<1e-6);
   assert.ok(Math.abs(p.destination.width*1080/p.rect.width-scale)<1e-9);
   assert.ok(Math.abs(p.destination.height*height/p.rect.height-scale)<1e-9);
   if(i)assert.ok(Math.abs(p.destination.x-(panels[i-1].destination.x+panels[i-1].destination.width))<1e-9);
  }
  assert.ok(panels[0].rect.x<=catalog[0].box.xmin); // source-edge face remains visible
 }
});
