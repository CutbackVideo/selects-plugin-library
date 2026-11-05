'use strict';

// Grayscale 8-bit PNG encoding without Node, shared by the desktop writer
// (lib/png.cjs) and the web runtime. The caller supplies zlib-format deflate:
// node:zlib on desktop, CompressionStream('deflate') in a browser.
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
  const bytes = new Uint8Array(data.length + 12), view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  for (let index = 0; index < 4; index++) bytes[4 + index] = type.charCodeAt(index);
  bytes.set(data, 8);
  view.setUint32(data.length + 8, crc32(bytes.subarray(4, data.length + 8)));
  return bytes;
}
function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const a = Math.abs(estimate - left), b = Math.abs(estimate - above), c = Math.abs(estimate - upperLeft);
  return a <= b && a <= c ? left : b <= c ? above : upperLeft;
}
/** PNG bytes for a width x height 8-bit gray raster; deflate(Uint8Array) may be sync or async. */
async function encodeGrayPng(width, height, pixels, deflate) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || pixels.length !== width * height) {
    throw new Error('Invalid grayscale raster');
  }
  const header = new Uint8Array(13), headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header[8] = 8;
  const rows = new Uint8Array((width + 1) * height);
  const source = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
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
  const parts = [
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk('IHDR', header), chunk('IDAT', await deflate(rows)), chunk('IEND', new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { png.set(part, offset); offset += part.length; }
  return png;
}
module.exports = { encodeGrayPng };
