// Golden outputs of the Python engine for tests/doac_style_parity.test.mjs:
// the ci-* jobs of a `bundled` run (fonts that ship in the repo), their records,
// placement, scene metadata, frame maps and a SHA-256 per unique frame.
//
//   node fixtures.js <work dir>/jobs-bundled
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = process.argv[2];
const out = path.join(__dirname, '../../../../tests/fixtures/doac-style/parity.json');
const jobs = [];
let catalogue = null;
for (const name of fs.readdirSync(root).filter(n => n.startsWith('ci-')).sort()) {
  const dir = path.join(root, name);
  const job = JSON.parse(fs.readFileSync(path.join(dir, 'job.json')));
  const py = JSON.parse(fs.readFileSync(path.join(dir, 'py/result.json')));
  if (!catalogue && fs.existsSync(path.join(dir, 'py/catalogue.json'))) catalogue = JSON.parse(fs.readFileSync(path.join(dir, 'py/catalogue.json')));
  if (py.error) { jobs.push({ name, job, expect: { error: py.error } }); continue; }
  const frames = fs.readFileSync(path.join(dir, 'py/frames.bin'));
  let o = 0;
  const scenes = py.scenes.map(s => {
    const n = s.w * s.h * 4, hashes = [];
    for (let i = 0; i < s.uniqueFrames; i++) { hashes.push(crypto.createHash('sha256').update(frames.subarray(o, o + n)).digest('hex')); o += n; }
    return Object.assign({}, s, { frameHashes: hashes });
  });
  jobs.push({ name, job, expect: { records: py.records, placement: py.placement, words: py.words, frames: py.frames, fps: py.fps, scenes } });
}
catalogue.planningSha256 = crypto.createHash('sha256').update(catalogue.planning).digest('hex');
delete catalogue.planning;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ about: 'Python engine (approved/compile-captions.py, Pillow 12.3.0) outputs for dev/parity ci-* jobs, every face from the bundled fonts. Regenerate: plugins/doac-style/dev/parity/run.sh then fixtures.js.', catalogue, jobs }) + '\n');
console.log(out, jobs.length, 'jobs', fs.statSync(out).size, 'bytes');
