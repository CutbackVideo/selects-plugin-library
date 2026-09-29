// plugins/city-weekend-vlog/tests/fonts.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'assets', 'fonts');
const p = JSON.parse(fs.readFileSync(path.join(dir, 'presets.json'), 'utf8'));
assert.deepEqual(p.presets.map(x => x.id), ['classic', 'romantic', 'retro-diner', 'travel-journal', 'editorial']);
const files = new Set();
for (const preset of p.presets) for (const k of ['A', 'B', 'C', 'D']) {
  const s = preset.states[k];
  assert.ok(s && s.file && s.family.startsWith('CWV '), preset.id + ' ' + k);
  const b64 = fs.readFileSync(path.join(dir, s.file), 'utf8').replace(/\s+/g, '');
  const bin = Buffer.from(b64, 'base64');
  assert.equal(bin.subarray(0, 4).toString('latin1'), 'wOF2', s.file + ' is WOFF2');
  assert.ok(b64.length < 60000, s.file + ' subset too large: ' + b64.length);
  files.add(s.file);
}
assert.equal(p.presets[0].states.B.case, 'upper');
// Largest preset payload must stay well under the script-size guard.
for (const preset of p.presets) {
  const total = [...new Set(['A', 'B', 'C', 'D'].map(k => preset.states[k].file))].reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(total < 160000, preset.id + ' payload ' + total);
}
for (const lic of ['OFL.txt', 'Apache-2.0.txt']) assert.ok(fs.existsSync(path.join(dir, 'licenses', lic)));
console.log(JSON.stringify({ fonts: 'ok', files: files.size }));
