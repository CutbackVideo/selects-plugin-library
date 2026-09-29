#!/usr/bin/env node
// Checks "Photo motion on every photo clip and on no video clip" in the build-driver records (rec-*.json), which
// readback expectations cannot express (their `effects` require the same count on every Main clip).
// Usage: node plugins/mini-vlog/dev/check-photo-motion.mjs <driver --out folder> [rec-<key>-s<seed>.json ...]
// Prints one JSON line per record; exit 1 when any record fails.
import fs from 'node:fs';
import path from 'node:path';

const [dir, ...only] = process.argv.slice(2);
if (!dir) { console.error('usage: check-photo-motion.mjs <out dir> [rec files]'); process.exit(2); }
const files = only.length ? only : fs.readdirSync(dir).filter(f => /^rec-.*\.json$/.test(f));
let failed = 0;
for (const f of files) {
  const rec = JSON.parse(fs.readFileSync(path.join(dir, path.basename(f)), 'utf8'));
  if (!rec.readback || !rec.photoMotion) { console.log(JSON.stringify({ file: f, skipped: 'no readback or photoMotion' })); continue; }
  const { name, photoRids } = rec.photoMotion;
  const photos = new Set(photoRids);
  const rows = [...rec.readback.rows].sort((a, b) => a.s - b.s);
  const bad = rows.map((r, i) => [i, r.rid, r.fx.filter(x => x === name).length, photos.has(r.rid) ? 1 : 0]).filter(([, , n, want]) => n !== want);
  const pass = bad.length === 0;
  if (!pass) failed++;
  console.log(JSON.stringify({ file: f, key: rec.key, seed: rec.seed, photoClips: rows.filter(r => photos.has(r.rid)).length, pass,
    ...(pass ? {} : { mismatches: bad.map(([slot, rid, n, want]) => ({ slot, rid, found: n, expected: want })) }) }));
}
process.exit(failed ? 1 : 0);
