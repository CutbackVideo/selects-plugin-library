import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { buildScript, SCRIPT_PREFIX } from './operation-builder.mjs';

test('installed panel contains the exact shared operation prefix', () => {
  const template = readFileSync(new URL('./panel.template.tsx', import.meta.url), 'utf8');
  const installed = readFileSync(new URL('./panel.tsx', import.meta.url), 'utf8');
  const expected = template.replace('/*__SHARED_SCRIPT_BUILDER__*/',
    `const SCRIPT_PREFIX = ${JSON.stringify(SCRIPT_PREFIX)};\nconst buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';`);
  assert.notEqual(expected, template);
  assert.equal(installed, expected);
});

test('chat CLI emits the same script as the panel builder', () => {
  const input = { operation: 'inspect', projectId: 'project-1' };
  const cli = spawnSync(process.execPath, [new URL('./build-script.mjs', import.meta.url).pathname],
    { input: JSON.stringify(input), encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(cli.stdout, buildScript(input));
});
