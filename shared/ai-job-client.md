# Shared AI job observation

`ai-job-client.cjs` retains its existing `createSharedAiJobClient(env)` API,
version-1 journal, stable request keys, source/task identities and explicit
terminal retry policy. Panels own selection, framing, masks and Draft edits;
Main owns inference and its authoritative job status.

## Observation contract

- Only failed `status()` and `result()` read requests receive up to three
  attempts. The default delays before retries are 500 and 1000 ms. This does
  not assert that every rejected read is transient: a persistent error exhausts
  the same finite budget. The original cause remains available for diagnostics.
- Returned ownership, task and status facts are validated outside the retry
  block. Malformed/foreign results, journal load/save failures, and progress
  callback errors do not trigger another read or write.
- Each read has a 30-second limit. A run's observation budget defaults to
  30 minutes. Polling defaults to 500 ms. Both successful running observations
  and retries consume that same budget; delays cannot extend it. The monotonic
  clock is used when available. Fractional timer rounding cannot start another
  read after a delay has consumed the remaining budget.
- Per-call options override the same environment fields: `maxWaitMs`, `pollMs`,
  `readTimeoutMs`, `readRetryMs`. Require finite budgets/timeouts of at least 1 ms and
  nonnegative delays; maximum budget is one day and other intervals one minute.
  Zero polling/retry delays are accepted, but do not disable the time budget.
- Exhaustion raises `SHARED_AI_OBSERVATION_PENDING`, with Project/workflow ID,
  safe `publicMessage` and optional diagnostic `cause`. It does not set the
  server job to failed, erase its acknowledgment, cancel inference or create a
  replacement attempt. Reopening observes the saved identity; failed/canceled
  inference requires the existing explicit `retryTerminal` option.
- Read and delay waits respond to `AbortSignal`. Detaching raises
  `SHARED_AI_DETACHED` and preserves inference. Late read replies cannot update
  the journal after their observer has timed out or detached.

## Writes and cancellation

Submission, cancellation and journal writes are never retried by observation.
A lost submission acknowledgment retains the original request key for a later
explicit recovery call. An acknowledgment received while detaching is still
saved. These mutating promises are allowed to settle; this module does not race
them against a local timer and pretend that their effects were canceled. Their
transport/lifecycle bounds remain a separate host and run-lifetime concern.

Explicit cancellation first saves intent, sends at most one cancellation per
record in that invocation, then observes terminal status through retryable reads.
Its default 60-second observation budget is shared across records in that cancel
invocation. Unconfirmed cancellation raises `SHARED_AI_CANCEL_PENDING`; saved
intent and known status remain recoverable. A new explicit cancel/recovery call
can contact the same job again; no background write retry is introduced.

## Distribution and dependency compatibility

`shared/panel-modules.json` registers Depth, Travel, Jude and Portrait as primary
template consumers. Their existing IIFEs embed the canonical CommonJS body;
`node tools/sync_panel_modules.mjs --check` rejects stale copies. The existing
module tool is reused. It validates all files before writing, with per-file
atomic replacement rather than a multi-file transaction.

The registry's optional `compatibilityTargets` explicitly retains an existing
non-template dependency consumer (Cutout Beat Gallery). Such a target still needs
a matching manifest ID and is subject to the same excluded-plugin and marker
checks. It is not automatically discovered from a directory scan. a16z already
imports the module and is rebuilt with its existing bundler. Neither compatibility
consumer's editorial policy is changed. CI rebuilds a16z using its existing
esbuild 0.25.0 dependency and rejects changes to the committed generated files.
Chan's Shortform Clips, template packs,
Shortform Cloner and EO Shorts are excluded from source synchronization/rebuild.

Source copies and generated bundles are evidence of distribution, not proof of
installation, successful live inference, final playback or export.
