'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const {pathToFileURL,fileURLToPath}=require('node:url');
const SOURCE=path.resolve(__dirname,'../native-matte.js');
const load=async()=>import('data:text/javascript;base64,'+Buffer.from(await fs.readFile(SOURCE,'utf8')).toString('base64'));
const ffmpeg=process.env.FFMPEG||'ffmpeg';
function ff(args){const p=spawnSync(ffmpeg,['-v','error','-nostdin',...args],{encoding:null});assert.equal(p.status,0,p.stderr?.toString());return p.stdout;}
async function environment(folder,matte,{lostAck=false}={}){
 const stored=new Map(),jobs=new Map(),scripts=[],calls=[],writes=[];let next=0;
 const source=path.join(folder,matte.sourceKind==='image'?'source.png':'source.mov');let packed;
 const project={sourceFiles:async()=>({fileTree:[{type:'file',resourceId:'source',path:source},...(packed?[{type:'file',resourceId:'packed',path:packed}]:[])]}),importFiles:async({paths})=>{packed=paths[0];}};
 const selects={project:()=>project,ai:{job:()=>({result:async()=>({files:{manifest:{}}})}),prepareMatte:async()=>matte},files:{
  pathFromLocalUrl:async url=>fileURLToPath(url),exists:async p=>!!await fs.stat(p).catch(()=>null),rename:fs.rename,
  writeChunk:async({path:p,offset,base64})=>{const b=Buffer.from(base64,'base64');writes.push(b);await fs.writeFile(p,b,{flag:offset?'a':'w'});return {bytesWritten:b.length};},
 },media:{startFFmpeg:async({args})=>{calls.push(args);const jobId='encode-'+next++;if(lostAck)throw Error('ack lost');const p=spawnSync(ffmpeg,args,{encoding:'utf8'});jobs.set(jobId,{state:p.status===0?'succeeded':'failed',error:p.stderr});return{jobId};},job:id=>({status:async()=>jobs.get(id),cancel:async()=>{jobs.set(id,{state:'cancelled'});}})}};
 const run=async script=>{scripts.push(script);return new Function('selects','return(async()=>{'+script+'})()')(selects);};
 const storage={getItem:async k=>stored.get(k)||null,setItem:async(k,v)=>{stored.set(k,v);}};
 return{run,storage,stored,scripts,calls,writes};
}
test('packed image retains RGB and grayscale mask; retry reuses verified media',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'wgsl-matte-'));try{
 const source=path.join(dir,'source.png'),mask=path.join(dir,'mask.png');ff(['-f','lavfi','-i','color=red:s=16x8','-frames:v','1',source]);ff(['-f','lavfi','-i','color=white:s=16x8','-frames:v','1',mask]);
 const matte={sourceKind:'image',sourceResourceId:'source',frameSize:{width:16,height:8},maskUrl:pathToFileURL(mask).href,alphaEncoding:'grayscale-png-8bit'};
 const e=await environment(dir,matte),{preparePackedMatte}=await load();const result=await preparePackedMatte(e.run,e.storage,'wf','project',true,()=>true);
 assert.equal(result.packedResourceId,'packed');assert.equal(e.calls.length,2);
 const pixels=ff(['-i',result.path,'-f','rawvideo','-pix_fmt','rgba','-']);assert.equal(pixels.length,32*8*4);
 assert.ok(pixels[0]>240&&pixels[1]<10&&pixels[2]<10);assert.ok(pixels[16*4]>240&&pixels[16*4+1]>240);
 await preparePackedMatte(e.run,e.storage,'wf','project',true,()=>true);assert.equal(e.calls.length,2,'No duplicate encoder on a retry');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('packed video pairs each original frame with its source-time mask, including the last frame',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'wgsl-matte-'));try{
 ff(['-f','lavfi','-i','color=red:s=16x8:r=24000/1001','-frames:v','3','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le',path.join(dir,'source.mov')]);
 const frames=[];for(let i=0;i<3;i++){const mask=path.join(dir,'mask'+i+'.png');ff(['-f','lavfi','-i','color='+['black','gray','white'][i]+':s=16x8','-frames:v','1',mask]);frames.push({sourceTimeSeconds:i*1001/24000,url:pathToFileURL(mask).href});}
 const matte={sourceResourceId:'source',sourceRange:{startSeconds:0,endSeconds:3*1001/24000},frameSize:{width:16,height:8},alphaEncoding:'grayscale-png-8bit',frames};
 const e=await environment(dir,matte),{preparePackedMatte}=await load();const result=await preparePackedMatte(e.run,e.storage,'wf','project',false,()=>true);
 const pixels=ff(['-i',result.path,'-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgba','-']);assert.equal(pixels.length,32*8*4*3);
 const values=[0,1,2].map(i=>pixels[i*32*8*4+16*4]);assert.ok(values[0]<5&&values[1]>110&&values[1]<140&&values[2]>245,JSON.stringify(values));
 const list=Buffer.concat(e.writes).toString();assert.match(list,/option framerate 1000000/);assert.ok(!e.scripts.some(s=>s.includes('createDraft')));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('a lost encoding acknowledgment stays recoverable without dispatching again',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'wgsl-matte-'));try{
 const matte={sourceKind:'image',sourceResourceId:'source',frameSize:{width:16,height:8},maskUrl:pathToFileURL(path.join(dir,'mask.png')).href,alphaEncoding:'grayscale-png-8bit'};
 const e=await environment(dir,matte,{lostAck:true}),{preparePackedMatte}=await load();
 await assert.rejects(preparePackedMatte(e.run,e.storage,'wf','project',true,()=>true),/ack lost/);
 await assert.rejects(preparePackedMatte(e.run,e.storage,'wf','project',true,()=>true),/acknowledgment is unknown/);assert.equal(e.calls.length,1);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
