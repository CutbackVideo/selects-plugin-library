import test from "node:test";
import assert from "node:assert/strict";
import { entranceSec, sceneFrames, FPS } from "../src/pipeline/preview.ts";
import { renderScene } from "../src/templates/entrance.generated.ts";
import { SCENE_TYPES } from "../src/prompts/index.ts";

// Element factory for the generated template sources: function components run, host elements become plain nodes.
function h(type, props, children) {
  const { key: _key, ...rest } = props ?? {};
  const kids = children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false && c !== true && c !== "");
  if (typeof type === "function") return type({ ...rest, children: kids.length > 1 ? kids : kids[0] });
  return { type, props: rest, children: kids };
}
const render = (type, data, frames, frame) => renderScene(type, data, FPS, frames, frame, h);
const text = (node) => (node && typeof node === "object" ? node.children.map(text).join("") : String(node ?? ""));

// Every text field carries a {phrase} brush, so a brush that ends after the seek point shows up as a difference.
const DATA = {
  text_card: { title: "\uC5C7\uAC08\uB9B0 {\uD750\uB984}", text: "\uBC18\uB3C4\uCCB4\uC8FC {14% \uD558\uB77D}\n\uBC84\uD06C\uC154 [7%] \uC0C1\uC2B9", sub: "{\uC774\uB2EC} \uAE30\uC900", source: "\uC790\uB8CC=\uAE30\uC0AC" },
  quote_card: { name: "\uC720\uC120\uC885", affiliation: "\uAC74\uAD6D\uB300 {\uAD50\uC218}", lines: ["\uC2E4\uAC70\uC8FC \uADDC\uC81C\uB85C", "{\uCCAD\uB144\uCE35 \uC0AC\uB2E4\uB9AC\uB97C}", "\uBD95\uAD34\uC2DC\uD0A4\uACE0 \uC788\uB2E4"], source: "\uC790\uB8CC=\uAE30\uC0AC" },
  stat_cards: { title: "\uC6D4\uC138 {300\uB9CC\uC6D0}", subtitle: "{3~7\uC6D4} \uAE30\uC900", cards: [
    { header: "\uB178\uC6D0\uAD6C", rows: [{ label: "{\uC6D4\uC138}", value: "300\uB9CC", unit: "\uC6D0" }, { label: "{\uBCF4\uC99D\uAE08}", value: "1\uC5B5\uC6D0" }] },
    { header: "\uAC15\uBD81\uAD6C", rows: [{ label: "\uC6D4\uC138", value: "315\uB9CC", unit: "\uC6D0" }, { label: "\uBCF4\uC99D\uAE08", value: "5000\uB9CC\uC6D0" }] },
  ], source: "\uC790\uB8CC=\uAD6D\uD1A0\uBD80" },
  highlight_card: { title: "\uBC84\uD06C\uC154 {B\uC8FC}", value: "546.97", unit: "\uB2EC\uB7EC", subtitle: "{\uC0AC\uC0C1 \uCD5C\uACE0\uAC00}", source: "\uC790\uB8CC=\uAE30\uC0AC" },
  bar_compare_h: { title: "SOXX vs {\uBC84\uD06C\uC154}", subtitle: "{\uC774\uB2EC} \uC218\uC775\uB960", unit: "%", bars: [
    { label: "SOXX", sub: "{\uD558\uB77D}", value: 16.5, tone: "grey" }, { label: "{\uBC84\uD06C\uC154}", value: 9.8, tone: "accent" },
  ] },
  number_callout: { title: "\uAE08\uB9AC {\uBCC0\uD654}", label: "{\uAE30\uC900\uAE08\uB9AC}", from: "6.0", to: "6.5", unit: "%", subtitle: "{\uC62C\uD574}", source: "\uC790\uB8CC=\uD55C\uC740" },
  flow_cause_effect: { title: "\uCCA0\uAC70\uAC00 {\uC5B4\uB824\uC6B4} \uC774\uC720", subtitle: "{\uBC95} \uC81C\uD55C", cause: { word: "{\uACBD\uAE30\uC7A5}", caption: "{\uC9C0\uC790\uCCB4}" }, effect: { word: "{\uCCA0\uAC70 \uBD88\uAC00}", caption: "{\uBC95\uC801 \uC81C\uD55C}" } },
  donut_ratio: { title: "\uACBD\uAE30\uC7A5 {\uB178\uD6C4\uD654}", subtitle: "{105\uAC1C} \uC911", unit: "\uAC1C", slices: [
    { label: "{30\uB144 \uC774\uC0C1}", value: 46, tone: "accent" }, { label: "{20\uB144 \uC774\uC0C1}", value: 32 }, { label: "10\uB144 \uBBF8\uB9CC", value: 8 },
  ] },
  line_trend_callout: { title: "\uC6D4\uC138 {\uBE44\uC911}", subtitle: "{\uC804\uAD6D}", unit: "%", points: [{ x: "2011", y: 17.7 }, { x: "2016", y: 37.1 }, { x: "2021", y: 39.7 }, { x: "2026", y: 52.3 }],
    threshold: { y: 50, label: "{50%}" }, cards: [{ text: "{2011}\n17.7%" }, { text: "{2026}\n52.3%", tone: "accent" }] },
  verdict_card: { title: "\uCC98\uBD84 \uB300\uC0C1", subtitle: "{\uB18D\uC9C0\uBC95}", cards: [{ text: "\uD5C8\uC704 \uACC4\uD68D\uC11C\uB85C\n{\uBC29\uCE58}", tone: "accent" }, { text: "\uC2E4\uACBD\uC791\n{\uC81C\uC678}", tone: "contrast" }] },
};
// The photo keeps zooming over the whole clip, so only its text settles.
const MOVING = new Set(["news_photo"]);

test("every scene template has sample data with brushes", () => {
  for (const t of SCENE_TYPES) if (!MOVING.has(t)) assert.ok(DATA[t], t);
});

// The preview seeks to sceneFrames(...).enter. From that frame on nothing may still be moving: the tree there must
// equal the clip's last frame, for a long clip, a typical one and one short enough to speed the scene up.
for (const t of SCENE_TYPES.filter((x) => !MOVING.has(x))) {
  test(t + ": the seek frame already shows the finished scene", () => {
    for (const frames of [600, 300, 150, 90]) {
      const data = DATA[t];
      const { enter, end } = sceneFrames(frames, { startSec: 0, endSec: frames / FPS, enterSec: entranceSec(t, data, frames) });
      assert.deepEqual(render(t, data, frames, enter), render(t, data, frames, end - 1), t + " at " + frames + " frames, seek frame " + enter);
    }
  });
}

test("bar comparison seek frame shows the final values (review case: 10.01 s, 16.5 % / 9.8 %)", () => {
  const data = { title: "SOXX vs \uBC84\uD06C\uC154", unit: "%", bars: [{ label: "SOXX", value: 16.5, tone: "grey" }, { label: "\uBC84\uD06C\uC154", value: 9.8, tone: "accent" }] };
  const sec = entranceSec("bar_compare_h", data, 300);
  // The second bar starts 1 s later on a long clip; its count-up ends 0.6 + 1.0 + 1.0 + 2.5 s in.
  assert.equal(sec, 5.1);
  const { enter } = sceneFrames(300, { startSec: 0, endSec: 300 / FPS, enterSec: sec });
  const shown = text(render("bar_compare_h", data, 300, enter));
  assert.ok(shown.includes("9.8%") && shown.includes("16.5%"), shown);
  assert.ok(!text(render("bar_compare_h", data, 300, 123)).includes("9.8%"), "frame 123 (the old seek point) is still counting");
});

// Style spec 1: text that does not fit breaks onto more lines at the same size. Collect every font size drawn.
const sizes = (node, out = []) => {
  if (!node || typeof node !== "object") return out;
  const fs = node.props?.style?.fontSize;
  if (typeof fs === "number" && node.children.some((c) => typeof c !== "object" || c.type === "span" || c.type === "Fragment")) out.push({ fs, text: text(node) });
  for (const c of node.children) sizes(c, out);
  return out;
};
// [data, spec sizes the template may draw, lines at the main size]
const LONG = {
  text_card: [{ text: "\uBC18\uB3C4\uCCB4\uC8FC 14% \uC774\uC0C1 \uD558\uB77D \uBC84\uD06C\uC154 7% \uC774\uC0C1 \uC0C1\uC2B9" }, [72, 50, 26], 2],
  quote_card: [{ name: "a", lines: ["\uC2E4\uAC70\uC8FC \uADDC\uC81C\uB85C \uC778\uD55C \uAE09\uACA9\uD55C \uC804\uC138\uC758 \uC6D4\uC138\uD654\uAC00"] }, [66, 76, 40, 26], 2],
  // the unit takes a line of its own under the value
  highlight_card: [{ value: "1\uC5B55000\uB9CC", unit: "\uC6D0" }, [150, 80, 50, 30, 26], 1],
  // four cards two by two, each number on one line beside its unit
  stat_cards: [{ cards: ["a", "b", "c", "d"].map((header) => ({ header, rows: [{ label: "x", value: "1\uC5B55000\uB9CC", unit: "\uC6D0" }] })) }, [72, 36, 44, 32, 30, 38, 26, 50], 4],
  // two-line bar names (the baseline rises), the hero value inside its bar
  bar_compare_h: [{ unit: "%", bars: [{ label: "\uD544\uB77C\uB378\uD53C\uC544 \uBC18\uB3C4\uCCB4 \uC9C0\uC218", sub: "\uC62C\uD574 \uB4E4\uC5B4 \uC9C0\uAE08\uAE4C\uC9C0", value: 16.5, tone: "grey" }, { label: "\uBC84\uD06C\uC154 \uD574\uC11C\uC6E8\uC774 B\uC8FC", value: 9.8, tone: "accent" }] }, [54, 30, 58, 34, 72, 40, 86, 48, 50, 26], 3],
  number_callout: [{ label: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uB300\uCE58\uB3D9 \uC740\uB9C8\uC544\uD30C\uD2B8 \uC804\uC6A9 84\uC81C\uACF1\uBBF8\uD130 \uB9E4\uB9E4\uAC00", from: "21\uC5B55000\uB9CC", to: "25\uC5B53000\uB9CC", unit: "\uC6D0" }, [44, 96, 53, 150, 80, 50, 30, 26], 2],
  // a three-line cause word next to a two-line effect word
  flow_cause_effect: [{ cause: { word: "\uAE08\uB9AC \uC778\uD558 \uAE30\uB300\uAC00 \uD06C\uAC8C \uC904\uC5B4\uB4E6", caption: "\uBBF8\uAD6D \uC5F0\uBC29\uC900\uBE44\uC81C\uB3C4" }, effect: { word: "\uAC00\uCE58\uC8FC\uB85C \uC774\uB3D9" } }, [64, 40, 50, 30], 4],
  // the hero label in the hole and two legend names on two lines each
  donut_ratio: [{ unit: "%", slices: [{ label: "\uBC84\uD06C\uC154 \uD574\uC11C\uC6E8\uC774\uAC00 \uBCF4\uC720\uD55C \uC560\uD50C \uC8FC\uC2DD", value: 43.8, tone: "accent" }, { label: "\uBC45\uD06C\uC624\uBE0C\uC544\uBA54\uB9AC\uCE74\uC640 \uC544\uBA54\uB9AC\uCE78 \uC775\uC2A4\uD504\uB808\uC2A4", value: 30 }, { label: "\uAE30\uD0C0", value: 26.2 }] }, [38, 76, 42, 28, 40, 32, 22, 50, 30, 26], 2],
  // a card value on two lines (the cards grow upwards)
  line_trend_callout: [{ unit: "%", points: [{ x: "2021", y: 1 }, { x: "2022", y: 2 }, { x: "2023", y: 3 }], cards: [{ text: "1\uB144 \uC0C8 \uD604\uAE08 \uBCF4\uC720\uC561 \uBCC0\uD654\n\uB450 \uBC30 \uAC00\uAE4C\uC774 \uB298\uC5B4\uB09C \uC5ED\uB300 \uCD5C\uB300 \uADDC\uBAA8", tone: "accent" }, { text: "\uC5ED\uB300\n\uCD5C\uB300" }] }, [26, 40, 84, 46, 30, 50], 2],
  verdict_card: [{ title: "\uB300\uC0C1", cards: [{ text: "\uC11C\uC6B8 \uAC15\uB0A83\uAD6C\uC640 \uC6A9\uC0B0\uAD6C\uC5D0\uC11C \uC544\uD30C\uD2B8\uB97C \uB450 \uCC44 \uB118\uAC8C \uAC00\uC9C4 \uC0AC\uB78C\uC740 [\uC911\uACFC\uC138] \uB300\uC0C1", tone: "accent" }, { text: "1\uC8FC\uD0DD\uC790\uB294 \uB300\uC0C1 \uC544\uB2D8", tone: "contrast" }] }, [64, 44, 30], 5],
};
test("long text keeps its style-spec size and breaks onto more lines", () => {
  for (const [t, [data, spec, lines]] of Object.entries(LONG)) {
    const drawn = sizes(render(t, data, 300, 299));
    assert.ok(drawn.every((d) => spec.includes(d.fs)), t + " " + JSON.stringify(drawn));
    assert.equal(drawn.filter((d) => d.fs === spec[0]).length, lines, t + " " + JSON.stringify(drawn));
  }
});

test('a { } mark wider than a line breaks at its spaces and each line keeps its brush', async () => {
  const { readFileSync } = await import('node:fs');
  const c = JSON.parse(readFileSync(new URL('./fixtures/layout-cases-14b3d80.json', import.meta.url), 'utf8')).find((x) => x.id === 'text-marked');
  const tree = render(c.type, c.data, 300, 299);
  const lines = [];
  const walk = (n) => { if (!n || typeof n !== 'object') return; if (n.props?.style?.transform === 'translate(-50%,-50%)' && /\uBC18\uB3C4\uCCB4\uC8FC|\uBC84\uD06C\uC154/.test(text(n))) lines.push(n); else n.children.forEach(walk); };
  walk(tree);
  assert.deepEqual(lines.map(text), ['\uBC18\uB3C4\uCCB4\uC8FC 14% \uC774\uC0C1 \uD558\uB77D', '\uBC84\uD06C\uC154 7% \uC774\uC0C1 \uC0C1\uC2B9']);
  const brushed = (n) => n && typeof n === 'object' && (n.type === 'svg' || n.children.some(brushed));
  assert.ok(lines.every(brushed));
});

test("no scene template sets text smaller to fit (style spec 1)", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const dir = new URL("../src/templates/", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".tsx") && !["headline.tsx", "caption.tsx"].includes(x))) {
    assert.ok(!/fitSize\(/.test(readFileSync(new URL(f, dir), "utf8")), f);
  }
});
