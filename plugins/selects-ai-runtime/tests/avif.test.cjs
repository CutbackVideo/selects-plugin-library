'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { startAvifFrames, verifyGrayAvif } = require('../lib/avif.cjs');
const { startTool, collectTool } = require('../lib/process.cjs');
const { validateRequest } = require('../lib/request.cjs');
const { verifyOutputs } = require('../lib/outputs.cjs');
const descriptor = require('../runtime.json');

// Independently encoded by the bundled FFmpeg AVIF muxer (4x2 monochrome8).
const AVIF = Buffer.from('AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAAD3bWV0YQAAAAAAAAAvaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAFBpY3R1cmVIYW5kbGVyAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAARAAAAQABAAAAAQAAAR8AAAAiAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAAGhpcHJwAAAASWlwY28AAAAUaXNwZQAAAAAAAAAEAAAAAgAAAA5waXhpAAAAAAEIAAAADGF2MUOBABwAAAAAE2NvbHJuY2x4AAIAAgACgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAKm1kYXQKBRgEO0qAMhkWAAABIFAZ3CZmkrNQu+e6wJkVYazxPLws', 'base64');

async function folder(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'selects-ai-avif-'));
  await fs.mkdir(path.join(root, 'alpha'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('explicit AVIF/PNG requests are matte-only; omitted encoding remains compatible', () => {
  const base = { contractVersion: 1, task: 'person.matte', input: { source: { path: path.resolve('source.mp4') }, sourceRange: { startSeconds: 0, endSeconds: 1 } } };
  for (const encoding of [undefined, 'grayscale-png-8bit', 'grayscale-avif-8bit']) {
    const request = { ...base, input: { ...base.input, ...(encoding ? { alphaEncoding: encoding } : {}) } };
    assert.equal(validateRequest(request), request);
  }
  for (const alphaEncoding of [null, 'rgba', 'avif', 1]) assert.throws(() => validateRequest({ ...base, input: { ...base.input, alphaEncoding } }), /alphaEncoding/);
  assert.throws(() => validateRequest({ ...base, task: 'faces.detect', input: { ...base.input, alphaEncoding: 'grayscale-avif-8bit' } }), /alphaEncoding/);
});

test('AVIF validator reads the linked primary image properties, not an arbitrary dimension box', async t => {
  const root = await folder(t), file = path.join(root, 'alpha', '0.avif');
  await fs.writeFile(file, AVIF);
  await verifyGrayAvif(file, 4, 2);
  await assert.rejects(verifyGrayAvif(file, 2, 2), /full-size/);
  for (const [name, mutate] of [
    ['animated brand', b => b.write('avis', 8)],
    ['RGB channel count', b => { b[b.indexOf('pixi') + 8] = 3; }],
    ['10-bit codec', b => { b[b.indexOf('av1C') + 6] |= 0x40; }],
    ['color codec', b => { b[b.indexOf('av1C') + 6] &= ~0x10; }],
    ['wrong primary identity', b => { b.writeUInt16BE(2, b.indexOf('pitm') + 8); }],
    ['unassociated dimensions', b => { b[b.indexOf('ipma') + 15] = 4; }],
    ['truncated image', b => b.subarray(0, b.length - 1)],
  ]) await t.test(name, async () => {
    const bytes = Buffer.from(AVIF), mutated = mutate(bytes);
    await fs.writeFile(file, Buffer.isBuffer(mutated) ? mutated : bytes);
    await assert.rejects(verifyGrayAvif(file, 4, 2), /AVIF|Alpha output/);
  });
});

test('matte completion requires requested encoding and an actual full-size AVIF for every source timestamp', async t => {
  const root = await folder(t);
  await fs.writeFile(path.join(root, 'alpha/000000.avif'), AVIF);
  const video = { width: 4, height: 2, frameTimes: [0.3] };
  const request = { task: 'person.matte', input: { sourceRange: { startSeconds: 0.3, endSeconds: 0.4 }, alphaEncoding: 'grayscale-avif-8bit' } };
  const document = { schemaVersion: 1, task: request.task, alphaEncoding: request.input.alphaEncoding, frameSize: { width: 4, height: 2 },
    downsampleRatio: 0.25, model: { name: 'rvm-mobilenetv3-fp32', sha256: descriptor.tasks[request.task].sha256 }, diagnostics: {},
    frames: [{ index: 0, sourceTimeSeconds: 0.3, file: 'alpha/000000.avif' }] };
  const verify = async () => {
    await fs.writeFile(path.join(root, 'matte.json'), JSON.stringify(document));
    await verifyOutputs(root, request, { files: { manifest: 'matte.json' } }, video);
  };
  await verify();
  document.alphaEncoding = 'grayscale-png-8bit'; await assert.rejects(verify(), /manifest/);
  document.alphaEncoding = 'grayscale-avif-8bit'; document.frames[0].file = 'alpha/000000.png'; await assert.rejects(verify(), /filename/);
  document.frames[0].file = 'alpha/000000.avif'; await fs.unlink(path.join(root, document.frames[0].file)); await assert.rejects(verify(), /ENOENT/);
});

test('successful encoder exit without image files is rejected and reaped', async t => {
  const outputDir = await folder(t);
  let encoderPid;
  const writer = startAvifFrames({ config: { tools: { ffmpeg: process.execPath } }, width: 4, height: 2, outputDir,
    emitProgress: event => { encoderPid = event.encoderPid; } });
  try {
    await writer.write(Buffer.alloc(8, 127));
    await assert.rejects(writer.finish(), /count differs/);
  }
  finally { await writer.dispose(); }
  assert.ok(encoderPid);
  assert.throws(() => process.kill(encoderPid, 0), error => error.code === 'ESRCH');
  assert.deepEqual(await fs.readdir(path.join(outputDir, 'alpha')), []);
});

test('an unavailable AVIF encoder cannot publish a successful result', async t => {
  const outputDir = await folder(t);
  const writer = startAvifFrames({ config: { tools: { ffmpeg: path.join(outputDir, 'missing-media-tool') } }, width: 4, height: 2, outputDir });
  try {
    await writer.write(Buffer.alloc(8)).catch(() => {});
    await assert.rejects(writer.finish(), error => error.code === 'ENOENT');
  } finally { await writer.dispose(); }
  assert.deepEqual(await fs.readdir(path.join(outputDir, 'alpha')), []);
});

const configFile = process.env.AI_RUNTIME_CONFIG;
test('one real encoder writes separately decodable still AVIF frames with no PNG intermediates', { skip: !configFile }, async t => {
  const config = JSON.parse(await fs.readFile(configFile, 'utf8')), outputDir = await folder(t);
  const video = { width: 16, height: 8 };
  let encoderCount = 0;
  const writer = startAvifFrames({ config, ...video, outputDir, emitProgress: () => { encoderCount++; } });
  try {
    for (const value of [0, 127, 255]) await writer.write(Buffer.alloc(128, value));
    await writer.finish();
    assert.equal(encoderCount, 1);
    assert.deepEqual(await fs.readdir(path.join(outputDir, 'alpha')), ['000000.avif', '000001.avif', '000002.avif']);
    for (let index = 0; index < 3; index++) {
      const filename = path.join(outputDir, 'alpha', String(index).padStart(6, '0') + '.avif');
      await verifyGrayAvif(filename, 16, 8);
      const metadata = JSON.parse(await collectTool(config.tools.ffprobe, ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,pix_fmt,width,height,nb_read_frames:format_tags=major_brand', '-of', 'json', filename]));
      assert.equal(metadata.streams.length, 1); assert.equal(metadata.streams[0].nb_read_frames, '1');
      assert.equal(metadata.streams[0].pix_fmt, 'gray'); assert.equal(metadata.format.tags.major_brand, 'avif');
      const decoder = startTool(config.tools.ffmpeg, ['-v', 'error', '-i', filename, '-pix_fmt', 'gray', '-f', 'rawvideo', 'pipe:1']);
      const chunks = []; for await (const chunk of decoder.child.stdout) chunks.push(chunk); await decoder.completed;
      const gray = Buffer.concat(chunks); assert.equal(gray.length, 128);
      for (const value of gray) assert.ok(Math.abs(value - [0, 127, 255][index]) <= 1);
    }
  } finally { await writer.dispose(); }
});

test('canceling the real AVIF encoder reaps it and removes private images', { skip: !configFile }, async t => {
  const config = JSON.parse(await fs.readFile(configFile, 'utf8')), outputDir = await folder(t);
  const controller = new AbortController(); let pid;
  const writer = startAvifFrames({ config, width: 16, height: 8, outputDir, signal: controller.signal, emitProgress: event => { pid = event.encoderPid; } });
  try {
    await writer.write(Buffer.alloc(128, 127)); controller.abort();
    await assert.rejects(writer.finish(), error => error.code === 'JOB_CANCELED');
  } finally { await writer.dispose(); }
  assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
  assert.deepEqual(await fs.readdir(path.join(outputDir, 'alpha')), []);
});
