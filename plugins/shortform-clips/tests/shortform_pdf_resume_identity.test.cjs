'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('PDF Resume refreshes app-scoped aliases without regenerating paid media',{skip:!modules},async()=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {preparePdfNarration,sceneInputOptions};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const document={pages:[{page:1,path:'/paper.png'}]},carrierPath='/run/pdf-narration-run1.mp4';
 let state={id:'run1',projectId:'p',pdfInput:{},pdfVoiceId:'voice',pdfNarration:{title:'News',sections:[{page:1,headline:'Headline',sourceQuote:'Evidence',narration:'Hello.',focus:'headline'}]},pdfTts:{state:'imported',text:'Hello.',workflowId:'wf',resourceId:'r30',durationSeconds:.6},pdfWords:[[0,.6,'Hello.']],pdfCarrier:{resourceId:'r40',name:'pdf-narration-run1.mp4',path:carrierPath},pdfPages:[{page:1,resourceId:'r0'}]};
 let ttsReads=0,sourceReads=0;
 const selects={
  narration:{job:id=>{assert.equal(id,'wf');return {status:async()=>({status:'succeeded'}),result:async()=>{ttsReads++;return {resourceId:'r1',durationSeconds:.6};}};},generate:()=>assert.fail('must not regenerate paid narration')},
  project:id=>{assert.equal(id,'p');return {sourceFiles:async()=>{sourceReads++;return {fileTree:[{type:'dir',children:[{resourceId:'r2',path:carrierPath}]}]};},importFiles:()=>assert.fail('existing carrier must not be imported again')};},
  media:{startFFmpeg:()=>assert.fail('must not regenerate the carrier')}
 };
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const io={save:async patch=>{state={...state,...patch};},check:()=>{},pause:async()=>assert.fail('completed narration must not wait'),execute:code=>new AsyncFunction('selects',code)(selects),submit:()=>assert.fail('must not resubmit narration'),plan:()=>assert.fail('must not regenerate the script')};
 await mod.exports.preparePdfNarration(state,document,'/run',io);
 assert.equal(ttsReads,1);assert.equal(sourceReads,1);
 assert.equal(state.pdfTts.resourceId,'r1');assert.equal(state.pdfCarrier.resourceId,'r2');assert.equal(state.resourceId,'r2');
 assert.deepEqual(mod.exports.sceneInputOptions(state,'p','/runs').sourceResourceIds,['r2','r0']);
});
