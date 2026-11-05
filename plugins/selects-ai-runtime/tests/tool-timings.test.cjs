'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { collectTool, startTool } = require('../lib/process.cjs');
const { observeTool } = require('../lib/tool-timings.cjs');

test('observing first output preserves all bytes even when the reader attaches late', async () => {
  const metrics = {};
  const p = startTool(process.execPath, ['-e', "process.stdout.write(Buffer.alloc(1024*1024, 37))"], { metrics, operation: 'videoDecode' });
  await new Promise(resolve => setTimeout(resolve, 100));
  const chunks = []; for await (const bytes of p.child.stdout) chunks.push(bytes);
  await p.completed;
  assert.deepEqual(Buffer.concat(chunks), Buffer.alloc(1024*1024, 37));
  const m = metrics.videoDecode;
  assert.equal(m.calls, 1); assert.equal(m.spawned, 1); assert.equal(m.firstOutputCount, 1);
  assert.equal(m.noOutput, 0); assert.equal(m.failed, 0);
  assert.ok(m.spawnMilliseconds > 0 && m.firstOutputMilliseconds > 0 && m.afterOutputMilliseconds > 0);
  assert.ok(Math.abs(m.totalMilliseconds - m.spawnMilliseconds - m.firstOutputMilliseconds - m.afterOutputMilliseconds) < 0.001);
});
test('no output, nonzero exit and spawn error remain separately observable', async () => {
  const metrics = {};
  await collectTool(process.execPath, ['-e', ''], { metrics, operation: 'metadata' });
  await assert.rejects(collectTool(process.execPath, ['-e', 'process.exit(7)'], { metrics, operation: 'metadata' }));
  const missing = startTool('/missing/safe-fixture', [], { metrics, operation: 'metadata' });
  const closed = new Promise(resolve => missing.child.once('close', resolve));
  await assert.rejects(missing.completed); await closed;
  assert.equal(metrics.metadata.calls, 3); assert.equal(metrics.metadata.spawned, 2);
  assert.equal(metrics.metadata.firstOutputCount, 0); assert.equal(metrics.metadata.noOutput, 3);
  assert.equal(metrics.metadata.failed, 2); assert.equal(metrics.metadata.canceled, 0);
  assert.ok(!JSON.stringify(metrics).includes('/missing'));
});
test('canceled process is reaped and counted without changing cancellation behavior', async () => {
  const metrics = {}, controller = new AbortController(); let pid;
  const work = collectTool(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    metrics, operation: 'audioDecode', signal: controller.signal,
    onSpawn: value => { pid = value; setTimeout(() => controller.abort(), 40); },
  });
  await assert.rejects(work);
  assert.equal(metrics.audioDecode.canceled, 1); assert.equal(metrics.audioDecode.failed, 0);
  assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
});
test('unknown operation labels never enter numeric metrics', () => {
  const metrics = {}; assert.equal(observeTool(metrics, '/private/media.mp4'), undefined);
  assert.deepEqual(metrics, {});
});
