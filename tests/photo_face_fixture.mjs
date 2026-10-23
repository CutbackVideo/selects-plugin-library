// Whole production panel compilation: no function-text extraction or replacement helpers.
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import{createRequire}from'node:module';import{webcrypto}from'node:crypto';
const app=process.env.SELECTS_DEV_REPO||(process.env.SBS_PANEL_TEST_MODULES?path.dirname(process.env.SBS_PANEL_TEST_MODULES):process.cwd());
const require=createRequire(path.join(app,'package.json')),esbuild=require('esbuild');
export function loadPhotoPanel(id,names,globals={}){
 const source=fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8')+'\nexport {'+names.join(',')+'};\nexport function __setLocal(sdk,client){panelLocalClients.set(sdk,client);}\n';
 const module={exports:{}};
 vm.runInNewContext(esbuild.transformSync(source,{loader:'tsx',format:'cjs',target:'es2022',jsx:'automatic'}).code,{module,exports:module.exports,require,console,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,AbortController,setTimeout,clearTimeout,structuredClone,window:{parent:{}},btoa:value=>Buffer.from(value,'binary').toString('base64'),atob:value=>Buffer.from(value,'base64').toString('binary'),...globals});
 return module.exports;
}
