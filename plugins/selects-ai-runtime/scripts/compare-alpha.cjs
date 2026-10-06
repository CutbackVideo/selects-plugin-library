#!/usr/bin/env node
'use strict';

// Decode with the independent FFmpeg reader, not the runtime's image writer.
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { parseArgs, promisify } = require('node:util');
const execute = promisify(execFile);

function framePath(root, file) {
  if (typeof file !== 'string' || path.isAbsolute(file) || file.includes('\\') || file.split('/').includes('..')) {
    throw new Error('Manifest image paths must be portable relative paths without traversal.');
  }
  return path.join(root, ...file.split('/'));
}

async function loadManifest(filename) {
  const manifest = JSON.parse(await fs.readFile(filename, 'utf8'));
  const size = manifest.frameSize;
  if (manifest.schemaVersion !== 1 || manifest.task !== 'person.matte' || !['grayscale-png-8bit', 'grayscale-avif-8bit'].includes(manifest.alphaEncoding)) {
    throw new Error(filename + ' is not a supported person.matte manifest.');
  }
  if (!Number.isInteger(size?.width) || !Number.isInteger(size?.height) || size.width < 1 || size.height < 1) {
    throw new Error(filename + ' has invalid display dimensions.');
  }
  if (!Array.isArray(manifest.frames) || !manifest.frames.length) throw new Error(filename + ' has no frames.');
  const root = path.dirname(filename);
  let priorTime = -Infinity;
  const paths = new Set();
  for (const [index, frame] of manifest.frames.entries()) {
    if (frame.index !== index || !Number.isFinite(frame.sourceTimeSeconds) || frame.sourceTimeSeconds <= priorTime) {
      throw new Error(filename + ' has unordered frame indices or timestamps.');
    }
    const resolved = framePath(root, frame.file);
    if (paths.has(resolved)) throw new Error(filename + ' references one image for multiple frames.');
    paths.add(resolved);
    priorTime = frame.sourceTimeSeconds;
  }
  return { manifest, root };
}

async function verifyFiles(result, indices) {
  const checks = await Promise.allSettled(indices.map(async (index) => {
    const filename = framePath(result.root, result.manifest.frames[index].file);
    if (!(await fs.stat(filename)).isFile()) throw new Error(filename + ' is not a file.');
  }));
  const missing = checks.flatMap((check, i) => check.status === 'rejected' ? [result.manifest.frames[indices[i]].file] : []);
  if (missing.length) throw new Error('Missing/non-file images under ' + result.root + ': ' + JSON.stringify({ count: missing.length, firstPaths: missing.slice(0, 10) }));
}

async function decodeGray(config, filename, width, height) {
  const metadata = await execute(config.tools.ffprobe, ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,pix_fmt', '-of', 'json', filename], { maxBuffer: 1024 * 1024, windowsHide: true });
  const stream = JSON.parse(metadata.stdout).streams?.[0];
  if (stream?.width !== width || stream?.height !== height || stream?.pix_fmt !== 'gray') {
    throw new Error(filename + ' is not the declared full-size 8-bit grayscale raster: ' + JSON.stringify(stream));
  }
  const decoded = await execute(config.tools.ffmpeg, ['-v', 'error', '-i', filename, '-map', '0:v:0',
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], {
    encoding: 'buffer', maxBuffer: width * height + 1024 * 1024, windowsHide: true,
  });
  if (decoded.stdout.length !== width * height) throw new Error(filename + ' decoded to an unexpected pixel count.');
  return decoded.stdout;
}

function comparePixels(left, right, threshold) {
  let maximum = 0, sum = 0, squareSum = 0, above = 0, leftSum = 0, rightSum = 0;
  const leftLevels = new Uint8Array(256), rightLevels = new Uint8Array(256);
  for (let index = 0; index < left.length; index++) {
    const a = left[index], b = right[index], difference = Math.abs(a - b);
    maximum = Math.max(maximum, difference);
    sum += difference;
    squareSum += difference * difference;
    if (difference > threshold) above++;
    leftLevels[a] = 1;
    rightLevels[b] = 1;
    leftSum += a;
    rightSum += b;
  }
  return {
    maxGrayLevelDifference: maximum,
    meanGrayLevelDifference: sum / left.length,
    meanNormalizedAlphaDifference: sum / left.length / 255,
    rootMeanSquareGrayLevelDifference: Math.sqrt(squareSum / left.length),
    pixelsAboveThreshold: above,
    fractionAboveThreshold: above / left.length,
    leftGrayLevels: leftLevels.reduce((a, b) => a + b, 0),
    rightGrayLevels: rightLevels.reduce((a, b) => a + b, 0),
    leftMeanAlpha: leftSum / left.length / 255,
    rightMeanAlpha: rightSum / right.length / 255,
  };
}

async function compareAlpha({ leftFile, rightFile, config, maxDifference = 2, samplesOnly = false }) {
  if (!Number.isFinite(maxDifference) || maxDifference < 0 || maxDifference > 255) {
    throw new Error('--max-difference must be from 0 to 255 gray levels.');
  }
  if (!config.tools?.ffmpeg || !config.tools?.ffprobe) throw new Error('Config must provide tools.ffmpeg and tools.ffprobe.');
  const [left, right] = await Promise.all([loadManifest(leftFile), loadManifest(rightFile)]);
  const a = left.manifest, b = right.manifest;
  if (a.frameSize.width !== b.frameSize.width || a.frameSize.height !== b.frameSize.height) throw new Error('Manifest display dimensions differ.');
  if (a.frames.length !== b.frames.length) throw new Error('Manifest frame counts differ.');
  if (a.downsampleRatio !== b.downsampleRatio || a.model?.name !== b.model?.name || a.model?.sha256 !== b.model?.sha256) {
    throw new Error('Model identity or downsample ratio differs; provider output comparison requires identical settings.');
  }
  let maxTimestampDifferenceSeconds = 0;
  for (let index = 0; index < a.frames.length; index++) {
    const difference = Math.abs(a.frames[index].sourceTimeSeconds - b.frames[index].sourceTimeSeconds);
    maxTimestampDifferenceSeconds = Math.max(maxTimestampDifferenceSeconds, difference);
    if (difference > 0.000001) throw new Error('Source timestamp differs at frame ' + index + ' by ' + difference + ' seconds.');
  }
  const sampleIndices = [...new Set([0, Math.floor(a.frames.length / 2), a.frames.length - 1])];
  const fileIndices = samplesOnly ? sampleIndices : a.frames.map((frame) => frame.index);
  await Promise.all([verifyFiles(left, fileIndices), verifyFiles(right, fileIndices)]);
  const comparisons = [];
  for (const index of sampleIndices) {
    const [leftGray, rightGray] = await Promise.all([
      decodeGray(config, framePath(left.root, a.frames[index].file), a.frameSize.width, a.frameSize.height),
      decodeGray(config, framePath(right.root, b.frames[index].file), b.frameSize.width, b.frameSize.height),
    ]);
    comparisons.push({ index, sourceTimeSeconds: a.frames[index].sourceTimeSeconds, ...comparePixels(leftGray, rightGray, maxDifference) });
  }
  return {
    status: comparisons.every((frame) => frame.maxGrayLevelDifference <= maxDifference) ? 'passed' : 'failed',
    thresholdGrayLevels: maxDifference,
    frameSize: a.frameSize,
    totalFrames: a.frames.length,
    maxTimestampDifferenceSeconds,
    fileExistenceScope: samplesOnly ? 'first-middle-last-only' : 'every-manifest-frame',
    verifiedFileCountPerSide: fileIndices.length,
    pixelComparisonScope: 'first-middle-last-only',
    leftDiagnostics: a.diagnostics,
    rightDiagnostics: b.diagnostics,
    comparisons,
  };
}

async function main() {
  const { values } = parseArgs({ options: {
    left: { type: 'string' }, right: { type: 'string' }, config: { type: 'string' },
    'max-difference': { type: 'string', default: '2' }, 'samples-only': { type: 'boolean', default: false },
  } });
  if (!values.left || !values.right || !values.config) {
    throw new Error('Usage: compare-alpha.cjs --left <matte.json> --right <matte.json> --config <config.json> [--max-difference 2] [--samples-only]');
  }
  const result = await compareAlpha({
    leftFile: path.resolve(values.left), rightFile: path.resolve(values.right),
    config: JSON.parse(await fs.readFile(path.resolve(values.config), 'utf8')),
    maxDifference: Number(values['max-difference']), samplesOnly: values['samples-only'],
  });
  // Metrics remain available even when provider differences exceed the threshold.
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exitCode = result.status === 'passed' ? 0 : 1;
}

if (require.main === module) main().catch((error) => {
  process.stdout.write(JSON.stringify({ status: 'error', error: error.message }) + '\n');
  process.exitCode = 1;
});
module.exports = { compareAlpha };
