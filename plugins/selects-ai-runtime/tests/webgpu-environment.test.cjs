'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { prepareWebGpuEnvironment, validWebGpuEnvironment, inspectNodeRuntime, selectPackageFile,
  NODE_RUNTIME_ASSET, PACKAGE_PINS, REQUIRED_FILES, PIN_DIGEST, ENVIRONMENT_NAME } = require('../lib/webgpu-environment.cjs');
const IDENTITY = { version: 'v24.18.0', arch: 'arm64', platform: 'darwin', napi: '10' };
const fakeNode = async () => ({ stdout: JSON.stringify(IDENTITY) });

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'webgpu-environment-'));
  t.after(() => fs.rm(root, { recursive: true, force: true })); return root;
}
async function readyFixture(root) {
  const directory = path.join(root, 'env', ENVIRONMENT_NAME), files = [];
  for (const relative of REQUIRED_FILES) {
    const filename = path.join(directory, relative);
    const asset = PACKAGE_PINS.find(pin => relative === `node_modules/${pin.name}/package.json`);
    const bytes = Buffer.from(asset ? JSON.stringify({ name: asset.name, version: asset.version }) : `fixture ${relative}`);
    await fs.mkdir(path.dirname(filename), { recursive: true }); await fs.writeFile(filename, bytes);
    if (relative === 'node-runtime/bin/node') await fs.chmod(filename, 0o755);
    files.push({ path: relative, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const marker = { pinDigest: PIN_DIGEST, platform: 'darwin-arm64', files,
    nodeSha256: files.find(file => file.path === 'node-runtime/bin/node').sha256 };
  const save = () => fs.writeFile(path.join(directory, 'ready.json'), JSON.stringify(marker));
  await save(); return { directory, marker, save };
}

test('pins exact official Node and npm assets and selects no installation scripts or foreign binaries', () => {
  assert.equal(NODE_RUNTIME_ASSET.size, 52087559);
  assert.equal(NODE_RUNTIME_ASSET.sha256, 'e1a97e14c99c803e96c7339403282ea05a499c32f8d83defe9ef5ec66f979ed1');
  assert.equal(new URL(NODE_RUNTIME_ASSET.url).hostname, 'nodejs.org');
  assert.equal(PACKAGE_PINS.find(asset => asset.name === 'webgpu').version, '0.6.2');
  assert.ok(PACKAGE_PINS.every(asset => asset.size > 0 && /^sha512-[A-Za-z0-9+/]{86}==$/.test(asset.integrity)));
  for (const name of ['onnxruntime-web', 'webgpu']) {
    assert.equal(selectPackageFile(name, 'build/postinstall.js'), false);
    assert.equal(selectPackageFile(name, 'dist/win32-x64/dawn.node'), false);
  }
  assert.equal(selectPackageFile('onnxruntime-web', 'dist/ort.webgpu.min.js'), true);
  assert.equal(selectPackageFile('onnxruntime-web', 'dist/ort-wasm-simd-threaded.asyncify.wasm'), true);
  assert.equal(selectPackageFile('onnxruntime-web', 'dist/ort.min.js'), false);
  assert.equal(selectPackageFile('webgpu', 'dist/darwin-universal/dawn.node'), true);
  assert.equal(selectPackageFile('webgpu', 'LICENSE.md'), true);
  assert.equal(selectPackageFile('onnxruntime-web', 'ThirdPartyNotices.txt'), true);
  assert.equal(selectPackageFile('onnxruntime-web', 'LICENSE-MIT.txt'), true);
  assert.equal(PACKAGE_PINS.length, 10);
});

test('inspects an absolute standalone binary with injection variables removed and no shell', async () => {
  const executable = '/absolute/plugin cache/node-runtime/bin/node';
  let called = false;
  await inspectNodeRuntime(executable, { execFile: async (file, args, options) => {
    called = true; assert.equal(file, executable); assert.equal(args[0], '--eval'); assert.equal(options.shell, false);
    assert.equal(options.env.NODE_OPTIONS, undefined); assert.equal(options.env.NODE_PATH, undefined);
    assert.equal(options.env.ELECTRON_RUN_AS_NODE, undefined); assert.equal(options.maxBuffer, 4096);
    return { stdout: JSON.stringify(IDENTITY) };
  } });
  assert.equal(called, true);
});
for (const [label, actual] of [
  ['older Node', { version: 'v24.15.0' }], ['wrong architecture', { arch: 'x64' }],
  ['wrong OS', { platform: 'win32' }], ['wrong N-API', { napi: '11' }], ['Electron', { electron: '43.2.0' }],
]) test(`rejects ${label} before loading Dawn`, async () => {
  await assert.rejects(inspectNodeRuntime('/absolute/node', { execFile: async () => ({ stdout: JSON.stringify({ ...IDENTITY, ...actual }) }) }), /identity/);
});

test('reuses complete verified cache and returns the verified executable digest', async t => {
  const root = await fixture(t), ready = await readyFixture(root);
  assert.deepEqual(await validWebGpuEnvironment(ready.directory, { execFile: fakeNode }), { nodeSha256: ready.marker.nodeSha256 });
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    const result = await prepareWebGpuEnvironment(root, { execFile: fakeNode, fetch: () => { throw new Error('cache must not download'); } });
    assert.equal(result.nodeExecutable, path.join(ready.directory, 'node-runtime/bin/node'));
    assert.equal(result.nodeSha256, ready.marker.nodeSha256); assert.equal(path.isAbsolute(result.ortWebModule), true);
    assert.equal(result.dawnModule, path.join(ready.directory, 'node_modules/webgpu/index.js'));
  }
});

for (const [label, mutate] of [
  ['empty inventory', ready => { ready.marker.files = []; }],
  ['omitted executable', ready => { ready.marker.files = ready.marker.files.filter(file => file.path !== 'node-runtime/bin/node'); }],
  ['duplicate inventory', ready => { ready.marker.files.push(ready.marker.files[0]); }],
  ['invalid checksum', ready => { ready.marker.files[0].sha256 = 'unknown'; }],
  ['missing size', ready => { delete ready.marker.files[0].size; }],
  ['traversal path', ready => { ready.marker.files[0].path = '../outside'; }],
  ['changed pins', ready => { ready.marker.pinDigest = '0'.repeat(64); }],
  ['different executable digest', ready => { ready.marker.nodeSha256 = '0'.repeat(64); }],
]) test(`rejects cache with ${label}`, async t => {
  const root = await fixture(t), ready = await readyFixture(root); mutate(ready); await ready.save();
  assert.equal(await validWebGpuEnvironment(ready.directory, { execFile: fakeNode }), false);
});

test('detects changed bytes, permissions and package versions even if a manifest digest is rewritten', async t => {
  const root = await fixture(t), ready = await readyFixture(root);
  const executable = path.join(ready.directory, 'node-runtime/bin/node');
  await fs.chmod(executable, 0o644);
  assert.equal(await validWebGpuEnvironment(ready.directory, { execFile: fakeNode }), false);
  await fs.chmod(executable, 0o755); await fs.writeFile(executable, 'changed executable');
  assert.equal(await validWebGpuEnvironment(ready.directory, { execFile: fakeNode }), false);
  const freshRoot = await fixture(t), fresh = await readyFixture(freshRoot);
  const packageFile = fresh.marker.files.find(file => file.path === 'node_modules/webgpu/package.json');
  const bytes = Buffer.from(JSON.stringify({ name: 'webgpu', version: '9.9.9' }));
  await fs.writeFile(path.join(fresh.directory, packageFile.path), bytes);
  packageFile.size = bytes.length; packageFile.sha256 = createHash('sha256').update(bytes).digest('hex'); await fresh.save();
  assert.equal(await validWebGpuEnvironment(fresh.directory, { execFile: fakeNode }), false);
});

test('refuses linked inventory entries and preserves cancellation without preparing files', async t => {
  const root = await fixture(t), ready = await readyFixture(root), file = path.join(ready.directory, 'node_modules/webgpu/index.js');
  const outside = path.join(root, 'outside.js'); await fs.rename(file, outside); await fs.symlink(outside, file);
  assert.equal(await validWebGpuEnvironment(ready.directory, { execFile: fakeNode }), false);
  const controller = new AbortController(); controller.abort(new Error('canceled before download'));
  await assert.rejects(prepareWebGpuEnvironment(root, { signal: controller.signal }), /canceled/);
  await assert.rejects(validWebGpuEnvironment(ready.directory, { signal: controller.signal }), /canceled/);
  await assert.rejects(fs.stat(path.join(root, 'archives')), /ENOENT/);
});
