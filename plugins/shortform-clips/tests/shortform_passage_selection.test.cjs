'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('passage selection requests distinct source intervals with a maximum count',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json'));
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 const start=source.indexOf('  async function choose('),end=source.indexOf('\n  }',start)+4;
 const mod={exports:{}};
 const code=`const S={},nameOf=()=> 'Test',CLIP_SCORE_PROMPT='',CAPTION_CLEANUP_PROMPT='caption cleanup',extractJson=JSON.parse,clipAssessment=x=>x;${source.slice(start,end)}\nexport {choose};`;
 new Function('module','exports',dep('esbuild').transformSync(code,{loader:'ts',format:'cjs'}).code)(mod,mod.exports);
 const template={prompt:{},captions:{cleanSpeechText:true}};
 const clip=(...segments)=>({headline1:'Title',segments});
 async function run(responses,count=2,mode='manual'){
  const prompts=[];
  const result=await mod.exports.choose(template,'Video',[],100,mode,count,'',async r=>{
   prompts.push(r.prompt);const response=responses[prompts.length-1];
   if(response instanceof Error)throw response;
   assert.ok(response,'unexpected additional request');return {text:JSON.stringify(response)};
  });return {result,prompts};
 }
 await t.test('manual count is a ceiling and a smaller selection succeeds in one call',async()=>{
  const {result,prompts}=await run([{clips:[clip([0,10]),clip([10,20])],countReason:'Two complete topics'}],5);
  assert.equal(result.clips.length,2);assert.equal(result.recommendedCount,2);
  assert.equal(result.countReason,'Two complete topics');assert.equal(prompts.length,1);
  assert.match(prompts[0],/up to 5/);assert.match(prompts[0],/maximum, not a quota/);
 });
 await t.test('prompt instructs non-overlap without silently removing returned clips',async()=>{
  const candidates=[clip([0,10]),clip([5,15]),clip([20,30])];
  const {result,prompts}=await run([{clips:candidates}]);
  assert.deepEqual(result.clips.map(c=>c.segments),candidates.map(c=>c.segments));
  assert.match(prompts[0],/No segment may overlap/);
  assert.equal(prompts.length,1);
 });
 await t.test('zero usable clips returns an empty result without retries or count errors',async()=>{
  const {result,prompts}=await run([{clips:[]}],5);
  assert.equal(result.clips.length,0);assert.equal(prompts.length,1);
  assert.match(source,/if \(!pickd.clips.length\) \{\s*await persist\(\{choice:pickd,done:true\}\)/);
 });
 await t.test('malformed cleanup cannot fail valid passage selection and opt-out ignores omissions',async()=>{
  for(const captionOmissions of [undefined,null,{},'bad',[null,{text:'missing location'}]]){
   const {result}=await run([{clips:[clip([0,10])],captionOmissions}]);
   assert.equal(result.clips.length,1);assert.deepEqual(result.captionOmissions,[]);
  }
  const omission={startSeconds:0,endSeconds:2,text:'um',occurrence:0,reason:'filler'};
  let result=await mod.exports.choose(template,'Video',[[0,2,'um hello']],100,'manual',1,'',async()=>({text:JSON.stringify({clips:[clip([0,10])],captionOmissions:[omission,{...omission,endSeconds:3}]})}));
  assert.deepEqual(result.captionOmissions,[omission]);
  result=await mod.exports.choose({...template,captions:{cleanSpeechText:false}},'Video',[[0,2,'um hello']],100,'manual',1,'',async()=>({text:JSON.stringify({clips:[clip([0,10])],captionOmissions:[omission]})}));
  assert.deepEqual(result.captionOmissions,[]);
 });
 await t.test('transport failures are not disguised as a valid empty selection',async()=>{
  await assert.rejects(run([new Error('Cancelled')]),/Cancelled/);
 });
});
