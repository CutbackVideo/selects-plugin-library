import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import test from 'node:test';

const dep=createRequire(path.resolve(process.env.SBS_PANEL_TEST_MODULES,'../package.json'));
const ts=dep('typescript'),esbuild=dep('esbuild');
const ids=['archive-vlog','mini-vlog','city-weekend-vlog','selfie-aesthetic','summer-trip','the-end-credits','torn-paper-love'];
const declarations=new Set(['LANGS','Lang','Msg','Vars','I18N_TABLE','WIDE_RE','normLang','uiLang','t','tOr','fieldLen','fieldClip','textMessage']);
function load(id,strings){
 const file=process.env.TEMPLATE_TEXT_SOURCE_ROOT?path.join(process.env.TEMPLATE_TEXT_SOURCE_ROOT,id+'.tsx'):new URL('../plugins/'+id+'/panel.tsx',import.meta.url);
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(id,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const name=node=>node.name?.text??node.declarationList?.declarations[0]?.name?.text;
 const dictionary=ast.statements.find(node=>name(node)==='STRINGS').getText(ast);
 const runtime=ast.statements.filter(node=>declarations.has(name(node))).map(node=>node.getText(ast)).join('\n');
 const code=esbuild.transformSync((strings?'const STRINGS=JSON.parse('+JSON.stringify(JSON.stringify(strings))+');':dictionary)+'\n'+runtime+'\nglobalThis.api={normLang,uiLang,t,tOr,fieldLen,fieldClip:typeof fieldClip==="function"?fieldClip:null};',{loader:'ts',target:'es2022'}).code;
 const navigator={language:'ja-JP'},context=vm.createContext({Intl,navigator});vm.runInContext(code,context);
 return {api:context.api,navigator};
}

for(const id of ids){
 test(id+' unknown dictionary keys cannot read JavaScript prototype members',()=>{
  const {api}=load(id);
  for(const key of ['constructor','toString','valueOf','hasOwnProperty','__proto__']){
   assert.equal(api.t('en',key),key,'Missing messages retain their key.');
   assert.equal(api.tOr('ko',key,'Preset fallback'),'Preset fallback','Optional messages retain their supplied label.');
  }
 });
 test(id+' language changes and unsupported locales retain explicit fallback order',()=>{
  const {api,navigator}=load(id);assert.equal(api.normLang('KO_kr'),'ko');assert.equal(api.normLang('xx-ZZ'),null);
  assert.equal(api.uiLang({language:'en-US'}),'en');assert.equal(api.uiLang({language:'ko-KR'}),'ko');
  assert.equal(api.uiLang({language:'xx'}),'ja');navigator.language='de-DE';assert.equal(api.uiLang(null),'de');navigator.language='xx';assert.equal(api.uiLang(null),'en');
 });
 test(id+' dictionary ownership, plural forms, interpolation and optional fallbacks remain local',()=>{
  const table={en:{sample:{one:'{count} item for {name}',other:'{count} items for {name}'},constructor:'Own label'},de:{sample:'{count} Eintraege fuer {name}'}};
  const {api}=load(id,table),other=load(id,{en:{sample:'Other panel'}}).api;
  assert.equal(api.t('en','sample',{count:1,name:'A'}),'1 item for A');assert.equal(api.t('en','sample',{count:2,name:'B'}),'2 items for B');
  assert.equal(api.t('de','sample',{count:1234.5,name:'C'}),'1.234,5 Eintraege fuer C');
  assert.equal(api.t('en','sample',{count:1}),'1 item for {name}');assert.equal(api.t('ko','constructor'),'Own label');
  assert.equal(other.t('en','sample'),'Other panel');assert.equal(api.tOr('en','new-label','Original label'),'Original label');
 });
 test(id+' field counters preserve wide-character and code-point policy',()=>{
  const {api}=load(id);assert.equal(api.fieldLen('A\uD55C\u5B57B'),6);assert.equal(api.fieldLen('\u{1F600}'),1);assert.equal(api.fieldLen('e\u0301'),2);
  if(api.fieldClip){assert.equal(api.fieldClip('A\uD55C\u5B57B',4),'A\uD55C');assert.equal(api.fieldClip('abc',0),'');assert.equal(api.fieldClip('abc',-1),'');}
 });
 test(id+' missing interpolation variables cannot read prototype values',()=>{
  const {api}=load(id,{en:{sample:'{constructor} {toString} {name}',plural:{one:'one {count}',other:'many {count}'}}});
  assert.equal(api.t('en','sample'),'{constructor} {toString} {name}');
  assert.equal(api.t('en','sample',{constructor:'Own',toString:'value',name:'A'}),'Own value A');
  assert.equal(api.t('en','plural',Object.create({count:1})),'many {count}');
 });
}
test('all seven existing templates declare one canonical text runtime',()=>{
 const registry=JSON.parse(fs.readFileSync(new URL('../shared/panel-modules.json',import.meta.url))),owner=registry.modules.find(module=>module.id==='template-text');
 assert.ok(owner,'Repeated text mechanics need one declared source owner.');
 assert.deepEqual([...owner.targets].sort(),ids.map(id=>'plugins/'+id+'/panel.tsx').sort());
});
