'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { downloadAsset, digestFile } = require('./runtime-download.cjs');
const { extractRuntimeTar } = require('./runtime-tar.cjs');
const { extractNodeRuntimeArchive } = require('./node-runtime-archive.cjs');
const { ensureCacheDirectory, assertCacheFile } = require('./runtime-cache.cjs');
const { readJson, writeJson } = require('./files.cjs');

const { NODE_RUNTIME_ASSET, PACKAGE_PINS, NODE_VERSION, PLATFORM, REQUIRED_FILES, PIN_DIGEST, ENVIRONMENT_NAME, selectPackageFile } = require('./webgpu-assets.cjs');

async function inspectNodeRuntime(executable, options = {}) {
  options.signal?.throwIfAborted();
  const env = { ...process.env };
  for (const key of ['NODE_OPTIONS', 'NODE_PATH', 'ELECTRON_RUN_AS_NODE']) delete env[key];
  const expression = 'process.stdout.write(JSON.stringify({version:process.version,platform:process.platform,arch:process.arch,napi:process.versions.napi,electron:process.versions.electron}))';
  const run = options.execFile ?? promisify(execFile);
  const { stdout } = await run(executable, ['--eval', expression], { env, signal: options.signal,
    timeout: 10000, maxBuffer: 4096, shell: false, windowsHide: true });
  const actual = JSON.parse(stdout);
  if (actual.version !== `v${NODE_VERSION}` || actual.platform !== 'darwin' || actual.arch !== 'arm64' ||
    actual.napi !== '10' || actual.electron !== undefined) throw new Error('Unexpected standalone Node runtime identity');
  return actual;
}

async function validWebGpuEnvironment(destination, options = {}) {
  options.signal?.throwIfAborted();
  try {
    const markerPath = await assertCacheFile(path.dirname(destination), `${path.basename(destination)}/ready.json`);
    if ((await fs.stat(markerPath)).size > 1024 * 1024) return false;
    const marker = await readJson(markerPath);
    if (marker.pinDigest !== PIN_DIGEST || marker.platform !== PLATFORM || !Array.isArray(marker.files) ||
      marker.files.length === 0 || marker.files.length > 4096 || !/^[a-f0-9]{64}$/.test(marker.nodeSha256 ?? '')) return false;
    const files = new Map();
    for (const file of marker.files) {
      options.signal?.throwIfAborted();
      if (!file || typeof file.path !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256 ?? '') ||
        !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > 160 * 1024 * 1024 ||
        files.has(file.path.toLowerCase())) return false;
      const filename = await assertCacheFile(destination, file.path), stat = await fs.lstat(filename);
      if (stat.size !== file.size || await digestFile(filename) !== file.sha256) return false;
      files.set(file.path.toLowerCase(), file);
    }
    if (REQUIRED_FILES.some(file => !files.has(file.toLowerCase()))) return false;
    const node = files.get('node-runtime/bin/node');
    if (node.sha256 !== marker.nodeSha256 || ((await fs.stat(path.join(destination, node.path))).mode & 0o111) !== 0o111) return false;
    for (const asset of PACKAGE_PINS) {
      const actual = await readJson(await assertCacheFile(destination, `node_modules/${asset.name}/package.json`));
      if (actual.name !== asset.name || actual.version !== asset.version) return false;
    }
    await inspectNodeRuntime(path.join(destination, node.path), options);
    return { nodeSha256: node.sha256 };
  } catch (error) { options.signal?.throwIfAborted(); return false; }
}

function environmentPaths(destination, nodeSha256) {
  return { nodeExecutable: path.join(destination, 'node-runtime/bin/node'), nodeSha256,
    ortWebModule: path.join(destination, 'node_modules/onnxruntime-web'),
    dawnModule: path.join(destination, 'node_modules/webgpu/index.js') };
}

async function prepareWebGpuEnvironment(cache, options = {}) {
  options.signal?.throwIfAborted();
  if (`${process.platform}-${process.arch}` !== PLATFORM) throw new Error('Standalone WebGPU runtime supports only darwin-arm64');
  if (!path.isAbsolute(cache)) throw new Error('WebGPU cache must be absolute');
  const cacheStat = await fs.lstat(cache);
  if (!cacheStat.isDirectory() || cacheStat.isSymbolicLink()) throw new Error('Invalid WebGPU cache root');
  const root = await ensureCacheDirectory(cache, 'env');
  await ensureCacheDirectory(cache, 'archives');
  const destination = path.join(root, ENVIRONMENT_NAME);
  const existing = await validWebGpuEnvironment(destination, options);
  if (existing) return environmentPaths(destination, existing.nodeSha256);
  const staging = await fs.mkdtemp(path.join(root, '.webgpu-staging-'));
  try {
    const archive = await downloadAsset(NODE_RUNTIME_ASSET, path.join(cache, 'archives', `node-${NODE_VERSION}-${PLATFORM}.tar.gz`),
      { ...options, step: 'download-webgpu-node' });
    const selected = await extractNodeRuntimeArchive(archive, path.join(staging, 'node-runtime'), options);
    const paths = selected.map(filename => `node-runtime/${filename}`);
    for (const asset of PACKAGE_PINS) {
      options.signal?.throwIfAborted();
      const basename = `${asset.name.replace(/[@/]/g, '_')}-${asset.version}.tgz`;
      const tar = await downloadAsset(asset, path.join(cache, 'archives', basename), { ...options, step: 'download-webgpu-runtime' });
      const directory = `node_modules/${asset.name}`;
      const files = await extractRuntimeTar(tar, path.join(staging, directory), filename => selectPackageFile(asset.name, filename), options);
      if (!files.includes('package.json')) throw new Error(`Incomplete WebGPU package: ${asset.name}`);
      paths.push(...files.map(filename => `${directory}/${filename}`));
    }
    const files = [];
    for (const relative of paths.sort()) {
      options.signal?.throwIfAborted();
      const filename = await assertCacheFile(staging, relative);
      files.push({ path: relative, size: (await fs.stat(filename)).size, sha256: await digestFile(filename) });
    }
    const nodeSha256 = files.find(file => file.path === 'node-runtime/bin/node').sha256;
    await writeJson(path.join(staging, 'ready.json'), { pinDigest: PIN_DIGEST, platform: PLATFORM, nodeSha256, files });
    if (!(await validWebGpuEnvironment(staging, options))) throw new Error('Prepared WebGPU runtime failed verification');
    options.signal?.throwIfAborted();
    if (!(await validWebGpuEnvironment(destination, options))) {
      try { await fs.rename(destination, `${destination}.invalid-${crypto.randomUUID()}`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      try { await fs.rename(staging, destination); }
      catch (error) { if (!(await validWebGpuEnvironment(destination, options))) throw error; }
    }
    const committed = await validWebGpuEnvironment(destination, options);
    if (!committed) throw new Error('Committed WebGPU runtime failed verification');
    return environmentPaths(destination, committed.nodeSha256);
  } finally { await fs.rm(staging, { recursive: true, force: true }); }
}

module.exports = { prepareWebGpuEnvironment, validWebGpuEnvironment, inspectNodeRuntime, selectPackageFile,
  NODE_RUNTIME_ASSET, PACKAGE_PINS, NODE_VERSION, REQUIRED_FILES, PIN_DIGEST, ENVIRONMENT_NAME };
