'use strict';
// Job-local numeric aggregates. Never inspect executable, arguments or output.
const OPERATIONS = new Set(['metadata', 'frameTimeline', 'videoDecode', 'audioDecode', 'imageDecode', 'toolVersion']);
function observeTool(metrics, operation, signal) {
  if (!metrics || !OPERATIONS.has(operation)) return;
  const row = metrics[operation] ??= { calls: 0, spawned: 0, spawnMilliseconds: 0,
    firstOutputCount: 0, firstOutputMilliseconds: 0, afterOutputMilliseconds: 0,
    totalMilliseconds: 0, failed: 0, canceled: 0, noOutput: 0 };
  const began = performance.now(); row.calls++;
  let spawned, first, closed = false;
  const close = succeeded => {
    if (closed) return;
    closed = true;
    const end = performance.now();
    row.totalMilliseconds += end - began;
    if (first !== undefined) row.afterOutputMilliseconds += end - first;
    else row.noOutput++;
    if (signal?.aborted) row.canceled++;
    else if (!succeeded) row.failed++;
  };
  return { close, attach(child) {
    child.once('spawn', () => { spawned = performance.now(); row.spawned++; row.spawnMilliseconds += spawned - began; });
    // A data listener would make stdout flow before its consumer is ready.
    // readable observes buffered bytes without reading or changing byte order.
    child.stdout.once('readable', () => {
      if (!child.stdout.readableLength) return;
      first = performance.now(); row.firstOutputCount++;
      row.firstOutputMilliseconds += first - (spawned ?? began);
    });
    child.once('close', code => close(code === 0));
  } };
}
module.exports = { observeTool };
