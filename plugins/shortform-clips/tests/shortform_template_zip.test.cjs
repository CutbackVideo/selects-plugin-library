'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('ZIP template transfers',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {encodeTemplateZip,decodeTemplateFile,readTemplateZip,writeTemplateZip,encodeSharedTemplate,decodeSharedTemplate,readTemplatePack,makeTemplateRepository};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,enc=s=>new TextEncoder().encode(s),dec=b=>new TextDecoder().decode(b);
 const fileService={join:path.join,size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p))};
 const pack=await api.readTemplatePack(fileService,path.join(__dirname,'../template-packs/sbs-radio/pack.json'));
 const original={...structuredClone(pack.templates[0]),id:'sbs-radio/political-show'};
 original.name='\ud55c\uae00 \uc774\ub984';original.prompt.rules='My edited rules';
 original.background.image=original.logo.image;
 original.thumbnail={mode:'preserve',instructions:'\ucc38\uace0 \ub514\uc790\uc778',logo:{name:'\ub85c\uace0.png',data:original.logo.image},references:[{name:'\ucc38\uace0.png',data:original.logo.image}]};
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'shortform-zip-'));
 function repo(){const rows=new Map();return {rows,repository:api.makeTemplateRepository({list:async k=>[...rows].filter(([key])=>key.startsWith(k+'/')).map(([,v])=>structuredClone(v)),get:async(k,id)=>structuredClone(rows.get(k+'/'+id)||null),put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v))})};}
 const zip=await api.encodeTemplateZip(original),json=api.encodeSharedTemplate(original);
 try{
 await t.test('images deduplicate across logo, background and thumbnail references and settings round trip exactly',async()=>{
  const entries=await api.readTemplateZip(zip);assert.equal(entries.size,2);
  const manifest=dec(entries.get('template.json'));assert.ok(!manifest.includes('base64,'));assert.ok(manifest.includes('$asset'));
  const decoded=await api.decodeTemplateFile(zip);assert.deepEqual(decoded.template,api.decodeSharedTemplate(json));assert.equal(decoded.data.identity,original.id);
  assert.ok(zip.length<json.length);console.log(JSON.stringify({jsonBytes:json.length,zipBytes:zip.length,reductionPercent:Math.round((1-zip.length/json.length)*100)}));
 });
 await t.test('standard Python ZIP reader accepts export, and standard deflated ZIP imports',async()=>{
  fs.writeFileSync(path.join(folder,'stored.zip'),zip);
  execFileSync('python3',['-c',`import zipfile,sys
from pathlib import Path
p=Path(sys.argv[1])
with zipfile.ZipFile(p/'stored.zip') as source:
 assert source.testzip() is None
 with zipfile.ZipFile(p/'deflated.zip','w',compression=zipfile.ZIP_DEFLATED) as target:
  for name in source.namelist(): target.writestr(name,source.read(name))
`,folder]);
  const imported=await api.decodeTemplateFile(new Uint8Array(fs.readFileSync(path.join(folder,'deflated.zip'))));assert.deepEqual(imported.template,api.decodeSharedTemplate(json));
 });
 await t.test('JSON, BOM JSON, and ZIP use the same identity and conflict choices',async()=>{
  const {repository,rows}=repo();await repository.importFile(enc('\uFEFF'+dec(json)));const before=structuredClone([...rows]);
  await repository.importFile(zip);assert.deepEqual([...rows],before);
  const edited=(await repository.load()).templates[0];edited.headline.size1=160;await repository.put('templates',edited.id,edited);
  const newer={...original,version:original.version+1};let error;try{await repository.importFile(await api.encodeTemplateZip(newer));}catch(e){error=e;}
  assert.equal(error.conflicts[0].reason,'modified');await error.retry({[original.id]:'replace'},{[original.id]:error.conflicts[0].token});
  assert.equal((await repository.load()).templates[0].headline.size1,original.headline.size1);assert.equal((await repository.history(original.id)).length,1);
 });
 await t.test('legacy API 1 JSON without identity is still imported',async()=>{
  const data=JSON.parse(dec(json));data.templateApi=1;delete data.identity;
  const {repository}=repo(),result=await repository.importFile(enc(JSON.stringify(data)));assert.ok(result.id.startsWith('custom/'));
 });
 await t.test('a binary image larger than the old base64 JSON budget can round trip',async()=>{
  const png=new Uint8Array(16*1024*1024);png.set(Buffer.from(original.logo.image.split(',')[1],'base64'));
  const large=structuredClone(original);large.logo.image='data:image/png;base64,'+Buffer.from(png).toString('base64');
  assert.throws(()=>api.encodeSharedTemplate(large),/20 MiB/);
  const bytes=await api.encodeTemplateZip(large),decoded=await api.decodeTemplateFile(bytes);assert.equal(decoded.template.logo.image,large.logo.image);
 });
 await t.test('truncated, corrupt and encrypted archives fail before storage writes',async()=>{
  const {repository,rows}=repo(),corrupt=zip.slice(),encrypted=zip.slice();
  const d=new DataView(corrupt.buffer),n=d.getUint16(26,true);corrupt[30+n]^=1;
  const v=new DataView(encrypted.buffer);v.setUint16(6,1,true);const end=encrypted.length-22,central=v.getUint32(end+16,true);v.setUint16(central+8,1,true);
  for(const bytes of [zip.subarray(0,zip.length-3),corrupt,encrypted])await assert.rejects(repository.importFile(bytes));assert.equal(rows.size,0);
 });
 await t.test('unsafe paths, duplicate names, oversized expansion and symlinks are rejected',async()=>{
  execFileSync('python3',['-c',`import zipfile,sys,warnings
from pathlib import Path
p=Path(sys.argv[1]);warnings.simplefilter('ignore')
for label,names in [('traversal',['../template.json']),('absolute',['/template.json']),('duplicate',['template.json','template.json'])]:
 with zipfile.ZipFile(p/(label+'.zip'),'w') as z:
  for name in names: z.writestr(name,b'{}')
with zipfile.ZipFile(p/'symlink.zip','w') as z:
 info=zipfile.ZipInfo('template.json');info.create_system=3;info.external_attr=0o120777<<16;z.writestr(info,b'/tmp/file')
with zipfile.ZipFile(p/'expansion.zip','w',compression=zipfile.ZIP_DEFLATED) as z: z.writestr('template.json',b' '* (4*1024*1024+1))
`,folder]);
  const {repository,rows}=repo();for(const name of ['traversal','absolute','duplicate','symlink','expansion'])await assert.rejects(repository.importFile(new Uint8Array(fs.readFileSync(path.join(folder,name+'.zip')))),undefined,name);assert.equal(rows.size,0);
 });
 await t.test('missing references, changed image hashes, extra files and unsupported manifests fail without mutation',async()=>{
  const base=await api.readTemplateZip(zip),asset=[...base.keys()].find(n=>n.startsWith('assets/'));
  const missing=new Map(base);missing.delete(asset);
  const forged=new Map(base),image=base.get(asset).slice();image[image.length-1]^=1;forged.set(asset,image);
  const extra=new Map(base);extra.set('assets/'+'a'.repeat(64)+'.png',base.get(asset));
  const invalid=new Map(base),data=JSON.parse(dec(base.get('template.json')));data.version=999;invalid.set('template.json',enc(JSON.stringify(data)));
  const {repository,rows}=repo();for(const entries of [missing,forged,extra,invalid])await assert.rejects(repository.importFile(api.writeTemplateZip(entries)));assert.equal(rows.size,0);
 });
 await t.test('file transfer UI chooses ZIP export, accepts JSON/ZIP and unlocks after cancellation',async()=>{
  const {repository}=repo(),saved=new Map(),calls=[];let readPath='/export.zip',selectedId,cancel=false;
  const files={join:(...p)=>p.join('/'),homedir:()=>'/home',size:async p=>saved.get(p).length,readFile:async p=>saved.get(p),writeFile:async(p,b)=>saved.set(p,b)};
  const globals={files,packLock:{current:false},busy:false,templateDirty:false,templateSaving:false,setPackBusy:()=>{},setPackError:m=>{if(m)throw Error(m)},setPackMessage:()=>{},script:async code=>{calls.push(code);return cancel?null:code.includes('pickSavePath')?'/export.zip':readPath;},packAssert:(v,m)=>assert.ok(v,m),TEMPLATE_ZIP_MAX_BYTES:100*1024*1024,resolveTemplateImport:f=>f(),importSharedTemplate:(r,b)=>r.importFile(b),repository,loadTemplates:()=>repository.load(),setTplSel:id=>selectedId=id,setProgram:()=>{},setPackDialogOpen:()=>{},lang:'en',encodeTemplateZip:api.encodeTemplateZip,nameOf:()=>original.name};
  const start=source.indexOf('  async function transferTemplate('),handler=source.slice(start,source.indexOf('  const attemptedPack =',start));
  const fn=new Function(...Object.keys(globals),dep('esbuild').transformSync(handler,{loader:'tsx'}).code+';return transferTemplate;')(...Object.values(globals));
  await fn('export',original);assert.ok(calls[0].includes('.shortform-template.zip'));
  await fn('import');assert.ok(calls[1].includes('"zip","json"'));assert.equal(selectedId,original.id);
  saved.set('/legacy.json',json);readPath='/legacy.json';await fn('import');assert.equal((await repository.load()).templates.length,1);
  cancel=true;await fn('import');assert.equal(globals.packLock.current,false);
 });
 await t.test('every shipped template exports and imports without design changes',async()=>{
  for(const dir of ['sbs-radio','hankook-ilbo','huick']){
   const p=path.join(__dirname,'../template-packs',dir,'pack.json');
   const pack=await api.readTemplatePack(fileService,p);
   for(const template of pack.templates){const result=await api.decodeTemplateFile(await api.encodeTemplateZip(template));assert.deepEqual(result.template,api.decodeSharedTemplate(api.encodeSharedTemplate(template)));}
  }
 });
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
