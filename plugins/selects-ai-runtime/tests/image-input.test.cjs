'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const zlib = require('node:zlib');
const fixtures = require('./image-fixtures.cjs');
const { readImageHeader } = require('../lib/image-header.cjs');
const { probeImage, decodeImage } = require('../lib/image.cjs');
const { validateRequest } = require('../lib/request.cjs');
const { faceParameters, sampleSelector } = require('../tasks/faces-detect.cjs');
const { verifyOutputs } = require('../lib/outputs.cjs');
const { writeGrayPng } = require('../lib/png.cjs');
const descriptor = require('../runtime.json');
const bytes = format => Buffer.from(fixtures[format], 'base64');
const request = (source, task = 'faces.detect') => ({ contractVersion: 1, task, input: { source: { path: source, kind: 'image' } } });

function exifJpeg(orientation) {
  const tiff = Buffer.alloc(26); tiff.write('II'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x112, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(orientation, 18);
  const payload = Buffer.concat([Buffer.from('Exif\0\0'), tiff]), segment = Buffer.alloc(4);
  segment[0] = 255; segment[1] = 0xe1; segment.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([bytes('jpeg').subarray(0, 2), segment, payload, bytes('jpeg').subarray(2)]);
}
function pngChunk(type, payload) {
  const chunk = Buffer.alloc(payload.length + 12); chunk.writeUInt32BE(payload.length); chunk.write(type, 4); payload.copy(chunk, 8);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, -4)) { crc ^= byte; for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; }
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4); return chunk;
}
function animatedWebp() {
  const chunk = Buffer.alloc(14); chunk.write('ANIM'); chunk.writeUInt32LE(6, 4);
  const out = Buffer.concat([bytes('webp'), chunk]); out.writeUInt32LE(out.length - 8, 4); return out;
}
test('image requests have no video range or sampling, while omitted kind remains video', () => {
  const input = request(path.resolve('photo.jpg'));
  assert.equal(validateRequest(input), input);
  assert.deepEqual(faceParameters(input), { scoreThreshold: 0.8 });
  assert.ok(sampleSelector(faceParameters(input))(0)); assert.equal(sampleSelector(faceParameters(input))(0.1), false);
  for (const patch of [{ sourceRange: { startSeconds: 0, endSeconds: 1 } }, { sampleEverySeconds: 1 }, { outputMode: 'foreground-video' }]) {
    assert.throws(() => validateRequest({ ...input, input: { ...input.input, ...patch } }), /Image input/);
  }
  assert.throws(() => validateRequest({ ...input, input: { source: { path: input.input.source.path } } }), /nonempty/);
  assert.throws(() => validateRequest({ ...input, input: { source: { path: input.input.source.path, kind: 'audio' } } }), /source kind/);
});
test('image header accepts static JPEG, PNG and lossless WebP independently of filename', () => {
  for (const format of ['jpeg', 'png', 'webp']) assert.deepEqual(readImageHeader(bytes(format)), { format, width: 6, height: 4, orientation: 1 });
  for (let orientation = 1; orientation <= 8; orientation++) assert.equal(readImageHeader(exifJpeg(orientation)).orientation, orientation);
});
test('unsupported, corrupt, animated and oversized images are rejected before decoding', () => {
  const animatedPng = Buffer.concat([bytes('png').subarray(0, 33), pngChunk('acTL', Buffer.alloc(8)), bytes('png').subarray(33)]);
  for (const animated of [animatedPng, animatedWebp()]) assert.throws(() => readImageHeader(animated), /IMAGE_ANIMATED/);
  assert.throws(() => readImageHeader(Buffer.from('GIF89a')), /IMAGE_FORMAT_UNSUPPORTED/);
  assert.throws(() => readImageHeader(bytes('jpeg').subarray(0, -2)), /IMAGE_INVALID/);
  assert.throws(() => readImageHeader(bytes('png').subarray(0, -1)), /IMAGE_INVALID/);
  assert.throws(() => readImageHeader(exifJpeg(9)), /IMAGE_INVALID/);
  const oversized = bytes('png'); oversized.writeUInt32BE(100000, 16); oversized.writeUInt32BE(100000, 20);
  assert.throws(() => readImageHeader(oversized), /IMAGE_TOO_LARGE/);
});

async function decode(t, encoded, config, signal = new AbortController().signal, emit = () => {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'selects-ai-image-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source-without-extension'), req = request(source); await fs.writeFile(source, encoded);
  const image = await probeImage(config, req, signal), metrics = { decoderWaitMs: 0, decodedFrames: 0 }, frames = [];
  for await (const frame of decodeImage(config, req, image, signal, emit, metrics)) frames.push(frame);
  return { image, frames, metrics };
}
function orientedRgb(rgb, orientation) {
  const swapped = orientation >= 5, width = swapped ? 4 : 6, height = swapped ? 6 : 4, output = Buffer.alloc(72);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
    const positions = [[x, y], [x, y], [5 - x, y], [5 - x, 3 - y], [x, 3 - y], [y, x], [3 - y, x], [3 - y, 5 - x], [y, 5 - x]];
    const [dx, dy] = positions[orientation]; rgb.copy(output, (dy * width + dx) * 3, (y * 6 + x) * 3, (y * 6 + x) * 3 + 3);
  }
  return { width, height, output };
}
const toolConfig = process.env.AI_RUNTIME_CONFIG;
test('real decoder produces one RGB raster for all three supported static formats', { skip: !toolConfig }, async t => {
  const config = JSON.parse(await fs.readFile(toolConfig, 'utf8'));
  for (const format of ['jpeg', 'png', 'webp']) {
    const decoded = await decode(t, bytes(format), config);
    assert.equal(decoded.frames.length, 1); assert.equal(decoded.frames[0].index, 0); assert.equal(decoded.frames[0].sourceTimeSeconds, 0);
    assert.equal(decoded.frames[0].rgb.length, 72); assert.equal(decoded.metrics.decodedFrames, 1);
    assert.equal(decoded.image.sourceRange, undefined); assert.equal(decoded.image.constantFrameRate, undefined);
  }
  assert.deepEqual((await decode(t, bytes('png'), config)).frames[0].rgb, (await decode(t, bytes('webp'), config)).frames[0].rgb);
});
test('real JPEG decoder applies all eight EXIF rotations/reflections exactly once', { skip: !toolConfig }, async t => {
  const config = JSON.parse(await fs.readFile(toolConfig, 'utf8')), original = (await decode(t, bytes('jpeg'), config)).frames[0].rgb;
  for (let orientation = 1; orientation <= 8; orientation++) {
    const decoded = await decode(t, exifJpeg(orientation), config), expected = orientedRgb(original, orientation);
    assert.equal(decoded.image.width, expected.width); assert.equal(decoded.image.height, expected.height);
    assert.deepEqual(decoded.frames[0].rgb, expected.output, 'EXIF orientation ' + orientation);
  }
});
test('real decode rejects corrupt PNG pixels and aborts an owned child', { skip: !toolConfig }, async t => {
  const config = JSON.parse(await fs.readFile(toolConfig, 'utf8'));
  // Structurally valid chunks and CRC, but too few decoded scanlines for IHDR.
  const corrupt = Buffer.concat([bytes('png').subarray(0, 33), pngChunk('IDAT', zlib.deflateSync(Buffer.from([0, 1]))), pngChunk('IEND', Buffer.alloc(0))]);
  await assert.rejects(decode(t, corrupt, config), /Media tool exited|IMAGE_DECODE_INVALID/);
  const controller = new AbortController();
  await assert.rejects(decode(t, bytes('png'), config, controller.signal, () => queueMicrotask(() => controller.abort())), { code: 'JOB_CANCELED' });
});

test('image artifacts require one raster and cannot invent playback time or frame rate', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'selects-ai-image-output-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const image = { sourceKind: 'image', width: 2, height: 2, frameTimes: [0] };
  await writeGrayPng(path.join(root, 'alpha/0.png'), 2, 2, Buffer.from([0, 64, 128, 255]));
  for (const task of ['faces.detect', 'person.matte']) {
    const req = request(path.resolve('photo.png'), task), filename = task === 'person.matte' ? 'matte.json' : 'faces.json';
    const result = { files: task === 'person.matte' ? { manifest: filename } : { detections: filename } };
    const document = task === 'person.matte' ? {
      schemaVersion: 1, task, sourceKind: 'image', frameSize: { width: 2, height: 2 }, alphaEncoding: 'grayscale-png-8bit', downsampleRatio: 0.25,
      model: { name: descriptor.tasks[task].model, sha256: descriptor.tasks[task].sha256 }, diagnostics: {}, frames: [{ index: 0, sourceTimeSeconds: 0, file: 'alpha/0.png' }],
    } : {
      contractVersion: 1, task, sourceKind: 'image', frameSize: { width: 2, height: 2 }, coordinateSpace: 'display-pixels', boxFormat: 'xyxy',
      model: { id: descriptor.tasks[task].model, sha256: descriptor.tasks[task].sha256 }, landmarkOrder: ['rightEye', 'leftEye', 'nose', 'rightMouth', 'leftMouth'],
      parameters: { scoreThreshold: 0.8 }, preprocessing: { kind: 'bilinear-top-left-zero-pad', tensorLayout: 'NCHW', channels: 'BGR', valueRange: [0, 255], noUpscale: true, inputSize: { width: 640, height: 640 }, contentSize: { width: 2, height: 2 } },
      samples: [{ index: 0, sourceTimeSeconds: 0, faces: [] }],
    };
    const verify = async value => { await fs.writeFile(path.join(root, filename), JSON.stringify(value)); await verifyOutputs(root, req, result, image); };
    await verify(document);
    for (const field of ['sourceFrameRate', 'sourceRange', 'fps', 'foregroundVideo']) await assert.rejects(verify({ ...document, [field]: {} }), /still-image/);
    await assert.rejects(verify({ ...document, sourceKind: undefined }), /still-image/);
    const rows = document.frames ? 'frames' : 'samples';
    await assert.rejects(verify({ ...document, [rows]: [document[rows][0], document[rows][0]] }), /still-image/);
    await assert.rejects(verify({ ...document, [rows]: [{ ...document[rows][0], sourceTimeSeconds: 1 }] }), /still-image/);
  }
});
