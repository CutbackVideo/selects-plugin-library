// Plugin-private durable orchestration of the existing public AI SDK.
// This module is bundled into panels; it has no Node or renderer-global dependencies.
const STATUS = new Set(['queued', 'running', 'canceling', 'succeeded', 'failed', 'canceled']);
const terminal = status => ['succeeded', 'failed', 'canceled'].includes(status);
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const writes = new Map();
const error = (code, message) => Object.assign(new Error(message), { code });
const invalid = () => error('SHARED_AI_INVALID', 'Saved AI analysis does not match this source or task.');
const clone = value => JSON.parse(JSON.stringify(value));
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' || typeof value === 'number' && !Number.isFinite(value)) throw invalid();
  return JSON.stringify(value);
}
function attached(signal) {
  if (signal?.aborted) throw error('SHARED_AI_DETACHED', 'AI observation stopped. Reopen to recover the saved job.');
}
function inputFor(projectId, request) {
  if (!request || !['faces.detect', 'person.matte'].includes(request.task) || !UUID.test(request.resourceId)) throw invalid();
  const input = { runtimeId: 'selects-ai-runtime', projectId, resourceId: request.resourceId, task: request.task };
  if (request.sourceRange !== undefined) {
    const { startSeconds, endSeconds } = request.sourceRange || {};
    if (!Number.isFinite(startSeconds) || startSeconds < 0 || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) throw invalid();
    input.sourceRange = { startSeconds, endSeconds };
  }
  if (request.options !== undefined) {
    if (!request.options || Array.isArray(request.options) || typeof request.options !== 'object') throw invalid();
    stable(request.options); input.options = clone(request.options);
  }
  return input;
}
async function requestKey(scope, identity, input, attempt) {
  const withoutKey = { ...input }; delete withoutKey.requestKey;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable({ scope, identity, input: withoutKey, attempt })));
  return 'shared-ai-' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}
function createSharedAiJobClient(env) {
  const { projectId, scope, runScript, load, save } = env || {};
  if (typeof projectId !== 'string' || !projectId || typeof scope !== 'string' || !scope ||
      ![runScript, load, save].every(f => typeof f === 'function')) throw invalid();
  const storageKey = stable({ projectId, scope });
  const fresh = () => ({ version: 1, projectId, scope, records: [] });
  // Observe one saved job; timing out a read never cancels or resubmits it.
  // Use the monotonic clock when available, rather than the user's wall clock.
  function observation(options, cancel = false) {
    const timing = (value, fallback, max, zero = false) => {
      const n = value ?? fallback;
      if (!Number.isFinite(n) || n < (zero ? 0 : 1) || n > max) throw invalid();
      return n;
    };
    const maxWaitMs = timing(options.maxWaitMs ?? env.maxWaitMs, cancel ? 60000 : 1800000, 86400000);
    const pollMs = timing(options.pollMs ?? env.pollMs, 500, 60000, true);
    const readTimeoutMs = timing(options.readTimeoutMs ?? env.readTimeoutMs, 30000, 60000);
    const readRetryMs = timing(options.readRetryMs ?? env.readRetryMs, 500, 60000, true);
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? () => performance.now() : () => Date.now();
    const deadline = now() + maxWaitMs, signal = options.signal;
    const pending = (record, cause) => {
      const message = cancel ? 'AI cancellation could not be confirmed. Cancellation is saved; reopen to recover it.'
        : 'AI progress or results could not be confirmed. Reopen to recover the saved job.';
      return Object.assign(error(cancel ? 'SHARED_AI_CANCEL_PENDING' : 'SHARED_AI_OBSERVATION_PENDING', message),
        { publicMessage: message, workflowId: record?.workflowId, projectId, ...(cause === undefined ? {} : { cause }) });
    };
    const check = record => { attached(signal); if (now() >= deadline) throw pending(record); };
    // Late read replies are ignored. This helper is never used for a write.
    function wait(task, milliseconds, onTimeout) {
      return new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn, value) => {
          if (done) return;
          done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(value);
        };
        const abort = () => { try { attached(signal); } catch (cause) { finish(reject, cause); } };
        const timer = setTimeout(() => task ? finish(reject, onTimeout()) : finish(resolve), milliseconds);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) { abort(); return; }
        if (task) Promise.resolve().then(task).then(value => finish(resolve, value), cause => finish(reject, cause));
      });
    }
    async function pause(milliseconds, record) {
      check(record);
      const remaining = Math.max(0, deadline - now());
      await wait(null, Math.min(milliseconds, remaining));
      // Timers may round fractional milliseconds down. A capped delay consumes
      // the budget; do not squeeze another request into that rounding gap.
      if (milliseconds >= remaining) throw pending(record);
      check(record);
    }
    async function read(record, script, summary) {
      for (let attempt = 0; attempt < 3; attempt++) {
        check(record);
        let value;
        try {
          const remaining = Math.max(0, deadline - now());
          value = await wait(() => runScript(script, summary, false), Math.min(readTimeoutMs, remaining),
            () => readTimeoutMs >= remaining ? pending(record) : error('SHARED_AI_READ_TIMEOUT', 'The AI observation read timed out.'));
        } catch (cause) {
          if (['SHARED_AI_DETACHED','SHARED_AI_OBSERVATION_PENDING','SHARED_AI_CANCEL_PENDING'].includes(cause?.code)) throw cause;
          check(record);
          if (attempt === 2) throw pending(record, cause);
          await pause(Math.min(60000, readRetryMs * 2 ** attempt), record);
          continue;
        }
        check(record); return value;
      }
    }
    return { check, read, pause: record => pause(pollMs, record) };
  }
  async function read() {
    let journal;
    try { journal = await load(); }
    catch (cause) {
      if (String(cause?.message || cause).trim() === 'The file is unavailable.' || /ENOENT|not found|does not exist/i.test(String(cause?.message || cause))) journal = null;
      else throw cause;
    }
    if (journal == null) return fresh();
    if (typeof journal === 'string') { try { journal = JSON.parse(journal); } catch { throw invalid(); } }
    if (journal.version !== 1 || journal.projectId !== projectId || journal.scope !== scope || !Array.isArray(journal.records) || journal.records.length > 10000) throw invalid();
    const keys = new Set();
    for (const r of journal.records) {
      if (!r || typeof r.identity !== 'string' || !Number.isSafeInteger(r.attempt) || r.attempt < 0 || r.attempt > 255 ||
          !/^shared-ai-[\da-f]{64}$/.test(r.input?.requestKey) || keys.has(r.input.requestKey) ||
          (r.workflowId !== undefined && (typeof r.workflowId !== 'string' || !r.workflowId)) ||
          (r.status !== undefined && !STATUS.has(r.status)) || (r.cancelRequested !== undefined && typeof r.cancelRequested !== 'boolean')) throw invalid();
      const input = inputFor(projectId, r.input);
      if (stable({ ...input, requestKey: r.input.requestKey }) !== stable(r.input)) throw invalid();
      keys.add(r.input.requestKey);
    }
    return clone(journal);
  }
  async function update(record) {
    const prior = writes.get(storageKey) || Promise.resolve();
    const pending = prior.catch(() => {}).then(async () => {
      const journal = await read(), i = journal.records.findIndex(r => r.input.requestKey === record.input.requestKey), old = journal.records[i];
      if (old?.workflowId && record.workflowId && old.workflowId !== record.workflowId) throw invalid();
      const next = { ...old, ...record, cancelRequested: Boolean(old?.cancelRequested || record.cancelRequested) };
      if (old?.workflowId) next.workflowId = old.workflowId;
      if (old && terminal(old.status)) next.status = old.status;
      if (i < 0) journal.records.push(next); else journal.records[i] = next;
      await save(clone(journal)); Object.assign(record, next);
    });
    writes.set(storageKey, pending);
    try { await pending; } finally { if (writes.get(storageKey) === pending) writes.delete(storageKey); }
  }
  async function ack(record, signal) {
    if (record.workflowId) return;
    attached(signal);
    const value = await runScript(`if(typeof selects.ai?.submit!=='function')throw new Error('AI_UPDATE_REQUIRED');const j=await selects.ai.submit(${JSON.stringify(record.input)});return {workflowId:j.workflowId};`, 'Start shared AI analysis', true);
    if (typeof value?.workflowId !== 'string' || !value.workflowId) throw invalid();
    record.workflowId = value.workflowId;
    // Preserve an acknowledgment even when a panel detached during submit.
    await update(record); attached(signal);
  }
  async function status(record, observer, cancel = false) {
    observer.check(record);
    const script = `return await selects.ai.job(${JSON.stringify(record.workflowId)},${JSON.stringify(projectId)}).${cancel ? 'cancel' : 'status'}();`;
    // A cancellation is a write, so its transport failure is never retried here.
    const value = cancel ? await runScript(script, 'Cancel shared AI analysis', true)
      : await observer.read(record, script, 'Read shared AI progress');
    if (value?.workflowId !== record.workflowId || value.projectId !== projectId || value.runtimeId !== 'selects-ai-runtime' || value.task !== record.input.task || !STATUS.has(value.status)) throw invalid();
    record.status = value.status; await update(record); return value;
  }
  async function stop(record, options, observer) {
    record.cancelRequested = true; await update(record); await ack(record, options.signal);
    if (!terminal(record.status)) await status(record, observer, true);
    while (!terminal(record.status)) {
      await observer.pause(record);
      await status(record, observer);
    }
  }
  async function run(request, options = {}) {
    attached(options.signal);
    const observer = observation(options);
    const input = inputFor(projectId, request), identity = options.identity ?? '';
    if (typeof identity !== 'string') throw invalid();
    const journal = await read();
    let record = journal.records.filter(r => r.identity === identity && stable(inputFor(projectId, r.input)) === stable(input)).sort((a, b) => b.attempt - a.attempt)[0];
    if (record && record.input.requestKey !== await requestKey(scope, identity, input, record.attempt)) throw invalid();
    // A detached panel can have saved 'running' while Main has since stopped.
    // Refresh only during recovery; failure of a newly submitted job is not retried.
    if (record?.workflowId && options.retryTerminal) {
      attached(options.signal); await status(record, observer); attached(options.signal);
    }
    if (record && options.retryTerminal && record.cancelRequested && !terminal(record.status)) await stop(record, options, observer);
    if (!record || options.retryTerminal && (['failed', 'canceled'].includes(record.status) || record.cancelRequested && terminal(record.status))) {
      const attempt = record ? record.attempt + 1 : 0;
      if (attempt > 255) throw invalid();
      record = { identity, attempt, input: { ...input, requestKey: await requestKey(scope, identity, input, attempt) } };
      await update(record);
    }
    await ack(record, options.signal);
    for (;;) {
      attached(options.signal);
      const latest = (await read()).records.find(r => r.input.requestKey === record.input.requestKey);
      if (!latest) throw invalid(); Object.assign(record, latest);
      const value = await status(record, observer, record.cancelRequested && !terminal(record.status));
      attached(options.signal);
      if (record.cancelRequested || record.status === 'canceled') throw error('SHARED_AI_CANCELED', 'AI analysis was canceled. Start again to retry.');
      if (record.status === 'failed') throw error('SHARED_AI_FAILED', 'AI analysis failed. ' + String(value.lastErrorMessage || '').slice(0, 300));
      if (record.status === 'succeeded') {
        const result = await observer.read(record, `return await selects.ai.job(${JSON.stringify(record.workflowId)},${JSON.stringify(projectId)}).result();`, 'Read shared AI result');
        attached(options.signal);
        if (result?.workflowId !== record.workflowId || result.task !== record.input.task || !result.files || typeof result.files !== 'object') throw invalid();
        return { workflowId: record.workflowId, input: clone(record.input), result };
      }
      options.onProgress?.(value);
      await observer.pause(record);
    }
  }
  async function cancel(options = {}) {
    const observer = observation(options, true);
    const journal = await read();
    for (const record of journal.records) {
      if (options.identity !== undefined && record.identity !== options.identity || terminal(record.status)) continue;
      if (record.input.requestKey !== await requestKey(scope, record.identity, record.input, record.attempt)) throw invalid();
      await stop(record, options, observer);
    }
  }
  return { run, cancel };
}
module.exports = { createSharedAiJobClient };
