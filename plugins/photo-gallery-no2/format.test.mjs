import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planGallery, REFERENCE } from './format.mjs';

const oracle = JSON.parse(readFileSync(new URL('./reference-oracle.json', import.meta.url)));
const media = Array.from({ length: 21 }, (_, i) => ({
  resourceId: `prepared-video-${i + 1}`,
  kind: 'video',
  width: i % 2 ? 1920 : 1080,
  height: i % 2 ? 1080 : 1920,
  durationFrames: 853,
}));

test('reference speed reproduces every observed reveal and the color cut', () => {
  const plan = planGallery({ media, manualBpm: oracle.nominalBpm });
  assert.equal(plan.frameSize.width, oracle.width);
  assert.equal(plan.frameSize.height, oracle.height);
  assert.equal(plan.fps, oracle.fps);
  assert.equal(plan.durationFrames, oracle.durationFrames);
  assert.deepEqual(plan.tiles.map((tile) => tile.revealFrame), oracle.revealFrames);
  assert.equal(plan.colorFrame, oracle.colorFrame);
  assert.equal(plan.tiles.length, oracle.columns * oracle.rows);
  for (const [i, tile] of plan.tiles.entries()) {
    assert.equal(tile.row, Math.floor(i / 3));
    assert.equal(tile.column, i % 3);
    assert.equal(tile.endFrame, oracle.durationFrames);
    assert.deepEqual(tile.rect, {
      left: tile.column * 360 + 2,
      right: (tile.column + 1) * 360 - 2,
      top: Math.round(tile.row * 1920 / 7) + 2,
      bottom: Math.round((tile.row + 1) * 1920 / 7) - 2,
    });
  }
});

test('BPM changes only reveal and color timings, not output length or grid order', () => {
  const plan = planGallery({ media, manualBpm: 169.5 });
  assert.deepEqual(plan.tiles.map((tile) => tile.revealFrame), oracle.revealFrames.map((frame) => Math.round(frame * 113 / 169.5)));
  assert.equal(plan.colorFrame, 180);
  assert.equal(plan.durationFrames, 853);
  assert.deepEqual(plan.tiles.map((tile) => tile.resourceId), media.map((item) => item.resourceId));
});

test('an explicit resource can occupy two slots, but missing or excess assignments fail', () => {
  const repeated = media.map((item) => ({ ...item }));
  repeated[20].resourceId = repeated[0].resourceId;
  assert.equal(planGallery({ media: repeated, manualBpm: oracle.nominalBpm }).tiles[20].resourceId, repeated[0].resourceId);
  for (const count of [0, 1, 20]) {
    assert.throws(() => planGallery({ media: media.slice(0, count), manualBpm: oracle.nominalBpm }), /21/);
  }
  assert.throws(() => planGallery({ media: [...media, media[0]], manualBpm: oracle.nominalBpm }), /21/);
});

test('the planner accepts original Image Resources without MP4 conversion and rejects short videos', () => {
  const mixed = media.map((item) => ({ ...item }));
  mixed[5] = { resourceId: 'video-6', kind: 'video', width: 1920, height: 1080, durationFrames: 120 };
  assert.throws(() => planGallery({ media: mixed, manualBpm: oracle.nominalBpm }), /short/i);
  const photos = mixed.map((item, i) => ({ resourceId: `photo-${i}`, kind: 'image', width: item.width,
    height: item.height }));
  assert.deepEqual(planGallery({ media: photos, manualBpm: oracle.nominalBpm }).tiles.map(item => item.kind),
    Array(21).fill('image'));
  assert.equal(planGallery({ media: mixed.map((item, i) => i === 5 ? photos[i] : item),
    manualBpm: oracle.nominalBpm }).tiles[5].kind, 'image');
  const allVideos = Array.from({ length: 21 }, (_, i) => ({ resourceId: `video-${i}`, kind: 'video', width: 1080, height: 1920, durationFrames: 853 }));
  assert.equal(planGallery({ media: allVideos, manualBpm: oracle.nominalBpm }).tiles.length, 21);
});

test('the reference moving slots can be supplied as Videos while other slots stay original Images', () => {
  const moving = new Set(oracle.observedMovingSlots);
  const referenceMix = Array.from({ length: 21 }, (_, index) => ({
    resourceId: `source-${index + 1}`,
    kind: moving.has(index + 1) ? 'video' : 'image',
    width: 1080,
    height: 1920,
    ...(moving.has(index + 1) ? { durationFrames: oracle.durationFrames } : {}),
  }));
  const plan = planGallery({ media: referenceMix, manualBpm: oracle.nominalBpm });
  assert.deepEqual(plan.tiles.flatMap((tile, index) => tile.kind === 'video' ? [index + 1] : []),
    oracle.observedMovingSlots);
  assert.equal(plan.tiles.filter(tile => tile.kind === 'image').length, 15);
});

test('music is optional with manual BPM; automatic estimate needs a reliable value', () => {
  assert.throws(() => planGallery({ media }), /BPM/);
  assert.throws(() => planGallery({ media, music: { resourceId: 'audio', durationFrames: 853 } }), /BPM/);
  const automatic = planGallery({ media, music: { resourceId: 'audio', durationFrames: 853 }, estimatedBpm: oracle.nominalBpm });
  assert.equal(automatic.bpmSource, 'estimated');
  const overridden = planGallery({ media, music: { resourceId: 'audio', durationFrames: 853 }, estimatedBpm: 90, manualBpm: oracle.nominalBpm });
  assert.equal(overridden.bpmSource, 'manual');
  assert.equal(overridden.colorFrame, 270);
});

test('music shortage and invalid inputs fail before creation', () => {
  assert.throws(() => planGallery({ media, manualBpm: oracle.nominalBpm, music: { resourceId: 'audio', durationFrames: 852 } }), /music.*short/i);
  assert.throws(() => planGallery({ media, manualBpm: oracle.nominalBpm, durationFrames: 270 }), /color.*end/i);
  assert.throws(() => planGallery({ media: media.map((item, i) => i === 0 ? { ...item, kind: 'audio' } : item), manualBpm: oracle.nominalBpm }), /video/i);
  assert.throws(() => planGallery({ media: media.map((item, i) => i === 0 ? { ...item, focusX: 1.5 } : item), manualBpm: oracle.nominalBpm }), /focus/i);
});

test('reference timings conform to the Project grid, including fractional rates and music', () => {
  const media = Array.from({length:21},(_,i)=>({resourceId:`r${i}`,kind:'image',width:640,height:960}));
  for (const fps of [30,60,30000/1001]) {
    const plan = planGallery({media,manualBpm:113,fps,music:{resourceId:'music',durationFrames:1800,startFrame:60}});
    assert.equal(plan.fps,fps);
    assert.equal(plan.durationFrames,Math.round(853*fps/60));
    assert.equal(plan.colorFrame,Math.round(270*fps/60));
    assert.deepEqual(plan.tiles.map(tile=>tile.revealFrame),REFERENCE.revealFrames.map(frame=>Math.round(frame*fps/60)));
    assert.equal(plan.music.startSeconds,1);
    assert.ok(plan.tiles.every(tile=>tile.endFrame===plan.durationFrames));
  }
});
