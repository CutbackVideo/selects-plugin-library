'use strict';
// Reading a source's frame timeline (every frame's timestamp) is a full ffprobe pass over the file: about
// half a minute for a long 1080p episode, repeated by every job on that file. Jobs reuse it instead. An
// entry is keyed by the file's path, size and modification time and the ffprobe binary, and lives in the
// host-owned runtime cache that preparation creates. A missing, unreadable, oversized or malformed entry
// (lib/video.cjs also rejects one whose timestamps are out of order) only means a fresh probe; a cache that
// cannot be written is skipped.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_ENTRIES = 64;
// The same bound as ffprobe's own metadata output (lib/process.cjs).
const MAX_BYTES = 64 * 1024 * 1024;

// The ffprobe binary is identified by its path, size and modification time, so a build replaced in place
// gets new entries.
async function timelineKey(filename, stat, probeTool) {
  let tool = [String(probeTool || ''), null, null];
  try {
    const toolStat = await fs.stat(String(probeTool));
    tool = [String(probeTool), toolStat.size, toolStat.mtimeMs];
  } catch {
    // An unreadable tool path keys on the path alone.
  }
  return crypto
    .createHash('sha256')
    .update(JSON.stringify([path.resolve(filename), stat.size, stat.mtimeMs, ...tool]))
    .digest('hex');
}

async function cacheDirectory(dir) {
  if (!dir) return null;
  try {
    const stat = await fs.lstat(dir);
    return stat.isDirectory() && !stat.isSymbolicLink() ? dir : null;
  } catch {
    return null;
  }
}

async function readTimeline(dir, key) {
  const root = await cacheDirectory(dir);
  if (!root) return null;
  try {
    const file = path.join(root, `${key}.json`);
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.size > MAX_BYTES) return null;
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    if (data?.version !== 1 || data.key !== key || !Array.isArray(data.rawPts) || !data.rawPts.length) return null;
    if (data.rawPts.some(value => !Number.isSafeInteger(value))) return null;
    return data.rawPts;
  } catch {
    return null;
  }
}

async function writeTimeline(dir, key, rawPts) {
  const root = await cacheDirectory(dir);
  if (!root) return false;
  const file = path.join(root, `${key}.json`);
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify({ version: 1, key, rawPts }));
    await fs.rename(temporary, file);
  } catch {
    await fs.rm(temporary, { force: true }).catch(() => {});
    return false;
  }
  // Keep the cache bounded: the most recently written entries stay.
  try {
    const names = (await fs.readdir(root)).filter(name => /^[0-9a-f]{64}\.json$/.test(name));
    if (names.length > MAX_ENTRIES) {
      const entries = await Promise.all(names.map(async name => ({ name, time: (await fs.stat(path.join(root, name))).mtimeMs })));
      entries.sort((a, b) => b.time - a.time);
      await Promise.all(entries.slice(MAX_ENTRIES).map(entry => fs.rm(path.join(root, entry.name), { force: true })));
    }
  } catch {
    // Eviction is best effort.
  }
  return true;
}

module.exports = { timelineKey, readTimeline, writeTimeline, MAX_ENTRIES };
