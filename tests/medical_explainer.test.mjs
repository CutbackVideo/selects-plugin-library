// medical-explainer: the timing rules from the reference runs, the caption splitting, the generation requests and
// the ffmpeg argv, through the code the panel runs (its operation section).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadPanelOperation} from './panel_operation.mjs';

const op = loadPanelOperation('medical-explainer');
const FPS = 24;
const onGrid = (x) => Math.abs(x * FPS - Math.round(x * FPS)) < 1e-6;
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const decode = (id) => Buffer.from(id.replace(/^model_v1_/, ''), 'base64url').toString();

test('a scene clip is max(5, ceil(L + 0.5)) seconds, within Kling v3 3-15 s', () => {
  const cases = [[1.2, 5], [3.2, 5], [4.5, 5], [4.51, 6], [6.3, 7], [9.5, 10], [14.6, 15], [20, 15]];
  for (const [L, want] of cases) assert.equal(op.medSceneClipSeconds(L), want, `L=${L}`);
});

const DURS = [4.21, 5.06, 3.87, 6.02, 4.44, 5.31, 4.9, 3.6, 5.5];
test('sentences are 0.8 s apart; each ~1.8 s transition slot is centred on its boundary', () => {
  const tl = op.medTimeline(DURS);
  assert.equal(tl.narration[0].start, op.MED_TIMING.lead);
  for (let i = 1; i < DURS.length; i++) {
    const prev = tl.narration[i - 1];
    assert.ok(close(tl.narration[i].start - (prev.start + prev.dur), 0.8, 2e-3), `pause before sentence ${i + 1}`);
  }
  assert.equal(tl.boundaries.length, DURS.length - 1);
  for (const [i, b] of tl.boundaries.entries()) {
    const pauseMid = tl.narration[i].start + tl.narration[i].dur + 0.4;
    assert.ok(close(b.center, pauseMid, 2e-3));
    assert.ok(close((b.start + b.end) / 2, b.center, 1 / FPS), `slot ${b.after} centred`);
    assert.ok(close(b.slot, 1.8, 1 / FPS + 1e-9), `slot ${b.after} is ${b.slot}`);
    assert.ok(onGrid(b.start) && onGrid(b.end));
  }
});

test('scene spans and slots tile the program on the frame grid, and every span fits its clip', () => {
  const tl = op.medTimeline(DURS);
  assert.equal(tl.scenes[0].start, 0);
  assert.equal(tl.scenes.at(-1).end, tl.total);
  let sum = 0;
  tl.scenes.forEach((s, i) => {
    sum += s.end - s.start;
    if (i < tl.boundaries.length) {
      assert.equal(s.end, tl.boundaries[i].start);
      assert.equal(tl.scenes[i + 1].start, tl.boundaries[i].end);
      sum += tl.boundaries[i].end - tl.boundaries[i].start;
    }
    assert.ok(s.span <= s.clipSeconds, `scene ${s.n}: span ${s.span} > clip ${s.clipSeconds}`);
    assert.ok(onGrid(s.start) && onGrid(s.end));
  });
  assert.ok(close(sum, tl.total, 1e-6));
  const last = tl.narration.at(-1);
  assert.ok(close(tl.total, last.start + last.dur + op.MED_TIMING.endHold, 1 / FPS));
  // The scene clip starts when its incoming transition ends: half a slot minus half a pause into the sentence.
  for (let i = 1; i < tl.scenes.length; i++) assert.ok(close(tl.scenes[i].start - tl.narration[i].start, 0.5, 1 / FPS + 1e-3));
});

test('the whole 3 s transition clip plays in its slot at about 1.7x', () => {
  const tl = op.medTimeline(DURS);
  for (const b of tl.boundaries) {
    const speed = op.medTransitionSpeed(3.04, b.slot);
    assert.ok(speed > 1.6 && speed < 1.8, `speed ${speed}`);
  }
  const args = op.medTransitionCardArgs('in.mp4', 'out.mp4', '#1f1f22', 1.792, 3.04);
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /setpts=0\.589474\*PTS/);
  assert.equal(args[args.indexOf('-t') + 1], '1.792');
  assert.ok(!args.includes('-ss'), 'the transition is never trimmed at the start');
});

test('a very short sentence narrows the slots either side but keeps its scene on screen', () => {
  const tl = op.medTimeline([4.0, 0.9, 4.0]);
  const mid = tl.scenes[1];
  assert.ok(mid.span >= op.MED_TIMING.minSpan - 1 / FPS, `span ${mid.span}`);
  for (const b of tl.boundaries) {
    assert.ok(b.slot < 1.8);
    assert.ok(close((b.start + b.end) / 2, b.center, 1 / FPS));
  }
});

test('scene overlays end before the next transition starts; pointer labels show 1.5-2.5 s', () => {
  const tl = op.medTimeline(DURS);
  for (const s of tl.scenes) {
    const w = op.medSceneWindows(s, 2);
    assert.ok(w.label.start >= s.start && w.label.end < s.end, `label ${s.n}`);
    for (const p of w.pointers.filter(Boolean)) {
      assert.ok(p.start >= s.start && p.end < s.end, `pointer in scene ${s.n}`);
      assert.ok(p.end - p.start >= 1.5 - 1e-9 && p.end - p.start <= 2.5 + 1e-9);
    }
    if (w.pointers[0] && w.pointers[1]) assert.ok(close(w.pointers[1].start - w.pointers[0].start, 0.5, 1e-6));
  }
  const tiny = op.medSceneWindows({n: 2, start: 10, end: 11.2}, 2);
  assert.deepEqual(tiny.pointers, [null, null], 'no room for 1.5 s: left out');
});

// Korean test text is written with escapes (tools/check_public.py allows no Korean literals here).
const LONG = ('\ud608\uc561 \uc18d LDL \ucf5c\ub808\uc2a4\ud14c\ub864\uc774 \ub108\ubb34 \ub9ce\uc544\uc9c0\uba74, \ud608\uad00 \ubcbd \uc548\ucabd\uc73c\ub85c \uc2a4\uba70\ub4e4\uc5b4 \uc0b0\ud654\ub418\uace0 \uba74\uc5ed\uc138\ud3ec\ub97c \ubd88\ub7ec\ubaa8\uc74d\ub2c8\ub2e4.');
test('captions: at most 16 characters a line and 2 lines a card; long sentences switch at a pause', () => {
  const cards = op.medCaptionCards(LONG, 16, 2);
  assert.ok(cards.length >= 2, 'a long sentence becomes several captions');
  for (const c of cards) {
    assert.ok(c.length >= 1 && c.length <= 2, JSON.stringify(c));
    for (const l of c) assert.ok(op.medLen(l) <= 16, l);
  }
  const strip = (s) => s.replace(/[\s,]/g, '');
  assert.equal(strip(cards.flat().join('')), strip(LONG), 'no word lost or reordered');
  assert.ok(/\u3002|\uba74$/.test(cards[0].at(-1)) || cards[0].length === 2, 'the first card closes at the comma or when full');
  // CJK without spaces is cut at the line length.
  const ja = '\u8840\u6db2\u4e2d\u306eLDL\u30b3\u30ec\u30b9\u30c6\u30ed\u30fc\u30eb\u304c\u591a\u3059\u304e\u308b\u3068\u8840\u7ba1\u306e\u58c1\u306b\u5165\u308a\u8fbc\u307f\u307e\u3059\u3002';
  for (const l of op.medCaptionLines(ja, 16)) assert.ok(op.medLen(l) <= 16);
  // English lines use the wider limit and break between words.
  const en = op.medCaptionLines('When there is too much LDL cholesterol in the blood, it seeps into the artery wall.', 30);
  for (const l of en) assert.ok(l.length <= 30 && !/^\s|\s$/.test(l), l);
});

test('timed captions follow the word timing, never overlap, and end after the sentence', () => {
  const dur = 5.2;
  const words = op.medAlignWords(LONG, dur, [[0, 0.12], [2.4, 2.75], [5.05, null]], 'ko');
  const cues = op.medTimedCaptions(LONG, words, 10, dur, 16, 100);
  assert.equal(cues[0].start, 10);
  for (let i = 1; i < cues.length; i++) {
    assert.ok(cues[i].start >= cues[i - 1].end - 1e-9, 'no overlap');
    assert.ok(cues[i].start > 10 && cues[i].start < 10 + dur);
  }
  assert.ok(close(cues.at(-1).end, 10 + dur + 0.15, 1e-6));
  for (const c of cues) assert.ok(c.text.split('\n').length <= 2);
  const limited = op.medTimedCaptions(LONG, words, 10, dur, 16, 14);
  assert.ok(limited.every((c) => c.end <= 14));
});

test('the plan keeps one split scene (left = an earlier scene) and one inset scene with two insets', () => {
  const sc = (extra) => ({narration: 'Sentence.', visual: 'artery wall', ...extra});
  const raw = {title_lines: ['A', 'B'], scenes: [
    sc({camera: 'Slow push-in', scale: 'organ', label: 'x'.repeat(40), pointers: ['red blood cell', 'endothelium', 'plaque']}),
    sc({split: {left: 3, leftLabel: 'no', rightLabel: 'no'}}),
    sc({split: {left: 1, leftLabel: 'Normal', rightLabel: 'Plaque'}, camera: 'lateral pan'}),
    sc({split: {left: 1}}),
    sc({insets: [{sourceScene: 1, label: 'Heart'}]}),
    sc({insets: [{sourceScene: 1, label: 'Heart'}, {sourceScene: 2, label: 'Brain'}], camera: 'pull back', scale: 'molecular'}),
    sc({insets: [{sourceScene: 1, label: 'x'}, {sourceScene: 2, label: 'y'}]}),
    sc({split: {}}),
  ]};
  const {plan, warnings, errors} = op.medNormalizePlan(raw, 'en', 'Fallback');
  assert.deepEqual(errors, []);
  assert.equal(plan.scenes[0].label.length, op.MED_LANG.en.label);
  assert.equal(plan.scenes[0].pointers.length, 2);
  assert.equal(plan.scenes[0].camera, 'push_in');
  assert.deepEqual(plan.scenes.map((s) => s.split && s.split.left), [null, null, 1, null, null, null, null, null]);
  assert.deepEqual(plan.scenes.map((s) => !!s.insets), [false, false, false, false, false, true, false, false]);
  assert.equal(plan.scenes[2].camera, 'lateral');
  assert.equal(plan.scenes[5].camera, 'pull_back');
  assert.equal(plan.scenes[5].scale, 'molecule');
  assert.equal(warnings.filter((w) => /split/.test(w)).length, 2, 'an empty split object is not a split');
});

test('transition moves follow the change of scale', () => {
  assert.equal(op.medTransitionMove('organ', 'cell'), 'dive-in');
  assert.equal(op.medTransitionMove('organ', 'tissue'), 'push-in');
  assert.equal(op.medTransitionMove('cell', 'cell'), 'push-in');
  assert.equal(op.medTransitionMove('cell', 'tissue'), 'pull-back');
  assert.equal(op.medTransitionMove('molecule', 'organ'), 'pull-out');
});

test('models: Seedream 5 Pro keyframes, Kling v3 Standard (720p) video, no Pro default', () => {
  assert.equal(decode(op.MED_MODEL.t2i), 'bytedance/seedream/v5/pro/text-to-image');
  assert.equal(decode(op.MED_MODEL.edit), 'bytedance/seedream/v5/pro/edit');
  assert.equal(decode(op.MED_MODEL.i2v), 'fal-ai/kling-video/v3/standard/image-to-video');
  assert.equal(decode(op.MED_MODEL.eleven), 'fal-ai/elevenlabs/tts/eleven-v3');
  assert.equal(decode(op.MED_MODEL.minimax), 'fal-ai/minimax/speech-2.8-hd');
  for (const id of Object.values(op.MED_MODEL)) assert.doesNotMatch(decode(id), /\/pro\/image-to-video|1080/);
});

test('narration inputs: ElevenLabs v3 Daniel by default; MiniMax with voice_id, language_boost and a file output', () => {
  assert.equal(op.MED_VOICES[0].id, 'eleven-daniel');
  assert.deepEqual(op.medNarrationInput('Hi.', 'eleven-daniel', 'en'), {model: 'eleven', input: {text: 'Hi.', voice: 'Daniel', language_code: 'en', stability: 0.5}});
  const m = op.medNarrationInput('x', 'minimax-calm-lady', 'ko');
  assert.equal(m.model, 'minimax');
  assert.equal(m.input.prompt, 'x');
  assert.equal(m.input.output_format, 'url');
  assert.equal(m.input.language_boost, 'Korean');
  assert.equal(m.input.voice_setting.voice_id, 'Korean_CalmLady');
  assert.equal(op.medNarrationInput('x', 'minimax-gentle-woman', 'ja').input.voice_setting.voice_id, 'Korean_GentleWoman');
});

test('brand presets are template data: generic by default, Chosun Ilbo Health selectable', () => {
  assert.equal(op.MED_PRESETS.generic.wordmark, 'Health Explainer');
  assert.equal(op.MED_PRESETS.chosun.wordmark, '\uc870\uc120\uc77c\ubcf4 \u00b7 \uac74\uac15');
  for (const p of Object.values(op.MED_PRESETS)) assert.deepEqual([p.color1, p.color2, p.bg], ['#FFE14D', '#9BE15D', '#1f1f22']);
  const panel = fs.readFileSync(path.resolve(import.meta.dirname, '../plugins/medical-explainer/panel.tsx'), 'utf8');
  assert.equal((panel.match(/\\uc870\\uc120\\uc77c\\ubcf4 \\u00b7 \\uac74\\uac15/g) || []).length, 1, 'the Chosun wordmark appears only as preset data');
  assert.match(panel, /useState<any>\(\{ \.\.\.MED_PRESETS\.generic \}\)/);
});

// ---- the engine on a job folder (stub host I/O; no network, no paid calls) ----
function stubIO(dir, extra = {}) {
  return {
    join: (...p) => path.join(...p), exists: async (p) => fs.existsSync(p), mkdir: async (p) => fs.mkdirSync(p, {recursive: true}),
    readJson: async (p, def) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return def; } },
    writeJson: async (p, v) => fs.writeFileSync(p, JSON.stringify(v)), readB64: async (p) => fs.readFileSync(p).toString('base64'),
    now: () => 1700000000, sheetFont: () => '/nonexistent.ttf', ffmpeg: async () => {}, silences: async () => [], ...extra,
  };
}
function makeJob(settings = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medexp-'));
  const scenes = [
    {n: 1, narration: LONG, visual: 'human torso, heart and arteries', camera: 'push_in', scale: 'body', label: 'L1', pointers: ['heart'], split: null, insets: null},
    {n: 2, narration: 'LDL enters the artery wall.', visual: 'artery cross-section', camera: 'push_in', scale: 'tissue', label: 'L2', pointers: ['LDL', 'endothelium'], split: null, insets: null},
    {n: 3, narration: 'Plaque narrows the vessel.', visual: 'plaque in artery', camera: 'lateral', scale: 'tissue', label: 'L3', pointers: [], split: {left: 2, leftLabel: 'Normal', rightLabel: 'Plaque'}, insets: null},
    {n: 4, narration: 'It can block blood to the heart or brain.', visual: 'clot', camera: 'pull_back', scale: 'cell', label: 'L4', pointers: [], split: null, insets: [{sourceScene: 1, label: 'Heart'}, {sourceScene: 2, label: 'Brain'}]},
  ];
  fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify({id: 'mxT', settings: {voice: 'eleven-daniel', template: {wordmark: 'Health Explainer', color1: '#FFE14D', color2: '#9BE15D', bg: '#1f1f22'}, ...settings}}));
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({version: '1', lang: 'ko', title: ['T1', 'T2'], scenes}));
  const gen = {};
  for (const s of scenes) {
    const f = path.join(dir, `narr_${s.n}.mp3`); fs.writeFileSync(f, ''); gen[`narr:${s.n}`] = {path: f};
    for (const c of 'AB') { const k = path.join(dir, `kf_${s.n}${c}.png`); fs.writeFileSync(k, ''); gen[`kf:${s.n}:${c}`] = {path: k}; }
  }
  fs.writeFileSync(path.join(dir, 'gen.json'), JSON.stringify(gen));
  return {dir, scenes};
}
const NARR = [5.2, 3.1, 2.6, 3.4];

test('requests: scene clips start from the keyframe only; transitions bind start and end frames, no unused slot', async () => {
  const {dir} = makeJob();
  const io = stubIO(dir, {duration: async (p) => NARR[Number(/narr_(\d)/.exec(p)[1]) - 1]});
  assert.equal((await op.medEngine('timeline', dir, [], io)).ok, true);
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'B', 2: 'A', 3: 'A', 4: 'A'}, clip: {1: 'A', 2: 'B', 3: 'A'}}));
  const kf = (await op.medEngine('requests', dir, ['keyframes', '1,3'], io)).requests;
  assert.deepEqual(kf.map((r) => r.gen), ['kf:1:A', 'kf:1:B', 'kf:3:A', 'kf:3:B']);
  assert.equal(kf[0].modelId, op.MED_MODEL.t2i);
  assert.deepEqual(kf[0].uploads, {});
  assert.deepEqual(kf[0].input.image_size, {width: 2560, height: 1440});
  assert.equal(kf[2].modelId, op.MED_MODEL.edit);
  assert.deepEqual(kf[2].input.image_urls, ['selects-input:ref']);
  assert.deepEqual(Object.keys(kf[2].uploads), ['ref']);
  assert.match(kf[2].uploads.ref, /kf_1B\.png$/, 'scene 1\'s chosen keyframe is the style reference');
  assert.match(kf[2].key, /-rB$/);
  assert.ok(kf[2].input.prompt.endsWith(op.MED_STYLE + '.'));
  const clips = (await op.medEngine('requests', dir, ['clips'], io)).requests;
  assert.equal(clips.length, 8);
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
  for (const r of clips) {
    const n = Number(r.gen.split(':')[1]);
    assert.equal(r.modelId, op.MED_MODEL.i2v);
    assert.equal(r.input.start_image_url, 'selects-input:start');
    assert.ok(!('end_image_url' in r.input), 'scene clips have no end frame');
    assert.deepEqual(Object.keys(r.uploads), ['start']);
    assert.equal(r.input.duration, String(op.medSceneClipSeconds(NARR[n - 1])));
    assert.equal(r.input.duration, String(tl.scenes[n - 1].clipSeconds));
    assert.equal(r.input.generate_audio, false);
  }
  await assert.doesNotReject(async () => {
    const miss = await op.medEngine('requests', dir, ['transitions'], io);
    assert.equal(miss.ok, false, 'transitions wait for the extracted frames');
  });
  for (const n of [1, 2, 3, 4]) { fs.writeFileSync(path.join(dir, 'work', `out_${n}.png`), ''); fs.writeFileSync(path.join(dir, 'work', `in_${n}.png`), ''); }
  const tr = (await op.medEngine('requests', dir, ['transitions'], io)).requests;
  assert.deepEqual(tr.map((r) => r.gen), ['tr:1:A', 'tr:1:B', 'tr:2:A', 'tr:2:B', 'tr:3:A', 'tr:3:B']);
  for (const r of tr) {
    const n = Number(r.gen.split(':')[1]);
    assert.equal(r.input.duration, '3');
    assert.equal(r.input.start_image_url, 'selects-input:start');
    assert.equal(r.input.end_image_url, 'selects-input:end');
    assert.deepEqual(Object.keys(r.uploads).sort(), ['end', 'start']);
    assert.match(r.uploads.start, new RegExp(`out_${n}\\.png$`));
    assert.match(r.uploads.end, new RegExp(`in_${n + 1}\\.png$`));
  }
  assert.match(tr[0].input.prompt, /continuous dive-in/, 'body to tissue dives in');
  const again = (await op.medEngine('requests', dir, ['clips', '2B', '--attempt', '2'], io)).requests;
  assert.deepEqual(again.map((r) => [r.gen, r.attempt]), [['clip:2:B', 2]]);
  assert.notEqual(again[0].key, clips.find((r) => r.gen === 'clip:2:B').key, 'a retry has its own key');
  fs.rmSync(dir, {recursive: true, force: true});
});

test('assembly: Main clips tile the program; scene overlays end before transitions; captions fit', async () => {
  const {dir} = makeJob({titleLines: {line1: 'Edited 1', line2: 'Edited 2'}});
  const io = stubIO(dir, {duration: async (p) => NARR[Number(/narr_(\d)/.exec(p)[1]) - 1]});
  await op.medEngine('timeline', dir, [], io);
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
  const segments = [];
  tl.scenes.forEach((s, i) => {
    segments.push({kind: 'scene', n: s.n, file: path.join(dir, `card_${s.n}.mp4`), dur: s.span});
    if (i < tl.boundaries.length) segments.push({kind: 'transition', n: s.n, file: path.join(dir, `tr_${s.n}.mp4`), dur: tl.boundaries[i].slot});
  });
  const inset = path.join(dir, 'inset.jpg'); fs.writeFileSync(inset, 'jpg');
  fs.writeFileSync(path.join(dir, 'work', 'compose.json'), JSON.stringify({segments, dissolves: [], pointerFrames: [],
    insetFiles: [{scene: 4, index: 0, path: inset}, {scene: 4, index: 1, path: inset}]}));
  fs.writeFileSync(path.join(dir, 'work', 'pointers.json'), JSON.stringify({'1-1': {x: 0.5, y: 0.7, visible: true}, '2-1': {visible: false}}));
  const a = await op.medEngine('assembly', dir, [], io);
  assert.equal(a.ok !== false, true, a.error);
  let sum = 0;
  for (const s of a.segments) sum += s.dur;
  assert.ok(close(sum, a.total, 1e-6));
  assert.deepEqual(a.segments.map((s) => s.kind), ['scene', 'transition', 'scene', 'transition', 'scene', 'transition', 'scene']);
  const startOfNextTransition = (n) => (n <= tl.boundaries.length ? tl.boundaries[n - 1].start : tl.total + 1);
  for (const o of [...a.labels, ...a.pointers, ...a.splits, ...a.insets]) {
    assert.ok(o.end < startOfNextTransition(o.scene), `${o.scene} ends ${o.end}`);
    assert.ok(o.start >= tl.scenes[o.scene - 1].start);
  }
  // Scene 2 is 2.1 s on screen: room for one 1.5 s pointer only, and the AI did not find that element.
  assert.deepEqual(a.pointers.map((p) => [p.scene, p.text]), [[1, 'heart']]);
  assert.deepEqual(a.dropped, ['2: LDL']);
  const p1 = a.pointers[0];
  assert.equal(p1.x, 540);
  assert.equal(p1.y, Math.round(656 + 0.7 * 608));
  assert.ok(p1.labelY < p1.y, 'a label for an element in the lower half sits above it');
  assert.equal(a.splits[0].left, 'Normal');
  assert.equal(a.insets[0].items.length, 2);
  assert.match(a.insets[0].items[0].image, /^data:image\/jpeg;base64,/);
  assert.deepEqual([a.title.line1, a.title.line2, a.title.color1, a.title.color2], ['Edited 1', 'Edited 2', '#FFE14D', '#9BE15D']);
  assert.equal(a.wordmark, 'Health Explainer');
  for (const c of a.captions) {
    const lines = c.text.split('\n');
    assert.ok(lines.length <= 2 && lines.every((l) => op.medLen(l) <= 16), c.text);
  }
  assert.equal(a.narration.length, 4);
  assert.equal(a.files.length, a.segments.length + 4);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the Draft step imports and finds Windows paths by file name', () => {
  assert.equal(op.medBaseName('C:\\Users\\x\\.selects\\plugin-data\\medical-explainer\\jobs\\mx1\\work\\card_1.mp4'), 'card_1.mp4');
  assert.match(op.medImportScript('p1', ['/a/b/card_1.mp4']), /importFiles\(\{ paths: need \}\)/);
  assert.ok(op.MED_READY_TRIES * op.MED_READY_PAUSE_MS >= 90000);
});

const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const probe = (f) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', f], {encoding: 'utf8'}).stdout);
test('ffmpeg: strip, split, card, retimed transition and dissolve have the right size, rate and length', {skip: !ffmpeg && 'ffmpeg is unavailable'}, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medexp-ff-'));
  const p = (n) => path.join(dir, n);
  const run = (args) => { const r = spawnSync('ffmpeg', args, {encoding: 'utf8'}); assert.equal(r.status, 0, r.stderr); };
  run(['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=24:duration=6', '-pix_fmt', 'yuv420p', p('clip.mp4')]);
  run(['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=3.04', '-pix_fmt', 'yuv420p', p('tr.mp4')]);
  run(['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720', '-frames:v', '1', p('kf.png')]);
  run(op.medStripArgs(p('clip.mp4'), p('strip.mp4')));
  let r = probe(p('strip.mp4'));
  assert.deepEqual([r.streams[0].width, r.streams[0].height, r.streams[0].r_frame_rate], [1080, 608, '24/1']);
  run(op.medSplitStripArgs(p('clip.mp4'), p('tr.mp4'), p('split.mp4')));
  r = probe(p('split.mp4'));
  assert.deepEqual([r.streams[0].width, r.streams[0].height], [1080, 608]);
  assert.ok(close(Number(r.format.duration), 6, 0.05), 'the split runs as long as this scene');
  run(op.medStillStripArgs(p('kf.png'), p('still.mp4'), 4.2));
  run(op.medCardArgs(p('strip.mp4'), p('card.mp4'), '#1f1f22'));
  r = probe(p('card.mp4'));
  assert.deepEqual([r.streams[0].width, r.streams[0].height, r.streams[0].r_frame_rate], [1080, 1920, '24/1']);
  assert.ok(Number(r.format.duration) >= 6, 'the card holds the strip (plus a held tail)');
  const px = spawnSync('ffmpeg', ['-v', 'error', '-ss', '1', '-i', p('card.mp4'), '-vf', 'crop=2:2:10:10', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']).stdout;
  for (const [i, want] of [0x1f, 0x1f, 0x22].entries()) assert.ok(Math.abs(px[i] - want) <= 3, `background ${[...px.subarray(0, 3)]}`);
  run(op.medFrameArgs(p('strip.mp4'), op.medLastFrameTime(4.5), p('out.png')));
  run(op.medFrameArgs(p('strip.mp4'), 0, p('in.png')));
  run(op.medTransitionCardArgs(p('tr.mp4'), p('trc.mp4'), '#1f1f22', 1.792, 3.04));
  assert.ok(close(Number(probe(p('trc.mp4')).format.duration), 1.792, 1 / FPS));
  run(op.medDissolveCardArgs(p('out.png'), p('in.png'), p('dis.mp4'), '#1f1f22', 1.792));
  assert.ok(close(Number(probe(p('dis.mp4')).format.duration), 1.792, 1 / FPS));
  run(op.medInsetCropArgs(p('kf.png'), p('inset.jpg')));
  run(op.medGridArgs([{file: p('clip.mp4'), t: 1, label: '3A'}, {file: p('kf.png'), t: null, label: ''}, {file: p('card.mp4'), t: 0.5, crop: '1080:608:0:656', label: '1S'}], 2, 320, 180, null, p('grid.jpg')));
  assert.ok(fs.statSync(p('grid.jpg')).size > 1000);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the last used frame is one frame before the out-point on the 24 fps grid', () => {
  assert.ok(close(op.medLastFrameTime(4.5), 4.5 - 1 / 24));
  assert.equal(op.medLastFrameTime(0), 0);
  const args = op.medFrameArgs('s.mp4', op.medLastFrameTime(2.25), 'out.png');
  assert.deepEqual(args.slice(3, 7), ['-ss', '2.208', '-i', 's.mp4']);
});
