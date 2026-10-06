'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { readJson } = require('./files.cjs');
const { verifyGrayAvif } = require('./avif.cjs');
const descriptor = require('../runtime.json');
const LANDMARK_ORDER = require('../schemas/faces.schema.json').properties.landmarkOrder.const;

function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function sameArray(value, expected) { return Array.isArray(value) && value.length === expected.length && value.every((part, index) => part === expected[index]); }

function verifyModelMetadata(model, task, idKey) {
  const expected = descriptor.tasks[task];
  if (!object(model) || model[idKey] !== expected.model || model.sha256 !== expected.sha256) throw new Error('Output model metadata differs from the pinned task');
}

function verifyFaceMetadata(document, request, video) {
  verifyModelMetadata(document.model, request.task, 'id');
  if (!sameArray(document.landmarkOrder, LANDMARK_ORDER)) throw new Error('Output landmark order differs from the face contract');
  const parameters = document.parameters;
  const range = request.input.sourceRange;
  if (!object(parameters) || parameters.sourceRange?.startSeconds !== range.startSeconds || parameters.sourceRange?.endSeconds !== range.endSeconds
    || parameters.sampleEverySeconds !== (request.input.sampleEverySeconds ?? 0.5) || parameters.scoreThreshold !== (request.input.scoreThreshold ?? 0.8)) {
    throw new Error('Output face parameters differ from the request');
  }
  const preprocessing = document.preprocessing;
  const content = preprocessing?.contentSize;
  if (!object(preprocessing) || preprocessing.kind !== 'bilinear-top-left-zero-pad' || preprocessing.tensorLayout !== 'NCHW'
    || preprocessing.channels !== 'BGR' || !sameArray(preprocessing.valueRange, [0, 255]) || preprocessing.noUpscale !== true
    || preprocessing.inputSize?.width !== 640 || preprocessing.inputSize?.height !== 640
    || !Number.isInteger(content?.width) || !Number.isInteger(content?.height) || content.width < 1 || content.height < 1
    || content.width > Math.min(640, video.width) || content.height > Math.min(640, video.height)) {
    throw new Error('Output preprocessing differs from the face contract');
  }
}

async function verifyOutputFile(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => part === '..' || part === '.' || !part)) throw new Error('Invalid relative result file');
  const resolvedRoot = await fs.realpath(root);
  const resolved = await fs.realpath(path.join(root, relative));
  const inside = path.relative(resolvedRoot, resolved);
  if (inside.startsWith('..') || path.isAbsolute(inside) || !(await fs.stat(resolved)).isFile()) throw new Error('Result escapes the job output folder');
  return resolved;
}

function verifyFrameSize(document, video) {
  if (document.frameSize?.width !== video.width || document.frameSize?.height !== video.height) throw new Error('Output frame size differs from display raster');
}

function verifyTimestamp(frame, video, range) {
  const time = frame.sourceTimeSeconds;
  if (!Number.isInteger(frame.index) || frame.index < 0 || frame.index >= video.frameTimes.length || !Number.isFinite(time) || time < range.startSeconds || time >= range.endSeconds || Math.abs(time - video.frameTimes[frame.index]) > 1e-6) throw new Error('Output timestamp differs from source frame');
}

async function verifyGrayPng(filename, video) {
  const handle = await fs.open(filename, 'r');
  const header = Buffer.alloc(33);
  try {
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead !== 33 || !header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || header.readUInt32BE(8) !== 13 || header.toString('ascii', 12, 16) !== 'IHDR' || header.readUInt32BE(16) !== video.width || header.readUInt32BE(20) !== video.height || header[24] !== 8 || header[25] !== 0) throw new Error('Alpha output must be full-size 8-bit grayscale PNG');
  } finally { await handle.close(); }
}

async function verifyOutputs(root, request, result, video) {
  if (!descriptor.tasks[request.task]) throw new Error('Unsupported output task');
  if (!result || !result.files || !Object.keys(result.files).length) throw new Error('Runtime produced no result files');
  for (const file of Object.values(result.files)) await verifyOutputFile(root, file);
  if (request.task === 'person.matte') {
    const manifest = await readJson(await verifyOutputFile(root, result.files.manifest));
    const alphaEncoding = request.input.alphaEncoding ?? 'grayscale-png-8bit';
    if (manifest.schemaVersion !== 1 || manifest.task !== request.task || !Array.isArray(manifest.frames) || manifest.frames.length !== video.frameTimes.length || manifest.alphaEncoding !== alphaEncoding) throw new Error('Invalid matte manifest');
    verifyModelMetadata(manifest.model, request.task, 'name');
    if (manifest.downsampleRatio !== (request.input.downsampleRatio ?? 0.25) || !object(manifest.diagnostics)) throw new Error('Output matte metadata differs from the request contract');
    verifyFrameSize(manifest, video);
    const rate = video.constantFrameRate;
    const range = video.sourceRange;
    if (range ? manifest.sourceFrameRate?.numerator !== rate.numerator
      || manifest.sourceFrameRate?.denominator !== rate.denominator
      || manifest.sourceRange?.startSeconds !== range.startSeconds
      || manifest.sourceRange?.endSeconds !== range.endSeconds
      : manifest.sourceFrameRate !== undefined || manifest.sourceRange !== undefined) {
      throw new Error('Matte source interval differs from the verified display-frame clock');
    }
    const wantsForeground = request.input.outputMode === 'foreground-video';
    const keys = Object.keys(result.files).sort();
    if (keys.join(',') !== (wantsForeground ? 'foreground,manifest' : 'manifest')) throw new Error('Matte output files differ from requested output mode');
    if (wantsForeground) {
      const f = manifest.foregroundVideo;
      const rate = video.constantFrameRate;
      if (!rate || !object(f) || f.file !== 'foreground.mov' || result.files.foreground !== f.file || f.encoding !== 'prores-4444' || f.width !== video.width || f.height !== video.height || f.frameCount !== video.frameTimes.length || f.frameRate?.numerator !== rate.numerator || f.frameRate?.denominator !== rate.denominator || f.sourceStartSeconds !== video.frameTimes[0] || Math.abs(f.durationSeconds - video.frameTimes.length * rate.denominator / rate.numerator) > 1e-6) throw new Error('Foreground metadata differs from source and matte clock');
      if (!(await fs.stat(await verifyOutputFile(root, f.file))).size) throw new Error('Foreground movie is empty');
    } else if (manifest.foregroundVideo !== undefined) throw new Error('Unrequested foreground video');
    for (let index = 0; index < manifest.frames.length; index++) {
      const frame = manifest.frames[index];
      if (frame.index !== index) throw new Error('Matte frame indices must be contiguous');
      verifyTimestamp(frame, video, request.input.sourceRange);
      const extension = alphaEncoding === 'grayscale-avif-8bit' ? '.avif' : '.png';
      if (!frame.file?.endsWith(extension)) throw new Error('Matte frame filename differs from alpha encoding');
      const filename = await verifyOutputFile(root, frame.file);
      if (alphaEncoding === 'grayscale-avif-8bit') await verifyGrayAvif(filename, video.width, video.height);
      else await verifyGrayPng(filename, video);
    }
  } else {
    const detections = await readJson(await verifyOutputFile(root, result.files.detections));
    if (detections.contractVersion !== 1 || detections.task !== request.task || detections.coordinateSpace !== 'display-pixels' || detections.boxFormat !== 'xyxy' || !Array.isArray(detections.samples) || !detections.samples.length) throw new Error('Invalid face detections');
    verifyFaceMetadata(detections, request, video);
    verifyFrameSize(detections, video);
    let previous = -1;
    for (const sample of detections.samples) {
      verifyTimestamp(sample, video, request.input.sourceRange);
      if (sample.index <= previous || !Array.isArray(sample.faces)) throw new Error('Face samples must follow source order');
      previous = sample.index;
      for (const face of sample.faces) {
        const box = face.box;
        if (!box || !['xmin', 'ymin', 'xmax', 'ymax'].every(key => Number.isFinite(box[key])) || box.xmin < 0 || box.ymin < 0 || box.xmax > video.width || box.ymax > video.height || box.xmin >= box.xmax || box.ymin >= box.ymax || !Number.isFinite(face.score) || face.score < 0 || face.score > 1 || !Array.isArray(face.landmarks) || face.landmarks.length !== 5 || !face.landmarks.every(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))) throw new Error('Invalid face geometry');
      }
    }
  }
}
module.exports = { verifyOutputs, verifyOutputFile };
