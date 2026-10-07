import assert from "node:assert/strict";
import * as disk from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ensureDir, readJsonIfExists, writeJsonAtomic } from "../plugins/eo-shorts/src/host/fs.ts";
import { acquireLease, leaseStatus, LeaseBusyError } from "../plugins/eo-shorts/src/jobs/lease.ts";
import { appendEvent, readJsonl } from "../plugins/eo-shorts/src/jobs/journal.ts";
import { bakeKey } from "../plugins/eo-shorts/src/stages/compose/stockBake.ts";
import { hostStockSearch } from "../plugins/eo-shorts/src/broll/search.ts";
import { resolveGenerationScope } from "../plugins/eo-shorts/src/images/jobImages.ts";

// Every I/O method returns a real asynchronous result. Promise truthiness cannot
// masquerade as a successful exists/stat check, unlike a synchronous fixture.
const files = {
  join: path.join, dirname: path.dirname, basename: path.basename,
  exists: async p => disk.access(p).then(() => true, () => false),
  mkdir: disk.mkdir, readdir: disk.readdir,
  stat: async p => disk.stat(p).catch(e => { if (e.code === "ENOENT") return null; throw e; }),
  rename: disk.rename, unlink: disk.unlink, rm: disk.rm,
  readFile: disk.readFile, writeFile: disk.writeFile,
};
async function workspace(t) {
  const root = await disk.mkdtemp(path.join(tmpdir(), "eo-sdk-"));
  t.after(() => disk.rm(root, { recursive: true, force: true }));
  return root;
}

test("EO awaits absent files, directory creation and atomic JSON replacement", async t => {
  const root = await workspace(t), dir = path.join(root, "job", "source"), target = path.join(dir, "snapshot.json");
  assert.equal(await readJsonIfExists(files, target, null), null);
  assert.equal(await ensureDir(files, dir), dir);
  await writeJsonAtomic(files, target, { revision: 1 });
  await writeJsonAtomic(files, target, { revision: 2 });
  assert.deepEqual(await readJsonIfExists(files, target, null), { revision: 2 });
  assert.deepEqual(await disk.readdir(dir), ["snapshot.json"]);
});

test("EO's asynchronous exclusive lease has one owner and release is awaited", async t => {
  const root = await workspace(t);
  const results = await Promise.allSettled([
    acquireLease(files, root, { owner: "panel-a" }),
    acquireLease(files, root, { owner: "panel-b" }),
  ]);
  const winners = results.filter(r => r.status === "fulfilled");
  const losers = results.filter(r => r.status === "rejected");
  assert.equal(winners.length, 1);
  assert.equal(losers.length, 1);
  assert.ok(losers[0].reason instanceof LeaseBusyError);
  assert.equal((await leaseStatus(files, root)).state, "live");
  await winners[0].value.release();
  assert.equal((await leaseStatus(files, root)).state, "free");
});

test("EO journal appends records without replacing earlier events", async t => {
  const root = await workspace(t);
  await appendEvent(files, root, { type: "started" });
  await appendEvent(files, root, { type: "finished" });
  const journal = await readJsonl(files, path.join(root, "events.jsonl"));
  assert.deepEqual(journal.records.map(r => r.type), ["started", "finished"]);
  assert.equal(journal.badLines, 0);
});

test("EO footage cache keys await stat results and change with source content", async t => {
  const root = await workspace(t), source = path.join(root, "source.mp4");
  await disk.writeFile(source, "first");
  const plan = { shots: [{ source: { path: source } }] };
  const before = await bakeKey(files, plan);
  await disk.writeFile(source, "second-longer");
  assert.notEqual(await bakeKey(files, plan), before);
});

test("EO stock uses the canonical SDK with JSON arguments and local abort handling", async () => {
  const calls = [], query = 'street "); throw new Error("injected");';
  const search = hostStockSearch({ runScript: async input => { calls.push(input); return { isError: false, result: [{ duration: 10 }] }; } });
  assert.deepEqual(await search({ query, per: 3 }), [{ duration: 10 }]);
  assert.equal(calls[0].script, "return await selects.stock.searchVideos(" + JSON.stringify({ query, per: 3 }) + ");");
  const controller = new AbortController(); controller.abort();
  await assert.rejects(search({ query, signal: controller.signal }), { name: "AbortError" });
  assert.equal(calls.length, 1);
});

test("EO resolves generation scope from editor state without parent window access", async () => {
  let calls = 0;
  const scope = await resolveGenerationScope({ runScript: async input => {
    calls++;
    assert.match(input.script, /selects\.editor\.state\(\)/);
    return { isError: false, output: JSON.stringify({ result: { libraryId: "library", projectId: "project" } }) };
  } }, "project");
  assert.deepEqual(scope, { libraryId: "library", projectId: "project" });
  assert.equal(calls, 1);
});

test("EO's generated panel uses only canonical transport for its host adapter", () => {
  const panel = readFileSync(new URL("../plugins/eo-shorts/panel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(panel, /__DI__|hostDI|existsSync|statSync|mkdirSync|parent\.location/);
  assert.match(panel, /withPanelLocalClient\(EoShortsPanel\)/);
  assert.match(panel, /selects\.stock\.searchVideos/);
  assert.match(panel, /selects\.generation\.submit/);
});
