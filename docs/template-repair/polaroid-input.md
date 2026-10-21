# Polaroid Photo Dump input and connection checkpoint

Version 0.1.8 follows draft #278. This advances the 28-template repair goal; no
template is declared complete, and Chan's apps remain excluded.

## Template contract and reproduction

Seventeen registered user Images appear sequentially inside one generated
instant-film frame, with a shared scene zoom, film grade, editable caption and
bundled music. The source plan is measured at 60 fps, 835 frames and 1080x1920.
Do not turn its design into an input repair or treat historical exports as
validation of the current code.

The old create path prepared/imported the frame and music before inspecting
original-photo availability. Its source helper accepted a different Resource
at a selected path. Twenty-three input cases failed before the fix, with four
existing native-placement controls passing. Faults include removed, unknown,
unreadable, empty or changing files, malformed reads, Resource identity,
selection count, ended runs, a missing generated frame and placement-time removal.
A real temporary PNG deletion retains metadata but must stop before asset work.

The browser used a slash-sensitive substring to hide its frame. Three mounted
Windows/UNC cases showed the frame auto-filling photo 1; four app-picked cases
also accepted it, including POSIX. Seven cases failed and one POSIX browser
control passed before the repair. Same-named photos outside the reserved data
namespace and lookalike folder names remain valid.

Six additional failing mounted/app-input cases then exposed repeated separators,
parent-directory aliases into the reserved namespace and navigation back out of
it. Resolve lexical empty/dot/parent segments before classifying the namespace.
This avoids both admitting generated frames and rejecting valid user photos.
It is not filesystem realpath/symlink attestation or a security boundary.

Twelve mounted bootstrap cases then reproduced the consumer's obsolete wrapper:
hidden connection failures/timeouts were not safely completed, and late results
could cross SDK/run/Project/library changes. Reuse the canonical wrapper.

## Final ownership and boundaries

- Add Polaroid as the fourth `native-image-input` consumer, without changing
  shared production source or existing consumers. The registered pool remains
  five modules, now nine consumers. Generated copies are checked before release.
- Require exactly 17 user photos and a live run before input reads. The shared
  feature checks Resource/path identity, dimensions and stat -> one-byte read ->
  stat. Perform this before any asset work, then check originals plus the frame
  after asset preparation and before creating a Draft. The existing placement
  helper performs another check before editing. Ended runs cannot start the next
  boundary. This does not cancel already dispatched asset operations.
- One template-owned reserved-namespace predicate is used by the actual browser,
  app-picked selection and direct create validation. Normalize Unicode/separators
  resolve lexical path navigation, and compare reserved namespace components
  without case sensitivity. This is
  generated-asset input policy, not a new case-insensitive identity rule for user
  files. Filename-only matching is not used.
- Synchronize only Polaroid with the existing canonical local client. CI now
  checks all four migrated photo consumers' adapters and runs the mounted input
  tests explicitly. Existing test steps and excluded production files are intact.

## Verification and unresolved work

Focused input/reference/native-placement/mounted UI/bootstrap run: 198 pass.
Full related regression run: 801 pass, no skips. Python discovery: 285 pass,
six skip. TypeScript 5.9 with installed SDK declarations passes all 76 input
cases; the broad run uses 5.8.3 with prerequisite SDK declarations. Tests include
real temporary file removal and simulated Windows/UNC;
the latter are not execution on Windows. TypeScript, source/package, generated
copy and pre-push evidence is recorded in the checkpoint accompanying the PR.

One byte is an availability observation, not full decoding or media-byte
identity; no file lock is established. The full-Project input reconfirmation is
removed, but asset inventory/import and decoded-asset integrity/lifetime remain
open. Asset hash fallback without WebCrypto, skipped/unknown imports and
preparation cancellation are not fixed here. Three-commit creation and durable
run recovery still need migration, so later failure can leave partial output.

Installed-app/Windows, independent saved-output and Inspector checks, whole AV
playback/export, layer order and original-versus-changed-input quality remain
unverified. The original plan, look, frame/window, program source, caption/music
rules and bundled bytes are preserved. No new SDK/IPC/Electron capability,
installation, merge or deployment is introduced.
