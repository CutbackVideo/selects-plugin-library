// plugins/summer-trip/tests/title.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const titleSrc = fs.readFileSync(path.join(root, 'assets', 'title-graphic.tsx'), 'utf8');
const labelsSrc = fs.readFileSync(path.join(root, 'assets', 'labels-graphic.tsx'), 'utf8');
const defsSrc = fs.readFileSync(path.join(root, 'graphics-defs.js'), 'utf8');
const block = (src, name) => {
  const a = src.indexOf(`// ${name}:start`), b = src.indexOf(`// ${name}:end`);
  assert.ok(a >= 0 && b > a, name + ' block present');
  return src.slice(a, b);
};
const load = (code, names) => {
  const box = {}; vm.createContext(box);
  vm.runInContext(code + `;globalThis.X={${names.join(',')}};`, box);
  return box.X;
};
const plain = v => JSON.parse(JSON.stringify(v));

// ---- Typing schedule (30 fps, 120 BPM: beat = 0.5 s = 15 frames) ----
const T = load(block(titleSrc, 'st-title-state'), ['stEventFrame', 'stWords', 'stVisibleWords', 'stSeasonChars', 'stTitleState', 'stLineParts', 'stFitSize']);
const beat = 0.5;
const p = { line1: 'that one trip in', season: 'SUMMER', wordTimes: [0, 1, 2, 3].map(b => b * beat), seasonPartTime: 4 * beat, seasonFullTime: 5 * beat, seasonPartLength: 3, labelsTime: 5 * beat };
const at = f => plain(T.stTitleState(f, 30, p));
assert.deepEqual(at(0), { words: 1, seasonChars: 0, labels: false });
assert.deepEqual(at(14), { words: 1, seasonChars: 0, labels: false });
assert.deepEqual(at(15), { words: 2, seasonChars: 0, labels: false });
assert.deepEqual(at(44), { words: 3, seasonChars: 0, labels: false });
assert.deepEqual(at(45), { words: 4, seasonChars: 0, labels: false });
assert.deepEqual(at(59), { words: 4, seasonChars: 0, labels: false });
assert.deepEqual(at(60), { words: 4, seasonChars: 3, labels: false });
assert.deepEqual(at(74), { words: 4, seasonChars: 3, labels: false });
assert.deepEqual(at(75), { words: 4, seasonChars: 6, labels: true });
assert.deepEqual(at(239), { words: 4, seasonChars: 6, labels: true });
// Frame -> seconds -> frame round-trips at non-integer rates.
for (const fps of [23.976, 25, 29.97, 30, 60]) for (const f of [0, 1, 14, 45, 75, 119]) assert.equal(T.stEventFrame(f / fps, fps), f, fps + ' ' + f);
assert.equal(T.stEventFrame(undefined, 30), Infinity, 'missing time never shows');
// 5 words with 4 times: the 5th shares the last time.
assert.equal(T.stVisibleWords(45, 30, [0, 0.5, 1, 1.5], 5), 5);
assert.equal(T.stVisibleWords(44, 30, [0, 0.5, 1, 1.5], 5), 3);
// 6 words on 8ths.
assert.equal(T.stVisibleWords(38, 30, [0, 0.25, 0.5, 0.75, 1, 1.25], 6), 6);
assert.equal(T.stVisibleWords(37, 30, [0, 0.25, 0.5, 0.75, 1, 1.25], 6), 5);
// Season part rules: 0 or >= length -> whole word at the part time.
assert.equal(T.stSeasonChars(60, 30, 4, 2, 2.5, 0), 4);
assert.equal(T.stSeasonChars(60, 30, 3, 2, 2.5, 3), 3);
assert.equal(T.stSeasonChars(60, 30, 6, 2, 2.5, 3), 3);
assert.equal(T.stSeasonChars(59, 30, 6, 2, 2.5, 3), 0);
assert.equal(T.stSeasonChars(75, 30, 0, 2, 2.5, 3), 0);
// Empty line 1 / season.
assert.deepEqual(plain(T.stTitleState(100, 30, { ...p, line1: '', season: '' })), { words: 0, seasonChars: 0, labels: true });
assert.deepEqual(plain(T.stWords('  that   one\ttrip ')), ['that', 'one', 'trip']);
// Left anchoring: the hidden tail keeps the final width (shown head + hidden tail = the final line).
assert.deepEqual(plain(T.stLineParts('that one trip in', 2, 'word')), { shown: 'that one ', hidden: 'trip in' });
assert.deepEqual(plain(T.stLineParts('that one trip in', 0, 'word')), { shown: '', hidden: 'that one trip in' });
assert.deepEqual(plain(T.stLineParts('that one trip in', 4, 'word')), { shown: 'that one trip in', hidden: '' });
assert.deepEqual(plain(T.stLineParts('SUMMER', 3, 'char')), { shown: 'SUM', hidden: 'MER' });
assert.deepEqual(plain(T.stLineParts('SUMMER', 6, 'char')), { shown: 'SUMMER', hidden: '' });
for (let n = 0; n <= 4; n++) { const r = T.stLineParts('that one trip in', n, 'word'); assert.equal(r.shown + r.hidden, 'that one trip in'); }
// Fit.
assert.equal(T.stFitSize(100, 800, 1690), 100);
assert.ok(Math.abs(T.stFitSize(272, 2000, 1690) - 272 * 1690 / 2000) < 1e-9);
assert.equal(T.stFitSize(100, 0, 1690), 100);

// ---- Labels ----
const L = load(block(labelsSrc, 'st-labels-state'), ['stLabelsState', 'stPlaceLayout', 'stFitSize']);
const lp = { place: 'Italy', placeSeconds: 1, topMain: 'SUMMER', topItalic: 'VLOG', creditName: 'Textname' };
assert.deepEqual(plain(L.stLabelsState(0, 30, lp)), { place: true, top: true, credit: true });
assert.deepEqual(plain(L.stLabelsState(29, 30, lp)), { place: true, top: true, credit: true });
assert.deepEqual(plain(L.stLabelsState(30, 30, lp)), { place: false, top: true, credit: true });
assert.equal(L.stLabelsState(0, 30, { ...lp, place: '   ' }).place, false, 'empty place: no place title');
assert.equal(L.stLabelsState(0, 30, { ...lp, creditName: '' }).credit, false, 'empty credit name hides the credit');
assert.equal(L.stLabelsState(0, 30, { ...lp, topMain: '', topItalic: '' }).top, false);
// Place block: keeps the centre when it fits, slides inside the 6% margins, shrinks only when wider than the box.
const W = 1920, m = 0.06;
assert.deepEqual(plain(L.stPlaceLayout(1392, 532, W, m)), { cx: 1392, scale: 1 });
const slid = L.stPlaceLayout(1392, 1000, W, m);
assert.equal(slid.scale, 1);
assert.equal(slid.cx, W * (1 - m) - 500, 'slides left to the right margin');
const shrunk = L.stPlaceLayout(1392, 2400, W, m);
assert.ok(Math.abs(shrunk.scale - W * (1 - 2 * m) / 2400) < 1e-9);
assert.ok(Math.abs(shrunk.cx - W / 2) < 1e-9, 'a full-width block is centred');

// ---- Parameter builders and Adjust definitions ----
const D = load(block(defsSrc, 'st-graphics'), ['stTitleParameters', 'stLabelsParameters', 'stPresetFontFiles', 'stEditable', 'ST_TITLE_EDITABLE', 'ST_LABELS_EDITABLE', 'ST_TITLE_GRAPHIC_LABEL', 'ST_LABELS_GRAPHIC_LABEL']);
assert.equal(D.ST_TITLE_GRAPHIC_LABEL, 'Summer Trip title');
assert.equal(D.ST_LABELS_GRAPHIC_LABEL, 'Summer Trip labels');
const presets = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'fonts', 'presets.json'), 'utf8'));
const TYPES = new Set(['text', 'number', 'color', 'boolean', 'select']);
for (const preset of presets.presets) {
  const files = D.stPresetFontFiles(presets, preset.id);
  assert.deepEqual(plain(files), preset.fonts);
  const fontsB64 = Object.fromEntries(files.map(f => [f, 'QUJD']));
  const common = { presets, presetId: preset.id, fontsB64, topMain: 'SUMMER', topItalic: 'VLOG', creditPrefix: 'By', creditName: '' };
  const tp = plain(D.stTitleParameters({ ...common, line1: 'that one trip in', season: 'SUMMER', wordTimes: [0, 0.5, 1, 1.5], seasonPartTime: 2, seasonFullTime: 2.5, seasonPartLength: 3, labelsTime: 2.5 }));
  const lpar = plain(D.stLabelsParameters({ ...common, placePrefix: 'in', place: 'Italy', placeSeconds: 1 }));
  // Contract keys (spec contracts.md, flat form).
  for (const k of ['preset', 'line1', 'season', 'wordTimes', 'seasonPartTime', 'seasonFullTime', 'seasonPartLength', 'labelsTime', 'topMain', 'topItalic', 'creditPrefix', 'creditName', 'fonts', 'faces']) assert.ok(k in tp, 'title ' + k);
  for (const k of ['preset', 'topMain', 'topItalic', 'creditPrefix', 'creditName', 'placePrefix', 'place', 'placeSeconds', 'fonts', 'faces']) assert.ok(k in lpar, 'labels ' + k);
  assert.equal(tp.preset, preset.id);
  // Only this preset's fonts are embedded, keyed by family.
  const titleFamilies = new Set(['line1', 'season', 'label', 'labelItalic'].map(r => presets.fonts[preset.roles[r].file].family));
  assert.deepEqual(Object.keys(tp.fonts).sort(), [...titleFamilies].sort(), preset.id + ' title fonts');
  const labelFamilies = new Set(['label', 'labelItalic', 'place', 'placePrefix'].map(r => presets.fonts[preset.roles[r].file].family));
  assert.deepEqual(Object.keys(lpar.fonts).sort(), [...labelFamilies].sort(), preset.id + ' labels fonts');
  for (const [defs, params, src, name] of [[D.ST_TITLE_EDITABLE, tp, titleSrc, 'title'], [D.ST_LABELS_EDITABLE, lpar, labelsSrc, 'labels']]) {
    const ed = plain(D.stEditable(defs, params));
    assert.equal(new Set(ed.map(d => d.key)).size, ed.length, name + ' unique keys');
    for (const d of ed) {
      assert.ok(TYPES.has(d.type), d.key);
      assert.ok(d.key in params, `${name} editable ${d.key} has a parameter`);
      assert.ok(src.includes('data.' + d.key), `${name} TSX reads data.${d.key}`);
      assert.equal(d.defaultValue, params[d.key], d.key + ' default');
      if (d.type === 'text') assert.equal(typeof d.defaultValue, 'string', d.key);
      if (d.type === 'color') assert.match(d.defaultValue, /^#[0-9A-F]{6}$/i, d.key);
      if (d.type === 'number') {
        assert.equal(typeof d.defaultValue, 'number', d.key);
        assert.ok(d.min <= d.defaultValue && d.defaultValue <= d.max && d.step > 0, `${name} ${d.key} ${d.min} <= ${d.defaultValue} <= ${d.max}`);
      }
    }
  }
  // Every scalar parameter the builders emit is read by the matching TSX.
  for (const k of Object.keys(tp)) if (!['preset'].includes(k)) assert.ok(titleSrc.includes('data.' + k) || titleSrc.includes(k + ':') || k === 'wordTimes' || k.startsWith('season') || k === 'labelsTime', 'title reads ' + k);
  for (const k of Object.keys(lpar)) if (!['preset', 'place', 'placeSeconds', 'topMain', 'topItalic', 'creditName'].includes(k)) assert.ok(labelsSrc.includes('data.' + k), 'labels reads ' + k);
}
// Summer preset defaults (spec 4.3 / reference measurements).
const summer = presets.presets.find(x => x.id === 'summer');
assert.equal(summer.colors.season, '#FDE070');
assert.equal(summer.colors.place, '#F8DC70');
assert.equal(presets.presets[0].id, 'summer', 'Summer is the default (first) preset');

// ---- Component contract ----
for (const src of [titleSrc, labelsSrc]) {
  assert.ok(src.includes('delayRender') && src.includes('continueRender'), 'waits for fonts');
  assert.ok(src.includes('measureText'), 'measures real glyph advances');
  assert.ok(src.includes('@font-face') && src.includes('data:font/woff2;base64,'), 'embeds base64 faces');
  assert.ok(src.includes('export default function'), 'default export');
  assert.ok(!/opacity|interpolate|spring/.test(src), 'hard appears only (no fades)');
}
assert.ok(titleSrc.includes('visibility: "hidden"'), 'hidden tails keep the final width');
// TSX syntax check with the TypeScript compiler when it is available (CI has none; set TS_PATH locally).
let ts = null;
try { ts = require(process.env.TS_PATH || 'typescript'); } catch (_e) { ts = null; }
if (ts) {
  for (const [name, src] of [['title', titleSrc], ['labels', labelsSrc]]) {
    const r = ts.transpileModule(src, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2019 } });
    assert.equal(r.diagnostics.length, 0, name + ': ' + r.diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; '));
  }
}
// ---- Korean titles (st-hangul, the same block in both graphics; kit i18n policy) ----
const hangulTitle = block(titleSrc, 'st-hangul'), hangulLabels = block(labelsSrc, 'st-hangul');
assert.equal(hangulTitle, hangulLabels, 'st-hangul is identical in title-graphic.tsx and labels-graphic.tsx');
const K = load(hangulTitle, ['stHasHangul', 'stEstimateEm', 'stFontStack', 'stFaceFor']);
const seoul = '\uc11c\uc6b8', yeoreum = '\uc5ec\ub984';
assert.ok(K.stHasHangul(seoul) && K.stHasHangul('in ' + seoul) && !K.stHasHangul('SUMMER') && !K.stHasHangul(''));
// Before a canvas can measure: wide characters 1 em, Latin 0.6 em.
assert.equal(K.stEstimateEm(seoul), 2);
assert.ok(Math.abs(K.stEstimateEm('ab' + seoul) - 3.2) < 1e-9);
assert.ok(Math.abs(K.stEstimateEm('\u3042\u4e2d') - 2) < 1e-9, 'kana and CJK count as wide too');
// Font stacks end with the role's Korean system face before the generic family.
assert.equal(K.stFontStack('ST Gloock', 'AppleMyungjo'), '"ST Gloock", "Helvetica Neue", Arial, "AppleMyungjo", serif');
assert.equal(K.stFontStack('ST Poppins Bold', 'Apple SD Gothic Neo'), '"ST Poppins Bold", "Helvetica Neue", Arial, "Apple SD Gothic Neo", sans-serif');
assert.equal(K.stFontStack('', undefined), '"Helvetica Neue", Arial, "Apple SD Gothic Neo", sans-serif', 'no koFamily: the sans face');
// A line with Hangul: no case change, no tracking, no squeeze; Latin lines keep the style.
const styled = { css: 'x', upper: true, lower: false, tracking: -0.04, scaleX: 0.8, fillWidth: 0.9 };
assert.deepEqual(plain(K.stFaceFor(styled, yeoreum)), { css: 'x', upper: false, lower: false, tracking: 0, scaleX: 1, fillWidth: 0.9 });
assert.deepEqual(plain(K.stFaceFor(styled, 'SUMMER')), plain(styled));
for (const [name, src] of [['title', titleSrc], ['labels', labelsSrc]]) {
  assert.ok(src.includes('css: stFontStack(family, f.koFamily)'), name + ': faces use the stack with the Korean face');
  assert.ok(src.includes('let w = stEstimateEm(text) * px;') && !/n \* px \* 0\.6/.test(src), name + ': wide-aware width estimate');
  assert.ok(/wordBreak: "keep-all"/.test(src), name + ': keep-all');
  assert.ok(!/[\uac00-\ud7a3]/.test(src), name + ': no literal Hangul');
}
assert.ok(titleSrc.includes('stFaceFor(stFace(faces, "line1"), line1)') && titleSrc.includes('stFaceFor(stFace(faces, "season"), seasonText)'), 'title: line 1 and season faces follow their text');
assert.ok(titleSrc.includes('const creditUpper = data.creditUppercase !== false && !stHasHangul(creditText);'), 'title: a Hangul credit is not uppercased');
assert.ok(labelsSrc.includes('const upper = data.creditUppercase === true && !stHasHangul(creditText);'), 'labels: a Hangul credit is not uppercased');
assert.ok(labelsSrc.includes('stFaceFor(stFace(faces, "place"), placeText + prefixText)'), 'labels: a Hangul place drops caps and the 0.8 squeeze');
// Every font of presets.json names its Korean face by role: serif faces AppleMyungjo, the rest Apple SD Gothic Neo.
const presetsK = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'fonts', 'presets.json'), 'utf8'));
const serif = ['gloock.woff2.b64', 'instrument-serif-italic.woff2.b64'];
for (const [file, font] of Object.entries(presetsK.fonts)) assert.equal(font.koFamily, serif.includes(file) ? 'AppleMyungjo' : 'Apple SD Gothic Neo', file + ' koFamily');
// graphics-defs passes koFamily into every face.
const GK = load(block(defsSrc, 'st-graphics'), ['stFacesFor', 'stPreset']);
const facesK = plain(GK.stFacesFor(presetsK, GK.stPreset(presetsK, 'postcard'), ['line1', 'season', 'label', 'place']).faces);
assert.deepEqual(Object.values(facesK).map(f => f.koFamily), ['AppleMyungjo', 'AppleMyungjo', 'Apple SD Gothic Neo', 'AppleMyungjo']);
console.log(JSON.stringify({ title: 'ok', tsxSyntax: ts ? 'checked' : 'skipped (no typescript)' }));
