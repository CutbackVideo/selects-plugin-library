// plugins/the-end-credits/tests/fonts.test.cjs
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'assets', 'fonts');
const FONTS = [
  { file: 'tec-title-serif.woff2.b64', family: 'TEC Title Serif', license: 'robotoserif-OFL.txt', upstream: /Roboto Serif/, weight: 800 },
  { file: 'tec-credits-sans.woff2.b64', family: 'TEC Credits Sans', license: 'poppins-OFL.txt', upstream: /Poppins/, weight: 600 },
];
assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.b64')).sort(), FONTS.map((f) => f.file).sort(), 'exactly the two TEC fonts');

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
  const data = zlib.brotliDecompressSync(bin.subarray(o, o + compLen));
  let off = 0;
  for (const t of tables) { t.offset = off; off += t.length; }
  return { data, tables };
}

for (const f of FONTS) {
  const b64 = fs.readFileSync(path.join(dir, f.file), 'utf8').replace(/\s+/g, '');
  assert.ok(b64.length <= 40 * 1024, `${f.file} is ${b64.length} bytes (limit 40 KB)`);
  const bin = Buffer.from(b64, 'base64');
  assert.equal(bin.subarray(0, 4).toString('latin1'), 'wOF2', f.file + ' is WOFF2');
  const { data, tables } = woff2Tables(bin);
  const tags = tables.map((t) => t.tag);
  // A static instance: no variation tables left.
  for (const tag of ['fvar', 'gvar', 'avar', 'HVAR', 'MVAR']) assert.ok(!tags.includes(tag), `${f.file} has ${tag}`);
  const os2 = tables.find((t) => t.tag === 'OS/2');
  assert.equal(data.readUInt16BE(os2.offset + 4), f.weight, f.file + ' usWeightClass');
  // Renamed: OFL Modified Versions keep no Reserved Font Name.
  const t = tables.find((x) => x.tag === 'name');
  const name = data.subarray(t.offset, t.offset + t.length);
  const count = name.readUInt16BE(2), strOff = name.readUInt16BE(4), ids = {};
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12, platform = name.readUInt16BE(r), nameID = name.readUInt16BE(r + 6);
    const len = name.readUInt16BE(r + 8), at = strOff + name.readUInt16BE(r + 10);
    if (platform !== 3) continue;
    // Copy before swap16: it swaps in place and records may share the same string bytes.
    ids[nameID] = Buffer.from(name.subarray(at, at + len)).swap16().toString('utf16le');
  }
  const ps = f.family.replace(/ /g, '');
  assert.equal(ids[1], f.family, f.file + ' name ID 1');
  assert.equal(ids[4], f.family, f.file + ' name ID 4');
  assert.equal(ids[6], ps, f.file + ' name ID 6');
  assert.equal(ids[16], f.family, f.file + ' name ID 16');
  assert.equal(ids[17], 'Regular', f.file + ' name ID 17');
  assert.ok(ids[3].endsWith(';' + ps), f.file + ' name ID 3 ' + ids[3]);
  for (const id of [1, 3, 4, 6, 16, 17, 21, 22, 25]) if (ids[id] !== undefined) assert.doesNotMatch(ids[id], f.upstream, `${f.file} name ID ${id} keeps the upstream name`);
  // The copyright notice (name ID 0) stays, as the OFL requires.
  assert.match(ids[0], /Copyright/, f.file + ' copyright');
  // Each family ships its own OFL.txt.
  const lic = fs.readFileSync(path.join(dir, 'licenses', f.license), 'utf8');
  assert.match(lic, /Copyright/, f.license);
  assert.match(lic, /SIL Open Font License/, f.license);
  assert.match(lic, f.upstream, f.license);
}
assert.deepEqual(fs.readdirSync(path.join(dir, 'licenses')).sort(), FONTS.map((f) => f.license).sort());
// The graphic declares the same families.
const tsx = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'credits-graphic.tsx'), 'utf8');
for (const f of FONTS) assert.ok(tsx.includes(`"${f.family}"`), 'graphic uses ' + f.family);
console.log(JSON.stringify({ fonts: 'ok', files: FONTS.length }));
