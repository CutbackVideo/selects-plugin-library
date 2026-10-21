const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('Premiere outline and baseline survive import, sharing and export parameters',{skip:!modules},()=>{
 const dep=require('node:module').createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {validateTemplate,portableTemplate,radioCaptionParams,radioFrameParams};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const api=m.exports,raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-drafts/jeongjwippul/template.json')));
 const t=api.validateTemplate(api.portableTemplate(api.validateTemplate(raw))),p=api.radioCaptionParams(t);
 const f=api.radioFrameParams(t,"first","second");assert.equal(f.headlineLetterSpacing1,-95*.04);assert.equal(f.headlineLetterSpacing2,-95.16839599609375*.04);
 assert.equal(p.strokeWidth,7);assert.equal(p.strokeOn,true);assert.equal(p.strokeColor,'#000000');assert.ok(Math.abs(p.baselineTop-1098)<.001);assert.equal(p.fontSize,58.944522857666016);assert.equal(p.fontFamily,'SDMyeongjo-bMd');
 for(const value of [-1,NaN,Infinity,31])assert.throws(()=>api.validateTemplate({...t,captions:{...t.captions,strokeWidth:value}}),/stroke width|finite/);
 assert.throws(()=>api.validateTemplate({...t,captions:{...t.captions,strokeColor:'url(unsafe)'}}),/stroke color/);
 assert.throws(()=>api.validateTemplate({...t,captions:{...t.captions,baselineTop:undefined}}),/measured baseline/);
 const off=api.radioCaptionParams(api.validateTemplate({...t,captions:{...t.captions,strokeOn:false}}));assert.equal(off.strokeOn,false);assert.equal(off.strokeWidth,7,'turning off retains the chosen width');
});

test('templates never apply clip-specific blur, including older imported settings',{skip:!modules},async()=>{
 const dep=require('node:module').createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {SCRIPT_DESIGN_ELEMENTS,radioFrameParams};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-drafts/jeongjwippul/template.json')));
 assert.equal(raw.layout.sourceMaskBlur,undefined);
 raw.layout.sourceMaskBlur={enabled:true};
 const frame=m.exports.radioFrameParams(raw,'title','subtitle');
 assert.equal(frame.sourceMaskBlur,undefined);
 const code=dep('esbuild').transformSync(m.exports.SCRIPT_DESIGN_ELEMENTS,{loader:'ts',format:'cjs'}).code;
 const emit=new Function('FRAME_TSX',code+';return addTemplateDesignElements;')('');
 let graphics=0;
 await emit({addMotionGraphic:async()=>{graphics++},rangeAtFrames:async()=>({})},{frame:{...frame,sourceMaskBlur:{enabled:true}}},30);
 assert.ok(graphics>0,'design emits without accessing clips or applying video effects');
});
