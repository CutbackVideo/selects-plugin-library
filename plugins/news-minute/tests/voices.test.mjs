// node --test plugins/news-minute/tests/voices.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { appendVoices, normalizeVoicePage, voiceTags } from "../src/pipeline/voices.ts";
import { voicesScript } from "../src/pipeline/scripts.ts";

test("library descriptions split into gender, age and the original note", () => {
  assert.deepEqual(voiceTags("female \u00b7 young"), { gender: "female", age: "young", note: null });
  assert.deepEqual(voiceTags("male \u00b7 middle_aged \u2014 Calm news anchor"), { gender: "male", age: "middle_aged", note: "Calm news anchor" });
  assert.deepEqual(voiceTags("Male \u00b7 Middle Aged"), { gender: "male", age: "middle_aged", note: null });
  assert.deepEqual(voiceTags("neutral"), { gender: "neutral", age: null, note: null });
});

test("an older server's free-text description stays a note", () => {
  const text = "Young adult woman with a confident and warm, mature quality.";
  assert.deepEqual(voiceTags(text), { gender: null, age: null, note: text });
  assert.deepEqual(voiceTags("calm \u00b7 warm"), { gender: null, age: null, note: "calm \u00b7 warm" });
  assert.deepEqual(voiceTags("female \u00b7 teen"), { gender: null, age: null, note: "female \u00b7 teen" });
  assert.deepEqual(voiceTags(null), { gender: null, age: null, note: null });
});

test("host pages are normalized, including the older id-and-name list", () => {
  assert.deepEqual(normalizeVoicePage({
    items: [
      { voiceId: "a", name: "Anna", description: "female \u00b7 young", previewUrl: "https://storage.googleapis.com/a.mp3" },
      { voiceId: "b", name: "", description: null, previewUrl: "http://insecure/b.mp3" },
      { name: "no id" },
    ],
    nextCursor: "30",
  }), {
    items: [
      { voiceId: "a", name: "Anna", description: "female \u00b7 young", previewUrl: "https://storage.googleapis.com/a.mp3" },
      { voiceId: "b", name: "b", description: null, previewUrl: null },
    ],
    nextCursor: "30",
  });
  assert.deepEqual(normalizeVoicePage([{ voiceId: "x", name: "X" }]), { items: [{ voiceId: "x", name: "X", description: null, previewUrl: null }], nextCursor: null });
  assert.deepEqual(normalizeVoicePage(null), { items: [], nextCursor: null });
});

test("a later page keeps shown voices in place and drops repeats", () => {
  const v = (voiceId) => ({ voiceId, name: voiceId, description: null, previewUrl: null });
  assert.deepEqual(appendVoices([v("a"), v("b")], [v("b"), v("c"), v("c")]).map((x) => x.voiceId), ["a", "b", "c"]);
});

test("the voices script sends query and cursor only when set", () => {
  assert.match(voicesScript().script, /voices\(\{ limit: 30 \}\)/);
  const s = voicesScript("  \ud55c\uad6d\uc5b4 ", "abc").script;
  assert.match(s, /query: "\ud55c\uad6d\uc5b4"/);
  assert.match(s, /cursor: "abc"/);
  assert.match(s, /nextCursor: r\.nextCursor \?\? null/);
  assert.match(voicesScript('"); evil("').script, /query: "\\"\); evil\(\\""/);
});
