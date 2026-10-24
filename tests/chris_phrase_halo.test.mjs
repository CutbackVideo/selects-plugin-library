// Portable renderer contract tests. Real Chrome pixel A/B is preserved separately
// as task evidence; this suite needs only the CI's existing TypeScript and React.
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';import{loadPanelModule}from'./panel_module_fixture.mjs';
const app=process.env.SELECTS_DEV_REPO||(process.env.SBS_PANEL_TEST_MODULES?path.dirname(process.env.SBS_PANEL_TEST_MODULES):null);assert.ok(app,'Use existing TypeScript and React dependencies');
const require=createRequire(path.join(app,'package.json')),React=require('react');
const source=fs.readFileSync(new URL('../plugins/chris-williamson-style/src/captions.tsx',import.meta.url),'utf8');let frame=20,width=1080,height=1920;
const {Caption,phraseHalo,phraseOutline}=loadPanelModule(source,{names:['Caption','phraseHalo','phraseOutline'],React,modules:{remotion:{AbsoluteFill:'div',useCurrentFrame:()=>frame,useVideoConfig:()=>({width,height,fps:30})}},filename:'src/captions.tsx'});
const base={text:'Clear details',wordStartsSeconds:[0,.5],revealStartSeconds:0,revealSpanSeconds:.5,fontFamily:'Chris Reference Inter',fontWeight:'800',fontSize:53,captionY:50,trackingEm:-.03,color:'#ffffff',dimSeconds:.1,dimOpacity:.55};
function render(patch={},at=20){frame=at;const data={...base,...patch},tree=Caption({data}),line=tree.props.children.find(x=>x?.type==='div');return{data,line,words:line.props.children}}
test('ordinary glyphs gain an opaque opposite-color halo while retaining the existing outline',()=>{
 for(const color of ['#ffffff','#111111']){
  const {line}=render({color}),edge=phraseOutline(color,53),halo=phraseHalo(color,53);
  assert.equal(line.props.style.WebkitTextStroke,edge.WebkitTextStroke);assert.equal(line.props.style.paintOrder,edge.paintOrder);assert.equal(line.props.style.textShadow,halo);
  assert.ok(halo.split(', ').every(value=>value.endsWith(color==='#ffffff'?'#111111':'#ffffff')));assert.doesNotMatch(halo,/rgba|opacity|blur/);
 }
});
test('the halo leaves font, position, layout and caller-owned parameters unchanged',()=>{
 const {data,line}=render(),s=line.props.style;assert.deepEqual(data,base);assert.equal(s.fontSize,53);assert.equal(s.fontWeight,800);assert.equal(s.color,'#ffffff');assert.equal(s.letterSpacing,'-0.03em');assert.equal(s.top,'50%');assert.equal(s.left,'3%');assert.equal(s.width,'94%');assert.equal(s.transform,'translateY(-50%)');assert.equal(s.whiteSpace,'pre-wrap');
});
test('hidden, dim and revealed words keep their original timing and alpha',()=>{
 const hidden=render({},-1),dim=render({},1),shown=render({},20);
 assert.ok(hidden.words.every(word=>word.props.style.opacity===0));assert.equal(dim.words[0].props.style.opacity,1);assert.equal(dim.words[0].props.style.WebkitTextFillColor,'rgba(255, 255, 255, 0.55)');assert.equal(dim.words[1].props.style.opacity,0);assert.ok(shown.words.every(word=>word.props.style.opacity===1));assert.ok(shown.line.props.style.textShadow);
 const dark=render({color:'#111111'},1);assert.equal(dark.words[0].props.style.WebkitTextFillColor,'rgba(17, 17, 17, 0.55)');
});
test('fallback keywords gain a thin opposite-color contour without phrase stroke or layout changes',()=>{
 for(const color of ['#ffffff','#111111']){
  const {data,line,words}=render({keyword:true,text:'got it',fontSize:244,color}),style=line.props.style;
  assert.ok(style.textShadow,'fallback keywords need contrast on same-color highlights');
  assert.ok(style.textShadow.split(', ').every(shadow=>shadow.endsWith(color==='#ffffff'?'#111111':'#ffffff')));
  assert.equal(style.textShadow,phraseHalo(color,244,2));
  assert.equal(style.WebkitTextStroke,undefined);assert.equal(style.paintOrder,undefined);
  assert.equal(style.fontSize,244);assert.equal(style.color,color);assert.equal(style.fontWeight,800);
  assert.equal(style.top,'50%');assert.equal(style.left,'3%');assert.equal(style.width,'94%');
  assert.equal(style.transform,'translateY(-50%)');assert.equal(style.whiteSpace,'nowrap');
  assert.equal(style.overflowWrap,'normal');assert.equal(style.letterSpacing,'-0.03em');
  assert.equal(data.keyword,true);assert.equal(data.text,'got it');
  assert.ok(words.every(word=>word.props.style.opacity===1));
 }
});
test('keyword contour is raster-scaled and capped independently of hero font size',()=>{
 try{
  for(const scale of [1,.5,1/3]){
   width=1080*scale;height=1920*scale;
   for(const fontSize of [53,244,400]){
    const {line}=render({keyword:true,fontSize}),shadow=line.props.style.textShadow;
    assert.ok(shadow,'the complete renderer must apply the capped helper');
    const radius=Math.max(...[...shadow.matchAll(/(-?[\d.]+)px/g)].map(match=>Math.abs(Number(match[1]))));
    assert.ok(radius>0&&radius<=2*scale,`keyword radius ${radius} at scale ${scale} must stay thin`);
    assert.equal(line.props.style.fontSize,fontSize*scale);
   }
  }
 }finally{width=1080;height=1920;}
});
test('fallback keyword reveal and individual-word motion remain unchanged at every phase',()=>{
 for(const frame of [-1,1,20]){
  const {words}=render({keyword:true,text:'got it',fontSize:244},frame);
  assert.ok(words.every(word=>word.props.style.opacity===1));
  assert.ok(words.every(word=>word.props.style.transform===undefined&&word.props.style.position===undefined));
  assert.ok(words.every(word=>word.props.style.WebkitTextFillColor===undefined));
 }
});
test('contrast protection is independent of phrase wording and does not move individual words',()=>{
 const a=render({text:'Bright shelves'}),b=render({text:'A different ordinary phrase',wordStartsSeconds:[0,.1,.2,.3]});assert.equal(a.line.props.style.textShadow,b.line.props.style.textShadow);assert.equal(a.line.props.style.fontSize,b.line.props.style.fontSize);for(const word of b.words){assert.equal(word.props.style.transform,undefined);assert.equal(word.props.style.position,undefined)}
});
