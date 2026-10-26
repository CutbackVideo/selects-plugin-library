import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {buildDailyFixture as build,fontBytes,licenseBytes} from './daily_font_fixture.mjs';
// The complete production build must save a self-contained first graphic only.
test('the saved opening embeds the original OFL font and license with Pro first',async()=>{
 const b=await build(25),opening=b.graphics[0];
 assert.equal(opening.parameters.fontFamily,'"Chelsea Market Pro", "Chelsea Market"');
 assert.match(opening.parameters.fontCss,/font-family:\s*['"]Chelsea Market['"]/);
 const encoded=opening.parameters.fontCss.match(/data:font\/ttf;base64,([A-Za-z0-9+/=]+)/)?.[1];
 assert.ok(encoded);assert.equal(Buffer.byteLength(opening.parameters.fontCss),235095);assert.deepEqual(Buffer.from(encoded,'base64'),fontBytes);
 assert.ok(opening.parameters.fontCss.includes(licenseBytes.toString('utf8')));assert.ok(opening.parameters.fontCss.includes('*/\n@font-face'),'CSS declaration must follow a real newline, not an escaped-text token');
 assert.ok(b.graphics.slice(1).every(g=>g.parameters.fontCss===undefined));
 assert.ok(b.fontReads.length>=5);assert.ok(b.fontReads.every(r=>r.length<=49152));
});
for(const [label,fontOptions]of[['missing',{failure:new Error('owned font unavailable')}],['truncated',{truncate:true}],['invalid',{invalid:true}],['invalid encoded character',{encodingCorrupt:'alphabet'}],['noncanonical padding bits',{encodingCorrupt:'padding'}]])test(label+' font is a real build error before save',async()=>{const lifecycle={};await assert.rejects(build(25,{fontOptions,lifecycle}),/font|file|incomplete|unavailable/i);assert.equal(lifecycle.drafts||0,0);assert.equal(lifecycle.commits||0,0);});

test('the packaged font is the unmodified official OFL source with all accompanying files',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../plugins/daily-vlog-8/plugin.json',import.meta.url),'utf8'));
 for(const name of ['ChelseaMarket-Regular.ttf.b64','OFL.txt','METADATA.pb']){
  const relative='assets/fonts/chelseamarket/'+name;assert.ok(manifest.files.includes(relative));
  assert.ok(fs.statSync(new URL('../plugins/daily-vlog-8/'+relative,import.meta.url)).size>0);
 }
 assert.equal(createHash('sha256').update(fontBytes).digest('hex'),'7243be29a2d74e6a826e1091f74c89e58cc8010047c6db8de13f616e81b1f5f2');
 assert.match(licenseBytes.toString(),/Reserved Font Name "Chelsea Market"/);
 const metadata=fs.readFileSync(new URL('../plugins/daily-vlog-8/assets/fonts/chelseamarket/METADATA.pb',import.meta.url),'utf8');assert.match(metadata,/license: "OFL"/);assert.match(metadata,/filename: "ChelseaMarket-Regular.ttf"/);
});

test('the complete opening renderer injects only supplied CSS and preserves an explicit custom family',async()=>{
 const {loadPanelModule}=await import('./panel_module_fixture.mjs');
 const {dailyModule,React}=await import('./daily_font_fixture.mjs');
 const {OPENING}=dailyModule(['OPENING']);
 const {OpeningTitle}=loadPanelModule(OPENING,{names:['OpeningTitle'],React,modules:{remotion:{AbsoluteFill:'div',useCurrentFrame:()=>50,useVideoConfig:()=>({width:1920,height:1080,durationInFrames:150}),interpolate:()=>36}}});
 const css='@font-face{font-family:"Chelsea Market";src:url(data:font/ttf;base64,AAEAAA==)}';
 for(const family of ['"Chelsea Market Pro", "Chelsea Market"','Courier New']){
  const data={text:'DAILY VLOG',fontFamily:family,fontCss:css,fontSize:255,color:'#FEDC5E'},tree=OpeningTitle({data}),style=tree.props.children[0],glyphs=tree.props.children[1].filter(Boolean);
  assert.equal(style.type,'style');assert.equal(style.props.children,css);
  assert.equal(glyphs.map(g=>g.props.children).join(''),'DAILYVLOG');
  assert.ok(glyphs.every(g=>g.props.style.fontFamily===family&&g.props.style.fontSize===255&&g.props.style.fontWeight===900&&g.props.style.color==='#FEDC5E'));
  assert.deepEqual(data,{text:'DAILY VLOG',fontFamily:family,fontCss:css,fontSize:255,color:'#FEDC5E'});
 }
 const legacy=OpeningTitle({data:{text:'DAILY VLOG',fontFamily:'Chelsea Market Pro'}});
 assert.equal(legacy.props.children[0],undefined);
});
