'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { collectTool } = require('../lib/process.cjs');

test('an oversized metadata stream is closed and its process reaped before rejection', async () => {
  let pid;
  await assert.rejects(collectTool(process.execPath, [
    '-e', 'process.stdout.write(Buffer.alloc(8 * 1024 * 1024));',
  ], { limit: 1024, onSpawn: spawned => { pid = spawned; } }), /metadata exceeds/);
  assert.ok(Number.isInteger(pid));
  assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
});

test('a failed metadata command is reaped before its failure is returned', async () => {
  let pid;
  await assert.rejects(collectTool(process.execPath, [
    '-e', 'process.stderr.write("fixture failure"); process.exit(7);',
  ], { onSpawn: spawned => { pid = spawned; } }), /exited 7: fixture failure/);
  assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
});
