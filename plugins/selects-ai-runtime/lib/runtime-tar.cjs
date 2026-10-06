'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createGunzip } = require('node:zlib');
const { once } = require('node:events');

/** Restricted npm tar reader: regular files/directories only, no links or extended metadata. */
async function extractRuntimeTar(archive, destination, select, options = {}) {
  const { signal, maxExpandedBytes = 320 * 1024 * 1024, maxExtractedBytes = 100 * 1024 * 1024 } = options;
  const source = fs.createReadStream(archive);
  const unzip = createGunzip();
  source.on('error', error => unzip.destroy(error));
  source.pipe(unzip);
  const iterator = unzip[Symbol.asyncIterator]();
  let chunk = Buffer.alloc(0), offset = 0, expanded = 0, extracted = 0;
  const abort = () => { source.destroy(); unzip.destroy(signal.reason ?? new Error('Extraction canceled')); };
  signal?.addEventListener('abort', abort, { once: true });
  const seen = new Set(), written = [];
  async function consume(length, visit) {
    while (length > 0) {
      signal?.throwIfAborted();
      if (offset === chunk.length) {
        const next = await iterator.next();
        if (next.done) throw new Error('Truncated runtime archive');
        chunk = next.value; offset = 0; expanded += chunk.length;
        if (expanded > maxExpandedBytes) throw new Error('Runtime archive expansion exceeds its budget');
      }
      const take = Math.min(length, chunk.length - offset);
      await visit?.(chunk.subarray(offset, offset + take));
      offset += take; length -= take;
    }
  }
  function text(header, start, length) { return header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, ''); }
  function octal(header, start, length) {
    const value = text(header, start, length).trim();
    if (!/^[0-7]+$/.test(value)) throw new Error('Invalid runtime archive number');
    const number = parseInt(value, 8);
    if (!Number.isSafeInteger(number)) throw new Error('Invalid runtime archive size');
    return number;
  }
  try {
    await fsp.mkdir(destination, { recursive: true });
    for (let entries = 0; entries < 4096; entries++) {
      const header = Buffer.alloc(512); let position = 0;
      await consume(512, bytes => { bytes.copy(header, position); position += bytes.length; });
      if (header.every(byte => byte === 0)) break;
      const checksum = octal(header, 148, 8);
      let sum = 0;
      for (let index = 0; index < 512; index++) sum += index >= 148 && index < 156 ? 32 : header[index];
      if (sum !== checksum) throw new Error('Runtime archive header checksum mismatch');
      const prefix = text(header, 345, 155), filename = `${prefix ? `${prefix}/` : ''}${text(header, 0, 100)}`;
      if (!filename.startsWith('package/') || /[\\\x00-\x1f:]/.test(filename) ||
        filename.replace(/\/$/, '').split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part)))
        throw new Error('Unsafe runtime archive path');
      const key = filename.toLowerCase().replace(/\/$/, '');
      if (seen.has(key)) throw new Error('Duplicate runtime archive entry');
      seen.add(key);
      const type = header[156], size = octal(header, 124, 12);
      if (![0, 48, 53].includes(type) || (type === 53 && size !== 0)) throw new Error('Unsupported runtime archive entry type');
      const relative = filename.slice('package/'.length);
      if (type !== 53 && select(relative)) {
        extracted += size;
        if (extracted > maxExtractedBytes) throw new Error('Runtime extraction exceeds its budget');
        const output = path.join(destination, relative);
        await fsp.mkdir(path.dirname(output), { recursive: true });
        const writer = fs.createWriteStream(output, { flags: 'wx', mode: 0o644 });
        const closed = new Promise(resolve => writer.once('close', resolve));
        // Install an error handler before the first write, including zero-size files.
        const completed = new Promise((resolve, reject) => { writer.once('finish', resolve); writer.once('error', reject); });
        completed.catch(() => {});
        try {
          await consume(size, async bytes => { if (!writer.write(bytes)) await once(writer, 'drain'); });
          writer.end(); await completed; await closed;
        } catch (error) { writer.destroy(); await closed; throw error; }
        written.push(relative);
      } else await consume(size);
      await consume((512 - size % 512) % 512);
      if (entries === 4095) throw new Error('Too many runtime archive entries');
    }
    return written;
  } finally {
    signal?.removeEventListener('abort', abort);
    source.destroy(); unzip.destroy();
  }
}
module.exports = { extractRuntimeTar };
