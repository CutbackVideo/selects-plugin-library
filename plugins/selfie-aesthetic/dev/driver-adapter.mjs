// Plugin adapter for selfie-aesthetic: everything style-specific the kit's tools/drive/build-driver.mjs needs to
// reproduce the panel's Build headlessly (adapted from the kit's pluginAdapter.mjs; the contract is at its top).
//
// The configs are the ones panel.tsx build() sends, built from the shipped files: SAE_QUERIES, LOOK_PRESETS,
// LOOK_OPTIONS, AMBIENT_DB, LOOK_STRENGTH and SAE_WHIP_MODE are read from panel.tsx; planner.js and the panel's
// `// sae-panel:start/end` helpers (saeTrimHolds, saeOwnCue, saeLoudestSection) run in node:vm; Adjust labels come
// from the STRINGS block. Differences from a panel Build (see dev/README-driver.md):
//   - No bad-shot spans: the panel reads them with sdk.call("getResourceVisualSpans"), which run_script / MCP cannot
//     reach, so the plan gets badSpans {} (a moment the panel would move off a bad span may differ).
//   - whipMode is a row input (the panel always sends its SAE_WHIP_MODE constant) for the effect/transition A/B.
//   - The Draft name is "Selfie test <A|B> <cue> <preset> <length> s<seed>[ transition][ still<w>]", not the panel's
//     date name.
//   - Motion for the stillness picker (row `still` > 0) is measured with the local ffmpeg (FFMPEG_DIR or PATH) on the
//     inventory's source paths, with the host block's own saeMotionArgs / saeMotionValues (the panel's argv and
//     arithmetic); the panel runs the host's bundled ffmpeg. A clip without a readable source has no curve.
//
// Row inputs: key, pid, project ('A'|'B', optional; from the pid otherwise), seeds, cue ('make-funk' | 'day-trips' |
// 'sensual-melancholia' | 'pantheon' | 'none' | 'own:<abs path>'; '$VAR' / '${VAR}' expand from the environment;
// --own <path> on the driver's command line replaces the path of every own row), preset ('soft-glow' | 'night-glam' |
// 'clean'), look (bool), length ('short'|'standard'|'long'), clipSound ('off'|'ambient'|'full'), photos (bool),
// section ('default'|'early'|'late'|seconds), whipMode ('effect'|'transition'), uiLang ('en'|'ko'|...: Adjust
// labels), still (stillness picker weight, a number >= 0; default the panel's SAE_STILL_WEIGHT_PANEL; a row that sets
// it, 0 included, gets ' still<w>' in its Draft name), export, capture.
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const j = v => JSON.parse(JSON.stringify(v)); // vm objects -> plain objects

// A `const NAME = <literal>` of panel.tsx, up to the first `close` after it (the kit adapter's panelConst).
function panelConst(panel, name, close) {
  const at = panel.indexOf('const ' + name + ' = ');
  if (at < 0) throw Error('panel.tsx has no const ' + name);
  const from = at + ('const ' + name + ' = ').length;
  return (0, eval)('(' + panel.slice(from, panel.indexOf(close, from) + 1) + ')');
}
// A scalar const, also with a TS annotation (`const SAE_WHIP_MODE: "effect" | "transition" = "effect";`).
function panelScalar(panel, name) {
  const m = new RegExp('^const ' + name + '(?::[^=\\n]+)? = ([^;\\n]+);', 'm').exec(panel);
  if (!m) throw Error('panel.tsx has no const ' + name);
  return (0, eval)('(' + m[1] + ')');
}
function between(src, a, b) {
  const i = src.indexOf(a), k = src.indexOf(b, i + a.length);
  if (i < 0 || k < 0) throw Error('panel.tsx has no ' + a + ' ... ' + b + ' block');
  return src.slice(i + a.length, k);
}

// planner.js plus the panel's plain-JS helpers in one context (the panel block calls planner functions). Exports every
// sae* function and SAE_* constant either declares, so a planner change never needs a driver change.
export function loadPlannerAndPanel(plannerSrc, panelSrc) {
  const block = between(panelSrc, '// sae-panel:start', '// sae-panel:end');
  const src = plannerSrc + '\n' + block;
  const names = [...new Set([...src.matchAll(/^(?:function\s+(sae\w+)|const\s+(SAE_\w+))/gm)].map(m => m[1] || m[2]))];
  const box = {};
  vm.createContext(box);
  vm.runInContext(src + ';globalThis.P={' + names.join(',') + '};', box);
  return box.P;
}

// The panel's host block (between its markers in panel.tsx) in node:vm with a bare window, for its pure motion helpers.
export function loadHostHelpers(panelSrc) {
  const a = panelSrc.indexOf('// sae-host:start'), b = panelSrc.indexOf('// sae-host:end');
  if (a < 0 || b < a) throw Error('panel.tsx has no sae-host block');
  const box = { window: { parent: {} }, navigator: {}, setTimeout, clearTimeout, AbortController };
  vm.createContext(box);
  vm.runInContext(panelSrc.slice(a, b) + ';globalThis.H={saeMotionArgs,saeMotionValues,SAE_MOTION_FPS};', box);
  return box.H;
}

const PROJECT_LETTERS = { '28579d3f-de18-4af5-8f3d-f1bf9245fc20': 'A', '4a9c32f1-1b61-4962-b2db-51fec2637b0e': 'B' };
export const ROW_DEFAULTS = { cue: 'make-funk', preset: 'soft-glow', look: true, length: 'short', clipSound: 'ambient', photos: true, section: 'default', uiLang: 'en' };
const EFFECT_NAME = 'Selfie whip + look';
const PCM_RATE = 22050, PCM_SECONDS = 240; // panel.tsx SAE_PCM_RATE / SAE_PCM_SECONDS (also read from it below)

// `$VAR` / `${VAR}` from the environment; an unset variable throws (a literal '$TEST_MUSIC' path is never imported).
function expandEnv(s) {
  return s.replace(/\$\{(\w+)\}|\$(\w+)/g, (_, a, b) => {
    const v = process.env[a || b];
    if (!v) throw Error('environment variable ' + (a || b) + ' is not set (own music path)');
    return v;
  });
}
function cliOwn() {
  const i = process.argv.indexOf('--own');
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith('--own='));
  return eq ? eq.slice(6) : null;
}
const isOwn = cue => typeof cue === 'string' && (cue === 'own' || cue.startsWith('own:'));
// The own-music file of a row: --own <path> when given (it replaces every own row's path), else 'own:<path>' with
// env expansion ('own:$TEST_MUSIC'), else (`own` / `own:`) $TEST_MUSIC.
export function ownPath(cue) {
  const rest = cue === 'own' ? '' : cue.slice(4);
  const p = cliOwn() || (rest ? expandEnv(rest) : process.env.TEST_MUSIC);
  if (!p) throw Error('own music needs a path: own:<path>, own:$TEST_MUSIC or --own <path>');
  return path.resolve(p);
}

export async function createAdapter({ pluginDir, installedDir, read }) {
  let manifestJson;
  try { manifestJson = JSON.parse(read('plugin.json')); } catch { manifestJson = { id: 'selfie-aesthetic', version: '0.0.0' }; }
  const panel = read('panel.tsx');
  const P = loadPlannerAndPanel(read('planner.js'), panel);
  const H = loadHostHelpers(panel);
  const STILL_WEIGHT = panelScalar(panel, 'SAE_STILL_WEIGHT_PANEL');
  const QUERIES = panelConst(panel, 'SAE_QUERIES', '};');
  const PAGE_SIZE = panelScalar(panel, 'SAE_SEARCH_PAGE_SIZE');
  const SEARCH_BATCH = panelScalar(panel, 'SAE_SEARCH_BATCH');
  const WHIP_MODE = panelScalar(panel, 'SAE_WHIP_MODE');
  const AMBIENT_DB = panelScalar(panel, 'AMBIENT_DB');
  const LOOK_STRENGTH = panelScalar(panel, 'LOOK_STRENGTH');
  const LOOK_PRESETS = panelConst(panel, 'LOOK_PRESETS', '];');
  const LOOK_OPTIONS = panelConst(panel, 'LOOK_OPTIONS', '];');
  if (panelScalar(panel, 'SAE_PCM_RATE') !== PCM_RATE || panelScalar(panel, 'SAE_PCM_SECONDS') !== PCM_SECONDS) throw Error('panel.tsx own-music decode changed (SAE_PCM_RATE / SAE_PCM_SECONDS)');
  const { extractStrings } = require(path.join(pluginDir, 'dev', 'i18n-check.cjs'));
  const STRINGS = extractStrings(panel).strings;
  const t = (lang, key) => (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
  const lookLabel = (lang, id) => t(lang, id === 'soft-glow' || id === 'night-glam' || id === 'clean' ? 'look.' + id : 'look.none');
  const cues = JSON.parse(read('assets/cues/manifest.json')).cues;
  const effectTsx = read('assets/selfie-whip-look.tsx'), transitionTsx = read('assets/selfie-whip-transition.tsx');
  const beat = require(path.join(pluginDir, 'beat-detect.cjs'));
  const ownCache = new Map(), motionCache = new Map();
  const withDefaults = r => ({ ...ROW_DEFAULTS, whipMode: WHIP_MODE, ...r });
  // `still` stays off the defaults so the Draft name shows it only on rows that set it.
  const stillOf = row => (row.still === undefined ? STILL_WEIGHT : row.still);
  const letterOf = row => row.project || PROJECT_LETTERS[row.pid] || String(row.pid).slice(0, 4);
  const cueName = cue => (isOwn(cue) ? 'own' : cue);
  // "Selfie test <A|B> <cue> <preset> <length> s<seed>", plus " transition" in transition mode so an effect/transition
  // A/B pair with the same inputs gets two names.
  const draftNameOf = (r0, seed) => {
    const row = withDefaults(r0);
    return row.draftName || ['Selfie test', letterOf(row), cueName(row.cue), row.preset, row.length, 's' + seed].join(' ') + (row.whipMode === 'transition' ? ' transition' : '')
      + (r0 && r0.still !== undefined ? ' still' + r0.still : '');
  };

  // A source's motion curve like the panel's saeMotionCurve: the same ffmpeg argv (saeMotionArgs, first 120 s) and
  // the same frame differences (saeMotionValues). null when the file is missing or ffmpeg fails. Cached per file.
  function motionCurve(file) {
    if (motionCache.has(file)) return motionCache.get(file);
    let curve = null;
    if (file && fs.existsSync(file)) {
      const ff = process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg';
      const tmp = path.join(os.tmpdir(), 'sae-motion-' + process.pid + '-' + Date.now() + '.gray');
      try {
        execFileSync(ff, H.saeMotionArgs(file, tmp), { stdio: ['ignore', 'ignore', 'pipe'] });
        const buf = fs.readFileSync(tmp);
        const values = H.saeMotionValues(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
        curve = values ? { fps: H.SAE_MOTION_FPS, values } : null;
      } catch { curve = null; } finally { try { fs.unlinkSync(tmp); } catch { /* not written */ } }
    }
    motionCache.set(file, curve);
    return curve;
  }

  // Own music like the panel's analyseOwn(): the host ffmpeg decode (mono f32le, 22050 Hz, first 240 s), then
  // beat-detect's analyze on all of it (the Worker path), as the planner cue saeOwnCue builds. Cached per file.
  function ownCue(file) {
    if (ownCache.has(file)) return ownCache.get(file);
    if (!fs.existsSync(file)) throw Error('own music file not found: ' + file);
    const ff = process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg';
    const tmp = path.join(os.tmpdir(), 'sae-pcm-' + process.pid + '-' + Date.now() + '.f32');
    let an;
    try {
      execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', file, '-t', String(PCM_SECONDS), '-vn', '-ac', '1', '-ar', String(PCM_RATE), '-f', 'f32le', tmp], { stdio: ['ignore', 'ignore', 'pipe'] });
      const buf = fs.readFileSync(tmp);
      const pcm = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + Math.floor(buf.byteLength / 4) * 4));
      an = beat.analyze(pcm, PCM_RATE);
    } finally { try { fs.unlinkSync(tmp); } catch { /* not written */ } }
    const cue = j(P.saeOwnCue(an, undefined));
    ownCache.set(file, cue);
    return cue;
  }

  return {
    id: manifestJson.id,
    version: manifestJson.version,
    label: 'SAE',
    searchBatch: SEARCH_BATCH,
    // Exposed for tests and tools.
    planner: P, host: H, motionCurve, panelConstants: { QUERIES, PAGE_SIZE, SEARCH_BATCH, WHIP_MODE, AMBIENT_DB, LOOK_STRENGTH, LOOK_PRESETS, LOOK_OPTIONS, STILL_WEIGHT }, draftNameOf,

    // Coverage the Selfie Aesthetic matrix must meet: each value below in >= 2 builds' rows, a Korean-UI row, unique
    // Draft names over rows x seeds, known values only.
    checkMatrix(rows) {
      const R = rows.map(withDefaults);
      const tally = (f) => R.reduce((m, r) => { const k = String(f(r)); m[k] = (m[k] || 0) + 1; return m; }, {});
      const counts = {
        cue: tally(r => (isOwn(r.cue) ? 'own' : r.cue)), preset: tally(r => r.preset), length: tally(r => r.length), clipSound: tally(r => r.clipSound),
        look: tally(r => r.look), photos: tally(r => r.photos), section: tally(r => (typeof r.section === 'number' ? 'seconds' : r.section)),
        whipMode: tally(r => r.whipMode), uiLang: tally(r => r.uiLang), seed2: R.filter(r => (r.seeds || [1]).includes(2)).length,
        project: tally(letterOf), export: R.filter(r => r.export).length,
      };
      const need = [
        ...cues.map(c => ['cue', c.id]), ['cue', 'own'], ['cue', 'none'],
        ...LOOK_PRESETS.map(p => ['preset', p.id]), ...Object.keys(P.SAE_LENGTHS).map(l => ['length', l]),
        ['clipSound', 'off'], ['clipSound', 'ambient'], ['clipSound', 'full'], ['look', 'true'], ['look', 'false'],
        ['photos', 'true'], ['photos', 'false'], ['section', 'early'], ['section', 'late'], ['section', 'default'],
        ['whipMode', 'transition'], ['whipMode', 'effect'],
      ];
      const missing = need.filter(([k, v]) => !(counts[k][v] >= 2)).map(([k, v]) => k + '=' + v + ' (' + (counts[k][v] || 0) + ')');
      if (counts.seed2 < 2) missing.push('seed 2 (' + counts.seed2 + ')');
      if (!(counts.uiLang.ko >= 1)) missing.push('uiLang=ko (0)');
      const unknown = [];
      const cueIds = cues.map(c => c.id);
      for (const r of R) {
        if (!(isOwn(r.cue) || r.cue === 'none' || cueIds.includes(r.cue))) unknown.push(r.key + ': cue ' + r.cue);
        if (!LOOK_PRESETS.some(p => p.id === r.preset)) unknown.push(r.key + ': preset ' + r.preset);
        if (!P.SAE_LENGTHS[r.length]) unknown.push(r.key + ': length ' + r.length);
        if (!['off', 'ambient', 'full'].includes(r.clipSound)) unknown.push(r.key + ': clipSound ' + r.clipSound);
        if (!['effect', 'transition'].includes(r.whipMode)) unknown.push(r.key + ': whipMode ' + r.whipMode);
        if (typeof r.section !== 'number' && !['default', 'early', 'late'].includes(r.section)) unknown.push(r.key + ': section ' + r.section);
        if (!STRINGS[r.uiLang]) unknown.push(r.key + ': uiLang ' + r.uiLang);
        if (typeof r.look !== 'boolean' || typeof r.photos !== 'boolean') unknown.push(r.key + ': look/photos must be booleans');
        if (r.still !== undefined && !(typeof r.still === 'number' && isFinite(r.still) && r.still >= 0)) unknown.push(r.key + ': still must be a number >= 0');
        if (isOwn(r.cue) && /\/(?:Users|home)\//.test(r.cue)) unknown.push(r.key + ': own path must come from $TEST_MUSIC or --own, not a home path');
      }
      const names = R.flatMap(r => (r.seeds || [1]).map(sd => draftNameOf(r, sd)));
      const dupNames = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
      dupNames.forEach(n => unknown.push('duplicate Draft name: ' + n));
      return { ok: missing.length === 0 && unknown.length === 0, counts, missing, unknown };
    },

    // panel.tsx build() step 1: `{ projectId, only: null, known, ...(usePhotos ? {} : { measureMs: 0 }) }`; a fresh
    // panel has no known photo sizes. readOnly also skips the scratch-Draft photo measuring.
    inventory(r0, { readOnly } = {}) {
      const row = withDefaults(r0);
      return { summary: 'Read footage', script: 'scripts/inventory.js', config: { projectId: row.pid, only: null, known: {}, ...(row.photos && !readOnly ? {} : { measureMs: 0 }) } };
    },

    videoRids(inv) {
      return { rids: inv.resources.map(r => r.rid), durations: Object.fromEntries(inv.resources.map(r => [r.rid, r.duration])) };
    },

    // panel.tsx searchClips(): SAE_SEARCH_BATCH clips per call.
    search(row, rids) {
      return { summary: 'Find close-ups', script: 'scripts/search.js', config: { projectId: row.pid, rids, queries: QUERIES, pageSize: PAGE_SIZE } };
    },

    // panel.tsx: the music cue, defaultSection()/snap(), then build() steps 1-3.
    plan({ row: r0, seed, inv, found }) {
      const row = withDefaults(r0);
      inv.photos = inv.photos || [];
      let cue = null, ownFile = null;
      if (isOwn(row.cue)) { ownFile = ownPath(row.cue); cue = ownCue(ownFile); }
      else if (row.cue !== 'none') {
        cue = cues.find(c => c.id === row.cue) || null;
        if (!cue) throw Error('unknown cue ' + row.cue + '; one of none, own:<path>, ' + cues.map(c => c.id).join(', '));
      }
      const preset = LOOK_PRESETS.find(p => p.id === row.preset);
      if (!preset) throw Error('unknown preset ' + row.preset + '; one of ' + LOOK_PRESETS.map(p => p.id).join(', '));
      const wantedBars = P.SAE_LENGTHS[row.length];
      if (!wantedBars) throw Error('unknown length ' + row.length);
      const editBpm = P.saeTempo(cue).editBpm;
      const snap = v => P.saeSnapSection(v, cue, { bars: wantedBars, editBpm });
      const defaultSection = () => {
        if (!cue) return null;
        if (cue.own) return P.saeLoudestSection(cue, wantedBars, editBpm) ?? P.saeDefaultSection(cue, wantedBars, editBpm);
        return P.saeDefaultSection(cue, wantedBars, editBpm);
      };
      let section;
      if (!cue) section = null;
      else if (row.section === 'early') section = snap(0);
      else if (row.section === 'late') section = snap(1e6);
      else if (typeof row.section === 'number') section = snap(row.section);
      else section = defaultSection();
      // The panel's inputs: every video (only = null), photos when on, durations, the hits in inventory order.
      const rids = inv.resources.map(r => r.rid);
      const photos = row.photos ? inv.photos.map(p => p.rid) : [];
      if (!rids.length && !photos.length) throw Error('no sources');
      const durations = {};
      for (const r of inv.resources) durations[r.rid] = r.duration;
      const candidates = rids.flatMap(rid => found.list.filter(c => c.rid === rid).map(({ sourceDuration, ...c }) => c));
      const badSpans = {}; // sdk.call only (see the header)
      // The panel's Check step measures motion only while the still weight is > 0.
      const motion = {}, weight = stillOf(row);
      if (weight > 0) {
        // An inventory from before source paths (an old --inventory file or plan-only cache) cannot be measured.
        if (inv.resources.length && !inv.resources.some(r => r.path)) throw Error('still > 0 needs source paths: the inventory has none (re-read it; delete an old inventory-<pid>.json cache)');
        for (const r of inv.resources) { const c = motionCurve(r.path); if (c) motion[r.rid] = c; }
      }
      const still = { weight, measured: Object.keys(motion).length, videos: rids.length };
      const plan = j(P.saePlanBuild({ fps: 30, bars: wantedBars, seed, cue, sectionStart: section ?? undefined, candidates, durations, badSpans, photos, usePhotos: row.photos,
        motion, stillWeight: weight }));
      const summary = plan.ok
        ? { ok: true, bars: plan.bars, wanted: wantedBars, holds: plan.holds.length, editBpm: plan.editBpm, sectionStart: plan.sectionStart, faceClips: plan.faceClips, photoBars: plan.photoBars, notes: plan.notes }
        : { ok: false, notes: plan.notes, fit: plan.fit };
      if (!plan.ok) throw Error('plan not ok: ' + JSON.stringify(summary));
      // Bar-level adjacency (the planner's rule; holds within a bar always share their source).
      const barRids = [];
      for (const h of plan.holds) barRids[h.bar] = (h.kind === 'photo' ? 'P:' : '') + h.rid;
      const sources = new Set(barRids).size;
      const adjacentBars = barRids.map((r, k) => (k && r === barRids[k - 1] ? k : -1)).filter(k => k > 0);
      if (adjacentBars.length && sources >= 2 && !plan.notes.includes('adjacent')) throw Error('planner put one source in adjacent bars ' + adjacentBars.join(','));
      const crops = {};
      for (const r of [...inv.resources, ...inv.photos]) if (r.width > 0 && r.height > 0) crops[r.rid] = { width: r.width, height: r.height };
      return { row, seed, inv, found, cue, ownFile, preset, wantedBars, section, plan, planSummary: summary, durations, crops, barRids, adjacentBars, sources, still,
        holds: j(P.saeTrimHolds(plan.holds)), boundaries: plan.cutSecondsRaw, start: plan.sectionStart };
    },

    // panel.tsx: bundled cues import from the INSTALLED plugin folder (skillsDir); own music by its path, never by name.
    ensureAudio(s) {
      if (!s.cue) return null;
      const config = s.ownFile
        ? { projectId: s.row.pid, path: s.ownFile, matchByName: false }
        : { projectId: s.row.pid, path: installedDir + '/assets/cues/' + cues.find(c => c.id === s.row.cue).file };
      return { summary: 'Add music to the project', script: 'scripts/ensure-audio.js', config, allowCommit: true };
    },

    assemble(s, music) {
      s.music = music;
      s.draftName = draftNameOf(s.row, s.seed);
      return { summary: 'Assemble Selfie Aesthetic Edit', script: 'scripts/assemble.js', allowCommit: true, config: {
        projectId: s.row.pid, draftName: s.draftName, holds: s.holds, cutSecondsRaw: s.plan.cutSecondsRaw,
        music: music ? { resourceId: music.resourceId, sourceStart: s.plan.musicSourceStart } : null,
        durations: s.durations, crops: s.crops, clipSound: s.row.clipSound, ambientDb: AMBIENT_DB } };
    },

    // The Draft's real fps is known now: every main clip's end frame as assemble.js lays it,
    // round((cutSecondsRaw[k] + saeMusicOffset(sourceStart, fps)) * fps) for k = 1..holds.
    afterAssemble(s, a) {
      const fps = a.fps;
      const sourceStart = s.music ? s.plan.musicSourceStart : null;
      s.offset = P.saeMusicOffset(sourceStart, fps);
      s.endFrames = s.plan.cutSecondsRaw.slice(1).map(x => Math.round((x + s.offset) * fps));
      const tpl = j(P.saeTemplate(s.plan.bars));
      s.cutBeats = tpl.slice(1).map(h => h.startBeat);
      // The same edit on the plain grid (no onset snap; equal to the cuts unless own music with a fixed tempo snapped).
      const grid = j(P.saeSchedule({ editBpm: s.plan.editBpm, fps, bars: s.plan.bars, sectionStart: s.cue ? s.plan.sectionStart : undefined }));
      s.gridEndFrames = grid.cutSecondsRaw.slice(1).map(x => Math.round((x + P.saeMusicOffset(s.cue ? grid.musicSourceStart : null, fps)) * fps));
    },

    // panel.tsx build(): commit 2's config. Adjust labels in the row's UI language; effect/transition names English.
    decorate(s, a) {
      const { row, preset } = s;
      const lang = row.uiLang;
      return { summary: 'Add whip and look', script: 'scripts/decorate.js', allowCommit: true, config: {
        sequenceId: a.sequenceId, holds: s.holds, whipMode: row.whipMode,
        effect: { tsx: effectTsx, look: row.look ? preset.id : 'none', lookStrength: typeof preset.strength === 'number' ? preset.strength : LOOK_STRENGTH, whip: preset.whip },
        transitionTsx, covers: a.covers || [], clipSound: row.clipSound,
        adjustLabels: { look: t(lang, 'param.look'), lookStrength: t(lang, 'param.lookStrength'), whip: t(lang, 'param.whip') },
        lookOptions: LOOK_OPTIONS.map(o => ({ label: lookLabel(lang, o.value), value: o.value })) } };
    },

    // Readback expectations. Not expressible in the kit readback (recorded instead, see record()): the transitions of
    // transition mode (readback does not read d.transitions()), adjacency per bar (noAdjacent is per clip, and the
    // holds of a bar always share a source), and ambient sound when photo holds exist (photos keep 0 dB).
    expected(s, a) {
      if (!s.endFrames) this.afterAssemble(s, a);
      const photoHolds = s.holds.some(h => h.kind === 'photo');
      const cs = s.row.clipSound;
      const clipSound = cs === 'off' ? { mode: 'off' } : cs === 'full' ? { mode: 'level', db: 0 } : photoHolds ? null : { mode: 'level', db: AMBIENT_DB };
      return {
        frameSize: { width: 1080, height: 1920 }, fps: a.fps,
        cuts: s.endFrames,
        effects: [{ name: EFFECT_NAME, perMainClip: 1 }], // one per clip in both whip modes (look only in transition mode)
        music: s.music ? { resourceId: s.music.resourceId, db: 0, fadeOutSeconds: 0.12 } : { none: true },
        ...(clipSound ? { clipSound } : {}),
      };
    },

    // The middle of the first standard bar's first hold and of the finale's first hold.
    captureFrames(s) {
      const f = s.endFrames || s.plan.holds.map(h => h.endFrame);
      const starts = [0, ...f];
      const fin = s.plan.holds.findIndex(h => h.bar === s.plan.bars - 1);
      return [0, fin].map(i => Math.round((starts[i] + starts[i + 1]) / 2));
    },

    record(s, a) {
      const { row, plan } = s;
      const transition = row.whipMode === 'transition';
      const photoHolds = s.holds.some(h => h.kind === 'photo');
      return {
        rec: {
          inputs: { project: letterOf(row), cue: row.cue, preset: row.preset, look: row.look, length: row.length, clipSound: row.clipSound, photos: row.photos,
            section: row.section, whipMode: row.whipMode, uiLang: row.uiLang, still: stillOf(row) },
          still: s.still, // { weight, measured: clips with a motion curve, videos }
          name: s.draftName, ownFile: s.ownFile ? path.basename(s.ownFile) : null, ownCue: s.ownFile ? { bpm: s.cue.bpm, firstBeat: s.cue.firstBeat, grid: s.cue.grid, durationSeconds: s.cue.durationSeconds } : null,
          sectionStart: plan.sectionStart, musicSourceStart: plan.musicSourceStart, musicOffset: s.offset, editBpm: plan.editBpm, bpm: plan.bpm,
          plan: s.planSummary, bars: plan.bars, wantedBars: s.wantedBars, holds: s.holds.length, snapLog: plan.snapLog,
          barRids: s.barRids, sources: s.sources, adjacentBars: s.adjacentBars,
          // decorate's result (rec.decorate) must show transitions + transitionsKept === expectedTransitions.
          expectedTransitions: transition ? s.holds.length - 1 : 0,
          clipSoundUnchecked: row.clipSound === 'ambient' && photoHolds ? 'photo holds keep 0 dB (assemble skips them)' : null,
          badSpans: 'none (sdk.call only)',
        },
        // Evaluator cut file (eval-whips.py --cuts, eval-beat-sync.cjs --cuts): every inner cut, its edit beat, the plain grid.
        cuts: s.endFrames ? { fps: a.fps, cuts: s.endFrames.slice(0, -1), beats: s.cutBeats, bpm: plan.editBpm, gridCuts: s.gridEndFrames.slice(0, -1),
          cutSecondsRaw: plan.cutSecondsRaw, offset: s.offset, sectionStart: plan.sectionStart, whipMode: row.whipMode, cue: isOwn(row.cue) ? 'own' : row.cue } : null,
      };
    },
  };
}
