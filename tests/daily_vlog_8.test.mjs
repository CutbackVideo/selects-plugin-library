import test from 'node:test';
import assert from 'node:assert/strict';
import {panelSource,hostBlock,REFERENCE_BLOCK,posixHits,loadPanelFunctions,fakeHost,hostGlobals} from './windows_host.mjs';

const source=panelSource('daily-vlog-8');
const NAMES=['ASSETS','ASSET_SECONDS','DURATIONS','REFERENCE','castReference','OPENING','MIDDLE','ENDING','SWISH','FILM_PRISM','AMBER_SHUTTER','AMBER_REFERENCE',
 'FILM_GATE','VERTICAL_SMEAR','takeShortestFitting','buildDailyVlog'];
const HOME='C:\\Users\\\uD64D\uAE38\uB3D9';

test('the host I/O block is Archive Vlog\'s, unchanged',()=>{
 assert.equal(hostBlock(source),REFERENCE_BLOCK);
});

test('no POSIX shell syntax outside the host block',()=>{
 assert.deepEqual(posixHits(source),[]);
 assert.doesNotMatch(source,/runShell/,"no shell call at all");
});

test('Windows: the bundled audio resolves through the Selects SDK, with no shell',async()=>{
 const host=fakeHost({});
 const {buildDailyVlog}=loadPanelFunctions(source,NAMES,hostGlobals(host));
 let script='';
 // The install folder comes from selects.files (the frame may have no host services); host joins build the paths.
 const sdk={runShell:()=>{throw Error('no shell on this path')},runScript:async x=>{if(x.summary==='Find the plugin files'){assert.match(x.script,/selects\.files\.environment\(\)/);return {result:{plugin:HOME+'\\.selects\\skills\\daily-vlog-8'}};}script=x.script;throw Error('stop')}};
 await assert.rejects(buildDailyVlog(sdk,{projectId:'p1',titleId:'r0',order:['r1','r2','r3','r4','r5','r6','r7','r8']}));
 const paths=JSON.parse(/const assetPaths=(\[.*?\]);/.exec(script)[1]);
 assert.equal(paths.length,7);
 assert.ok(paths.every(p=>p.startsWith(HOME+'\\.selects\\skills\\daily-vlog-8\\assets\\')),paths[0]);
});

test('the closing card uses a face Windows ships (Courier New, as in the reference)',()=>{
 assert.match(source,/label:'THANKS FOR WATCHING'.*?fontFamily:'Courier New'/);
});

test('the plugin files are found without window.parent',()=>{
 const build=source.slice(source.indexOf('async function buildDailyVlog('),source.indexOf('// A template run (Clip highlights)'));
 assert.doesNotMatch(build,/hostRoots\(|hostApi\(/);
 assert.match(build,/selects\.files\.exists/);
});
