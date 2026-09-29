// plugins/summer-trip/tests/fonts.test.cjs
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets', 'fonts');
const p = JSON.parse(fs.readFileSync(path.join(dir, 'presets.json'), 'utf8'));
assert.deepEqual(p.presets.map(x => x.id), ['summer', 'poster', 'postcard']);
const ROLES = ['line1', 'season', 'label', 'labelItalic', 'place', 'placePrefix'];
const b64Of = f => fs.readFileSync(path.join(dir, f), 'utf8').replace(/\s+/g, '');

// Every declared font: WOFF2, an "ST " family, a per-family OFL.txt with its copyright notice.
for (const [file, font] of Object.entries(p.fonts)) {
  assert.ok(font.family.startsWith('ST '), file + ' family prefix');
  const bin = Buffer.from(b64Of(file), 'base64');
  assert.equal(bin.subarray(0, 4).toString('latin1'), 'wOF2', file + ' is WOFF2');
  assert.ok(b64Of(file).length < 40000, file + ' subset too large');
  const lic = path.join(dir, 'licenses', font.license);
  assert.ok(fs.existsSync(lic), 'missing ' + lic);
  const text = fs.readFileSync(lic, 'utf8');
  assert.match(text, /Copyright/, lic);
  assert.match(text, /SIL Open Font License/, lic);
}
// Nothing unlisted ships in the fonts folder.
for (const f of fs.readdirSync(dir)) if (f.endsWith('.b64')) assert.ok(p.fonts[f], 'unlisted font file ' + f);

// Each preset lists exactly the fonts its roles use, and a build embeds only those.
const tsxBytes = ['title-graphic.tsx', 'labels-graphic.tsx'].reduce((a, f) => a + fs.statSync(path.join(root, 'assets', f)).size, 0);
const sizes = {};
for (const preset of p.presets) {
  for (const r of ROLES) assert.ok(preset.roles[r] && p.fonts[preset.roles[r].file], preset.id + ' role ' + r);
  const used = [...new Set(ROLES.map(r => preset.roles[r].file))].sort();
  assert.deepEqual([...preset.fonts].sort(), used, preset.id + ' lists only (and all) the fonts it uses');
  // Payload: the preset's base64 fonts (both graphics together, a worst case) + both TSX sources stay well under the
  // ~260 KB run_script payload.
  const fontBytes = preset.fonts.reduce((a, f) => a + b64Of(f).length, 0);
  sizes[preset.id] = { fonts: fontBytes, tsx: tsxBytes, total: fontBytes + tsxBytes };
  assert.ok(fontBytes + tsxBytes <= 180000, preset.id + ' payload ' + (fontBytes + tsxBytes));
  for (const k of ['line1', 'season', 'labels', 'place']) assert.match(preset.colors[k], /^#[0-9A-F]{6}$/i, preset.id + ' color ' + k);
}
assert.equal(p.presets.find(x => x.id === 'poster').roles.season.file, 'anton.woff2.b64');
assert.ok(p.presets.find(x => x.id === 'poster').roles.season.fillWidth >= 0.85, 'Poster season fills ~90% of the width');
assert.equal(p.presets.find(x => x.id === 'postcard').roles.line1.file, 'instrument-serif-italic.woff2.b64');

// Reserved Font Names from an OFL.txt (same rule as dev/rename-font.py).
function reservedFontNames(text) {
  const names = [];
  const re = /with\s+Reserved\s+Font\s+Names?\s+(.+?)(?:\.\s|\.$|$)/gim;
  let m;
  while ((m = re.exec(text))) {
    const quoted = [...m[1].matchAll(/["“'](.+?)["”']/g)].map(q => q[1].trim());
    if (quoted.length) names.push(...quoted); else names.push(m[1].trim().replace(/\.$/, ''));
  }
  return names.filter(Boolean);
}
// The parser finds RFNs in the usual notations, so "none" for the shipped families is a verified negative.
assert.deepEqual(reservedFontNames('Copyright 2017 The Playfair Display Project Authors (https://x), with Reserved Font Name "Playfair Display".'), ['Playfair Display']);
assert.deepEqual(reservedFontNames('Copyright (c) 2011, TypeTogether (www.type-together.com),\nwith Reserved Font Names "Abril" and "Abril Fatface"'), ['Abril', 'Abril Fatface']);
assert.deepEqual(reservedFontNames("Copyright 2014 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'. All Rights Reserved."), ['Source']);
assert.deepEqual(reservedFontNames('with Reserved Font Name Kaushan Script.'), ['Kaushan Script']);

// Minimal WOFF2 reader: the decompressed table stream and the table directory.
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
// Every name record (all platforms) of a WOFF2 font.
function nameRecords(bin) {
  const { data, tables } = woff2Tables(bin);
  const t = tables.find(x => x.tag === 'name');
  const name = data.subarray(t.offset, t.offset + t.length);
  const count = name.readUInt16BE(2), strOff = name.readUInt16BE(4), out = [];
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12, platform = name.readUInt16BE(r), nameID = name.readUInt16BE(r + 6);
    const len = name.readUInt16BE(r + 8), at = strOff + name.readUInt16BE(r + 10);
    // Copy before swap16: it swaps in place and records may share bytes.
    const raw = Buffer.from(name.subarray(at, at + len));
    const text = platform === 1 ? raw.toString('latin1') : raw.swap16().toString('utf16le');
    out.push({ platform, nameID, text });
  }
  return out;
}
// Subsets are OFL Modified Versions: renamed to "ST ..." and no name record may keep a Reserved Font Name.
const rfnReport = {};
for (const [file, font] of Object.entries(p.fonts)) {
  const recs = nameRecords(Buffer.from(b64Of(file), 'base64'));
  const win = id => recs.filter(r => r.platform === 3 && r.nameID === id).map(r => r.text);
  assert.deepEqual(win(1), [font.family], file + ' name ID 1');
  assert.deepEqual(win(4), [font.family], file + ' name ID 4');
  assert.deepEqual(win(6), [font.family.replace(/ /g, '')], file + ' name ID 6');
  assert.deepEqual(win(16), [font.family], file + ' name ID 16');
  assert.equal(win(17).length, 1, file + ' name ID 17');
  for (const id of [1, 4, 6, 16, 17]) assert.equal(recs.filter(r => r.nameID === id && r.platform !== 3).length, 0, file + ' no other-platform copy of ID ' + id);
  const rfns = reservedFontNames(fs.readFileSync(path.join(dir, 'licenses', font.license), 'utf8'));
  rfnReport[font.license] = rfns;
  for (const r of recs) for (const rfn of rfns) assert.ok(!r.text.toLowerCase().includes(rfn.toLowerCase()), `${file} name ID ${r.nameID} keeps RFN "${rfn}"`);
}
console.log(JSON.stringify({ fonts: 'ok', files: Object.keys(p.fonts).length, payloadBytes: sizes, reservedFontNames: rfnReport }));
