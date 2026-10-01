// plugins/archive-vlog/tests/fonts.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'assets', 'fonts');
const p = JSON.parse(fs.readFileSync(path.join(dir, 'presets.json'), 'utf8'));
assert.equal(p.version, 1);
// Style presets (spec 9): Cinematic (default), A Day Out, Golden Hour.
assert.deepEqual(p.presets.map(x => x.id), ['cinematic', 'a-day-out', 'golden-hour']);
const byId = Object.fromEntries(p.presets.map(x => [x.id, x]));
const fields = (id) => byId[id].fields.map(f => [f.key, f.initial]);
assert.deepEqual(fields('cinematic'), [['kicker', 'MINI VLOG'], ['title', 'CINEMATIC'], ['tagline', 'CAPTURE THE MOMENTS']]);
assert.deepEqual(fields('a-day-out')[0], ['kicker', ''], 'A Day Out has no kicker');
assert.equal(fields('a-day-out')[1][1], 'A DAY OUT');
assert.equal(fields('golden-hour')[1][1], 'GOLDEN HOUR');
assert.deepEqual(byId.cinematic.colors, { title: '#FCE070', text: '#FFFFFF' });
assert.deepEqual(byId['a-day-out'].colors, { title: '#FFFFFF', text: '#FFFFFF' });
assert.equal(byId['golden-hour'].colors.text, '#FFFFFF');
assert.match(byId['golden-hour'].colors.title, /^#F[0-9A-F]{5}$/, 'warm cream');
assert.deepEqual(byId.cinematic.credit, { prefix: 'ARCHIVED BY', name: 'YOURNAME' });
assert.deepEqual(byId['a-day-out'].credit, { prefix: 'LOCATION |', name: 'YOURNAME' });
assert.deepEqual(byId['golden-hour'].credit, { prefix: 'ARCHIVED BY', name: 'YOURNAME' });
assert.deepEqual(p.presets.map(x => x.look.strength), [0.3, 0.3, 0.45]);
for (const preset of p.presets) {
  assert.ok(preset.label && preset.fields.every(f => f.label && f.max > 0 && f.initial.length <= f.max), preset.id + ' labels and max');
  assert.ok(preset.taglineTracking > 0 && preset.taglineSize > 0, preset.id + ' tagline style');
}
const EXPECTED = {
  'anton.woff2.b64': ['AV Anton', 'normal', 400],
  'oswald-bold.woff2.b64': ['AV Oswald Bold', 'normal', 700],
  'inter-medium.woff2.b64': ['AV Inter Medium', 'normal', 500],
  'inter-regular.woff2.b64': ['AV Inter', 'normal', 400],
};
const ROLES = { display: 'AV Anton', condensed: 'AV Oswald Bold', kicker: 'AV Inter Medium', tagline: 'AV Inter' };
const files = new Set();
for (const preset of p.presets) {
  assert.deepEqual(Object.fromEntries(preset.fonts.map(f => [f.role, f.family])), ROLES, preset.id + ' roles');
  for (const f of preset.fonts) {
    assert.ok(f.family.startsWith('AV '), f.family);
    assert.deepEqual([f.family, f.style, f.weight], EXPECTED[f.file], preset.id + ' ' + f.role);
    files.add(f.file);
  }
}
assert.deepEqual([...files].sort(), Object.keys(EXPECTED).sort());
let total = 0;
for (const file of files) {
  const b64 = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\s+/g, '');
  assert.equal(Buffer.from(b64, 'base64').subarray(0, 4).toString('latin1'), 'wOF2', file + ' is WOFF2');
  assert.ok(b64.length < 60000, file + ' subset too large: ' + b64.length);
  total += b64.length;
}
// Every shipped b64 is referenced by a preset (no stale Mini Vlog subsets left behind).
assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.b64')).sort(), [...files].sort());
// One decorate run carries the title (all four faces: Adjust can switch the title face) and the credit (Oswald again):
// far under the ~260 KB run_script guard.
const credit = fs.statSync(path.join(dir, 'oswald-bold.woff2.b64')).size;
assert.ok(total + credit < 120000, 'title + credit font payload ' + (total + credit));
// Metrics measured from the built subsets drive the layout (no browser needed).
for (const [family] of Object.values(EXPECTED)) {
  const m = p.metrics[family];
  assert.ok(m, 'metrics for ' + family);
  assert.ok(m.unitsPerEm > 0 && m.xHeight > 0 && m.capHeight > 0 && m.ascent > 0 && m.descent < 0, family + ' vertical metrics');
  for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -|,.\u00c9\u00e9') assert.ok(m.advances[ch] > 0, family + ' advance ' + JSON.stringify(ch));
}
assert.deepEqual(Object.keys(p.metrics).sort(), Object.values(EXPECTED).map(e => e[0]).sort());
// Each OFL family ships its own OFL.txt (with that family's copyright line).
const LIC = ['anton-OFL.txt', 'oswald-OFL.txt', 'inter-OFL.txt'];
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
  'anton.woff2.b64': 'anton-OFL.txt',
  'oswald-bold.woff2.b64': 'oswald-OFL.txt',
  'inter-medium.woff2.b64': 'inter-OFL.txt',
  'inter-regular.woff2.b64': 'inter-OFL.txt',
};
// The source family names: renamed name records (1/4/6/16/17) must not keep them.
const SOURCE = { 'anton-OFL.txt': 'Anton', 'oswald-OFL.txt': 'Oswald', 'inter-OFL.txt': 'Inter' };
// Quoted names after "Reserved Font Name(s)" in a licence's copyright lines ('x', "x" or curly quotes).
function reservedNames(lic) {
  const text = fs.readFileSync(path.join(dir, 'licenses', lic), 'utf8').split(/This Font Software is licensed/)[0];
  const out = [];
  for (const m of text.matchAll(/Reserved Font Names?\s*((?:[,\s]*(?:and\s+)?['"\u2018\u201c][^'"\u2019\u201d]+['"\u2019\u201d])+)/g)) {
    for (const q of m[1].matchAll(/['"\u2018\u201c]([^'"\u2019\u201d]+)['"\u2019\u201d]/g)) out.push(q[1]);
  }
  return out;
}
// The parser itself (each family's RFNs are checked below; these three declare none).
assert.deepEqual(reservedNames('anton-OFL.txt'), []);
assert.deepEqual(reservedNames('oswald-OFL.txt'), []);
assert.deepEqual(reservedNames('inter-OFL.txt'), []);
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
  // Every family-name record carries the AV prefix (the source name only after it).
  for (const r of records) if ([1, 4, 16].includes(r.nameID)) assert.ok(r.text.startsWith('AV '), `${file} name ID ${r.nameID}: ${r.text}`);
  for (const r of records) if (r.nameID === 6) assert.ok(r.text.startsWith('AV'), `${file} name ID 6: ${r.text}`);
  assert.ok(family.startsWith('AV ' + SOURCE[LICENCE[file]]), file + ' family ' + family);
}
console.log(JSON.stringify({ fonts: 'ok', files: files.size }));
