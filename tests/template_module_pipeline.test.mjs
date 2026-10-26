import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const script = 'tools/prepare_template_modules.mjs';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-module-pipeline-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  for (const folder of ['shared', 'tools']) fs.cpSync(path.join(root, folder), path.join(directory, folder), {recursive: true});
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'shared/panel-modules.json')));
  const ids = new Set(['gongju-gallery']);
  for (const module of registry.modules) for (const key of ['targets', 'buildTimeTargets', 'fileTargets', 'compatibilityTargets']) {
    for (const target of module[key] || []) ids.add(target.split('/')[1]);
  }
  for (const id of ids) fs.cpSync(path.join(root, 'plugins', id), path.join(directory, 'plugins', id), {
    recursive: true,
    filter: file => fs.statSync(file).isDirectory() || /\.(?:tsx?|[cm]?js|json|py|css)$/.test(file),
  });
  const sentinel = path.join(directory, 'plugins/shortform-clips/panel.tsx');
  fs.mkdirSync(path.dirname(sentinel), {recursive: true});
  fs.writeFileSync(sentinel, 'foreign task sentinel');
  const run = (...args) => spawnSync(process.execPath, [path.join(directory, script), ...args], {
    cwd: directory, encoding: 'utf8', timeout: 60000,
    env: {...process.env, SELECTS_DEV_REPO: process.env.SELECTS_DEV_REPO || root},
  });
  const contents = () => {
    const files = {};
    function visit(folder) {
      for (const entry of fs.readdirSync(folder, {withFileTypes: true})) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) visit(file);
        else files[path.relative(directory, file)] = fs.readFileSync(file).toString('base64');
      }
    }
    visit(directory);
    return files;
  };
  return {directory, run, contents, sentinel};
}

test('one command rebuilds all managed delivery paths, is repeatable, and leaves excluded plugins alone', t => {
  const f = fixture(t);
  const file = name => path.join(f.directory, name);
  for (const target of ['plugins/gongju-gallery/panel.tsx', 'plugins/photo-gallery-no2/input-facts.generated.mjs', 'plugins/mini-vlog/scripts/assemble.js']) {
    fs.writeFileSync(file(target), fs.readFileSync(file(target), 'utf8') + '\n// stale generated artifact\n');
  }
  // Drift inside a managed block must be repaired along with downstream artifacts.
  const recap = file('plugins/recap-2026/panel.tsx');
  fs.writeFileSync(recap, fs.readFileSync(recap, 'utf8').replace('// cover-focus:start\n', '// cover-focus:start\n// stale shared copy\n'));
  for(const id of ['mini-vlog','archive-vlog']) {
    const panel=file('plugins/'+id+'/panel.tsx');
    fs.writeFileSync(panel,fs.readFileSync(panel,'utf8').replace(/const PLUGIN_VERSION = "[^"]+";/,'const PLUGIN_VERSION = "0.0.0";'));
  }
  const first = f.run();
  assert.equal(first.status, 0, first.stdout + first.stderr);
  for(const id of ['mini-vlog','archive-vlog']) {
    const manifest=JSON.parse(fs.readFileSync(file('plugins/'+id+'/plugin.json'),'utf8'));
    const version=/const PLUGIN_VERSION = "([^"]+)";/.exec(fs.readFileSync(file('plugins/'+id+'/panel.tsx'),'utf8'))?.[1];
    assert.equal(version,manifest.version,'prepare must deliver the manifest version before panel source fingerprints are used');
  }
  const prepared = f.contents();
  const check = f.run('--check');
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.deepEqual(f.contents(), prepared, 'check mode must never repair artifacts');
  const second = f.run();
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.deepEqual(f.contents(), prepared, 'a repeated prepare must produce identical bytes');
  assert.equal(fs.readFileSync(f.sentinel, 'utf8'), 'foreign task sentinel');
});

test('check rejects missed generation at each boundary without rewriting the checkout', async t => {
  const f = fixture(t);
  const clean = f.run();
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  const cases = [
    ['Mini version', 'plugins/mini-vlog/panel.tsx', source => source.replace(/const PLUGIN_VERSION = "[^"]+";/,'const PLUGIN_VERSION = "0.0.0";')],
    ['Archive version', 'plugins/archive-vlog/panel.tsx', source => source.replace(/const PLUGIN_VERSION = "[^"]+";/,'const PLUGIN_VERSION = "0.0.0";')],
    ['shared block', 'plugins/recap-2026/panel.tsx', source => source.replace('// cover-focus:start\n', '// cover-focus:start\n// missed sync\n')],
    ['duration block', 'plugins/gongju-gallery/panel.tsx', source => source.replace('// media-duration:start\n', '// media-duration:start\n// missed sync\n')],
    ['private Panel adapter', 'plugins/camera-shutter-dump/panel.tsx', source => source.replace('// local-sdk:start\n', '// local-sdk:start\n// missed adapter sync\n')],
    ['Gallery helper', 'plugins/photo-gallery-no2/input-facts.generated.mjs', source => source + '\n// stale helper\n'],
    ['Gallery authoring helper', 'plugins/photo-gallery-no2/authoring.generated.mjs', source => source + '\n// stale helper\n'],
    ['Gallery panel', 'plugins/photo-gallery-no2/panel.tsx', source => source + '\n// stale panel\n'],
    ['Mini operation', 'plugins/mini-vlog/scripts/assemble.js', source => source + '\n// stale operation\n'],
    ['Archive operation', 'plugins/archive-vlog/scripts/decorate.js', source => source + '\n// stale operation\n'],
    ['Chris source section', 'plugins/chris-williamson-style/src/broll.tsx', source => source + '\n// new source section\n'],
  ];
  for (const [label, target, mutate] of cases) await t.test(label, () => {
    const file = path.join(f.directory, target), original = fs.readFileSync(file, 'utf8');
    try {
      fs.writeFileSync(file, mutate(original));
      const before = f.contents(), result = f.run('--check');
      assert.notEqual(result.status, 0, 'missing generation must fail: ' + label);
      assert.match(result.stdout + result.stderr, /out.of.date|stale/i);
      assert.deepEqual(f.contents(), before, 'failed check must not hide the missed generation');
    } finally { fs.writeFileSync(file, original); }
  });
});

test('a new registered builder needs explicit delivery ownership before any file is changed', t => {
  const f = fixture(t), registryFile = path.join(f.directory, 'shared/panel-modules.json');
  const registry = JSON.parse(fs.readFileSync(registryFile));
  registry.modules[0].buildTimeTargets.push('plugins/new-template/build-panel.mjs');
  fs.writeFileSync(registryFile, JSON.stringify(registry));
  const before = f.contents(), result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No delivery pipeline for registered builder/);
  assert.deepEqual(f.contents(), before);
});

test('unknown options fail before any builder changes files', t => {
  const f = fixture(t), before = f.contents();
  const result = f.run('--repair-all');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
  assert.deepEqual(f.contents(), before);
});

test('invalid version provenance stops prepare before any other artifact generation',t=>{
 const f=fixture(t),manifestFile=path.join(f.directory,'plugins/archive-vlog/plugin.json');
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));manifest.version='not-a-version';fs.writeFileSync(manifestFile,JSON.stringify(manifest));
 const before=f.contents(),result=f.run();assert.notEqual(result.status,0);assert.match(result.stderr,/Invalid manifest version/);assert.deepEqual(f.contents(),before);
});
