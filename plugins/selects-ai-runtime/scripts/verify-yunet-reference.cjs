#!/usr/bin/env node
'use strict';

// Compare the native backend against independently recorded OpenCV rows on the
// same RGB pixels. Golden generation uses Python only in the lab test environment;
// the AI runtime and this verifier need only the Selects embedded Node runtime.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { writeJson } = require('../lib/files.cjs');
const { rgbToLetterboxBlob, decodeYuNet } = require('../lib/yunet-decode.cjs');
const { YUNET_MODEL_SHA256 } = require('../tasks/faces-detect.cjs');

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return path.resolve(process.argv[index + 1]);
}

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function main() {
  const config = JSON.parse(await fs.readFile(argument('--config'), 'utf8'));
  const referenceFile = argument('--reference');
  const reference = JSON.parse(await fs.readFile(referenceFile, 'utf8'));
  const model = await fs.readFile(config.models.yunet.path);
  assert.equal(hash(model), YUNET_MODEL_SHA256);
  assert.equal(reference.modelSha256, YUNET_MODEL_SHA256);
  const ort = require(config.ortModule);
  const session = await ort.InferenceSession.create(model, {
    executionProviders: ['cpu'], graphOptimizationLevel: 'all', intraOpNumThreads: 4,
  });
  let maxBoxErrorPixels = 0, maxLandmarkErrorPixels = 0, maxScoreError = 0;
  let inferenceCount = 0, comparedFaceCount = 0, multiFaceResults = 0;
  try {
    for (const image of reference.images) {
      const rgb = await fs.readFile(path.resolve(path.dirname(referenceFile), image.file));
      assert.equal(hash(rgb), image.rgbSha256, `${image.name}: reference RGB pixels changed`);
      const blob = rgbToLetterboxBlob(rgb, image.width, image.height);
      // Hash the full interleaved padded BGR image recorded independently by
      // NumPy, so a tensor channel swap or padding change cannot pass unnoticed.
      const paddedBgr = Buffer.alloc(640 * 640 * 3);
      for (let pixel = 0; pixel < 640 * 640; pixel += 1) {
        for (let channel = 0; channel < 3; channel += 1) paddedBgr[pixel * 3 + channel] = blob.data[channel * 640 * 640 + pixel];
      }
      assert.equal(hash(paddedBgr), image.paddedBgrSha256, `${image.name}: padded BGR input differs from OpenCV`);
      const input = new ort.Tensor('float32', blob.data, [1, 3, 640, 640]);
      let output;
      try {
        output = await session.run({ [session.inputNames[0]]: input });
        inferenceCount += 1;
        const values = Object.fromEntries(Object.entries(output).map(([name, tensor]) => [name, tensor.data]));
        for (const [threshold, expected] of Object.entries(image.faces)) {
          const actual = decodeYuNet(values, 640, 640, { score: Number(threshold) });
          assert.equal(actual.length, expected.length, `${image.name} @${threshold}: face count`);
          if (actual.length > 1) multiFaceResults += 1;
          for (const [index, face] of actual.entries()) {
            const row = expected[index];
            for (let coordinate = 0; coordinate < 4; coordinate += 1) {
              maxBoxErrorPixels = Math.max(maxBoxErrorPixels, Math.abs(face.box[coordinate] - row[coordinate]));
            }
            const landmarks = face.landmarks.flat();
            for (let coordinate = 0; coordinate < 10; coordinate += 1) {
              maxLandmarkErrorPixels = Math.max(maxLandmarkErrorPixels, Math.abs(landmarks[coordinate] - row[4 + coordinate]));
            }
            maxScoreError = Math.max(maxScoreError, Math.abs(face.score - row[14]));
            comparedFaceCount += 1;
          }
        }
      } finally {
        input.dispose?.();
        if (output) for (const tensor of Object.values(output)) tensor.dispose?.();
      }
    }
  } finally {
    await session.release();
  }
  assert.ok(comparedFaceCount > 0, 'Reference must contain actual faces');
  assert.ok(multiFaceResults > 0, 'Reference must include a multi-face NMS result');
  assert.ok(maxBoxErrorPixels < 1, `Box error ${maxBoxErrorPixels} pixels`);
  assert.ok(maxLandmarkErrorPixels < 1, `Landmark error ${maxLandmarkErrorPixels} pixels`);
  assert.ok(maxScoreError < 1e-4, `Score error ${maxScoreError}`);
  const report = {
    status: 'passed', opencv: reference.opencv, modelSha256: YUNET_MODEL_SHA256,
    runtime: { node: process.versions.node, electron: process.versions.electron ?? null, platform: process.platform, arch: process.arch },
    imageCount: reference.images.length, inferenceCount, comparedFaceCount, multiFaceResults,
    maxBoxErrorPixels, maxLandmarkErrorPixels, maxScoreError,
    tolerance: { boxPixels: 1, landmarkPixels: 1, score: 1e-4 },
  };
  await writeJson(argument('--output'), report);
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

main().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
