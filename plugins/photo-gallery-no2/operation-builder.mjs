import { readFileSync } from 'node:fs';
import { nativeImageSources, observeSourceFiles, requireSourceFileSupport, fingerprintTemplateFile } from './input-facts.generated.mjs';
import { IMAGE_AUTHORING_SOURCE, TEMPLATE_RUN_SOURCE, ASSET_RESOURCE_SOURCE } from './authoring.generated.mjs';

export const FORMAT_SOURCE = readFileSync(new URL('./format.mjs', import.meta.url), 'utf8')
  .replace('export const REFERENCE', 'const REFERENCE')
  .replace('export function planGallery', 'function planGallery');
const operationSource = readFileSync(new URL('./operation-runtime.js', import.meta.url), 'utf8');
export const ORIGINAL_IMAGE_SOURCE = nativeImageSources.toString();
export const INPUT_SUPPORT_SOURCE = fingerprintTemplateFile.toString()+'\n'+requireSourceFileSupport.toString()+'\n'+observeSourceFiles.toString();
export function createScriptPrefix(originalImageSource = ORIGINAL_IMAGE_SOURCE, authoringSource = IMAGE_AUTHORING_SOURCE, runSource = TEMPLATE_RUN_SOURCE, assetResourceSource = ASSET_RESOURCE_SOURCE, inputSupportSource = INPUT_SUPPORT_SOURCE) {
  return `${FORMAT_SOURCE}\n${originalImageSource}\n${inputSupportSource}\n${authoringSource}\n${runSource}\n${assetResourceSource}\n${operationSource}\nreturn await galleryOperation(selects, `;
}
export const SCRIPT_PREFIX = createScriptPrefix();

export function buildScript(input) {
  return SCRIPT_PREFIX + JSON.stringify(input) + ');';
}
