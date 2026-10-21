import { readFileSync } from 'node:fs';
import { nativeImageSources } from './input-facts.generated.mjs';

const formatSource = readFileSync(new URL('./format.mjs', import.meta.url), 'utf8')
  .replace('export const REFERENCE', 'const REFERENCE')
  .replace('export function planGallery', 'function planGallery');
const operationSource = readFileSync(new URL('./operation-runtime.js', import.meta.url), 'utf8');
export const ORIGINAL_IMAGE_SOURCE = nativeImageSources.toString();
export function createScriptPrefix(originalImageSource = ORIGINAL_IMAGE_SOURCE) {
  return `${formatSource}\n${originalImageSource}\n${operationSource}\nreturn await galleryOperation(selects, `;
}
export const SCRIPT_PREFIX = createScriptPrefix();

export function buildScript(input) {
  return SCRIPT_PREFIX + JSON.stringify(input) + ');';
}
