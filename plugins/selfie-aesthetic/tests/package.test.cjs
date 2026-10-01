// plugins/selfie-aesthetic/tests/package.test.cjs (run: node plugins/selfie-aesthetic/tests/package.test.cjs)
// plugin.json: `files` is exactly the runtime set (what panel.tsx reads, the bundled cues, the docs), every listed
// file exists, nothing from dev/ or tests/ ships, the metadata follows PUBLISHING.md, and no plugin file holds literal
// Hangul or a personal path.
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const DIR = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(DIR, 'plugin.json'), 'utf8');
const m = JSON.parse(text);

assert.equal(m.schemaVersion, 1);
assert.equal(m.id, 'selfie-aesthetic');
assert.equal(path.basename(DIR), m.id, 'folder name = plugin id');
assert.match(m.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
assert.equal(m.name, 'Selfie Aesthetic Edit');
assert.equal(m.status, 'experimental');
assert.equal(m.entrypoint, 'README.md');
assert.equal(m.installation, 'INSTALL.md');
assert.ok(!('preview' in m) || !m.files.includes('preview.mp4'), 'gallery previews are not installation files');

// Files the panel reads at runtime: the ASSET_FILES table, the planner (the panel's install check), and every cue.
const panel = fs.readFileSync(path.join(DIR, 'panel.tsx'), 'utf8');
const table = panel.match(/const ASSET_FILES = \{([\s\S]*?)\n\};/);
assert.ok(table, 'panel.tsx has an ASSET_FILES table');
const runtime = [];
for (const mm of table[1].matchAll(/:\s*\[([^\]]*)\]/g)) runtime.push([...mm[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).join('/'));
assert.equal(runtime.length, 9, 'nine runtime files in ASSET_FILES');
const cues = JSON.parse(fs.readFileSync(path.join(DIR, 'assets/cues/manifest.json'), 'utf8')).cues;
assert.equal(cues.length, 4);
const expected = new Set([
  ...runtime, 'planner.js', 'panel.tsx', 'README.md', 'INSTALL.md', 'THIRD_PARTY.md',
  ...cues.map((c) => 'assets/cues/' + c.file),
]);
assert.deepEqual([...m.files].sort(), [...expected].sort(), 'plugin.json files = the runtime set');
assert.equal(m.files.length, 18);
assert.equal(new Set(m.files).size, m.files.length, 'no duplicates');
assert.ok(!m.files.includes('plugin.json'));
for (const f of m.files) {
  assert.ok(!/^(dev|tests)\//.test(f), f + ': dev and tests are not shipped');
  assert.ok(!/(^|\/)\./.test(f), f + ': no dot files');
  const st = fs.lstatSync(path.join(DIR, f));
  assert.ok(st.isFile() && !st.isSymbolicLink(), f + ' is a regular file');
}
// Every scripts/ and assets/ file on disk is shipped (nothing needed is left out).
const walk = (d) => fs.readdirSync(path.join(DIR, d), { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
for (const f of [...walk('scripts'), ...walk('assets')]) assert.ok(m.files.includes(f), f + ' is on disk but not shipped');

// Metadata: ten languages, each with a name and summary; Windows x64 is listed.
assert.deepEqual(Object.keys(m.localized).sort(), ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']);
for (const [lang, e] of Object.entries(m.localized)) {
  assert.ok(typeof e.name === 'string' && e.name.trim() && typeof e.summary === 'string' && e.summary.trim(), lang);
}
assert.deepEqual(m.localized.en, { name: m.name, summary: m.summary });
assert.ok(m.compatibility.platforms.includes('Windows x64'), 'Windows x64 is listed');
assert.ok(m.compatibility.platforms.includes('macOS arm64'));

// Text hygiene: no literal Hangul (non-English text is written as \uXXXX escapes) and no personal path in any plugin file.
const hangul = /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7ff]/;
assert.ok(/^[\x00-\x7f]*$/.test(text), 'plugin.json is ASCII-only');
assert.ok(!hangul.test(text) && !hangul.test(panel), 'no literal Hangul in plugin.json or panel.tsx');
assert.ok(/[\uac00-\ud7a3]/.test(m.localized.ko.summary), 'ko summary is Korean (escaped in the file)');
const TEXT = /\.(md|json|js|cjs|mjs|ts|tsx|py)$/;
const personal = new RegExp('/' + 'Users' + '/'); // built from parts so this file does not match itself
for (const f of walk('.').map((x) => x.slice(2)).filter((x) => TEXT.test(x))) {
  assert.ok(!personal.test(fs.readFileSync(path.join(DIR, f), 'utf8')), f + ': no personal path');
}
console.log('package tests passed (' + m.files.length + ' files)');
