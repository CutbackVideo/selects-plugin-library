#!/usr/bin/env node
// The panel's quick local check (panel.tsx `// quick-score:start` ... `// quick-score:end`, unchanged) run in node for the
// headless driver (dev/driveAdapter.mjs): the block's `io` seam gets ffmpeg from PATH (child_process, argv arrays, no
// shell) and node's fs, as tests/quick-score.test.cjs does, so the driver scores unanalysed clips exactly as the panel's
// Build does. Not shipped (dev/). The driver calls plan() synchronously, so the adapter runs this as a child process:
//   node dev/quick-score-node.cjs <plugin dir>   with stdin { resources: [{ rid, path, durationSeconds }], dataDir,
//   concurrency, budgetMs }   ->   stdout { results: [quickScore result, ...], ms }
// Without ffmpeg on PATH every clip gets the block's evenly spaced fallback windows (as an older Selects would).
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFile } = require('node:child_process');

// The quick-score block of a plugin's panel, loaded in its own context: { quickScoreAll, quickScore, ... }.
function loadQuickScore(pluginDir) {
  const panel = fs.readFileSync(path.join(pluginDir, 'panel.tsx'), 'utf8');
  const a = panel.indexOf('// quick-score:start'), b = panel.indexOf('// quick-score:end');
  if (a < 0 || b < a) throw Error('panel.tsx has no quick-score block');
  const ctx = { console, setTimeout, clearTimeout, AbortController, TextDecoder, Uint8Array, Map, Promise, Date, Math, JSON, Object, Number, String, Array, Error };
  vm.createContext(ctx);
  vm.runInContext(panel.slice(a, b) + '\nthis.Q = { quickScore, quickScoreAll, pickWindowsLocal, qsCandidates };', ctx);
  return ctx.Q;
}

// The host services the block needs, from node: ffmpeg on PATH and the file system.
function nodeIO() {
  return {
    runFFmpeg: (args, signal) => new Promise((resolve, reject) => {
      const p = execFile('ffmpeg', args, { maxBuffer: 16 * 1024 * 1024 }, (e) => (e ? reject(e) : resolve({})));
      if (signal) signal.addEventListener('abort', () => p.kill());
    }),
    readBytes: async (p) => new Uint8Array(fs.readFileSync(p)),
    remove: async (p) => { try { fs.unlinkSync(p); } catch { /* left behind */ } },
    join: (...p) => path.join(...p),
    mkdir: (d) => fs.mkdirSync(d, { recursive: true }),
    mtimeMs: (p) => fs.statSync(p).mtimeMs,
    readText: async (p) => fs.readFileSync(p, 'utf8'),
    writeText: async (p, t) => fs.writeFileSync(p, t),
  };
}

async function main() {
  const pluginDir = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const Q = loadQuickScore(pluginDir);
  const t0 = Date.now();
  const scores = await Q.quickScoreAll(input.resources, { io: nodeIO(), dataDir: input.dataDir, concurrency: input.concurrency, budgetMs: input.budgetMs });
  const results = input.resources.map((r) => scores.get(r.rid)).filter(Boolean);
  process.stdout.write(JSON.stringify({ results: JSON.parse(JSON.stringify(results)), ms: Date.now() - t0 }));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { loadQuickScore, nodeIO };
