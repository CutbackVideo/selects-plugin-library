'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('templates use independent settings without renderer families',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {independentTemplateDesigns,normalizeTemplateSettings,validateTemplate,cleanTemplate,portableTemplate,templateEditorProfile,radioFrameParams,radioCaptionParams,forPlatform,merge,splitDate,withEpisodeDate,STRINGS,SCRIPT_BUILD,RADIO_SCRIPT_BUILD};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports;
 const raw=id=>JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/sbs-radio/templates/'+id+'.json'),'utf8'));
 const migrated=id=>api.validateTemplate(raw(id));
 const legacyPacks=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy-template-packs.json'),'utf8'));
 await t.test('legacy plain and outlined titles preserve their own geometry, background and user values',()=>{
  const old=structuredClone(legacyPacks['sbs-radio/political-show.json']);old.headline.size1=119;old.layout.windowTop=470;
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
  assert.deepEqual(portable.headline,plain.headline);assert.equal(portable.platformLayouts,undefined);
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
 await t.test('caption fitting uses the same safe width when omitted or explicitly supplied',()=>{
  for(const mode of ['bar','box']){
   const params={mode,fontSize:75,text:'\ub3d9\uc77c\ud55c \uc790\ub9c9\uc73c\ub85c \ud06c\uae30\uc640 \ud3f0\ud2b8\ub97c \ube44\uad50\ud569\ub2c8\ub2e4'};
   const implicit=renderGraphic('CAPTION_TSX',params);
   const explicit=renderGraphic('CAPTION_TSX',{...params,width:1000});
   assert.equal(implicit,explicit);
   assert.ok(Number(implicit.match(/font-size:([\d.]+)px/)[1])<75);
   assert.ok(implicit.includes('overflow-wrap:anywhere'));
   assert.ok(renderGraphic('CAPTION_TSX',{...params,text:'\uc9e7\uc740 \uc790\ub9c9'}).includes('font-size:75px'));
   const emphasized=renderGraphic('CAPTION_TSX',{...params,text:'*\ub3d9\uc77c\ud55c \uc790\ub9c9\uc73c\ub85c \ud06c\uae30\uc640 \ud3f0\ud2b8\ub97c \ube44\uad50\ud569\ub2c8\ub2e4*'});
   assert.equal(emphasized.match(/font-size:([\d.]+)px/)[1],implicit.match(/font-size:([\d.]+)px/)[1]);
  }
 });
 await t.test('italic headlines retain the chosen face and tilt both gradient and plain text',()=>{
  for(const headlineGradient1 of ['', 'linear-gradient(red,blue)']){
   const params={headline1:'\ud310\uc77d\uae30 \uc81c\ubaa9',fontFamily:'SDGyeokdongG206Hv',headlineFontWeight:400,headlineItalic:true,headlineGradient1};
   const html=renderGraphic('FRAME_TSX',params);
   assert.ok(html.includes('SDGyeokdongG206Hv'));
   assert.ok(html.includes('transform:skewX(-14deg)'));
   assert.ok(!html.includes('font-style:italic'));
   assert.ok(!renderGraphic('FRAME_TSX',{...params,headlineItalic:false}).includes('skewX'));
  }
 });
 await t.test('Premiere typography survives template normalization and export rendering',()=>{
  const expected=require('./fixtures/chosun-premiere-corrections.json').overrides;
  for(const [id,correction] of Object.entries(expected)){
   const template=api.validateTemplate(JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/chosun-ilbo/templates',id+'.json'),'utf8')));
   const frame=api.radioFrameParams(template,'First','Second');
   assert.equal(frame.fontFamily,correction.headline.font);
   assert.equal(frame.headlineSize1,correction.headline.size1 ?? template.headline.size1);
   assert.equal(frame.headlineSize2,correction.headline.size2 ?? template.headline.size2);
   const html=renderGraphic('FRAME_TSX',frame);
   assert.ok(html.includes(correction.headline.font),id+': selected face reaches export');
   assert.ok(html.includes('font-size:'+template.headline.size1+'px'),id+': no size lost');
   assert.ok(html.includes('font-weight:400'),id+': no synthetic bold');
   if(id==='heukbaek'){
    assert.equal(frame.headlineColor2,'#FF29B8');
    assert.equal(frame.headlineStrokeOn,false);
    assert.equal(frame.headlineShadow,'none');
    assert.equal(frame.headlineIdeographFont,'MPLUS1p-Medium');
    const mixed=renderGraphic('FRAME_TSX',{...frame,headline1:'與 \ud55c\uad6d\uc5b4',headline2:'\uc9c8\ubb38?'});
    assert.match(mixed,/MPLUS1p-Medium/);
    assert.match(mixed,/>與<\/span>/);
   }
   if(id==='history'||id==='villain'){
    assert.equal(frame.headlineStrokeOn,false);
    assert.ok(html.includes('gap:14px'));
    assert.ok(html.includes('padding:4px 18px 8px'));
    assert.equal(frame.headlineSize1*frame.headlineLineHeight+6+14,136);
   }
   if(correction.captions){
    const params=api.radioCaptionParams(template);
    assert.equal(params.fontFamily,correction.captions.font);
    assert.equal(params.fontSize,correction.captions.fontSize);
    assert.ok(renderGraphic('CAPTION_TSX',{...params,text:'Caption'}).includes(correction.captions.font));
   }
  }
 });
 await t.test('Panilgi preserves independent tracking and paragraph geometry',()=>{
  const t=require('../template-packs/chosun-ilbo/templates/panilgi.json');
  const params=api.radioFrameParams(t,'First','Second');
  assert.equal(params.headlineLetterSpacing1,0);
  assert.equal(params.headlineLetterSpacing2,-12*67.30612182617188*1.12/1000);
  const html=renderGraphic('FRAME_TSX',params);
  assert.match(html,/letter-spacing:0/);
  assert.ok(html.includes('letter-spacing:'+params.headlineLetterSpacing2+'px'));
  assert.equal(params.headlineColor1,'#FFE400');assert.equal(params.headlineShadow,'none');
  assert.equal(t.captions.boxPerLine,false);assert.equal(t.captions.boxBounds,'ink');
  assert.equal(t.captions.baselineBottom,(.65000003576278687*1920+576-960)+.26510417461395264*1920);
  for(const field of ['letterSpacing1','letterSpacing2']) assert.throws(()=>api.validateTemplate({...t,headline:{...t.headline,[field]:NaN}}),/finite/);
 });
 await t.test('all shipped presets retain only the original TikTok design and identity',()=>{
  const root=path.join(__dirname,'../template-packs');
  const files=fs.readdirSync(root).flatMap(pack=>{
   const dir=path.join(root,pack,'templates');
   return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>pack+'/'+f):[];
  });
  const expectedFiles=["chosun-ilbo/health.json"];
  for(const [key,legacy] of Object.entries(legacyPacks)){
   const [pack]=key.split('/');
   const before=api.validateTemplate(structuredClone(legacy));
   for(const design of api.independentTemplateDesigns(before)){
    const file=design.id+'.json';expectedFiles.push(pack+'/'+file);
    const current=JSON.parse(fs.readFileSync(path.join(root,pack,'templates',file),'utf8'));
    const expected=structuredClone(design);
    // These presets intentionally opt into conversation framing after migration.
    if(pack==='hankook-ilbo'&&['issue-broadcast','knowledge-exchange'].includes(design.id)){
     expected.version+=1;
     Object.assign(expected.layout,{reframe:true,reframePreset:'conversation',reframeFocus:'reactions',splitPolicy:'never',widePolicy:'never',reframePacing:'balanced',cropMotion:'fixed',cameraMode:'auto',closeUp:4.5,faceY:40});
    }
    assert.deepEqual(current,expected,key+': preserve the design and apply explicit framing preferences');
    assert.equal(current.variants,undefined);assert.equal(current.platformLayouts,undefined);
    assert.deepEqual(api.validateTemplate(structuredClone(current)),current,key+': no migration needed');
    const platform='tiktok';
    if(platform==='tiktok'){assert.equal(file,key.split('/')[1]);assert.deepEqual(current.names,legacy.names);assert.equal(current.id,legacy.id);}
    const a=api.forPlatform(before,platform),b=current;
    const frameA=api.radioFrameParams(a,'First headline','Second headline');
    const frameB=api.radioFrameParams(b,'First headline','Second headline');
    assert.deepEqual(frameB,frameA,key+'/'+platform);
    for(const designElement of ['background','headline1','headline2','logo']){
     assert.equal(renderGraphic('FRAME_TSX',{...frameB,designElement}),renderGraphic('FRAME_TSX',{...frameA,designElement}),key+'/'+platform+'/'+designElement);
    }
    const captionA=api.radioCaptionParams(a),captionB=api.radioCaptionParams(b);
    assert.deepEqual(captionB,captionA);
    assert.equal(renderGraphic('CAPTION_TSX',{...captionB,text:'Caption'}),renderGraphic('CAPTION_TSX',{...captionA,text:'Caption'}));
    const dateA=api.splitDate(frameA,api.STRINGS.en),dateB=api.splitDate(frameB,api.STRINGS.en);
    assert.deepEqual(dateB,dateA);
    if(dateA.dateLabel)assert.equal(renderGraphic('DATE_TSX',dateB.dateLabel),renderGraphic('DATE_TSX',dateA.dateLabel));
   }
  }
  // These presets were migrated separately from the customer-specific app.
  for(const id of ['heukbaek','history','money','panilgi','villain']){
   expectedFiles.push('chosun-ilbo/'+id+'.json');
   const current=JSON.parse(fs.readFileSync(path.join(root,'chosun-ilbo','templates',id+'.json'),'utf8'));
   assert.equal(current.variants,undefined);assert.equal(current.platformLayouts,undefined);
   assert.deepEqual(api.validateTemplate(structuredClone(current)),current,id+': no migration needed');
  }
  // Scene templates are new designs, not migrations of the legacy presets.
  expectedFiles.push('hankook-ilbo/huick-alpha.json');
  const scene=JSON.parse(fs.readFileSync(path.join(root,'hankook-ilbo','templates','huick-alpha.json'),'utf8'));
  assert.equal(scene.id,'huick-alpha');assert.equal(scene.editorial.mode,'scenes');
  assert.equal(scene.variants,undefined);assert.equal(scene.platformLayouts,undefined);
  assert.deepEqual(api.validateTemplate(structuredClone(scene)),scene,'Huick: no migration needed');
  assert.deepEqual(files.sort(),expectedFiles.sort());
 });
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

 await t.test('health template preserves customer faces and separate caption boxes in export',()=>{
  const health=api.validateTemplate(JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/chosun-ilbo/templates/health.json'),'utf8')));
  assert.equal(health.headline.font,'SDGyeokdongG206Hv');
  assert.equal(health.captions.font,'SDGyeokdongG204Rg');
  assert.equal(health.headline.size1,128*.5*1.2);
  // Text subgroup is 24px above its anchor before the outer 120% transform.
  const baseline1=(233-24-960)*1.2+0.58098959922790527*1920;
  const baseline2=(320-24-960)*1.2+0.58098959922790527*1920;
  assert.ok(Math.abs(health.layout.headlineCenter-((baseline1+baseline2)/2-(health.headline.size1+health.headline.size2)/2*.3))<1e-8);
  const frame=api.radioFrameParams(health,'Title one','Title two');
  assert.ok(frame.headlineOffsetX1 < -5 && frame.headlineOffsetX1 > -6);
  assert.ok(renderGraphic('FRAME_TSX',frame).includes('translateX('+frame.headlineOffsetX1+'px)'));
  assert.throws(()=>api.validateTemplate({...health,headline:{...health.headline,offsetX1:541}}),/Invalid headline/);

  assert.equal(health.layout.windowTop,394);assert.equal(health.layout.windowBottom,1500);
  assert.equal(health.logo.mode,'none');assert.equal(health.background.canvasAligned,true);
  const params=api.radioCaptionParams(health);
  assert.equal(params.rowGap,129.2);assert.equal(params.boxPerLine,true);
  assert.equal(params.boxBounds,'ink');assert.equal(params.baselineBottom,1424);
  assert.equal(params.shadowSpec.size,4*.59*.95);
  assert.equal(params.shadowSpec.angle,135);
  assert.throws(()=>api.validateTemplate({...health,captions:{...health.captions,shadowSpec:{...params.shadowSpec,size:-1}}}),/Invalid native shadow/);
  const html=renderGraphic('CAPTION_TSX',{...params,boxBounds:undefined,text:'First line\nSecond line'});
  assert.equal((html.match(/background:/g)||[]).length,2);
  assert.ok(html.includes('SDGyeokdongG204Rg'));assert.ok(html.includes('51, 53, 58') || html.includes('#33353A99'));
  assert.equal(health.captions.boxColor,'#33353A99');
  assert.ok(health.captions.bottom>1455 && health.captions.bottom<1456);
  assert.throws(()=>api.validateTemplate({...health,captions:{...health.captions,rowGap:NaN}}),/finite/);
 });

});
