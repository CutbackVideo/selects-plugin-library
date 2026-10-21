import { readFileSync, writeFileSync } from 'node:fs';
import { nativeImageSources } from '../../shared/native-image-input.mjs';

const template = readFileSync(new URL('./panel.template.tsx', import.meta.url), 'utf8');
const marker = '/*__SHARED_SCRIPT_BUILDER__*/';
if (template.split(marker).length !== 2) throw new Error('Panel must have exactly one shared builder marker');
const nativeSource = readFileSync(new URL('./native-image-runtime.js', import.meta.url), 'utf8');
const originalImageSource = nativeImageSources.toString();
const authoringSource = readFileSync(new URL('../../shared/native-image-authoring.js', import.meta.url), 'utf8');
const runSource = readFileSync(new URL('../../shared/template-run.js', import.meta.url), 'utf8');
const assetSource = readFileSync(new URL('../../shared/bundled-assets.js', import.meta.url), 'utf8');
const assetNames = ['bundledAssetIssue','readBundledAssetBytes','readBundledAssetResource','prepareBundledAsset','readAssetFileIdentity','prepareDerivedAsset','runAssetMediaTool'];
const assetFunctions = await import('data:text/javascript;base64,' + Buffer.from(assetSource + '\nexport {' + assetNames.join(',') + '};').toString('base64'));
const panelAssetSource = assetNames.map(name => assetFunctions[name].toString()).join('\n');
const assetResourceSource = assetFunctions.readBundledAssetResource.toString();
// Serialize only SDK-safe functions into SDK requests. Browser-side ownership
// and file-client functions remain outside the script worker.
const sdkNames = ['placeWorkingCopyImages','authorAtomicImageDraft','inspectImageGraphics','inspectImageTransforms','inspectImageAudio','imageProgramsFeature'];
const panelNames = [...sdkNames,'verifyAtomicImageDraft','readImageDraftFps'];
const functions = await import('data:text/javascript;base64,' + Buffer.from(authoringSource + '\nexport {' + panelNames.join(',') + '};').toString('base64'));
const sdkRunNames = ['templateRunJSON','templateRunBase64','writeTemplateRunResult'];
const panelRunNames = [...sdkRunNames,'templateRunIssue','validateTemplateRun','executeTemplateRun'];
const runFunctions = await import('data:text/javascript;base64,' + Buffer.from(runSource + '\nexport {' + panelRunNames.join(',') + '};').toString('base64'));
const sdkAuthoringSource = sdkNames.map(name => functions[name].toString()).join('\n');
const panelAuthoringSource = panelNames.map(name => functions[name].toString()).join('\n');
const sdkRunSource = sdkRunNames.map(name => runFunctions[name].toString()).join('\n');
const panelRunSource = panelRunNames.map(name => runFunctions[name].toString()).join('\n');
const stdout = process.argv.includes('--stdout');
// The installed builder cannot import repository-wide paths. Publish its small
// generated copy before importing it, so a normal rebuild also bootstraps it.
if (!stdout) writeFileSync(new URL('./input-facts.generated.mjs', import.meta.url), '// Generated from shared/native-image-input.mjs; edit the canonical source.\nexport ' + originalImageSource + '\n');
if (!stdout) writeFileSync(new URL('./authoring.generated.mjs', import.meta.url), '// Generated from existing shared authoring, run and asset features; edit the canonical sources.\nexport const IMAGE_AUTHORING_SOURCE = ' + JSON.stringify(sdkAuthoringSource) + ';\nexport const PANEL_AUTHORING_SOURCE = ' + JSON.stringify(panelAuthoringSource) + ';\nexport const TEMPLATE_RUN_SOURCE = ' + JSON.stringify(sdkRunSource) + ';\nexport const PANEL_RUN_SOURCE = ' + JSON.stringify(panelRunSource) + ';\nexport const PANEL_ASSET_SOURCE = ' + JSON.stringify(panelAssetSource) + ';\nexport const ASSET_RESOURCE_SOURCE = ' + JSON.stringify(assetResourceSource) + ';\n');
const { createScriptPrefix, FORMAT_SOURCE } = await import('./operation-builder.mjs');
const prefix = createScriptPrefix(originalImageSource, sdkAuthoringSource, sdkRunSource, assetResourceSource);
const generated = template.replace(marker, `const SCRIPT_PREFIX = ${JSON.stringify(prefix)};\nconst buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';\n${FORMAT_SOURCE}\nconst gallerySourceFacts = ${originalImageSource};\n${panelAuthoringSource}\n${panelRunSource}\n${panelAssetSource}\n${nativeSource}`);
// `--stdout` prints the panel instead (tests compare it with the checked-in panel.tsx).
if (stdout) process.stdout.write(generated);
else writeFileSync(new URL('./panel.tsx', import.meta.url), generated);
