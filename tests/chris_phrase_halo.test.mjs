// Portable renderer contract tests. Real Chrome pixel A/B is preserved separately
// as task evidence; this suite needs only the CI's existing TypeScript and React.
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';import{loadPanelModule}from'./panel_module_fixture.mjs';
const app=process.env.SELECTS_DEV_REPO||(process.env.SBS_PANEL_TEST_MODULES?path.dirname(process.env.SBS_PANEL_TEST_MODULES):null);assert.ok(app,'Use existing TypeScript and React dependencies');
const require=createRequire(path.join(app,'package.json')),React=require('react');
const source=fs.readFileSync(new URL('../plugins/chris-williamson-style/src/captions.tsx',import.meta.url),'utf8');let frame=20;
const {Caption,phraseHalo,phraseOutline}=loadPanelModule(source,{names:['Caption','phraseHalo','phraseOutline'],React,modules:{remotion:{AbsoluteFill:'div',useCurrentFrame:()=>frame,useVideoConfig:()=>({width:1080,height:1920,fps:30})}},filename:'src/captions.tsx'});
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
test('keyword glyphs keep the old renderer without ordinary halo or outline',()=>{
 const {line,words}=render({keyword:true});assert.equal(line.props.style.textShadow,undefined);assert.equal(line.props.style.WebkitTextStroke,undefined);assert.equal(line.props.style.paintOrder,undefined);assert.equal(line.props.style.whiteSpace,'nowrap');assert.ok(words.every(word=>word.props.style.opacity===1));
});
test('contrast protection is independent of phrase wording and does not move individual words',()=>{
 const a=render({text:'Bright shelves'}),b=render({text:'A different ordinary phrase',wordStartsSeconds:[0,.1,.2,.3]});assert.equal(a.line.props.style.textShadow,b.line.props.style.textShadow);assert.equal(a.line.props.style.fontSize,b.line.props.style.fontSize);for(const word of b.words){assert.equal(word.props.style.transform,undefined);assert.equal(word.props.style.position,undefined)}
});
