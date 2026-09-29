// plugins/summer-trip/dev/adapter.mjs
// Dev-only: the style-specific half of the selects-app-kit headless build driver for Summer Trip. It implements the
// kit adapter contract (tools/drive/pluginAdapter.mjs in selects-app-kit), so it runs under the kit's driver
//   node $SELECTS_APP_KIT/tools/drive/build-driver.mjs --plugin plugins/summer-trip --adapter plugins/summer-trip/dev/adapter.mjs ...
// and under this plugin's own dev/drive.mjs, which adds the Summer Trip readback checks (dev/expect.mjs). It mirrors the
// panel's Build: inventory -> search -> plan (stPlanBuild, planner.js in node:vm) -> ensure-audio (cue dry/wet, sound
// effects when on) -> assemble -> decorate, with the run_script config shapes of dev/contracts.md.
//
// This module imports no kit code and calls no app, so tests/adapter.test.cjs runs it offline. Only own music touches
// local tools (ffmpeg + beat-detect.cjs, synchronously, when a row plans with it) and only ensureAudio writes files
// (decoded sound effects, the muffled own music) into the work directory.
//
// Row keys (matrix JSON; ROW_DEFAULTS below): key, pid, seeds, capture, export (generic, used by the drivers) and
//   music      '<cue id>' (assets/cues/manifest.json, or dev-manifest.json when present) | 'none' | { own: '<file>' }
//   section    'default' (drop section, else the most energetic bars) | 'early' | 'late' | <seconds>
//   length     'short' | 'standard' | 'long' (6 / 8 / 12 montage shots)
//   preset     'summer' | 'poster' | 'postcard'
//   line1, season ('@suggest' = from the capture months), place, placePrefix, topMain ('@season'), topItalic,
//   creditPrefix, creditName
//   clipSound  'off' | 'ambient' | 'full'      gridSound 'volume' | 'routing' | 'none'
//   look (bool), lookStrength, leakStrength, sfx (bool), muffle (bool), usePhotos (bool), only ([rid] = Choose clips)
//   fps        planning fps guess (default: the last real fps seen, else 30)
//   draftName  full override; default "SUMMER test <key> <music> <preset> <length>[ seed N]"
// String values may use ${ENV} placeholders (for example "pid": "${ST_PID}", "music": { "own": "${ST_OWN_MUSIC}" }).
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { stVisibleEvents, stEvalCuts, stExpectations, stKitExpectations, ST_W, ST_H } from './expect.mjs';

export const ROW_DEFAULTS = {
  music: 'default', section: 'default', length: 'standard', preset: 'summer',
  line1: 'that one trip in', season: '@suggest', place: '', placePrefix: 'in', topMain: '@season', topItalic: 'VLOG', creditPrefix: 'By', creditName: '',
  clipSound: 'ambient', gridSound: 'volume', look: true, lookStrength: 0.3, leakStrength: 1, sfx: false, muffle: true, usePhotos: true, only: null,
};
// Panel constants the driver must share with panel.tsx (report any difference to the panel lane).
export const ST_PANEL = {
  AMBIENT_DB: -18,
  DRAFT_PREFIX: 'SUMMER test',
  FILM_WINDOW: { w: 0.87, h: 0.84, radius: 0.02, feather: 0.012 },
  TIME_ORIGIN: 'clip',
  MOTION_STRENGTH: 1,
  MOTION_OPTIONS: [
    { label: 'Push in', value: 'push-in' }, { label: 'Pull out', value: 'pull-out' },
    { label: 'Drift left', value: 'drift-left' }, { label: 'Drift right', value: 'drift-right' },
    { label: 'Drift up', value: 'drift-up' }, { label: 'Drift down', value: 'drift-down' },
    { label: 'Tilt', value: 'tilt' }, { label: 'Push and drift', value: 'push-drift' },
  ],
  SFX_SHUTTERS: ['shutter-1', 'shutter-2', 'shutter-3', 'shutter-4'],
  SFX_WHOOSH: 'whoosh-1',
  SEARCH_BATCH: 3,
  SEARCH_PAGE: 6,
  FPS_GUESS: 30,
};

const j = v => JSON.parse(JSON.stringify(v)); // vm realm objects -> plain objects

// Loads a plain script (planner.js, graphics-defs.js) in node:vm and returns every st* function and ST_* / st* const
// it declares at the top level, so a planner change never needs a driver change.
export function loadScript(source) {
  const names = [...new Set([...source.matchAll(/^(?:function\s+(st\w+)|const\s+(ST_\w+|st\w+)\s*=)/gm)].map(m => m[1] || m[2]))];
  const box = {};
  vm.createContext(box);
  vm.runInContext(source + ';globalThis.__X={' + names.join(',') + '};', box);
  return box.__X;
}

export const expandEnv = v => (typeof v === 'string' ? v.replace(/\$\{(\w+)\}/g, (_, k) => process.env[k] ?? '') :
  Array.isArray(v) ? v.map(expandEnv) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, expandEnv(x)])) : v);

export const musicKind = m => (m === 'none' ? 'none' : m && typeof m === 'object' && 'own' in m ? 'own' : 'cue');
const sectionKind = s => (typeof s === 'number' ? 'seconds' : s || 'default');

export async function createAdapter({ pluginDir, installedDir, read, workDir } = {}) {
  read = read || (rel => fs.readFileSync(path.join(pluginDir, rel), 'utf8'));
  installedDir = installedDir || process.env.SELECTS_PLUGIN_INSTALLED_DIR || path.join(os.homedir(), '.selects', 'skills', 'summer-trip');
  // Where ensureAudio writes decoded sound effects and the muffled own music (the Selects app imports them by path).
  // The panel keeps these under .selects/plugin-data/summer-trip; ensure-audio.js also matches these by file name.
  workDir = workDir || process.env.ST_DRIVE_WORK || path.join(os.homedir(), '.selects', 'plugin-data', 'summer-trip', 'drive');
  const manifestJson = JSON.parse(read('plugin.json'));
  const P = loadScript(read('planner.js'));
  const G = loadScript(read('graphics-defs.js'));
  const presets = JSON.parse(read('assets/fonts/presets.json'));
  const sfxManifest = JSON.parse(read('sfx/manifest.json'));
  // Bundled cues, then the development cues (gitignored, built by dev/build-cues.cjs) when this checkout or the
  // installed plugin has them.
  const cueDirs = [path.join(installedDir, 'assets', 'cues'), path.join(pluginDir, 'assets', 'cues')];
  const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const bundled = (JSON.parse(read('assets/cues/manifest.json')).cues || []).map(c => ({ ...c, dev: false }));
  const devManifest = cueDirs.map(d => readJson(path.join(d, 'dev-manifest.json'))).find(Boolean);
  const cues = bundled.concat(((devManifest && devManifest.cues) || []).filter(c => !bundled.some(b => b.id === c.id)).map(c => ({ ...c, dev: true })));
  const cueFile = file => cueDirs.map(d => path.join(d, file)).find(f => fs.existsSync(f)) || path.join(installedDir, 'assets', 'cues', file);
  const tsx = name => read('assets/' + name + '.tsx');
  let lastRealFps = null;

  // ---- own music (local tools; cached per file content) ----
  const ownCache = {};
  function ownMusic(file) {
    if (ownCache[file]) return ownCache[file];
    if (!fs.existsSync(file)) throw Error('own music file not found: ' + file);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    fs.mkdirSync(workDir, { recursive: true });
    const cachePath = path.join(workDir, 'own-' + hash.slice(0, 12) + '.json');
    let analysis = readJson(cachePath);
    if (!analysis) {
      const req = createRequire(path.join(pluginDir, 'beat-detect.cjs'));
      const { analyze } = req(path.join(pluginDir, 'beat-detect.cjs'));
      const pcm = execFileSync(process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg',
        ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
      const samples = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
      const a = analyze(samples, 22050, { dropPick: 'largest' });
      analysis = { bpm: a.bpm, firstBeat: a.firstBeat, accepted: a.accepted, durationSeconds: a.durationSeconds, beatEnergy: a.beatEnergy,
        onsets: a.onsets, onsetThresholds: a.onsetThresholds, drop: a.drop, sixteenthRatio: a.sixteenthRatio };
      fs.writeFileSync(cachePath, JSON.stringify(analysis));
    }
    const base = path.basename(file).replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._-]+/g, '-');
    const wetPath = path.join(workDir, base + '-muffled-' + hash.slice(0, 8) + '.wav');
    return (ownCache[file] = { file, hash, wetPath, analysis });
  }
  function bakeMuffle(own) {
    if (fs.existsSync(own.wetPath)) return own.wetPath;
    const req = createRequire(path.join(pluginDir, 'muffle.cjs'));
    const { stMuffleCommand } = req(path.join(pluginDir, 'muffle.cjs'));
    const cmd = stMuffleCommand(own.file, own.wetPath + '.part.wav');
    execFileSync('/bin/sh', ['-c', cmd], { stdio: 'ignore' });
    fs.renameSync(own.wetPath + '.part.wav', own.wetPath);
    return own.wetPath;
  }

  // ---- music grid + section (panel: track picker, section slider) ----
  function resolveMusic(row, n) {
    const kind = musicKind(row.music);
    const total = P.stTotalSeconds;
    if (kind === 'none') {
      return { kind, label: 'No music', grid: { bpm: P.ST_FIXED_BPM, accepted: false, bundled: false }, sectionStart: null, sectionKind: null, notes: ['approximate timing (no music)'] };
    }
    if (kind === 'cue') {
      const id = row.music === 'default' ? (cues[0] && cues[0].id) : row.music;
      const cue = cues.find(c => c.id === id);
      if (!cue) throw Error('unknown cue ' + id + '; one of none, { own }, ' + (cues.map(c => c.id).join(', ') || '(no cues found)'));
      if (cue.accepted === false) throw Error('cue ' + cue.id + ' was rejected: ' + cue.rejectReason);
      const bpm = P.stOctave(cue.bpm);
      if (!bpm) throw Error('cue ' + cue.id + ' has no usable tempo');
      const c = { ...cue, bpm };
      const sec = pickSection(c, row.section, n);
      return { kind, label: cue.title || cue.id, cue, grid: { bpm, firstBeat: cue.firstBeat, accepted: true, bundled: true, titleHits: cue.titleHits || null },
        sectionStart: sec.start, sectionKind: sec.kind, notes: sec.note ? [sec.note] : [],
        files: { dry: cueFile(cue.file), wet: cue.muffledFile ? cueFile(cue.muffledFile) : null } };
    }
    if (!row.music.own) throw Error('own music: no file (set music.own, for example to "${ST_OWN_MUSIC}")');
    const own = ownMusic(row.music.own);
    const a = own.analysis;
    const bpm = a.accepted ? P.stOctave(a.bpm) : null;
    const notes = [];
    const files = { dry: own.file, wet: own.wetPath, own };
    if (!bpm) {
      // Approximate timing: a fixed 0.5 s beat, low-band snapping within 120 ms; the box moves in 0.1 s steps.
      const latest = a.durationSeconds - ST_SECTION_END(P) - total(P.ST_FIXED_BPM, n);
      if (latest < 0) throw Error('own music too short for ' + n + ' montage shots');
      const want = typeof row.section === 'number' ? row.section : row.section === 'late' ? latest : 0;
      const start = Math.max(0, Math.min(latest, Math.round(want * 10) / 10));
      notes.push('approximate timing (no reliable beat)');
      return { kind: 'own', label: path.basename(own.file), grid: { bpm: P.ST_FIXED_BPM, accepted: false, bundled: false, onsets: a.onsets, onsetThresholds: a.onsetThresholds, lowConfidence: true },
        sectionStart: start, sectionKind: 'seconds', notes, files };
    }
    const drop = a.drop && Math.abs(a.drop.bpm - bpm) < 0.01 ? a.drop : null;
    const cueLike = { bpm, firstBeat: drop ? drop.firstBeat : a.firstBeat, dropBeat: drop ? drop.dropBeat : null,
      beatEnergy: Math.abs(bpm - a.bpm) < 0.01 ? a.beatEnergy : null, duration: a.durationSeconds };
    if (!drop) notes.push('No drop found: the grid starts after the 2-bar title');
    const sec = pickSection(cueLike, row.section, n);
    if (sec.note) notes.push(sec.note);
    return { kind: 'own', label: path.basename(own.file), grid: { bpm, firstBeat: cueLike.firstBeat, accepted: true, bundled: false, onsets: a.onsets, onsetThresholds: a.onsetThresholds, lowConfidence: false },
      sectionStart: sec.start, sectionKind: sec.kind, notes, files };
  }
  function pickSection(cue, section, n) {
    let r;
    if (section === 'default' || section == null) r = P.stDefaultSection(cue, n);
    else if (section === 'early') r = P.stClampSection({ cue, montageShots: n, value: 0 });
    else if (section === 'late') r = P.stClampSection({ cue, montageShots: n, value: 1e9 });
    else if (typeof section === 'number') r = P.stClampSection({ cue, montageShots: n, value: section });
    else throw Error('unknown section ' + JSON.stringify(section));
    if (!r) throw Error('the music is too short for ' + n + ' montage shots');
    r = j(r);
    return { start: r.start, kind: r.kind, note: r.note || (r.moved ? 'The section was moved to the latest start that fits' : null) };
  }

  function candidates(row, inv, found) {
    const only = row.only ? new Set(row.only) : null;
    const dur = Object.fromEntries(inv.resources.map(r => [r.rid, r.duration]));
    const hits = found.list.filter(c => !only || only.has(c.rid)).map(c => ({ ...c, sourceDuration: c.sourceDuration || dur[c.rid] || 0 }));
    const photos = row.usePhotos ? (inv.photos || []).filter(p => !only || only.has(p.rid)).map(p => ({ rid: p.rid, kind: 'photo' })) : [];
    return hits.concat(photos);
  }
  function sizesOf(inv) {
    const out = {};
    for (const r of [...inv.resources, ...(inv.photos || [])]) if (r.width > 0 && r.height > 0) out[r.rid] = { width: r.width, height: r.height };
    return out;
  }
  function planAt(s, fps) {
    const m = s.music;
    return j(P.stPlanBuild({
      candidates: s.candidates, bpm: m.grid.bpm, fps, montageShots: s.requested, seed: String(s.seed),
      sectionStart: m.sectionStart == null ? undefined : m.sectionStart, sizes: s.sizes, bundled: m.grid.bundled,
      ...(m.grid.bundled || !m.grid.onsets ? {} : { onsets: m.grid.onsets, onsetThresholds: m.grid.onsetThresholds, lowConfidence: m.grid.lowConfidence }),
    }));
  }

  const adapter = {
    id: manifestJson.id,
    version: manifestJson.version,
    label: 'ST',
    searchBatch: ST_PANEL.SEARCH_BATCH,
    cues, P, G, presets, workDir,

    // Every option at least twice (spec 13): coverage counts per value, unknown cues/presets.
    checkMatrix(rows) {
      const R = rows.map(r => ({ ...ROW_DEFAULTS, ...expandEnv(r) }));
      const domains = {
        music: ['cue', 'own', 'none'], section: ['default', 'early', 'late', 'seconds'], length: ['short', 'standard', 'long'],
        preset: presets.presets.map(p => p.id), clipSound: ['off', 'ambient', 'full'], look: [true, false], sfx: [true, false],
        muffle: [true, false], usePhotos: [true, false], place: ['set', 'empty'], credit: ['set', 'empty'],
      };
      const val = (r, k) => (k === 'music' ? musicKind(r.music) : k === 'section' ? sectionKind(r.section) : k === 'place' ? (r.place ? 'set' : 'empty') :
        k === 'credit' ? (r.creditName ? 'set' : 'empty') : r[k]);
      const counts = {}, missing = [];
      for (const [k, dom] of Object.entries(domains)) {
        counts[k] = {};
        for (const r of R) { const v = String(val(r, k)); counts[k][v] = (counts[k][v] || 0) + 1; }
        for (const v of dom) if ((counts[k][String(v)] || 0) < 2) missing.push(k + '=' + v + ' (' + (counts[k][String(v)] || 0) + 'x)');
      }
      const unknown = [], unverified = [];
      for (const r of R) {
        if (musicKind(r.music) === 'cue' && r.music !== 'default' && !cues.some(c => c.id === r.music)) (/^dev-/.test(r.music) ? unverified : unknown).push(r.key + ':' + r.music);
        if (!presets.presets.some(p => p.id === r.preset)) unknown.push(r.key + ':' + r.preset);
        if (!P.ST_LENGTHS[r.length]) unknown.push(r.key + ':' + r.length);
      }
      return { ok: unknown.length === 0 && missing.length === 0, counts, missing, unknown, unverified };
    },

    inventory(r0, { readOnly } = {}) {
      const row = expandEnv(r0); // the kit's build-driver passes matrix rows unexpanded
      return { summary: 'Read footage', script: 'scripts/inventory.js', config: { projectId: row.pid, only: row.only || null, known: {}, ...(readOnly ? { measureMs: 0, probeMs: 0 } : {}) } };
    },

    videoRids(inv) {
      return { rids: inv.resources.map(r => r.rid), durations: Object.fromEntries(inv.resources.map(r => [r.rid, r.duration])) };
    },

    search(r0, rids) {
      const row = expandEnv(r0);
      return { summary: 'Search travel shots', script: 'scripts/search.js', config: { projectId: row.pid, rids, queries: j(P.ST_QUERIES), pageSize: ST_PANEL.SEARCH_PAGE } };
    },

    // Pure apart from own-music analysis (cached). Throws when the plan is not buildable (the panel's disabled Build).
    plan({ row: r0, seed, inv, found }) {
      const row = { ...ROW_DEFAULTS, ...expandEnv(r0) };
      inv.photos = inv.photos || [];
      const requested = P.ST_LENGTHS[row.length];
      if (!requested) throw Error('unknown length ' + row.length);
      const preset = presets.presets.find(p => p.id === row.preset);
      if (!preset) throw Error('unknown preset ' + row.preset);
      const music = resolveMusic(row, requested);
      const monthList = (inv.months || []).flatMap((n, i) => Array(n).fill(i + 1));
      const suggested = P.stSeasonFor(monthList);
      const season = row.season === '@suggest' ? suggested : row.season;
      const texts = { line1: row.line1, season, place: row.place, placePrefix: row.placePrefix, topMain: row.topMain === '@season' ? season : row.topMain,
        topItalic: row.topItalic, creditPrefix: row.creditPrefix, creditName: row.creditName };
      const fpsGuess = Number(row.fps) || lastRealFps || ST_PANEL.FPS_GUESS;
      const s = { row, seed, inv, found, requested, preset, music, texts, suggested, fpsGuess, sizes: sizesOf(inv), candidates: candidates(row, inv, found) };
      s.plan = planAt(s, fpsGuess);
      s.planSummary = { ok: s.plan.ok, reason: s.plan.disabledReason, requested, montage: s.plan.montageShots, distinct: s.plan.distinct, seconds: s.plan.seconds,
        photoShots: s.plan.photoShots, fillerShots: s.plan.fillerShots, overlapShots: s.plan.overlapShots, notes: s.plan.notes, music: music.kind, section: music.sectionStart, sectionKind: music.sectionKind, fps: fpsGuess };
      if (!s.plan.ok) throw Error('plan not ok: ' + s.plan.disabledReason);
      s.boundaries = s.plan.frames.mainFrames;
      s.start = music.sectionStart;
      s.fitted = s.plan.montageShots;
      const kindLabel = music.kind === 'cue' ? music.cue.id : music.kind === 'own' ? 'own' : 'none';
      s.draftName = row.draftName || [ST_PANEL.DRAFT_PREFIX, row.key, kindLabel, preset.id, row.length].join(' ') + (seed !== 1 ? ' seed ' + seed : '');
      return s;
    },

    // Files to import (panel: step "Preparing music"): cue dry/wet or own music + its baked muffled copy, and the sound
    // effects decoded from sfx/*.wav.b64 when on. Returns null when there is nothing to import.
    ensureAudio(s) {
      const files = [];
      const m = s.music;
      s.audioKeys = { dry: null, wet: null, shutters: [], whoosh: null };
      if (m.kind !== 'none') {
        // Own music matches an existing resource by path only (matchByName: false); bundled cues also by file name.
        files.push(m.kind === 'cue' ? { key: 'dry', path: m.files.dry } : { key: 'dry', path: m.files.dry, matchByName: false });
        s.audioKeys.dry = 'dry';
        if (s.row.muffle && m.files.wet) {
          let wet = m.files.wet;
          if (m.kind === 'own') { try { wet = bakeMuffle(m.files.own); } catch (e) { wet = null; s.music.notes.push('ending muffle skipped: ' + e.message); } }
          if (wet) { files.push({ key: 'wet', path: wet }); s.audioKeys.wet = 'wet'; }
        }
      }
      if (s.row.sfx) {
        fs.mkdirSync(workDir, { recursive: true });
        const decode = key => {
          const file = sfxManifest[key].file, out = path.join(workDir, file);
          if (!fs.existsSync(out)) fs.writeFileSync(out, Buffer.from(read('sfx/' + file + '.b64'), 'base64'));
          return out;
        };
        for (const k of ST_PANEL.SFX_SHUTTERS) { files.push({ key: k, path: decode(k) }); s.audioKeys.shutters.push(k); }
        files.push({ key: ST_PANEL.SFX_WHOOSH, path: decode(ST_PANEL.SFX_WHOOSH) });
        s.audioKeys.whoosh = ST_PANEL.SFX_WHOOSH;
      }
      if (!files.length) return null;
      return { summary: 'Add music to the project', script: 'scripts/ensure-audio.js', config: { projectId: s.row.pid, files }, allowCommit: true };
    },

    assembleConfig(s, audio) {
      const ids = (audio && audio.ids) || {};
      s.audio = audio;
      const m = s.music, plan = s.plan;
      const durations = Object.fromEntries(s.inv.resources.map(r => [r.rid, r.duration]));
      const main = plan.picks.main.map(p => ({ rid: p.rid, kind: p.kind, startSeconds: p.startSeconds, role: p.role, ...(p.kind === 'video' && durations[p.rid] ? { duration: durations[p.rid] } : {}) }));
      const grid = plan.picks.grid.map(p => ({ rid: p.rid, kind: p.kind, startSeconds: p.startSeconds, quad: p.quad }));
      const k = s.audioKeys || {};
      const music = m.kind === 'none' || !ids[k.dry] ? null : { resourceId: ids[k.dry], sectionStart: m.sectionStart, wetResourceId: (k.wet && ids[k.wet]) || null };
      if (m.kind !== 'none' && !music) throw Error('the music was not imported');
      const shutters = (k.shutters || []).filter(x => ids[x]);
      const sfx = s.row.sfx && shutters.length && ids[k.whoosh] ? {
        shutter: shutters.map(x => ids[x]), shutterSeconds: shutters.map(x => sfxManifest[x].duration),
        whoosh: ids[k.whoosh], whooshSeconds: sfxManifest[k.whoosh].duration } : null;
      if (s.row.sfx && !sfx) throw Error('the sound effects were not imported');
      s.sfxConfig = sfx;
      return {
        projectId: s.row.pid, draftName: s.draftName, fps: s.fpsGuess, W: ST_W, H: ST_H,
        beats: { bpm: m.grid.bpm, delta: plan.frames.delta, snaps: plan.frames.snaps },
        schedule: plan.schedule, picks: { main, grid }, sizes: s.sizes, music, crossfadeFrames: null,
        clipSound: s.row.clipSound, ambientDb: ST_PANEL.AMBIENT_DB, gridSound: s.row.gridSound, sfx,
      };
    },

    assemble(s, audio) {
      return { summary: 'Assemble Summer Trip', script: 'scripts/assemble.js', allowCommit: true, config: adapter.assembleConfig(s, audio) };
    },

    // assemble.js lays the clips at the Draft's real fps itself (it re-lays on a fresh Draft when the first insert
    // changes the rate), so its frames are the truth. Here: remember the real fps (later plans start from it) and
    // re-plan at it to record whether the panel's plan at the real rate would have chosen the same shots.
    afterAssemble(s, a) {
      s.frames = { ...a.frames, bpm: s.music.grid.bpm, snaps: s.plan.frames.snaps };
      s.realFps = a.fps;
      lastRealFps = a.fps;
      const check = P.stFrameSchedule({ schedule: s.plan.schedule, bpm: s.music.grid.bpm, delta: a.frames.delta, fps: a.fps, snaps: s.plan.frames.snaps });
      s.fpsCheck = { planned: s.fpsGuess, real: a.fps, plannerAgrees: JSON.stringify(check.mainFrames) === JSON.stringify(a.frames.mainFrames) &&
        JSON.stringify(check.gridStateFrames) === JSON.stringify(a.frames.gridStateFrames) && check.endFrame === a.frames.endFrame };
      if (a.fps !== s.fpsGuess) {
        const re = planAt(s, a.fps);
        const key = p => p.rid + ':' + p.kind + ':' + (p.startSeconds || 0).toFixed(3);
        s.replan = { fps: a.fps, ok: re.ok, montageShots: re.montageShots, samePicks: re.ok && JSON.stringify(re.picks.main.map(key).concat(re.picks.grid.map(key))) ===
          JSON.stringify(s.plan.picks.main.map(key).concat(s.plan.picks.grid.map(key))), plan: re };
      } else s.replan = null;
    },

    decorateConfig(s, a) {
      const fr = a.frames, fps = a.fps, row = s.row, t = s.texts;
      const presetId = s.preset.id;
      const fontsB64 = Object.fromEntries(G.stPresetFontFiles(presets, presetId).map(f => [f, read('assets/fonts/' + f)]));
      const ts = P.stTitleTimes(P.stTitleSchedule(t.line1, t.season, s.music.grid.titleHits || null), s.music.grid.bpm, fr.delta, fps);
      const titleParams = j(G.stTitleParameters({ presets, presetId, fontsB64, line1: t.line1, season: t.season, wordTimes: ts.wordTimes,
        seasonPartTime: ts.seasonPartTime, seasonFullTime: ts.seasonFullTime, seasonPartLength: ts.seasonPartLength, labelsTime: ts.labelsTime,
        topMain: t.topMain, topItalic: t.topItalic, creditPrefix: t.creditPrefix, creditName: t.creditName }));
      const labelsSpan = fr.labelsFrames[fr.labelsFrames.length - 1];
      const labelsParams = j(G.stLabelsParameters({ presets, presetId, fontsB64, topMain: t.topMain, topItalic: t.topItalic, creditPrefix: t.creditPrefix,
        creditName: t.creditName, placePrefix: t.placePrefix, place: t.place, placeSeconds: (fr.placeFrames[1] - labelsSpan[0]) / fps }));
      const sizes = a.sizes || s.sizes;
      const cover = sz => (sz && sz.width > 0 && sz.height > 0 ? Math.max(ST_W / sz.width, ST_H / sz.height) / Math.min(ST_W / sz.width, ST_H / sz.height) : 1);
      const byClipIndex = {};
      for (const [i, mm] of Object.entries(s.plan.motions || {})) {
        const p = a.placed[Number(i)];
        byClipIndex[i] = { ...mm, cover: cover(p && sizes[p.rid]) };
      }
      const photos = [...new Set([...a.placed, ...a.gridPlaced].filter(p => p.kind === 'photo').map(p => p.rid))];
      return {
        sequenceId: a.sequenceId, fps, frames: fr, placed: a.placed, gridPlaced: a.gridPlaced, sizes,
        mute: row.clipSound === 'off', gridSound: row.gridSound,
        title: { tsx: tsx('title-graphic'), parameters: titleParams, editableParameters: j(G.stEditable(G.ST_TITLE_EDITABLE, titleParams)) },
        labels: { tsx: tsx('labels-graphic'), parameters: labelsParams, editableParameters: j(G.stEditable(G.ST_LABELS_EDITABLE, labelsParams)) },
        look: { tsx: tsx('summer-look'), strength: row.look ? row.lookStrength : 0, leakStrength: row.leakStrength, gradeOff: !row.look, timeOrigin: ST_PANEL.TIME_ORIGIN },
        gridPanel: { tsx: tsx('grid-panel') },
        filmFrame: { tsx: tsx('film-frame'), window: { ...ST_PANEL.FILM_WINDOW }, leakStrength: row.leakStrength, timeOrigin: ST_PANEL.TIME_ORIGIN },
        motion: { tsx: tsx('photo-motion'), strength: ST_PANEL.MOTION_STRENGTH, options: ST_PANEL.MOTION_OPTIONS, byClipIndex },
        endingMotion: s.plan.endingMotion || {},
        photos,
      };
    },

    decorate(s, a) {
      return { summary: 'Add title and look', script: 'scripts/decorate.js', allowCommit: true, config: adapter.decorateConfig(s, a) };
    },

    // Full Summer Trip expectations (dev/expect.mjs stCheck).
    stExpected(s, a) {
      const ids = (s.audio && s.audio.ids) || {};
      const k = s.audioKeys || {};
      const musicOn = s.music.kind !== 'none';
      return stExpectations({
        frames: a.frames, fps: a.fps, placed: a.placed, gridPlaced: a.gridPlaced, sizes: a.sizes || s.sizes,
        motionIndexes: Object.keys(s.plan.motions || {}), look: !!s.row.look, clipSound: s.row.clipSound, ambientDb: ST_PANEL.AMBIENT_DB, gridSound: s.row.gridSound,
        // The requested muffle, not what assemble managed: a skipped muffle must fail the check.
        music: musicOn ? { dryId: ids[k.dry], wetId: s.row.muffle ? (ids[k.wet] || 'missing-muffled-copy') : null } : null,
        sfx: s.sfxConfig ? { shutterIds: s.sfxConfig.shutter, shutterSeconds: s.sfxConfig.shutterSeconds, whooshId: s.sfxConfig.whoosh, whooshSeconds: s.sfxConfig.whooshSeconds } : null,
      });
    },

    // The subset the kit's build-driver/readback checkReadback understands.
    expected(s, a) {
      const e = stKitExpectations(adapter.stExpected(s, a));
      e.cuts = e.cuts.slice();
      return e;
    },

    visibleEvents(s) { return stVisibleEvents(s.plan.schedule, s.frames || s.plan.frames); },

    // Mid-points of the grid states, the place title and the ending pulses (read-only frame capture).
    captureFrames(s) {
      const fr = s.frames || s.plan.frames;
      const g = fr.gridStateFrames.concat([fr.placeFrames[1]]);
      const mids = g.slice(0, -1).map((f, i) => Math.round((f + g[i + 1]) / 2));
      return mids.concat([Math.round((fr.placeFrames[0] + fr.placeFrames[1]) / 2), fr.endingFrame + 1], fr.pulseFrames);
    },

    record(s, a) {
      const { row, plan } = s;
      const frames = s.frames;
      return {
        rec: {
          inputs: { music: row.music, section: row.section, length: row.length, preset: row.preset, clipSound: row.clipSound, gridSound: row.gridSound, look: row.look,
            lookStrength: row.lookStrength, sfx: row.sfx, muffle: row.muffle, usePhotos: row.usePhotos, only: row.only, texts: s.texts, suggestedSeason: s.suggested },
          name: s.draftName, plan: s.planSummary, musicInfo: { kind: s.music.kind, label: s.music.label, bpm: s.music.grid.bpm, sectionStart: s.music.sectionStart,
            sectionKind: s.music.sectionKind, notes: s.music.notes },
          snapLog: plan.snapLog, fpsCheck: s.fpsCheck, replan: s.replan && { fps: s.replan.fps, ok: s.replan.ok, montageShots: s.replan.montageShots, samePicks: s.replan.samePicks },
          frameSchedule: frames, planFrames: plan.frames, visibleEvents: stVisibleEvents(plan.schedule, frames),
          picks: plan.picks.main.map(p => (p.kind === 'photo' ? 'P:' : '') + p.rid + '@' + String(p.startSeconds ?? '').slice(0, 6))
            .concat(plan.picks.grid.map(p => p.quad + ':' + (p.kind === 'photo' ? 'P:' : '') + p.rid + '@' + String(p.startSeconds ?? '').slice(0, 6))),
        },
        cuts: stEvalCuts(plan.schedule, frames, { sectionStart: s.music.sectionStart, music: s.music.kind === 'cue' ? s.music.cue.id : s.music.kind,
          approximate: !s.music.grid.accepted }),
      };
    },
  };
  return adapter;
}

function ST_SECTION_END(P) { return P.ST_SECTION_END_MARGIN; }
