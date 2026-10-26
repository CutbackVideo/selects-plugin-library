'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
test('template close-up changes only automatic single-person framing',{skip:!process.env.SBS_PANEL_TEST_MODULES},()=>{
 const dep=createRequire(path.resolve(process.env.SBS_PANEL_TEST_MODULES,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {sourceCompositionAdapter,resolveSourceComposition};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const sources=[{resourceId:'v',meta:{frameSize:{width:1920,height:1080}}}];
 const catalog=[400,800,1200,1600].map((x,i)=>({id:'F'+i,resourceId:'v',draftFrame:0,box:{xmin:x-35,xmax:x+35,ymin:300,ymax:390}}));
 const L={windowTop:400,windowBottom:1400,splitPolicy:'frequent',widePolicy:'allow',allowedLayouts:['stacked','side-by-side','columns-3','grid-4']};
 const target=i=>({subjectId:'person'+i,refs:['F'+i]});
 function run(layout,closeUp){
  const count={'stacked':2,'side-by-side':2,'columns-3':3,'grid-4':4}[layout]||1;
  const panels=Array.from({length:count},(_,i)=>({camera:'v',targets:layout==='wide'||layout==='detail'?[]:layout==='two-shot'?[target(0),target(1)]:[target(i)],...(layout==='detail'?{region:{x:.1,y:.1,width:.5,height:.5}}:{})}));
  const settings={...L,...(closeUp===undefined?{}:{closeUp})};
  const p={version:1,status:'planned',shots:[{startFrame:0,endFrame:90,compositionId:'c',layout,panels}]};
  const a=m.exports.sourceCompositionAdapter(p,sources,90,settings,catalog);
  return m.exports.resolveSourceComposition(a.shots,catalog,sources,90,settings).shots;
 }
 const tight=run('speaker',2.2),wide=run('speaker',4);
 assert.ok(wide[0].regions[0].width>tight[0].regions[0].width);
 assert.deepEqual(wide[0].subjects,tight[0].subjects);
 assert.equal(wide[0].startFrame,tight[0].startFrame);assert.equal(wide[0].endFrame,tight[0].endFrame);
 assert.deepEqual(run('speaker'),tight);
 for(const invalid of [0,NaN,Infinity,-1,13])assert.deepEqual(run('speaker',invalid),tight);
 for(const layout of ['stacked','side-by-side','columns-3','grid-4','two-shot','wide','detail'])assert.deepEqual(run(layout,12),run(layout,2.2),layout+' must ignore single-person closeUp');
});
test('private packs carry reviewed close-up preferences',{skip:!require('./customer-fixtures.cjs').available() && 'See CUSTOMER_FIXTURES.md'},()=>{
 const values={'chosun-ilbo':{health:3.4,parenting:3.4,panilgi:3.35,heukbaek:2.2,jeongjwippul:2.2},'hankook-ilbo':{'issue-broadcast':2.7,'knowledge-exchange':6.2}};
 for(const [pack,templates] of Object.entries(values))for(const [name,value] of Object.entries(templates)){
  const j=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs',pack,'templates',name+'.json')));assert.equal(j.layout.closeUp,value);
 }
});
