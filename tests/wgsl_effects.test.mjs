import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {cases} from '../shared/shader-effects/validation-cases.mjs';
const root=resolve(import.meta.dirname,'..');
const registry=JSON.parse(readFileSync(join(root,'shared/shader-effects/plugins.json')));
for(const id of Object.keys(registry)) test(`${id} authors every effect kind as a portable graph`,async()=>{
 const {PLUGIN_SHADER_OPTIONS}=await import(`../shared/shader-effects/generated/${id}.mjs`);
 const options=Function('return '+PLUGIN_SHADER_OPTIONS)();
 for(const kind of Object.keys(registry[id])){
  const inputs=cases.filter(c=>c.id===id&&c.kind===kind);assert.ok(inputs.length,`${id}/${kind} has a fixture`);
  for(const {data}of inputs){
   const result=options(kind,{parameters:data},{fps:30});assert.equal(result.tsxCode,undefined);
   assert.equal(result.shader.graph.schema,'Cutback.ShaderEffect.1');
   assert.ok(result.shader.graph.passes.some(p=>p.id===result.shader.graph.output));
   assert.ok(result.shader.graph.passes.every(p=>Buffer.byteLength(p.wgsl)<=262144));
   for(const binding of result.shader.uniforms||[])assert.notEqual(result.parameters[binding.parameter],undefined);
   for(const binding of result.shader.svgParameters||[])assert.notEqual(result.parameters[binding.parameter],undefined);
  }
 }
});
test('an omitted editable default is bound so later adjustment remains live',async()=>{
 const {PLUGIN_SHADER_OPTIONS}=await import('../shared/shader-effects/generated/chris-williamson-style.mjs');
 const result=Function('return '+PLUGIN_SHADER_OPTIONS)()('broll',{parameters:{},editableParameters:[{key:'fillBlur',defaultValue:10},{key:'fontFamily',defaultValue:'Inter'}]});
 assert.equal(result.parameters.fillBlur,10);assert.ok(result.shader.uniforms.some(b=>b.parameter==='fillBlur'));
 assert.ok(result.shader.svgParameters.some(b=>b.parameter==='fontFamily'));
});
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('all 25 installed authoring routes use shader graphs instead of TSX clip effects',{skip:!modules},()=>{
 const ts=createRequire(resolve(modules,'../package.json'))('typescript');
 const counts={};
 function inspect(code,id,location,depth=0){
  const sf=ts.createSourceFile(location,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function walk(n){
   if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&['addVideoEffect','replaceVideoEffect'].includes(n.expression.name.text)){
    const arg=n.arguments[n.expression.name.text==='addVideoEffect'?0:1];
    counts[id]=(counts[id]||0)+1;
    assert.ok(arg,location);assert.ok(!ts.isObjectLiteralExpression(arg)||!arg.properties.some(p=>p.name?.getText(sf)==='tsxCode'),`${location}: legacy authoring call`);
   }
   if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateExpression(n))&&depth<8){
    const content=ts.isTemplateExpression(n)?n.head.text+n.templateSpans.map(s=>'null'+s.literal.text).join(''):n.text;
    if(/(?:add|replace)VideoEffect\s*\(/.test(content))inspect(content,id,location+'#script',depth+1);
    return;
   }
   ts.forEachChild(n,walk);
  }walk(sf);
 }
 for(const id of Object.keys(registry)){
  const manifest=JSON.parse(readFileSync(join(root,'plugins',id,'plugin.json')));
  for(const file of manifest.files)if(/\.(?:tsx?|[cm]?js)$/.test(file)&&!file.startsWith('tests/')){
   const location=join(root,'plugins',id,file);inspect(readFileSync(location,'utf8'),id,location);
  }
  assert.ok(counts[id]>0,`${id} has an installed authoring route`);
 }
});
