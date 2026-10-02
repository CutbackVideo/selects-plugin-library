// Compares run_py.py and run_js.js output for every job under <jobs root>:
// records and placement (structurally equal), per scene frame count, frameMap,
// bounds, and per frame alpha IoU / mean absolute alpha difference.
//
//   node compare.js <jobs root> [--json]
const fs = require('fs'), path = require('path');
const root = process.argv[2];
const deepEq = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEq(v, b[i]));
  if (a && typeof a === 'object') { const ka = Object.keys(a).sort(), kb = Object.keys(b || {}).sort(); return deepEq(ka, kb) && ka.every(k => deepEq(a[k], b[k])); }
  return a === b;
};
function diffPath(a, b, p = '') {
  if (deepEq(a, b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = diffPath(a[k], b[k], p + '.' + k); if (d) return d; }
  }
  return p + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b);
}
const rows = [];
const perTemplate = {};
for (const name of fs.readdirSync(root).sort()) {
  const dir = path.join(root, name);
  if (!fs.existsSync(path.join(dir, 'py/result.json')) || !fs.existsSync(path.join(dir, 'js/result.json'))) continue;
  const py = JSON.parse(fs.readFileSync(path.join(dir, 'py/result.json'))), js = JSON.parse(fs.readFileSync(path.join(dir, 'js/result.json')));
  if (py.error || js.error) {
    const same = py.error && js.error && py.error.type === js.error.type && py.error.message === js.error.message;
    rows.push({ job: name, result: same ? 'same error' : 'ERROR MISMATCH', py: py.error, js: js.error });
    continue;
  }
  const row = { job: name, records: deepEq(py.records, js.records) ? 'identical' : diffPath(py.records, js.records), placement: deepEq(py.placement, js.placement) ? 'identical' : diffPath(py.placement, js.placement), scenes: [] };
  const pyF = fs.readFileSync(path.join(dir, 'py/frames.bin')), jsF = fs.readFileSync(path.join(dir, 'js/frames.bin'));
  let po = 0, jo = 0;
  py.scenes.forEach((ps, si) => {
    const s = js.scenes[si] || {};
    const sc = { index: ps.index, template: ps.template, frames: ps.frameMap.length, frameCount: ps.frameMap.length === (s.frameMap || []).length, frameMap: deepEq(ps.frameMap, s.frameMap), unique: ps.uniqueFrames + '/' + s.uniqueFrames, boundsDelta: Math.max(Math.abs(ps.x - s.x), Math.abs(ps.y - s.y), Math.abs(ps.x + ps.w - s.x - s.w), Math.abs(ps.y + ps.h - s.y - s.h)), meta: ['start', 'end', 'template', 'text', 'cols', 'rows'].every(k => deepEq(ps[k], s[k])) };
    const pn = ps.w * ps.h * 4, jn = s.w * s.h * 4;
    const tilesPy = [], tilesJs = [];
    for (let i = 0; i < ps.uniqueFrames; i++) { tilesPy.push(pyF.subarray(po, po + pn)); po += pn; }
    for (let i = 0; i < s.uniqueFrames; i++) { tilesJs.push(jsF.subarray(jo, jo + jn)); jo += jn; }
    // per output frame: alpha IoU (alpha > 0) and mean |alpha diff| over the union of both bounds
    let minIoU = 1, sumMad = 0, maxMad = 0, exactFrames = 0;
    const bx0 = Math.min(ps.x, s.x), by0 = Math.min(ps.y, s.y), bx1 = Math.max(ps.x + ps.w, s.x + s.w), by1 = Math.max(ps.y + ps.h, s.y + s.h);
    const alphaAt = (tile, t, x, y) => (x < t.x || y < t.y || x >= t.x + t.w || y >= t.y + t.h) ? 0 : tile[((y - t.y) * t.w + (x - t.x)) * 4 + 3];
    const n = Math.min(ps.frameMap.length, (s.frameMap || []).length);
    for (let f = 0; f < n; f++) {
      const a = tilesPy[ps.frameMap[f]], b = tilesJs[s.frameMap[f]];
      if (a && b && ps.w === s.w && ps.h === s.h && ps.x === s.x && ps.y === s.y && Buffer.compare(a, b) === 0) { exactFrames++; continue; }
      let inter = 0, uni = 0, mad = 0, cnt = 0;
      for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
        const va = alphaAt(a, ps, x, y), vb = alphaAt(b, s, x, y);
        if (va || vb) { uni++; if (va && vb) inter++; mad += Math.abs(va - vb); cnt++; }
      }
      const iou = uni ? inter / uni : 1; mad = cnt ? mad / cnt : 0;
      minIoU = Math.min(minIoU, iou); sumMad += mad; maxMad = Math.max(maxMad, mad);
    }
    Object.assign(sc, { exactFrames: exactFrames + '/' + n, minIoU: +minIoU.toFixed(4), meanAbsAlphaDiff: +(sumMad / Math.max(1, n)).toFixed(3), maxFrameMad: +maxMad.toFixed(3) });
    row.scenes.push(sc);
    const t = perTemplate[ps.template] = perTemplate[ps.template] || { scenes: 0, frames: 0, exact: 0, minIoU: 1, maxMad: 0 };
    t.scenes++; t.frames += n; t.exact += exactFrames; t.minIoU = Math.min(t.minIoU, minIoU); t.maxMad = Math.max(t.maxMad, maxMad);
  });
  row.ms = js.ms;
  const pc = path.join(dir, 'py/catalogue.json'), jc = path.join(dir, 'js/catalogue.json');
  if (fs.existsSync(pc) && fs.existsSync(jc)) row.catalogue = deepEq(JSON.parse(fs.readFileSync(pc)), JSON.parse(fs.readFileSync(jc))) ? 'identical' : 'DIFFERENT';
  rows.push(row);
}
if (process.argv.includes('--json')) { console.log(JSON.stringify({ rows, perTemplate }, null, 1)); process.exit(0); }
for (const r of rows) {
  if (r.result) { console.log(r.job.padEnd(22), r.result, r.result === 'same error' ? JSON.stringify(r.py.message).slice(0, 80) : JSON.stringify([r.py, r.js])); continue; }
  const inexact = r.scenes.filter(s => !(s.frameCount && s.frameMap && s.meta && s.boundsDelta === 0 && s.exactFrames.split('/')[0] === s.exactFrames.split('/')[1]));
  console.log(r.job.padEnd(22), 'records', r.records === 'identical' ? 'identical' : r.records, '| placement', r.placement === 'identical' ? 'identical' : r.placement, '| catalogue', r.catalogue, '| scenes', r.scenes.length, '| frames', r.scenes.reduce((a, s) => a + s.frames, 0), '| not bit-exact', inexact.length ? JSON.stringify(inexact) : 0);
}
console.log('per template:');
for (const [id, t] of Object.entries(perTemplate).sort()) console.log(' ', id.padEnd(8), 'scenes', t.scenes, 'frames', t.frames, 'bit-exact', t.exact, 'min IoU', t.minIoU, 'max mean|dA|', t.maxMad);
