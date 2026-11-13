'use strict';
const { spawn } = require('node:child_process');
const { throwIfAborted } = require('./errors.cjs');
const { observeTool } = require('./tool-timings.cjs');

function startTool(executable, args, { signal, onSpawn, onStderr, stdin = false, limit = 64 * 1024 * 1024, metrics, operation } = {}) {
  throwIfAborted(signal);
  const timing = observeTool(metrics, operation, signal);
  let child;
  try { child = spawn(executable, args, { shell: false, windowsHide: true, stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'] }); }
  catch (error) { timing?.close(false); throw error; }
  timing?.attach(child);
  onSpawn?.(child.pid);
  let stderr = '';
  child.stderr.on('data', bytes => {
    stderr = (stderr + bytes.toString()).slice(-8192);
    onStderr?.(bytes);
  });
  const abort = () => child.kill('SIGKILL');
  signal?.addEventListener('abort', abort, { once: true });
  const completed = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, termSignal) => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) {
        try { throwIfAborted(signal); } catch (error) { reject(error); }
      } else if (code !== 0) reject(new Error(`Media tool exited ${code ?? termSignal}: ${stderr}`));
      else resolve();
    });
  });
  // An early process exit is also observed after stdout is consumed.
  completed.catch(() => {});
  return { child, completed, limit };
}

async function collectToolBytes(executable, args, options) {
  const process = startTool(executable, args, options);
  let length = 0;
  const chunks = [];
  try {
    for await (const bytes of process.child.stdout) {
      length += bytes.length;
      if (length > process.limit) throw new Error('Media metadata exceeds the PoC output bound');
      chunks.push(bytes);
    }
    await process.completed;
    return Buffer.concat(chunks);
  } finally {
    // A metadata bound/read error must finish reaping its own process before
    // returning. Close unread stdout before awaiting the ChildProcess close.
    if (process.child.exitCode === null) process.child.kill('SIGKILL');
    process.child.stdout.destroy();
    await process.completed.catch(() => {});
  }
}
async function collectTool(executable, args, options) {
  return (await collectToolBytes(executable, args, options)).toString('utf8');
}

module.exports = { startTool, collectTool, collectToolBytes };
