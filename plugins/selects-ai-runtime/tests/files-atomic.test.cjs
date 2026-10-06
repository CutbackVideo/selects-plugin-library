'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { writeJson, readJson } = require('../lib/files.cjs');

test('failed atomic rename cleans up temporary output and allows a later retry', async () => {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'selects-ai-atomic-write-'));
  const destination = path.join(directory, 'state.json');
  try {
    // A directory in place of the destination forces rename to fail after the
    // temporary JSON file is written, without changing global permissions.
    await fs.mkdir(destination);
    await assert.rejects(writeJson(destination, { status: 'first' }));
    assert.deepEqual(await fs.readdir(directory), ['state.json']);
    assert.equal((await fs.stat(destination)).isDirectory(), true);
    await fs.rmdir(destination);
    await writeJson(destination, { status: 'retry' });
    assert.deepEqual(await readJson(destination), { status: 'retry' });
    assert.deepEqual(await fs.readdir(directory), ['state.json']);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
