'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;
test('scene visual evidence',{skip:!modulesRoot&&'Set SBS_PANEL_TEST_MODULES'},async t=>{
 const dep=createRequire(path.resolve(modulesRoot,'../package.json')),esbuild=dep('esbuild'),source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 const start=source.indexOf('function sceneRuntimeScript('),end=source.indexOf('export interface ScenePreflightOptions {',start),base=source.slice(source.indexOf('function toBase64('),source.indexOf('function fromBase64('));
 const helper=base+source.slice(source.indexOf('async function pooled('),source.indexOf('const folderOf ='))+source.slice(start,end);
 const document={createElement:()=>{let bytes;return {getContext:()=>({drawImage:bitmap=>{bytes=bitmap.bytes;},fillRect(){},fillText(){},measureText:text=>({width:text.length*8})}),toBlob:callback=>callback(new Blob([bytes]))};}};
 const createImageBitmap=async blob=>({bytes:new Uint8Array(await blob.arrayBuffer()),close(){}});
 const module={exports:{}};new Function('module','exports','document','createImageBitmap',esbuild.transformSync(helper+'\nexport {sceneEvidenceSheets,sceneEvidenceArgs,labelSceneEvidence,prepareSceneEvidence};',{loader:'ts',format:'cjs'}).code)(module,module.exports,document,createImageBitmap);const api=module.exports;
 const run=async(body,sdk)=>{const code=esbuild.transformSync('async function run(selects){'+body+'}',{loader:'ts',target:'es2022'}).code;return new Function(code+';return run;')()(sdk);};
 const actor=(name='actor.mov')=>({resourceId:name,name,path:'/'+name,type:'Video',hasTranscription:true,durationSeconds:100,fps:30,sourceWords:Array.from({length:20},(_,i)=>[i*4,i*4+2,'speech',1,'utterance-'+i,false])});
 await t.test('panel helpers typecheck with ES2022 and browser globals',()=>{
  const ts=dep('typescript'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'scene-evidence-types-'));
  try{const file=path.join(dir,'helper.ts');fs.writeFileSync(file,'declare const selects:any;\n'+helper);const program=ts.createProgram([file],{target:ts.ScriptTarget.ES2022,lib:['lib.es2022.d.ts','lib.dom.d.ts'],noEmit:true,skipLibCheck:true});assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);}finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 await t.test('samples original actors independently of prepared takes and explicitly omits excess sources',()=>{
  const p={sources:[{...actor('logo.mov'),hasTranscription:false,sourceWords:[]},actor('A.mov'),actor('B.mov'),actor('C.mov'),...Array.from({length:34},(_,i)=>({type:'Image',resourceId:'i'+i,name:'i'+i,path:'/i'+i}))],preparedMedia:Array.from({length:34},(_,i)=>({id:'p'+i,resourceId:'p'+i,path:'/p'+i,sourceResourceName:'A.mov',sourceStartFrame:900+i,sourceEndFrame:960+i,fps:30,kind:i%2?'prepared-head':'native-matte'}))};
  const r=api.sceneEvidenceSheets(p);assert.equal(r.groups[0].tiles.length,16);assert.deepEqual([...new Set(r.groups[0].tiles.map(x=>x.name))],['A.mov','B.mov']);assert.deepEqual(r.groups[0].tiles.slice(0,8).map(x=>x.seconds),[1,13,21,33,45,57,65,77]);assert.equal(r.groups[1].tiles.length,32);assert.equal(r.groups[2].tiles.length,32);assert.equal(r.groups[2].tiles[0].seconds,29/30);assert.equal(r.groups[2].tiles[0].sourceRange.sampledSourceFrame,929);assert(r.limitations.some(x=>x.includes('logo.mov')));assert(r.limitations.some(x=>x.includes('i33')));assert(r.limitations.some(x=>x.includes('p33')));
 });
 await t.test('still inputs never receive seeking; video seeks precede each own input',()=>{
  const args=api.sceneEvidenceArgs([{kind:'original-video',seconds:73.5,path:'/v1'},{kind:'original-image',seconds:0,path:'/i'},{kind:'prepared-head',seconds:1.25,path:'/v2'}],'/out.jpg');
  assert.deepEqual(args.slice(0,args.indexOf('-filter_complex')),['-n','-v','info','-filter_complex_threads','1','-threads','1','-ss','73.5','-i','/v1','-threads','1','-i','/i','-threads','1','-ss','1.25','-i','/v2']);assert(args[args.indexOf('-filter_complex')+1].includes('xstack=inputs=3'));
 });
 function memoryIO(config={}){
  const files=new Map(),jobs=new Map(),registered=[],submitted=[];let id=0,statsRead=0;
  const sources=[{...actor('A.mov'),width:64,height:48},{type:'Image',resourceId:'i',name:'image.png',path:'/image.png',width:64,height:48}],p={sources,preparedMedia:[{id:'head',resourceId:'h',path:'/head.mov',sourceResourceName:'A.mov',sourceStartFrame:60,sourceEndFrame:90,fps:30,kind:'prepared-head'}]};
  for(const s of [...sources,...p.preparedMedia])files.set(s.path,Buffer.from('source'));
  const sdk={files:{stat:async p=>files.has(p)?{size:files.get(p).length,mtimeMs:config.changed&&++statsRead>3?2:1,isDirectory:false}:null,mkdir:async()=>{},writeChunk:async({path,offset,base64})=>{const b=Buffer.from(base64,'base64');files.set(path,offset?Buffer.concat([files.get(path),b]):b);return{bytesWritten:b.length}}},media:{startFFmpeg:async({args})=>{const jobId='j'+ ++id;submitted.push({jobId,args});files.set(args.at(-1),Buffer.concat([Buffer.from([255,216]),Buffer.alloc(config.large?1200000:10)]));jobs.set(jobId,{state:'succeeded'});return{jobId}},job:id=>({status:async()=>jobs.get(id)})}};
  const io={check(){},pause:async()=>{},register:async id=>registered.push(id),execute:(code)=>run(code,sdk),readFile:async p=>new Uint8Array(files.get(p)),start:async(code,summary,onStarted)=>{const value=await run(code,sdk);await onStarted(value);return value;}};
  return{p,io,files,registered,submitted};
 }
 await t.test('registers all jobs, saves source-clock manifest and provides bounded inline images',async()=>{
  const f=memoryIO(),r=await api.prepareSceneEvidence(f.p,'/work',f.io);assert.equal(r.images.length,3);assert.equal(r.visualEvidence.sheets.length,3);assert.equal(f.registered.length,3);assert.equal(r.visualEvidence.sheets[2].tiles[0].seconds,14/30);assert(r.visualEvidence.sheets.every(x=>x.columns===4&&x.tiles.every(t=>t.path&&t.size&&t.mtimeMs)));const manifest=JSON.parse(f.files.get(r.visualEvidence.manifestPath).toString());assert.equal(manifest.visualEvidence.inputFiles.length,3);assert(r.images.every(x=>x.dataUrl.length<=1500000));assert(r.images.reduce((n,x)=>n+x.dataUrl.length,0)<=4000000);
 });
 await t.test('confirmed same-job originals reuse verified bytes while prepared evidence is rebuilt',async()=>{
   const f=memoryIO(),first=await api.prepareSceneEvidence(f.p,'/work',f.io);
   assert(first.visualEvidence.sheets.every(s=>/^[a-f0-9]{64}$/.test(s.sha256)));
   const before=f.submitted.length,next=await api.prepareSceneEvidence(f.p,'/work',f.io,first.visualEvidence);
   assert.equal(f.submitted.length-before,1);assert.equal(next.visualEvidence.sheets.filter(s=>s.reusedFrom).length,2);
   f.p.preparedMedia[0].sourceEndFrame++;
   const count=f.submitted.length;await api.prepareSceneEvidence(f.p,'/work',f.io,first.visualEvidence);assert.equal(f.submitted.length-count,1);
   f.p.preparedMedia=[];const noPrepared=f.submitted.length;await api.prepareSceneEvidence(f.p,'/work',f.io,first.visualEvidence);assert.equal(f.submitted.length,noPrepared);
   assert.match(source,/prepareSceneEvidence\(preflight,directory,[\s\S]*?\},job\.sceneStudy\?job\.sceneVisualEvidence:undefined\)/);
 });
 await t.test('changed original identity, clock, dimensions, stats or artifact bytes causes a fresh sheet',async()=>{
   for(const change of ['resource','path','clock','dimensions','stat','corrupt','same-length-bytes','missing-hash','unlabeled','wrong-job','new-plan']){
    const f=memoryIO();f.p.preparedMedia=[];const first=await api.prepareSceneEvidence(f.p,'/work',f.io);
    if(change==='resource')f.p.sources[1].resourceId='other';
    if(change==='path'){f.files.set('/other.png',f.files.get('/image.png'));f.p.sources[1].path='/other.png';}
    if(change==='clock')f.p.sources[0].sourceWords[0][0]+=.5;
    if(change==='dimensions')f.p.sources[1].width++;
    if(change==='stat')f.files.set('/image.png',Buffer.from('changed original'));
    const sheet=first.visualEvidence.sheets.find(s=>s.name==='original-images');
    if(change==='corrupt')f.files.set(sheet.path,Buffer.from('broken image'));
    if(change==='same-length-bytes')f.files.get(sheet.path)[3]=1;
    if(change==='missing-hash')delete sheet.sha256;
    if(change==='unlabeled')delete sheet.labelVersion;
    const before=f.submitted.length;
    await api.prepareSceneEvidence(f.p,change==='wrong-job'?'/other-work':'/work',f.io,change==='new-plan'?undefined:first.visualEvidence);
    assert.equal(f.submitted.length-before,['wrong-job','new-plan'].includes(change)?2:1,change);
   }
 });
 await t.test('a different valid JPEG of the same dimensions is not a cache hit',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scene-cache-jpeg-'));try{
   const bytes=[];for(const color of ['red','blue']){const file=path.join(dir,color+'.jpg');cp.execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c='+color+':s=1280x240','-frames:v','1','-threads','1',file]);bytes.push(fs.readFileSync(file));}
   const f=memoryIO();f.p.preparedMedia=[];let replacement=0;const read=f.io.readFile;f.io.readFile=async p=>/\/original-images(?:-raw)?\.jpg$/.test(p)?new Uint8Array(bytes[replacement]):read(p);
   const first=await api.prepareSceneEvidence(f.p,'/work',f.io);replacement=1;const before=f.submitted.length;const result=await api.prepareSceneEvidence(f.p,'/work',f.io,first.visualEvidence);
   assert.equal(f.submitted.length-before,1);assert.equal(result.visualEvidence.sheets.find(s=>s.name==='original-images').reusedFrom,undefined);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 await t.test('hash support absence rebuilds and reused images still obey attachment budgets',async()=>{
  const f=memoryIO();f.p.preparedMedia=[];const first=await api.prepareSceneEvidence(f.p,'/work',f.io),descriptor=Object.getOwnPropertyDescriptor(global,'crypto');
  try{Object.defineProperty(global,'crypto',{value:undefined,configurable:true});const before=f.submitted.length;await api.prepareSceneEvidence(f.p,'/work',f.io,first.visualEvidence);assert.equal(f.submitted.length-before,2);}finally{if(descriptor)Object.defineProperty(global,'crypto',descriptor);else delete global.crypto;}
  const large=memoryIO({large:true});large.p.preparedMedia=[];const original=await api.prepareSceneEvidence(large.p,'/work',large.io),before=large.submitted.length,reused=await api.prepareSceneEvidence(large.p,'/work',large.io,original.visualEvidence);assert.equal(large.submitted.length,before);assert.equal(reused.images.length,0);assert.equal(reused.visualEvidence.sheets.length,2);assert.equal(reused.limitations.filter(x=>x.includes('Inline image budget')).length,2);
 });
 await t.test('collects original JPEG metadata beyond the sheet limit under the same identity check',async()=>{
  const f=memoryIO(),jpeg=Buffer.from([255,216,255,237,0,42,...Buffer.from('Photoshop 3.0\0'),...Buffer.from('8BIM'),4,4,0,0,0,0,0,13,28,2,120,0,8,...Buffer.from('evidence'),0,255,217]);
  const image={type:'Image',resourceId:'iptc',name:'photo.jpg',path:'/photo.jpg'};
  f.p.sources.splice(1,1,...Array.from({length:32},(_,i)=>({type:'Image',resourceId:'i'+i,name:'image'+i+'.png',path:'/image.png'})),image);f.files.set(image.path,jpeg);
  const r=await api.prepareSceneEvidence(f.p,'/work',f.io),m=r.visualEvidence.journalisticMetadata;
  assert.equal(m.length,1);assert.equal(m[0].resourceId,'iptc');assert.equal(m[0].fields[0].value,'evidence');assert.equal(m[0].mtimeMs,1);
  assert(!r.visualEvidence.sheets.some(x=>x.tiles.some(t=>t.path===image.path)));
  const manifest=JSON.parse(f.files.get(r.visualEvidence.manifestPath));assert.equal(manifest.visualEvidence.journalisticMetadata[0].fields[0].value,'evidence');
  assert(source.includes('row.path===source.path&&row.resourceId===source.resourceId'));
  assert(source.includes('await save({scenePreflight:preflight,sceneVisualEvidence:evidence.visualEvidence'));
 });
 await t.test('rejects a JPEG changed after metadata extraction',async()=>{
  const f=memoryIO();f.p.sources.push({type:'Image',resourceId:'i2',name:'photo.jpg',path:'/photo.jpg'});f.files.set('/photo.jpg',Buffer.from([255,216,255,217]));
  const read=f.io.readFile;f.io.readFile=async p=>{const b=await read(p);if(p==='/photo.jpg')f.files.set(p,Buffer.concat([Buffer.from(b),Buffer.from([0])]));return b;};
  await assert.rejects(api.prepareSceneEvidence(f.p,'/work',f.io),/invalidated by changed source: \/photo.jpg/);
 });
 await t.test('oversized sheets stay on disk but are not passed as oversized AI attachments',async()=>{
  const f=memoryIO({large:true}),r=await api.prepareSceneEvidence(f.p,'/work',f.io);assert.equal(r.images.length,0);assert.equal(r.visualEvidence.sheets.length,3);assert.equal(r.limitations.filter(x=>x.includes('Inline image budget')).length,3);
 });
 await t.test('runs at most two sheet jobs at once while collecting independent failures',async()=>{
  const f=memoryIO(),start=f.io.start,execute=f.io.execute;let active=0,max=0,failed=false;
  f.io.start=async(...args)=>{active++;max=Math.max(max,active);return start(...args);};
  f.io.execute=async(code,...args)=>{if(code.includes('.status(')){await new Promise(resolve=>setTimeout(resolve,5));active--;if(!failed){failed=true;throw Error('fixture one-sheet failure');}}return execute(code,...args);};
  const r=await api.prepareSceneEvidence(f.p,'/work',f.io);assert.equal(max,2);assert.equal(r.images.length,2);assert.equal(f.registered.length,3);assert(r.limitations.some(x=>x.includes('fixture one-sheet failure')));
 });
 await t.test('changed originals invalidate the evidence instead of silently reusing the image',async()=>{
  const f=memoryIO({changed:true});await assert.rejects(api.prepareSceneEvidence(f.p,'/work',f.io),/invalidated by changed source/);
 });
 await t.test('real FFmpeg renders all three sheets from sparse video, still image and local prepared clocks',async()=>{
  assert.equal(cp.spawnSync('ffmpeg',['-version']).status,0,'Real FFmpeg is required for this test');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scene-evidence-real-'));try{
   const video=path.join(dir,'actor.mkv'),image=path.join(dir,'still.png');
   cp.execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=64x64:r=10:d=1','-f','lavfi','-i','color=c=blue:s=64x64:r=10:d=1','-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[out]','-map','[out]','-c:v','ffv1',video]);
   cp.execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=green:s=64x64','-frames:v','1','-threads','1',image]);
   const groups=api.sceneEvidenceSheets({sources:[{...actor(),path:video,durationSeconds:2,fps:10,sourceWords:[[1.2,1.8,'blue',1,'u',false]]},{type:'Image',resourceId:'image',name:'still.png',path:image}],preparedMedia:[{id:'head',resourceId:'head',path:video,sourceResourceName:'actor.mov',sourceStartFrame:100,sourceEndFrame:120,fps:10,kind:'prepared-head'}]}).groups;
   for(const group of groups){const output=path.join(dir,group.name+'.jpg');cp.execFileSync('ffmpeg',api.sceneEvidenceArgs(group.tiles,output));assert(fs.statSync(output).size>100);const meta=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',output]));assert.equal(meta.streams[0].width,1280);assert.equal(meta.streams[0].height,240);const rgb=cp.execFileSync('ffmpeg',['-v','error','-i',output,'-vf','crop=1:1:160:120:exact=1,format=rgb24','-frames:v','1','-f','rawvideo','-']);if(group.name==='original-video')assert(rgb[2]>200&&rgb[0]<30);if(group.name==='original-images')assert(rgb[1]>70&&rgb[0]<30);if(group.name==='prepared-media')assert(rgb[0]>200&&rgb[2]<30);}
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 await t.test('real browser labels exact tile identities without covering or swapping source images',async()=>{
  const {chromium}=dep('playwright');
  const browser=await chromium.launch(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{});
  try{
   const page=await browser.newPage();
   const code=esbuild.transformSync(source.slice(source.indexOf('async function labelSceneEvidence('),source.indexOf('async function prepareSceneEvidence(')),{loader:'ts'}).code;
   const result=await page.evaluate(async code=>{
    const label=new Function(code+';return labelSceneEvidence;')(),raw=document.createElement('canvas');raw.width=1280;raw.height=480;
    const g=raw.getContext('2d');g.fillStyle='#ff0000';g.fillRect(0,0,1280,480);g.fillStyle='#0000ff';g.fillRect(0,240,320,240);
    const bytes=new Uint8Array(await(await new Promise(resolve=>raw.toBlob(resolve,'image/jpeg'))).arrayBuffer());
    const names=['\u110b\u1163\u11a81.png','green.png','paper.png','photo.jpg','\u110b\u1163\u11a8\u1107\u1162\u1109\u1169\u11bc \u1107\u1161\u11ab\u1103\u1162 \u1109\u1175\u110b\u1171\u1112\u1161\u1102\u1173\u11ab \u110b\u1163\u11a8\u1109\u1161_\u1102\u1172\u1109\u11731 (1).jpg'];
    const tiles=names.map((name,i)=>({name,resourceId:'r'+i,tileIndex:i,row:Math.floor(i/4),column:i%4}));
    const texts=[],fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(...args){texts.push(args);return fill.apply(this,args);};
    let labeled;try{labeled=await label(bytes,tiles);}finally{CanvasRenderingContext2D.prototype.fillText=fill;}
    const bitmap=await createImageBitmap(new Blob([labeled])),out=document.createElement('canvas');out.width=bitmap.width;out.height=bitmap.height;const ctx=out.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
    const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
    const footer=ctx.getImageData(0,240,320,72).data;let colored=0;for(let i=0;i<footer.length;i+=4)if(footer[i]>150&&footer[i+1]>150)colored++;
    return {width:out.width,height:out.height,first:pixel(160,120),fifth:pixel(160,432),colored,texts};
   },code);
   assert.equal(result.width,1280);assert.equal(result.height,624);assert(result.first[0]>230&&result.first[2]<20);assert(result.fifth[2]>230&&result.fifth[0]<20);assert(result.colored>100,'The real JPEG contains rendered footer text');
   assert.deepEqual(result.texts.filter(x=>x[0].startsWith('[')).map(x=>[x[0],x[1],x[2]]),[['[0] r0',8,259],['[1] r1',328,259],['[2] r2',648,259],['[3] r3',968,259],['[4] r4',8,571]]);
   assert(result.texts.some(x=>x[0]==='\uc57d1.png'));assert(result.texts.every(x=>x[0]===x[0].normalize('NFC')));
  }finally{await browser.close();}
 });
});
