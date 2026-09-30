#!/usr/bin/env node
// Per-kind checks over the build-driver records (rec-*.json) that readback expectations cannot express (their
// `effects` and `clipSound` require the same value on every Main clip, but photos differ from video clips):
// - Photo motion: exactly one on every photo clip, none on video clips.
// - Beat punch (records with perKind.punchName): with Beat punch on, exactly one on every video clip and none on photo
//   clips; off, none anywhere; and decorate.js reported no clip as skipped (rec.decorate.punch.skipped).
// - Clip sound Ambient / Full: every video clip at -18 / 0 dB (assemble.js leaves photos alone) and not unrouted.
// - Clip sound Off: every video clip whose source has an audio stream routes no sources ([]).
// Usage: node plugins/mini-vlog/dev/check-per-kind.mjs <driver --out folder> [rec-<key>-s<seed>.json ...]
// Prints one JSON line per record; exit 1 when any record fails or none was checked.
import fs from 'node:fs';
import path from 'node:path';

const [dir, ...only] = process.argv.slice(2);
if (!dir) { console.error('usage: check-per-kind.mjs <out dir> [rec files]'); process.exit(2); }
const files = only.length ? only : fs.readdirSync(dir).filter(f => /^rec-.*\.json$/.test(f));
let failed = 0, checked = 0;
for (const f of files) {
  const rec = JSON.parse(fs.readFileSync(path.join(dir, path.basename(f)), 'utf8'));
  if (!rec.readback || !rec.perKind) { console.log(JSON.stringify({ file: f, skipped: 'no readback or perKind' })); continue; }
  checked++;
  const { photoRids, motionName, clipSound, videoDb, punchName, punch } = rec.perKind;
  const rb = rec.readback, photos = new Set(photoRids), has = rb.hasAudio || {};
  const rows = [...rb.rows].sort((a, b) => a.s - b.s);
  const videos = rows.filter(r => !photos.has(r.rid));
  const checks = {}, notes = [];
  const motionBad = rows.map((r, i) => ({ slot: i, rid: r.rid, found: r.fx.filter(x => x === motionName).length, expected: photos.has(r.rid) ? 1 : 0 })).filter(x => x.found !== x.expected);
  checks.photoMotion = motionBad.length === 0;
  if (motionBad.length) notes.push('photo motion mismatches ' + JSON.stringify(motionBad));
  if (punchName) {
    const punchBad = rows.map((r, i) => ({ slot: i, rid: r.rid, found: r.fx.filter(x => x === punchName).length, expected: punch && !photos.has(r.rid) ? 1 : 0 })).filter(x => x.found !== x.expected);
    // decorate.js reports clips it could not match to their pick (rid mismatch) as skipped; they get no punch.
    const decPunch = rec.decorate && rec.decorate.punch;
    checks.beatPunch = punchBad.length === 0 && !(decPunch && decPunch.skipped > 0);
    if (punchBad.length) notes.push('beat punch mismatches ' + JSON.stringify(punchBad));
    if (decPunch && decPunch.skipped > 0) notes.push('decorate skipped Beat punch on ' + decPunch.skipped + ' clip(s) (added ' + decPunch.added + ', kept ' + decPunch.kept + ')');
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
