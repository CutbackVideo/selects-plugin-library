'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('template background music',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {validateTemplate,cleanTemplate,portableTemplate,musicPath,musicImportScript,musicPlaceScript,MUSIC_LEVEL_DB,MUSIC_FADE_OUT_SECONDS,STRINGS};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports;
 const pack=id=>JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/chosun-ilbo/templates/'+id+'.json'),'utf8'));
 const template=()=>api.validateTemplate(JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/sbs-radio/templates/political-show.json'),'utf8')));
 // Runs a generated script body the way the host does: an async function over a `selects` global.
 const exec=async(body,selects)=>{
  const js=esbuild.transformSync('(async()=>{'+body+'\n})()',{loader:'ts'}).code;
  const ctx={selects};vm.createContext(ctx);return JSON.parse(JSON.stringify(await vm.runInContext(js,ctx)));
 };
 function world({fps=30,mainEnd=300,rows=[],files=['/music/bed.mp3'],duration=10,overlayAt0=false}={}){
  const w={clips:[{clipId:'v1',trackKind:'main',resourceId:'src',startFrame:0,endFrame:mainEnd}],imports:0,commits:0,audio:[],removed:0,sourceRows:rows,seq:0,
   resources:[{resourceId:'m1',durationSeconds:duration}]};
  const draft={meta:async()=>({fps}),clips:async()=>w.clips.map(c=>({...c})),
   removeClips:async cs=>{w.removed+=cs.length;const ids=new Set(cs.map(c=>c.clipId));w.clips=w.clips.filter(c=>!ids.has(c.clipId));},
   rangeAtFrames:async(s,e)=>({s,e}),
   overlayResource:async({resource,over})=>{const s=overlayAt0?0:over.s;w.clips.push({clipId:'a'+(++w.seq),trackKind:'audio',resourceId:resource.id,startFrame:s,endFrame:s+over.e-over.s});},
   moveOverlayClip:async({clip,startFrame})=>{const c=w.clips.find(x=>x.clipId===clip.clipId),len=c.endFrame-c.startFrame;c.startFrame=startFrame;c.endFrame=startFrame+len;},
   setClipAudio:async({clip,volumeDb,fadeInSeconds,fadeOutSeconds})=>{w.audio.push({clipId:clip.clipId,volumeDb,fadeInSeconds,fadeOutSeconds});},
   commitAll:async()=>{w.commits++;}};
  w.selects={
   files:{environment:async()=>({platform:'darwin',homedir:'/mnt/audio'}),exists:async p=>files.includes(p)},
   project:()=>({meta:async()=>({draftIds:['d1','d2']}),resource:id=>({id}),resources:async()=>w.resources,
    sourceFiles:async()=>({fileTree:[{type:'dir',children:w.sourceRows}]}),
    importFiles:async({paths})=>{w.imports++;w.sourceRows.push({type:'file',path:paths[0],resourceId:'m1'});return {addedResourceIds:['m1']};}}),
   draft:()=>draft};
  return w;
 }
 const place=(w,seconds=10)=>exec(api.musicPlaceScript('p','d1','m1',seconds),w.selects);
 const importMusic=(w,file='/music/bed.mp3')=>exec(api.musicImportScript('p',file),w.selects);

 await t.test('the template stores an optional music path in the editor and in pack JSON',()=>{
  assert.equal(api.musicPath(template()),'','templates without music have no path');
  const withMusic=template();withMusic.logo.mode='none';withMusic.logo.image='';withMusic.music={path:'/music/bed.mp3'};
  assert.equal(api.validateTemplate(structuredClone(withMusic)).music.path,'/music/bed.mp3');
  assert.equal(api.portableTemplate(withMusic).music.path,'/music/bed.mp3','shared templates keep the music path');
  for(const bad of [null,'x',{path:5},{path:'a\nb'},{path:'x'.repeat(1025)}])assert.throws(()=>api.validateTemplate({...structuredClone(template()),music:bad}),/music/i);
  const emptied=template();emptied.music={path:'  '};assert.equal(api.cleanTemplate(emptied).music,undefined,'an emptied path removes the section');
  const padded=template();padded.music={path:' /music/bed.mp3 ',extra:1};assert.deepEqual(api.cleanTemplate(padded).music,{path:'/music/bed.mp3'});
  for(const id of ['health','parenting','heukbaek','jeongjwippul','panilgi'])assert.equal(pack(id).music,undefined,id+' ships without a music path');
 });
 await t.test('the volume is the jude-kinetic-style music level',()=>{
  const jude=fs.readFileSync(path.join(__dirname,'../../jude-kinetic-style/panel.tsx'),'utf8');
  assert.equal(api.MUSIC_LEVEL_DB,Number(/levelDb:(-?\d+(?:\.\d+)?)/.exec(jude)[1]));
  assert.ok(api.MUSIC_LEVEL_DB<0);
 });
 await t.test('a missing file is reported without importing anything',async()=>{
  const w=world({files:[]});
  assert.deepEqual(await importMusic(w),{status:'missing',path:'/music/bed.mp3'});
  assert.equal(w.imports,0);
 });
 await t.test('the file is imported once and later lookups find the same resource by path',async()=>{
  const w=world();
  const first=await importMusic(w);assert.equal(first.status,'ready');assert.equal(first.resourceId,'m1');assert.equal(first.durationSeconds,10);
  const again=await importMusic(w);assert.equal(again.resourceId,'m1');assert.equal(w.imports,1,'a resumed or retried run reuses the project resource');
 });
 await t.test('~/ paths resolve against the home directory',async()=>{
  const w=world({files:['/mnt/audio/Music/bed.mp3']});
  assert.equal((await importMusic(w,'~/Music/bed.mp3')).path,'/mnt/audio/Music/bed.mp3');
 });
 await t.test('a longer music file is trimmed to the Draft with the fixed level and a fade-out',async()=>{
  const w=world({mainEnd:300});
  assert.deepEqual(await place(w,30),{segments:1,placed:true});
  const music=w.clips.filter(c=>c.trackKind==='audio');
  assert.equal(music.length,1);assert.deepEqual([music[0].startFrame,music[0].endFrame],[0,300]);
  assert.equal(w.audio.length,1);assert.equal(w.audio[0].volumeDb,api.MUSIC_LEVEL_DB);assert.equal(w.audio[0].fadeOutSeconds,api.MUSIC_FADE_OUT_SECONDS);
  assert.equal(w.commits,1);
 });
 await t.test('a shorter music file repeats until the Draft ends',async()=>{
  const w=world({mainEnd:750});// 25 s at 30 fps, 10 s track
  assert.equal((await place(w,10)).segments,3);
  const music=w.clips.filter(c=>c.trackKind==='audio').sort((a,b)=>a.startFrame-b.startFrame).map(c=>[c.startFrame,c.endFrame]);
  assert.deepEqual(music,[[0,300],[300,600],[600,750]]);
  assert.ok(w.audio.every(a=>a.volumeDb===api.MUSIC_LEVEL_DB));
  assert.deepEqual(w.audio.map(a=>a.fadeOutSeconds),[0,0,api.MUSIC_FADE_OUT_SECONDS],'only the last repeat fades out');
 });
 await t.test('a host that places overlays at the start is corrected by moving them',async()=>{
  const w=world({mainEnd:450,overlayAt0:true});
  await place(w,10);
  assert.deepEqual(w.clips.filter(c=>c.trackKind==='audio').map(c=>[c.startFrame,c.endFrame]).sort((a,b)=>a[0]-b[0]),[[0,300],[300,450]]);
 });
 await t.test('placing again never adds a second music layer',async()=>{
  const w=world({mainEnd:750});
  await place(w,10);const before=JSON.stringify(w.clips),commits=w.commits;
  assert.deepEqual(await place(w,10),{segments:3,placed:false});
  assert.equal(JSON.stringify(w.clips),before);assert.equal(w.commits,commits);assert.equal(w.audio.length,3,'volume is not reapplied or duplicated');
  // A Draft whose length changed gets exactly one new layout.
  w.clips.find(c=>c.trackKind==='main').endFrame=450;
  assert.equal((await place(w,10)).placed,true);
  assert.deepEqual(w.clips.filter(c=>c.trackKind==='audio').map(c=>[c.startFrame,c.endFrame]).sort((a,b)=>a[0]-b[0]),[[0,300],[300,450]]);
 });
 await t.test('after the path changes, placing again leaves one music layer',async()=>{
  // An earlier run placed 'm0' (the old path); the template now points at a file imported as 'm1'.
  const w=world({mainEnd:750});
  w.clips.push({clipId:'old1',trackKind:'audio',resourceId:'m0',startFrame:0,endFrame:600},{clipId:'old2',trackKind:'audio',resourceId:'m0',startFrame:600,endFrame:750});
  assert.deepEqual(await exec(api.musicPlaceScript('p','d1','m1',10,['m0']),w.selects),{segments:3,placed:true});
  const music=w.clips.filter(c=>c.trackKind==='audio');
  assert.ok(music.every(c=>c.resourceId==='m1'),'the old music is removed');
  assert.deepEqual(music.map(c=>[c.startFrame,c.endFrame]).sort((a,b)=>a[0]-b[0]),[[0,300],[300,600],[600,750]]);
  // Running again with the same record changes nothing.
  const before=JSON.stringify(w.clips),commits=w.commits;
  assert.deepEqual(await exec(api.musicPlaceScript('p','d1','m1',10,['m0']),w.selects),{segments:3,placed:false});
  assert.equal(JSON.stringify(w.clips),before);assert.equal(w.commits,commits);
  // The current resource is never treated as stale, and other audio is kept.
  w.clips.push({clipId:'sfx',trackKind:'audio',resourceId:'sfx',startFrame:10,endFrame:40});
  assert.deepEqual(await exec(api.musicPlaceScript('p','d1','m1',10,['m1']),w.selects),{segments:3,placed:false});
  assert.ok(w.clips.some(c=>c.clipId==='sfx'));
 });
 await t.test('other audio and the dialogue are left alone',async()=>{
  const w=world({mainEnd:300});w.clips.push({clipId:'other',trackKind:'audio',resourceId:'sfx',startFrame:10,endFrame:40});
  await place(w,30);
  assert.ok(w.clips.some(c=>c.clipId==='other'));assert.ok(w.clips.some(c=>c.clipId==='v1'));
 });
 await t.test('a Draft outside the project is refused and an empty Draft gets nothing',async()=>{
  const w=world();await assert.rejects(exec(api.musicPlaceScript('p','other','m1',10),w.selects),/mismatch/);
  const empty=world({mainEnd:0});assert.deepEqual(await place(empty,10),{segments:0,placed:false});
 });
 await t.test('generation imports once per run, places music after framing, and only for templates with a path',()=>{
  const run=source.slice(source.indexOf('async function run(resume'));
  const block=run.slice(run.indexOf('const musicFile = musicPath(tpl)'));
  assert.ok(run.indexOf('await mark("reframing-done")')>0&&run.indexOf('await mark("reframing-done")')<run.indexOf('const musicFile = musicPath(tpl)'),'after framing');
  assert.match(block,/^const musicFile = musicPath\(tpl\);\n\s*if \(musicFile\) \{/,'templates without a path skip music entirely');
  assert.equal((block.match(/musicImportScript\(/g)||[]).length>=1,true);
  const loop=block.slice(block.indexOf('for (let i'),block.indexOf('const musicWarning'));
  assert.equal((loop.match(/musicImportScript\(/g)||[]).length,1);assert.match(loop,/music = music \|\| await script\(musicImportScript/,'one import shared by every clip');
  assert.match(block,/S\.musicMissing\(/);assert.match(block,/persist\(\{ built: made, musicWarning \}\)/);
 });
 await t.test('warnings and editor labels exist in both languages',()=>{
  for(const lang of ['en','ko']){
   const S=api.STRINGS[lang];
   for(const key of ['music','musicPath','musicHint'])assert.equal(typeof S[key],'string',lang+'.'+key);
   assert.match(S.musicMissing('/x.mp3'),/\/x\.mp3/);assert.match(S.musicImportFailed('/x.mp3'),/\/x\.mp3/);assert.match(S.musicTooShort('/x.mp3'),/\/x\.mp3/);assert.match(S.musicFailed(2,'why'),/why/);
  }
  assert.notEqual(api.STRINGS.ko.musicMissing('/x.mp3'),api.STRINGS.en.musicMissing('/x.mp3'));
 });
});
