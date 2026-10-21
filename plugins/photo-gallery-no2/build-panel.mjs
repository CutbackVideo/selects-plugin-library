import { readFileSync, writeFileSync } from 'node:fs';
import { nativeImageSources } from '../../shared/native-image-input.mjs';

const template = readFileSync(new URL('./panel.template.tsx', import.meta.url), 'utf8');
const marker = '/*__SHARED_SCRIPT_BUILDER__*/';
if (template.split(marker).length !== 2) throw new Error('Panel must have exactly one shared builder marker');
const nativeSource = readFileSync(new URL('./native-image-runtime.js', import.meta.url), 'utf8');
const originalImageSource = nativeImageSources.toString();
const stdout = process.argv.includes('--stdout');
// The installed builder cannot import repository-wide paths. Publish its small
// generated copy before importing it, so a normal rebuild also bootstraps it.
if (!stdout) writeFileSync(new URL('./input-facts.generated.mjs', import.meta.url), '// Generated from shared/native-image-input.mjs; edit the canonical source.\nexport ' + originalImageSource + '\n');
const { createScriptPrefix } = await import('./operation-builder.mjs');
const prefix = createScriptPrefix(originalImageSource);
const generated = template.replace(marker, `const SCRIPT_PREFIX = ${JSON.stringify(prefix)};\nconst buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';\nconst gallerySourceFacts = ${originalImageSource};\n${nativeSource}`);
// `--stdout` prints the panel instead (tests compare it with the checked-in panel.tsx).
if (stdout) process.stdout.write(generated);
else writeFileSync(new URL('./panel.tsx', import.meta.url), generated);
