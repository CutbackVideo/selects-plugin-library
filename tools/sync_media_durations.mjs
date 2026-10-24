// Panels ship independently. Inline this helper only into the reviewed consumers.
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['gongju-gallery', 'recap-2026'];
const check = process.argv.includes('--check');
if (process.argv.slice(2).some(arg => arg !== '--check')) throw Error('Usage: node tools/sync_media_durations.mjs [--check]');
const start = '// media-duration:start', end = '// media-duration:end';
const source = readFileSync(path.join(root, 'shared/media-duration.js'), 'utf8').trimEnd();
const snippet = start + '\n' + source + '\n' + end;
let stale = false;
for (const id of targets) {
  const filename = path.join(root, 'plugins', id, 'panel.tsx');
  const panel = readFileSync(filename, 'utf8');
  const begin = panel.indexOf(start), finish = panel.indexOf(end);
  if (begin < 0 || finish < begin) throw Error(`Missing media-duration markers: ${id}`);
  const updated = panel.slice(0, begin) + snippet + panel.slice(finish + end.length);
  if (updated !== panel) {
    stale = true;
    if (check) console.error(`Out-of-date media duration helper: ${id}`);
    else writeFileSync(filename, updated);
  }
}
if (check && stale) process.exitCode = 1;
else console.log(`${check ? 'Checked' : 'Synced'} media duration helpers in ${targets.length} panels.`);
