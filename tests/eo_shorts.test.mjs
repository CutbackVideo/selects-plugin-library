// EO Shorts: what the release build must do, run on the sources panel.tsx is built from.
// node --experimental-strip-types --test tests/eo_shorts.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), "..", "plugins", "eo-shorts");
const load = (rel) => import(new URL("../plugins/eo-shorts/" + rel, import.meta.url).href);

test("Wikimedia Commons: the user agent names the configured contact, a site rather than an email; no contact, no request", async () => {
  const { commonsConfig, commonsUserAgent } = await load("src/broll/config.ts");
  const bundled = commonsConfig();
  assert.match(bundled.contact, /^https:\/\/[^\s@]+$/);
  assert.equal(commonsUserAgent(bundled, "1.2.3"), "EOShorts/1.2.3 (" + bundled.contact + ")");
  assert.throws(() => commonsUserAgent(commonsConfig({ contact: "  " })), /contact/);
});

test("the planning request: the engine's prompt texts, with the music section added once", async () => {
  const { planTemplate, promptTexts } = await load("src/stages/plan/prompt.ts");
  const texts = promptTexts();
  for (const [key, file] of [["prompt", "PROMPT.md"], ["directing", "DIRECTING.md"], ["schema", "SCHEMA.md"]]) {
    assert.equal(texts[key], readFileSync(join(PLUGIN, "engine", "prompt", file), "utf8"), file + ": run node build.mjs");
  }
  const template = planTemplate();
  assert.equal(template.split("## Music\n").length, 2);
  assert.equal(template.split('"music": {').length, 2);
  assert.equal(planTemplate("planner-1"), texts.prompt);
});

test("the lint's glyph table is what the packaged fonts give", () => {
  const r = spawnSync(process.execPath, [join(PLUGIN, "tools", "glyph-table.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
