import test from 'node:test';
import assert from 'node:assert/strict';
import {panelSource,hostBlock,REFERENCE_BLOCK,posixHits,NEWER_SELECTS,loadPanelFunctions,fakeHost,hostGlobals} from './windows_host.mjs';

const source=panelSource('no14-still-video');
const W_MUSIC='C:\\Users\\\uD64D\uAE38\uB3D9\\.selects\\skills\\no14-still-video\\assets\\music.mp3';

test('the host I/O block is Archive Vlog\'s, unchanged',()=>{
 assert.equal(hostBlock(source),REFERENCE_BLOCK);
});

test('no POSIX shell syntax outside the host block',()=>{
 assert.deepEqual(posixHits(source),[]);
 assert.doesNotMatch(source,/runShell/,"no shell call at all");
});

test('Windows: the install folder resolves through FileSystem, with no shell',async()=>{
 const host=fakeHost({files:{[W_MUSIC]:'x'}});
 const {hostRoots,hostJoin}=loadPanelFunctions(source,[],hostGlobals(host));
 const sdk={runShell:()=>{throw Error('no shell on this path')}};
 const roots=await hostRoots(sdk,'no14-still-video',hostJoin('assets','music.mp3'));
 assert.equal(hostJoin(roots.plugin,'assets','music.mp3'),W_MUSIC);
 assert.match(source,/const musicPath=hostJoin\(roots\.plugin,'assets','music\.mp3'\);/);
});

// The import script as the panel sends it, run against a fake Project.
const template=/script:`(const p=selects\.project\(\$\{JSON\.stringify\(projectId\)\}\),path=\$\{JSON\.stringify\(musicPath\)\};.*?return \{resourceId:id\};)`/.exec(source)[1];
const importScript=(projectId,musicPath)=>new Function('projectId','musicPath','return `'+template+'`;')(projectId,musicPath);
async function runImport(nodes){
 const imports=[];
 const selects={project:()=>({sourceFiles:async()=>({fileTree:nodes}),importFiles:async({paths})=>{imports.push(...paths);return{addedResourceIds:['new']};}})};
 const result=await new Function('selects','return (async()=>{'+importScript('p',W_MUSIC)+'})();')(selects);
 return {result,imports};
}

test('Windows: an earlier import is reused whatever the path\'s case or slashes',async()=>{
 const earlier=W_MUSIC.toLowerCase().replaceAll('\\','/');
 const {result,imports}=await runImport([{type:'dir',children:[{path:earlier,resourceId:'old'}]}]);
 assert.deepEqual(result,{resourceId:'old'});
 assert.deepEqual(imports,[]);
});

test('the music is imported once when the Project does not have it',async()=>{
 const {result,imports}=await runImport([{path:'C:\\Users\\x\\Music\\music.mp3',resourceId:'other'}]);
 assert.deepEqual(result,{resourceId:'new'});
 assert.deepEqual(imports,[W_MUSIC]);
});

test('an old Selects build gets the update message, not "Reinstall"',()=>{
 assert.ok(source.includes(NEWER_SELECTS));
});
