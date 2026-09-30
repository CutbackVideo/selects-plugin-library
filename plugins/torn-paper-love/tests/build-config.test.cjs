// plugins/torn-paper-love/tests/build-config.test.cjs
// The shared build config (panel + headless driver): plan state, assemble / decorate configs and readback expectations.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const configSource = read('build-config.js');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date, isFinite, isNaN };
vm.createContext(box);
const names = [...(read('planner.js') + '\n' + configSource).matchAll(/^(?:function\s+(tpl\w+)|const\s+(TPL_\w+))/gm)].map(m => m[1] || m[2]);
vm.runInContext(read('planner.js') + '\n' + configSource + ';globalThis.P={' + names.join(',') + '};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), (msg || '') + ' expected ' + b + ' got ' + a);

// The module sits between its embed markers and uses no module syntax.
assert.match(configSource, /\/\/ tpl-config:start\n[\s\S]*\/\/ tpl-config:end/);
assert.doesNotMatch(configSource, /^\s*(import|export)\s/m);
assert.doesNotMatch(configSource, /[\u3131-\uD79D]/, 'no Hangul');
assert.doesNotMatch(configSource, /\/Users\//, 'no local paths');

const manifest = JSON.parse(read('assets/cues/manifest.json'));
const cue = manifest.cues.find(c => c.id === 'easy-sunday-lofi');
const day = d => new Date(Date.UTC(2026, 0, d, 12)).toISOString();
// 7 measured photos (portrait, landscape, 4:3), 1 unmeasured photo, 3 analysed videos (one landscape, one portrait,
// one with no size). `order` is the Project order.
const photo = (rid, w, h, d, order) => ({ rid, name: rid + '.jpg', width: w, height: h, recordedAt: d ? day(d) : null, order, kind: 'photo' });
const video = (rid, dur, w, h, d, order) => ({ rid, name: rid + '.mov', duration: dur, width: w, height: h, recordedAt: d ? day(d) : null, order, kind: 'video' });
const inv = {
  photos: [photo('p1', 3000, 4000, 1, 0), photo('p2', 4000, 3000, 2, 1), photo('p3', 3024, 4032, 3, 2), photo('p4', 1440, 1080, 4, 3),
    photo('p5', 4032, 3024, 5, 4), photo('p6', 1080, 1920, 6, 5), photo('p7', 1920, 1080, null, 6), photo('px', null, null, 8, 7)],
  resources: [video('v1', 20, 1920, 1080, 9, 8), video('v2', 12, 1080, 1920, 10, 9), video('v3', 6, null, null, null, 10)],
  counts: { unanalysed: 0, missing: 0, unmeasured: 1 },
};
const found = { best: { v1: 4.4, v2: null, v3: 5.9 } };
const now = new Date(2026, 8, 30, 9, 5);
const defaults = { words: ['MY', 'LOVE'], backdrop: 'night', length: 'standard', pace: 'quick', clipSound: 'ambient', look: 0.6, tilt: false, useVideos: true, only: null, seed: 1, section: 'default' };
const plan = (o = {}, extra = {}) => j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue, options: { ...defaults, ...o }, now, ...extra }));

// Faithful assemble: every boundary at round((target + offset) * fps) from the planned targets (assemble.js).
const assembleAt = (s, fps) => {
  const off = P.tplMusicOffset(s.musicStart, fps);
  const frames = s.targets.map((t, k) => (k === 0 ? 0 : Math.round((t + off) * fps)));
  return { sequenceId: 'seq-1', fps, frames, totalFrames: frames[frames.length - 1], placed: s.slots.length, notes: [] };
};

// ---- Standard plan: 7 photos cover N = 7, so no video is used.
const s = plan();
assert.equal(s.ok, true, s.reason);
assert.equal(s.N, 7);
assert.equal(s.slots.length, 14);
assert.equal(s.targets.length, 15);
assert.equal(s.photoCount, 7);
assert.equal(s.videoCount, 0);
assert.ok(s.picks.every(p => p.kind === 'photo'), 'photos first');
assert.ok(!s.picks.some(p => p.rid === 'px'), 'the unmeasured photo is not eligible');
assert.equal(s.excluded.unmeasuredPhotos, 1);
// Order: recording date ascending, the undated photo last.
assert.deepEqual(s.picks.map(p => p.rid), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
assert.deepEqual(s.order, s.picks.map(p => p.identity));
// Pass 2 = pass 1.
assert.deepEqual(s.slots.slice(7).map(x => x.rid), s.slots.slice(0, 7).map(x => x.rid));
assert.deepEqual(s.slots.map(x => x.pass), [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]);
// Schedule at the nominal 30 fps for display, on the cue's grid, from the default (highest-energy) section.
assert.equal(s.schedule.fps, 30);
assert.equal(s.schedule.gridded, true);
assert.equal(s.gridded, true);
const bar = P.tplBarBeats(cue.bpm) * 60 / cue.bpm;
const videoSeconds = P.tplTemplate(7, 'quick').total * P.tplUnit(cue.bpm).unitSec;
assert.equal(s.sectionStart, P.tplDefaultSection({ bpm: cue.bpm, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy, videoSeconds }));
assert.equal(s.musicStart, s.sectionStart);
assert.ok(Math.abs(((s.sectionStart - cue.firstBeat) / bar) - Math.round((s.sectionStart - cue.firstBeat) / bar)) < 1e-9, 'section on a bar');
assert.equal(s.transitions.length, 14);
assert.equal(s.transitions[0].entry, 'slide');
assert.equal(s.transitions[10].entry, 'none', 'pass-2 shot 4 is a hard cut (no tear)');
assert.ok(!s.transitions.some(t => t.entry === 'tear' || t.exit === 'tear'), 'no tear transition');
assert.equal(s.draftName, 'Torn Paper Love Night Standard 2026-09-30 09:05:00');
assert.equal(P.tplDraftName('night', 'standard', new Date(2026, 8, 30, 9, 5, 7).getTime()), 'Torn Paper Love Night Standard 2026-09-30 09:05:07', 'seconds in the name');
assert.notEqual(P.tplDraftName('kraft', 'short', new Date(2026, 8, 30, 9, 5, 7).getTime()), P.tplDraftName('kraft', 'short', new Date(2026, 8, 30, 9, 5, 48).getTime()), 'two versions in one minute get distinct names');
assert.equal(plan({ backdrop: 'red', length: 'long' }).draftName.slice(0, 33), 'Torn Paper Love Red curtain Long ');
assert.ok(s.seconds > 6 && s.seconds < 6.6, 'about 6.3 s: ' + s.seconds);
// Nothing in the state is lost by JSON (the panel and the driver both serialise it).
assert.deepEqual(j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue, options: defaults, now })), s);
// Deterministic.
assert.deepEqual(plan(), s);

// ---- Long needs 10: 7 photos + 3 video windows.
const L = plan({ length: 'long' });
assert.equal(L.ok, true, L.reason);
assert.equal(L.N, 10);
assert.equal(L.videoCount, 3);
assert.equal(L.photoCount, 7);
for (const p of L.picks.filter(k => k.kind === 'video')) {
  const both = L.slots.filter(x => x.rid === p.rid);
  assert.equal(both.length, 2);
  assert.equal(both[0].startSeconds, both[1].startSeconds, 'both passes start at S');
  assert.equal(both[0].identity, p.rid + '@' + p.startSeconds.toFixed(3), 'identity from the final window start');
  assert.ok(Math.abs(p.startSeconds * 30 - Math.round(p.startSeconds * 30)) < 1e-6, 'whole frame at 30');
  const longest = Math.max(...both.map(x => x.endFrame - x.startFrame));
  const dur = inv.resources.find(r => r.rid === p.rid).duration;
  assert.ok(p.startSeconds + longest / 30 + P.TPL_SOURCE_TAIL <= dur + 1e-9, 'window fits with the tail');
}
// A hit starts the window at the hit (whole frame); no hit = a filler on the 0.5 s grid.
assert.equal(L.picks.find(p => p.rid === 'v1').startSeconds, Math.floor(4.4 * 30 + 1e-6) / 30);
const v2 = L.picks.find(p => p.rid === 'v2').startSeconds;
assert.ok(P.tplFillers([{ rid: 'v2', sourceDuration: 12 }]).some(f => Math.abs(Math.floor(f.t * 30 + 1e-6) / 30 - v2) < 1e-9), 'v2 filler (whole frame) ' + v2);
// v3 (6 s, hit at 5.9) slides back so the longest slot + tail fits.
const v3 = L.picks.find(p => p.rid === 'v3').startSeconds;
assert.ok(v3 < 5.9);
// The filler is seeded: another seed may choose another window, the same seed the same one.
assert.equal(plan({ length: 'long' }).picks.find(p => p.rid === 'v2').startSeconds, v2);

// ---- Videos only when photos run short, and only with Use videos.
const Lnv = plan({ length: 'long', useVideos: false });
assert.equal(Lnv.ok, true);
assert.equal(Lnv.N, 7);
assert.equal(Lnv.fitReason, 'pictures');
assert.equal(Lnv.videoCount, 0);
// A video shorter than the longest slot + tail is not eligible (and counted).
const shortInv = j(inv);
shortInv.resources.push(video('v4', 0.5, 1920, 1080, 11, 11));
const Ls = j(P.tplPlanState({ projectId: 'proj', inv: shortInv, found, cue, options: { ...defaults, length: 'long' }, now }));
assert.equal(Ls.excluded.shortVideos, 1);
assert.ok(!Ls.picks.some(p => p.rid === 'v4'));
// "Choose clips" narrows the pool.
const only = plan({ only: ['p1', 'p2', 'p3', 'p4', 'v1'] });
assert.equal(only.N, 5);
assert.deepEqual(only.picks.map(p => p.rid).sort(), ['p1', 'p2', 'p3', 'p4', 'v1']);

// ---- Assemble config.
const A = j(P.tplAssembleConfig(s, { resourceId: 'm1' }));
assert.equal(A.projectId, 'proj');
assert.equal(A.draftName, s.draftName);
assert.deepEqual(A.targets, s.targets);
assert.equal(A.slots.length, 14);
assert.deepEqual(A.slots[0], { rid: 'p1', kind: 'photo', startSeconds: 0 });
assert.deepEqual(A.music, { resourceId: 'm1', sectionStart: s.musicStart });
assert.equal(A.clipSound, 'ambient');
assert.equal(A.ambientDb, -18);
assert.equal(A.W, 1440);
assert.equal(A.H, 1080);
assert.equal(A.vis.p1.anchorY, 0.4, 'portrait anchors at 40 %');
assert.equal(A.vis.p2.anchorY, 0.5);
assert.equal(A.vis.p1.cover, P.tplVisRect(3000, 4000).cover);
assert.equal(A.vis.p4.cover, 1, '4:3 needs no cover scale');
assert.ok(A.vis.p7.cover > 1);
assert.equal(Object.keys(A.vis).length, 7);
const AL = j(P.tplAssembleConfig(L, { resourceId: 'm1' }));
assert.ok(AL.vis.v1.cover > 1 && AL.vis.v1.anchorY === 0.5, 'videos get cover transforms too');
assert.equal(AL.vis.v2.anchorY, 0.4);
assert.equal(AL.vis.v3, undefined, 'unsized video: no transform (assemble notes it)');
assert.equal(AL.slots.find(x => x.rid === 'v1').startSeconds, L.picks.find(p => p.rid === 'v1').startSeconds);
assert.equal(P.tplAssembleConfig(s, null).music, null);

// ---- Decorate config at 25 and 29.97 fps: frames from the Draft, seeds per identity, phases at the real fps.
const looks = JSON.parse(read('assets/fonts/looks.json'));
const fonts = {};
for (const f of fs.readdirSync(path.join(root, 'assets/fonts')).filter(f => f.endsWith('.woff2.b64'))) {
  const face = f.replace(/^tpl-/, '').replace(/\.woff2\.b64$/, '');
  fonts[looks.faces[face]] = 'data:font/woff2;base64,' + read('assets/fonts/' + f).replace(/\s+/g, '');
}
const assets = { tornTsx: read('assets/torn-photo.tsx'), lettersTsx: read('assets/ransom-letters.tsx'), looks, fonts };
for (const [st, fps] of [[s, 25], [s, 29.97], [L, 25], [L, 29.97], [plan({ pace: 'relaxed', tilt: true, backdrop: 'photo' }), 29.97]]) {
  const a = assembleAt(st, fps);
  const D = j(P.tplDecorateConfig(st, a, assets));
  assert.equal(D.sequenceId, 'seq-1');
  assert.equal(D.mute, false);
  assert.deepEqual(D.photos.sort(), st.picks.filter(p => p.kind === 'photo').map(p => p.rid).sort());
  assert.equal(D.torn.tsx, assets.tornTsx);
  assert.equal(D.torn.clips.length, st.slots.length);
  assert.deepEqual(D.torn.clips.map(c => c.rid), st.slots.map(x => x.rid));
  const seedOf = {};
  D.torn.clips.forEach((c, i) => {
    const slot = st.slots[i], t = st.transitions[i], d = c.data;
    assert.equal(c.sourceStartSeconds, slot.kind === 'video' ? slot.startSeconds : 0);
    assert.equal(d.seed, P.tplSeedFor(slot.identity, st.options.seed) % 10000, "tear seed fits the 0-9999 Inspector field");
    if (seedOf[slot.identity] != null) assert.equal(d.seed, seedOf[slot.identity], 'both passes share the tear');
    seedOf[slot.identity] = d.seed;
    assert.equal(d.entry, t.entry);
    assert.equal(d.exit, t.exit);
    const phases = k => (k === 'none' || k === 'slide' ? [] : j(P.tplPhaseFrames(k, fps)));
    assert.deepEqual(d.phases, { entry: phases(t.entry), exit: phases(t.exit) });
    for (const ph of d.phases.entry.concat(d.phases.exit)) assert.ok(Number.isInteger(ph.start) && Number.isInteger(ph.end) && ph.end > ph.start);
    assert.equal(d.clock, P.TPL_EFFECT_CLOCK);
    assert.equal(d.clock, 'clip');
    assert.equal(d.motion, 'off');
    assert.equal(d.backdrop, st.options.backdrop);
    assert.equal(d.allowPhotoBackdrop, true);
    assert.equal(d.look, st.options.look);
    assert.equal(d.inset, 92);
    assert.equal(d.edge, 1.4);
    const sz = st.sizes[slot.rid];
    assert.deepEqual(d.vis, j(P.tplVisRect(sz ? sz.width : null, sz ? sz.height : null).vis));
    if (st.options.tilt) assert.ok(Math.abs(d.tilt) <= 1.5); else assert.equal(d.tilt, 0);
    assert.equal(d.holdFrames, undefined, 'decorate fills holdFrames from the Draft');
  });
  assert.equal(new Set(Object.values(seedOf)).size, Object.keys(seedOf).length, 'identities get distinct tears');
  if (st.options.tilt) {
    assert.ok(D.torn.clips.filter(c => c.data.tilt !== 0).length >= D.torn.clips.length / 2, 'tilt on tilts');
    const tilts = {};
    D.torn.clips.forEach((c, i) => { const id = st.slots[i].identity; if (tilts[id] != null) assert.equal(c.data.tilt, tilts[id]); tilts[id] = c.data.tilt; });
  }
  // Letters: over [frames[1], end), ticks relative to the start, increasing, inside the range, on the unit grid.
  const Lt = D.letters;
  assert.equal(Lt.startFrame, a.frames[1]);
  assert.equal(Lt.endFrame, a.totalFrames);
  const ticks = Lt.parameters.ticks;
  assert.ok(ticks.length > 0);
  assert.ok(ticks.every((t, i) => Number.isInteger(t) && t > 0 && t < Lt.endFrame - Lt.startFrame && (i === 0 || t > ticks[i - 1])), JSON.stringify(ticks));
  const step = st.options.pace === 'relaxed' ? 2 : 1;
  const expectTicks = (st.schedule.units[st.schedule.units.length - 1] - st.schedule.units[1]) / step - 1;
  assert.equal(ticks.length, expectTicks, 'one tick per unit after the letters start (Relaxed: every doubled unit)');
  // A tick on a cut uses the cut's frame.
  for (let k = 2; k < a.frames.length - 1; k++) if ((st.schedule.units[k] - st.schedule.units[1]) % step === 0) assert.ok(ticks.includes(a.frames[k] - a.frames[1]), 'tick on cut ' + k);
  assert.equal(Lt.parameters.word1, 'MY');
  assert.equal(Lt.parameters.word2, 'LOVE');
  assert.equal(Lt.parameters.size, 6.0);
  assert.equal(Lt.parameters.y, 50);
  assert.equal(Lt.parameters.accent, '#d0201a');
  assert.equal(Lt.parameters.seed, st.options.seed);
  assert.equal(Lt.parameters.restyle, true);
  assert.deepEqual(Lt.parameters.looks, looks.looks);
  assert.deepEqual(Lt.parameters.advance, looks.advance);
  assert.deepEqual(Lt.parameters.faces, looks.faces);
  assert.deepEqual(Lt.parameters.fonts, fonts);
  assert.equal(Lt.tsx, assets.lettersTsx);
  assert.equal(D.timing.framesMatch, true);
}

// Editable definitions: only the SDK's types, with the fields each type needs.
{
  const D = j(P.tplDecorateConfig(s, assembleAt(s, 30), assets));
  const check = list => {
    for (const e of list) {
      assert.ok(typeof e.key === 'string' && typeof e.label === 'string', JSON.stringify(e));
      if (e.type === 'number') assert.ok(typeof e.defaultValue === 'number' && typeof e.min === 'number' && typeof e.max === 'number' && typeof e.step === 'number' && e.min <= e.defaultValue && e.defaultValue <= e.max, JSON.stringify(e));
      else if (e.type === 'text' || e.type === 'color') assert.equal(typeof e.defaultValue, 'string');
      else if (e.type === 'boolean') assert.equal(typeof e.defaultValue, 'boolean');
      else if (e.type === 'select') assert.ok(e.options.some(o => o.value === e.defaultValue) && e.options.every(o => typeof o.label === 'string' && typeof o.value === 'string'));
      else assert.fail('unknown editable type ' + e.type);
      if (e.type === 'color') assert.match(e.defaultValue, /^#[0-9a-f]{6}$/i);
    }
    return Object.fromEntries(list.map(e => [e.label, e]));
  };
  const T = check(D.torn.editable);
  assert.deepEqual(Object.keys(T), ['Faded film', 'Backdrop colour', 'Edge width', 'Photo size', 'Tilt', 'Tear seed', 'Photo motion', 'Motion strength']);
  assert.deepEqual([T['Faded film'].key, T['Faded film'].min, T['Faded film'].max, T['Faded film'].defaultValue], ['look', 0, 1, 0.6]);
  assert.deepEqual([T['Backdrop colour'].key, T['Backdrop colour'].defaultValue], ['backdropColor', '#151113']);
  assert.deepEqual([T['Edge width'].key, T['Edge width'].min, T['Edge width'].max], ['edge', 0.5, 3]);
  assert.deepEqual([T['Photo size'].key, T['Photo size'].min, T['Photo size'].max, T['Photo size'].defaultValue], ['inset', 70, 95, 92]);
  assert.deepEqual([T['Tilt'].key, T['Tilt'].min, T['Tilt'].max], ['tilt', -5, 5]);
  assert.equal(T['Tear seed'].key, 'seed');
  assert.deepEqual(T['Photo motion'].options.map(o => o.value), ['off', 'push-in', 'pull-out', 'drift']);
  assert.equal(T['Motion strength'].key, 'motionStrength');
  const Lx = check(D.letters.editable);
  assert.deepEqual(Object.keys(Lx), ['Word 1', 'Word 2', 'Size', 'Vertical position', 'Accent colour', 'Letter seed', 'Re-style']);
  assert.deepEqual(D.letters.editable.map(e => e.key), ['word1', 'word2', 'size', 'y', 'accent', 'seed', 'restyle']);
  assert.deepEqual([Lx['Vertical position'].min, Lx['Vertical position'].max], [30, 70]);
  assert.equal(Lx['Re-style'].type, 'boolean');
  // Every editable key is a data key the graphics read.
  for (const e of D.torn.editable) assert.ok(e.key in D.torn.clips[0].data, 'torn data has ' + e.key);
  for (const e of D.letters.editable) assert.ok(e.key in D.letters.parameters, 'letters parameters have ' + e.key);
  // Backdrop colour default follows the preset; Off clip sound mutes; look off = 0.
  assert.equal(j(P.tplDecorateConfig(plan({ backdrop: 'kraft' }), assembleAt(s, 30), assets)).torn.editable.find(e => e.key === 'backdropColor').defaultValue, '#6b5a45');
  const off = plan({ clipSound: 'off', look: 0 });
  const Doff = j(P.tplDecorateConfig(off, assembleAt(off, 30), assets));
  assert.equal(Doff.mute, true);
  assert.ok(Doff.torn.clips.every(c => c.data.look === 0));
}

// The Torn photo effect reads the data as intended (its own normaliser, tplData): nothing is clamped or defaulted.
{
  const src = read('assets/torn-photo.tsx');
  const block = src.slice(src.indexOf('// tpl-torn:start'), src.indexOf('// tpl-torn:end'));
  const tb = { Math, Number, Array, String, JSON, Object, isFinite };
  vm.createContext(tb);
  vm.runInContext(block + ';globalThis.T={tplData};', tb);
  const st = plan({ tilt: true, backdrop: 'photo', look: 0.5 });
  const a = assembleAt(st, 25);
  const D = j(P.tplDecorateConfig(st, a, assets));
  D.torn.clips.forEach((c, i) => {
    const hold = a.frames[i + 1] - a.frames[i];
    const n = j(tb.T.tplData({ ...c.data, holdFrames: hold, originFrame: 0 }));
    assert.equal(n.seed, c.data.seed);
    assert.equal(n.inset, 0.92);
    assert.equal(n.edge, 1.4);
    assert.equal(n.backdrop, 'photo');
    assert.equal(n.allowPhotoBackdrop, true);
    assert.equal(n.look, 0.5);
    assert.equal(n.tilt, c.data.tilt);
    assert.equal(n.clock, 'clip');
    assert.equal(n.motion, 'off');
    assert.deepEqual(n.vis, c.data.vis);
    assert.deepEqual(n.phases, c.data.phases, 'phases pass the effect filter unchanged');
    assert.equal(n.entry, c.data.entry);
    // Every phase fits its clip.
    for (const ph of n.phases.entry.concat(n.phases.exit)) assert.ok(ph.end <= hold, 'phase within the clip ' + i);
  });
}

// When the Draft's frames differ from the planned ones (rounding), the Draft wins.
{
  const a = assembleAt(s, 25);
  a.frames = a.frames.slice();
  a.frames[1] += 1; a.frames[3] -= 1;
  const D = j(P.tplDecorateConfig(s, a, assets));
  assert.equal(D.timing.framesMatch, false);
  assert.equal(D.letters.startFrame, a.frames[1]);
  assert.ok(D.letters.parameters.ticks.includes(a.frames[3] - a.frames[1]));
  // Different clip count than planned: refuse.
  assert.throws(() => P.tplDecorateConfig(s, { ...a, frames: a.frames.slice(1) }, assets), /frames/);
}

// Payload: decorate.js with the config filled like the driver / panel (JSON.parse of a JSON string), real fonts.
{
  const D = j(P.tplDecorateConfig(L, assembleAt(L, 29.97), assets));
  const filled = read('scripts/decorate.js').replace('__CONFIG__', () => 'JSON.parse(' + JSON.stringify(JSON.stringify(D)) + ')');
  assert.ok(filled.length < 250 * 1024, 'decorate payload ' + filled.length);
  console.log('decorate payload (Long, real fonts): ' + Math.round(filled.length / 1024) + ' KB');
}

// ---- Readback expectations.
{
  const a = assembleAt(s, 29.97);
  const E = j(P.tplExpected(s, a, { resourceId: 'm1' }));
  assert.deepEqual(E.frameSize, { width: 1440, height: 1080 });
  assert.equal(E.fps, 29.97);
  assert.deepEqual(E.cuts, a.frames.slice(1), 'cuts = the planned targets at the real fps = what a faithful assemble places');
  assert.equal(E.noAdjacent, true);
  assert.deepEqual(E.graphics, [{ name: 'Ransom letters', count: 1, startFrame: a.frames[1], endFrame: a.totalFrames }]);
  assert.deepEqual(E.effects, [{ name: 'Torn photo', perMainClip: 1 }]);
  assert.deepEqual(E.music, { resourceId: 'm1', db: 0, fadeOutSeconds: 0.12 });
  // Photos keep 0 dB under Ambient (assemble lowers videos only), so a level check applies to all-video builds only.
  assert.equal(E.clipSound, undefined);
  const off = plan({ clipSound: 'off' });
  assert.deepEqual(j(P.tplExpected(off, assembleAt(off, 30), null)).clipSound, { mode: 'off' });
  const vidInv = { photos: [], resources: [video('v1', 20, 1920, 1080, 1, 0), video('v2', 12, 1080, 1920, 2, 1), video('v3', 9, 1920, 1080, 3, 2)] };
  const vs = j(P.tplPlanState({ projectId: 'proj', inv: vidInv, found, cue, options: { ...defaults, length: 'short' }, now }));
  assert.equal(vs.ok, true, vs.reason);
  assert.equal(vs.N, 3);
  assert.deepEqual(j(P.tplExpected(vs, assembleAt(vs, 30), { resourceId: 'm1' })).clipSound, { mode: 'level', db: -18 });
  const full = j(P.tplPlanState({ projectId: 'proj', inv: vidInv, found, cue, options: { ...defaults, length: 'short', clipSound: 'full' }, now }));
  assert.deepEqual(j(P.tplExpected(full, assembleAt(full, 30), { resourceId: 'm1' })).clipSound, { mode: 'level', db: 0 });
  // No adjacent repeat even with 3 videos.
  assert.ok(vs.slots.every((x, i) => i === 0 || x.rid !== vs.slots[i - 1].rid));
}

// ---- The real assemble.js takes the config, and places the cuts tplExpected expects (a Draft that adopts 25 fps).
const runAssemble = async (st, adoptFps) => {
  const cfg = j(P.tplAssembleConfig(st, st.cue ? { resourceId: 'm1' } : null));
  const src = read('scripts/assemble.js').replace('__CONFIG__', () => 'JSON.parse(' + JSON.stringify(JSON.stringify(cfg)) + ')');
  let fps = 30;
  const newDraft = () => {
    const clips = [];
    let inserted = false, size = { width: 1440, height: 1080 };
    return {
      meta: async () => ({ fps, frameSize: { ...size } }),
      setFrameSize: async s2 => { size = { ...s2 }; },
      insertResource: async ({ resourceId, sourceRange }) => {
        if (!inserted) { inserted = true; fps = adoptFps; size = { width: 1920, height: 1080 }; }
        const at = clips.filter(c => c.trackKind === 'main').reduce((m, c) => Math.max(m, c.endFrame), 0);
        clips.push({ clipId: clips.length + 1, resourceId, trackKind: 'main', startFrame: at, endFrame: at + Math.round((sourceRange.endSeconds - sourceRange.startSeconds) * fps) });
      },
      clips: async ({ trackScope } = {}) => clips.filter(c => trackScope !== 'main' || c.trackKind === 'main').map(c => ({ ...c })),
      setClipTransform: async () => {}, setClipAudio: async () => {}, rangeAtFrames: async (a, b) => ({ a, b }),
      overlayResource: async o => { clips.push({ clipId: 99, resourceId: 'm1', trackKind: 'audio', startFrame: 0, endFrame: o.over.b }); },
      commitAll: async () => ({ createdDraftId: 'seq-1' }),
    };
  };
  return new Function('selects', 'return (async()=>{' + src + '})();')({ project: () => ({ createDraft: async () => newDraft(), resource: id => ({ id }) }) });
};
const assembleChecks = (async () => {
  for (const [st, f] of [[s, 25], [L, 29.97], [plan({ pace: 'relaxed' }), 25]]) {
    const a = await runAssemble(st, f);
    assert.equal(a.fps, f);
    assert.equal(a.placed, st.slots.length);
    assert.deepEqual(j(P.tplExpected(st, a, { resourceId: 'm1' })).cuts, a.frames.slice(1), 'expected cuts = assemble.js cuts at ' + f);
    assert.equal(j(P.tplDecorateConfig(st, a, assets)).timing.framesMatch, true);
  }
})();

// ---- No music: fixed 0.35 s unit, no section, no music clip.
{
  const n = j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue: null, options: defaults, now }));
  assert.equal(n.ok, true, n.reason);
  assert.equal(n.N, 7);
  assert.equal(n.gridded, false);
  assert.equal(n.musicStart, null);
  assert.equal(n.sectionStart, 0);
  assert.equal(n.schedule.unitSec, 0.35);
  assert.deepEqual(n.schedule.frames, n.schedule.units.map(u => Math.round(u * 0.35 * 30)));
  assert.equal(P.tplAssembleConfig(n, null).music, null);
  const a = assembleAt(n, 25);
  assert.deepEqual(a.frames, n.schedule.units.map(u => Math.round(u * 0.35 * 25)));
  const E = j(P.tplExpected(n, a, null));
  assert.deepEqual(E.music, { none: true });
  const D = j(P.tplDecorateConfig(n, a, assets));
  assert.ok(D.letters.parameters.ticks.every(t => t > 0 && t < D.letters.endFrame - D.letters.startFrame));
  // A numeric section is ignored without music.
  assert.equal(j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue: null, options: { ...defaults, section: 12 }, now })).sectionStart, 0);
}

// ---- Own music, as the panel passes it (ownCue).
{
  const own = (g, extra) => ({ id: 'own', label: 'own.mp3', file: null, usableEnd: 60, beatEnergy: [], onsets: [], onsetThresholds: null, ...g, ...extra });
  // Beat faint ('approximate' at 120 BPM, first beat 0.43 s): the cuts run on the 0.25 s 8th from a bar of that tempo
  // (2 s at 8 units), not on the fixed 0.35 s; the grid is still not accepted (gridded false).
  const ap = own({ bpm: 120, accepted: false, approxBpm: 120, firstBeat: 0.43 });
  const g = P.tplGrid(ap);
  assert.equal(g.approxBpm, 120);
  near(P.tplUnitSec(g), 0.25);
  assert.equal(P.tplSectionTempo(g), 120);
  for (const [section, start] of [['default', 0.43], [0, 0.43], [9.1, 8.43], [1e6, 0.43 + 27 * 2]]) {
    const st = j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue: ap, options: { ...defaults, section }, now }));
    assert.equal(st.ok, true, st.reason);
    assert.equal(st.gridded, false);
    near(st.unitSec, 0.25);
    near(st.musicStart, start, 1e-9, 'section ' + section);
    assert.deepEqual(st.targets.map((t, k) => Math.round((t - st.schedule.units[k] * 0.25) * 1e9)), st.targets.map(() => 0), 'cuts on the 8th');
  }
  // Tempo out of the unit range: the fixed 0.35 s and 0.1 s section steps, as without a tempo.
  const slow = own({ bpm: 40, accepted: false, approxBpm: 40, firstBeat: 0.43 });
  assert.equal(P.tplSectionTempo(P.tplGrid(slow)), null);
  const ss = j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue: slow, options: { ...defaults, section: 9.14 }, now }));
  assert.equal(ss.unitSec, 0.35); near(ss.musicStart, 9.1, 1e-9);
  // No steady beat (the panel's stand-in tempo, first beat 0): fixed 0.35 s, 0.1 s section steps.
  const none = own({ bpm: 85.6, accepted: false, firstBeat: 0 });
  assert.equal(P.tplGrid(none).approxBpm, null);
  const sn = j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue: none, options: { ...defaults, section: 9.14 }, now }));
  assert.equal(sn.gridded, false); assert.equal(sn.unitSec, 0.35); near(sn.musicStart, 9.1, 1e-9);
  // Accepted at 120 BPM: the grid on the 8th (the old unit range had no unit at 120 BPM and fell back to 0.35 s).
  const acc = j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue: own({ bpm: 120, accepted: true, firstBeat: 0.43 }), options: defaults, now }));
  assert.equal(acc.gridded, true); near(acc.unitSec, 0.25); near(acc.musicStart, 0.43, 1e-9);
  // Bundled cues carry no approxBpm.
  for (const c of manifest.cues) assert.equal(P.tplGrid(c).approxBpm, null, c.id);
}

// ---- Sections: early (0) snaps to the first bar; late clamps to the last bar that fits.
{
  const e = plan({ section: 0 });
  assert.equal(e.sectionStart, cue.firstBeat);
  const l = plan({ section: 1e6 });
  assert.ok(l.sectionStart > s.sectionStart - 1e-9 && l.sectionStart + l.seconds <= cue.usableEnd + 1e-6, 'late ' + l.sectionStart);
  const k = (l.sectionStart - cue.firstBeat) / bar;
  assert.ok(Math.abs(k - Math.round(k)) < 1e-9);
  assert.ok(l.sectionStart + bar + l.seconds > cue.usableEnd, 'no later bar fits');
}

// ---- Not buildable: user-facing reasons.
{
  const few = { photos: [photo('p1', 3000, 4000, 1, 0), photo('p2', 4000, 3000, 2, 1), photo('px', null, null, 3, 2)], resources: [] };
  const r = j(P.tplPlanState({ projectId: 'proj', inv: few, found: {}, cue, options: defaults, now }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'Add at least 3 photos or clips');
  // Two photos + a video, but Use videos is off.
  const r2 = j(P.tplPlanState({ projectId: 'proj', inv: { photos: few.photos, resources: [video('v1', 20, 1920, 1080, 1, 3)] }, found: {}, cue, options: { ...defaults, useVideos: false }, now }));
  assert.equal(r2.ok, false);
  assert.match(r2.reason, /at least 3/);
  // A track too short for even 3 pictures from its section start.
  const tiny = { ...cue, usableEnd: 2.5 };
  const r3 = j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue: tiny, options: defaults, now }));
  assert.equal(r3.ok, false);
  const need = P.tplTemplate(3, 'quick').total * P.tplUnit(cue.bpm).unitSec;
  assert.equal(r3.reason, 'This track needs at least ' + need.toFixed(1) + ' s from the section start');
  // A shorter track fits fewer pictures: N drops for the music.
  const mid = { ...cue, usableEnd: cue.firstBeat + P.tplTemplate(5, 'quick').total * P.tplUnit(cue.bpm).unitSec + 0.01 };
  const r4 = j(P.tplPlanState({ projectId: 'proj', inv: j(inv), found, cue: mid, options: defaults, now }));
  assert.equal(r4.ok, true);
  assert.equal(r4.N, 5);
  assert.equal(r4.fitReason, 'music');
  // Both words empty.
  const r5 = plan({ words: ['  ', ''] });
  assert.equal(r5.ok, false);
  assert.equal(r5.reason, 'Type at least one word');
  // One empty word is fine, and a long name is kept for the graphic to fit.
  const r6 = plan({ words: ['JENNIFER', ''] });
  assert.equal(r6.ok, true);
  const D6 = j(P.tplDecorateConfig(r6, assembleAt(r6, 30), assets));
  assert.equal(D6.letters.parameters.word1, 'JENNIFER');
  assert.equal(D6.letters.parameters.word2, '');
}

assembleChecks.then(() => console.log(JSON.stringify({ buildConfig: 'ok' }))).catch(e => { console.error(e); process.exit(1); });
