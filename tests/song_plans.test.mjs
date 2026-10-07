// The song-measured cut plans of recap-2026 (planRecap) and daily-vlog-8 (planVlog) on a synthetic click track:
// a 2 s quiet lead, then a click every 0.25 s (eighths at 120 BPM) to 40 s, then a 4 s quiet tail. Shaped like one
// selects.media.measureBeatSync source.
import test from 'node:test';
import assert from 'node:assert/strict';
import {panelSource, loadPanelFunctions} from './windows_host.mjs';

function clickSong() {
  const hop = 0.005, dur = 44, n = Math.round(dur / hop), flux = new Float32Array(n), rmsDb = new Float32Array(n).fill(-40);
  const onsets = [];
  for (let t = 2; t < 40 - 1e-9; t += 0.25) {
    const f = Math.abs((t - 2) % 1) < 1e-6 ? 2 : 1.2; // downbeats louder
    flux[Math.round(t / hop)] = f;
    onsets.push({t, flux: f});
  }
  for (let i = Math.round(2 / hop); i < Math.round(40 / hop); i++) rmsDb[i] = -14;
  return {durationSeconds: dur, audio: {status: 'measured', startSeconds: 0, hopSeconds: hop, frames: {flux, rmsDb}, onsets}};
}
const near = (t, list) => Math.min(...list.map((x) => Math.abs(x - t)));

test('recap: intro to the downbeat 4.67 s after entry, a cut on every click, the last clip to the song end', () => {
  const {planRecap} = loadPanelFunctions(panelSource('recap-2026'), ['songGrid', 'planRecap'], {});
  const m = clickSong(), clicks = m.audio.onsets.map((o) => o.t), p = planRecap(m);
  assert.ok(Math.abs(p.periodSeconds - 0.25) < 0.002, String(p.periodSeconds));
  assert.equal(p.introEnd, 7); // strongest onset within 0.6 s of 2 + 4.67
  const cuts = p.placements.slice(1).map((x) => x.startSeconds);
  assert.ok(cuts.every((t) => near(t, clicks) < 1e-9), 'every cut on a click');
  assert.ok(cuts.slice(1).every((t, i) => Math.abs(t - cuts[i] - 0.25) < 1e-9), 'one cut per click');
  assert.equal(p.placements.at(-1).endSeconds, 44);
  assert.ok(p.fadeStart > cuts.at(-1) && p.fadeStart <= 44 - 0.9);
  assert.ok(p.placements.every((x) => x.slot >= 1 && x.slot <= p.slotCount));
});

test('vlog: the reference phrase cycles on half beats and the closing shot reaches the song end', () => {
  const {planVlog} = loadPanelFunctions(panelSource('daily-vlog-8'), ['songGrid', 'planVlog'], {});
  const m = clickSong(), clicks = m.audio.onsets.map((o) => o.t), p = planVlog(m);
  const shots = p.shots;
  assert.equal(shots[0].role, 'open');
  assert.equal(shots.at(-1).role, 'close');
  assert.equal(shots.at(-1).end, 44);
  for (let i = 1; i < shots.length; i++) assert.equal(shots[i].start, shots[i - 1].end);
  assert.ok(shots.slice(1).every((s) => near(s.start, clicks) < 1e-9), 'every cut on a click');
  assert.deepEqual(JSON.parse(JSON.stringify(shots.slice(1, 9).map((s) => s.role))), ['slot', 'slot', 'slot', 'insert', 'slot', 'insert', 'slot', 'slot']);
  assert.ok(shots.length > 10, 'the phrase repeats over a song longer than the reference');
});
