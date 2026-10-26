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
test('inset cards keep 19/51/79 percent of output width for portrait and landscape sources',()=>{
 const {cinemaInsetGeometry}=loadPanelFunctions(source,['cinemaInsetGeometry']);
 for(const [sw,sh] of [[1920,1080],[640,360],[640,338],[202,338],[1080,1920],[1000,1000],[4096,2160]])for(const pct of [19,51,79]){
  const box=cinemaInsetGeometry(1920,1080,sw,sh,pct),fit=Math.min(1920/sw,1080/sh);
  assert.ok(Math.abs(box.width*fit-1920*pct/100)<1e-9);
  assert.ok(Math.abs(box.height*fit-1920*pct/100*9/16)<1e-9);
  if(sw/sh>=16/9)assert.ok(Math.abs(box.width-sw*pct/100)<1e-9,'normal landscape geometry stays unchanged');
 }
});
test('card size lookup preserves display dimensions through nested and paged Project files',async()=>{
 const {cinemaCardSources}=loadPanelFunctions(source,['cinemaCardSources']);
 const row={type:'video',resourceId:'portrait',frameSize:{width:202,height:338}};
 const flat=await cinemaCardSources({sourceFiles:async()=>({fileTree:[{type:'dir',children:[row]}]})},['portrait']);
 assert.deepEqual(JSON.parse(JSON.stringify(flat)),{portrait:{width:202,height:338}});
 const calls=[],paged=await cinemaCardSources({sourceFiles:async args=>{calls.push(args);return args?{fileTree:[row]}:{folders:[{name:'People'}]};}},['portrait']);
 assert.deepEqual(JSON.parse(JSON.stringify(paged)),JSON.parse(JSON.stringify(flat)));assert.equal(calls.length,2);
});
test('unknown or contradictory card dimensions refuse to guess',async()=>{
 const {cinemaCardSources,cinemaInsetGeometry}=loadPanelFunctions(source,['cinemaCardSources','cinemaInsetGeometry']);
 for(const rows of [[],[{resourceId:'r',frameSize:{width:0,height:1080}}],[{resourceId:'r',frameSize:{width:1920,height:1080}},{resourceId:'r',frameSize:{width:1080,height:1920}}]])await assert.rejects(cinemaCardSources({sourceFiles:async()=>({fileTree:rows})},['r']),/dimensions are unavailable/);
 assert.throws(()=>cinemaInsetGeometry(1920,1080,NaN,338,19),/dimensions are unavailable/);
});
