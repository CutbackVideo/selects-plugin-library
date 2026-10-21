import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {webcrypto,createHash} from 'node:crypto';
import {fixture} from './photo_authoring_fixture.mjs';
import {loadPanelFunctions} from './windows_host.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
const ids=['no14-still-video','four-photo-stop-motion'];
test('bundled music scripts typecheck without an installed SDK declaration set',async()=>{
 const f=musicFixture('no14-still-video');await f.prepare();
 assert.equal(checkScriptTypes(f.calls.map(c=>({name:c.summary,script:c.script})),{sdkTypes:false}).sdkTypings,false);
});
test('a missing plugin owner cannot publish an unscoped data file',async()=>{
 const f=fixture('no14-still-video');
 await assert.rejects(f.api.prepareBundledAudio(f.sdk,f.sdk.files,{projectId:'p',sourcePath:'/user/.selects/skills/no14-still-video/assets/music.mp3'}),e=>e.code==='BUNDLED_AUDIO_INPUT');
 assert.equal(f.imports,0);assert.equal([...f.hostFiles.keys()].filter(p=>p.includes('plugin-data')).length,0);
});
function musicFixture(id,{platform='darwin',home='/user'}={}){
 const f=fixture('no14-still-video'),files=f.sdk.files,imported=[],writes=[],bytes=Buffer.from('fixture music');
 const join=platform==='win32'?path.win32.join:path.posix.join;
 files.join=(...parts)=>join(...parts);files.homedir=()=>home;f.sdk.environment.platform=platform;
 const source=join(home,'.selects','skills',id,'assets','music.mp3');f.hostFiles.set(source,bytes);
 const p=f.selects.project('p');let current=true,importReply=null;
 const write=files.writeFile;files.writeFile=async(...args)=>{writes.push(args[0]);await write(...args);};
 p.importFiles=async({paths})=>{imported.push(...paths);const reply=importReply??{addedResourceIds:['music-'+imported.length]};if(reply.addedResourceIds?.length===1){const resourceId=reply.addedResourceIds[0];f.resources.push({resourceId,type:'Audio',durationSeconds:60});f.nodes.push({resourceId,type:'audio',path:paths[0]});}return reply;};
 let prepare;
 if(id==='no14-still-video')prepare=()=>f.create({music:'on',stillCurrent:()=>current});
 else{
  const text=fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
  const names=['readMediaPages','INVENTORY','inventory','ensureMusic',...['prepareBundledAudio','readBundledAudioResource'].filter(n=>text.includes('function '+n+'('))];
  const api=loadPanelFunctions(text,names,{__sdk:f.sdk,crypto:webcrypto});prepare=()=>api.ensureMusic(f.sdk,'p',()=>current);
 }
 const dataPath=()=>files.join(home,'.selects','plugin-data',id,'assets',createHash('sha256').update(bytes).digest('hex')+'.mp3');
 return {...f,source,bytes,imported,writes,prepare,dataPath,setReply:reply=>{importReply=reply;},stopMusic:()=>{current=false;}};
}
for(const id of ids){
 test(id+': the existing POSIX exact-path contract does not merge Unicode-distinct metadata',async()=>{
  const f=musicFixture(id,{home:'/caf\u00e9'});await f.prepare();f.nodes.find(n=>n.resourceId.startsWith('music-')).path=f.dataPath().normalize('NFD');await f.prepare();assert.equal(f.imported.length,2);
 });
 test(id+': music imports a verified content-addressed data copy',async()=>{
  const f=musicFixture(id);await f.prepare();assert.equal(f.imported.length,1);
  const digest=createHash('sha256').update(f.bytes).digest('hex');assert.match(f.imported[0],new RegExp('/plugin-data/'+id+'/assets/'+digest+'\\.mp3$'));assert.deepEqual(f.hostFiles.get(f.imported[0]),f.bytes);
 });
 test(id+': deleting the installation does not remove the new Draft music source',async()=>{
  const f=musicFixture(id);await f.prepare();f.hostFiles.delete(f.source);assert.ok(f.hostFiles.has(f.imported[0]));assert.deepEqual(f.hostFiles.get(f.imported[0]),f.bytes);
 });
 test(id+': identical bytes reuse the Project Audio instead of importing twice',async()=>{
  const f=musicFixture(id);await f.prepare();await f.prepare();assert.equal(f.imported.length,1);assert.equal(f.writes.length,1);
 });
 test(id+': an update creates a new content path and preserves the earlier bytes',async()=>{
  const f=musicFixture(id);await f.prepare();const first=f.imported[0];f.hostFiles.set(f.source,Buffer.from('updated music'));await f.prepare();assert.equal(f.imported.length,2);assert.notEqual(f.imported[1],first);assert.deepEqual(f.hostFiles.get(first),f.bytes);
 });
 for(const reply of [{addedResourceIds:[]},{},{addedResourceIds:['one','two']}])test(id+': unconfirmed or skipped import is not reported as still preparing '+JSON.stringify(reply),async()=>{
  const f=musicFixture(id);f.setReply(reply);await assert.rejects(f.prepare(),e=>/^BUNDLED_AUDIO_/.test(e.code)&&!/still adding|not ready|Reinstall/.test(e.publicMessage??e.message));assert.equal(f.imported.length,1);assert.equal(f.commits.length,0);
 });
 test(id+': a failed cache publication cannot import or save',async()=>{
  const f=musicFixture(id);f.sdk.files.writeFile=async()=>{throw Error('/private/failure');};await assert.rejects(f.prepare(),e=>/^BUNDLED_AUDIO_/.test(e.code)&&!e.message.includes('/private'));assert.equal(f.imported.length,0);assert.equal(f.commits.length,0);
 });
 test(id+': replacement before the Project import prevents the import',async()=>{
  const f=musicFixture(id),write=f.sdk.files.writeFile;f.sdk.files.writeFile=async(...args)=>{await write(...args);f.stopMusic();};await assert.rejects(f.prepare(),/ended|changed|stopped/i);assert.equal(f.imported.length,0);assert.equal(f.commits.length,0);
 });
 test(id+': a corrupt data copy is atomically repaired from the known source',async()=>{
  const f=musicFixture(id);await f.prepare();const target=f.imported[0];f.hostFiles.set(target,Buffer.from('corrupt'));await f.prepare();assert.deepEqual(f.hostFiles.get(target),f.bytes);assert.equal(f.imported.length,1);
 });
 test(id+': a different source byte sequence with the same size is not reused',async()=>{
  const f=musicFixture(id);await f.prepare();const old=f.imported[0];f.hostFiles.set(f.source,Buffer.from('different mp3'));assert.equal(f.bytes.length,13);await f.prepare();assert.equal(f.imported.length,2);assert.notEqual(f.imported[1],old);
 });
 test(id+': Windows Unicode paths are serialized and cached through the host',async()=>{
  const f=musicFixture(id,{platform:'win32',home:'C:\\Users\\\ud64d\uae38\ub3d9 "quoted"'});await f.prepare();assert.equal(f.imported.length,1);assert.match(f.imported[0],/\\plugin-data\\/);assert.deepEqual(f.hostFiles.get(f.imported[0]),f.bytes);
 });
 test(id+': a lost import acknowledgment is recovered by a read without resubmission',async()=>{
  const f=musicFixture(id),run=f.sdk.runScript;f.sdk.runScript=async input=>{const result=await run(input);if(input.summary==='Import bundled music')throw Error('lost reply');return result;};
  await f.prepare();assert.equal(f.imported.length,1);assert.equal(f.resources.filter(r=>r.resourceId.startsWith('music-')).length,1);
 });
 test(id+': a concurrent writer can satisfy an import that returned no added IDs',async()=>{
  const f=musicFixture(id),p=f.selects.project('p');p.importFiles=async({paths})=>{f.imported.push(...paths);f.resources.push({resourceId:'parallel',type:'Audio',durationSeconds:60});f.nodes.push({resourceId:'parallel',type:'audio',path:paths[0]});return {addedResourceIds:[]};};
  await f.prepare();assert.equal(f.imported.length,1);
 });
 test(id+': an unrelated old installation copy cannot satisfy the data-file identity',async()=>{
  const f=musicFixture(id);f.resources.push({resourceId:'old',type:'Audio',durationSeconds:60});f.nodes.push({resourceId:'old',type:'audio',path:'/elsewhere/plugins/'+id+'/assets/music.mp3'});await f.prepare();assert.equal(f.imported.length,1);assert.equal(f.imported[0],f.dataPath());
 });
 test(id+': ambiguous exact data-file Resources stop before import',async()=>{
  const f=musicFixture(id);for(const resourceId of ['old1','old2']){f.resources.push({resourceId,type:'Audio',durationSeconds:60});f.nodes.push({resourceId,type:'audio',path:f.dataPath()});}
  await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_AUDIO_READ');assert.equal(f.imported.length,0);
 });
 test(id+': same-path non-Audio metadata cannot be reused or replaced by another import',async()=>{
  const f=musicFixture(id);f.resources.push({resourceId:'wrong',type:'Image',durationSeconds:60});f.nodes.push({resourceId:'wrong',type:'image',path:f.dataPath()});await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_AUDIO_METADATA');assert.equal(f.imported.length,0);
 });
 test(id+': Project inventory size does not expand music lookup replies or requests',async()=>{
  const f=musicFixture(id),run=f.sdk.runScript,replies=[];
  for(let i=0;i<4000;i++){f.resources.push({resourceId:'noise-'+i,type:'Image'});f.nodes.push({resourceId:'noise-'+i,type:'image',path:'/unrelated/'+i+'.jpg'});}
  f.sdk.runScript=async input=>{const response=await run(input);if(input.summary==='Find bundled music Resource')replies.push(Buffer.byteLength(JSON.stringify(response)));return response;};
  await f.prepare();assert.equal(replies.length,2);assert.ok(replies.every(n=>n<1000));assert.equal(f.imported.length,1);
 });
 test(id+': an oversized installed asset is refused before reading its bytes',async()=>{
  const f=musicFixture(id),stat=f.sdk.files.stat,read=f.sdk.files.readFile;let reads=0;
  f.sdk.files.stat=async p=>p===f.source?{size:32*1024*1024+1,isDirectory:false}:stat(p);
  f.sdk.files.readFile=async(...args)=>{reads++;return read(...args);};
  await assert.rejects(f.prepare(),e=>e.code==='BUNDLED_AUDIO_BYTES');assert.equal(reads,0);assert.equal(f.imported.length,0);
 });
 test(id+': an oversized corrupt data copy is repaired without loading its bytes',async()=>{
  const f=musicFixture(id);await f.prepare();const target=f.imported[0],stat=f.sdk.files.stat,read=f.sdk.files.readFile,write=f.sdk.files.writeFile;let repaired=false;
  f.sdk.files.stat=async p=>p===target&&!repaired?{size:32*1024*1024+1,isDirectory:false}:stat(p);
  f.sdk.files.readFile=async p=>{if(p===target&&!repaired)throw Error('must not load oversized data');return read(p);};
  f.sdk.files.writeFile=async(...args)=>{await write(...args);repaired=true;};
  await f.prepare();assert.ok(repaired);assert.equal(f.imported.length,1);
 });
}
