// portrait-beat-montage: footage with non-square pixels. Windows Staging (2.0.536) refused the matte request's
// source: "[Parsed_concat_45] Input link in0:v0 parameters (size 540x720, SAR 853:854) do not match the corresponding
// output link in0:v0 parameters (540x720, SAR 1:1)". The unit sources now get square pixels, and so does every concat
// chain (unit sources cached by 0.1.7 kept the source's SAR). Real ffmpeg; skipped without it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadPanelOperation} from './panel_operation.mjs';

const op = loadPanelOperation('portrait-beat-montage');
const has = (tool) => spawnSync(tool, ['-version']).status === 0;
const skip = has('ffmpeg') && has('ffprobe') ? false : 'ffmpeg and ffprobe are needed';
const ff = (args) => { const r = spawnSync('ffmpeg', args, {encoding: 'utf8'}); assert.equal(r.status, 0, r.stderr); };
const sar = (file) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,sample_aspect_ratio',
  '-of', 'json', file], {encoding: 'utf8'}).stdout).streams[0];

test('unit sources get square pixels', () => {
  assert.match(op.unitSourceArgs({start: 1, path: '/c/a.mov', width: 1920, height: 1080}, '/o/s.mp4').join(' '), /scale=540:720,setsar=1,minterpolate/);
  assert.ok(op.matteConcatArgs(['/a.mp4', '/b.mp4'], '/o.mp4').join(' ').split('setsar=1').length === 3, 'every concat chain');
});

test('a SAR 853:854 source becomes a square-pixel unit, and the matte source concats with older cached units', {skip, timeout: 300000}, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbm-sar-'));
  const odd = path.join(dir, 'odd.mp4'), square = path.join(dir, 'square.mp4');
  ff(['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=480x640:rate=30:duration=2', '-vf', 'setsar=r=853/854:max=1000', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', odd]);
  ff(['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', square]);
  assert.equal(sar(odd).sample_aspect_ratio, '853:854');
  const units = [];
  for (const [i, [file, w, h]] of [[odd, 480, 640], [square, 1280, 720]].entries()) {
    const out = path.join(dir, `u${i}.mp4`);
    ff(op.unitSourceArgs({start: 0.5, path: file, width: w, height: h}, out));
    const s = sar(out);
    assert.deepEqual([s.width, s.height], [op.W, op.H]);
    assert.ok(['1:1', undefined, 'N/A'].includes(s.sample_aspect_ratio), `unit ${i} SAR ${s.sample_aspect_ratio}`);
    units.push(out);
  }
  // A unit cached by 0.1.7: the same window built without setsar keeps 853:854.
  const stale = path.join(dir, 'stale.mp4');
  ff(op.unitSourceArgs({start: 0.5, path: odd, width: 480, height: 640}, stale).map((a) => a.replace(',setsar=1,', ',')));
  assert.equal(sar(stale).sample_aspect_ratio, '853:854');
  const out = path.join(dir, 'matte-source.mp4');
  ff(op.matteConcatArgs([...units, stale], out));
  const s = sar(out);
  assert.deepEqual([s.width, s.height], [op.W, op.H]);
  // Without the per-chain setsar this concat is the one Windows refused.
  const refused = spawnSync('ffmpeg', op.matteConcatArgs([...units, stale], path.join(dir, 'x.mp4')).map((a) => a.split(',setsar=1[').join('[')), {encoding: 'utf8'});
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /SAR 853:854/);
  fs.rmSync(dir, {recursive: true, force: true});
});
