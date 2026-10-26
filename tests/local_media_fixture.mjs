import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import {webcrypto} from 'node:crypto';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const code=esbuild.transformSync(fs.readFileSync(new URL('../shared/local-client.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code;
export async function loadMediaClient(sdk){
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:()=>({}),crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,btoa,atob,DOMException,setTimeout,clearTimeout});return module.exports.createPanelLocalClient(sdk);
}
