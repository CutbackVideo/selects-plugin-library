// Panels install independently. Keep reusable input features in one reviewed
// source and embed them only in the explicitly registered template consumers.
import {readFileSync,writeFileSync,renameSync,unlinkSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import path from 'node:path';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const check=process.argv.includes('--check');
const excluded=new Set(['shortform-clips','shortform-cloner','eo-shorts']);
function requireValue(condition,message){if(!condition)throw Error(message);}
try{
 requireValue(process.argv.slice(2).every(arg=>arg==='--check'),'Usage: node tools/sync_panel_modules.mjs [--check]');
 const registry=JSON.parse(readFileSync(path.join(root,'shared/panel-modules.json'),'utf8'));
 requireValue(registry.schemaVersion===1&&Array.isArray(registry.modules),'Invalid panel module registry');
 const registered=new Map(registry.modules.map(module=>[module.id,module]));
 for(const module of registry.modules){
  const required=module.requires??[];
  requireValue(Array.isArray(required)&&new Set(required).size===required.length,'Invalid required module dependencies');
  for(const id of required){
   const dependency=registered.get(id);
   requireValue(typeof id==='string'&&id!==module.id&&dependency,'Missing required module dependency: '+id);
   const delivered=new Set([...(dependency.targets??[]),...(dependency.compatibilityTargets??[]),...(dependency.buildTimeTargets??[]),...(dependency.fileTargets??[])]);
   for(const target of [...(module.targets??[]),...(module.compatibilityTargets??[]),...(module.buildTimeTargets??[]),...(module.fileTargets??[])])requireValue(delivered.has(target),'Required runtime module is not delivered to '+target+': '+id);
  }
 }
 const ids=new Set(),updates=new Map(),consumers=new Set();
 for(const module of registry.modules){
  requireValue(typeof module.id==='string'&&/^[a-z][a-z0-9-]*$/.test(module.id)&&!ids.has(module.id),'Invalid or duplicate module ID');ids.add(module.id);
  requireValue(typeof module.source==='string'&&/^shared\/[a-z0-9-]+\.(?:js|cjs|mjs|ts)$/.test(module.source),'Invalid module source path');
  const compatibility=module.compatibilityTargets??[],buildTime=module.buildTimeTargets??[],fileTargets=module.fileTargets??[];
  requireValue(Array.isArray(module.targets)&&Array.isArray(compatibility)&&Array.isArray(buildTime)&&Array.isArray(fileTargets)&&module.targets.length+compatibility.length+buildTime.length+fileTargets.length>0,'Invalid module targets');
  const targets=[...module.targets,...compatibility];
  requireValue(new Set(targets).size===targets.length,'Duplicate module targets');
  const source=readFileSync(path.join(root,module.source),'utf8').trimEnd();
  const start='// '+module.id+':start',end='// '+module.id+':end';
  requireValue(!source.includes(start)&&!source.includes(end),'Module source contains its own markers');
  requireValue(new Set(buildTime).size===buildTime.length,'Duplicate build-time module targets');
  requireValue(new Set(fileTargets).size===fileTargets.length,'Duplicate standalone module targets');
  for(const target of fileTargets){
   const match=typeof target==='string'&&/^plugins\/([a-z0-9-]+)\/([a-z0-9-]+\.(?:js|cjs|mjs))$/.exec(target);
   requireValue(match&&!excluded.has(match[1]),'Invalid or excluded standalone module consumer');
   const manifest=JSON.parse(readFileSync(path.join(root,'plugins',match[1],'plugin.json'),'utf8'));
   requireValue(manifest.id===match[1]&&manifest.collection==='visual-highlights'&&manifest.files?.includes(match[2]),'Standalone module consumer is not a declared shipped template file');
   const filename=path.join(root,target);
   requireValue(!updates.has(filename),'Conflicting standalone module source owners');
   updates.set(filename,{before:readFileSync(filename,'utf8'),after:source+'\n'});consumers.add(match[1]);
  }
  for(const target of buildTime){
   const match=typeof target==='string'&&/^plugins\/([a-z0-9-]+)\/(?:operation-builder|build-panel)\.mjs$/.exec(target);
   requireValue(match&&!excluded.has(match[1]),'Invalid or excluded build-time module consumer');
   const manifest=JSON.parse(readFileSync(path.join(root,'plugins',match[1],'plugin.json'),'utf8'));
   requireValue(manifest.id===match[1]&&manifest.collection==='visual-highlights','Build-time consumer is not a declared template');
   const builder=readFileSync(path.join(root,target),'utf8');
   const imports=[...builder.matchAll(/\bfrom\s*(['"])([^'"]+)\1/g)].map(match=>match[2]);
   const urls=[...builder.matchAll(/\bnew\s+URL\(\s*(['"])([^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g)].map(match=>match[2]);
   requireValue([...imports,...urls].includes('../../'+module.source),'Missing canonical build-time module import: '+target);
   consumers.add(match[1]);
  }
  for(const target of targets){
   const match=typeof target==='string'&&/^plugins\/([a-z0-9-]+)\/panel\.tsx$/.exec(target);
   requireValue(match&&!excluded.has(match[1]),'Invalid or excluded module consumer');
   consumers.add(match[1]);
   const manifest=JSON.parse(readFileSync(path.join(root,'plugins',match[1],'plugin.json'),'utf8'));
   requireValue(manifest.id===match[1]&&(manifest.collection==='visual-highlights'||compatibility.includes(target)),'Module consumer is not a declared template or compatibility dependency');
   const filename=path.join(root,target),entry=updates.get(filename)||{before:readFileSync(filename,'utf8')};
   const current=entry.after??entry.before;
   const starts=[...current.matchAll(new RegExp('^'+start+'\\r?$','gm'))],ends=[...current.matchAll(new RegExp('^'+end+'\\r?$','gm'))];
   requireValue(starts.length===1&&ends.length===1&&starts[0].index<ends[0].index,'Missing, duplicate or reversed module markers: '+target);
   entry.after=current.slice(0,starts[0].index)+start+'\n'+source+'\n'+end+current.slice(ends[0].index+ends[0][0].length);
   updates.set(filename,entry);
  }
 }
 // Finish every source/manifest/marker check before changing any consumer.
 let stale=false;
 for(const [filename,{before,after}] of updates){
  if(before===after)continue;
  stale=true;
  if(check){console.error('Out-of-date panel module: '+path.relative(root,filename));continue;}
  const temp=filename+'.module-'+randomUUID();
  try{writeFileSync(temp,after,{flag:'wx',mode:statSync(filename).mode});renameSync(temp,filename);}
  finally{try{unlinkSync(temp);}catch(error){if(error.code!=='ENOENT')throw error;}}
 }
 if(check&&stale)process.exitCode=1;
 else console.log(`${check?'Checked':'Synced'} ${ids.size} panel modules in ${consumers.size} consumers.`);
}catch(error){console.error(error.message);process.exitCode=1;}
