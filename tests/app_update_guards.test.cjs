const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
const enabled=modules?{}:{skip:'Set SBS_PANEL_TEST_MODULES to run React guard tests'};

async function harness(t){
 const dep=createRequire(path.resolve(modules,'../package.json'));
 const React=dep('react'),{createRoot}=dep('react-dom/client'),{JSDOM}=dep('jsdom');
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 const previous={};
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){
  previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 }
 const file=path.join(__dirname,'../shared/app-update-guard.ts');
 const code=dep('esbuild').transformSync(fs.readFileSync(file,'utf8')+'\nexport {useAppUpdateGuard};',{loader:'ts',format:'cjs'}).code;
 const mod={exports:{}};new Function('require','module','exports',code)(()=>React,mod,mod.exports);
 const root=createRoot(document.getElementById('root'));
 function Editor({sdk,blocked,language='en',read}){mod.exports.useAppUpdateGuard(sdk,language,read||(()=>blocked));return null;}
 const render=async rows=>{await React.act(async()=>root.render(React.createElement(React.Fragment,null,rows.map(row=>React.createElement(Editor,{...row,key:row.id})))));};
 t.after(async()=>{await React.act(async()=>root.unmount());dom.window.close();for(const key in previous){if(previous[key])Object.defineProperty(globalThis,key,previous[key]);else delete globalThis[key];}});
 return {render};
}

test('multiple mounted editors share one host guard and any busy editor vetoes dependency reload',enabled,async t=>{
 const {render}=await harness(t);let provider,registrations=0,disposed=0,context;
 const sdk={updates:{registerGuard:p=>{provider=p;registrations++;return()=>disposed++;}}};
 await render([{id:'main',sdk,blocked:false},{id:'edit',sdk,read:c=>{context=c;return true;}}]);
 assert.equal(registrations,1);
 const dependency={id:'selects-ai-runtime',version:'0.2.0',dependency:true};
 await assert.rejects(provider.canUpdate(dependency),/Finish the current operation/);
 assert.deepEqual(context,dependency);
 await render([{id:'main',sdk,blocked:false}]);
 assert.equal(disposed,0);await provider.canUpdate(dependency);
 await render([]);assert.equal(disposed,1);
});

test('same registration reads current busy state and language after rerender',enabled,async t=>{
 const {render}=await harness(t);let provider,registrations=0;
 const sdk={updates:{registerGuard:p=>{provider=p;registrations++;return()=>{};}}};
 await render([{id:'app',sdk,blocked:false}]);await provider.canUpdate({});
 await render([{id:'app',sdk,blocked:true,language:'ko'}]);
 await assert.rejects(provider.canUpdate({}),/\uc800\uc7a5/);assert.equal(registrations,1);
 await render([{id:'app',sdk,blocked:false,language:'ko'}]);await provider.canUpdate({});
});

test('old hosts skip registration and incomplete editor state fails closed',enabled,async t=>{
 const {render}=await harness(t);await render([{id:'legacy',sdk:{},blocked:true}]);
 let provider;
 const sdk={updates:{registerGuard:p=>{provider=p;return()=>{};}}};
 await render([{id:'legacy',sdk,read:()=>{throw new ReferenceError('initializing');}}]);
 await assert.rejects(provider.canUpdate({}),/Finish the current operation/);
});

test('all portable panels compile and shared guard bundles have no drift',enabled,()=>{
 const dep=createRequire(path.resolve(modules,'../package.json'));
 const root=path.resolve(__dirname,'..');const policies=JSON.parse(fs.readFileSync(path.join(root,'shared/app-update-guard-policies.json')));
 const shared=fs.readFileSync(path.join(root,'shared/app-update-guard.ts'),'utf8').trimEnd();
 for(const id of Object.keys(policies)){
  const panel=fs.readFileSync(path.join(root,'plugins',id,'panel.tsx'),'utf8');
  assert.ok(panel.includes('// app-update-guard:start\n'+shared+'\n// app-update-guard:end'),id);
  dep('esbuild').transformSync(panel,{loader:'tsx',format:'cjs'});
  for(const name of Object.keys(policies[id]))assert.ok(panel.includes('useAppUpdateGuard(sdk,'),`${id}/${name}`);
 }
});

test('guard policies match React component hooks and never insert hooks into async job functions',enabled,()=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),ts=dep('typescript');
 const root=path.resolve(__dirname,'..');
 const policies=JSON.parse(fs.readFileSync(path.join(root,'shared/app-update-guard-policies.json')));
 for(const [id,expected] of Object.entries(policies)){
  const source=fs.readFileSync(path.join(root,'plugins',id,'panel.tsx'),'utf8');
  const ast=ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const found={};
  function walk(node,owner){
   if(ts.isFunctionDeclaration(node))owner=node;
   if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useAppUpdateGuard'){
    const name=owner?.name?.text;
    assert.match(name||'',/^[A-Z]/,`${id}: hooks belong in React components`);
    assert.ok(!owner.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword),`${id}/${name}`);
    assert.ok(!found[name],`${id}/${name}: duplicate hook`);
    const getter=node.arguments[2];assert.ok(ts.isArrowFunction(getter),`${id}/${name}`);
    found[name]=getter.body.getText(ast).replace(/^!!/,'').replace(/[()\s]/g,'').replace(/"/g,"'");
   }
   ts.forEachChild(node,child=>walk(child,owner));
  }
  walk(ast,null);
  assert.deepEqual(found,Object.fromEntries(Object.entries(expected).map(([name,value])=>[name,value.replace(/[()\s]/g,'').replace(/"/g,"'")])),id);
 }
});
