// Plugin adapter for mini-vlog: everything style-specific that the kit's build-driver.mjs needs to reproduce the
// panel's Build headlessly. Not shipped (dev/ is not in plugin.json `files`). Run it with
//   node <kit>/tools/drive/build-driver.mjs --plugin plugins/mini-vlog --adapter plugins/mini-vlog/dev/driveAdapter.mjs \
//     --matrix plugins/mini-vlog/dev/matrix.json (--check | --key <k> [--plan-only] | --all)
// then dev/check-per-kind.mjs on the driver's --out folder (readback expectations cannot express per-kind checks:
// "Photo motion" on photo clips only, the clip-sound level on video clips only).
//
// Contract: see the kit's pluginAdapter.mjs header. Mini-vlog specifics:
// - Rows name their Project by alias (`project: "daily"`) and carry `pid: "@daily"` as a placeholder, because the
//   driver's --check requires a pid before the adapter sees the rows. The first adapter call for a row replaces the
//   placeholder with the real id from dev/projects.local.json ({ "daily": "<project id>", ... }, git-ignored).
//   --check and an offline --plan-only never need the real id.
// - Row inputs: cue ('none' = No music), preset, length, pace ('quick' | 'relaxed' | 'groove'), clipSound, soft,
//   usePhotos, punch (Beat punch), hook (Start at the hook), section ('default' | 'early' | 'late' | seconds; 'default'
//   is the hook window with hook on, else the most energetic window, computed at the row's own length and pace), fields
//   ({ key: text } title overrides for the row's preset), seeds, draftName, exportResolution (driver).
//   A row with an `ab` label (e.g. dev/hook-ab.json) belongs to an A/B pair: --check validates its values but skips the
//   pairwise coverage rule, which only a full matrix (dev/matrix.json) can meet.
// - Everything the panel decides comes from the shipped files: constants from panel.tsx, the planner from planner.js
//   (identical to the panel's embedded mv-planner block) plus the panel's plain-JS mv-hook block (motion bonus, punch
//   frames), effect and title labels from scripts/decorate.js.
import vm from 'node:vm';

// A brace or bracket constant from panel.tsx, evaluated as a JS literal (`close` is its closing token, e.g. '};').
// A TypeScript annotation between the name and `=` is skipped.
function panelConst(panel, name, close) {
  const m = new RegExp('const ' + name + '(?::[^=]+)? = ').exec(panel);
  if (!m) throw Error('panel.tsx has no const ' + name);
  const from = m.index + m[0].length;
  return (0, eval)('(' + panel.slice(from, panel.indexOf(close, from) + 1) + ')');
}
// A scalar the panel declares (number, string or boolean), found by a regex whose first group is the literal.
function panelScalar(panel, name, re) {
  const m = re.exec(panel);
  if (!m) throw Error('panel.tsx: could not read ' + name);
  return (0, eval)('(' + m[1] + ')');
}

// planner.js is a plain script (the panel embeds it; tests load it in node:vm). Export every mv* function and MV_*
// constant it declares, so a planner change never needs a driver change. The panel's mv-hook block is loaded into the
// same context (it calls the planner's mvMusicOffset).
function loadPlanner(source) {
  const names = [...source.matchAll(/^(?:function\s+(mv\w+)|const\s+(MV_\w+))/gm)].map(m => m[1] || m[2]);
  const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, isFinite };
  vm.createContext(box);
  vm.runInContext(source + ';globalThis.P={' + names.join(',') + '};', box);
  return box.P;
}
const j = v => JSON.parse(JSON.stringify(v)); // vm objects -> plain objects
// panel.tsx stamp(): local date and time to the second, so reruns never reuse a Draft name.
function stamp(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
// The panel's decorate() code the adapter copies (title parameters, Adjust items, photo motion, decorate cfg). If the
// panel no longer contains any of these, the copy below is stale: createAdapter fails instead of driving old behaviour.
const PANEL_DECORATE = [
  // build(): the Build-time inputs decorate() reads, and the motion bonus before the plan.
  'sectionStart: musicStart, pace, length, requested, clipSound, soft, punch: beatPunch, hook: hook && musicKind === "cue", bpm: gridded ? grid.bpm : null, usePhotos, only, onlyPhotos,',
  'const key = pid + "|" + JSON.stringify(only) + (frozen.punch ? "|motion" : "");',
  'const fresh = await findCandidates(todo, pid, check, mvSearchQueries(MV_QUERIES, frozen.punch));',
  'const plan: any = mvPlanBuild({ candidates: (frozen.punch ? mvMotionBonus(found.list) : found.list).concat(photoCands), bpm: grid.bpm, accepted: grid.accepted, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(nextSeed) });',
  // The render body: Groove capacity and the default section (hook window, else the most energetic one).
  'const grooved = pace === "groove" && (gridded ? !!guard.groove : true);',
  'const opener = guard.groove ? guard.opener : 2;',
  'const grooveFit: any = grooved ? mvGrooveFit({ requested, sectionStart: gridded ? grid.firstBeat : 0, usableEnd: grid.usableEnd, beatSeconds: shotSeconds, opener }) : null;',
  'const fitted = grooved ? grooveFit.shots : mvFitShots({ requested, sectionStart: gridded ? grid.firstBeat : 0, usableEnd: grid.usableEnd, shotSeconds });',
  'const fittedSeconds = grooved ? grooveFit.beats * shotSeconds : fitted * shotSeconds;',
  'const wantedSeconds = grooved ? grooveFit.requestedBeats * shotSeconds : requested * shotSeconds;',
  'const videoSeconds = fitted ? fittedSeconds : wantedSeconds;',
  'const hookSection = () => (hook && gridded && musicKind === "cue" ? mvHookSection({ hookBars: grid.hookBars, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, barPhaseBeats: cue?.barPhaseBeats }) : null);',
  'const hookAt = hookSection();',
  'setSection(hookAt ?? mvDefaultSection({ firstBeat: grid.firstBeat, bpm: grid.bpm, beatEnergy: grid.beatEnergy, usableEnd: grid.usableEnd, videoSeconds }) ?? snap(grid.firstBeat));',
  'hookBars: cue.hookBars || null }',
  // decorate().
  'const parameters = { preset: f.preset, ...flat, fields: { ...flat }, primary: p.colors.primary, secondary: p.colors.secondary, ...TITLE_LOOK, fonts,',
  'provenance: { plugin: PLUGIN_ID, version: PLUGIN_VERSION, preset: f.preset, cue: f.music === "cue" ? f.cueId : f.music, sectionStart: f.sectionStart, pace: f.pace, length: f.length,',
  'seed: f.seed, clipSound: f.clipSound, punch: f.punch, hook: f.hook, groove: res.plan.groove || null, picks: res.plan.picks } };',
  '...p.fields.map((fl: any) => ({ key: fl.key, label: fl.label, type: "text", defaultValue: flat[fl.key] })),',
  '{ key: "primary", label: "Main color", type: "color", defaultValue: p.colors.primary },',
  '{ key: "secondary", label: "Second color", type: "color", defaultValue: p.colors.secondary },',
  '{ key: "shadow", label: "Shadow", type: "number", defaultValue: TITLE_LOOK.shadow, min: 0, max: 1, step: 0.05 },',
  '{ key: "size", label: "Size (%)", type: "number", defaultValue: TITLE_LOOK.size, min: 60, max: 160, step: 5 },',
  '{ key: "x", label: "Horizontal position (%)", type: "number", defaultValue: TITLE_LOOK.x, min: 20, max: 80, step: 1 },',
  '{ key: "y", label: "Vertical position (%)", type: "number", defaultValue: TITLE_LOOK.y, min: 20, max: 80, step: 1 },',
  '{ key: "sparkles", label: f.preset === "mini-vlog" ? "Sparkles" : "Stars", type: "boolean", defaultValue: TITLE_LOOK.sparkles },',
  'const moves: any[] = mvPhotoMotions(res.plan.picks, String(f.seed), sizes);',
  'const cover = sz ? Math.max(MV_W / sz.width, MV_H / sz.height) / Math.min(MV_W / sz.width, MV_H / sz.height) : 1;',
  'byRid[k.rid] = { ...moves[i], cover };',
  'const punch = f.punch ? { tsx: assets.punchTsx, strength: PUNCH_STRENGTH, push: PUNCH_PUSH, beatFrames: f.bpm ? 60 / f.bpm * res.fps : 0,',
  'punchFrames: mvPunchFrames({ bpm: f.bpm, fps: res.fps, sectionStart: f.sectionStart, videoEnd: res.videoEnd }), picks: res.plan.picks } : null;',
  '{ sequenceId: res.sequenceId, mute: f.clipSound === "off", videoEnd: res.videoEnd, title: { tsx: assets.titleTsx, parameters, editableParameters }, soft: f.soft ? { tsx: assets.softTsx, strength: SOFT_STRENGTH } : null, photos: photoRids, motion: { tsx: assets.motionTsx, strength: MOTION_STRENGTH, options: MOTION_OPTIONS, byRid }, photoEffects: true, punch }',
];
const WANT_LABEL = (src, name) => { const m = new RegExp(name + " = '([^']+)'").exec(src); if (!m) throw Error('decorate.js has no ' + name); return m[1]; };

export async function createAdapter({ pluginDir, installedDir, read }) {
  const manifestJson = JSON.parse(read('plugin.json'));
  const panel = read('panel.tsx');
  const hookFrom = panel.indexOf('// mv-hook:start\n'), hookTo = panel.indexOf('// mv-hook:end');
  if (hookFrom < 0 || hookTo < hookFrom) throw Error('panel.tsx has no mv-hook block');
  const P = loadPlanner(read('planner.js') + '\n' + panel.slice(hookFrom, hookTo));
  const decorateJs = read('scripts/decorate.js');
  const stale = PANEL_DECORATE.filter(x => !panel.includes(x));
  if (stale.length) throw Error('panel.tsx decorate() changed; update driveAdapter.mjs decorate(). Missing:\n  ' + stale.join('\n  '));
  const PLUGIN_ID = panelScalar(panel, 'PLUGIN_ID', /const PLUGIN_ID = ("[^"]+");/);
  const PLUGIN_VERSION = panelScalar(panel, 'PLUGIN_VERSION', /const PLUGIN_VERSION = ("[^"]+");/);
  const MV_FAIL = panelConst(panel, 'MV_FAIL', '};');
  // panel.tsx constants (top of the file).
  const MV_QUERIES = panelConst(panel, 'MV_QUERIES', '};');
  const MOTION_OPTIONS = panelConst(panel, 'MOTION_OPTIONS', '];');
  const TITLE_LOOK = panelConst(panel, 'TITLE_LOOK', '};');
  const MV_W = panelScalar(panel, 'MV_W', /const MV_W = (\d+),/);
  const MV_H = panelScalar(panel, 'MV_H', /MV_H = (\d+);/);
  const SEARCH_BATCH = panelScalar(panel, 'SEARCH_BATCH', /const SEARCH_BATCH = (\d+);/);
  const AMBIENT_DB = panelScalar(panel, 'AMBIENT_DB', /const AMBIENT_DB = (-?\d+);/);
  const SOFT_STRENGTH = panelScalar(panel, 'SOFT_STRENGTH', /const SOFT_STRENGTH = ([\d.]+);/);
  const MOTION_STRENGTH = panelScalar(panel, 'MOTION_STRENGTH', /const MOTION_STRENGTH = ([\d.]+);/);
  const PUNCH_STRENGTH = panelScalar(panel, 'PUNCH_STRENGTH', /const PUNCH_STRENGTH = ([\d.]+);/);
  const PUNCH_PUSH = panelScalar(panel, 'PUNCH_PUSH', /const PUNCH_PUSH = ([\d.]+);/);
  const DEFAULT_CUE = panelScalar(panel, 'DEFAULT_CUE', /const DEFAULT_CUE = ("[^"]+");/);
  const PREFERRED_CUE = panelScalar(panel, 'PREFERRED_CUE', /const PREFERRED_CUE = ("[^"]+");/);
  const DEFAULT_PRESET = panelScalar(panel, 'DEFAULT_PRESET', /const DEFAULT_PRESET = ("[^"]+");/);
  const DEFAULT_LENGTH = panelScalar(panel, 'DEFAULT_LENGTH', /const DEFAULT_LENGTH = ("[^"]+");/);
  const DEFAULT_PACE = panelScalar(panel, 'DEFAULT_PACE', /const DEFAULT_PACE = ("[^"]+");/);
  // Panel state defaults (React.useState initial values).
  const DEFAULT_CLIP_SOUND = panelScalar(panel, 'clipSound default', /\[clipSound, setClipSound\] = React\.useState<[^>]+>\(("[^"]+")\)/);
  const DEFAULT_SOFT = panelScalar(panel, 'soft default', /\[soft, setSoft\] = React\.useState\((true|false)\)/);
  const DEFAULT_USE_PHOTOS = panelScalar(panel, 'usePhotos default', /\[usePhotos, setUsePhotos\] = React\.useState\((true|false)\)/);
  const DEFAULT_PUNCH = panelScalar(panel, 'beatPunch default', /\[beatPunch, setBeatPunch\] = React\.useState\((true|false)\)/);
  const DEFAULT_HOOK = panelScalar(panel, 'hook default', /\[hook, setHook\] = React\.useState\((true|false)\)/);
  // Labels decorate.js gives the title and the effects (what readback finds by name).
  const TITLE_NAME = WANT_LABEL(decorateJs, 'TITLE_LABEL'), SOFT_NAME = WANT_LABEL(decorateJs, 'SOFT_LABEL'), MOTION_NAME = WANT_LABEL(decorateJs, 'MOTION_LABEL');
  const PUNCH_NAME = WANT_LABEL(decorateJs, 'PUNCH_LABEL');

  const cues = JSON.parse(read('assets/cues/manifest.json')).cues;
  const presetsJson = JSON.parse(read('assets/fonts/presets.json'));
  const presets = presetsJson.presets;
  // The panel switches its default to the preferred cue once the manifest has it.
  const defaultCue = cues.some(c => c.id === PREFERRED_CUE) ? PREFERRED_CUE : DEFAULT_CUE;
  const ROW_DEFAULTS = { cue: defaultCue, preset: DEFAULT_PRESET, length: DEFAULT_LENGTH, pace: DEFAULT_PACE, clipSound: DEFAULT_CLIP_SOUND,
    soft: DEFAULT_SOFT, usePhotos: DEFAULT_USE_PHOTOS, punch: DEFAULT_PUNCH, hook: DEFAULT_HOOK, section: 'default', fields: {} };

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

  // panel.tsx presetFonts(): one font per family, with the advance metrics the layout measures with.
  const presetFonts = p => {
    const seen = new Set();
    return (p.fonts || []).filter(x => !seen.has(x.family) && !!seen.add(x.family))
      .map(x => ({ role: x.role, family: x.family, style: x.style, weight: x.weight, file: x.file, metrics: presetsJson.metrics?.[x.family] || null }));
  };

  return {
    id: manifestJson.id,
    version: PLUGIN_VERSION,
    label: 'Mini Vlog',
    searchBatch: SEARCH_BATCH,

    // Pairwise coverage (spec 12 / 14.10): every value of every option at least twice, plus a No music + Off row. Rows
    // that all carry an `ab` label (an A/B pair) only have their values checked.
    checkMatrix(rows) {
      const ab = rows.length > 0 && rows.every(r => typeof r.ab === 'string' && r.ab);
      const val = (r, k) => (r[k] ?? ROW_DEFAULTS[k]);
      const count = (k, list = rows) => list.reduce((m, r) => (m[String(val(r, k))] = (m[String(val(r, k))] || 0) + 1, m), {});
      const withMusic = rows.filter(r => val(r, 'cue') !== 'none');
      const seeds = rows.flatMap(r => r.seeds || [1]).reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {});
      const counts = { project: count('project'), cue: count('cue'), preset: count('preset'), length: count('length'), pace: count('pace'),
        clipSound: count('clipSound'), soft: count('soft'), usePhotos: count('usePhotos'), punch: count('punch'), hook: count('hook'), section: count('section', withMusic), seed: seeds };
      const want = {
        project: ['daily', 'ny', 'paris'], cue: [...cues.map(c => c.id), 'none'], preset: presets.map(p => p.id), length: Object.keys(P.MV_LENGTHS),
        pace: ['quick', 'relaxed', 'groove'], clipSound: ['off', 'ambient', 'full'], soft: ['true', 'false'], usePhotos: ['true', 'false'], punch: ['true', 'false'], hook: ['true', 'false'],
        section: ['default', 'early', 'late'], seed: ['1', '2'],
      };
      const missing = [];
      if (!ab) {
        for (const [k, values] of Object.entries(want)) for (const v of values) if (!((counts[k][v] || 0) >= 2)) missing.push(k + '=' + v + ' x' + (counts[k][v] || 0));
        if (!rows.some(r => val(r, 'cue') === 'none' && val(r, 'clipSound') === 'off')) missing.push('a No music + Off row');
      }
      const unknown = [];
      for (const r of rows) {
        if (!r.project || r.pid !== '@' + r.project) unknown.push(r.key + ': pid must be "@" + project');
        if (!want.project.includes(r.project)) unknown.push(r.key + ': project ' + r.project);
        for (const k of ['cue', 'preset', 'length', 'pace', 'clipSound', 'soft', 'usePhotos', 'punch', 'hook'])
          if (!want[k].includes(String(val(r, k)))) unknown.push(r.key + ': ' + k + ' ' + val(r, k));
        const s = val(r, 'section');
        if (typeof s !== 'number' && !want.section.includes(s)) unknown.push(r.key + ': section ' + s);
        const p = presets.find(x => x.id === val(r, 'preset'));
        for (const [fk, fv] of Object.entries(r.fields || {})) {
          const fl = p && p.fields.find(x => x.key === fk);
          if (!fl) unknown.push(r.key + ': field ' + fk);
          else if (String(fv).length > fl.max) unknown.push(r.key + ': field ' + fk + ' longer than ' + fl.max);
        }
      }
      return { ok: missing.length === 0 && unknown.length === 0, ab, counts, missing, unknown };
    },

    inventory(row, { readOnly } = {}) {
      // measureMs 0 in read-only runs: no scratch Drafts to measure photo sizes (assemble.js measures unsized photos).
      return { summary: 'Read footage', script: 'scripts/inventory.js', config: { projectId: resolve(row, { required: true }), only: null, known: {}, ...(readOnly ? { measureMs: 0 } : {}) } };
    },

    videoRids(inv) {
      return { rids: inv.resources.map(r => r.rid), durations: Object.fromEntries(inv.resources.map(r => [r.rid, r.duration])) };
    },

    // panel.tsx findCandidates(): SEARCH_BATCH clips per call, pageSize 4.
    // The motion query runs only with Beat punch (panel mvSearchQueries). The driver caches one search per Project and
    // --out folder, so rows with and without Beat punch need separate --out folders (see dev/hook-ab.json).
    search(row, rids) {
      const punch = row.punch ?? DEFAULT_PUNCH;
      return { summary: 'Search shots', script: 'scripts/search.js', config: { projectId: resolve(row, { required: true }), rids, queries: j(P.mvSearchQueries(MV_QUERIES, punch)), pageSize: 4 } };
    },

    // panel.tsx: title fields, grid, section, fit and blockReason (the render body), then build() up to mvPlanBuild.
    plan({ row: r0, seed, inv, found }) {
      resolve(r0);
      const row = { ...ROW_DEFAULTS, ...r0, fields: r0.fields || {} };
      inv.photos = inv.photos || [];
      const chosen = presets.find(p => p.id === row.preset);
      if (!chosen) throw Error('unknown preset ' + row.preset + '; one of ' + presets.map(p => p.id).join(', '));
      // fieldText(): the user's edit (setField cuts it to the field's max), else the initial text; @year -> latestYear.
      const year = String(inv.latestYear || new Date().getFullYear());
      const fields = Object.fromEntries(chosen.fields.map(fl => {
        const v = row.fields[fl.key] != null ? String(row.fields[fl.key]).slice(0, fl.max) : (fl.initial ?? '');
        return [fl.key, v === '@year' ? year : v];
      }));
      if (!String(fields.big || '').trim()) throw Error("Type the title's big word to build.");

      if (row.cue === 'own') throw Error('own music is not supported by the driver (it needs beat-detect.cjs on a real file)');
      const musicKind = row.cue === 'none' ? 'none' : 'cue';
      const cue = musicKind === 'cue' ? cues.find(c => c.id === row.cue) || null : null;
      if (musicKind === 'cue' && !cue) throw Error('unknown cue ' + row.cue + '; one of none, ' + cues.map(c => c.id).join(', '));
      const grid = musicKind === 'none'
        ? { bpm: null, accepted: false, firstBeat: 0, usableEnd: null, beatEnergy: [], onsets: [], onsetThresholds: undefined, hookBars: null }
        : { bpm: cue.bpm, accepted: true, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy || [], onsets: cue.onsets || [], onsetThresholds: cue.onsetThresholds, hookBars: cue.hookBars || null };
      const gridded = P.mvGridUsable({ bpm: grid.bpm, accepted: grid.accepted });
      const guard = gridded ? j(P.mvBeatsPerShot(row.pace, grid.bpm)) : { beats: null, overridden: false };
      const shotSeconds = P.mvShotSeconds({ bpm: grid.bpm, beatsPerShot: guard.beats, pace: row.pace, gridded });
      const requested = P.MV_LENGTHS[row.length];
      if (!requested) throw Error('unknown length ' + row.length);
      // Groove as the planner decides it (a beat span unless its > 150 bpm guard plays 2 beats per shot).
      const grooved = row.pace === 'groove' && (gridded ? !!guard.groove : true);
      const opener = guard.groove ? guard.opener : 2;
      // Music capacity from the earliest start; the section slider only offers starts where that many fit.
      const grooveFit = grooved ? j(P.mvGrooveFit({ requested, sectionStart: gridded ? grid.firstBeat : 0, usableEnd: grid.usableEnd, beatSeconds: shotSeconds, opener })) : null;
      const fitted = grooved ? grooveFit.shots : P.mvFitShots({ requested, sectionStart: gridded ? grid.firstBeat : 0, usableEnd: grid.usableEnd, shotSeconds });
      const fittedSeconds = grooved ? grooveFit.beats * shotSeconds : fitted * shotSeconds;
      const wantedSeconds = grooved ? grooveFit.requestedBeats * shotSeconds : requested * shotSeconds;
      const videoSeconds = fitted ? fittedSeconds : wantedSeconds;
      const snap = value => (musicKind === 'none' ? 0
        : P.mvSnapSection({ value, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: gridded }));
      // The section state: the track's default (with hook on the best hook window, else the most energetic window),
      // the slider at its left end (early) or right end (late), or a number; the build then uses snap(section), as the
      // panel does.
      let section;
      if (row.section === 'early') section = 0;
      else if (row.section === 'late') section = 1e6;
      else if (typeof row.section === 'number') section = row.section;
      else if (musicKind === 'none') section = 0;
      else if (!gridded) section = snap(0);
      else {
        const hookAt = row.hook && gridded && musicKind === 'cue' ? P.mvHookSection({ hookBars: grid.hookBars, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, barPhaseBeats: cue?.barPhaseBeats }) : null;
        section = hookAt ?? P.mvDefaultSection({ firstBeat: grid.firstBeat, bpm: grid.bpm, beatEnergy: grid.beatEnergy, usableEnd: grid.usableEnd, videoSeconds }) ?? snap(grid.firstBeat);
      }
      const start = musicKind === 'none' ? 0 : snap(section ?? 0);
      const musicStart = musicKind === 'none' ? null : start;
      const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };
      // blockReason, in the panel's order (own-music reasons do not apply).
      if (musicKind !== 'none' && (!fitted || start == null)) throw Error(MV_FAIL['music-too-short'] + '.');
      const photoCands = row.usePhotos ? inv.photos.map(p => ({ rid: p.rid, kind: 'photo' })) : [];
      if (inv.resources.length + photoCands.length < 2) throw Error(MV_FAIL['one-resource'] + '.');
      // build(): plan at 30 fps for allocation; assembly places the same cut seconds at the Draft's real rate. With Beat
      // punch, motion hits become a tie-break bonus on the role candidates first.
      const plan = j(P.mvPlanBuild({ candidates: (row.punch ? j(P.mvMotionBonus(found.list)) : found.list).concat(photoCands), bpm: grid.bpm, accepted: grid.accepted, fps: 30, pace: row.pace, requested,
        sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(seed) }));
      const planSummary = { ok: plan.ok, reason: plan.reason, shots: plan.shots, requested, fitted, beatsPerShot: plan.beatsPerShot, overridden: plan.overridden,
        shotSeconds: plan.shotSeconds, photoShots: plan.photoShots, fillerShots: plan.fillerShots, usableShots: plan.usableShots, sectionStart: musicStart,
        pace: row.pace, punch: !!row.punch, hook: !!row.hook && musicKind === 'cue', groove: plan.groove || null, fittedBeats: grooveFit ? grooveFit.beats : null,
        motionHits: found.list.filter(c => c && c.role === P.MV_MOTION_ROLE).length };
      if (!plan.ok) throw Error((MV_FAIL[plan.reason] || 'No plan fits this footage') + '. plan: ' + JSON.stringify(planSummary));
      // Photo sizes the inventory measured (the panel's photoSizesRef).
      const photoSizes = {};
      for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizes[ph.rid] = { width: ph.width, height: ph.height };
      return { row, seed, inv, found, cue, musicKind, grid, gridded, guard, shotSeconds, requested, fitted, grooved, grooveFit, section, start, musicStart, plan, planSummary,
        photoSizes, fields, chosen, boundaries: plan.schedule.cuts, burst: null };
    },

    ensureAudio(s) {
      if (s.musicKind === 'none') return null;
      resolve(s.row, { required: true });
      // The panel imports the cue from the INSTALLED plugin folder (roots.plugin), not from the repo checkout.
      return { summary: 'Add music to the project', script: 'scripts/ensure-audio.js', config: { projectId: s.row.pid, path: installedDir + '/assets/cues/' + s.cue.file }, allowCommit: true };
    },

    assemble(s, music) {
      const pid = resolve(s.row, { required: true });
      s.music = music;
      const crops = Object.fromEntries([...s.inv.resources, ...s.inv.photos.filter(r => r.width > 0 && r.height > 0)].map(r => [r.rid, { width: r.width, height: r.height }]));
      const cueLabel = s.cue ? (s.cue.label || s.cue.id) : 'No music';
      s.draftName = s.row.draftName || ['Mini Vlog', s.chosen.label, s.row.key, cueLabel, s.row.length, s.row.pace].join(' ') + (s.seed !== 1 ? ' seed ' + s.seed : '') + ' ' + stamp(new Date());
      return { summary: 'Assemble Mini Vlog', script: 'scripts/assemble.js', allowCommit: true, config: {
        projectId: pid, draftName: s.draftName, picks: s.plan.picks, boundaries: s.boundaries, crops,
        music: music ? { resourceId: music.resourceId, sectionStart: s.musicStart ?? 0 } : null, clipSound: s.row.clipSound, ambientDb: AMBIENT_DB } };
    },

    // The frames assemble.js aimed at: the plan's cut seconds at the Draft's real fps with the music offset. A Groove
    // plan re-runs with its per-slot beats (beatsList; its beatsPerShot and shotSeconds are null, the beat unit is
    // plan.groove.beatSeconds), so the slots keep their beat spans.
    afterAssemble(s, a) {
      if (!(a.totalFrames > 0)) throw Error('The Draft "' + s.draftName + '" has no clips.');
      const g = s.plan.groove;
      const base = g
        ? { bpm: s.gridded ? s.grid.bpm : null, fps: a.fps, beatsList: s.plan.schedule.beatsList, shotSeconds: g.beatSeconds, sectionStart: s.musicStart ?? undefined }
        : { bpm: s.gridded ? s.grid.bpm : null, fps: a.fps, shots: s.plan.shots, beatsPerShot: s.plan.beatsPerShot, shotSeconds: s.plan.shotSeconds, sectionStart: s.musicStart ?? undefined };
      s.sched = j(P.mvSchedule({ ...base, cuts: s.boundaries }));
      s.gridSched = j(P.mvSchedule(base)); // the same Draft on the plain grid, for before/after comparisons
    },

    // panel.tsx decorate(): the lockup data, Soft look, photo motion and the Off mute.
    decorate(s, a) {
      const { row, chosen: p, plan } = s;
      const fonts = presetFonts(p).map(({ file, ...face }) => ({ ...face, b64: read('assets/fonts/' + file).replace(/\s+/g, '') }));
      const flat = {};
      for (const fl of p.fields) flat[fl.key] = String(s.fields[fl.key] ?? '');
      const cueProv = s.musicKind === 'cue' ? row.cue : s.musicKind;
      const parameters = { preset: row.preset, ...flat, fields: { ...flat }, primary: p.colors.primary, secondary: p.colors.secondary, ...TITLE_LOOK, fonts,
        provenance: { plugin: PLUGIN_ID, version: PLUGIN_VERSION, preset: row.preset, cue: cueProv, sectionStart: s.musicStart, pace: row.pace, length: row.length,
          seed: s.seed, clipSound: row.clipSound, punch: !!row.punch, hook: !!row.hook && s.musicKind === 'cue', groove: plan.groove || null, picks: plan.picks } };
      const editableParameters = [
        ...p.fields.map(fl => ({ key: fl.key, label: fl.label, type: 'text', defaultValue: flat[fl.key] })),
        { key: 'primary', label: 'Main color', type: 'color', defaultValue: p.colors.primary },
        { key: 'secondary', label: 'Second color', type: 'color', defaultValue: p.colors.secondary },
        { key: 'shadow', label: 'Shadow', type: 'number', defaultValue: TITLE_LOOK.shadow, min: 0, max: 1, step: 0.05 },
        { key: 'size', label: 'Size (%)', type: 'number', defaultValue: TITLE_LOOK.size, min: 60, max: 160, step: 5 },
        { key: 'x', label: 'Horizontal position (%)', type: 'number', defaultValue: TITLE_LOOK.x, min: 20, max: 80, step: 1 },
        { key: 'y', label: 'Vertical position (%)', type: 'number', defaultValue: TITLE_LOOK.y, min: 20, max: 80, step: 1 },
        { key: 'sparkles', label: row.preset === 'mini-vlog' ? 'Sparkles' : 'Stars', type: 'boolean', defaultValue: TITLE_LOOK.sparkles },
      ];
      const photoRids = [...new Set(plan.picks.filter(k => k && k.kind === 'photo').map(k => k.rid))];
      const sizes = { ...s.photoSizes };
      const moves = j(P.mvPhotoMotions(plan.picks, String(s.seed), sizes));
      const byRid = {};
      plan.picks.forEach((k, i) => {
        if (!moves[i]) return;
        const sz = sizes[k.rid];
        const cover = sz ? Math.max(MV_W / sz.width, MV_H / sz.height) / Math.min(MV_W / sz.width, MV_H / sz.height) : 1;
        byRid[k.rid] = { ...moves[i], cover };
      });
      s.photoRids = photoRids;
      // Beat punch: bar downbeats at the Draft's real fps (a.fps), from the frozen tempo (null without a grid).
      const bpm = s.gridded ? s.grid.bpm : null;
      const punch = row.punch ? { tsx: read('assets/beat-punch.tsx'), strength: PUNCH_STRENGTH, push: PUNCH_PUSH, beatFrames: bpm ? 60 / bpm * a.fps : 0,
        punchFrames: j(P.mvPunchFrames({ bpm, fps: a.fps, sectionStart: s.musicStart, videoEnd: a.totalFrames })), picks: plan.picks } : null;
      s.punchFrames = punch ? punch.punchFrames : null;
      return { summary: 'Add title and look', script: 'scripts/decorate.js', allowCommit: true, config: {
        sequenceId: a.sequenceId, mute: row.clipSound === 'off', videoEnd: a.totalFrames,
        title: { tsx: read('assets/title-lockup.tsx'), parameters, editableParameters },
        soft: row.soft ? { tsx: read('assets/soft-look.tsx'), strength: SOFT_STRENGTH } : null,
        photos: photoRids, motion: { tsx: read('assets/photo-motion.tsx'), strength: MOTION_STRENGTH, options: MOTION_OPTIONS, byRid }, photoEffects: true, punch } };
    },

    // Photo motion (one per photo clip, none on video clips) is checked by dev/check-per-kind.mjs from the record:
    // readback `effects` can only require the same count on every main clip. Beat punch likewise: off, no clip has
    // one; on, every video clip has one, which readback checks directly only when the plan has no photo (with photos,
    // check-per-kind.mjs checks it). The cuts are the plan's schedule at the real fps (Groove: its beat spans).
    expected(s, a) {
      const hasPhotos = s.plan.picks.some(k => k && k.kind === 'photo');
      return {
        frameSize: { width: MV_W, height: MV_H }, fps: a.fps,
        cuts: s.sched.slots.map(x => x.endFrame), noAdjacent: true,
        graphics: [{ name: TITLE_NAME, count: 1, startFrame: 0, endFrame: s.sched.totalFrames }],
        // Soft look goes on every Main clip, photos included (photoEffects: true), when on.
        effects: [{ name: SOFT_NAME, perMainClip: s.row.soft ? 1 : 0 }, ...(!s.row.punch ? [{ name: PUNCH_NAME, perMainClip: 0 }] : hasPhotos ? [] : [{ name: PUNCH_NAME, perMainClip: 1 }])],
        music: s.music ? { resourceId: s.music.resourceId, db: 0, fadeOutSeconds: 0.12 } : { none: true },
        // Clip sound: Off is checkable on every Main clip (silent photos may stay unrouted). A level is set on video clips
        // only (assemble.js skips photos), which readback cannot express, so with photos dev/check-per-kind.mjs checks it.
        ...(s.row.clipSound === 'off' ? { clipSound: { mode: 'off' } }
          : s.plan.picks.some(k => k && k.kind === 'photo') ? {} : { clipSound: { mode: 'level', db: s.row.clipSound === 'ambient' ? AMBIENT_DB : 0 } }),
      };
    },

    // One frame mid-video (captureFrames cannot render effects on photo clips; verify those from an export).
    captureFrames(s) { return [Math.floor(s.sched.totalFrames / 2)]; },

    record(s, a) {
      const { row, plan, sched, gridSched } = s;
      return {
        rec: { inputs: { project: row.project, cue: row.cue, preset: row.preset, length: row.length, pace: row.pace, clipSound: row.clipSound, soft: row.soft,
          usePhotos: row.usePhotos, punch: !!row.punch, hook: !!row.hook, section: row.section, fields: s.fields },
          name: s.draftName, plan: s.planSummary, snapLog: plan.schedule.snapLog, sectionStart: s.musicStart, musicOffset: sched.offset,
          scheduleEnd: sched.totalFrames, assembledEnd: a.totalFrames, gridCuts: gridSched.slots.map(x => x.endFrame),
          perKind: { photoRids: s.photoRids || [], motionName: MOTION_NAME, clipSound: row.clipSound, videoDb: row.clipSound === 'ambient' ? AMBIENT_DB : row.clipSound === 'full' ? 0 : null,
            punchName: PUNCH_NAME, punch: !!row.punch },
          punchFrames: s.punchFrames, groove: plan.groove || null,
          picks: plan.picks.map(p => (p.kind === 'photo' ? 'P:' : '') + p.rid + '@' + (p.startSeconds ?? '').toString().slice(0, 6)) },
        // Evaluator cut file (eval-beat-sync.cjs --cuts): every cut except the end; beats only on a grid.
        cuts: { fps: a.fps, cuts: sched.slots.slice(0, -1).map(x => x.endFrame), beats: s.gridded ? sched.slots.slice(0, -1).map(x => x.endBeat) : null,
          gridCuts: gridSched.slots.slice(0, -1).map(x => x.endFrame), cutSeconds: s.boundaries, snapLog: plan.schedule.snapLog, offset: sched.offset,
          sectionStart: s.musicStart, cue: row.cue, gridded: s.gridded },
      };
    },
  };
}
