// plugins/selfie-aesthetic/tests/public-paths.test.cjs
// Mirrors tools/check_public.py's "personal filesystem path" rule over every text file of the plugin, so a home-folder
// path in an example or comment fails here before the public check does. The pattern is assembled from parts so this
// file never matches it.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const rule = new RegExp('/(?:' + ['Us' + 'ers', 'ho' + 'me'].join('|') + ')/[A-Za-z0-9]|/var/fol' + 'ders/[A-Za-z0-9]');
const offenders = [];
let scanned = 0;
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__pycache__') walk(p); continue; }
    const buf = fs.readFileSync(p);
    if (buf.includes(0)) continue; // binary (audio cues)
    scanned++;
    buf.toString('utf8').split('\n').forEach((line, i) => { if (rule.test(line)) offenders.push(path.relative(root, p) + ':' + (i + 1)); });
  }
};
walk(root);
assert.ok(scanned > 10, 'scanned the plugin tree');
assert.deepEqual(offenders, [], 'personal filesystem paths');
console.log(JSON.stringify({ publicPaths: 'ok', scanned }));
