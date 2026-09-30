import { buildScript } from './operation-builder.mjs';

let source = '';
for await (const chunk of process.stdin) source += chunk;
if (!source.trim()) throw new Error('One JSON gallery request is required on stdin');
const input = JSON.parse(source);
if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Gallery request must be a JSON object');
process.stdout.write(buildScript(input));
