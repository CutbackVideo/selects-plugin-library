import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source = (await readFile(new URL('../shared/generation-client.js',import.meta.url),'utf8')).replace('export function','function');
function client() {
 const calls=[];
 const sdk={runScript:async request=>{calls.push(request);return {result:request.script.includes('submit(')?{jobId:'selects-'+ 'a'.repeat(64)}:[]};}};
 const context=vm.createContext({sdk});vm.runInContext(source+'\nglobalThis.client=sdkGeneration(sdk);',context);
 return {client:context.client,calls};
}
test('paid generation preserves recovery key, explicit project and bounded file delivery',async()=>{
 const {client:c,calls}=client();
 const result=await c.submit({scope:{libraryId:'old-library',projectId:'p'},key:'stable-key',modelId:'model_v1_test',input:{prompt:'hi'},uploads:{source:{pluginFile:'/plugin/input.mp4'}},outputName:'mask',batch:1,delivery:{pluginFolder:'/plugin/results'},origin:{tool:'video'}});
 assert.equal(result.jobIds.length,1);assert.equal(calls[0].allowCommit,true);
 assert.match(calls[0].script,/selects\.generation\.submit/);assert.match(calls[0].script,/"requestKey":"stable-key"/);
 assert.doesNotMatch(calls[0].script,/old-library|__DI__/);
});
test('job observation remains read-only; cancellation and delivery repair are explicit writes',async()=>{
 const {client:c,calls}=client(),scope={projectId:'p'},id='selects-'+ 'a'.repeat(64);
 await c.list(scope);await c.cancel(scope,id);await c.retryDelivery(scope,id);
 assert.deepEqual(calls.map(x=>x.allowCommit),[false,true,true]);
 assert.match(calls[1].script,/\.cancel\(\)/);assert.match(calls[2].script,/\.retryDelivery\(\)/);
});
