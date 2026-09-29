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
// Every OFL family ships its own OFL.txt (with that family's copyright line); Yellowtail is Apache-2.0.
assert.ok(fs.existsSync(path.join(dir, 'licenses', 'Apache-2.0.txt')));
for (const f of files) {
  if (f === 'yellowtail.woff2.b64') continue;
  const lic = path.join(dir, 'licenses', f.replace(/\.woff2\.b64$/, '').replace(/-italic$/, '').replace(/-/g, '') + '-OFL.txt');
  assert.ok(fs.existsSync(lic), 'missing ' + lic);
  const text = fs.readFileSync(lic, 'utf8');
  assert.match(text, /Copyright/, lic);
  assert.match(text, /SIL Open Font License/, lic);
}
assert.ok(!fs.existsSync(path.join(dir, 'licenses', 'OFL.txt')), 'shared OFL.txt should be replaced by per-family files');

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
for (const preset of p.presets) for (const k of ['A', 'B', 'C', 'D']) {
  const s = preset.states[k];
  const { data, tables } = woff2Tables(Buffer.from(fs.readFileSync(path.join(dir, s.file), 'utf8').replace(/\s+/g, ''), 'base64'));
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
  assert.equal(ids[1], s.family, s.file + ' name ID 1');
  assert.equal(ids[4], s.family, s.file + ' name ID 4');
  assert.equal(ids[6], s.family.replace(/ /g, ''), s.file + ' name ID 6');
  if (ids[16] !== undefined) assert.equal(ids[16], s.family, s.file + ' name ID 16');
  if (ids[3] !== undefined) assert.ok(ids[3].includes(s.family.replace(/ /g, '')), s.file + ' name ID 3 ' + ids[3]);
}
console.log(JSON.stringify({ fonts: 'ok', files: files.size }));
