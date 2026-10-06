'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { writeGrayPng } = require('../lib/png.cjs');
const { startTool } = require('../lib/process.cjs');

async function fixture(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-gray-png-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  return path.join(folder, 'mask.png');
}
function scanlines(png) {
  const parts = [];
  for (let p = 8; p < png.length;) {
    const size = png.readUInt32BE(p);
    if (png.toString('ascii', p + 4, p + 8) === 'IDAT') parts.push(png.subarray(p + 8, p + 8 + size));
    p += size + 12;
  }
  return zlib.inflateSync(Buffer.concat(parts));
}

test('lossless PNG preserves zero/full/soft alpha, row boundaries and modulo wrapping', async (t) => {
  const file = await fixture(t);
  const pixels = Buffer.from([0, 1, 127, 128, 254, 255, 255, 254, 128, 127, 1, 0, 13, 49, 99, 201, 242, 7]);
  await writeGrayPng(file, 6, 3, pixels);
  const png = await fs.readFile(file);
  assert.equal(png[24], 8);
  assert.equal(png[25], 0);
  const filtered = scanlines(png), decoded = Buffer.alloc(pixels.length);
  for (let row = 0; row < 3; row++) {
    assert.equal(filtered[row * 7], 4);
    for (let x = 0; x < 6; x++) {
      const a = x ? decoded[row * 6 + x - 1] : 0, b = row ? decoded[(row - 1) * 6 + x] : 0, c = row && x ? decoded[(row - 1) * 6 + x - 1] : 0;
      // Independent decoder formulation: distance ordering retains PNG's tie rule.
      const candidates = [a, b, c].map((value, index) => ({ value, index, distance: Math.abs(a + b - c - value) }));
      candidates.sort((u, v) => u.distance - v.distance || u.index - v.index);
      decoded[row * 6 + x] = filtered[row * 7 + x + 1] + candidates[0].value;
    }
  }
  assert.deepEqual(decoded, pixels);
  await assert.rejects(writeGrayPng(file, 6, 3, pixels), { code: 'EEXIST' });
});

test('gray compression keeps a cropped typed-array view and one-pixel raster intact', async (t) => {
  const file = await fixture(t);
  await writeGrayPng(file, 1, 1, Uint8Array.from([50, 128, 200]).subarray(1, 2));
  assert.deepEqual(scanlines(await fs.readFile(file)), Buffer.from([4, 128]));
});

test('invalid dimensions/layout are rejected before creating an output', async (t) => {
  const file = await fixture(t);
  for (const [width, height, pixels] of [[0, 1, Buffer.alloc(0)], [2, 2, Buffer.alloc(3)], [1.5, 2, Buffer.alloc(3)]]) {
    await assert.rejects(writeGrayPng(file, width, height, pixels), /Invalid grayscale/);
  }
  await assert.rejects(fs.stat(file), { code: 'ENOENT' });
});

const configFile = process.env.AI_RUNTIME_CONFIG;
test('independent FFmpeg decoder exactly restores random gray values and verifies PNG CRCs', { skip: !configFile && 'Set AI_RUNTIME_CONFIG to enable real PNG decoding' }, async (t) => {
  const file = await fixture(t), width = 257, height = 17;
  let state = 1;
  const pixels = Buffer.from(Array.from({ length: width * height }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state >>> 24;
  }));
  await writeGrayPng(file, width, height, pixels);
  const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
  const decoder = startTool(config.tools.ffmpeg, ['-v', 'error', '-err_detect', 'crccheck+explode', '-i', file, '-pix_fmt', 'gray', '-f', 'rawvideo', 'pipe:1']);
  const chunks = [];
  for await (const chunk of decoder.child.stdout) chunks.push(chunk);
  await decoder.completed;
  assert.deepEqual(Buffer.concat(chunks), pixels);
});
