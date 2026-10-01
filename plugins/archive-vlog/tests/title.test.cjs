// plugins/archive-vlog/tests/title.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'title-lockup.tsx'), 'utf8');
const presets = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'fonts', 'presets.json'), 'utf8'));
const start = src.indexOf('// av-lockup:start'), end = src.indexOf('// av-lockup:end');
assert.ok(start >= 0 && end > start, 'lockup markers present');
const block = src.slice(start, end);
// The panel evaluates this block as plain JS: no imports, exports, JSX or type annotations.
assert.ok(!/^\s*(import|export)\b/m.test(block), 'block has no import/export');
assert.ok(!/<[A-Za-z]/.test(block.replace(/\/\/.*$/gm, '')), 'block has no JSX');
// (TS-only syntax would make the vm / new Function evaluation below throw.)
const box = {}; vm.createContext(box);
vm.runInContext(block + ';globalThis.L=avLockupLayout;globalThis.SP=avSparklePath;globalThis.ST=avStarPath;globalThis.B=avLockupBounds;globalThis.F=AV_FACES;', box);
// Also loadable the way the panel does it.
assert.equal(typeof new Function(block + ';return avLockupLayout;')(), 'function');

const W = 1920, H = 1080;
const preset = (id) => presets.presets.find(p => p.id === id);
const fontsFor = (id) => preset(id).fonts.map(f => ({ ...f, metrics: presets.metrics[f.family] }));
const DEFAULT = { primary: '#F7C8E6', secondary: '#FFFFFF', shadow: 0.35, size: 100, x: 49, y: 52, sparkles: true };
const lay = (id, fields, extra = {}, w = W, h = H) =>
  JSON.parse(JSON.stringify(box.L({ ...DEFAULT, preset: id, fields, fonts: fontsFor(id), ...extra }, w, h)));
const part = (items, p) => items.filter(i => i.part === p);
const one = (items, p) => { const x = part(items, p); assert.equal(x.length, 1, 'one ' + p + ' in ' + JSON.stringify(items.map(i => i.part))); return x[0]; };
const kinds = (items, k) => items.filter(i => i.kind === k);
const bounds = (items) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of items) { x0 = Math.min(x0, i.box[0]); y0 = Math.min(y0, i.box[1]); x1 = Math.max(x1, i.box[2]); y1 = Math.max(y1, i.box[3]); }
  return { x0, y0, x1, y1, w: x1 - x0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const mBig = presets.metrics['MV Instrument Serif Italic'];
const XH = mBig.xHeight / mBig.unitsPerEm, UPM = mBig.unitsPerEm;
const mSmall = presets.metrics['MV DM Serif Display'];
// Width of `t` at size 1 in the big face with its -0.05 em tracking (the layout's avTextWidth).
const avW = (t) => [...t].reduce((a, c) => a + mBig.advances[c] / UPM, 0) - 0.05 * (t.length - 1);

// --- Mini vlog (No.17) ---------------------------------------------------------------
{
  const it = lay('archive-vlog', { big: 'mini', small: 'vlog' });
  const big = one(it, 'big'), small = one(it, 'small');
  assert.deepEqual(big.font, { family: 'MV Instrument Serif Italic', style: 'italic', weight: 400 });
  // No.17 face (controller pick E', thinned after the similarity review): tracking -0.05 em, same-colour round
  // stroke 0.010 em, x-height ~90 px.
  near(big.tracking, -0.05 * big.size, 1e-9, 'tracking px'); near(big.stroke, 0.010 * big.size, 1e-9, 'stroke px');
  near(big.w, [...big.text].reduce((a, c) => a + mBig.advances[c], 0) / UPM * big.size + big.tracking * (big.text.length - 1), 1e-6, 'width = advances + tracking between letters');
  assert.ok(big.size * XH >= 85 && big.size * XH <= 95, 'x-height px ' + big.size * XH);
  // The stroke is counted in the ink box (half of it grows outward).
  near(big.box[0], big.x - big.stroke / 2, 1e-6, 'box includes stroke');
  near(big.box[2], big.x + big.w + big.stroke / 2, 1e-6, 'box includes stroke (right)');
  assert.equal(small.tracking, 0); assert.equal(small.stroke, 0);
  // "vlog" reads lighter: its drop shadow is 0.6 of the title's (opacity and blur); the big word keeps the full one.
  assert.equal(big.shade, 1); assert.equal(small.shade, 0.6);
  assert.deepEqual(small.font, { family: 'MV DM Serif Display', style: 'normal', weight: 400 });
  assert.equal(big.color, '#F7C8E6'); assert.equal(small.color, '#FFFFFF');
  // Footprint wins (controller ruling): "mini" is about 0.155 W wide at size 100, like No.17 (~290-300 px).
  assert.ok(big.w >= 0.145 * W && big.w <= 0.165 * W, 'mini advance width ' + big.w);
  near(big.w, 0.155 * W, 1, 'mini width calibrated');
  // Lockup (both lines + sparkles) centred at (0.49 W, 0.52 H); big word centred on x.
  const b = bounds(it);
  near(b.cx, 0.49 * W, 0.01 * W, 'lockup centre x'); near(b.cy, 0.52 * H, 0.01 * H, 'lockup centre y');
  near(big.x + big.w / 2, 0.49 * W, 0.01 * W, 'big centre x');
  // Small word: about 41 % of the big word's width (No.17's 43 %, 5 % smaller so it reads lighter), centred under it,
  // tight below it.
  const ratio = small.w / big.w;
  assert.ok(ratio >= 0.38 && ratio <= 0.48, 'small/big width ratio ' + ratio);
  near(ratio, 0.41 * avW('mini') / big.w * big.size, 1e-6, 'small word at 0.41 of the tracked mini width');
  near(small.x + small.w / 2, big.x + big.w / 2, 1, 'small centred under big');
  assert.ok(small.y > big.y && small.box[1] >= big.box[3] - 1 && small.box[1] - big.box[3] < 0.06 * big.size, 'small tight under big');
  // Two sparkles, one over each i, above the x-height; the i's are drawn dotless.
  const sp = kinds(it, 'sparkle');
  assert.equal(sp.length, 2);
  assert.equal(big.text, 'mını');
  // Each sparkle is centred on its dotless i's stem top, its bottom 0.12 x-height above it, 0.36 x-height tall.
  const stem = mBig.stems.i, adv = (t) => [...t].reduce((a, c) => a + mBig.advances[c] / UPM * big.size + big.tracking, 0);
  [1, 3].forEach((at, k) => {
    near(sp[k].x, big.x + adv(big.text.slice(0, at)) + stem[0] / UPM * big.size, 1e-6, 'sparkle over the stem top ' + k);
    near(sp[k].y + sp[k].size / 2, big.y - (stem[1] / UPM + 0.12 * XH) * big.size, 1e-6, 'sparkle gap above the stem ' + k);
    near(sp[k].size, 0.36 * XH * big.size, 1e-6, 'sparkle height ' + k);
  });
  for (const s of sp) {
    assert.equal(s.shade, undefined, 'sparkles carry the full shadow');
    assert.ok(s.x > big.x && s.x < big.x + big.w, 'sparkle over the word');
    assert.ok(s.y < big.y - big.size * mBig.xHeight / mBig.unitsPerEm, 'sparkle above the x-height');
    assert.equal(s.color, '#F7C8E6');
  }
  assert.ok(sp[0].x < sp[1].x);
  // Whole lockup is well inside the 60 % box.
  assert.ok(b.w <= 0.6 * W);
}
// Sparkles: no i/j -> one at the top right; "vlog life" has one i; capped at 3; toggle off.
{
  const v = lay('archive-vlog', { big: 'vlog', small: 'vlog' });
  const sp = kinds(v, 'sparkle'), big = one(v, 'big');
  assert.equal(sp.length, 1);
  assert.ok(sp[0].x > big.x + 0.8 * big.w && sp[0].y < big.box[1] + 0.1 * big.size, 'top right sparkle');
  assert.equal(big.text, 'vlog');
  assert.equal(kinds(lay('archive-vlog', { big: 'vlog life', small: '' }), 'sparkle').length, 1);
  assert.equal(kinds(lay('archive-vlog', { big: 'iiiii', small: '' }), 'sparkle').length, 3);
  assert.equal(one(lay('archive-vlog', { big: 'iiiii', small: '' }), 'big').text, 'ıııii', 'only sparkled i lose their dots');
  // Instrument Serif has a dotless j too: the j is drawn dotless with its sparkle on the stem top.
  const j = lay('archive-vlog', { big: 'jam', small: '' });
  assert.equal(kinds(j, 'sparkle').length, 1); assert.equal(one(j, 'big').text, '\u0237am');
  {
    const jb = one(j, 'big'), js = kinds(j, 'sparkle')[0], st = mBig.stems.j;
    near(js.x, jb.x + (st[0] / UPM) * jb.size, 1e-6, 'sparkle over the j stem top');
    near(js.y + js.size / 2, jb.y - (st[1] / UPM + 0.12 * XH) * jb.size, 1e-6, 'j sparkle gap');
  }
  // A face without a dotless glyph keeps the dot and floats the sparkle above it.
  {
    const noDotless = JSON.parse(JSON.stringify(mBig)); delete noDotless.advances['\u0237'];
    const fonts = fontsFor('archive-vlog').map(f => f.role === 'big' ? { ...f, metrics: noDotless } : f);
    const jj = JSON.parse(JSON.stringify(box.L({ ...DEFAULT, preset: 'archive-vlog', fields: { big: 'jam', small: '' }, fonts }, W, H)));
    const jb = one(jj, 'big'), js = kinds(jj, 'sparkle')[0], dj = mBig.dots.j;
    assert.equal(jb.text, 'jam');
    assert.ok(js.y + js.size / 2 < jb.y - ((dj[1] + dj[2]) / UPM) * jb.size - 0.01 * jb.size, 'sparkle clears the j dot');
  }
  const off = lay('archive-vlog', { big: 'mini', small: 'vlog' }, { sparkles: false });
  assert.equal(kinds(off, 'sparkle').length, 0); assert.equal(one(off, 'big').text, 'mini');
}
// Long big text shrinks to the 60 % width; empty small is omitted; empty big draws nothing.
{
  const base = one(lay('archive-vlog', { big: 'mini', small: 'vlog' }), 'big');
  const long = lay('archive-vlog', { big: 'mmmmmmmmmmmm', small: 'vlog' });
  const b = bounds(long);
  assert.ok(b.w <= 0.6 * W + 0.5, 'long lockup width ' + b.w);
  near(b.w, 0.6 * W, 1, 'long lockup fills the box exactly');
  assert.ok(one(long, 'big').size < base.size, 'shrink fired');
  near(b.cx, 0.49 * W, 0.01 * W, 'shrunk lockup stays centred');
  const solo = lay('archive-vlog', { big: 'mini', small: '' });
  assert.equal(part(solo, 'small').length, 0);
  near(bounds(solo).cy, 0.52 * H, 0.01 * H, 'solo centre y');
  assert.deepEqual(lay('archive-vlog', { big: '  ', small: 'vlog' }), []);
}
// Adjust parameters: size, position, colours.
{
  const base = one(lay('archive-vlog', { big: 'mini', small: 'vlog' }), 'big');
  const big = lay('archive-vlog', { big: 'mini', small: 'vlog' }, { size: 150 });
  near(one(big, 'big').size, base.size * 1.5, 0.01, 'size 150 %');
  const moved = lay('archive-vlog', { big: 'mini', small: 'vlog' }, { x: 30, y: 70 });
  near(bounds(moved).cx, 0.3 * W, 0.5, 'x 30 %'); near(bounds(moved).cy, 0.7 * H, 0.5, 'y 70 %');
  const tinted = lay('archive-vlog', { big: 'mini', small: 'vlog' }, { primary: '#FF0000', secondary: '#00FF00' });
  assert.equal(one(tinted, 'big').color, '#FF0000'); assert.equal(one(tinted, 'small').color, '#00FF00');
  assert.ok(kinds(tinted, 'sparkle').every(s => s.color === '#FF0000'));
  // Sizes are relative to the canvas height; a narrow (9:16) canvas then shrinks to its 60 % width.
  near(one(lay('archive-vlog', { big: 'mini', small: 'vlog' }, {}, 1920, 1440), 'big').size, base.size * 1440 / 1080, 0.01, 'height relative');
  assert.ok(bounds(lay('archive-vlog', { big: 'mini', small: 'vlog' }, {}, 1080, 1920)).w <= 0.6 * 1080 + 0.5, '9:16 fits');
  // Missing metrics never throw (fallback advances).
  const bare = box.L({ preset: 'archive-vlog', fields: { big: 'mini', small: 'vlog' } }, W, H);
  assert.ok(bare.length >= 2);
  // Adjust parameters are flat keys (data.big, data.small, ...) and win over data.fields.
  const flat = JSON.parse(JSON.stringify(box.L({ ...DEFAULT, preset: 'archive-vlog', big: 'mini', small: 'vlog', fonts: fontsFor('archive-vlog') }, W, H)));
  assert.deepEqual(flat, lay('archive-vlog', { big: 'mini', small: 'vlog' }));
  const edited = lay('archive-vlog', { big: 'mini', small: 'vlog' }, { big: 'tea', small: '' });
  assert.equal(one(edited, 'big').text, 'tea'); assert.equal(part(edited, 'small').length, 0);
  // Unknown preset falls back to Mini vlog.
  assert.equal(JSON.parse(JSON.stringify(box.L({ ...DEFAULT, preset: 'nope', fields: { big: 'mini', small: 'vlog' }, fonts: fontsFor('archive-vlog') }, W, H))).filter(i => i.part === 'small').length, 1);
}

// --- A day in my life ----------------------------------------------------------------
{
  const it = lay('day-in-my-life', { year: '2026', big: 'mini vlog', tag: 'a day in my life' });
  const b1 = one(it, 'big1'), b2 = one(it, 'big2'), year = one(it, 'year'), t1 = one(it, 'tag1'), t2 = one(it, 'tag2');
  assert.deepEqual([b1.text, b2.text, year.text, t1.text, t2.text], ['mini', 'vlog', '2026', 'a day in', 'my life']);
  for (const i of [b1, b2, year, t1, t2]) assert.equal(i.font.family, 'MV Rounded Bold');
  assert.equal(b1.color, '#F7C8E6'); assert.equal(year.color, '#FFFFFF'); assert.equal(t1.color, '#FFFFFF');
  assert.ok(b2.y > b1.y, 'vlog below mini');
  assert.ok(year.x + year.w < b1.x && Math.abs(year.y - b1.y) < 0.3 * b1.size, 'year left of mini');
  assert.ok(t1.x > b2.x + b2.w && t2.y > t1.y && t1.y > b1.y && t2.y <= b2.y + 0.2 * b2.size, 'tag right of vlog, two lines');
  assert.ok(year.size < 0.5 * b1.size && t1.size < 0.4 * b1.size, 'tiny year and tag');
  const stars = kinds(it, 'star');
  assert.equal(stars.length, 2);
  assert.ok(stars.some(s => s.x < year.x) && stars.some(s => s.x > t1.x + t1.w), 'star before year, after tag');
  assert.equal(kinds(it, 'sparkle').length, 0);
  const b = bounds(it);
  near(b.cx, 0.49 * W, 0.01 * W, 'day centre x'); near(b.cy, 0.52 * H, 0.01 * H, 'day centre y');
  assert.ok(b.w <= 0.6 * W);
  // 12-character big text still fits the 60 % box.
  const long = lay('day-in-my-life', { year: '2026', big: 'mmmmmm mmmmm', tag: 'a day in my life' });
  assert.ok(bounds(long).w <= 0.6 * W + 0.5, 'day long width ' + bounds(long).w);
  // Empty year / tag are omitted with their stars.
  const bare = lay('day-in-my-life', { year: '', big: 'mini vlog', tag: '' });
  assert.equal(part(bare, 'year').length + part(bare, 'tag1').length + part(bare, 'tag2').length, 0);
  assert.equal(kinds(bare, 'star').length, 0);
  // One-word big text sits on the second row next to the tag; the year row stays above it.
  const single = lay('day-in-my-life', { year: '2026', big: 'weekend', tag: 'a day in my life' });
  assert.equal(part(single, 'big1').length, 0);
  assert.ok(one(single, 'year').y < one(single, 'big2').y);
  // Accents off hides the stars without reserving their space: row 1 keeps its year-to-word gap
  // and nothing (visible or not) sits left of the year.
  const plain = lay('day-in-my-life', { year: '2026', big: 'mini vlog', tag: 'a day in my life' }, { sparkles: false });
  assert.equal(kinds(plain, 'star').length, 0);
  const py = one(plain, 'year'), pb1 = one(plain, 'big1');
  near((pb1.x - (py.x + py.w)) / pb1.size, (b1.x - (year.x + year.w)) / b1.size, 1e-6, 'year gap');
  assert.ok(py.box[0] >= bounds(plain).x0 - 1e-6);
}

// --- A small glimpse -----------------------------------------------------------------
{
  const it = lay('small-glimpse', { top: 'a small', big: 'glimpse', bottom: 'of today' });
  const top = one(it, 'top'), b1 = one(it, 'big1'), b2 = one(it, 'big2'), bottom = one(it, 'bottom');
  assert.deepEqual([top.text, b1.text, b2.text, bottom.text], ['a small', 'glim-', 'pse', 'of today']);
  assert.equal(top.font.family, 'MV DM Mono'); assert.equal(b1.font.family, 'MV Rounded Bold');
  assert.equal(b1.color, '#F7C8E6'); assert.equal(top.color, '#FFFFFF'); assert.equal(bottom.color, '#FFFFFF');
  assert.ok(top.y < b1.y && b1.y < b2.y && b2.y < bottom.y, 'stacked top / glim- / pse / bottom');
  const stars = kinds(it, 'star');
  assert.equal(stars.length, 1);
  assert.ok(stars[0].x < b2.x && stars[0].y < b2.y && stars[0].y > b1.y, 'star before line 2');
  assert.ok(bottom.x > b2.x, 'bottom line sits to the right');
  assert.equal(kinds(it, 'sparkle').length, 0);
  const b = bounds(it);
  near(b.cx, 0.49 * W, 0.01 * W, 'glimpse centre x'); near(b.cy, 0.52 * H, 0.01 * H, 'glimpse centre y');
  // Split rules: at the middle with a hyphen; at the space nearest the middle without one;
  // three letters or fewer stay on one line (with the star before it).
  const texts = (big) => lay('small-glimpse', { top: '', big, bottom: '' }).filter(i => i.kind === 'text').map(i => i.text);
  assert.deepEqual(texts('glimpse'), ['glim-', 'pse']);
  assert.deepEqual(texts('weekend'), ['week-', 'end']);
  assert.deepEqual(texts('my day'), ['my', 'day']);
  assert.deepEqual(texts('day'), ['day']);
  assert.equal(kinds(lay('small-glimpse', { top: '', big: 'day', bottom: '' }), 'star').length, 1);
  assert.equal(part(lay('small-glimpse', { top: '', big: 'glimpse', bottom: '' }), 'top').length, 0);
  const long = lay('small-glimpse', { top: 'a small', big: 'mmmmmmmmmmmm', bottom: 'of today' });
  assert.ok(bounds(long).w <= 0.6 * W + 0.5, 'glimpse long width ' + bounds(long).w);
}

// --- Shapes, bounds helper and component contract ------------------------------------
assert.match(box.SP(100, 100, 40), /^M[\d.\- ,]+.*Z$/);
assert.match(box.ST(100, 100, 40), /^M[\d.\- ,]+.*Z$/);
{
  const it = lay('archive-vlog', { big: 'mini', small: 'vlog' }), b = bounds(it), hb = JSON.parse(JSON.stringify(box.B(it)));
  assert.deepEqual(hb.map(v => Math.round(v)), [b.x0, b.y0, b.x1, b.y1].map(v => Math.round(v)));
}
// AV_FACES (the block's role -> face table) mirrors presets.json fonts.
for (const p of presets.presets) for (const f of p.fonts) {
  const face = JSON.parse(JSON.stringify(box.F[p.id][f.role]));
  assert.deepEqual({ family: face.family, style: face.style, weight: face.weight }, { family: f.family, style: f.style, weight: f.weight }, p.id + ' ' + f.role);
}
for (const id of Object.keys(box.F)) assert.deepEqual(Object.keys(box.F[id]).sort(), preset(id).fonts.map(f => f.role).sort(), id + ' roles');
assert.ok(src.includes('useMemo(') && src.slice(end).includes('(raw || {})'), 'component guards data and memoizes the layout');
for (const key of ['preset', 'fields', 'primary', 'secondary', 'shadow', 'size', 'sparkles', 'fonts']) assert.ok(src.includes('data.' + key) || new RegExp('\\b' + key + '\\b').test(block), key);
assert.ok(src.includes('delayRender') && src.includes('continueRender'), 'waits for fonts');
assert.ok(src.includes('@font-face') && src.includes('data:font/woff2;base64,'), 'injects fonts');
assert.ok(src.includes('useVideoConfig'), 'reads the canvas size');
assert.ok(!src.includes('useCurrentFrame'), 'static: no frame dependency');
// Measured widths ignore kerning and ligatures, so the render turns both off.
assert.ok(src.includes('fontKerning: "none"') && src.includes('fontVariantLigatures: "none"'), 'no kerning or ligatures');
// Tracking and stroke reach the SVG exactly as the layout measured them.
assert.ok(src.includes('letterSpacing: it.tracking') && src.includes('strokeWidth={it.stroke}') && src.includes('strokeLinejoin="round"'), 'tracking and stroke rendered');
// The shadow is drawn per shade layer (one SVG per shade value), in the component and in the panel preview.
assert.ok(src.includes('avShadeLayers(items)') && src.includes('shadow * layer.shade'), 'component shades each layer');
// The panel preview draws the items the same way.
{
  const panel = fs.readFileSync(path.resolve(__dirname, '..', 'panel.tsx'), 'utf8');
  assert.ok(panel.includes('avShadeLayers(previewItems)') && panel.includes('TITLE_LOOK.shadow * layer.shade'), 'panel preview shades each layer');
  assert.ok(panel.includes('letterSpacing: it.tracking') && panel.includes('strokeWidth={it.stroke}') && panel.includes('strokeLinejoin="round"'), 'panel preview renders tracking and stroke');
}
// Only the Mini vlog big word is tracked and stroked; other presets are untouched.
for (const id of ['day-in-my-life', 'small-glimpse']) for (const i of lay(id, { year: '2026', big: 'mini vlog', tag: 'a day in my life', top: 'a', bottom: 'b' }).filter(i => i.kind === 'text')) assert.ok(i.tracking === 0 && i.stroke === 0 && i.shade === 1, id + ' ' + i.part);

// --- Korean titles (Hangul; escapes only, the plugin holds no literal Hangul) ---------------
{
  vm.runInContext('globalThis.K={ stack: avFontStack, hangul: avHasHangul, split: avSplit, adv: avAdvance, ink: avInk, band: avBand, faces: AV_KO_FACES };', box);
  const K = box.K;
  const ILSANG = '\uc77c\uc0c1', HARU = '\ud558\ub8e8', SOGAE = '\uc791\uc740 \uc21c\uac04', VLOG = '\ube0c\uc774\ub85c\uadf8';
  // Every bundled family has its Korean system face by role: serif faces AppleMyungjo, the rest Apple SD Gothic Neo,
  // placed after the Latin fallbacks and before the generic family.
  const roleFace = { 'MV Instrument Serif Italic': 'AppleMyungjo', 'MV DM Serif Display': 'AppleMyungjo', 'MV Rounded Bold': 'Apple SD Gothic Neo', 'MV DM Mono': 'Apple SD Gothic Neo' };
  for (const p of presets.presets) for (const f of p.fonts) assert.equal(K.faces[f.family], roleFace[f.family], f.family);
  assert.equal(K.stack('MV Instrument Serif Italic'), '"MV Instrument Serif Italic", "Helvetica Neue", Arial, "AppleMyungjo", serif');
  assert.equal(K.stack('MV Rounded Bold'), '"MV Rounded Bold", "Helvetica Neue", Arial, "Apple SD Gothic Neo", sans-serif');
  assert.ok(src.slice(end).includes('fontFamily={avFontStack(it.font.family)}') && !src.includes('const FALLBACK'), 'the render uses the stack');
  const panel = fs.readFileSync(path.resolve(__dirname, '..', 'panel.tsx'), 'utf8');
  assert.ok(panel.includes('fontFamily={avFontStack(it.font.family)}') && panel.includes('fontFamily: avFontStack(face.family)') && !panel.includes('PREVIEW_FALLBACK'), 'preview and tiles use the stack');
  // A wide character without an advance in the metrics counts 1 em (Latin keeps 0.56 em).
  const m = presets.metrics['MV Rounded Bold'];
  assert.equal(K.adv(m, '\uac00'), m.unitsPerEm); assert.equal(K.adv(m, '一'), m.unitsPerEm);
  assert.equal(K.adv({ unitsPerEm: 1000, advances: {} }, 'a'), 560);
  // Hangul reaches the ascent and below the baseline (its ink box is not x-height tall).
  const ik = JSON.parse(JSON.stringify(K.ink(HARU, m)));
  assert.ok(ik.up >= m.capHeight / m.unitsPerEm && ik.down > 0, 'Hangul ink ' + JSON.stringify(ik));
  assert.deepEqual(ik, { up: 0.86, down: 0.12 }, 'Hangul ink: 0.86 em up, 0.12 em down');
  // Stars and the year centre on the middle of Hangul ink, on the x-height band of Latin.
  near(K.band(HARU, m), 0.37, 1e-9, 'Hangul band'); near(K.band('day', m), m.xHeight / m.unitsPerEm / 2, 1e-9, 'Latin band');
  // A spaceless Hangul word is never hyphenated; with a space it splits there.
  assert.deepEqual(JSON.parse(JSON.stringify(K.split(VLOG, true))), [VLOG]);
  const texts = (big) => lay('small-glimpse', { top: '', big, bottom: '' }).filter(i => i.kind === 'text').map(i => i.text);
  assert.deepEqual(texts(VLOG), [VLOG]);
  assert.deepEqual(texts(SOGAE), SOGAE.split(' '));
  // No tracking on Hangul: the Mini vlog big word drops its -0.05 em, Latin keeps it (also in a mixed title the
  // sparkles still sit on the Latin i).
  const ko = lay('archive-vlog', { big: ILSANG, small: VLOG }), la = lay('archive-vlog', { big: 'mini', small: 'vlog' });
  assert.equal(one(ko, 'big').tracking, 0); assert.ok(one(la, 'big').tracking < 0);
  const mixed = lay('archive-vlog', { big: 'mini ' + HARU, small: 'vlog' });
  assert.equal(one(mixed, 'big').tracking, 0); assert.equal(kinds(mixed, 'sparkle').length, 2, 'sparkles over the two i');
  // The same "mini" size: Hangul does not change the big word's font size.
  near(one(lay('archive-vlog', { big: ILSANG, small: 'vlog' }, { size: 100 }), 'big').size, one(lay('archive-vlog', { big: 'mm', small: 'vlog' }), 'big').size, 1e-6, 'size from "mini"');
  // Every preset lays out Korean text inside the frame and the 60 % width cap, centred on the anchor.
  for (const [id, fields] of [['archive-vlog', { big: ILSANG + HARU, small: VLOG }], ['day-in-my-life', { year: '2026', big: ILSANG + ' ' + HARU, tag: SOGAE }],
    ['small-glimpse', { top: SOGAE, big: VLOG, bottom: HARU }], ['small-glimpse', { top: 'a small', big: '\uc8fc\ub9d0 weekend', bottom: 'of ' + HARU }]]) {
    const it = lay(id, fields), b = bounds(it);
    assert.ok(b.w <= 0.6 * W + 0.5 && b.x0 >= 0 && b.y0 >= 0 && b.x1 <= W && b.y1 <= H, id + ' Korean bounds ' + JSON.stringify(b));
    near(b.cx, 0.49 * W, 0.01 * W, id + ' Korean centre x'); near(b.cy, 0.52 * H, 0.01 * H, id + ' Korean centre y');
    for (const i of it.filter(i => i.kind === 'text' && K.hangul(i.text))) assert.equal(i.tracking, 0, id + ' ' + i.part + ' tracking');
  }
  // Long Korean words shrink to the width cap like Latin ones.
  const long = lay('day-in-my-life', { year: '2026', big: HARU.repeat(6), tag: SOGAE.repeat(3) });
  assert.ok(bounds(long).w <= 0.6 * W + 0.5, 'long Korean width ' + bounds(long).w);
}
console.log(JSON.stringify({ title: 'ok' }));
