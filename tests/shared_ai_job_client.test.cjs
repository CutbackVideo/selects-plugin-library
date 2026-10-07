const test = require('node:test');
const assert = require('node:assert/strict');
const { createSharedAiJobClient } = require('../shared/ai-job-client.cjs');
const resourceId = 'ee44b47f-3537-41be-a64f-92262c58a3a3';
const request = { task: 'faces.detect', resourceId, sourceRange: { startSeconds: 2, endSeconds: 3 }, options: { provider: 'cpu' } };
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
function fixture(states = ['succeeded']) {
  let journal = null, submissions = 0, nextId = 0;
  const jobs = new Map(), keys = new Map(), hooks = {};
  const env = {
    projectId: 'project', scope: 'plugin:persistent-run', pollMs: 0,
    load: async () => { if (hooks.load) return hooks.load(); return copy(journal); },
    save: async value => { if (hooks.save) await hooks.save(value); journal = copy(value); },
    runScript: async (script, summary, effect) => {
      const ai = {
        submit: async input => {
          if (keys.has(input.requestKey)) return { workflowId: keys.get(input.requestKey) };
          const workflowId = 'ai:' + ++nextId; submissions++; keys.set(input.requestKey, workflowId);
          jobs.set(workflowId, { input, statuses: [...states], current: 'queued' });
          if (hooks.afterSubmit) await hooks.afterSubmit();
          return { workflowId };
        },
        job: (workflowId, projectId) => {
          const job = jobs.get(workflowId);
          assert(job); assert.equal(projectId, 'project');
          const row = () => ({ workflowId, projectId, runtimeId: 'selects-ai-runtime', task: job.input.task, status: job.current });
          return {
            status: async () => {
              if (hooks.status) await hooks.status();
              job.current = job.statuses.length ? job.statuses.shift() : job.current;
              return row();
            },
            cancel: async () => { job.current = hooks.cancelStatus ?? 'canceled'; job.statuses = []; return row(); },
            result: async () => hooks.result ? hooks.result(job, workflowId) : ({ workflowId, task: job.input.task, files: { detections: { workflowId, file: 'detections.json' } } }),
          };
        },
      };
      return new (Object.getPrototypeOf(async function () {}).constructor)('selects', script)({ ai });
    },
  };
  return { env, hooks, make: () => createSharedAiJobClient(env), get journal() { return copy(journal); }, set journal(value) { journal = copy(value); }, get submissions() { return submissions; }, jobs };
}
test('first run persists identity and reopening reads the same completed job', async () => {
  const f = fixture(); const first = await f.make().run(request);
  assert.equal(f.journal.records[0].status, 'succeeded');
  assert.deepEqual(await f.make().run(request), first); assert.equal(f.submissions, 1);
});
test('lost submission acknowledgment recovers through the original idempotency key', async () => {
  const f = fixture(); let once = true;
  f.hooks.afterSubmit = () => { if (once) { once = false; throw new Error('transport interrupted'); } };
  await assert.rejects(f.make().run(request), /transport interrupted/);
  assert.equal(f.journal.records.length, 1); assert.equal(f.journal.records[0].workflowId, undefined);
  await f.make().run(request); assert.equal(f.submissions, 1);
});
test('status transport failure keeps the acknowledged identity', async () => {
  const f = fixture(); let once = true;
  f.hooks.status = () => { if (once) { once = false; throw new Error('status offline'); } };
  await assert.rejects(f.make().run(request), /status offline/);
  assert.equal(f.journal.records[0].workflowId, 'ai:1');
  await f.make().run(request); assert.equal(f.submissions, 1);
});
test('panel detach preserves ACK and does not cancel inference', async () => {
  const f = fixture(), controller = new AbortController();
  f.hooks.afterSubmit = () => controller.abort();
  await assert.rejects(f.make().run(request, { signal: controller.signal }), { code: 'SHARED_AI_DETACHED' });
  assert.equal(f.journal.records[0].workflowId, 'ai:1'); assert.equal(f.journal.records[0].cancelRequested, false);
  delete f.hooks.afterSubmit; await f.make().run(request); assert.equal(f.submissions, 1);
});
test('explicit cancel is persisted and explicit retry gets a new attempt', async () => {
  const f = fixture(['running']), controller = new AbortController(), client = f.make();
  await assert.rejects(client.run(request, { identity: 'shot:1', signal: controller.signal, onProgress: () => controller.abort() }), { code: 'SHARED_AI_DETACHED' });
  await client.cancel({ identity: 'shot:1' });
  assert.equal(f.journal.records[0].cancelRequested, true); assert.equal(f.journal.records[0].status, 'canceled');
  await assert.rejects(f.make().run(request, { identity: 'shot:1' }), { code: 'SHARED_AI_CANCELED' });
  f.hooks.status = () => { for (const job of f.jobs.values()) if (job.current === 'queued') job.statuses = ['succeeded']; };
  await f.make().run(request, { identity: 'shot:1', retryTerminal: true });
  assert.equal(f.submissions, 2); assert.equal(f.journal.records[1].attempt, 1);
});
test('failed jobs remain failed until explicitly retried', async () => {
  const f = fixture(['failed']);
  await assert.rejects(f.make().run(request), { code: 'SHARED_AI_FAILED' });
  await assert.rejects(f.make().run(request), { code: 'SHARED_AI_FAILED' });
  assert.equal(f.submissions, 1);
  f.hooks.status = () => { for (const job of f.jobs.values()) if (job.current === 'queued') job.statuses = ['succeeded']; };
  await f.make().run(request, { retryTerminal: true }); assert.equal(f.submissions, 2);
});
test('explicit retry recovers when inference finishes before a saved cancel request', async () => {
  const f = fixture(['running']), controller = new AbortController();
  await assert.rejects(f.make().run(request, { signal: controller.signal, onProgress: () => controller.abort() }), { code: 'SHARED_AI_DETACHED' });
  f.hooks.cancelStatus = 'succeeded';
  await f.make().cancel();
  assert.equal(f.journal.records[0].status, 'succeeded');
  assert.equal(f.journal.records[0].cancelRequested, true);
  await assert.rejects(f.make().run(request), { code: 'SHARED_AI_CANCELED' });
  f.hooks.status = () => { for (const job of f.jobs.values()) if (job.current === 'queued') job.statuses = ['succeeded']; };
  await f.make().run(request, { retryTerminal: true });
  assert.equal(f.submissions, 2); assert.equal(f.journal.records[1].attempt, 1);
});
for (const outcome of ['failed', 'canceled']) test('one explicit retry refreshes a stale running journal after Main becomes ' + outcome, async () => {
  const f = fixture(['running']), controller = new AbortController();
  await assert.rejects(f.make().run(request, { signal: controller.signal, onProgress: () => controller.abort() }), { code: 'SHARED_AI_DETACHED' });
  assert.equal(f.journal.records[0].status, 'running');
  f.jobs.get('ai:1').statuses = [outcome];
  f.hooks.status = () => { for (const job of f.jobs.values()) if (job.current === 'queued') job.statuses = ['succeeded']; };
  const recovered = await f.make().run(request, { retryTerminal: true });
  assert.equal(recovered.workflowId, 'ai:2'); assert.equal(f.submissions, 2);
});
test('a newly submitted job failing during an explicit attempt is not automatically retried', async () => {
  const f = fixture(['failed']);
  await assert.rejects(f.make().run(request, { retryTerminal: true }), { code: 'SHARED_AI_FAILED' });
  assert.equal(f.submissions, 1); assert.equal(f.journal.records.length, 1);
});
test('concurrent requests keep both records without overwriting', async () => {
  const f = fixture(); await Promise.all([f.make().run(request, { identity: 'a' }), f.make().run(request, { identity: 'b' })]);
  assert.equal(f.journal.records.length, 2); assert.equal(f.submissions, 2);
});
test('same concurrent request uses one Main job', async () => {
  const f = fixture(); const values = await Promise.all([f.make().run(request), f.make().run(request)]);
  assert.equal(f.journal.records.length, 1); assert.equal(f.submissions, 1); assert.deepEqual(values[0], values[1]);
});
test('foreign journal and changed result ownership reject', async () => {
  const f = fixture(); f.journal = { version: 1, projectId: 'foreign', scope: f.env.scope, records: [] };
  await assert.rejects(f.make().run(request), { code: 'SHARED_AI_INVALID' }); assert.equal(f.submissions, 0);
  f.journal = null; f.hooks.result = () => ({ workflowId: 'foreign', task: 'faces.detect', files: {} });
  await assert.rejects(f.make().run(request), { code: 'SHARED_AI_INVALID' });
});
test('missing canonical file starts clean, but permission or corrupt reads cannot overwrite', async () => {
  const f = fixture(); let first = true;
  f.hooks.load = () => { if (first) { first = false; throw new Error('The file is unavailable.'); } return f.journal; };
  await f.make().run(request); assert.equal(f.submissions, 1);
  for (const message of ['EACCES', 'file changed while reading']) {
    f.hooks.load = () => { throw new Error(message); };
    await assert.rejects(f.make().run(request), new RegExp(message));
  }
  f.hooks.load = () => '{broken'; await assert.rejects(f.make().run(request), { code: 'SHARED_AI_INVALID' });
  assert.equal(f.submissions, 1);
});
test('image/object/animal requests use the same RVM task without a person-only gate', async () => {
  const f = fixture();
  const value = await f.make().run({ task: 'person.matte', resourceId, options: { provider: 'auto', outputMode: 'alpha-frames', alphaEncoding: 'grayscale-png-8bit' } }, { identity: 'animal-photo' });
  assert.equal(value.input.task, 'person.matte'); assert.equal(value.input.sourceRange, undefined);
  assert.equal(value.result.task, 'person.matte');
});
test('short ids and invalid clocks cannot submit', async () => {
  const f = fixture();
  for (const bad of [{ ...request, resourceId: 'r0' }, { ...request, sourceRange: { startSeconds: 5, endSeconds: 2 } }]) await assert.rejects(f.make().run(bad), { code: 'SHARED_AI_INVALID' });
  assert.equal(f.submissions, 0);
});
