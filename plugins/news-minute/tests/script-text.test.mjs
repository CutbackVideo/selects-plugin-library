import test from "node:test";
import assert from "node:assert/strict";
import { applyScriptText, scriptBody, splitScript } from "../src/pipeline/script-text.ts";

const line = (id, text, sourceQuote = "q" + id) => ({ id, text, sourceQuote, issues: [], rewritten: false });
const prev = [line("s1", "First fact holds."), line("s2", "Second fact holds."), line("s3", "Third fact holds.")];

test("splitScript breaks on line ends and on sentence punctuation followed by space", () => {
  assert.deepEqual(splitScript("A is 3.5 percent. B rose?\n\n  C fell!  D \"quoted.\" E"), ["A is 3.5 percent.", "B rose?", "C fell!", "D \"quoted.\" E"]);
  assert.deepEqual(splitScript("   \n"), []);
});

test("an unedited body round-trips to the same sentences", () => {
  const out = applyScriptText(prev, scriptBody(prev));
  assert.deepEqual(out, prev);
  out.forEach((x, i) => assert.equal(x, prev[i]));
});

test("same sentence count keeps ids and sources by position and marks changed lines", () => {
  const out = applyScriptText(prev, "First fact holds.\nSecond fact changed.\nThird fact holds.");
  assert.deepEqual(out.map((x) => [x.id, x.sourceQuote, !!x.edited]), [["s1", "qs1", false], ["s2", "qs2", true], ["s3", "qs3", false]]);
});

test("a split sentence borrows the source passage and gets fresh unique ids", () => {
  const out = applyScriptText(prev, "First fact holds.\nSecond fact. holds.\nThird fact holds.");
  assert.deepEqual(out.map((x) => x.text), ["First fact holds.", "Second fact.", "holds.", "Third fact holds."]);
  assert.equal(out[0], prev[0]);
  assert.equal(out[3], prev[2]);
  assert.deepEqual(out.slice(1, 3).map((x) => [x.id, x.sourceQuote, x.edited]), [["s4", "qs2", true], ["s5", "qs2", true]]);
  assert.equal(new Set(out.map((x) => x.id)).size, out.length);
});

test("merged and removed sentences", () => {
  const merged = applyScriptText(prev, "First fact holds and second fact holds.\nThird fact holds.");
  assert.deepEqual(merged.map((x) => [x.id, x.sourceQuote]), [["s4", "qs1"], ["s3", "qs3"]]);
  const dropped = applyScriptText(prev, "First fact holds.\nThird fact holds.");
  assert.deepEqual(dropped.map((x) => x.id), ["s1", "s3"]);
});
