// Talk Audio Cleanup: the Panel's settings logic and the Draft scripts it sends, against a fake Draft.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../plugins/talk-audio-cleanup/panel.tsx', import.meta.url), 'utf8');
// Everything between the imports and the component is plain JavaScript.
const body = source.slice(source.indexOf('const ID ='), source.indexOf('export default function Panel'));
const { READ, APPLY, resolve, segments, inClips, batches, STRINGS, FPS, BATCH, decodePcm, cleaned, inCopy, draftFrame, PREVIEW_RATE, wavePoints, zoomView, gridStep, cleans, sketch, sketchPoints, DEFAULTS, KNOBS } = await import(
  'data:text/javascript,' + encodeURIComponent(body + '\nexport { READ, APPLY, resolve, segments, inClips, batches, STRINGS, FPS, BATCH, decodePcm, cleaned, inCopy, draftFrame, PREVIEW_RATE, wavePoints, zoomView, gridStep, cleans, sketch, sketchPoints, DEFAULTS, KNOBS };')
);
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const script = (text, selects) => new AsyncFunction('selects', text)(selects);

const item = (start, frames, action, rule, confidence, resourceId = 'r0') => ({ resourceId, start, end: start + frames / FPS, frames, action, rule, confidence });
// What the Panel applies once the settings have decided: a cut, a mute and two volume changes.
const ITEMS = [item(12, 3, 'delete', 'blemish', 0.9), item(20, 1, 'mute', 'blemish', 0.35), { ...item(30, 9, 'lower', 'breath', 0.8), lowerDb: 11 }, { ...item(40, 6, 'lower', 'blemish', 0.4), lowerDb: 11 }];
const ALL = { blemish: true, breath: true, opener: true };
// A sound as the engine reports it: frames to the nearest speech, loudness and spikiness in dB, and the margin from which a word covers it.
const sound = (start, frames, gap, loud, spiky, edge = null) => ({ resourceId: 'r0', start, end: start + frames / FPS, frames, rule: 'sound', gap, loud, spiky, edge });
const ONE = { numerator: 1, denominator: 1 };

// A Draft with the edits the Panel uses, behaving as the host's does: removeClips refuses Main clips,
// remove(span, { tracks: "main" }) cuts the span out and closes the gap, splitAt cuts a clip in two.
// Default: one Main clip of 100 s whose source starts at 5 s.
function fakeDraft(rows = [{ resourceId: 'r0', sourceStartSeconds: 5, frames: 3000 }], rate = FPS, crossfades = false) {
  let nextId = 1, at = 0;
  let clips = rows.map((r) => {
    const c = { clipId: nextId++, trackKind: r.trackKind ?? 'main', resourceId: r.resourceId, sourceStartSeconds: r.sourceStartSeconds, startFrame: at, endFrame: at + r.frames, playbackSpeed: r.playbackSpeed ?? ONE, volumeDb: 'volumeDb' in r ? r.volumeDb : 0 };
    at += r.frames;
    return c;
  });
  const log = [];
  let commits = 0, rev = 0; // a clip read from the Draft is refused once the Draft has changed, as the host does
  const live = (row) => { if (row.rev !== rev) throw Error('stale_clip_target: the draft changed after clips() was read; read clips() again'); return clips.find((c) => c.clipId === row.clipId); };
  const splitAt = async ({ frame }) => {
    const c = clips.find((x) => x.trackKind === 'main' && x.startFrame < frame && x.endFrame > frame);
    if (!c) throw Error(`no clip to split at ${frame}`);
    clips.push({ ...c, clipId: nextId++, startFrame: frame, sourceStartSeconds: c.sourceStartSeconds + (frame - c.startFrame) / rate });
    c.endFrame = frame;
    clips.sort((a, b) => a.startFrame - b.startFrame);
    rev++;
  };
  const draft = {
    clips: async () => clips.map(({ volumeDb, ...c }) => ({ ...c, rev })),
    splitAt,
    rangeAtFrames: async (startFrame, endFrame) => ({ startFrame, endFrame }),
    remove: async (range, options) => {
      assert.deepEqual(options, { tracks: 'main' });
      for (const frame of [range.startFrame, range.endFrame]) if (clips.some((c) => c.startFrame < frame && c.endFrame > frame)) await splitAt({ frame });
      const length = range.endFrame - range.startFrame;
      clips = clips.filter((c) => !(c.startFrame >= range.startFrame && c.endFrame <= range.endFrame));
      for (const c of clips) if (c.startFrame >= range.endFrame) { c.startFrame -= length; c.endFrame -= length; }
      log.push(`cut ${range.startFrame}-${range.endFrame}`);
      rev++;
    },
    removeClips: async (row) => { if (row.trackKind === 'main') throw Error('unsupported_clip_target: removeClips only accepts whole clips on separate Video/Audio tracks'); },
    clipAudio: async (row) => ({ volumeDb: live(row).volumeDb }),
    setClipAudio: async (o) => {
      const c = live(o.clip);
      if (o.volumeDb != null) c.volumeDb = o.volumeDb;
      rev++;
      log.push(o.fadeInSeconds ? `fade ${o.clip.startFrame}` : `volume ${o.clip.startFrame}-${o.clip.endFrame} ${o.volumeDb}`);
    },
    // An app without one-frame crossfades refuses the length, as the released app does.
    applyTransitionPreset: async (o) => {
      if (!crossfades) throw Error('applyTransitionPreset: durationSeconds must be 0.1 to 5 seconds');
      assert.deepEqual([o.presetId, o.placement, Math.round(o.durationSeconds * rate)], ['constant-gain', 'after-cut', 1]);
      live(o.after);
      log.push(`crossfade ${o.after.endFrame}`);
      rev++;
    },
    commitAll: async () => { commits++; return { createdDraftId: 'copy' }; },
  };
  // A new Draft starts empty; insertResource appends that stretch of the source to Main.
  draft.insertResource = async ({ resourceId, sourceRange: { startSeconds, endSeconds } }) => {
    const start = clips.reduce((m, c) => Math.max(m, c.endFrame), 0);
    clips.push({ clipId: nextId++, trackKind: 'main', resourceId, sourceStartSeconds: startSeconds, startFrame: start, endFrame: start + Math.round((endSeconds - startSeconds) * rate), playbackSpeed: ONE, volumeDb: 0 });
    log.push(`insert ${resourceId} ${startSeconds}-${endSeconds}`);
  };
  const selects = {
    project: () => ({ duplicateDraft: async () => draft, createDraft: async () => { clips = []; log.push('create'); return draft; } }),
    draft: (id) => { assert.equal(id, 'copy'); return draft; },
  };
  return { selects, log, frames: () => clips.reduce((s, c) => s + c.endFrame - c.startFrame, 0), commits: () => commits };
}
const applyAll = async (selects, items, fade = true) => {
  const total = { delete: 0, lower: 0, mute: 0, fades: 0, skipped: 0 };
  let target = null;
  for (const batch of batches(items)) {
    const r = await script(APPLY('p', 'd', target, 'name', batch, fade), selects);
    target = r.draftId;
    for (const k of Object.keys(total)) total[k] += r.done[k];
  }
  return total;
};

test('away from speech a sound is cleaned by loudness; next to speech by length, shorter when no word covers it', () => {
  const k = DEFAULTS;
  assert.deepEqual([sound(1, 1, 5, 12, 0), sound(1, 1, 5, 11.9, 0), sound(1, 9, 2, 30, 0)].map((it) => cleans(it, k)), [true, false, true]);
  assert.deepEqual([sound(1, 6, 0, 13, 0), sound(1, 5, 1, 40, 0), sound(1, 5, 1, 40, 0, -0.2)].map((it) => cleans(it, k)), [true, false, false]);   // 5 frames at speech: left, with or without a word over it
  assert.deepEqual([sound(1, 2, 0, 13, 0, 0.05), sound(1, 2, 0, 13, 0, 0.049), sound(1, 1, 0, 13, 0, 0.3)].map((it) => cleans(it, k)), [true, false, false]);   // outside the word's margin from two frames
  assert.equal(cleans(sound(1, 2, 0, 13, 0, 0.049), { ...k, margin: 0.04 }), true);
  assert.equal(cleans(sound(1, 5, 5, 20, 0), { ...k, loud: 21 }), false);
  assert.equal(cleans(sound(1, 4, 0, 13, 0), { ...k, attached: 4 }), true);
});

test('a spiky sound is cut and a blunt one lowered; a kind that is switched off is left out; an opener passes through', () => {
  const items = [sound(1, 3, 5, 20, 5.5), sound(2, 3, 5, 20, 5.4), sound(3, 1, 5, 11, 9), item(4, 6, 'delete', 'opener', 1)];
  const r = resolve(items, ALL, DEFAULTS, 11);
  assert.deepEqual(r.map((i) => [i.start, i.action, i.rule, i.lowerDb]), [[1, 'delete', 'blemish', null], [2, 'lower', 'breath', 11], [4, 'delete', 'opener', null]]);
  assert.deepEqual(resolve(items, { ...ALL, blemish: false, opener: false }, DEFAULTS, 11).map((i) => i.rule), ['breath']);
  assert.deepEqual(resolve(items, ALL, { ...DEFAULTS, spiky: 0 }, 11).map((i) => i.action), ['delete', 'delete', 'delete']);
});

test('each setting has a drawing whose sounds light up as the setting moves', () => {
  const text = STRINGS.en, lit = (key, k) => sketch(key, { ...DEFAULTS, ...k }, text).hits.map((h) => h[3]);
  assert.deepEqual(KNOBS.map(([key]) => key), Object.keys(DEFAULTS));
  for (const [key, min, max] of KNOBS) {
    assert.ok(DEFAULTS[key] >= min && DEFAULTS[key] <= max);
    assert.ok(STRINGS.en.knob[key].length === 2 && STRINGS.ko.knob[key].length === 2);
  }
  for (const pic of ['loud', 'speech', 'spiky']) assert.match(sketchPoints(sketch(pic, DEFAULTS, text).parts, 52), /^0,52 .* 300,52$/);
  assert.deepEqual([lit('loud', {}), lit('loud', { loud: 20 }), lit('loud', { loud: 40 })], [[true, true, true], [false, true, true], [false, false, false]]);
  // next to speech, one drawing for three settings: 3 and 8 frames under a word, 1 and 3 frames just past a word's end
  assert.deepEqual(lit('speech', {}), [false, true, false, true]);
  assert.deepEqual(lit('speech', { attached: 3 }), [true, true, false, true]);
  assert.deepEqual(lit('speech', { outside: 4 }), [false, true, false, false]);
  assert.deepEqual(lit('speech', { margin: 0.15 }), [false, true, false, false]);
  assert.deepEqual(lit('speech', { margin: 0.03, outside: 1 }), [false, true, true, true]);
  assert.deepEqual([lit('spiky', {}), lit('spiky', { spiky: 12.5 })], [[false, true, true], [false, false, false]]);
});

test('every edit lands on its own frames, latest first', async () => {
  const { selects, log, frames } = fakeDraft();
  const done = await applyAll(selects, ITEMS);
  assert.deepEqual(done, { delete: 1, lower: 2, mute: 1, fades: 1, skipped: 0 });
  // source 12 s on a clip whose source starts at 5 s is frame 210
  assert.deepEqual(log, ['cut 210-213', 'fade 210', 'volume 1047-1053 -11', 'volume 747-756 -11', 'volume 447-448 -60']);
  assert.equal(frames(), 2997);
});

test('items that touch each other are all applied, in either order', async () => {
  const pair = [item(17, 3, 'delete', 'blemish', 0.9), { ...item(17.1, 9, 'lower', 'breath', 0.8), lowerDb: 11 }];   // frames 360-363 and 363-372
  for (const order of [pair, [...pair].reverse()]) {
    const { selects, log } = fakeDraft();
    const r = await script(APPLY('p', 'd', null, 'name', order, true), selects);
    assert.deepEqual(r.done, { delete: 1, lower: 1, mute: 0, fades: 1, skipped: 0 });
    assert.ok(log.includes('cut 360-363'));
  }
  const { selects } = fakeDraft();
  const twoVolumes = [{ ...item(17, 2, 'mute', 'click', 0.9) }, { ...item(17 + 2 / FPS, 9, 'lower', 'breath', 0.8), lowerDb: 11 }];
  assert.deepEqual((await script(APPLY('p', 'd', null, 'name', twoVolumes, true), selects)).done, { delete: 0, lower: 1, mute: 1, fades: 0, skipped: 0 });
});

test('an edit may use a clip\'s own first or last frame', async () => {
  const { selects, log } = fakeDraft();
  const r = await script(APPLY('p', 'd', null, 'name', [item(5, 2, 'mute', 'click', 0.9), item(105 - 3 / FPS, 3, 'delete', 'blemish', 0.9)], true), selects);
  assert.deepEqual(r.done, { delete: 1, lower: 0, mute: 1, fades: 0, skipped: 0 });   // nothing follows the last cut, so no fade
  assert.deepEqual(log, ['cut 2997-3000', 'volume 0-2 -60']);
});

test('more than one batch continues on the same copy and adds up', async () => {
  const many = Array.from({ length: BATCH * 2 + 5 }, (_, i) => item(10 + i, 2, i % 2 ? 'mute' : 'delete', i % 2 ? 'click' : 'blemish', 0.9));
  assert.deepEqual(batches(many).map((b) => b.length), [BATCH, BATCH, 5]);
  assert.ok(batches(many).flat().every((it, i, all) => i === 0 || it.start < all[i - 1].start));
  const { selects, frames, commits } = fakeDraft();
  const done = await applyAll(selects, many);
  assert.deepEqual(done, { delete: 33, lower: 0, mute: 32, fades: 33, skipped: 0 });
  assert.equal(frames(), 3000 - 33 * 2);
  assert.equal(commits(), 3);
});

test('lowering starts from the clip\'s own volume, stops at -60 and leaves a keyed volume alone', async () => {
  const { selects, log } = fakeDraft([
    { resourceId: 'r0', sourceStartSeconds: 0, frames: 300, volumeDb: -6 },
    { resourceId: 'r0', sourceStartSeconds: 10, frames: 300, volumeDb: -55 },
    { resourceId: 'r0', sourceStartSeconds: 20, frames: 300, volumeDb: null },
  ]);
  const lower = (start) => ({ ...item(start, 6, 'lower', 'breath', 0.8), lowerDb: 11 });
  const r = await script(APPLY('p', 'd', null, 'name', [lower(1), lower(11), lower(21)], true), selects);
  assert.deepEqual(r.done, { delete: 0, lower: 2, mute: 0, fades: 0, skipped: 1 });
  assert.deepEqual(log, ['volume 30-36 -17', 'volume 330-336 -60']);
});

test('only a 1x Main clip of the same source is edited; anything else is skipped', async () => {
  const { selects, log } = fakeDraft([
    { resourceId: 'r0', sourceStartSeconds: 0, frames: 300, playbackSpeed: { numerator: 2, denominator: 1 } },
    { resourceId: 'r1', sourceStartSeconds: 0, frames: 300 },
    { resourceId: 'r0', sourceStartSeconds: 0, frames: 300, trackKind: 'video' },
    { resourceId: 'r0', sourceStartSeconds: 0, frames: 300 },
  ]);
  const r = await script(APPLY('p', 'd', null, 'name', [item(2, 3, 'delete', 'blemish', 0.9), item(500, 3, 'delete', 'blemish', 0.9)], false), selects);
  assert.deepEqual(r.done, { delete: 1, lower: 0, mute: 0, fades: 0, skipped: 1 });
  assert.deepEqual(log, ['cut 960-963']);   // the fourth clip; no fade without the switch
});

test('the audio to analyze: clips of one source are joined when close, and start on the clip\'s frame grid', () => {
  const clip = (resourceId, sourceStart, frames) => ({ resourceId, path: `/m/${resourceId}.mp4`, sourceStart, frames });
  const s = segments([clip('b', 0.02, 300), clip('a', 3600, 300), clip('a', 100.01, 300), clip('a', 115, 300)]);
  assert.deepEqual(s.map((x) => [x.resourceId, x.from, x.to]), [['a', 100.01, 125], ['a', 3600, 3610], ['b', 0.02, 10.02]]);
  assert.ok(Math.abs(s[0].t0 - (100.01 - 5)) < 1e-9);   // 5 s early
  assert.ok(Math.abs(s[2].t0 - 0.02) < 1e-9);           // no room for a lead-in: start at the clip itself
  for (const x of s) assert.ok(Math.abs(((x.from - x.t0) * FPS) - Math.round((x.from - x.t0) * FPS)) < 1e-6);
});

test('an item outside every clip (the lead-in, a gap between clips) is not offered', () => {
  const clips = [{ resourceId: 'r0', sourceStart: 10, frames: 300 }, { resourceId: 'r0', sourceStart: 30, frames: 300 }];
  const keep = (start, frames, resourceId) => inClips(item(start, frames, 'delete', 'blemish', 0.9, resourceId), clips);
  assert.deepEqual([keep(10, 3), keep(8, 3), keep(19.95, 3), keep(25, 3), keep(39.9, 3), keep(12, 3, 'r1')], [true, false, false, false, true, false]);
});

test('reading the Draft keeps 1x Main clips that have a source file', async () => {
  const row = (o) => ({ trackKind: 'main', resourceId: 'r0', sourceStartSeconds: 0, startFrame: 0, endFrame: 300, playbackSpeed: ONE, ...o });
  const selects = {
    files: { environment: async () => ({ tempDirectory: '/tmp' }) },
    draft: () => ({
      meta: async () => ({ fps: 30, name: 'Talk' }),
      words: async () => [   // Draft frames; the kept clip plays source 4 s from Draft frame 300 to 390
        { text: 'so', startFrame: 300, endFrame: 318 },
        { text: '', nonSpeech: true, startFrame: 318, endFrame: 320 },   // the pause before it is a row of its own
        { text: '\uc790,', startFrame: 320, endFrame: 324 },
        { text: 'next', startFrame: 324, endFrame: 340 },
        { text: 'elsewhere', startFrame: 10, endFrame: 20 },
        { text: '\uc790', startFrame: 350, endFrame: 353 },             // what came before it is not in this clip
        { text: 'then', startFrame: 353, endFrame: 360 },
        { text: '\uc790', startFrame: 388, endFrame: 390 },             // the next word is past the clip
        { text: 'after', startFrame: 390, endFrame: 400 },
        { text: '\uc790\ub3d9', startFrame: 370, endFrame: 375 },       // a longer word that starts the same
        { text: 'x', startFrame: 375, endFrame: 380 },
      ],
      clips: async () => [row({}), row({ trackKind: 'video' }), row({ playbackSpeed: { numerator: 2, denominator: 1 } }), row({ resourceId: 'seq' }), row({ resourceId: 'deep', sourceStartSeconds: 4, startFrame: 300, endFrame: 390 }), row({ resourceId: null })],
    }),
    project: () => ({
      meta: async () => ({ draftIds: ['d'] }),
      sourceFiles: async (o) => (o ? { fileTree: [{ type: 'dir', children: [{ type: 'video', resourceId: 'deep', path: '/m/deep.mp4' }] }] } : { folders: [{ name: 'A' }] }),
    }),
  };
  const r = await script(READ('p', 'd'), selects);
  // every spoken word the kept clip plays, in source seconds; the pause row and words outside the clip are not among them
  assert.deepEqual([r.words.length, r.words[0], r.words[1].map((v) => (typeof v === 'number' ? Math.round(v * 30) : v))], [8, ['deep', 4, 4.6], ['deep', 140, 144]]);
  delete r.words;
  assert.deepEqual(r, { fps: 30, name: 'Talk', clips: [{ resourceId: 'deep', path: '/m/deep.mp4', sourceStart: 4, startFrame: 300, frames: 90, seconds: 3 }], skipped: 0, openers: [{ resourceId: 'deep', start: 4 + 20 / 30, next: 4 + 24 / 30, prevEnd: 4 + 18 / 30 }, { resourceId: 'deep', start: 4 + 50 / 30, next: 4 + 53 / 30, prevEnd: 4 + 50 / 30 - 1 }], isDraft: true, sources: [{ resourceId: 'deep', name: 'deep.mp4', seconds: null }], env: { tempDirectory: '/tmp' } });
  selects.project = () => ({ meta: async () => ({ draftIds: ['other'] }), sourceFiles: async () => ({ fileTree: [{ type: 'video', resourceId: 'r0', path: '/m/r0.mp4' }, { type: 'sequence', resourceId: 'seq', path: '/m/seq' }] }) });
  const flat = await script(READ('p', 'd'), selects);
  assert.deepEqual([flat.clips.map((c) => c.resourceId), flat.skipped], [['r0'], 1]);
  assert.equal(flat.isDraft, false);   // a source timeline is not one of the project's Drafts, so no copy can be made of it
});

test('the Korean and English strings have the same keys', () => {
  const keys = (o) => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v).map((x) => `${k}.${x}`) : [k])).sort();
  assert.deepEqual(keys(STRINGS.ko), keys(STRINGS.en));
});

test('a preview clip is read back as samples, across the chunks it was read in', () => {
  const pcm = Int16Array.from([0, 16384, -16384, 32767, -32768, 1]);
  const bytes = Buffer.from(pcm.buffer);
  const parts = [bytes.subarray(0, 4).toString('base64'), bytes.subarray(4).toString('base64')];
  assert.deepEqual(Array.from(decodePcm(parts)), [0, 0.5, -0.5, 32767 / 32768, -1, 1 / 32768]);
  assert.deepEqual(Array.from(decodePcm(parts, 2)), [0.25, (32767 / 32768 - 0.5) / 2, (1 / 32768 - 1) / 2]);   // the decoded WAV is stereo: each pair is one sample
});

test('the cleaned preview is the clip with the edit made: a cut closes up with a one-frame fade, a breath is lowered, a tick is silent', () => {
  const frame = Math.round(PREVIEW_RATE / FPS), pcm = new Float32Array(frame * 10).fill(0.5);
  const cut = cleaned(pcm, frame * 3, frame * 5, 'delete', null);
  assert.equal(cut.length, frame * 8);
  assert.equal(cut[frame * 3 - 1], 0.5);                       // untouched up to the cut
  assert.equal(cut[frame * 3], 0);                             // the fade starts from silence
  assert.ok(cut[frame * 3 + (frame >> 1)] > 0.2 && cut[frame * 3 + (frame >> 1)] < 0.3);
  assert.equal(cut[frame * 4], 0.5);                           // and is over after one frame
  const low = cleaned(pcm, frame * 3, frame * 5, 'lower', 20);
  assert.equal(low.length, pcm.length);
  assert.ok(Math.abs(low[frame * 4] - 0.05) < 1e-6);
  assert.deepEqual([low[frame * 3 - 1], low[frame * 5]], [0.5, 0.5]);
  const mute = cleaned(pcm, frame * 3, frame * 5, 'mute', null);
  assert.deepEqual([mute[frame * 3 - 1], mute[frame * 3], mute[frame * 5 - 1], mute[frame * 5]], [0.5, 0, 0, 0.5]);
  assert.equal(pcm[frame * 4], 0.5);                           // the original clip is not changed
});

test('a place is found in the Draft through the clip that plays it, and in the copy after the cuts before it', () => {
  const clips = [{ resourceId: 'a', sourceStart: 10, startFrame: 0, frames: 300 }, { resourceId: 'b', sourceStart: 0, startFrame: 300, frames: 300 }, { resourceId: 'a', sourceStart: 40, startFrame: 600, frames: 300 }];
  assert.deepEqual([draftFrame({ resourceId: 'a', start: 12 }, clips), draftFrame({ resourceId: 'b', start: 1 }, clips), draftFrame({ resourceId: 'a', start: 41 }, clips), draftFrame({ resourceId: 'a', start: 30 }, clips)], [60, 330, 630, null]);
  const rows = [{ id: 3, frame: 500, frames: 4, action: 'lower' }, { id: 1, frame: 100, frames: 6, action: 'delete' }, { id: 2, frame: 300, frames: 10, action: 'delete' }, { id: 4, frame: 900, frames: 2, action: 'mute' }];
  assert.deepEqual(inCopy(rows).map((r) => [r.id, r.copyFrame]), [[1, 100], [2, 294], [3, 484], [4, 884]]);
});

test('the waveform rises from the bottom on one scale', () => {
  // heights for 0, a quarter of the reference, the reference and over it: 0, half (square root), full, full
  assert.equal(wavePoints([0, 25, 100, 400], 100, 0, 4, 21), '0,21 0.5,21.0 1.5,11.0 2.5,1.0 3.5,1.0 4,21');
  assert.equal(wavePoints([0, 25, 100, 400], 100, 1, 3, 21), '0,21 0.5,11.0 1.5,1.0 2,21');           // one slice of it
});

test('the timeline zooms about the pointer, stays inside the Draft and keeps a few time marks in view', () => {
  const total = 3600 * FPS, view = { t0: 600 * FPS, span: 120 * FPS };
  const closer = zoomView(view, total, 0.5, 0.25);                       // the frame under the pointer stays under it
  assert.deepEqual(closer, { t0: 615 * FPS, span: 60 * FPS });
  assert.equal(closer.t0 + 0.25 * closer.span, view.t0 + 0.25 * view.span);
  assert.deepEqual(zoomView(view, total, 1000, 0.5), { t0: 0, span: total });            // never wider than the Draft
  assert.equal(zoomView(view, total, 0.0001, 0.5).span, 10 * FPS);                       // never closer than ten seconds
  assert.deepEqual(zoomView({ t0: total, span: 60 * FPS }, total, 1, 0), { t0: total - 60 * FPS, span: 60 * FPS });   // a move past the end stops at it
  assert.deepEqual(zoomView({ t0: 0, span: 60 * FPS }, 20 * FPS, 1, 0), { t0: 0, span: 20 * FPS });                   // a Draft shorter than the window
  assert.deepEqual([10, 60, 120, 600, 3600].map(gridStep), [2, 10, 30, 300, 600]);
});

test('a Draft at another frame rate is edited on its own frames', async () => {
  // 25 fps: a cut of 0.2 s that starts 2 s into the clip is frames 50 to 55; a breath of 0.4 s at 4 s is frames 100 to 110.
  const { selects, log, frames } = fakeDraft([{ resourceId: 'r0', sourceStartSeconds: 5, frames: 2500 }], 25);
  const at = (start, seconds, action) => ({ resourceId: 'r0', start, end: start + seconds, frames: Math.round(seconds * 25), action, lowerDb: action === 'lower' ? 11 : null });
  const r = await script(APPLY('p', 'd', null, 'name', [at(9, 0.4, 'lower'), at(7, 0.2, 'delete')], true, 25), selects);
  assert.deepEqual(r.done, { delete: 1, lower: 1, mute: 0, fades: 1, skipped: 0 });
  assert.deepEqual(log, ['cut 50-55', 'fade 50', 'volume 95-105 -11']);
  assert.equal(frames(), 2495);
  const clips = [{ resourceId: 'r0', sourceStart: 5, startFrame: 0, frames: 2500, seconds: 100 }];
  assert.deepEqual([draftFrame({ resourceId: 'r0', start: 7 }, clips, 25), inClips({ resourceId: 'r0', start: 104.5, end: 105 }, clips), inClips({ resourceId: 'r0', start: 104.9, end: 105.1 }, clips)], [50, true, false]);
  assert.deepEqual(segments(clips).map((x) => [x.from, x.to]), [[5, 105]]);
});

test('from source material a new Draft is built first, then edited the same way', async () => {
  const { selects, log } = fakeDraft();
  const fresh = [{ resourceId: 'r0', start: 5, end: 105 }];
  const r = await script(APPLY('p', 'source', null, 'name', [item(12, 3, 'delete', 'blemish', 0.9)], true, FPS, fresh), selects);
  assert.deepEqual([r.draftId, r.done.delete, r.done.fades], ['copy', 1, 1]);
  assert.deepEqual(log, ['create', 'insert r0 5-105', 'cut 210-213', 'fade 210']);
  // the next batch goes to the Draft that was made, and makes nothing new
  const { selects: again, log: log2 } = fakeDraft();
  await script(APPLY('p', 'source', 'copy', 'name', [item(20, 3, 'delete', 'blemish', 0.9)], true, FPS, fresh), again);
  assert.deepEqual(log2, ['cut 450-453', 'fade 450']);
});

test('a source picked in the Panel is read as one clip that plays the whole file, at its own frame rate', async () => {
  const selects = {
    files: { environment: async () => ({ tempDirectory: '/tmp' }) },
    draft: () => { throw Error('the open timeline is not read when a source is picked'); },
    project: () => ({
      meta: async () => ({ draftIds: ['d'] }),
      sourceFiles: async () => ({ fileTree: [{ type: 'video', resourceId: 'r0', name: 'talk.mp4', path: '/m/talk.mp4', durationSeconds: 100, frameRate: 25 }, { type: 'sequence', resourceId: 'seq', path: '/m/seq' }] }),
      resource: (id) => ({
        meta: async () => { assert.equal(id, 'r0'); return { fps: 25, name: 'talk' }; },
        words: async () => [{ text: 'so', startFrame: 0, endFrame: 20 }, { text: '\uc790', startFrame: 50, endFrame: 55 }, { text: 'next', startFrame: 60, endFrame: 80 }],
      }),
    }),
  };
  const r = await script(READ('p', 'd', 'r0'), selects);
  assert.deepEqual(r.clips, [{ resourceId: 'r0', path: '/m/talk.mp4', sourceStart: 0, startFrame: 0, frames: 2500, seconds: 100 }]);
  assert.deepEqual([r.fps, r.name, r.isDraft, r.sources], [25, 'talk.mp4', false, [{ resourceId: 'r0', name: 'talk.mp4', seconds: 100 }]]);
  assert.deepEqual(r.openers, [{ resourceId: 'r0', start: 2, next: 2.4, prevEnd: 19 / 25 + 1 / 25 }]);
  // nothing open and nothing picked: only the list of sources comes back
  const none = await script(READ('p', null), selects);
  assert.deepEqual([none.clips, none.sources.length], [[], 1]);
});

test('the fade is a one-frame crossfade on the cut where the app can place one, and the clip\'s own fade-in where it cannot', async () => {
  const cuts = [item(20, 3, 'delete', 'blemish', 0.9), item(12, 3, 'delete', 'blemish', 0.9)];
  const able = fakeDraft(undefined, FPS, true);
  assert.equal((await script(APPLY('p', 'd', null, 'name', cuts, true), able.selects)).done.fades, 2);
  assert.deepEqual(able.log, ['cut 450-453', 'cut 210-213', 'crossfade 447', 'crossfade 210']);
  const old = fakeDraft();
  assert.equal((await script(APPLY('p', 'd', null, 'name', cuts, true), old.selects)).done.fades, 2);
  assert.deepEqual(old.log, ['cut 450-453', 'cut 210-213', 'fade 447', 'fade 210']);
});
