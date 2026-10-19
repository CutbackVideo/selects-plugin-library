import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const repo=process.env.SELECTS_DEV_REPO || path.resolve('../cutback-client');
let ts;
try{ts=require('typescript')}catch{try{ts=require(path.join(repo,'node_modules/typescript'))}catch{}}
const root=new URL('../plugins/',import.meta.url);
test('every published panel keeps DI and panel-only SDK namespaces out of executable code', ()=>{
 for(const id of fs.readdirSync(root)){
  const file=new URL(`${id}/panel.tsx`,root);
  if(!fs.existsSync(file))continue;
  const source=fs.readFileSync(file,'utf8');
  const runtime=source.split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n');
  assert(!/(?:\.\s*__DI__|\[\s*['"]__DI__['"]\s*\])/.test(runtime),id+' still accesses DI');
  assert(!/\bsdk\??\.(files|media|dialogs|environment)\b/.test(runtime),id+' uses a removed public namespace');
  if(!ts)continue;
  const tree=ts.createSourceFile(String(file),source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node){
   if(ts.isIdentifier(node))assert.notEqual(node.text,'__DI__',id+' still references DI');
   if(ts.isPropertyAccessExpression(node)&&node.expression.getText(tree)==='sdk')assert(!['files','media','dialogs','environment'].includes(node.name.text),id+' uses a removed public namespace');
   if(ts.isElementAccessExpression(node)&&ts.isStringLiteral(node.argumentExpression))assert.notEqual(node.argumentExpression.text,'__DI__',id+' still references DI');
   ts.forEachChild(node,visit);
  }
  visit(tree);
 }
});
