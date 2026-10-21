const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('landscape source-video template',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {encodeSharedTemplate,decodeSharedTemplate,landscapeTransform,landscapeSpeakerCues,radioFrameParams,radioCaptionParams,LANDSCAPE_GRAPHIC_TSX,SCRIPT_BUILD};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const a=mod.exports,T=JSON.parse(fs.readFileSync(path.join(root,'template-drafts/politics-landscape/template.json')));
 await t.test('portable roundtrip preserves landscape geometry and explicit speaker mappings',()=>{
  T.landscape.speakers=[{label:'Speaker 1',name:'Example',role:'Chair',color:'#FFFF00'}];
  const bytes=a.encodeSharedTemplate(T);assert.equal(JSON.parse(new TextDecoder().decode(bytes)).templateApi,6);
  assert.deepEqual(a.decodeSharedTemplate(bytes).landscape,T.landscape);
 });
 await t.test('invalid and mixed portrait geometry is rejected',()=>{
  for(const change of [{videoWidth:2000},{captionY:719},{speakers:[{label:'A',name:'B',role:'',color:'red'}]}]){
   const x=structuredClone(T);Object.assign(x.landscape,change);assert.throws(()=>a.decodeSharedTemplate(a.encodeSharedTemplate(x)));
  }
 });
 await t.test('16:9 inputs of different resolutions have the same non-cropping transform',()=>{
  const expected=a.landscapeTransform(T.landscape,{width:1280,height:720});
  assert.equal(expected.scale,1046/1280);assert.equal(expected.posX,0);
  for(const [width,height] of [[1920,1080],[3840,2160]])assert.ok(Math.abs(a.landscapeTransform(T.landscape,{width,height}).scale-expected.scale)<1e-12);
  const portrait=a.landscapeTransform(T.landscape,{width:1080,height:1920});assert.ok(Math.abs(portrait.scale-1046/1280)<1e-12);
  assert.throws(()=>a.landscapeTransform(T.landscape,{width:0,height:0}));
 });
 await t.test('speaker changes split captions and unmapped identities remain hidden',()=>{
  const words=[['one',0,10,0,1,null,'Speaker 1','v'],['two',12,20,12,2,null,'Speaker 2','v'],['three',22,30,22,1,null,'Speaker 1','other']];
  const cues=a.landscapeSpeakerCues(words,30,27,40,{},g=>[[g[0][1],40,g.map(w=>w[0]).join(' ')]],T.landscape.speakers);
  assert.deepEqual(cues.map(c=>c.slice(0,3)),[[0,12,'one'],[12,22,'two'],[22,40,'three']]);assert.equal(cues[0][3].name,'Example');assert.equal(cues[1][3],null);
 });
 await t.test('blank event information is never replaced by an AI headline',()=>{
  assert.equal(a.radioFrameParams(T,'Invented event','').headline1,'');assert.deepEqual(a.radioCaptionParams(T).landscape,T.landscape);
 });
 await t.test('decimal values survive landscape caption punctuation cleanup',()=>{
  const declaration=a.SCRIPT_BUILD.split('\n').find(line=>line.startsWith('const shown ='));
  const shown=new Function('P',dep('esbuild').transformSync(declaration+'\nreturn shown;',{loader:'ts'}).code)({frame:{landscape:T.landscape}});
  assert.equal(shown('37.1\ud504\ub85c. 58.5\ud504\ub85c.'),'37.1\ud504\ub85c 58.5\ud504\ub85c');
 });
 await t.test('saved ink bounds remain importable when the per-line toggle is off',()=>{
  const x=structuredClone(T);x.captions.mode='box';x.captions.boxBounds='ink';x.captions.boxPerLine=false;x.captions.baselineBottom=663;
  assert.equal(a.decodeSharedTemplate(a.encodeSharedTemplate(x)).captions.boxPerLine,false);
 });
 await t.test('captions and intermittent nameplates each reuse one overlay lane',async()=>{
  const start=a.SCRIPT_BUILD.indexOf('  for (let k = 0; k < cues.length; k++) {',a.SCRIPT_BUILD.indexOf('let cueCount = 0;'));
  const end=a.SCRIPT_BUILD.indexOf('\n}\nconst out:',start);
  const code=dep('esbuild').transformSync(a.SCRIPT_BUILD.slice(start,end),{loader:'ts',target:'es2022'}).code;
  for(const landscape of [T.landscape,null]) {
   const lanes=[[{start:0,end:100,label:'Frame'}]];
   const d={rangeAtFrames:async(start,end)=>({start,end}),addMotionGraphic:async x=>{
    const lane=lanes.at(-1), {start,end}=x.within;
    if(lane.some(c=>c.start<end&&start<c.end))lanes.push([]);
    lanes.at(-1).push({start,end,label:x.label,parameters:x.parameters});
   }};
   const speaker={name:'A',role:'Host',color:'#FFFFFF'};
   const cues=[[0,10,'one',speaker],[10,20,'two',null],[25,35,'three',speaker],[35,40,' ',speaker],[45,45,'empty',speaker],[90,110,'last',speaker]];
   const run=new Function('d','P','cues','LANDSCAPE_GRAPHIC_TSX','CAPTION_TSX','markCue',
    'return (async()=>{let cueCount=0;const endFrame=100;'+code+';return cueCount;})();');
   assert.equal(await run(d,{frame:{landscape},caption:{},editableCaption:[]},cues,'landscape','portrait',x=>x),4);
   assert.equal(lanes.length,landscape?3:2);
   assert.deepEqual(lanes[1].map(c=>c.label),['Caption 01','Caption 02','Caption 03','Caption 06']);
   if(landscape)assert.deepEqual(lanes[2].map(c=>c.label),['Speaker 1','Speaker 3','Speaker 6']);
   assert.equal(lanes[1].at(-1).end,100);
  }
 });
 await t.test('exported graphic matches the source and can compile',()=>{
  assert.equal(a.LANDSCAPE_GRAPHIC_TSX,fs.readFileSync(path.join(root,'landscape/graphic.tsx'),'utf8'));
  dep('esbuild').transformSync(a.LANDSCAPE_GRAPHIC_TSX,{loader:'tsx'});
  assert.ok(a.SCRIPT_BUILD.includes('landscapeTransform(P.frame.landscape,sm.frameSize)'));
 });
});
