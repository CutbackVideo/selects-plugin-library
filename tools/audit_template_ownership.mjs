// Read-only structural inventory. Repetition is evidence for review, never an
// ownership decision or proof that a template/module is complete.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ts=require(process.env.SBS_PANEL_TEST_MODULES?path.join(process.env.SBS_PANEL_TEST_MODULES,'typescript'):'typescript');
const excluded=new Set(['shortform-clips','shortform-cloner','eo-shorts']);
const parsed=/\.(?:[cm]?js|tsx?|jsx)$/i,executable=/\.(?:[cm]?js|tsx?|jsx|py|sh)$/i;
const hash=text=>createHash('sha256').update(text).digest('hex');
function tokens(node,source){
 const children=node.getChildren(source);
 return children.length?children.flatMap(child=>tokens(child,source)):[[node.kind,node.getText(source)]];
}
function functionName(node){
 if(ts.isFunctionDeclaration(node)&&node.name)return node.name.text;
 if((ts.isArrowFunction(node)||ts.isFunctionExpression(node))&&ts.isVariableDeclaration(node.parent)&&ts.isIdentifier(node.parent.name))return node.parent.name.text;
 if(ts.isMethodDeclaration(node)&&node.name)return node.name.getText();
 return null;
}
function declarations(source){
 const result=[];const walk=node=>{const name=functionName(node);if(name&&node.body)result.push({node,name});ts.forEachChild(node,walk);};walk(source);return result;
}
function references(node,checker){
 const names=new Set(),start=node.getStart(),end=node.end;
 const visit=child=>{
  if(ts.isIdentifier(child)){
   const p=child.parent;
   const propertyName=ts.isPropertyAccessExpression(p)&&p.name===child||ts.isPropertyAssignment(p)&&p.name===child||ts.isMethodDeclaration(p)&&p.name===child;
   if(!propertyName){
    const symbol=ts.isShorthandPropertyAssignment(p)?checker.getShorthandAssignmentValueSymbol(p):checker.getSymbolAtLocation(child);
    if(!symbol?.declarations?.length||symbol.declarations.some(d=>d.getStart()<start||d.end>end))names.add(child.text);
   }
  }
  ts.forEachChild(child,visit);
 };visit(node);return [...names].sort();
}
export function auditTemplateOwnership(root){
 root=path.resolve(root);
 const registry=JSON.parse(fs.readFileSync(path.join(root,'shared/panel-modules.json'),'utf8'));
 const templates=[];
 for(const entry of fs.readdirSync(path.join(root,'plugins'),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  if(!entry.isDirectory()||excluded.has(entry.name))continue;
  const manifestPath=path.join(root,'plugins',entry.name,'plugin.json');if(!fs.existsSync(manifestPath))continue;
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(manifest.collection!=='visual-highlights')continue;
  if(manifest.id!==entry.name||!Array.isArray(manifest.files))throw Error('Invalid template manifest: '+entry.name);
  const files=[...new Set(['panel.tsx',...manifest.files])].filter(rel=>executable.test(rel)).sort().map(rel=>{
   if(path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..'))throw Error('Invalid template file: '+rel);
   const file='plugins/'+entry.name+'/'+rel,absolute=path.join(root,file);
   if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())return {path:file,sha256:null,analysis:'missing',decision:null};
   const text=fs.readFileSync(absolute,'utf8');return {path:file,sha256:hash(text),analysis:parsed.test(rel)?'indexed-not-reviewed':'manual-required',decision:null};
  });
  const declaredModules=registry.modules.filter(m=>[...(m.targets??[]),...(m.compatibilityTargets??[]),...(m.buildTimeTargets??[]),...(m.fileTargets??[])].some(target=>target.startsWith('plugins/'+entry.name+'/'))).map(m=>m.id);
  templates.push({id:entry.name,version:manifest.version??null,declaredModules,files,functions:[],ownershipReviewed:false});
 }
 const canonicalFiles=[...new Set(registry.modules.map(m=>m.source))];
 const inputs=[...templates.flatMap(t=>t.files.filter(f=>f.analysis==='indexed-not-reviewed').map(f=>path.join(root,f.path))),...canonicalFiles.map(f=>path.join(root,f))];
 const program=ts.createProgram(inputs,{allowJs:true,noResolve:true,noLib:true,target:ts.ScriptTarget.Latest,jsx:ts.JsxEmit.Preserve},ts.createCompilerHost({allowJs:true,noResolve:true,noLib:true,target:ts.ScriptTarget.Latest,jsx:ts.JsxEmit.Preserve},true));
 const checker=program.getTypeChecker(),canonical=new Map();
 for(const module of registry.modules){
  const source=program.getSourceFile(path.join(root,module.source));if(!source)throw Error('Missing canonical source: '+module.source);
  canonical.set(module.id,new Set(declarations(source).map(({node})=>hash(JSON.stringify(tokens(node,source))))));
 }
 const groups=new Map();let anonymous=0;
 for(const template of templates)for(const file of template.files){
  if(file.analysis!=='indexed-not-reviewed')continue;
  const source=program.getSourceFile(path.join(root,file.path));if(!source)throw Error('Unparsed source: '+file.path);
  if(source.parseDiagnostics.length){
   // Generator placeholders and unsupported syntax are still in scope. Keep
   // the file/hash and the reason for manual review instead of omitting it.
   file.analysis='manual-required';file.diagnostics=source.parseDiagnostics.map(d=>({code:d.code,line:source.getLineAndCharacterOfPosition(d.start??0).line+1,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));continue;
  }
  const text=source.text,blocks=registry.modules.filter(m=>m.targets?.includes(file.path)).map(m=>({id:m.id,start:text.indexOf('// '+m.id+':start'),end:text.indexOf('// '+m.id+':end')}));
  const count=node=>{if((ts.isArrowFunction(node)||ts.isFunctionExpression(node))&&!functionName(node))anonymous++;ts.forEachChild(node,count);};count(source);
  for(const {node,name} of declarations(source)){
   const fingerprint=hash(JSON.stringify(tokens(node,source))),start=node.getStart(source),line=source.getLineAndCharacterOfPosition(start).line+1;
   const managed=registry.modules.find(m=>m.fileTargets?.includes(file.path)&&canonical.get(m.id)?.has(fingerprint))??blocks.find(b=>b.start>=0&&start>b.start&&node.end<=b.end&&canonical.get(b.id)?.has(fingerprint));
   const row={template:template.id,file:file.path,name,kind:ts.SyntaxKind[node.kind],line,endLine:source.getLineAndCharacterOfPosition(node.end).line+1,fingerprint,managedModule:managed?.id??null,externalReferences:references(node,checker),decision:null};
   template.functions.push(row);if(!groups.has(fingerprint))groups.set(fingerprint,[]);groups.get(fingerprint).push(row);
  }
 }
 const repeatedGroups=[...groups].filter(([,rows])=>new Set(rows.map(row=>row.template)).size>=3).map(([fingerprint,occurrences])=>({fingerprint,templates:[...new Set(occurrences.map(row=>row.template))].sort(),occurrences})).sort((a,b)=>b.templates.length-a.templates.length||a.fingerprint.localeCompare(b.fingerprint));
 return {schemaVersion:1,complete:false,scope:'Shipped executable file paths and named JS/TS functions; no plugin code is executed.',limits:['Named functions are not semantic features.','Anonymous callbacks, embedded scripts/workers, Python/shell and top-level orchestration still require explicit ownership review.','External references are static names for review, not a complete runtime dependency graph.','Equal tokens do not authorize extraction; existing registered managed copies are included in repetition.'],counts:{templates:templates.length,files:templates.reduce((n,t)=>n+t.files.length,0),namedFunctions:templates.reduce((n,t)=>n+t.functions.length,0),panelFunctionDeclarations:templates.flatMap(t=>t.functions).filter(f=>f.file.endsWith('/panel.tsx')&&f.kind==='FunctionDeclaration').length,anonymousCallbacks:anonymous,repeatedGroups:repeatedGroups.length,ownershipReviewed:0},templates,repeatedGroups};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length>3)throw Error('Usage: node tools/audit_template_ownership.mjs [repository-root]');
 process.stdout.write(JSON.stringify(auditTemplateOwnership(process.argv[2]??path.dirname(path.dirname(fileURLToPath(import.meta.url)))),null,2)+'\n');
}
