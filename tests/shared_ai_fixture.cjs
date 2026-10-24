const { createSharedAiJobClient } = require('../shared/ai-job-client.cjs');
const assert = require('node:assert/strict');
const resourceId = 'ee44b47f-3537-41be-a64f-92262c58a3a3';
const request = { task: 'faces.detect', resourceId, sourceRange: { startSeconds: 2, endSeconds: 3 }, options: { provider: 'cpu' } };
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
function fixture(states = ['succeeded'], makeClient = createSharedAiJobClient) {
  let journal = null, submissions = 0, nextId = 0;
  const jobs = new Map(), keys = new Map(), hooks = {}, calls = { submit:0, status:0, cancel:0, result:0 };
  const env = {
    projectId: 'project', scope: 'plugin:persistent-run', pollMs: 0, readRetryMs: 0,
    load: async () => { if (hooks.load) return hooks.load(); return copy(journal); },
    save: async value => { if (hooks.save) await hooks.save(value); journal = copy(value); },
    runScript: async (script, summary, effect) => {
      const ai = {
        submit: async input => { calls.submit++;
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
            status: async () => { calls.status++;
              if (hooks.status) await hooks.status();
              job.current = job.statuses.length ? job.statuses.shift() : job.current;
              return row();
            },
            cancel: async () => { calls.cancel++; if(hooks.cancel)await hooks.cancel(); job.current = hooks.cancelStatus ?? 'canceled'; job.statuses = []; return row(); },
            result: async () => { calls.result++; return hooks.result ? hooks.result(job, workflowId) : ({ workflowId, task: job.input.task, files: { detections: { workflowId, file: 'detections.json' } } }); },
          };
        },
      };
      return new (Object.getPrototypeOf(async function () {}).constructor)('selects', script)({ ai });
    },
  };
  return { env, hooks, calls, make: () => makeClient(env), get journal() { return copy(journal); }, set journal(value) { journal = copy(value); }, get submissions() { return submissions; }, jobs };
}
module.exports={fixture,request,resourceId,copy};
