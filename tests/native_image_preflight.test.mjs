import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {checkScriptTypes} from './run_script_types.mjs';
import test from 'node:test';
import {loadPanelFunctions} from './windows_host.mjs';
import {loadPanelOperation} from './panel_operation.mjs';

const plugins=['no14-still-video','camera-shutter-dump','four-photo-stop-motion','polaroid-photo-dump'];
const paths={darwin:'/photos/Family trip/\uc0ac\uc9c4 \'A\'.png',win32:'C:\\Users\\Mano\\\uc0ac\uc9c4 \'A\'.png',unc:'\\\\studio\\share\\\uc0ac\uc9c4 A.png'};
function fixture(plugin,{platform='darwin',fault=null,folderSummary=false,assetsReady=false,frameMissing=false}={}) {
  const source=fs.readFileSync(new URL(`../plugins/${plugin}/panel.tsx`,import.meta.url),'utf8');
  const count=plugin==='camera-shutter-dump'?12:plugin==='polaroid-photo-dump'?17:4;
  const photos=Array.from({length:count},(_,i)=>({resourceId:'r'+i,name:`Photo ${i}.png`,path:i?paths[platform]+i:paths[platform]}));
  const rows=photos.map(p=>({...p,type:'Image',frameSize:{width:640,height:960}}));
  const fileCalls=[],writes=[],creates=[],scripts=[];
  const files={
    stat:async path=>{fileCalls.push(['stat',path]);if(frameMissing&&path==='/data/frame.png')return null;if(path===photos[0].path){
      if(fault==='missing')return null;
      if(fault==='unknown')throw Error('transport unavailable');
      if(fault==='directory')return {size:32,isDirectory:true,mtimeMs:123,ino:5};
      if(fault==='empty')return {size:0,isDirectory:false,mtimeMs:123,ino:5};
    }return {size:32,isDirectory:false,mtimeMs:123,ino:5};},
    readRange:async({path,offset,length})=>{fileCalls.push(['readRange',path,offset,length]);assert.equal(offset,0);assert.equal(length,1);
      if(path===photos[0].path){if(fault==='unreadable')throw Error('access denied');if(fault==='clipped')return {bytesRead:1};if(fault==='short-read')return {bytesRead:0,base64:''};}
      return {bytesRead:1,base64:'iQ=='};
    }
  };
  const project={resources:async()=>rows,sourceFiles:async input=>folderSummary&&!input?{folders:[{name:'photos'}]}:{fileTree:rows},
    createDraft:async()=>{creates.push('draft');return {meta:async()=>({fps:30})};}};
  const selects={files,project:()=>project};
  const sdk={runScript:async input=>{
    scripts.push(input.script);
    if(input.allowCommit){writes.push(input);throw Error('WRITE_REACHED');}
    try{return {isError:false,result:await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects})};}
    catch(error){return {isError:true,output:String(error?.message||error)};}
  }};
  const common=['nativeImageSources','nativeImageRun','prepareNativeImages','templateMessage','TEMPLATE_FAILED','TEMPLATE_UNSUPPORTED'];
  const extra=plugin==='no14-still-video'?['INVENTORY','readMediaPages','readImageDraftFps','readProjectFps','createNo14Draft']:['INVENTORY','readMediaPages','inventory','createPhotoDraft',...(plugin==='camera-shutter-dump'?['samePath']:['SLOTS','templateIssue'])];
  const authoring=plugin==='polaroid-photo-dump'?['isPolaroidAssetPath','PHOTO_EFFECT','FRAME_EFFECT','CAPTION_CODE','readImageDraftFps','buildAtomicImageDraftScript','authorAtomicImageDraft','bindMediaPlacement','placeWorkingCopyImages','inspectImageGraphics','inspectImageTransforms','inspectImageAudio','imageProgramsFeature','templateRunJSON']:[];
  const api=loadPanelFunctions(source,[...common,...extra,...authoring],{
    ...loadPanelOperation(plugin),
    DEFAULT_MUSIC:'off',ensureSounds:async()=>{writes.push('sounds');throw Error('WRITE_REACHED');},
    ensureMusic:async()=>{writes.push('music');throw Error('WRITE_REACHED');},
    ensureAssets:async()=>{writes.push('assets');if(!assetsReady)throw Error('WRITE_REACHED');const frame={resourceId:'frame',type:'Image',name:'Bundled frame.png',path:'/data/frame.png',frameSize:{width:1080,height:1920}};rows.push(frame);return {frame,music:{resourceId:'music'}};},
  });
  const create=(options={})=>api[plugin==='no14-still-video'?'createNo14Draft':'createPhotoDraft'](sdk,{projectId:'p',selected:photos,decoration:{shape:'none',color:'#fff'},framing:[],music:'off',name:'Fixture',stillCurrent:()=>true,say:()=>{},...options});
  return {api,sdk,photos,rows,files,fileCalls,writes,creates,scripts,create};
}
for(const plugin of plugins){
  for(const fault of ['missing','unknown','directory','empty','unreadable','clipped','short-read'])test(`${plugin}: ${fault} original is rejected before import or Draft creation`,async()=>{
    const f=fixture(plugin,{fault,folderSummary:true});
    await assert.rejects(f.create(),error=>{
      assert.match(error.message,/Photo 0\.png/,'identify the source the person must inspect');
      assert.match(error.message,fault==='missing'?/missing|not found/i:/read|available|changed|confirm/i);
      return true;
    });
    assert.equal(f.writes.length,0,'no import, sounds, commit or other persistent effect');
    assert.equal(f.creates.length,0,'even an unsaved Draft must wait for source preflight');
  });
  for(const platform of Object.keys(paths))test(`${plugin}: readable ${platform} originals keep identity, order and dimensions`,async()=>{
    const f=fixture(plugin,{platform,folderSummary:true});const before=JSON.stringify(f.photos);
    const prepared=await f.api.prepareNativeImages(f.sdk,'p',f.photos);
    assert.deepEqual(Array.from(prepared.sources,r=>[r.resourceId,r.path,r.width,r.height]),f.photos.map(p=>[p.resourceId,p.path,640,960]));
    assert.equal(f.fileCalls.filter(c=>c[0]==='readRange').length,f.photos.length);
    assert.equal(JSON.stringify(f.photos),before);
    assert.equal(f.writes.length,0);
  });
  test(`${plugin}: a changed file snapshot cannot pass as a stable original`,async()=>{
    const f=fixture(plugin),stat=f.files.stat;let reads=0;
    f.files.stat=async filename=>{const result=await stat(filename);if(filename===f.photos[0].path&&++reads===2)return {...result,size:33};return result;};
    await assert.rejects(f.create(),error=>error.code==='image-source-changed'&&/Photo 0/.test(error.message));
    assert.equal(f.writes.length,0);assert.equal(f.creates.length,0);
  });
  test(`${plugin}: repeated picks retain occurrences but read each original once per preflight`,async()=>{
    const f=fixture(plugin);const selected=[f.photos[1],f.photos[0],f.photos[1]];
    const prepared=await f.api.prepareNativeImages(f.sdk,'p',selected);
    assert.deepEqual(Array.from(prepared.sources,r=>r.resourceId),['r1','r0','r1']);
    assert.equal(f.fileCalls.filter(c=>c[0]==='readRange').length,2);
  });
  test(`${plugin}: a missing original is identified in the final user message`,async()=>{
    const f=fixture(plugin,{fault:'missing'});
    const error=await f.api.prepareNativeImages(f.sdk,'p',f.photos).catch(error=>error);
    assert.match(f.api.templateMessage(error),/Photo 0\.png/);
    assert.match(f.api.templateMessage(error),/missing/i);
  });
  test(`${plugin}: a different Resource at the old path cannot silently replace a picked Image`,async()=>{
    const f=fixture(plugin);f.rows[0].resourceId='replacement';
    await assert.rejects(f.api.prepareNativeImages(f.sdk,'p',f.photos),/missing|changed|ambiguous/i);
    assert.equal(f.writes.length,0);
  });
}

test('generated input scripts typecheck against the installed SDK',async()=>{
 const scripts=[];
 for(const plugin of plugins){
  const f=fixture(plugin);await f.api.prepareNativeImages(f.sdk,'p',f.photos);
  scripts.push(...f.scripts.map(script=>({name:plugin+' original Image preflight',script})));
 }
 const result=checkScriptTypes(scripts);assert.equal(result.scripts,plugins.length);
});

for(const selected of [null,[],Array(3).fill({}),Array(5).fill({})])test(`four-photo-stop-motion: invalid photo count ${selected?.length??'null'} cannot start music or a Draft`,async()=>{
 const f=fixture('four-photo-stop-motion');
 await assert.rejects(f.create({selected}),/four|exactly 4/i);
 assert.equal(f.writes.length,0);assert.equal(f.scripts.length,0);assert.equal(f.creates.length,0);
});
for(const timing of ['before checking','during checking'])test(`four-photo-stop-motion: an ended run ${timing} cannot start music or a Draft`,async()=>{
 const f=fixture('four-photo-stop-motion');let current=timing!=='before checking';
 const stat=f.files.stat;f.files.stat=async filename=>{const result=await stat(filename);current=false;return result;};
 await assert.rejects(f.create({stillCurrent:()=>current}),/Project changed|run ended/i);
 assert.equal(f.writes.length,0);assert.equal(f.creates.length,0);
 if(timing==='before checking')assert.equal(f.scripts.length,0);
});
for(const selected of [null,[],Array(16).fill({}),Array(18).fill({})])test(`polaroid-photo-dump: invalid photo count ${selected?.length??'null'} cannot prepare bundled assets or a Draft`,async()=>{
 const f=fixture('polaroid-photo-dump');
 await assert.rejects(f.create({selected}),/17|seventeen/i);
 assert.equal(f.writes.length,0);assert.equal(f.scripts.length,0);assert.equal(f.creates.length,0);
});
for(const timing of ['before checking','during checking'])test(`polaroid-photo-dump: an ended run ${timing} cannot prepare bundled assets or a Draft`,async()=>{
 const f=fixture('polaroid-photo-dump');let current=timing!=='before checking';
 const stat=f.files.stat;f.files.stat=async filename=>{const result=await stat(filename);current=false;return result;};
 await assert.rejects(f.create({stillCurrent:()=>current}),/Project changed|run ended/i);
 assert.equal(f.writes.length,0);assert.equal(f.creates.length,0);
 if(timing==='before checking')assert.equal(f.scripts.length,0);
});
test('polaroid-photo-dump: a missing frame is rejected after asset preparation and before Draft creation',async()=>{
 const f=fixture('polaroid-photo-dump',{assetsReady:true,frameMissing:true});
 await assert.rejects(f.create(),/original photo file is missing.*Bundled frame/i);
 assert.deepEqual(f.writes,['assets']);assert.equal(f.creates.length,0);
});
test('polaroid-photo-dump: healthy originals and the generated frame are checked at their separate preparation boundaries',async()=>{
 const f=fixture('polaroid-photo-dump',{assetsReady:true}),before=JSON.stringify(f.photos);
 await assert.rejects(f.create(),/WRITE_REACHED/);
 assert.equal(f.writes[0],'assets');assert.equal(f.writes.length,2);assert.equal(f.writes[1].summary,'Create complete polaroid Draft');
 assert.equal(f.fileCalls.filter(c=>c[0]==='readRange').length,35,'17 before asset preparation, then the 17 originals plus frame');
 assert.equal(JSON.stringify(f.photos),before);
});
test('polaroid-photo-dump: a direct create cannot treat a generated frame as a user input',async()=>{
 const f=fixture('polaroid-photo-dump');f.photos[0].path='C:\\Users\\Mano\\.selects\\plugin-data\\polaroid-photo-dump\\frame-v1.png';
 await assert.rejects(f.create(),/bundled polaroid frame/i);
 assert.equal(f.writes.length,0);assert.equal(f.scripts.length,0);
});
for(const plugin of plugins)test(`${plugin}: real original deletion leaves retained metadata but prevents any Project write`,async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'original-photo-preflight-'));
 try{
  const f=fixture(plugin);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  for(let i=0;i<f.photos.length;i++){
   const filename=path.join(dir,`Photo ${i} - \uc0ac\uc9c4.png`);fs.writeFileSync(filename,png);
   f.photos[i].path=filename;f.rows[i].path=filename;
  }
  f.files.stat=async filename=>{try{const s=await fs.promises.stat(filename);return {size:s.size,isDirectory:s.isDirectory(),mtimeMs:s.mtimeMs,ino:s.ino};}catch(e){if(e.code==='ENOENT')return null;throw e;}};
  f.files.readRange=async({path:filename,offset,length})=>{
   const handle=await fs.promises.open(filename,'r');
   try{const buffer=Buffer.alloc(length),{bytesRead}=await handle.read(buffer,0,length,offset);return {bytesRead,base64:buffer.subarray(0,bytesRead).toString('base64')};}
   finally{await handle.close();}
  };
  assert.equal((await f.api.prepareNativeImages(f.sdk,'p',f.photos)).sources.length,f.photos.length);
  fs.unlinkSync(f.photos[0].path);
  assert.equal(f.rows[0].frameSize.width,640,'retained metadata still exists');
  await assert.rejects(f.create(),/original photo file is missing.*Photo 0/i);
  assert.equal(f.writes.length,0);assert.equal(f.creates.length,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
