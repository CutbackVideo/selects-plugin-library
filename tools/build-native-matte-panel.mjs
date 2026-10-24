// Keep the installed panel self-contained; native-matte.js is the editable source.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PLUGIN_SHADER_OPTIONS} from '../shared/shader-effects/generated/selects-ai-runtime.mjs';
const root=new URL('../plugins/selects-ai-runtime/',import.meta.url);
const source=readFileSync(new URL('native-matte.js',root),'utf8').replace('export async function','async function');
const path=fileURLToPath(new URL('panel.tsx',root));
let panel=readFileSync(path,'utf8');
const start='// BEGIN GENERATED NATIVE MATTE',end='// END GENERATED NATIVE MATTE';
if(!panel.includes(start)||!panel.includes(end))throw Error('Missing native matte source markers');
panel=panel.slice(0,panel.indexOf(start))+start+'\n'+source+'\nconst PACKED_MATTE_SHADER='+JSON.stringify(PLUGIN_SHADER_OPTIONS)+';\n'+end+panel.slice(panel.indexOf(end)+end.length);
writeFileSync(path,panel);
