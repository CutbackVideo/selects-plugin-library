// plugins/summer-trip/tests/beat-worker.test.cjs (run: node plugins/summer-trip/tests/beat-worker.test.cjs)
// Own music's beat and drop detection runs in the panel's Web Worker (st-beat-worker block: beat-detect.cjs's text,
// unmodified, behind a CommonJS shim). Its result must be identical to the CLI the panel ran before
// (`node beat-detect.cjs <pcm> 22050 <out.json> largest`): the whole JSON, so the drop pick 'largest', the drop
// sections, introDuck gating and the faint/approximate states all come out the same. Synthetic tracks always run (no
// ffmpeg); the bundled cues run too when ffmpeg is on PATH (dev/beat-parity.cjs takes any files). The worker runs in a
// worker thread (its own isolate, as a browser Worker), the PCM transferred.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const P = require(path.join(__dirname, '..', 'dev', 'beat-parity.cjs'));

const root = path.resolve(__dirname, '..');
const detector = fs.readFileSync(path.join(root, 'beat-detect.cjs'), 'utf8');
assert.equal(P.W.ST_PCM_RATE, 22050, 'the CLI path\'s rate');
assert.equal(P.W.ST_PCM_SECONDS, 360, 'the CLI path\'s span (-t 360)');

// The shim keeps the file's CLI branch off: require.main is undefined inside the worker, and the file needs nothing
// from require before module.exports (browser-safe core).
const src = P.W.stBeatWorkerSource(detector);
assert.ok(src.includes(detector), 'the file text is embedded unmodified');
const core = detector.slice(0, detector.search(/^module\.exports\b/m));
for (const bad of [/\brequire\s*\(/, /\bprocess\./, /\bBuffer\b/]) assert.ok(!bad.test(core), 'detector core must not use ' + bad);
assert.match(detector, /^if \(require\.main === module\) \{/m, 'the CLI branch is behind require.main');

// A worker error comes back as { ok: false, error }, never a throw out of onmessage.
{
  let reply = null;
  const self = { postMessage: (m) => { reply = m; } };
  const box = { self };
  vm.createContext(box);
  vm.runInContext(P.W.stBeatWorkerSource('module.exports = { analyze() { throw new Error("boom"); } };'), box);
  self.onmessage({ data: { id: 3, buf: new ArrayBuffer(8), rate: 22050, pick: 'largest' } });
  assert.deepEqual(JSON.parse(JSON.stringify(reply)), { id: 3, ok: false, error: 'boom' });
  // The pick reaches analyze as the CLI's 'largest' option; any other pick is the default.
  const seen = [];
  vm.runInContext(P.W.stBeatWorkerSource('module.exports = { analyze(s, r, o) { return { n: s.length, r, o: o || null }; } };'), box);
  self.onmessage({ data: { id: 4, buf: new Float32Array([1, 2, 3]).buffer, rate: 22050, pick: 'largest' } });
  seen.push(reply.result);
  self.onmessage({ data: { id: 5, buf: new Float32Array([1]).buffer, rate: 22050 } });
  seen.push(reply.result);
  assert.deepEqual(JSON.parse(JSON.stringify(seen)), [{ n: 3, r: 22050, o: { dropPick: 'largest' } }, { n: 1, r: 22050, o: null }]);
}

// ---- synthetic tracks (no ffmpeg) ----
const SR = 22050;
function kick(x, t, amp) {
  const i0 = Math.round(t * SR);
  for (let k = 0; k < 2200 && i0 + k < x.length; k++) x[i0 + k] += amp * Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-k / 300)) * k / SR) * Math.exp(-k / 900);
}
function hat(x, t, amp) {
  const i0 = Math.round(t * SR);
  let seed = 12345 + i0;
  for (let k = 0; k < 400 && i0 + k < x.length; k++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; x[i0 + k] += amp * ((seed / 0x7fffffff) * 2 - 1) * Math.exp(-k / 60); }
}
// 120 bpm, a quiet first half and a loud drop at `drop` seconds.
function track(bpm, seconds, drop) {
  const x = new Float32Array(Math.round(seconds * SR));
  const beat = 60 / bpm;
  for (let t = 0.25, n = 0; t < seconds; t += beat, n++) {
    const loud = drop != null && t >= drop;
    kick(x, t, loud ? 0.9 : 0.25);
    hat(x, t + beat / 2, loud ? 0.3 : 0.08);
  }
  return x;
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-beat-worker-'));
const rows = [];
(async () => {
try {
  for (const [name, x] of [['click 120 bpm, drop at 16 s', track(120, 40, 16)], ['click 96 bpm, no drop', track(96, 30, null)], ['silence', new Float32Array(SR * 5)]]) {
    const pcm = path.join(tmp, 'pcm.f32');
    fs.writeFileSync(pcm, Buffer.from(x.buffer));
    const r = await P.comparePcm(name, pcm, tmp);
    assert.ok(r.identical, name + ': worker and CLI differ\n' + JSON.stringify(r));
    rows.push(r);
  }
  const drop = rows[0];
  assert.ok(Math.abs(drop.cli.bpm - 120) <= 1, 'bpm ' + drop.cli.bpm);
  assert.ok(drop.cli.drop != null && Math.abs(drop.cli.drop - 16) < 1, 'drop near 16 s: ' + drop.cli.drop);

  // ---- the bundled cues through ffmpeg (the panel's decode arguments) ----
  if (spawnSync(process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg', ['-version']).status === 0) {
    const cues = path.join(root, 'assets', 'cues');
    for (const f of fs.readdirSync(cues).filter((f) => /\.mp3$/.test(f) && !/muffled/.test(f)).sort()) {
      const r = await P.compareFile(path.join(cues, f));
      assert.ok(r.identical, f + ': worker and CLI differ\n' + JSON.stringify(r));
      rows.push(r);
    }
  } else console.log('  SKIP bundled cues (no ffmpeg on PATH)');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(JSON.stringify({ beatWorker: 'ok', identical: rows.length, rows: rows.map((r) => ({ file: r.file, s: r.seconds, bpm: r.cli.bpm, firstBeat: r.cli.firstBeat, grid: r.cli.grid, drop: r.cli.drop, workerMs: r.workerMs })) }));
})().catch((e) => { console.error(e); process.exit(1); });
