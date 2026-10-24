// Plan check messages as the panel shows them. The checks speak English (the AI repair reads them as they are);
// a Korean panel shows each one as a Korean sentence that says what to change. A message no rule knows keeps its
// English text rather than losing what it says.
import { t } from "./messages.ts";

// Field paths in the checks ("value", "bars[0]", "cards[1].rows[0]") as the reviewer knows them.
const FIELD: Record<string, string> = {
  title: "\uC81C\uBAA9", value: "\uAC12", from: "\uC774\uC804 \uAC12", to: "\uC774\uD6C4 \uAC12", unit: "\uB2E8\uC704", label: "\uD56D\uBAA9", text: "\uBB38\uAD6C", sub: "\uC791\uC740 \uC904",
  source: "\uCD9C\uCC98", name: "\uC774\uB984", affiliation: "\uC18C\uC18D", lines: "\uC778\uC6A9 \uBB38\uAD6C", endLabel: "\uB05D \uAC12", header: "\uBA38\uB9AC\uAE00", rows: "\uC904",
  slices: "\uC870\uAC01", bars: "\uB9C9\uB300", cards: "\uCE74\uB4DC", points: "\uC810", cause: "\uC6D0\uC778", effect: "\uACB0\uACFC", word: "\uB0B1\uB9D0",
  accentLines: "\uAC15\uC870 \uC904", accentFrom: "\uAC15\uC870 \uC2DC\uC791 \uC810", focus: "\uC0AC\uC9C4 \uCD08\uC810",
};
// The blocks of text the templates report (src/templates/*.tsx reportLines).
const WHAT: Record<string, string> = {
  title: "\uC81C\uBAA9", value: "\uC22B\uC790", unit: "\uB2E8\uC704", "sub line": "\uC791\uC740 \uC904", text: "\uBB38\uAD6C", name: "\uC774\uB984", affiliation: "\uC18C\uC18D",
  quote: "\uC778\uC6A9", card: "\uCE74\uB4DC", "card name": "\uCE74\uB4DC \uBA38\uB9AC\uAE00", "card label": "\uCE74\uB4DC \uD56D\uBAA9", "card number": "\uCE74\uB4DC \uC22B\uC790",
  "card unit": "\uCE74\uB4DC \uB2E8\uC704", "second label": "\uB450 \uBC88\uC9F8 \uD56D\uBAA9", "second value": "\uB450 \uBC88\uC9F8 \uAC12",
  "bar name": "\uB9C9\uB300 \uC774\uB984", "bar sub line": "\uB9C9\uB300 \uC791\uC740 \uC904", "bar value": "\uB9C9\uB300 \uAC12", label: "\uD56D\uBAA9", "old value": "\uC774\uC804 \uAC12",
  "old value unit": "\uC774\uC804 \uAC12 \uB2E8\uC704", "new value": "\uC774\uD6C4 \uAC12", "new value unit": "\uC774\uD6C4 \uAC12 \uB2E8\uC704", caption: "\uC791\uC740 \uC81C\uBAA9", word: "\uB0B1\uB9D0",
  "legend name": "\uBC94\uB840 \uC774\uB984", "legend value": "\uBC94\uB840 \uAC12", "card header": "\uCE74\uB4DC \uBA38\uB9AC\uAE00", "card value": "\uCE74\uB4DC \uAC12",
  "end value": "\uB05D \uAC12", "point value": "\uC810 \uAC12", sentence: "\uBB38\uC7A5",
};
const field = (path: string) => path.split(".").map((seg) => {
  const m = /^(\w+)(?:\[(\d+)\])?$/.exec(seg);
  return m ? (FIELD[m[1]] ?? m[1]) + (m[2] !== undefined ? " " + (Number(m[2]) + 1) : "") : seg;
}).join(" ");
const kind = (type: string) => t("ko", "type_" + type);
// Plan data the reviewer cannot edit in a field: rebuilding with a note is the way to fix it.
const REBUILD = "\uC7A5\uBA74 \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694. '\uD654\uBA74 \uAD6C\uC131\uC5D0 \uC758\uACAC \uB0A8\uAE30\uAE30'\uB85C \uB2E4\uC2DC \uB9CC\uB4E4\uC5B4 \uC8FC\uC138\uC694.";

type Rule = [RegExp, (m: RegExpExecArray, type: string) => string];

// Text that does not fit (src/prompts/fit.ts).
const FIT: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [/^its text takes more lines, so every card grows/, () => "\uAE00\uC790\uAC00 \uC5EC\uB7EC \uC904\uC774\uB77C \uBAA8\uB4E0 \uCE74\uB4DC\uAC00 \uD568\uAED8 \uCEE4\uC838 \uC544\uB798 \uCD9C\uCC98 \uC904\uAE4C\uC9C0 \uB0B4\uB824\uAC00\uC694. \uCE74\uB4DC\uB9C8\uB2E4 \uBC18\uBCF5\uB418\uB294 \uB9D0(\uC608: \uC11C\uC6B8 \uC2E0\uCD95 \uC544\uD30C\uD2B8 \uBCF4\uC99D\uAE08)\uC740 \uC81C\uBAA9\uC73C\uB85C \uC62C\uB9AC\uACE0, \uCE74\uB4DC \uC774\uB984\uC740 \uB3D9\uBD81\uBD80\u00B7\uB3D9\uB0A8\uBD80\u00B7\uC11C\uBD81\uBD80\u00B7\uC11C\uB0A8\uBD80\uCC98\uB7FC \uC9E7\uAC8C \uC368 \uC8FC\uC138\uC694. \uCE74\uB4DC \uC218\uB97C \uC904\uC5EC\uB3C4 \uB3FC\uC694."],
  [/^the cards run below their room.*card repeats/, () => "\uCE74\uB4DC\uAC00 \uC544\uB798 \uCD9C\uCC98 \uC904\uAE4C\uC9C0 \uB0B4\uB824\uAC00\uC694. \uCE74\uB4DC\uB9C8\uB2E4 \uBC18\uBCF5\uB418\uB294 \uB9D0(\uC608: \uC11C\uC6B8 \uC2E0\uCD95 \uC544\uD30C\uD2B8 \uBCF4\uC99D\uAE08)\uC740 \uC81C\uBAA9\uC73C\uB85C \uC62C\uB9AC\uACE0, \uCE74\uB4DC \uC774\uB984\uC740 \uB3D9\uBD81\uBD80\u00B7\uB3D9\uB0A8\uBD80\u00B7\uC11C\uBD81\uBD80\u00B7\uC11C\uB0A8\uBD80\uCC98\uB7FC \uC9E7\uAC8C \uC368 \uC8FC\uC138\uC694. \uCE74\uB4DC \uC218\uB97C \uC904\uC5EC\uB3C4 \uB3FC\uC694."],
  [/^the cards run below their room/, () => "\uCE74\uB4DC\uAC00 \uC544\uB798 \uCE78(\uCD9C\uCC98 \uC904)\uAE4C\uC9C0 \uB0B4\uB824\uAC00\uC694. \uAE00\uC790\uB97C \uC904\uC774\uAC70\uB098 \uCE74\uB4DC \uC218\uB97C \uC904\uC5EC \uC8FC\uC138\uC694."],
  [/^the card runs out of the window/, () => "\uCE74\uB4DC\uAC00 \uD654\uBA74 \uBC16\uC73C\uB85C \uB098\uAC00\uC694. \uAE00\uC790\uB97C \uC904\uC774\uAC70\uB098 \uCE74\uB4DC \uC218\uB97C \uC904\uC5EC \uC8FC\uC138\uC694."],
  [/^it runs out of its (card|bar|hole|safe area) while it (comes in|counts)(?: \(([\d.]+) % larger)?/, (m) => (m[2] === "counts" ? "\uC22B\uC790\uAC00 \uBC14\uB00C\uB294 \uB3D9\uC548 " : "\uB4F1\uC7A5\uD560 \uB54C ") + (m[3] ? "\uC7A0\uAE50 " + m[3] + "% \uCEE4\uC9C0\uBA74\uC11C " : "") + ({ card: "\uCE74\uB4DC", bar: "\uB9C9\uB300", hole: "\uB3C4\uB11B \uAC00\uC6B4\uB370", "safe area": "\uC548\uC804 \uC601\uC5ED(x60~1020)" }[m[1]]) + " \uBC16\uC73C\uB85C \uB098\uAC00\uC694(\uAE00\uC790 \uD06C\uAE30\uB294 \uC904\uC774\uC9C0 \uC54A\uC544\uC694). \uBB38\uAD6C\uB97C \uC904\uC5EC \uC8FC\uC138\uC694."],
  [/^wider than its room/, () => "\uD55C \uC904\uB85C \uB193\uC544\uB3C4 \uCE78\uBCF4\uB2E4 \uB113\uC5B4 \uC798\uB824\uC694(\uAE00\uC790 \uD06C\uAE30\uB294 \uC904\uC774\uC9C0 \uC54A\uC544\uC694). \uBB38\uAD6C\uB97C \uC904\uC5EC \uC8FC\uC138\uC694."],
  [/^(?:its line|(\d+) lines)(?: at \d+ px)? runs? past its room/, (m) => (m[1] ? m[1] + "\uC904\uC774 " : "") + "\uCE78\uC744 \uB118\uC5B4 \uC798\uB9AC\uAC70\uB098 \uCD9C\uCC98\uB97C \uAC00\uB824\uC694(\uAE00\uC790 \uD06C\uAE30\uB294 \uC904\uC774\uC9C0 \uC54A\uC544\uC694). \uBB38\uAD6C\uB97C \uC904\uC774\uAC70\uB098 \uC7A5\uBA74\uC744 \uB098\uB220 \uC8FC\uC138\uC694."],
  [/^its lines overlap/, () => "\uC904\uB07C\uB9AC \uACB9\uCCD0\uC694. \uBB38\uAD6C\uB97C \uC904\uC774\uAC70\uB098 \uC7A5\uBA74\uC744 \uB098\uB220 \uC8FC\uC138\uC694."],
];

const RULES: Rule[] = [
  [/^(.+?) "(.*)" does not fit: (.*)$/, (m) => {
    const fix = FIT.find(([re]) => re.test(m[3]));
    const re = fix && fix[0].exec(m[3]);
    return (WHAT[m[1]] ?? m[1]) + " \u201C" + m[2] + "\u201D: " + (fix && re ? fix[1](re) : "\uD654\uBA74\uC5D0 \uB2E4 \uB4E4\uC5B4\uAC00\uC9C0 \uC54A\uC544\uC694. \uBB38\uAD6C\uB97C \uC904\uC774\uAC70\uB098 \uC7A5\uBA74\uC744 \uB098\uB220 \uC8FC\uC138\uC694.");
  }],
  [/^(.+?) "(.*)" takes (\d+) lines/, (m) => (WHAT[m[1]] ?? m[1]) + " \u201C" + m[2] + "\u201D: " + m[3] + "\uC904\uC774 \uB3FC\uC694(\uAE00\uC790 \uD06C\uAE30\uB294 \uC904\uC774\uC9C0 \uC54A\uC544\uC694). \uBB38\uAD6C\uB97C \uC904\uC774\uAC70\uB098 \uC7A5\uBA74\uC744 \uB098\uB204\uBA74 \uB354 \uC77D\uAE30 \uC26C\uC6CC\uC694."],
  [/^number "(.+)" is not in this scene's narration/, (m) => "\uC22B\uC790 \u201C" + m[1] + "\u201D: \uC774 \uC7A5\uBA74 \uB098\uB808\uC774\uC158\uC5D0 \uC5C6\uB294 \uC22B\uC790\uC608\uC694. \uC774 \uC7A5\uBA74\uC5D0\uC11C \uC77D\uB294 \uAE30\uC0AC \uC22B\uC790\uB85C \uBC14\uAFD4 \uC8FC\uC138\uC694."],
  [/^value is required and must contain a digit/, () => "\uAC12 \uCE78\uC5D0 \uAE30\uC0AC\uC5D0 \uB098\uC628 \uC22B\uC790\uB97C \uB123\uC5B4 \uC8FC\uC138\uC694."],
  [/^from and to are required/, () => "\uC774\uC804 \uAC12\uACFC \uC774\uD6C4 \uAC12\uC744 \uBAA8\uB450 \uB123\uC5B4 \uC8FC\uC138\uC694. \uAC12\uC774 \uD558\uB098\uBFD0\uC774\uBA74 \uC885\uB958\uB97C '\uAC15\uC870 \uCE74\uB4DC'\uB85C \uBC14\uAFD4 \uC8FC\uC138\uC694."],
  [/^from and to must each contain a digit/, () => "\uC774\uC804 \uAC12\uACFC \uC774\uD6C4 \uAC12\uC5D0 \uC22B\uC790\uAC00 \uC788\uC5B4\uC57C \uD574\uC694. \uAE30\uC0AC\uC5D0 \uC22B\uC790\uAC00 \uC5C6\uC73C\uBA74 \uB2E4\uB978 \uC885\uB958\uB85C \uBC14\uAFD4 \uC8FC\uC138\uC694."],
  [/^title, source and unit are required/, () => "\uC81C\uBAA9\u00B7\uCD9C\uCC98\u00B7\uB2E8\uC704\uB97C \uBAA8\uB450 \uCC44\uC6CC \uC8FC\uC138\uC694."],
  [/^name and affiliation are required/, () => "\uC774\uB984\uACFC \uC18C\uC18D\uC744 \uBAA8\uB450 \uCC44\uC6CC \uC8FC\uC138\uC694."],
  [/^(\d+)-(\d+) quote lines are required/, (m) => "\uC778\uC6A9 \uBB38\uAD6C\uB294 " + m[1] + "~" + m[2] + "\uC904\uC774\uC5B4\uC57C \uD574\uC694."],
  [/^(\d+)-(\d+) (slices|cards) are required/, (m) => FIELD[m[3]] + "\uB294 " + m[1] + "~" + m[2] + "\uAC1C\uC5EC\uC57C \uD574\uC694."],
  [/^exactly (\d+) bars are required/, (m) => "\uB9C9\uB300\uB294 " + m[1] + "\uAC1C\uC5EC\uC57C \uD574\uC694."],
  [/^at least (\d+) points/, (m) => "\uC810\uC774 " + m[1] + "\uAC1C \uC774\uC0C1 \uC788\uC5B4\uC57C \uD574\uC694."],
  [/^exactly one slice must have tone accent/, () => "\uAC15\uC870 \uC0C9 \uC870\uAC01\uC740 \uD558\uB098\uC5EC\uC57C \uD574\uC694."],
  [/^(?:at most one card may have tone accent|only one bar may be accent)/, () => "\uAC15\uC870 \uC0C9\uC740 \uD558\uB098\uC5D0\uB9CC \uC4F8 \uC218 \uC788\uC5B4\uC694."],
  [/^(\w+)\[(\d+)\](?:\.(\w+)\[(\d+)\])? needs /, (m) => field(m[1] + "[" + m[2] + "]" + (m[3] ? "." + m[3] + "[" + m[4] + "]" : "")) + "\uC5D0 \uBE60\uC9C4 \uAC12\uC774 \uC788\uC5B4\uC694. '\uC804\uCCB4 \uAC12(JSON)'\uC5D0\uC11C \uCC44\uC6CC \uC8FC\uC138\uC694."],
  [/^accentFrom must be a valid point index/, () => "\uAC15\uC870 \uC2DC\uC791 \uC810 \uBC88\uD638\uAC00 \uC810 \uAC1C\uC218\uC640 \uB9DE\uC9C0 \uC54A\uC544\uC694."],
  [/^accentLines must be valid line indexes/, () => "\uAC15\uC870 \uC904 \uBC88\uD638\uAC00 \uC778\uC6A9 \uC904 \uC218\uC640 \uB9DE\uC9C0 \uC54A\uC544\uC694."],
  [/^focus must be/, () => "\uC0AC\uC9C4 \uCD08\uC810 \uAC12\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694."],
  [/^([\w.]+) is required/, (m) => field(m[1]) + " \uCE78\uC744 \uCC44\uC6CC \uC8FC\uC138\uC694."],
  [/^lasts ([\d.]+) s; split it so a (\w+) scene does not run past (\d+) s/, (m) => m[1] + "\uCD08\uB85C \uAE38\uC5B4\uC694. " + kind(m[2]) + " \uC7A5\uBA74\uC740 " + m[3] + "\uCD08\uB97C \uB118\uC9C0 \uC54A\uAC8C \uC7A5\uBA74\uC744 \uB098\uB220 \uC8FC\uC138\uC694."],
  [/^title "(.*)" is over (\d+) characters/, (m) => "\uC81C\uBAA9 \u201C" + m[1] + "\u201D: " + m[2] + "\uC790\uB97C \uB118\uC5B4 \uD55C \uC904\uC5D0 \uB2E4 \uB4E4\uC5B4\uAC00\uC9C0 \uC54A\uC544\uC694."],
  [/^subtitle is over (\d+) characters/, (m) => "\uBD80\uC81C\uAC00 " + m[1] + "\uC790\uB97C \uB118\uC5B4 \uD55C \uC904\uC5D0 \uB2E4 \uB4E4\uC5B4\uAC00\uC9C0 \uC54A\uC544\uC694."],
  [/^(\d+) \[ \] and (\d+) \{ \} emphasis marks; keep at most (\d+) \[ \] and (\d+) \{ \}/, (m) => "\uAC15\uC870 \uD45C\uC2DC\uAC00 \uB9CE\uC544\uC694([ ] " + m[1] + "\uAC1C, { } " + m[2] + "\uAC1C). \uC7A5\uBA74\uB9C8\uB2E4 [ ]\uB294 " + m[3] + "\uAC1C, { }\uB294 " + m[4] + "\uAC1C\uAE4C\uC9C0 \uC368 \uC8FC\uC138\uC694."],
  [/^text_card sub "(.*)" looks like a source/, (m) => "\uC791\uC740 \uC904 \u201C" + m[1] + "\u201D: \uCD9C\uCC98\uCC98\uB7FC \uBCF4\uC5EC\uC694. \uCD9C\uCC98\uB294 \uB370\uC774\uD130 \uC7A5\uBA74\uC758 \uCD9C\uCC98 \uCE78\uC5D0 \uB123\uC5B4 \uC8FC\uC138\uC694."],
  [/^assetRef "(.*)" is not in the asset list/, (m) => "\uC0AC\uC9C4 " + m[1] + ": \uAE30\uC0AC \uC0AC\uC9C4 \uBAA9\uB85D\uC5D0 \uC5C6\uC5B4\uC694. \uC0AC\uC9C4\uC744 \uB2E4\uC2DC \uACE8\uB77C \uC8FC\uC138\uC694."],
  [/^news_photo needs an assetRef/, () => "\uC0AC\uC9C4 \uC7A5\uBA74\uC5D0\uB294 \uC0AC\uC9C4\uC744 \uACE8\uB77C \uC8FC\uC138\uC694."],
  [/^(\w+) must not carry an assetRef/, (m) => kind(m[1]) + " \uC7A5\uBA74\uC5D0\uB294 \uC0AC\uC9C4\uC744 \uB123\uC9C0 \uC54A\uC544\uC694. \uC0AC\uC9C4\uC744 '\uC5C6\uC74C'\uC73C\uB85C \uBC14\uAFD4 \uC8FC\uC138\uC694."],
  [/^a scene that shows an illustration must set disclaimer=true/, () => "\uADF8\uB9BC \uC7A5\uBA74\uC5D0\uB294 '\uC774\uD574\uB97C \uB3D5\uAE30 \uC704\uD55C \uADF8\uB9BC' \uD45C\uC2DC\uAC00 \uC788\uC5B4\uC57C \uD574\uC694."],
  [/^disclaimer=true is only for illustration scenes/, () => "'\uC774\uD574\uB97C \uB3D5\uAE30 \uC704\uD55C \uADF8\uB9BC' \uD45C\uC2DC\uB294 \uADF8\uB9BC \uC7A5\uBA74\uC5D0\uB9CC \uC368\uC694."],
  [/^use the article photo\(s\) (.*) before any illustration/, (m) => "\uADF8\uB9BC\uBCF4\uB2E4 \uAE30\uC0AC \uC0AC\uC9C4\uC744 \uBA3C\uC800 \uC368 \uC8FC\uC138\uC694(" + m[1] + ")."],
  [/^(?:hideCaption|disclaimer) must be true or false|^params must be an object|^must be an object|^sentenceIds is required|^unknown sentence id|^type must be one of/, () => REBUILD],
  [/^asset (\S+) is used in (\d+) scenes; use it at most (\d+) times/, (m) => "\uC0AC\uC9C4 " + m[1] + ": \uC7A5\uBA74 " + m[2] + "\uAC1C\uC5D0 \uB098\uC640\uC694. " + m[3] + "\uBC88\uAE4C\uC9C0\uB9CC \uC4F0\uACE0 \uB098\uBA38\uC9C0 \uC7A5\uBA74\uC740 \uAE00\uC790 \uCE74\uB4DC\uB098 \uB370\uC774\uD130 \uC7A5\uBA74\uC73C\uB85C \uBC14\uAFD4 \uC8FC\uC138\uC694."],
  [/^unused article photos: (.*)$/, (m) => "\uC544\uC9C1 \uC4F0\uC9C0 \uC54A\uC740 \uAE30\uC0AC \uC0AC\uC9C4: " + m[1]],
  [/^(\d+) of (\d+) scenes are text cards/, (m) => "\uC7A5\uBA74 " + m[2] + "\uAC1C \uC911 " + m[1] + "\uAC1C\uAC00 \uAE00\uC790 \uCE74\uB4DC\uC608\uC694. \uC22B\uC790\uAC00 \uB098\uC624\uB294 \uBB38\uC7A5\uC740 \uB370\uC774\uD130 \uC7A5\uBA74\uC73C\uB85C \uBC14\uAFD4 \uBCF4\uC138\uC694."],
  [/^the opening scene should use the strongest visual/, () => "\uCCAB \uC7A5\uBA74\uC740 \uAE00\uC790 \uCE74\uB4DC\uBCF4\uB2E4 \uAC00\uC7A5 \uB208\uC5D0 \uB744\uB294 \uC0AC\uC9C4\uC774\uB098 \uADF8\uB798\uD53D\uC774 \uC88B\uC544\uC694."],
  [/^assetSummaries is missing a summary|^scenes must cover every sentence|^reply must be an object/, () => REBUILD],
];

// One check message in the panel's language: the whole message ("scene 7 (highlight_card): ...") or the part a
// scene row shows after its "scene 7" ("(highlight_card): ...", ".value: ...", "lasts ...").
export function issueText(lang: string | undefined, msg: string): string {
  if (!String(lang || "").toLowerCase().startsWith("ko")) return msg;
  let rest = msg, scene = "", type = "", path = "";
  let m = /^scene (\d+)\b:? ?(.*)$/.exec(rest);
  if (m) { scene = m[1] + "\uBC88 \uC7A5\uBA74: "; rest = m[2]; }
  if ((m = /^\((\w+)\): (.*)$/.exec(rest))) { type = m[1]; rest = m[2]; }
  else if ((m = /^\.(\S+?): (.*)$/.exec(rest))) { path = m[1]; rest = m[2]; }
  for (const [re, ko] of RULES) {
    const r = re.exec(rest);
    if (r) return scene + (path ? field(path) + " \u2013 " : "") + ko(r, type);
  }
  return msg;
}
