import test from "node:test";
import assert from "node:assert/strict";
import { readAiProviders, scriptProvider } from "../src/pipeline/providers.ts";
import { emptySession, newRunRecord, planScenes, revisePlan, writeScript } from "../src/pipeline/flow.ts";
import { PRESETS } from "../src/preset.ts";

const connected = { chatgpt: "connected", claude: "connected", selects: "connected" };
test("BYOS defaults respect explicit selections and never infer credit use from an unknown status", () => {
  for (const chatgpt of ["connected", "disconnected", "unavailable", "error"]) {
    for (const claude of ["connected", "disconnected", "unavailable", "error"]) {
      const state = { chatgpt, claude, selects: "connected" };
      const expected = chatgpt === "connected" ? "chatgpt" : claude === "connected" ? "claude"
        : chatgpt === "error" || claude === "error" ? null : "selects";
      assert.equal(scriptProvider(state), expected);
      for (const chosen of ["chatgpt", "claude", "selects"]) assert.equal(scriptProvider(state, chosen), chosen);
    }
  }
  assert.equal(scriptProvider(null), null);
});

// Synthetic article: eight short formal sentences, within the normal narration length.
const text = "\uc2dc\ub294 \uc624\ub298 \uc8fc\ubbfc \uc758\uacac\uc744 \ub4e3\uace0 \uc9c0\uc5ed \uc8fc\ubbfc\uc744 \uc704\ud55c \uc0c8 \uacf5\uc6d0 \uc870\uc131 \uacc4\ud68d\uc744 \uacf5\uac1c\ud588\uc2b5\ub2c8\ub2e4.";
const article = { title: "Test", source: "Test", date: "", body: Array(8).fill(text).join(" "), photos: [] };
const script = { headline: { line1: "Test", line2: "Plan" }, sentences: Array.from({ length: 8 }, () => ({ text, sourceQuote: text })) };
const fidelity = { ...script, sentences: script.sentences.map((s, i) => ({ ...s, id: "s" + (i + 1), rewritten: false, issues: [] })) };

for (const provider of ["chatgpt", "claude", "selects"]) {
  test(`${provider} is pinned through writing, fidelity, repairs and timeout retries`, async () => {
    const calls = [];
    const answers = [new Error("timed out"), "not JSON", JSON.stringify(script), "not JSON", JSON.stringify(fidelity)];
    const sdk = {
      aiProviders: async () => connected,
      askAI: async (input) => { calls.push(input); const answer = answers.shift(); if (answer instanceof Error) throw answer; return { text: answer }; },
    };
    const record = newRunRecord("chosun", "");
    const result = await writeScript(sdk, article, PRESETS.chosun, () => {}, record, provider);
    assert.deepEqual(result.errors, []);
    assert.equal(result.script.sentences.length, 8);
    assert.equal(calls.length, 5);
    assert.ok(calls.every((c) => c.provider === provider));
    assert.deepEqual(record.steps.map((s) => [s.step, s.turns, s.repairs]), [["script", 3, 1], ["fidelity", 2, 1]]);
  });
}

test("old hosts, malformed status and a disconnect before writing make no inference call", async () => {
  let calls = 0;
  const askAI = async () => { calls++; return { text: "" }; };
  await assert.rejects(readAiProviders({ askAI }), /providerUpdateRequired/);
  await assert.rejects(readAiProviders({ aiProviders: async () => ({}) }), /providerReadFailed/);
  for (const state of ["disconnected", "error", "unavailable"]) {
    await assert.rejects(writeScript({ askAI, aiProviders: async () => ({ ...connected, chatgpt: state }) }, article, PRESETS.chosun, () => {}, newRunRecord("chosun", ""), "chatgpt"), /providerNotConnected/);
  }
  assert.equal(calls, 0);
});

test("subscription failure during writing or source checking never retries on Selects credits", async () => {
  for (const failAt of [0, 1]) {
    const calls = [];
    const sdk = {
      aiProviders: async () => connected,
      askAI: async (input) => { calls.push(input); if (calls.length - 1 === failAt) throw Error("subscription expired"); return { text: JSON.stringify(script) }; },
    };
    const run = writeScript(sdk, article, PRESETS.chosun, () => {}, newRunRecord("chosun", ""), "claude");
    if (failAt === 0) await assert.rejects(run, /subscription expired/);
    else assert.match((await run).errors.join(" "), /subscription expired/);
    assert.equal(calls.length, failAt + 1);
    assert.ok(calls.every((c) => c.provider === "claude"));
  }
});

const env = { platform: "darwin", sep: "/", dir: "/test", tmp: "/test", skills: "/test", projectId: "test" };
const narration = { resourceId: "voice", durationSeconds: 48 };
const session = () => ({ ...emptySession(), article, script: fidelity, projectId: "test" });
const sceneReply = (revised = false) => JSON.stringify({
  assetSummaries: [],
  scenes: fidelity.sentences.map((s, i) => ({ sentenceIds: [s.id], type: "text_card", params: { text: revised && i === 0 ? "Revised" : "Park plan" }, hideCaption: false, disclaimer: false })),
});

for (const provider of ["chatgpt", "claude", "selects"]) {
  test(`${provider} stays pinned through scene planning, feedback, JSON repairs and timeout retries`, async () => {
    const calls = [];
    const answers = [new Error("timed out"), "invalid JSON", sceneReply(), new Error("timed out"), "invalid JSON", sceneReply(true)];
    const sdk = {
      runScript: async () => ({ result: null }),
      aiProviders: async () => connected,
      askAI: async (input) => { calls.push(input); const reply = answers.shift(); if (reply instanceof Error) throw reply; return { text: reply }; },
    };
    const rec = newRunRecord("chosun", "");
    const s = session();
    s.plan = await planScenes(sdk, env, s, PRESETS.chosun, narration, () => {}, rec, provider);
    assert.equal(s.plan.fallback, false);
    const r = await revisePlan(sdk, env, s, PRESETS.chosun, "Revise the first card", () => {}, rec, provider);
    assert.equal(r.kept, false);
    assert.deepEqual(r.plan.changed, [0]);
    assert.equal(calls.length, 6);
    assert.ok(calls.every((call) => call.provider === provider));
    assert.deepEqual(rec.steps.map((step) => [step.step, step.turns, step.repairs]), [["plan", 3, 1], ["plan revision", 3, 1]]);
  });
}

test("all LLM stages stop before inference when every provider is unavailable", async () => {
  const sdk = {
    aiProviders: async () => ({ chatgpt: "unavailable", claude: "unavailable", selects: "unavailable" }),
    askAI: async () => assert.fail("no inference outside editing mode or without login"),
  };
  const rec = newRunRecord("chosun", "");
  const s = session();
  await assert.rejects(writeScript(sdk, article, PRESETS.chosun, () => {}, rec, "selects"), /providerUnavailable/);
  await assert.rejects(planScenes(sdk, env, s, PRESETS.chosun, narration, () => {}, rec, "selects"), /providerUnavailable/);
  await assert.rejects(revisePlan(sdk, env, s, PRESETS.chosun, "Revise", () => {}, rec, "selects"), /providerUnavailable/);
});

test("failed planning and revision never switch to credits, and disconnected selections make no call", async () => {
  const calls = [];
  let status = connected;
  const sdk = {
    runScript: async () => ({ result: null }),
    aiProviders: async () => status,
    askAI: async (input) => { calls.push(input); throw Error("subscription expired"); },
  };
  const rec = newRunRecord("chosun", "");
  const s = session();
  s.plan = await planScenes(sdk, env, s, PRESETS.chosun, narration, () => {}, rec, "claude");
  assert.equal(s.plan.fallback, true); // deterministic cards, not another AI
  const r = await revisePlan(sdk, env, s, PRESETS.chosun, "Revise", () => {}, rec, "claude");
  assert.equal(r.kept, true);
  assert.deepEqual(calls.map((x) => x.provider), ["claude", "claude"]);
  status = { ...connected, claude: "disconnected" };
  await assert.rejects(planScenes(sdk, env, s, PRESETS.chosun, narration, () => {}, rec, "claude"), /providerNotConnected/);
  await assert.rejects(revisePlan(sdk, env, s, PRESETS.chosun, "Revise", () => {}, rec, "claude"), /providerNotConnected/);
  assert.equal(calls.length, 2);
});
