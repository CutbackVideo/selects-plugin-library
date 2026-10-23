import test from "node:test";
import assert from "node:assert/strict";
import { stripTypeScriptTypes } from "node:module";
import { sceneFrames, openPreview, seekScene, renameDraft, sceneStill, clearPreviewCache } from "../src/pipeline/preview.ts";

const target = { projectId: "p", draftId: "d" };
const scene = { ...target, frames: 300, scene: { startSec: 1, endSec: 3 }, key: "d:0:rev1" };
const env = { tmp: "/tmp", sep: "/" };
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
function host() {
  const h = { calls: [], files: new Map(), exports: [], commits: [], name: null, state: {
    projectId: "p", draftIds: ["d"], onScreenTab: { kind: "none", sequenceId: null }, playhead: null,
  } };
  const selects = {
    editor: {
      state: async () => structuredClone(h.state),
      openDraft: async (id) => { if (!h.ignoreOpen) h.state.onScreenTab = { kind: "draft", sequenceId: id }; return { requested: true }; },
      seekDraftFrame: async (x) => { if (!h.ignoreSeek) { h.state.onScreenTab = { kind: "draft", sequenceId: x.draftSequenceId }; h.state.playhead = { sequenceId: x.draftSequenceId, resolvedFrame: x.resolvedFrame }; } return { requested: true }; },
    },
    draft: (id) => { assert.equal(id, "d"); return { setName: async (name) => { h.name = name; }, commitAll: async (msg) => { if (h.failCommit) throw Error("commit failed"); h.commits.push(msg); } }; },
    export: { still: async (x) => {
      h.exports.push(x);
      if (h.beforeExport) await h.beforeExport();
      if (h.failExport) throw Error("export failed");
      h.files.set(x.outPath, h.badPng ? new Uint8Array(9) : png);
      return { byteSize: h.truncated ? 100 : png.length };
    } },
    files: {
      readRange: async ({ path, offset, length }) => { const bytes = h.files.get(path).subarray(offset, offset + length); return { bytesRead: bytes.length, base64: Buffer.from(bytes).toString("base64") }; },
      remove: async (path) => { h.files.delete(path); },
    },
  };
  h.sdk = { runScript: async (call) => {
    h.calls.push(call);
    const source = stripTypeScriptTypes(`async function execute(selects) { ${call.script}\n }`);
    return { result: await new Function(source + "; return execute;")()(selects) };
  } };
  return h;
}

test("scene frames match assembly and clamp still inside short/last scenes", () => {
  assert.deepEqual(sceneFrames(300, { startSec: 1, endSec: 3 }), { start: 30, end: 90, still: 75 });
  assert.deepEqual(sceneFrames(3, { startSec: -2, endSec: 8 }), { start: 0, end: 3, still: 0 });
  assert.deepEqual(sceneFrames(300, { startSec: 2, endSec: 2.02 }), { start: 60, end: 61, still: 60 });
  for (const frames of [0, -1, NaN, 2.5]) assert.throws(() => sceneFrames(frames, scene.scene));
  assert.throws(() => sceneFrames(300, { startSec: 2, endSec: 1 }));
  assert.throws(() => sceneFrames(300, { startSec: 0, endSec: Infinity }));
});

test("open and seek confirm actual tab and playhead", async () => {
  const h = host();
  assert.equal(await openPreview(h.sdk, target), true);
  assert.deepEqual(await seekScene(h.sdk, scene), { confirmed: true, frame: 30 });
  assert.ok(h.calls.every((x) => !x.allowCommit));
});

test("requested alone does not confirm open or seek", async () => {
  const h = host(); h.ignoreOpen = true; h.ignoreSeek = true;
  assert.equal(await openPreview(h.sdk, target), false);
  h.state.onScreenTab = { kind: "draft", sequenceId: "d" };
  h.state.playhead = { sequenceId: "other", resolvedFrame: 30 };
  assert.deepEqual(await seekScene(h.sdk, scene), { confirmed: false, frame: 30 });
});

test("wrong project or unowned Draft blocks all actions before mutation", async () => {
  for (const state of [{ projectId: "other", draftIds: ["d"] }, { projectId: "p", draftIds: [] }]) {
    const h = host(); Object.assign(h.state, state);
    await assert.rejects(openPreview(h.sdk, target), /does not belong/);
    await assert.rejects(seekScene(h.sdk, scene), /does not belong/);
    await assert.rejects(renameDraft(h.sdk, { ...target, name: "final" }), /does not belong/);
    await assert.rejects(sceneStill(h.sdk, env, scene), /does not belong/);
    assert.equal(h.exports.length, 0); assert.equal(h.name, null);
  }
});

test("rename persists setName through commitAll and propagates commit failure", async () => {
  const h = host(); const name = 'Title ` ${danger} "';
  await renameDraft(h.sdk, { ...target, name });
  assert.equal(h.name, name); assert.equal(h.commits.length, 1);
  assert.equal(h.calls[0].allowCommit, true);
  h.failCommit = true;
  await assert.rejects(renameDraft(h.sdk, { ...target, name }), /commit failed/);
  await assert.rejects(renameDraft(h.sdk, { ...target, name: " " }), /empty/);
});

test("still exports complete PNG once, reuses cache and clears temp files", async () => {
  const h = host();
  const [a, b] = await Promise.all([sceneStill(h.sdk, env, scene), sceneStill(h.sdk, env, scene)]);
  assert.equal(a.dataUrl, "data:image/png;base64," + Buffer.from(png).toString("base64"));
  assert.equal(a.cached, false); assert.equal(b.cached, true); assert.equal(b.ms, a.ms);
  assert.equal((await sceneStill(h.sdk, env, scene)).cached, true);
  assert.equal(h.exports.length, 1); assert.equal(h.exports[0].resolvedFrame, 75);
  assert.equal(h.files.size, 0);
  await sceneStill(h.sdk, env, { ...scene, key: "rev2" });
  assert.equal(h.exports.length, 2);
  assert.notEqual(h.exports[0].outPath, h.exports[1].outPath);
  clearPreviewCache(h.sdk);
  assert.equal((await sceneStill(h.sdk, env, scene)).cached, false);
});

test("failed and truncated PNGs are cleaned and never cached", async () => {
  for (const flag of ["failExport", "truncated", "badPng"]) {
    const h = host(); h[flag] = true;
    await assert.rejects(sceneStill(h.sdk, env, scene));
    assert.equal(h.files.size, 0);
    h[flag] = false;
    assert.equal((await sceneStill(h.sdk, env, scene)).cached, false);
    assert.equal(h.exports.length, 2);
  }
});

test("renders serialize and invalidation discards running/queued old requests", async () => {
  const h = host(); let release, entered;
  const started = new Promise((resolve) => { entered = resolve; });
  h.beforeExport = () => { entered(); return new Promise((resolve) => { release = resolve; }); };
  const first = sceneStill(h.sdk, env, scene);
  const firstCheck = assert.rejects(first, /invalidated/);
  await started;
  const second = sceneStill(h.sdk, env, { ...scene, key: "old2" });
  const secondCheck = assert.rejects(second, /invalidated/);
  assert.equal(h.exports.length, 1);
  clearPreviewCache(h.sdk); h.beforeExport = null;
  const fresh = sceneStill(h.sdk, env, scene);
  release();
  await Promise.all([firstCheck, secondCheck]);
  assert.equal((await fresh).cached, false);
  assert.equal(h.exports.length, 2);
  assert.equal((await sceneStill(h.sdk, env, scene)).cached, true);
});
