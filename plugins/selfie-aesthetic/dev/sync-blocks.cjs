#!/usr/bin/env node
// Re-embeds the verbatim blocks in panel.tsx from their sources, so the panel never drifts from the tested files:
//   // sae-planner:start … // sae-planner:end   <- planner.js (trimmed)
//   // sae-host:start … // sae-host:end         <- dev/host-block.ts (the marked region, markers included)
//   // sae-beat:start … // sae-beat:end         <- beat-detect.cjs up to `module.exports`, wrapped in an IIFE
// Usage: node plugins/selfie-aesthetic/dev/sync-blocks.cjs [--check]   (--check exits 1 when a block is stale)
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const check = process.argv.includes('--check');

// Markers count only as whole lines: the embedded files mention the marker text inside their own comments.
function line(text, marker, from) {
  const re = new RegExp('^' + marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'mg');
  re.lastIndex = from || 0;
  const m = re.exec(text);
  return m ? m.index : -1;
}
function region(text, start, end) {
  const a = line(text, start, 0);
  const b = a < 0 ? -1 : line(text, end, a + start.length);
  if (a < 0 || b < 0) throw new Error('markers not found: ' + start);
  return [a, b + end.length];
}

const planner = read('planner.js').trim();
const host = (() => { const t = read('dev/host-block.ts'); const [a, b] = region(t, '// sae-host:start', '// sae-host:end'); return t.slice(a, b); })();
const beat = (() => {
  const t = read('beat-detect.cjs');
  const m = /^module\.exports\b/m.exec(t);
  if (!m) throw new Error('module.exports not found in beat-detect.cjs');
  return '// sae-beat:start\nconst saeBeat = (function () {\n' + t.slice(0, m.index) + 'return { analyze };\n})();\n// sae-beat:end';
})();

const file = path.join(root, 'panel.tsx');
let panel = fs.readFileSync(file, 'utf8');
const before = panel;
const replace = (start, end, body) => { const [a, b] = region(panel, start, end); panel = panel.slice(0, a) + body + panel.slice(b); };
replace('// sae-planner:start', '// sae-planner:end', '// sae-planner:start\n' + planner + '\n// sae-planner:end');
replace('// sae-host:start', '// sae-host:end', host);
replace('// sae-beat:start', '// sae-beat:end', beat);

if (panel === before) { console.log('blocks up to date'); process.exit(0); }
if (check) { console.error('panel.tsx blocks are stale: run node plugins/selfie-aesthetic/dev/sync-blocks.cjs'); process.exit(1); }
fs.writeFileSync(file, panel);
console.log('panel.tsx blocks re-synced');
