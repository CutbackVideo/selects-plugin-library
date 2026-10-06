'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { startTool } = require('./process.cjs');
const { throwIfAborted } = require('./errors.cjs');

const MAX_METADATA_BYTES = 256 * 1024;
const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const LEGACY_ENCODER = Object.freeze({ codec: 'libaom-av1', crf: 24, cpuUsed: 6, threads: 2,
  pixelFormat: 'gray', colorRange: 'full', independentStillImages: true });
// Mac still-image measurements retain CRF24 while avoiding the video-oriented
// good-mode search. Windows retains its measured configuration until validated.
const MAC_ENCODER = Object.freeze({ ...LEGACY_ENCODER, usage: 'allintra', cpuUsed: 7, rowMt: true, threads: 4 });

function boxes(bytes, start = 0, end = bytes.length) {
  const result = [];
  while (start < end) {
    if (result.length >= 256 || end - start < 8) throw new Error('Invalid AVIF box layout');
    const size = bytes.readUInt32BE(start);
    if (size < 8 || size > end - start) throw new Error('Invalid AVIF box size');
    result.push({ type: bytes.toString('ascii', start + 4, start + 8), data: bytes.subarray(start + 8, start + size) });
    start += size;
  }
  return result;
}

function single(parts, type) {
  const matches = parts.filter(part => part.type === type);
  if (matches.length !== 1) throw new Error(`Expected one AVIF ${type} box`);
  return matches[0].data;
}

function verifyAvifMetadata(metadata, width, height) {
  if (metadata.length < 4 || metadata.readUInt32BE(0) !== 0) throw new Error('Unsupported AVIF metadata version');
  const parts = boxes(metadata, 4);
  const primary = single(parts, 'pitm');
  if (primary.length !== 6 || primary.readUInt32BE(0) !== 0) throw new Error('Unsupported AVIF primary item');
  const itemId = primary.readUInt16BE(4);
  const items = single(parts, 'iinf');
  if (items.length < 6 || items.readUInt32BE(0) !== 0 || items.readUInt16BE(4) !== 1) throw new Error('AVIF must contain one still image');
  const item = single(boxes(items, 6), 'infe');
  if (item.length < 13 || item[0] !== 2 || item.readUInt16BE(4) !== itemId || item.readUInt16BE(6) !== 0 || item.toString('ascii', 8, 12) !== 'av01') throw new Error('AVIF primary item must be unprotected AV1');
  const propertyParts = boxes(single(parts, 'iprp'));
  const properties = boxes(single(propertyParts, 'ipco'));
  const associations = single(propertyParts, 'ipma');
  if (associations.length < 11 || associations.readUInt32BE(0) !== 0 || associations.readUInt32BE(4) !== 1 || associations.readUInt16BE(8) !== itemId || associations.length !== 11 + associations[10]) throw new Error('Invalid AVIF property associations');
  const linked = [];
  for (let offset = 11; offset < associations.length; offset++) {
    const index = associations[offset] & 127;
    if (!index || index > properties.length || linked.includes(properties[index - 1])) throw new Error('Invalid AVIF property index');
    linked.push(properties[index - 1]);
  }
  const size = single(linked, 'ispe');
  const pixels = single(linked, 'pixi');
  const codec = single(linked, 'av1C');
  if (size.length !== 12 || size.readUInt32BE(0) !== 0 || size.readUInt32BE(4) !== width || size.readUInt32BE(8) !== height
    || pixels.length !== 6 || pixels.readUInt32BE(0) !== 0 || pixels[4] !== 1 || pixels[5] !== 8
    || codec.length < 4 || codec[0] !== 0x81 || codec[2] & 0x60 || !(codec[2] & 0x10)) {
    throw new Error('Alpha output must be full-size 8-bit monochrome AVIF');
  }
}

async function verifyGrayAvif(filename, width, height) {
  const file = await fs.open(filename, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size < 32 || stat.size > MAX_IMAGE_BYTES) throw new Error('Invalid AVIF image size');
    let offset = 0, count = 0, metadata, brand, imageData = false;
    while (offset < stat.size) {
      if (++count > 32 || stat.size - offset < 8) throw new Error('Invalid AVIF box layout');
      const header = Buffer.alloc(8);
      if ((await file.read(header, 0, 8, offset)).bytesRead !== 8) throw new Error('Truncated AVIF header');
      const length = header.readUInt32BE(0), type = header.toString('ascii', 4, 8);
      if (length < 8 || length > stat.size - offset) throw new Error('Invalid AVIF box size');
      if (type === 'meta' || type === 'ftyp') {
        if (length > MAX_METADATA_BYTES || (type === 'meta' ? metadata : brand)) throw new Error('Invalid AVIF metadata size');
        const bytes = Buffer.alloc(length - 8);
        if ((await file.read(bytes, 0, bytes.length, offset + 8)).bytesRead !== bytes.length) throw new Error('Truncated AVIF metadata');
        if (type === 'meta') metadata = bytes;
        else brand = bytes;
      } else if (type === 'mdat' && !imageData && length > 8) imageData = true;
      else if (type !== 'free') throw new Error('AVIF must contain one independent still image');
      offset += length;
    }
    if (!brand || brand.length < 12 || (brand.length - 8) % 4 || brand.toString('ascii', 0, 4) !== 'avif' || !metadata || !imageData) throw new Error('AVIF must contain one independent still image');
    for (let index = 8; index < brand.length; index += 4) {
      if (brand.toString('ascii', index, index + 4) === 'avis') throw new Error('Animated AVIF is not an alpha frame');
    }
    verifyAvifMetadata(metadata, width, height);
  } finally { await file.close(); }
}

function startAvifFrames({ config, width, height, outputDir, signal, emitProgress }) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) throw new Error('Invalid grayscale raster');
  const alphaDir = path.join(outputDir, 'alpha');
  const encoderSettings = process.platform === 'darwin' ? MAC_ENCODER : LEGACY_ENCODER;
  // image2 remuxes each all-intra packet as a complete still AVIF. This rate is
  // an encoder clock only: actual source PTS remains in the frame manifest.
  const encoder = startTool(config.tools.ffmpeg, [
    '-v', 'error', '-nostdin', '-n', '-f', 'rawvideo', '-pix_fmt', 'gray',
    '-video_size', `${width}x${height}`, '-framerate', '1', '-i', 'pipe:0', '-an',
    '-c:v', encoderSettings.codec, '-crf', String(encoderSettings.crf), '-b:v', '0',
    ...(encoderSettings.usage ? ['-usage', encoderSettings.usage, '-row-mt', '1'] : []),
    '-cpu-used', String(encoderSettings.cpuUsed), '-g', '1',
    '-still-picture', '1', '-lag-in-frames', '0', '-flags', '+global_header',
    '-color_range', 'pc', '-pix_fmt', 'gray', '-threads', String(encoderSettings.threads),
    '-f', 'image2', '-start_number', '0', path.join(alphaDir, '%06d.partial.avif'),
  ], { signal, stdin: true, onSpawn: encoderPid => emitProgress?.({ step: 'encoding-masks', encoderPid }) });
  encoder.child.stdout.resume();
  encoder.child.stdin.on('error', () => {});
  let frames = 0, published = false;
  const name = index => String(index).padStart(6, '0');
  return {
    encoderSettings,
    async write(alpha) {
      throwIfAborted(signal);
      if (!Buffer.isBuffer(alpha) || alpha.length !== width * height) throw new Error('Invalid grayscale raster');
      try {
        await new Promise((resolve, reject) => encoder.child.stdin.write(alpha, error => error ? reject(error) : resolve()));
      } catch (error) {
        // Prefer the tool's failure diagnostic to a secondary broken-pipe error.
        await encoder.completed;
        throw error;
      }
      return 'alpha/' + name(frames++) + '.avif';
    },
    async finish() {
      throwIfAborted(signal);
      encoder.child.stdin.end();
      await encoder.completed;
      throwIfAborted(signal);
      if (!frames) throw new Error('AVIF masks require at least one frame');
      const expected = Array.from({ length: frames }, (_, index) => name(index) + '.partial.avif');
      const actual = (await fs.readdir(alphaDir)).sort();
      if (actual.length !== frames || actual.some((file, index) => file !== expected[index])) throw new Error('Encoded AVIF count differs from source frame count');
      for (let index = 0; index < frames; index++) {
        throwIfAborted(signal);
        await verifyGrayAvif(path.join(alphaDir, expected[index]), width, height);
        await fs.rename(path.join(alphaDir, expected[index]), path.join(alphaDir, name(index) + '.avif'));
      }
      published = true;
    },
    async dispose() {
      if (encoder.child.exitCode === null) encoder.child.kill('SIGKILL');
      encoder.child.stdin.destroy(); encoder.child.stdout.destroy();
      await encoder.completed.catch(() => {});
      if (!published) {
        const own = (await fs.readdir(alphaDir).catch(() => [])).filter(file => /^\d{6,}\.(?:partial\.)?avif$/.test(file));
        await Promise.all(own.map(file => fs.rm(path.join(alphaDir, file), { force: true })));
      }
    },
  };
}

module.exports = { startAvifFrames, verifyGrayAvif };
