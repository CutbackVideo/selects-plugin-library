import{readFileSync,writeFileSync}from'node:fs';
import{createRequire}from'node:module';
import{resolve}from'node:path';
const require=createRequire(import.meta.url),esbuild=require(process.env.ESBUILD||'esbuild');
const file='plugins/podcast-hook-captions/src/motion/grid.tsx';
let source=readFileSync(file,'utf8').split('\nfunction Dust(')[0].replace(/^import .*;\n/gm,'');
source+='\nexport {dustLoop};\n';
const result=esbuild.transformSync(source,{loader:'tsx',format:'esm',target:'es2022'}).code;
writeFileSync('shared/shader-effects/podcast-dust.mjs','// Generated from '+file+' by tools/build-podcast-dust.mjs.\n'+result);
