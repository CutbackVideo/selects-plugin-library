const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('Chosun migration preserves requested designs with explicit Premiere corrections and original image bytes',()=>{
 const root=path.join(__dirname,'../template-packs/chosun-ilbo'),manifest=JSON.parse(fs.readFileSync(path.join(root,'pack.json'))),baseline=require('./fixtures/chosun-legacy-template-summary.json');
 assert.equal(manifest.templates.length,5);assert.equal(manifest.assets.length,10);assert.equal(manifest.requiresApp.templateApi,2);
 assert.deepEqual(manifest.templates.map(x=>path.basename(x,'.json')).sort(),['heukbaek','history','money','panilgi','villain']);
 assert.equal(manifest.legacy.templateIds.kimkwangil,undefined);
 assert.ok(!manifest.assets.some(x=>x.includes('kimkwangil')));
 const corrections=require('./fixtures/chosun-premiere-corrections.json').overrides;
 for(const legacy of baseline.templates){
  const old=structuredClone(legacy);
  for(const [section,fields] of Object.entries(corrections[old.id]||{}))Object.assign(old[section],fields);const t=JSON.parse(fs.readFileSync(path.join(root,'templates',old.id+'.json')));
  assert.equal(manifest.legacy.templateIds[old.id],old.id);assert.equal(t.renderer,undefined);assert.equal(t.layout.reframe,false);
  for(const [key,value] of Object.entries(old.layout))assert.deepEqual(t.layout[key],value,old.id+': '+key);
  for(const key of ['names','captions','editing','detect','prompt','border'])assert.deepEqual(t[key],old[key],old.id+': '+key);
  for(const [key,value] of Object.entries(old.headline))assert.deepEqual(t.headline[key],value,old.id+': headline '+key);
  for(const section of ['background','logo']){
   assert.ok(manifest.assets.includes(t[section].image));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,t[section].image))).digest('hex'),old[section].imageSha256);
  }
 }
});
