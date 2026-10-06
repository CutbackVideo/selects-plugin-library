'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

function parts(relative) {
  if (path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..'))
    throw new Error('Invalid runtime cache path');
  return relative.split('/');
}
async function ensureCacheDirectory(root, relative) {
  let current = root;
  for (const part of parts(relative)) {
    current = path.join(current, part);
    try { await fs.mkdir(current); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Runtime cache contains a link or non-directory');
  }
  return current;
}
async function assertCacheFile(root, relative) {
  const segments = parts(relative);
  let current = root;
  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index]);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || (index === segments.length - 1 ? !stat.isFile() : !stat.isDirectory()))
      throw new Error('Runtime cache contains a link or non-regular file');
  }
  return current;
}
module.exports = { ensureCacheDirectory, assertCacheFile };
