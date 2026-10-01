// Plugin adapter for archive-vlog: everything style-specific that the kit's build-driver.mjs needs to reproduce the
// panel's Build headlessly. Not shipped (dev/ is not in plugin.json `files`). Run it with
//   node <kit>/tools/drive/build-driver.mjs --plugin plugins/archive-vlog --adapter plugins/archive-vlog/dev/driveAdapter.mjs \
//     --matrix plugins/archive-vlog/dev/matrix.json (--check | --key <k> [--plan-only] | --all)
// then dev/check-per-kind.mjs on the driver's --out folder (readback expectations cannot express per-kind checks:
// Letterbox reveal on the opening only, Fade out on the last clip only, Photo motion on photos, Shot motion on video
// clips but the opening, the clip-sound level on video clips only).
//
// Contract: see the kit's pluginAdapter.mjs header. Archive Vlog specifics:
// - Rows name their Project by alias (`project: "seoul"`) and carry `pid: "@seoul"` as a placeholder, because the
//   driver's --check requires a pid before the adapter sees the rows. The first adapter call for a row replaces the
//   placeholder with the real id from dev/projects.local.json ({ "seoul": "<project id>", "travel": "<project id>" },
//   git-ignored). --check and an offline --plan-only never need the real id.
// - Row inputs: cue ('none' = No music), preset, length, pace ('cinematic' | 'quick'), clipSound ('off' | 'ambient' |
//   'full'), look (Cinematic look on/off), usePhotos, credit (Credit on/off), creditName, section ('default' | 'early' |
//   'late' | seconds; 'default' is the cue's introStart, see planner avIntroSection), fields ({ kicker, title, tagline }
//   overrides for the row's preset; Korean as \uXXXX escapes in the JSON), seeds, draftName, capture, export,
//   exportResolution (driver).
// - Everything the panel decides comes from the shipped files: planner.js (identical to the panel's embedded planner
//   block), presets.json, the cue manifest, the effect and graphic names in scripts/decorate.js, and the panel constants
//   below. The panel is read for its constants; a constant the panel does not declare (or declares with a value that
//   does not fit this app, e.g. a stale Mini Vlog panel) falls back to the literal in PANEL_DEFAULTS with a warning on
//   stderr. Two helpers the panel owns, the motion bonus (avMotionBonus) and the Shot motion choice (avVideoMotions),
//   are taken from the panel's plain-JS `// av-hook:start` ... `// av-hook:end` block (or planner.js) when it has them,
//   else from the local copies below (also with a warning).
import vm from 'node:vm';

// The panel's constants for this app (contract with the panel lane: same names, same values).
const PANEL_DEFAULTS = {
  AV_QUERIES: {
    opening: 'wide city street with traffic and people walking',
    portrait: 'a person sitting outside, relaxed portrait',
    crowd: 'crowd of people walking on a busy street',
    transit: 'tram, train or bus passing by',
    water: 'ferry or boat on the water, harbour',
    architecture: 'historic building facade, landmark architecture',
    ride: 'cyclist or person walking, street level',
    food: 'street food stall or market',
    skyline: 'city skyline or golden hour light',
    ending: 'golden hour street or train station, sunset',
    motion: 'people walking, vehicles passing or the camera moving',
  },
  DEFAULT_CUE: 'peaceful-drift',
  DEFAULT_PRESET: 'cinematic',
  DEFAULT_LENGTH: 'standard',
  DEFAULT_PACE: 'cinematic',
  AMBIENT_DB: -18,
  LOOK_STRENGTH: 0.3,
  MOTION_STRENGTH: 0.5,
  VIDEO_MOTION_STRENGTH: 0.5,
  FADE_SECONDS: 1.0,
  MUSIC_FADE_OUT: 1.0,
  MOTION_OPTIONS: [
    { label: 'Push in', value: 'push-in' }, { label: 'Pull out', value: 'pull-out' },
    { label: 'Drift left', value: 'drift-left' }, { label: 'Drift right', value: 'drift-right' },
    { label: 'Drift up', value: 'drift-up' }, { label: 'Drift down', value: 'drift-down' },
    { label: 'Tilt', value: 'tilt' }, { label: 'Push and drift', value: 'push-drift' },
  ],
  // Eleven queries per clip (ten roles + motion): two clips (22 searches) per call stay inside run_script's 30 s.
  SEARCH_BATCH: 2,
  AV_W: 1920,
  AV_H: 1080,
};
// Panel state defaults (Advanced and Credit toggles).
const STATE_DEFAULTS = { clipSound: 'ambient', look: true, usePhotos: true, credit: true };
// English Adjust labels decorate.js gets (the panel passes its UI language; the names of effects never change).
const ADJUST_LABELS = { motion: 'Motion', motionStrength: 'Motion strength', reveal: 'Reveal', letterbox: 'Letterbox reveal', look: 'Look strength',
  warmth: 'Warmth', fade: 'Fade out', kicker: 'Kicker', title: 'Title', tagline: 'Tagline', titleColor: 'Title colour', textColor: 'Text colour',
  size: 'Size', font: 'Font', speed: 'Decode speed', shadow: 'Shadow', prefix: 'Credit prefix', name: 'Name' };
// Title look defaults (decode-title.tsx: size %, decode speed %, shadow 0-1, display face).
const TITLE_LOOK = { font: 'anton', size: 100, speed: 100, shadow: 0.3 };
const TITLE_FONTS = [{ label: 'Anton', value: 'anton' }, { label: 'Oswald', value: 'oswald' }];
const CREDIT_FAMILY = 'AV Oswald Bold';
const CREDIT_NAME_MAX = 24;
const AV_FAIL_DEFAULT = {
  'too-few': 'Your footage fits too few shots',
  'no-video': 'Add at least one analysed video',
  'one-video': 'Add at least 2 analysed videos (the opening and credit shots are videos)',
  'opening-too-short': 'No video is long enough for the opening shot',
  'ending-too-short': 'No video is long enough for the final shot',
  'music-too-short': 'This track is too short for this length from this section',
};

const warn = msg => console.error('driveAdapter: ' + msg);

// A brace or bracket constant from panel.tsx, evaluated as a JS literal (`close` is its closing token, e.g. '};'), or
// undefined when the panel has none. A TypeScript annotation between the name and `=` is skipped.
function panelConst(panel, name, close) {
  const m = new RegExp('const ' + name + '(?::[^=]+)? = ').exec(panel);
  if (!m) return undefined;
  const from = m.index + m[0].length;
  try { return (0, eval)('(' + panel.slice(from, panel.indexOf(close, from) + 1) + ')'); } catch { return undefined; }
}
// A scalar the panel declares (number, string or boolean), or undefined.
function panelScalar(panel, name) {
  const m = new RegExp('(?:const|,) ' + name + '(?::[^=]+)? = (-?[\\d.]+|"[^"]*"|\'[^\']*\'|true|false)[;,]').exec(panel);
  return m ? (0, eval)('(' + m[1] + ')') : undefined;
}

// planner.js is a plain script (the panel embeds it; tests load it in node:vm). Export every av* function and AV_*
// constant it declares (and those of the panel's av-hook block, loaded into the same context), so a planner change
// never needs a driver change.
function loadPlanner(source) {
  const names = [...new Set([...source.matchAll(/^(?:function\s+(av\w+)|const\s+(AV_\w+))/gm)].map(m => m[1] || m[2]))];
  const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, isFinite };
  vm.createContext(box);
  vm.runInContext(source + ';globalThis.P={' + names.join(',') + '};', box);
  return box.P;
}
const j = v => JSON.parse(JSON.stringify(v)); // vm objects -> plain objects
// Title field limits count Hangul, kana, CJK and fullwidth characters as 2 (as the panel's fieldLen / fieldClip).
const WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
const fieldLen = text => { let n = 0; for (const ch of text) n += WIDE_RE.test(ch) ? 2 : 1; return n; };
function fieldClip(text, max) {
  let out = '', n = 0;
  for (const ch of text) { const w = fieldLen(ch); if (n + w > max) break; out += ch; n += w; }
  return out;
}
// Local date and time to the second, so reruns never reuse a Draft name.
function stamp(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
const WANT_LABEL = (src, name) => { const m = new RegExp(name + " = '([^']+)'").exec(src); if (!m) throw Error('decorate.js has no ' + name); return m[1]; };

// Local copy of the panel's motion bonus (Mini Vlog's av-hook avMotionBonus): motion-query hits are min-max normalised
// over the run, and a role candidate gains 0.1 x the best normalised motion hit on the same clip within 0.75 s; it then
// carries `motion` (> 0), which the planner's motion opener uses. Clips with only motion hits keep a stub row.
function localMotionBonus(list, role) {
  const finite = v => typeof v === 'number' && isFinite(v);
  const hits = {}, rest = [], stubs = {};
  let min = Infinity, max = -Infinity;
  for (const c of list) {
    if (!c || c.role !== role) { rest.push(c); continue; }
    if (!stubs[c.rid]) stubs[c.rid] = { rid: c.rid, role, sourceDuration: c.sourceDuration };
    if (!finite(c.t) || !finite(c.score)) continue;
    (hits[c.rid] = hits[c.rid] || []).push(c);
    min = Math.min(min, c.score); max = Math.max(max, c.score);
  }
  const seen = {};
  for (const c of rest) if (c) seen[c.rid] = true;
  const kept = Object.keys(stubs).filter(rid => !seen[rid]).map(rid => stubs[rid]);
  if (!(max > min)) return rest.concat(kept);
  return rest.map(c => {
    const near = c && hits[c.rid];
    if (!near || !finite(c.t) || !finite(c.score)) return c;
    let motion = 0;
    for (const h of near) if (Math.abs(h.t - c.t) <= 0.75 + 1e-9) motion = Math.max(motion, (h.score - min) / (max - min));
    return motion > 0 ? { ...c, score: c.score + 0.1 * motion, motion } : c;
  }).concat(kept);
}

// Local copy of the Shot motion choice (contract: "alternating push-in / drift so no two adjacent clips share a move;
// seeded like avPhotoMotions"). Returns { "<main clip index>": { motion, direction, axis } } for every video pick but
// the opening (index 0). Families: 'push-in' and 'drift'. A clip never takes the family of the clip before it (a
// photo's family from photoMoves: push-in -> 'push-in', drift-* -> 'drift', others their own name); when both families
// are free, avHash(seed + ':shot:' + k + ':' + family) picks (higher wins, k = video motions so far). Drift directions
// alternate right / left (axis x: the 16:9 video has no crop to drift into vertically).
function localVideoMotions(picks, seed, photoMoves, avHash) {
  const family = m => (m === 'push-in' ? 'push-in' : /^drift-/.test(m) ? 'drift' : m);
  const out = {};
  let prev = null, k = 0, drift = 1;
  picks.forEach((pick, i) => {
    if (!pick || pick.kind === 'photo') { const pm = photoMoves && photoMoves[i]; prev = pm ? family(pm.motion) : null; return; }
    if (i === 0) { prev = null; return; }
    const order = ['push-in', 'drift'].map(f => ({ f, v: avHash(seed + ':shot:' + k + ':' + f) })).sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1)).map(x => x.f);
    const f = order.find(x => x !== prev) || order[0];
    if (f === 'drift') { out[String(i)] = { motion: drift > 0 ? 'drift-right' : 'drift-left', direction: drift, axis: 'x' }; drift = -drift; }
    else out[String(i)] = { motion: 'push-in', direction: 1, axis: 'x' };
    prev = f; k++;
  });
  return out;
}

export async function createAdapter({ pluginDir, installedDir, read }) {
  const manifestJson = JSON.parse(read('plugin.json'));
  const panel = read('panel.tsx');
  const hookFrom = panel.indexOf('// av-hook:start\n'), hookTo = panel.indexOf('// av-hook:end');
  const hookBlock = hookFrom >= 0 && hookTo > hookFrom ? panel.slice(hookFrom, hookTo) : '';
  const P = loadPlanner(read('planner.js') + '\n' + hookBlock);
  const decorateJs = read('scripts/decorate.js');
  const cues = JSON.parse(read('assets/cues/manifest.json')).cues;
  const presetsJson = JSON.parse(read('assets/fonts/presets.json'));
  const presets = presetsJson.presets;

  // Panel constants, validated: a value that does not fit this app falls back to PANEL_DEFAULTS (with a warning).
  const checks = {
    AV_QUERIES: v => !!v && typeof v === 'object' && P.AV_ROLES.every(r => typeof v[r] === 'string' && v[r]),
    DEFAULT_CUE: v => cues.some(c => c.id === v),
    DEFAULT_PRESET: v => presets.some(p => p.id === v),
    DEFAULT_LENGTH: v => !!P.AV_LENGTHS[v],
    DEFAULT_PACE: v => v === 'cinematic' || v === 'quick',
    MOTION_OPTIONS: v => Array.isArray(v) && v.length > 0 && v.every(o => o && typeof o.value === 'string' && P.AV_PHOTO_MOTIONS.includes(o.value)),
  };
  // A panel whose AV_QUERIES do not cover this app's roles is not this app's panel yet (e.g. the forked Mini Vlog one):
  // none of its constants is read then.
  const fresh = checks.AV_QUERIES(panelConst(panel, 'AV_QUERIES', '};'));
  if (!fresh) warn('panel.tsx is not the Archive Vlog panel yet (AV_QUERIES lacks its roles): using the agreed defaults for every constant');
  const C = {}, fallbacks = [];
  for (const [name, fallback] of Object.entries(PANEL_DEFAULTS)) {
    const v = !fresh ? undefined : name === 'AV_QUERIES' ? panelConst(panel, name, '};') : name === 'MOTION_OPTIONS' ? panelConst(panel, name, '];') : panelScalar(panel, name);
    const ok = v !== undefined && (checks[name] ? checks[name](v) : typeof v === typeof fallback);
    if (ok) C[name] = v;
    else { C[name] = fallback; fallbacks.push(name + (v === undefined ? (fresh ? ' (missing)' : ' (panel not updated)') : ' (unfit: ' + JSON.stringify(v).slice(0, 60) + ')')); }
  }
  // The motion query is part of AV_QUERIES (always searched); a panel that keeps it elsewhere gets the agreed one here.
  if (typeof C.AV_QUERIES.motion !== 'string' || !C.AV_QUERIES.motion) {
    C.AV_QUERIES = { ...C.AV_QUERIES, motion: PANEL_DEFAULTS.AV_QUERIES.motion };
    warn('panel.tsx AV_QUERIES has no motion query; adding the agreed one');
  }
  // A scalar whose value differs from the agreed one is used as the panel has it, but reported.
  for (const name of ['AMBIENT_DB', 'LOOK_STRENGTH', 'MOTION_STRENGTH', 'VIDEO_MOTION_STRENGTH', 'FADE_SECONDS', 'MUSIC_FADE_OUT', 'DEFAULT_CUE', 'DEFAULT_PRESET', 'DEFAULT_LENGTH', 'DEFAULT_PACE'])
    if (C[name] !== PANEL_DEFAULTS[name]) warn('panel.tsx ' + name + ' = ' + JSON.stringify(C[name]) + ' (agreed ' + JSON.stringify(PANEL_DEFAULTS[name]) + ')');
  if (fallbacks.length && fresh) warn('panel.tsx constants not usable, using the agreed defaults: ' + fallbacks.join(', '));
  const PLUGIN_ID = panelScalar(panel, 'PLUGIN_ID') || manifestJson.id;
  const PLUGIN_VERSION = panelScalar(panel, 'PLUGIN_VERSION') || manifestJson.version;
  const AV_FAIL = { ...AV_FAIL_DEFAULT, ...((fresh && panelConst(panel, 'AV_FAIL', '};')) || {}) };
  const MOTION_ROLE = typeof P.AV_MOTION_ROLE === 'string' ? P.AV_MOTION_ROLE : 'motion';
  const motionBonus = typeof P.avMotionBonus === 'function' ? list => j(P.avMotionBonus(list)) : (warn('no avMotionBonus in panel.tsx av-hook or planner.js; using the local copy'), list => localMotionBonus(list, MOTION_ROLE));
  const videoMotions = typeof P.avVideoMotions === 'function' ? (picks, seed, moves) => j(P.avVideoMotions(picks, seed, moves))
    : (warn('no avVideoMotions in panel.tsx av-hook or planner.js; using the local copy'), (picks, seed, moves) => localVideoMotions(picks, seed, moves, P.avHash));

  // Names decorate.js gives the graphics and effects (what readback finds).
  const NAMES = { title: WANT_LABEL(decorateJs, 'TITLE_LABEL'), credit: WANT_LABEL(decorateJs, 'CREDIT_LABEL'), letterbox: WANT_LABEL(decorateJs, 'LETTERBOX_LABEL'),
    look: WANT_LABEL(decorateJs, 'LOOK_LABEL'), fade: WANT_LABEL(decorateJs, 'FADE_LABEL'), motion: WANT_LABEL(decorateJs, 'MOTION_LABEL'), shot: WANT_LABEL(decorateJs, 'SHOT_MOTION_LABEL') };
  const ROW_DEFAULTS = { cue: C.DEFAULT_CUE, preset: C.DEFAULT_PRESET, length: C.DEFAULT_LENGTH, pace: C.DEFAULT_PACE, ...STATE_DEFAULTS, section: 'default', fields: {}, creditName: null };

  // Project aliases -> ids (dev/projects.local.json, created at Staging time). Missing is fine offline.
  let projects = null;
  const projectIds = () => {
    if (projects) return projects;
    try { projects = JSON.parse(read('dev/projects.local.json')); } catch { projects = {}; }
    return projects;
  };
  // Replaces a row's "@alias" pid in place (the driver reads row.pid for ensure-audio, readback and export).
  function resolve(row, { required } = {}) {
    if (typeof row.pid === 'string' && row.pid.startsWith('@')) {
      const id = projectIds()[row.pid.slice(1)];
      if (id) row.pid = id;
      else if (required) throw Error('row ' + row.key + ': no project id for ' + row.pid + ' in dev/projects.local.json');
    }
    return row.pid;
  }
  // One font per family with the advance metrics the layouts measure with, and its WOFF2 data.
  const presetFonts = (p, only) => {
    const seen = new Set();
    return (p.fonts || []).filter(x => (!only || x.family === only) && !seen.has(x.family) && !!seen.add(x.family))
      .map(x => ({ role: x.role, family: x.family, style: x.style, weight: x.weight, metrics: presetsJson.metrics?.[x.family] || null, b64: read('assets/fonts/' + x.file).replace(/\s+/g, '') }));
  };

  return {
    id: manifestJson.id,
    version: PLUGIN_VERSION,
    label: 'Archive Vlog',
    searchBatch: C.SEARCH_BATCH,

    // Pairwise coverage (spec 14): every value of every option at least twice, a No music + Off row, a Korean title, a
    // long title (12+ width units) and an empty kicker.
    checkMatrix(rows) {
      const val = (r, k) => (r[k] ?? ROW_DEFAULTS[k]);
      const count = (k, list = rows) => list.reduce((m, r) => (m[String(val(r, k))] = (m[String(val(r, k))] || 0) + 1, m), {});
      const withMusic = rows.filter(r => val(r, 'cue') !== 'none');
      const seeds = rows.flatMap(r => r.seeds || [1]).reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {});
      const keys = ['project', 'cue', 'preset', 'length', 'pace', 'clipSound', 'look', 'usePhotos', 'credit'];
      const counts = { ...Object.fromEntries(keys.map(k => [k, count(k)])), section: count('section', withMusic), seed: seeds };
      const want = {
        project: ['seoul', 'travel'], cue: [...cues.map(c => c.id), 'none'], preset: presets.map(p => p.id), length: Object.keys(P.AV_LENGTHS),
        pace: ['cinematic', 'quick'], clipSound: ['off', 'ambient', 'full'], look: ['true', 'false'], usePhotos: ['true', 'false'], credit: ['true', 'false'],
        section: ['default', 'early', 'late'], seed: ['1', '2'],
      };
      const missing = [];
      for (const [k, values] of Object.entries(want)) for (const v of values) if (!((counts[k][v] || 0) >= 2)) missing.push(k + '=' + v + ' x' + (counts[k][v] || 0));
      const field = (r, k) => String((r.fields || {})[k] ?? '');
      if (!rows.some(r => val(r, 'cue') === 'none' && val(r, 'clipSound') === 'off')) missing.push('a No music + Off row');
      if (!rows.some(r => /[\uac00-\ud7a3]/.test(field(r, 'title')))) missing.push('a Korean title row');
      if (!rows.some(r => fieldLen(field(r, 'title')) >= 12)) missing.push('a long title row');
      if (!rows.some(r => r.fields && r.fields.kicker === '')) missing.push('an empty kicker row');
      const unknown = [];
      for (const r of rows) {
        if (!r.project || r.pid !== '@' + r.project) unknown.push(r.key + ': pid must be "@" + project');
        if (!want.project.includes(r.project)) unknown.push(r.key + ': project ' + r.project);
        for (const k of keys.slice(1)) if (!want[k].includes(String(val(r, k)))) unknown.push(r.key + ': ' + k + ' ' + val(r, k));
        const s = val(r, 'section');
        if (typeof s !== 'number' && !want.section.includes(s)) unknown.push(r.key + ': section ' + s);
        const p = presets.find(x => x.id === val(r, 'preset'));
        for (const [fk, fv] of Object.entries(r.fields || {})) {
          const fl = p && p.fields.find(x => x.key === fk);
          if (!fl) unknown.push(r.key + ': field ' + fk);
          else if (fieldLen(String(fv)) > fl.max) unknown.push(r.key + ': field ' + fk + ' longer than ' + fl.max);
        }
        if (r.creditName != null && (typeof r.creditName !== 'string' || fieldLen(r.creditName) > CREDIT_NAME_MAX)) unknown.push(r.key + ': creditName');
      }
      return { ok: missing.length === 0 && unknown.length === 0, counts, missing, unknown, panelFallbacks: fallbacks };
    },

    inventory(row, { readOnly } = {}) {
      // measureMs 0 in read-only runs: no scratch Drafts to measure photo sizes (assemble.js measures unsized photos).
      return { summary: 'Read footage', script: 'scripts/inventory.js', config: { projectId: resolve(row, { required: true }), only: null, known: {}, ...(readOnly ? { measureMs: 0 } : {}) } };
    },

    videoRids(inv) {
      return { rids: inv.resources.map(r => r.rid), durations: Object.fromEntries(inv.resources.map(r => [r.rid, r.duration])) };
    },

    // The role queries plus the motion query (always on in Archive Vlog: its hits feed the motion bonus and the
    // motion-aware opening shot), pageSize 4.
    search(row, rids) {
      return { summary: 'Search shots', script: 'scripts/search.js', config: { projectId: resolve(row, { required: true }), rids, queries: C.AV_QUERIES, pageSize: 4 } };
    },

    // The panel's Build up to the plan: title fields, tempo, music capacity, section, then avPlanBuild.
    plan({ row: r0, seed, inv, found }) {
      resolve(r0);
      const row = { ...ROW_DEFAULTS, ...r0, fields: r0.fields || {} };
      inv.photos = inv.photos || [];
      const chosen = presets.find(p => p.id === row.preset);
      if (!chosen) throw Error('unknown preset ' + row.preset + '; one of ' + presets.map(p => p.id).join(', '));
      // The user's edit (cut to the field's max), else the preset's initial text.
      const fields = Object.fromEntries(chosen.fields.map(fl => [fl.key, row.fields[fl.key] != null ? fieldClip(String(row.fields[fl.key]), fl.max) : (fl.initial ?? '')]));
      const creditName = row.creditName != null ? fieldClip(String(row.creditName), CREDIT_NAME_MAX) : (chosen.credit?.name ?? 'YOURNAME');

      // Own music is not modelled (it needs beat-detect on a real file): bundled cues and No music only.
      if (row.cue === 'own') throw Error('own music is not supported by the driver');
      const musicKind = row.cue === 'none' ? 'none' : 'cue';
      const cue = musicKind === 'cue' ? cues.find(c => c.id === row.cue) || null : null;
      if (musicKind === 'cue' && !cue) throw Error('unknown cue ' + row.cue + '; one of none, ' + cues.map(c => c.id).join(', '));
      const grid = musicKind === 'none'
        ? { bpm: null, accepted: false, firstBeat: 0, usableEnd: null, beatEnergy: [], onsets: [], onsetThresholds: undefined, introStart: null, downbeatHigh: false }
        : { bpm: cue.bpm, accepted: true, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy || [], onsets: cue.onsets || [],
          onsetThresholds: cue.onsetThresholds, introStart: cue.introStart, downbeatHigh: cue.downbeatConfidence === 'high' };
      const tempoInfo = j(P.avTempo({ bpm: grid.bpm, accepted: grid.accepted, approxBpm: null }));
      const { gridded, tempo } = tempoInfo;
      const pace = row.pace === 'quick' ? 'quick' : 'cinematic';
      if (row.pace !== pace) throw Error('unknown pace ' + row.pace);
      if (!P.AV_LENGTHS[row.length]) throw Error('unknown length ' + row.length);
      const requested = P.avMontageShots(row.length, pace);
      // Music capacity from the earliest start; the section slider only offers starts where that many fit.
      const usableEnd = musicKind === 'none' ? Infinity : grid.usableEnd;
      const fitted = P.avFitShots({ requested, pace, bpm: tempo, sectionStart: musicKind === 'none' ? 0 : grid.firstBeat, usableEnd });
      const videoSeconds = P.avVideoSeconds({ bpm: tempo, pace, montageShots: fitted || P.avMontageLadder({ requested, pace, bpm: tempo })[0] });
      const snap = value => (musicKind === 'none' ? 0
        : P.avSnapSection({ value, firstBeat: grid.firstBeat, bpm: tempo, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: gridded }));
      // The section: the cue's default (introStart, else the most energetic window), the slider's left end (early) or
      // right end (late), or a number; the build uses snap(section), as the panel does.
      let section;
      if (row.section === 'early') section = 0;
      else if (row.section === 'late') section = 1e6;
      else if (typeof row.section === 'number') section = row.section;
      else if (musicKind === 'none') section = 0;
      else section = P.avIntroSection({ introStart: grid.introStart, firstBeat: grid.firstBeat, bpm: tempo, usableEnd: grid.usableEnd, videoSeconds,
        beatEnergy: grid.beatEnergy, downbeatHigh: grid.downbeatHigh }) ?? snap(grid.firstBeat);
      const start = musicKind === 'none' ? 0 : snap(section ?? 0);
      const musicStart = musicKind === 'none' ? null : start;
      if (musicKind !== 'none' && (!fitted || start == null)) throw Error(AV_FAIL['music-too-short'] + '.');
      const photoCands = row.usePhotos ? inv.photos.map(p => ({ rid: p.rid, kind: 'photo' })) : [];
      // The panel's gate: the bookends are video only, so photos never make up for a video.
      if (inv.resources.length < 2) throw Error(AV_FAIL[inv.resources.length ? 'one-video' : 'no-video'] + '.');
      // Plan at 30 fps for allocation; assembly places the same cut seconds at the Draft's real rate. The motion hits
      // become a tie-break bonus (and the opener's `motion` tag) on the role candidates.
      const plan = j(P.avPlanBuild({ candidates: motionBonus(found.list).concat(photoCands), bpm: grid.bpm, accepted: grid.accepted, approxBpm: null, fps: 30, pace, requested,
        sectionStart: musicStart ?? undefined, usableEnd: musicKind === 'none' ? undefined : grid.usableEnd, onsets: grid.onsets, onsetThresholds: grid.onsetThresholds,
        lowConfidence: !gridded, seed: String(seed) }));
      const planSummary = { ok: plan.ok, reason: plan.reason, shots: plan.shots, requested, fitted, montageBeats: plan.montageBeats, finalBeats: plan.finalBeats,
        tempo, gridded, photoShots: plan.photoShots, fillerShots: plan.fillerShots, usableShots: plan.usableShots, attempt: plan.attempt, notes: plan.notes,
        sectionStart: musicStart, pace, motionHits: found.list.filter(c => c && c.role === MOTION_ROLE).length };
      if (!plan.ok) throw Error((AV_FAIL[plan.reason] || 'No plan fits this footage') + '. plan: ' + JSON.stringify(planSummary));
      // Photo sizes the inventory measured (the panel's photo size cache).
      const photoSizes = {};
      for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizes[ph.rid] = { width: ph.width, height: ph.height };
      return { row, seed, inv, found, cue, musicKind, grid, gridded, tempo, pace, requested, fitted, section, start, musicStart, plan, planSummary,
        photoSizes, fields, creditName, chosen, boundaries: plan.schedule.cuts, burst: null };
    },

    ensureAudio(s) {
      if (s.musicKind === 'none') return null;
      resolve(s.row, { required: true });
      // The panel imports the cue from the INSTALLED plugin folder, not from the repo checkout.
      return { summary: 'Add music to the project', script: 'scripts/ensure-audio.js', config: { projectId: s.row.pid, path: installedDir + '/assets/cues/' + s.cue.file }, allowCommit: true };
    },

    assemble(s, music) {
      const pid = resolve(s.row, { required: true });
      s.music = music;
      const crops = Object.fromEntries([...s.inv.resources, ...s.inv.photos.filter(r => r.width > 0 && r.height > 0)].map(r => [r.rid, { width: r.width, height: r.height }]));
      const r = s.row;
      s.draftName = r.draftName || ['Archive Vlog test', r.project, r.cue, r.preset, r.length, s.pace].join(' ') + (s.seed !== 1 ? ' seed ' + s.seed : '') + ' ' + stamp(new Date());
      return { summary: 'Assemble Archive Vlog', script: 'scripts/assemble.js', allowCommit: true, config: {
        projectId: pid, draftName: s.draftName, picks: s.plan.picks, boundaries: s.boundaries, crops, clipSound: r.clipSound, ambientDb: C.AMBIENT_DB,
        music: music ? { resourceId: music.resourceId, sectionStart: s.musicStart ?? 0 } : null, musicFadeOut: C.MUSIC_FADE_OUT } };
    },

    // The frames assemble.js aimed at: the plan's cut seconds at the Draft's real fps with the music offset.
    afterAssemble(s, a) {
      if (!(a.totalFrames > 0)) throw Error('The Draft "' + s.draftName + '" has no clips.');
      const sc = s.plan.schedule;
      const base = { bpm: s.gridded ? s.grid.bpm : null, fps: a.fps, beatsList: sc.beatsList, roles: sc.slots.map(x => x.role), parts: sc.slots.map(x => x.part),
        shotSeconds: s.plan.beatSeconds, sectionStart: s.musicStart ?? undefined };
      s.sched = j(P.avSchedule({ ...base, cuts: s.boundaries }));
      s.gridSched = j(P.avSchedule(base)); // the same Draft on the plain grid, for before/after comparisons
    },

    // The panel's decorate step: title and credit graphics, letterbox, motions, look, fade and the Off mute.
    decorate(s, a) {
      const { row, chosen: p, plan, sched } = s;
      const open = sched.slots[0];
      // Title timing scaled to the opening shot's length at the Draft's real rate (planner avOpeningTiming).
      const timing = j(P.avOpeningTiming((open.endFrame - open.startFrame) / a.fps));
      const L = ADJUST_LABELS;
      const titleFields = { kicker: String(s.fields.kicker ?? ''), title: String(s.fields.title ?? ''), tagline: String(s.fields.tagline ?? '') };
      const cueProv = s.musicKind === 'cue' ? row.cue : s.musicKind;
      const parameters = { preset: row.preset, ...titleFields, fields: { ...titleFields }, titleColor: p.colors.title, textColor: p.colors.text,
        taglineTracking: p.taglineTracking, ...TITLE_LOOK, timing, fonts: presetFonts(p),
        provenance: { plugin: PLUGIN_ID, version: PLUGIN_VERSION, preset: row.preset, cue: cueProv, sectionStart: s.musicStart, pace: s.pace, length: row.length,
          seed: s.seed, clipSound: row.clipSound, look: !!row.look, credit: !!row.credit, picks: plan.picks } };
      const editableParameters = [
        { key: 'kicker', label: L.kicker, type: 'text', defaultValue: titleFields.kicker },
        { key: 'title', label: L.title, type: 'text', defaultValue: titleFields.title },
        { key: 'tagline', label: L.tagline, type: 'text', defaultValue: titleFields.tagline },
        { key: 'titleColor', label: L.titleColor, type: 'color', defaultValue: p.colors.title },
        { key: 'textColor', label: L.textColor, type: 'color', defaultValue: p.colors.text },
        { key: 'size', label: L.size, type: 'number', defaultValue: TITLE_LOOK.size, min: 60, max: 160, step: 5 },
        { key: 'font', label: L.font, type: 'select', defaultValue: TITLE_LOOK.font, options: TITLE_FONTS },
        { key: 'speed', label: L.speed, type: 'number', defaultValue: TITLE_LOOK.speed, min: 25, max: 400, step: 5 },
        { key: 'shadow', label: L.shadow, type: 'number', defaultValue: TITLE_LOOK.shadow, min: 0, max: 1, step: 0.05 },
      ];
      const prefix = p.credit?.prefix ?? 'ARCHIVED BY';
      const credit = row.credit ? { tsx: read('assets/archived-credit.tsx'),
        parameters: { prefix, name: s.creditName, color: p.colors.text, size: 100, shadow: TITLE_LOOK.shadow, fonts: presetFonts(p, CREDIT_FAMILY) },
        editableParameters: [{ key: 'prefix', label: L.prefix, type: 'text', defaultValue: prefix }, { key: 'name', label: L.name, type: 'text', defaultValue: s.creditName }] } : null;
      // Photo motions (planner avPhotoMotions) with each photo's cover-crop scale; Shot motions on the video clips.
      const photoRids = [...new Set(plan.picks.filter(k => k && k.kind === 'photo').map(k => k.rid))];
      const sizes = { ...s.photoSizes };
      const moves = j(P.avPhotoMotions(plan.picks, String(s.seed), sizes));
      const byRid = {};
      plan.picks.forEach((k, i) => {
        if (!moves[i]) return;
        const sz = sizes[k.rid];
        const cover = sz ? Math.max(C.AV_W / sz.width, C.AV_H / sz.height) / Math.min(C.AV_W / sz.width, C.AV_H / sz.height) : 1;
        byRid[k.rid] = { ...moves[i], cover };
      });
      const byIndex = videoMotions(plan.picks, String(s.seed), moves);
      s.photoRids = photoRids;
      s.byIndex = byIndex;
      // Look strength and warmth per preset (presets.json `look`), LOOK_STRENGTH and warmth 1 by default.
      const look = row.look ? { tsx: read('assets/cinematic-look.tsx'), strength: p.look?.strength ?? C.LOOK_STRENGTH, warmth: p.look?.warmth ?? 1 } : null;
      return { summary: 'Add title and look', script: 'scripts/decorate.js', allowCommit: true, config: {
        sequenceId: a.sequenceId, videoEnd: a.totalFrames, mute: row.clipSound === 'off', photos: photoRids, photoEffects: true,
        title: { tsx: read('assets/decode-title.tsx'), parameters, editableParameters },
        credit,
        letterbox: { tsx: read('assets/letterbox-reveal.tsx'), parameters: { revealStart: timing.revealStart, revealEnd: timing.revealEnd, revealSeconds: timing.revealEnd - timing.revealStart, enabled: true } },
        look,
        fade: { tsx: read('assets/fade-out.tsx'), fadeSeconds: C.FADE_SECONDS },
        motion: { tsx: read('assets/photo-motion.tsx'), strength: C.MOTION_STRENGTH, options: C.MOTION_OPTIONS, byRid, video: { strength: C.VIDEO_MOTION_STRENGTH, byIndex } },
        adjustLabels: { motion: L.motion, motionStrength: L.motionStrength, reveal: L.reveal, letterbox: L.letterbox, look: L.look, warmth: L.warmth, fade: L.fade } } };
    },

    // Readback can only require the same count on every Main clip: the Cinematic look (photos too, photoEffects true).
    // Letterbox reveal, Fade out, Photo motion and Shot motion are per kind or per position: dev/check-per-kind.mjs.
    expected(s, a) {
      const sl = s.sched.slots;
      return {
        frameSize: { width: C.AV_W, height: C.AV_H }, fps: a.fps,
        cuts: sl.map(x => x.endFrame), noAdjacent: true,
        graphics: [{ name: NAMES.title, count: 1, startFrame: sl[0].startFrame, endFrame: sl[0].endFrame },
          s.row.credit ? { name: NAMES.credit, count: 1, startFrame: sl[1].startFrame, endFrame: sl[1].endFrame } : { name: NAMES.credit, count: 0 }],
        effects: [{ name: NAMES.look, perMainClip: s.row.look ? 1 : 0 }],
        music: s.music ? { resourceId: s.music.resourceId, db: 0, fadeOutSeconds: C.MUSIC_FADE_OUT } : { none: true },
        // Clip sound: Off is checkable on every Main clip (silent photos may stay unrouted). A level is set on video clips
        // only (assemble.js skips photos), which readback cannot express, so with photos dev/check-per-kind.mjs checks it.
        ...(s.row.clipSound === 'off' ? { clipSound: { mode: 'off' } }
          : s.plan.picks.some(k => k && k.kind === 'photo') ? {} : { clipSound: { mode: 'level', db: s.row.clipSound === 'ambient' ? C.AMBIENT_DB : 0 } }),
      };
    },

    // The opening's title once decoded and the credit (captureFrames cannot render effects on photo clips; the intro
    // slots are video only).
    captureFrames(s) {
      const sl = s.sched.slots;
      return [Math.max(0, sl[0].endFrame - 3), Math.floor((sl[1].startFrame + sl[1].endFrame) / 2), Math.floor(s.sched.totalFrames / 2)];
    },

    record(s, a) {
      const { row, plan, sched, gridSched } = s;
      return {
        rec: { inputs: { project: row.project, cue: row.cue, preset: row.preset, length: row.length, pace: s.pace, clipSound: row.clipSound, look: !!row.look,
          usePhotos: !!row.usePhotos, credit: !!row.credit, creditName: s.creditName, section: row.section, fields: s.fields },
          name: s.draftName, plan: s.planSummary, snapLog: plan.schedule.snapLog, sectionStart: s.musicStart, musicOffset: sched.offset,
          scheduleEnd: sched.totalFrames, assembledEnd: a.totalFrames, gridCuts: gridSched.slots.map(x => x.endFrame),
          perKind: { photoRids: s.photoRids || [], names: NAMES, look: !!row.look, shotMotionSlots: Object.keys(s.byIndex || {}).map(Number),
            clipSound: row.clipSound, videoDb: row.clipSound === 'ambient' ? C.AMBIENT_DB : row.clipSound === 'full' ? 0 : null },
          picks: plan.picks.map(p => (p.kind === 'photo' ? 'P:' : '') + p.rid + '@' + (p.startSeconds ?? '').toString().slice(0, 6)) },
        // Evaluator cut file (eval-beat-sync.cjs --cuts): every cut except the end; beats only on a grid.
        cuts: { fps: a.fps, cuts: sched.slots.slice(0, -1).map(x => x.endFrame), beats: s.gridded ? sched.slots.slice(0, -1).map(x => x.endBeat) : null,
          gridCuts: gridSched.slots.slice(0, -1).map(x => x.endFrame), cutSeconds: s.boundaries, snapLog: plan.schedule.snapLog, offset: sched.offset,
          sectionStart: s.musicStart, cue: row.cue, gridded: s.gridded },
      };
    },
  };
}
