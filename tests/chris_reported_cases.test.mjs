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
test('fractional-rate phrases preserve exact half-open asset time, including a sub-0.2 second phrase',()=>{
 const fps=30000/1001,short={...cue,start:300,end:303};
 const observed=phraseBackdrop(short,brolls,assets,fps);assert.equal(observed.startSeconds,60/fps);assert.equal(observed.seconds,3/fps);
 const begin=pipeline.indexOf('async function measureBand('),end=pipeline.indexOf('// Reuse the measured band',begin),calls=[];
 const measure=vm.runInNewContext(stripTypeScriptTypes(pipeline.slice(begin,end))+';measureBand;',{ffmpegRun:async args=>{calls.push(plain(args));return {stderr:'lavfi.signalstats.YAVG=220\nlavfi.signalstats.SATAVG=0'};}});
 return measure({},'/owned',observed.path,observed.seconds,'short',observed.startSeconds).then(()=>{
  const args=calls[0];assert.equal(args[args.indexOf('-ss')+1],observed.startSeconds.toFixed(6));assert.equal(args[args.indexOf('-t')+1],observed.seconds.toFixed(6));
 });
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
