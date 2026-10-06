#!/usr/bin/env node
'use strict';

// A one-frame numerical diagnostic, not a registered AI operation or video job.
// Feeding identical already-decoded RGB24 bytes isolates inference from FFmpeg.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseArgs } = require('node:util');
const { ensureEmptyDirectory, readJson, writeJson } = require('../lib/files.cjs');
const { verifyModel } = require('../lib/models.cjs');
const { verifyOutputs } = require('../lib/outputs.cjs');
const { runMatte } = require('../tasks/person-matte.cjs');
const descriptor = require('../runtime.json');

async function main() {
  const { values } = parseArgs({ options: {
    rgb: { type: 'string' }, width: { type: 'string' }, height: { type: 'string' },
    config: { type: 'string' }, output: { type: 'string' },
  } });
  if (['rgb', 'width', 'height', 'config', 'output'].some((key) => !values[key])) {
    throw new Error('Usage: verify-rvm-raw-parity.cjs --rgb <rgb24-file> --width <width> --height <height> --config <config.json> --output <fresh-folder>');
  }
  const width = Number(values.width), height = Number(values.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 32_000_000) {
    throw new Error('Raw RGB display dimensions must be positive integers within the PoC raster limit.');
  }
  const sourceFile = path.resolve(values.rgb);
  const rgb = await fs.readFile(sourceFile);
  if (rgb.length !== width * height * 3) throw new Error('Raw file must contain exactly one full RGB24 display frame.');
  const config = await readJson(path.resolve(values.config));
  const model = config.models?.rvm;
  if (model?.sha256 !== descriptor.tasks['person.matte'].sha256) {
    throw new Error('RVM config SHA-256 does not match the pinned runtime descriptor.');
  }
  await verifyModel(model);
  const ortVersion = require(path.join(config.ortModule, 'package.json')).version;
  if (ortVersion !== descriptor.nativeDependency.version) throw new Error('ONNX Runtime does not match the pinned version.');
  const ort = require(config.ortModule);
  const outputDir = path.resolve(values.output);
  await ensureEmptyDirectory(outputDir);
  const request = {
    contractVersion: 1, task: 'person.matte',
    input: { source: { path: sourceFile }, sourceRange: { startSeconds: 0, endSeconds: 1 }, downsampleRatio: 0.25 },
  };
  const video = { width, height, frameTimes: [0] };
  const result = await runMatte({
    request, config, outputDir, ort, video,
    frames: async function* () { yield { index: 0, sourceTimeSeconds: 0, rgb }; },
  });
  await verifyOutputs(outputDir, request, result, video);
  const summary = {
    diagnosticVersion: 1, diagnostic: 'RVM identical RGB24 input with initial zero recurrent states', status: 'passed',
    input: { byteLength: rgb.length, width, height, sha256: crypto.createHash('sha256').update(rgb).digest('hex') },
    runtime: { node: process.versions.node, electron: process.versions.electron || null, platform: process.platform, arch: process.arch, ortVersion },
    modelSha256: model.sha256,
    result,
  };
  await writeJson(path.join(outputDir, 'raw-parity.json'), summary);
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

if (require.main === module) main().catch((error) => {
  process.stdout.write(JSON.stringify({ status: 'error', error: error.message }) + '\n');
  process.exitCode = 1;
});
