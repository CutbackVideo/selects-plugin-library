# Mini / Archive: own the complete analysis Worker lifetime

## SDK-free four-consumer follow-up

Based on `dac6563`, City Weekend alpha.11, Torn Paper Love alpha.11, Summer Trip
alpha.9 and THE END Credits alpha.10 now reuse the same existing Worker owner.
Their actual old adapters reproduce dispatch rejection without cleanup, successful
late replies and hidden cleanup failures. Their music callers also admitted fixed
timing after terminal cleanup uncertainty. The initial 28 adapter/caller checks
fail 20 and retain eight healthy/ordinary-fallback controls. These are controlled
execution-boundary counterexamples, not independently reported customer incidents.

The shared owner gains only an optional transfer array; default payload cloning
for Mini/Archive remains unchanged. City/Torn keep cloned samples, Summer keeps
transferring its full buffer or a partial-view copy, and THE END keeps transferring
an exact slice copy. Algorithms, rates, timeouts, reply protocols and ordinary
fixed-timing fallback remain local. The real callers supply current mounted/run
predicates and clear music selection on terminal cleanup failure before fallback
or duration probes. Existing Mini/Archive generated helper blocks are synchronized.
No public SDK, IPC, Electron code, Chan source or persistent user data changes.

`tests/analysis_worker_followup.test.mjs` executes the four real adapters and
music callbacks. It adds partial-view ownership and native invalid-transfer
cleanup checks. The final focused suite passes 125 cases, including existing
Mini/Archive lifetime, registry, text isolation and source ownership regressions.
The new suite is registered in the existing CI Worker step. Old package tests
that required the removed `worker.postMessage` spelling now check canonical
adapter wiring; their independent frame/BPM/input/style assertions remain.

`tools/repro_analysis_worker_followup.mjs` runs an owned standalone headless Chrome
child with a new temporary profile, closes it in `finally`, and never connects to
an existing Electron, CDP port or user profile. Forty native Chromium cases pass:
four exact-parent and repaired adapters for dispatch/late/cleanup/parity, plus
both existing consumers. Native DataCloneError leaves the parent's one Worker,
URL, timer and listener until the probe disposes its own orphans; repaired paths
settle with zero owned resources. Delayed messages and injected cleanup errors
are rejected. Unchanged real detector output matches Node exactly on the same
20-second PCM, including preserved clone/transfer ownership. Evidence:
`clip-highlights-analysis/repro-20261023/worker-followup-FoRQSe/results.json`.
Run the committed tool with `SBS_PANEL_TEST_MODULES` pointing to existing
esbuild/Playwright dependencies and `WORKER_BROWSER` to an existing Chromium
executable. It creates only its own temporary profile/evidence directory.

The four package suites pass 66 of 67 cases. THE END's independent cue-builder
stretch test fails because local FFmpeg has no `rubberband` filter. Its unchanged
test also fails against an archived `dac6563` package with the same error; no
product or test condition is weakened. Baseline log:
`worker-followup-baseline-8om91gcs/cues-baseline.log` in the same evidence parent.
Existing Mini/Archive package suites pass all 31 cases. Public-source, package
file inventory, 15-module synchronization, both ownership maps and all 28 template
checks pass. Verification groups overlap and must not be summed as unique cases.
This browser/adapter checkpoint does not establish installed PanelHost/UI,
Project save, playback/export or Windows acceptance; whole-template acceptance
remains 0/28. Historical checkpoints below retain their original scopes.

Scope: Mini `0.1.0-alpha.16`, Archive `0.1.0-alpha.10`, stacked on draft #311
(original-image facts). Chan's apps stay excluded. Full template and all-feature
ownership acceptance remain **0/28**; the registry is still a partial inventory.

## Reproduced defects and ownership decision

The previous adapters allocated a Blob URL, Worker, timeout and abort listener,
then called `worker.postMessage` outside their cleanup path. A synchronous dispatch
error rejected the Promise without terminating/revoking/unsubscribing. Separate
counterexamples showed that late messages could defeat a queued timeout, a cancel
inside cleanup could still resolve success, and termination failures were hidden.

A browser Worker lifetime is distinct from the existing local-file/media owner,
backend AI job owner and persistent template-run recovery. Add **one**
`analysis-worker` feature for the execution mechanism, not one module per helper
or algorithm. Mini and Archive use the same source. The partial registry is now
six entries / twelve unique consumers; it does not classify all template features.
City Weekend, Torn Paper Love, Summer Trip and THE END Credits have additional beat
adapters whose dependency/behavior reviews and migrations are still pending.

The new owner accepts source, payload, signal, current-owner callback and one
millisecond deadline; returns the raw worker reply; and owns all transient browser
resources through one settlement path. It attempts every cleanup action, reports
cleanup failures as terminal, checks liveness/deadline after cleanup and ignores
late duplicate responses. The real caller's mounted/job/Project guard is passed
through both adapters, rather than only offered by an unused generic API. Both actual music callers
clear the selected track and show an error when cleanup is terminal. Two added
caller counterexamples failed before this guard; two ordinary-error controls
retain the existing fixed-timing fallback.
See [the contract](../../shared/analysis-worker.md) for units, error semantics,
limits and distribution. Algorithms and payload/result protocols remain caller
policy. The sample buffer is cloned, not transferred/detached, because caller
fallback still needs its original duration. No Project/write retry is introduced.

## TDD and compatibility evidence

- Initial parent dispatch tests: two failures / one healthy control.
- Expanded actual-adapter parent tests: five failures / four controls covering
  dispatch leaks, late success, cancellation during cleanup and hidden cleanup
  failure. Further RED cases exposed missing-global URL handling and an adapter
  that initially did not pass the actual caller's liveness callback.
- The final suite has 27 cases, transpiling each real panel and executing its
  embedded source/adapters. It covers constructor-time cancellation, missing
  capabilities, malformed deadlines, message errors, diagnostic preservation,
  exact caller payload/sample rate, no PCM detachment, normal protocol errors,
  timer/owner replacement and cleanup failures. All pass.
- Related module, ownership inventory, source, audio and Mini consumer checks:
  180 passing cases across eight test files. Mini/Archive's 31 legacy scripts
  retain detector parity, packaging, scripts/SDK type checks and panel contracts.
  Old assertions matching the removed implementation spelling were replaced by
  adapter wiring checks; behavioral lifetime tests now own cleanup verification.

## Actual development-renderer evidence

Eight scenarios use actual Chromium Workers/Blob URLs in an isolated development
renderer. Scoped wrappers observe resources without replacing renderer globals.
The injected dispatch fault passes an uncloneable function to native `postMessage`,
causing native DataCloneError. The parent leaves one Worker, Blob URL, timer and
abort listener after rejection. The probe records this before explicitly cleaning
its own orphans. Both fixed adapters leave zero of each resource. This is a
controlled failure at the dispatch boundary, not a reproduced customer input.

Normal Mini and Archive runs analyze the exact same 20-second / 22,050 Hz PCM
fixture as the unchanged Node beat detector. Both worker results match its entire
JSON exactly; byte hashes confirm unchanged caller PCM. Timeout, cancellation and
actual-adapter owner replacement also settle and clean every observed resource.
No Project API operation occurs in these scenarios.

The same eight scenarios also pass in a separate opaque-origin iframe generated
by the actual client `createPanelSandboxSrcDoc`, with its unchanged CSP and
`allow-scripts` sandbox. That checks Worker/Blob execution under the client's
actual sandbox document policy; it does not install a panel or exercise the full
PanelHost compiler, SDK relay or template UI.

These observations establish real browser Worker behavior, sandbox-policy
execution and algorithm parity. They do not establish installed-panel/UI/build/
save behavior, full-video/audio playback, export, Windows or source-content
identity. The remaining owners (including file/scoring/language/paged inventory,
script transport and save/recovery) still need complete classification and their
own execution evidence before either template is accepted.

## Remote checks

The parent #311 workflow reused the installed compiler for common tests, but its
legacy Archive/Mini type tools use separate `AV_TSC` / `MV_TSC` settings. Export
those explicit settings from the same dependency installation as well. Both tools
pass locally with actual SDK declarations and no `npx` on PATH. No checker or type
rule is skipped. Whole-branch CI status is recorded separately from local evidence.
