'use strict';

// Optional development verification. Python is never used by the AI runtime.
// REFERENCE_PYTHON, ORT_MODULE, RVM_MODEL, REFERENCE_CLIP, FFMPEG and FFPROBE
// point to existing, explicitly supplied tools/assets. No installation occurs.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { runMatte } = require('../tasks/person-matte.cjs');
const { verifyModel } = require('../lib/models.cjs');
const descriptor = require('../runtime.json');
const execute = promisify(execFile);

const referenceCode = String.raw`
import json, sys, pathlib, numpy as np, onnxruntime as ort
from PIL import Image
root, model = pathlib.Path(sys.argv[1]), sys.argv[2]
manifest = json.loads((root / 'matte.json').read_text())
w, h = manifest['frameSize']['width'], manifest['frameSize']['height']
raw = np.fromfile(root / 'input.rgb', dtype=np.uint8).reshape(-1, h, w, 3)
options = ort.SessionOptions()
options.intra_op_num_threads, options.inter_op_num_threads = 2, 1
session = ort.InferenceSession(model, sess_options=options, providers=['CPUExecutionProvider'])
rec = [np.zeros((1,1,1,1), np.float32) for _ in range(4)]
checks = []
for index, rgb in enumerate(raw):
    feeds = {'src': np.ascontiguousarray(rgb.transpose(2,0,1)[None], dtype=np.float32) / 255,
             'downsample_ratio': np.array([manifest['downsampleRatio']], np.float32)}
    feeds.update({'r'+str(i+1)+'i': value for i, value in enumerate(rec)})
    fgr, pha, *rec = session.run(None, feeds)
    expected = np.rint(np.clip(pha[0,0], 0, 1) * 255).astype(np.uint8)
    image = Image.open(root / manifest['frames'][index]['file'])
    if image.mode != 'L' or image.size != (w,h): raise RuntimeError('Mask is not full-size grayscale PNG')
    actual = np.asarray(image)
    difference = np.abs(actual.astype(np.int16) - expected.astype(np.int16))
    check = {'index': index, 'maxGrayLevelDifference': int(difference.max()),
             'meanGrayLevelDifference': float(difference.mean()),
             'grayLevels': int(np.unique(actual).size), 'meanAlpha': float(actual.mean()/255)}
    if check['maxGrayLevelDifference'] > 1: raise RuntimeError('RVM CPU differs from Python reference: '+json.dumps(check))
    if check['grayLevels'] < 3: raise RuntimeError('Fixture did not produce a continuous alpha mask')
    checks.append(check)
print(json.dumps({'reference': 'Python ONNX Runtime '+ort.__version__, 'frames': checks}))
`;

async function main() {
  if (!process.env.REFERENCE_PYTHON) {
    console.log(JSON.stringify({ status: 'skipped', reason: 'REFERENCE_PYTHON was not supplied; runtime itself requires no Python.' }));
    return;
  }
  for (const key of ['ORT_MODULE', 'RVM_MODEL', 'REFERENCE_CLIP', 'FFMPEG', 'FFPROBE']) {
    if (!process.env[key]) throw new Error(key + ' is required for optional reference verification.');
  }
  const model = { path: process.env.RVM_MODEL, sha256: descriptor.tasks['person.matte'].sha256 };
  await verifyModel(model);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'selects-rvm-reference-'));
  try {
    const width = 640, height = 360, bytesPerFrame = width * height * 3;
    const decoded = await execute(process.env.FFMPEG, ['-v', 'error', '-i', process.env.REFERENCE_CLIP,
      '-map', '0:v:0', '-frames:v', '3', '-vf', 'scale=640:360,setsar=1', '-fps_mode', 'passthrough',
      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer', maxBuffer: bytesPerFrame * 4 });
    if (decoded.stdout.length !== bytesPerFrame * 3) throw new Error('Fixture did not decode exactly three frames.');
    const probed = await execute(process.env.FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_frames',
      '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', process.env.REFERENCE_CLIP], { maxBuffer: 8 * 1024 * 1024 });
    const frameTimes = JSON.parse(probed.stdout).frames.slice(0, 3).map((frame) => Number(frame.best_effort_timestamp_time));
    const frames = async function* () {
      for (let index = 0; index < 3; index++) {
        yield { index, sourceTimeSeconds: frameTimes[index], rgb: decoded.stdout.subarray(index * bytesPerFrame, (index + 1) * bytesPerFrame) };
      }
    };
    const result = await runMatte({
      request: { task: 'person.matte', input: { downsampleRatio: 0.25 } },
      config: { provider: 'cpu', intraOpNumThreads: 2, profile: true, models: { rvm: model } },
      outputDir: dir,
      ort: require(process.env.ORT_MODULE),
      video: { width, height, frameTimes },
      frames,
    });
    await fs.writeFile(path.join(dir, 'input.rgb'), decoded.stdout);
    const reference = await execute(process.env.REFERENCE_PYTHON, ['-c', referenceCode, dir, process.env.RVM_MODEL], { maxBuffer: 1024 * 1024 });
    console.log(JSON.stringify({ status: 'passed', fixtureSize: { width, height },
      runtime: { node: process.versions.node, electron: process.versions.electron || null },
      modelSha256: model.sha256, nativeTaskMetrics: result.metrics, nativeTaskDiagnostics: result.diagnostics,
      independentReference: JSON.parse(reference.stdout) }, null, 2));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || String(error)); process.exitCode = 1; });
