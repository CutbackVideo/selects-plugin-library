import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const read=name=>fs.readFileSync(new URL('../plugins/chris-williamson-style/src/'+name,import.meta.url),'utf8');
const pipeline=read('pipeline.ts'),verification=read('verification.ts'),panel=read('panel.template.tsx');
const helperStart=pipeline.indexOf('export function phraseBackdrop('),helperEnd=pipeline.indexOf('async function inventory(');
const {phraseBackdrop,phraseColor}=vm.runInNewContext(stripTypeScriptTypes(pipeline.slice(helperStart,helperEnd).replace(/^export /gm,''))+';({phraseBackdrop,phraseColor})');
const {verificationFrames}=vm.runInNewContext(stripTypeScriptTypes(verification.slice(0,verification.indexOf('export async function verifyDraft(')).replace(/^export /gm,''))+';({verificationFrames})');
const plain=value=>JSON.parse(JSON.stringify(value));
const brolls=[{start:240,end:360,key:{start:240}}],assets=[{keyStart:240,path:'/verified/cutaway.mp4'}];
const cue={id:'phrase:300',kind:'phrase',start:300,end:330,text:'mission driven',wordStartsSeconds:[0,.1]};
function cueFixture(band,{rolls=brolls,media=assets,items={}}={}){
 const placed=[],measured=[],report={warnings:[]};
 const begin=pipeline.indexOf('  const placeCue=async(cue:Cue)=>{'),end=pipeline.indexOf('  for(const cue of cues)await placeCue(cue);',begin);
 const api=vm.runInNewContext(stripTypeScriptTypes(pipeline.slice(begin,end))+';placeCue;',{phraseBackdrop,phraseColor,state:{items},reel:{brolls:rolls},assets:media,fps:30,env:{},jobDir:'/owned',report,
  measureBand:async(...args)=>{measured.push(args);return band;},putGraphic:async(...args)=>placed.push(args),cueLabel:(id,text)=>id+text,CAPTIONS_TSX:'production-caption',fontCss:'',STYLE:{captions:{phrase:53,line:50}},CAPTION_V2_PARAMS:[],sizeOf:()=>150});
 return {run:()=>api(cue),placed,measured,report};
}
test('bright ordinary B-roll phrases change only fill; dark phrases keep the established white',async()=>{
 for(const [band,color] of [[{y:220,sat:0},'#111111'],[{y:40,sat:0},'#ffffff']]){
  const f=cueFixture(band);await f.run();const data=f.placed[0][6];
  assert.equal(data.color,color);assert.equal(data.fontSize,53);assert.equal(data.captionY,50);assert.equal(data.keyword,false);
  assert.deepEqual(plain(data.wordStartsSeconds),[0,.1]);assert.equal(data.dimSeconds,.1);assert.equal(data.dimOpacity,.55);
  assert.equal(f.report.warnings.length,0);
 }
});
test('phrase measurement follows the selected asset local seconds, not Draft seconds',async()=>{
 const f=cueFixture({y:220,sat:0});await f.run();
 assert.deepEqual(plain(f.measured[0].slice(2)),['/verified/cutaway.mp4',1,'phrase:300',2]);
 assert.deepEqual(plain(phraseBackdrop(cue,brolls,assets,30)),{path:'/verified/cutaway.mp4',startSeconds:2,seconds:1});
});
test('unknown or invalid band keeps the old fill and explicitly requests a saved-Draft review',async()=>{
 for(const band of [null,{y:NaN,sat:0},{y:Infinity,sat:0},{y:-1,sat:0},{y:256,sat:0}]){
  const f=cueFixture(band);await f.run();assert.equal(f.placed[0][6].color,'#ffffff');
  assert.match(f.report.warnings[0],/contrast could not be measured.*mission driven/);
 }
});
test('crossing a cutaway boundary cannot borrow one side as the entire phrase background',async()=>{
 const rolls=[{start:240,end:315,key:{start:240}},{start:315,end:360,key:{start:315}}],media=[...assets,{keyStart:315,path:'/verified/other.mp4'}];
 const f=cueFixture({y:220,sat:0},{rolls,media});await f.run();assert.equal(f.measured.length,0);assert.equal(f.placed[0][6].color,'#ffffff');assert.match(f.report.warnings[0],/crosses picture changes/);
});
test('speaker-only and resource keywords do not enter the ordinary phrase contrast probe',()=>{
 assert.equal(phraseBackdrop(cue,brolls,[],30),null);
 assert.equal(phraseBackdrop({...cue,kind:'keyword'},brolls,assets,30),null);
 assert.equal(phraseBackdrop(cue,brolls,assets,0),null);
});
test('fractional-rate phrases preserve exact half-open time while existing keyword probes retain two-decimal durations',async()=>{
 const fps=30000/1001,short={...cue,start:300,end:303};
 const observed=phraseBackdrop(short,brolls,assets,fps);assert.equal(observed.startSeconds,60/fps);assert.equal(observed.seconds,3/fps);
 const begin=pipeline.indexOf('async function measureBand('),end=pipeline.indexOf('// Reuse the measured band',begin),calls=[];
 const measure=vm.runInNewContext(stripTypeScriptTypes(pipeline.slice(begin,end))+';measureBand;',{ffmpegRun:async args=>{calls.push(plain(args));return {stderr:'lavfi.signalstats.YAVG=220\nlavfi.signalstats.SATAVG=0'};}});
 await measure({},'/owned',observed.path,observed.seconds,'short',observed.startSeconds);
 const args=calls[0];assert.equal(args[args.indexOf('-ss')+1],observed.startSeconds.toFixed(6));assert.equal(args[args.indexOf('-t')+1],observed.seconds.toFixed(6));
 for(const seconds of [0.05,1.237]){
  await measure({},'/owned','/verified/keyword.mp4',seconds,'keyword');
  const keyword=calls.at(-1);assert.equal(keyword.includes('-ss'),false);assert.equal(keyword[keyword.indexOf('-t')+1],Math.max(.2,seconds).toFixed(2));
 }
});
test('verification includes late fully revealed phrases instead of only the first phrase and keyword',()=>{
 const sample=verificationFrames([{kind:'phrase',start:0,end:80},{kind:'keyword',start:120,end:150},{kind:'phrase',start:627,end:642},{kind:'phrase',start:642,end:660}],[],714);
 assert.deepEqual(plain(sample.frames),[0,79,120,149,641,659]);assert.equal(sample.complete,true);
});
test('bounded sampling keeps the end of a long short and explicitly marks incomplete coverage',()=>{
 const cues=Array.from({length:100},(_,i)=>({kind:'phrase',start:i*10,end:i*10+10}));const sample=verificationFrames(cues,[],1000);
 assert.equal(sample.frames.length,64);assert.equal(sample.complete,false);assert.equal(sample.frames.at(-1),999);assert.equal(sample.requested,101);
});
test('completed panel result retains the saved Draft ID and exposes pipeline warnings',async()=>{
 const create=panel.slice(panel.indexOf('  async function create()'),panel.indexOf('  async function cancelFaces()'));
 const observed={},warnings=['B-roll search failed; kept the speaker.'];
 const fn=vm.runInNewContext(stripTypeScriptTypes(create)+';create;',{AbortController,projectId:'project',sequenceId:'draft',paths:{},setupIssue:'',locked:{current:false},observer:{current:null},mounted:{current:true},onScreen:{current:'another-draft'},faceJournal:{current:''},setBusy:()=>{},setError:()=>{},setResult:value=>{observed.result=value;},setPending:()=>{},setStatus:()=>{},setFaceActive:()=>{},ensureTranscript:async()=>{},panelEnv:()=>({}),runPipeline:async()=>({draftId:'saved-draft',warnings}),MUSIC:{levelDb:-20},sdk:{},S:[]});
 await fn();assert.equal(observed.result.id,'saved-draft');assert.deepEqual(plain(observed.result.warnings),warnings);assert.match(panel,/result\?\.warnings\?\.map/);
});
test('headless template result contract is unchanged and does not discard a saved Draft for warnings',()=>{
 const template=panel.slice(panel.indexOf('function TemplateRun('),panel.indexOf('/** A template run (`context.template`)'));
 assert.match(template,/finish\(\{ sequenceId: result\.draftId \}\)/);assert.doesNotMatch(template,/finish\(\{[^\n]*warnings/);
});

test('preserved completed phrase retains user edits without a new contrast probe or graphic write',async()=>{
 const f=cueFixture({y:220,sat:0},{items:{[cue.id]:{status:'applied',clipId:12}}});await f.run();
 assert.equal(f.measured.length,0);assert.equal(f.placed.length,0);assert.equal(f.report.warnings.length,0);
});

test('multiple saved contact sheets and an optional reference are identified by image names',async()=>{
 const verify=vm.runInNewContext(stripTypeScriptTypes(verification.replace(/^export /gm,''))+';verifyDraft;',{hostJoin:(...parts)=>parts.join('/'),parseJsonLoose:JSON.parse,reviewIssues:()=>[]});
 for(const withReference of [false,true]){
  let prompt,images;
  const env={pluginDir:'/owned',status:()=>{},imageData:async()=>{if(!withReference)throw Error('No reference');return 'controlled-reference';},
   runScript:async(script,summary)=>summary==='Read back the saved style'?{meta:{durationFrames:300},clips:[],graphics:[]}:{frames:JSON.parse(script.match(/frames:(\[[^\]]+\])/)[1]).map(frame=>({frame,hasSourceImage:true}))},
   capture:async(_id,frames)=>[{dataUrl:'controlled-result',name:'Original generic capture name'}],
   askAI:async(p,_timeout,supplied)=>{prompt=p;images=supplied;return '{"ok":true,"issues":[]}';}};
  const result=await verify(env,'project','draft',{items:{},cues:Array.from({length:12},(_,i)=>({kind:'phrase',start:i*20,end:i*20+20}))});
  assert.equal(result.visual.status,'passed');assert.equal(images.filter(image=>image.name.startsWith('Saved Draft frames ')).length,2);
  assert.equal(images.filter(image=>image.name.startsWith('Original reference:')).length,withReference?1:0);
  assert.match(prompt,/Every image named "Saved Draft frames/);assert.match(prompt,/contrast.*bright B-roll/);assert.match(prompt,/including the late phrases/);
  assert.doesNotMatch(prompt,/First image|second image/);
  assert.match(prompt,withReference?/Only the separately named "Original reference:/ : /No original reference image is supplied/);
 }
});

const captionSource=read('captions.tsx');
const outlineBegin=captionSource.indexOf('export function phraseOutline('),outlineEnd=captionSource.indexOf('// One independently editable',outlineBegin);
const {phraseOutline}=vm.runInNewContext(stripTypeScriptTypes(captionSource.slice(outlineBegin,outlineEnd).replace('export ',''))+';({phraseOutline})');
test('small phrases get an opposite-color edge without changing their fill, font, size, or timing',()=>{
 const light=plain(phraseOutline('#ffffff',53)),dark=plain(phraseOutline('#111111',53));
 assert.ok(Math.abs(parseFloat(light.WebkitTextStroke)-1.855)<1e-9);
 assert.ok(light.WebkitTextStroke.endsWith('px #111111'));
 assert.ok(dark.WebkitTextStroke.endsWith('px #ffffff'));
 assert.equal(light.paintOrder,'stroke fill');
 assert.deepEqual(Object.keys(light),['WebkitTextStroke','paintOrder']);
 assert.equal(phraseOutline('#ffffff',10).WebkitTextStroke,'0.75px #111111');
});
test('keyword rendering bypasses the phrase edge and retains the existing reveal implementation',()=>{
 assert.ok(captionSource.includes('data.keyword ? {} : phraseOutline('));
 assert.ok(captionSource.includes('const opacity = data.keyword ? 1 : age < 0 ? 0 :'));
 assert.ok(captionSource.includes('const size = Number(data.fontSize || 53) * scale;'));
});

const noticeStart=panel.indexOf('const RESULT_NOTICE_UI:'),noticeEnd=panel.indexOf('async function templatePaths(',noticeStart);
const {notifyTemplateIssues,templateIssueNotice}=vm.runInNewContext(stripTypeScriptTypes(panel.slice(noticeStart,noticeEnd).replaceAll('export ',''))+';({notifyTemplateIssues,templateIssueNotice})',{hostJoin:(...parts)=>parts.join('/')});
test('only actual saved-run warnings open a localized host notice; dismissal preserves the result and cannot retry generation',async()=>{
 const calls=[],report={draftId:'saved',warnings:['Final B-roll crop rejected: first frame is black.']};
 const result=await notifyTemplateIssues({confirm:async request=>{calls.push(plain(request));return false;}},{language:'ko'},report);
 assert.equal(result.shown,true);assert.equal(result.acknowledged,false);assert.equal(report.draftId,'saved');assert.equal(calls.length,1);
 assert.match(calls[0].title,/저장된 결과/);assert.match(calls[0].message,/검은 시작/);
 assert.equal((await notifyTemplateIssues({confirm:async()=>{throw Error('Should not run');}},{},{warnings:[]})).shown,false);
 assert.equal((await notifyTemplateIssues({}, {},report)).shown,false);
});

test('the host-limited notice contains complete next steps and the full report path within 500 characters',()=>{
 const r={jobDir:'/Users/mano/Documents/clip-highlights-analysis/repro-20261023/round3/caption/outputs/chris-williamson-style/runs/9b1c5341-mvklz701',warnings:['Final B-roll crop rejected: The first sampled crop is completely black. '+ 'Detailed original finding. '.repeat(20),"The phrase cannot be read because contrast is low.",'The speaker leans out of frame.']};
 for(const language of ['en','ko']){const notice=templateIssueNotice(r,language);assert.ok(notice.message.length<500);assert.ok(notice.message.endsWith(r.jobDir+'/report.json'));assert.equal(notice.warningCount,3);assert.ok(!notice.message.includes('Detailed original finding'));}assert.equal(r.warnings.length,3);
});
