import assert from 'node:assert/strict';
import test from 'node:test';
const {buildScript}=await import(process.env.GALLERY_MUSIC_BUILDER||new URL('../plugins/photo-gallery-no2/operation-builder.mjs',import.meta.url));
function fixture(){
 const resources=[{resourceId:'audio',type:'Audio',durationSeconds:15}],nodes=[{resourceId:'audio',type:'audio',name:'Music',path:'/music.wav',durationSeconds:15}],hooks={};let writes=0;
 const project={resources:async()=>resources,sourceFiles:async()=>{await hooks.inventory?.();return {fileTree:nodes};},createDraft:async()=>{writes++;throw Error('Unexpected Draft');},importFiles:async()=>{writes++;throw Error('Unexpected import');}};
 const selects={project:()=>project,files:{fingerprint:async()=>{throw Error('Music metadata preflight must not hash');}},media:{probe:async()=>{await hooks.probe?.();return hooks.result??{files:[{path:'/music.wav',type:'audio'}],errors:[],summary:{failed:0}};}}};
 const run=(music={resourceId:'audio',path:'/music.wav'})=>new Function('selects','return (async()=>{'+buildScript({operation:'verifyMusic',projectId:'p',music})+'})()')(selects);
 return {resources,nodes,hooks,run,get writes(){return writes;}};
}
test('Gallery music preflight returns current exact facts with no visual slot requirement or writes',async()=>{
 const f=fixture(),r=await f.run();assert.equal(r.status,'musicReady',r.message);assert.equal(r.music.durationSeconds,15);assert.equal(r.music.resourceId,'audio');assert.equal(f.writes,0);
});
test('Gallery music preflight ignores caller duration and resolves the current selected-path alias',async()=>{
 const f=fixture();f.nodes[0].resourceId='alias';f.resources[0].resourceId='alias';const r=await f.run({resourceId:'audio',path:'/music.wav',durationSeconds:1000});assert.equal(r.status,'musicReady',r.message);assert.equal(r.music.resourceId,'alias');assert.equal(r.music.durationSeconds,15);
});
for(const fault of ['duration','type','duplicate'])test('Gallery music preflight rejects '+fault+' metadata changed during probing',async()=>{
 const f=fixture();f.hooks.probe=()=>{if(fault==='duration')f.nodes[0].durationSeconds=16;if(fault==='type')f.resources[0].type='Video';if(fault==='duplicate')f.nodes.push({...f.nodes[0]});};
 const r=await f.run();assert.equal(r.status,'notSaved');assert.match(r.message,/music|missing|ambiguous/i);assert.equal(f.writes,0);
});
test('Gallery music preflight refuses a non-Audio probe result',async()=>{
 const f=fixture();f.hooks.result={files:[{path:'/music.wav',type:'video'}]};const r=await f.run();assert.equal(r.status,'notSaved');assert.match(r.message,/Audio|music/i);
});
for(const stage of ['probe','inventory'])test('Gallery music preflight preserves private '+stage+' errors behind a safe message',async()=>{
 const f=fixture();f.hooks[stage]=()=>{throw Error('private /user/secret paths');};const r=await f.run();assert.equal(r.status,'notSaved');assert.match(r.message,/music/i);assert.ok(!r.message.includes('private')&&!r.message.includes('/user/secret'));
});
