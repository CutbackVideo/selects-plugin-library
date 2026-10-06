'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

async function digestFile(filename, algorithm = 'sha256') {
  const stat = await fsp.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Asset is not a regular file');
  const hash = crypto.createHash(algorithm);
  for await (const bytes of fs.createReadStream(filename)) hash.update(bytes);
  return hash.digest(algorithm === 'sha512' ? 'base64' : 'hex');
}

async function matchesAsset(filename, asset) {
  try {
    const stat = await fsp.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== asset.size) return false;
    const algorithm = asset.integrity ? 'sha512' : 'sha256';
    const expected = asset.integrity?.slice('sha512-'.length) ?? asset.sha256;
    return await digestFile(filename, algorithm) === expected;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

/** Exact pinned size bounds both downloads and disk use; the digest covers the bytes actually written. */
async function downloadAsset(asset, destination, options = {}) {
  const { signal, emit = () => {}, step = 'download', fetch: fetchLike = fetch } = options;
  signal?.throwIfAborted();
  if (await matchesAsset(destination, asset)) return destination;
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${crypto.randomUUID()}.part`;
  let received = 0, reported = 0;
  const algorithm = asset.integrity ? 'sha512' : 'sha256';
  const hash = crypto.createHash(algorithm);
  try {
    const response = await fetchLike(asset.url, {
      signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(600000)]),
      redirect: 'follow',
    });
    if (!response.ok || !response.body || !response.url.startsWith('https:')) throw new Error(`Asset download failed: HTTP ${response.status}`);
    const counter = new Transform({ transform(bytes, _encoding, callback) {
      received += bytes.length;
      if (received > asset.size) { callback(new Error('Asset exceeds its pinned size')); return; }
      hash.update(bytes);
      if (received - reported >= 1048576) { reported = received; emit({ step, completed: received, total: asset.size }); }
      callback(null, bytes);
    } });
    await pipeline(Readable.fromWeb(response.body), counter, fs.createWriteStream(temporary, { flags: 'wx' }), { signal });
    const expected = asset.integrity?.slice('sha512-'.length) ?? asset.sha256;
    if (received !== asset.size || hash.digest(algorithm === 'sha512' ? 'base64' : 'hex') !== expected)
      throw new Error('Asset checksum or size mismatch');
    signal?.throwIfAborted();
    if (!(await matchesAsset(destination, asset))) await fsp.rename(temporary, destination);
    emit({ step, completed: received, total: asset.size });
    return destination;
  } finally { await fsp.rm(temporary, { force: true }).catch(() => {}); }
}
module.exports = { downloadAsset, digestFile, matchesAsset };
