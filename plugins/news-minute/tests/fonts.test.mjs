import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EMBED_FAMILY, FONT_FILE, SUBSETTER_FILE, loadEmbeddedFont, sceneFont, sceneText, unpackFile } from "../src/fonts/sceneFont.ts";
import { nameRecords } from "../src/fonts/renameFamily.ts";
import { sfntAxes } from "../src/fonts/sfnt.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// "Monthly rent 1,641,000 won, 10 years" in Hangul, escaped for the public source checks.
const HEADLINE = "\uc6d4\uc138 164\ub9cc1000\uc6d0 10\ub144";

let font;
test.before(async () => {
  font = await loadEmbeddedFont(read);
});

test("packaged files decode to the reviewed bytes", async () => {
  assert.equal(font.source.length, FONT_FILE.bytes);
  await assert.rejects(unpackFile(await read(SUBSETTER_FILE.path), FONT_FILE), /does not match/);
});

test("a scene subset keeps the weight axis and drops the reserved name", () => {
  const f = sceneFont(font, sceneText({ line1: HEADLINE, line2: HEADLINE }));
  assert.equal(f.fontFamily, EMBED_FAMILY);
  assert.equal(f.missing, "");
  assert.ok(f.subsetBytes < 60_000, "subset is " + f.subsetBytes + " bytes");
  const bytes = Buffer.from(f.fontCss.match(/base64,([^)]+)\)/)[1], "base64");
  const wght = sfntAxes(new Uint8Array(bytes)).axes.find((a) => a.tag === "wght");
  assert.ok(wght && wght.min <= 300 && wght.max >= 900);
  const names = nameRecords(new Uint8Array(bytes)).map((r) => r.text);
  assert.ok(names.some((n) => n.includes(EMBED_FAMILY)));
  assert.ok(!names.some((n) => /Pretendard/.test(n)), names.join(" | "));
  assert.equal(f.fontLoads.length, 6);
});

test("characters the face lacks are reported, image data is ignored", () => {
  const text = sceneText({ text: "A\u{1F600}", image: "data:image/jpeg;base64,QUJD", rows: [{ value: 12.5 }] });
  assert.ok(!text.includes("QUJD"));
  assert.ok(text.includes("12.5"));
  assert.equal(sceneFont(font, text).missing, "\u{1F600}");
});
