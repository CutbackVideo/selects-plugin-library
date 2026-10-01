#!/usr/bin/env node
// Per-kind and per-position checks over the build-driver records (rec-*.json) that readback expectations cannot
// express (their `effects` require the same count on every Main clip):
// - Letterbox reveal: exactly one on the opening (slot 0), none elsewhere.
// - Fade out: exactly one on the last slot, none elsewhere.
// - Photo motion: exactly one on every photo clip, none on video clips.
// - Shot motion: exactly one on every video clip but the opening, none on the opening or on photos.
// - Cinematic look: one on every clip with Look on, none with it off.
// - Clip sound Ambient / Full: every video clip at -18 / 0 dB (assemble.js leaves photos alone) and not unrouted.
// - Clip sound Off: every video clip whose source has an audio stream routes no sources ([]).
// Usage: node plugins/archive-vlog/dev/check-per-kind.mjs <driver --out folder> [rec-<key>-s<seed>.json ...]
// Prints one JSON line per record; exit 1 when any record fails or none was checked.
import fs from 'node:fs';
import path from 'node:path';

const [dir, ...only] = process.argv.slice(2);
if (!dir) { console.error('usage: check-per-kind.mjs <out dir> [rec files]'); process.exit(2); }
const files = only.length ? only : fs.readdirSync(dir).filter(f => /^rec-.*\.json$/.test(f));
let failed = 0, checked = 0;
for (const f of files) {
  const rec = JSON.parse(fs.readFileSync(path.join(dir, path.basename(f)), 'utf8'));
  if (!rec.readback || !rec.perKind || !rec.perKind.names) { console.log(JSON.stringify({ file: f, skipped: 'no readback or perKind' })); continue; }
  checked++;
  const { photoRids, names, look, clipSound, videoDb } = rec.perKind;
  const rb = rec.readback, photos = new Set(photoRids), has = rb.hasAudio || {};
  const rows = [...rb.rows].sort((a, b) => a.s - b.s);
  const last = rows.length - 1;
  const videos = rows.filter(r => !photos.has(r.rid));
  const checks = {}, notes = [];
  // Each rule: the expected count of an effect name on slot i.
  const rule = (key, name, want) => {
    const bad = rows.map((r, i) => ({ slot: i, rid: r.rid, found: r.fx.filter(x => x === name).length, expected: want(r, i) })).filter(x => x.found !== x.expected);
    checks[key] = bad.length === 0;
    if (bad.length) notes.push(name + ' mismatches ' + JSON.stringify(bad));
  };
  rule('letterbox', names.letterbox, (r, i) => (i === 0 ? 1 : 0));
  rule('fadeOut', names.fade, (r, i) => (i === last ? 1 : 0));
  rule('photoMotion', names.motion, r => (photos.has(r.rid) ? 1 : 0));
  rule('shotMotion', names.shot, (r, i) => (i > 0 && !photos.has(r.rid) ? 1 : 0));
  rule('look', names.look, () => (look ? 1 : 0));
  // Stacking order on the final shot: its motion first, the fade before the look.
  const fin = rows[last] ? rows[last].fx : [];
  if (look && fin.includes(names.fade)) {
    checks.fadeOrder = fin.indexOf(names.fade) < fin.indexOf(names.look);
    if (!checks.fadeOrder) notes.push('final shot effects in order ' + JSON.stringify(fin));
  }
  if (clipSound === 'off') {
    const bad = videos.filter(r => has[r.rid] && !(Array.isArray(r.asi) && r.asi.length === 0)).map(r => [r.rid, r.s, r.asi]);
    checks.clipSoundVideo = bad.length === 0;
    if (bad.length) notes.push('video clips with audio still routed ' + JSON.stringify(bad));
    if (!videos.some(r => has[r.rid])) notes.push('clip sound off: no used video clip has an audio stream, so the mute is vacuous');
  } else if (videoDb != null) {
    if (!rb.volumes) { checks.clipSoundVideo = false; notes.push('no clip volumes in the readback (run without --no-volumes)'); }
    else {
      const vol = rb.volumes.filter(v => v.kind === 'main');
      const bad = videos.map(r => ({ rid: r.rid, s: r.s, db: (vol.find(v => v.rid === r.rid && v.s === r.s) || {}).db, asi: r.asi }))
        .filter(x => x.db !== videoDb || (Array.isArray(x.asi) && x.asi.length === 0));
      checks.clipSoundVideo = videos.length > 0 && bad.length === 0;
      if (bad.length) notes.push('video clip levels ' + JSON.stringify(bad) + ', expected ' + videoDb + ' dB and routed');
    }
  }
  const pass = Object.values(checks).every(Boolean);
  if (!pass) failed++;
  console.log(JSON.stringify({ file: f, key: rec.key, seed: rec.seed, photoClips: rows.length - videos.length, videoClips: videos.length, pass, checks, notes }));
}
if (!checked) console.error('no record with a readback was checked in ' + dir);
process.exit(failed || !checked ? 1 : 0);
