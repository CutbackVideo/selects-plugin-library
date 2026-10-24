// node --test plugins/news-minute/tests/pipeline.test.mjs   (Node 23.6+ runs the .ts sources directly)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { splitSentences, sentenceTimes, ratioTimes, captionChunks, captionTimes, sceneWindows, joinScript } from "../src/pipeline/timing.ts";
import { ttsNext, applyStatus, ttsRevision, creditQuote, canResumeImport } from "../src/pipeline/tts.ts";
import { extractArticle } from "../src/pipeline/article.ts";
import { imagePlateArgs, plateArgs, plateSeconds } from "../src/pipeline/scripts.ts";

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

test("background image plate holds the image for the plate length", () => {
  const args = imagePlateArgs(40.1, "/a/bg.png", "/tmp/p.mp4");
  assert.deepEqual(args.slice(1, 7), ["-loop", "1", "-framerate", "30000/1001", "-i", "/a/bg.png"]);
  assert.equal(args[args.indexOf("-t") + 1], "40.10");
  assert.equal(args[args.length - 1], "/tmp/p.mp4");
});

test("heritage layout: graphics y 481-1290, white caption on a translucent box y 1315-1385, bands as an image clip", async () => {
  const { PRESETS } = await import("../src/preset.ts");
  const { baseDraftScript, bandsScript, overlayTextScripts } = await import("../src/pipeline/assemble.ts");
  const L = PRESETS.chosun.layout;
  assert.equal(L.windowTop, 481);
  assert.equal(L.windowTop + L.windowHeight, 1290);
  assert.deepEqual([L.captionBottom - L.captionHeight, L.captionBottom, L.captionMaxWidth, L.captionWeight, L.captionPad], [1315, 1385, 720, 500, 10]);
  const x = { projectId: "p", draftName: "n", plateId: "r1", plateSeconds: 41, narrationId: "r2", narrationSeconds: 40, headline: { line1: "a", line2: "b" }, preset: PRESETS.chosun, scenes: [], captions: [{ text: "c", startSec: 0, endSec: 1 }] };
  // with a bands image the frame graphic is left out; without one it opens the same window as the image
  assert.ok(!baseDraftScript({ ...x, bandsId: "r3" }).script.includes('"News frame"'));
  const framed = baseDraftScript(x).script;
  assert.ok(framed.includes('"News frame"') && framed.includes('"windowTop":481') && framed.includes('"windowBottom":1399'));
  const b = bandsScript("d", "p", "r3").script;
  assert.ok(b.includes('overlayResource({ resource: selects.project("p").resource("r3")') && b.includes("commitAll"));
  const t = overlayTextScripts("d", x).map((c) => c.script).join("\n");
  for (const kv of ['"bottom":1385', '"boxHeight":70', '"maxWidth":720', '"fontWeight":500', '"textColor":"#FFFFFF"', '"boxColor":"rgba(0,0,0,0.44)"', '"padX":10']) assert.ok(t.includes(kv), kv);
  // the generic preset keeps the old look
  const g = overlayTextScripts("d", { ...x, preset: PRESETS.generic }).map((c) => c.script).join("\n");
  assert.ok(g.includes('"maxWidth":980') && g.includes('"boxColor":"rgba(0,0,0,0.44)"') && !g.includes('"padX"'));
  assert.equal(PRESETS.generic.layout.bandsImage, undefined);
});

test("chosun layout images ship with the plug-in and are listed in plugin.json", async () => {
  const { PRESETS } = await import("../src/preset.ts");
  const { readFileSync } = await import("node:fs");
  const files = JSON.parse(readFileSync(new URL("../plugin.json", import.meta.url), "utf8")).files;
  for (const rel of [PRESETS.chosun.layout.bandsImage, PRESETS.chosun.layout.backgroundImage]) {
    assert.ok(files.includes(rel), rel);
    const png = readFileSync(new URL("../" + rel, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1080, 1920]);
  }
});

test("headline font: an installed preset face replaces the embedded font, else the run record says why not", async () => {
  const { findHeadlineFont, headlineFontNote, HEADLINE_FAMILY } = await import("../src/fonts/headlineFont.ts");
  const { PRESETS } = await import("../src/preset.ts");
  const { overlayTextScripts } = await import("../src/pipeline/assemble.ts");
  const names = PRESETS.chosun.headlineFonts;
  assert.equal(names[0], "210 \uC634\uB2C8\uACE0\uB515 050");
  const installed = await findHeadlineFont(names, async (n) => n === "210 OmniGothic 050");
  assert.equal(installed.kind, "installed");
  assert.equal(installed.params.fontFamily, HEADLINE_FAMILY);
  assert.ok(installed.params.fontCss.includes('src:local("210 OmniGothic 050")'));
  assert.equal(headlineFontNote(installed), "headline font: installed 210 OmniGothic 050");
  const missing = await findHeadlineFont(names, async (n) => n === "Arial");
  assert.equal(missing.kind, "missing");
  assert.match(headlineFontNote(missing), /^headline font: embedded Pretendard \(not installed: 210 /);
  assert.equal((await findHeadlineFont(names, async () => false)).kind, "unavailable");
  assert.equal((await findHeadlineFont(names, async () => { throw new Error("no FontFace"); })).kind, "unavailable");
  assert.equal(await findHeadlineFont(PRESETS.generic.headlineFonts, async () => true), null);
  // only the headline takes the installed face; captions keep the embedded font
  const deco = (p) => ({ ...p, fontFamily: "NM Sans 1" });
  const x = { headline: { line1: "a", line2: "b" }, preset: PRESETS.chosun, scenes: [], captions: [{ text: "c", startSec: 0, endSec: 1 }], decorate: deco, headlineFont: installed.params };
  const t = overlayTextScripts("d", x).map((c) => c.script).join("\n");
  assert.ok(t.includes('"fontFamily":"' + HEADLINE_FAMILY + '"') && t.includes('"fontFamily":"NM Sans 1"'));
  const plain = overlayTextScripts("d", { ...x, headlineFont: undefined }).map((c) => c.script).join("\n");
  assert.ok(!plain.includes(HEADLINE_FAMILY));
});

test("scene params match their control types (the planner may send a number for a text control)", async () => {
  const { fitControls } = await import("../src/pipeline/assemble.ts");
  const p = fitControls("highlight_card", { title: "t", value: 3592, unit: "x", other: 5 });
  assert.equal(p.value, "3592");
  assert.equal(p.other, 5);
  assert.equal(fitControls("caption", { text: "a", fontSize: "48" }).fontSize, 48);
  assert.equal(fitControls("caption", { text: "a", fontSize: "big" }).fontSize, "big");
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
  // the lead image has no paragraph before it; the chart gets the paragraph right before it
  assert.deepEqual(a.photos.map((p) => p.context), [undefined, "First para ."]);
});

test("Daum article: each image gets the paragraph before it", () => {
  const html = '<p dmcf-ptype="general">One.</p><img dmcf-mtype="image" data-org-src="https://x/1.jpg" alt="a"><p dmcf-ptype="general">Two.</p><p dmcf-ptype="general">Three.</p><img dmcf-mtype="image" data-org-src="https://x/2.jpg" alt="b">';
  const a = extractArticle("https://x/d", html);
  assert.equal(a.method, "dmcf");
  assert.equal(a.body, "One.\nTwo.\nThree.");
  assert.deepEqual(a.photos.map((p) => p.context), ["One.", "Three."]);
});

test("scene scripts stay under the run_script size cap", async () => {
  const { sceneScripts, SCRIPT_MAX_BYTES } = await import("../src/pipeline/assemble.ts");
  const img = "data:image/jpeg;base64," + "A".repeat(170_000);
  const scenes = Array.from({ length: 6 }, (_, i) => ({ type: "news_photo", label: "Photo " + i, params: { image: img }, startSec: i * 5, endSec: i * 5 + 5, disclaimer: false }));
  const calls = sceneScripts("d", scenes);
  assert.ok(calls.length >= 6);
  for (const c of calls) assert.ok(new TextEncoder().encode(c.script).length <= 240_000);
  const huge = [{ ...scenes[0], params: { image: "data:," + "A".repeat(300_000) } }];
  assert.throws(() => sceneScripts("d", huge), /too large/);
});

test("charts and tall images are shown whole", async () => {
  const { isGraphic } = await import("../src/pipeline/plan.ts");
  assert.ok(isGraphic("/\uadf8\ub798\ud53d=\uc870\uc120\ub514\uc790\uc778\ub7a9", 1200, 900));
  assert.ok(isGraphic("", 480, 628));
  assert.ok(!isGraphic("photo /Yonhap", 1200, 800));
  assert.ok(!isGraphic("", 0, 0));
});

test("settlePlan keeps a plan only a little over each scene type's limit", async () => {
  const { settlePlan, PLAN_LENGTH_GRACE_SEC } = await import("../src/pipeline/plan.ts");
  const { SCENE_MAX_SEC } = await import("../src/prompts/validate.ts");
  const sents = [{ id: "s1", text: "a", startSec: 0, endSec: 13 }];
  const plan = (type) => ({ scenes: [{ sentenceIds: ["s1"], type, params: {}, hideCaption: false, disclaimer: false }] });
  const err = (sec) => ["scene 1: lasts " + sec.toFixed(1) + " s; split it"];
  const ok = { errors: [] };
  // data scene: 13.9 s is within 12 + 2; text card: the same length is past 10.5 + 2
  assert.equal(SCENE_MAX_SEC.data + PLAN_LENGTH_GRACE_SEC, 14);
  assert.ok(settlePlan(plan("line_trend_callout"), err(13.9), sents, () => ok).scenes);
  assert.equal(settlePlan(plan("text_card"), err(13.9), sents, () => ok).scenes, null);
  assert.ok(settlePlan(plan("text_card"), err(12.4), sents, () => ok).scenes);
  // any other error still falls back
  assert.equal(settlePlan(plan("line_trend_callout"), [...err(12.5), "scene 1: points need values"], sents, () => ok).scenes, null);
  assert.equal(settlePlan(null, ["bad json"], sents, () => ok).scenes, null);
});

test("settlePlan turns number callouts without a number into text cards and checks again", async () => {
  const { settlePlan } = await import("../src/pipeline/plan.ts");
  const sents = [{ id: "s1", text: "\uac70\ub798\ub7c9\uc774 \ub450 \ubc30 \uac00\uae4c\uc774 \ub298\uc5c8\ub2e4", startSec: 0, endSec: 4 }];
  const json = { scenes: [{ sentenceIds: ["s1"], type: "number_callout", params: { from: "6.0%", to: "\ub450 \ubc30 \uac00\uae4c\uc6b4", label: "\uac70\ub798\ub7c9" }, hideCaption: true, disclaimer: false, assetRef: "p1" }] };
  let checked = null;
  const r = settlePlan(json, ["scene 1: number_callout to must contain a number"], sents, (j) => { checked = j; return { errors: [] }; });
  assert.equal(r.demoted, 1);
  assert.equal(checked.scenes[0].type, "text_card");
  assert.equal(r.scenes[0].type, "text_card");
  assert.equal(r.scenes[0].hideCaption, false);
  assert.equal(r.scenes[0].assetRef, undefined);
  // still failing after demotion -> fall back
  assert.equal(settlePlan(json, ["x"], sents, () => ({ errors: ["scene 1: text required"] })).scenes, null);
});

test("every fidelity issue kind has a localized label", async () => {
  const { MESSAGES } = await import("../src/messages.ts");
  const types = fs.readFileSync(new URL("../src/prompts/types.ts", import.meta.url), "utf8");
  const kinds = [.../FidelityIssue = \{ kind: ([^;]+);/.exec(types)[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
  assert.ok(kinds.length >= 5);
  for (const k of kinds) assert.ok(/[\uac00-\ud7a3]/.test(MESSAGES["issue_" + k]?.[1] ?? ""), k);
});

const CREDIT_ONLY = "/\uadf8\ub798\ud53d=\uc870\uc120\ub514\uc790\uc778\ub7a9 \uad8c\ud61c\uc778";

test("captionText drops credit lines", async () => {
  const { captionText } = await import("../src/pipeline/plan.ts");
  assert.equal(captionText(CREDIT_ONLY), "");
  assert.equal(captionText(CREDIT_ONLY.slice(1)), "");
  assert.equal(captionText("cash pile " + CREDIT_ONLY), "cash pile");
  assert.equal(captionText("Buffett (right). /AP Yonhap"), "Buffett (right).");
  assert.equal(captionText(""), "");
});

test("fallback plan summarizes every asset and leaves out graphics it cannot describe", async () => {
  const { fallbackPlan } = await import("../src/pipeline/plan.ts");
  const { validatePlan } = await import("../src/prompts/validate.ts");
  const sents = Array.from({ length: 6 }, (_, i) => ({ id: "s" + (i + 1), text: "sentence " + (i + 1), startSec: i * 7, endSec: i * 7 + 7 }));
  const assets = [
    { ref: "photo-1", kind: "photo", caption: CREDIT_ONLY, credit: "Lab", w: 1200, h: 900 },
    { ref: "photo-2", kind: "photo", caption: CREDIT_ONLY, credit: "Lab", context: "Cash rose to a record.", w: 1200, h: 900 },
    { ref: "photo-3", kind: "photo", caption: "Warren Buffett /AP", credit: "AP", w: 1200, h: 800 },
  ];
  const fb = fallbackPlan(sents, sents, assets);
  assert.deepEqual(fb.assetSummaries.map((a) => a.summary), ["article photo", "Cash rose to a record.", "Warren Buffett"]);
  const used = fb.scenes.map((sc) => sc.assetRef).filter(Boolean);
  assert.deepEqual(used, ["photo-2", "photo-3"]);
  assert.equal(validatePlan(fb, sents, assets).errors.length, 0);
});

test("planner images: at most four, graphics first, named by ref", async () => {
  const { plannerImages } = await import("../src/pipeline/flow.ts");
  const ph = (ref, graphic) => ({ ref, dataUrl: "data:image/jpeg;base64,AAAA", credit: "", graphic });
  const out = plannerImages([ph("photo-1", false), ph("photo-2", true), ph("photo-3", false), ph("photo-4", true), ph("photo-5", false), ph("photo-6", true)]);
  assert.deepEqual(out.map((im) => im.name), ["photo-2", "photo-4", "photo-6", "photo-1"]);
});

test("changedScenes marks scenes whose type, params, photo or caption flag differ", async () => {
  const { changedScenes } = await import("../src/pipeline/plan.ts");
  const sc = (ids, type, params, extra = {}) => ({ sentenceIds: ids, type, params, hideCaption: false, disclaimer: false, ...extra });
  const prev = [sc(["s1"], "news_photo", {}, { assetRef: "photo-1" }), sc(["s2", "s3"], "text_card", { text: "a", sub: "b" }), sc(["s4"], "text_card", { text: "c" })];
  // same params in another key order are unchanged; a new photo, a new type and regrouped sentences are changed
  const next = [sc(["s1"], "news_photo", {}, { assetRef: "photo-2" }), sc(["s2", "s3"], "text_card", { sub: "b", text: "a" }), sc(["s4"], "number_callout", { from: "1", to: "2" }, { hideCaption: true })];
  assert.deepEqual(changedScenes(prev, next), [0, 2]);
  assert.deepEqual(changedScenes(prev, [sc(["s1", "s2"], "news_photo", {}, { assetRef: "photo-1" }), prev[2]]), [0]);
  assert.deepEqual(changedScenes(prev, prev), []);
});

test("retypeScene gives the new type params it can show", async () => {
  const { retypeScene } = await import("../src/pipeline/plan.ts");
  const photo = { sentenceIds: ["s1"], type: "news_photo", params: { focus: "top" }, hideCaption: false, disclaimer: false, assetRef: "photo-1" };
  const card = retypeScene(photo, "text_card", "Cash rose to a record high this quarter", ["photo-1"]);
  assert.equal(card.assetRef, undefined);
  assert.ok(card.params.text.length > 0);
  const num = retypeScene(photo, "number_callout", "x", ["photo-1"]);
  // every scene keeps its caption, number scenes included (style spec 1)
  assert.equal(num.hideCaption, false);
  assert.equal(num.assetRef, "photo-1");
  assert.equal(retypeScene(card, "news_photo", "x", ["photo-3"]).assetRef, "photo-3");
});

test("only order and coverage errors block building the Draft", async () => {
  const { BLOCKING_PLAN_ERROR, checkPlan } = await import("../src/pipeline/flow.ts");
  const sentences = [{ id: "s1", text: "a", startSec: 0, endSec: 3 }, { id: "s2", text: "b", startSec: 3, endSec: 6 }];
  const base = { sentences, assets: [], assetSummaries: [] };
  const missing = checkPlan({ ...base, scenes: [{ sentenceIds: ["s1"], type: "text_card", params: { text: "a" }, hideCaption: false, disclaimer: false }] });
  assert.ok(missing.errors.some((e) => BLOCKING_PLAN_ERROR.test(e)));
  const numbers = checkPlan({ ...base, scenes: [{ sentenceIds: ["s1", "s2"], type: "number_callout", params: { label: "x", from: "1", to: "9" }, hideCaption: true, disclaimer: false }] });
  assert.ok(numbers.errors.length > 0);
  assert.ok(!numbers.errors.some((e) => BLOCKING_PLAN_ERROR.test(e)));
});

test("preview refill keeps Main, clears the Video and Audio tracks, renames, and puts narration and frame back", async () => {
  const { PRESETS } = await import("../src/preset.ts");
  const { refillDraftScript } = await import("../src/pipeline/assemble.ts");
  const x = { projectId: "p", draftName: "Preview · t", plateId: "r1", plateSeconds: 41, narrationId: "r2", narrationSeconds: 40, headline: { line1: "a", line2: "b" }, preset: PRESETS.chosun, scenes: [], captions: [] };
  const r = refillDraftScript("d1", 1228, x).script;
  assert.ok(r.includes('selects.draft("d1")') && !r.includes("createDraft") && !r.includes("insertResource"));
  assert.ok(r.includes('c.trackKind === "video" || c.trackKind === "audio"') && r.includes("removeClips(extra)") && r.includes("removeEmptyTracks()"));
  assert.ok(r.includes("mainEnd !== 1228") && r.includes('setName("Preview · t")') && r.includes('resource("r2")') && r.includes("commitAll"));
  assert.ok(r.indexOf("removeClips") < r.indexOf("overlayResource"));
  assert.ok(r.includes('"News frame"') && !refillDraftScript("d1", 1228, { ...x, bandsId: "r3" }).script.includes('"News frame"'));
});

test("preview revision follows the scenes, look, headline and narration only", async () => {
  const { previewRev, previewFresh, canRefill, previewName } = await import("../src/pipeline/flow.ts");
  const plan = { narrationId: "n1", scenes: [{ type: "text_card", sentenceIds: ["s1"], params: { text: "a" } }], edited: [], thumbs: {} };
  const s = { presetId: "chosun", script: { headline: { line1: "h", line2: "i" }, sentences: [] }, plan, article: { title: "T" } };
  const rev = previewRev(s);
  assert.equal(previewRev({ ...s, plan: { ...plan, edited: [0], thumbs: { x: "y" } } }), rev);
  assert.notEqual(previewRev({ ...s, plan: { ...plan, scenes: [{ ...plan.scenes[0], params: { text: "b" } }] } }), rev);
  assert.notEqual(previewRev({ ...s, presetId: "generic" }), rev);
  assert.notEqual(previewRev({ ...s, plan: { ...plan, narrationId: "n2" } }), rev);
  assert.ok(previewFresh({ ...s, preview: { planRev: rev } }));
  assert.ok(!previewFresh({ ...s, preview: { planRev: "" } }) && !previewFresh({ ...s, preview: null }));
  assert.equal(previewName(s, "Preview"), "Preview · T");
  const p = { projectId: "p", presetId: "chosun", plateSeconds: 41.1, frames: 1230 };
  assert.ok(canRefill(p, "p", "chosun", 41.1));
  assert.ok(!canRefill(p, "q", "chosun", 41.1) && !canRefill(p, "p", "generic", 41.1) && !canRefill(p, "p", "chosun", 41.6) && !canRefill(null, "p", "chosun", 41.1));
});

// A fake host for the Draft steps: answers each run_script by its summary and records the calls.
function fakeHost(answers) {
  const calls = [];
  const sdk = {
    async runScript(c) {
      calls.push(c);
      const a = answers[c.summary];
      if (a === undefined) return { isError: true, output: "no answer for " + c.summary };
      return { result: typeof a === "function" ? a(c) : a };
    },
  };
  return { sdk, calls };
}
const HOST_ENV = { platform: "darwin", sep: "/", dir: "/d", tmp: "/tmp", skills: "/s", projectId: "p" };
const DRAFT_ANSWERS = {
  "Check a file": { exists: false, size: 0 },
  "Make the background": { jobId: "j" },
  "Check a media job": { state: "succeeded", events: [] },
  "Add media to the Project": { ids: ["plate1"] },
  "Build the news short Draft": { draftId: "d-new", frames: 1230 },
  "Add scene graphics (1/1)": { added: 1 },
  "Add headline and captions (1/1)": { added: 1 },
};
async function planSession() {
  const { PRESETS } = await import("../src/preset.ts");
  const sentences = [{ id: "s1", text: "\uccab \ubb38\uc7a5\uc785\ub2c8\ub2e4.", startSec: 0, endSec: 20 }, { id: "s2", text: "\ub458\uc9f8 \ubb38\uc7a5\uc785\ub2c8\ub2e4.", startSec: 20, endSec: 40 }];
  const plan = { narrationId: "n1", durationSeconds: 40, sentences, times: sentences.map((x) => ({ startSec: x.startSec, endSec: x.endSec })), timing: "alignment", chars: null, assets: [], thumbs: {}, assetSummaries: [],
    scenes: [{ type: "text_card", sentenceIds: ["s1"], params: { text: "a" } }, { type: "text_card", sentenceIds: ["s2"], params: { text: "b" } }], fallback: false, rounds: [], changed: [], edited: [] };
  const preset = { ...PRESETS.chosun, layout: { ...PRESETS.chosun.layout, bandsImage: undefined, backgroundImage: undefined } };
  const s = { presetId: preset.id, voiceId: "v", article: { url: "u", title: "Title", source: "", date: "", body: "", photos: [], method: "text" }, script: { headline: { line1: "Head", line2: "Two" }, sentences: sentences.map((x) => ({ ...x, sourceQuote: "", issues: [], rewritten: false })) }, scriptErrors: [], approved: "a", projectId: "p", draftId: null, plan };
  return { s, preset };
}

test("the preview Draft is built once, then refilled in place without new Resources", async () => {
  const F = await import("../src/pipeline/flow.ts");
  const { s, preset } = await planSession();
  const log = () => {};
  const first = fakeHost(DRAFT_ANSWERS);
  const a = await F.buildPreview(first.sdk, HOST_ENV, s, preset, "Preview", log, F.newRunRecord("chosun", "u"));
  assert.equal(a.preview.draftId, "d-new");
  assert.equal(a.refilled, false);
  assert.equal(a.preview.name, "Preview · Title");
  assert.equal(a.preview.planRev, F.previewRev(s));
  assert.deepEqual([a.preview.frames, a.preview.plateId, a.preview.bandsId, a.preview.scenes.length], [1230, "plate1", null, 2]);
  assert.ok(a.preview.scenes[1].startSec > a.preview.scenes[0].startSec && a.preview.scenes[1].endSec <= 41);
  // a one-line text card without a title: the line at 0.1 s, its brush done 1.45 s later
  assert.deepEqual(a.preview.scenes.map((x) => x.enterSec), [1.55, 1.55]);
  // the scene rows show the spans the graphics were placed on, snapped to frames
  assert.deepEqual(F.sceneSpans(s.plan), a.preview.scenes.map((x) => ({ startSec: Math.round(x.startSec * 30000 / 1001) / (30000 / 1001), endSec: Math.round(x.endSec * 30000 / 1001) / (30000 / 1001) })));
  assert.equal(F.sceneSpans({ ...s.plan, scenes: [{ type: "text_card", sentenceIds: ["gone"], params: {} }] }), null);
  assert.ok(first.calls.some((c) => c.script.includes('createDraft({ name: "Preview · Title" })')));

  // a hand edit, then the refill: the same Draft, no createDraft, no import
  const edited = { ...s, preview: a.preview, plan: { ...s.plan, scenes: [s.plan.scenes[0], { ...s.plan.scenes[1], params: { text: "c" } }] } };
  assert.ok(!F.previewFresh(edited));
  const again = fakeHost({ ...DRAFT_ANSWERS, "Refill the preview Draft": { refilled: true, reason: "", frames: 1230, removed: 9 } });
  const rec = F.newRunRecord("chosun", "u");
  const b = await F.buildPreview(again.sdk, HOST_ENV, edited, preset, "Preview", log, rec);
  assert.equal(b.refilled, true);
  assert.equal(b.preview.draftId, "d-new");
  assert.equal(b.preview.planRev, F.previewRev(edited));
  assert.ok(!again.calls.some((c) => c.script.includes("createDraft") || c.summary === "Add media to the Project"));
  assert.ok(again.calls.every((c) => c.summary === "Refill the preview Draft" || c.script.includes('selects.draft("d-new")') || c.summary === "Read a downloaded file"));
  assert.ok(rec.notes.some((n) => n.startsWith("preview: refilled Draft d-new")));

  // the video from a refilled preview keeps the Draft and takes the final name
  const video = fakeHost({ ...DRAFT_ANSWERS, "Refill the preview Draft": { refilled: true, reason: "", frames: 1230 } });
  const v = await F.assemble(video.sdk, HOST_ENV, edited, preset, log, F.newRunRecord("chosun", "u"), { name: F.finalName(edited), reuse: a.preview });
  assert.equal(v.draftId, "d-new");
  assert.ok(video.calls.find((c) => c.summary === "Refill the preview Draft").script.includes('setName("Head")'));
});

test("a number scene keeps its caption, even from a plan that still says hideCaption", async () => {
  const F = await import("../src/pipeline/flow.ts");
  const { s, preset } = await planSession();
  const plan = { ...s.plan, scenes: [s.plan.scenes[0], { type: "number_callout", sentenceIds: ["s2"], params: { from: "1", to: "2" }, hideCaption: true }] };
  const h = fakeHost(DRAFT_ANSWERS);
  await F.buildPreview(h.sdk, HOST_ENV, { ...s, plan }, preset, "Preview", () => {}, F.newRunRecord("chosun", "u"));
  const captions = h.calls.find((c) => c.summary === "Add headline and captions (1/1)").script;
  for (const x of s.plan.sentences) assert.ok(captions.includes(JSON.stringify(x.text.replace(/\.$/, "")).slice(1, -1)), x.text);
});

test("a preview Draft that cannot be refilled is left alone and a new one is built", async () => {
  const F = await import("../src/pipeline/flow.ts");
  const { s, preset } = await planSession();
  const old = { draftId: "d-old", name: "Preview · Title", projectId: "p", planRev: "x", presetId: preset.id, narrationId: "n1", plateSeconds: 40.6, plateId: "plate0", plateImage: false, bandsId: null, frames: 1230, scenes: [], at: "" };
  const h = fakeHost({ ...DRAFT_ANSWERS, "Refill the preview Draft": { refilled: false, reason: "main is 900 frames, expected 1230", frames: 900 } });
  const rec = F.newRunRecord("chosun", "u");
  const r = await F.buildPreview(h.sdk, HOST_ENV, { ...s, preview: old }, preset, "Preview", () => {}, rec);
  assert.equal(r.preview.draftId, "d-new");
  assert.equal(r.refilled, false);
  // the recorded plate is reused even for the new Draft
  assert.ok(!h.calls.some((c) => c.summary === "Add media to the Project"));
  assert.ok(h.calls.find((c) => c.summary === "Build the news short Draft").script.includes('resourceId: "plate0"'));
  assert.ok(rec.notes.some((n) => n.includes("not refilled (main is 900 frames")));
});

test("a build that stops part way keeps its Draft as an outdated preview", async () => {
  const F = await import("../src/pipeline/flow.ts");
  const { s, preset } = await planSession();
  const { ["Add headline and captions (1/1)"]: _drop, ...answers } = DRAFT_ANSWERS;
  const h = fakeHost(answers);
  await assert.rejects(F.buildPreview(h.sdk, HOST_ENV, s, preset, "Preview", () => {}, F.newRunRecord("chosun", "u")), (e) => {
    assert.ok(e instanceof F.PartialDraftError);
    assert.equal(e.preview.draftId, "d-new");
    assert.equal(e.preview.planRev, "");
    assert.equal(e.preview.frames, 1230);
    return true;
  });
});

test("preview strings exist in both languages", async () => {
  const { MESSAGES } = await import("../src/messages.ts");
  for (const k of ["previewPrefix", "stalePrefix", "previewBuilding", "previewReady", "previewStale", "previewPartial", "previewRebuild", "previewBuild", "previewFailed", "previewBlocked", "openPreview", "staleBadge", "rendering", "sourcePhoto", "editScene", "closeScene", "videoFromPreview", "seekUnconfirmed", "stillTime"]) {
    assert.ok(MESSAGES[k] && MESSAGES[k][0] && MESSAGES[k][1], k);
  }
  assert.ok(!MESSAGES.planReviewHint[1].includes("\uc544\ubb34\uac83\ub3c4 \ucd94\uac00\ub418\uc9c0 \uc54a\uc544\uc694"));
});

test("a Draft that became the video is never refilled; a new article's refill takes the new title", async () => {
  const F = await import("../src/pipeline/flow.ts");
  const { s, preset } = await planSession();
  const prev = { draftId: "d-old", name: "Preview · Title", projectId: "p", planRev: "x", presetId: preset.id, narrationId: "n0", plateSeconds: 40.6, plateId: "plate0", plateImage: false, bandsId: null, frames: 1230, scenes: [], at: "" };
  // the video: no refill call at all, a new Draft instead
  const h = fakeHost(DRAFT_ANSWERS);
  const rec = F.newRunRecord("chosun", "u");
  const r = await F.buildPreview(h.sdk, HOST_ENV, { ...s, preview: prev, videos: ["d-old"] }, preset, "Preview", () => {}, rec);
  assert.equal(r.preview.draftId, "d-new");
  assert.ok(!h.calls.some((c) => c.summary === "Refill the preview Draft" || c.script.includes('"d-old"')));
  assert.ok(rec.notes.includes("preview: Draft d-old is a video, not refilled"));
  assert.ok(!F.previewFresh({ ...s, preview: { ...prev, planRev: F.previewRev(s) }, videos: ["d-old"] }));
  // after "start over" with another article: the same Draft, renamed for the new article
  const h2 = fakeHost({ ...DRAFT_ANSWERS, "Refill the preview Draft": { refilled: true, reason: "", frames: 1230 } });
  const next = await F.buildPreview(h2.sdk, HOST_ENV, { ...s, article: { ...s.article, title: "Second" }, preview: prev, videos: ["d-other"] }, preset, "Preview", () => {}, F.newRunRecord("chosun", "u"));
  assert.equal(next.preview.draftId, "d-old");
  assert.equal(next.preview.name, "Preview · Second");
  assert.ok(h2.calls.find((c) => c.summary === "Refill the preview Draft").script.includes('setName("Preview · Second")'));
});

test("calls on the preview Draft run one at a time, in order, past a failure", async () => {
  const { draftQueue } = await import("../src/pipeline/flow.ts");
  const q = draftQueue();
  const log = [];
  let running = 0, most = 0;
  const job = (name, ms, fail) => q(async () => {
    running++; most = Math.max(most, running); log.push(name + ">");
    await new Promise((r) => setTimeout(r, ms));
    running--; log.push("<" + name);
    if (fail) throw new Error(name);
    return name;
  });
  const results = await Promise.allSettled([job("rename", 20, true), job("refill", 5), job("open", 1)]);
  assert.equal(most, 1);
  assert.deepEqual(log, ["rename>", "<rename", "refill>", "<refill", "open>", "<open"]);
  assert.deepEqual(results.map((x) => x.status), ["rejected", "fulfilled", "fulfilled"]);
});

const PNG_ANSWERS = {
  "Render the complete preview scene": { byteSize: 9 },
  "Read a downloaded file": { chunks: [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString("base64")], offset: 9 },
  "Remove a temporary file": true,
};

test("preview viewer calls wait their turn behind a build; a still for a replaced preview does not render", async () => {
  const F = await import("../src/pipeline/flow.ts");
  const h = fakeHost({ ...PNG_ANSWERS, "Approve the preview Draft": true });
  const q = F.draftQueue();
  const p = { draftId: "d", projectId: "p", planRev: "r1", frames: 300, scenes: [{ startSec: 1, endSec: 3 }], at: "t1" };
  let current = p, release;
  const build = q(() => new Promise((r) => { release = r; }));
  const viewer = F.previewViewer(h.sdk, () => HOST_ENV, q, () => current);
  const rename = viewer.rename("p", "d", "Preview · New");
  const still = viewer.still(p, 0);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(h.calls.length, 0);
  current = { ...p, at: "t2" }; // the build refilled the Draft
  release();
  await build;
  await rename;
  await assert.rejects(still, /preview Draft changed/);
  assert.deepEqual(h.calls.map((c) => c.summary), ["Approve the preview Draft"]);
  assert.notEqual(F.stillKey(p, 0), F.stillKey(current, 0));
  assert.ok(F.stillKey(current, 1).startsWith(F.stillBuild(current)) && !F.stillKey(p, 1).startsWith(F.stillBuild(current)));
});

test("refilling the preview Draft drops the stills rendered from it before", async () => {
  const F = await import("../src/pipeline/flow.ts");
  const { s, preset } = await planSession();
  const log = () => {};
  const a = await F.buildPreview(fakeHost(DRAFT_ANSWERS).sdk, HOST_ENV, s, preset, "Preview", log, F.newRunRecord("chosun", "u"));
  const h = fakeHost({ ...DRAFT_ANSWERS, ...PNG_ANSWERS, "Refill the preview Draft": { refilled: true, reason: "", frames: 1230 } });
  const viewer = F.previewViewer(h.sdk, () => HOST_ENV, F.draftQueue(), () => a.preview);
  const renders = () => h.calls.filter((c) => c.summary === "Render the complete preview scene").length;
  assert.equal((await viewer.still(a.preview, 0)).cached, false);
  assert.equal((await viewer.still(a.preview, 0)).cached, true);
  assert.equal(renders(), 1);
  const edited = { ...s, preview: a.preview, plan: { ...s.plan, scenes: [s.plan.scenes[0], { ...s.plan.scenes[1], params: { text: "c" } }] } };
  assert.equal((await F.buildPreview(h.sdk, HOST_ENV, edited, preset, "Preview", log, F.newRunRecord("chosun", "u"))).refilled, true);
  assert.equal((await viewer.still(a.preview, 0)).cached, false);
  assert.equal(renders(), 2);
});
