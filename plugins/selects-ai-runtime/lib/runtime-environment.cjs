'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { ASSETS, NATIVE_FILES, ORT_VERSION } = require('./runtime-assets.cjs');
const { downloadAsset, digestFile } = require('./runtime-download.cjs');
const { extractRuntimeTar } = require('./runtime-tar.cjs');
const { writeJson, readJson } = require('./files.cjs');
const { ensureCacheDirectory, assertCacheFile } = require('./runtime-cache.cjs');

async function validEnvironment(destination, platform) {
  try {
    const marker = await readJson(await assertCacheFile(path.dirname(destination), `${path.basename(destination)}/ready.json`));
    if (marker.version !== ORT_VERSION || marker.platform !== platform || !Array.isArray(marker.files)) return false;
    for (const file of marker.files) {
      if (typeof file.path !== 'string' || file.path.startsWith('/') || file.path.includes('..') || file.path.includes('\\')) return false;
      if (await digestFile(await assertCacheFile(destination, file.path)) !== file.sha256) return false;
    }
    const native = path.join(destination, 'node_modules', 'onnxruntime-node', 'bin/napi-v6', ...platform.split('-'));
    for (const filename of NATIVE_FILES[platform]) {
      const stat = await fs.lstat(path.join(native, filename));
      if (!stat.isFile() || stat.isSymbolicLink()) return false;
    }
    return marker.files.length > 0;
  } catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return false; throw error; }
}

async function prepareEnvironment(cache, platform, options) {
  if (!NATIVE_FILES[platform]) throw new Error(`Unsupported runtime platform: ${platform}`);
  const root = path.join(cache, 'env');
  const destination = path.join(root, `${ORT_VERSION}-${platform}`);
  await ensureCacheDirectory(cache, 'env');
  await ensureCacheDirectory(cache, 'archives');
  if (await validEnvironment(destination, platform)) return path.join(destination, 'node_modules', 'onnxruntime-node');
  const staging = await fs.mkdtemp(path.join(root, '.staging-'));
  try {
    const files = [];
    for (const [name, asset] of Object.entries(ASSETS)) {
      options.signal?.throwIfAborted();
      const archive = await downloadAsset(asset, path.join(cache, 'archives', `onnxruntime-${name}-${ORT_VERSION}.tgz`), { ...options, step: 'download-runtime' });
      const packageName = `onnxruntime-${name}`;
      const packageDirectory = path.join(staging, 'node_modules', packageName);
      const nativePrefix = `bin/napi-v6/${platform.replace('-', '/')}/`;
      const selected = await extractRuntimeTar(archive, packageDirectory, filename => name === 'common'
        ? filename === 'package.json' || filename.startsWith('dist/cjs/')
        : filename === 'package.json' || /^dist\/[^/]+\.js$/.test(filename) || filename.startsWith(nativePrefix), options);
      if (!selected.includes('package.json') || !selected.includes(name === 'common' ? 'dist/cjs/index.js' : 'dist/index.js')) throw new Error('Incomplete runtime archive');
      for (const filename of selected) {
        const relative = `node_modules/${packageName}/${filename}`;
        files.push({ path: relative, sha256: await digestFile(path.join(staging, relative)) });
      }
    }
    await writeJson(path.join(staging, 'ready.json'), { version: ORT_VERSION, platform, files });
    options.signal?.throwIfAborted();
    // A concurrent process may already have committed this exact verified version.
    if (!(await validEnvironment(destination, platform))) {
      let exists = false;
      try { await fs.lstat(destination); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (exists) {
        // Preserve a corrupted cache for diagnosis, without overwriting a loaded DLL.
        await fs.rename(destination, `${destination}.invalid-${crypto.randomUUID()}`);
      }
      try { await fs.rename(staging, destination); }
      catch (error) { if (!(await validEnvironment(destination, platform))) throw error; }
    }
    return path.join(destination, 'node_modules', 'onnxruntime-node');
  } finally { await fs.rm(staging, { recursive: true, force: true }); }
}
module.exports = { prepareEnvironment, validEnvironment };
