'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { writeGrayPng } = require('../lib/png.cjs');
const { verifyOutputs } = require('../lib/outputs.cjs');
const descriptor = require('../runtime.json');

// An independently encoded real 4x2 RGBA PNG, with the same dimensions as the
// valid gray fixture. A format rejection must not be caused by a size mismatch.
const RGBA_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAFElEQVR4nGNMmXaigQEJMCFzQGwAR0ICRhAMItUAAAAASUVORK5CYII=', 'base64');
const VIDEO = { width: 4, height: 2, frameTimes: [0.3, 0.4, 0.7] };

async function fixture(t, task, video = VIDEO) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'selects-ai-result-contract-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const request = { task, input: { sourceRange: { startSeconds: 0.3, endSeconds: 0.9 } } };
  const filename = task === 'person.matte' ? 'matte.json' : 'faces.json';
  const result = { files: task === 'person.matte' ? { manifest: filename } : { detections: filename } };
  let document;
  if (task === 'person.matte') {
    document = {
      schemaVersion: 1, task, alphaEncoding: 'grayscale-png-8bit', frameSize: { width: 4, height: 2 },
      downsampleRatio: 0.25, model: { name: 'rvm-mobilenetv3-fp32', sha256: descriptor.tasks[task].sha256 },
      diagnostics: { requestedProvider: 'cpu' },
      ...(video.sourceRange ? { sourceRange: { ...video.sourceRange }, sourceFrameRate: { ...video.constantFrameRate } } : {}),
      frames: video.frameTimes.map((sourceTimeSeconds, index) => ({ index, sourceTimeSeconds, file: `alpha/${index}.png` })),
    };
    for (const frame of document.frames) {
      await writeGrayPng(path.join(root, frame.file), 4, 2, Buffer.from([0, 16, 64, 128, 192, 224, 240, 255]));
    }
  } else {
    document = {
      contractVersion: 1, task, coordinateSpace: 'display-pixels', boxFormat: 'xyxy', frameSize: { width: 4, height: 2 },
      model: { id: 'yunet-2023mar', sha256: descriptor.tasks[task].sha256 },
      landmarkOrder: ['rightEye', 'leftEye', 'nose', 'rightMouth', 'leftMouth'],
      parameters: { sourceRange: { ...request.input.sourceRange }, sampleEverySeconds: 0.5, scoreThreshold: 0.8 },
      preprocessing: { kind: 'bilinear-top-left-zero-pad', tensorLayout: 'NCHW', channels: 'BGR', valueRange: [0, 255], inputSize: { width: 640, height: 640 }, contentSize: { width: 4, height: 2 }, noUpscale: true },
      samples: [
        { index: 0, sourceTimeSeconds: 0.3, faces: [{
          box: { xmin: 1, ymin: 0, xmax: 3, ymax: 2 }, score: 0.9,
          landmarks: [{ x: 1.5, y: 0.5 }, { x: 2.5, y: 0.5 }, { x: 2, y: 1 }, { x: 1.5, y: 1.5 }, { x: 2.5, y: 1.5 }],
        }] },
        { index: 2, sourceTimeSeconds: 0.7, faces: [] },
      ],
    };
  }
  const save = () => fs.writeFile(path.join(root, filename), JSON.stringify(document));
  const verify = async () => { await save(); await verifyOutputs(root, request, result, video); };
  return { root, request, result, document, verify };
}

test('matte consumer accepts one full-size continuous gray alpha per actual source timestamp', async (t) => {
  const own = await fixture(t, 'person.matte');
  await own.verify();
});

test('editable CFR mask interval preserves its full final frame and rejects altered closure', async (t) => {
  const video = { width: 4, height: 2, frameTimes: [0.3, 0.4, 0.5], constantFrameRate: { numerator: 10, denominator: 1 }, sourceRange: { startSeconds: 0.3, endSeconds: 0.6 } };
  const own = await fixture(t, 'person.matte', video);
  await own.verify();
  own.document.sourceRange.endSeconds = 0.59;
  await assert.rejects(own.verify(), /verified display-frame clock/);
});

test('VFR mask inference cannot invent a constant-rate editable interval', async (t) => {
  const own = await fixture(t, 'person.matte');
  own.document.sourceFrameRate = { numerator: 10, denominator: 1 };
  own.document.sourceRange = { startSeconds: 0.3, endSeconds: 0.6 };
  await assert.rejects(own.verify(), /verified display-frame clock/);
});

test('face consumer accepts sparse source-frame samples including a frame with no face', async (t) => {
  const own = await fixture(t, 'faces.detect');
  await own.verify();
});

test('an incomplete matte cannot be published as a usable result', async (t) => {
  const cases = [
    ['missing timestamp', document => { delete document.frames[1].sourceTimeSeconds; }],
    ['invented timestamp', document => { document.frames[1].sourceTimeSeconds = 0.5; }],
    ['missing decoded frame', document => { document.frames.pop(); }],
    ['reordered frame identity', document => { document.frames[1].index = 0; }],
    ['wrong display coordinate size', document => { document.frameSize.width = 8; }],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async (child) => {
      const own = await fixture(child, 'person.matte');
      corrupt(own.document);
      await assert.rejects(own.verify(), /timestamp|manifest|contiguous|frame size/i);
    });
  }
});

test('matte consumer rejects a missing PNG, cropped raster and same-size RGBA image', async (t) => {
  for (const corruption of ['missing', 'cropped', 'rgba']) {
    await t.test(corruption, async (child) => {
      const own = await fixture(child, 'person.matte');
      const filename = path.join(own.root, own.document.frames[1].file);
      await fs.unlink(filename);
      if (corruption === 'cropped') await writeGrayPng(filename, 2, 2, Buffer.from([0, 64, 128, 255]));
      if (corruption === 'rgba') await fs.writeFile(filename, RGBA_PNG);
      await assert.rejects(own.verify(), /ENOENT|full-size 8-bit grayscale PNG/);
    });
  }
});

test('face consumer rejects source-clock errors before downstream placement', async (t) => {
  const cases = [
    ['missing timestamp', document => { delete document.samples[0].sourceTimeSeconds; }],
    ['wrong source-frame timestamp', document => { document.samples[1].sourceTimeSeconds = 0.4; }],
    ['duplicate sampled frame', document => { document.samples[1] = { ...document.samples[0] }; }],
    ['wrong display size', document => { document.frameSize.height = 4; }],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async (child) => {
      const own = await fixture(child, 'faces.detect');
      corrupt(own.document);
      await assert.rejects(own.verify(), /timestamp|source order|frame size/i);
    });
  }
});

test('invalid face geometry cannot reach a crop/tracking consumer as a successful result', async (t) => {
  const cases = [
    ['box outside display raster', face => { face.box.xmax = 5; }],
    ['negative box coordinate', face => { face.box.ymin = -1; }],
    ['empty box', face => { face.box.xmax = face.box.xmin; }],
    ['score above one', face => { face.score = 1.001; }],
    ['negative score', face => { face.score = -0.001; }],
    ['missing score', face => { delete face.score; }],
    ['four landmarks', face => { face.landmarks.pop(); }],
    ['missing landmark coordinate', face => { delete face.landmarks[2].x; }],
    ['non-finite landmark coordinate', face => { face.landmarks[3].y = Infinity; }],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async (child) => {
      const own = await fixture(child, 'faces.detect');
      corrupt(own.document.samples[0].faces[0]);
      await assert.rejects(own.verify(), /Invalid face geometry/);
    });
  }
});

test('matte metadata cannot claim a different model or inference contract', async (t) => {
  const cases = [
    ['different model hash', document => { document.model.sha256 = '0'.repeat(64); }],
    ['different model name', document => { document.model.name = 'patched-rvm'; }],
    ['different downsample ratio', document => { document.downsampleRatio = 0.5; }],
    ['missing downsample ratio', document => { delete document.downsampleRatio; }],
    ['missing diagnostics', document => { delete document.diagnostics; }],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async (child) => {
      const own = await fixture(child, 'person.matte');
      corrupt(own.document);
      await assert.rejects(own.verify(), /model metadata|matte metadata/);
    });
  }
});

test('face metadata cannot silently change eye order, sampling or tensor preprocessing', async (t) => {
  const cases = [
    ['different model hash', document => { document.model.sha256 = '0'.repeat(64); }],
    ['different model ID', document => { document.model.id = 'other-yunet'; }],
    ['swapped eye identities', document => { [document.landmarkOrder[0], document.landmarkOrder[1]] = [document.landmarkOrder[1], document.landmarkOrder[0]]; }],
    ['different sampling interval', document => { document.parameters.sampleEverySeconds = 0.1; }],
    ['different confidence threshold', document => { document.parameters.scoreThreshold = 0.1; }],
    ['different source range', document => { document.parameters.sourceRange.startSeconds = 0.2; }],
    ['RGB instead of BGR', document => { document.preprocessing.channels = 'RGB'; }],
    ['unit normalization instead of uint8 range', document => { document.preprocessing.valueRange = [0, 1]; }],
    ['different tensor layout', document => { document.preprocessing.tensorLayout = 'NHWC'; }],
    ['different tensor size', document => { document.preprocessing.inputSize.width = 320; }],
    ['upscaled input', document => { document.preprocessing.noUpscale = false; }],
    ['different padding placement', document => { document.preprocessing.kind = 'centered-letterbox'; }],
    ['missing content dimensions', document => { delete document.preprocessing.contentSize; }],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async (child) => {
      const own = await fixture(child, 'faces.detect');
      corrupt(own.document);
      await assert.rejects(own.verify(), /model metadata|landmark order|face parameters|preprocessing/);
    });
  }
});
