// Torn Paper Love adapter for the kit's headless build driver (selects-app-kit tools/drive/build-driver.mjs): the
// panel's Build (inventory -> search -> plan -> ensure-audio -> assemble -> decorate) without the panel. Every
// decision comes from planner.js + build-config.js, loaded in node:vm exactly as the panel embeds them; this file only
// maps matrix rows to options and results to the next step.
//
// Run (from the repo root; K = the kit checkout, e.g. ~/Workspaces/selects-app-kit; the plugin folder needs its
// plugin.json, and the plugin must be installed in Selects so ensure-audio can import the cues from there):
//   K=~/Workspaces/selects-app-kit; P=plugins/torn-paper-love
//   node $K/tools/drive/build-driver.mjs --plugin $P --adapter $P/dev/driveAdapter.mjs --matrix $P/dev/matrix.json --check
//   node $K/tools/drive/build-driver.mjs --plugin $P --adapter $P/dev/driveAdapter.mjs --matrix $P/dev/matrix.json \
//     --key daily-default --plan-only                      # read-only (inventory without size checks, search, plan)
//   node $K/tools/drive/build-driver.mjs --plugin $P --adapter $P/dev/driveAdapter.mjs --matrix $P/dev/matrix.json \
//     --installed-dir ~/.selects/skills/torn-paper-love --all --out $TMPDIR/tpl-matrix   # builds real Drafts (Staging)
// Add --export for SD exports (beat evaluation: kit tools/eval/eval-beat-sync.cjs with the cuts-<key>-s<seed>.json
// this adapter records) and --no-volumes to skip the clip-level probe.
//
// Matrix rows: key, pid, seeds, city, plus cue ('none' | manifest id), backdrop, length, pace, clipSound, look
// (boolean or 0-1), tilt, useVideos, section ('default' | 'early' | 'late' | seconds), words ([w1, w2]), only,
// draftName (overrides the panel's name).
import fs from 'node:fs';
import vm from 'node:vm';

const DEFAULT_CUE = JSON.parse(fs.readFileSync(new URL('../assets/cues/manifest.json', import.meta.url), 'utf8')).defaultCue;

export const ROW_DEFAULTS = { cue: DEFAULT_CUE, backdrop: 'night', length: 'standard', pace: 'quick', clipSound: 'ambient', look: true, tilt: false,
  useVideos: true, section: 'default', words: ['MY', 'LOVE'] };

// planner.js then build-config.js in one context (build-config uses the planner's globals); every tpl* function and
// TPL_* constant is exported, so a change in either never needs a driver change.
function loadConfig(planner, config) {
  const source = planner + '\n' + config;
  const names = [...source.matchAll(/^(?:function\s+(tpl\w+)|const\s+(TPL_\w+))/gm)].map(m => m[1] || m[2]);
  const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date, isFinite, isNaN };
  vm.createContext(box);
  vm.runInContext(source + ';globalThis.P={' + names.join(',') + '};', box);
  return box.P;
}
const j = v => JSON.parse(JSON.stringify(v)); // vm objects -> plain objects

// Matrix section values -> the panel's: early = the first bar (0 snaps to it), late = the last bar that fits.
const sectionOf = v => (v === 'early' ? 0 : v === 'late' ? 1e6 : typeof v === 'number' ? v : 'default');
const lookOf = v => (v === true ? 0.35 : typeof v === 'number' ? v : 0);

export async function createAdapter({ pluginDir, installedDir, read }) {
  let manifest = { id: 'torn-paper-love', version: null };
  try { manifest = JSON.parse(read('plugin.json')); } catch (e) { /* before packaging: the driver itself needs plugin.json */ }
  const P = loadConfig(read('planner.js'), read('build-config.js'));
  const cues = JSON.parse(read('assets/cues/manifest.json')).cues;
  const looks = JSON.parse(read('assets/fonts/looks.json'));
  const fonts = {};
  for (const face of Object.keys(looks.faces)) fonts[looks.faces[face]] = 'data:font/woff2;base64,' + read('assets/fonts/tpl-' + face + '.woff2.b64').replace(/\s+/g, '');
  const assets = { tornTsx: read('assets/torn-photo.tsx'), lettersTsx: read('assets/ransom-letters.tsx'), looks, fonts };
  // search.js returns { best: { rid: seconds | null }, failed, stats }; the driver collects { candidates: [{ rid }] }.
  // The script runs unchanged inside a function; only the result is reshaped.
  const searchSource = 'const __tplSearch = async () => {\n' + read('scripts/search.js') + '\n};\nconst __r = await __tplSearch();\n'
    + 'return { ...__r, candidates: Object.keys(__r.best).filter(k => __r.best[k] !== null).map(k => ({ rid: k, t: __r.best[k], role: "couple" })) };';

  return {
    id: manifest.id,
    version: manifest.version,
    label: 'TPL',
    searchBatch: 4, // four videos per call keeps a search call inside run_script's 30 s deadline

    // Every option value appears at least twice; cues must exist.
    checkMatrix(rows) {
      const domains = { cue: [...cues.map(c => c.id), 'none'], backdrop: ['night', 'red', 'kraft', 'photo'], length: ['short', 'standard', 'long'], pace: ['quick', 'relaxed'],
        clipSound: ['off', 'ambient', 'full'], look: [true, false], tilt: [true, false], useVideos: [true, false], section: ['default', 'early', 'late'] };
      const counts = {}, missing = [];
      for (const k of Object.keys(domains)) {
        counts[k] = {};
        for (const r of rows) { const v = String(r[k] ?? ROW_DEFAULTS[k]); counts[k][v] = (counts[k][v] || 0) + 1; }
        for (const v of domains[k]) if ((counts[k][String(v)] || 0) < 2) missing.push(k + '=' + v + ' x' + (counts[k][String(v)] || 0));
      }
      counts.seed = {};
      for (const r of rows) for (const sd of r.seeds || [1]) counts.seed[sd] = (counts.seed[sd] || 0) + 1;
      for (const sd of [1, 2]) if ((counts.seed[sd] || 0) < 2) missing.push('seed=' + sd);
      const words = rows.map(r => r.words || ROW_DEFAULTS.words);
      counts.words = { longName: words.filter(w => w.some(x => [...String(x)].length >= 8)).length, emptyWord2: words.filter(w => !String(w[1] || '').trim()).length };
      if (counts.words.longName < 2) missing.push('a long name x2');
      if (counts.words.emptyWord2 < 2) missing.push('an empty word 2 x2');
      const unknown = rows.filter(r => r.cue && r.cue !== 'none' && !cues.some(q => q.id === r.cue)).map(r => r.key + ':' + r.cue)
        .concat(rows.filter(r => r.backdrop && !domains.backdrop.includes(r.backdrop)).map(r => r.key + ':' + r.backdrop));
      return { ok: !unknown.length && !missing.length, counts, missing, unknown };
    },

    inventory(row, { readOnly } = {}) {
      // readOnly: no scratch Drafts, so unmeasured photos stay unsized (and ineligible) unless a cached inventory
      // from a full run exists. A full run gives the size checks more of the call than the panel's 8 s (one call here).
      return { summary: 'Read your pictures', script: 'scripts/inventory.js', config: { projectId: row.pid, only: row.only || null, known: {}, measureMs: readOnly ? 0 : 20000 } };
    },

    // All analysed videos (the search is cached per project, so rows with enough photos reuse it).
    videoRids(inv) {
      return { rids: inv.resources.map(r => r.rid), durations: Object.fromEntries(inv.resources.map(r => [r.rid, r.duration])) };
    },

    search(row, rids) {
      return { summary: 'Find moments', script: { source: searchSource }, config: { projectId: row.pid, rids, pageSize: 4, parallel: 4 } };
    },

    plan({ row: r0, seed, inv, found }) {
      const row = { ...ROW_DEFAULTS, ...r0 };
      const cue = row.cue === 'none' ? null : cues.find(c => c.id === row.cue);
      if (cue === undefined) throw Error('unknown cue ' + row.cue + '; one of none, ' + cues.map(c => c.id).join(', '));
      const best = {};
      for (const c of (found && found.list) || []) if (!(c.rid in best) && typeof c.t === 'number') best[c.rid] = c.t;
      const options = { words: row.words, backdrop: row.backdrop, length: row.length, pace: row.pace, clipSound: row.clipSound, look: lookOf(row.look), tilt: !!row.tilt,
        useVideos: row.useVideos !== false, only: row.only || null, seed, section: sectionOf(row.section) };
      const s = j(P.tplPlanState({ projectId: row.pid, inv: { photos: inv.photos || [], resources: inv.resources || [] }, found: { best }, cue, options, now: Date.now() }));
      if (!s.ok) throw Error('not buildable: ' + s.reason);
      if (row.draftName) s.draftName = row.draftName;
      else s.draftName += ' ' + row.key + ' s' + seed; // traceable among the matrix's Drafts
      s.row = row;
      s.planSummary = { N: s.N, requested: s.requested, fitReason: s.fitReason, photos: s.photoCount, videos: s.videoCount, seconds: Math.round(s.seconds * 1000) / 1000,
        gridded: s.gridded, sectionStart: s.sectionStart, excluded: s.excluded };
      // Fields the driver prints in --plan-only.
      s.plan = { picks: s.picks };
      s.boundaries = s.schedule.frames;
      s.start = s.musicStart;
      s.fitted = s.N;
      return s;
    },

    ensureAudio(s) {
      if (!s.cue) return null;
      // The panel imports the cue from the INSTALLED plugin folder, not from the repo checkout.
      return { summary: 'Add music to the project', script: 'scripts/ensure-audio.js', config: { projectId: s.projectId, path: installedDir + '/assets/cues/' + s.cue.file }, allowCommit: true };
    },

    assemble(s, music) {
      s.music = music || null;
      return { summary: 'Placing pictures', script: 'scripts/assemble.js', allowCommit: true, config: j(P.tplAssembleConfig(s, s.music)) };
    },

    afterAssemble(s, a) {
      s.timing = j(P.tplTimingAt(s, a.fps, a.frames));
    },

    decorate(s, a) {
      return { summary: 'Adding letters and paper', script: 'scripts/decorate.js', allowCommit: true, config: j(P.tplDecorateConfig(s, a, assets)) };
    },

    expected(s, a) {
      return j(P.tplExpected(s, a, s.music));
    },

    // The letters over the first paper flash, a pass-1 shot, the tear and the last shot.
    captureFrames(s) {
      const f = s.timing ? s.timing.frames : s.schedule.frames;
      const mid = i => Math.floor((f[i] + f[i + 1]) / 2);
      const tear = s.transitions.findIndex(t => t.entry === 'tear');
      return [f[1] + 1, mid(3), f[tear] + 1, mid(s.slots.length - 1)];
    },

    record(s, a) {
      const planned = j(P.tplPlannedFrames(s, a.fps));
      const unit = s.cue ? j(P.tplUnit(s.cue.bpm)) : null;
      const units = s.schedule.units;
      return {
        rec: { inputs: { cue: s.row.cue, backdrop: s.row.backdrop, length: s.row.length, pace: s.row.pace, clipSound: s.row.clipSound, look: s.options.look, tilt: s.options.tilt,
          useVideos: s.options.useVideos, section: s.row.section, words: s.options.words },
          name: s.draftName, plan: s.planSummary, sectionStart: s.sectionStart, musicOffset: s.timing && s.timing.offset, framesMatch: s.timing && s.timing.framesMatch,
          plannedFrames: planned, snapLog: s.schedule.snapLog, order: s.order,
          tearSeeds: s.slots.map(x => P.tplSeedFor(x.identity, s.options.seed)),
          picks: s.picks.map(p => (p.kind === 'photo' ? 'P:' : 'V:') + p.rid + (p.kind === 'video' ? '@' + p.startSeconds.toFixed(3) : '')) },
        // Evaluator cut file (eval-beat-sync.cjs --cuts): every cut except the end, each cut's beat position from the
        // section start when the music grid is used.
        cuts: { fps: a.fps, cuts: planned.slice(1, -1), beats: s.gridded && unit ? units.slice(1, -1).map(u => u * unit.unitBeats) : undefined, bpm: s.cue ? s.cue.bpm : undefined,
          cutSeconds: s.targets, snapLog: s.schedule.snapLog, offset: s.timing && s.timing.offset, sectionStart: s.musicStart, cue: s.row.cue, gridded: s.gridded },
      };
    },
  };
}
