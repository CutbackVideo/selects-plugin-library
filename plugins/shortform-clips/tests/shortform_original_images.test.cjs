'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('original template image preservation',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}},source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {originalImageData,templateImageDimensions,validateOriginalImage,readOriginalImage,templateBuildScript,coverAIReference,encodeSharedTemplate,decodeSharedTemplate,makeTemplateRepository,readTemplatePack};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 const sized=(w,h,size=png.length)=>{const bytes=Buffer.alloc(size);png.copy(bytes);bytes.writeUInt32BE(w,16);bytes.writeUInt32BE(h,20);return bytes;};
 await t.test('upload preserves bytes and transparency without any canvas encoding',async()=>{
  const oldBitmap=global.createImageBitmap,oldDocument=global.document;let closed=0;
  global.createImageBitmap=async()=>({close(){closed++;}});global.document={createElement(){throw Error('Original upload must never use canvas');}};
  try{const result=await api.readOriginalImage({size:async()=>png.length,readFile:async()=>png},'original.png');assert.deepEqual(Buffer.from(result.split(',')[1],'base64'),png);assert.equal(closed,1);}finally{global.createImageBitmap=oldBitmap;global.document=oldDocument;}
 });
 await t.test('4K and larger photos pass; side, pixel and byte limits fail before decoding',async()=>{
  assert.equal(api.templateImageDimensions(sized(3840,2160)).width,3840);assert.equal(api.templateImageDimensions(sized(7680,4296)).width,7680);
  assert.throws(()=>api.originalImageData(sized(8193,100)),/8192/);assert.throws(()=>api.originalImageData(sized(8192,8192)),/33 million/);
  await assert.rejects(api.readOriginalImage({size:async()=>20*1024*1024+1,readFile:async()=>{throw Error('Must not read oversized input');}},'large.png'),/20 MiB/);
  assert.throws(()=>api.originalImageData(new Uint8Array(20*1024*1024+1)),/20 MiB/);
 });
 await t.test('JPEG and all supported WebP dimension headers enforce the same limits',()=>{
  const jpg=Buffer.from([255,216,255,192,0,8,8,8,112,15,0,0]);assert.deepEqual(api.templateImageDimensions(jpg),{mime:'image/jpeg',width:3840,height:2160});
  for(const type of ['VP8X','VP8 ','VP8L']){const b=Buffer.alloc(30);b.write('RIFF');b.writeUInt32LE(22,4);b.write('WEBP',8);b.write(type,12);b.writeUInt32LE(10,16);
   if(type==='VP8X'){b.writeUIntLE(3839,24,3);b.writeUIntLE(2159,27,3);}else if(type==='VP8 '){b.set([0x9d,1,0x2a],23);b.writeUInt16LE(3840,26);b.writeUInt16LE(2160,28);}else{b[20]=0x2f;b.writeUInt32LE((3839|(2159<<14))>>>0,21);}
   assert.equal(api.templateImageDimensions(b).width,3840);assert.equal(api.templateImageDimensions(b).height,2160);
  }
 });
 await t.test('large original survives JSON export/import, snapshot storage, and restoration',async()=>{
  const io={join:path.join,size:async p=>fs.statSync(p).size,readFile:async p=>new Uint8Array(fs.readFileSync(p))};
  const pack=await api.readTemplatePack(io,path.join(__dirname,'../template-packs/sbs-radio/pack.json')),template={...pack.templates[0],id:'custom/original-test'};
  template.logo.image=api.originalImageData(sized(3840,2160,16*1024*1024));const bytes=api.encodeSharedTemplate(template);assert.ok(bytes.length>20*1024*1024);
  assert.equal(api.decodeSharedTemplate(bytes).logo.image,template.logo.image);
  const rows=new Map(),repo=api.makeTemplateRepository({get:async(k,id)=>structuredClone(rows.get(k+'/'+id)||null),list:async()=>[],put:async(k,id,v)=>rows.set(k+'/'+id,structuredClone(v))});
  await repo.importFile(bytes);const current=(await repo.load()).templates[0];assert.equal(current.logo.image,template.logo.image);
  current.logo.image=api.originalImageData(png);await repo.put('templates',current.id,current);await repo.del('templates',current.id);assert.equal((await repo.load()).templates[0].logo.image,template.logo.image);
 });
 await t.test('large build settings travel through bounded SDK reads with exact original bytes and Unicode',async()=>{
  const params={logo:api.originalImageData(sized(3840,2160,300000)),title:'\ud14c\uc2a4\ud2b8 \ud83d\ude00'},files=new Map(),store={fs:{writeFile:async(p,b)=>files.set(p,b)}};
  const build='const P: any = __P__; return P;',code=await api.templateBuildScript(build,params,store,'/test/params.json');assert.ok(code.length<232000);assert.ok(!code.includes(params.logo));
  let reads=0;const selects={files:{readRange:async({path,offset,length})=>{assert.ok(length<=49152);reads++;return {base64:Buffer.from(files.get(path).subarray(offset,offset+length)).toString('base64')};}}};
  const result=await new Function('selects',dep('esbuild').transformSync('return (async()=>{'+code+'})();',{loader:'ts'}).code)(selects);assert.deepEqual(result,params);assert.ok(reads>1);
  assert.equal(await api.templateBuildScript(build,{title:'small'},null,''),'const P: any = {"title":"small"}; return P;');
 });
 await t.test('AI uses a separate bounded derivative without replacing the reference',async()=>{
  const oldBitmap=global.createImageBitmap,oldDocument=global.document,ref={data:api.originalImageData(sized(3840,2160)),name:'reference'},original=ref.data;let closed=0,canvas;
  global.createImageBitmap=async()=>({width:3840,height:2160,close(){closed++;}});global.document={createElement:()=>canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,derived'}};
  try{assert.equal(await api.coverAIReference(ref),'data:image/jpeg;base64,derived');assert.equal(ref.data,original);assert.equal(canvas.width,1280);assert.equal(canvas.height,720);assert.equal(closed,1);}finally{global.createImageBitmap=oldBitmap;global.document=oldDocument;}
 });
});
