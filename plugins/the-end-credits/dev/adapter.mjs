// Build-driver adapter for THE END Credits: everything style-specific that selects-app-kit's
// tools/drive/build-driver.mjs needs to reproduce the panel's Build headlessly. See dev/README.md.
//
// The contract (what build-driver.mjs calls, in order) is the one at the top of the kit's pluginAdapter.mjs:
//   createAdapter({ pluginDir, installedDir, read }), checkMatrix(rows), inventory(row, { readOnly }), videoRids(inv),
//   search(row, rids) + searchBatch, plan({ row, seed, inv, found }), ensureAudio(s), assemble(s, music),
//   afterAssemble(s, a), decorate(s, a), expected(s, a), record(s, a), captureFrames(s).
//
// It mirrors spec v1.1 and the scripts/*.js config contracts. Panel constants come from planner.js (TEC_* in node:vm),
// never from panel.tsx. The kit's readback assumes Main starts at frame 0; the Classic lead-in is a gap, so run the
// driver with `--import dev/readback-hook.mjs`, which swaps in dev/readback-tec.mjs (gap-aware contiguity, effect
// order, photo-aware clip levels, cover transforms). expected() carries the extra keys that wrapper reads.
//
// Row inputs (defaults in ROW_DEFAULTS):
//   layout classic|full, cue <manifest id>|none|own:<path> ($VAR / ${VAR} / ~ expanded), length short|standard|long,
//   preset filmCrew|personal|travel|empty, rows [{ role, name }] (overrides the preset), title, clipSound
//   ambient|off|full, look true|false, photos true|false, section default|early|late|<seconds>, projectName (the
//   Personal/Travel place guess; inventory.js does not return the Project name), project (which Staging Project type
//   the row needs; documentation for --check only), fitLength true|false (default false: a Length the track is too
//   short for fails the row with the panel's message; true builds the longest Length that fits instead).
//
// In-shot motion, like the panel: every inventoried clip is measured once with the local ffmpeg (planner.js
// TEC_MOTION_FILTER, run in a temp folder that receives the file), from the source `path` inventory.js returns (the
// driver runs on the machine that holds the Project's files). Offline fixtures carry no path: set TEC_FOOTAGE_DIR to
// the footage folder to resolve them by file name. A clip that cannot be measured (no path, no ffmpeg, a failure)
// scores as before, silently, as in the panel.
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

// planner.js is a plain script (the panel embeds it; the tests load it in node:vm). Export every tec* function and
// TEC_* constant it declares, so a planner change never needs a driver change.
function loadPlanner(source) {
  const names = [...source.matchAll(/^(?:function\s+(tec\w+)|const\s+(TEC_\w+))/gm)].map(m => m[1] || m[2]);
  const box = {};
  vm.createContext(box);
  vm.runInContext(source + ';globalThis.P={' + names.join(',') + '};', box);
  return box.P;
}
const j = v => JSON.parse(JSON.stringify(v)); // vm objects -> plain objects

// Spec constants that live in the panel/scripts rather than the planner.
const W = 1920, H = 1080, A = W / H;
const AMBIENT_DB = -18;            // spec §10 / GATE-A 4
const MUSIC_FADE_OUT = 1.5;        // spec R3
const LOOK_STRENGTH = 0.5;         // spec §8, raised to 0.5 with the cool teal grade (similarity wave)
// The panel's build record (panel.tsx WINDOWS / FADES): the shot window in % of the canvas and the Shot frame fades.
const WINDOWS = { classic: { x: 50.73, y: 12.69, w: 42.6 }, full: { x: 0, y: 0, w: 100 } };
const FADES = { inSec: 0.5, outSec: 1.13 };
const TITLE_COLOR = '#FBE4BB', CREDIT_COLOR = '#F0EBDD';
const GRAPHIC_LABEL = 'THE END credits', LOOK_LABEL = 'Cinematic look', FRAME_LABEL = 'Shot frame';
const FONTS = [
  { file: 'tec-title-serif.woff2.b64', family: 'TEC Title Serif', style: 'normal', weight: 800 },
  { file: 'tec-credits-sans.woff2.b64', family: 'TEC Credits Sans', style: 'normal', weight: 600 },
];
// The panel measures credit lines with a canvas; headless we assume an average advance of 0.55 em.
const MEASURE_EM = 0.55;
const measure = (text, px) => Array.from(String(text)).length * px * MEASURE_EM;
// Matrix coverage rules (spec §14 + the Lane D brief).
const LONG_TITLE_GLYPHS = 30;
const SECTIONS = ['default', 'early', 'late'];
const CLIP_SOUNDS = ['ambient', 'off', 'full'];
const LAYOUTS = ['classic', 'full'];
const PRESETS = ['filmCrew', 'personal', 'travel', 'empty'];

const expandPath = p => String(p).replace(/\$\{(\w+)\}|\$(\w+)/g, (_, a, b) => process.env[a || b] ?? '').replace(/^~(?=\/|$)/, os.homedir());
const ffmpeg = () => (process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg');

export async function createAdapter({ pluginDir, installedDir, read }) {
  const pluginJson = JSON.parse(read('plugin.json'));
  const P = loadPlanner(read('planner.js'));
  const cues = JSON.parse(read('assets/cues/manifest.json')).cues;
  const defaultCue = (cues.find(c => c.default) || cues[0]).id;
  const ROW_DEFAULTS = { layout: 'classic', cue: defaultCue, length: P.TEC_DEFAULT_LENGTH, preset: P.TEC_DEFAULT_PRESET, title: 'THE END',
    clipSound: 'ambient', look: true, photos: true, section: 'default', projectName: '', fitLength: false };
  const withDefaults = r0 => ({ ...ROW_DEFAULTS, ...r0 });
  const cueKind = cue => (cue === 'none' ? 'none' : String(cue).startsWith('own:') ? 'own' : 'bundled');
  const ownCache = new Map();
  const motionCache = new Map();

  // The panel's measureMotion: one ffmpeg run per clip, the metadata written to a file and parsed by the planner's
  // tecParseMotion. rid -> curve for the clips that could be measured.
  function motionCurves(resources) {
    const out = {};
    let tmp = null;
    try {
      for (const r of resources) {
        const file = r.path || (process.env.TEC_FOOTAGE_DIR && r.name ? path.join(expandPath(process.env.TEC_FOOTAGE_DIR), r.name) : null);
        if (!file || !fs.existsSync(file)) continue;
        if (!motionCache.has(file)) {
          let curve = null;
          try {
            tmp = tmp || fs.mkdtempSync(path.join(os.tmpdir(), 'tec-motion-'));
            const name = 'motion-' + String(r.rid).replace(/[^A-Za-z0-9-]/g, '_') + '.txt';
            execFileSync(ffmpeg(), ['-nostdin', '-v', 'error', '-an', '-sn', '-dn', '-i', file, '-vf', P.TEC_MOTION_FILTER + name, '-f', 'null', '-'], { cwd: tmp, stdio: 'ignore', timeout: 120000 });
            curve = j(P.tecParseMotion(fs.readFileSync(path.join(tmp, name), 'utf8')));
          } catch (e) { curve = null; }
          motionCache.set(file, curve);
        }
        if (motionCache.get(file)) out[r.rid] = motionCache.get(file);
      }
    } finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
    return out;
  }

  // Own music, like the panel: decode to mono 22.05 kHz f32 (first 6 min) and run the plugin's beat-detect.cjs.
  // The "loudest part" is the panel's: planner.js tecLoudest on the detector result (beat energy, or the waveform
  // peaks with fixed timing).
  function ownMusic(spec) {
    const file = expandPath(spec.slice(4));
    if (ownCache.has(file)) return ownCache.get(file);
    if (!file || !fs.existsSync(file)) throw Error('own music not found: "' + spec + '" (set the env var it names)');
    const buf = execFileSync(ffmpeg(), ['-nostdin', '-v', 'error', '-t', '360', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', 'pipe:1'], { maxBuffer: 64 << 20 });
    const samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
    const det = createRequire(path.join(pluginDir, 'beat-detect.cjs'))(path.join(pluginDir, 'beat-detect.cjs')).analyze(samples, 22050);
    // Panel: an accepted detection gives tecPhrase(bpm), else the fixed 3.9 s phrase; firstBeat is 0 with fixed timing.
    const phrase = det.accepted ? P.tecPhrase({ bpm: det.bpm, accepted: true }) : P.tecPhrase({});
    const firstBeat = phrase.fixed ? 0 : det.firstBeat;
    const loudest = P.tecLoudest({ ...det, firstBeat, durationSeconds: det.durationSeconds }, phrase.P, phrase.m, phrase.fixed);
    const out = { file, name: path.basename(file), detector: { bpm: det.bpm, firstBeat: det.firstBeat, accepted: det.accepted, durationSeconds: det.durationSeconds },
      bpm: det.bpm, firstBeat, usableEnd: det.durationSeconds - P.TEC_MUSIC_END_MARGIN, swell: loudest, phrase };
    ownCache.set(file, out);
    return out;
  }

  // The music the row asks for: { kind, cue?, own?, phrase, grid: { firstBeat, usableEnd, swell, fixed } | null }.
  function musicFor(row) {
    const kind = cueKind(row.cue);
    if (kind === 'none') return { kind, phrase: j(P.tecPhrase({})), grid: null, title: '' };
    if (kind === 'own') {
      const o = ownMusic(row.cue);
      return { kind, own: o, phrase: j(o.phrase), grid: { firstBeat: o.firstBeat, usableEnd: o.usableEnd, swell: o.swell, fixed: o.phrase.fixed }, title: o.name };
    }
    const cue = cues.find(c => c.id === row.cue);
    if (!cue) throw Error('unknown cue ' + row.cue + '; one of none, own:<path>, ' + cues.map(c => c.id).join(', '));
    const phrase = j(P.tecPhrase({ bpm: cue.bpm, accepted: true }));
    return { kind, cue, phrase, grid: { firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, swell: cue.swell ?? cue.swellFallback, fixed: phrase.fixed }, title: cue.title };
  }

  const sectionValue = v => (v === 'early' ? -1e6 : v === 'late' ? 1e6 : typeof v === 'number' ? v : undefined);

  // Credits: rows override > preset ('empty' = no rows). Like the panel's creditInfo, the Personal/Travel counts are
  // the selected clips and (with photos on) the selected photos, and the dates come from every inventoried clip and
  // photo, not from the picks. The inventory is already narrowed by row.only (the panel's dates span the whole Project).
  function creditRows(row, music, inv) {
    if (Array.isArray(row.rows)) return j(P.tecCleanRows(row.rows));
    if (row.preset === 'empty') return [];
    const info = { projectName: row.projectName, dates: [...inv.resources, ...(inv.photos || [])].map(r => r.recordedAt).filter(Boolean),
      cueTitle: music.kind === 'bundled' ? music.title : '', ownMusicName: music.kind === 'own' ? music.own.name : '',
      clips: inv.resources.length, photos: row.photos ? (inv.photos || []).length : 0 };
    return j(P.tecPresetRows(row.preset, info));
  }

  const rollFor = (rows, layout, endSec, L) => {
    const lay = P.tecCreditLayout({ rows, layout, H, W, measure });
    return { layout: lay, roll: j(P.tecRollSpeed({ endSec, L, H, lastRoleStartY: lay.lastRoleTop, rowTops: lay.rowTops })) };
  };
  // The panel's frozen build record (panel.tsx build()), minus the title and rows the graphic parameters carry.
  const buildRecord = (s, a) => ({ layout: s.layout, sequenceId: a.sequenceId, fps: a.fps, frames: a.frames, speedPxPerSec: s.roll.pxPerSec,
    window: WINDOWS[s.layout], look: { on: !!s.row.look, strength: LOOK_STRENGTH }, clipSound: s.row.clipSound, photos: s.photos, sources: s.sources,
    fades: FADES, musicFadeOut: MUSIC_FADE_OUT });
  const coverScale = aspect => (aspect > 0 && Math.abs(aspect - A) > 0.01 ? Math.max(A / aspect, aspect / A) : 1);

  const api = {
    id: pluginJson.id,
    version: pluginJson.version,
    label: 'TEC',
    searchBatch: 4, // four clips x six roles per call keeps a search call inside run_script's 30 s deadline

    checkMatrix(rows) {
      const R = rows.map(withDefaults);
      const count = f => R.reduce((m, r) => { for (const v of [].concat(f(r))) m[v] = (m[v] || 0) + 1; return m; }, {});
      const counts = {
        layout: count(r => r.layout), length: count(r => r.length), cue: count(r => (cueKind(r.cue) === 'own' ? 'own' : r.cue)),
        clipSound: count(r => r.clipSound), look: count(r => String(r.look)), section: count(r => (typeof r.section === 'number' ? 'seconds' : r.section)),
        photos: count(r => String(r.photos)), preset: count(r => (Array.isArray(r.rows) ? 'rows' : r.preset)),
        seed: count(r => (r.seeds || [1]).map(String)),
        longTitle: count(r => String(Array.from(String(r.title)).length >= LONG_TITLE_GLYPHS)),
        wrappingRole: count(r => String(Array.isArray(r.rows) && r.rows.some(x => P.tecFitLine(x.role, P.TEC_CREDIT_METRICS.roleSize * H / 1080,
          P.TEC_CREDIT_METRICS[r.layout === 'full' ? 'full' : 'classic'].maxWidth * W, measure, 'role').lines.length > 1))),
        project: count(r => r.project || '?'),
      };
      const need = {
        layout: LAYOUTS, length: Object.keys(P.TEC_LENGTHS), cue: [...cues.map(c => c.id), 'none', 'own'], clipSound: CLIP_SOUNDS,
        look: ['true', 'false'], section: SECTIONS, photos: ['true', 'false'], preset: PRESETS, seed: ['2'], longTitle: ['true'], wrappingRole: ['true'],
      };
      const missing = [];
      for (const [k, vals] of Object.entries(need)) for (const v of vals) if ((counts[k][v] || 0) < 2) missing.push(k + '=' + v + ' x' + (counts[k][v] || 0));
      const unknown = [];
      for (const r of R) {
        const k = cueKind(r.cue);
        if (k === 'bundled' && !cues.some(c => c.id === r.cue)) unknown.push(r.key + ': cue ' + r.cue);
        if (k === 'own' && !String(r.cue).slice(4)) unknown.push(r.key + ': own: needs a path');
        if (!LAYOUTS.includes(r.layout)) unknown.push(r.key + ': layout ' + r.layout);
        if (!P.TEC_LENGTHS[r.length]) unknown.push(r.key + ': length ' + r.length);
        if (!Array.isArray(r.rows) && !PRESETS.includes(r.preset)) unknown.push(r.key + ': preset ' + r.preset);
        if (!CLIP_SOUNDS.includes(r.clipSound)) unknown.push(r.key + ': clipSound ' + r.clipSound);
        if (!(SECTIONS.includes(r.section) || typeof r.section === 'number')) unknown.push(r.key + ': section ' + r.section);
        if (typeof r.look !== 'boolean' || typeof r.photos !== 'boolean' || typeof r.fitLength !== 'boolean') unknown.push(r.key + ': look/photos/fitLength must be booleans');
        if (!r.project) unknown.push(r.key + ': no project type');
      }
      // '<fill>' pids are allowed offline (--check, --plan-only with fixtures); a real build needs the Staging Project id.
      const unfilledPids = R.filter(r => /^<.*>$/.test(String(r.pid))).length;
      return { ok: !missing.length && !unknown.length, counts, missing, unknown, unfilledPids };
    },

    inventory(row, { readOnly } = {}) {
      // measureMs 0: no scratch Drafts to measure photo sizes (a read-only run must not create anything).
      return { summary: 'Read footage', script: 'scripts/inventory.js', config: { projectId: row.pid, only: row.only || null, known: {}, ...(readOnly ? { measureMs: 0 } : {}) } };
    },

    videoRids(inv) {
      return { rids: inv.resources.map(r => r.rid), durations: Object.fromEntries(inv.resources.map(r => [r.rid, r.duration])) };
    },

    search(row, rids) {
      return { summary: 'Search landscape shots', script: 'scripts/search.js', config: { projectId: row.pid, rids, queries: j(P.TEC_SEARCH_QUERIES), pageSize: 4 } };
    },

    // Panel: phrase -> Length fit -> section -> tecPlanBuild (shrinks N for footage) -> photo motions -> credits.
    plan({ row: r0, seed, inv, found }) {
      const row = withDefaults(r0);
      inv.photos = inv.photos || [];
      const layout = row.layout === 'full' ? 'full' : 'classic';
      const music = musicFor(row);
      const Pp = music.phrase.P, L = P.TEC_LEAD_IN;
      let N = P.TEC_LENGTHS[row.length], lengthKey = row.length;
      if (!N) throw Error('unknown length ' + row.length);
      let section = null;
      if (music.grid) {
        const g = music.grid;
        const sec = n => j(P.tecSection({ firstBeat: g.firstBeat, P: Pp, videoSeconds: P.tecVideoSeconds(n, Pp), usableEnd: g.usableEnd, swell: g.swell, value: sectionValue(row.section), fixed: g.fixed }));
        section = sec(N);
        if (!section) {
          // The panel refuses to build ("This track is too short for this Length.") and only suggests the longest Length
          // that fits; a row with fitLength: true takes that suggestion (and fails with the panel's needs line when not even
          // Short fits).
          const fit = j(P.tecFitLength({ firstBeat: g.firstBeat, P: Pp, usableEnd: g.usableEnd, fixed: g.fixed, requested: row.length }));
          if (!row.fitLength) throw Error('This track is too short for this Length.');
          if (!fit.key) throw Error('This track is too short (needs \u2265 ' + fit.needSeconds + ' s).');
          N = fit.N; lengthKey = fit.key; section = sec(N);
        }
      }
      const sectionStart = section ? section.start : null;
      const sizes = {}, sources = {};
      for (const r of [...inv.resources, ...inv.photos]) {
        if (r.width > 0 && r.height > 0) sizes[r.rid] = { width: r.width, height: r.height };
        const aspect = r.aspect > 0 ? r.aspect : r.width > 0 && r.height > 0 ? r.width / r.height : null;
        if (aspect) sources[r.rid] = { aspect };
      }
      const photoCands = row.photos ? inv.photos.map(p => ({ rid: p.rid, kind: 'photo' })) : [];
      const motion = motionCurves(inv.resources);
      const plan = j(P.tecPlanBuild({ layout, N, P: Pp, candidates: found.list.concat(photoCands), seed: String(seed), motion }));
      if (!plan.ok) throw Error('Needs at least ' + plan.needed + ' usable clips or photos (found ' + plan.usableShots + ')');
      const motions = j(P.tecShotMotions(plan.picks, String(seed), sizes, { pool: plan.motionPool }));
      const byShot = motions.map(m => (m ? { motion: m.motion, direction: m.direction, axis: m.axis, frameStrength: m.frameStrength } : null));
      const photos = {}, byRid = {};
      plan.picks.forEach((k, i) => {
        if (k.kind !== 'photo') return;
        const m = motions[i] || {};
        byRid[k.rid] = { motion: m.motion, direction: m.direction, axis: m.axis };
        photos[k.rid] = { aspect: sources[k.rid] ? sources[k.rid].aspect : null, ...byRid[k.rid] };
      });
      const rows = creditRows(row, music, inv);
      const title = String(row.title);
      const est = rollFor(rows, layout, plan.timeline.total, L); // at the planned seconds; afterAssemble redoes it at the real frames
      const planSummary = { layout, cue: row.cue, P: +Pp.toFixed(4), m: music.phrase.m, fixed: music.phrase.fixed, length: lengthKey, requestedLength: row.length,
        N: plan.N, requestedN: plan.requestedN, shrunk: plan.shrunk, visibleShots: plan.visibleShots, fillerShots: plan.fillerShots, photoShots: plan.photoShots,
        videoSeconds: +plan.timeline.total.toFixed(3), sectionStart: sectionStart == null ? null : +sectionStart.toFixed(3), sectionJ: section ? section.j : null,
        rows: rows.length, titleGlyphs: Array.from(title).length, motionMeasured: Object.keys(motion).length,
        shotMotion: plan.picks.map((k, i) => (k.kind === 'photo' ? 'photo' : (k.motion == null ? '?' : k.motion) + ':' + (byShot[i] ? byShot[i].motion : 'none'))), speedEstimate: { pxPerSec: +est.roll.pxPerSec.toFixed(2), clamped: est.roll.clamped, hiddenRows: est.roll.hiddenRows, removeRows: est.roll.removeRows } };
      return { row, seed, inv, found, layout, music, plan, planSummary, section, start: sectionStart, fitted: { length: lengthKey, N }, boundaries: plan.timeline.boundaries,
        sources, photos, byRid, byShot, rows, title };
    },

    ensureAudio(s) {
      if (s.music.kind === 'none') return null;
      // The panel imports a bundled cue from the INSTALLED plugin folder, and own music from where the user picked it.
      const file = s.music.kind === 'own' ? s.music.own.file : installedDir + '/assets/cues/' + s.music.cue.file;
      return { summary: 'Add music to the project', script: 'scripts/ensure-audio.js', config: { projectId: s.row.pid, path: file }, allowCommit: true };
    },

    assemble(s, music) {
      s.musicClip = music;
      s.draftName = s.row.draftName || ['TEC', s.row.key, s.layout === 'full' ? 'Full frame' : 'Classic', s.music.title || 'No music', s.fitted.length].join(' ') + (s.seed !== 1 ? ' seed ' + s.seed : '');
      return { summary: 'Assemble THE END Credits', script: 'scripts/assemble.js', allowCommit: true, config: {
        projectId: s.row.pid, draftName: s.draftName, layout: s.layout, boundaries: s.boundaries, picks: s.plan.picks, sources: s.sources,
        clipSound: s.row.clipSound, ambientDb: AMBIENT_DB, musicFadeOut: MUSIC_FADE_OUT,
        music: music ? { resourceId: music.resourceId, sectionStart: s.start } : null } };
    },

    // Roll speed from the real frames (spec R2/R7): reveal at frames[1], end at the last frame.
    afterAssemble(s, a) {
      s.frames = a.frames; s.fps = a.fps;
      const r = rollFor(s.rows, s.layout, a.frames[a.frames.length - 1] / a.fps, a.frames[1] / a.fps);
      s.roll = r.roll; s.creditLayout = { lastRoleTop: r.layout.lastRoleTop, rowTops: r.layout.rowTops };
    },

    decorate(s, a) {
      const { rows } = s;
      const fonts = FONTS.map(f => ({ family: f.family, style: f.style, weight: f.weight, b64: read('assets/fonts/' + f.file).replace(/\s+/g, '') }));
      const scalars = {};
      rows.forEach((r, i) => { scalars['role' + (i + 1)] = r.role; scalars['name' + (i + 1)] = r.name; });
      // credits-graphic.tsx data contract (the TSX is authoritative: revealFrame, rows).
      // endFrame like the panel: the graphic fits its roll speed to its own layout between revealFrame and endFrame.
      const parameters = { layout: s.layout, fps: a.fps, revealFrame: a.frames[1], endFrame: a.frames[a.frames.length - 1], title: s.title, showTitle: true,
        titleColor: TITLE_COLOR, creditColor: CREDIT_COLOR, rows, rowCount: rows.length, ...scalars, speedPxPerSec: s.roll.pxPerSec, speed: 1, fonts };
      const editableParameters = [
        { key: 'title', label: 'Title', type: 'text', defaultValue: s.title },
        { key: 'titleColor', label: 'Title color', type: 'color', defaultValue: TITLE_COLOR },
        { key: 'creditColor', label: 'Credits color', type: 'color', defaultValue: CREDIT_COLOR },
        { key: 'speed', label: 'Roll speed', type: 'number', defaultValue: 1, min: 0.5, max: 2, step: 0.05 },
        { key: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
        ...rows.flatMap((r, i) => [
          { key: 'role' + (i + 1), label: 'Role ' + (i + 1), type: 'text', defaultValue: r.role },
          { key: 'name' + (i + 1), label: 'Name ' + (i + 1), type: 'text', defaultValue: r.name },
        ]),
      ];
      // decorate.js contract, with the panel's build record (window, fades, music fade, look strength).
      return { summary: 'Add credits and look', script: 'scripts/decorate.js', allowCommit: true, config: {
        ...buildRecord(s, a),
        graphic: { tsx: read('assets/credits-graphic.tsx'), parameters, editableParameters },
        frame: { tsx: read('assets/shot-frame.tsx') },
        look: { tsx: read('assets/cinematic-look.tsx'), strength: LOOK_STRENGTH, on: !!s.row.look },
        photoMotion: { byRid: s.byRid, byShot: s.byShot } } };
    },

    // Read by the kit readback for the generic keys and by dev/readback-tec.mjs for mainStartFrame, stack, photoRids
    // and transforms. Pure: the driver calls it twice.
    expected(s, a) {
      const first = s.layout === 'full' ? 0 : 1, end = a.frames[a.frames.length - 1];
      const usedRids = [...new Set(s.plan.picks.map(k => k.rid))];
      const transforms = {};
      // Only non-16:9 sources: assemble.js leaves 16:9 clips at the app's default transform.
      for (const rid of usedRids) if (s.sources[rid] && coverScale(s.sources[rid].aspect) !== 1) transforms[rid] = +coverScale(s.sources[rid].aspect).toFixed(6);
      return {
        frameSize: { width: W, height: H }, fps: a.fps,
        mainStartFrame: a.frames[first],
        cuts: a.frames.slice(first + 1), noAdjacent: true,
        graphics: [{ name: GRAPHIC_LABEL, count: 1, startFrame: 0, endFrame: end }],
        effects: [{ name: LOOK_LABEL, perMainClip: s.row.look ? 1 : 0 }, { name: FRAME_LABEL, perMainClip: 1 }],
        stack: s.row.look ? [LOOK_LABEL, FRAME_LABEL] : [FRAME_LABEL],
        music: s.musicClip ? { resourceId: s.musicClip.resourceId, db: 0, fadeOutSeconds: MUSIC_FADE_OUT } : { none: true },
        clipSound: s.row.clipSound === 'off' ? { mode: 'off' } : { mode: 'level', db: s.row.clipSound === 'full' ? 0 : AMBIENT_DB },
        photoRids: Object.keys(s.photos),
        transforms,
      };
    },

    // Typing half-way, the reveal + 1 s, the title exit region and the last frames.
    captureFrames(s) {
      const f = s.frames, fps = s.fps, end = f[f.length - 1];
      return [Math.round(2.5 * fps), f[1] + Math.round(fps), Math.round((f[1] + end) / 2), end - Math.round(0.5 * fps)];
    },

    record(s, a) {
      const { row, plan } = s;
      const first = s.layout === 'full' ? 0 : 1;
      const bpm = s.music.phrase.fixed ? null : s.music.kind === 'bundled' ? s.music.cue.bpm : s.music.kind === 'own' ? s.music.own.bpm : null;
      // Interior cuts: the ends of consecutive main clips except the last. The Classic reveal (black gap -> first shot,
      // 0.5 s fade-in) is not a scene cut; Full frame's shot 0 -> shot 1 is.
      const idx = a.frames.map((_, i) => i).slice(first + 1, -1);
      const tolMs = 500 / a.fps + 1; // spec R2: half a frame at the Draft fps + 1 ms
      return {
        rec: { inputs: { layout: s.layout, cue: row.cue, length: row.length, preset: Array.isArray(row.rows) ? 'rows' : row.preset, title: s.title, clipSound: row.clipSound,
          look: row.look, photos: row.photos, section: row.section, fitLength: row.fitLength, project: row.project },
          name: s.draftName, plan: s.planSummary, fitted: s.fitted, sectionStart: s.start, section: s.section, phrase: s.music.phrase, own: s.music.own ? s.music.own.detector : null,
          frames: a.frames, plannedFrames: a.plannedFrames || null, window: WINDOWS[s.layout], fades: FADES, musicFadeOut: MUSIC_FADE_OUT,
          look: { on: !!row.look, strength: LOOK_STRENGTH }, rows: s.rows, roll: s.roll, creditLayout: s.creditLayout, expected: api.expected(s, a), evalToleranceMs: tolMs,
          picks: plan.picks.map(p => (p.kind === 'photo' ? 'P:' + p.rid : p.rid + '@' + (p.startSeconds ?? 0).toFixed(2))) },
        cuts: { fps: a.fps, cuts: idx.map(i => a.frames[i]), gridCuts: idx.map(i => (a.plannedFrames || a.frames)[i]), cutSeconds: idx.map(i => s.boundaries[i]),
          ...(bpm ? { bpm, beats: idx.map(i => +(s.boundaries[i] * bpm / 60).toFixed(4)) } : {}),
          sectionStart: s.start, cue: row.cue, layout: s.layout, reveal: a.frames[1], end: a.frames[a.frames.length - 1], toleranceMs: tolMs },
      };
    },
  };
  return api;
}
