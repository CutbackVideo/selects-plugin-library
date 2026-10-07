// The same embedded consumer source runs here; no model or private app DI is mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes, createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {cwSharedFaces, cwCancelSharedFaces} from '../plugins/chris-williamson-style/src/sharedFaces.ts';

const pid = 'project', rid = '430133ea-6ef6-4bb9-bfea-94d77b8a2004', journalPath = '/scratch/shared-faces.json';
const samples = (fps = 24000 / 1001) => [12, 14, 16].map((seconds, i) => ({
  key: 'clip:' + [0.25, 0.5, 0.75][i], groupKey: 'clip', resourceId: rid, seconds,
  sourceFps: fps, sourceDurationSeconds: 60.019, frameSize: {width: 1000, height: 500},
}));
const waitOptions = {pollMs: 0};
const code = expected => error => error.code === expected;

function host(options = {}) {
  const files = new Map(), jobs = new Map(), calls = [], writes = [];
  let loseAck = !!options.loseAck, readCount = 0, cancelCount = 0;
  const snapshot = job => ({
    workflowId: job.workflowId, projectId: pid, resourceId: 'r0', runtimeId: 'selects-ai-runtime', task: 'faces.detect',
    status: job.status, progress: job.status === 'running' ? 0.5 : undefined, lastErrorMessage: 'simulated failure',
  });
  const faceResult = job => {
    const input = job.input, record = JSON.parse(files.get(journalPath)).records.find(r => r.input.requestKey === input.requestKey);
    const fps = record.samples[0].sourceFps;
    const result = {
      contractVersion: 1, task: 'faces.detect', coordinateSpace: 'display-pixels', boxFormat: 'xyxy',
      frameSize: {width: 1000, height: 500},
      parameters: {...input.options, sourceRange: input.sourceRange},
      samples: record.samples.map((s, i) => ({
        index: i * 48, sourceTimeSeconds: Math.ceil(s.seconds * fps - 1e-9) / fps,
        faces: options.noFaces ? [] : [
          {score: 0.99, box: {xmin: 100, ymin: 100, xmax: 200, ymax: 200}},
          {score: 0.81, box: {xmin: 400, ymin: 50, xmax: 800, ymax: 350}},
        ],
      })),
    };
    options.mutateResult?.(result, job);
    return result;
  };
  const sdk = {ai: {
    async submit(input) {
      assert.equal(calls.at(-1).effect, true);
      const saved = JSON.parse(files.get(journalPath)).records.find(r => r.input.requestKey === input.requestKey);
      assert.deepEqual(saved.input, input, 'persist request before the first side effect');
      let job = jobs.get(input.requestKey);
      if (!job) {
        job = {input: structuredClone(input), workflowId: 'workflow-' + jobs.size, status: options.initialStatus || 'succeeded'};
        jobs.set(input.requestKey, job);
      }
      await options.onSubmit?.(job);
      if (loseAck) { loseAck = false; throw Object.assign(new Error('submission acknowledgement lost'), {code: 'AI_SUBMIT_OUTCOME_UNKNOWN'}); }
      return {workflowId: job.workflowId};
    },
    job(id, projectId) {
      assert.equal(projectId, pid);
      const job = [...jobs.values()].find(j => j.workflowId === id);
      assert.ok(job, 'only the accepted workflow is observed');
      return {
        async status() {
          if (job.cancelCountdown) {
            job.cancelCountdown--;
            if (!job.cancelCountdown) job.status = 'canceled';
          }
          await options.onStatus?.(job);
          const value = snapshot(job);
          options.mutateStatus?.(value);
          return value;
        },
        async cancel() {
          assert.equal(calls.at(-1).effect, true);
          const saved = JSON.parse(files.get(journalPath)).records.find(r => r.workflowId === id);
          assert.equal(saved.cancelRequested, true, 'cancel intent precedes cancellation');
          cancelCount++;
          if (options.cancelWinsAfterSuccess) job.status = 'succeeded';
          else { job.status = 'canceling'; job.cancelCountdown = 2; }
          return snapshot(job);
        },
        async result() {
          assert.equal(job.status, 'succeeded');
          assert.equal(calls.at(-1).effect, false);
          return {task: 'faces.detect', files: {detections: {id: job.workflowId}}};
        },
      };
    },
    async readJSON(file, projectId) {
      assert.equal(projectId, pid);
      readCount++;
      return faceResult([...jobs.values()].find(j => j.workflowId === file.id));
    },
  }};
  const env = {
    async readText(path) {
      if (!files.has(path)) throw new Error('ENOENT');
      return files.get(path);
    },
    async writeText(path, text) {
      options.onWrite?.(text);
      files.set(path, text); writes.push(JSON.parse(text));
    },
    async runScript(script, summary, effect = false) {
      calls.push({script, summary, effect});
      const source = stripTypeScriptTypes('async function operation(selects:any) {\n' + script + '\n}');
      return new Function('selects', source + '\nreturn operation(selects);')(sdk);
    },
  };
  return {env, files, jobs, calls, writes, sdk, get readCount() {return readCount;}, get cancelCount() {return cancelCount;},
    journal() {return JSON.parse(files.get(journalPath));}};
}

test('three quarter points share one bounded source-clock job; faces preserve largest-first normalized Vision shape', async () => {
  const h = host(), rows = samples(), out = await cwSharedFaces(h.env, pid, journalPath, rows, waitOptions);
  assert.equal(h.jobs.size, 1);
  const input = [...h.jobs.values()][0].input;
  assert.equal(input.sourceRange.startSeconds, 12);
  assert.equal(input.sourceRange.endSeconds, 16 + 1.5 / rows[0].sourceFps);
  assert.equal(input.options.sampleEverySeconds, 2);
  assert.equal(input.resourceId, rid);
  assert.deepEqual(Object.keys(out.detected), rows.map(s => s.key));
  assert.deepEqual(out.detected[rows[0].key], {w: 1000, h: 500, faces: [[0.4, 0.1, 0.4, 0.6], [0.1, 0.2, 0.1, 0.2]]});
  assert.equal(out.sampled, 3); assert.equal(out.readable, 3);
  assert.ok(h.calls.filter(c => c.script.includes('.status()') || c.script.includes('.result()')).every(c => !c.effect));
});

test('an empty face list is a valid measured frame, including replay of the successful workflow', async () => {
  const h = host({noFaces: true});
  const first = await cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions);
  assert.deepEqual(first.detected['clip:0.25'].faces, []);
  const second = await cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions);
  assert.deepEqual(second, first); assert.equal(h.jobs.size, 1);
  assert.equal(h.calls.filter(c => c.script.includes('ai.submit(')).length, 1);
});

test('first-run face analysis creates its journal through the canonical file reader and reuses it on reopen', async () => {
  const h = host(), fileCalls = [];
  h.sdk.files = {
    async environment() { return {platform: 'darwin', homedir: '/user', tempDirectory: '/tmp'}; },
    async stat(filename) {
      fileCalls.push(['stat', filename]);
      return h.files.has(filename) ? {size: Buffer.byteLength(h.files.get(filename))} : null;
    },
    async readRange({path: filename, offset, length}) {
      fileCalls.push(['readRange', filename]);
      const bytes = Buffer.from(h.files.get(filename)).subarray(offset, offset + length);
      return {base64: bytes.toString('base64'), bytesRead: bytes.length};
    },
  };
  const source = fs.readFileSync(new URL('../shared/local-client.ts', import.meta.url), 'utf8')
    .replace(/^import React from "react";\n/, '').replace(/^export \{[^\n]+\};?\s*$/m, '');
  const context = vm.createContext({React: {}, atob, btoa, Uint8Array, TextEncoder, TextDecoder});
  vm.runInContext(stripTypeScriptTypes(source, {mode: 'strip'}) + '\nthis.createClient=createPanelLocalClient;', context);
  const client = await context.createClient({runScript: async ({script, summary, allowCommit}) =>
    ({isError: false, result: await h.env.runScript(script, summary, allowCommit)})});
  const env = {...h.env, readText: filename => client.files.readFile(filename, 'utf8')};
  await assert.rejects(env.readText(journalPath), {message: 'The file is unavailable.'});
  const first = await cwSharedFaces(env, pid, journalPath, samples(), waitOptions);
  const second = await cwSharedFaces(env, pid, journalPath, samples(), waitOptions);
  assert.deepEqual(second, first);
  assert.equal(h.jobs.size, 1);
  assert.equal(h.calls.filter(c => c.script.includes('ai.submit(')).length, 1);
  assert.equal(h.journal().records[0].status, 'succeeded');
  assert.ok(fileCalls.some(([method]) => method === 'readRange'), 'the saved journal is reread through the canonical client');
});

for (const message of ['EACCES: permission denied', 'The file changed while it was being read.', 'The file could not be fully read.']) {
  test('a journal read failure preserves the existing record: ' + message, async () => {
    const h = host();
    h.files.set(journalPath, 'existing journal');
    const env = {...h.env, readText: async () => { throw new Error(message); }};
    await assert.rejects(cwSharedFaces(env, pid, journalPath, samples(), waitOptions), {message});
    assert.equal(h.files.get(journalPath), 'existing journal');
    assert.equal(h.calls.length, 0);
    assert.equal(h.writes.length, 0);
  });
}

test('very short sample spacing uses separate one-frame requests instead of fabricating three observations', async () => {
  const h = host();
  const rows = samples(30).map((s, i) => ({...s, seconds: 1 + i * 0.01}));
  const out = await cwSharedFaces(h.env, pid, journalPath, rows, waitOptions);
  assert.equal(h.jobs.size, 3); assert.equal(out.readable, 3);
  for (const job of h.jobs.values()) assert.ok(job.input.options.sampleEverySeconds > job.input.sourceRange.endSeconds - job.input.sourceRange.startSeconds);
});

test('a single near-end sample clamps its interval to the source duration', async () => {
  const h = host(), row = {...samples(30)[0], seconds: 19.96, sourceDurationSeconds: 20};
  await cwSharedFaces(h.env, pid, journalPath, [row], waitOptions);
  assert.equal([...h.jobs.values()][0].input.sourceRange.endSeconds, 20);
});

for (const [name, mutate] of [
  ['run-local Resource alias', s => s.resourceId = 'r0'],
  ['nonfinite source time', s => s.seconds = NaN],
  ['zero source FPS', s => s.sourceFps = 0],
  ['past the source end', s => s.seconds = s.sourceDurationSeconds],
  ['invalid display dimensions', s => s.frameSize.width = -1],
  ['prototype sample key', s => s.key = '__proto__'],
]) test('rejects ' + name + ' before persistence or SDK effects', async () => {
  const h = host(), rows = samples(); mutate(rows[0]);
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, rows), code('CW_FACE_CONTRACT_INVALID'));
  assert.equal(h.calls.length, 0); assert.equal(h.writes.length, 0);
});

test('unknown submission acknowledgement reopens with the same request key, including explicit retry intent', async () => {
  const h = host({loseAck: true});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions), code('AI_SUBMIT_OUTCOME_UNKNOWN'));
  const before = h.journal().records[0];
  assert.equal(before.workflowId, undefined);
  await cwSharedFaces(h.env, pid, journalPath, samples(), {...waitOptions, retryTerminal: true});
  assert.equal(h.jobs.size, 1);
  assert.equal(h.journal().records[0].input.requestKey, before.input.requestKey);
  assert.equal(h.journal().records[0].workflowId, 'workflow-0');
});

test('an ACK persistence failure also recovers the accepted job without a new request', async () => {
  let fail = true;
  const h = host({onWrite(text) {
    if (fail && JSON.parse(text).records[0]?.workflowId) { fail = false; throw new Error('disk write interrupted'); }
  }});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions), /disk write interrupted/);
  assert.equal(h.journal().records[0].workflowId, undefined);
  await cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions);
  assert.equal(h.jobs.size, 1);
});

test('closing during submit detaches without cancellation; reopening recovers the pending ACK', async () => {
  const controller = new AbortController();
  const h = host({onSubmit() {controller.abort();}});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples(), {signal: controller.signal}), code('CW_FACE_DETACHED'));
  assert.equal(h.journal().records[0].workflowId, undefined);
  assert.equal(h.cancelCount, 0);
  await cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions);
  assert.equal(h.jobs.size, 1); assert.equal(h.cancelCount, 0);
});

test('closing during status observation stops result reads and does not submit or cancel on reopen', async () => {
  const controller = new AbortController();
  const h = host({onStatus() {controller.abort();}});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples(), {signal: controller.signal}), code('CW_FACE_DETACHED'));
  assert.equal(h.readCount, 0); assert.equal(h.cancelCount, 0);
  await cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions);
  assert.equal(h.jobs.size, 1); assert.equal(h.readCount, 1);
});

test('explicit cancellation recovers an uncertain ACK, saves intent, and waits for the terminal Main snapshot', async () => {
  const h = host({loseAck: true, initialStatus: 'running'});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('AI_SUBMIT_OUTCOME_UNKNOWN'));
  assert.deepEqual(await cwCancelSharedFaces(h.env, pid, journalPath), {canceled: 1});
  assert.equal(h.jobs.size, 1); assert.equal(h.cancelCount, 1);
  assert.equal(h.journal().records[0].status, 'canceled');
  assert.equal(h.journal().records[0].cancelRequested, true);
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('CW_FACE_CANCELED'));
  assert.equal(h.jobs.size, 1); assert.equal(h.readCount, 0);
});

test('explicit restart refreshes a saved canceling record to terminal before minting a new key', async () => {
  const h = host({loseAck: true});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('AI_SUBMIT_OUTCOME_UNKNOWN'));
  const journal = h.journal(), old = journal.records[0], job = [...h.jobs.values()][0];
  old.workflowId = job.workflowId; old.status = 'canceling'; old.cancelRequested = true;
  job.status = 'canceling'; job.cancelCountdown = 2;
  h.files.set(journalPath, JSON.stringify(journal));
  await cwSharedFaces(h.env, pid, journalPath, samples(), {...waitOptions, retryTerminal: true});
  assert.equal(h.jobs.size, 2);
  const saved = h.journal().records;
  assert.equal(saved[0].status, 'canceled'); assert.equal(saved[1].attempt, 1);
  assert.notEqual(saved[0].input.requestKey, saved[1].input.requestKey);
});

for (const missingAck of [false, true]) test('Resume replays saved cancel intent before starting a new attempt' + (missingAck ? ' after ACK loss' : ''), async () => {
  let h;
  h = host({loseAck: true, onSubmit(job) {
    if (job.workflowId === 'workflow-0') job.status = 'running';
    else {
      assert.equal([...h.jobs.values()][0].status, 'canceled', 'the prior workflow must stop before a new key is submitted');
      assert.equal(h.journal().records[0].status, 'canceled', 'persist the terminal snapshot before submitting the next attempt');
    }
  }, onStatus(job) {
    assert.notEqual(job.status, 'running', 'saved intent must resend cancel() rather than only poll a running job');
  }});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('AI_SUBMIT_OUTCOME_UNKNOWN'));
  const journal = h.journal(), old = journal.records[0], first = [...h.jobs.values()][0];
  old.cancelRequested = true; old.status = 'running';
  if (!missingAck) old.workflowId = first.workflowId;
  h.files.set(journalPath, JSON.stringify(journal));
  assert.equal(h.cancelCount, 0);
  await cwSharedFaces(h.env, pid, journalPath, samples(), {...waitOptions, retryTerminal: true});
  assert.equal(h.cancelCount, 1); assert.equal(h.jobs.size, 2);
  const saved = h.journal().records;
  assert.equal(saved[0].workflowId, first.workflowId);
  assert.equal(saved[0].status, 'canceled'); assert.equal(saved[1].attempt, 1);
  assert.notEqual(saved[0].input.requestKey, saved[1].input.requestKey);
});

test('cancel intent still detaches a job that finishes before the cancel reply; explicit restart is not stuck', async () => {
  const h = host({loseAck: true, cancelWinsAfterSuccess: true});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('AI_SUBMIT_OUTCOME_UNKNOWN'));
  await cwCancelSharedFaces(h.env, pid, journalPath);
  assert.equal(h.journal().records[0].status, 'succeeded');
  assert.equal(h.journal().records[0].cancelRequested, true);
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('CW_FACE_CANCELED'));
  assert.equal(h.readCount, 0);
  await cwSharedFaces(h.env, pid, journalPath, samples(), {...waitOptions, retryTerminal: true});
  assert.equal(h.jobs.size, 2); assert.equal(h.readCount, 1);
});

test('concurrent observer and explicit cancel preserve the saved intent and never read a late result', async () => {
  let canceled = false, h;
  h = host({initialStatus: 'running', async onStatus(job) {
    if (!canceled) {
      canceled = true;
      await cwCancelSharedFaces(h.env, pid, journalPath);
      assert.equal(job.status, 'canceled');
    }
  }});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions), code('CW_FACE_CANCELED'));
  assert.equal(h.journal().records[0].cancelRequested, true);
  assert.equal(h.journal().records[0].status, 'canceled');
  assert.equal(h.readCount, 0); assert.equal(h.cancelCount, 1);
});

test('a failed job does not rerun until an explicit restart, and keeps the failed attempt as evidence', async () => {
  const h = host(); let failFirst = true;
  h.sdk.ai.submit = ((submit) => async input => {
    const ack = await submit(input);
    if (failFirst) { [...h.jobs.values()][0].status = 'failed'; failFirst = false; }
    return ack;
  })(h.sdk.ai.submit);
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('CW_FACE_FAILED'));
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('CW_FACE_FAILED'));
  assert.equal(h.jobs.size, 1);
  await cwSharedFaces(h.env, pid, journalPath, samples(), {...waitOptions, retryTerminal: true});
  assert.equal(h.jobs.size, 2); assert.equal(h.journal().records[0].status, 'failed');
});

test('foreign or corrupt journals cannot be replaced by a new submission', async () => {
  for (const bad of ['not JSON', JSON.stringify({version: 1, projectId: 'another-project', records: []})]) {
    const h = host(); h.files.set(journalPath, bad);
    await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('CW_FACE_CONTRACT_INVALID'));
    assert.equal(h.calls.length, 0); assert.equal(h.files.get(journalPath), bad);
  }
});

test('saved input tampering rejects before observing or submitting an accepted workflow', async () => {
  const h = host(); await cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions);
  const journal = h.journal(); journal.records[0].input.sourceRange.startSeconds++;
  h.files.set(journalPath, JSON.stringify(journal)); const calls = h.calls.length;
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('CW_FACE_CONTRACT_INVALID'));
  assert.equal(h.calls.length, calls);
});

for (const [name, mutate] of [
  ['wrong coordinate convention', r => r.boxFormat = 'xywh'],
  ['wrong source kind', r => r.sourceKind = 'image'],
  ['wrong display size', r => r.frameSize.width = 1920],
  ['changed source range', r => r.parameters.sourceRange = {startSeconds: 0, endSeconds: 1}],
  ['changed cadence', r => r.parameters.sampleEverySeconds = 0.5],
  ['missing observation', r => r.samples.pop()],
  ['out-of-order source time', r => r.samples[1].sourceTimeSeconds = r.samples[0].sourceTimeSeconds],
  ['wrong sample position', r => r.samples[1].sourceTimeSeconds += 1],
  ['repeated decoder index', r => r.samples[1].index = r.samples[0].index],
  ['off-raster face box', r => r.samples[0].faces[0].box.xmax = 1001],
  ['nonfinite face box', r => r.samples[0].faces[0].box.ymin = NaN],
  ['unbounded face collection', r => r.samples[0].faces = Array(65).fill(r.samples[0].faces[0])],
]) test('rejects ' + name + ' instead of returning misleading framing', async () => {
  const h = host({mutateResult: mutate});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions), code('CW_FACE_CONTRACT_INVALID'));
});

test('a workflow identity mismatch cannot supply faces for the current Project', async () => {
  const h = host({mutateStatus: s => s.projectId = 'other-project'});
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('CW_FACE_CONTRACT_INVALID'));
  assert.equal(h.readCount, 0);
});

test('host unavailability is distinguished from a transport failure or an inference failure', async () => {
  const h = host(); h.env.runScript = async () => {throw Object.assign(new Error('AI_UPDATE_REQUIRED: update the host'), {code: 'AI_UPDATE_REQUIRED'});};
  await assert.rejects(cwSharedFaces(h.env, pid, journalPath, samples()), code('CW_AI_UNAVAILABLE'));
  assert.equal(h.journal().records[0].workflowId, undefined);
});

// In the app checkout this also checks the exact scripts against the real public declaration files.
// A standalone Library CI checkout has no TypeScript dependency or app declarations.
const client = process.env.SELECTS_CLIENT_REPO || path.join(os.homedir(), 'job/repo/cutback-client');
const declarations = path.join(client, 'electron/mcp/script-runtime/sdk-declarations');
const hasAiDeclarations = fs.existsSync(path.join(declarations, 'core.d.ts')) && /ai:\s*AiService/.test(fs.readFileSync(path.join(declarations, 'core.d.ts'), 'utf8'));
let ts;
try {ts = createRequire(import.meta.url)(path.join(client, 'node_modules/typescript'));} catch { /* standalone Library checkout */ }
test('embedded consumer and emitted submit/status/result/cancel scripts typecheck against the public SDK',
  {skip: !ts || !hasAiDeclarations ? 'AI-enabled app checkout and TypeScript are needed (SELECTS_CLIENT_REPO)' : false}, async () => {
    const h = host(); await cwSharedFaces(h.env, pid, journalPath, samples(), waitOptions);
    const job = [...h.jobs.values()][0], journal = h.journal();
    job.status = 'running'; journal.records[0].status = 'running'; h.files.set(journalPath, JSON.stringify(journal));
    await cwCancelSharedFaces(h.env, pid, journalPath);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chris-shared-faces-types-'));
    try {
      const scripts = [...new Set(h.calls.map(c => c.script))].map((script, i) => {
        const file = path.join(tmp, 'script-' + i + '.ts');
        fs.writeFileSync(file, 'export {};\nasync function run() {\n' + script + '\n}\n');
        return file;
      });
      const files = fs.readdirSync(declarations).filter(f => f.endsWith('.d.ts')).map(f => path.join(declarations, f));
      files.push(path.resolve(import.meta.dirname, '../plugins/chris-williamson-style/src/sharedFaces.ts'), ...scripts);
      const program = ts.createProgram(files, {noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
      const errors = ts.getPreEmitDiagnostics(program);
      assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors,
        {getCurrentDirectory: () => tmp, getCanonicalFileName: n => n, getNewLine: () => '\n'}));
    } finally {fs.rmSync(tmp, {recursive: true, force: true});}
  });
