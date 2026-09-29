// plugins/mini-vlog/tests/fonts.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'assets', 'fonts');
const p = JSON.parse(fs.readFileSync(path.join(dir, 'presets.json'), 'utf8'));
assert.equal(p.version, 1);
assert.deepEqual(p.presets.map(x => x.id), ['mini-vlog', 'day-in-my-life', 'small-glimpse']);
const byId = Object.fromEntries(p.presets.map(x => [x.id, x]));
// Fields per spec 14.8 (initial text and max length); the year's initial is resolved by the panel.
const fields = (id) => byId[id].fields.map(f => [f.key, f.initial, f.max]);
assert.deepEqual(fields('mini-vlog'), [['big', 'mini', 10], ['small', 'vlog', 12]]);
assert.deepEqual(fields('day-in-my-life'), [['year', '@year', 4], ['big', 'mini vlog', 12], ['tag', 'a day in my life', 24]]);
assert.deepEqual(fields('small-glimpse'), [['top', 'a small', 16], ['big', 'glimpse', 12], ['bottom', 'of today', 16]]);
for (const preset of p.presets) {
  assert.ok(preset.label && preset.fields.every(f => f.label), preset.id + ' labels');
  assert.deepEqual(preset.colors, { primary: '#F7C8E6', secondary: '#FFFFFF' }, preset.id + ' colors');
}
const EXPECTED = {
  'dm-serif-display.woff2.b64': ['MV DM Serif Display', 'normal', 400],
  'dm-serif-display-italic.woff2.b64': ['MV DM Serif Display Italic', 'italic', 400],
  'quicksand-bold.woff2.b64': ['MV Quicksand Bold', 'normal', 700],
  'dm-mono.woff2.b64': ['MV DM Mono', 'normal', 400],
};
const roles = (id) => Object.fromEntries(byId[id].fonts.map(f => [f.role, f.family]));
assert.deepEqual(roles('mini-vlog'), { big: 'MV DM Serif Display Italic', small: 'MV DM Serif Display' });
assert.deepEqual(roles('day-in-my-life'), { big: 'MV Quicksand Bold', tag: 'MV Quicksand Bold' });
assert.deepEqual(roles('small-glimpse'), { big: 'MV Quicksand Bold', mono: 'MV DM Mono' });
const files = new Set();
for (const preset of p.presets) for (const f of preset.fonts) {
  assert.ok(f.family.startsWith('MV '), f.family);
  assert.deepEqual([f.family, f.style, f.weight], EXPECTED[f.file], preset.id + ' ' + f.role);
  files.add(f.file);
}
assert.deepEqual([...files].sort(), Object.keys(EXPECTED).sort());
for (const file of files) {
  const b64 = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\s+/g, '');
  assert.equal(Buffer.from(b64, 'base64').subarray(0, 4).toString('latin1'), 'wOF2', file + ' is WOFF2');
  assert.ok(b64.length < 60000, file + ' subset too large: ' + b64.length);
}
// Every shipped b64 is referenced by a preset (no stale CWV subsets left behind).
assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.b64')).sort(), [...files].sort());
// Largest preset payload stays far under the ~260 KB run_script guard.
for (const preset of p.presets) {
  const total = [...new Set(preset.fonts.map(f => f.file))].reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(total < 120000, preset.id + ' payload ' + total);
}
// Metrics measured from the built subsets drive the layout (no browser needed).
for (const [family] of Object.values(EXPECTED)) {
  const m = p.metrics[family];
  assert.ok(m, 'metrics for ' + family);
  assert.ok(m.unitsPerEm > 0 && m.xHeight > 0 && m.capHeight > 0 && m.ascent > 0 && m.descent < 0, family + ' vertical metrics');
  for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -') assert.ok(m.advances[ch] > 0 || (ch === ' ' && m.advances[ch] >= 0), family + ' advance ' + JSON.stringify(ch));
  // [centre x, centre y, half height] of the dot contour.
  for (const ch of ['i', 'j']) assert.ok(Array.isArray(m.dots[ch]) && m.dots[ch].length === 3 && m.dots[ch][2] > 0, family + ' ' + ch + ' dot');
  assert.ok(m.dots.i[1] > m.xHeight, family + ' i dot sits above the x-height');
}
assert.ok(p.metrics['MV DM Serif Display Italic'].advances['\u0131'] > 0, 'dotless i for sparkles');
assert.ok(Math.abs(p.metrics['MV DM Serif Display Italic'].xHeight / p.metrics['MV DM Serif Display Italic'].unitsPerEm - 0.47) < 0.05, 'italic x-height ratio near 0.47');
// DM Mono is monospaced.
const mono = p.metrics['MV DM Mono'].advances;
assert.ok(new Set(['a', 'm', 'i', 'W', ' '].map(c => mono[c])).size === 1, 'DM Mono advances are equal');
// Each OFL family ships its own OFL.txt (with that family's copyright line).
const LIC = ['dmserifdisplay-OFL.txt', 'quicksand-OFL.txt', 'dmmono-OFL.txt'];
assert.deepEqual(fs.readdirSync(path.join(dir, 'licenses')).sort(), [...LIC].sort());
for (const f of LIC) {
  const text = fs.readFileSync(path.join(dir, 'licenses', f), 'utf8');
  assert.match(text, /Copyright/, f);
  assert.match(text, /SIL Open Font License/, f);
}
// plugin.json ships exactly these font files.
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'plugin.json'), 'utf8'));
const shipped = manifest.files.filter(f => f.startsWith('assets/fonts/')).sort();
assert.deepEqual(shipped, ['assets/fonts/presets.json', ...[...files].map(f => 'assets/fonts/' + f), ...LIC.map(f => 'assets/fonts/licenses/' + f)].sort());

// Minimal WOFF2 reader: returns the decompressed table stream and the table directory.
function woff2Tables(bin) {
  const TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
  const numTables = bin.readUInt16BE(12), compLen = bin.readUInt32BE(20);
  let o = 48;
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = bin[o++]; v = v * 128 + (b & 127); if (!(b & 128)) return v; } throw new Error('bad UIntBase128'); };
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = bin[o++];
    let tag = TAGS[flags & 63];
    if ((flags & 63) === 63) { tag = bin.toString('latin1', o, o + 4); o += 4; }
    const origLength = base128(), version = flags >> 6;
    const transformed = (tag === 'glyf' || tag === 'loca') ? version === 0 : version !== 0;
    const length = transformed ? base128() : origLength;
    tables.push({ tag, length });
  }
  const data = require('node:zlib').brotliDecompressSync(bin.subarray(o, o + compLen));
  let off = 0;
  for (const t of tables) { t.offset = off; off += t.length; }
  return { data, tables };
}
// Subset fonts are Modified Versions under OFL: they must be renamed away from any Reserved Font Name.
for (const file of files) {
  const family = EXPECTED[file][0];
  const { data, tables } = woff2Tables(Buffer.from(fs.readFileSync(path.join(dir, file), 'utf8').replace(/\s+/g, ''), 'base64'));
  const t = tables.find(x => x.tag === 'name');
  const name = data.subarray(t.offset, t.offset + t.length);
  const count = name.readUInt16BE(2), strOff = name.readUInt16BE(4), ids = {};
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12, platform = name.readUInt16BE(r), nameID = name.readUInt16BE(r + 6);
    const len = name.readUInt16BE(r + 8), at = strOff + name.readUInt16BE(r + 10);
    if (platform !== 3) continue;
    // Copy before swap16: it swaps in place and records may share the same string bytes.
    ids[nameID] = Buffer.from(name.subarray(at, at + len)).swap16().toString('utf16le');
  }
  assert.equal(ids[1], family, file + ' name ID 1');
  assert.equal(ids[4], family, file + ' name ID 4');
  assert.equal(ids[6], family.replace(/ /g, ''), file + ' name ID 6');
  if (ids[16] !== undefined) assert.equal(ids[16], family, file + ' name ID 16');
  if (ids[17] !== undefined) assert.ok(/^(Regular|Italic)$/.test(ids[17]), file + ' name ID 17 ' + ids[17]);
  if (ids[3] !== undefined) assert.ok(ids[3].includes(family.replace(/ /g, '')), file + ' name ID 3 ' + ids[3]);
}
console.log(JSON.stringify({ fonts: 'ok', files: files.size }));
