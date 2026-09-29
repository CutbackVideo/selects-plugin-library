// plugins/the-end-credits/tests/graphic.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'credits-graphic.tsx'), 'utf8');
const a = src.indexOf('// tec-graphic:start'), b = src.indexOf('// tec-graphic:end');
assert.ok(a >= 0 && b > a, 'pure block markers present');
const block = src.slice(a, b);
const box = {}; vm.createContext(box);
vm.runInContext(block + ';globalThis.G={TEC_LAYOUTS,TEC_TITLE,TEC_CREDITS,TEC_FULL_BIG,tecTyping,tecSlotStart,tecTypedCount,tecScrollY,tecCreditsOpacity,tecMaskAlpha,tecMaskCss,tecEaseInOut,tecFullMove,tecFullOverlay,tecResolveRows,tecFitSize,tecFitLine,tecTitleSizes,tecTitlePose,tecCreditLayout,tecFitSpeed};', box);
const G = box.G;
const near = (x, y, eps, msg) => assert.ok(Math.abs(x - y) <= eps, `${msg}: ${x} vs ${y}`);
const plain = (x) => JSON.parse(JSON.stringify(x));

// Typing: slot i from 0.47 + i·slotSec, slotSec = min(0.42, 4.4/n), n = Array.from(title).length.
assert.deepEqual(plain(G.tecTyping('THE END')), { n: 7, slotSec: 0.42, startSec: 0.47 });
near(G.tecSlotStart(6, 7), 2.99, 1e-9, 'n=7 last slot');
near(G.tecTyping('ABCDEFGHIJKL').slotSec, 4.4 / 12, 1e-12, 'n=12 slot');
near(G.tecSlotStart(11, 12), 0.47 + 11 * 4.4 / 12, 1e-9, 'n=12 last slot');
near(G.tecSlotStart(29, 30), 0.47 + 29 * 4.4 / 30, 1e-9, 'n=30 last slot');
for (const n of [7, 12, 30, 80]) assert.ok(G.tecSlotStart(n - 1, n) <= 4.87 + 1e-9, 'deadline n=' + n);
assert.equal(G.tecTyping('Café 🎬').n, 6, 'code points, not UTF-16 units');
assert.equal(G.tecTypedCount(0.46, 7), 0);
assert.equal(G.tecTypedCount(0.47, 7), 1);
assert.equal(G.tecTypedCount(0.88, 7), 1);
assert.equal(G.tecTypedCount(0.89, 7), 2);
assert.equal(G.tecTypedCount(2.98, 7), 6);
assert.equal(G.tecTypedCount(2.99, 7), 7);
assert.equal(G.tecTypedCount(30, 7), 7);
assert.equal(G.tecTypedCount(5, 0), 0);
// Frame-quantised clock at 30 fps: frame 90 = 3.0 s shows all 7; frame 89 shows 6.
assert.equal(G.tecTypedCount(90 / 30, 7), 7);
assert.equal(G.tecTypedCount(89 / 30, 7), 6);

// Scroll: 0 up to revealFrame, then linear at speedPxPerSec·speed·(H/1080).
assert.equal(G.tecScrollY(153, 153, 30, 67, 1, 1080), 0);
assert.equal(G.tecScrollY(100, 153, 30, 67, 1, 1080), 0);
near(G.tecScrollY(210, 153, 30, 67, 1, 1080), 127.3, 1e-9, '7 s at 67 px/s');
near(G.tecScrollY(600, 153, 30, 67, 1, 1080), 998.3, 1e-9, '20 s at 67 px/s');
near(G.tecScrollY(210, 153, 30, 67, 2, 1080), 254.6, 1e-9, 'speed multiplier');
near(G.tecScrollY(210, 153, 30, 67, 1, 720), 127.3 * 720 / 1080, 1e-9, 'scales with H');
near(G.tecScrollY(210, 153, 30, undefined, undefined, 1080), 127.3, 1e-9, 'defaults 67 px/s, ×1');
near(G.tecScrollY(1000, 120, 24, 80, 0.5, 1080), (880 / 24) * 40, 1e-9, '24 fps');

// Credits fade 4.0 → 6.0 s.
assert.equal(G.tecCreditsOpacity(3.9), 0);
assert.equal(G.tecCreditsOpacity(4), 0);
near(G.tecCreditsOpacity(5), 0.5, 1e-12, 'fade midpoint');
assert.equal(G.tecCreditsOpacity(6), 1);
assert.equal(G.tecCreditsOpacity(20), 1);

// Column mask: top/bottom 14 % of H ramp 0.35 → 1.
near(G.tecMaskAlpha(0), 0.35, 1e-12, 'mask top edge');
near(G.tecMaskAlpha(0.07), 0.675, 1e-12, 'mask top mid');
near(G.tecMaskAlpha(0.14), 1, 1e-12, 'mask top end');
assert.equal(G.tecMaskAlpha(0.5), 1);
near(G.tecMaskAlpha(0.86), 1, 1e-12, 'mask bottom start');
near(G.tecMaskAlpha(0.93), 0.675, 1e-12, 'mask bottom mid');
near(G.tecMaskAlpha(1), 0.35, 1e-12, 'mask bottom edge');
assert.equal(G.tecMaskCss(), 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, #000 14%, #000 86%, rgba(0,0,0,0.35) 100%)');
assert.ok(src.includes('maskImage: mask') && src.includes('WebkitMaskImage: mask'), 'mask applied to the text layer');

// Scalar role/name keys win whenever present, even as ""; K = rowCount else rows.length.
const rows2 = [{ role: 'Director', name: 'Ann' }, { role: 'Editor', name: 'Bo' }];
assert.deepEqual(plain(G.tecResolveRows({ rows: rows2 })), rows2);
assert.deepEqual(plain(G.tecResolveRows({ rows: rows2, role1: 'Directed by', name2: 'Cy' })), [{ role: 'Directed by', name: 'Ann' }, { role: 'Editor', name: 'Cy' }]);
assert.deepEqual(plain(G.tecResolveRows({ rows: [{ role: 'Director', name: 'X' }], role1: '' })), [{ role: '', name: 'X' }], 'empty scalar wins');
assert.deepEqual(plain(G.tecResolveRows({ rows: rows2, role1: '', name1: '' })), [{ role: 'Editor', name: 'Bo' }], 'blank pair drops');
assert.deepEqual(plain(G.tecResolveRows({ rows: rows2, rowCount: 3, role3: 'Music', name3: 'Dee' })), [...rows2, { role: 'Music', name: 'Dee' }], 'rowCount extends');
assert.deepEqual(plain(G.tecResolveRows({ rows: rows2, rowCount: 1 })), [rows2[0]], 'rowCount limits');
assert.deepEqual(plain(G.tecResolveRows({ rows: rows2, role1: 7 })), [{ role: '7', name: 'Ann' }, rows2[1]], 'scalar coerced to string');
assert.deepEqual(plain(G.tecResolveRows({})), []);

// Fit + wrap. Stub measure: 0.5 em per character.
const m = (t, px) => t.length * px * 0.5;
assert.equal(G.tecFitSize(28, 100, 768), 28);
near(G.tecFitSize(28, 1000, 768), 28 * 0.768, 1e-12, 'fit shrinks in proportion');
// Column 40 % of 1920 = 768 px. 50 chars at 28 px = 700 px: fits at full size.
assert.deepEqual(plain(G.tecFitLine('x'.repeat(50), 28, 768, m)), { lines: ['x'.repeat(50)], size: 28 });
// 64 chars = 896 px → 24 px (85.7 %): single line, shrunk.
const f64 = G.tecFitLine('y'.repeat(64), 28, 768, m);
assert.equal(f64.lines.length, 1); near(f64.size, 24, 1e-9, '64 chars fit');
// Exactly 70 %: 1097.1 px → still one line at 70 %.
const w70 = G.tecFitLine('z'.repeat(78), 28, 768, m);
assert.equal(w70.lines.length, 1); near(w70.size, 28 * 768 / 1092, 1e-9, '78 chars');
// Beyond 70 %: wraps at the space that balances the halves, then fits (not below 70 %).
const long = 'Assistant Director of Second Unit Photography Operations and Aerial Camera Crew';
const wr = G.tecFitLine(long, 28, 768, m);
assert.deepEqual(plain(wr.lines), ['Assistant Director of Second Unit', 'Photography Operations and Aerial Camera Crew'], 'first of the equally balanced breaks');
assert.equal(wr.size, 28);
const huge = G.tecFitLine('w'.repeat(80) + ' ' + 'w'.repeat(80), 28, 768, m);
assert.equal(huge.lines.length, 2); near(huge.size, 28 * 0.7, 1e-9, 'wrapped lines floor at 70 %');
const word = G.tecFitLine('q'.repeat(200), 28, 768, m);
assert.deepEqual(plain(word.lines), ['q'.repeat(200)]); near(word.size, 19.6, 1e-9, 'no space: clamp at 70 %');

// Title: cap height 16 % of H; the fit compares the visible (scaleX 0.78) width with 34 % of W.
// Real "THE END" advance in TEC Title Serif is 3.314 em → 629 px visible: fits at full size.
const titleM = (t, px) => (t === 'THE END' ? 3.314 : t.length * 0.47) * px;
const s1 = G.tecTitleSizes('THE END', 'classic', 1920, 1080, titleM);
near(s1.size, 0.16 * 1080 / 0.71, 1e-9, 'default title at full size');
near(s1.size * 0.71, 172.8, 1e-9, 'cap 16 % of H');
const longT = 'THE END OF OUR SUMMER';
const s2 = G.tecTitleSizes(longT, 'classic', 1920, 1080, titleM);
near(s2.widthPerPx * s2.size, 0.34 * 1920, 1e-6, 'long title fits 34 % of W');
near(s2.widthPerPx, longT.length * 0.47 * 0.78, 1e-12, 'visible width uses scaleX');
// Full frame big size: cap 20 % of H, fitted to 60 % of W.
near(s1.big, 0.2 * 1080 / 0.71, 1e-9, 'big title cap 20 % of H');

// Title pose: Classic holds at column centre 22.3 % W, cap centre 47 % H.
assert.deepEqual(plain(G.tecTitlePose(3, 5.1, 'classic', s1, 1920, 1080)), { cx: 0.223 * 1920, cy: 0.47 * 1080, size: s1.size });
// Full frame move: big and centred-left until L − 0.8, the column pose (78 % W, Classic size) at L.
const L = 153 / 30;
const p0 = G.tecTitlePose(L - 0.8, L, 'full', s1, 1920, 1080);
near(p0.p, 0, 1e-12, 'move start'); near(p0.size, s1.big, 1e-9, 'start size');
near(p0.cx - (s1.widthPerPx * s1.big) / 2, 0.08 * 1920, 1e-9, 'left edge 8 % W'); near(p0.cy, 540, 1e-9, 'start cap centre');
const pEarly = G.tecTitlePose(2, L, 'full', s1, 1920, 1080);
assert.equal(pEarly.p, 0); near(pEarly.cx, p0.cx, 1e-9, 'holds before the move');
const p1 = G.tecTitlePose(L, L, 'full', s1, 1920, 1080);
near(p1.p, 1, 1e-12, 'move end'); near(p1.cx, 0.78 * 1920, 1e-9, 'end centre x 78 % W');
near(p1.cy, 0.28 * 1080, 1e-9, 'end cap centre'); near(p1.size, s1.size, 1e-9, 'end at Classic size');
near(G.tecFullMove(L - 0.4, L), 0.5, 1e-12, 'ease midpoint');
near(G.tecFullMove(L - 0.7, L), 4 * 0.125 ** 3, 1e-9, 'eases in (cubic)');
assert.equal(G.tecFullMove(L + 3, L), 1);
// Scrim 25 % until L − 0.5, then fades out over 1 s while the gradient fades in.
assert.deepEqual(plain(G.tecFullOverlay(2, L)), { scrim: 0.25, gradient: 0 });
const ovMid = G.tecFullOverlay(L, L);
near(ovMid.scrim, 0.125, 1e-9, 'scrim half at L'); near(ovMid.gradient, 0.5, 1e-9, 'gradient half at L');
assert.deepEqual(plain(G.tecFullOverlay(L + 0.5, L)), { scrim: 0, gradient: 1 });

// Credit layout (1080p): title baseline = cap centre + cap/2; role line top = baseline + 105;
// role baseline = top + 1.05·28; name baseline = role baseline + 43; pitch 123.
const cm = (t, kind, px) => t.length * px * 0.55;
const rows = ['Director', 'Screenwriter', 'Editor'].map((r) => ({ role: r, name: '[Name Here]' }));
const lay = G.tecCreditLayout(rows, 'classic', 1920, 1080, s1.size, cm);
near(lay.titleBaseline, 507.6 + 86.4, 1e-9, 'title baseline');
near(lay.rows[0].roleTop, 594 + 105, 1e-9, 'first role top');
near(lay.rows[0].role.baselines[0], 699 + 29.4, 1e-9, 'first role baseline');
near(lay.rows[0].name.baselines[0], 728.4 + 43, 1e-9, 'role → name');
near(lay.rows[1].roleTop - lay.rows[0].roleTop, 123, 1e-9, 'pitch');
near(lay.lastRoleTop, 699 + 246, 1e-9, 'last role top');
near(lay.colX, 0.223 * 1920, 1e-9, 'classic column'); near(lay.colW, 768, 1e-9, 'classic column width');
// Scale by the frame height.
const lay720 = G.tecCreditLayout(rows, 'classic', 1280, 720, s1.size * 720 / 1080, cm);
near(lay720.rows[1].roleTop - lay720.rows[0].roleTop, 82, 1e-9, 'pitch at 720p');
// A wrapped role adds one role line height (1.4 · 28) to its pair; baselines keep the grid.
const wrapRows = [{ role: 'w'.repeat(40) + ' ' + 'w'.repeat(40), name: 'N' }, { role: 'Editor', name: 'N' }];
const lw = G.tecCreditLayout(wrapRows, 'classic', 1920, 1080, s1.size, cm);
assert.equal(lw.rows[0].role.lines.length, 2);
near(lw.rows[0].role.baselines[1] - lw.rows[0].role.baselines[0], 39.2, 1e-9, 'second line');
near(lw.rows[0].name.baselines[0] - lw.rows[0].role.baselines[0], 43 + 39.2, 1e-9, 'name pushed');
near(lw.rows[1].roleTop - lw.rows[0].roleTop, 123 + 39.2, 1e-9, 'pair grows by one line');
// A wrapped name adds one name line height (1.4 · 24).
const lwn = G.tecCreditLayout([{ role: 'R', name: 'v'.repeat(50) + ' ' + 'v'.repeat(50) }, { role: 'R', name: 'N' }], 'classic', 1920, 1080, s1.size, cm);
near(lwn.rows[1].roleTop - lwn.rows[0].roleTop, 123 + 33.6, 1e-9, 'name wrap');
// Full frame column: 78 % W, 30 % W wide, title landing cap centre 28 % H.
const lf = G.tecCreditLayout(rows, 'full', 1920, 1080, s1.size, cm);
near(lf.colX, 0.78 * 1920, 1e-9, 'full column'); near(lf.colW, 576, 1e-9, 'full column width');
near(lf.rows[0].roleTop, 0.28 * 1080 + 86.4 + 105, 1e-9, 'full first role');
// Empty credits: only the title.
const l0 = G.tecCreditLayout([], 'classic', 1920, 1080, s1.size, cm);
assert.equal(l0.rows.length, 0); assert.equal(l0.lastRoleTop, null);

// Component contract.
for (const key of ['layout', 'fps', 'revealFrame', 'title', 'titleColor', 'creditColor', 'rows', 'rowCount', 'speedPxPerSec', 'speed', 'showTitle', 'fonts'])
  assert.ok(src.includes('data.' + key) || new RegExp(`\\bd\\.${key}\\b`).test(block), key);
assert.ok(src.includes('"#FBE4BB"') && src.includes('"#F0EBDD"'), 'default colours');
assert.ok(src.includes('scaleX(${TEC_TITLE.scaleX})') && /scaleX: 0\.78/.test(block), 'title scaleX 0.78');
assert.ok(src.includes('delayRender') && src.includes('continueRender'), 'waits for fonts');
assert.ok(src.includes('measureText'), 'measures real glyph advances');
const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l));
for (const l of imports) assert.match(l, /from "(react|remotion)";$/, 'only react/remotion imports: ' + l);
assert.ok(!/\bimport\b|=>\s*<|<\/|:\s*(number|string|any)\b/.test(block), 'pure block is plain JS');
// Fit speed: the last role's top reaches 7 % of H on the last frame; clamped to 0.6-1.6x 67 px/s; no rows = 67.
near(G.tecFitSpeed(1906, 980, 153, 29.97, 1080), (1906 - 75.6) / (827 / 29.97), 1e-9, 'fit speed, 10 rows');
near(G.tecFitSpeed(1906 * 2, 980, 153, 29.97, 2160), (1906 - 75.6) / (827 / 29.97), 1e-9, 'fit speed is in 1080p units');
assert.equal(G.tecFitSpeed(null, 980, 153, 29.97, 1080), 67);
assert.equal(G.tecFitSpeed(400, 980, 153, 29.97, 1080), 0.6 * 67);
assert.equal(G.tecFitSpeed(9000, 980, 153, 29.97, 1080), 1.6 * 67);
console.log(JSON.stringify({ graphic: 'ok' }));
