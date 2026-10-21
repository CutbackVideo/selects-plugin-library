'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('scene template AI settings edit the instructions generation consumes',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),React=dep('react'),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {TemplateAISection,STRINGS};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const {TemplateAISection,STRINGS}=mod.exports,S=STRINGS.en;
 const template=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/hankook-ilbo/templates',name+'.json'),'utf8'));
 function render(edit,saving=false){
  const fields=[],toggles=[],changes=[];
  const ui={Section:({children})=>React.createElement('section',null,children),
   TextField:props=>{fields.push(props);return React.createElement('span',null,props.label);},
   Toggle:props=>{toggles.push(props);return React.createElement('span',null,props.label);}};
  dep('react-dom/server').renderToStaticMarkup(React.createElement(TemplateAISection,{ui,S,lang:'en',draft:{edit,saving,set:(...args)=>changes.push(args)}}));
  return {fields,toggles,changes};
 }
 await t.test('Huick edits the channel contract and retains applicable length, title and detection inputs',()=>{
  const edit=template('huick-alpha'),view=render(edit);
  const rules=view.fields.find(field=>field.label===S.rules);
  assert.equal(rules.value,edit.editorial.instructions);
  rules.onChange('Use the supplied episode concept.');
  assert.deepEqual(view.changes,[['editorial.instructions','Use the supplied episode concept.']]);
  assert.deepEqual(view.fields.map(field=>field.label),[S.rules,S.lengthGuide,S.headlineRules,S.keywords,S.exclude,S.host]);
  assert.equal(view.toggles.length,0,'Scene generation does not apply the ordinary audio-cut toggles');
  assert.ok(render(edit,true).fields.every(field=>field.disabled));
 });
 await t.test('ordinary templates retain all original prompt and audio-edit controls',()=>{
  const edit=template('knowledge-exchange'),view=render(edit);
  for(const [key,label] of Object.entries({role:S.role,format:S.format,good:S.good,bad:S.bad,countGuide:S.countGuide,rules:S.rules,lengthGuide:S.lengthGuide,headline:S.headlineRules})){
   const field=view.fields.find(row=>row.label===label);assert.ok(field,key);assert.equal(field.value,edit.prompt[key]);
   field.onChange('Updated '+key);assert.deepEqual(view.changes.at(-1),['prompt.'+key,'Updated '+key]);
  }
  assert.equal(view.fields.length,11);
  assert.deepEqual(view.toggles.map(field=>field.label),[S.removeFillers,S.removeSilences]);
  view.toggles[0].onChange(true);assert.deepEqual(view.changes.at(-1),['editing.removeFillers',true]);
  view.toggles[1].onChange(true);assert.deepEqual(view.changes.at(-1),['editing.removeSilences',true]);
 });
});
