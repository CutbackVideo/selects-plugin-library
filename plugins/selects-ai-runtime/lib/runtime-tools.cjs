'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { collectTool } = require('./process.cjs');
const { throwIfAborted } = require('./errors.cjs');

/** Production supplies absolute app paths; development may supply a bare media CLI. */
async function resolveRuntimeTool(command, environment = process.env) {
  const candidates = path.isAbsolute(command) ? [command] :
    /^[a-z0-9_.-]+$/i.test(command) ? (environment.PATH ?? '').split(path.delimiter).filter(Boolean)
      .map(directory => path.join(directory, process.platform === 'win32' && !command.endsWith('.exe') ? `${command}.exe` : command)) : [];
  for (const candidate of candidates) {
    try {
      const resolved = await fs.realpath(candidate);
      if ((await fs.stat(resolved)).isFile()) return resolved;
    } catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
  }
  throw new Error(`Media tool is unavailable: ${command}`);
}
async function inspectRuntimeTool(executable, { signal, metrics, prepared } = {}) {
  throwIfAborted(signal);
  // Prepared tools have resolved absolute paths. Older/manual configs may
  // still use a bare command, which keeps the original version probe.
  let identity;
  if (path.isAbsolute(executable)) {
    const stat = await fs.stat(executable);
    if (stat.isFile()) {
      identity = JSON.stringify([executable, stat.dev, stat.ino, stat.size,
        stat.mode, stat.mtimeMs, stat.ctimeMs]);
    }
  }
  throwIfAborted(signal);
  if (identity && prepared?.identity === identity && typeof prepared.version === 'string') return prepared;
  const output = await collectTool(executable, ['-version'], {
    signal, metrics, operation: 'toolVersion', limit: 256 * 1024,
  });
  return { identity, version: output.split('\n')[0] };
}

module.exports = { resolveRuntimeTool, inspectRuntimeTool };
