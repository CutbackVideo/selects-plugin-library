import test from "node:test";
import assert from "node:assert/strict";
import { stripTypeScriptTypes } from "node:module";
import { readSceneSnapshots, applySceneEdits } from "../src/pipeline/scene-edits.ts";
import { reviseGraphics, checkGraphicReply } from "../src/pipeline/visual-editor.ts";
import { newRunRecord, previewRev } from "../src/pipeline/flow.ts";

const code = 'export default function Graphic({data}) { return <div style={{color:data.color}}>News</div>; }';
function fixture() {
  const scenes = [0, 1].map(i => ({ type: "text_card", sentenceIds: ["s" + i], params: { text: "news" }, hideCaption: false, disclaimer: false }));
  const plan = { scenes, narrationId: "voice", durationSeconds: 6, sentences: scenes.map((_, i) => ({ id: "s" + i, text: "News", startSec: i * 3, endSec: (i + 1) * 3 })), times: [], thumbs: {}, assets: [], assetSummaries: [], rounds: [], changed: [], edited: [] };
  const s = { presetId: "chosun", projectId: "p", scriptProvider: "chatgpt", article: { body: "Sales were 34 percent.", photos: [] }, script: { headline: { line1: "Head", line2: "Two" }, sentences: [{ text: "The original narration" }] }, plan };
  s.preview = { draftId: "d", projectId: "p", planRev: previewRev(s), scenes: scenes.map((_, i) => ({ startSec: i * 3, endSec: (i + 1) * 3, clipId: i + 1 })) };
  return s;
}
function host() {
  const state = { clips: [1, 2, 3].map((id, i) => ({ clipId: id, trackId: id === 3 ? "audio" : "graphics", startFrame: i * 90, endFrame: (i + 1) * 90, name: "Manually renamed", manualTransform: { x: 42 } })), programs: { 1: { tsxCode: code, parameters: { color: "red", fontCss: "data:font;base64,KEEP" }, editableParameters: [] }, 2: { tsxCode: code, parameters: { color: "red" }, editableParameters: [] } } };
  const h = { state, calls: [], commits: 0, writes: 0, failClip: null, replies: [], prompts: [] };
  h.sdk = {
    aiProviders: async () => ({ chatgpt: "connected", claude: "disconnected", selects: "connected" }),
    askAI: async input => { h.prompts.push(input); const next = h.replies.shift(); if (next instanceof Error) throw next; return { text: JSON.stringify(next) }; },
    runScript: async call => {
      h.calls.push(call);
      let working = structuredClone(h.state);
      const d = {
        clips: async () => structuredClone(working.clips),
        motionGraphics: async () => working.clips.filter(c => working.programs[c.clipId]).map(clip => ({ name: clip.name, clip: structuredClone(clip) })),
        motionGraphicProgram: async c => working.programs[c.clipId],
        setMotionGraphicProgram: async input => {
          h.writes++;
          if (input.clip.clipId === h.failClip) throw Error("render failed");
          working.programs[input.clip.clipId] = { tsxCode: input.tsxCode, parameters: input.parameters, editableParameters: input.editableParameters };
        },
        setMotionGraphicParameters: async input => {
          h.writes++;
          if (input.clip.clipId === h.failClip) throw Error("render failed");
          Object.assign(working.programs[input.clip.clipId].parameters, input.parameters);
        },
        commitAll: async () => { h.commits++; h.state = working; },
      };
      const source = stripTypeScriptTypes(`async function execute(selects) { ${call.script}\n }`);
      return { result: await new Function(source + "; return execute;")()({ draft: () => d }) };
    },
  };
  return h;
}

test("scene code edit keeps moved clips, manual transforms, voice and sibling graphics", async () => {
  const h = host(), s = fixture(), before = structuredClone(h.state);
  const snapshots = await readSceneSnapshots(h.sdk, s.preview, s.plan);
  await applySceneEdits(h.sdk, "d", snapshots, [{ index: 0, tsxCode: code + "//changed", parameters: { color: "black" } }]);
  assert.equal(h.commits, 1);
  assert.deepEqual(h.state.clips, before.clips);
  assert.deepEqual(h.state.programs[2], before.programs[2]);
  assert.equal(h.state.programs[1].parameters.fontCss, before.programs[1].parameters.fontCss);
  assert.equal(h.state.programs[1].parameters.color, "black");
  assert.ok(h.calls.every(c => !/removeClips|removeEmptyTracks|narration\.generate/.test(c.script)));
});

test("failure in a later scene commits none of the scene edits", async () => {
  const h = host(), s = fixture(), before = structuredClone(h.state);
  const snapshots = await readSceneSnapshots(h.sdk, s.preview, s.plan);
  h.failClip = 2;
  await assert.rejects(applySceneEdits(h.sdk, "d", snapshots, [0, 1].map(index => ({ index, parameters: { color: "black" } }))), /render failed/);
  assert.equal(h.commits, 0);
  assert.deepEqual(h.state, before);
});

test("concurrent manual changes and missing targets reject before mutation", async () => {
  const h = host(), s = fixture();
  const snapshots = await readSceneSnapshots(h.sdk, s.preview, s.plan);
  h.state.programs[2].parameters.color = "blue";
  await assert.rejects(applySceneEdits(h.sdk, "d", snapshots, [0, 1].map(index => ({ index, parameters: { color: "black" } }))), /graphicTargetChanged/);
  assert.equal(h.writes, 0);
  h.state.clips = h.state.clips.filter(c => c.clipId !== 1);
  await assert.rejects(readSceneSnapshots(h.sdk, s.preview, s.plan), /graphicTargetChanged/);
});

test("legacy scenes bind only an exact unambiguous name and time match", async () => {
  const h = host(), s = fixture();
  delete s.preview.scenes[0].clipId;
  await assert.rejects(readSceneSnapshots(h.sdk, s.preview, s.plan), /graphicTargetChanged/);
  h.state.clips[0].name = "Text card 01";
  const rows = await readSceneSnapshots(h.sdk, s.preview, s.plan);
  assert.equal(rows[0].clipId, 1);
});

test("general visual editing uses source chart data beyond narration and keeps session content", async () => {
  const h = host(), s = fixture(), before = structuredClone(s);
  h.replies = [ { scenes: [1] }, { parameters: { barHeight: 34, color: "black" }, tsxCode: code + "//animated chart", editableParameters: [], sources: [{ ref: "article", quote: "Sales were 34 percent." }], summary: "Chart updated" }, { ok: true, errors: [] } ];
  const out = await reviseGraphics(h.sdk, s, "Animate the sales chart and change its colors", () => {}, newRunRecord("chosun", ""), []);
  assert.deepEqual(s, before);
  assert.equal(out.preview.draftId, s.preview.draftId);
  assert.equal(out.plan.narrationId, "voice");
  assert.deepEqual(out.plan.sentences, s.plan.sentences);
  assert.deepEqual(out.plan.scenes[1], s.plan.scenes[1]);
  assert.equal(out.plan.scenes[0].program.tsxCode, code + "//animated chart");
  assert.equal(h.commits, 1);
  assert.ok(h.prompts.every(p => p.provider === "chatgpt"));
  assert.ok(h.prompts[1].prompt.includes("Sales were 34 percent."));
});

test("factual review failure leaves script, narration, session and draft untouched", async () => {
  const h = host(), s = fixture(), before = structuredClone(s), draft = structuredClone(h.state);
  const proposed = { parameters: { value: 99 }, sources: [{ ref: "article", quote: "Sales were 34 percent." }] };
  h.replies = [{ scenes: [1] }, proposed, { ok: false, errors: ["wrong value"] }, proposed, { ok: false, errors: ["wrong value"] }];
  await assert.rejects(reviseGraphics(h.sdk, s, "animate", () => {}, newRunRecord("chosun", ""), []), /wrong value/);
  assert.deepEqual(s, before); assert.deepEqual(h.state, draft); assert.equal(h.commits, 0);
});

test("editor reads source images instead of tiny row thumbnails and retains citations", async () => {
  const h = host(), s = fixture();
  s.plan.assets = [{ ref: "chart" }]; s.plan.thumbs = { chart: "tiny" };
  const image = { ref: "chart", dataUrl: "data:image/jpeg;base64,SOURCE", credit: "Publisher" };
  h.replies = [{ scenes: [1] }, { parameters: { label: "Source chart" }, tsxCode: code, sources: [{ ref: "chart", quote: "34%" }] }, { ok: true, errors: [] }];
  const out = await reviseGraphics(h.sdk, s, "animate the chart", () => {}, newRunRecord("chosun", ""), [image]);
  assert.equal(h.prompts[1].images[0].dataUrl, image.dataUrl);
  assert.equal(out.plan.scenes[0].program.sources[0].ref, "chart");
  assert.throws(() => checkGraphicReply({ parameters: { color: "black" }, sources: [{ ref: "unseen", quote: "34%" }] }, { index: 0 }, s, ["chart"]), /graphicInvalidSource/);
});
