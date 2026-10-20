'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('templates use independent settings without renderer families',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {normalizeTemplateSettings,validateTemplate,cleanTemplate,portableTemplate,templateEditorProfile,radioFrameParams,radioCaptionParams,forPlatform,merge,splitDate,withEpisodeDate,STRINGS,SCRIPT_BUILD,RADIO_SCRIPT_BUILD};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports;
 const raw=id=>JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/sbs-radio/templates/'+id+'.json'),'utf8'));
 const migrated=id=>api.validateTemplate(raw(id));
 await t.test('legacy plain and outlined titles preserve their own geometry, background and user values',()=>{
  const old=raw('political-show');old.headline.size1=119;old.layout.windowTop=470;
  const result=api.validateTemplate(old);
  assert.equal(result.renderer,undefined);assert.equal(result.headline.style,undefined);
  assert.equal(result.headline.size1,119);assert.equal(result.layout.windowTop,470);
  assert.equal(result.headline.rowGap,136.8);assert.equal(result.headline.fontWeight,800);
  assert.equal(result.headline.fitWidth,880);assert.equal(result.headline.strokeOn,true);
  assert.equal(result.background.canvasAligned,true);
  assert.equal(result.captions.width,840);
  const once=structuredClone(result);api.normalizeTemplateSettings(result);assert.deepEqual(result,once,'migration is idempotent');
  const plain=migrated('news-briefing');assert.equal(plain.headline.fontWeight,900);assert.equal(plain.headline.fitWidth,1010);assert.equal(plain.headline.rowGap,undefined);
 });
 await t.test('no renderer is required for validation, duplication or sharing',()=>{
  const plain=migrated('political-show');plain.logo.mode='none';plain.logo.image='';
  assert.equal(api.validateTemplate(structuredClone(plain)).renderer,undefined);
  const portable=api.portableTemplate(plain);assert.equal(portable.renderer,undefined);
  assert.deepEqual(portable.headline,plain.headline);assert.equal(portable.platformLayouts,false);
  const copy=api.cleanTemplate({...plain,id:'custom-copy',builtIn:true});assert.equal(copy.renderer,undefined);assert.equal(copy.builtIn,undefined);
  assert.throws(()=>api.validateTemplate({...plain,headline:{...plain.headline,fitWidth:NaN}}),/finite/);
 });
 await t.test('previously separate titles can combine gradients, labels, AI framing and emphasis',()=>{
  const template=migrated('political-show');template.headline.gradient1='linear-gradient(red, blue)';template.labels.top={on:true,text:'\ub300\ud654',x:540,y:100,size:40,weight:700};template.layout.reframe=true;template.captions.highlight=true;
  const f=api.radioFrameParams(template,'\uc81c\ubaa9','\ub450 \ubc88\uc9f8');
  assert.equal(f.headlineGradient1,template.headline.gradient1);assert.equal(f.topLabel,'\ub300\ud654');assert.equal(f.headlineRowGap,136.8);
  const c=api.radioCaptionParams(template);assert.equal(c.width,840);assert.equal(c.left,120);assert.equal(c.highlightColor,'#F8D30A');
  template.headline.on=false;const hidden=api.radioFrameParams(template,'\uc81c\ubaa9','\ub450 \ubc88\uc9f8');assert.equal(hidden.headline1,'');assert.equal(hidden.headline2,'');
  for(const id of ['political-show','news-briefing','news-direct','money-lab']){
   const profile=api.templateEditorProfile(migrated(id));assert.equal(profile.reframe,true);assert.equal(profile.headlineStroke,true);assert.equal(profile.labels,true);
  }
 });
 await t.test('local layout overrides remain effective after migration and disabling fixed row spacing',()=>{
  const template=migrated('political-show');template.variants={tiktok:{headline:{size1:123,rowGap:null}}};template.platformLayouts=false;api.validateTemplate(template);
  for(const platform of ['shorts','tiktok']){
   const result=api.forPlatform(template,platform);assert.equal(result.headline.size1,123);assert.equal(result.headline.rowGap,null);
   assert.equal(api.radioFrameParams(result,'one','two').headlineRowGap,null);
  }
  assert.equal(api.SCRIPT_BUILD,api.RADIO_SCRIPT_BUILD,'only one draft builder');
  const runtime=source.slice(source.indexOf('function validateTemplate'));
  assert.doesNotMatch(runtime,/\.renderer\s*(?:===|!==)/,'renderer tags are read only by migration');
 });
 await t.test('obsolete fields are discarded from base, variants and portable copies without losing live policies',()=>{
  const template=migrated('political-show');
  Object.assign(template,{framingMode:'single-speaker',sbsStyle:true,radioTemplate:true,logoArt:'old',demoOverlay:true});
  Object.assign(template.layout,{minShotSeconds:3,closeUpMin:2.8,splitHalves:true,reframeMode:'stacked',cameraMode:'preserve',splitPolicy:'never'});
  template.variants={tiktok:{layout:{minShotSeconds:4,closeUpMin:3,splitHalves:false,reframeMode:'speaker'},headline:{style:'plain'}}};
  template.thumbnail={enabled:true,mode:'preserve',references:[],instructions:'Keep faces'};
  const clean=api.cleanTemplate(template);
  for(const key of ['framingMode','sbsStyle','radioTemplate','logoArt','demoOverlay'])assert.equal(clean[key],undefined,key);
  for(const layout of [clean.layout,clean.variants.tiktok.layout])for(const key of ['minShotSeconds','closeUpMin','splitHalves','reframeMode'])assert.equal(layout[key],undefined,key);
  assert.equal(clean.layout.cameraMode,'preserve');assert.equal(clean.layout.splitPolicy,'never');assert.equal(clean.thumbnail.enabled,undefined);
  assert.equal(clean.variants.tiktok.headline.style,undefined);
  assert.equal(template.thumbnail.enabled,true,'normalizing a copy leaves the caller intact');
  assert.deepEqual(api.cleanTemplate(clean),clean,'normalization remains idempotent');
 });
 function renderGraphic(name,parameters){
  const literal=api.SCRIPT_BUILD.match(new RegExp('const '+name+': string = (".*");'));
  assert.ok(literal,name);const graphic={exports:{}};
  new Function('require','module','exports',esbuild.transformSync(JSON.parse(literal[1]),{loader:'tsx',format:'cjs'}).code)(dep,graphic,graphic.exports);
  return dep('react-dom/server').renderToStaticMarkup(dep('react').createElement(graphic.exports.default,{data:parameters}));
 }
 await t.test('footer gradient, font, shadow and stroke survive date extraction and render',()=>{
  const template=migrated('money-lab');template.headline.font='Test Font';
  Object.assign(template.labels.footer,{text:'Manual footer',auto:undefined,gradient:'linear-gradient(90deg,#ff0000,#0000ff)',strokeWidth:3,strokeColor:'#123456',shadowCss:'2px 3px 4px #654321'});
  const frame=api.radioFrameParams(template,'first','second');const p=api.splitDate(frame,api.STRINGS.en);
  assert.equal(p.frame.footer,undefined);assert.equal(p.dateLabel.gradient,template.labels.footer.gradient);assert.equal(p.dateLabel.fontFamily,'Test Font');
  const markup=renderGraphic('DATE_TSX',p.dateLabel);
  for(const value of ['linear-gradient(90deg,#ff0000,#0000ff)','Test Font','3px #123456','2px 3px 4px #654321','background-clip:text'])assert.ok(markup.includes(value),value);
  template.labels.footer.shadow=false;
  const noShadow=api.splitDate(api.radioFrameParams(template,'first','second'),api.STRINGS.en);assert.equal(noShadow.dateLabel.shadow,'none');
  template.labels.footer.auto='episodeDate';
  const date=api.splitDate(api.withEpisodeDate(api.radioFrameParams(template,'first','second'),template,'Episode 261020(\ud654)'),api.STRINGS.en);
  assert.equal(date.dateLabel.text,'261020(\ud654)');assert.equal(date.dateLabel.gradient,template.labels.footer.gradient);
 });
 await t.test('boxed title keeps gradient and disabled stroke stays disabled, including zero width',()=>{
  const template=migrated('money-lab');Object.assign(template.headline,{box2On:true,box2:'#234567',gradient2:'linear-gradient(red,blue)',strokeOn:false,shadow:false});
  let frame=api.radioFrameParams(template,'first','second');
  let markup=renderGraphic('FRAME_TSX',{...frame,designElement:'headline2'});
  assert.ok(markup.includes('background:#234567'));assert.ok(markup.includes('background:linear-gradient(red,blue)'));
  assert.ok(!markup.includes('px #000000'),'no implicit outline when disabled');
  template.headline.strokeOn=true;template.headline.strokeWidth=0;frame=api.radioFrameParams(template,'first','second');
  assert.equal(frame.headlineStrokeWidth,0);markup=renderGraphic('FRAME_TSX',{...frame,designElement:'headline2'});assert.ok(!markup.includes('text-stroke:12px'));assert.ok(markup.includes('text-stroke:0px transparent'));
 });
 await t.test('caption position is independent of an explicit width and zero left is retained',()=>{
  const template=migrated('news-briefing');delete template.captions.width;template.captions.left=120;
  let p=api.radioCaptionParams(template);assert.equal(p.left,120);assert.equal(p.width,undefined);
  let markup=renderGraphic('CAPTION_TSX',{...p,text:'Caption'});assert.ok(markup.includes('left:120px'));
  template.captions.left=0;template.captions.width=840;p=api.radioCaptionParams(template);
  markup=renderGraphic('CAPTION_TSX',{...p,text:'Caption'});assert.ok(markup.includes('left:0'));assert.ok(markup.includes('width:840px'));
 });

});
