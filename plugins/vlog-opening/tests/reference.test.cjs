// plugins/vlog-opening/tests/reference.test.cjs
// The default build of the whip and motion styles against the team's reference timeline (Staging "CLIP HIGHLIGHTS UPDATE", 25 fps):
// the panel's own retime, assembly script and reference script run against a recording Draft, and every main clip,
// effect, transform, transition, motion graphic (code by sha256, parameters, transform) and the music section must
// equal the reference. The only fields not compared are the words, which come from the Project (title, chapter
// titles): marked "<text>" below.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
process.removeAllListeners('warning');

const panel = fs.readFileSync(path.join(__dirname, '..', 'panel.tsx'), 'utf8');
const between = (a, b) => { const i = panel.indexOf(a), k = panel.indexOf(b, i); assert.ok(i >= 0 && k > i, a); return panel.slice(i, k); };
const strip = (src) => stripTypeScriptTypes(src, { mode: 'strip' });
const src = strip([
  between('function placeWindow(', '// Six-second auditions'),
  between('const GFX_SMEAR = `', '// ---------------------------------------------------------------------------\n// Scripts.'),
  between('function assembleScript(', 'function decorateScript('),
].join('\n'));
const K = new Function(src + '\nreturn { retime, voRefRetime, voRefStyle, voRefTemplate, voRefEnds, voRefPlan, voRefScript, assembleScript, VO_REF };')();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// Effects browser presets by id, as the app names the effect it places.
const PRESET_NAMES = { 'reveal-blur-in': 'Blur in', 'filter-film-stock': 'Film stock', 'basic-adjust': 'Color & Tone' };

// A Draft that records what the scripts do (the SDK verbs they call, on one main track). Like Selects, a new Draft
// is at 30 fps until its first insert gives it the clip's rate (`fps`), and each end of a source range is snapped to a
// Draft frame on its own.
function recordingSelects(fps, opts = {}) {
  let nextId = 1, drafts = 0, rate = 30;
  const main = [], video = [], audio = [], transitions = [];
  let tail = 0;
  const end = () => Math.max(0, ...main.map(c => c.endFrame), ...video.map(c => c.endFrame)) + tail;
  const row = (c, trackKind) => ({ clipId: c.clipId, trackKind, startFrame: c.startFrame, endFrame: c.endFrame, resourceId: c.resourceId ?? null });
  const find = (clip) => main.find(c => c.clipId === clip.clipId) || video.find(c => c.clipId === clip.clipId);
  const draft = {
    async insertResource({ resourceId, sourceRange }) {
      rate = fps;
      const at = Math.max(0, ...main.map(c => c.endFrame));
      const n = Math.round(sourceRange.endSeconds * fps) - Math.round(sourceRange.startSeconds * fps);
      main.push({ clipId: nextId++, resourceId, startFrame: at, endFrame: at + n, effects: [], transform: {} });
    },
    async meta() { return { fps: rate }; },
    async clips({ trackScope }) {
      const m = main.map(c => row(c, 'main'));
      return trackScope === 'main' ? m : [...m, ...video.map(c => row(c, 'video')), ...audio.map(c => row(c, 'audio'))];
    },
    async setFrameSize() {},
    async commitAll() { return { createdDraftId: 'draft-1' }; },
    async rangeAtFrames(a, b) { assert.ok(a >= 0 && b > a && b <= end(), 'range ' + a + '-' + b + ' inside the timeline (0-' + end() + ')'); return { a, b }; },
    async applyEffectPreset({ clip, presetId, parameters }) { find(clip).effects.push([PRESET_NAMES[presetId] || presetId, parameters]); return {}; },
    async addVideoEffect({ clip, label, shader, parameters }) { assert.equal(shader.graph.schema, "Cutback.ShaderEffect.1"); find(clip).effects.push([label, parameters, shader]); return {}; },
    async setClipTransform({ clip, ...set }) { Object.assign(find(clip).transform, set); return {}; },
    async applyTransitionPreset({ after, presetId, durationSeconds }) {
      const half = Math.round(durationSeconds * fps) / 2, at = find(after).endFrame;
      transitions.push([presetId === 'transition-flare' ? 'Flare' : presetId, at, at - half, at + half]);
      return { inOffsetSeconds: half / fps, outOffsetSeconds: half / fps };
    },
    async insertGap({ at, seconds }) {
      const n = Math.round(seconds * fps);
      if (!at) { tail += n; return {}; }
      for (const c of main) if (c.startFrame >= at.after.b) { c.startFrame += n; c.endFrame += n; }
      return {};
    },
    async chapters() {
      if (opts.noChapters) return [];
      return main.flatMap((c, i) => [{ kind: 'subchapter', startFrame: c.startFrame, endFrame: c.endFrame, title: 'Sub ' + (i + 1) },
        { kind: 'chapter', startFrame: c.startFrame, endFrame: c.endFrame, title: 'Chapter ' + (i + 1) }]);
    },
    async addMotionGraphic({ label, tsxCode, parameters, within }) {
      const c = { clipId: nextId++, label, code: sha(tsxCode), parameters, startFrame: within.a, endFrame: within.b, transform: {} };
      video.push(c);
      return { clipId: c.clipId, startFrame: c.startFrame, endFrame: c.endFrame };
    },
    async setAudioTracks() {},
    async overlayResource({ over, sourceStartSeconds }) { audio.push({ clipId: nextId++, startFrame: over.a, endFrame: over.b, sourceStartSeconds }); },
  };
  const selects = {
    project: () => ({
      createDraft: async () => { drafts++; rate = 30; main.length = 0; video.length = 0; audio.length = 0; transitions.length = 0; tail = 0; return draft; },
      resource: (id) => ({ id }),
    }),
    draft: () => draft,
    effectPresets: { get: async () => ({ editableParameters: [] }) },
  };
  return { selects, main, video, audio, transitions, drafts: () => drafts };
}
const run = (selects, script) => new Function('selects', strip('async function execute() {' + script + '\n}') + '\nreturn execute();')(selects);

// One default build of `style` at `fps`: the reference's shots from made-up footage, assembled and finished.
async function build(style, fps, opts = {}) {
  const tpl = K.voRefTemplate(style);
  let beats = tpl.map((s, i) => ({ role: s.role, rid: 'r' + (s.continues ? i - 1 : i), name: 'clip' + i + '.mp4', total: 60, a: opts.a ?? 10, b: (opts.a ?? 10) + s.dur, t: 12, path: null, ...(s.continues ? { continues: true } : {}) }));
  beats = K.voRefRetime(style, beats);
  const rec = recordingSelects(fps, opts);
  const asm = await run(rec.selects, K.assembleScript('project-1', 'Opening', beats, null));
  assert.equal(asm.fps, fps);
  const out = await run(rec.selects, K.voRefScript({ projectId: 'project-1', sequenceId: asm.sequenceId, fps, beats, title: 'My Trip',
    musicResourceId: 'music-1', muteSource: style !== 'quotes', plan: K.voRefPlan(style, fps, opts.wide ?? true) }));
  return { rec, out };
}

const EXPECTED = {
  whip: {
    main: [[0,51],[51,69],[69,84],[84,102],[102,123],[123,141],[141,196],[196,215],[215,269],[269,284],[284,297],[297,365]],
    effects: [[0,"Blur in",{"style":"blur","direction":"in","span":2,"amount":60}],[1,"Film stock",{"look":"warm-halation","strength":1}],[2,"Film stock",{"look":"warm-halation","strength":1}],[6,"Film stock",{"look":"warm-halation","strength":1}],[7,"Film stock",{"look":"warm-halation","strength":1}],[8,"Film stock",{"look":"warm-halation","strength":1}]],
    transforms: [[3,{"scaleKeys":[{"atSeconds":0,"scale":1},{"atSeconds":0.68,"scale":1.2}]}],[4,{"position":{"x":0,"y":-11.11111111111111}}],[6,{"scaleKeys":[{"atSeconds":0.32,"scale":1},{"atSeconds":0.36,"scale":1},{"atSeconds":2.16,"scale":1.15}]}],[9,{"scaleKeys":[{"atSeconds":0,"scale":1},{"atSeconds":0.56,"scale":1.2}]}]],
    transitions: [["Flare",51,47,55],["Flare",196,192,200]],
    graphics: [["2.39:1 letterbox — centre opening",0,365,{"ratio":2.39,"openSeconds":2},"d3be1d99ff1f5c81",null],["Fade to black",350,365,{"lengthFrames":15,"color":"#000000"},"a5ad597de0af5834",null],["Text",297,365,{"anchor":"center","overlayScale":100,"body":"<text>","fontFamily":"Alternate Gothic No2 D","fontWeight":"400","fontSize":200,"color":"#ffffff","italic":false,"underline":false,"textAlign":"center","enterStyle":"instant","enterDuration":3,"exitStyle":"instant","exitDuration":0.4,"ease":"linear","strokeColor":"#000000","strokeWidth":0,"backgroundColor":"#00000000","backgroundPadding":24,"backgroundRadius":8,"shadowColor":"#000000b3","shadowX":0,"shadowY":0,"shadowBlur":12,"glowColor":"#ffffff","glowStrength":0},"3cd380ea0b852a1b",null]],
    music: [0,389,0.36],
  },
  motion: {
    main: [[0,86],[86,113],[157,236],[236,274],[274,317],[317,440]],
    effects: [[0,"Desk scene -> stop-motion zoom",{"holdFrames":56,"beatFrames":10.139,"paper":"#fbf8ee","check":"#9cbbe8","laptop":"#cfcfd1"}]],
    transforms: [[2,{"flipHorizontal":true}]],
    transitions: [],
    graphics: [["Fade to black",425,440,{"lengthFrames":15,"color":"#000000"},"a5ad597de0af5834",null],["Sky flight — Sky only",113,157,{"sky":"#96BAE2","cloud":"#FFFFFF","sun":"#F8DB69"},"51459cd24fdf89a2",null],["Label - <text>",157,236,{"text":"<text>","sub":"","ink":"#cedaee","shadow":"#0C110E","fontFamily":"","beatFrames":10.139,"lengthFrames":41},"786499b86ae596a4",null],["Handwritten title",375,440,{"title":"<text>","sub":"","ink":"#f6fafc","shadow":"#0c110e","fontFamily":"","beatFrames":10.139,"lengthFrames":71},"24451d52d3c75147",{"scale":{"x":0.8,"y":0.8}}]],
    music: [11,425,0],
  },
};

// The words come from the Project; everything else must be the reference's.
const TEXT = { 'Text': ['body'], 'Label - <text>': ['text'], 'Handwritten title': ['title'] };
const masked = (name, parameters) => {
  const n = name.replace(/^Label - .*/, 'Label - <text>'), p = { ...parameters };
  for (const k of TEXT[n] || []) p[k] = '<text>';
  return [n, p];
};
const byStart = (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]);

(async () => {
  for (const style of ['whip', 'motion']) {
    const want = EXPECTED[style];
    const { rec, out } = await build(style, 25);
    const main = rec.main.slice().sort((a, b) => a.startFrame - b.startFrame);
    assert.deepEqual(main.map(c => [c.startFrame, c.endFrame]), want.main, style + ': main clips');
    assert.deepEqual(main.flatMap((c, i) => c.effects.map(e => [i, e[0], e[1]])), want.effects, style + ': effects');
    assert.deepEqual(main.map((c, i) => [i, c.transform]).filter(x => Object.keys(x[1]).length), want.transforms, style + ': transforms');
    assert.deepEqual(rec.transitions, want.transitions, style + ': transitions');
    const got = rec.video.map(g => { const [n, p] = masked(g.label, g.parameters); return [n, g.startFrame, g.endFrame, p, g.code, Object.keys(g.transform).length ? g.transform : null]; });
    assert.deepEqual(got.sort(byStart), want.graphics.slice().sort(byStart), style + ': motion graphics');
    assert.deepEqual(rec.audio.map(a => [a.startFrame, a.endFrame, a.sourceStartSeconds]), [want.music], style + ': music');
    assert.deepEqual(out.notes, [], style + ': no notes');
    // The words: the Project name, and each graphic's chapter.
    for (const g of rec.video) {
      if (g.label === 'Text') assert.equal(g.parameters.body, 'My Trip');
      if (g.label === 'Handwritten title') assert.equal(g.parameters.title, 'My Trip');
      if (g.label.startsWith('Label - ')) assert.match(g.parameters.text, /^Chapter \d+$/);
    }
    // The desk effect's code (the plugin's own) is the reference's.
    if (style === 'motion') assert.ok(main[0].effects[0][2].uniforms.some(b => b.parameter === 'holdFrames'), 'desk animation retains its clock binding');
  }

  // At 30 fps every frame scales by round(f * 30 / 25): cuts, graphics, music and frame-counted parameters.
  {
    const { rec } = await build('whip', 30);
    assert.deepEqual(rec.main.map(c => c.endFrame), EXPECTED.whip.main.map(([, e]) => Math.round(e * 30 / 25)));
    assert.deepEqual(rec.audio.map(a => [a.startFrame, a.endFrame]), [[0, Math.round(389 * 30 / 25)]]);
    assert.equal(rec.video.find(g => g.label === 'Fade to black').parameters.lengthFrames, 18);
    assert.deepEqual(rec.transitions.map(t => t[3] - t[2]), [10, 10]);
    // The motion style's gap and the shots after it land on the scaled reference frames too.
    for (const fps of [24, 30, 50]) {
      const k = await build('motion', fps);
      assert.deepEqual(k.rec.main.map(c => [c.startFrame, c.endFrame]), EXPECTED.motion.main.map(([a, b]) => [Math.round(a * fps / 25), Math.round(b * fps / 25)]), 'motion at ' + fps);
      const sky = k.rec.video.find(g => /^Sky/.test(g.label));
      assert.deepEqual([sky.startFrame, sky.endFrame], [Math.round(113 * fps / 25), Math.round(157 * fps / 25)]);
    }
    const m = await build('motion', 30);
    assert.deepEqual(m.rec.audio.map(a => [a.startFrame, a.endFrame]), [[13, 510]]);
    assert.equal(m.rec.main[0].effects[0][1].beatFrames, 12.167);
    assert.equal(m.rec.main[0].effects[0][1].holdFrames, 67);
  }
  // Without chapter titles every graphic is still placed, named by the Project.
  for (const style of ['motion']) {
    const { rec, out } = await build(style, 25, { noChapters: true });
    assert.equal(rec.video.length, EXPECTED[style].graphics.length, style + ': every graphic without chapters');
    for (const g of rec.video) if (g.label.startsWith('Label - ')) assert.equal(g.parameters.text, 'My Trip');
    assert.deepEqual(out.notes, []);
  }
  // A 23.976 fps Draft from sources whose windows start between frames: every boundary still lands on
  // round(f * 23.976 / 25), the clips laid again on a fresh Draft once the real rate is known.
  for (const style of ['whip', 'motion']) {
    const fps = 24000 / 1001;
    const { rec, out } = await build(style, fps, { a: 10.0137 });
    const f = (v) => Math.round(v * fps / 25);
    assert.deepEqual(rec.main.map(c => [c.startFrame, c.endFrame]), EXPECTED[style].main.map(([a, b]) => [f(a), f(b)]), style + ' at 23.976');
    assert.deepEqual(rec.audio.map(a => [a.startFrame, a.endFrame]), [[f(EXPECTED[style].music[0]), f(EXPECTED[style].music[1])]], style + ' music at 23.976');
    assert.equal(rec.drafts(), 2, 'laid again at the real rate');
    assert.deepEqual(out.notes, []);
  }
  // A frame narrower than 3:2 goes without the letterbox.
  assert.ok(!(await build('whip', 25, { wide: false })).rec.video.some(g => /letterbox/.test(g.label)));

  // Which builds follow the reference: the style's own cue, with the bars on exactly for the whip style.
  assert.equal(K.voRefStyle('whip', 'cue:cinematic', true), 'whip');
  assert.equal(K.voRefStyle('whip', 'cue:cinematic', false), null);
  assert.equal(K.voRefStyle('whip', 'cue:vlog', true), null);
  assert.equal(K.voRefStyle('motion', 'cue:vlog', false), 'motion');
  assert.equal(K.voRefStyle('motion', 'cue:vlog', true), null);
  // Funny quotes has no reference layout: it always takes the beat-grid path, as before.
  assert.equal(K.VO_REF.quotes, undefined);
  for (const music of ['cue:cafe', 'cue:cinematic', 'file', 'none']) for (const bars of [false, true]) assert.equal(K.voRefStyle('quotes', music, bars), null);
  console.log('vlog-opening reference: whip and motion match the reference timelines; quotes keeps the beat grid');
})().catch((e) => { console.error(e); process.exit(1); });
