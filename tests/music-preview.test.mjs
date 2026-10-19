import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPanelOperation} from './panel_operation.mjs';
const {startMusicPreview, musicWaveform} = loadPanelOperation('music');
const settle = () => new Promise(resolve => setImmediate(resolve));
test('the waveform preserves real peak heights and ignores unsupported or invalid data', () => {
  const data = {version: 2, channels: 1, bits: 8, data: Array(128).fill(0)};
  data.data[0] = -128;
  data.data[64] = 64;
  const peaks = musicWaveform(data);
  assert.equal(peaks.length, 64);
  assert.equal(peaks[0], 1);
  assert.equal(peaks[32], 0.5);
  assert.equal(peaks[1], 0);
  assert.equal(musicWaveform({...data, data: Array(65).fill(64)})[63], 0.5);
  for (const value of [null, {...data, channels: 2}, {...data, data: []}, {...data, data: [NaN]}, {...data, data: [256]}]) {
    assert.equal(musicWaveform(value).length, 0);
  }
});
function fixture() {
  const calls = [];
  let reject;
  const media = {
    play: () => new Promise((_resolve, fail) => { reject = fail; calls.push('play'); }),
    pause: () => calls.push('pause'),
    removeAttribute: name => calls.push(`remove-${name}`),
    load: () => calls.push('reset'),
  };
  const errors = [];
  const stop = startMusicPreview(media, 'https://audiocdn.epidemicsound.com/song.mp3', () => errors.push('failed'));
  return {media, calls, errors, stop, reject: error => reject(error)};
}
test('uses the search preview MP3 directly and releases audio on teardown', () => {
  const f = fixture();
  assert.equal(f.media.src, 'https://audiocdn.epidemicsound.com/song.mp3');
  f.stop(); assert.deepEqual(f.calls, ['play', 'pause', 'remove-src', 'reset']);
});
test('reports playback failures without downloading a licensed original', async () => {
  const f = fixture(); f.reject(new Error('failed')); await settle();
  assert.deepEqual(f.errors, ['failed']); f.stop();
});
test('a stale playback promise cannot show an error after closing the preview', async () => {
  const f = fixture(); f.stop(); f.reject(new Error('failed')); await settle();
  assert.deepEqual(f.errors, []);
});
