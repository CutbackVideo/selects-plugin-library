import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {loadPanelOperation} from './panel_operation.mjs';
import {checkScriptTypes} from './run_script_types.mjs';

const {importMusicScript, addMusicScript} = loadPanelOperation('music');
function fixture({end = 900, timelineEnd = end, fileTree = [], folders, existingClips = []} = {}) {
  const calls = [];
  let projectWrite = false;
  let seconds = 60;
  let blankFrames = timelineEnd;
  let nextId = 100;
  const clips = [
    ...(end > 0 ? [{clipId: 1, resourceId: 'picture', trackKind: 'main', startFrame: 0, endFrame: end}] : []),
    ...existingClips.map((clip, index) => ({clipId: index + 2, trackId: 'audio', ...clip})),
  ];
  const flatten = rows => rows.flatMap(row => row.type === 'dir' ? flatten(row.children) : [row]);
  const duration = () => Math.max(blankFrames, ...clips.map(clip => clip.endFrame), 0);
  const project = {
    sourceFiles: async options => options?.folder ? {fileTree} : folders ? {folders} : {fileTree},
    importFiles: async options => { projectWrite = true; calls.push(['import', options]); return {addedResourceIds: ['music']}; },
    resource: id => ({id}),
    resources: async () => [{resourceId: 'music', durationSeconds: seconds}, ...flatten(fileTree).map(row => ({resourceId: row.resourceId, durationSeconds: seconds}))],
  };
  const draft = {
    clips: async options => clips.filter(clip => options.trackScope === 'all' || clip.trackKind === 'main').map(clip => ({...clip})),
    meta: async () => ({fps: 30, durationFrames: duration()}),
    rangeAtFrames: async (startFrame, endFrame) => { assert.ok(endFrame <= duration()); return {startFrame, endFrame}; },
    insertGap: async options => { calls.push(['gap', options]); blankFrames += Math.round(options.seconds * 30); },
    overlayResource: async options => {
      calls.push(['overlay', options]);
      clips.push({clipId: nextId++, trackId: 'new-audio', resourceId: options.resource.id, trackKind: 'audio', ...options.over});
      return {inserted: 1};
    },
    moveOverlayClip: async options => {
      calls.push(['move', options]);
      const clip = clips.find(clip => clip.clipId === options.clip.clipId);
      clip.endFrame += options.startFrame - clip.startFrame;
      clip.startFrame = options.startFrame;
      return {clipId: clip.clipId};
    },
    commitAll: async label => { assert.equal(projectWrite, false, 'Import and Draft commit require separate script transactions'); calls.push(['commit', label]); },
  };
  const selects = {
    project: id => { assert.equal(id, 'project'); return project; },
    draft: id => { assert.equal(id, 'draft'); return draft; },
  };
  const execute = script => { projectWrite = false; return vm.runInNewContext(`(async () => {${script}})()`, {selects}); };
  const run = async (file = 'song.mp3', length = 60) => {
    seconds = length;
    const imported = await execute(importMusicScript('project', file));
    return execute(addMusicScript('project', 'draft', imported.resourceId, imported.durationSeconds, imported.musicResourceIds));
  };
  return {calls, run, clips};
}

test('adds editable audio over the picture and commits it', async () => {
  const f = fixture();
  await f.run();
  assert.deepEqual(f.calls.map(([name]) => name), ['import', 'overlay', 'commit']);
  assert.equal(f.calls[1][1].over.endFrame, 900);
  assert.equal(f.calls[1][1].resource.id, 'music');
  assert.equal(f.calls[2][1], 'Add music');
});
test('a short song limits the placement duration', async () => {
  const f = fixture(); await f.run('song.mp3', 5.1);
  assert.equal(f.calls[1][1].over.endFrame, 153);
});
test('an empty Draft adds the full song without requiring video', async () => {
  const f = fixture({end: 0});
  await f.run('song.mp3', 212);
  assert.deepEqual(f.calls.map(([name]) => name), ['import', 'gap', 'overlay', 'commit']);
  assert.equal(f.calls[1][1].seconds, 212);
  assert.equal(f.calls[2][1].over.endFrame, 6360);
});
test('reuses a file from a paged source tree and escapes paths', async () => {
  const file = "C:\\Music\\a'\n\".mp3";
  const f = fixture({folders: [{name: 'Music'}], fileTree: [{type: 'dir', children: [{type: 'file', path: file, resourceId: 'saved'}]}]});
  await f.run(file);
  assert.deepEqual(f.calls.map(([name]) => name), ['overlay', 'commit']);
  assert.equal(f.calls[0][1].resource.id, 'saved');
});
test('retry after a lost response does not duplicate music placed after frame zero', async () => {
  const f = fixture({fileTree: [{type: 'file', path: 'song.mp3', resourceId: 'saved'}], existingClips: [{resourceId: 'saved', trackKind: 'audio', startFrame: 300, endFrame: 600}]});
  const result = await f.run();
  assert.equal(result.inserted, 0);
  assert.equal(f.calls.length, 0);
});
for (const length of [5, 40]) {
  test(`appends a ${length}-second song without moving existing music or adding another gap`, async () => {
    const old = {resourceId: 'old', trackKind: 'audio', startFrame: 0, endFrame: 600};
    const f = fixture({end: 0, timelineEnd: 600, fileTree: [{type: 'file', path: 'old.mp3', resourceId: 'old'}], existingClips: [old]});
    await f.run('song.mp3', length);
    assert.equal(f.calls.some(([name]) => name === 'gap'), false);
    assert.deepEqual(f.clips.find(clip => clip.resourceId === 'old'), {clipId: 2, trackId: 'audio', ...old});
    const added = f.clips.find(clip => clip.resourceId === 'music');
    assert.equal(added.startFrame, 600);
    assert.equal(added.endFrame, 600 + length * 30);
  });
}
test('appends after music extending beyond Main without an out-of-range gap insert', async () => {
  const f = fixture({end: 0, timelineEnd: 300, fileTree: [{type: 'file', path: 'old.mp3', resourceId: 'old'}], existingClips: [{resourceId: 'old', trackKind: 'audio', startFrame: 300, endFrame: 1200}]});
  await f.run('song.mp3', 10);
  assert.equal(f.calls.some(([name]) => name === 'gap'), false);
  assert.equal(f.clips.find(clip => clip.resourceId === 'old').startFrame, 300);
  assert.equal(f.clips.find(clip => clip.resourceId === 'music').startFrame, 1200);
});
test('only provider music determines the append point; other audio stays under the picture', async () => {
  const f = fixture({fileTree: [{type: 'file', path: '/Voice/voice.mp3', resourceId: 'voice'}], existingClips: [{resourceId: 'voice', trackKind: 'audio', startFrame: 0, endFrame: 900}]});
  await f.run('/Music/song.mp3', 60);
  assert.equal(f.clips.find(clip => clip.resourceId === 'music').startFrame, 0);
  assert.equal(f.clips.find(clip => clip.resourceId === 'voice').endFrame, 900);
  assert.equal(f.calls.some(([name]) => name === 'gap'), false);
});
test('the generated edit typechecks against the available SDK', () => {
  checkScriptTypes([
    {name: 'Import music', script: importMusicScript('project', 'song.mp3')},
    {name: 'Add music', script: addMusicScript('project', 'draft', 'music', 60, ['music'])},
  ]);
});
