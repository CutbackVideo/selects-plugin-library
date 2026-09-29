import { readFileSync } from 'node:fs';

const formatSource = readFileSync(new URL('./format.mjs', import.meta.url), 'utf8')
  .replace('export const REFERENCE', 'const REFERENCE')
  .replace('export function planGallery', 'function planGallery');
const operationSource = readFileSync(new URL('./operation-runtime.js', import.meta.url), 'utf8');
export const SCRIPT_PREFIX = `${formatSource}\n${operationSource}\nreturn await galleryOperation(selects, `;

export function buildScript(input) {
  return SCRIPT_PREFIX + JSON.stringify(input) + ');';
}
