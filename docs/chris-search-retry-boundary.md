# Chris read-only B-roll search retry

The search retried only an English display message. The real Korean generic error therefore skipped that retry. Display language does not establish whether a provider failure was transient, permanent, or terminal.

The consumer now permits at most two attempts for one read-only B-roll query, sharing its existing 240-second deadline. It first checks the matching saved candidates, never retries an aborted/superseded caller, and retains both exact failure messages when attempts are exhausted. Other planning, review, generation, native work, and project writes gain no retry. Provider/model selection is unchanged.

Every invocation and attempt has a unique search workspace, candidate sidecar, and download instructions. Once the second attempt begins, only its response or sidecar is authoritative; a first attempt's late writes remain preserved in its own folder. A matching first sidecar can still avoid the second request if recovered before it starts. This prevents stale sidecar replacement; it is not a sandbox or proof an old provider stopped.

The public AI bridge returns a message-only rejection. Its host can request session stop without awaiting backend completion. Consequently the consumer cannot prove provider termination, distinguish authentication from transient transport failure, or guarantee the old Browser turn was killed. Unknown failures can use the single bounded retry; permanent failures may therefore make two attempts. The retained historical Korean failure has no underlying status trace. No SDK or application change is included.

## Regression boundary

`chris_search_retry_full_panel.test.mjs` loads the complete generated production panel, including transitive helpers. AI, storage, and native boundaries are controlled. It checks English/Korean/unknown failures, two persistent errors with exact causes, sidecar recovery, late first-attempt writes, cross-context isolation, cancellation/supersession, the shared deadline including workspace preparation, and the real TemplateRun warning/finish path. Dismissing the notice preserves one saved result and does not regenerate. These are controlled consumer tests, not an induced provider outage or actual application UI evidence.

The existing context and search-recovery suites also load the full panel. Real Claude calls and physical warning-dialog inspection remain separate runtime checkpoints. A future QA alias may intercept only a selected `sdk.askAI` search call before forwarding subsequent calls to the genuine configured subscription. It must retain canonical-body hashes and explicitly label the injected first failure.
