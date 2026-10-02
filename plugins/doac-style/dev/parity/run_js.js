// Run the panel's caption engine (approved/web, loaded the way the Worker
// loads it) on a job and dump what compare.js checks.
//
//   node run_js.js <work dir> <job dir> <mac|bundled|winsim> [catalogue]
//
// mac: the macOS font files the plans name; bundled: every face from the
// bundled fonts (what the CI test uses); winsim: the Windows mapping, with the
// macOS copies of Arial, Georgia and Times standing in for C:\Windows\Fonts.
// Writes <job dir>/js/{result.json,frames.bin}.
const fs = require('fs'), path = require('path');
const [work, jobdir, mode] = process.argv.slice(2);
const WEB = path.join(__dirname, '../../approved/web'), AP = path.join(work, 'approved');
// One script, as in the Worker blob (a Function, not node:vm: globals in a vm context are slow).
const source = ['pil.js', 'engine.js', 'worker.js'].map(f => fs.readFileSync(path.join(WEB, f), 'utf8')).join('\n;\n');
const { createPil, createDoacEngine, doacFontSource, DOAC_FONT_MAP } = new Function('module', source + '\n;return {createPil,createDoacEngine,doacFontSource,DOAC_FONT_MAP};')({ exports: {} });
const files = {};
for (const f of ['style.json', 'template-energy.json', 'PLANNING.md', 'native/shortlist.json', 'native/0YVdjmU13E4/plan.json', 'native/0YVdjmU13E4/legacy-three-scenes.json', 'native/NhbCBo1KuU8/plan.json', 'native/8_dh-IB9jZ8/plan.json']) files[f] = fs.readFileSync(path.join(AP, f), 'utf8');
const b64 = p => new Uint8Array(Buffer.from(fs.readFileSync(p, 'utf8'), 'base64'));
const fonts = { 'permanent-marker': b64(path.join(AP, 'native/fonts/permanentmarker/PermanentMarker-Regular.ttf.b64')) };
for (const w of ['Regular', 'Medium', 'Bold']) fonts['arimo:' + w] = b64(path.join(AP, 'native/fonts/arimo/Arimo-' + w + '.ttf.b64'));
let fontSource;
if (mode === 'mac') {
  fontSource = (p, index) => p.endsWith('PermanentMarker-Regular.ttf') ? { bytes: fonts['permanent-marker'], index: 0 } : { bytes: fs.readFileSync(p), index };
} else if (mode === 'winsim') {
  // Windows has Arial, Arial Black, Georgia and Times (not Arial Narrow without Office).
  for (const [key, [system]] of Object.entries(DOAC_FONT_MAP)) if (system && system !== 'arialnb.ttf') fonts['windows:' + system] = fs.readFileSync(key.split('#')[0]);
  fontSource = doacFontSource(fonts, { useSystem: true });
} else fontSource = doacFontSource(fonts, { useSystem: false });
(async () => {
  const pil = createPil(b64(path.join(WEB, 'raster.wasm.b64')));
  const engine = createDoacEngine({ pil, files, fontSource });
  const job = JSON.parse(fs.readFileSync(path.join(jobdir, 'job.json')));
  const out = path.join(jobdir, 'js'); fs.mkdirSync(out, { recursive: true });
  let result; const frames = [];
  const t0 = Date.now();
  try {
    const r = await engine.compileJob(job, { keepFrames: true });
    result = { scenes: r.scenes.map(s => { s.uniqueCrops.forEach(c => frames.push(Buffer.from(c))); return Object.assign({}, s.scene, { frameMap: s.payload.frameMap, fps: s.payload.fps, x: s.payload.x, y: s.payload.y, w: s.payload.w, h: s.payload.h, cols: s.payload.cols, rows: s.payload.rows, size: s.payload.size }); }), records: r.records, placement: r.placement, words: r.words, frames: r.frames, fps: r.fps };
  } catch (e) {
    result = { error: { type: e.pyType || e.name, message: e.pyMessage != null ? e.pyMessage : e.message }, stack: String(e.stack).slice(0, 1500) };
  }
  result.ms = Date.now() - t0;
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 1));
  fs.writeFileSync(path.join(out, 'frames.bin'), Buffer.concat(frames));
  if (process.argv.includes('catalogue')) fs.writeFileSync(path.join(out, 'catalogue.json'), JSON.stringify(engine.catalogue()));
  console.log(jobdir, result.error ? 'error ' + JSON.stringify(result.error) : 'ok', result.ms + 'ms');
})();
