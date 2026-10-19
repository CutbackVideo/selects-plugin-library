import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPanelOperation} from './panel_operation.mjs';
const {startMusicPreview} = loadPanelOperation('artlist');
const settle = () => new Promise(resolve => setImmediate(resolve));
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
  const stop = startMusicPreview(media, 'file:///tmp/selects/Music/artlist/previews/song.aac', () => errors.push('failed'));
  return {media, calls, errors, stop, reject: error => reject(error)};
}
test('plays the cached preview file directly and releases audio on teardown', () => {
  const f = fixture();
  assert.equal(f.media.src, 'file:///tmp/selects/Music/artlist/previews/song.aac');
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
