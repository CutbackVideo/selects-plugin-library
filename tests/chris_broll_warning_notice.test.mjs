import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{loadPanelModule,disposePanelModule}from'./panel_module_fixture.mjs';
const source=fs.readFileSync(new URL('../plugins/chris-williamson-style/panel.tsx',import.meta.url),'utf8');
const corpus=JSON.parse(fs.readFileSync(new URL('./fixtures/chris-warning-once.json',import.meta.url),'utf8')).warnings;
const report=()=>({draftId:'saved-draft',jobDir:'/fixture/chris-once',warnings:[...corpus]});
const fallback={en:'kept the speaker',ko:'\ud654\uc790\ub97c \uc720\uc9c0'};
function fixture(t){const api=loadPanelModule(source,{names:['templateIssueNotice','notifyTemplateIssues']});t.after(()=>disposePanelModule(api));return api;}
for(const language of['en','ko'])test('actual eleven-warning corpus exposes final B-roll fallback alongside contrast and framing: '+language,t=>{
 const api=fixture(t),input=report(),before=JSON.stringify(input),notice=api.templateIssueNotice(input,language);
 assert.equal(notice.warningCount,11);assert.ok(notice.message.includes(fallback[language]));
 assert.ok(notice.message.includes(language==='en'?'Captions:':'\uc790\ub9c9'));assert.ok(notice.message.includes(language==='en'?'Framing:':'\ud654\uba74'));
 assert.ok(notice.message.endsWith(input.jobDir+'/report.json'));assert.ok(notice.message.length<=480);assert.equal(JSON.stringify(input),before);
});
test('the real producer warning alone is sufficient; longestSpeaker counts are not required',t=>{
 const api=fixture(t),warnings=['The speaker stays on screen for 9.2 s without B-roll at one point; no usable picture was found there.'];
 for(const language of['en','ko']){const notice=api.templateIssueNotice({warnings},language);assert.equal(notice.warningCount,1);assert.ok(notice.message.includes(fallback[language]));}
});
test('black lead-in and review failure retain their original ordering and fallback is never hidden',t=>{
 const api=fixture(t),kept=corpus[0];
 const black=api.templateIssueNotice({warnings:['Final B-roll crop rejected: first frame is black.',kept]},'en').message;
 assert.ok(black.includes('trim the black lead-in'));assert.ok(black.includes(fallback.en));assert.ok(black.indexOf('trim the black lead-in')<black.indexOf(fallback.en));assert.ok(!black.includes('review failed'));
 const rejected=api.templateIssueNotice({warnings:['Final B-roll crop rejected: weak frame.',kept]},'en').message;
 assert.ok(rejected.includes('review failed'));assert.ok(rejected.includes(fallback.en));assert.ok(rejected.indexOf('review failed')<rejected.indexOf(fallback.en));
});
test('the complete warning set stays within480 and uses the existing location fallback without truncation',t=>{
 const api=fixture(t),warnings=['Final B-roll crop rejected: black frame.',...corpus];
 for(const language of['en','ko'])for(const length of[0,80,240,500,2000]){const path='/fixture'+(length?'/'+ 'x'.repeat(length):''),notice=api.templateIssueNotice({warnings,jobDir:path},language);assert.equal(notice.warningCount,12);assert.ok(notice.message.length<=480);assert.ok(notice.message.includes(fallback[language]));assert.ok(notice.message.endsWith(path+'/report.json')||notice.message.endsWith(language==='en'?'report.json in the template data folder':'\ud15c\ud50c\ub9bf \ub370\uc774\ud130 \ud3f4\ub354\uc758 report.json'));}
});
test('unrelated warnings do not invent missing B-roll, while the full report remains available',t=>{
 const api=fixture(t);for(const warnings of[['Audio needs manual review.'],['B-roll review succeeded.']]){
  const notice=api.templateIssueNotice({warnings},'en');assert.equal(notice.warningCount,1);assert.ok(!notice.message.includes(fallback.en));assert.ok(notice.message.includes('full report')||notice.message.includes('Full report'));
 }
});
test('no real warnings retain the no-dialog path, and a dismissed eleven-warning notice preserves the saved result',async t=>{
 const api=fixture(t),calls=[],sdk={confirm:async notice=>{calls.push(notice);return false;}};
 for(const warnings of[[],['','  ',null,12],['Measured approximation; exact reference font is unconfirmed.']]){const r=await api.notifyTemplateIssues(sdk,{language:'en'},{warnings,draftId:'saved'});assert.equal(r.shown,false);assert.equal(r.warningCount,0);}
 assert.equal(calls.length,0);const input=report(),before=JSON.stringify(input),result=await api.notifyTemplateIssues(sdk,{language:'ko-KR'},input);assert.equal(calls.length,1);assert.ok(calls[0].message.includes(fallback.ko));assert.equal(result.warningCount,11);assert.equal(result.acknowledged,false);assert.equal(input.draftId,'saved-draft');assert.equal(JSON.stringify(input),before);
});

for(const warning of[corpus[0].replace('kept the speaker.','kept the existing cutaway when available.'),'No visually accepted candidate','Video is shorter than its planned cutaway','Final B-roll crop could not be verified; omitted b1'])test('known final-unavailable producer preserves neutral retained-footage meaning: '+warning,t=>{
 const api=fixture(t);for(const language of['en','ko']){const notice=api.templateIssueNotice({warnings:[warning],jobDir:'/fixture/job'},language);assert.equal(notice.warningCount,1);assert.ok(notice.message.includes(language==='en'?'retained footage':'\uAE30\uC874 \uC7A5\uBA74'));assert.ok(!notice.message.includes(fallback[language]));assert.ok(notice.message.length<=480);}
});
test('recovered search errors and successful licensed substitutions do not create a final-unavailable claim',t=>{
 const api=fixture(t);for(const warning of['B-roll search failed for “q”; trying credited Commons photographs: transient transport error','“q”: verified photograph substituted for moving footage.','“q”: source recorded; license not verified.','No usable picture for an unrelated UI chart.','Candidate review failed for a different feature']){
  const message=api.templateIssueNotice({warnings:[warning]},'en').message;assert.ok(!message.includes('no verified replacement'));assert.ok(!message.includes(fallback.en));assert.ok(!message.includes('B-roll review failed'));
 }
});
