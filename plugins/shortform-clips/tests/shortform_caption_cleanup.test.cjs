'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('existing LLM caption omissions preserve source words and timing',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {normalizeTemplateSettings,SCRIPT_BUILD,SCRIPT_TRANSCRIPT,CAPTION_CLEANUP_PROMPT};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,build=api.SCRIPT_BUILD;
 const prefix=build.slice(0,build.indexOf('const project = selects.project(P.projectId);'));
 const run=esbuild.transformSync('function helpers(){const __P__={frame:{},caption:{fontSizing:"auto"}};'+prefix+'\nreturn {cleanSpeechWords,makeCues,inputCaptionWords,transcriptLines};}\nreturn helpers();',{loader:'ts'}).code;
 const {cleanSpeechWords:rawClean,makeCues,inputCaptionWords,transcriptLines}=new Function(run)();
 // Legacy fixtures place every word in the single transcript line [10, 20].
 const cleanSpeechWords=(words,fps,omissions,lines)=>rawClean(words,fps,omissions,lines??[{startSeconds:10,endSeconds:20,from:0,to:Array.isArray(words)?words.length:0}]);
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
 await t.test('a one-word line whose window rounds to zero length can still lose its filler',()=>{
  // Real transcript: "[319.5-319.5] \uc74c." between two sentences.
  const words=tuplesFor({before:['\uadf8\uac70\ub97c','\uba39\uc5c8\uc5b4\uc694.','\uc74c.','\uc774\uc0c1\ud558\uc8e0.']});
  const lines=[{startSeconds:10,endSeconds:12,from:0,to:2},{startSeconds:12.5,endSeconds:12.5,from:2,to:3},{startSeconds:13,endSeconds:14,from:3,to:4}];
  const zero={startSeconds:12.5,endSeconds:12.5,text:'\uc74c.',reason:'filler',occurrence:0};
  assert.deepEqual(cleanSpeechWords(words,30,[zero],lines).map(w=>w[0]),['\uadf8\uac70\ub97c','\uba39\uc5c8\uc5b4\uc694.','\uc774\uc0c1\ud558\uc8e0.']);
  assert.deepEqual(cleanSpeechWords(words,30,[{...zero,endSeconds:12.4}],lines),words,'a reversed window is still rejected');
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
  // Korean hesitation words are listed for recall, with meaningful demonstrative and pronoun uses kept.
  for(const phrase of ['every transcript line inside your selected segments','\uc5b4, \uc74c, \uadf8, \uc800, \ubb50','Keep them when they carry meaning','\uc800 meaning I/me','\uadf8 \uc57d\uc740 \uba39\uc73c\uba74','\uadf8 \ucfe0\ud06c\ub2e4\uc2a4\ub098'])assert.ok(api.CAPTION_CLEANUP_PROMPT.includes(phrase),phrase);
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
   assert.deepEqual(cleanSpeechWords(tuples,30,[{startSeconds:10,endSeconds:20.4,text:'um',reason:'filler',occurrence:0}],[{startSeconds:10,endSeconds:20.4,from:0,to:2}]),[tuples[1]]);
  }
 });

 await t.test('occurrence counts inside the transcript line the model saw, even when word times round differently',()=>{
  // Line start 2/30s rounds to 0.1 while the second word (12/30s) starts after the rounded window start.
  const inputWords=[['\uadf8',2,8],['\uadf8',12,20],['\uc57d\uc740',24,30],['\ud6a8\uacfc\uac00',34,40],['\uc788\uc5b4\uc694.',44,48]]
   .map(([text,startFrame,endFrame])=>({text,startFrame,endFrame}));
  const [line]=transcriptLines(inputWords,30);
  assert.deepEqual([line.startSeconds,line.endSeconds],[0.1,1.6]);
  const tuples=line.words.map(w=>[w.text,w.startFrame,w.endFrame,w.startFrame,null,null,'','r']);
  const lines=[{startSeconds:line.startSeconds,endSeconds:line.endSeconds,from:0,to:tuples.length}];
  const cleaned=rawClean(tuples,30,[{startSeconds:0.1,endSeconds:1.6,text:'\uadf8',occurrence:0,reason:'accidental-repeat'}],lines);
  assert.deepEqual(cleaned,tuples.slice(1));
  assert.deepEqual(rawClean(tuples,30,[{startSeconds:0.1,endSeconds:1.5,text:'\uadf8',occurrence:0,reason:'accidental-repeat'}],lines),tuples,'a window that is not a transcript line is rejected');
 });
 await t.test('occurrence is scoped to its own transcript line',()=>{
  const words=['\uadf8','\ub124.','\uadf8','\uadf8','\uc57d\uc774\uc5d0\uc694.'].map((text,i)=>({text,startFrame:i*30,endFrame:i*30+20}));
  const lines=transcriptLines(words,30);
  assert.equal(lines.length,2);
  const tuples=lines.flatMap(l=>l.words).map(w=>[w.text,w.startFrame,w.endFrame,w.startFrame,null,null,'','r']);
  const meta=lines.map((l,i)=>({startSeconds:l.startSeconds,endSeconds:l.endSeconds,from:i?2:0,to:i?5:2}));
  const cleaned=rawClean(tuples,30,[{...meta[1],text:'\uadf8',occurrence:0,reason:'accidental-repeat'}],meta);
  assert.deepEqual(cleaned.map(w=>w[0]),['\uadf8','\ub124.','\uadf8','\uc57d\uc774\uc5d0\uc694.']);
  assert.strictEqual(cleaned[0],tuples[0],'the earlier line is untouched');
 });
 await t.test('transcript text and caption cleanup share one line builder',()=>{
  const transcript=api.SCRIPT_TRANSCRIPT.slice(api.SCRIPT_TRANSCRIPT.indexOf('// run_script body'));
  assert.match(transcript,/transcriptLines\(words, m\.fps\)/);
  assert.doesNotMatch(transcript,/lines\.push\(cur\)/);
 });

 await t.test('transcript-only sources (no analysis metadata) still map output words to input words',()=>{
  // readClipSource() words carry only text and frames: no sourceStartFrame, sourceResourceId or wordId.
  const inputWords=[{text:'\uc74c,',startFrame:300,endFrame:312},{text:'\uc911\uc694\ud55c',startFrame:320,endFrame:340},{text:'\ub0b4\uc6a9\uc785\ub2c8\ub2e4.',startFrame:345,endFrame:370}];
  const input={timeline:true,draft:null,resourceId:'r',meta:{fps:30},words:inputWords};
  const output=inputWords.map((w,i)=>({text:w.text,startFrame:i*15,endFrame:i*15+12,sourceStartFrame:w.startFrame,sourceResourceId:'r'}));
  const mapped=inputCaptionWords(output,input,[[10,12.4]],30);
  assert.deepEqual(mapped.map(w=>w.sourceStartFrame),[300,320,345]);
  const [line]=transcriptLines(inputWords,30);
  const tuples=line.words.map(w=>[w.text,w.startFrame,w.endFrame,w.startFrame,null,null,'','r']);
  const cleaned=rawClean(tuples,30,[{startSeconds:line.startSeconds,endSeconds:line.endSeconds,text:'\uc74c,',occurrence:0,reason:'filler'}],[{startSeconds:line.startSeconds,endSeconds:line.endSeconds,from:0,to:3}]);
  const omitted=tuples.filter(w=>!cleaned.includes(w));
  const kept=mapped.filter(w=>!omitted.some(o=>w.sourceStartFrame!=null&&Math.abs(w.sourceStartFrame-o[3])<.01&&w.text===o[0]));
  assert.deepEqual(kept.map(w=>w.text),['\uc911\uc694\ud55c','\ub0b4\uc6a9\uc785\ub2c8\ub2e4.']);
 });

 await t.test('only allow-listed fillers and adjacent repeats may be omitted; every other model proposal is discarded',()=>{
  const attempt=(before,index)=>{
   const words=tuplesFor({before});
   for(const reason of ['filler','stutter','accidental-repeat'])assert.deepEqual(cleanSpeechWords(words,30,[omission(words,index,reason)]),words,before[index]+' '+reason);
  };
  attempt(['\uc5f4\uc774','\ub098\uba74','\uc57d\uc744','\ub4dc\uc138\uc694.'],1);
  attempt(['\uba39\uc9c0','\ub9c8\uc138\uc694.'],1);
  attempt(['\ud558\ub8e8','\uc138','\ubc88','\ubcf5\uc6a9\ud569\ub2c8\ub2e4.'],1);
  attempt(['\uc774','\uc57d\uc740','\uc548','\uc804\ud569\ub2c8\ub2e4.'],2);
 });
 await t.test('standalone fillers on the short list are omitted, longer words are not',()=>{
  for(const filler of ['\uc5b4','\uc74c,','\uc73c\ud760','\uc544...','\uadf8','\uc800','\ubb50','um,','Uh']){
   const words=tuplesFor({before:[filler,'\uc911\uc694\ud569\ub2c8\ub2e4.']});
   assert.deepEqual(cleanSpeechWords(words,30,[omission(words,0)]),words.slice(1),filler);
  }
  const words=tuplesFor({before:['\uadf8\ub7ec\ub2c8\uae4c','\uc911\uc694\ud569\ub2c8\ub2e4.']});
  assert.deepEqual(cleanSpeechWords(words,30,[omission(words,0)]),words);
 });
 await t.test('unmarked prefixes and repeated numbers are kept; only exact repeats or marked stutters go',()=>{
  const keep=(before,index,occurrence=0)=>{
   const words=tuplesFor({before});
   for(const reason of ['filler','stutter','accidental-repeat'])assert.deepEqual(cleanSpeechWords(words,30,[omission(words,index,reason,occurrence)]),words,before.join(' ')+' '+reason);
  };
  keep(['\ud558\ub8e8','\uc138','\uc138\ud2b8','\uc6b4\ub3d9\ud558\uc138\uc694.'],1);
  keep(['\uc774\uac74','\uc548','\uc548\uc804\ud574\uc694.'],1);
  keep(['Take','5','50mg','tablets.'],1);
  keep(['5','5\uac1c'],0);
  keep(['5','5','\uac1c'],0);
  keep(['\uc548','\uc548\uc804\ud574\uc694.'],0);
  const second=tuplesFor({before:['\uc548','\uc548','\ub3fc\uc694.']});
  assert.deepEqual(cleanSpeechWords(second,30,[omission(second,0,'accidental-repeat',0)]).map(w=>w[0]),['\uc548','\ub3fc\uc694.']);
  const marked=tuplesFor({before:['\uadf8~','\uadf8\ub7ec\ub2c8\uae4c','\uc57d\uc740']});
  assert.deepEqual(cleanSpeechWords(marked,30,[omission(marked,0,'stutter')]).map(w=>w[0]),['\uadf8\ub7ec\ub2c8\uae4c','\uc57d\uc740']);
  const dash=tuplesFor({before:['\uadf8\u2013','\uadf8\ub7ec\ub2c8\uae4c','\uc57d\uc740']});
  assert.deepEqual(cleanSpeechWords(dash,30,[omission(dash,0,'stutter')]).map(w=>w[0]),['\uadf8\ub7ec\ub2c8\uae4c','\uc57d\uc740']);
 });
 await t.test('stutter fragments and adjacent repeats are omitted by position',()=>{
  const repeated=tuplesFor({before:['\uadf8','\uadf8','\uc57d\uc740','\uba39\uc73c\uba74','\uc548','\ub3fc\uc694.']});
  assert.deepEqual(cleanSpeechWords(repeated,30,[omission(repeated,0,'accidental-repeat',0)]).map(w=>w[0]),['\uadf8','\uc57d\uc740','\uba39\uc73c\uba74','\uc548','\ub3fc\uc694.']);
  const stutter=tuplesFor({before:['\uadf8-','\uadf8\ub7ec\ub2c8\uae4c','\uc57d\uc740']});
  assert.deepEqual(cleanSpeechWords(stutter,30,[omission(stutter,0,'stutter')]).map(w=>w[0]),['\uadf8\ub7ec\ub2c8\uae4c','\uc57d\uc740']);
  const apart=tuplesFor({before:['\ud6a8\uacfc','\uc57d\uc740','\ud6a8\uacfc','\uc788\uc5b4\uc694.']});
  assert.deepEqual(cleanSpeechWords(apart,30,[omission(apart,2,'accidental-repeat',1)]),apart,'a repeat must be adjacent');
 });
});
