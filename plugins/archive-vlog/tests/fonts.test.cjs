// plugins/archive-vlog/tests/fonts.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'assets', 'fonts');
const p = JSON.parse(fs.readFileSync(path.join(dir, 'presets.json'), 'utf8'));
assert.equal(p.version, 1);
assert.deepEqual(p.presets.map(x => x.id), ['archive-vlog', 'day-in-my-life', 'small-glimpse']);
const byId = Object.fromEntries(p.presets.map(x => [x.id, x]));
// Fields per spec 14.8 (initial text and max length); the year's initial is resolved by the panel.
const fields = (id) => byId[id].fields.map(f => [f.key, f.initial, f.max]);
assert.deepEqual(fields('archive-vlog'), [['big', 'mini', 10], ['small', 'vlog', 12]]);
assert.deepEqual(fields('day-in-my-life'), [['year', '@year', 4], ['big', 'mini vlog', 12], ['tag', 'a day in my life', 24]]);
assert.deepEqual(fields('small-glimpse'), [['top', 'a small', 16], ['big', 'glimpse', 12], ['bottom', 'of today', 16]]);
for (const preset of p.presets) {
  assert.ok(preset.label && preset.fields.every(f => f.label), preset.id + ' labels');
  assert.deepEqual(preset.colors, { primary: '#F7C8E6', secondary: '#FFFFFF' }, preset.id + ' colors');
}
const EXPECTED = {
  'dm-serif-display.woff2.b64': ['MV DM Serif Display', 'normal', 400],
  'instrument-serif-italic.woff2.b64': ['MV Instrument Serif Italic', 'italic', 400],
  'mv-rounded-bold.woff2.b64': ['MV Rounded Bold', 'normal', 700],
  'dm-mono.woff2.b64': ['MV DM Mono', 'normal', 400],
};
const roles = (id) => Object.fromEntries(byId[id].fonts.map(f => [f.role, f.family]));
assert.deepEqual(roles('archive-vlog'), { big: 'MV Instrument Serif Italic', small: 'MV DM Serif Display' });
assert.deepEqual(roles('day-in-my-life'), { big: 'MV Rounded Bold', tag: 'MV Rounded Bold' });
assert.deepEqual(roles('small-glimpse'), { big: 'MV Rounded Bold', mono: 'MV DM Mono' });
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
// The sparkled face has dotless i/j and their stem tops ([x, y] of the topmost outline points).
const inst = p.metrics['MV Instrument Serif Italic'];
assert.ok(inst.advances['\u0131'] > 0 && inst.advances['\u0237'] > 0, 'dotless i and j for sparkles');
for (const ch of ['i', 'j']) {
  const st = inst.stems[ch];
  assert.ok(Array.isArray(st) && st.length === 2 && st[1] >= inst.xHeight * 0.95 && st[1] < inst.dots[ch][1], ch + ' stem top at the x-height, below the dot');
  assert.ok(st[0] > 0 && st[0] < inst.advances[ch === 'i' ? '\u0131' : '\u0237'] * 1.2, ch + ' stem top x inside the glyph');
}
assert.ok(Math.abs(inst.xHeight / inst.unitsPerEm - 0.51) < 0.03, 'Instrument Serif Italic x-height ratio ~0.51');
// DM Mono is monospaced.
const mono = p.metrics['MV DM Mono'].advances;
assert.ok(new Set(['a', 'm', 'i', 'W', ' '].map(c => mono[c])).size === 1, 'DM Mono advances are equal');
// Each OFL family ships its own OFL.txt (with that family's copyright line).
const LIC = ['dmserifdisplay-OFL.txt', 'instrumentserif-OFL.txt', 'quicksand-OFL.txt', 'dmmono-OFL.txt'];
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
const LICENCE = {
  'dm-serif-display.woff2.b64': 'dmserifdisplay-OFL.txt',
  'instrument-serif-italic.woff2.b64': 'instrumentserif-OFL.txt',
  'mv-rounded-bold.woff2.b64': 'quicksand-OFL.txt',
  'dm-mono.woff2.b64': 'dmmono-OFL.txt',
};
// Quoted names after "Reserved Font Name(s)" in a licence's copyright lines ('x', "x" or curly quotes).
function reservedNames(lic) {
  const text = fs.readFileSync(path.join(dir, 'licenses', lic), 'utf8').split(/This Font Software is licensed/)[0];
  const out = [];
  for (const m of text.matchAll(/Reserved Font Names?\s*((?:[,\s]*(?:and\s+)?['"\u2018\u201c][^'"\u2019\u201d]+['"\u2019\u201d])+)/g)) {
    for (const q of m[1].matchAll(/['"\u2018\u201c]([^'"\u2019\u201d]+)['"\u2019\u201d]/g)) out.push(q[1]);
  }
  return out;
}
assert.deepEqual(reservedNames('dmserifdisplay-OFL.txt'), ['Source']);
assert.deepEqual(reservedNames('quicksand-OFL.txt'), ['Quicksand']);
assert.deepEqual(reservedNames('dmmono-OFL.txt'), []);
assert.deepEqual(reservedNames('instrumentserif-OFL.txt'), []);
for (const file of files) {
  const family = EXPECTED[file][0];
  const { data, tables } = woff2Tables(Buffer.from(fs.readFileSync(path.join(dir, file), 'utf8').replace(/\s+/g, ''), 'base64'));
  const t = tables.find(x => x.tag === 'name');
  const name = data.subarray(t.offset, t.offset + t.length);
  const count = name.readUInt16BE(2), strOff = name.readUInt16BE(4), ids = {}, records = [];
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12, platform = name.readUInt16BE(r), nameID = name.readUInt16BE(r + 6);
    const len = name.readUInt16BE(r + 8), at = strOff + name.readUInt16BE(r + 10);
    // Copy before swap16: it swaps in place and records may share the same string bytes.
    const text = platform === 1 ? name.subarray(at, at + len).toString('latin1') : Buffer.from(name.subarray(at, at + len)).swap16().toString('utf16le');
    records.push({ nameID, text });
    if (platform === 3) ids[nameID] = text;
  }
  // No record may carry a Reserved Font Name declared in the family's licence. The copyright
  // notice (ID 0) is exempt: OFL requires it to be kept, and it is where the RFN is declared.
  const rfns = reservedNames(LICENCE[file]);
  for (const r of records) for (const rfn of rfns) {
    if (r.nameID === 0) continue;
    assert.ok(!r.text.toLowerCase().includes(rfn.toLowerCase()), `${file} name ID ${r.nameID} contains Reserved Font Name ${rfn}: ${r.text}`);
  }
  for (const rfn of rfns) assert.ok(!file.toLowerCase().includes(rfn.toLowerCase()) && !family.toLowerCase().includes(rfn.toLowerCase()), file + ' / ' + family + ' uses ' + rfn);
  assert.equal(ids[1], family, file + ' name ID 1');
  assert.equal(ids[4], family, file + ' name ID 4');
  assert.equal(ids[6], family.replace(/ /g, ''), file + ' name ID 6');
  if (ids[16] !== undefined) assert.equal(ids[16], family, file + ' name ID 16');
  if (ids[17] !== undefined) assert.ok(/^(Regular|Italic)$/.test(ids[17]), file + ' name ID 17 ' + ids[17]);
  if (ids[3] !== undefined) assert.ok(ids[3].includes(family.replace(/ /g, '')), file + ' name ID 3 ' + ids[3]);
}
console.log(JSON.stringify({ fonts: 'ok', files: files.size }));
