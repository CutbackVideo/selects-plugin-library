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

test('timed captions follow the word timing, leave no gap between blocks, and hold until the next sentence', () => {
  const dur = 5.2;
  const words = op.medAlignWords(LONG, dur, [[0, 0.12], [2.4, 2.75], [5.05, null]], 'ko');
  const cues = op.medTimedCaptions(LONG, words, 10, dur, 16, 100);
  assert.equal(cues[0].start, 10);
  for (let i = 1; i < cues.length; i++) {
    assert.ok(cues[i].start >= cues[i - 1].end - 1e-9, 'no overlap');
    assert.ok(cues[i].start > 10 && cues[i].start < 10 + dur);
  }
  for (let i = 1; i < cues.length; i++) assert.equal(cues[i].start, cues[i - 1].end, 'no gap between blocks');
  const hold = 10 + dur + 0.8;
  const held = op.medTimedCaptions(LONG, words, 10, dur, 16, hold);
  assert.equal(held.at(-1).end, hold, 'the last block stays through the pause');
  for (const c of cues) assert.ok(c.text.split('\n').length <= 2);
  const early = op.medTimedCaptions(LONG, words, 10, dur, 16, 12);
  assert.equal(early.at(-1).end, 10 + dur, 'never cut off before the sentence ends');
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
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({version: op.MED_VERSION, lang: 'ko', mode: 'zoom', title: ['T1', 'T2'], scenes}));
  const gen = {};
  for (const s of scenes) {
    const f = path.join(dir, `mxT_narr_${s.n}_1.mp3`); fs.writeFileSync(f, ''); gen[`narr:${s.n}`] = {path: f};
    for (const c of 'AB') { const k = path.join(dir, `kf_${s.n}${c}.png`); fs.writeFileSync(k, ''); gen[`kf:${s.n}:${c}`] = {path: k}; }
  }
  fs.writeFileSync(path.join(dir, 'gen.json'), JSON.stringify(gen));
  return {dir, scenes};
}
const NARR = [5.2, 3.1, 2.6, 3.4];

test('requests: scene clips start from the keyframe only; transitions bind start and end frames, no unused slot', async () => {
  const {dir} = makeJob();
  const io = stubIO(dir, {duration: async (p) => NARR[Number(/narr_(\d)_/.exec(p)[1]) - 1]});
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
  // Only fields the Seedream 5.0 Pro text-to-image / edit schemas define (models.schema, 2026-10-22).
  const SEEDREAM = ['prompt', 'image_size', 'num_images', 'output_format', 'image_urls', 'enhance_prompt_mode', 'enable_safety_checker', 'sync_mode'];
  for (const r of kf) for (const k of Object.keys(r.input)) assert.ok(SEEDREAM.includes(k), k);
  assert.ok(['jpeg', 'png'].includes(kf[0].input.output_format));
  assert.match(kf[2].uploads.ref, /kf_1B\.png$/, 'scene 1\'s chosen keyframe is the style reference');
  assert.match(kf[2].key, /-rB$/);
  assert.ok(kf[2].input.prompt.endsWith(op.medStyleSuffix('medical', 'strip') + '.'));
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
  const io = stubIO(dir, {duration: async (p) => NARR[Number(/narr_(\d)_/.exec(p)[1]) - 1]});
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

// ---- review fixes: job-scoped imports, scene-check sampling, generation recovery ----
test('every file the Draft imports carries the job id, so a second run never reuses the first run\'s clips', async () => {
  const {dir} = makeJob();
  const calls = [];
  const io = stubIO(dir, {duration: async (p) => (/narr_(\d)_/.test(p) ? NARR[Number(/narr_(\d)_/.exec(p)[1]) - 1] : 3.04),
    ffmpeg: async (args) => { calls.push(args); fs.writeFileSync(args.at(-1), 'x'); }});
  await op.medEngine('timeline', dir, [], io);
  const strips = {};
  for (const n of [1, 2, 3, 4]) strips[n] = {strip: path.join(dir, 'work', `strip_${n}.mp4`), dur: 8};
  fs.writeFileSync(path.join(dir, 'work', 'strips.json'), JSON.stringify({strips, fallback: []}));
  const trFile = path.join(dir, 'mxT_tr_1_A_1.mp4'); fs.writeFileSync(trFile, '');
  const gen = JSON.parse(fs.readFileSync(path.join(dir, 'gen.json'), 'utf8'));
  gen['tr:1:A'] = {path: trFile};
  fs.writeFileSync(path.join(dir, 'gen.json'), JSON.stringify(gen));
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'A', 2: 'A', 3: 'A', 4: 'A'}, tr: {1: 'A', 2: 'none'}}));
  const comp = await op.medEngine('compose', dir, [], io);
  assert.equal(comp.ok, true, comp.error);
  assert.deepEqual(comp.dissolves, [2, 3]);
  const a = await op.medEngine('assembly', dir, [], io);
  assert.notEqual(a.ok, false, a.error);
  assert.equal(a.segments.length, 7);
  for (const f of a.files) assert.match(op.medBaseName(f), /^mxT_/, f);
  assert.equal(op.medWorkName('mx1', 'card', 3), 'mx1_card_3.mp4');
  assert.notEqual(op.medWorkName('mx1', 'card', 3), op.medWorkName('mx2', 'card', 3));
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the scene check samples start, middle and end inside each scene clip, never in a transition slot', () => {
  const tl = op.medTimeline(DURS);
  for (const sc of tl.scenes) {
    const times = op.medVerifyTimes(sc);
    assert.equal(times.length, 3);
    for (const t of times) {
      assert.ok(t >= sc.start && t < sc.end, `scene ${sc.n}: ${t}`);
      for (const b of tl.boundaries) assert.ok(!(t >= b.start && t < b.end), `scene ${sc.n}: ${t} is in slot ${b.after}`);
    }
    assert.ok(times[0] < times[1] && times[1] < times[2]);
  }
});

test('job snapshots: only a terminal provider failure counts as failed; a lost delivery is a delivery problem', () => {
  const c = op.medClassifyJob;
  assert.deepEqual(c({deliveryStatus: 'delivered', status: 'succeeded', outputs: [{path: '/x.mp4'}]}), {state: 'delivered', path: '/x.mp4'});
  for (const status of ['failed', 'cancelled', 'input_failed', 'submission_rejected']) assert.equal(c({status, deliveryStatus: status, outputs: []}).state, 'failed', status);
  for (const deliveryStatus of ['download_failed', 'result_collection_failed', 'import_failed']) assert.equal(c({status: 'succeeded', deliveryStatus, outputs: []}).state, 'delivery_failed');
  assert.equal(c({status: 'succeeded', deliveryStatus: 'delivered', outputs: []}).state, 'delivery_failed');
  for (const s of [{status: 'in_progress', deliveryStatus: 'waiting'}, {status: 'unknown', deliveryStatus: 'waiting'}, {status: 'succeeded', deliveryStatus: 'downloading'},
    {status: 'succeeded', deliveryStatus: 'collecting_result'}, {status: 'handoff_pending', deliveryStatus: 'x'}, undefined]) assert.equal(c(s).state, 'pending', JSON.stringify(s));
});

function fakeHost(script) {
  const log = {submits: [], lists: 0, retries: []};
  let clock = 0;
  const api = {
    submit: async (q) => { log.submits.push(q.key); return 'selects-' + q.key; },
    list: async (ids) => { log.lists++; return ids.map((id) => ({jobId: id, ...script(id, log.lists)})); },
    retryDelivery: async (id) => { log.retries.push(id); },
  };
  const opts = {persist: async () => {}, sleep: async (ms) => { clock += ms; }, now: () => clock};
  return {api, opts, log};
}
const REQ = (gen, attempt = 1) => ({gen, attempt, key: `mxT-${gen.replace(/:/g, '-')}-${attempt}`});

test('generation: a known failure is reported without polling or resubmitting; a new attempt has a new key', async () => {
  const gen = {'narr:1': {key: REQ('narr:1').key, attempt: 1, jobId: 'selects-old', failed: 'failed'}};
  const h = fakeHost(() => ({status: 'succeeded', deliveryStatus: 'delivered', outputs: [{path: '/n2.mp3'}]}));
  const r = await op.medRunGenerations([REQ('narr:1')], gen, h.api, h.opts);
  assert.deepEqual(r, {failed: [{gen: 'narr:1', code: 'failed'}], unresolved: [], ignored: []});
  assert.deepEqual(h.log.submits, []);
  const r2 = await op.medRunGenerations([REQ('narr:1', 2)], gen, h.api, h.opts);
  assert.deepEqual(r2, {failed: [], unresolved: [], ignored: []});
  assert.deepEqual(h.log.submits, [REQ('narr:1', 2).key]);
  assert.deepEqual(gen['narr:1'], {key: REQ('narr:1', 2).key, attempt: 2, jobId: 'selects-' + REQ('narr:1', 2).key, path: '/n2.mp3'});
});

test('generation: a host-reported failure while polling is marked and returned, once', async () => {
  const gen = {};
  const h = fakeHost((id, n) => (n < 3 ? {status: 'in_progress', deliveryStatus: 'waiting'} : {status: 'failed', deliveryStatus: 'failed', errorCode: 'provider_error'}));
  const r = await op.medRunGenerations([REQ('kf:2:A')], gen, h.api, h.opts);
  assert.deepEqual(r.failed, [{gen: 'kf:2:A', code: 'provider_error'}]);
  assert.equal(gen['kf:2:A'].failed, 'provider_error');
  assert.equal(h.log.submits.length, 1);
});

test('generation: a job still running at the deadline is unresolved, never failed and never resubmitted', async () => {
  const gen = {};
  const h = fakeHost(() => ({status: 'in_progress', deliveryStatus: 'waiting'}));
  const r = await op.medRunGenerations([REQ('clip:1:A'), REQ('clip:1:B')], gen, h.api, {...h.opts, deadlineMs: 60000});
  assert.deepEqual(r.failed, []);
  assert.deepEqual(r.unresolved.map((u) => [u.gen, u.reason]), [['clip:1:A', 'still in_progress / waiting'], ['clip:1:B', 'still in_progress / waiting']], 'the host status is shown');
  assert.equal(h.log.submits.length, 2);
  assert.ok(!gen['clip:1:A'].failed && gen['clip:1:A'].jobId);
  // Resuming reconnects to the same jobs; nothing is submitted again.
  const h2 = fakeHost(() => ({status: 'succeeded', deliveryStatus: 'delivered', outputs: [{path: '/c.mp4'}]}));
  assert.deepEqual(await op.medRunGenerations([REQ('clip:1:A'), REQ('clip:1:B')], gen, h2.api, h2.opts), {failed: [], unresolved: [], ignored: []});
  assert.deepEqual(h2.log.submits, []);
});

test('generation: a lost delivery gets bounded retryDelivery calls, then is surfaced, never repaid', async () => {
  const gen = {};
  const h = fakeHost(() => ({status: 'succeeded', deliveryStatus: 'download_failed', errorCode: 'download_failed', outputs: []}));
  const r = await op.medRunGenerations([REQ('tr:1:A')], gen, h.api, h.opts);
  assert.equal(h.log.retries.length, op.MED_DELIVERY_RETRIES);
  assert.deepEqual(r.unresolved.map((u) => u.reason), ['delivery download_failed']);
  assert.deepEqual(r.failed, []);
  assert.equal(h.log.submits.length, 1);
  // A retry that works delivers the file.
  const gen2 = {};
  const h2 = fakeHost((id, n) => (n === 1 ? {status: 'succeeded', deliveryStatus: 'download_failed', outputs: []} : {status: 'succeeded', deliveryStatus: 'delivered', outputs: [{path: '/t.mp4'}]}));
  assert.deepEqual(await op.medRunGenerations([REQ('tr:1:A')], gen2, h2.api, h2.opts), {failed: [], unresolved: [], ignored: []});
  assert.equal(gen2['tr:1:A'].path, '/t.mp4');
});

test('generation: an unacknowledged submission is submitted again under the same key; a failed list read is an error', async () => {
  const gen = {'kf:1:A': {key: REQ('kf:1:A').key, attempt: 1, phase: 'submitting'}};
  const persisted = [];
  const h = fakeHost(() => ({status: 'succeeded', deliveryStatus: 'delivered', outputs: [{path: '/k.png'}]}));
  await op.medRunGenerations([REQ('kf:1:A')], gen, h.api, {...h.opts, persist: async () => { persisted.push(JSON.parse(JSON.stringify(gen))); }});
  assert.deepEqual(h.log.submits, [REQ('kf:1:A').key]);
  assert.equal(persisted[0]['kf:1:A'].phase, 'submitting', 'recorded before the paid call');
  assert.ok(persisted[1]['kf:1:A'].jobId, 'job id recorded right after');
  const broken = fakeHost(() => ({}));
  broken.api.list = async () => { throw new Error('result clipped'); };
  await assert.rejects(op.medRunGenerations([REQ('kf:1:B')], {}, broken.api, broken.opts), /result clipped/);
  const stopped = fakeHost(() => ({status: 'in_progress'}));
  await assert.rejects(op.medRunGenerations([REQ('music')], {}, stopped.api, {...stopped.opts, stopped: () => true}), /stopped/);
});

test('the job list is read for this job only, with the fields the app needs', async () => {
  const rows = Array.from({length: 500}, (_, i) => ({jobId: `selects-${i}`, status: 'succeeded', deliveryStatus: 'delivered', prompt: 'x'.repeat(2000),
    errorCode: undefined, outputs: [{outputIndex: 0, status: 'delivered', path: `/p${i}`}]}));
  const src = op.medJobsScript('p1', ['selects-3', 'selects-7']).replace(/: any/g, '');
  const out = await new Function('selects', `return (async () => {${src}})();`)({generation: {jobs: async (pid) => { assert.equal(pid, 'p1'); return rows; }}});
  assert.deepEqual(out, [
    {jobId: 'selects-3', status: 'succeeded', deliveryStatus: 'delivered', errorCode: null, issues: [], outputs: [{status: 'delivered', path: '/p3'}]},
    {jobId: 'selects-7', status: 'succeeded', deliveryStatus: 'delivered', errorCode: null, issues: [], outputs: [{status: 'delivered', path: '/p7'}]},
  ]);
  assert.ok(JSON.stringify(out).length < 1000);
});

// ---- live-run caption fixes: no orphan tails, no gaps ----
// Sentences from the Staging run of 2026-10-22 whose last word ended up alone in a caption.
const LIVE = [
  '\uace0\ud608\uc555\uc740 \ud608\uad00 \ubcbd\uc744 \ub204\ub974\ub294 \uc555\ub825\uc774 \uc624\ub7ab\ub3d9\uc548 \ub192\uac8c \uc720\uc9c0\ub418\ub294 \uc0c1\ud0dc\uc785\ub2c8\ub2e4.',
  '\ud608\uad00 \ubcbd\uc5d0 \uc313\uc778 \ud50c\ub77c\ud06c\ub294 \uc2dc\uac04\uc774 \uc9c0\ub0a0\uc218\ub85d \uc810\uc810 \ub354 \ub450\uaecd\uac8c \uc790\ub77c\ub0a9\ub2c8\ub2e4.',
  '\ub192\uc740 \ud608\uc555\uc740 \ud608\uad00 \uc548\ucabd \ubcbd\uc5d0 \ub04a\uc784\uc5c6\uc774 \uc190\uc0c1\uc744 \uc90d\ub2c8\ub2e4.',
  LONG,
];
const blockLen = (b) => op.medLen(b.tokens.join(' '));
test('captions: a sentence that fits two lines is one block; longer ones split into balanced blocks, never a lone tail word', () => {
  for (const text of LIVE) {
    const blocks = op.medCaptionBlocks(text, 16, 2);
    const words = text.split(/\s+/);
    assert.deepEqual(blocks.flatMap((b) => b.tokens), words, 'every word once, in order');
    for (const b of blocks) {
      assert.ok(b.lines.length >= 1 && b.lines.length <= 2);
      for (const l of b.lines) assert.ok(op.medLen(l) <= 16, l);
      if (b.lines.length === 2) assert.ok(Math.abs(op.medLen(b.lines[0]) - op.medLen(b.lines[1])) <= 8, `unbalanced ${b.lines}`);
    }
    if (op.medBalancedLines(words, 16, 2)) assert.equal(blocks.length, 1, `fits one block: ${text}`);
    if (blocks.length > 1) {
      const lens = blocks.map(blockLen);
      assert.ok(Math.min(...lens) >= 0.4 * Math.max(...lens), `balanced blocks ${lens}`);
      for (const b of blocks) assert.ok(b.tokens.length > 1, `lone word ${b.tokens}`);
    }
  }
  // The three orphan cases from the live run.
  assert.equal(op.medCaptionBlocks(LIVE[2], 16, 2).length, 1);
  assert.deepEqual(op.medCaptionCards(LIVE[2], 16, 2)[0].length, 2);
  assert.ok(op.medCaptionBlocks(LIVE[0], 16, 2).at(-1).tokens.length > 1);
  assert.ok(op.medCaptionBlocks(LIVE[1], 16, 2).at(-1).tokens.length > 1);
  assert.deepEqual(op.medCaptionBlocks('\uc548\ub155\ud558\uc138\uc694.', 16, 2).map((b) => b.lines), [['\uc548\ub155\ud558\uc138\uc694.']]);
  assert.deepEqual(op.medBalancedLines(['a', 'bb', 'ccc', 'dddd'], 8, 2), ['a bb', 'ccc dddd']);
  assert.equal(op.medBalancedLines(['aaaaaaa', 'bbbbbbb', 'ccccccc'], 8, 2), null);
});

test('captions run without a gap from the first sentence to the end of the Draft, over pauses and transitions', async () => {
  const {dir} = makeJob();
  const io = stubIO(dir, {duration: async (p) => NARR[Number(/narr_(\d)_/.exec(p)[1]) - 1],
    silences: async () => [[0, 0.1], [1.6, 1.9]]});
  await op.medEngine('timeline', dir, [], io);
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
  const caps = tl.captions;
  assert.equal(caps[0].start, tl.narration[0].start);
  for (let i = 1; i < caps.length; i++) assert.equal(caps[i].start, caps[i - 1].end, `gap before caption ${i + 1}`);
  assert.equal(caps.at(-1).end, tl.total, 'the last caption holds to the end');
  for (const [i, nr] of tl.narration.entries()) {
    assert.ok(caps.some((c) => c.start === nr.start), `sentence ${i + 1} starts a caption with its narration`);
    if (i + 1 < tl.narration.length) {
      const b = tl.boundaries[i];
      assert.ok(caps.some((c) => c.start <= b.start && c.end >= b.end - 1e-9 || c.start < b.center && c.end > b.center), `a caption covers transition ${i + 1}`);
    }
  }
  fs.rmSync(dir, {recursive: true, force: true});
});

// ---- keyframe model choice and the content-policy fallback ----
// Input fields each model's schema defines (models.schema on the live catalog, 2026-10-22).
const KF_SCHEMA = {
  'bytedance/seedream/v5/pro/text-to-image': ['prompt', 'image_size', 'num_images', 'output_format', 'enhance_prompt_mode', 'enable_safety_checker', 'sync_mode'],
  'bytedance/seedream/v5/pro/edit': ['prompt', 'image_urls', 'image_size', 'num_images', 'output_format', 'enhance_prompt_mode', 'enable_safety_checker', 'sync_mode'],
  'google/nano-banana-2.1': ['prompt', 'seed', 'sync_mode', 'safety_tolerance', 'num_images', 'resolution', 'aspect_ratio', 'thinking_level', 'limit_generations', 'system_prompt', 'enable_web_search', 'output_format'],
  'google/nano-banana-2.1/edit': ['prompt', 'image_urls', 'output_format', 'resolution', 'pdf_url', 'thinking_level', 'enable_web_search', 'seed', 'safety_tolerance', 'video_url', 'aspect_ratio', 'system_prompt', 'sync_mode', 'limit_generations', 'num_images'],
  'fal-ai/nano-banana-pro': ['prompt', 'resolution', 'safety_tolerance', 'output_format', 'sync_mode', 'num_images', 'aspect_ratio', 'enable_web_search', 'system_prompt', 'seed', 'limit_generations'],
  'fal-ai/nano-banana-pro/edit': ['prompt', 'image_urls', 'resolution', 'safety_tolerance', 'output_format', 'sync_mode', 'num_images', 'aspect_ratio', 'enable_web_search', 'system_prompt', 'seed', 'limit_generations'],
  'openai/gpt-image-2.5/flare/text-to-image': ['prompt', 'image_size', 'background', 'sync_mode', 'output_format', 'quality', 'output_compression', 'enable_safety_checker', 'num_images'],
  'openai/gpt-image-2.5/flare/edit': ['prompt', 'image_urls', 'image_size', 'mask_url', 'background', 'sync_mode', 'output_format', 'quality', 'output_compression', 'enable_safety_checker', 'num_images'],
  'blackforestlabs/flux-3/text-to-image': ['prompt', 'resolution', 'safety_tolerance', 'aspect_ratio', 'output_format', 'sync_mode', 'version', 'enable_prompt_expansion'],
};
const KF_ENUMS = {aspect_ratio: ['16:9'], resolution: ['2K', '2k'], image_size: ['landscape_16_9'], output_format: ['png']};
const KF_ENDPOINTS = {
  seedream: ['bytedance/seedream/v5/pro/text-to-image', 'bytedance/seedream/v5/pro/edit'],
  'nano-banana-2.1': ['google/nano-banana-2.1', 'google/nano-banana-2.1/edit'],
  'nano-banana-pro': ['fal-ai/nano-banana-pro', 'fal-ai/nano-banana-pro/edit'],
  'gpt-image-2.5': ['openai/gpt-image-2.5/flare/text-to-image', 'openai/gpt-image-2.5/flare/edit'],
  'flux-3': ['blackforestlabs/flux-3/text-to-image', null],
};

test('keyframe models: scene 1 from text, scenes 2-N as edits of scene 1, only schema fields, 16:9', async () => {
  assert.equal(op.MED_KF_DEFAULT, 'seedream');
  assert.deepEqual(Object.keys(op.MED_KF_MODELS), Object.keys(KF_ENDPOINTS));
  for (const [id, [t2i, edit]] of Object.entries(KF_ENDPOINTS)) {
    const m = op.MED_KF_MODELS[id];
    assert.equal(decode(m.t2i), t2i, id);
    assert.equal(m.edit ? decode(m.edit) : null, edit, id);
    const {dir} = makeJob({kfModel: id});
    fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'A'}}));
    const reqs = (await op.medEngine('requests', dir, ['keyframes', '1,2'], stubIO(dir))).requests;
    assert.deepEqual(reqs.map((r) => r.gen), ['kf:1:A', 'kf:1:B', 'kf:2:A', 'kf:2:B'], id);
    for (const r of reqs) {
      const endpoint = decode(r.modelId);
      const scene1 = r.gen.startsWith('kf:1:');
      assert.equal(endpoint, scene1 || !edit ? t2i : edit, `${id} ${r.gen}`);
      for (const k of Object.keys(r.input)) assert.ok(KF_SCHEMA[endpoint].includes(k), `${endpoint} has no ${k}`);
      for (const [k, allowed] of Object.entries(KF_ENUMS)) if (typeof r.input[k] === 'string') assert.ok(allowed.includes(r.input[k]), `${id} ${k}=${r.input[k]}`);
      assert.ok(r.input.aspect_ratio === '16:9' || r.input.image_size === 'landscape_16_9' || r.input.image_size?.width / r.input.image_size?.height === 16 / 9, id);
      assert.ok(r.input.prompt.includes(op.medStyleSuffix('medical', 'strip')));
      if (!scene1 && edit) { assert.deepEqual(r.input.image_urls, ['selects-input:ref']); assert.deepEqual(Object.keys(r.uploads), ['ref']); }
      else { assert.ok(!('image_urls' in r.input)); assert.deepEqual(r.uploads, {}); }
      if (id !== 'seedream') assert.match(r.key, new RegExp(`-m${op.MED_KF_MODELS[id].tag}`), 'a model choice is part of the request key');
      assert.match(r.key, op.MED_KEY_PATTERN);
    }
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// A fake Selects host for the clip stage: Kling refuses keyframes listed in `refuse` for content policy, delivers
// everything else; `pending` keeps a job running forever.
function policyHost(dir, {refuse = new Set(), pending = new Set(), submitRefuse = false} = {}) {
  const jobs = new Map();
  const log = {submits: [], kfPolicy: []};
  const api = {
    submit: async (q) => {
      log.submits.push(q);
      if (/^kf:\d+:R\d+$/.test(q.gen)) log.kfPolicy.push(q);
      const kf = q.uploads.start ? path.basename(q.uploads.start) : '';
      const refused = q.gen.startsWith('clip:') && [...refuse].some((x) => kf.includes(x));
      if (refused && submitRefuse) throw new Error('generation_api_422:content_policy_violation');
      jobs.set('selects-' + q.key, {refused, pending: pending.has(q.gen), out: path.join(dir, `${q.outputName}.${q.tool === 'image' ? 'png' : 'mp4'}`)});
      return 'selects-' + q.key;
    },
    list: async (ids) => ids.map((id) => {
      const j = jobs.get(id);
      if (j.pending) return {jobId: id, status: 'in_progress', deliveryStatus: 'waiting', outputs: []};
      if (j.refused) return {jobId: id, status: 'failed', deliveryStatus: 'failed', errorCode: 'provider_failed', issues: ['content_policy_violation'], outputs: []};
      fs.writeFileSync(j.out, 'x');
      return {jobId: id, status: 'succeeded', deliveryStatus: 'delivered', outputs: [{status: 'delivered', path: j.out}]};
    }),
    retryDelivery: async () => {},
  };
  return {api, log};
}
async function clipStageFixture(hostOpts) {
  const {dir} = makeJob({kfModel: 'nano-banana-2.1'});
  const io = stubIO(dir, {duration: async (p) => NARR[Number(/narr_(\d)_/.exec(p)[1]) - 1]});
  await op.medEngine('timeline', dir, [], io);
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'A', 2: 'B', 3: 'A', 4: 'A'}, clip: {}, tr: {}}));
  const gen = JSON.parse(fs.readFileSync(path.join(dir, 'gen.json'), 'utf8'));
  const host = policyHost(dir, hostOpts);
  let clock = 0;
  const ctx = {
    gen,
    requests: async (kind, ids, attempt) => {
      fs.writeFileSync(path.join(dir, 'gen.json'), JSON.stringify(gen));
      const r = await op.medEngine('requests', dir, [kind, ids.join(','), ...(attempt > 1 ? ['--attempt', String(attempt)] : [])], io);
      assert.notEqual(r.ok, false, r.error);
      return r.requests;
    },
    generate: (reqs) => op.medRunGenerations(reqs, gen, host.api, {persist: async () => {}, sleep: async (ms) => { clock += ms; }, now: () => clock, deadlineMs: 60000}),
    unresolved: (list) => Object.assign(new Error('unresolved'), {unresolved: list.map((u) => u.gen)}),
    readPicks: async () => JSON.parse(fs.readFileSync(path.join(dir, 'picks.json'), 'utf8')),
    writePicks: async (p) => fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify(p)),
  };
  return {dir, io, gen, host, ctx};
}

test('a clip refused for content policy is shown for the user; nothing is regenerated or resubmitted on its own', async () => {
  const {dir, host, ctx} = await clipStageFixture({refuse: new Set(['kf_2B'])});
  const out = await op.medClipsStage(ctx, ['1', '2', '3', '4']);
  assert.deepEqual(out, {blocked: ['2'], regenFailed: [], still: []});
  assert.equal(host.log.kfPolicy.length, 0, 'no keyframe without the user asking');
  assert.equal(host.log.submits.filter((q) => q.gen.startsWith('clip:2:')).length, 2, 'the refused takes are not retried');
  // Running the stage again (Resume) changes nothing: still blocked, no new submission.
  const n = host.log.submits.length;
  assert.deepEqual(await op.medClipsStage(ctx, ['1', '2', '3', '4']), out);
  assert.equal(host.log.submits.length, n);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the user regenerates a refused scene\'s keyframe with a chosen model: new keys, then success', async () => {
  const {dir, gen, host, ctx} = await clipStageFixture({refuse: new Set(['kf_2B'])});
  await op.medClipsStage(ctx, ['1', '2', '3', '4']);
  // What the panel's "Regenerate this scene's keyframe with Seedream 5.0 Pro" button records.
  const picks = await ctx.readPicks();
  picks.regen = {2: {model: 'seedream', k: 1}};
  await ctx.writePicks(picks);
  const out = await op.medClipsStage(ctx, ['1', '2', '3', '4']);
  assert.deepEqual(out, {blocked: [], regenFailed: [], still: []});
  assert.equal(host.log.kfPolicy.length, 1);
  const kf = host.log.kfPolicy[0];
  assert.equal(kf.gen, 'kf:2:R1');
  assert.equal(decode(kf.modelId), 'bytedance/seedream/v5/pro/edit', 'the model the user chose');
  assert.match(kf.key, /-msd5p-rA$/);
  assert.equal(kf.input.prompt, op.medKeyframePrompt(JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8')).scenes[1], true));
  assert.match(kf.uploads.ref, /kf_1A\.png$/, 'scene 1 stays the style reference');
  assert.equal((await ctx.readPicks()).kf['2'], 'R1');
  const clip2 = host.log.submits.filter((q) => q.gen.startsWith('clip:2:'));
  assert.equal(clip2.length, 4);
  assert.notEqual(clip2[2].key, clip2[0].key);
  assert.match(clip2[2].key, /-kR1$/);
  assert.ok(gen['clip:2:A'].path);
  // A second click for the same scene is a second request (k=2) with the other model, never a reused key.
  const picks2 = await ctx.readPicks();
  picks2.regen = {2: {model: 'nano-banana-2.1', k: 2}};
  await ctx.writePicks(picks2);
  const reqs = (await op.medEngine('requests', dir, ['kfregen', '2'], stubIO(dir))).requests;
  assert.deepEqual(reqs.map((r) => [r.gen, decode(r.modelId)]), [['kf:2:R2', 'google/nano-banana-2.1/edit']]);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('refused again after regenerating: shown again; "Use still image" falls back to the still zoom', async () => {
  const {dir, io, host, ctx} = await clipStageFixture({refuse: new Set(['kf_3A', 'kf_3_R1'])});
  await op.medClipsStage(ctx, ['1', '2', '3', '4']);
  let picks = await ctx.readPicks();
  picks.regen = {3: {model: 'seedream', k: 1}};
  await ctx.writePicks(picks);
  assert.deepEqual((await op.medClipsStage(ctx, ['1', '2', '3', '4'])).blocked, ['3']);
  assert.equal(host.log.kfPolicy.length, 1, 'one keyframe per click');
  picks = await ctx.readPicks();
  picks.still = {3: true};
  await ctx.writePicks(picks);
  const n = host.log.submits.length;
  assert.deepEqual(await op.medClipsStage(ctx, ['1', '2', '3', '4']), {blocked: [], regenFailed: [], still: ['3']});
  assert.equal(host.log.submits.length, n, 'choosing the still submits nothing');
  const strips = [];
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({...(await ctx.readPicks()), clip: {1: 'A', 2: 'A', 4: 'A'}}));
  const r = await op.medEngine('strips', dir, [], {...io, ffmpeg: async (a) => { strips.push(a); fs.writeFileSync(a.at(-1), 'x'); }, duration: async () => 6});
  assert.deepEqual(r.fallback, [3]);
  const still = strips.find((a) => a.includes('-loop'));
  assert.match(still[still.indexOf('-i') + 1], /kf_3_R1_1\.png$/);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('a refused submission (no job) is shown the same way', async () => {
  const {dir, host, ctx} = await clipStageFixture({refuse: new Set(['kf_4A']), submitRefuse: true});
  assert.deepEqual((await op.medClipsStage(ctx, ['1', '2', '3', '4'])).blocked, ['4']);
  assert.equal(host.log.kfPolicy.length, 0);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('an unknown or unresolved clip job never triggers the policy fallback', async () => {
  const {dir, host, ctx} = await clipStageFixture({pending: new Set(['clip:2:A', 'clip:2:B'])});
  await assert.rejects(op.medClipsStage(ctx, ['1', '2', '3', '4']), (e) => e.unresolved?.includes('clip:2:A'));
  assert.equal(host.log.kfPolicy.length, 0);
  assert.equal(op.medIsPolicyRejection({status: 'unknown', errorCode: undefined}), false);
  assert.equal(op.medClassifyJob({status: 'unknown', deliveryStatus: 'waiting', issues: ['content_policy_violation']}).state, 'pending', 'only a terminal failure');
  assert.equal(op.medClassifyJob({status: 'failed', errorCode: 'provider_failed', errorIssues: [{code: 'content_policy_violation'}]}).policy, true);
  assert.equal(op.medClassifyJob({status: 'failed', errorCode: 'content_policy_violation'}).policy, true);
  assert.ok(!op.medClassifyJob({status: 'failed', errorCode: 'provider_failed'}).policy);
  assert.deepEqual(op.medPolicyScenes(['1'], {'clip:1:A': {failed: 'provider_failed'}, 'clip:1:B': {failed: 'provider_failed'}}, {kf: {}}), [], 'ordinary failures keep the normal retry');
  assert.deepEqual(op.medPolicyScenes(['1'], {'clip:1:A': {failed: 'content_policy_violation', policy: true}}, {kf: {}, still: {1: true}}), [], 'the user chose the still');
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the chosen keyframe model shows in the usage line and the run summary', () => {
  const panel = fs.readFileSync(path.resolve(import.meta.dirname, '../plugins/medical-explainer/panel.tsx'), 'utf8');
  assert.match(panel, /check\.counts\.narrations, music, medKfModel\(kfModel\)\.label\)/);
  assert.match(panel, /S\.kfModelUsed\(result\.kfModel\)/);
  assert.match(panel, /kfModel: medKfModel\(set\.kfModel\)\.label/);
  assert.match(panel, /voice: now\.voice, music: now\.music, kfModel: now\.kfModel/);
});

// ---- length cap (PR review P2) ----
test('a sentence too long for one Kling clip stops the run after narration, before any keyframe or clip', async () => {
  const tl = op.medTimeline([20, 4, 4]);
  assert.ok(tl.scenes[0].span > op.MED_KLING_MAX - op.MED_SPAN_MARGIN);
  assert.equal(tl.scenes[0].clipSeconds, 15);
  assert.deepEqual(op.medLengthProblems(tl).map((x) => x.scene), [1]);
  assert.deepEqual(op.medLengthProblems(op.medTimeline(DURS)), []);
  // Just under the cap passes; every passing span is covered by its clip.
  for (const L of [10, 12, 13.5, 14]) {
    const t = op.medTimeline([4, L, 4]);
    const bad = op.medLengthProblems(t).length > 0;
    assert.equal(bad, t.scenes[1].span > 14.5, `L=${L}`);
    if (!bad) for (const s of t.scenes) assert.ok(s.clipSeconds >= s.span);
  }
  // The engine reports it from the measured narration.
  const {dir} = makeJob();
  const io = stubIO(dir, {duration: async (p) => [20, 4, 4, 4][Number(/narr_(\d)_/.exec(p)[1]) - 1]});
  const out = await op.medEngine('timeline', dir, [], io);
  assert.deepEqual(out.tooLong.map((x) => x.scene), [1]);
  fs.rmSync(dir, {recursive: true, force: true});
  const panel = fs.readFileSync(path.resolve(import.meta.dirname, '../plugins/medical-explainer/panel.tsx'), 'utf8');
  const timing = panel.indexOf('if (t.tooLong?.length) {');
  assert.ok(timing > 0 && timing < panel.indexOf('if (!pj.kfDone) {'), 'checked before the keyframe stage');
  assert.doesNotMatch(panel.slice(timing, timing + 400), /setpts|atempo|playbackSpeed/);
});

test('an edited sentence is narrated again under a new key; the others keep theirs', async () => {
  const {dir} = makeJob();
  const io = stubIO(dir);
  const before = (await op.medEngine('requests', dir, ['narration'], io)).requests;
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  plan.scenes[1].narration = 'A shorter sentence.';
  plan.scenes[1].rev = 1;
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan));
  const after = (await op.medEngine('requests', dir, ['narration'], io)).requests;
  assert.deepEqual(after.map((r, i) => r.key === before[i].key), [true, false, true, true]);
  assert.match(after[1].key, /-v1$/);
  assert.equal(after[1].input.text, 'A shorter sentence.');
  fs.rmSync(dir, {recursive: true, force: true});
});

// ---- topic-dependent flow and screen composition (PR review item 2) ----
const ANATOMY = /blood|vessel|arter|\bcells?\b|molecul|anatom|plaque|tissue|\borgans?\b|cholesterol|glossy/i;
const F = {budget: op.medBudget('ko'), language: 'Korean', style: 'formal', lang: 'ko', titleChars: 10, labelChars: 12};
const ART = {title: 'topic', method: 'topic'};

test('script prompts: one per mode, no forced anatomy terms, only that mode\'s fields; auto describes all four', () => {
  const fields = {zoom: ['pointers', 'split', 'insets', 'scale'], myth: ['mythIndex', 'verdict', 'reasonCard'], timeline: ['timeChip'], list: ['stepNumber', 'stepCard']};
  for (const mode of ['zoom', 'myth', 'timeline', 'list', 'auto']) {
    const prompt = op.medScriptPrompt(ART, F, mode);
    assert.doesNotMatch(prompt, ANATOMY, mode);
    for (const [m, list] of Object.entries(fields)) for (const f of list) {
      if (mode === 'auto' || mode === m) assert.ok(prompt.includes(f), `${mode} lacks ${f}`);
      else if (!['zoom'].includes(mode) || !['split', 'insets'].includes(f)) assert.ok(!prompt.includes(f + ' ('), `${mode} has ${m}'s ${f}`);
    }
    for (const t of ['cut', 'flash', 'dissolve', 'push', 'pull', 'subject', 'motion', 'transitionOut']) assert.ok(prompt.includes(t), `${mode}: ${t}`);
    assert.equal(prompt.includes('set "mode"'), mode === 'auto');
  }
});

test('plan schema per mode: subject, motion and transitionOut on every scene; mode fields only for their mode', () => {
  const sc = (extra) => ({narration: 'A sentence.', subject: 'a person at a kitchen table', motion: 'steam rises from a cup', camera: 'push_in', label: 'L', ...extra});
  const raw = (mode) => ({mode, title_lines: ['A', 'B'], scenes: [
    sc({transitionOut: 'flash', verdict: 'X', mythIndex: 1, reasonCard: 'reason one', timeChip: '07:00', stepNumber: 1, stepCard: 'step one'}),
    sc({transitionOut: 'nonsense', verdict: 'o', mythIndex: 5, reasonCard: 'reason two', timeChip: '12:00', stepNumber: 2, stepCard: 'step two'}),
    sc({verdict: 'X', reasonCard: 'three'}), sc({verdict: 'X', reasonCard: 'four'}), sc({}),
  ]});
  for (const mode of ['zoom', 'myth', 'timeline', 'list']) {
    const {plan} = op.medNormalizePlan(raw(mode), 'en', 'T');
    assert.equal(plan.mode, mode);
    assert.equal(plan.version, op.MED_VERSION);
    for (const s of plan.scenes) {
      assert.equal(s.subject, 'a person at a kitchen table');
      assert.equal(s.motion, 'steam rises from a cup');
      assert.ok(s.n === plan.scenes.length ? s.transitionOut === null : op.MED_TRANSITIONS.includes(s.transitionOut));
      if ('verdict' in s) assert.equal(mode, 'myth');
      if ('timeChip' in s) assert.equal(mode, 'timeline');
      if ('stepNumber' in s) assert.equal(mode, 'list');
    }
    assert.equal(plan.scenes[0].transitionOut, 'flash');
    if (mode === 'timeline') assert.deepEqual(plan.scenes.map((x) => x.timeChip || null), ['07:00', '12:00', null, null, null]);
    if (mode === 'list') assert.deepEqual(plan.scenes.map((x) => x.stepNumber || null), [1, 2, null, null, null]);
    assert.equal(plan.scenes[1].transitionOut, op.MED_MODES[mode].transition === 'push' ? 'push' : op.MED_MODES[mode].transition, 'an unknown boundary takes the mode default');
  }
  const myth = op.medNormalizePlan(raw('myth'), 'en', 'T').plan;
  assert.deepEqual(myth.scenes.map((s) => s.mythIndex || null), [1, 2, 3, null, null], 'at most three myths, numbered in order');
  assert.deepEqual(myth.scenes.slice(0, 2).map((s) => s.verdict), ['X', 'O']);
  // The user's mode overrides the script's.
  assert.equal(op.medNormalizePlan(raw('myth'), 'en', 'T', 'list').plan.mode, 'list');
  assert.equal(op.medNormalizePlan({scenes: raw('x').scenes}, 'en', 'T').plan.mode, 'zoom');
});

test('art presets are style only and go into the keyframe suffix; motion comes from the plan', () => {
  for (const [art, a] of Object.entries(op.MED_ARTS)) {
    for (const layout of ['strip', 'fullbleed']) {
      const suffix = op.medStyleSuffix(art, layout);
      assert.ok(suffix.startsWith(a.style), art);
      assert.ok(suffix.endsWith('no text, no labels, no watermark'));
      assert.match(suffix, layout === 'strip' ? /16:9/ : /9:16/);
      assert.doesNotMatch(suffix, ANATOMY, `${art} ${layout}`);
    }
  }
  const scene = {subject: 'a runner tying a shoe', motion: 'the laces tighten', camera: 'lateral'};
  const m = op.medMotionPrompt(scene, 'everyday');
  assert.ok(m.startsWith(op.MED_ARTS.everyday.motion));
  assert.match(m, /MOTION: the laces tighten\./);
  assert.doesNotMatch(m, /blood|drifting cells|pulsing/);
  assert.match(op.medMotionPrompt({subject: 'x', camera: 'push_in'}), /subtle natural motion/);
  assert.equal(op.medKeyframePrompt(scene, false, op.medStyleSuffix('infographic', 'fullbleed')), `a runner tying a shoe. ${op.medStyleSuffix('infographic', 'fullbleed')}.`);
  // Defaults follow the mode; the user's art/layout choice wins.
  assert.deepEqual(['zoom', 'myth', 'timeline', 'list'].map((mode) => { const st = op.medStyleFor({}, {mode}); return [st.art, st.layout]; }),
    [['medical', 'strip'], ['everyday', 'fullbleed'], ['character', 'fullbleed'], ['infographic', 'fullbleed']]);
  assert.deepEqual((({art, layout}) => [art, layout])(op.medStyleFor({art: 'character', layout: 'strip'}, {mode: 'myth'})), ['character', 'strip']);
});

test('fullbleed layout: 9:16 keyframes for every model, the picture fills 1080x1920, title band and caption box placed', async () => {
  const want = {seedream: ['image_size', {width: 1440, height: 2560}], 'nano-banana-2.1': ['aspect_ratio', '9:16'], 'nano-banana-pro': ['aspect_ratio', '9:16'],
    'gpt-image-2.5': ['image_size', 'portrait_16_9'], 'flux-3': ['aspect_ratio', '9:16']};
  for (const [id, [k, v]] of Object.entries(want)) {
    const {dir} = makeJob({kfModel: id, layout: 'fullbleed'});
    fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'A'}}));
    const reqs = (await op.medEngine('requests', dir, ['keyframes', '1,2'], stubIO(dir))).requests;
    for (const r of reqs) {
      assert.deepEqual(r.input[k], v, id);
      assert.match(r.input.prompt, /vertical 9:16 frame/);
      for (const f of Object.keys(r.input)) assert.ok(KF_SCHEMA[decode(r.modelId)].includes(f), `${id}: ${f}`);
    }
    fs.rmSync(dir, {recursive: true, force: true});
  }
  const g = op.MED_LAYOUTS.fullbleed;
  assert.deepEqual(g.frame, {x: 0, y: 0, w: 1080, h: 1920});
  assert.deepEqual([g.title.top, g.title.top + g.title.height, g.title.band], [120, 300, true]);
  assert.deepEqual([g.caption.top, g.caption.top + g.caption.height], [1450, 1600]);
  assert.equal(g.wordmark.centerY, 1780);
  assert.ok(g.label.top >= 300 && g.chip.top >= 300 && g.card.top + 80 <= g.caption.top, 'overlays clear of the title band and the captions');
  const args = op.medStripArgs('a.mp4', 'b.mp4', g.frame);
  assert.match(args[args.indexOf('-filter_complex') + 1], /scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920/);
  const card = op.medCardArgs('s.mp4', 'c.mp4', '#1f1f22', g.frame);
  assert.match(card[card.indexOf('-filter_complex') + 1], /overlay=0:0:shortest=1/);
  // The strip layout is unchanged.
  assert.deepEqual(op.MED_LAYOUTS.strip.frame, op.MED_STRIP);
  for (const l of Object.values(op.MED_LAYOUTS)) assert.equal(typeof l.label.top, 'number', 'layout geometry keys are not shadowed');
});

test('transitions: only push and pull are generated clips; cut is a hard cut, flash 3 frames, dissolve 0.5 s', async () => {
  const types = ['cut', 'flash', 'dissolve', 'pull'];
  const tl = op.medTimeline([4.2, 5.1, 3.9, 6.0, 4.4], types);
  assert.deepEqual(tl.boundaries.map((b) => b.type), types);
  assert.deepEqual(tl.boundaries.map((b) => b.generated), [false, false, false, true]);
  assert.equal(tl.boundaries[0].slot, 0);
  assert.ok(close(tl.boundaries[1].slot, 3 / 24, 1e-9));
  assert.ok(close(tl.boundaries[2].slot, 0.5, 1 / 24));
  assert.ok(close(tl.boundaries[3].slot, 1.8, 1 / 24));
  let sum = 0;
  for (const s of tl.scenes) sum += s.span;
  for (const b of tl.boundaries) sum += b.slot;
  assert.ok(close(sum, tl.total, 1e-6));
  for (const s of tl.scenes) assert.ok(s.clipSeconds >= s.span, `scene ${s.n} covered`);
  // The engine asks for transition clips at push/pull boundaries only, and composes the rest locally.
  const {dir} = makeJob();
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  ['cut', 'flash', 'push'].forEach((t, i) => { plan.scenes[i].transitionOut = t; });
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan));
  const calls = [];
  const io = stubIO(dir, {duration: async (p) => (/narr_(\d)_/.test(p) ? NARR[Number(/narr_(\d)_/.exec(p)[1]) - 1] : 3.04), ffmpeg: async (a) => { calls.push(a); fs.writeFileSync(a.at(-1), 'x'); }});
  await op.medEngine('timeline', dir, [], io);
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'A', 2: 'A', 3: 'A', 4: 'A'}, clip: {}, tr: {}}));
  for (const n of [1, 2, 3, 4]) { fs.writeFileSync(path.join(dir, 'work', `out_${n}.png`), ''); fs.writeFileSync(path.join(dir, 'work', `in_${n}.png`), ''); }
  const tr = (await op.medEngine('requests', dir, ['transitions'], io)).requests;
  assert.deepEqual([...new Set(tr.map((r) => r.gen.split(':')[1]))], ['3']);
  const strips = {};
  for (const n of [1, 2, 3, 4]) strips[n] = {strip: path.join(dir, 'work', `strip_${n}.mp4`), dur: 8};
  fs.writeFileSync(path.join(dir, 'work', 'strips.json'), JSON.stringify({strips, fallback: []}));
  const comp = await op.medEngine('compose', dir, [], io);
  assert.equal(comp.ok, true, comp.error);
  const c = JSON.parse(fs.readFileSync(path.join(dir, 'work', 'compose.json'), 'utf8'));
  assert.deepEqual(c.segments.map((s) => s.kind), ['scene', 'scene', 'flash', 'scene', 'transition', 'scene']);
  assert.deepEqual(c.dissolves, [3], 'only the generated boundary without a take falls back');
  assert.ok(calls.some((a) => a.join(' ').includes('color=c=white')));
  fs.rmSync(dir, {recursive: true, force: true});
});

test('ffmpeg: a 3-frame flash and a 0.5 s planned dissolve on both layouts', {skip: !ffmpeg && 'ffmpeg is unavailable'}, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medexp-tr-'));
  const p = (n) => path.join(dir, n);
  const run = (args) => { const r = spawnSync('ffmpeg', args, {encoding: 'utf8'}); assert.equal(r.status, 0, r.stderr); };
  run(['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=720x1280', '-frames:v', '1', p('a.png')]);
  run(['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=720x1280', '-frames:v', '1', p('b.png')]);
  for (const layout of ['strip', 'fullbleed']) {
    const fr = op.MED_LAYOUTS[layout].frame;
    run(op.medFlashCardArgs(p(`f_${layout}.mp4`), '#1f1f22', 3 / 24, fr));
    let r = probe(p(`f_${layout}.mp4`));
    assert.deepEqual([r.streams[0].width, r.streams[0].height], [1080, 1920]);
    assert.ok(close(Number(r.format.duration), 0.125, 1 / 24));
    run(op.medDissolveCardArgs(p('a.png'), p('b.png'), p(`d_${layout}.mp4`), '#1f1f22', 0.5, fr));
    assert.ok(close(Number(probe(p(`d_${layout}.mp4`)).format.duration), 0.5, 1 / 24));
    run(op.medStripArgs(p('a.png'), p(`s_${layout}.mp4`), fr));
    r = probe(p(`s_${layout}.mp4`));
    assert.deepEqual([r.streams[0].width, r.streams[0].height], [fr.w, fr.h]);
  }
  fs.rmSync(dir, {recursive: true, force: true});
});

test('mode overlays: myth chip over its scene; X/O stamp from 0.8 s before the sentence ends to the next sentence; never into a generated transition', () => {
  const durs = [4, 5, 4.5, 5, 4];
  const mythPlan = {mode: 'myth', scenes: [{n: 1}, {n: 2, verdict: 'X', mythIndex: 1, reasonCard: 'R1'}, {n: 3, verdict: 'O', mythIndex: 2, reasonCard: 'R2'}, {n: 4, timeChip: 'x', stepNumber: 1}, {n: 5}]};
  const tl = op.medTimeline(durs, ['cut', 'cut', 'push', 'cut']);
  const o = op.medModeOverlays(mythPlan, tl, 'ko');
  assert.deepEqual(o.chips.map((c) => c.text), ['\uc624\ud574 1', '\uc624\ud574 2']);
  for (const c of o.chips) { const sc = tl.scenes[c.scene - 1]; assert.ok(c.start >= sc.start && c.end < sc.end); }
  assert.deepEqual(o.verdicts.map((v) => v.mark), ['X', 'O']);
  const [v2, v3] = o.verdicts;
  const nr2 = tl.narration[1];
  assert.ok(close(v2.start, nr2.start + nr2.dur - 0.8, 1e-3));
  assert.equal(v2.end, tl.narration[2].start, 'over a cut: until the next sentence');
  assert.ok(v3.end < tl.boundaries[2].start, 'before a generated transition');
  assert.ok(v3.end - v3.start >= 0.8 - 1e-9, 'still on screen for 0.8 s');
  assert.deepEqual(o.reasons.map((r) => [r.text, r.start, r.end]), [['R1', v2.start, v2.end], ['R2', v3.start, v3.end]]);
  assert.deepEqual(o.steps, []);
  const t = op.medModeOverlays({mode: 'timeline', scenes: [{n: 1, timeChip: '07:00'}, {n: 2}, {n: 3, timeChip: '12:00'}, {n: 4}, {n: 5}]}, tl, 'en');
  assert.deepEqual(t.chips.map((c) => c.text), ['07:00', '12:00']);
  const l = op.medModeOverlays({mode: 'list', scenes: [{n: 1}, {n: 2, stepNumber: 1, stepCard: 'Wash'}, {n: 3, stepNumber: 2, stepCard: 'Rest'}, {n: 4}, {n: 5}]}, tl, 'en');
  assert.deepEqual(l.steps.map((s) => [s.number, s.text]), [[1, 'Wash'], [2, 'Rest']]);
  for (const x of [...t.chips, ...l.steps]) { const b = tl.boundaries[x.scene - 1]; if (b) assert.ok(x.end < b.start + 1e-9); }
});

test('assembly in myth mode: full-frame geometry, mode overlays, and no scene label under a chip', async () => {
  const {dir} = makeJob({layout: 'auto'});
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  plan.mode = 'myth';
  Object.assign(plan.scenes[1], {verdict: 'X', mythIndex: 1, reasonCard: 'Antibiotics do not kill viruses', pointers: []});
  plan.scenes.forEach((s) => { s.transitionOut = 'cut'; s.split = null; s.insets = null; });
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan));
  const io = stubIO(dir, {duration: async (p) => NARR[Number(/narr_(\d)_/.exec(p)[1]) - 1]});
  await op.medEngine('timeline', dir, [], io);
  const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
  assert.ok(tl.boundaries.every((b) => b.type === 'cut' && b.slot === 0));
  fs.writeFileSync(path.join(dir, 'work', 'compose.json'), JSON.stringify({segments: tl.scenes.map((s) => ({kind: 'scene', n: s.n, file: path.join(dir, `mxT_card_${s.n}.mp4`), dur: s.span})), dissolves: [], pointerFrames: [], insetFiles: []}));
  const a = await op.medEngine('assembly', dir, [], io);
  assert.notEqual(a.ok, false, a.error);
  assert.deepEqual([a.mode, a.art, a.layout], ['myth', 'everyday', 'fullbleed']);
  assert.deepEqual(a.geo.title, op.MED_LAYOUTS.fullbleed.title);
  assert.ok(a.title.size <= 72);
  assert.equal(a.chips.length, 1);
  assert.equal(a.verdicts[0].mark, 'X');
  assert.ok(!a.labels.some((l) => l.scene === 2), 'the chip replaces the scene label');
  let sum = 0;
  for (const s of a.segments) sum += s.dur;
  assert.ok(close(sum, a.total, 1e-6), 'cuts leave no transition segments and no gap');
  fs.rmSync(dir, {recursive: true, force: true});
});

test('an older plan is not continued with the new prompts', async () => {
  const {dir} = makeJob();
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  plan.version = '1.0.0';
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan));
  assert.deepEqual(await op.medEngine('requests', dir, ['keyframes', '1'], stubIO(dir)), {ok: false, error: 'OLD_PLAN'});
  assert.equal((await op.medEngine('requests', dir, ['narration'], stubIO(dir))).ok, true, 'narration keys are unchanged');
  fs.rmSync(dir, {recursive: true, force: true});
});

// ---- request keys always fit the host's pattern (Staging: "requestKey must match /^[A-Za-z0-9_-]{8,64}$/") ----
test('every request key, for every model, mode, scene, attempt and revision, matches the host pattern', async () => {
  const PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
  assert.equal(String(op.MED_KEY_PATTERN), String(PATTERN));
  const seen = new Map();
  let count = 0;
  for (const jobId of ['mxmvindeea', 'mx' + 'z'.repeat(14)]) {
    for (const model of Object.keys(op.MED_KF_MODELS)) {
      assert.match(op.MED_KF_MODELS[model].tag, /^[a-z0-9]{3,6}$/);
      for (const mode of ['zoom', 'myth', 'timeline', 'list']) {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medexp-keys-'));
        const n = 12;
        const scenes = Array.from({length: n}, (_, i) => ({n: i + 1, narration: `Sentence ${i + 1}.`, subject: 's', visual: 's', motion: 'm', camera: 'push_in', scale: 'tissue',
          transitionOut: i + 1 < n ? 'push' : null, label: 'L', pointers: [], split: null, insets: null, rev: 20}));
        fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify({id: jobId, settings: {kfModel: model, voice: 'minimax-calm-lady', music: true}}));
        fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({version: op.MED_VERSION, lang: 'ko', mode, title: ['a', 'b'], scenes}));
        const gen = {}, picks = {kf: {}, clip: {}, tr: {}, regen: {}};
        for (const s of scenes) {
          for (const c of ['A', 'B', 'R20']) { const f = path.join(dir, `kf_${s.n}${c}.png`); fs.writeFileSync(f, ''); gen[`kf:${s.n}:${c}`] = {path: f}; }
          picks.kf[s.n] = 'R20'; picks.clip[s.n] = 'B'; picks.regen[s.n] = {model, k: 20};
          fs.mkdirSync(path.join(dir, 'work'), {recursive: true});
          fs.writeFileSync(path.join(dir, 'work', `out_${s.n}.png`), ''); fs.writeFileSync(path.join(dir, 'work', `in_${s.n}.png`), '');
        }
        fs.writeFileSync(path.join(dir, 'gen.json'), JSON.stringify(gen));
        fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify(picks));
        const tl = op.medTimeline(scenes.map(() => 4), scenes.slice(0, -1).map(() => 'push'));
        fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify({...tl, music_ms: 59000}));
        for (const kind of ['narration', 'keyframes', 'kfregen', 'clips', 'transitions', 'music']) {
          for (const attempt of ['1', '99']) {
            const out = await op.medEngine('requests', dir, [kind, '', '--attempt', attempt], stubIO(dir));
            assert.notEqual(out.ok, false, `${kind}: ${out.error}`);
            assert.ok(out.requests.length > 0, kind);
            for (const r of out.requests) {
              count++;
              assert.match(r.key, PATTERN, `${model} ${mode} ${kind}: ${r.key}`);
              const prior = seen.get(r.key);
              assert.ok(!prior || prior === `${jobId}|${r.gen}|${JSON.stringify(r.input)}|${JSON.stringify(r.uploads).replace(/medexp-keys-[^/]+/g, '')}` || prior.startsWith(`${jobId}|${r.gen}|`),
                `key reused across different requests: ${r.key}`);
              seen.set(r.key, `${jobId}|${r.gen}|${JSON.stringify(r.input)}|${JSON.stringify(r.uploads).replace(/medexp-keys-[^/]+/g, '')}`);
            }
          }
        }
        fs.rmSync(dir, {recursive: true, force: true});
      }
    }
  }
  assert.ok(count > 5000, String(count));
});

test('the key helper keeps fitting keys as they are and makes any other fit, stably and without collisions', () => {
  const k = 'mxabc123-kf-2-A-1-rB';
  assert.equal(op.medRequestKey(k), k, 'existing Seedream keys are unchanged');
  const bad = ['mxabc-kf-1-A-1-mnano-banana-2.1', 'mxabc-kf-1-A-1-mnano_banana_2_1', 'x'.repeat(80), 'x'.repeat(80) + 'y', 'a.b', 'a_b'];
  const out = bad.map(op.medRequestKey);
  for (const o of out) assert.match(o, op.MED_KEY_PATTERN);
  assert.equal(new Set(out).size, out.length, 'no collisions');
  assert.deepEqual(bad.map(op.medRequestKey), out, 'stable');
  assert.equal(op.medRequestKey('mxabc-kf-1-A-1-mnano_banana_2_1'), 'mxabc-kf-1-A-1-mnano_banana_2_1', 'an already valid key is untouched');
});

test('the failed Staging job resumes: a recorded submission under the rejected key is submitted under the fitting key', async () => {
  const gen = {'kf:1:A': {key: 'mxmvindeea-kf-1-A-1-mnano-banana-2.1', attempt: 1, phase: 'submitting'}};
  const {dir} = makeJob({kfModel: 'nano-banana-2.1'});
  const reqs = (await op.medEngine('requests', dir, ['keyframes', '1A'], stubIO(dir))).requests;
  assert.equal(reqs.length, 1);
  assert.match(reqs[0].key, /-mnb21$/);
  const submits = [];
  const api = {submit: async (q) => { submits.push(q.key); return 'selects-x'; }, list: async (ids) => ids.map((id) => ({jobId: id, status: 'succeeded', deliveryStatus: 'delivered', outputs: [{path: '/k.png'}]})), retryDelivery: async () => {}};
  const r = await op.medRunGenerations(reqs, gen, api, {persist: async () => {}, sleep: async () => {}, now: () => 0});
  assert.deepEqual(r, {failed: [], unresolved: [], ignored: []});
  assert.deepEqual(submits, [reqs[0].key]);
  fs.rmSync(dir, {recursive: true, force: true});
});

// ---- a candidate stuck at the host (Staging: kf:6:A "submission_unknown" while 6B was delivered) ----
function stuckHost(stuck) {
  const log = {submits: [], lists: 0};
  let clock = 0;
  const api = {
    submit: async (q) => { log.submits.push(q.gen); return 'selects-' + q.key; },
    list: async (ids) => { log.lists++; clock += 4000; return ids.map((id) => stuck.some((g) => id.includes(g))
      ? {jobId: id, status: 'submission_unknown', deliveryStatus: 'submission_unknown', errorCode: 'submission_unknown', outputs: []}
      : {jobId: id, status: 'succeeded', deliveryStatus: 'delivered', outputs: [{path: '/' + id}]}); },
    retryDelivery: async () => {},
  };
  return {api, log, opts: {persist: async () => {}, sleep: async (ms) => { clock += ms; }, now: () => clock}};
}
const KF = (n, c) => ({gen: `kf:${n}:${c}`, attempt: 1, key: `mxT-kf-${n}-${c}-1`});

test('a candidate stuck at the host: once every scene has one, the stage goes on after the grace period, never resubmitting', async () => {
  const gen = {};
  const h = stuckHost(['kf-6-A']);
  const reqs = [KF(5, 'A'), KF(5, 'B'), KF(6, 'A'), KF(6, 'B')];
  const r = await op.medRunGenerations(reqs, gen, h.api, {...h.opts, multi: true});
  assert.deepEqual(r, {failed: [], unresolved: [], ignored: [{gen: 'kf:6:A', reason: 'unresolved'}]});
  assert.equal(h.log.submits.length, 4, 'submitted once each, never again');
  assert.equal(gen['kf:6:A'].ignored, 'unresolved');
  assert.ok(gen['kf:6:A'].jobId && !gen['kf:6:A'].failed && !gen['kf:6:A'].path, 'not cancelled, not failed');
  const polls = h.log.lists;
  assert.ok(polls * 8000 >= op.MED_GEN_GRACE_MS && polls * 8000 < op.MED_GEN_DEADLINE_MS / 4, `waited about the grace period (${polls} polls)`);
  // Resume: the ignored record is not polled or submitted again, and a late result does not change it.
  const h2 = stuckHost([]);
  const again = await op.medRunGenerations(reqs, gen, h2.api, {...h2.opts, multi: true});
  assert.deepEqual(again.ignored, [{gen: 'kf:6:A', reason: 'unresolved'}]);
  assert.deepEqual(h2.log.submits, []);
  assert.equal(h2.log.lists, 0);
  assert.ok(!gen['kf:6:A'].path);
});

test('a scene with no delivered candidate keeps the deadline: unresolved with the host status, never ignored or resubmitted', async () => {
  const gen = {};
  const h = stuckHost(['kf-6-A', 'kf-6-B']);
  const r = await op.medRunGenerations([KF(5, 'A'), KF(6, 'A'), KF(6, 'B')], gen, h.api, {...h.opts, multi: true});
  assert.deepEqual(r.ignored, []);
  assert.deepEqual(r.unresolved.map((u) => [u.gen, u.reason]), [['kf:6:A', 'still submission_unknown'], ['kf:6:B', 'still submission_unknown']]);
  assert.equal(h.log.submits.length, 3);
  // Single-candidate needs (narration, music) never use the grace period.
  const g2 = {};
  const h3 = stuckHost(['narr-2']);
  const n = await op.medRunGenerations([{gen: 'narr:1', attempt: 1, key: 'mxT-narr-1-1'}, {gen: 'narr:2', attempt: 1, key: 'mxT-narr-2-1'}], g2, h3.api, h3.opts);
  assert.deepEqual(n.unresolved.map((u) => u.gen), ['narr:2']);
  assert.deepEqual(n.ignored, []);
});

test('the keyframe stage proceeds with the delivered candidate (scene 6 uses B)', async () => {
  const {dir} = makeJob({kfModel: 'nano-banana-2.1'});
  const gen = {};
  const h = stuckHost(['kf-2-A']);
  const ctx = {gen, requests: async (kind, ids, attempt) => (await op.medEngine('requests', dir, [kind, ids.join(','), ...(attempt > 1 ? ['--attempt', String(attempt)] : [])], stubIO(dir))).requests,
    generate: (reqs, extra) => op.medRunGenerations(reqs, gen, h.api, {...h.opts, ...extra}), unresolved: (l) => Object.assign(new Error('unresolved'), {unresolved: l})};
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'A'}}));
  const failed = await op.medGenerateKind(ctx, 'keyframes', ['2', '3']);
  assert.deepEqual(failed, []);
  assert.equal(gen['kf:2:A'].ignored, 'unresolved');
  assert.ok(gen['kf:2:B'].path);
  assert.equal(h.log.submits.filter((g) => g === 'kf:2:A').length, 1);
  fs.rmSync(dir, {recursive: true, force: true});
});

// ---- inside-the-body shots mixed into myth / timeline / list ----
const INSIDE_PLAN = (look, extra = {}) => ({mode: 'myth', title_lines: ['A', 'B'], scenes: look.map((l, i) => ({narration: `Sentence ${i + 1}.`, subject: `s${i + 1}`, motion: 'm',
  camera: 'push_in', transitionOut: 'cut', label: 'L', look: l, ...(i === 1 ? {verdict: 'X', mythIndex: 1, reasonCard: 'r'} : {}), ...extra}))});

test('inside-the-body shots: the prompt mentions them only when auto or on (may / should), never in zoom or when off', () => {
  for (const mode of ['myth', 'timeline', 'list', 'auto']) {
    assert.match(op.medScriptPrompt(ART, F, mode, 'auto'), /\[Inside-the-body shots\][^]*may use 2-4 consecutive inside-the-body scenes/);
    assert.match(op.medScriptPrompt(ART, F, mode, 'on'), /should use 2-4 consecutive inside-the-body scenes/);
    const off = op.medScriptPrompt(ART, F, mode, 'off');
    assert.doesNotMatch(off, /inside-the-body|"look"|look:/i, mode);
    assert.doesNotMatch(op.medScriptPrompt(ART, F, mode, 'on'), ANATOMY);
  }
  assert.doesNotMatch(op.medScriptPrompt(ART, F, 'zoom', 'on'), /Inside-the-body shots/);
});

test('look: scene by default, inside when the script says so, zoom all inside, off none; push in and pull out at look boundaries', () => {
  const looks = ['scene', 'scene', 'inside', 'inside', 'inside', 'scene', 'bogus'];
  const {plan} = op.medNormalizePlan(INSIDE_PLAN(looks), 'en', 'T');
  assert.deepEqual(plan.scenes.map((s) => s.look), ['scene', 'scene', 'inside', 'inside', 'inside', 'scene', 'scene']);
  assert.deepEqual(plan.scenes.map((s) => s.transitionOut), ['cut', 'push', 'push', 'push', 'pull', 'cut', null], 'enter and go deeper: push; leave: pull; else the plan');
  assert.deepEqual(op.medNormalizePlan(INSIDE_PLAN(looks), 'en', 'T', 'auto', 'off').plan.scenes.map((s) => s.look), Array(7).fill('scene'));
  assert.deepEqual(op.medNormalizePlan(INSIDE_PLAN(looks), 'en', 'T', 'auto', 'off').plan.scenes.slice(0, -1).map((s) => s.transitionOut), Array(6).fill('cut'));
  assert.ok(op.medNormalizePlan(INSIDE_PLAN(looks), 'en', 'T', 'zoom').plan.scenes.every((s) => s.look === 'inside'));
  // The usage line counts the generated transition clips: three pushes and one pull, two takes each.
  const counts = op.medGenerationCounts(plan, false);
  assert.equal(counts.transitions, 4 * 2, 'two takes per generated boundary');
  const tl = op.medTimeline(plan.scenes.map(() => 4), plan.scenes.slice(0, -1).map((s) => s.transitionOut));
  assert.deepEqual(tl.boundaries.map((b) => b.generated), [false, true, true, true, true, false]);
  for (const s of tl.scenes) { const w = op.medSceneWindows(s, 0).label; const b = tl.boundaries[s.n - 1]; if (w && b) assert.ok(w.end < b.start + 1e-9); }
  const panel = fs.readFileSync(path.resolve(import.meta.dirname, '../plugins/medical-explainer/panel.tsx'), 'utf8');
  assert.match(panel, /S\.estimate\(check\.counts\.images, check\.counts\.clips, check\.counts\.clipSeconds, check\.counts\.transitions/);
});

test('keyframes: per-scene style suffix by look, and two reference families (scene 1 for scenes, the first inside scene for inside)', async () => {
  const {dir} = makeJob({kfModel: 'nano-banana-2.1', layout: 'fullbleed'});
  const {plan} = op.medNormalizePlan(INSIDE_PLAN(['scene', 'scene', 'inside', 'inside', 'scene']), 'ko', 'T');
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan));
  const gen = JSON.parse(fs.readFileSync(path.join(dir, 'gen.json'), 'utf8'));
  for (const n of [1, 2, 3, 4, 5]) for (const c of 'AB') { const f = path.join(dir, `kf_${n}${c}.png`); fs.writeFileSync(f, ''); gen[`kf:${n}:${c}`] = {path: f}; }
  fs.writeFileSync(path.join(dir, 'gen.json'), JSON.stringify(gen));
  assert.deepEqual(op.medFamilyFirsts(plan), [1, 3]);
  // Before the inside family's first pick exists, its later scenes cannot be asked for.
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'B'}}));
  assert.deepEqual(await op.medEngine('requests', dir, ['keyframes', '4'], stubIO(dir)), {ok: false, error: 'scene 3 keyframe not chosen'});
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'B', 3: 'A'}}));
  const reqs = (await op.medEngine('requests', dir, ['keyframes'], stubIO(dir))).requests;
  const by = Object.fromEntries(reqs.filter((r) => r.gen.endsWith(':A')).map((r) => [r.gen.split(':')[1], r]));
  const medical = op.medStyleSuffix('medical', 'fullbleed'), everyday = op.medStyleSuffix('everyday', 'fullbleed');
  assert.ok(by[1].input.prompt.endsWith(everyday + '.') && !by[1].input.image_urls, 'scene 1: text, everyday');
  assert.ok(by[3].input.prompt.endsWith(medical + '.') && !by[3].input.image_urls, 'first inside scene: text, 3D medical CG');
  assert.ok(by[4].input.prompt.endsWith(medical + '.'));
  assert.match(by[4].uploads.ref, /kf_3A\.png$/, 'inside scenes follow the first inside scene');
  assert.match(by[4].key, /-r3A$/);
  assert.ok(by[2].input.prompt.endsWith(everyday + '.') && by[5].input.prompt.endsWith(everyday + '.'));
  assert.match(by[2].uploads.ref, /kf_1B\.png$/);
  assert.match(by[5].uploads.ref, /kf_1B\.png$/);
  assert.match(by[5].key, /-rB$/, 'the scene family keeps its earlier key form');
  for (const r of reqs) { assert.equal(r.input.aspect_ratio, '9:16'); assert.match(r.key, op.MED_KEY_PATTERN); }
  // Clips and transitions into the inside family use the 3D medical CG medium.
  const io = stubIO(dir, {duration: async (p) => NARR[Number(/narr_(\d)_/.exec(p)[1]) - 1] || 4});
  const narr = JSON.parse(fs.readFileSync(path.join(dir, 'gen.json'), 'utf8'));
  narr['narr:5'] = {path: path.join(dir, 'mxT_narr_5_1.mp3')}; fs.writeFileSync(narr['narr:5'].path, '');
  fs.writeFileSync(path.join(dir, 'gen.json'), JSON.stringify(narr));
  await op.medEngine('timeline', dir, [], io);
  fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify({kf: {1: 'B', 2: 'A', 3: 'A', 4: 'A', 5: 'A'}, clip: {}}));
  const clips = (await op.medEngine('requests', dir, ['clips'], io)).requests.filter((r) => r.gen.endsWith(':A'));
  assert.deepEqual(clips.map((r) => r.input.prompt.startsWith(op.MED_ARTS.medical.motion)), [false, false, true, true, false]);
  for (const n of [1, 2, 3, 4, 5]) { fs.writeFileSync(path.join(dir, 'work', `out_${n}.png`), ''); fs.writeFileSync(path.join(dir, 'work', `in_${n}.png`), ''); }
  const tr = (await op.medEngine('requests', dir, ['transitions'], io)).requests.filter((r) => r.gen.endsWith(':A'));
  assert.deepEqual(tr.map((r) => r.gen), ['tr:2:A', 'tr:3:A', 'tr:4:A'], 'enter, deeper and leave are generated; the cut is not');
  assert.ok(tr.every((r) => r.input.prompt.startsWith(op.MED_ARTS.medical.motion)));
  assert.match(tr[2].input.prompt, /pull-back/);
  fs.rmSync(dir, {recursive: true, force: true});
});
