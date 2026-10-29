const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('Baby Food wide shots fill both cells while preserving measured faces',{skip:!modules},()=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {editorialPersonRegions,compileSourceCropPlan,checkSourceCompositionGeometry};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const f=m.exports,d=require('./fixtures/baby-food-split.json');
 const shots=f.editorialPersonRegions(d.shots,d.catalog,d.sources,d.layout);
 f.checkSourceCompositionGeometry(f.compileSourceCropPlan(shots,d.sources,d.duration,d.layout),d.layout);
 for(const shot of shots.filter(s=>s.style==='side-by-side')){
  for(const [i,r] of shot.regions.entries()){
   assert.equal(r.letterbox,false);
   assert.ok(Math.abs(r.width*1920/(r.height*1080)-540/1106)<1e-9);
   assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=1+1e-9&&r.y+r.height<=1+1e-9);
   const ids=shot.panels[i].targets.flatMap(t=>t.refs);
   for(const face of d.catalog.filter(f=>ids.includes(f.id))){
    const b=face.envelope||face.box;
    assert.ok(r.x*1920<=b.xmin&& (r.x+r.width)*1920>=b.xmax);
    assert.ok(r.y*1080<=b.ymin&& (r.y+r.height)*1080>=b.ymax);
   }
  }
  assert.ok(Math.abs(shot.regions[0].width-shot.regions[1].width)<1e-9);
  assert.ok(Math.abs(shot.regions[0].y-shot.regions[1].y)<1e-9);
 }
});
