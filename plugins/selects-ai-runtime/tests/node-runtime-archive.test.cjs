'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const { extractNodeRuntimeArchive } = require('../lib/node-runtime-archive.cjs');
const PREFIX = 'node-v24.18.0-darwin-arm64/';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'node-runtime-archive-'));
  t.after(() => fs.rm(root, { recursive: true, force: true })); return root;
}
function archive(entries) {
  const chunks = [];
  for (const entry of entries) {
    const header = Buffer.alloc(512), bytes = Buffer.from(entry.bytes ?? '');
    header.write(entry.name.startsWith('/') ? entry.name.slice(1) : `${PREFIX}${entry.name}`);
    header.write('0000755\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124); header.write('00000000000\0', 136);
    header.fill(32, 148, 156); header[156] = (entry.type ?? '0').charCodeAt(0); header.write('ustar\0', 257);
    header.write(`${header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0')}\0 `, 148);
    if (entry.badChecksum) header[10] ^= 1;
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}
async function writeArchive(root, entries) {
  const filename = path.join(root, 'node.tar.gz'); await fs.writeFile(filename, archive(entries)); return filename;
}
const COMPLETE = [{ name: 'LICENSE', bytes: 'license' }, { name: 'bin/node', bytes: 'native executable fixture' }];

test('extracts only Node and its license with execute permissions, without installing npm', async t => {
  const root = await fixture(t), output = path.join(root, 'out');
  const file = await writeArchive(root, [COMPLETE[0], { name: 'lib/node_modules/npm/bin/install.js', bytes: 'must not execute' },
    COMPLETE[1], { name: 'bin/npm', type: '2' }]);
  assert.deepEqual(await extractNodeRuntimeArchive(file, output), ['LICENSE', 'bin/node']);
  assert.equal(await fs.readFile(path.join(output, 'bin/node'), 'utf8'), COMPLETE[1].bytes);
  assert.equal((await fs.stat(path.join(output, 'bin/node'))).mode & 0o777, 0o755);
  assert.deepEqual(await fs.readdir(output), ['LICENSE', 'bin']);
  await assert.rejects(fs.stat(path.join(output, 'lib')), /ENOENT/);
});

for (const [label, entries, error] of [
  ['traversal', [{ name: '../escape', bytes: 'bad' }], /Unsafe/],
  ['wrong root', [{ name: '/node-v24.15.0-darwin-arm64/LICENSE', bytes: 'bad' }], /Unsafe/],
  ['symbolic link', [{ name: 'bin/node', type: '2' }], /Unsupported/],
  ['hard link', [{ name: 'bin/node', type: '1' }], /Unsupported/],
  ['metadata header', [{ name: 'metadata', type: 'x' }], /Unsupported/],
  ['case duplicate', [{ name: 'LICENSE', bytes: 'a' }, { name: 'license', bytes: 'b' }], /Duplicate/],
  ['selected directory', [{ name: 'bin/node', type: '5' }], /directory/],
  ['bad checksum', [{ name: 'LICENSE', bytes: 'a', badChecksum: true }], /checksum/],
  ['missing executable', [COMPLETE[0]], /Incomplete/],
  ['empty executable', [COMPLETE[0], { name: 'bin/node' }], /budget/],
]) test(`rejects ${label} before publishing an executable`, async t => {
  const root = await fixture(t), file = await writeArchive(root, entries);
  await assert.rejects(extractNodeRuntimeArchive(file, path.join(root, 'out')), error);
});

test('bounds expansion, executable output, and header counts', async t => {
  const root = await fixture(t), file = await writeArchive(root, COMPLETE);
  await assert.rejects(extractNodeRuntimeArchive(file, path.join(root, 'large'), { maxExpandedBytes: 512 }), /budget/);
  await assert.rejects(extractNodeRuntimeArchive(file, path.join(root, 'selected'), { maxExtractedBytes: 8 }), /budget/);
  await assert.rejects(extractNodeRuntimeArchive(file, path.join(root, 'headers'), { maxEntries: 1 }), /Incomplete/);
});

test('rejects truncated payloads and canceled extraction', async t => {
  const root = await fixture(t), filename = path.join(root, 'truncated.tar.gz');
  await fs.writeFile(filename, gzipSync(Buffer.alloc(20)));
  await assert.rejects(extractNodeRuntimeArchive(filename, path.join(root, 'out')), /Truncated/);
  const controller = new AbortController(); controller.abort(new Error('canceled fixture'));
  const file = await writeArchive(root, COMPLETE);
  await assert.rejects(extractNodeRuntimeArchive(file, path.join(root, 'cancel'), { signal: controller.signal }), /canceled/);
  await assert.rejects(fs.stat(path.join(root, 'cancel')), /ENOENT/);
});

test('refuses linked archives, destinations and executable parent directories', async t => {
  const root = await fixture(t), file = await writeArchive(root, COMPLETE), outside = path.join(root, 'outside');
  await fs.mkdir(outside); await fs.symlink(file, path.join(root, 'archive-link'));
  await assert.rejects(extractNodeRuntimeArchive(path.join(root, 'archive-link'), path.join(root, 'out')), /regular/);
  await fs.symlink(outside, path.join(root, 'out-link'));
  await assert.rejects(extractNodeRuntimeArchive(file, path.join(root, 'out-link')), /destination/);
  const linkedBin = path.join(root, 'linked-bin'); await fs.mkdir(linkedBin); await fs.symlink(outside, path.join(linkedBin, 'bin'));
  await assert.rejects(extractNodeRuntimeArchive(file, linkedBin), /Linked/);
  assert.deepEqual(await fs.readdir(outside), []);
});
