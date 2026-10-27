import test from "node:test";
import assert from "node:assert/strict";
import { stripTypeScriptTypes } from "node:module";
import { resolveNarration, resolvePlanNarration } from "../src/pipeline/narration-reference.ts";
import { assemble, newRunRecord } from "../src/pipeline/flow.ts";

const UUID = "11111111-1111-4111-8111-111111111111";
const ref = { resourceId: "r0", durationSeconds: 4, workflowId: "narration-job" };
const audio = { resourceId: "r2", type: "Audio", durationSeconds: 4 };
function host({ result = { resourceId: "r2", durationSeconds: 4 }, projectId = "p", resources = [audio], failure } = {}) {
  const calls = [], mutations = [];
  const sdk = { runScript: async call => {
    calls.push(call);
    assert.ok(!call.allowCommit);
    const execute = new Function(stripTypeScriptTypes(`async function execute(selects) { ${call.script}\n }`) + "; return execute;")();
    const selects = {
      project: id => { assert.equal(id, "p"); return { resources: async () => resources }; },
      narration: {
        job: id => { assert.equal(id, ref.workflowId); return { status: async () => { if (failure) throw Error(failure); return { projectId }; }, result: async () => result }; },
        generate: () => { mutations.push("generate"); assert.fail("never regenerate"); },
      },
    };
    return { result: await execute(selects) };
  } };
  return { sdk, calls, mutations };
}

test("a saved job resolves current Audio even when its former r0 now means bands", async () => {
  const h = host({ resources: [{ resourceId: "r0", type: "Image", name: "bands.png", durationSeconds: 0 }, audio] });
  assert.deepEqual(await resolveNarration(h.sdk, "p", ref), { ...ref, resourceId: "r2" });
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.mutations, []);
  assert.ok(h.calls.every(c => !/insertResource|overlayResource/.test(c.script)));
});

test("missing jobs, wrong Project, media type and duration never use a cached id or regenerate", async () => {
  for (const opts of [{ result: null }, { projectId: "other" }, { resources: [] },
    { resources: [{ ...audio, type: "Image" }] }, { resources: [{ ...audio, durationSeconds: 7 }] },
    { result: { resourceId: "r0", durationSeconds: 8 } }, { result: { resourceId: "r2", durationSeconds: NaN } }, { failure: "job not found" }]) {
    const h = host(opts);
    await assert.rejects(resolveNarration(h.sdk, "p", ref));
    assert.deepEqual(h.mutations, []);
    assert.ok(h.calls.every(c => !c.allowCommit));
  }
});

const plan = { narrationId: "r0", durationSeconds: 4, sentences: [{ text: "One." }, { text: "Two." }] };
const s = { projectId: "p", approved: "revision", voiceId: "voice", plan };
const rec = { projectId: "p", revision: "revision", voiceId: "voice", text: "One. Two.", state: "imported", resourceId: "r0", durationSeconds: 4, workflowId: ref.workflowId };
test("legacy plans reconnect only to their matching saved narration job, without changing storage", async () => {
  for (const change of [{}, { revision: "different" }, { voiceId: "other" }, { text: "Different." },
    { resourceId: "r1" }, { projectId: "other" }, { state: "submitted" }, { durationSeconds: 5 }, { workflowId: undefined }]) {
    const h = host();
    h.sdk.storage = { getItem: async () => JSON.stringify({ ...rec, ...change }), setItem: async () => assert.fail("no record overwrite") };
    if (!Object.keys(change).length) assert.equal((await resolvePlanNarration(h.sdk, s)).resourceId, "r2");
    else {
      await assert.rejects(resolvePlanNarration(h.sdk, s), /narrationReferenceLost/);
      assert.equal(h.calls.length, 0);
    }
  }
});

test("a missing durable narration reference stops candidate assembly before any media writes", async () => {
  const h = host();
  h.sdk.storage = { getItem: async () => null };
  await assert.rejects(assemble(h.sdk, {}, s, {}, () => {}, newRunRecord("", "")), /narrationReferenceLost/);
  assert.equal(h.calls.length, 0); // no imports, insertResource, overlayResource or commits
});

test("a panel-read UUID is checked in its exact Project; matching aliases and lookalikes are not identity", async () => {
  const reads = [];
  const sdk = { call: async (...args) => { reads.push(args); return [{ ...audio, resourceId: UUID }]; } };
  assert.equal((await resolveNarration(sdk, "p", { resourceId: UUID, durationSeconds: 4 })).resourceId, UUID);
  assert.deepEqual(reads, [["listProjectResources", "p"]]);
  await assert.rejects(resolveNarration(sdk, "p", { resourceId: "r2", durationSeconds: 4 }), /narrationReferenceLost/);
  await assert.rejects(resolveNarration(sdk, "p", { resourceId: UUID.replace(/^1/, "2"), durationSeconds: 4 }), /narrationReferenceLost/);
  await assert.rejects(resolveNarration(sdk, "p", { resourceId: UUID, durationSeconds: 5 }), /narrationReferenceLost/);
});
