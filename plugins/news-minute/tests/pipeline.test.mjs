// node --test plugins/news-minute/tests/pipeline.test.mjs   (Node 23.6+ runs the .ts sources directly)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { splitSentences, sentenceTimes, ratioTimes, captionChunks, captionTimes, sceneWindows, joinScript } from "../src/pipeline/timing.ts";
import { ttsNext, applyStatus, ttsRevision, creditQuote, canResumeImport } from "../src/pipeline/tts.ts";
import { extractArticle } from "../src/pipeline/article.ts";
import { plateArgs, plateSeconds } from "../src/pipeline/scripts.ts";

const fx = JSON.parse(fs.readFileSync(new URL("./fixtures/alignment-sarah.json", import.meta.url), "utf8"));

test("sentence ends skip decimal points", () => {
  const s = splitSentences(fx.text);
  assert.equal(s.length, 5);
  assert.ok(s[1].includes("0.69%") && s[1].includes("11.5"));
  assert.equal(joinScript(s), fx.text);
});

test("sentence times come straight from the measured alignment", () => {
  const s = splitSentences(fx.text);
  const { times, source } = sentenceTimes(s, fx.characters, fx.durationSeconds);
  assert.equal(source, "alignment");
  const starts = times.map((t) => Number(t.startSec.toFixed(2)));
  assert.deepEqual(starts, [0, 4.8, 16.56, 27.36, 35.76]);
  assert.equal(times[4].endSec, fx.durationSeconds);
  for (let i = 1; i < times.length; i++) assert.equal(times[i - 1].endSec, times[i].startSec);
});

test("alignment with different spacing still maps; other text falls back to ratio", () => {
  const s = splitSentences(fx.text);
  const squeezed = fx.characters.filter((c) => c.character !== " ");
  assert.equal(sentenceTimes(s, squeezed, fx.durationSeconds).source, "normalized");
  const other = fx.characters.map((c, i) => (i === 3 ? { ...c, character: "#" } : c));
  assert.equal(sentenceTimes(s, other, fx.durationSeconds).source, "ratio");
  const r = sentenceTimes(s, null, fx.durationSeconds);
  assert.equal(r.source, "ratio");
  assert.equal(r.times[4].endSec, fx.durationSeconds);
});

test("ratio timing shares time by characters", () => {
  const t = ratioTimes(["aaaa", "aaaaaaaaa"], 15);
  assert.equal(t[0].endSec, 5); // 4+1 of 15 shares (a sentence owns the space after it)
  assert.equal(t[1].endSec, 15);
});

test("caption chunks hold 2-4 words and cover the sentence", () => {
  for (const s of splitSentences(fx.text)) {
    const c = captionChunks(s);
    assert.equal(c.join(" "), s.trim());
    for (const x of c) assert.ok(x.split(" ").length <= 5, x);
  }
});

test("captions are timed back to back from the alignment", () => {
  const s = splitSentences(fx.text);
  const { times } = sentenceTimes(s, fx.characters, fx.durationSeconds);
  const caps = captionTimes(s, times, fx.characters);
  assert.equal(caps[0].startSec, 0);
  assert.equal(caps[caps.length - 1].endSec, fx.durationSeconds);
  for (let i = 1; i < caps.length; i++) assert.ok(caps[i].startSec >= caps[i - 1].startSec);
  const ratio = captionTimes(s, times, null);
  assert.equal(ratio.length, caps.length);
});

test("scene cuts land 0.05 s before their first sentence", () => {
  const s = splitSentences(fx.text);
  const { times } = sentenceTimes(s, fx.characters, fx.durationSeconds);
  const w = sceneWindows([0, 1, 3], times, fx.durationSeconds);
  assert.equal(w[0].startSec, 0);
  assert.equal(Number(w[1].startSec.toFixed(2)), 4.75);
  assert.equal(w[1].endSec, w[2].startSec);
  assert.equal(w[2].endSec, fx.durationSeconds);
});

test("narration record: no automatic regeneration after a lost answer", () => {
  const rev = ttsRevision("text", "v");
  const base = { revision: rev, projectId: "p", voiceId: "v", text: "text", at: 0 };
  assert.deepEqual(ttsNext(null, rev), { kind: "none" });
  assert.deepEqual(ttsNext({ ...base, state: "submitting" }, rev), { kind: "lost" });
  assert.deepEqual(ttsNext({ ...base, state: "submitting" }, ttsRevision("other", "v")), { kind: "lost" });
  assert.deepEqual(ttsNext({ ...base, state: "submitted", workflowId: "w" }, rev), { kind: "poll", workflowId: "w" });
  assert.deepEqual(ttsNext({ ...base, state: "submitted", workflowId: "w" }, ttsRevision("other", "v")), { kind: "stale" });
  assert.equal(ttsRevision("text", "v"), rev);
  assert.notEqual(ttsRevision("text", "w"), rev);
});

test("narration record: insufficient credits is a failure, not a lost result", () => {
  const rec = { revision: "r", projectId: "p", voiceId: "v", text: "t", state: "submitted", workflowId: "w", at: 0 };
  const failed = applyStatus(rec, { status: "failed", step: "generating", lastErrorMessage: "insufficient_credits" }, null);
  assert.equal(failed.state, "failed");
  assert.deepEqual(ttsNext(failed, "r"), { kind: "failed", error: "insufficient_credits" });
  const done = applyStatus(rec, { status: "succeeded" }, { resourceId: "res", durationSeconds: 39.5 });
  assert.deepEqual(ttsNext(done, "r"), { kind: "ready", resourceId: "res", durationSeconds: 39.5 });
  assert.equal(applyStatus(rec, { status: "running" }, null).state, "submitted");
  assert.ok(canResumeImport({ step: "import_failed" }));
  assert.ok(!canResumeImport({ step: "generating", lastErrorMessage: "insufficient_credits" }));
});

test("credit quote matches the measured estimate", () => {
  const q = creditQuote(256);
  assert.equal(q.estimated, 3.69);
  assert.equal(q.held, 4.06);
});

test("background plate covers the narration", () => {
  assert.ok(plateSeconds(39.471) >= 39.971);
  const args = plateArgs(40.1, "#21302A", "/tmp/p.mp4");
  assert.ok(args.includes("color=c=0x21302A:s=1080x1920:r=30000/1001"));
  assert.equal(args[args.length - 1], "/tmp/p.mp4");
});

test("Arc article: text paragraphs and photos with captions", () => {
  const g = { headlines: { basic: "T" }, display_date: "2026-10-23", promo_items: { basic: { type: "image", url: "https://x/a.png", caption: "lead /Yonhap", width: 1200, height: 900 } },
    content_elements: [{ type: "text", content: "First <b>para</b>." }, { type: "image", url: "https://x/a.png", caption: "dup" }, { type: "image", url: "https://x/b.png", caption: "chart", credits: { by: [{ name: "Lab" }] } }, { type: "text", content: "Second." }] };
  const html = `<html><head><meta property="og:site_name" content="Paper"></head><script>Fusion.globalContent=${JSON.stringify(g)};Fusion.x=1;</script></html>`;
  const a = extractArticle("https://x/article", html);
  assert.equal(a.method, "arc");
  assert.equal(a.body, "First para .\nSecond.");
  assert.equal(a.photos.length, 2);
  assert.deepEqual(a.photos.map((p) => [p.ref, p.credit]), [["photo-1", "Yonhap"], ["photo-2", "Lab"]]);
});

test("scene scripts stay under the run_script size cap", async () => {
  const { sceneScripts, SCRIPT_MAX_BYTES } = await import("../src/pipeline/assemble.ts");
  const img = "data:image/jpeg;base64," + "A".repeat(170_000);
  const scenes = Array.from({ length: 6 }, (_, i) => ({ type: "news_photo", label: "Photo " + i, params: { image: img }, startSec: i * 5, endSec: i * 5 + 5, disclaimer: false }));
  const calls = sceneScripts("d", scenes);
  assert.ok(calls.length >= 6);
  for (const c of calls) assert.ok(new TextEncoder().encode(c.script).length <= SCRIPT_MAX_BYTES);
  const huge = [{ ...scenes[0], params: { image: "data:," + "A".repeat(300_000) } }];
  assert.throws(() => sceneScripts("d", huge), /too large/);
});
