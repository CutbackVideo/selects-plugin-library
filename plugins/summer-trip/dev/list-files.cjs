// plugins/summer-trip/dev/list-files.cjs
// Dev-only: the exact list of files the plugin ships (plugin.json `files`), generated from the tree.
//   node plugins/summer-trip/dev/list-files.cjs            print the list (JSON)
//   node plugins/summer-trip/dev/list-files.cjs --write    rewrite plugin.json `files` with it
// Shipped: every file of the plugin folder except plugin.json itself, dev/, tests/, dot files and folders, the
// gallery previews (preview.mp4, poster.webp) and the gitignored development cues (assets/cues/dev-*). The three docs
// come first, then the rest in code-point order. PENDING files are shipped although another lane writes them; they
// are listed even when they are not in this checkout yet (tests/package.test.cjs skips their existence check).
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_DIR = path.resolve(__dirname, '..');
const DOCS = ['README.md', 'INSTALL.md', 'THIRD_PARTY.md'];
const PENDING = ['panel.tsx'];
const EXCLUDED_DIRS = new Set(['dev', 'tests']);
const EXCLUDED_FILES = new Set(['plugin.json', 'preview.mp4', 'poster.webp']);
const isDevCue = rel => /^assets\/cues\/dev-/.test(rel);

function walk(dir, rel, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (!rel && EXCLUDED_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), r, out);
    } else if (e.isFile()) {
      if (!rel && EXCLUDED_FILES.has(e.name)) continue;
      if (isDevCue(r)) continue;
      out.push(r);
    }
  }
  return out;
}

function listFiles(dir = PLUGIN_DIR) {
  const found = new Set(walk(dir, '', []));
  for (const f of DOCS.concat(PENDING)) found.add(f);
  const rest = [...found].filter(f => !DOCS.includes(f)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return DOCS.concat(rest);
}

module.exports = { listFiles, PENDING, DOCS, PLUGIN_DIR };

if (require.main === module) {
  const files = listFiles();
  if (process.argv.includes('--write')) {
    const file = path.join(PLUGIN_DIR, 'plugin.json');
    const text = fs.readFileSync(file, 'utf8');
    const m = JSON.parse(text);
    m.files = files;
    // Keep the manifest ASCII-only (localized text as \uXXXX escapes; check_public rejects literal Hangul).
    const out = JSON.stringify(m, null, 2).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '\n';
    fs.writeFileSync(file, out);
    console.log('plugin.json files: ' + files.length);
  } else console.log(JSON.stringify(files, null, 1));
}
