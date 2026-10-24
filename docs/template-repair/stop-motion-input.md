# Four Photo Stop Motion original-Image input

Version 0.1.9 follows the bundled-Audio checkpoint in draft PR #276. This is
progress toward the full 28-template goal, not completion of this template.

## Reproduction and ownership

The template checked retained Project metadata and native dimensions, but did
not observe the selected local files. A deleted original reached music
preparation, and a different Image registered at the selected path could replace
the requested Resource in the lower-level preparation helper. A changed file
between observations was not rejected. Invalid selection counts and an ended
run could also reach preparation of music before being stopped later.

The first regression run had 22 failing Four Photo Stop Motion cases and four
passing existing migration cases. It covers missing, unknown, unreadable,
directory, empty and malformed file observations; changed snapshots; identity;
repeated selections; final public errors; real temporary PNG deletion; a file
removed between preparation and placement; invalid counts and ended runs.
Simulated Windows and UNC paths remain unit evidence, not Windows execution.

## Final change

Register Four Photo Stop Motion as the third consumer of the existing
`native-image-input` feature. Its source is unchanged, and the module count does
not grow. Source embedding and drift checks keep the generated panel aligned.
Preparation checks Project membership, exact selected Resource/path identity,
native dimensions, stat -> one-byte read -> stat, and returns only selected
sources while preserving order and duplicate occurrences. Placement calls the
same feature again before editing.

The create entry requires exactly four selections and checks run ownership both
before the input query and before music preparation. Its redundant full-Project
inventory transfer is removed; the shared worker query owns the source check.
This does not remove the Project browser or alter hidden-run host-ID resolution.

The reference's 21 appearances, 3:4 canvas, blur/shake, intentional black pause,
outro, bundled music and timing rules are unchanged. No new SDK, renderer IPC,
file transport, import path or runtime cross-plugin dependency is introduced.

The local SDK drift check also exposed this consumer's obsolete connection
wrapper. Twelve actual mounted-panel failures reproduced missing completion,
unbounded bootstrap observation and late SDK/run/Project/library ownership
results. Synchronizing only this consumer with the existing canonical
`shared/local-client.ts` fixes them without changing the shared source. The
explicit three-photo-consumer drift check passes. A repository-wide, unscoped
local-client check still rejects Epidemic Sound Search's pre-existing composed
wrapper; its baseline has the same wrapper, and it is not altered here. This is
recorded as a remaining pool-wide migration/tooling issue, not a passing check.

## Verification and limits

The focused input/placement/module/reference run passes 94 tests. All twelve new
Four Photo Stop Motion bootstrap cases pass after source synchronization. The
broader photo/Audio/run/bootstrap/platform-script suite passes 630 tests without
skips using TypeScript 5.8.3 and prerequisite SDK declarations. TypeScript 5.9.3
with installed SDK declarations passes the 52 input cases. Python discovery
passes 285 tests with six skips. Public source, all package manifests, generated
module copies and scoped local-client drift checks pass. Existing tests
remain in the CI input step; no checks are skipped or weakened. One HEIC/JPG
fixture now retains the actual selection's Resource ID alongside the working
path, including converted HEIC paths.

One-byte reads are availability observations, not full image decoding or byte
identity. Stat observations do not lock a source against later removal. A
placement-time failure can still leave this template's earlier seed commit;
three-commit creation, durable run recovery, later cancellation and complete
saved-program verification remain open. Older validation notes describe their
original versions, not runtime verification of 0.1.9. Installed-app/Windows,
independent saved-output checks, complete AV playback/export and original versus
changed-input visual evaluation are unverified. No install, merge or deployment.
