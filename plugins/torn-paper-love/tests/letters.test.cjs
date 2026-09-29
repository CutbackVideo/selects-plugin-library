// plugins/torn-paper-love/tests/letters.test.cjs
// Pure helpers of the "Ransom letters" Motion Graphic, extracted from the TSX between markers.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'ransom-letters.tsx'), 'utf8');
const a = src.indexOf('// tpl-letters:start'), b = src.indexOf('// tpl-letters:end');
assert.ok(a >= 0 && b > a, 'tpl-letters markers present');
const block = src.slice(a, b);
const load = (extra) => {
  const box = Object.assign({}, extra || {}); vm.createContext(box);
  vm.runInContext(block + ';globalThis.L={tplGraphemes,tplAssignLooks,tplLooksAt,tplLookAt,tplLayout,tplLetterEm,tplSupported,tplTickIndex,tplApplyAccent,TPL_FALLBACK_EM,TPL_HEART};', box);
  return box.L;
};
const L = load();
const plain = (v) => JSON.parse(JSON.stringify(v));
// Values from the vm realm have foreign prototypes: compare as plain JSON.
const eq = (x, y, m) => assert.deepEqual(plain(x), plain(y), m);
const neq = (x, y, m) => assert.notDeepEqual(plain(x), plain(y), m);

// Fixture in the shape of assets/fonts/looks.json (made-up advances).
const FACES = ['didone', 'condensed', 'serif', 'slab', 'black', 'typewriter'];
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?&'-";
const advance = {};
for (const f of FACES) { advance[f] = {}; for (const c of CHARS) advance[f][c] = /[MWmw]/.test(c) ? 700 : 600; }
const looks = [
  { id: 'grey-serif', face: 'serif', fg: '#111111', bg: '#bdb7ae', case: 'upper' },
  { id: 'red-condensed', face: 'condensed', fg: '#d0201a', bg: '#ffffff', case: 'upper' },
  { id: 'white-black', face: 'black', fg: '#ffffff', bg: '#111111', case: 'upper' },
  { id: 'outline-serif', face: 'serif', fg: '#111111', bg: '#ffffff', case: 'upper', outline: true },
  { id: 'blue-black', face: 'black', fg: '#3a78c9', bg: '#ffffff', case: 'upper' },
  { id: 'slab-cream', face: 'slab', fg: '#111111', bg: '#efe6d2', case: 'upper' },
  { id: 'didone-lower', face: 'didone', fg: '#111111', bg: '#ffffff', case: 'lower' },
  { id: 'type-grey', face: 'typewriter', fg: '#222222', bg: '#d9d4ca', case: 'any' },
];
const byId = Object.fromEntries(looks.map((l) => [l.id, l]));

// ---- Graphemes (spec 15.9) ----
const g = (t) => plain(L.tplGraphemes(t));
eq(g('MY'), ['M', 'Y']);
eq(g('  love \n'), ['l', 'o', 'v', 'e'], 'trimmed');
eq(g('   '), [], 'whitespace only is empty');
eq(g(''), []);
eq(g(null), [], 'non-string is empty');
eq(g('ABCDEFGHIJ'), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], '9+ cut to 8');
eq(g('A \t B'), ['A', ' ', 'B'], 'inner whitespace collapses to one gap');
const family = '\u{1F469}\u200D\u2764\uFE0F\u200D\u{1F468}';
eq(g('I' + family + 'U'), ['I', family, 'U'], 'ZWJ emoji is one grapheme');
eq(g('E\u0301T\u00C9'), ['E\u0301', 'T', '\u00C9'], 'combining accent stays with its base');
eq(g('\u{1F600}'.repeat(10)).length, 8, 'emoji count toward the 8 cap');
// Fallback without Intl.Segmenter: code points (Array.from), still trimmed and capped.
const L2 = load({ Intl: undefined });
eq(plain(L2.tplGraphemes(' AB\u{1F600} ')), ['A', 'B', '\u{1F600}'], 'Array.from fallback keeps surrogate pairs');
assert.equal(L2.tplGraphemes('ABCDEFGHIJK').length, 8);

// ---- Supported set ----
for (const c of CHARS) assert.ok(L.tplSupported(c), 'supported ' + c);
assert.ok(L.tplSupported('\u2665'), 'heart supported (SVG chip)');
for (const c of ['\u00C9', 'E\u0301', '\uAC00', family, '#', '@', ' ', '']) assert.ok(!L.tplSupported(c), 'unsupported ' + JSON.stringify(c));

// ---- Looks assignment ----
const letters = ['M', 'Y', 'L', 'O', 'V', 'E'];
const as1 = plain(L.tplAssignLooks(letters, 7, looks, advance));
eq(as1, plain(L.tplAssignLooks(letters, 7, looks, advance)), 'assignment deterministic');
neq(as1, plain(L.tplAssignLooks(letters, 8, looks, advance)), 'seed changes looks');
for (const set of as1) {
  assert.ok(set.length >= 2 && set.length <= 4, '2-4 looks per letter');
  assert.equal(new Set(set).size, set.length, 'distinct looks');
  for (const id of set) assert.ok(byId[id], 'known look ' + id);
  assert.ok(set.filter((id) => byId[id].case === 'lower').length <= 1, 'at most one lower-case look per letter');
}
for (let i = 1; i < as1.length; i++) assert.notEqual(as1[i][0], as1[i - 1][0], 'neighbours start with different looks');
// Over many seeds every look gets used and set sizes span 2..4.
const used = new Set(), sizes = new Set();
for (let s = 0; s < 40; s++) for (const set of L.tplAssignLooks(letters, s, looks, advance)) { sizes.add(set.length); set.forEach((id) => used.add(id)); }
eq([...sizes].sort(), [2, 3, 4]);
assert.equal(used.size, looks.length, 'all looks appear across seeds');
// Unsupported characters and gaps get no looks (fallback chip / no chip).
const mixed = plain(L.tplAssignLooks(['A', '\u00C9', ' ', '\u2665', '\uAC00'], 3, looks, advance));
assert.ok(mixed[0].length >= 2);
eq(mixed[1], []); eq(mixed[2], []); eq(mixed[4], []);
assert.ok(mixed[3].length >= 2, 'heart gets looks (drawn in the look colours)');
// A face that lacks the glyph is not offered for that letter.
const holey = JSON.parse(JSON.stringify(advance)); delete holey.serif.Q;
for (let s = 0; s < 20; s++) for (const id of L.tplAssignLooks(['Q'], s, looks, holey)[0]) assert.notEqual(byId[id].face, 'serif');
// Without an advance table every look is a candidate.
assert.ok(L.tplAssignLooks(['A'], 1, looks)[0].length >= 2);

// ---- Re-style clock ----
const assigned = L.tplAssignLooks(letters, 11, looks, advance);
const at = (t) => plain(L.tplLooksAt(t, 11, assigned));
eq(at(0), plain(assigned.map((s) => s[0])), 'tick 0 = first look of each letter');
for (let i = 0; i < letters.length; i++) assert.equal(L.tplLookAt(i, 9, 11, assigned), at(9)[i], 'lookAt matches looksAt');
eq(at(23), at(23), 'deterministic');
let changed = 0, total = 0, sameTicks = 0;
const everChanged = new Set();
for (let t = 1; t <= 50; t++) {
  const prev = at(t - 1), cur = at(t);
  let c = 0;
  for (let i = 0; i < letters.length; i++) {
    assert.ok(assigned[i].includes(cur[i]), 'look from the letter set');
    if (cur[i] !== prev[i]) { c++; everChanged.add(i); }
  }
  assert.ok(c >= 1, 'something changes every tick');
  assert.ok(c < letters.length, 'at least one letter keeps its look every tick');
  changed += c; total += letters.length;
  if (c === 0) sameTicks++;
}
const share = changed / total;
assert.ok(share >= 0.25 && share <= 0.55, 'subset share ~40% (got ' + share + ')');
assert.equal(everChanged.size, letters.length, 'every letter re-styles at some point');
// Two letters: one changes per tick, one persists.
const two = L.tplAssignLooks(['M', 'Y'], 5, looks, advance);
for (let t = 1; t <= 20; t++) {
  const p = plain(L.tplLooksAt(t - 1, 5, two)), c = plain(L.tplLooksAt(t, 5, two));
  assert.equal((p[0] !== c[0]) + (p[1] !== c[1]), 1);
}
// Unstyled letters (fallback, gap) stay null and never count as changed.
const mixedAt = plain(L.tplLooksAt(4, 3, L.tplAssignLooks(['A', '\u00C9', ' ', 'B'], 3, looks, advance)));
assert.equal(mixedAt[1], null); assert.equal(mixedAt[2], null);
// A single letter stays put.
const one = L.tplAssignLooks(['A'], 2, looks, advance);
for (let t = 0; t < 10; t++) assert.equal(L.tplLookAt(0, t, 2, one), one[0][0]);

// ---- Tick index (spec 15.2: ticks relative to the graphic's frame 0) ----
const ticks = [0, 11, 21, 32];
assert.equal(L.tplTickIndex(-1, ticks, true), 0);
assert.equal(L.tplTickIndex(0, ticks, true), 1, 'a tick at frame 0 counts at frame 0');
assert.equal(L.tplTickIndex(10, ticks, true), 1);
assert.equal(L.tplTickIndex(11, ticks, true), 2, 'restyle lands on the tick frame');
assert.equal(L.tplTickIndex(40, ticks, true), 4);
assert.equal(L.tplTickIndex(40, [32, 11, 21], true), 3, 'unsorted ticks');
assert.equal(L.tplTickIndex(40, ticks, false), 0, 'restyle off -> always tick 0');
assert.equal(L.tplTickIndex(40, null, true), 0, 'no ticks -> tick 0');
assert.equal(L.tplTickIndex(40, [11, 'x', NaN, 21], true), 2, 'non-numbers ignored');

// ---- Accent ----
assert.equal(L.tplApplyAccent(byId['red-condensed'], '#ff00aa').fg, '#ff00aa');
assert.equal(L.tplApplyAccent({ fg: '#111111', bg: '#D0201A' }, '#00ff00').bg, '#00ff00', 'case-insensitive');
assert.equal(L.tplApplyAccent(byId['blue-black'], '#ff00aa').fg, '#3a78c9', 'other colours untouched');
assert.equal(L.tplApplyAccent(byId['red-condensed'], 'nonsense').fg, '#d0201a', 'invalid accent ignored');
assert.equal(L.tplApplyAccent(byId['red-condensed'], '#0a0').fg, '#0a0', 'short hex ok');
assert.equal(byId['red-condensed'].fg, '#d0201a', 'look not mutated');

// ---- Letter width ----
assert.equal(L.tplLetterEm('M', null, advance), 0.7, 'widest across faces');
assert.equal(L.tplLetterEm('A', ['serif', 'black'], advance), 0.6);
assert.equal(L.tplLetterEm('m', ['didone'], advance), 0.7, 'upper and lower both measured');
assert.equal(L.tplLetterEm('\u00C9', null, advance), L.TPL_FALLBACK_EM, 'unsupported uses fallback width');
assert.ok(L.tplLetterEm('\uAC00', null, advance) >= L.TPL_FALLBACK_EM, 'wide scripts at least the fallback width');
assert.equal(L.tplLetterEm('\u2665', null, advance), L.TPL_HEART.em, 'heart chip width');
assert.ok(L.tplLetterEm(' ', null, advance) > 0 && L.tplLetterEm(' ', null, advance) < 0.5, 'gap width');
assert.equal(L.tplLetterEm('A', null, {}), 0.6, 'missing table -> 0.6 em');

// ---- Layout (spec 6 + 15.9) ----
const W = 1440, H = 1080;
const ref = L.tplLayout([['M', 'Y'], ['L', 'O', 'V', 'E']], 6.7, 50, advance, W, H, 7);
assert.equal(ref.fits, true);
assert.equal(ref.chips.length, 6);
const w1 = ref.chips.filter((c) => c.word === 0), w2 = ref.chips.filter((c) => c.word === 1);
const left = Math.min(...w1.map((c) => c.x)), right = Math.max(...w2.map((c) => c.x + c.w));
assert.ok(Math.abs(left - 0.05 * W) <= 0.01 * W, 'MY starts at 5% W (got ' + left + ')');
assert.ok(Math.abs(right - 0.94 * W) <= 0.01 * W, 'LOVE ends at 94% W (got ' + right + ')');
assert.ok(Math.max(...w1.map((c) => c.x + c.w)) < 0.37 * W, 'MY stays in the left band');
assert.ok(Math.min(...w2.map((c) => c.x)) > 0.62 * W - 1, 'LOVE stays in the right band');
for (const c of ref.chips) {
  assert.ok(Math.abs(c.glyph - 0.067 * H) < 1e-6, 'cap height 6.7% H at default size');
  assert.ok(c.pad >= 0.08 * c.glyph - 1e-9 && c.pad <= 0.14 * c.glyph + 1e-9, 'padding 8-14%');
  assert.ok(Math.abs(c.rot) <= 4, 'rotation within 4 deg');
  assert.ok(Math.abs(c.jitter) <= 0.04 * c.glyph + 1e-9, 'baseline jitter within 4%');
  assert.ok(Math.abs(c.y + c.h / 2 - 0.5 * H) < 1e-6, 'vertically centred on y');
  assert.equal(c.kind, 'glyph');
}
for (let i = 1; i < w2.length; i++) assert.ok(w2[i].x >= w2[i - 1].x + w2[i - 1].w - 1e-6, 'left to right, no overlap of slots');
assert.ok(w2[1].x - (w2[0].x + w2[0].w) < 0.1 * w2[0].glyph, 'chips close together');
eq(plain(ref), plain(L.tplLayout([['M', 'Y'], ['L', 'O', 'V', 'E']], 6.7, 50, advance, W, H, 7)), 'layout deterministic');
const reseeded = L.tplLayout([['M', 'Y'], ['L', 'O', 'V', 'E']], 6.7, 50, advance, W, H, 8);
eq(reseeded.chips.map((c) => c.x), ref.chips.map((c) => c.x), 'slot positions do not depend on the seed');
neq(reseeded.chips.map((c) => c.rot), ref.chips.map((c) => c.rot), 'rotation is seeded');
// Strings are accepted and graphemised.
eq(plain(L.tplLayout(['MY', 'LOVE'], 6.7, 50, advance, W, H, 7)), plain(ref));
// Vertical position and size.
const low = L.tplLayout([['M', 'Y'], ['L', 'O', 'V', 'E']], 6.7, 65, advance, W, H, 7);
for (const c of low.chips) assert.ok(Math.abs(c.y + c.h / 2 - 0.65 * H) < 1e-6);
const big = L.tplLayout([['M', 'Y'], []], 9, 50, advance, W, H, 7);
assert.ok(Math.abs(big.chips[0].glyph - 0.09 * H) < 1e-6);
// Other sequence sizes scale proportionally.
const half = L.tplLayout([['M', 'Y'], ['L', 'O', 'V', 'E']], 6.7, 50, advance, W / 2, H / 2, 7);
half.chips.forEach((c, i) => { assert.ok(Math.abs(c.x * 2 - ref.chips[i].x) < 1e-6); assert.ok(Math.abs(c.w * 2 - ref.chips[i].w) < 1e-6); });
// Long names shrink inward, never past 32% W, down to 4.5% H.
const long = L.tplLayout([['M', 'Y'], L.tplGraphemes('ELEANORS')], 6.7, 50, advance, W, H, 7);
assert.equal(long.fits, true);
const lw = long.chips.filter((c) => c.word === 1);
const span = Math.max(...lw.map((c) => c.x + c.w)) - Math.min(...lw.map((c) => c.x));
assert.ok(span <= 0.32 * W + 1e-6, 'long word within 32% W');
assert.ok(Math.abs(Math.max(...lw.map((c) => c.x + c.w)) - 0.94 * W) < 1e-6, 'still ends at 94% W');
assert.ok(lw[0].glyph < 0.067 * H && lw[0].glyph >= 0.045 * H, 'shrunk but >= 4.5% H');
assert.ok(Math.abs(long.chips[0].glyph - 0.067 * H) < 1e-6, 'the other word keeps its size');
// Too long even at the minimum -> fits:false (chips still inside the band for drawing).
const wide = L.tplLayout([['M', 'Y'], L.tplGraphemes('MWMWMWMW')], 6.7, 50, advance, W, H, 7);
assert.equal(wide.fits, false);
const ww = wide.chips.filter((c) => c.word === 1);
assert.ok(Math.max(...ww.map((c) => c.x + c.w)) - Math.min(...ww.map((c) => c.x)) <= 0.32 * W + 1e-6, 'overflowing word still kept in its band');
const allWide = L.tplLayout([['\uAC00', '\uAC00', '\uAC00', '\uAC00', '\uAC00', '\uAC00', '\uAC00', '\uAC00'], []], 6.7, 50, advance, W, H, 7);
assert.equal(allWide.fits, false, 'eight wide fallback chars do not fit');
// Unsupported characters get the fallback kind and width.
const fb = L.tplLayout([['A', '\u00C9'], ['\u2665', ' ', 'B']], 6.7, 50, advance, W, H, 7);
eq(fb.chips.map((c) => c.kind), ['glyph', 'fallback', 'heart', 'space', 'glyph']);
const fbc = fb.chips[1];
assert.ok(Math.abs(fbc.w - (L.TPL_FALLBACK_EM * fbc.fontPx + 2 * 0.14 * fbc.glyph)) < 1e-6, 'fallback slot width');
// Empty words are skipped; the other word keeps its band.
const only2 = L.tplLayout([[], ['L', 'O', 'V', 'E']], 6.7, 50, advance, W, H, 7);
assert.equal(only2.chips.length, 4);
eq(only2.chips.map((c) => c.x), w2.map((c) => c.x));
const only1 = L.tplLayout([['M', 'Y'], []], 6.7, 50, advance, W, H, 7);
eq(only1.chips.map((c) => c.x), w1.map((c) => c.x));
const none = L.tplLayout([[], []], 6.7, 50, advance, W, H, 7);
eq(plain(none), { fits: true, chips: [] });
// Indices map chips to the flat letter list (word 1 then word 2).
eq(fb.chips.map((c) => c.index), [0, 1, 2, 3, 4]);
// Function advance: widest of the letter's own looks.
const fnLayout = L.tplLayout([['M'], []], 6.7, 50, (ch) => (ch === 'M' ? 1.0 : 0.5), W, H, 7);
assert.ok(Math.abs(fnLayout.chips[0].em - 1.0) < 1e-9);

// ---- Component contract ----
for (const key of ['word1', 'word2', 'size', 'y', 'accent', 'seed', 'restyle', 'ticks', 'looks', 'advance', 'fonts']) assert.ok(src.includes('data.' + key), 'reads data.' + key);
assert.ok(/export default function RansomLetters\s*\(\s*\{\s*data\s*\}/.test(src), 'default export RansomLetters({ data })');
assert.ok(src.includes('@font-face'), 'embeds @font-face');
assert.ok(src.includes('-webkit-text-stroke') || src.includes('WebkitTextStroke'), 'outline looks use text stroke');
assert.ok(src.includes('delayRender') && src.includes('continueRender'), 'waits for fonts');
assert.ok(src.includes('useVideoConfig'), 'scales to the sequence size');
assert.ok(src.includes('<svg'), 'heart drawn as SVG');
assert.ok(!/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(src), 'no literal Hangul');
assert.ok(!src.includes('/Users/'), 'no local paths');
console.log(JSON.stringify({ letters: 'ok', share: Number(share.toFixed(3)) }));
