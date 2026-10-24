# Browser analysis Worker ownership

`runPanelWorker(source, payload, options)` owns one browser Worker invocation.
Mini/Archive Vlog, City Weekend, Torn Paper Love, Summer Trip and THE END Credits
are its consumers. This is a distinct execution
boundary: `bundled-assets` owns files and media-process reservations,
`ai-job-client` owns backend jobs, and `template-run` owns persistent Draft/run
recovery. None owns a browser Worker, Blob URL or its event/timer subscriptions.

The caller supplies the worker source (nonempty UTF-8, at most 1 MiB), structured
cloneable payload, optional AbortSignal, optional `isCurrent` callback and timeout
in milliseconds (default 60,000; finite 1..2,147,483,647). It receives the raw
worker response. Algorithms, sample rates, payload/result schemas and rendering
policy remain caller-owned. The default clones the payload, preserving original
PCM for Mini/Archive/City/Torn fallback. An optional `transfer` array is passed
once to native `postMessage`; invalid native transfers use the same dispatch
failure cleanup. Summer retains transfer of a full sample buffer (or a copied
partial view); THE END retains transfer of an exact slice copy. The owner never
chooses, copies or retries a transferred buffer. Missing Worker/Blob/URL capabilities fail
explicitly before allocation. Invalid input and already-stopped owners allocate
no worker. A false or throwing `isCurrent` ends the scope; the callback is checked
before dispatch, at completion and by a 50 ms watcher while pending. Timer delivery
still depends on the browser event loop; it is not a hard real-time guarantee.

One settlement path attempts to clear deadline/watcher timers, unsubscribe abort,
detach handlers, terminate the Worker and revoke its Blob URL. Construction,
synchronous dispatch failure, asynchronous error/message-decode failure, success,
cancellation and timeout all use this path. Cleanup attempts continue if one
fails. Failed cleanup rejects with `terminal: true` and private diagnostics; it
cannot be described as successful cleanup. Liveness and the absolute deadline
are checked again after cleanup, so an already-late message or cancellation during
cleanup cannot produce success. Cancellation during Worker construction is checked
after the returned instance is owned. Late duplicate messages cannot settle twice.

Errors expose safe `publicMessage` and `PANEL_WORKER_*` codes; causes and
`cleanupFailures` retain diagnostics. There is no automatic retry, no Project or
Draft mutation, filesystem operation, media process, network request or global
capability replacement in the owner. The worker source itself remains trusted
caller code: this lifetime helper is not a sandbox or permission boundary.

Mini/Archive adapters retain `{samples, rate: OWN_RATE}` and their `{ok,error}`
response protocol, the existing `beat-timeout` code and cancellation behavior.
Both pass the actual mounted/job/Project liveness callback. Both clear the music
selection and show an error on terminal cleanup failure, preserving ordinary
analysis-failure fixed-timing fallback. Their worker algorithm,
22,050 Hz sample rate, 240-second decode cap and 60-second beat timeout remain
unchanged. Both embed this source through `shared/panel-modules.json` and
`node tools/sync_panel_modules.mjs`; installed panels remain self-contained.

The four follow-up adapters preserve their own source builders, sample rates,
timeouts, reply schemas and cancellation sentinels. Each actual music caller
passes its current mounted/request predicate and refuses fixed-timing fallback
after terminal cleanup uncertainty; ordinary analysis errors retain that fallback.
No public SDK, app capability or transport method is introduced.

See `docs/template-repair/analysis-worker.md` for parent counterexamples, tests,
actual Chromium evidence and remaining template acceptance gates.
