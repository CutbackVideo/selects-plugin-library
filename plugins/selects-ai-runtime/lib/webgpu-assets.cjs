'use strict';
const crypto = require('node:crypto');
const NODE_VERSION = '24.18.0', ORT_WEB_VERSION = '1.30.0', DAWN_VERSION = '0.6.2';
const PLATFORM = 'darwin-arm64';
const NODE_RUNTIME_ASSET = Object.freeze({
  url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${PLATFORM}.tar.gz`,
  size: 52087559, sha256: 'e1a97e14c99c803e96c7339403282ea05a499c32f8d83defe9ef5ec66f979ed1',
});
// Exact npm lock resolutions; scripts are never run, including Dawn's postinstall.
const PACKAGE_PINS = [
  ["@protobufjs/aspromise", "1.1.2", 2595, "j+gKExEuLmKwvz3OgROXtrJ2UG2x8Ch2YZUxahh+s1F2HZ+wAceUNLkvy6zKCPVRkU++ZWQrdxsUeQXmcg4uoQ=="],
  ["@protobufjs/base64", "1.1.2", 3245, "AZkcAA5vnN/v4PDqKyMR5lx7hZttPDgClv83E//FMNhR2TMcLUhfRUBHCmSl0oi9zMgDDqRUJkSxO3wm85+XLg=="],
  ["@protobufjs/eventemitter", "1.1.1", 3411, "vW1GmwMZNnL+gMRaovlh9yZX74kc+TTU3FObkkurpMaRtBfLP3ldjS9KQWlwZgraRE0+dheEEoAxdzcJQ8eXZg=="],
  ["@protobufjs/float", "1.0.2", 6036, "Ddb+kVXlXst9d+R9PfTIxh1EdNkgoRe5tOX6t01f1lYWOvJnSPDBlG241QLzcyPdoNTsblLUdujGSE4RzrTZGQ=="],
  ["@protobufjs/pool", "1.1.0", 2559, "0kELaGSIDBKvcgS4zkjz1PeddatrjYcmMWOlAuAPwAeccUrPHdUqo/J6LiymHHEiJT5NrF1UVwxY14f+fy4WQw=="],
  ["@protobufjs/utf8", "1.1.2", 10793, "b1UQwcEZ4yCnMCD8DAL1VlbvBJE9/IX4FTIp7BG1xYpf29SLazLSrqUkj4w7Y5y7cCVP6E5tcqqcI0xemPkHug=="],
  ["long", "5.3.2", 26736, "mNAgZ1GmyNhD7AuqnTG3/VQ26o760+ZYBPKjPvugO8+nLbYfX6TVpJPseBvopbdY+qpZ/lKUnmEc1LeZYS3QAA=="],
  ["onnxruntime-web", "1.30.0", 33106585, "q0y+JrrtukXSzsBWEMccVfqX25LRmosXHF+CaRJmg8pZClzcV7svNc4rKY3jL02Vb7QmRMDs1SigqR4CXAfKYQ=="],
  ["protobufjs", "7.6.6", 641865, "dYDWdjSl5RNb7SgPxGQcRU+GtvP7s2fpkrY0r432PcOIaZ0/rBcxEZnQN67iJhFuQiVw754JDoPruPCNdGsbjg=="],
  ["webgpu", "0.6.2", 51264151, "3L4GfmqJLvYUIEWJngEQY+2HQiUlAFkg8+P8NDDj3Xx5hHHIFO/r8JW+ynfqBj7kHN4mbnwO74uB+lrRtLhp4Q=="],
].map(([name, version, size, integrity]) => Object.freeze({ name, version, size, integrity: `sha512-${integrity}`,
  url: `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz` }));
const PIN_DIGEST = crypto.createHash('sha256').update(JSON.stringify([NODE_RUNTIME_ASSET, PACKAGE_PINS])).digest('hex');
const ENVIRONMENT_NAME = `webgpu-${ORT_WEB_VERSION}-node-${NODE_VERSION}-${PLATFORM}-dawn-${DAWN_VERSION}`;
const ORT_FILES = ['dist/ort.webgpu.min.js', 'dist/ort-wasm-simd-threaded.asyncify.mjs',
  'dist/ort-wasm-simd-threaded.asyncify.wasm', 'lib/onnxjs/ort-schema/protobuf/onnx.js'];
const REQUIRED_FILES = ['node-runtime/bin/node', 'node-runtime/LICENSE',
  ...PACKAGE_PINS.map(asset => `node_modules/${asset.name}/package.json`),
  ...ORT_FILES.map(file => `node_modules/onnxruntime-web/${file}`),
  'node_modules/webgpu/index.js', 'node_modules/webgpu/dist/darwin-universal/dawn.node',
  'node_modules/protobufjs/minimal.js', 'node_modules/protobufjs/src/index-minimal.js',
  'node_modules/long/umd/index.js',
  ...PACKAGE_PINS.filter(asset => asset.name.startsWith('@protobufjs/')).map(asset => `node_modules/${asset.name}/index.js`)];

function selectPackageFile(name, filename) {
  if (filename === 'package.json' || /^(?:LICENSE[^/]*|NOTICE[^/]*|ThirdPartyNotices[^/]*)$/i.test(filename)) return true;
  if (name === 'onnxruntime-web') return ORT_FILES.includes(filename);
  if (name === 'webgpu') return filename === 'index.js' || filename === 'dist/darwin-universal/dawn.node';
  if (name === 'protobufjs') return filename === 'minimal.js' || filename.startsWith('src/');
  return !filename.startsWith('node_modules/') && !filename.startsWith('scripts/') && !filename.startsWith('tests/');
}

module.exports = { NODE_RUNTIME_ASSET, PACKAGE_PINS, NODE_VERSION, PLATFORM, REQUIRED_FILES, PIN_DIGEST, ENVIRONMENT_NAME, selectPackageFile };
