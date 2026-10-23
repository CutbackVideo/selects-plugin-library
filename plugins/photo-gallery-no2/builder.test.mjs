import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildScript, SCRIPT_PREFIX } from './operation-builder.mjs';
import { nativeImageSources as canonicalFacts, observeSourceFiles as canonicalObserve, requireSourceFileSupport as canonicalSupport } from '../../shared/native-image-input.mjs';
import { nativeImageSources as packagedFacts, observeSourceFiles as packagedObserve, requireSourceFileSupport as packagedSupport } from './input-facts.generated.mjs';
import { IMAGE_AUTHORING_SOURCE, PANEL_AUTHORING_SOURCE, TEMPLATE_RUN_SOURCE, PANEL_RUN_SOURCE, PANEL_ASSET_SOURCE } from './authoring.generated.mjs';

test('installed panel contains the exact shared operation prefix', () => {
  const installed = readFileSync(new URL('./panel.tsx', import.meta.url), 'utf8');
  const generated = spawnSync(process.execPath, [fileURLToPath(new URL('./build-panel.mjs', import.meta.url)), '--stdout'], {encoding:'utf8',maxBuffer:4*1024*1024});
  assert.equal(generated.status, 0, generated.stderr);
  assert.equal(installed, generated.stdout);
});

test('chat CLI emits the same script as the panel builder', () => {
  const input = { operation: 'inspect', projectId: 'project-1' };
  const cli = spawnSync(process.execPath, [new URL('./build-script.mjs', import.meta.url).pathname],
    { input: JSON.stringify(input), encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(cli.stdout, buildScript(input));
});
test('an isolated installed package builds the same SDK script without repository shared paths',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-installed-builder-'));
 try{
  const manifest=JSON.parse(readFileSync(new URL('./plugin.json',import.meta.url),'utf8'));
  for(const name of manifest.files){const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(new URL('./'+name,import.meta.url),target);}
  const input={operation:'inspect',projectId:'project-1'},result=spawnSync(process.execPath,[path.join(root,'build-script.mjs')],{input:JSON.stringify(input),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,buildScript(input));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('installed input facts are an exact generated copy of the canonical feature',()=>{
 assert.equal(packagedFacts.toString(),canonicalFacts.toString());
 assert.equal(packagedObserve.toString(),canonicalObserve.toString());assert.equal(packagedSupport.toString(),canonicalSupport.toString());
});

test('packaged authoring helpers match existing canonical sources without browser ownership code',()=>{
 const raw=readFileSync(new URL('../../shared/native-image-authoring.js',import.meta.url),'utf8');
 for(const name of ['placeWorkingCopyImages','authorAtomicImageDraft','inspectImageGraphics','inspectImageTransforms','inspectImageAudio','imageProgramsFeature'])assert.ok(IMAGE_AUTHORING_SOURCE.includes(new Function(raw+';return '+name+'.toString()')()));
 for(const name of ['verifyAtomicImageDraft','readImageDraftFps'])assert.ok(PANEL_AUTHORING_SOURCE.includes(new Function(raw+';return '+name+'.toString()')()));
 const run=readFileSync(new URL('../../shared/template-run.js',import.meta.url),'utf8');
 for(const name of ['templateRunJSON','templateRunBase64','writeTemplateRunResult'])assert.ok(TEMPLATE_RUN_SOURCE.includes(new Function(run+';return '+name+'.toString()')()));
 for(const name of ['templateRunJSON','templateRunBase64','writeTemplateRunResult','templateRunIssue','validateTemplateRun','executeTemplateRun'])assert.ok(PANEL_RUN_SOURCE.includes(new Function(run+';return '+name+'.toString()')()));
 assert.ok(!TEMPLATE_RUN_SOURCE.includes('executeTemplateRun'));assert.ok(!IMAGE_AUTHORING_SOURCE.includes('buildAtomicImageDraftScript'));
 const assets=readFileSync(new URL('../../shared/bundled-assets.js',import.meta.url),'utf8');
 for(const name of ['bundledAssetIssue','readBundledAssetBytes','readBundledAssetResource','prepareBundledAsset','readAssetFileIdentity','prepareDerivedAsset','retainUnconfirmedAssetFiles','runAssetMediaTool'])assert.ok(PANEL_ASSET_SOURCE.includes(new Function(assets+';return '+name+'.toString()')()));
 assert.ok(!SCRIPT_PREFIX.includes('async function prepareBundledAsset('),'browser asset publication must not enter SDK requests');
});

// Exercise the installed closure alone: importing the whole shared source here
// would hide a generator that forgot one of the helpers used on error paths.
const installedAssets=()=>new Function(PANEL_ASSET_SOURCE+';return {prepareDerivedAsset,runAssetMediaTool};')();
const unknownMediaJob=()=>Object.freeze(Object.assign(Error('host job reply lost'),{
 terminal:true,preserveTemporaryFiles:true,unconfirmedJobId:'host-job-1',
 retainedTemporaryFiles:Object.freeze(['/host-owned/workspace'])
}));
test('installed asset closure preserves an unconfirmed media job error',async()=>{
 const cause=unknownMediaJob();
 await assert.rejects(installedAssets().runAssetMediaTool({runFFmpeg:async()=>{throw cause;}},'runFFmpeg',[]),error=>{
  assert.equal(error.code,'BUNDLED_ASSET_WORKSPACE_UNKNOWN');
  assert.equal(error.cause,cause);assert.equal(error.terminal,true);assert.equal(error.preserveTemporaryFiles,true);
  assert.equal(error.unconfirmedJobId,'host-job-1');
  assert.deepEqual(error.retainedTemporaryFiles,['/host-owned/workspace']);return true;
 });
 assert.deepEqual(cause.retainedTemporaryFiles,['/host-owned/workspace']);
});
test('installed derived asset closure retains only its reserved paths after an unconfirmed job',async()=>{
 const cause=unknownMediaJob(),sha256='a'.repeat(64),source=Buffer.from('source'),disk=new Map([['/source',source],['/foreign',Buffer.from('keep')]]),removed=[];
 const files={
  join:path.posix.join,exists:async name=>disk.has(name),mkdir:async()=>{},
  stat:async name=>disk.has(name)?{size:disk.get(name).length,isDirectory:false,mtimeMs:1,ino:1}:null,
  readFile:async name=>disk.get(name),readRange:async(name,start,size)=>disk.get(name).subarray(start,start+size),
  writeFile:async(name,value,options)=>{if(options?.flag==='wx'&&disk.has(name))throw Error('exists');disk.set(name,Buffer.from(value));},
  compareAndReplace:async(name,expected,next)=>{if(disk.get(name)?.toString()!==expected)return false;disk.set(name,Buffer.from(next));return true;},
  copyFile:async(from,to)=>disk.set(to,Buffer.from(disk.get(from))),rename:async()=>{throw Error('unexpected publish');},
  removeFile:async({filePath})=>{removed.push(filePath);disk.delete(filePath);}
 };
 let reserved;
 await assert.rejects(installedAssets().prepareDerivedAsset(files,{
  directory:'/own',key:'b'.repeat(64),sourcePath:'/source',source:{sha256,bytes:source.length},hashFile:async()=>sha256,
  produce:async(snapshot,output)=>{reserved=[snapshot,output];throw cause;},verify:async()=>{throw Error('unexpected verification');}
 }),error=>{
  assert.equal(error.code,'BUNDLED_ASSET_WORKSPACE_UNKNOWN');assert.equal(error.cause,cause);
  assert.equal(error.preserveTemporaryFiles,true);assert.equal(error.unconfirmedJobId,'host-job-1');
  assert.equal(reserved.length,2);assert.ok(reserved.every(name=>name.startsWith('/own/.')));
  assert.deepEqual(error.retainedTemporaryFiles,['/host-owned/workspace',...reserved]);return true;
 });
 assert.deepEqual(removed,[]);assert.ok(reserved.every(name=>disk.has(name)));
 assert.equal(disk.get(reserved[0]).toString(),'source');assert.equal(disk.get('/foreign').toString(),'keep');
 assert.deepEqual(cause.retainedTemporaryFiles,['/host-owned/workspace']);
});
