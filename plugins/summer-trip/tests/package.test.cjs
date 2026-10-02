// plugins/summer-trip/tests/package.test.cjs
// plugin.json: the `files` list is exactly what dev/list-files.cjs generates from the tree, every listed file exists,
// nothing dev-only is shipped, and the metadata follows PUBLISHING.md (localized x10, ASCII-only manifest).
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { listFiles, PENDING, PLUGIN_DIR } = require('../dev/list-files.cjs');

const text = fs.readFileSync(path.join(PLUGIN_DIR, 'plugin.json'), 'utf8');
const m = JSON.parse(text);

assert.equal(m.schemaVersion, 1);
assert.equal(m.id, 'summer-trip');
assert.equal(path.basename(PLUGIN_DIR), m.id, 'folder name = plugin id');
assert.match(m.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
assert.equal(m.name, 'Summer Trip');
assert.equal(m.status, 'experimental');
assert.equal(m.entrypoint, 'README.md');
assert.equal(m.installation, 'INSTALL.md');
assert.ok(!('preview' in m) || (m.preview && !m.files.includes('preview.mp4')), 'gallery previews are not installation files');

// The exact list, in the generator's order (regenerate with: node plugins/summer-trip/dev/list-files.cjs --write).
assert.deepEqual(m.files, listFiles(), 'plugin.json files differ from dev/list-files.cjs; run it with --write');
assert.equal(new Set(m.files).size, m.files.length, 'no duplicates');
assert.ok(!m.files.includes('plugin.json'));
for (const f of m.files) {
  assert.ok(!/^(dev|tests)\//.test(f), f + ': dev and tests are not shipped');
  assert.ok(!/(^|\/)\./.test(f), f + ': no dot files');
  assert.ok(!/^assets\/cues\/dev-/.test(f), f + ': development cues are not shipped');
}
for (const f of ['README.md', 'INSTALL.md', 'THIRD_PARTY.md', 'panel.tsx', 'planner.js', 'graphics-defs.js', 'beat-detect.cjs', 'muffle.cjs',
  'effects-geometry.cjs', 'scripts/assemble.js', 'scripts/decorate.js', 'scripts/ensure-audio.js', 'scripts/inventory.js', 'scripts/search.js',
  'assets/cues/manifest.json', 'assets/fonts/presets.json', 'sfx/manifest.json']) assert.ok(m.files.includes(f), f + ' is shipped');

// Every font a preset uses, its licence, every sound effect and every bundled cue (dry and muffled) is shipped.
const presets = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'assets/fonts/presets.json'), 'utf8'));
for (const [file, font] of Object.entries(presets.fonts)) {
  assert.ok(m.files.includes('assets/fonts/' + file), file);
  assert.ok(m.files.includes('assets/fonts/licenses/' + font.license), font.license);
}
const sfx = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'sfx/manifest.json'), 'utf8'));
for (const s of Object.values(sfx)) assert.ok(m.files.includes('sfx/' + s.file + '.b64'), s.file);
const cues = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'assets/cues/manifest.json'), 'utf8')).cues;
for (const c of cues) {
  assert.ok(m.files.includes('assets/cues/' + c.file), c.file);
  if (c.muffledFile) assert.ok(m.files.includes('assets/cues/' + c.muffledFile), c.muffledFile);
}

// Every listed file exists as a regular file. PENDING files are written by another lane (panel.tsx: the panel lane);
// they are skipped here, with a note, until that lane is merged.
const skipped = [];
for (const f of m.files) {
  const p = path.join(PLUGIN_DIR, f);
  if (!fs.existsSync(p) && PENDING.includes(f)) { skipped.push(f); continue; }
  const st = fs.lstatSync(p);
  assert.ok(st.isFile() && !st.isSymbolicLink(), f + ' is a regular file');
}
if (skipped.length) console.log('TODO: pending files not in this checkout yet (existence check skipped): ' + skipped.join(', '));

// Localized metadata: the ten app languages of PUBLISHING.md, each with a name and a summary; the manifest itself is
// ASCII-only (non-Latin text as \uXXXX escapes).
assert.deepEqual(Object.keys(m.localized).sort(), ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']);
for (const [lang, e] of Object.entries(m.localized)) {
  assert.ok(typeof e.name === 'string' && e.name && typeof e.summary === 'string' && e.summary, lang);
}
assert.deepEqual(m.localized.en, { name: m.name, summary: m.summary });
assert.ok(/^[\x00-\x7f]*$/.test(text), 'plugin.json is ASCII-only');
assert.ok(/[\uac00-\ud7a3]/.test(m.localized.ko.name), 'ko name is Korean (escaped in the file)');
// Windows (kit windows.md rule 7): both platforms, nothing to install, no shell named as a requirement.
assert.deepEqual(m.compatibility.platforms, ['macOS arm64', 'Windows x64']);
assert.ok(!/runShell|Node\.js|Homebrew|nvm/.test(m.compatibility.selects) && /bundled with Selects/.test(m.compatibility.selects), m.compatibility.selects);
for (const doc of ['INSTALL.md', 'README.md']) {
  const t = fs.readFileSync(path.join(PLUGIN_DIR, doc), 'utf8');
  assert.ok(!/homebrew|\bnvm\b|brew install|install(ed)? (ffmpeg|node)|ffmpeg -version|node --version|downloads a pinned/i.test(t) && !/\bPATH\b/.test(t), doc + ': no Homebrew, nvm, PATH, ffmpeg or Node.js install instructions');
  assert.ok(/Windows/.test(t), doc + ' says Windows is supported');
}

console.log('package tests passed (' + m.files.length + ' files)');
