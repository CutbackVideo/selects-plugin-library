'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createGunzip } = require('node:zlib');
const { once } = require('node:events');

/** Read only the pinned Node executable and license from a previously verified archive. */
async function extractNodeRuntimeArchive(archive, destination, options = {}) {
  const { signal, version = '24.18.0', platform = 'darwin-arm64',
    maxExpandedBytes = 256 * 1024 * 1024, maxExtractedBytes = 160 * 1024 * 1024,
    maxEntries = 8192 } = options;
  if (!/^\d+\.\d+\.\d+$/.test(version) || platform !== 'darwin-arm64') throw new Error('Unsupported Node archive identity');
  const archiveStat = await fsp.lstat(archive);
  if (!archiveStat.isFile() || archiveStat.isSymbolicLink()) throw new Error('Node archive is not a regular file');
  signal?.throwIfAborted();
  await fsp.mkdir(destination, { recursive: true });
  const destinationStat = await fsp.lstat(destination);
  if (!destinationStat.isDirectory() || destinationStat.isSymbolicLink()) throw new Error('Invalid Node archive destination');
  const source = fs.createReadStream(archive), unzip = createGunzip();
  source.on('error', error => unzip.destroy(error)); source.pipe(unzip);
  const iterator = unzip[Symbol.asyncIterator]();
  let chunk = Buffer.alloc(0), offset = 0, expanded = 0, extracted = 0;
  const abort = () => { source.destroy(); unzip.destroy(signal.reason ?? new Error('Node extraction canceled')); };
  signal?.addEventListener('abort', abort, { once: true });
  async function consume(length, visit) {
    while (length > 0) {
      signal?.throwIfAborted();
      if (offset === chunk.length) {
        const next = await iterator.next();
        if (next.done) throw new Error('Truncated Node runtime archive');
        chunk = next.value; offset = 0; expanded += chunk.length;
        if (expanded > maxExpandedBytes) throw new Error('Node archive expansion exceeds its budget');
      }
      const take = Math.min(length, chunk.length - offset);
      await visit?.(chunk.subarray(offset, offset + take)); offset += take; length -= take;
    }
  }
  const text = (header, start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
  function octal(header, start, length) {
    const value = text(header, start, length).trim();
    if (!/^[0-7]+$/.test(value)) throw new Error('Invalid Node archive number');
    const number = parseInt(value, 8);
    if (!Number.isSafeInteger(number)) throw new Error('Invalid Node archive size');
    return number;
  }
  const prefix = `node-v${version}-${platform}/`, seen = new Set(), written = [];
  try {
    for (let entries = 0; entries < maxEntries; entries++) {
      const header = Buffer.alloc(512); let position = 0;
      await consume(512, bytes => { bytes.copy(header, position); position += bytes.length; });
      if (header.every(byte => byte === 0)) break;
      let checksum = 0;
      for (let index = 0; index < 512; index++) checksum += index >= 148 && index < 156 ? 32 : header[index];
      if (checksum !== octal(header, 148, 8)) throw new Error('Node archive header checksum mismatch');
      const directory = text(header, 345, 155), filename = `${directory ? `${directory}/` : ''}${text(header, 0, 100)}`;
      if (!filename.startsWith(prefix) || /[\\\x00-\x1f:]/.test(filename) ||
        filename.replace(/\/$/, '').split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part)))
        throw new Error('Unsafe Node runtime archive path');
      const key = filename.toLowerCase().replace(/\/$/, '');
      if (seen.has(key)) throw new Error('Duplicate Node archive entry');
      seen.add(key);
      const type = header[156], size = octal(header, 124, 12);
      if (![0, 48, 53].includes(type) || (type === 53 && size !== 0)) throw new Error('Unsupported Node archive entry type');
      const relative = filename.slice(prefix.length);
      if (relative === 'bin/node' || relative === 'LICENSE') {
        if (type === 53) throw new Error('Node runtime file is a directory');
        extracted += size;
        if (size === 0 || extracted > maxExtractedBytes) throw new Error('Node extraction exceeds its budget');
        const output = path.join(destination, relative);
        await fsp.mkdir(path.dirname(output), { recursive: true });
        const parent = await fsp.lstat(path.dirname(output));
        if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error('Linked Node extraction directory');
        const writer = fs.createWriteStream(output, { flags: 'wx', mode: relative === 'bin/node' ? 0o755 : 0o644 });
        const closed = new Promise(resolve => writer.once('close', resolve));
        const completed = new Promise((resolve, reject) => { writer.once('finish', resolve); writer.once('error', reject); });
        completed.catch(() => {});
        try {
          await consume(size, async bytes => { if (!writer.write(bytes)) await once(writer, 'drain'); });
          writer.end(); await completed; await closed;
          // Explicit permissions survive restrictive umasks in plugin worker environments.
          await fsp.chmod(output, relative === 'bin/node' ? 0o755 : 0o644);
        } catch (error) { writer.destroy(); await closed; throw error; }
        written.push(relative);
      } else await consume(size);
      await consume((512 - size % 512) % 512);
      // The complete compressed archive was hash checked before this reader was called.
      // Stop before unrelated npm links and headers; only these two regular files are executable input.
      if (written.length === 2) return written;
    }
    throw new Error('Incomplete Node runtime archive');
  } finally {
    signal?.removeEventListener('abort', abort); source.destroy(); unzip.destroy();
  }
}
module.exports = { extractNodeRuntimeArchive };
