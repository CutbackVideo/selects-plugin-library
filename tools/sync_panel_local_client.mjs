// Panels are distributed as single files. Keep their private adapter identical to
// the canonical build input; the app's public SDK remains runScript/call.
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {fingerprintTemplateFile} from '../shared/file-observation.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shared=readFileSync(path.join(root,'shared/local-client.ts'),'utf8')
  .replace(/\r\n/g,'\n')
  .replace(/^import React from "react";\n/m,'')
  .replace(/^import \{fingerprintTemplateFile\} from '\.\/file-observation\.js';\n/m,'')
  .replace(/\nexport \{[^}]+\};\s*$/,'');
const changes=[];
function visit(directory,required=false) {
  let found=0;
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())found+=visit(file);
    else if(entry.name.endsWith('.tsx')) {
      const source=readFileSync(file,'utf8');
      const observationStarts=[...source.matchAll(/^\/\/ file-observation:start\r?$/gm)],observationEnds=[...source.matchAll(/^\/\/ file-observation:end\r?$/gm)];
      const separatelyOwned=observationStarts.length||observationEnds.length;
      if(separatelyOwned&&(observationStarts.length!==1||observationEnds.length!==1||observationStarts[0].index>=observationEnds[0].index))throw new Error(`Invalid file observation markers in ${file}`);
      const starts=[...source.matchAll(/^\/\/ local-sdk:start\r?$/gm)],ends=[...source.matchAll(/^\/\/ local-sdk:end\r?$/gm)];
      if(!starts.length&&!ends.length)continue;
      if(starts.length!==1||ends.length!==1||starts[0].index>=ends[0].index)throw new Error(`Invalid local SDK markers in ${file}`);
      const start=starts[0].index,end=ends[0].index;
      if(separatelyOwned&&!(observationEnds[0].index<start||observationStarts[0].index>end+ends[0][0].length))throw new Error(`File observation ownership overlaps local SDK in ${file}`);
      const exported=source.slice(start,end).match(/export default withPanelLocalClient\(\w+\);/);
      if(!exported)throw new Error(`Missing panel wrapper in ${file}`);
      // A registered canonical block owns its own declaration; legacy single-
      // client consumers still receive a self-contained copy in local-sdk.
      const helper=separatelyOwned?'':fingerprintTemplateFile.toString()+'\n';
      const after=source.slice(0,start)+'// local-sdk:start\n'+helper+shared+'\n'+exported[0]+'\n// local-sdk:end'+source.slice(end+ends[0][0].length);
      changes.push({file,before:source,after});found++;
    }
  }
  if(required&&!found)throw new Error(`No embedded local SDK in ${directory}`);
  return found;
}
try{
 const args=process.argv.slice(2),only=args.filter(arg=>arg.startsWith('--only=')),check=args.includes('--check');
 if(args.some(arg=>arg!=='--check'&&!arg.startsWith('--only='))||only.length>1||args.filter(arg=>arg==='--check').length>1)throw Error('Usage: node tools/sync_panel_local_client.mjs [--only=id,id] [--check]');
 if(only.length){
  const ids=only[0].slice('--only='.length).split(','),excluded=new Set(['shortform-clips','shortform-cloner','eo-shorts']);
  if(new Set(ids).size!==ids.length||ids.some(id=>!/^[a-z][a-z0-9-]*$/.test(id)||excluded.has(id)))throw Error('Invalid or excluded local SDK consumer');
  for(const id of ids){const directory=path.join(root,'plugins',id);if(!statSync(directory).isDirectory())throw Error('Invalid consumer directory');visit(directory,true);}
 }else visit(path.join(root,'plugins'));
 // Validate every selected consumer before writing any generated copy.
 const stale=changes.filter(change=>change.before!==change.after);
 if(check){for(const {file} of stale)console.error('Out-of-date local SDK: '+path.relative(root,file));if(stale.length)process.exitCode=1;}
 else for(const {file,after} of stale)writeFileSync(file,after);
 if(!check||!stale.length)console.log(`${check?'Checked':'Synced'} local SDK in ${changes.length} consumers.`);
}catch(error){console.error(error.message);process.exitCode=1;}
