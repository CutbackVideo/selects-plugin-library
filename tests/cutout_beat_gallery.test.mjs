// Beat Cutout Gallery: the JavaScript engine (cutout-engine.js, used on Windows) against prepare.py (Python + Pillow,
// used on macOS) on the same photos and masks. tests/fixtures/cutout_beat_gallery/parity.json holds what prepare.py
// made of a synthetic folder (make_parity.py writes it); this test rebuilds the same photos and masks from their
// integer formulas and runs the engine the way the panel does, so it needs neither Python nor ffmpeg.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const E = require(path.join(ROOT, 'plugins/cutout-beat-gallery/cutout-engine.js'));
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/cutout_beat_gallery/parity.json'), 'utf8'));

// make_parity.py source() and mask_small(), integer for integer.
function source(p, sw, sh) {
  const out = new Uint8Array(sw * sh * 3);
  let o = 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    out[o] = (x * (3 + p % 5) + y * (1 + p % 3) + p * 37) % 256;
    out[o + 1] = (Math.floor((x * y) / (7 + p)) + p * 11) % 256;
    out[o + 2] = (((x ^ y) * (p + 1)) + Math.floor((x * x + y * y) / (50 + p))) % 256;
    o += 3;
  }
  return out;
}
function photo([, p, [sw, sh], [w, h], tweak]) {
  const raw = source(p, sw, sh);
  for (let k = 0; k < tweak * 40; k++) raw[(k * 7919) % raw.length] ^= 1;
  return E.resize(E.image(sw, sh, 3, raw), w, h, 'bicubic');
}
function mask(i, scenario) {
  const w = 270, h = 480;
  let cx = 135 + ((i * 29) % 61 - 30), cy = 300 + (i * 17) % 80;
  const rx = 60 + (i * 13) % 40, ry = 120 + (i * 7) % 60;
  if (i % 5 === 0) cx = 20;
  if (scenario === 'short' && (i % 3 === 0 || i === 26)) cy = 40;
  const R = BigInt(rx * rx * ry * ry), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = BigInt((x - cx) ** 2 * ry * ry + (y - cy) ** 2 * rx * rx);
    out[y * w + x] = d * 100n <= 90n * R ? 255 : d * 100n >= 110n * R ? 0 : Number(((110n * R - d * 100n) * 255n) / (20n * R));
  }
  return E.resize(E.image(w, h, 1, out), E.W, E.H, 'bicubic');
}
const sha = (bytes) => E.hex(E.sha256(bytes));

// The Windows path of the panel, minus file I/O and ffmpeg: frames, masks, plan, layers, result.
async function prepare(scenario) {
  const seen = new Set(), previous = [], photos = [], rejected = [];
  for (const entry of FIXTURE.photos) {
    const src = photo(entry), name = entry[0];
    // The panel hashes the file's bytes; equal pixels stand in for equal files here.
    const digest = sha(src.d);
    if (seen.has(digest)) { rejected.push({ name, reason: 'duplicate photo' }); continue; }
    seen.add(digest);
    const r = await E.ops.frame({ rgb: src.d, w: src.w, h: src.h, previous });
    if (r.reason) { rejected.push({ name, reason: r.reason }); continue; }
    previous.push({ bits: r.bits, tiny: r.tiny });
    photos.push({ name, frame: r.frame });
  }
  const rows = [], good = [], masks = {}, layers = {}, boxes = {}, bases = {};
  photos.forEach((p, k) => {
    const i = k + 1, m = mask(i, scenario), q = E.ops.mask({ gray: m.d, w: m.w, h: m.h });
    if (q.ok) { good.push(i); masks[i] = q.mask; }
    rows.push({ index: i, name: p.name, stickerReady: q.ok, ...q.metrics });
    bases[i] = sha(p.frame);
  });
  const plan = E.ops.plan({ rows, good, photoCount: photos.length, rejected });
  assert.equal(plan.ready, true);
  for (const l of plan.layers) {
    const out = E.ops.layer({ frame: photos[l.index - 1].frame, mask: masks[l.index], style: l.style, outline: l.outline });
    layers[l.file] = sha(out.layer);
    boxes[l.file] = out.box;
    if (out.shown) bases[l.index] = sha(out.shown);
  }
  return { result: E.ops.finish({ plan, rows, boxes, rejected, extra: {} }), stickers: layers, bases };
}

for (const scenario of Object.keys(FIXTURE.scenarios)) {
  test(`engine equals prepare.py on the synthetic folder (${scenario})`, async () => {
    const want = FIXTURE.scenarios[scenario], got = await prepare(scenario);
    assert.deepEqual(got.result.rejected, want.result.rejected, 'the same photos are skipped for the same reasons');
    assert.deepEqual(got.result.rows, want.result.rows, 'fingerprints, quality metrics, scene and sticker slots');
    assert.deepEqual(got.result.cues, want.result.cues, 'cue timing, files and place() offsets');
    assert.deepEqual(got.result, want.result);
    assert.deepEqual(got.stickers, want.stickers, 'every sticker layer (RGBA) byte for byte');
    for (const [i, digest] of Object.entries(want.bases)) {
      if (got.result.rows.some((r) => r.index === Number(i) && r.baseSlot)) assert.equal(got.bases[i], digest, 'scene photo ' + i);
    }
  });
}

test('Python number and random helpers', () => {
  assert.equal(E.hex(E.mersenne(1n).randbytes(16)), 'f5b165224a58b791df6af1d8303e61cd');
  assert.equal(E.hex(E.mersenne(2n ** 63n + 12345n).randbytes(8)), '53b7054e007d7763');
  assert.deepEqual([0.0625, 0.1875, 0.0005, 0.0015].map(E.pyRound3), [0.062, 0.188, 0.001, 0.002]);
  assert.deepEqual([2.5, -2.5, 3.5, 0.4999].map(E.pyRound), [2, -2, 4, 0]);
  assert.equal(E.hex(E.sha256(new TextEncoder().encode('abc'))), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('an empty mask gives the full-frame box, as getbbox() None does', () => {
  const [ok, m] = E.quality(E.image(E.W, E.H, 1));
  assert.equal(ok, false);
  assert.deepEqual(m.box, [0, 0, 1, 1]);
  assert.deepEqual(E.place(null, [.05, .27, .92, .99]), E.place([0, 0, E.W, E.H], [.05, .27, .92, .99]));
});

test('original photo and original matte receive the same centered cover crop',()=>{
 const w=900,h=1200,rgb=E.image(w,h,3),gray=E.image(w,h,1);
 // A subject off center plus a stripe entirely outside the portrait crop.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const value=x<55?255:(x>=440&&x<620&&y>=180&&y<1100?192:0);
  gray.d[y*w+x]=value;rgb.d[(y*w+x)*3]=value;
 }
 const fitted=E.framePhoto(rgb,[]).frame;
 const mask=E.maskOf(gray.d,w,h,true).mask;
 for(let i=0;i<mask.length;i++)assert.equal(mask[i],fitted[i*3]);
 assert.equal(mask[960*E.W],0,'the cropped-away left stripe must not stretch into the sticker');
 assert.ok(mask[960*E.W+Math.round(.64*E.W)]>180,'the subject remains in the same place as the photo');
});
