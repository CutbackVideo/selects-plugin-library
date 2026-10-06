'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

async function writeJson(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    await fs.rename(temporary, filename);
  } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

async function ensureEmptyDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
  if ((await fs.readdir(directory)).length) {
    throw new Error('Output directory must be empty; existing results are never overwritten');
  }
}

module.exports = { writeJson, readJson, ensureEmptyDirectory };
