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

const article = '\uC11C\uC6B8 \uC6D4\uC138\uAC00 164\uB9CC1000\uC6D0\uC73C\uB85C \uC62C\uB790\uB2E4. 2020\uB144\uBCF4\uB2E4 20\uB9CC1000\uC6D0 \uB192\uB2E4.\n\n\uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uB294 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uC815\uBD80\uB294 \uBC1D\uD614\uB2E4.';

test('an added sentence finds its own source passage in the article body', async () => {
  const { findSourceQuote } = await import('../src/pipeline/script-text.ts');
  const { normalizeWs } = await import('../src/prompts/text.ts');
  const q = findSourceQuote('\uC815\uBD80\uB294 \uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uAC00 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uBC1D\uD614\uC2B5\uB2C8\uB2E4.', article);
  assert.equal(q, '\uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uB294 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uC815\uBD80\uB294 \uBC1D\uD614\uB2E4.');
  assert.ok(normalizeWs(article).includes(q));
  // a number the passage does not hold rules it out; unrelated text and no body find nothing
  assert.equal(findSourceQuote('\uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uB294 5\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uC2B5\uB2C8\uB2E4.', article), '');
  assert.equal(findSourceQuote('\uC624\uB298 \uB0A0\uC528\uB294 \uB9D1\uACE0 \uAE30\uC628\uC774 \uB192\uACA0\uC2B5\uB2C8\uB2E4.', article), '');
  assert.equal(findSourceQuote('\uC815\uBD80\uB294 \uD53C\uD574\uC790\uAC00 \uB298\uC5C8\uB2E4\uACE0 \uBC1D\uD614\uC2B5\uB2C8\uB2E4.', ''), '');
});

test('applyScriptText fills an added sentence from the body only when no old sentence covers it', () => {
  const out = applyScriptText(prev, scriptBody(prev) + '\n\uC815\uBD80\uB294 \uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uAC00 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uBC1D\uD614\uC2B5\uB2C8\uB2E4.\nSecond fact holds. More', article);
  assert.equal(out[3].sourceQuote, '\uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uB294 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uC815\uBD80\uB294 \uBC1D\uD614\uB2E4.');
  assert.equal(out[4].sourceQuote, 'qs2');
  assert.equal(applyScriptText(prev, scriptBody(prev) + '\n\uC624\uB298 \uB0A0\uC528\uB294 \uB9D1\uC2B5\uB2C8\uB2E4.', article)[3].sourceQuote, '');
});

test('a sentence typed key by key finds its passage once it is long enough, and an AI passage is never replaced', () => {
  const full = '\uC815\uBD80\uB294 \uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uAC00 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uBC1D\uD614\uC2B5\uB2C8\uB2E4.';
  let lines = applyScriptText(prev, scriptBody(prev) + '\n' + full.slice(0, 1), article);
  assert.equal(lines[3].sourceQuote, '');
  for (let n = 2; n <= full.length; n++) lines = applyScriptText(lines, scriptBody(prev) + '\n' + full.slice(0, n), article);
  assert.equal(lines[3].sourceQuote, '\uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uB294 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uC815\uBD80\uB294 \uBC1D\uD614\uB2E4.');
  assert.equal(lines[3].autoSource, true);
  // rewriting it into unrelated text drops the found passage instead of keeping a wrong one
  lines = applyScriptText(lines, scriptBody(prev) + '\n\uC624\uB298 \uB0A0\uC528\uB294 \uB9D1\uACE0 \uAE30\uC628\uC774 \uB192\uACA0\uC2B5\uB2C8\uB2E4.', article);
  assert.equal(lines[3].sourceQuote, '');
  const ai = applyScriptText(prev, 'First fact holds.\n\uC815\uBD80\uB294 \uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uAC00 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uBC1D\uD614\uC2B5\uB2C8\uB2E4.\nThird fact holds.', article);
  assert.equal(ai[1].sourceQuote, 'qs2');
});

test('a fragment typed after Korean sentences does not keep the passage it borrowed on the first key', () => {
  const ko = [line('s1', '\uC11C\uC6B8 \uC6D4\uC138\uAC00 164\uB9CC1000\uC6D0\uC73C\uB85C \uC62C\uB790\uC2B5\uB2C8\uB2E4.', '\uC11C\uC6B8 \uC6D4\uC138\uAC00 164\uB9CC1000\uC6D0\uC73C\uB85C \uC62C\uB790\uB2E4.'), line('s2', '\uC815\uBD80\uB294 \uB300\uCC45\uC744 \uB0B4\uB193\uACA0\uB2E4\uACE0 \uD588\uC2B5\uB2C8\uB2E4.', 'qs2')];
  const full = '\uC815\uBD80\uB294 \uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uAC00 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uBC1D\uD614\uC2B5\uB2C8\uB2E4.';
  let lines = applyScriptText(ko, scriptBody(ko) + '\n' + full.slice(0, 1), article);
  assert.equal(lines[2].sourceQuote, 'qs2'); // "\uC815" sits inside sentence 2
  for (let n = 2; n <= full.length; n++) lines = applyScriptText(lines, scriptBody(ko) + '\n' + full.slice(0, n), article);
  assert.equal(lines[2].sourceQuote, '\uC804\uC138 \uC0AC\uAE30 \uD53C\uD574\uC790\uB294 3\uB144 \uC0AC\uC774 \uD06C\uAC8C \uB298\uC5C8\uB2E4\uACE0 \uC815\uBD80\uB294 \uBC1D\uD614\uB2E4.');
  let other = applyScriptText(ko, scriptBody(ko) + '\n\uC624', article);
  for (const t of ['\uC624\uB298', '\uC624\uB298 \uB0A0\uC528\uB294', '\uC624\uB298 \uB0A0\uC528\uB294 \uB9D1\uACE0 \uAE30\uC628\uC774 \uB192\uACA0\uC2B5\uB2C8\uB2E4.']) other = applyScriptText(other, scriptBody(ko) + '\n' + t, article);
  assert.equal(other[2].sourceQuote, '');
});
