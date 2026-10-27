'use strict';
// Cache exact ffprobe queries across disposable worker processes. No inferred
// FPS or reconstructed timestamps: a hit returns the original probe output.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { collectTool } = require('./process.cjs');
const { throwIfAborted } = require('./errors.cjs');

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 128;
const hash = text => createHash('sha256').update(text).digest('hex');
const identity = async file => {
  const s = await fs.stat(file);
  return [path.resolve(file), s.size, s.mtimeMs, s.ctimeMs, s.dev, s.ino];
};

async function directory(root) {
  if (!root) return null;
  try {
    const stat = await fs.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return null;
    const dir = path.join(root, 'probe-v1');
    await fs.mkdir(dir, { recursive: true });
    const child = await fs.lstat(dir);
    return child.isDirectory() && !child.isSymbolicLink() ? dir : null;
  } catch { return null; }
}

async function read(dir, key) {
  try {
    const file = path.join(dir, key + '.json');
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.size > MAX_BYTES) return null;
    const entry = JSON.parse(await fs.readFile(file, 'utf8'));
    if (entry.version !== 1 || entry.key !== key || typeof entry.output !== 'string' || hash(entry.output) !== entry.digest) return null;
    JSON.parse(entry.output);
    return entry.output;
  } catch { return null; }
}

async function write(dir, key, output) {
  const data = JSON.stringify({ version: 1, key, digest: hash(output), output });
  if (Buffer.byteLength(data) > MAX_BYTES) return;
  const target = path.join(dir, key + '.json');
  const temporary = target + '.' + process.pid + '.' + randomBytes(4).toString('hex') + '.tmp';
  try {
    await fs.writeFile(temporary, data);
    await fs.rename(temporary, target);
    const names = (await fs.readdir(dir)).filter(n => /^[0-9a-f]{64}\.json$/.test(n));
    const entries = await Promise.all(names.map(async name => ({ name, ...await fs.lstat(path.join(dir, name)) })));
    entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
    let total = 0;
    for (const [i, entry] of entries.entries()) {
      total += entry.size;
      if (i >= MAX_ENTRIES || total > MAX_TOTAL_BYTES) await fs.rm(path.join(dir, entry.name), { force: true });
    }
  } catch {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

async function probeJSON(config, filename, args, signal, validate = () => {}) {
  throwIfAborted(signal);
  const dir = await directory(config.timelineCache);
  let key;
  const fingerprint = async () => hash(JSON.stringify([await identity(filename), await identity(config.tools.ffprobe), args]));
  if (dir) {
    try { key = await fingerprint(); } catch { /* Probe errors retain their usual path. */ }
    if (key) {
      const cached = await read(dir, key);
      throwIfAborted(signal);
      if (cached !== null) {
        try { const parsed = JSON.parse(cached); validate(parsed); return parsed; } catch { /* Re-probe an invalid cached document. */ }
      }
    }
  }
  const output = await collectTool(config.tools.ffprobe, args, { signal });
  const parsed = JSON.parse(output);
  validate(parsed);
  throwIfAborted(signal);
  if (key) {
    try {
      if (key === await fingerprint()) await write(dir, key, output);
    } catch { /* Optional cache failures must not fail analysis. */ }
  }
  throwIfAborted(signal);
  return parsed;
}

module.exports = { probeJSON, MAX_BYTES, MAX_TOTAL_BYTES, MAX_ENTRIES };
