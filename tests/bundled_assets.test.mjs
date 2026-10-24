import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {assetFixture} from './bundled_asset_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
const sameBytes=(a,b)=>assert.ok(Buffer.from(a).equals(Buffer.from(b)),'asset bytes differ');

test('Polaroid publishes verified content-addressed PNG and M4A through the canonical file client',async()=>{
 const f=assetFixture(),result=await f.prepare();
 for(const key of ['frame','music']){assert.equal(result[key].path,f.dataPath(key));sameBytes(f.filesOnDisk.get(result[key].path),f.decoded[key]);assert.equal(createHash('sha256').update(f.decoded[key]).digest('hex'),f.manifest[key].sha256);}
 const png=f.filesOnDisk.get(result.frame.path);assert.equal(png.toString('latin1',1,4),'PNG');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);assert.equal(png[25],6);
 assert.equal(f.filesOnDisk.get(result.music.path).toString('latin1',4,8),'ftyp');
 assert.equal(f.writes.length,2,'one canonical atomic publication per asset, with no module-owned temp/rename');
});
test('Polaroid identical bytes reuse both data files and Project Resources',async()=>{
 const f=assetFixture(),a=await f.prepare(),before=f.imports.length,writes=f.writes.length,b=await f.prepare();
 assert.equal(a.frame.resourceId,b.frame.resourceId);assert.equal(a.music.resourceId,b.music.resourceId);assert.equal(f.imports.length,before);assert.equal(f.writes.length,writes);
});
test('Polaroid same-session cache damage is checked and repaired instead of trusting a seen flag',async()=>{
 const f=assetFixture(),a=await f.prepare(),before=f.imports.length;f.filesOnDisk.set(a.frame.path,Buffer.alloc(f.decoded.frame.length));await f.prepare();sameBytes(f.filesOnDisk.get(a.frame.path),f.decoded.frame);assert.equal(f.imports.length,before);
});
test('Polaroid music update retains earlier bytes and publishes a new path and Resource',async()=>{
 const f=assetFixture(),a=await f.prepare(),old=Buffer.from(f.filesOnDisk.get(a.music.path)),updated=f.updateMusic(),b=await f.prepare();
 assert.notEqual(a.music.path,b.music.path);assert.notEqual(a.music.resourceId,b.music.resourceId);sameBytes(f.filesOnDisk.get(a.music.path),old);sameBytes(f.filesOnDisk.get(b.music.path),updated);
});
test('Polaroid missing WebCrypto refuses preparation with no length-only fallback',async()=>{
 const f=assetFixture({cryptoSupported:false});await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_UNSUPPORTED');assert.equal(f.writes.length,0);assert.equal(f.imports.length,0);
});
for(const fault of ['hash','length','encoding'])test('Polaroid invalid installed '+fault+' cannot publish or import',async()=>{
 const f=assetFixture();if(fault==='hash')f.manifest.frame.sha256='0'.repeat(64);if(fault==='length')f.manifest.frame.bytes--;if(fault==='encoding')f.filesOnDisk.set(f.sourcePath('frame'),Buffer.from('%%%'));f.saveManifest();
 await assert.rejects(f.prepare(),e=>/^BUNDLED_ASSET_/.test(e.code));assert.equal(f.writes.length,0);assert.equal(f.imports.length,0);
});
for(const fault of ['missing role','extra role','path traversal','invalid size'])test('Polaroid manifest '+fault+' is validated before publication',async()=>{
 const f=assetFixture();if(fault==='missing role')delete f.manifest.music;if(fault==='extra role')f.manifest.extra={...f.manifest.frame};if(fault==='path traversal')f.manifest.music.file='../music.m4a';if(fault==='invalid size')f.manifest.music.bytes=32*1024*1024+1;f.saveManifest();
 await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_MANIFEST');assert.equal(f.writes.length,0);assert.equal(f.imports.length,0);
});
test('Polaroid oversize manifest is refused before whole-file allocation',async()=>{
 const f=assetFixture(),stat=f.files.stat;f.files.stat=async p=>p===f.manifestPath?{size:65537,isDirectory:false}:stat(p);
 await assert.rejects(f.prepare(),e=>/^BUNDLED_ASSET_/.test(e.code));assert.equal(f.reads.includes(f.manifestPath),false);assert.equal(f.imports.length,0);
});
test('Polaroid oversize encoded asset is refused before its contents are read',async()=>{
 const f=assetFixture(),stat=f.files.stat;f.files.stat=async p=>p===f.sourcePath('frame')?{size:100*1024*1024,isDirectory:false}:stat(p);
 await assert.rejects(f.prepare(),e=>/^BUNDLED_ASSET_/.test(e.code));assert.equal(f.reads.includes(f.sourcePath('frame')),false);assert.equal(f.imports.length,0);
});
for(const phase of ['before prepare','after source read','after publication','after Project lookup'])test('Polaroid ended run '+phase+' starts no later import',async()=>{
 const f=assetFixture();if(phase==='before prepare')f.stop();if(phase==='after source read')f.hooks.beforeRead=p=>{if(p===f.sourcePath('frame'))f.stop();};if(phase==='after publication')f.hooks.afterWrite=()=>f.stop();if(phase==='after Project lookup')f.hooks.afterScript=()=>f.stop();
 await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_STOPPED');assert.equal(f.imports.length,0);
});
test('Polaroid a detached import can finish once but cannot trigger the next asset import',async()=>{
 const f=assetFixture();f.hooks.afterScript=input=>{if(input.allowCommit)f.stop();};await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_STOPPED');assert.equal(f.imports.length,1);
});
test('Polaroid an empty added-ID list without a Resource is a confirmed skip',async()=>{
 const f=assetFixture();f.hooks.skip=true;f.hooks.reply={addedResourceIds:[]};await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_SKIPPED'&&!/still adding|not ready/.test(e.publicMessage));assert.equal(f.imports.length,1);
});
test('Polaroid unknown import result is not retried or described as preparing',async()=>{
 const f=assetFixture();f.hooks.skip=true;f.hooks.reply={};await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_IMPORT_UNKNOWN');assert.equal(f.imports.length,1);
});
test('Polaroid lost import replies are recovered by Project reads without resubmission',async()=>{
 const f=assetFixture();f.hooks.afterScript=input=>{if(input.allowCommit)throw Error('reply lost');};const r=await f.prepare();assert.ok(r.frame.resourceId&&r.music.resourceId);assert.ok(f.imports.flat().every((p,i,all)=>all.indexOf(p)===i));
});
test('Polaroid another writer may satisfy an empty acknowledgment through confirmed state',async()=>{
 const f=assetFixture();f.hooks.reply={addedResourceIds:[]};const r=await f.prepare();assert.ok(r.frame.resourceId&&r.music.resourceId);assert.ok(f.imports.length<=2);
});
test('Polaroid contradictory added IDs cannot claim a confirmed asset',async()=>{
 const f=assetFixture();f.hooks.reply={addedResourceIds:['unrelated']};await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_IMPORT_UNKNOWN');assert.equal(f.imports.length,1);
});
test('Polaroid an incomplete Resource path cannot become a successful asset result',async()=>{
 const f=assetFixture();f.hooks.afterScript=(input,result)=>{if(!input.allowCommit&&result.matches?.length)delete result.matches[0].path;};
 await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_METADATA');assert.equal(f.imports.length,1);
});
for(const kind of ['duplicate','wrong type','wrong dimensions'])test('Polaroid existing '+kind+' frame cannot be silently reused or replaced',async()=>{
 const f=assetFixture();f.add(f.dataPath('frame'),kind==='wrong type'?{type:'Audio'}:kind==='wrong dimensions'?{frameSize:{width:500,height:500}}:{});if(kind==='duplicate')f.add(f.dataPath('frame'));
 await assert.rejects(f.prepare(),e=>/^BUNDLED_ASSET_(READ|METADATA)$/.test(e.code));assert.equal(f.imports.length,0);
});
test('Polaroid music metadata must cover every supported rounded frame grid',async()=>{
 const f=assetFixture();f.hooks.metadata={durationSeconds:13.94};await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_ASSET_METADATA');
});
test('Polaroid private file diagnostics stay out of the public error',async()=>{
 const f=assetFixture();f.files.writeFile=async()=>{throw Error('/private/key/secret');};await assert.rejects(f.prepare(),e=>/^BUNDLED_ASSET_/.test(e.code)&&!e.message.includes('/private/'));
});
test('Polaroid Project noise cannot expand lookup replies or the number of script reads',async()=>{
 const f=assetFixture();for(let i=0;i<4000;i++)f.add('/unrelated/'+i+'.png');await f.prepare();const reads=f.requests.filter(r=>!r.allowCommit);assert.ok(reads.length<=4);assert.ok(reads.every(r=>r.replyBytes<2000));
});
test('Polaroid Windows Unicode paths use canonical publication without shell or path suffix matching',async()=>{
 const f=assetFixture({platform:'win32',home:'C:\\Profiles\\\uc0ac\uc9c4 "quoted"'}),r=await f.prepare();assert.equal(r.frame.path,f.dataPath('frame'));assert.equal(r.music.path,f.dataPath('music'));sameBytes(f.filesOnDisk.get(r.frame.path),f.decoded.frame);
});
test('Polaroid Unicode-normalized metadata preserves the observed path needed by Image preflight',async()=>{
 const f=assetFixture({platform:'win32',home:'C:\\Profiles\\caf\u00e9'});
 f.hooks.afterScript=input=>{if(input.allowCommit)for(const node of f.nodes)node.path=node.path.normalize('NFD').replace(/\\/g,'/').toLowerCase();};
 const r=await f.prepare();assert.equal(r.frame.path,f.nodes.find(n=>n.resourceId===r.frame.resourceId).path);assert.ok(r.frame.path.includes('cafe\u0301'));assert.equal(f.imports.length,2);
});
test('Polaroid complete asset preparation survives real minification',async()=>{
 const f=assetFixture({minify:true}),r=await f.prepare();assert.equal(r.frame.path,f.dataPath('frame'));assert.equal(r.music.path,f.dataPath('music'));
});
test('Polaroid generated asset scripts typecheck with and without SDK declarations',async()=>{
 const f=assetFixture();await f.prepare();const scripts=f.requests.map(r=>({name:r.summary,script:r.script}));assert.ok(checkScriptTypes(scripts).scripts>0);assert.equal(checkScriptTypes(scripts,{sdkTypes:false}).sdkTypings,false);
});
