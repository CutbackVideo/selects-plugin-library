import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const panel = fs.readFileSync(process.env.TRAVEL_BEAT_OVERLAY_PANEL || path.resolve(import.meta.dirname, '../plugins/travel-beat-vlog/panel.tsx'), 'utf8');
const body = panel.slice(panel.indexOf('// @operation-start'), panel.indexOf('// @operation-end')).replace(/^export /gm, '');
const {scenePlan, buildFinishScript, VIDEO_SLOTS, REFERENCE_TIMING} = vm.runInNewContext('(function(){' + body + ';return {scenePlan,buildFinishScript,VIDEO_SLOTS,REFERENCE_TIMING};})()');

// The default host path rounds source boundaries independently. At 25 fps a
// reused 30 fps shot can demand five frames while its target holds four. The
// existing explicit-rate path instead retains the exact requested interval.
// Reproduced against the actual SDK with both 30 and 30000/1001 fps sources.
function host(fps, sourceFps, plan) {
  let next = 2;
  const hero = plan.clips.find(c => c.image);
  const clips = [{clipId: 1, trackId: 'hero-track', resourceId: 'hero', trackKind: 'video', startFrame: hero.startFrame, endFrame: hero.endFrame}];
  const kinds = new Map([...VIDEO_SLOTS.map(s => [s, 'Video']), ['hero', 'Image'], ['song', 'Audio']]);
  const log = {commits: 0, video: []};
  const draft = {
    meta: async () => ({fps, frameSize: {width: 1080, height: 1920}, durationFrames: plan.durationFrames}),
    clips: async () => clips.map(c => ({...c})),
    rangeAtFrames: async (startFrame, endFrame) => ({startFrame, endFrame}),
    overlayResource: async ({resource, over, sourceStartSeconds = 0, playbackSpeed}) => {
      const isVideo = kinds.get(resource.id) === 'Video';
      const duration = over.endFrame - over.startFrame;
      const sourceStart = Math.round(sourceStartSeconds * sourceFps);
      const sourceDuration = Math.round(duration / fps * sourceFps);
      const projected = Math.round((sourceStart + sourceDuration) * fps / sourceFps) - Math.round(sourceStart * fps / sourceFps);
      const targetDuration = playbackSpeed ? duration : projected;
      if (isVideo && targetDuration !== duration) throw Error('Resource overlay simulation covered only part of the requested interval');
      if (isVideo && playbackSpeed) assert.equal(playbackSpeed.numerator / playbackSpeed.denominator, 1, 'reuse must retain normal speed');
      const row = {clipId: next++, trackId: 't' + next, resourceId: resource.id, trackKind: isVideo ? 'video' : 'audio', ...over};
      clips.push(row);
      if (isVideo) log.video.push({...row, sourceStartSeconds});
    },
    setClipAudio: async () => {}, setClipTransform: async () => {}, addVideoEffect: async () => {}, addMotionGraphic: async () => {},
    commitAll: async () => {log.commits++; return {commitId: 'saved'};},
  };
  return {selects: {project: () => ({meta: async () => ({draftIds: ['draft']}), resources: async () => [...kinds].map(([resourceId, type]) => ({resourceId, type})), resource: id => ({id})}), draft: () => draft}, log};
}

for (const fps of [25, 24000 / 1001, 30, 60]) for (const sourceFps of [30, 30000 / 1001]) {
  test(`Travel repeated source windows retain every planned interval at ${fps} fps from ${sourceFps} fps`, async () => {
    const plan = scenePlan(fps), f = host(fps, sourceFps, plan);
    const input = {mode: 'finish', projectId: 'project', draftId: 'draft', fps,
      videos: Object.fromEntries(VIDEO_SLOTS.map(s => [s, {resourceId: s, width: 1080, height: 1920}])),
      hero: {resourceId: 'hero', width: 1080, height: 1920}, placements: [{clipId: 1, trackId: 'hero-track'}],
      grades: {}, songResourceId: 'song', title: {text: 'TRAVEL', color: '#F4C711'}, timing: REFERENCE_TIMING};
    const result = await vm.runInNewContext('(async()=>{' + buildFinishScript(input).replace(/const (input|plan):any=/g, 'const $1=') + '})()', {selects: f.selects});
    assert.equal(result.status, 'saved', result.message);
    assert.equal(f.log.commits, 1);
    assert.equal(f.log.video.length, 35);
    for (const [i, clip] of plan.clips.filter(c => !c.image).entries()) {
      const actual = f.log.video[i];
      assert.equal(actual.resourceId, clip.slot);
      assert.equal(actual.startFrame, clip.startFrame);
      assert.equal(actual.endFrame, clip.endFrame);
      assert.equal(actual.sourceStartSeconds, clip.inSeconds, 'continuation in-points must remain unchanged');
    }
  });
}
