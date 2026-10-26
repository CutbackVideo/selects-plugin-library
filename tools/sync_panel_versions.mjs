// These two panels use a manifest version in saved source fingerprints. Deliver
// it from the manifest without changing pending-state or recovery policy.
import {readFileSync,writeFileSync,lstatSync,renameSync,unlinkSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const numeric='(?:0|[1-9][0-9]*)',pre='(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
const semver=new RegExp('^'+numeric+'\\.'+numeric+'\\.'+numeric+'(?:-'+pre+'(?:\\.'+pre+')*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$');
try {
 const args=process.argv.slice(2);
 if(args.length>1||args.some(arg=>arg!=='--check'))throw Error('Usage: node tools/sync_panel_versions.mjs [--check]');
 const check=args.includes('--check'),changes=[];
 for(const id of ['mini-vlog','archive-vlog']) {
  const folder=path.join(root,'plugins',id),file=path.join(folder,'panel.tsx'),manifestFile=path.join(folder,'plugin.json');
  if(!lstatSync(file).isFile()||!lstatSync(manifestFile).isFile())throw Error('Panel version inputs must be regular files: '+id);
  const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
  if(manifest.id!==id||typeof manifest.version!=='string'||!semver.test(manifest.version))throw Error('Invalid manifest version or owner: '+id);
  const before=readFileSync(file,'utf8');
  const declarations=[...before.matchAll(/^[ \t]*const[ \t]+PLUGIN_VERSION\b/gm)];
  const literals=[...before.matchAll(/^([ \t]*const[ \t]+PLUGIN_VERSION[ \t]*=[ \t]*)(["'])([^"'\r\n]+)\2([ \t]*;[ \t]*\r?)$/gm)];
  if(declarations.length!==1||literals.length!==1||!semver.test(literals[0][3]))throw Error('Expected one literal PLUGIN_VERSION: '+id);
  const literal=literals[0],start=literal.index+literal[1].length+1;
  const after=before.slice(0,start)+manifest.version+before.slice(start+literal[3].length);
  changes.push({id,file,before,after});
 }
 // Preflight every target before writing any panel. Check never repairs drift.
 const stale=changes.filter(row=>row.before!==row.after);
 if(check) {
  for(const {id} of stale)console.error('Out-of-date panel version: '+id+'; run npm run templates:prepare.');
  if(stale.length)process.exitCode=1;
 } else for(const {file,after} of stale) {
  const temp=file+'.version-'+randomUUID();
  try{writeFileSync(temp,after,{flag:'wx',mode:lstatSync(file).mode});renameSync(temp,file);}
  finally{try{unlinkSync(temp);}catch(error){if(error.code!=='ENOENT')throw error;}}
 }
 if(!check||!stale.length)console.log((check?'Checked':'Synced')+' Mini/Archive panel versions.');
} catch(error) {console.error(error.message);process.exitCode=1;}
