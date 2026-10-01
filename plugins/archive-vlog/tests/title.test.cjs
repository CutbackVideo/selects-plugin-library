// plugins/archive-vlog/tests/title.test.cjs
// Decode title (assets/decode-title.tsx) and credit (assets/archived-credit.tsx): the pure blocks the graphics and the
// panel preview share, run in node:vm with the bundled font metrics.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const presets = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'fonts', 'presets.json'), 'utf8'));
function block(file, name) {
  const src = fs.readFileSync(path.join(ROOT, 'assets', file), 'utf8');
  const start = src.indexOf('// ' + name + ':start'), end = src.indexOf('// ' + name + ':end');
  assert.ok(start >= 0 && end > start, name + ' markers present in ' + file);
  const b = src.slice(start, end);
  // The panel evaluates this block as plain JS: no imports, exports, JSX or type annotations.
  assert.ok(!/^\s*(import|export)\b/m.test(b), name + ' has no import/export');
  assert.ok(!/<[A-Za-z]/.test(b.replace(/\/\/.*$/gm, '')), name + ' has no JSX');
  // No literal non-ASCII text (check_public rejects literal Hangul; the pools are code points).
  assert.ok(!/[^\x00-\x7f]/.test(src), file + ' is ASCII only');
  return b;
}
const title = block('decode-title.tsx', 'av-decode'), credit = block('archived-credit.tsx', 'av-credit');
const T = {}; vm.createContext(T);
vm.runInContext(title + ';globalThis.X={avKoMeasure,avTitleLayout,avDecodeFrame,avTiming,avFontStack,avGhostChar,avHash,AV_TITLE_FACES,AV_KICKER_FACE,AV_TAGLINE_FACE,AV_TITLE_PRESETS,AV_POOL_HANGUL};', T);
const C = {}; vm.createContext(C);
vm.runInContext(credit + ';globalThis.X={avcKoMeasure,avCreditLayout,avcFontStack,AVC_FACE};', C);
// Also loadable the way the panel does it, and both blocks together in one scope (no name clashes).
assert.equal(typeof new Function(title + ';return avTitleLayout;')(), 'function');
assert.equal(typeof new Function(title + credit + ';return [avTitleLayout, avCreditLayout];')()[1], 'function');
const X = T.X, Y = C.X;

const W = 1920, H = 1080;
const plain = (v) => JSON.parse(JSON.stringify(v));
const fonts = presets.presets[0].fonts.map(f => ({ ...f, metrics: presets.metrics[f.family] }));
const lay = (extra = {}, w = W, h = H) => plain(X.avTitleLayout({ preset: 'cinematic', kicker: 'MINI VLOG', title: 'CINEMATIC', tagline: 'CAPTURE THE MOMENTS', fonts, ...extra }, w, h));
const frameAt = (layout, data, f, fps = 30) => plain(X.avDecodeFrame(layout, data, f, fps));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const cap = (family) => presets.metrics[family].capHeight / presets.metrics[family].unitsPerEm;
const ko = (...cps) => String.fromCharCode(...cps); // Hangul built from code points (no literal Hangul in the repo)
const SEOUL_TRIP = ko(0xC11C, 0xC6B8, 0x20, 0xC5EC, 0xD589), SEOUL = ko(0xC11C, 0xC6B8);

// --- Reference lockup (1920x1080 frame at 4.5 s): kicker 884-1036 x 401-423, title 676-1245 x 444-594 (flat cap
// 150 px; the spec's 135 was re-measured), tagline 678-1241 x 616-634.
{
  const L = lay();
  const t = L.title, k = L.kicker, g = L.tagline;
  assert.equal(t.text, 'CINEMATIC'); assert.equal(t.family, 'AV Anton'); assert.equal(t.color, '#FCE070');
  assert.equal(t.condense, 0.84);
  near(t.size * cap('AV Anton'), 150, 0.5, 'title cap height px');
  near(k.size * cap('AV Inter Medium'), 22, 0.5, 'kicker cap height px');
  near(g.size * cap('AV Inter'), 19, 0.5, 'tagline cap height px');
  assert.equal(k.family, 'AV Inter Medium'); assert.equal(k.weight, 500); assert.equal(k.color, '#FFFFFF');
  assert.equal(g.family, 'AV Inter'); assert.equal(g.weight, 400); assert.equal(g.color, '#FFFFFF');
  assert.equal(g.tracking, 0.5); assert.equal(k.tracking, 0);
  near(t.box[0], 676, 8, 'title left'); near(t.box[2], 1245, 8, 'title right');
  near(t.box[1], 444, 3, 'title top'); near(t.y, 594, 3, 'title baseline');
  near(k.box[1], 401, 3, 'kicker top'); near(k.y, 423, 3, 'kicker baseline'); near(k.w, 153, 8, 'kicker width');
  near(g.box[1], 616, 3, 'tagline top'); near(g.y, 634, 3, 'tagline baseline'); near(g.w, 564, 15, 'tagline width');
  for (const p of [t, k, g]) near(p.x + p.w / 2, W / 2, 1e-6, p.part + ' centred');
  near((L.box[1] + L.box[3]) / 2, 0.48 * H, 1e-6, 'lockup centred at 48 % height');
  // Letters: laid out once, contiguous advance boxes that fill the title width.
  assert.equal(t.letters.length, 9); assert.equal(L.steps, 9);
  let pen = t.x;
  for (const l of t.letters) { near(l.x, pen, 1e-6, 'letter ' + l.ch + ' x'); pen += l.w; }
  near(pen, t.x + t.w, 1e-6, 'letters fill the title');
  // Size scales the lockup; lower-case input is set in capitals.
  const big = lay({ size: 120, title: 'cinematic', kicker: 'mini vlog' });
  near(big.title.size, t.size * 1.2, 1e-6, 'size 120 %'); assert.equal(big.title.text, 'CINEMATIC'); assert.equal(big.kicker.text, 'MINI VLOG');
  // Same proportions on another canvas.
  const small = lay({}, 960, 540);
  near(small.title.size, t.size / 2, 1e-6, 'title scales with the canvas height');
  // Font override: Oswald Bold, condensed less.
  const osw = lay({ font: 'oswald' });
  assert.equal(osw.title.family, 'AV Oswald Bold'); assert.equal(osw.title.weight, 700); assert.equal(osw.title.condense, 0.9);
  near(osw.title.size * cap('AV Oswald Bold'), 150, 0.5, 'override keeps the cap height');
  // Colours from Adjust win over the preset's.
  const col = lay({ titleColor: '#FF0000', textColor: '#00FF00' });
  assert.equal(col.title.color, '#FF0000'); assert.equal(col.kicker.color, '#00FF00'); assert.equal(col.tagline.color, '#00FF00');
  // Flat Adjust keys win over `fields`.
  assert.equal(lay({ title: undefined, fields: { title: 'FROM FIELDS' } }).title.text, 'FROM FIELDS');
  assert.equal(lay({ title: 'FLAT', fields: { title: 'FROM FIELDS' } }).title.text, 'FLAT');
}

// --- Presets: the block's defaults match presets.json; A Day Out has no kicker.
{
  assert.deepEqual(Object.keys(plain(X.AV_TITLE_PRESETS)), presets.presets.map(p => p.id));
  for (const p of presets.presets) {
    const d = X.AV_TITLE_PRESETS[p.id];
    assert.equal(d.titleColor, p.colors.title, p.id + ' title colour'); assert.equal(d.textColor, p.colors.text, p.id + ' text colour');
    assert.equal(d.taglineTracking, p.taglineTracking, p.id + ' tagline tracking'); assert.equal(d.taglineSize, p.taglineSize, p.id + ' tagline size');
    const init = Object.fromEntries(p.fields.map(f => [f.key, f.initial]));
    const L = lay({ preset: p.id, ...init });
    assert.equal(L.title.text, init.title); assert.equal(L.title.color, p.colors.title);
    assert.equal(!!L.kicker, !!init.kicker, p.id + ' kicker');
    assert.ok(L.box[2] - L.box[0] <= 0.8 * W + 1e-6, p.id + ' fits');
  }
  const day = lay({ preset: 'a-day-out', kicker: '', title: 'A DAY OUT', tagline: 'A QUIET DAY IN THE CITY, ONE FRAME AT A TIME' });
  assert.equal(day.kicker, null); assert.equal(day.title.color, '#FFFFFF');
  near(day.tagline.size * cap('AV Inter'), 19 * 0.8, 0.5, 'A Day Out tagline is smaller');
  near((day.box[1] + day.box[3]) / 2, 0.48 * H, 1e-6, 'centred without a kicker');
  assert.ok(day.tagline.box[1] > day.title.y, 'tagline under the title');
}

// --- Fit: the lockup never exceeds 80 % of the width; long titles shrink down to a floor, long taglines lose
// tracking first.
{
  const ref = lay();
  for (const t of ['THE LONG WEEKEND', 'SUMMER IN SEOUL', 'WWWWWWWWWWWWWWWW', 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJ']) {
    const L = lay({ title: t });
    assert.ok(L.box[2] - L.box[0] <= 0.8 * W + 1e-6, t + ' width ' + (L.box[2] - L.box[0]));
    near((L.box[0] + L.box[2]) / 2, W / 2, 1e-6, t + ' centred');
  }
  const wide = lay({ title: 'WWWWWWWWWWWWWWWW' });
  assert.ok(wide.title.size < ref.title.size, 'long title shrinks');
  near(wide.title.w, 0.8 * W, 1, 'long title shrinks to the fit width');
  // A short title keeps the reference size.
  assert.equal(lay({ title: 'TOKYO' }).title.size, ref.title.size);
  const longTag = lay({ tagline: 'A WEEKEND OF SLOW MORNINGS AND LONG WALKS BY THE RIVER' });
  assert.ok(longTag.tagline.tracking < 0.5 && longTag.tagline.tracking >= 0.15, 'tagline tracking reduced: ' + longTag.tagline.tracking);
  assert.ok(longTag.tagline.w <= 0.8 * W + 1e-6, 'tagline fits');
}

// --- Hangul: no uppercase, tracking 0, no condense, 1 em per syllable, both Korean system faces in every stack.
{
  const L = lay({ title: SEOUL_TRIP, kicker: 'mini vlog', tagline: SEOUL + ' capture' });
  assert.equal(L.title.text, SEOUL_TRIP);
  assert.equal(L.title.condense, 1, 'no condense on Hangul');
  for (const l of L.title.letters) if (l.cls === 'hangul') near(l.w, L.title.size, 1e-6, 'Hangul at 1 em');
  assert.equal(L.tagline.tracking, 0, 'no tracking on Hangul');
  assert.equal(L.tagline.text, SEOUL + ' capture', 'no uppercase with Hangul');
  assert.equal(L.kicker.text, 'MINI VLOG', 'a Latin kicker is still capitalised');
  assert.equal(L.steps, 4, 'the space takes no step');
  assert.ok(L.box[2] - L.box[0] <= 0.8 * W + 1e-6);
  // Mixed: the Latin part keeps its case and draws uncondensed.
  const M = lay({ title: 'Seoul ' + SEOUL });
  assert.equal(M.title.text, 'Seoul ' + SEOUL); assert.equal(M.title.condense, 1);
  assert.deepEqual(M.title.letters.map(l => l.cls), ['upper', 'lower', 'lower', 'lower', 'lower', 'space', 'hangul', 'hangul']);
  // Hangul glyphs draw bold in the system face; Latin glyphs in Anton's own weight.
  const end = frameAt(M, {}, 1000);
  assert.deepEqual(end.glyphs.map(g => g.weight), [400, 400, 400, 400, 400, 700, 700]);
  // Credit with a Korean name.
  const c = plain(Y.avCreditLayout({ prefix: 'ARCHIVED BY', name: SEOUL, fonts }, W, H));
  assert.equal(c.text, 'ARCHIVED BY ' + SEOUL); assert.equal(c.hangul, true);
  assert.equal(plain(Y.avCreditLayout({ prefix: 'archived by', name: 'kim', fonts }, W, H)).text, 'ARCHIVED BY KIM');
}
// Every stack (title faces, kicker, tagline, credit): the bundled face first, then Latin fallbacks for macOS and
// Windows, then "Apple SD Gothic Neo" and "Malgun Gothic" before the generic family.
{
  const families = [...Object.values(plain(X.AV_TITLE_FACES)).map(f => f.family), X.AV_KICKER_FACE.family, X.AV_TAGLINE_FACE.family];
  const stacks = families.map(f => [f, X.avFontStack(f)]).concat([[Y.AVC_FACE.family, Y.avcFontStack(Y.AVC_FACE.family)]]);
  for (const [family, s] of stacks) {
    const parts = s.split(',').map(x => x.trim());
    assert.equal(parts[0], '"' + family + '"', s);
    assert.equal(parts[parts.length - 1], 'sans-serif', s);
    assert.deepEqual(parts.slice(-4, -1), ['"Apple SD Gothic Neo"', '"Malgun Gothic"', '"Noto Sans KR"'], s);
    assert.ok(parts.length >= 5, 'a Latin fallback before the Korean faces: ' + s);
  }
  // Windows Latin fallbacks per role.
  assert.match(X.avFontStack('AV Anton'), /Impact/); assert.match(X.avFontStack('AV Inter'), /"Segoe UI"/);
  // Items carry their stack.
  const L = lay();
  for (const p of [L.title, L.kicker, L.tagline]) assert.match(p.stack, /"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif$/);
  for (const g of frameAt(L, {}, 1000).glyphs) assert.match(g.stack, /"Malgun Gothic"/);
  // Families are bundled in presets.json.
  for (const f of families) assert.ok(presets.metrics[f], f + ' bundled');
}

// --- Decode state per frame (30 fps, default timing: textIn 2.40 s = frame 72, decodeStart 2.90 s = frame 87,
// 0.11 s = 3.3 frames per letter).
{
  const L = lay(), D = {};
  const steps = L.steps, fps = 30, ls = 0.11 * fps;
  // Before textIn: nothing.
  for (const f of [0, 30, 71]) { const s = frameAt(L, D, f); assert.equal(s.textOpacity, 0); assert.equal(s.glyphs.length, 0); }
  // Kicker and tagline fade in over 3 frames (hard on); the title is still empty.
  assert.equal(frameAt(L, D, 72).textOpacity, 1 / 3); assert.equal(frameAt(L, D, 74).textOpacity, 1);
  assert.equal(frameAt(L, D, 86).glyphs.length, 0);
  // decodeStart: one ghost at letter 0, half opacity.
  const s0 = frameAt(L, D, 87);
  assert.equal(s0.glyphs.length, 1); assert.equal(s0.glyphs[0].ghost, true); assert.equal(s0.glyphs[0].opacity, 0.5);
  assert.notEqual(s0.glyphs[0].ch, 'C'); assert.match(s0.glyphs[0].ch, /^[A-Z]$/);
  // Mid-decode: letters before k are locked to their final glyph at full opacity, k is a ghost, the rest are empty.
  for (let f = 87; f < 87 + steps * ls + 2; f++) {
    const s = frameAt(L, D, f), k = Math.min(steps, Math.floor((f - 87) / ls + 1e-9));
    const locked = s.glyphs.filter(g => !g.ghost), ghosts = s.glyphs.filter(g => g.ghost);
    assert.equal(locked.length, k, 'locked at ' + f);
    assert.equal(ghosts.length, k < steps ? 1 : 0, 'ghost at ' + f);
    assert.equal(locked.map(g => g.ch).join(''), 'CINEMATIC'.slice(0, k));
    for (const g of locked) assert.equal(g.opacity, 1);
    // No layout shift: each locked glyph sits at its final box; the ghost is centred in the next letter's box.
    locked.forEach((g, i) => { near(g.x, L.title.letters[i].x, 1e-9, 'locked x'); assert.equal(g.y, L.title.y); assert.equal(g.size, L.title.size); });
    if (ghosts.length) {
      const box = L.title.letters[k], m = presets.metrics['AV Anton'];
      const gw = m.advances[ghosts[0].ch] / m.unitsPerEm * L.title.size * L.title.condense;
      near(ghosts[0].x + gw / 2, box.x + box.w / 2, 1e-6, 'ghost centred at ' + f);
    }
  }
  // After the decode: the final title, nothing moves.
  const fin = frameAt(L, D, Math.ceil(87 + steps * ls));
  assert.equal(fin.glyphs.map(g => g.ch).join(''), 'CINEMATIC'); assert.equal(fin.decoded, steps);
  assert.deepEqual(frameAt(L, D, 400), fin);
  // The ghost changes every frame (over ten frames of one position at a slow rate) and is deterministic.
  const slow = { timing: { textIn: 0, decodeStart: 0, letterSeconds: 10 } };
  const seq = Array.from({ length: 12 }, (_, f) => frameAt(L, slow, f).glyphs[0].ch);
  assert.ok(new Set(seq).size >= 6, 'ghost varies: ' + seq.join(''));
  for (let f = 1; f < seq.length; f++) assert.ok(seq.includes(seq[f]));
  assert.deepEqual(Array.from({ length: 12 }, (_, f) => frameAt(L, slow, f).glyphs[0].ch), seq, 'deterministic');
  assert.equal(X.avHash(3, 99), X.avHash(3, 99)); assert.notEqual(X.avHash(3, 99), X.avHash(4, 99));
  // Seconds, not frames: the same moments at 60 fps.
  assert.equal(frameAt(L, D, 143, 60).textOpacity, 0); assert.equal(frameAt(L, D, 144, 60).textOpacity, 1 / 3);
  assert.equal(frameAt(L, D, 173, 60).glyphs.length, 0); assert.equal(frameAt(L, D, 174, 60).glyphs.length, 1);
  // The planner's scaled timing (k = 0.89, revealStart passed through) and the speed parameter.
  const k = 0.89, Tm = { timing: { revealStart: 0.2 * k, textIn: 2.4 * k, decodeStart: 2.9 * k, letterSeconds: 0.11 * k } };
  assert.equal(frameAt(L, Tm, Math.round(2.4 * k * 30) - 1).textOpacity, 0);
  assert.ok(frameAt(L, Tm, Math.round(2.4 * k * 30)).textOpacity > 0);
  assert.equal(frameAt(L, Tm, Math.round(2.9 * k * 30)).glyphs.length, 1);
  const tm = plain(X.avTiming({ ...Tm, speed: 200 }));
  near(tm.letterSeconds, 0.11 * k / 2, 1e-12, 'speed 200 % halves the letter time');
  assert.deepEqual(plain(X.avTiming({})), { textIn: 2.4, decodeStart: 2.9, letterSeconds: 0.11 });
  // decodeStart never before textIn.
  assert.equal(plain(X.avTiming({ timing: { textIn: 3, decodeStart: 1 } })).decodeStart, 3);
}

// --- Pools and spaces.
{
  // Spaces lock instantly: "A DAY OUT" has 7 steps; the spaces are never drawn.
  const L = lay({ preset: 'a-day-out', kicker: '', title: 'A DAY OUT' });
  assert.equal(L.steps, 7);
  const fin = frameAt(L, {}, 87 + Math.ceil(7 * 3.3));
  assert.equal(fin.glyphs.map(g => g.ch).join(''), 'ADAYOUT');
  assert.equal(frameAt(L, {}, 87 + Math.ceil(7 * 3.3) - 1).glyphs.filter(g => g.ghost).length, 1);
  // Pools: capitals, lower case, digits and Hangul syllables, never the letter's own glyph.
  const hangulPool = plain(X.AV_POOL_HANGUL);
  assert.ok(hangulPool.length >= 40 && hangulPool.every(c => c.charCodeAt(0) >= 0xac00 && c.charCodeAt(0) <= 0xd7a3), 'Hangul pool');
  for (let f = 0; f < 60; f++) {
    const u = X.avGhostChar('Q', 2, f), d = X.avGhostChar('7', 2, f), h = X.avGhostChar(SEOUL[0], 2, f), l = X.avGhostChar('q', 2, f);
    assert.match(u, /^[A-Z]$/); assert.notEqual(u, 'Q');
    assert.match(d, /^[0-9]$/); assert.notEqual(d, '7');
    assert.match(l, /^[a-z]$/);
    assert.ok(hangulPool.includes(h) && h !== SEOUL[0], 'Hangul ghost from the pool');
    assert.equal(X.avGhostChar('!', 2, f), '!');
  }
  // A Hangul title flips through Hangul.
  const K = lay({ title: SEOUL_TRIP });
  const g = frameAt(K, { timing: { textIn: 0, decodeStart: 0, letterSeconds: 1 } }, 5).glyphs;
  assert.equal(g.length, 1); assert.ok(hangulPool.includes(g[0].ch));
  // Digits flip through digits.
  const N = lay({ title: '2026' });
  assert.match(frameAt(N, { timing: { textIn: 0, decodeStart: 0, letterSeconds: 1 } }, 3).glyphs[0].ch, /^[0-9]$/);
}

// --- Empty fields.
{
  const none = plain(X.avTitleLayout({ title: '', kicker: '', tagline: '', fonts }, W, H));
  assert.equal(none.title, null); assert.equal(none.box, null);
  assert.deepEqual(frameAt(none, {}, 200), { textOpacity: 0, glyphs: [], decoded: 0 });
  const onlyTitle = lay({ kicker: '', tagline: '' });
  assert.equal(onlyTitle.kicker, null); assert.equal(onlyTitle.tagline, null);
  near((onlyTitle.box[1] + onlyTitle.box[3]) / 2, 0.48 * H, 1e-6, 'title alone centred');
  // Without metrics the layout still works (fallback advances).
  assert.ok(plain(X.avTitleLayout({ title: 'CINEMATIC' }, W, H)).title.w > 0);
}

// --- Credit: reference "ARCHIVED BY YOURNAME" at 6.5 s: 802-1117 x 529-553 (cap 25 px), centred.
{
  const c = plain(Y.avCreditLayout({ fonts }, W, H));
  assert.equal(c.text, 'ARCHIVED BY YOURNAME'); assert.equal(c.family, 'AV Oswald Bold'); assert.equal(c.color, '#FFFFFF');
  near(c.size * cap('AV Oswald Bold'), 25, 0.5, 'credit cap');
  near(c.x + c.w / 2, W / 2, 1e-6, 'credit centred x'); near((c.box[1] + c.box[3]) / 2, H / 2, 1e-6, 'credit centred y');
  near(c.w, 316, 10, 'credit width'); near(c.box[1], 529, 3, 'credit top');
  assert.equal(plain(Y.avCreditLayout({ prefix: 'LOCATION |', name: 'Lisbon', fonts }, W, H)).text, 'LOCATION | LISBON');
  assert.equal(plain(Y.avCreditLayout({ prefix: '', name: 'Kim', fonts }, W, H)).text, 'KIM');
  assert.equal(Y.avCreditLayout({ prefix: '', name: '', fonts }, W, H), null);
  const long = plain(Y.avCreditLayout({ name: 'A VERY LONG NAME THAT KEEPS GOING AND GOING ON AND ON AND ON', size: 200, fonts }, W, H));
  assert.ok(long.w <= 0.8 * W + 1e-6, 'credit fits');
  const big = plain(Y.avCreditLayout({ size: 150, color: '#FCE070', fonts }, W, H));
  near(big.size, c.size * 1.5, 1e-6, 'credit size'); assert.equal(big.color, '#FCE070');
}

// --- Measured Hangul metrics (Windows: Malgun Gothic differs from Apple SD Gothic Neo). `data.koInk` ({ up, down } em)
// and `data.koAdvances` ({ char: em }) replace the 0.86 / 0.12 em ink and the 1 em advance; without them (or with
// invalid values) the layout is the old one, and Latin-only text never changes.
{
  const KO = { title: SEOUL_TRIP, kicker: 'mini vlog', tagline: SEOUL + ' capture' };
  const base = lay(KO);
  // Absent, invalid or equal-to-the-constants values give the old layout.
  assert.deepEqual(lay({ ...KO, koInk: { up: 'x', down: 0.1 }, koAdvances: { [SEOUL[0]]: 'wide' } }), base);
  assert.deepEqual(lay({ ...KO, koInk: { up: 0.86, down: 0.12 }, koAdvances: { [SEOUL[0]]: 1 } }), base);
  near(base.title.box[1], base.title.y - 0.86 * base.title.size, 1e-9, 'fallback Hangul ink up');
  near(base.title.box[3], base.title.y + 0.12 * base.title.size, 1e-9, 'fallback Hangul ink down');
  // Measured ink moves the title's ink box and everything stacked on it; the lockup stays centred.
  const inked = lay({ ...KO, koInk: { up: 0.8, down: 0.22 } });
  near(inked.title.box[1], inked.title.y - 0.8 * inked.title.size, 1e-9, 'measured ink up');
  near(inked.title.box[3], inked.title.y + 0.22 * inked.title.size, 1e-9, 'measured ink down');
  assert.notEqual(inked.tagline.y, base.tagline.y); assert.notEqual(inked.title.y, base.title.y);
  near((inked.box[1] + inked.box[3]) / 2, 0.48 * H, 1e-6, 'still centred');
  assert.deepEqual(inked.title.letters, base.title.letters, 'ink does not change the advances');
  // Measured advances replace the 1 em per wide character; Latin letters keep the font metrics.
  const adv = Object.fromEntries(Array.from(SEOUL_TRIP.replace(' ', '')).map(c => [c, 0.92]));
  const narrow = lay({ ...KO, title: 'Seoul ' + SEOUL, koAdvances: adv }), wide1 = lay({ ...KO, title: 'Seoul ' + SEOUL });
  narrow.title.letters.forEach((l, i) => {
    if (l.cls === 'hangul') near(l.w, 0.92 * narrow.title.size, 1e-9, 'measured Hangul advance');
    else near(l.w / narrow.title.size, wide1.title.letters[i].w / wide1.title.size, 1e-12, 'Latin advance unchanged');
  });
  assert.ok(narrow.title.w < wide1.title.w);
  near(narrow.tagline.w, wide1.tagline.w - 2 * 0.08 * narrow.tagline.size, 1e-6, 'tagline Hangul at the measured advance');
  // A Hangul ghost is centred with its measured advance.
  const Dk = { koAdvances: Object.fromEntries(plain(X.AV_POOL_HANGUL).map(c => [c, 0.9])), timing: { textIn: 0, decodeStart: 0, letterSeconds: 1 } };
  const KL = lay({ title: SEOUL, kicker: '', tagline: '', ...Dk });
  const gh = frameAt(KL, Dk, 5).glyphs[0];
  near(gh.x + 0.9 * KL.title.size / 2, KL.title.letters[0].x + KL.title.letters[0].w / 2, 1e-9, 'ghost centred with the measured advance');
  // Latin-only text ignores the measured values.
  for (const extra of [{}, { preset: 'a-day-out', title: 'A DAY OUT' }, { title: 'WWWWWWWWWWWWWWWWWWWWWWW' }]) {
    const d = { ...extra, koInk: { up: 0.7, down: 0.3 }, koAdvances: { A: 2, W: 0.3 } };
    assert.deepEqual(lay(d), lay(extra)); assert.deepEqual(frameAt(lay(d), d, 95), frameAt(lay(extra), extra, 95));
  }
  // Credit: the same two fields.
  const cBase = plain(Y.avCreditLayout({ name: SEOUL, fonts }, W, H));
  assert.deepEqual(plain(Y.avCreditLayout({ name: SEOUL, fonts, koInk: { up: 2, down: 0.1 } }, W, H)), cBase, 'invalid credit ink ignored');
  near(cBase.box[1], cBase.y - 0.86 * cBase.size, 1e-9, 'credit fallback ink');
  const cM = plain(Y.avCreditLayout({ name: SEOUL, fonts, koInk: { up: 0.95, down: 0.2 }, koAdvances: { [SEOUL[0]]: 0.9, [SEOUL[1]]: 0.9 } }, W, H));
  near(cM.box[1], cM.y - 0.95 * cM.size, 1e-9, 'credit measured ink up'); near(cM.box[3], cM.y + 0.2 * cM.size, 1e-9, 'credit measured ink down');
  near(cM.w, cBase.w - 0.2 * cM.size, 1e-6, 'credit measured advances');
  near((cM.box[1] + cM.box[3]) / 2, H / 2, 1e-6, 'credit still centred');
  const cL = { prefix: 'archived by', name: 'kim', fonts };
  assert.deepEqual(plain(Y.avCreditLayout({ ...cL, koInk: { up: 0.7, down: 0.3 }, koAdvances: { K: 3 } }, W, H)), plain(Y.avCreditLayout(cL, W, H)));
  // The canvas measurer: null in Node or for Latin text; with a canvas it measures on the drawn stack and weight.
  assert.equal(X.avKoMeasure({ title: SEOUL }), null); assert.equal(Y.avcKoMeasure({ name: SEOUL }), null);
  const fonts2d = [];
  const doc = { createElement: () => ({ getContext: () => ({ font: '', measureText(t) {
    fonts2d.push(this.font);
    return { width: Array.from(t).length * 93, actualBoundingBoxAscent: 81, actualBoundingBoxDescent: 15 };
  } }) }) };
  const mT = {}, mC = {}; vm.createContext(mT); vm.createContext(mC); mT.document = doc; mC.document = doc;
  vm.runInContext(title + ';globalThis.f=avKoMeasure;', mT); vm.runInContext(credit + ';globalThis.f=avcKoMeasure;', mC);
  assert.equal(mT.f({ title: 'CINEMATIC', kicker: 'MINI VLOG' }), null, 'nothing to measure for Latin');
  const mt = plain(mT.f({ title: SEOUL, kicker: 'mini', tagline: SEOUL_TRIP }));
  assert.deepEqual(mt.koInk, { up: 0.81, down: 0.15 });
  for (const c of Array.from(SEOUL_TRIP.replace(' ', '')).concat(plain(X.AV_POOL_HANGUL))) near(mt.koAdvances[c], 0.93, 1e-12, 'advance ' + c);
  assert.equal(mt.koAdvances.m, undefined, 'only wide characters');
  assert.equal(fonts2d[fonts2d.length - 1], '700 100px ' + X.avFontStack('AV Anton'));
  assert.match(fonts2d[fonts2d.length - 1], /"Apple SD Gothic Neo", "Malgun Gothic"/);
  // Measured output plugs straight into the layout.
  near(lay({ title: SEOUL, ...mt }).title.letters[0].w, 0.93 * lay({ title: SEOUL, ...mt }).title.size, 1e-9, 'measured advance used');
  mT.f({ title: SEOUL, font: 'oswald' }); assert.equal(fonts2d[fonts2d.length - 1], '700 100px ' + X.avFontStack('AV Oswald Bold'));
  const mc = plain(mC.f({ prefix: 'ARCHIVED BY', name: SEOUL }));
  assert.deepEqual(mc.koInk, { up: 0.81, down: 0.15 }); assert.deepEqual(Object.keys(mc.koAdvances).sort(), Array.from(SEOUL).sort());
  assert.equal(fonts2d[fonts2d.length - 1], '700 100px ' + Y.avcFontStack('AV Oswald Bold'));
  assert.equal(mC.f({ name: 'KIM' }), null);
}
console.log(JSON.stringify({ title: 'ok' }));
