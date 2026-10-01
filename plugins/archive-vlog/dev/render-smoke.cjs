#!/usr/bin/env node
// Render smoke test for a style-app panel: renders the panel once per language and per fake state through a minimal
// React stub and fails on `undefined`, `NaN`, `[object`, a leftover `{placeholder}`, an empty render or a language
// that shows only English. It is the only check that runs the t() calls with real variables. From the i18n rollout.
//
// Archive Vlog's copy (dev/, not shipped): the block marked ADAPT holds this panel's states; everything below it is the
// kit's tools/i18n/render-smoke.template.cjs unchanged. Run: node plugins/archive-vlog/dev/render-smoke.cjs plugins/archive-vlog
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { spawnSync } = require('node:child_process');

const USAGE = `usage: node render-smoke.cjs <plugin dir> [--langs de,ko] [--show <lang>|all] [--out <dir>] [--esbuild <bin>]

  Bundles <plugin dir>/panel.tsx (a copy with \`export { t as __t, STRINGS as __S }\` appended) with esbuild
  (--bundle --external:react), next to a React stub in <out>/node_modules/react, then renders Panel per language x
  VARIANTS. --show prints every visible string of one language (or all) for review. Exit 1 on problems, 2 on usage,
  3 when esbuild is not found (set ESBUILD=<path>; it is looked up on PATH, in ~/.npm/_npx, then via npx).`;

// ---- ADAPT: Archive Vlog's fake states (every panel state) ------------------------------------------------------
// Variants rendered for every language: no Project, loading, ready (with a searched plan), Quick / Long / Golden Hour
// with Credit and Look off, No music + Clip sound Off, own music (accepted / approximate / none), busy with progress,
// a finished result with notes, an unfinished result with an error, inventory errors, clips being analysed, a Korean
// title and credit, a host too old for the panel, and a playing preview.
const VARIANTS = ['noProject', 'loading', 'ready', 'quickLong', 'noMusic', 'ownAccepted', 'ownApprox', 'ownNone', 'busy', 'done', 'unfinished', 'invBusy',
  'invFailed', 'analysing', 'korean', 'hostTooOld', 'playing', 'listening', 'creditCleared', 'fast'];
const PLUGIN = path.resolve(__dirname, '..');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(PLUGIN, f), 'utf8'));
const ASSETS = { manifest: readJson('assets/cues/manifest.json'), presets: readJson('assets/fonts/presets.json'),
  scripts: { inventoryJs: '', searchJs: '', ensureJs: '', assembleJs: '', decorateJs: '' }, tsx: {} };
const INV = readJson('dev/fixtures/daily-inventory.json'), FOUND = readJson('dev/fixtures/daily-search.json');
const HANGUL = (...cps) => String.fromCharCode(...cps);
const KO_TITLE = HANGUL(0xc11c, 0xc6b8, 0x0020, 0xc0b0, 0xcc45), KO_NAME = HANGUL(0xd64d, 0xae38, 0xb3d9);
// State by `const [name, setName] = React.useState(...)` name. Text kept in state is a function of the language.
function states(variant, T) {
  if (variant === 'noProject' || variant === 'loading') return {};
  const base = { assets: ASSETS, roots: { plugin: '/p', data: '/d' }, inventory: INV };
  const searched = { candidates: { key: 'pid|null', failed: [], list: FOUND.list } };
  const grid = (g) => ({ durationSeconds: 150, peaks: [0.2, 0.5, 0.9, 0.4], beatEnergy: Array(200).fill(0.1), onsets: [], onsetThresholds: { l: 2, m: 2, h: 2 }, firstBeat: 0.1, ...g });
  switch (variant) {
    case 'ready': return { ...base, ...searched };
    case 'quickLong': return { ...base, ...searched, pace: 'quick', length: 'long', preset: 'golden-hour', creditOn: false, look: false };
    case 'noMusic': return { ...base, cueId: 'none', clipSound: 'off', usePhotos: false };
    case 'ownAccepted': return { ...base, cueId: 'own', ownMusic: { path: '/m/song.mp3', name: 'song.mp3' }, ownGrid: grid({ accepted: true, grid: 'accepted', bpm: 120 }), section: 10 };
    case 'ownApprox': return { ...base, cueId: 'own', ownMusic: { path: '/m/song.mp3', name: 'song.mp3' }, ownGrid: grid({ accepted: false, grid: 'approximate', bpm: 96 }) };
    case 'ownNone': return { ...base, cueId: 'own', ownMusic: { path: '/m/song.mp3', name: 'song.mp3' }, ownGrid: { accepted: false, grid: 'none', failed: true, durationSeconds: 90, peaks: [] },
      status: { tone: 'info', say: (l) => T(l, 'musicApprox', { detail: 'beat detection failed' }) } };
    case 'busy': return { ...base, busy: true, progress: { id: 'shots', value: 0.2, percent: 20, current: 0, detail: (l) => T(l, 'videosChecked', { done: 4, count: 30 }) } };
    case 'done': return { ...base, result: { decorated: true, link: 'selects://draft', shortened: { shots: 12, of: 16, seconds: 31.4 }, noVideo: true, notes: ['the Draft was found after its reply was lost'],
      unchecked: 2, frozen: { pid: 'pid' } } };
    case 'unfinished': return { ...base, result: { decorated: false, frozen: { pid: 'pid' } },
      status: { tone: 'error', say: (l) => T(l, 'stoppedAt', { step: 4, total: 5, name: T(l, 'step.look'), detail: T(l, 'finishFailed', { detail: 'invalid_source_range' }) }) } };
    case 'invBusy': return { assets: ASSETS, roots: base.roots, invError: { busy: true, say: (l) => T(l, 'busy') } };
    case 'invFailed': return { assets: ASSETS, roots: base.roots, invError: { say: () => 'Project not found' } };
    case 'analysing': return { ...base, inventory: { ...INV, resources: [], photos: [], incomplete: false,
      skipped: { unanalysed: 6, analysing: 3, notAnalysed: 2, failed: 1, statusKnown: true } } };
    case 'korean': return { ...base, ...searched, fieldEdits: { kicker: KO_NAME, title: KO_TITLE, tagline: KO_TITLE + ' ' + KO_NAME }, creditName: KO_NAME };
    case 'hostTooOld': return { status: { tone: 'error', say: (l) => T(l, 'hostTooOld') } };
    case 'playing': return { ...base, playState: 'playing' };
    case 'listening': return { ...base, cueId: 'own', ownMusic: { path: '/m/song.mp3', name: 'song.mp3' }, listening: true };
    case 'creditCleared': return { ...base, preset: 'a-day-out', creditName: '', creditPrefix: 'BUSAN |' };
    case 'fast': return { ...base, cueId: 'own', ownMusic: { path: '/m/song.mp3', name: 'song.mp3' }, ownGrid: grid({ accepted: true, grid: 'accepted', bpm: 128 }) };
  }
  return base;
}
// The props Panel is called with (language code shapes vary to exercise normalisation). A host with file reads, so the
// own-music row shows.
function props(lang, variant, ui) {
  global.window.parent = { __DI__: { FileSystem: { readFile() {} } } };
  const language = lang === 'zh' ? 'zh-TW' : lang === 'pt' ? 'pt_BR' : lang;
  return { sdk: {}, ui, context: { projectId: variant === 'noProject' ? null : 'pid', projectName: 'Seoul', language } };
}
// Strings that must appear per variant (the guard against an empty render): (T, lang) => [text, ...].
const EXPECT = {
  noProject: (T, l) => [T(l, 'openProject')],
  loading: (T, l) => [T(l, 'loading'), T(l, 'checkingClipsNow'), T(l, 'build')],
  ready: (T, l) => [T(l, 'style'), T(l, 'creditShot'), T(l, 'creditSample', { name: 'YOURNAME' }), T(l, 'pace.cinematic'), T(l, 'cinematicLook'), T(l, 'previewSection'), T(l, 'replayDecode')],
  quickLong: (T, l) => [T(l, 'pace.quick'), T(l, 'length.long')],
  noMusic: (T, l) => [T(l, 'silentVideo'), T(l, 'noMusicTiming', { bpm: 72 })],
  ownAccepted: (T, l) => [T(l, 'beatFound', { bpm: 120 })],
  ownApprox: (T, l) => [T(l, 'faintTempo', { bpm: 96 })],
  ownNone: (T, l) => [T(l, 'musicApprox', { detail: 'beat detection failed' })],
  busy: (T, l) => [T(l, 'progressDetail', { step: 1, total: 5, name: T(l, 'step.shots'), detail: T(l, 'videosChecked', { done: 4, count: 30 }), percent: 20 })],
  done: (T, l) => [T(l, 'draftCreated'), T(l, 'noVideoNote'), T(l, 'openDraft'), T(l, 'anotherVersion')],
  unfinished: (T, l) => [T(l, 'draftNotFinished'), T(l, 'finishTitle')],
  invBusy: (T, l) => [T(l, 'busy')],
  invFailed: (T, l) => [T(l, 'invFailed')],
  analysing: (T, l) => [T(l, 'analysing', { count: 3 })],
  korean: (T, l) => [KO_TITLE],
  hostTooOld: (T, l) => [T(l, 'hostTooOld')],
  playing: (T, l) => [T(l, 'stopPreview')],
  listening: (T, l) => [T(l, 'listening'), T(l, 'ownMusicHint', { count: 4 })],
  creditCleared: (T, l) => [T(l, 'creditCleared')],
  fast: (T, l) => [T(l, 'fastTempo')],
};
// ---- end ADAPT ---------------------------------------------------------------------------------------------------

const REACT_STUB = `// Minimal React stub for a one-pass render: state comes from global.__STATE (by hook index), effects never run.
let i = 0;
const R = {
  __reset() { i = 0; },
  createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity) }; },
  useState(init) { const k = i++; const s = global.__STATE; return [s && k in s ? s[k] : typeof init === 'function' ? init() : init, () => {}]; },
  useReducer(_, init) { const k = i++; const s = global.__STATE; return [s && k in s ? s[k] : init, () => {}]; },
  useRef(v) { i++; return { current: v }; },
  useEffect() { i++; }, useLayoutEffect() { i++; },
  useMemo(f) { i++; return f(); }, useCallback(f) { i++; return f; },
  Fragment: 'fragment',
};
module.exports = R; module.exports.default = R;
`;

function findEsbuild(explicit) {
  const works = (bin, pre = []) => spawnSync(bin, [...pre, '--version'], { encoding: 'utf8' }).status === 0;
  for (const bin of [explicit, process.env.ESBUILD].filter(Boolean)) if (works(bin)) return { bin, pre: [] };
  if (works('esbuild')) return { bin: 'esbuild', pre: [] };
  const npx = path.join(os.homedir(), '.npm', '_npx');
  if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) {
    const bin = path.join(npx, d, 'node_modules', '.bin', 'esbuild');
    if (fs.existsSync(bin) && works(bin)) return { bin, pre: [] };
  }
  if (works('npx', ['--yes', 'esbuild'])) return { bin: 'npx', pre: ['--yes', 'esbuild'] };
  return null;
}

function build(pluginDir, out, esbuild) {
  fs.mkdirSync(path.join(out, 'node_modules', 'react'), { recursive: true });
  // The stub sits on the bundle's own node_modules path: an aliased (inlined) stub would be a second instance whose
  // hook counter is never reset, and the smoke would pass on an empty render.
  fs.writeFileSync(path.join(out, 'node_modules', 'react', 'index.js'), REACT_STUB);
  const smoke = path.join(out, 'panel.smoke.tsx'), built = path.join(out, 'panel.built.cjs');
  fs.writeFileSync(smoke, fs.readFileSync(path.join(pluginDir, 'panel.tsx'), 'utf8') + '\nexport { t as __t, STRINGS as __S };\n');
  const r = spawnSync(esbuild.bin, [...esbuild.pre, smoke, '--bundle', '--format=cjs', '--platform=node', '--jsx=transform',
    '--external:react', '--log-level=warning', '--outfile=' + built], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('esbuild failed:\n' + r.stderr);
  return built;
}

// Hook indexes by state name: every hook call inside Panel, in source order; a named useState takes the call's index.
function hookIndex(src) {
  const body = src.slice(src.indexOf('export default function Panel('));
  const re = /const \[(\w+), set\w+\] = (?:React\.)?useState\b|(?:React\.)?\b(useState|useReducer|useRef|useEffect|useLayoutEffect|useMemo|useCallback)\b(?=\s*[(<])/g;
  const index = {};
  let n = 0;
  for (const m of body.matchAll(re)) { if (m[1]) index[m[1]] = n; n++; }
  return index;
}

const TEXT_PROPS = ['label', 'title', 'aria-label', 'aria-valuetext', 'busyLabel', 'placeholder', 'unit', 'alt'];
function collect(node, out) {
  if (node == null || node === false || node === true) return;
  if (Array.isArray(node)) { node.forEach((c) => collect(c, out)); return; }
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
  if (typeof node.type === 'function') { collect(node.type({ ...node.props, children: node.children }), out); return; }
  for (const k of TEXT_PROPS) if (typeof node.props[k] === 'string') out.push('[' + k + '] ' + node.props[k]);
  if (Array.isArray(node.props.options)) node.props.options.forEach((o) => out.push('[option] ' + (o && o.label)));
  if (Array.isArray(node.props.steps)) node.props.steps.forEach((o) => out.push('[step] ' + o));
  collect(node.children, out);
}

function main(argv) {
  const args = argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const pluginDir = args.find((a, i) => !a.startsWith('-') && !['--langs', '--show', '--out', '--esbuild'].includes(args[i - 1]));
  if (args.includes('--help') || args.includes('-h')) { console.log(USAGE); return 0; }
  if (!pluginDir) { console.error(USAGE); return 2; }
  const langs = (opt('--langs') || 'de,en,es,fr,it,ja,ko,pt,tr,zh').split(','), show = opt('--show');
  const esbuild = findEsbuild(opt('--esbuild'));
  if (!esbuild) { console.error('esbuild not found: set ESBUILD=<path to esbuild>'); return 3; }
  const out = path.resolve(opt('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'render-smoke-')));
  const built = build(path.resolve(pluginDir), out, esbuild);

  global.window = { parent: {}, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} };
  global.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(global, 'navigator', { value: { language: 'en-US' }, configurable: true });
  const React = require(path.join(out, 'node_modules', 'react'));
  const mod = require(built), Panel = mod.default, T = mod.__t;
  const index = hookIndex(fs.readFileSync(path.join(pluginDir, 'panel.tsx'), 'utf8'));
  const ui = new Proxy({}, { get: (_, name) => 'ui.' + String(name) });

  const render = (lang, variant) => {
    const st = {};
    for (const [k, v] of Object.entries(states(variant, T))) { if (!(k in index)) throw new Error('no useState named ' + k + ' in Panel'); st[index[k]] = v; }
    global.__STATE = st; React.__reset();
    const strings = [];
    collect(Panel(props(lang, variant, ui)), strings);
    return strings;
  };
  const english = new Set(VARIANTS.flatMap((v) => render('en', v)));
  let bad = 0;
  for (const lang of langs) {
    const all = [], problems = [];
    for (const variant of VARIANTS) {
      const strings = render(lang, variant);
      if (!strings.length) problems.push(variant + ': empty render');
      for (const want of (EXPECT[variant] ? EXPECT[variant](T, lang) : [])) if (!strings.some((s) => s.includes(want))) problems.push(variant + ': missing "' + want + '"');
      all.push(...strings.map((s) => variant + ': ' + s));
    }
    const uniq = [...new Set(all)];
    problems.push(...uniq.filter((s) => /undefined|NaN|\[object|\{\w+\}/.test(s)));
    const own = uniq.filter((s) => !english.has(s.slice(s.indexOf(': ') + 2)));
    if (lang !== 'en' && !own.length) problems.push('every string is the English one: the language is not applied');
    bad += problems.length;
    console.log(lang + ': ' + uniq.length + ' strings, ' + problems.length + ' problems');
    problems.forEach((p) => console.log('  PROBLEM ' + p));
    if (show === lang || show === 'all') uniq.forEach((s) => console.log('  ' + s));
  }
  return bad ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv);
