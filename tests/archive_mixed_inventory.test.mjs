import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {archiveMusicFixture} from './archive_music_fixture.mjs';

const inventorySource=fs.readFileSync(new URL('../plugins/archive-vlog/scripts/inventory.js',import.meta.url),'utf8');
const footage=[{resourceId:'original-0',kind:'video'},{resourceId:'original-1',kind:'video'},{resourceId:'original-photo',kind:'image'}];
async function mixed(t,{missing=false,noPath=false,relink=false}={}){
 const f=await archiveMusicFixture(t),photo=path.join(f.root,'original-photo.png');
 // Content-identity placeholder: native dimensions/alias/planning are fixture
 // inputs. This regression does not decode an image or save a real mixed Draft.
 if(!missing)fs.writeFileSync(photo,Buffer.from('owned photo source observation fixture'));
 let treeReads=0;
 f.project.resources=async()=>[
  ...f.inventory.resources.map(row=>({resourceId:row.rid,type:'Video',durationSeconds:row.duration,hasAnalysis:true})),
  {resourceId:'p0',type:'Image',name:'Portrait'},...f.resources,
 ];
 f.project.sourceFiles=async()=>{treeReads++;return {fileTree:[
  ...f.inventory.resources.map(row=>({type:'video',resourceId:row.rid,path:row.path,frameSize:{width:1920,height:1080}})),
  {type:'image',resourceId:'p0',...noPath?{}:{path:relink&&treeReads>2?f.other:photo},frameSize:{width:96,height:160}},...f.nodes,
 ]};};
 const load=f.box.loadAssets;
 f.box.loadAssets=async root=>{const assets=await load(root);assets.scripts.inventoryJs=inventorySource;return assets;};
 f.plan.picks.push({rid:'p0',kind:'photo'});f.plan.schedule.cuts.push(3);
 const ordinary=f.box.sdk.runScript;
 f.box.sdk.runScript=async input=>{
  if(input.summary==='Find the chosen files'){
   f.scripts.push(input);
   return {result:{resolved:footage.map((row,index)=>({rid:row.resourceId,alias:index===2?'p0':'r'+index,kind:row.kind,size:index===2?{width:96,height:160}:null})),failed:[]}};
  }
  if(input.summary==='Read footage'){
   f.scripts.push(input);
   return {result:await new Function('selects','return (async()=>{'+input.script+'})();')({project:()=>f.project})};
  }
  return ordinary(input);
 };
 const run=()=>f.box.api.runArchiveVlogTemplate(f.box.sdk,{projectId:'p',template:{runId:'mixed-originals',inputs:{footage},options:{}}},()=>{},()=>{});
 return {...f,photo,run};
}

test('Archive hidden entry carries the actual shipped photo inventory path into source checks and frozen assembly',async t=>{
 const f=await mixed(t);
 await assert.rejects(f.run(),error=>error.boundary===true);
 const config=f.saved.at(-1);
 assert.ok(config);assert.equal(config.sourceBindings.find(row=>row.resourceId==='p0').path,f.photo);
 assert.equal(config.analysisSources.find(row=>row.path===f.photo).sha256,f.digest(fs.readFileSync(f.photo)));
 assert.deepEqual(JSON.parse(JSON.stringify(config.crops.p0)),{width:96,height:160});
 assert.equal(f.scripts.filter(row=>row.summary==='Read footage').length,2,'actual projected catalog is reobserved');
});

for(const mode of ['missing','noPath','relink'])test('Archive mixed inventory: '+mode+' photo stops before search, Audio adoption or assembly',async t=>{
 const f=await mixed(t,{[mode]:true});
 await assert.rejects(f.run(),error=>mode==='missing'?error.code==='source-file-missing':mode==='noPath'?error.message==='The selected source bindings are invalid.':/original has moved or changed its Project source link/.test(error.message));
 assert.equal(f.scripts.some(row=>row.summary==='Search shots'),false);
 assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);
});

test('Archive mixed original is required again when recovering the same frozen assembly; restoring bytes resumes verification',async t=>{
 const f=await mixed(t);await assert.rejects(f.run(),error=>error.boundary===true);
 const pending=f.box.assemblyPendingRef.current.p,original=fs.readFileSync(f.photo),saved=f.saved.length,imports=f.imports.length;
 const recovery=f.box.archiveRecoveryOptions(f.box.sdk,pending,()=>{});
 // Saved observation/semantic admission is a controlled boundary here. This
 // inventory-path test neither creates a real mixed Draft nor parses its JSON.
 const assembly={sequenceId:'saved-mixed',totalFrames:90,fps:30};let verifications=0,sourceReads=0;
 f.box.readTemplateDraftSources=async()=>{sourceReads++;return {owner:{projectId:'p',libraryId:'fixture'},revision:'unchanged-saved-mixed',clips:[]};};
 const ordinary=f.box.sdk.runScript;
 f.box.sdk.runScript=async input=>{
  if(input.summary==='Verify original Archive assembly plan'){verifications++;return {result:{verified:true,draftId:assembly.sequenceId,mainEnd:90,fps:30}};}
  return ordinary(input);
 };
 fs.writeFileSync(f.photo,Buffer.from('changed photo contents'));
 await assert.rejects(recovery.verifyAssembly(pending,assembly),error=>error.code==='source-file-changed');assert.equal(verifications,0);
 fs.writeFileSync(f.photo,original);
 await recovery.verifyAssembly(pending,assembly);assert.equal(verifications,1);assert.equal(sourceReads,2,'actual caller brackets the controlled saved read');
 assert.equal(f.saved.length,saved);assert.equal(f.imports.length,imports);
 assert.equal(pending.config.sourceBindings.find(row=>row.resourceId==='p0').path,f.photo);
});
