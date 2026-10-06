'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const { extractRuntimeTar } = require('../lib/runtime-tar.cjs');
const { downloadAsset, matchesAsset } = require('../lib/runtime-download.cjs');
const { ensureCacheDirectory } = require('../lib/runtime-cache.cjs');
const { ASSETS, MODELS, NATIVE_FILES } = require('../lib/runtime-assets.cjs');
const { resolveRuntimeTool } = require('../lib/runtime-tools.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-prepare-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
function archive(entries) {
  const chunks = [];
  for (const entry of entries) {
    const header = Buffer.alloc(512), bytes = Buffer.from(entry.bytes ?? '');
    header.write(entry.name); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124);
    header.write('00000000000\0', 136); header.fill(32, 148, 156); header[156] = entry.type?.charCodeAt(0) ?? 48;
    header.write('ustar\0', 257);
    const sum = header.reduce((a, b) => a + b, 0); header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  chunks.push(Buffer.alloc(1024)); return gzipSync(Buffer.concat(chunks));
}
test('extracts only selected regular files from an npm archive', async t => {
  const root = await fixture(t), file = path.join(root, 'package.tgz');
  await fs.writeFile(file, archive([{ name: 'package/dist/index.js', bytes: 'module.exports=1' }, { name: 'package/unused.js', bytes: 'unused' }]));
  const output = path.join(root, 'out');
  assert.deepEqual(await extractRuntimeTar(file, output, name => name.startsWith('dist/')), ['dist/index.js']);
  assert.equal(await fs.readFile(path.join(output, 'dist/index.js'), 'utf8'), 'module.exports=1');
  await assert.rejects(fs.stat(path.join(output, 'unused.js')), /ENOENT/);
});
for (const entries of [
  [{ name: 'package/../escape', bytes: 'bad' }], [{ name: 'package/link', type: '2' }],
  [{ name: 'package/a', bytes: 'one' }, { name: 'package/A', bytes: 'two' }],
]) test('rejects unsafe, linked or duplicate archive entries', async t => {
  const root = await fixture(t), file = path.join(root, 'bad.tgz'); await fs.writeFile(file, archive(entries));
  await assert.rejects(extractRuntimeTar(file, path.join(root, 'out'), () => true), /Unsafe|Unsupported|Duplicate/);
});
test('bounds archive expansion and selected output bytes', async t => {
  const root = await fixture(t), file = path.join(root, 'big.tgz'); await fs.writeFile(file, archive([{ name: 'package/a', bytes: '12345' }]));
  await assert.rejects(extractRuntimeTar(file, path.join(root, 'out'), () => true, { maxExtractedBytes: 4 }), /budget/);
  await assert.rejects(extractRuntimeTar(file, path.join(root, 'out2'), () => true, { maxExpandedBytes: 512 }), /budget/);
});
function fakeFetch(bytes) {
  return async () => { const response = new Response(new Uint8Array(bytes)); Object.defineProperty(response, 'url', { value: 'https://fixture.example/asset' }); return response; };
}
test('downloads exact pinned bytes atomically and reuses verified files', async t => {
  const root = await fixture(t), bytes = Buffer.from('verified model');
  const asset = { url: 'https://fixture.example/asset', size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  const output = path.join(root, 'model.onnx'), events = [];
  await downloadAsset(asset, output, { fetch: fakeFetch(bytes), emit: event => events.push(event) });
  assert.equal(await matchesAsset(output, asset), true); assert.equal(events.at(-1).completed, bytes.length);
  await downloadAsset(asset, output, { fetch: () => { throw new Error('cache must not download'); } });
  assert.deepEqual(await fs.readdir(root), ['model.onnx']);
});
test('checksum failures, oversized bodies and cancellation publish no asset', async t => {
  const root = await fixture(t), bytes = Buffer.from('bad');
  const asset = { url: 'https://fixture.example/asset', size: bytes.length, sha256: '0'.repeat(64) };
  const output = path.join(root, 'model.onnx');
  await assert.rejects(downloadAsset(asset, output, { fetch: fakeFetch(bytes) }), /checksum/);
  await assert.rejects(downloadAsset(asset, output, { fetch: fakeFetch(Buffer.from('longer')) }), /pinned size/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(downloadAsset(asset, output, { signal: controller.signal, fetch: fakeFetch(bytes) }));
  assert.deepEqual(await fs.readdir(root), []);
});
test('cache creation refuses links and all tasks preserve original model pins', async t => {
  const root = await fixture(t), outside = path.join(root, 'outside'); await fs.mkdir(outside);
  await fs.symlink(outside, path.join(root, 'models'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(ensureCacheDirectory(root, 'models'), /link/);
  assert.equal(ASSETS.node.size, 113507888); assert.equal(MODELS['person.matte'].sha256, '88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828');
  assert.deepEqual(Object.keys(NATIVE_FILES), ['darwin-arm64', 'win32-x64']);
});
test('development media tools resolve through PATH without executing shell expressions', async t => {
  const root = await fixture(t), filename = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  await fs.writeFile(path.join(root, filename), 'fixture');
  assert.equal(await resolveRuntimeTool('ffmpeg', { PATH: root }), await fs.realpath(path.join(root, filename)));
  await assert.rejects(resolveRuntimeTool('ffmpeg && command', { PATH: root }), /unavailable/);
});
