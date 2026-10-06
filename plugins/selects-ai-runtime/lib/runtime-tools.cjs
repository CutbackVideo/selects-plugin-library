'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

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
module.exports = { resolveRuntimeTool };
