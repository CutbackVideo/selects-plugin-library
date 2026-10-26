// One delivery pipeline for registered Clip Highlights modules and their derived
// artifacts. Check mode never generates: a missed build must remain a CI failure.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => arg !== '--check')) {
  console.error('Usage: node tools/prepare_template_modules.mjs [--check]');
  process.exit(1);
}
const checkOnly = args.includes('--check');
const generators = [
  'plugins/mini-vlog/operation-builder.mjs',
  'plugins/archive-vlog/operation-builder.mjs',
  'plugins/photo-gallery-no2/build-panel.mjs',
];
const registry = JSON.parse(readFileSync(path.join(root, 'shared/panel-modules.json'), 'utf8'));
for (const module of registry.modules) for (const target of module.buildTimeTargets || []) {
  if (!generators.includes(target)) throw Error('No delivery pipeline for registered builder: ' + target);
}
const localConsumers = 'no14-still-video,camera-shutter-dump,four-photo-stop-motion,polaroid-photo-dump,photo-gallery-no2,mini-vlog,archive-vlog';
const steps = [
  [process.execPath, ['tools/build_file_observation.mjs']],
  [process.execPath, ['tools/sync_panel_modules.mjs']],
  [process.execPath, ['tools/sync_media_durations.mjs']],
  [process.execPath, ['tools/sync_panel_local_client.mjs', '--only=' + localConsumers]],
  ...generators.map(file => [process.execPath, [file]]),
  ['python3', ['plugins/chris-williamson-style/build.py', 'plugins/chris-williamson-style/panel.tsx']],
];
const env = {...process.env, SELECTS_DEV_REPO: process.env.SELECTS_DEV_REPO || root};
function run(check) {
  for (const [command, argv] of steps) {
    console.log((check ? 'Check: ' : 'Prepare: ') + argv[0]);
    const result = spawnSync(command, [...argv, ...(check ? ['--check'] : [])], {cwd: root, env, stdio: 'inherit'});
    if (result.error || result.status !== 0) {
      if (result.error) console.error(result.error.message);
      console.error('Template module delivery failed. Run npm run templates:prepare, review its changes, then retry.');
      process.exit(result.status || 1);
    }
  }
}
if (!checkOnly) run(false);
run(true);
console.log('Template module delivery is up to date.');
