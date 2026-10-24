import {checkScriptTypes} from './run_script_types.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as input from '../shared/native-image-input.mjs';
const request=[{resourceId:'r0',path:'/original.mp4'}];
const sdk=tree=>({project:id=>{assert.equal(id,'p');return {sourceFiles:async()=>tree};}});
const run=(tree,rows=request)=>input.confirmProjectSourcePaths(sdk(tree),'p',rows);
test('source path binding: exact Resource identity retains its expected original path',async()=>{await run({fileTree:[{type:'video',resourceId:'r0',path:'/original.mp4'}]});});
for(const [name,tree]of [['relink',{fileTree:[{type:'video',resourceId:'r0',path:'/other.mp4'}]}],['missing',{fileTree:[]}],['duplicate',{fileTree:[{type:'video',resourceId:'r0',path:'/original.mp4'},{type:'video',resourceId:'r0',path:'/original.mp4'}]}],['malformed',{fileTree:null}]])test('source path binding: '+name+' does not confirm an old path',async()=>{await assert.rejects(run(tree),e=>/^source-path-/.test(e.code));});
test('source path binding: summary folders are fully read and selected ids stay exact',async()=>{const calls=[];await input.confirmProjectSourcePaths({project:()=>({sourceFiles:async opts=>{calls.push(opts?.folder??'overview');return opts?{fileTree:[{type:'video',resourceId:opts.folder==='a'?'other':'r0',path:'/original.mp4'}]}:{mode:'summary',folders:[{name:'a'},{name:'b'}]};}})},'p',request);assert.deepEqual(calls,['overview','a','b']);});
test('source path binding: invalid duplicate selection fails before Project reads',async()=>{let reads=0;await assert.rejects(input.confirmProjectSourcePaths({project:()=>{reads++;throw Error('must not read');}},'p',[...request,...request]),e=>e.code==='source-path-input');assert.equal(reads,0);});
test('source path binding: snapshots the requested link before an asynchronous Project read',async()=>{const rows=[{...request[0]}];let release;const ready=new Promise(r=>release=r),work=input.confirmProjectSourcePaths({project:()=>({sourceFiles:()=>ready})},'p',rows);rows[0].path='/other.mp4';release({fileTree:[{type:'video',resourceId:'r0',path:'/other.mp4'}]});await assert.rejects(work,e=>e.code==='source-path-changed');});
test('source path binding: a transient catalog failure is unknown, and empty scope reads nothing',async()=>{await assert.rejects(input.confirmProjectSourcePaths({project:()=>({sourceFiles:async()=>{throw Error('temporary');}})},'p',request),e=>e.code==='source-path-unknown'&&e.cause.message==='temporary');let reads=0;assert.equal((await input.confirmProjectSourcePaths({project:()=>{reads++;throw Error('must not read');}},'p',[])).verified,true);assert.equal(reads,0);});
test('source path binding: duplicate folders cannot pretend to be complete coverage',async()=>{await assert.rejects(run({folders:[{name:'same'},{name:'same'}]}),e=>e.code==='source-path-unknown');});

test('source path binding: the exact serialized SDK invocation satisfies the actual host declarations',()=>{
 const body='return ('+input.confirmProjectSourcePaths.toString()+')(selects,"p",'+JSON.stringify(request)+');';checkScriptTypes([{name:'source path IIFE',script:body}]);
});
