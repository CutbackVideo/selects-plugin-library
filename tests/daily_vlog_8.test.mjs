import test from 'node:test';
import assert from 'node:assert/strict';
import {panelSource,hostBlock,REFERENCE_BLOCK,posixHits,NEWER_SELECTS,loadPanelFunctions,fakeHost,hostGlobals} from './windows_host.mjs';

const source=panelSource('daily-vlog-8');
const NAMES=['ASSETS','DURATIONS','SHOT_PLAN','OPENING','MIDDLE','ENDING','SWISH','FILM_PRISM','AMBER_SHUTTER','AMBER_REFERENCE',
 'FILM_GATE','VERTICAL_SMEAR','ONE_FRAME_HOLD','PRISM_SIX_SEVEN','LONG_DISSOLVE','takeShortestFitting','buildDailyVlog'];
const HOME='C:\\Users\\\uD64D\uAE38\uB3D9';

test('the host I/O block is Archive Vlog\'s, unchanged',()=>{
 assert.equal(hostBlock(source),REFERENCE_BLOCK);
});

test('no POSIX shell syntax outside the host block',()=>{
 assert.deepEqual(posixHits(source),[]);
 assert.doesNotMatch(source,/runShell/,"no shell call at all");
});

test('Windows: the bundled audio resolves through FileSystem, with no shell',async()=>{
 const host=fakeHost({files:{[HOME+'\\.selects\\skills\\daily-vlog-8\\assets\\shutter-s2.wav']:'x'}});
 const {buildDailyVlog}=loadPanelFunctions(source,NAMES,hostGlobals(host));
 let script='';
 const sdk={runShell:()=>{throw Error('no shell on this path')},runScript:async x=>{script=x.script;throw Error('stop')}};
 const pool=Array.from({length:10},(_,i)=>({id:'r'+i,duration:9}));
 await assert.rejects(buildDailyVlog(sdk,{projectId:'p1',titleId:'r0',picks:['r1','r2','r3','r4','r5','r6','r7'],pool}));
 const paths=JSON.parse(/const assetPaths=(\[.*?\]);/.exec(script)[1]);
 assert.equal(paths.length,7);
 assert.ok(paths.every(p=>p.startsWith(HOME+'\\.selects\\skills\\daily-vlog-8\\assets\\')),paths[0]);
});

test('the closing card names a Windows face',()=>{
 assert.match(source,/fontFamily:'Avenir Next Demi Bold, Avenir Next, Segoe UI Semibold, Segoe UI, Arial, sans-serif'/);
});

test('an old Selects build gets the update message, not "Reinstall"',()=>{
 assert.ok(source.includes(NEWER_SELECTS));
});
