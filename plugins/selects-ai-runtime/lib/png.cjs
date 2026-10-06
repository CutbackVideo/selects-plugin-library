'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const bytes = Buffer.alloc(data.length + 12);
  bytes.writeUInt32BE(data.length);
  bytes.write(type, 4, 4, 'ascii');
  data.copy(bytes, 8);
  bytes.writeUInt32BE(crc32(bytes.subarray(4, data.length + 8)), data.length + 8);
  return bytes;
}
function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const a = Math.abs(estimate - left), b = Math.abs(estimate - above), c = Math.abs(estimate - upperLeft);
  return a <= b && a <= c ? left : b <= c ? above : upperLeft;
}
async function writeGrayPng(filename, width, height, pixels) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || pixels.length !== width * height) {
    throw new Error('Invalid grayscale raster');
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  const rows = Buffer.alloc((width + 1) * height);
  const source = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  // Standard PNG Paeth predicts from three already-decoded neighbors. It is
  // lossless and preserves independent frame access through existing decoders.
  for (let row = 0; row < height; row++) {
    const target = row * (width + 1);
    const current = row * width;
    rows[target] = 4;
    for (let x = 0; x < width; x++) {
      const left = x ? source[current + x - 1] : 0;
      const above = row ? source[current - width + x] : 0;
      const upperLeft = row && x ? source[current - width + x - 1] : 0;
      rows[target + x + 1] = source[current + x] - paeth(left, above, upperLeft);
    }
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(rows, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, png, { flag: 'wx' });
}
module.exports = { writeGrayPng };
