// Four Photo Reveal's song plan on a synthetic click track (a click every 0.25 s from 0 to 40 s, beat 0.5 s), shaped
// like one selects.media.measureBeatSync source: phrases on half beats, a fullscreen tail, the whole song covered.
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPanelOperation} from './panel_operation.mjs';

const {planNo14,songScenePlan,normalizeNativeFinish}=loadPanelOperation('no14-still-video');

function clickSong(dur = 40) {
  const hop = 0.005, n = Math.round(dur / hop), flux = new Float32Array(n), rmsDb = new Float32Array(n).fill(-14), onsets = [];
  for (let t = 0; t < dur - 1e-9; t += 0.25) { const f = Math.abs(t % 1) < 1e-6 ? 2 : 1.2; flux[Math.round(t / hop)] = f; onsets.push({t, flux: f}); }
  return {durationSeconds: dur, audio: {status: 'measured', startSeconds: 0, hopSeconds: hop, frames: {flux, rmsDb}, onsets}};
}

test('the phrase repeats on half beats and the fullscreen tail reaches the song end', () => {
  const song = planNo14(clickSong());
  assert.equal(song.phrases.length, 4); // 4 x ~9 s in 40 s
  for (const p of song.phrases) for (const t of [...p.reveal, ...p.full, p.end]) assert.ok(Math.abs(t * 4 - Math.round(t * 4)) < 1e-6, String(t));
  assert.equal(song.tail.at(-1).end, 40);
  const plan = songScenePlan(song, 30);
  assert.equal(plan.durationFrames, 1200);
  assert.equal(plan.occurrences.length, song.phrases.length * 8 + song.tail.length);
  assert.equal(new Set(plan.occurrences.map((o) => o.key)).size, plan.occurrences.length);
  assert.ok(plan.occurrences.every((o) => o.endFrame > o.startFrame && o.endFrame <= plan.durationFrames));
  // Every transition joins the end of one fullscreen photo to the next one ten frames earlier, like the reference.
  for (const t of plan.transitions) {
    const from = plan.occurrences.find((o) => o.key === t.from), to = plan.occurrences.find((o) => o.key === t.to);
    assert.equal(from.endFrame, to.startFrame + 10);
    assert.equal(to.startFrame, t.cutFrame);
  }
  assert.equal(Math.max(...plan.occurrences.map((o) => o.endFrame)), 1200);
  // The finish step accepts the plan's own placements.
  const placements = plan.occurrences.map((o, i) => ({key: o.key, slot: o.slot, appearance: o.appearance, clipId: i + 1, trackId: 't' + i, startFrame: o.startFrame, endFrame: o.endFrame}));
  const photos = 'ABCD'.split('').map((s) => ({resourceId: s, path: '/' + s + '.jpg', width: 1000, height: 1500}));
  assert.equal(normalizeNativeFinish({mode: 'native-finish', projectId: 'p', draftId: 'd', photos, placements, fps: 30}, plan).placements.length, plan.occurrences.length);
});
