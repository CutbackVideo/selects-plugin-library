import { readFileSync, writeFileSync } from 'node:fs';
import { nativeImageSources, observeSourceFiles, requireSourceFileSupport } from '../../shared/native-image-input.mjs';
import { fingerprintTemplateFile } from '../../shared/file-observation.js';
import { readTemplateDraftSources, templateObservedSource } from '../../shared/draft-observation.js';

const template = readFileSync(new URL('./panel.template.tsx', import.meta.url), 'utf8');
const marker = '/*__SHARED_SCRIPT_BUILDER__*/';
if (template.split(marker).length !== 2) throw new Error('Panel must have exactly one shared builder marker');
const nativeSource = readFileSync(new URL('./native-image-runtime.js', import.meta.url), 'utf8');
const originalImageSource = nativeImageSources.toString();
const faceModules = [
  ['sharedAiJobs','ai-job-client',readFileSync(new URL('../../shared/ai-job-client.cjs',import.meta.url),'utf8')],
  ['sharedAiResources','ai-resources',readFileSync(new URL('../../shared/ai-resources.cjs',import.meta.url),'utf8')],
  ['sharedCoverFocus','cover-focus',readFileSync(new URL('../../shared/cover-focus.cjs',import.meta.url),'utf8')],
].map(([name,id,source]) => `const ${name}=(()=>{const module={exports:{}};\n// ${id}:start\n${source.trimEnd()}\n// ${id}:end\nreturn module.exports;})();`).join('\n');
const inputSupportSource = fingerprintTemplateFile.toString()+'\n'+requireSourceFileSupport.toString()+'\n'+observeSourceFiles.toString();
const standaloneModule=(id)=>'// '+id+':start\n'+readFileSync(new URL('../../shared/'+id+'.js',import.meta.url),'utf8').replace(/^export (async function|function)/gm,'$1').replace(/^export \{[^\n]+\};?\s*$/m,'').trimEnd()+'\n// '+id+':end';
const observationSource=standaloneModule('file-observation')+'\n'+standaloneModule('draft-observation');
const authoringSource = readFileSync(new URL('../../shared/native-image-authoring.js', import.meta.url), 'utf8');
const runSource = readFileSync(new URL('../../shared/template-run.js', import.meta.url), 'utf8');
const assetSource = readFileSync(new URL('../../shared/bundled-assets.js', import.meta.url), 'utf8');
const assetNames = ['bundledAssetIssue','readBundledAssetBytes','readBundledAssetResource','prepareBundledAsset','readAssetFileIdentity','prepareDerivedAsset','reserveAssetFiles','retainUnconfirmedAssetFiles','runAssetMediaTool'];
const assetFunctions = await import('data:text/javascript;base64,' + Buffer.from(assetSource + '\nexport {' + assetNames.join(',') + '};').toString('base64'));
const panelAssetSource = assetNames.map(name => assetFunctions[name].toString()).join('\n');
const assetResourceSource = assetFunctions.readBundledAssetResource.toString();
// Serialize only SDK-safe functions into SDK requests. Browser-side ownership
// and file-client functions remain outside the script worker.
const sdkNames = ['bindMediaPlacement','placeWorkingCopyImages','authorAtomicImageDraft','inspectImageGraphics','inspectImageTransforms','inspectImageAudio','imageProgramsFeature'];
const panelNames = [...sdkNames,'verifyAtomicImageDraft','readImageDraftFps'];
const functions = await import('data:text/javascript;base64,' + Buffer.from(authoringSource + '\nexport {' + panelNames.join(',') + '};').toString('base64'));
const sdkRunNames = ['templateRunJSON','templateRunBase64','templateStateJSON','templateStateFile','writeTemplateRunResult'];
const panelRunNames = [...sdkRunNames,'templateRunIssue','validateTemplateRun','executeTemplateRun'];
const runFunctions = await import('data:text/javascript;base64,' + Buffer.from(runSource + '\nexport {' + panelRunNames.join(',') + '};').toString('base64'));
const sdkAuthoringSource = sdkNames.map(name => functions[name].toString()).join('\n');
const panelAuthoringSource = panelNames.map(name => functions[name].toString()).join('\n');
const sdkRunSource = sdkRunNames.map(name => runFunctions[name].toString()).join('\n');
const panelRunSource = panelRunNames.map(name => runFunctions[name].toString()).join('\n');
const stdout = process.argv.includes('--stdout');
// The installed builder cannot import repository-wide paths. Publish its small
// generated copy before importing it, so a normal rebuild also bootstraps it.
if (!stdout) writeFileSync(new URL('./input-facts.generated.mjs', import.meta.url), '// Generated from shared input/file observation; edit the canonical sources.\nexport '+fingerprintTemplateFile.toString()+'\nexport ' + originalImageSource + '\nexport '+requireSourceFileSupport.toString()+'\nexport '+observeSourceFiles.toString()+'\n');
if (!stdout) writeFileSync(new URL('./authoring.generated.mjs', import.meta.url), '// Generated from existing shared authoring, run and asset features; edit the canonical sources.\nexport const IMAGE_AUTHORING_SOURCE = ' + JSON.stringify(sdkAuthoringSource) + ';\nexport const PANEL_AUTHORING_SOURCE = ' + JSON.stringify(panelAuthoringSource) + ';\nexport const TEMPLATE_RUN_SOURCE = ' + JSON.stringify(sdkRunSource) + ';\nexport const PANEL_RUN_SOURCE = ' + JSON.stringify(panelRunSource) + ';\nexport const PANEL_ASSET_SOURCE = ' + JSON.stringify(panelAssetSource) + ';\nexport const ASSET_RESOURCE_SOURCE = ' + JSON.stringify(assetResourceSource) + ';\n');
const { createScriptPrefix, FORMAT_SOURCE } = await import('./operation-builder.mjs');
const prefix = createScriptPrefix(originalImageSource, sdkAuthoringSource, sdkRunSource, assetResourceSource, inputSupportSource);
const withObservations=template.replace(/\/\/ file-observation:start\n[\s\S]*?\/\/ file-observation:end\n\/\/ draft-observation:start\n[\s\S]*?\/\/ draft-observation:end/,observationSource);
const generated = withObservations.replace(marker, `const SCRIPT_PREFIX = ${JSON.stringify(prefix)};\nconst buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';\n${FORMAT_SOURCE}\n${faceModules}\nconst gallerySourceFacts = ${originalImageSource};\n${panelAuthoringSource}\n${panelRunSource}\n${panelAssetSource}\n${nativeSource}`);
// `--stdout` prints the panel instead (tests compare it with the checked-in panel.tsx).
if (stdout) process.stdout.write(generated);
else writeFileSync(new URL('./panel.tsx', import.meta.url), generated);
