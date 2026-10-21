import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { buildScript, SCRIPT_PREFIX, ORIGINAL_IMAGE_SOURCE } from './operation-builder.mjs';
import { nativeImageSources as canonicalFacts } from '../../shared/native-image-input.mjs';
import { nativeImageSources as packagedFacts } from './input-facts.generated.mjs';
import { IMAGE_AUTHORING_SOURCE, PANEL_AUTHORING_SOURCE, TEMPLATE_RUN_SOURCE, PANEL_RUN_SOURCE, PANEL_ASSET_SOURCE } from './authoring.generated.mjs';

test('installed panel contains the exact shared operation prefix', () => {
  const template = readFileSync(new URL('./panel.template.tsx', import.meta.url), 'utf8');
  const installed = readFileSync(new URL('./panel.tsx', import.meta.url), 'utf8');
  const native = readFileSync(new URL('./native-image-runtime.js', import.meta.url), 'utf8');
  const expected = template.replace('/*__SHARED_SCRIPT_BUILDER__*/',
    `const SCRIPT_PREFIX = ${JSON.stringify(SCRIPT_PREFIX)};\nconst buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';\nconst gallerySourceFacts = ${ORIGINAL_IMAGE_SOURCE};\n${PANEL_AUTHORING_SOURCE}\n${PANEL_RUN_SOURCE}\n${PANEL_ASSET_SOURCE}\n${native}`);
  assert.notEqual(expected, template);
  assert.equal(installed, expected);
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
 for(const name of ['bundledAssetIssue','readBundledAssetBytes','readBundledAssetResource','prepareBundledAsset'])assert.ok(PANEL_ASSET_SOURCE.includes(new Function(assets+';return '+name+'.toString()')()));
 assert.ok(!SCRIPT_PREFIX.includes('async function prepareBundledAsset('),'browser asset publication must not enter SDK requests');
});
