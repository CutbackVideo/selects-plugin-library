import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {holdFixture,jsonFiles,hash} from './gallery_hold_fixture.mjs';
const encodes=f=>f.calls.filter(call=>call.args.includes('-vf')).length;
const isIndex=file=>file.endsWith('.json')&&path.basename(path.dirname(file))==='index';
function replaceDuringRead(f,{continuous=false,stop=false}={}){
 let replacements=0;
 f.hooks.beforeRead=async file=>{
  if(isIndex(file)&&(continuous||!replacements)){
   replacements++;await f.local.files.writeFile(file,fs.readFileSync(file));
   if(stop)f.stop();
  }
 };
 return ()=>replacements;
}
for(const minify of [false,true])test('Gallery cache observation: concurrent complete index replacement during publication is observed without rewriting (minify='+minify+')',async t=>{
 const f=await holdFixture(t,{minify}),count=replaceDuringRead(f),result=await f.run();
 assert.equal(result.status,'converted');assert.equal(count(),1);assert.equal(encodes(f),1);
 const index=jsonFiles(f.data)[0];assert.equal(f.renames.filter(row=>row.to===index).length,2,'one publication plus the explicitly injected competing publication');
 assert.equal(path.basename(result.videos[0].outputPath,'.mp4'),hash(result.videos[0].outputPath));
});
for(const minify of [false,true])test('Gallery cache observation: replacement during cache lookup does not start another encode (minify='+minify+')',async t=>{
 const f=await holdFixture(t,{minify});await f.run();const count=replaceDuringRead(f),result=await f.run();
 assert.equal(count(),1);assert.equal(result.videos[0].cacheHit,true);assert.equal(encodes(f),1);
});
for(const minify of [false,true])test('Gallery cache observation: continuously changing index stays unknown after a bounded read budget (minify='+minify+')',async t=>{
 const f=await holdFixture(t,{minify});await f.run();const count=replaceDuringRead(f,{continuous:true});
 await assert.rejects(f.run(),error=>error.publicMessage?.includes('index could not be confirmed'));
 assert.equal(count(),3,'bounded independent observations, not write or encode retries');assert.equal(encodes(f),1);
 const index=jsonFiles(f.data)[0];assert.equal(f.renames.filter(row=>row.to===index).length,4,'one original publication and three injected competing replacements only');
});
for(const minify of [false,true])test('Gallery cache observation: cancellation during a replacement stops before another observation or encode (minify='+minify+')',async t=>{
 const f=await holdFixture(t,{minify});await f.run();const count=replaceDuringRead(f,{stop:true});
 await assert.rejects(f.run());assert.equal(count(),1);assert.equal(encodes(f),1);
});
