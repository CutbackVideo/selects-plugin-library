import test from 'node:test';
import assert from 'node:assert/strict';
import {panelSource,hostBlock,REFERENCE_BLOCK,posixHits,NEWER_SELECTS,loadPanelFunctions,fakeHost,hostGlobals} from './windows_host.mjs';

const source=panelSource('cinema-vlog-studio');

test('the host I/O block is Archive Vlog\'s, unchanged',()=>{
 assert.equal(hostBlock(source),REFERENCE_BLOCK);
});

test('no POSIX shell syntax outside the host block',()=>{
 assert.deepEqual(posixHits(source),[]);
 assert.doesNotMatch(source,/runShell/,"no shell call at all");
});

test('Windows: the bundled sounds resolve through FileSystem, with no shell',async()=>{
 const host=fakeHost({files:{'C:\\Users\\\uD64D\uAE38\uB3D9\\.selects\\skills\\cinema-vlog-studio\\assets\\cinema-vlog-camera-click.wav':'x'}});
 const {cinemaSounds}=loadPanelFunctions(source,['clean','call','ASSETS','ensureSounds','cinemaSounds'],hostGlobals(host));
 let script='';
 const sdk={runShell:()=>{throw Error('no shell on this path')},runScript:async x=>{script=x.script;return{result:{}}}};
 await cinemaSounds(sdk,'p1');
 const paths=JSON.parse(/const paths=(\[.*?\]),names=/.exec(script)[1]);
 assert.deepEqual(paths,['cinema-vlog-intro-effects.m4a','06-clear-waters-music-preview.mp3','cinema-vlog-camera-click.wav']
  .map(n=>'C:\\Users\\\uD64D\uAE38\uB3D9\\.selects\\skills\\cinema-vlog-studio\\assets\\'+n));
});

test('a missing install keeps the existing message',async()=>{
 const host=fakeHost();
 const {cinemaSounds}=loadPanelFunctions(source,['clean','call','ASSETS','ensureSounds','cinemaSounds'],hostGlobals(host));
 const sdk={runShell:async()=>({stdout:'\r\n',exitCode:0}),runScript:async()=>{throw Error('not reached')}};
 await assert.rejects(cinemaSounds(sdk,'p1'),/Template assets directory is unavailable/);
});

test('an old Selects build gets the update message, not "Reinstall"',()=>{
 assert.ok(source.includes(NEWER_SELECTS));
});
