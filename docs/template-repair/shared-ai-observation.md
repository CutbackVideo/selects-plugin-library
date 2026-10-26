# Shared AI observation repair checkpoint

## Existing cancellation consumer regression

The first remote CI runs for PR #262 failed the existing EO cancellation test.
Immediate observation detach exposed a test ordering assumption: the consumer
starts `client.cancel()` as a separate background promise, but the test asserted
its write count immediately after the observation promise rejected. That
rejection no longer waits for the old polling delay. It is not a cancellation
receipt.

The compatibility fixture now waits for the canceled journal receipt before
asserting one cancellation and a fresh attempt after explicit Cancel. Ordinary
panel detach still asserts zero cancellations and reuse of the original job.
A shared-module regression deliberately holds the cancellation journal write,
proves observation can detach first, then releases it and verifies the canceled
receipt. No EO or Chan production source is changed. All seven existing source
adapter tests and 39 shared observation/job-client tests pass locally; remote CI
must be checked independently after this correction.

Scope: the shared AI client's part of audit X8. All 28 template completion gates
remain active; other process waits, run-lifetime bounds and other X8 consumers
are not declared repaired by this checkpoint. Chan's apps remain excluded.

## Reproduction and repair

A single status transport failure previously ended observation while inference
could continue in Main. Result-read failures behaved similarly. Running jobs had
no overall observation budget, and detaching could not interrupt a hung read or
long polling delay. Blindly retrying the old status function would also repeat
cancellation writes, so retry ownership must sit around read transport only.

The existing module now bounds status/result delivery retries, per-read waits
and total observation time. It preserves acknowledged identity and authoritative
terminal status, exposes a pending observation instead of a model failure, and
keeps submission/cancellation/journal writes outside the retry mechanism.
See `shared/ai-job-client.md` for the contract and deliberate write-timeout limit.

Two initial consumers (Depth and Travel) passed actual adapter/storage recovery
tests before expanding the same source to Jude and Portrait. Existing Cutout
Gallery and a16z dependency consumers receive the same contract without changing
their designs. The generic module registry/tool from the photo-input checkpoint
is reused, including an explicit compatibility-consumer list. a16z uses its
existing import/bundler. Excluded apps and template packs are not rewritten.

Two further failures showed that the final Travel/Depth error path hid the
recoverable message. The shared pending error now carries a fixed safe public
message, and Depth's final completion handler preserves that field. Diagnostic
transport causes are not displayed as user instructions or model failures.

## TDD evidence

- Initial 34 checks: 20 passed, 10 failed, and four exceeded the test deadline
  because the old observation could not finish. The added bounded/detach cases
  and existing compatibility checks pass after the implementation.
- Consumer/distribution RED: four adapter checks and two registry checks failed;
  all passed after migration and compatibility-target validation.
- Final-message RED: two checks failed before the safe error propagation fix.
- Later focused coverage includes cancellation-read recovery without another
  cancellation write, pending cancellation intent, exhausted results, total
  budget during backoff, real generated a16z module execution, and all five
  registered panel adapters. Validation results must be recorded from final logs.

Final verification groups (overlapping tests, do not sum as unique cases):

- Focused shared AI, resource/clock adapters and module registry: 74 passed.
  The 22 timing/observation cases were rerun after making small-budget tests use
  a controlled platform clock instead of relying on CI CPU scheduling.
- Broader consumer/reference suite: 216 tests, 205 passed and 11 skipped. Three
  skipped SDK checks subsequently passed against installed public declarations
  and the available TypeScript compiler. Seven skipped Python reference cases
  subsequently passed in a 9-test NumPy/Pillow planner/pixel run.
- Python discovery: 291 tests, 285 passed and 6 skipped. Two existing pinned
  manifest-version assertions were updated for the intentional version bumps.
- The mock Windows engine plus cancel subtest passed with NumPy/Pillow enabled
  (2 checks). Its Python reference comparison reported a largest per-channel
  difference of 48 and lowest PSNR of 43.2 dB, within the test's tolerance;
  this is not a claim of identical pixels or a real Windows installation.
- All six changed panels transform with zero warnings. Public-source, package,
  generated-copy and diff checks pass. a16z's existing esbuild 0.25.0 builder is
  now also checked against committed output in CI.

The original legacy all-person snapshot comparison remains unavailable; do not
substitute a current panel copy for that historical baseline.

## Remaining validation and scope

These are executable SDK/harness and generated-artifact checks. Installed-template
execution, live inference reconnection, saved Draft readback, full audio/video
playback, export and Windows execution remain pending. The observation budget
does not impose a local timeout on in-flight writes. It does not fix every
template's selection, time, resource, cache or partial-save contract.

This follow-up depends on photo-input PR #259's shared module registry and CI
check. Keep that dependency explicit when reviewing/merging; do not publish this
branch as if all prior template fixes were merged or installed.
