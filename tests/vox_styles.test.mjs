import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadPanelOperation} from './panel_operation.mjs';
const ids=['jared-vox-editorial','tang-poetry-explainer'];
const fixture='The archive contains letters and maps from the old port. The documents describe merchants carrying paper and silk between cities. The surviving records show how exchange changed the port over time.';
function memoryIO(windows){
 const paths=windows?path.win32:path.posix;
 const dir=windows?'C:\\Users\\Demo Person\\.selects\\plugin-data\\style\\jobs\\fresh':'/fresh user/.selects/plugin-data/style/jobs/fresh';
 const files=new Map(),durations=new Map(),ffmpeg=[];
 const io={join:(...x)=>paths.join(...x),exists:p=>files.has(p),mkdir:()=>{},now:()=>1234,sheetFont:()=>null,
 readJson:async(p,fallback)=>files.has(p)?structuredClone(files.get(p)):fallback,
 writeJson:async(p,v)=>files.set(p,structuredClone(v)),duration:async p=>durations.get(p)??8,silences:async()=>[],
 ffmpeg:async args=>{ffmpeg.push(args);files.set(args.at(-1),true);},http:async()=>({code:404,text:''}),download:async()=>404};
 return {dir,io,files,durations,ffmpeg,put:(n,v)=>files.set(paths.join(dir,n),v),get:n=>files.get(paths.join(dir,n))};
}
for(const id of ids)for(const windows of [false,true]){
 const op=loadPanelOperation(id),os=windows?'Windows paths':'POSIX paths';
 test(`${id}: ${os}, source → plan → requests → timing → editable assembly`,async()=>{
  const m=memoryIO(windows);m.put('job.json',{id:'fresh',projectId:'new-third-party-project',target:20,input:{kind:'text',text:fixture}});
  let r=await op.voxEngine('fetch',m.dir,[],m.io);assert.equal(r.ok,true);
  m.put('plan.json',{title:'A paper archive',source_line:'Source: supplied text',cast:[],beats:[{headline:'An old port',narration:fixture,graphic:'timeline',evidence:['Letters and maps','Paper and silk'],captions:[],bg:'cream',shots:[{scene:'A torn paper map and two manuscript sheets',cast:[],camera:'push_in',element_motion:'Paper layers drift gently.'}]}]});
  r=await op.voxEngine('validate',m.dir,[],m.io);assert.equal(r.ok,true,JSON.stringify(r));
  const plan=m.get('plan.json');assert.equal(plan.beats[0].graphic,'timeline');assert.deepEqual(plan.beats[0].evidence,['Letters and maps','Paper and silk']);
  r=await op.voxEngine('requests',m.dir,['keyframes'],m.io);assert.equal(r.ok,true);
  assert.equal(r.requests[0].input.aspect_ratio,'16:9');assert.match(r.requests[0].input.prompt,/No readable text/);assert.ok(r.requests[0].input.prompt.includes(op.STYLE.idiom));
  assert.ok(r.requests[0].folder.startsWith(m.dir));
  const audio=m.io.join(m.dir,'voice with spaces.mp3'),image=m.io.join(m.dir,'image 1.png'),clip=m.io.join(m.dir,'clip 1.mp4');
  m.files.set(audio,true);m.files.set(image,true);m.durations.set(audio,5);m.durations.set(clip,12);
  m.put('gen.json',{'narr:1':{path:audio},'kf:1a':{path:image},'clip:1a':{path:clip}});
  r=await op.voxEngine('timeline',m.dir,[],m.io);assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(m.get('timeline.json').headlines[0].evidence.length,2);
  r=await op.voxEngine('kenburns',m.dir,['1a'],m.io);assert.equal(r.ok,true,JSON.stringify(r));
  const filters=m.ffmpeg.at(-1).join(' ');assert.match(filters,/1920:1080/);assert.match(filters,/s=1920x1080/);
  m.files.set(clip,true);r=await op.voxEngine('assembly',m.dir,[],m.io);
  assert.ok(r.draftName.includes(op.STYLE.name));assert.ok(r.draftName.endsWith('fresh'));assert.equal(r.headlines[0].graphic,'timeline');assert.equal(r.narration.length,1);assert.ok(r.segments.length>0);
  assert.equal(op.voxBaseName(audio),'voice with spaces.mp3');
  const first=(await op.voxEngine('requests',m.dir,['clips'],m.io)).requests[0];
  const changed=m.get('gen.json');changed['kf:1a'].attempt=2;m.put('gen.json',changed);
  const revised=(await op.voxEngine('requests',m.dir,['clips'],m.io)).requests[0];
  assert.notEqual(first.key,revised.key,'a repaired keyframe must regenerate its dependent motion clip');
  assert.notEqual(first.outputName,revised.outputName,'a repair must preserve earlier saved media files');
 });
 test(`${id}: ${os}, invalid sources fail before generation`,async()=>{const m=memoryIO(windows);m.put('job.json',{id:'fresh',projectId:'p',input:{kind:'text',text:'too short'}});const r=await op.voxEngine('fetch',m.dir,[],m.io);assert.equal(r.ok,false);assert.equal(r.error,'TEXT_TOO_SHORT');assert.equal(m.ffmpeg.length,0);});
}
for(const id of ids){
 test(`${id}: self-contained transferable panel`,()=>{
  const p=fs.readFileSync(new URL(`../plugins/${id}/panel.tsx`,import.meta.url),'utf8');
  assert.doesNotMatch(p,/sdk\.runShell|IS_WIN|xcode-select|\/Users\/|\/opt\/homebrew/);
  const imports=[...p.matchAll(/^import .*?from ["']([^"']+)["']/gm)].map(m=>m[1]);assert.deepEqual(imports,['react']);
  assert.match(p,new RegExp(`const APP_ID = "${id}"`));
  assert.match(p,/savedJob\?\.projectId !== projectId/);assert.match(p,/await scope\(\);\s*const sel/);
  assert.match(p,/May use credits/);assert.match(p,/addMotionGraphic/);
  const manifest=JSON.parse(fs.readFileSync(new URL(`../plugins/${id}/plugin.json`,import.meta.url),'utf8'));assert.ok(manifest.compatibility.platforms.includes('Windows x64'));assert.ok(!manifest.files.some(f=>/\.py$|node_modules/.test(f)));
 });
}
test('styles have distinct direction and motion rather than renamed identical prompts',()=>{const a=loadPanelOperation(ids[0]),b=loadPanelOperation(ids[1]);assert.notEqual(a.STYLE.idiom,b.STYLE.idiom);assert.notEqual(a.STYLE.music,b.STYLE.music);assert.equal(a.STYLE.style,'editorial');assert.equal(b.STYLE.style,'tang');});

// Run the actual SDK script emitted by each panel, including its embedded templates.
// This catches cross-language escaping and serialization bugs that engine tests miss.
for (const id of ids) {
 test(`${id}: editable SDK assembly and interrupted-commit recovery`, async () => {
  const {stripTypeScriptTypes} = await import('node:module');
  const {runInNewContext} = await import('node:vm');
  const source=fs.readFileSync(new URL(`../plugins/${id}/panel.tsx`,import.meta.url),'utf8');
  const prefix=source.slice(0,source.indexOf('export default function Panel'))
   .replace(/^import React from "react";\s*/m,'').replace(/^export /gm,'');
  const ctx={};
  runInNewContext(stripTypeScriptTypes(prefix)+'\nglobalThis.emitDraft=draftScript;',ctx);
  const selection={draftName:'Archive " test • unique-job',segments:[{file:'clip',dur:5}],narration:[{file:'voice',start:0,dur:5}],music:'music',headlines:[{beat:1,text:'The archive',start:0,end:5,evidence:['Letters','Maps'],graphic:'comparison'}],captions:[{start:0,end:5,text:'Paper and silk'},{start:5,end:6,text:'Skip outside range'}],credit:{start:3,source:'Supplied text',photos:''}};
  const script=ctx.emitDraft('another-user-project',selection,{clip:'c',voice:'v',music:'m'});
  const execute=runInNewContext(stripTypeScriptTypes(`(async function(selects){${script}})`));
  const graphics=[],audio=[],sizes=[];
  const draft={insertResource:async()=>{},setFrameSize:async x=>sizes.push(x),meta:async()=>({fps:24}),clips:async({trackScope})=>trackScope==='main'?[{endFrame:120}]:[{resourceId:'m'}],rangeAtFrames:async(a,b)=>{assert.ok(a>=0&&b>a&&b<=120);return {a,b}},overlayResource:async x=>audio.push(x),setClipAudio:async()=>{},addMotionGraphic:async x=>graphics.push(x),commitAll:async()=>({createdDraftId:'saved'})};
  const result=await execute({project:p=>{assert.equal(p,'another-user-project');return {meta:async()=>({draftIds:[]}),createDraft:async()=>draft,resource:id=>({id})}}});
  assert.equal(result.draftId,'saved');assert.equal(audio.length,2);assert.equal(sizes[0].width,1920);assert.equal(sizes[0].height,1080);
  assert.equal(graphics.filter(g=>g.label.startsWith('Caption')).length,1);
  for(const graphic of graphics){assert.ok(graphic.editableParameters.length);assert.ok(graphic.tsxCode.includes('export default'));}
  const headline=graphics.find(g=>g.label.startsWith('Headline'));
  assert.match(headline.tsxCode,/data\?\.barColor/);assert.match(headline.tsxCode,/data\?\.textColor/);
  if(id==='jared-vox-editorial')assert.equal(graphics.find(g=>g.label.startsWith('Evidence')).parameters.text,'Letters\nMaps');
  else assert.equal(graphics.filter(g=>g.label.startsWith('Evidence')).length,0);
  let created=0;
  const recovered=await execute({project:()=>({meta:async()=>({draftIds:['prior']}),createDraft:()=>{created++}}),draft:()=>({meta:async()=>({name:selection.draftName,fps:24}),clips:async()=>[{endFrame:120}]})});
  assert.equal(recovered.draftId,'prior');assert.equal(recovered.recovered,true);assert.equal(created,0);
 });
}
