'use strict';
const { spawn } = require('node:child_process');
const { throwIfAborted } = require('./errors.cjs');

function startTool(executable, args, { signal, onSpawn, stdin = false, limit = 64 * 1024 * 1024 } = {}) {
  throwIfAborted(signal);
  const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
  onSpawn?.(child.pid);
  let stderr = '';
  child.stderr.on('data', bytes => { stderr = (stderr + bytes.toString()).slice(-8192); });
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

async function collectTool(executable, args, options) {
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
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    // A metadata bound/read error must finish reaping its own process before
    // returning. Close unread stdout before awaiting the ChildProcess close.
    if (process.child.exitCode === null) process.child.kill('SIGKILL');
    process.child.stdout.destroy();
    await process.completed.catch(() => {});
  }
}
module.exports = { startTool, collectTool };
