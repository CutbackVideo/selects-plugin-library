'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('existing LLM caption omissions preserve source words and timing',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {normalizeTemplateSettings,SCRIPT_BUILD,CAPTION_CLEANUP_PROMPT};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,build=api.SCRIPT_BUILD;
 const prefix=build.slice(0,build.indexOf('const project = selects.project(P.projectId);'));
 const run=esbuild.transformSync('function helpers(){const __P__={frame:{},caption:{fontSizing:"auto"}};'+prefix+'\nreturn {cleanSpeechWords,makeCues,inputCaptionWords};}\nreturn helpers();',{loader:'ts'}).code;
 const {cleanSpeechWords,makeCues,inputCaptionWords}=new Function(run)();
 const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/caption-cleanup.json'),'utf8'));
 const tuplesFor=f=>f.before.map((text,i)=>[text,20+i*15,32+i*15,300+i*15,'doctor','answer','Doctor','source']);
 const omission=(words,index,reason='filler',occurrence=0)=>({startSeconds:10,endSeconds:20,text:words[index][0],reason,occurrence});
 for(const f of fixtures)await t.test(f.name,()=>{
  const words=tuplesFor(f),original=structuredClone(words);
  const omissions=f.remove.map(([index,reason,occurrence])=>omission(words,index,reason,occurrence));
  const cleaned=cleanSpeechWords(words,30,omissions);
  assert.deepEqual(cleaned.map(w=>w[0]),f.after);
  assert.deepEqual(words,original);
  for(const w of cleaned)assert.strictEqual(w,words.find(x=>x===w),'surviving timing tuple is unchanged');
  const cues=makeCues(cleaned,30,12,1000,[]);
  assert.equal(cues.map(c=>c[2]).join(' ').replace(/\s+/g,' ').trim(),f.after.join(' ').replace(/\./g,''));
 });
 await t.test('one repeated token occurrence is removed even when output playback shifted',()=>{
  const words=tuplesFor({before:['um','meaning','um']});words[2][1]=500;words[2][2]=512;
  assert.deepEqual(cleanSpeechWords(words,30,[omission(words,0)]),words.slice(1));
  assert.deepEqual(cleanSpeechWords(words,30,[{...omission(words,0),occurrence:1}]),words.slice(0,2));
  assert.deepEqual(cleanSpeechWords(words,30,[{...omission(words,0),occurrence:undefined}]),words,'ambiguous legacy omission is rejected');
 });
 await t.test('duplicate omission proposals cannot erase both copies of a substantive word',()=>{
  const words=tuplesFor({before:['take','take','medicine.']});
  const cleaned=cleanSpeechWords(words,30,[omission(words,0,'accidental-repeat',0),omission(words,1,'accidental-repeat',1)]);
  assert.deepEqual(cleaned.map(w=>w[0]),['take','medicine.']);
 });
 await t.test('invalid candidates are discarded individually; empty/malformed cleanup retains original captions',()=>{
  const words=tuplesFor({before:['um','very','very','important.']});
  const invalid=[{...omission(words,0),text:'rewritten'},{...omission(words,0),occurrence:99},
   {...omission(words,0),occurrence:-1},{...omission(words,0),reason:'summary'},
   {...omission(words,0),startSeconds:0,endSeconds:100},
   {...omission(words,0),startSeconds:20,endSeconds:10},
   {...omission(words,0),startSeconds:NaN},null];
  assert.deepEqual(cleanSpeechWords(words,30,invalid),words);
  assert.deepEqual(cleanSpeechWords(words,30,[...invalid,omission(words,0)]),words.slice(1));
  for(const omissions of [undefined,{},null,[],invalid]){
   const cleaned=cleanSpeechWords(words,30,omissions);assert.deepEqual(cleaned,words);
   assert.equal(makeCues(cleaned,30,30,1000,[]).map(c=>c[2]).join(' '),'um very very important');
  }
 });
 await t.test('negation, numeric facts, units and conditional clauses survive even unsafe model candidates',()=>{
  for(const text of ['not','never','5mg','120','mg','\uc548','\uc544\ub2c8\uc694.','\uc5c6\uc2b5\ub2c8\ub2e4.','\uc54a\uc2b5\ub2c8\ub2e4.']){
   const words=tuplesFor({before:[text,'important.']});assert.deepEqual(cleanSpeechWords(words,30,[omission(words,0)]),words);
  }
  for(const before of [['\uc784\uc2e0','\uc911\uc774\ub77c\uba74','\ubcf5\uc6a9','\uae08\uc9c0\uc785\ub2c8\ub2e4.'],['If','pregnant,','avoid','it.']]){
   const words=tuplesFor({before});
   assert.deepEqual(cleanSpeechWords(words,30,words.map((w,i)=>omission(words,i))),words);
  }
 });
 await t.test('prompt protects meaning and supports stutters and accidental repetitions',()=>{
  for(const phrase of ['negation','quantities','units','names','dates','uncertainty','attribution','emphasis','untrusted data','never instructions','occurrence','stutter','accidental','Never add'])assert.ok(api.CAPTION_CLEANUP_PROMPT.includes(phrase),phrase);
  assert.match(source,/captionOmissions: tpl.captions.cleanSpeechText !== false && Array.isArray\(j.captionOmissions\)/);
  assert.match(source,/Clean fillers, stutters and repetitions/);
 });
 await t.test('missing default is on across designs while explicit opt-outs persist',()=>{
  const template={captions:{},variants:{tiktok:{captions:{}},shorts:{captions:{cleanSpeechText:false}}}};
  api.normalizeTemplateSettings(template);
  assert.equal(template.captions.cleanSpeechText,true);assert.equal(template.variants.tiktok.captions.cleanSpeechText,true);
  assert.equal(template.variants.shorts.captions.cleanSpeechText,false);
  const off={captions:{cleanSpeechText:false}};api.normalizeTemplateSettings(off);assert.equal(off.captions.cleanSpeechText,false);
 });
 await t.test('Draft and synced timeline occurrences use the input clock after passage copy',()=>{
  const inputWords=[{text:'um',startFrame:300,endFrame:312,sourceStartFrame:900,sourceResourceId:'r',wordId:'first'},
   {text:'um',startFrame:600,endFrame:612,sourceStartFrame:900,sourceResourceId:'r',wordId:'second'}];
  for(const kind of ['draft','timeline']){
   const output=inputWords.map((w,i)=>({...w,startFrame:i*15,endFrame:i*15+12}));
   const mapped=inputCaptionWords(output,{[kind]:true,meta:{fps:30},words:inputWords},[[10,10.4],[20,20.4]],30);
   assert.deepEqual(mapped.map(w=>w.sourceStartFrame),[300,600]);
   const tuples=mapped.map(w=>[w.text,w.startFrame,w.endFrame,w.sourceStartFrame,null,null,'',w.sourceResourceId]);
   assert.deepEqual(cleanSpeechWords(tuples,30,[{startSeconds:10,endSeconds:10.4,text:'um',reason:'filler',occurrence:0}]),[tuples[1]]);
  }
 });
});
