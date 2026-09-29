// plugins/torn-paper-love/tests/fonts.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'assets', 'fonts');
const IDS = ['didone', 'condensed', 'serif', 'slab', 'black', 'typewriter'];
const LICENCES = { didone: 'abrilfatface-OFL.txt', condensed: 'bebasneue-OFL.txt', serif: 'dmserifdisplay-OFL.txt', slab: 'alfaslabone-OFL.txt', black: 'archivoblack-OFL.txt', typewriter: 'specialelite-Apache-2.0.txt' };
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?&'- ";

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
// All name records as { platform, nameID, text }.
function nameRecords(bin) {
  const { data, tables } = woff2Tables(bin);
  const t = tables.find(x => x.tag === 'name');
  const name = data.subarray(t.offset, t.offset + t.length);
  const count = name.readUInt16BE(2), strOff = name.readUInt16BE(4), out = [];
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12, platform = name.readUInt16BE(r), nameID = name.readUInt16BE(r + 6);
    const len = name.readUInt16BE(r + 8), at = strOff + name.readUInt16BE(r + 10);
    const raw = Buffer.from(name.subarray(at, at + len)); // copy: swap16 works in place
    out.push({ platform, nameID, text: platform === 3 || platform === 0 ? raw.swap16().toString('utf16le') : raw.toString('latin1') });
  }
  return out;
}
// Reserved Font Names declared in an OFL.txt ("with Reserved Font Name(s) "A" and "B"" or 'A').
function reservedNames(text) {
  const out = new Set();
  for (const m of text.matchAll(/Reserved Font Names?\s+((?:["'“][^"'”]+["'”](?:\s*(?:,|and|or)\s*)?)+)/gi))
    for (const q of m[1].matchAll(/["'“]([^"'”]+)["'”]/g)) out.add(q[1].trim());
  return [...out];
}

const looks = JSON.parse(fs.readFileSync(path.join(dir, 'looks.json'), 'utf8'));
assert.deepEqual(Object.keys(looks.faces), IDS);
assert.deepEqual(Object.values(looks.faces), ['TPL Didone', 'TPL Condensed', 'TPL Serif', 'TPL Slab', 'TPL Black', 'TPL Typewriter']);

let total = 0;
const rfnSeen = {};
for (const id of IDS) {
  const b64 = fs.readFileSync(path.join(dir, `tpl-${id}.woff2.b64`), 'utf8').replace(/\s+/g, '');
  total += b64.length;
  const bin = Buffer.from(b64, 'base64');
  assert.equal(bin.subarray(0, 4).toString('latin1'), 'wOF2', id + ' is WOFF2');
  // Licence file present; OFL ones list their Reserved Font Names.
  const licPath = path.join(dir, 'licenses', LICENCES[id]);
  assert.ok(fs.existsSync(licPath), 'missing ' + licPath);
  const lic = fs.readFileSync(licPath, 'utf8');
  if (id === 'typewriter') assert.match(lic, /Apache License/), assert.match(lic, /Version 2\.0/);
  else { assert.match(lic, /Copyright/, id); assert.match(lic, /SIL OPEN FONT LICENSE/i, id); }
  const rfns = id === 'typewriter' ? [] : reservedNames(lic);
  rfnSeen[id] = rfns;
  const recs = nameRecords(bin);
  const family = looks.faces[id], ps = family.replace(/ /g, '') + '-Regular';
  for (const r of recs.filter(r => [1, 4, 6, 16, 17].includes(r.nameID))) {
    assert.ok(r.text.startsWith('TPL'), `${id} name ${r.nameID}: ${r.text}`);
  }
  // Typographic names (16/17) are dropped: 1/2 already are the family/style, and a stale 16 would keep the original name.
  assert.ok(!recs.some(r => r.nameID === 16 || r.nameID === 17), id + ' has no name 16/17');
  const byId = n => recs.filter(r => r.nameID === n && r.platform === 3).map(r => r.text);
  assert.deepEqual(byId(1), [family]); assert.deepEqual(byId(4), [family]); assert.deepEqual(byId(6), [ps]);
  for (const r of recs) for (const rfn of rfns)
    assert.ok(!r.text.toLowerCase().includes(rfn.toLowerCase()), `${id} name ${r.nameID} carries Reserved Font Name "${rfn}": ${r.text}`);
}
assert.deepEqual(rfnSeen.didone.sort(), ['Abril', 'Abril Fatface']); // the parser really finds the clause
assert.deepEqual(rfnSeen.slab, ['Alfa Slab']);
assert.ok(total <= 120 * 1024, 'total b64 ' + total);

assert.equal(looks.looks.length, 8);
assert.deepEqual(looks.looks.map(l => l.id), ['grey-serif', 'red-condensed', 'white-black', 'outline-serif', 'blue-black', 'slab-cream', 'didone-lower', 'type-grey']);
for (const l of looks.looks) {
  assert.ok(looks.faces[l.face], l.id + ' face');
  assert.match(l.fg, /^#[0-9a-f]{6}$/); assert.match(l.bg, /^#[0-9a-f]{6}$/);
  assert.ok(['upper', 'lower', 'any'].includes(l.case), l.id + ' case');
  for (const c of CHARS) { const a = looks.advance[l.face][c]; assert.ok(Number.isFinite(a) && a > 0, `${l.face} advance for "${c}"`); }
}
for (const id of IDS) assert.equal(Object.keys(looks.advance[id]).length, CHARS.length, id + ' advance size');
assert.equal(looks.looks.filter(l => l.outline).length, 1);
console.log(JSON.stringify({ fonts: 'ok', faces: IDS.length, looks: looks.looks.length, b64Bytes: total }));
