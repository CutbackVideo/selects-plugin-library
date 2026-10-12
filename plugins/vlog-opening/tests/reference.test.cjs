// plugins/vlog-opening/tests/reference.test.cjs
// The default build of each style against the team's reference timeline (Staging "CLIP HIGHLIGHTS UPDATE", 25 fps):
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
const K = new Function(src + '\nreturn { retime, voRefStyle, voRefTemplate, voRefEnds, voRefQuotes, voRefPlan, voRefScript, assembleScript, VO_REF };')();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// Effects browser presets by id, as the app names the effect it places.
const PRESET_NAMES = { 'reveal-blur-in': 'Blur in', 'filter-film-stock': 'Film stock', 'basic-adjust': 'Color & Tone' };

// A Draft that records what the scripts do (the SDK verbs they call, on one main track).
function recordingSelects(fps) {
  let nextId = 1;
  const main = [], video = [], audio = [], transitions = [];
  let tail = 0;
  const end = () => Math.max(0, ...main.map(c => c.endFrame), ...video.map(c => c.endFrame)) + tail;
  const row = (c, trackKind) => ({ clipId: c.clipId, trackKind, startFrame: c.startFrame, endFrame: c.endFrame, resourceId: c.resourceId ?? null });
  const find = (clip) => main.find(c => c.clipId === clip.clipId) || video.find(c => c.clipId === clip.clipId);
  const draft = {
    async insertResource({ resourceId, sourceRange }) {
      const at = Math.max(0, ...main.map(c => c.endFrame));
      main.push({ clipId: nextId++, resourceId, startFrame: at, endFrame: at + Math.round((sourceRange.endSeconds - sourceRange.startSeconds) * fps), effects: [], transform: {} });
    },
    async clips({ trackScope }) {
      const m = main.map(c => row(c, 'main'));
      return trackScope === 'main' ? m : [...m, ...video.map(c => row(c, 'video')), ...audio.map(c => row(c, 'audio'))];
    },
    async setFrameSize() {},
    async commitAll() { return { createdDraftId: 'draft-1' }; },
    async rangeAtFrames(a, b) { assert.ok(a >= 0 && b > a && b <= end(), 'range ' + a + '-' + b + ' inside the timeline (0-' + end() + ')'); return { a, b }; },
    async applyEffectPreset({ clip, presetId, parameters }) { find(clip).effects.push([PRESET_NAMES[presetId] || presetId, parameters]); return {}; },
    async addVideoEffect({ clip, label, tsxCode, parameters }) { find(clip).effects.push([label, parameters, sha(tsxCode)]); return {}; },
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
    async chapters() { return main.map((c, i) => ({ startFrame: c.startFrame, endFrame: c.endFrame, title: 'Chapter ' + (i + 1) })); },
    async addMotionGraphic({ label, tsxCode, parameters, within }) {
      const c = { clipId: nextId++, label, code: sha(tsxCode), parameters, startFrame: within.a, endFrame: within.b, transform: {} };
      video.push(c);
      return { clipId: c.clipId, startFrame: c.startFrame, endFrame: c.endFrame };
    },
    async setAudioTracks() {},
    async overlayResource({ over, sourceStartSeconds }) { audio.push({ clipId: nextId++, startFrame: over.a, endFrame: over.b, sourceStartSeconds }); },
  };
  const selects = {
    project: () => ({ createDraft: async () => draft, resource: (id) => ({ id }) }),
    draft: () => draft,
    effectPresets: { get: async () => ({ editableParameters: [] }) },
  };
  return { selects, main, video, audio, transitions };
}
const run = (selects, script) => new Function('selects', strip('async function execute() {' + script + '\n}') + '\nreturn execute();')(selects);

// One default build of `style` at `fps`: the reference's shots from made-up footage, assembled and finished.
async function build(style, fps, opts = {}) {
  const tpl = K.voRefTemplate(style);
  let beats = tpl.map((s, i) => ({ role: s.role, rid: 'r' + (s.continues ? i - 1 : i), name: 'clip' + i + '.mp4', total: 60, a: 10, b: 10 + s.dur, t: 12, path: null, ...(s.continues ? { continues: true } : {}) }));
  beats = K.retime(beats, K.voRefEnds(style));
  const rec = recordingSelects(fps);
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
    music: [11,425,3.818],
  },
  quotes: {
    main: [[0,53],[53,99],[99,133],[133,163],[163,237],[237,306],[306,359],[359,393],[393,467]],
    effects: [[0,"Color & Tone",{"temperature":12,"tint":0,"exposure":35,"contrast":0,"whites":0,"blacks":0,"saturation":6,"vibrance":16,"highlights":0,"shadows":0,"brightness":0,"clarity":0,"sharpen":0,"noiseReduction":0,"fade":0,"vignette":0,"grain":0,"hslRedHue":0,"hslRedSaturation":0,"hslRedLuminance":0,"hslYellowHue":0,"hslYellowSaturation":0,"hslYellowLuminance":0,"hslGreenHue":0,"hslGreenSaturation":0,"hslGreenLuminance":0,"hslCyanHue":0,"hslCyanSaturation":0,"hslCyanLuminance":0,"hslBlueHue":0,"hslBlueSaturation":0,"hslBlueLuminance":0,"hslMagentaHue":0,"hslMagentaSaturation":0,"hslMagentaLuminance":0,"wheelShadowsX":0,"wheelShadowsY":0,"wheelShadowsLevel":0,"wheelMidtonesX":0,"wheelMidtonesY":0,"wheelMidtonesLevel":0,"wheelHighlightsX":0,"wheelHighlightsY":0,"wheelHighlightsLevel":0,"curveMasterX1":25,"curveMasterY1":25,"curveMasterX2":50,"curveMasterY2":50,"curveMasterX3":75,"curveMasterY3":75,"curveRedX1":25,"curveRedY1":25,"curveRedX2":50,"curveRedY2":50,"curveRedX3":75,"curveRedY3":75,"curveGreenX1":25,"curveGreenY1":25,"curveGreenX2":50,"curveGreenY2":50,"curveGreenX3":75,"curveGreenY3":75,"curveBlueX1":25,"curveBlueY1":25,"curveBlueX2":50,"curveBlueY2":50,"curveBlueX3":75,"curveBlueY3":75}],[1,"Color & Tone",{"temperature":0,"tint":0,"exposure":0,"contrast":0,"whites":0,"blacks":0,"saturation":1,"vibrance":3,"highlights":0,"shadows":0,"brightness":0,"clarity":0,"sharpen":0,"noiseReduction":0,"fade":0,"vignette":0,"grain":0,"hslRedHue":0,"hslRedSaturation":0,"hslRedLuminance":0,"hslYellowHue":0,"hslYellowSaturation":0,"hslYellowLuminance":0,"hslGreenHue":0,"hslGreenSaturation":0,"hslGreenLuminance":0,"hslCyanHue":0,"hslCyanSaturation":0,"hslCyanLuminance":0,"hslBlueHue":0,"hslBlueSaturation":0,"hslBlueLuminance":0,"hslMagentaHue":0,"hslMagentaSaturation":0,"hslMagentaLuminance":0,"wheelShadowsX":0,"wheelShadowsY":0,"wheelShadowsLevel":0,"wheelMidtonesX":0,"wheelMidtonesY":0,"wheelMidtonesLevel":0,"wheelHighlightsX":0,"wheelHighlightsY":0,"wheelHighlightsLevel":0,"curveMasterX1":25,"curveMasterY1":25,"curveMasterX2":50,"curveMasterY2":50,"curveMasterX3":75,"curveMasterY3":75,"curveRedX1":25,"curveRedY1":25,"curveRedX2":50,"curveRedY2":50,"curveRedX3":75,"curveRedY3":75,"curveGreenX1":25,"curveGreenY1":25,"curveGreenX2":50,"curveGreenY2":50,"curveGreenX3":75,"curveGreenY3":75,"curveBlueX1":25,"curveBlueY1":25,"curveBlueX2":50,"curveBlueY2":50,"curveBlueX3":75,"curveBlueY3":75}],[2,"Color & Tone",{"temperature":11,"tint":0,"exposure":35,"contrast":20,"whites":5,"blacks":-10,"saturation":7,"vibrance":16,"highlights":0,"shadows":0,"brightness":0,"clarity":0,"sharpen":0,"noiseReduction":0,"fade":0,"vignette":0,"grain":0,"hslRedHue":0,"hslRedSaturation":0,"hslRedLuminance":0,"hslYellowHue":0,"hslYellowSaturation":0,"hslYellowLuminance":0,"hslGreenHue":0,"hslGreenSaturation":0,"hslGreenLuminance":0,"hslCyanHue":0,"hslCyanSaturation":0,"hslCyanLuminance":0,"hslBlueHue":0,"hslBlueSaturation":0,"hslBlueLuminance":0,"hslMagentaHue":0,"hslMagentaSaturation":0,"hslMagentaLuminance":0,"wheelShadowsX":0,"wheelShadowsY":0,"wheelShadowsLevel":0,"wheelMidtonesX":0,"wheelMidtonesY":0,"wheelMidtonesLevel":0,"wheelHighlightsX":0,"wheelHighlightsY":0,"wheelHighlightsLevel":0,"curveMasterX1":25,"curveMasterY1":25,"curveMasterX2":50,"curveMasterY2":50,"curveMasterX3":75,"curveMasterY3":75,"curveRedX1":25,"curveRedY1":25,"curveRedX2":50,"curveRedY2":50,"curveRedX3":75,"curveRedY3":75,"curveGreenX1":25,"curveGreenY1":25,"curveGreenX2":50,"curveGreenY2":50,"curveGreenX3":75,"curveGreenY3":75,"curveBlueX1":25,"curveBlueY1":25,"curveBlueX2":50,"curveBlueY2":50,"curveBlueX3":75,"curveBlueY3":75}],[3,"Color & Tone",{"temperature":18,"tint":-9,"exposure":35,"contrast":9,"whites":0,"blacks":-9,"saturation":0,"vibrance":0,"highlights":0,"shadows":0,"brightness":0,"clarity":0,"sharpen":0,"noiseReduction":0,"fade":0,"vignette":0,"grain":0,"hslRedHue":0,"hslRedSaturation":0,"hslRedLuminance":0,"hslYellowHue":0,"hslYellowSaturation":0,"hslYellowLuminance":0,"hslGreenHue":0,"hslGreenSaturation":0,"hslGreenLuminance":0,"hslCyanHue":0,"hslCyanSaturation":0,"hslCyanLuminance":0,"hslBlueHue":0,"hslBlueSaturation":0,"hslBlueLuminance":0,"hslMagentaHue":0,"hslMagentaSaturation":0,"hslMagentaLuminance":0,"wheelShadowsX":0,"wheelShadowsY":0,"wheelShadowsLevel":0,"wheelMidtonesX":0,"wheelMidtonesY":0,"wheelMidtonesLevel":0,"wheelHighlightsX":0,"wheelHighlightsY":0,"wheelHighlightsLevel":0,"curveMasterX1":25,"curveMasterY1":25,"curveMasterX2":50,"curveMasterY2":50,"curveMasterX3":75,"curveMasterY3":75,"curveRedX1":25,"curveRedY1":25,"curveRedX2":50,"curveRedY2":50,"curveRedX3":75,"curveRedY3":75,"curveGreenX1":25,"curveGreenY1":25,"curveGreenX2":50,"curveGreenY2":50,"curveGreenX3":75,"curveGreenY3":75,"curveBlueX1":25,"curveBlueY1":25,"curveBlueX2":50,"curveBlueY2":50,"curveBlueX3":75,"curveBlueY3":75}],[6,"Color & Tone",{"temperature":0,"tint":0,"exposure":35,"contrast":13,"whites":11,"blacks":0,"saturation":0,"vibrance":0,"highlights":0,"shadows":0,"brightness":0,"clarity":0,"sharpen":0,"noiseReduction":0,"fade":0,"vignette":0,"grain":0,"hslRedHue":0,"hslRedSaturation":0,"hslRedLuminance":0,"hslYellowHue":0,"hslYellowSaturation":0,"hslYellowLuminance":0,"hslGreenHue":0,"hslGreenSaturation":0,"hslGreenLuminance":0,"hslCyanHue":0,"hslCyanSaturation":0,"hslCyanLuminance":0,"hslBlueHue":0,"hslBlueSaturation":0,"hslBlueLuminance":0,"hslMagentaHue":0,"hslMagentaSaturation":0,"hslMagentaLuminance":0,"wheelShadowsX":0,"wheelShadowsY":0,"wheelShadowsLevel":0,"wheelMidtonesX":0,"wheelMidtonesY":0,"wheelMidtonesLevel":0,"wheelHighlightsX":0,"wheelHighlightsY":0,"wheelHighlightsLevel":0,"curveMasterX1":25,"curveMasterY1":25,"curveMasterX2":50,"curveMasterY2":50,"curveMasterX3":75,"curveMasterY3":75,"curveRedX1":25,"curveRedY1":25,"curveRedX2":50,"curveRedY2":50,"curveRedX3":75,"curveRedY3":75,"curveGreenX1":25,"curveGreenY1":25,"curveGreenX2":50,"curveGreenY2":50,"curveGreenX3":75,"curveGreenY3":75,"curveBlueX1":25,"curveBlueY1":25,"curveBlueX2":50,"curveBlueY2":50,"curveBlueX3":75,"curveBlueY3":75}],[8,"Color & Tone",{"temperature":18,"tint":-4,"exposure":35,"contrast":20,"whites":12,"blacks":-9,"saturation":0,"vibrance":0,"highlights":0,"shadows":0,"brightness":0,"clarity":0,"sharpen":0,"noiseReduction":0,"fade":0,"vignette":0,"grain":0,"hslRedHue":0,"hslRedSaturation":0,"hslRedLuminance":0,"hslYellowHue":0,"hslYellowSaturation":0,"hslYellowLuminance":0,"hslGreenHue":0,"hslGreenSaturation":0,"hslGreenLuminance":0,"hslCyanHue":0,"hslCyanSaturation":0,"hslCyanLuminance":0,"hslBlueHue":0,"hslBlueSaturation":0,"hslBlueLuminance":0,"hslMagentaHue":0,"hslMagentaSaturation":0,"hslMagentaLuminance":0,"wheelShadowsX":0,"wheelShadowsY":0,"wheelShadowsLevel":0,"wheelMidtonesX":0,"wheelMidtonesY":0,"wheelMidtonesLevel":0,"wheelHighlightsX":0,"wheelHighlightsY":0,"wheelHighlightsLevel":0,"curveMasterX1":25,"curveMasterY1":25,"curveMasterX2":50,"curveMasterY2":50,"curveMasterX3":75,"curveMasterY3":75,"curveRedX1":25,"curveRedY1":25,"curveRedX2":50,"curveRedY2":50,"curveRedX3":75,"curveRedY3":75,"curveGreenX1":25,"curveGreenY1":25,"curveGreenX2":50,"curveGreenY2":50,"curveGreenX3":75,"curveGreenY3":75,"curveBlueX1":25,"curveBlueY1":25,"curveBlueX2":50,"curveBlueY2":50,"curveBlueX3":75,"curveBlueY3":75}]],
    transforms: [],
    transitions: [],
    graphics: [["Lower third",0,53,{"anchor":"center","overlayScale":100,"title":"<text>","subtitle":"<text>","direction":"center","barColor":"#ffffff","subtitleColor":"#FFFFFF","fontFamily":"","fontWeight":"800","fontSize":46,"color":"#111111","accent":"#008ff1"},"20c03ab37b53b940",null],["Location pin",53,99,{"anchor":"center","overlayScale":100,"place":"<text>","date":"","fontFamily":"","fontWeight":"700","fontSize":32,"color":"#ffffff","accent":"#34d399"},"65c55e8d52bdaaee",{"position":{"x":64.79916864842988,"y":41.59374843094563}}],["Location pin",253,306,{"anchor":"center","overlayScale":100,"place":"<text>","date":"","fontFamily":"","fontWeight":"700","fontSize":32,"color":"#ffffff","accent":"#34d399"},"65c55e8d52bdaaee",{"position":{"x":60.94914666264989,"y":41.57244732922222}}],["Fade to black — final 1.5 seconds",429,467,{"frames":38},"ef85543b48baf31a",null]],
    music: [0,467,3.12],
  },
};

// The words come from the Project; everything else must be the reference's.
const TEXT = { 'Text': ['body'], 'Label - <text>': ['text'], 'Handwritten title': ['title'], 'Lower third': ['title', 'subtitle'], 'Location pin': ['place'] };
const masked = (name, parameters) => {
  const n = name.replace(/^Label - .*/, 'Label - <text>'), p = { ...parameters };
  for (const k of TEXT[n] || []) p[k] = '<text>';
  return [n, p];
};
const byStart = (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]);

(async () => {
  for (const style of ['whip', 'motion', 'quotes']) {
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
      if (g.label === 'Lower third') assert.deepEqual([g.parameters.title, g.parameters.subtitle], ['My Trip', '']);
      if (g.label === 'Handwritten title') assert.equal(g.parameters.title, 'My Trip');
      if (g.label === 'Location pin' || g.label.startsWith('Label - ')) assert.match(g.parameters.place ?? g.parameters.text, /^Chapter \d+$/);
    }
    // The desk effect's code (the plugin's own) is the reference's.
    if (style === 'motion') assert.equal(main[0].effects[0][2], 'ffc2c5b4e624befc', 'desk code');
  }

  // At 30 fps every frame scales by round(f * 30 / 25): cuts, graphics, music and frame-counted parameters.
  {
    const { rec } = await build('whip', 30);
    assert.deepEqual(rec.main.map(c => c.endFrame), EXPECTED.whip.main.map(([, e]) => Math.round(e * 30 / 25)));
    assert.deepEqual(rec.audio.map(a => [a.startFrame, a.endFrame]), [[0, Math.round(389 * 30 / 25)]]);
    assert.equal(rec.video.find(g => g.label === 'Fade to black').parameters.lengthFrames, 18);
    assert.deepEqual(rec.transitions.map(t => t[3] - t[2]), [10, 10]);
    const m = await build('motion', 30);
    assert.deepEqual(m.rec.audio.map(a => [a.startFrame, a.endFrame]), [[13, 510]]);
    assert.equal(m.rec.main[0].effects[0][1].beatFrames, 12.167);
    assert.equal(m.rec.main[0].effects[0][1].holdFrames, 67);
  }
  // A frame narrower than 3:2 goes without the letterbox.
  assert.ok(!(await build('whip', 25, { wide: false })).rec.video.some(g => /letterbox/.test(g.label)));

  // Which builds follow the reference: the style's own cue, with the bars on exactly for the whip style.
  assert.equal(K.voRefStyle('whip', 'cue:cinematic', true), 'whip');
  assert.equal(K.voRefStyle('whip', 'cue:cinematic', false), null);
  assert.equal(K.voRefStyle('whip', 'cue:vlog', true), null);
  assert.equal(K.voRefStyle('motion', 'cue:vlog', false), 'motion');
  assert.equal(K.voRefStyle('motion', 'cue:vlog', true), null);
  assert.equal(K.voRefStyle('quotes', 'cue:cafe', false), 'quotes');
  assert.equal(K.voRefStyle('quotes', 'file', false), null);
  // Funny quotes keeps the nine best-scored lines in the order they were found; fewer than nine is no reference.
  const lines = Array.from({ length: 12 }, (_, i) => ({ text: 'l' + i, score: [5, 1, 4, 4, 2, 9, 0, 3, 7, 6, 8, 1][i] }));
  assert.deepEqual(K.voRefQuotes(lines).map(l => l.text), ['l0', 'l2', 'l3', 'l4', 'l5', 'l7', 'l8', 'l9', 'l10']);
  assert.equal(K.voRefQuotes(lines.slice(0, 8)), null);
  console.log('vlog-opening reference: whip, motion and quotes match the reference timelines');
})().catch((e) => { console.error(e); process.exit(1); });
