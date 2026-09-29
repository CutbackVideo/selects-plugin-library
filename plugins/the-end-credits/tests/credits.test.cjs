// plugins/the-end-credits/tests/credits.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={TEC_PRESETS,TEC_PRESET_ORDER,TEC_DEFAULT_PRESET,TEC_FILM_CREW_ROLES,TEC_CREDIT_METRICS,tecPresetRows,tecPersonalDefaults,tecTravelDefaults,tecCleanRows,tecPlaceholderRows,tecSuggestPlace,tecDateRange,tecMomentsText,tecMusicCredit,tecFitLine,tecCreditLayout,tecRollSpeed,tecTitleExitSec,tecVideoSeconds};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, (msg || '') + ' expected ' + b + ' got ' + a);
let checks = 0;
const t = (name, fn) => { fn(); checks++; };
const DASH = '\u2013', DOT = '\u00b7';
// Fixed-width stub: every character is 0.55 em wide.
const measure = (text, px) => Array.from(text).length * px * 0.55;
const crew = () => j(P.tecPresetRows('filmCrew'));
const p62 = 240 / 62, standardEnd = P.tecVideoSeconds(7, p62);
const rowsOf = k => crew().slice(0, k);
const speedFor = (k, endSec, H) => {
  const lay = P.tecCreditLayout({ rows: rowsOf(k), layout: 'classic', H: H || 1080, measure });
  return j(P.tecRollSpeed({ layout: 'classic', endSec, L: 5.1, H: H || 1080, lastRoleStartY: lay.lastRoleTop, rowTops: lay.rowTops }));
};

t('presets: Film crew is the default, the 10 reference rows', () => {
  assert.equal(P.TEC_DEFAULT_PRESET, 'filmCrew');
  assert.deepEqual(j(P.TEC_PRESET_ORDER), ['filmCrew', 'personal', 'travel']);
  assert.deepEqual(Object.keys(P.TEC_PRESETS).sort(), ['filmCrew', 'personal', 'travel']);
  const rows = crew();
  assert.deepEqual(rows.map(r => r.role), ['Director', 'Screenwriter', 'Editor', 'Original Score by', 'Production Designer', 'Costume Designer',
    'Visual Effects Supervisor', 'Sound Designer', 'Makeup Artist', 'Lighting Technician']);
  assert.ok(rows.every(r => r.name === '[Name Here]'));
  // A fresh array every call (the editor mutates its copy).
  const a = P.tecPresetRows('filmCrew'); a[0].name = 'X';
  assert.equal(P.tecPresetRows('filmCrew')[0].name, '[Name Here]');
  assert.deepEqual(j(P.tecPresetRows('nope')), rows);
  assert.equal(j(P.tecPlaceholderRows(rows)).length, 10);
});

t('personal defaults from Project info', () => {
  const info = { projectName: 'Lisbon', dates: ['2026-09-14T08:00:00', '2026-09-12T10:00:00Z', null, 'garbage', '2026-09-13'], cueTitle: 'Golden Hour', clips: 7, photos: 2 };
  assert.deepEqual(j(P.tecPersonalDefaults(info)), [
    { role: 'A film by', name: '[Your name]' },
    { role: 'Filmed in', name: 'Lisbon' },
    { role: 'Filmed on', name: 'Sep 12' + DASH + '14, 2026' },
    { role: 'Starring', name: '[Names]' },
    { role: 'Music', name: 'Golden Hour (Selects library)' },
    { role: 'Moments', name: '7 clips ' + DOT + ' 2 photos' },
    { role: 'Edited with', name: 'Selects' },
    { role: 'Special thanks', name: '[Names]' },
  ]);
  assert.deepEqual(j(P.tecPresetRows('personal', info)), j(P.tecPersonalDefaults(info)));
  // Rows with no value are dropped: no place, no dates, no music, no footage.
  assert.deepEqual(j(P.tecPersonalDefaults({ projectName: 'Untitled Project', dates: [] })).map(r => r.role), ['A film by', 'Starring', 'Edited with', 'Special thanks']);
  assert.deepEqual(j(P.tecPersonalDefaults()).map(r => r.role), ['A film by', 'Starring', 'Edited with', 'Special thanks']);
  // Own music: the file name without its extension wins over a cue.
  const own = j(P.tecPersonalDefaults({ ownMusicName: 'my song.final.mp3', cueTitle: 'Golden Hour' }));
  assert.equal(own.find(r => r.role === 'Music').name, 'my song.final');
  assert.equal(j(P.tecPlaceholderRows(j(P.tecPersonalDefaults(info)))).length, 3);
});

t('travel defaults', () => {
  const rows = j(P.tecTravelDefaults({ projectName: 'Kyoto', cueTitle: 'Slow Tide', clips: 1, photos: 1 }));
  assert.deepEqual(rows.map(r => r.role), ['Directed by', 'Starring', 'Memories', 'Places', 'Music by', 'Special Thanks', 'Created with']);
  assert.equal(rows[2].name, '1 clip ' + DOT + ' 1 photo');
  assert.equal(rows[3].name, 'Kyoto');
  assert.equal(rows[4].name, 'Slow Tide (Selects library)');
  assert.equal(rows[6].name, 'Selects');
  assert.deepEqual(j(P.tecTravelDefaults({})).map(r => r.role), ['Directed by', 'Starring', 'Special Thanks', 'Created with']);
});

t('place, dates, moments helpers', () => {
  assert.equal(P.tecSuggestPlace('new_york-city'), 'new york city');
  assert.equal(P.tecSuggestPlace('Paris vlog'), '');
  assert.equal(P.tecSuggestPlace('2026 trip'), '');
  assert.equal(P.tecDateRange(['2026-09-12']), 'Sep 12, 2026');
  assert.equal(P.tecDateRange(['2026-09-28', '2026-10-02']), 'Sep 28 ' + DASH + ' Oct 2, 2026');
  assert.equal(P.tecDateRange(['2026-09-01', '2026-09-25']), 'September 2026');
  assert.equal(P.tecDateRange(['2026-09-01', '2026-11-25']), 'Sep ' + DASH + ' Nov 2026');
  assert.equal(P.tecDateRange(['2025-12-30', '2026-01-02']), 'Dec 30, 2025 ' + DASH + ' Jan 2, 2026');
  assert.equal(P.tecDateRange(['2025-06-30', '2026-01-02']), 'Jun 2025 ' + DASH + ' Jan 2026');
  assert.equal(P.tecDateRange([]), '');
  assert.equal(P.tecDateRange(['nope', null]), '');
  // A non-ISO date string still parses.
  assert.equal(P.tecDateRange(['September 12, 2026 10:00']), 'Sep 12, 2026');
  assert.equal(P.tecMomentsText(0, 0), '');
  assert.equal(P.tecMomentsText(3, 0), '3 clips');
  assert.equal(P.tecMomentsText(0, 4), '4 photos');
  assert.equal(P.tecMusicCredit({}), '');
});

t('clean rows drops rows where both fields are blank', () => {
  const rows = j(P.tecCleanRows([{ role: ' Director ', name: 'Ana' }, { role: '', name: '  ' }, null, { role: 'Editor', name: '' }, { name: 'Solo' }, { role: '   ' }]));
  assert.deepEqual(rows, [{ role: 'Director', name: 'Ana' }, { role: 'Editor', name: '' }, { role: '', name: 'Solo' }]);
  assert.deepEqual(j(P.tecCleanRows(undefined)), []);
  // Names are kept exactly as typed otherwise (no brackets added or case changes).
  assert.deepEqual(j(P.tecCleanRows([{ role: 'dp', name: 'mIxEd [x]' }])), [{ role: 'dp', name: 'mIxEd [x]' }]);
});

t('credit layout: Classic reference geometry', () => {
  const lay = j(P.tecCreditLayout({ rows: crew(), layout: 'classic', H: 1080, measure }));
  assert.equal(lay.W, 1920);
  near(lay.centerX, 0.223 * 1920, 1e-9); near(lay.maxWidth, 768, 1e-9);
  assert.deepEqual(lay.title, { top: 425, bottom: 598 });
  assert.equal(lay.firstRoleTop, 703, 'first role 105 px below the title');
  lay.rows.forEach((r, i) => {
    assert.equal(r.top, 703 + 123 * i); assert.equal(r.pitch, 123);
    assert.equal(r.role.top, r.top); assert.equal(r.name.top, r.top + 43);
    assert.equal(r.role.fontPx, 28); assert.equal(r.name.fontPx, 24);
    assert.equal(r.role.lines.length, 1); assert.equal(r.name.lines.length, 1);
  });
  assert.equal(lay.lastRoleTop, 703 + 9 * 123);
  assert.deepEqual(lay.rowTops, lay.rows.map(r => r.top));
  // Full frame: the right-third column, same vertical model.
  const full = j(P.tecCreditLayout({ rows: crew(), layout: 'full', H: 1080, measure }));
  near(full.centerX, 0.78 * 1920, 1e-9); near(full.maxWidth, 576, 1e-9);
  assert.deepEqual(full.rowTops, lay.rowTops);
  // Scaled by H / 1080.
  const small = j(P.tecCreditLayout({ rows: crew(), layout: 'classic', H: 720, measure }));
  near(small.firstRoleTop, 703 * 2 / 3, 1e-9); near(small.rows[1].top - small.rows[0].top, 82, 1e-9); near(small.rows[0].role.fontPx, 28 * 2 / 3, 1e-9);
  // No rows.
  const none = j(P.tecCreditLayout({ rows: [], layout: 'classic', H: 1080, measure }));
  assert.equal(none.lastRoleTop, null); assert.deepEqual(none.rows, []);
  assert.throws(() => P.tecCreditLayout({ rows: [], H: 1080 }));
});

t('long lines fit down to 70 %, then wrap to 2 lines and grow the pitch', () => {
  // 60 characters at 28 px = 924 px > 768: fitted to 768 px (83 %), one line.
  const fit = j(P.tecFitLine('x'.repeat(60), 28, 768, measure, 'role'));
  assert.equal(fit.lines.length, 1); near(fit.scale, 768 / 924, 1e-9); near(fit.fontPx, 28 * 768 / 924, 1e-9); assert.equal(fit.overflow, false);
  // Exactly the 70 % floor still fits on one line.
  const floor = j(P.tecFitLine('x'.repeat(Math.floor(768 / (28 * 0.55 * 0.7))), 28, 768, measure, 'role'));
  assert.equal(floor.lines.length, 1); assert.ok(floor.scale >= 0.7 - 1e-9);
  // 15 words of 5 letters + spaces = 89 characters: 70 % is still too wide, so it wraps into two balanced lines.
  const long = Array.from({ length: 15 }, () => 'abcde').join(' ');
  const wrap = j(P.tecFitLine(long, 28, 768, measure, 'role'));
  assert.equal(wrap.lines.length, 2); assert.equal(wrap.lines.join(' '), long);
  assert.ok(Math.abs(wrap.lines[0].length - wrap.lines[1].length) <= 6);
  assert.equal(wrap.scale, 1); assert.equal(wrap.overflow, false);
  // One unbreakable word: 70 % and flagged.
  const word = j(P.tecFitLine('x'.repeat(120), 28, 768, measure, 'role'));
  assert.equal(word.lines.length, 1); assert.equal(word.scale, 0.7); assert.equal(word.overflow, true);
  assert.deepEqual(j(P.tecFitLine('', 24, 768, measure, 'name')).lines, []);
  // In the layout the wrapped role pushes its name and the next pair down by one role line (36 px).
  const lay = j(P.tecCreditLayout({ rows: [{ role: long, name: 'Ana' }, { role: 'Editor', name: long }, { role: 'Sound', name: 'Bo' }], layout: 'classic', H: 1080, measure }));
  assert.equal(lay.rows[0].role.lines.length, 2);
  assert.equal(lay.rows[0].name.top, 703 + 43 + 36);
  assert.equal(lay.rows[0].pitch, 123 + 36);
  assert.equal(lay.rows[1].top, 703 + 159);
  // A wrapped name grows its pair by one name line (31 px).
  assert.equal(lay.rows[1].name.lines.length, 2); assert.equal(lay.rows[1].pitch, 123 + 31);
  assert.equal(lay.rows[2].top, 703 + 159 + 154);
  // Full frame's narrower column (576 px) wraps sooner.
  const mid = 'x'.repeat(40); // 616 px: fits Classic, fitted in Full frame (93.5 %)
  assert.equal(j(P.tecFitLine(mid, 28, 768, measure, 'role')).scale, 1);
  near(j(P.tecFitLine(mid, 28, 576, measure, 'role')).scale, 576 / 616, 1e-9);
});

t('roll speed at Standard, 62 bpm: Codex figures within 0.5 px/s (R5/R7)', () => {
  near(standardEnd, 32.6968, 1e-4);
  const k10 = speedFor(10, standardEnd), k8 = speedFor(8, standardEnd), k5 = speedFor(5, standardEnd), k4 = speedFor(4, standardEnd), k0 = speedFor(0, standardEnd);
  near(k10.pxPerSec, 62.70, 0.5); assert.equal(k10.clamped, null);
  near(k8.pxPerSec, 53.79, 0.5); assert.equal(k8.clamped, null);
  near(k5.pxPerSec, 40.42, 0.5); assert.equal(k5.clamped, null, 'K = 5 is just above the 0.6x clamp');
  assert.equal(k4.pxPerSec, 67 * 0.6); assert.equal(k4.clamped, 'low'); assert.equal(k4.endsEarly, true);
  assert.equal(k0.pxPerSec, 67); assert.equal(k0.rawPxPerSec, null); assert.equal(k0.clamped, null); assert.equal(k0.endsEarly, false);
  // The exact model: the last role's top reaches 0.07 H at the end.
  near(k10.rawPxPerSec, (703 + 9 * 123 - 0.07 * 1080) / (standardEnd - 5.1), 1e-9);
  near(703 + 9 * 123 - k10.pxPerSec * (standardEnd - 5.1), 75.6, 1e-6);
  assert.deepEqual(k10.hiddenRows, []); assert.equal(k10.removeRows, 0);
  near(k10.minPxPerSec, 40.2, 1e-9); near(k10.maxPxPerSec, 107.2, 1e-9);
  // Scaled by H / 1080.
  near(speedFor(10, standardEnd, 720).pxPerSec, k10.pxPerSec * 2 / 3, 1e-9);
  near(speedFor(0, standardEnd, 720).pxPerSec, 67 * 2 / 3, 1e-9);
  // The title exit depends on the row count: about 14.6 s with 10 rows, about 19.9 s with 4 or fewer.
  const lay = P.tecCreditLayout({ rows: rowsOf(10), layout: 'classic', H: 1080, measure });
  near(P.tecTitleExitSec(lay, k10.pxPerSec, 5.1), 14.6, 0.15);
  near(P.tecTitleExitSec(lay, k4.pxPerSec, 5.1), 19.9, 0.15);
});

t('roll speed: too many rows clamp high and name the hidden rows', () => {
  const shortEnd = P.tecVideoSeconds(5, 3.9), span = shortEnd - 5.1;
  const rows = Array.from({ length: 30 }, (_, i) => ({ role: 'Role ' + i, name: 'Name ' + i }));
  const lay = P.tecCreditLayout({ rows, layout: 'classic', H: 1080, measure });
  const s = j(P.tecRollSpeed({ endSec: shortEnd, L: 5.1, H: 1080, lastRoleStartY: lay.lastRoleTop, rowTops: lay.rowTops }));
  assert.equal(s.clamped, 'high'); near(s.pxPerSec, 107.2, 1e-9); assert.equal(s.endsEarly, false);
  // A row is hidden when its top is still at or below the frame bottom at the end.
  const expectHidden = j(lay.rowTops).map((y, i) => [y, i]).filter(([y]) => y - 107.2 * span >= 1080).map(([, i]) => i);
  assert.deepEqual(s.hiddenRows, expectHidden);
  assert.ok(s.hiddenRows.length > 0 && s.hiddenRows[s.hiddenRows.length - 1] === 29);
  for (let i = 1; i < s.hiddenRows.length; i++) assert.equal(s.hiddenRows[i], s.hiddenRows[i - 1] + 1, 'the hidden rows are the tail');
  // removeRows: dropping that many rows brings the raw speed inside the clamp, one fewer does not.
  const keep = 30 - s.removeRows;
  assert.ok((lay.rowTops[keep - 1] - 75.6) / span <= 107.2 + 1e-9);
  assert.ok((lay.rowTops[keep] - 75.6) / span > 107.2);
  // The same rows at Long fit better (the panel's "Choose Long" suggestion).
  const longEnd = P.tecVideoSeconds(10, 3.9);
  assert.ok(j(P.tecRollSpeed({ endSec: longEnd, L: 5.1, H: 1080, lastRoleStartY: lay.lastRoleTop, rowTops: lay.rowTops })).hiddenRows.length < s.hiddenRows.length);
});

t('credit metrics are the reference numbers', () => {
  const M = j(P.TEC_CREDIT_METRICS);
  assert.equal(M.titleTop, 425); assert.equal(M.titleCap, 173); assert.equal(M.titleToFirstRole, 105);
  assert.equal(M.roleSize, 28); assert.equal(M.nameSize, 24); assert.equal(M.roleToName, 43); assert.equal(M.pairPitch, 123);
  assert.equal(M.minFit, 0.7); assert.equal(M.endY, 0.07); assert.equal(M.basePxPerSec, 67);
  assert.deepEqual([M.minSpeed, M.maxSpeed], [0.6, 1.6]);
  assert.deepEqual(M.classic, { centerX: 0.223, maxWidth: 0.4 }); assert.deepEqual(M.full, { centerX: 0.78, maxWidth: 0.3 });
});

console.log('credits.test.cjs: ' + checks + ' checks passed');
