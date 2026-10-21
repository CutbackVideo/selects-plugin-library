'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),{createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;
test('original still alpha observations',{skip:!modulesRoot&&'Set SBS_PANEL_TEST_MODULES'},async t=>{
 const dep=createRequire(path.resolve(modulesRoot,'../package.json')),esbuild=dep('esbuild'),source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),m={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {sceneEvidenceArgs,sceneImageBounds,createSceneMediaTools};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);const api=m.exports;
 const tile={resourceId:'image',path:'/image.png',kind:'original-image',width:64,height:48,size:123,mtimeMs:456};
 const header='[showinfo@sceneSize0 @ a] n:0 pts:0 s:64x48\n';
 await t.test('bounds are exclusive, retain source identity, and fail open as explicitly unavailable',()=>{
  const log=header+'[bbox@sceneBounds0 @ b] n:0 pts:0 pts_time:0 x1:9 x2:20 y1:7 y2:22 w:12 h:16\n';
  const b=api.sceneImageBounds([tile],log,false)[0];assert.deepEqual(b.visibleBounds,[9,7,21,23]);assert.equal(b.resourceId,tile.resourceId);assert.equal(b.path,tile.path);assert.equal(b.size,123);assert.equal(b.mtimeMs,456);
  for(const [tiles,text,truncated] of [[[tile],log,true],[[{...tile,width:65}],log,false],[[tile],header+'bad',false],[[tile],log.replace('w:12','w:13'),false]]){const row=api.sceneImageBounds(tiles,text,truncated)[0];assert.equal(row.status,'unavailable');assert.equal(row.visibleBounds,undefined);assert.ok(row.reason);}
  const empty=api.sceneImageBounds([tile],header+'[bbox@sceneBounds0 @ b] n:0 pts:0 pts_time:0\n',false)[0];assert.equal(empty.status,'empty');assert.equal(empty.visibleBounds,undefined);
 });
 await t.test('real single-frame sheet observes opaque, empty and off-centre alpha without source mutation',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scene-alpha-bounds-'));try{
   const cases=[{name:'opaque',filter:'color=red:s=64x48',expected:[0,0,64,48]},{name:'empty',filter:'color=black@0:s=64x48,format=rgba',expected:null},{name:'offset',filter:'color=black@0:s=64x48,format=rgba,drawbox=x=9:y=7:w=12:h=16:color=red@1:replace=1:t=fill',expected:[9,7,21,23]}];
   for(const c of cases){const file=path.join(dir,c.name+'.png');cp.execFileSync('ffmpeg',['-v','error','-f','lavfi','-i',c.filter,'-frames:v','1','-threads','1',file]);const original=fs.readFileSync(file),st=fs.statSync(file),tiles=[{...tile,path:file,size:st.size,mtimeMs:st.mtimeMs}];const r=cp.spawnSync('ffmpeg',api.sceneEvidenceArgs(tiles,path.join(dir,c.name+'.jpg')),{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const got=api.sceneImageBounds(tiles,r.stderr,false)[0];assert.equal(got.status,c.expected?'visible':'empty');assert.deepEqual(got.visibleBounds,c.expected||undefined);assert.deepEqual(fs.readFileSync(file),original);}
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 await t.test('existing transform centres observed subject at rotation zero and ninety without new geometry',async()=>{
  const p={sourceFiles:async()=>({fileTree:[{resourceId:'r',path:'/r.png',frameSize:{width:100,height:100}}]}),resources:async()=>[{resourceId:'r',type:'Image'}]},d={meta:async()=>({frameSize:{width:1080,height:1920},fps:30})};
  const media=await api.createSceneMediaTools({},p,d,[{resourceId:'r',path:'/r.png',visibleBounds:[10,20,30,60]}]);const item=media.asset('r');
  for(const rotation of [0,90]){const result=media.transform(item,{x:540,y:960,width:200,height:400,rotation});assert.equal(result.supported,true);const angle=rotation*Math.PI/180,fit=10,dx=(20-50)*fit,dy=(40-50)*fit;const imageX=540+result.position.x*19.2,imageY=960-result.position.y*19.2;assert.ok(Math.abs(imageX+dx*Math.cos(angle)+dy*Math.sin(angle)-540)<1e-7);assert.ok(Math.abs(imageY-dx*Math.sin(angle)+dy*Math.cos(angle)-960)<1e-7);}
 });
});
