const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {stripTypeScriptTypes} = require('node:module');
const test = require('node:test');

const plugin = path.resolve(__dirname, '..');

async function loadFinishShort(bundled) {
  const {topLevel} = await import('../../../tests/windows_host.mjs');
  const file = path.join(plugin, bundled ? 'panel.tsx' : 'src/pipeline/apply.ts');
  const source = fs.readFileSync(file, 'utf8');
  const code = bundled ? topLevel(source, 'finishShort') : stripTypeScriptTypes(
    source.replace(/^import .*$/gm, '').replace(/^export /gm, ''), {mode:'strip'});
  const context = vm.createContext({
    J: JSON.stringify, lookCode:'', graphicCode:'', LOOK_LABEL:'a16z Vertical Frame',
    GRAPHIC_LABEL:'a16z Captions', W:1080, H:1920,
    script: async (sdk, summary, script, allowCommit) =>
      (await sdk.runScript({summary, script, allowCommit})).result,
  });
  vm.runInContext(code + '\nthis.finish = finishShort;', context);
  return context.finish;
}

async function finishWithMusic(finish, {endFrame, fps, seconds, sourceFps = fps, music = {id:'music', db:-24}}) {
  const ranges = [], clips = [], levels = [];
  let commits = 0, graphic = null;
  const draft = {
    meta:async()=>({fps}),
    rangeAtFrames:async(a,b)=>({a,b}),
    clips:async()=>clips,
    addMotionGraphic:async({within})=>{ graphic=within; return {clipId:100}; },
    overlayResource:async({resource, over, sourceStartSeconds=0, playbackSpeed})=>{
      assert.equal(resource.id, 'music');
      assert.equal(sourceStartSeconds, 0);
      if (playbackSpeed) assert.deepEqual(playbackSpeed, {numerator:1, denominator:1});
      assert(Number.isInteger(over.a) && Number.isInteger(over.b));
      assert(over.b > over.a && over.b <= endFrame);
      if ((over.b - over.a) / fps > seconds + 1e-9)
        throw Error(`Resource overlay simulation covered only part of [${over.a}, ${over.b}) for resource music`);
      // Default overlays round through the source's frame grid. Explicit 1x retains the target duration.
      const sourceFrames = Math.round((over.b - over.a) / fps * sourceFps);
      const insertedFrames = playbackSpeed ? over.b - over.a : Math.round(sourceFrames / sourceFps * fps);
      assert.equal(insertedFrames, over.b - over.a, 'music must fill exactly the requested Draft frames');
      ranges.push([over.a, over.b]);
      clips.push({clipId:clips.length+1, resourceId:'music', trackKind:'audio', startFrame:over.a, endFrame:over.b});
      return {inserted:1};
    },
    setClipAudio:async({clip, volumeDb})=>levels.push([clip.clipId, volumeDb]),
    commitAll:async()=>{ commits++; return {commitId:'saved'}; },
  };
  const selects = {
    draft:()=>draft,
    project:()=>({resource:id=>({id}), resources:async()=>[{resourceId:'music', durationSeconds:seconds}]}),
  };
  const sdk = {runScript:async({script, allowCommit})=>{
    assert.equal(allowCommit, true);
    const plain = stripTypeScriptTypes(`async function run() {${script}}`, {mode:'strip'});
    return {result:await new Function('selects', `${plain}; return run();`)(selects)};
  }};
  const result = await finish(sdk, 'draft', 'project', endFrame, {}, music, 0, [], fps);
  assert.equal(commits, 1);
  assert.deepEqual(graphic, {a:0,b:endFrame});
  assert.equal(result.music, ranges.length);
  assert.deepEqual(levels, clips.map(clip=>[clip.clipId,-24]));
  return ranges;
}

for (const bundled of [false, true]) {
  const label = bundled ? 'published bundle' : 'source';
  test(`${label}: a 150-second music bed covers all 6794 frames without reading past its end`, async()=>{
    const ranges = await finishWithMusic(await loadFinishShort(bundled), {endFrame:6794,fps:30,seconds:150});
    assert.deepEqual(ranges, [[0,4500],[4500,6794]]);
  });
  test(`${label}: fractional frame rates use bounded contiguous music ranges`, async()=>{
    const ranges = await finishWithMusic(await loadFinishShort(bundled), {endFrame:6794,fps:30000/1001,seconds:150});
    assert.deepEqual(ranges, [[0,4495],[4495,6794]]);
  });
  test(`${label}: a long enough bed is placed once and stops at the last video frame`, async()=>{
    assert.deepEqual(await finishWithMusic(await loadFinishShort(bundled), {endFrame:900,fps:30,seconds:150}), [[0,900]]);
  });
  test(`${label}: a shorter cached bed repeats according to its actual duration`, async()=>{
    assert.deepEqual(await finishWithMusic(await loadFinishShort(bundled),
      {endFrame:1000,fps:30,seconds:12.5}), [[0,375],[375,750],[750,1000]]);
  });
  test(`${label}: disabled music still saves the complete captions`, async()=>{
    assert.deepEqual(await finishWithMusic(await loadFinishShort(bundled), {endFrame:6794,fps:30,seconds:150,music:null}), []);
  });
  test(`${label}: a different source frame grid cannot create overlaps or overrun the video`, async()=>{
    assert.deepEqual(await finishWithMusic(await loadFinishShort(bundled),
      {endFrame:6794,fps:30000/1001,sourceFps:24,seconds:150}), [[0,4495],[4495,6794]]);
  });
  test(`${label}: unavailable music duration fails before committing`, async()=>{
    for (const seconds of [undefined, 0, NaN])
      await assert.rejects(finishWithMusic(await loadFinishShort(bundled),
        {endFrame:6794,fps:30,seconds}), /no usable duration/);
  });
}
