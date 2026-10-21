const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('Chosun migration preserves requested designs with explicit Premiere corrections and original image bytes',()=>{
 const root=path.join(__dirname,'../template-packs/chosun-ilbo'),manifest=JSON.parse(fs.readFileSync(path.join(root,'pack.json'))),baseline=require('./fixtures/chosun-legacy-template-summary.json');
 assert.equal(manifest.templates.length,7);assert.equal(manifest.assets.length,12);assert.equal(manifest.requiresApp.templateApi,2);
 assert.deepEqual(manifest.templates.map(x=>path.basename(x,'.json')).sort(),['health','heukbaek','history','money','panilgi','parenting','villain']);
 assert.equal(manifest.legacy.templateIds.kimkwangil,undefined);
 assert.ok(!manifest.assets.some(x=>x.includes('kimkwangil')));
 const corrections=require('./fixtures/chosun-premiere-corrections.json').overrides;
 for(const legacy of baseline.templates){
  const old=structuredClone(legacy);
  for(const [section,fields] of Object.entries(corrections[old.id]||{}))Object.assign(old[section],fields);const t=JSON.parse(fs.readFileSync(path.join(root,'templates',old.id+'.json')));
  assert.equal(manifest.legacy.templateIds[old.id],old.id);assert.equal(t.renderer,undefined);assert.equal(t.layout.reframe,old.id==='heukbaek');
  if(old.id==='heukbaek')old.layout.reframe=true;
  for(const [key,value] of Object.entries(old.layout))assert.deepEqual(t.layout[key],value,old.id+': '+key);
  for(const key of ['names','captions','editing','detect','prompt','border'])assert.deepEqual(t[key],old[key],old.id+': '+key);
  for(const [key,value] of Object.entries(old.headline))assert.deepEqual(t.headline[key],value,old.id+': headline '+key);
  for(const section of ['background','logo']){
   assert.ok(manifest.assets.includes(t[section].image));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,t[section].image))).digest('hex'),old[section].imageSha256);
  }
 }
});

test('Heukbaek defaults enable automatic grouping without forcing splits on single shots',()=>{
 const t=require('../template-packs/chosun-ilbo/templates/heukbaek.json');
 assert.equal(t.version,3);
 assert.equal(t.layout.reframe,true);
 assert.equal(t.layout.reframePreset,'custom');
 assert.equal(t.layout.cameraMode,'auto');
 assert.equal(t.layout.fixedLayout,'auto');
 assert.equal(t.layout.splitPolicy,'frequent');
 assert.deepEqual(t.layout.allowedLayouts,['columns-3','grid-4']);
 assert.equal(t.layout.cropMotion,'fixed');
 assert.ok(t.layout.reframeInstructions.length>0);
});

// Premiere active RSV title and the exact customer-supplied frame are the migration contract.
test('Parenting preserves Premiere title metrics and the customer frame with its embedded logo',()=>{
 const root=path.join(__dirname,'../template-packs/chosun-ilbo');
 const t=JSON.parse(fs.readFileSync(path.join(root,'templates/parenting.json')));
 assert.equal(t.headline.font,'OTRecipekoreaM');
 assert.equal(t.headline.size1,74);assert.equal(t.headline.size2,73.83333587646484);
 assert.equal(t.headline.color2,'#FFB7C8');assert.equal(t.headline.rowGap,102.40504575520754);
 assert.equal(t.background.canvasAligned,true);assert.equal(t.logo.mode,'none');
 assert.equal(t.captions.font,'Hakgyoansim Allimjang');
 assert.equal(t.captions.fontWeight,400);
 assert.equal(t.captions.boxColor,'#343434A6');
 assert.equal(t.captions.boxPerLine,true);
 assert.equal(t.captions.boxPaddingX,20);
 assert.equal(t.captions.boxPaddingTop,5);
 assert.equal(t.captions.boxPaddingBottom,5);
 assert.equal(t.captions.highlight,false);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,t.background.image))).digest('hex'),'64ed25a3c492d375bb172944b076963e8bb38fb8b4c552528f19efa968eddb78');
});
