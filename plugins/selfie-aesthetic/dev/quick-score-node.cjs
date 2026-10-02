#!/usr/bin/env node
// Runs the panel's quick-score block (panel.tsx `// quick-score:start/end`, the kit's tools/panel/quick-score.js
// verbatim) in node, with the local ffmpeg behind the block's own `io` seam: the same decode argv, the same maths and
// the same per-clip cache as the panel's Build. Used by the headless driver (dev/driver-adapter.mjs runs it as a child
// process, because the kit driver calls adapter.plan() synchronously and quickScore is async) and for offline timing.
//
// Usage:
//   node quick-score-node.cjs [--concurrency 3] [--budget 20000] [--data <dir>] <video>...   timing table + JSON
//   echo '{"resources":[{"rid","path","durationSeconds"}],"dataDir":..,"concurrency":3,"budgetMs":20000}' | node quick-score-node.cjs --stdin
//     -> stdout { results: { [rid]: quickScore result }, ms }
// ffmpeg / ffprobe come from FFMPEG_DIR or PATH. Without --data a fresh temporary data folder is used (no cache hits).
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const { execFile, execFileSync } = require('node:child_process');

const tool = (name) => (process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, name) : name);

// The block's functions from panel.tsx source, in a node:vm context with only what the block needs.
function loadBlock(panelSrc) {
  const a = panelSrc.indexOf('// quick-score:start'), b = panelSrc.indexOf('// quick-score:end');
  if (a < 0 || b < a) throw Error('panel.tsx has no quick-score block');
  const ctx = { console, setTimeout, clearTimeout, AbortController, TextDecoder, Uint8Array, Map, Promise, Date, Math, JSON, Object, Number, String, Array, Error };
  vm.createContext(ctx);
  vm.runInContext(panelSrc.slice(a, b) + '\nthis.Q = { quickScore, quickScoreAll, pickWindowsLocal, qsCandidates, QS_HEAD, QS_BIN, QS_FPS, QS_W, QS_H, QS_VERSION };', ctx);
  return ctx.Q;
}

// The host services the block asks for (qsHostIO's shape), on node fs and the local ffmpeg.
function nodeIO() {
  return {
    runFFmpeg: (args, signal) => new Promise((resolve, reject) => {
      const p = execFile(tool('ffmpeg'), args, { maxBuffer: 1 << 20 }, (e) => (e ? reject(e) : resolve({})));
      if (signal) signal.addEventListener('abort', () => p.kill());
    }),
    readBytes: async (p) => new Uint8Array(fs.readFileSync(p)),
    remove: async (p) => { try { fs.unlinkSync(p); } catch (e) { /* not written */ } },
    join: (...p) => path.join(...p),
    mkdir: (d) => fs.mkdirSync(d, { recursive: true }),
    mtimeMs: (p) => fs.statSync(p).mtimeMs,
    readText: async (p) => fs.readFileSync(p, 'utf8'),
    writeText: async (p, t) => fs.writeFileSync(p, t),
  };
}

async function scoreAll(Q, resources, { dataDir, concurrency, budgetMs } = {}) {
  const t0 = Date.now();
  const map = await Q.quickScoreAll(resources, { io: nodeIO(), dataDir, concurrency: concurrency || 3, budgetMs: budgetMs == null ? 20000 : budgetMs });
  const results = {};
  for (const [rid, r] of map) results[rid] = JSON.parse(JSON.stringify(r));
  return { results, ms: Date.now() - t0 };
}

function probeDuration(file) {
  const out = execFileSync(tool('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return Number(out.trim());
}

module.exports = { loadBlock, nodeIO, scoreAll };

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    const opt = (name, dflt) => { const i = argv.indexOf(name); if (i < 0) return dflt; const v = argv[i + 1]; argv.splice(i, 2); return v; };
    const panel = fs.readFileSync(path.join(__dirname, '..', 'panel.tsx'), 'utf8');
    const Q = loadBlock(panel);
    if (argv.includes('--stdin')) {
      const input = JSON.parse(fs.readFileSync(0, 'utf8'));
      const out = await scoreAll(Q, input.resources || [], input);
      process.stdout.write(JSON.stringify(out));
      return;
    }
    const concurrency = Number(opt('--concurrency', 3)), budgetMs = Number(opt('--budget', 20000));
    const dataDir = opt('--data', null) || fs.mkdtempSync(path.join(os.tmpdir(), 'sae-qs-'));
    const files = argv.filter((a) => !a.startsWith('--'));
    const resources = files.map((f, i) => ({ rid: 'v' + i + '-' + path.basename(f).replace(/[^A-Za-z0-9_-]/g, '_'), path: path.resolve(f), durationSeconds: probeDuration(f) }));
    const { results, ms } = await scoreAll(Q, resources, { dataDir, concurrency, budgetMs });
    const rows = resources.map((r) => { const x = results[r.rid]; return { file: path.basename(r.path), seconds: Math.round(r.durationSeconds * 10) / 10, ms: x.ms, fallback: x.fallback, cached: x.cached, bins: x.windows.length, cuts: x.sceneCuts.length }; });
    for (const r of rows) console.log([r.file.padEnd(22), String(r.seconds).padStart(6) + ' s', String(r.ms).padStart(6) + ' ms', r.fallback ? 'FALLBACK' : r.cached ? 'cached' : 'decoded', r.bins + ' bins', r.cuts + ' cuts'].join('  '));
    const per = rows.map((r) => r.ms);
    console.log(JSON.stringify({ clips: rows.length, concurrency, wallMs: ms, sumMs: per.reduce((a, b) => a + b, 0), maxMs: Math.max(...per), meanMs: Math.round(per.reduce((a, b) => a + b, 0) / per.length), fallback: rows.filter((r) => r.fallback).length }));
  })().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
}
