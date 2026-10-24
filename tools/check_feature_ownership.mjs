// Source-backed decision coverage, including anonymous callbacks and orchestration.
// A structural pass never establishes semantic review or runtime acceptance.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ts=require(process.env.SBS_PANEL_TEST_MODULES?path.join(process.env.SBS_PANEL_TEST_MODULES,'typescript'):'typescript');
const hash=text=>createHash('sha256').update(text).digest('hex');
const executable=/\.(?:[cm]?js|tsx?|jsx|py|sh)$/i;
const parsed=/\.(?:[cm]?js|tsx?|jsx)$/i;
const text=value=>typeof value==='string'&&value.trim().length>0;
const keys=['input','output','identity','dependencies','effects','lifetime','cleanup','outcomes','retry','distribution','validation'];
const fail=message=>{throw Error(message);};
function capturedHash(bytes,mode='bytes'){
 if(!['bytes','lf-text'].includes(mode))fail('Invalid source evidence hash mode');
 if(mode==='bytes')return hash(bytes);
 const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
 return hash(source.replace(/\r\n/g,'\n'));
}

export function checkFeatureOwnership(root,document){
 root=path.resolve(root);
 const resolve=relative=>{
  if(!text(relative)||path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))fail('Unsafe ownership source path: '+relative);
  const absolute=path.resolve(root,relative);
  if(!absolute.startsWith(root+path.sep))fail('Ownership source escapes repository: '+relative);
  return absolute;
 };
 if(document?.schemaVersion!==1||!text(document.template)||!Array.isArray(document.features)||!Array.isArray(document.files))fail('Invalid ownership document');
 const manifest=JSON.parse(fs.readFileSync(resolve('plugins/'+document.template+'/plugin.json'),'utf8'));
 if(manifest.id!==document.template||manifest.collection!=='visual-highlights'||!Array.isArray(manifest.files))fail('Invalid ownership template scope');
 if(['shortform-clips','shortform-cloner','eo-shorts'].includes(document.template))fail('Excluded template scope');
 const registry=JSON.parse(fs.readFileSync(resolve('shared/panel-modules.json'),'utf8'));
 const owners=new Set(registry.modules.map(row=>row.id));
 for(const owner of document.existingOwners??[]){
  if(!text(owner?.id)||!text(owner.source)||!fs.existsSync(resolve(owner.source)))fail('Invalid existing owner');
  owners.add(owner.id);
 }
 const features=new Map();
 for(const feature of document.features){
  if(!text(feature?.id)||features.has(feature.id)||!text(feature.reason)||!text(feature.owner)||!['reuse','extend','extract','keep-template-specific'].includes(feature.decision)||!text(feature.implementation))fail('Invalid or duplicate feature decision');
  for(const key of keys)if(!text(feature.contract?.[key]))fail('Missing feature contract '+key+': '+feature.id);
  if(['reuse','extend'].includes(feature.decision)&&!owners.has(feature.owner))fail('Unknown existing owner: '+feature.owner);
  if(feature.decision==='keep-template-specific'&&feature.owner!==document.template)fail('Template-specific feature has a different owner');
  if(!Array.isArray(feature.evidence)||!feature.evidence.length||feature.evidence.some(file=>!fs.existsSync(resolve(file))))fail('Missing feature source evidence: '+feature.id);
  features.set(feature.id,feature);
 }
 const records=new Map();
 for(const record of document.files){
  if(!text(record?.path)||records.has(record.path)||!['runtime','validation','validation-tool','build-source'].includes(record.role)||!Array.isArray(record.ranges)||!record.ranges.length)fail('Invalid or duplicate source ownership record');
  resolve(record.path);records.set(record.path,record);
 }
 const shipped=[...new Set(['panel.tsx',...manifest.files])].map(file=>'plugins/'+document.template+'/'+file);
 for(const file of shipped)if(executable.test(file)&&!records.has(file))fail('Missing shipped executable ownership: '+file);
 const assetRecords=new Map();
 for(const record of document.assets??[]){
  if(!text(record?.path)||assetRecords.has(record.path)||!features.has(record.feature)||!text(record.reason))fail('Invalid asset ownership record');
  const absolute=resolve(record.path);if(!fs.existsSync(absolute)||capturedHash(fs.readFileSync(absolute),record.hashMode)!==record.sha256)fail('Stale asset evidence: '+record.path);
  assetRecords.set(record.path,record);
 }
 if(document.includeAllShippedAssets===true)for(const file of shipped)if(!executable.test(file)&&!assetRecords.has(file))fail('Missing shipped asset ownership: '+file);
 const files=[],callables=[],statements=[],declarations=new Map(),used=new Set([...assetRecords.values()].map(row=>row.feature));
 const callable=node=>!!node.body&&(ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isArrowFunction(node)||ts.isMethodDeclaration(node)||ts.isGetAccessorDeclaration(node)||ts.isSetAccessorDeclaration(node)||ts.isConstructorDeclaration(node));
 for(const record of records.values()){
  const absolute=resolve(record.path),bytes=fs.readFileSync(absolute),sourceText=bytes.toString('utf8'),lineCount=sourceText.split('\n').length;
  if(capturedHash(bytes,record.hashMode)!==record.sha256)fail('Stale source evidence: '+record.path);
  for(const range of record.ranges)if(!Number.isSafeInteger(range.startLine)||!Number.isSafeInteger(range.endLine)||range.startLine<1||range.endLine<range.startLine||range.endLine>lineCount||!features.has(range.feature))fail('Invalid feature source range: '+record.path);
  for(let i=0;i<record.ranges.length;i++)for(let j=i+1;j<record.ranges.length;j++){
   const a=record.ranges[i],b=record.ranges[j],overlap=a.startLine<=b.endLine&&b.startLine<=a.endLine;
   const nested=a.startLine<=b.startLine&&a.endLine>=b.endLine||b.startLine<=a.startLine&&b.endLine>=a.endLine;
   if(overlap&&(!nested||a.startLine===b.startLine&&a.endLine===b.endLine))fail('Ambiguous overlapping ownership ranges: '+record.path);
  }
  const owner=(start,end)=>{
   const matches=record.ranges.filter(range=>start>=range.startLine&&end<=range.endLine).sort((a,b)=>(a.endLine-a.startLine)-(b.endLine-b.startLine));
   if(!matches.length)fail('Uncovered source unit: '+record.path+':'+start+'-'+end);
   used.add(matches[0].feature);return matches[0].feature;
  };
  if(!parsed.test(record.path)){
   if(!text(record.manualReview))fail('Unparsed source needs explicit manual review: '+record.path);
   owner(1,lineCount);files.push({path:record.path,sha256:record.sha256,role:record.role,analysis:'manual-required'});continue;
  }
  const source=ts.createSourceFile(record.path,sourceText,ts.ScriptTarget.Latest,true,record.path.endsWith('.tsx')?ts.ScriptKind.TSX:/\.tsx?$/i.test(record.path)?ts.ScriptKind.TS:ts.ScriptKind.JS);
  if(source.parseDiagnostics.length)fail('Unparsed source needs explicit review: '+record.path);
  const names=new Set();declarations.set(record.path,names);
  const unit=(node,kind)=>{
   const line=source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,endLine=source.getLineAndCharacterOfPosition(node.end).line+1;
   return {file:record.path,role:record.role,kind,line,endLine,feature:owner(line,endLine),fingerprint:capturedHash(Buffer.from(node.getText(source)),record.hashMode)};
  };
  for(const node of source.statements)statements.push(unit(node,ts.SyntaxKind[node.kind]));
  const visit=node=>{
   if((ts.isVariableDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name&&ts.isIdentifier(node.name))names.add(node.name.text);
   if(callable(node)){
    const name=node.name?.getText(source)??(ts.isVariableDeclaration(node.parent)?node.parent.name.getText(source):null);
    callables.push({...unit(node,ts.SyntaxKind[node.kind]),name});
   }
   ts.forEachChild(node,visit);
  };visit(source);files.push({path:record.path,sha256:record.sha256,role:record.role,analysis:'indexed'});
 }
 for(const program of document.embeddedPrograms??[]){
  if(!records.has(program?.file)||!features.has(program.feature)||!text(program.producer)||!text(program.description)||!text(program.input)||!text(program.output)||!text(program.lifetime)||!Array.isArray(program.sourceFiles)||program.sourceFiles.some(file=>!fs.existsSync(resolve(file)))||!declarations.get(program.file)?.has(program.producer))fail('Incomplete embedded program ownership');
  used.add(program.feature);
 }
 const findingIds=new Set(),knownOwners=new Set([document.template,...owners,...document.features.map(row=>row.owner)]);
 for(const finding of document.findings??[]){
  if(!text(finding?.id)||findingIds.has(finding.id)||!['source-mismatch','confirmed-fixture','needs-reproduction','fixed-fixture','fixed-source'].includes(finding.status)||!features.has(finding.feature)||!text(finding.title)||!text(finding.mechanism)||!text(finding.acceptance)||!knownOwners.has(finding.repairOwner)||!Array.isArray(finding.sources)||!finding.sources.length||!Array.isArray(finding.evidence)||!finding.evidence.length)fail('Invalid source ownership finding');
  if(/^fixed-/.test(finding.status)){if(!text(finding.resolution))fail('Fixed finding needs a resolution');if(!text(finding.validationLimits))fail('Fixed finding needs validation limits');}
  findingIds.add(finding.id);
  for(const source of finding.sources){
   if(!records.has(source?.file)&&!assetRecords.has(source?.file))fail('Finding source is outside the captured review');
   const length=fs.readFileSync(resolve(source.file),'utf8').split('\n').length;
   if(!Number.isSafeInteger(source.line)||source.line<1||source.line>length)fail('Finding source location is invalid');
  }
  if(finding.evidence.some(file=>!fs.existsSync(resolve(file))))fail('Finding evidence is missing');
  if(finding.status==='confirmed-fixture'&&(!text(finding.reproducer)||!records.has(finding.reproducer)))fail('Confirmed finding needs a captured diagnostic');
 }
 for(const feature of features.keys())if(!used.has(feature))fail('Unused feature decision: '+feature);
 return {schemaVersion:1,template:document.template,coverageComplete:files.every(row=>row.analysis==='indexed'),semanticReviewComplete:false,templateAcceptanceComplete:false,limits:['Coverage validates source/decision links, not the truth of the decisions.','Embedded program contracts require manual review; runtime is not inferred.','A planned extraction is not an implemented module.'],counts:{files:files.length,shippedExecutableFiles:shipped.filter(file=>executable.test(file)).length,assets:assetRecords.size,features:features.size,callables:callables.length,anonymousCallbacks:callables.filter(row=>row.name===null).length,topLevelStatements:statements.length,embeddedPrograms:(document.embeddedPrograms??[]).length,findings:findingIds.size},files,features:[...features.values()],callables,statements,embeddedPrograms:document.embeddedPrograms??[],findings:document.findings??[]};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length<1||args.length>2)fail('Usage: node tools/check_feature_ownership.mjs <decision.json> [repository-root]');
 const root=path.resolve(args[1]??path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
 process.stdout.write(JSON.stringify(checkFeatureOwnership(root,JSON.parse(fs.readFileSync(path.resolve(args[0]),'utf8'))),null,2)+'\n');
}
