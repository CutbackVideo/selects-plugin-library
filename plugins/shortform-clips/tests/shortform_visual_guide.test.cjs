'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;
test('optional scene visual guide',{skip:!modulesRoot&&'Set SBS_PANEL_TEST_MODULES'},async t=>{
 const dep=createRequire(path.resolve(modulesRoot,'../package.json')),ts=dep('typescript'),esbuild=dep('esbuild');
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),sf=ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {readTemplatePack,hydrateTemplatePack,validateTemplate,sceneVision,sceneStudyPrompt,sceneBuildPrompt};',{loader:'tsx',format:'cjs'}).code)(()=>dep('react'),mod,mod.exports);const api=mod.exports;
 const packRoot=path.join(__dirname,'../template-packs/hankook-ilbo'),raw=JSON.parse(fs.readFileSync(packRoot+'/templates/huick-alpha.json')),read=async p=>new Uint8Array(fs.readFileSync(packRoot+'/'+p));
 const installed=await api.hydrateTemplatePack(read),tpl=installed.templates.find(t=>t.id==='huick-alpha'),guide=tpl.editorial.visualGuide;
 const sourceImages=[{name:'original-video',dataUrl:'data:image/jpeg;base64,/9j/AA=='},{name:'original-images',dataUrl:'data:image/jpeg;base64,/9j/AA=='}];
 await t.test('declared pack asset hydrates, survives template copy and stays out of source collections',()=>{
  assert(guide.image.startsWith('data:image/jpeg;base64,'));assert.deepEqual(Buffer.from(guide.image.split(',')[1],'base64'),fs.readFileSync(path.join(packRoot,raw.editorial.visualGuide.image)));assert.equal(api.validateTemplate(tpl,true),tpl);
  const before=JSON.stringify(sourceImages),r=api.sceneVision(structuredClone(tpl),sourceImages);
  assert.equal(JSON.stringify(sourceImages),before);assert.deepEqual(r.images.slice(0,-1),sourceImages);assert.equal(r.images.at(-1).name,'template-visual-guide');assert.equal(r.images.at(-1).dataUrl,guide.image);assert.equal(r.visualGuide.description,guide.description);assert(!JSON.stringify(r.visualGuide).includes('base64'));assert(!('path'in r.visualGuide));
 });
 await t.test('missing, undeclared, malformed and oversized guides reject; old packs keep the exact source attachment list',async()=>{
  const legacy=structuredClone(tpl);delete legacy.editorial.visualGuide;const r=api.sceneVision(legacy,sourceImages);assert.equal(r.images,sourceImages);assert.equal(r.visualGuide,undefined);assert.equal(api.validateTemplate(legacy,true),legacy);
  for(const value of [null,{}, {image:'',description:'ok'},{image:guide.image,description:''},{image:'data:image/png;base64,/9j/AA==',description:'ok'},{image:'data:image/jpeg;base64,%%%=',description:'ok'},{image:'data:image/jpeg;base64,/9j/'+ 'A'.repeat(1500000),description:'ok'}]){const bad=structuredClone(tpl);bad.editorial.visualGuide=value;assert.throws(()=>api.validateTemplate(bad,true));}
  const bad=structuredClone(raw);bad.editorial.visualGuide.image='assets/undeclared.jpg';await assert.rejects(api.hydrateTemplatePack(async p=>p.endsWith('huick-alpha.json')?new TextEncoder().encode(JSON.stringify(bad)):read(p)),/not listed/);
  await assert.rejects(api.hydrateTemplatePack(async p=>p==='assets/huick-alpha-visual-guide.jpg'?new Uint8Array([1,2,3]):read(p)),/PNG, JPEG or WebP/);
  const nonScene=structuredClone(raw);nonScene.editorial.mode=undefined;nonScene.editorial.execution=undefined;nonScene.layout.windowTop=760;assert.throws(()=>api.validateTemplate(nonScene),/visual guide/);
 });
 await t.test('count, individual size and aggregate budget overflow never drops or mutates source images',()=>{
  const make=(n,size)=>Array.from({length:n},(_,i)=>({name:'source-'+i,dataUrl:'x'.repeat(size)}));
  for(const rows of [make(4,100),make(1,1500001),make(3,1300000)]){const before=JSON.stringify(rows);assert.throws(()=>api.sceneVision(tpl,rows),/budget/);assert.equal(JSON.stringify(rows),before);}
  const r=api.sceneVision(tpl,make(3,100));assert.equal(r.images.length,4);assert.equal(r.images.filter(i=>i.name==='template-visual-guide').length,1);
  assert.throws(()=>api.sceneVision(tpl,[{name:'template-visual-guide',dataUrl:'x'}]),/Duplicate/);
 });
 await t.test('actual planner and builder request expressions attach the same guide once with metadata-only prompt JSON',()=>{
  const calls=[],inputs=[];function visit(n){if(ts.isCallExpression(n)){const callee=n.expression.getText(sf),request=callee==='sdk.askAI'?n.arguments[0]:callee==='askScene'?n.arguments[1]:undefined;if(request?.getText(sf).includes('vision.'))calls.push(request);}if(ts.isVariableDeclaration(n)&&n.name.getText(sf)==='input'&&n.initializer?.getText(sf).includes('visualGuide:vision.visualGuide'))inputs.push(n.initializer);ts.forEachChild(n,visit);}visit(sf);
  assert.equal(calls.length,4,'bounded and legacy planner/builder callers');assert.equal(inputs.length,4,'each caller receives metadata');
  const vision=api.sceneVision(tpl,sourceImages),input={bounded:true,instructions:tpl.editorial.instructions,visualGuide:vision.visualGuide,captionDefaults:tpl.captions,headlineDefaults:tpl.headline,inventory:[{name:'actor.mov'}],sourceEvidence:[{name:'actor.mov'}],preparedMedia:[],clip:{name:'episode',beats:[],captions:[]},brand:{captions:tpl.captions},sourceReview:[],assetReview:[]};
  for(const node of calls){const expr=esbuild.transformSync('const result='+node.getText(sf),{loader:'ts'}).code;const request=new Function('vision','input','timeoutMs','sceneStudyPrompt','sceneBuildPrompt','prompt',expr+';return result;')(vision,input,1000,api.sceneStudyPrompt,api.sceneBuildPrompt,api.sceneBuildPrompt(input));assert.equal(request.images,vision.images);assert.equal(request.images.filter(i=>i.name==='template-visual-guide').length,1);assert(request.prompt.includes(guide.description));assert(!request.prompt.includes(guide.image));assert(!request.prompt.includes(raw.editorial.visualGuide.image));assert.equal(input.inventory.length,1);}
  const old=structuredClone(tpl);delete old.editorial.visualGuide;const legacy=api.sceneVision(old,[]);for(const node of calls.filter(n=>n.getText(sf).includes('vision.visualGuide?'))){const expr=esbuild.transformSync('const result='+node.getText(sf),{loader:'ts'}).code;const request=new Function('vision','input','timeoutMs','sceneStudyPrompt','sceneBuildPrompt','prompt',expr+';return result;')(legacy,{...input,visualGuide:undefined},1000,api.sceneStudyPrompt,api.sceneBuildPrompt,'old');assert(!('images'in request));}
 });
 await t.test('bounded builder uses the prepared exact logo without repeating image bytes; legacy keeps its logo image',()=>{
  const inputs=[];function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(sf)==='input'&&n.initializer&&ts.isObjectLiteralExpression(n.initializer)&&n.initializer.properties.some(p=>p.name?.getText(sf)==='draftName'))inputs.push(n.initializer);ts.forEachChild(n,visit);}visit(sf);
  const bounded=inputs.find(n=>n.properties.some(p=>p.name?.getText(sf)==='bounded')),legacy=inputs.find(n=>!n.properties.some(p=>p.name?.getText(sf)==='bounded'));assert(bounded&&legacy);
  const logo={id:'template-logo',resourceId:'r55',path:'/prepared/template-logo.png',width:300,height:100},vision=api.sceneVision(tpl,sourceImages);
  const scope={projectId:'project',clip:{name:'episode',beats:[]},workDirectory:'/work',study:{episode:'concept',sourceReview:[],assetReview:[]},mediaToolsPath:'/work/tools.js',requestsPath:'/work/requests.json',resultsPath:'/work/results.json',job:{note:''},brief:'',tpl,selectedNames:new Set(),preflight:{sources:[]},displayPrepared:[],logo,evidence:{visualEvidence:{sheets:[]},limitations:[]},vision,deadline:null,layoutDefaults:{logoCenter:120,headlineCenter:190}};
  const evaluate=node=>new Function(...Object.keys(scope),'return ('+esbuild.transformSync('const x='+node.getText(sf),{loader:'ts'}).code.replace(/^const x = /,'').replace(/;\s*$/,'')+');')(...Object.values(scope));
  const current=evaluate(bounded),old=evaluate(legacy),prompt=api.sceneBuildPrompt(current);
  assert.equal(current.brand.logo.mode,tpl.logo.mode);assert.equal(current.brand.logo.width,tpl.logo.width);assert.equal(current.brand.logo.imageName,tpl.logo.imageName);assert.equal(current.brand.logo.image,undefined);assert.deepEqual(current.preparedMedia,[logo]);assert(!JSON.stringify(current).includes(tpl.logo.image));assert(!prompt.includes(tpl.logo.image));assert(prompt.includes('imported by the host from the exact template logo image'));assert.equal(old.brand.logo.image,tpl.logo.image);
  const withBytes=structuredClone(current);withBytes.brand.logo.image=tpl.logo.image;const removed=JSON.stringify(withBytes).length-JSON.stringify(current).length;assert.equal(removed,tpl.logo.image.length+11);assert(removed>10000);
 });

});
