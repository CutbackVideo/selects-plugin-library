'use strict';
const fs = require('node:fs/promises');
const { startTool } = require('./process.cjs');
const { throwIfAborted } = require('./errors.cjs');
const { readImageHeader } = require('./image-header.cjs');

// Match EXIF display orientation (including reflection); never let FFmpeg also
// autorotate the pixels. Dimensions and coordinates name the upright picture.
const ORIENTATION_FILTERS = ['', '', 'hflip', 'hflip,vflip', 'vflip', 'transpose=cclock_flip', 'transpose=clock', 'transpose=clock_flip', 'transpose=cclock'];
async function probeImage(_config, request, signal) {
  throwIfAborted(signal);
  const filename = request.input.source.path;
  const handle = await fs.open(filename, 'r');
  let header;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 64 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE: Expected a regular image file up to 64 MiB');
    const bytes = Buffer.alloc(stat.size);
    let filled = 0;
    while (filled < bytes.length) {
      throwIfAborted(signal);
      const { bytesRead } = await handle.read(bytes, filled, bytes.length - filled, filled);
      if (!bytesRead) throw new Error('IMAGE_CHANGED: Image changed while reading its header');
      filled += bytesRead;
    }
    if ((await handle.read(Buffer.alloc(1), 0, 1, filled)).bytesRead) throw new Error('IMAGE_CHANGED: Image grew while reading its header');
    header = readImageHeader(bytes);
  } finally { await handle.close(); }
  throwIfAborted(signal);
  const swapped = header.orientation >= 5;
  return {
    sourceKind: 'image', width: swapped ? header.height : header.width, height: swapped ? header.width : header.height,
    encodedWidth: header.width, encodedHeight: header.height, imageFormat: header.format, exifOrientation: header.orientation,
    frameTimes: [0], sourceFrameCount: 1,
  };
}
async function* decodeImage(config, request, image, signal, emitProgress, decoderMetrics) {
  throwIfAborted(signal);
  const filter = ORIENTATION_FILTERS[image.exifOrientation];
  const decoder = startTool(config.tools.ffmpeg, [
    '-v', 'error', '-nostdin', '-xerror', '-err_detect', 'explode', '-threads', '2', '-noautorotate', '-i', request.input.source.path,
    '-map', '0:v:0', '-an', '-sn', '-dn', ...(filter ? ['-vf', filter] : []),
    '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1',
  ], { signal, onSpawn: pid => emitProgress({ step: 'decoding', decoderPid: pid }) });
  const size = image.width * image.height * 3, rgb = Buffer.allocUnsafe(size);
  let filled = 0;
  const began = performance.now();
  try {
    for await (const bytes of decoder.child.stdout) {
      throwIfAborted(signal);
      if (filled + bytes.length > size) throw new Error('IMAGE_DECODE_INVALID: Decoder produced more than one display raster');
      bytes.copy(rgb, filled); filled += bytes.length;
    }
    await decoder.completed;
    if (filled !== size) throw new Error('IMAGE_DECODE_INVALID: Decoder did not produce a complete display raster');
    decoderMetrics.decoderWaitMs += performance.now() - began;
    decoderMetrics.decodedFrames = 1;
    yield { index: 0, sourceTimeSeconds: 0, rgb };
  } finally {
    if (decoder.child.exitCode === null) decoder.child.kill('SIGKILL');
    decoder.child.stdout.destroy();
    await decoder.completed.catch(() => {});
  }
}
module.exports = { probeImage, decodeImage };
