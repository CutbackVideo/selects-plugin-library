# Chris: show the work that is currently waiting

The search previously reported its count after a query returned. While the first
AI calls were pending, the production progress view could still say it was
checking the Draft. Candidate preparation, native preview capture, and AI image
review could also share the previous stage label. This change fixes observation;
it does not establish a faster pipeline or a previously infinite provider call.

## Production boundaries

- Publish each query's preparation, active attempt 1/2 or retry 2/2, and matching
  sidecar read before awaiting it. Two concurrent queries remain visible in a
  stable query order. The count is finished queries, not usable results or percent.
- Distinguish preparing candidate media, reviewing each candidate, rendering
  cutaways, and reviewing the rendered crop. Restore the actual media stage after
  the existing first-use Node preparation message.
- Distinguish keyword preview rendering from its AI review, show each final saved
  preview batch, caption/B-roll saving, and final report saving. A warning dialog
  has its own waiting label after the Draft is already saved.
- Ignore status callbacks after TemplateRun finishes, as well as callbacks from
  detached or superseded runs. Existing completion and Stop protocols remain.
- Use the panel's context language for Korean stage text and English fallback,
  following its local UI dictionaries. The existing shared progress view and its
  English framing labels are unchanged. Identical status callbacks do not reset
  its age; real message changes do. No timer fabricates work or resets status.

The existing two search workers, two-attempt shared 240-second AI allocation,
sidecar scopes, alternate-query pass, review prompts, review limits, fallback,
caption design, and SDK operations are preserved. The 240-second allocation is
not an absolute timeout around all preparation/file I/O. No ETA, percent,
provider-stop guarantee, or faster-execution claim is added.

## TDD and controlled whole-module evidence

`tests/chris_progress_pipeline.test.mjs` mounts the real production TemplateRun,
runPipeline, asset selection and saved-result verification in React. Only the
external source/SDK/files/engine/model boundaries are controlled. A resumed source
fixture avoids rerunning unrelated face analysis; stage and business functions
are not extracted or manually supplied as VM globals.

The initial 12 tests failed 8 times against the original panel: pending searches
retained the Draft-checking label, render/review distinctions were absent, and
Korean progress was absent. The final 16 tests pass, including both active
queries, retry, meaningful-change age, repeated callback, terminal callback,
Stop/unmount, run replacement, and accepted-candidate render/crop-review stages.

A separate execution against the exact original 418ef89 panel confirms equal
controlled business ledgers: 4 search calls, 4 candidate reviews, 2 candidate
engine calls, 7 caption saves, 1 keyword preview + review, 2 saved-preview batches,
1 final review, identical cues/keys/warnings/verification/counts and saved Draft.
This is fixture parity, not live-provider timing or real-video acceptance.

Existing search assertions now count actual retries rather than assuming that
only retries produce status. Three legacy fixture files that evaluated extracted functions
now load their complete production module so the real local formatter resolves.
No no-op formatter or manual helper-global injection is used. The legacy create
fixture includes its real context requirement and the notification fixture its
required status callback.

Local verification: 16 new tests; Chris/shared-progress regression 195 passed (plus the subsequently added terminal-prop test),
1 optional SDK-declaration check skipped because the existing app declarations
lack that legacy test's AI signature; Windows Chris 18 passed; public-source check,
19 shared modules / 21 consumer synchronization, and official builder parity pass.
The existing app/shared/SDK and CI definitions are not changed here.

## Pending actual app acceptance (root-owned queue)

Use a new owned Draft with the same speaker input and ordinary production options.
Inspect the actual progress surface while a query, candidate review, cutaway
render, keyword preview/review and saved-preview batch are pending; compare the
visible query count/attempt with the operation log. A controlled first-call
failure may verify the retry label, explicitly separate from natural provider
failure. Observe age without heartbeat reset, then a real step reset. Inspect a
Korean run and English fallback. Check the existing Stop behavior, terminal
presentation, saved/read-back Draft, playback and export separately. No child
agent installs a panel, runs a model, changes UI focus or starts native work.
