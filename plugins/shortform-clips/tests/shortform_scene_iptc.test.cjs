const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;
if(!modulesRoot){test('scene IPTC metadata',{skip:'Set SBS_PANEL_TEST_MODULES'},()=>{});}else{
const ts=createRequire(path.resolve(modulesRoot,'../package.json'))('typescript');
const panel=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
const source=panel.slice(panel.indexOf('type SceneIptcField ='),panel.indexOf('async function prepareSceneEvidence('));
const context = { TextDecoder, Uint8Array };
vm.createContext(context);
vm.runInContext(ts.transpile(source, { target: ts.ScriptTarget.ES2020 }), context);
const read = bytes => JSON.parse(JSON.stringify(context.readSceneJournalisticIptc(new Uint8Array(bytes))));
const u16 = n => Buffer.from([n >>> 8, n & 255]);
const u32 = n => Buffer.from([n >>> 24, n >>> 16 & 255, n >>> 8 & 255, n & 255]);
const dataset = (id, value, record = 2, extended = false) => {
  const b = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return Buffer.concat([Buffer.from([28, record, id]), extended ? Buffer.concat([u16(0x8004), u32(b.length)]) : u16(b.length), b]);
};
const block = (data, id = 1028, name = '') => {
  const n = Buffer.from(name); const namePart = Buffer.concat([Buffer.from([n.length]), n]);
  return Buffer.concat([Buffer.from('8BIM'), u16(id), namePart, namePart.length % 2 ? Buffer.from([0]) : Buffer.alloc(0), u32(data.length), data, data.length % 2 ? Buffer.from([0]) : Buffer.alloc(0)]);
};
const app13 = (...blocks) => {const body=Buffer.concat([Buffer.from('Photoshop 3.0\0'), ...blocks]);return Buffer.concat([Buffer.from([255,237]),u16(body.length+2),body]);};
const jpeg = (...segments) => Buffer.concat([Buffer.from([255,216]),...segments,Buffer.from([255,217])]);
const utf8 = dataset(90, Buffer.from([27,37,71]), 1);

test('non-JPEG and JPEG without IPTC remain usable with missing metadata', () => {
  assert.equal(read(Buffer.from('PNG')).status, 'missing');
  assert.equal(read(jpeg()).status, 'missing');
});
test('declared UTF-8 keeps separate ObjectName/headline and whitelists only journalistic fields', () => {
  const r=read(jpeg(app13(block(Buffer.concat([utf8,dataset(5,'\uc790\ub8cc \uc81c\ubaa9'),dataset(105,'\uae30\uc0ac \ud5e4\ub4dc\ub77c\uc778'),dataset(120,'\uc124\uba85\n\ub450 \ubc88\uc9f8 \uc904'),dataset(55,'20260920'),dataset(110,'News1'),dataset(115,'News1'),dataset(80,'not included'),dataset(92,'private location')])))));
  assert.equal(r.status,'read');assert.equal(r.fields.length,6);assert.equal(r.fields[0].field,'objectName');assert.equal(r.fields[1].field,'headline');
  assert.ok(r.fields.every(f=>f.encoding==='utf-8'&&!f.encodingInferred));assert.ok(!JSON.stringify(r).includes('private'));
});
test('invalid explicitly declared UTF-8 never falls back to Korean', () => {
  const r=read(jpeg(app13(block(Buffer.concat([utf8,dataset(120,Buffer.from([0xbe,0xe0]))])))));
  assert.equal(r.status,'missing');assert.equal(r.fields.length,0);
});
test('undeclared UTF-8 is marked inferred and unsupported declared encoding is withheld', () => {
  const r=read(jpeg(app13(block(dataset(120,'\ud55c\uad6d\uc5b4 \uc124\uba85')))));assert.equal(r.fields[0].encoding,'utf-8');assert.equal(r.fields[0].encodingInferred,true);
  assert.equal(read(jpeg(app13(block(Buffer.concat([dataset(90,'unknown',1),dataset(120,'abc')]))))).status,'missing');
});
test('multiple APP13/resources, padded names, duplicate fields are preserved without overwrite', () => {
  const r=read(jpeg(app13(block(Buffer.from('ignored'),999,'ab'),block(dataset(105,'one'),1028,'a')),app13(block(dataset(105,'two')))));
  assert.deepEqual(r.fields.map(f=>f.value),['one','two']);
});
test('extended lengths support bounded values and reject overlong/out-of-bounds descriptors', () => {
  assert.equal(read(jpeg(app13(block(dataset(120,'extended',2,true))))).fields[0].value,'extended');
  for(const d of [Buffer.from([28,2,120,128,5,0,0,0,0,1]),Buffer.from([28,2,120,128,0]),Buffer.from([28,2,120,128,4,255,255,255,255])])assert.equal(read(jpeg(app13(block(d)))).status,'missing');
});
test('all JPEG and IIM truncation offsets terminate without partial metadata trust', () => {
  const full=jpeg(app13(block(Buffer.concat([utf8,dataset(120,'\uae34 \ud55c\uad6d\uc5b4 \uc124\uba85'),dataset(105,'headline')]))));
  for(let i=0;i<full.length-2;i++){const r=read(full.subarray(0,i));assert.equal(r.status,'missing',String(i));}
  assert.equal(read(jpeg(app13(block(dataset(120,'valid'))),app13(block(Buffer.from([28,2,120,0,9,65]))))).status,'missing');
});
test('large caption explicitly marked truncated and dates never invented', () => {
  const r=read(jpeg(app13(block(Buffer.concat([dataset(120,'a'.repeat(5000)),dataset(55,'bad date')])))));
  assert.equal(r.fields[0].value.length,4000);assert.equal(r.fields[0].truncated,true);assert.equal(r.fields.length,1);
});
test('undeclared legacy Korean is inferred; contradictory character sets are withheld', () => {
  const r=read(jpeg(app13(block(dataset(120,Buffer.from([0xbe,0xe0]))))));
  assert.equal(r.fields[0].value,'\uc57d');assert.equal(r.fields[0].encodingInferred,true);
  assert.equal(read(jpeg(app13(block(Buffer.concat([utf8,dataset(90,'EUC-KR',1),dataset(120,'abc')]))))).status,'missing');
});

test('collection preserves original identity and does not treat missing metadata as unusable imagery', async () => {
  const bytes=jpeg(app13(block(dataset(120,'caption'))));let reads=[];
  const sources=[{resourceId:'r1',path:'/original/photo.jpg',type:'Image'},{resourceId:'r2',path:'/original/no.png',type:'Image'},{resourceId:'r3',path:'/original/missing.jpg',type:'Image'}];
  const before=[{path:sources[0].path,stat:{size:bytes.length,mtimeMs:42}},{path:sources[2].path,stat:null}];
  const result=JSON.parse(JSON.stringify(await context.collectSceneJournalisticMetadata({sources},before,{check(){},async readFile(p){reads.push(p);return new Uint8Array(bytes)}})));
  assert.deepEqual(reads,['/original/photo.jpg']);assert.equal(result[0].resourceId,'r1');assert.equal(result[0].mtimeMs,42);assert.equal(result[0].fields[0].value,'caption');assert.equal(result[1].status,'missing');assert.match(result[1].limitations[0],/visual candidate/);
});
test('collection bounds reads and propagates deadline checks instead of silently swallowing them', async () => {
  const s={resourceId:'r1',path:'/original/photo.jpg',type:'Image'};
  let reads=0;const rows=await context.collectSceneJournalisticMetadata({sources:[s]},[{path:s.path,stat:{size:33*1024*1024}}],{check(){},async readFile(){reads++;}});assert.equal(reads,0);assert.equal(rows[0].status,'missing');
  await assert.rejects(context.collectSceneJournalisticMetadata({sources:[s]},[],{check(){throw Error('deadline')}}),/deadline/);
});

}
