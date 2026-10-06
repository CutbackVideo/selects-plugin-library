'use strict';

function invalid() { throw new Error('IMAGE_INVALID: Corrupt or incomplete image header'); }
function exifOrientation(bytes, start, end) {
  if (bytes.toString('latin1', start, start + 6) === 'Exif\0\0') start += 6;
  if (start + 8 > end) invalid();
  const order = bytes.toString('ascii', start, start + 2);
  if (!['II', 'MM'].includes(order)) invalid();
  const u16 = at => order === 'II' ? bytes.readUInt16LE(at) : bytes.readUInt16BE(at);
  const u32 = at => order === 'II' ? bytes.readUInt32LE(at) : bytes.readUInt32BE(at);
  if (u16(start + 2) !== 42) invalid();
  const ifd = start + u32(start + 4);
  if (ifd < start + 8 || ifd + 2 > end) invalid();
  const count = u16(ifd);
  if (ifd + 2 + count * 12 > end) invalid();
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (u16(entry) === 0x112) {
      if (u16(entry + 2) !== 3 || u32(entry + 4) !== 1) invalid();
      const value = u16(entry + 8);
      if (value < 1 || value > 8) invalid();
      return value;
    }
  }
  return 1;
}
function pngHeader(bytes) {
  let width, height, orientation = 1, ended = false;
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
    if (end > bytes.length) invalid();
    const type = bytes.toString('ascii', offset + 4, offset + 8), body = offset + 8;
    if (type === 'acTL') throw new Error('IMAGE_ANIMATED: Animated PNG is unsupported');
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) invalid();
      width = bytes.readUInt32BE(body); height = bytes.readUInt32BE(body + 4);
    }
    if (type === 'eXIf') orientation = exifOrientation(bytes, body, body + length);
    if (type === 'IEND') { ended = true; if (length !== 0 || end !== bytes.length) invalid(); break; }
    offset = end;
  }
  if (!ended) invalid();
  return { format: 'png', width, height, orientation };
}
function jpegHeader(bytes) {
  let width, height, orientation = 1, scanned = false;
  for (let offset = 2; offset + 4 <= bytes.length;) {
    if (bytes[offset] !== 255) invalid();
    const marker = bytes[offset + 1];
    if (marker === 255) { offset++; continue; }
    const length = bytes.readUInt16BE(offset + 2), body = offset + 4, end = offset + 2 + length;
    if (length < 2 || end > bytes.length) invalid();
    if (marker === 0xda) { scanned = true; break; }
    if (marker === 0xe1 && bytes.toString('latin1', body, body + 6) === 'Exif\0\0') orientation = exifOrientation(bytes, body + 6, end);
    if (marker === 0xe2 && bytes.toString('latin1', body, body + 4) === 'MPF\0') throw new Error('IMAGE_MULTIPLE: Multi-picture JPEG is unsupported');
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (length < 8) invalid();
      width = bytes.readUInt16BE(body + 3); height = bytes.readUInt16BE(body + 1);
    }
    offset = end;
  }
  if (!scanned || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 0xd9) invalid();
  return { format: 'jpeg', width, height, orientation };
}
function webpHeader(bytes) {
  if (bytes.readUInt32LE(4) + 8 !== bytes.length) invalid();
  let width, height, orientation = 1, encoded = false, offset = 12;
  for (; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4), length = bytes.readUInt32LE(offset + 4);
    const body = offset + 8, end = body + length;
    if (end > bytes.length) invalid();
    if (type === 'ANIM' || type === 'ANMF' || (type === 'VP8X' && length >= 10 && (bytes[body] & 2))) throw new Error('IMAGE_ANIMATED: Animated WebP is unsupported');
    if (type === 'VP8X') {
      if (length !== 10) invalid();
      width = bytes.readUIntLE(body + 4, 3) + 1; height = bytes.readUIntLE(body + 7, 3) + 1;
    }
    if (type === 'VP8 ' || type === 'VP8L') {
      if (encoded) throw new Error('IMAGE_MULTIPLE: Multiple WebP images are unsupported');
      encoded = true;
      if (type === 'VP8 ') {
        if (length < 10 || !bytes.subarray(body + 3, body + 6).equals(Buffer.from([0x9d, 1, 0x2a]))) invalid();
        width ??= bytes.readUInt16LE(body + 6) & 0x3fff; height ??= bytes.readUInt16LE(body + 8) & 0x3fff;
      } else {
        if (length < 5 || bytes[body] !== 0x2f) invalid();
        const bits = bytes.readUInt32LE(body + 1);
        width ??= (bits & 0x3fff) + 1; height ??= ((bits >>> 14) & 0x3fff) + 1;
      }
    }
    if (type === 'EXIF') orientation = exifOrientation(bytes, body, end);
    offset = end + (length % 2);
    if (offset > bytes.length) invalid();
  }
  if (!encoded || offset !== bytes.length) invalid();
  return { format: 'webp', width, height, orientation };
}
function readImageHeader(bytes) {
  let header;
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) header = pngHeader(bytes);
  else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 0xd8) header = jpegHeader(bytes);
  else if (bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') header = webpHeader(bytes);
  else throw new Error('IMAGE_FORMAT_UNSUPPORTED: Choose a static JPEG, PNG or WebP image');
  if (!Number.isInteger(header.width) || !Number.isInteger(header.height) || header.width < 1 || header.height < 1) invalid();
  if (header.width * header.height > 32_000_000) throw new Error('IMAGE_TOO_LARGE: Image exceeds the 32 megapixel raster limit');
  return header;
}
module.exports = { readImageHeader };
