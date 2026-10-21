import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {createRequire} from 'node:module';
import {fixture} from './photo_authoring_fixture.mjs';

const require=createRequire(import.meta.url);
const esbuild=require(process.env.SELECTS_ESBUILD||(process.env.SBS_PANEL_TEST_MODULES?process.env.SBS_PANEL_TEST_MODULES+'/esbuild':'esbuild'));
const source=fs.readFileSync(new URL('../plugins/no14-still-video/panel.tsx',import.meta.url),'utf8');
for(const minify of [false,true])test('complete Image authoring runs after real panel compilation (minify='+minify+')',async()=>{
 const {code}=esbuild.transformSync(source,{loader:'tsx',format:'cjs',target:'es2022',jsx:'automatic',minify});
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:()=>({}),console,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout});
 const f=fixture('no14-still-video'),result=await f.invoke(module.exports.createNo14Draft);
 assert.equal(result.status,'saved');assert.equal(f.commits.length,1);assert.equal(result.clips.length,8);
});
