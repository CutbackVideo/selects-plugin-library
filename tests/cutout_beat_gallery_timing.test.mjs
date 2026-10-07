import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'plugins/cutout-beat-gallery/panel.tsx'), 'utf8');
const edges = [0, 40, 72, 104, 140, 196, 220, 235, 243, 283, 307, 337, 347, 371, 411, 478];
const expression = [...source.matchAll(/^      const code=(.+);$/gm)].find(m => m[1].includes('p.createDraft'))?.[1];
assert.ok(expression, 'exercise the ordinary production Build handler');
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/cutout_beat_gallery/parity.json'), 'utf8'));
const result = Object.values(fixture.scenarios)[0].result;
const script = vm.runInNewContext(expression, {
  pid: 'project', name: 'photos', result, cues: JSON.stringify(result.cues),
  SCENE_EDGES: vm.runInNewContext(source.match(/^const SCENE_EDGES=(.+);$/m)[1]),
  MOTION: '', SPOT: '', SPLIT: '', GRADE: '',
});

// Model both possible source-grid rounding directions. Extending the source is
// forbidden, matching the real SDK's unanalyzed Main/companion boundary policy.
// The two held source frames therefore matter independently of the final trim.
function draftAt(fps, conform) {
  const clips = [], cuts = [], effects = [];
  let saved = false;
  const duration = () => clips.filter(c => c.trackKind === 'main').at(-1)?.endFrame ?? 0;
  const draft = {
    setFrameSize: async () => {},
    meta: async () => ({ fps, durationFrames: duration() }),
    insertResource: async ({ resourceId }) => {
      const index = Number(resourceId.slice(0, 2)) - 1;
      const referenceFrames = edges[index + 1] - edges[index] + (index === 14 ? 8 : 0);
      const padding = source.match(/'-frames:v',String\(b.frames\+(\d+)\),\.\.\.enc.base/);
      assert.ok(padding, 'base render must provide spare source material');
      const frames = conform((referenceFrames + Number(padding[1])) * fps / 30);
      clips.push({ resourceId, trackKind: 'main', startFrame: duration(), endFrame: duration() + frames });
    },
    trimBoundary: async ({ frame, side, byFrames }) => {
      assert.equal(frame, duration());
      assert.equal(side, 'before');
      assert.ok(byFrames < 0, 'the Build must never extend unavailable source/companion material');
      clips.filter(c => c.trackKind === 'main').at(-1).endFrame += byFrames;
      cuts.push(duration());
    },
    rangeAtFrames: async (startFrame, endFrame) => ({ startFrame, endFrame }),
    overlayResource: async ({ resource, over }) => clips.push({ resourceId: resource.id, trackKind: resource.id.endsWith('.mp3') ? 'audio' : 'video', ...over }),
    clips: async () => clips,
    addVideoEffect: async effect => effects.push(effect),
    commitAll: async () => { saved = true; return { createdDraftId: 'saved' }; },
  };
  const files = [
    ...edges.slice(1).map((_, i) => String(i + 1).padStart(2, '0') + '-base.mp4'),
    ...result.cues.map(c => c.file), 'fixed-bgm.mp3',
  ];
  const project = { sourceFiles: async () => ({ fileTree: files.map(name => ({ name, resourceId: name })) }), createDraft: async () => draft, resource: async id => ({ id }) };
  return { clips, cuts, effects, saved: () => saved, selects: { project: () => project, editor: { openDraft: async () => {} } } };
}

for (const fps of [24000 / 1001, 24, 25, 30000 / 1001, 30, 60000 / 1001, 60]) {
  for (const conform of [Math.floor, Math.ceil]) {
    test(`every beat cut and entrance stays aligned at ${fps}fps (${conform.name})`, async () => {
      const model = draftAt(fps, conform);
      const built = await vm.runInNewContext(`(async()=>{${script}})()`, { selects: model.selects });
      assert.equal(built.draftId, 'saved');
      assert.equal(model.saved(), true);
      const main = model.clips.filter(c => c.trackKind === 'main');
      assert.deepEqual([0, ...main.map(c => c.endFrame)], edges.map(n => Math.round(n * fps / 30)));
      assert.equal(built.frames, Math.round(478 * fps / 30));
      for (const cue of result.cues) {
        const index = edges.findIndex((edge, i) => i < 15 && cue.start >= edge && cue.start < edges[i + 1]);
        const overlay = model.clips.find(c => c.trackKind === 'video' && c.resourceId === cue.file && c.startFrame === Math.round(cue.start * fps / 30));
        assert.ok(overlay.startFrame >= main[index].startFrame && overlay.startFrame < main[index].endFrame, 'sticker enters over its intended photo');
        if (cue.end === edges[index + 1]) assert.equal(overlay.endFrame, main[index].endFrame, 'the entrance and scene cut end together');
      }
    });
  }
}
