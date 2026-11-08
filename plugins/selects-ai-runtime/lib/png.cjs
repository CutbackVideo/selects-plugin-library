'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { encodeGrayPng } = require('./gray-png.cjs');

async function writeGrayPng(filename, width, height, pixels) {
  const png = await encodeGrayPng(width, height, pixels, rows => zlib.deflateSync(rows, { level: 6 }));
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, png, { flag: 'wx' });
}
module.exports = { writeGrayPng };
