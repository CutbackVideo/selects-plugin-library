// The recap-2026 panel's run_script strings type-check against the Selects SDK typings, the check
// Selects runs before a script (a script that reads a field of a source-file node before narrowing
// its `type` is rejected at run time). Typings: RECAP_SDK_TYPES, else ~/.selects/resources/sdk or
// ~/.selects-staging/resources/sdk; TypeScript: RECAP_TSC, else a locally resolvable one. Skips
// without them. RECAP_2026_PANEL overrides the panel path (to check that an older panel fails).
import test from 'node:test';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';

const panel = process.env.RECAP_2026_PANEL || path.resolve(import.meta.dirname, '../plugins/recap-2026/panel.tsx');
const sdk = [process.env.RECAP_SDK_TYPES, path.join(os.homedir(), '.selects', 'resources', 'sdk'), path.join(os.homedir(), '.selects-staging', 'resources', 'sdk')]
  .find((p) => p && fs.existsSync(path.join(p, 'project.d.ts')));
const tsc = (() => {
  if (process.env.RECAP_TSC) return process.env.RECAP_TSC;
  const require = createRequire(import.meta.url);
  for (const base of [process.cwd(), path.join(os.homedir(), 'Workspaces', 'cutback-client')]) {
    try { return JSON.stringify(process.execPath) + ' ' + JSON.stringify(require.resolve('typescript/bin/tsc', {paths: [base]})); } catch { /* next */ }
  }
  return null;
})();

// A JS string literal from the panel source (all are plain double-quoted strings with no interpolation).
const literal = (src, after) => {
  const at = src.indexOf(after);
  assert.ok(at >= 0, 'not found: ' + after);
  const m = /"((?:[^"\\]|\\.)*)"/.exec(src.slice(at + after.length));
  return JSON.parse('"' + m[1] + '"');
};

test('footage scripts type-check against the Selects SDK', {skip: !sdk || !tsc ? 'no SDK typings or TypeScript' : false}, () => {
  const src = fs.readFileSync(panel, 'utf8');
  const resources = literal(src, 'const RESOURCE_SECONDS = ');
  const bodies = {
    allVideos: literal(src, 'const allVideosScript = (projectId) => core({projectId}) + RESOURCE_SECONDS +'),
    folders: literal(src, 'const script = core({projectId,folders:folders.map((x)=>x.name)}) + RESOURCE_SECONDS +'),
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'recap-types-'));
  try {
    const files = fs.readdirSync(sdk).filter((n) => n.endsWith('.d.ts'));
    for (const n of files) fs.copyFileSync(path.join(sdk, n), path.join(tmp, n));
    for (const [name, body] of Object.entries(bodies)) {
      fs.writeFileSync(path.join(tmp, name + '.ts'), 'export {};\nasync function run(): Promise<unknown> {\nconst cfg: {projectId: string; folders: string[]} = {projectId: "p", folders: ["f"]};const p=selects.project(cfg.projectId);' + resources + body + '\n}\n');
      files.push(name + '.ts');
    }
    let out = '';
    try { cp.execSync(`${tsc} --noEmit --target es2022 --lib es2022 --skipLibCheck --pretty false ${files.join(' ')}`, {cwd: tmp, encoding: 'utf8', timeout: 180000}); }
    catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); }
    assert.equal(out, '', out);
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
});
