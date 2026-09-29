#!/usr/bin/env node
// Offline driver fixtures from a footage folder: dev/fixtures/inventory.json (the inventory.js result shape) and
// dev/fixtures/search.json (the driver's search cache shape). Fake rids (r0, r1, ...), real durations and sizes from
// ffprobe, and a few synthetic scene-search hits per role chosen from the file name's mood (<mood>-<nn>-*.mp4).
// Only file names are written, never paths.
//   node plugins/the-end-credits/dev/make-fixtures.mjs <footage dir> [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('usage: make-fixtures.mjs <footage dir> [--out <dir>]'); process.exit(2); }
const oi = process.argv.indexOf('--out');
const out = oi > 0 ? process.argv[oi + 1] : path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures');
const ffprobe = process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffprobe') : 'ffprobe';
const probe = f => {
  const [w, h] = execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim().split(',').map(Number);
  const d = Number(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());
  return { width: w, height: h, duration: Math.round(d * 1000) / 1000 };
};
// Mood -> the scene-search roles it would answer well (planner TEC_SEARCH_QUERIES keys).
const ROLES = {
  ocean: ['water', 'wide'], beach: ['water', 'people'], rain: ['street', 'water'], sunset: ['sunset', 'water'], dusk: ['sunset', 'architecture'],
  desert: ['wide', 'sunset'], mountain: ['wide'], field: ['wide', 'sunset'], forest: ['wide'], road: ['street', 'people'], window: ['architecture', 'street'],
};
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

const files = fs.readdirSync(dir).filter(f => /\.(mp4|mov|jpe?g|png)$/i.test(f)).sort();
const resources = [], photos = [], list = [];
let n = 0;
files.forEach((f, i) => {
  const rid = 'r' + n++;
  const m = probe(path.join(dir, f));
  const recordedAt = '2026-09-' + String(12 + (i % 3)).padStart(2, '0') + 'T1' + (i % 10) + ':00:00Z';
  const aspect = Math.round(m.width / m.height * 1e6) / 1e6;
  if (/\.(jpe?g|png)$/i.test(f)) { photos.push({ rid, name: f, width: m.width, height: m.height, aspect, recordedAt, kind: 'photo' }); return; }
  resources.push({ rid, name: f, duration: m.duration, width: m.width, height: m.height, aspect, recordedAt, kind: 'video' });
  const mood = f.split('-')[0];
  for (const role of ROLES[mood] || ['wide']) for (let k = 0; k < 2; k++) {
    const t = Math.round((0.2 + 0.6 * hash(f + role + k)) * m.duration * 100) / 100;
    list.push({ rid, role, t, score: Math.round((0.3 + 0.3 * hash(role + f + k)) * 1000) / 1000, sourceDuration: m.duration });
  }
});
fs.mkdirSync(out, { recursive: true });
// One entry per line keeps the files small and diffable.
const rows = a => '[\n' + a.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n ]';
fs.writeFileSync(path.join(out, 'inventory.json'), '{\n "resources": ' + rows(resources) + ',\n "photos": ' + rows(photos) + ',\n "skipped": {"unanalysed":0,"missing":0}\n}\n');
fs.writeFileSync(path.join(out, 'search.json'), '{\n "failed": [],\n "list": ' + rows(list) + '\n}\n');
console.log(JSON.stringify({ out: path.basename(out), videos: resources.length, photos: photos.length, hits: list.length }));
