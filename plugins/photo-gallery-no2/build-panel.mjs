import { readFileSync, writeFileSync } from 'node:fs';
import { SCRIPT_PREFIX } from './operation-builder.mjs';

const template = readFileSync(new URL('./panel.template.tsx', import.meta.url), 'utf8');
const marker = '/*__SHARED_SCRIPT_BUILDER__*/';
if (template.split(marker).length !== 2) throw new Error('Panel must have exactly one shared builder marker');
const nativeSource = readFileSync(new URL('./native-image-runtime.js', import.meta.url), 'utf8');
const generated = template.replace(marker, `const SCRIPT_PREFIX = ${JSON.stringify(SCRIPT_PREFIX)};\nconst buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';\n${nativeSource}`);
writeFileSync(new URL('./panel.tsx', import.meta.url), generated);
