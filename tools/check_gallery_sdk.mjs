#!/usr/bin/env node
// Run this library's composition contract through an explicitly chosen client.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if(process.argv.slice(2).some(arg=>arg!=='--help'))throw Error('Usage: SELECTS_DEV_REPO=/path/to/selects node tools/check_gallery_sdk.mjs');
if(process.argv.includes('--help')){
 console.log('SELECTS_DEV_REPO=/path/to/selects node tools/check_gallery_sdk.mjs\nRequires the paired file-fingerprint/fresh-read, Clip source-window and panel-deadline SDK changes, client dependencies and ffmpeg/ffprobe. Uses temporary media and in-memory repositories.');
 process.exit(0);
}
if(!process.env.SELECTS_DEV_REPO)throw Error('SELECTS_DEV_REPO must name the client checkout to verify.');
const client=path.resolve(process.env.SELECTS_DEV_REPO),runner=path.join(client,'node_modules/vitest/vitest.mjs');
for(const name of ['electron/mcp/script-runtime/sdk.ts','vitest.config.ts','node_modules/vitest/vitest.mjs'])if(!fs.existsSync(path.join(client,name)))throw Error('The selected client checkout lacks '+name);
const version=spawnSync('git',['rev-parse','HEAD'],{cwd:client,encoding:'utf8'});
if(version.status!==0)throw Error('The selected SDK must be an identified Git checkout.');
console.log('Selects SDK revision: '+version.stdout.trim());
const directory=fs.mkdtempSync(path.join(client,'validation-gallery-'));
try{
 const spec=path.join(directory,'gallery-runtime.spec.ts');
 fs.copyFileSync(path.join(root,'tests/selects-sdk/gallery-runtime.spec.ts'),spec);
 const result=spawnSync(process.execPath,[runner,'run',path.relative(client,spec),'--maxWorkers=1'],{cwd:client,env:{...process.env,GALLERY_LIBRARY_ROOT:root},stdio:'inherit',timeout:180000});
 if(result.error)throw result.error;
 process.exitCode=result.status??1;
}finally{fs.rmSync(directory,{recursive:true,force:true});}
