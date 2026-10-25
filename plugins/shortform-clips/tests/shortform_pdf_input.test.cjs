'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createRequire}=require('node:module'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const modules=process.env.SBS_PANEL_TEST_MODULES;

function pdfFixture(){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R 6 0 R 7 0 R] /Count 5 >>'];
 for(const rotation of [0,90,180,270,0])objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Rotate '+rotation+' /Resources << /Font << /F1 8 0 R >> >> /Contents '+(objects.length===6?'10':'9')+' 0 R >>');
 objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 for(const body of ['BT /F1 24 Tf 50 720 Td (Test headline) Tj ET','0.2 0.3 0.5 rg 50 50 200 200 re f'])objects.push('<< /Length '+body.length+' >>\nstream\n'+body+'\nendstream');
 let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
 const x=Buffer.byteLength(pdf);pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF';return Buffer.from(pdf);
}

test('PDF source selection and preparation',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),mod={exports:{}};
 const source=await fs.readFile(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {savePdfInput,preparePdfInput,pdfPageImportScript,sceneInputOptions,PDF_MAX_BYTES};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,root=await fs.mkdtemp(path.join(os.tmpdir(),'shortform-pdf-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const files={size:async p=>(await fs.stat(p)).size,readFile:p=>fs.readFile(p),writeFile:(p,b)=>fs.writeFile(p,b),remove:p=>fs.unlink(p)};
 const store={fs:files,root,join:path.join,ensure:p=>fs.mkdir(p,{recursive:true}),exists:async p=>{try{await fs.access(p);return true;}catch{return false;}}};
 const original=path.join(root,"paper ' \ud55c\uae00.pdf");await fs.writeFile(original,pdfFixture());
 let input;
 await t.test('picker cancellation preserves selection and a project change cannot publish into the new form',async()=>{
  const start=source.indexOf('  async function choosePdf('),end=source.indexOf('\n  async function ensureOverlayAsset',start);
  const fn=esbuild.transformSync(source.slice(start,end),{loader:'ts'}).code;
  const saved=[],errors=[],selected=[];
  const env={projectId:'p1',pdfLock:{current:false},busy:false,IS_WIN:false,pdfRevision:{current:0},setPdfLoading:()=>{},setError:e=>errors.push(e),setPdfSelection:s=>selected.push(s),
   script:async()=>null,savePdfInput:async()=>({id:'copy'}),store:{put:async(...args)=>saved.push(args),del:async(...args)=>saved.push(args)}};
  const run=()=>new Function(...Object.keys(env),fn+';return choosePdf;')(...Object.values(env));
  await run()();assert.deepEqual(saved,[]);assert.deepEqual(selected,[]);assert.equal(env.pdfLock.current,false);
  env.script=async()=>'/picked.pdf';env.savePdfInput=async()=>{env.pdfRevision.current++;return{id:'copy'};};
  await run()();assert.equal(saved[0][1],'p1');assert.deepEqual(selected,[]);
  env.savePdfInput=async()=>{throw Error('Unreadable PDF');};await run()();assert.equal(errors.at(-1),'Unreadable PDF');assert.equal(env.pdfLock.current,false);
 });
 await t.test('retains exact PDF bytes after original removal and rejects non-PDF/oversized inputs before saving',async()=>{
  input=await api.savePdfInput(store,original);assert.equal(input.name,path.basename(original));
  assert.deepEqual(await fs.readFile(input.path),pdfFixture());await fs.unlink(original);
  assert.deepEqual(await api.savePdfInput(store,input.path),{...input,name:'source.pdf'});
  const bad=path.join(root,'fake.pdf');await fs.writeFile(bad,'not a document');await assert.rejects(api.savePdfInput(store,bad),/valid PDF/);
  await assert.rejects(api.savePdfInput({...store,fs:{...files,size:async()=>api.PDF_MAX_BYTES+1,readFile:()=>{throw Error('must not read');}}},bad),/128 MiB/);
 });
 let calls=0;
 const runShell=async command=>{calls++;try{const r=await promisify(execFile)('/bin/sh',['-c',command],{timeout:300000,maxBuffer:1024*1024});return {...r,exitCode:0};}catch(e){return {exitCode:e.code||1,stderr:e.stderr||e.message};}};
 let document;
 await t.test('native PDFKit renders all rotations and indexes original text, including image-only pages',{skip:process.platform!=='darwin'},async()=>{
  document=await api.preparePdfInput(store,input,runShell);assert.equal(document.pages.length,5);assert.equal(calls,1);
  for(const [i,page] of document.pages.entries()){
   const image=await fs.readFile(page.path);assert.equal(image.subarray(1,4).toString(),'PNG');assert.equal(Math.max(page.width,page.height),4096);
   if(i===4){assert.deepEqual(page.lines,[]);continue;}
   assert.equal(page.lines[0].text,'Test headline');const r=page.lines[0].rect;
   assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=1&&r.y+r.height<=1);
   if(i===0)assert.ok(r.x<.2&&r.y<.2);if(i===1)assert.ok(r.x>.8&&r.y<.2);
   if(i===2)assert.ok(r.x>.6&&r.y>.8);if(i===3)assert.ok(r.x<.2&&r.y>.6);
  }
  assert.deepEqual(await api.preparePdfInput(store,input,runShell),document);assert.equal(calls,1,'resume reuses verified pages');
 });
 await t.test('reselecting the same PDF repairs missing derived pages without losing its original',{skip:process.platform!=='darwin'},async()=>{
  await fs.unlink(document.pages[0].path);
  await assert.rejects(api.preparePdfInput(store,input,runShell),/page is missing/);
  await api.savePdfInput(store,input.path);
  document=await api.preparePdfInput(store,input,runShell);
  assert.equal(calls,2);assert.equal((await fs.readFile(document.pages[0].path)).subarray(1,4).toString(),'PNG');
 });
 await t.test('page import reuses project resources and scopes planning to selected PDF plus narration',async()=>{
  const doc=document||{pages:[{page:1,path:'/pdf/page-1.png'},{page:2,path:'/pdf/page-2.png'}]},inventory=[{path:doc.pages[0].path,resourceId:'existing'}],imports=[];
  const code=api.pdfPageImportScript('p',doc),run=new Function('selects',esbuild.transformSync('return (async()=>{'+code+'})();',{loader:'ts'}).code);
  const p={sourceFiles:async opts=>opts?{fileTree:inventory}:{mode:'summary',folders:[{name:'root'}]},importFiles:async({paths})=>{imports.push(paths[0]);const row={path:paths[0],resourceId:'r'+imports.length};inventory.push(row);return {addedResourceIds:[row.resourceId]};}};
  const pages=await run({project:id=>{assert.equal(id,'p');return p;}});assert.equal(imports.length,doc.pages.length-1);
  assert.deepEqual(await run({project:()=>p}),pages);assert.equal(imports.length,doc.pages.length-1);
  const options=api.sceneInputOptions({pdfInput:input,pdfPages:pages,resourceId:'voice',resourceName:'voice.mp4',mode:'project'},'p','/runs');
  assert.deepEqual(options.sourceResourceIds,['voice',...pages.map(p=>p.resourceId)]);assert.equal(options.wholeProject,true);
  assert.equal(api.sceneInputOptions({resourceName:'v',mode:'project'},'p','/runs').wholeProject,false);
  assert.equal(api.sceneInputOptions({mode:'project-all'},'p','/runs').wholeProject,true);
 });
 await t.test('resume rejects altered bytes or a forged file location before invoking native renderer',async()=>{
  const before=calls;await assert.rejects(api.preparePdfInput(store,{...input,path:'/other.pdf'},runShell),/missing/);
  await fs.appendFile(input.path,'changed');await assert.rejects(api.preparePdfInput(store,input,runShell),/changed/);assert.equal(calls,before);
 });
});
