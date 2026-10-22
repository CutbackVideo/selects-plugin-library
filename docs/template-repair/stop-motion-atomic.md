# Four Photo Stop Motion: complete save and durable app runs

> Current SDK-free decision: [sdk-free-compatibility.md](sdk-free-compatibility.md) supersedes the pending SDK/app prerequisites below. Historical code and validation records are preserved; they do not establish current installed-app acceptance.


Version 0.1.10 follows draft #277. The template remains one of 28 incomplete
acceptance contracts; this checkpoint is not installation or AV validation.

## Reproduction and reused ownership

Fifteen behavioral cases failed before the migration: the old create path saved
three times, failed effects left two earlier commits, the complete-save observer
received an empty seed, async pre-dispatch ownership was not awaited, saved-state
damage went undetected and manual graphics could survive into an unintended
continuation. Reuse `native-image-authoring` for one unsaved working copy and
independent persisted-state verification. The template's normalizer and finish
function accept the trusted working handle; legacy public finish/placement
helpers preserve their existing ID-based contract.

After atomic authoring, 19 of 21 app-run recovery cases still failed without
durable ownership. Reuse `template-run`, the initialized canonical local client,
exclusive claim and SDK-side conditional result receipt. Saved runs recover by
readback rather than mutation replay; failed, active, unknown, mismatched,
unreadable and corrupt records are not replaced. Closing a realm during a save
still permits its SDK-side receipt to land. The live predicate pins run, Project
and library. Explicit new runs and standalone revised creates remain distinct.

Both shared production sources are unchanged. Register this third consumer in
the existing pool: five registered modules across eight consumers, with no new
overlapping feature or runtime cross-plugin import. The generated panel embeds
its dependencies before distribution.

## Design and evidence contract

The reference plan, Image effect TSX, outro TSX and look constants are preserved.
Twenty-one independent appearances still cycle A-D, including deliberate repeated
picks and independent slot focus, the black pause, blur/shake and dark fade.
Use the legacy empty seed's own frame rate when resuming; refuse manual content.
New Drafts inherit their actual working-copy rate without saving a probe.

The finish adapter supplies intended graphic parameters, visual transforms,
effect/graphic programs and editable controls, plus the full music interval,
Audio routing/level/fades and source start/end/rate/pitch to existing verifiers.
Verify before the sole commit, independently after saving and on a remounted
app run. Manual or corrupted saved values are never adopted as expected intent.
The fixture journal uses 22,866 bytes of the existing 49,152-byte budget; the
largest SDK script is 39,393 bytes, below 262,144. These are fixture measurements,
and the existing prospective budget gate remains mandatory for every real run.

One further failing counterexample showed fixed reference seconds were not
enough for music preparation: at 10 fps the 347/30-second plan rounds to 116
frames (11.6 seconds). A nominal 11.58-second Audio passed the old minimum.
Pass the realized plan duration to the existing bundled-Audio feature instead.

## Verification

- Initial atomic cases: 15 failures, then all pass. App-run migration: 19
  failures and two controls, then all 21 pass. Rounded-duration case fails
  before its fix. Repeated-pick/focus control preserves all 21 placements.
- Related full regression suite: 741 pass, no skips. The expanded consumer
  coverage includes complete/unknown saves, fresh realms, concurrency,
  minification, manual saved-state edits, all transform/program/Audio receipts,
  source clocks, existing templates, bootstrap, input and shared-source checks.
- Python discovery: 285 pass, six skip. Generated module/local-client, package,
  public-source, diff and pre-push checks accompany the checkpoint.
- TypeScript 5.9 with installed SDK declarations: 116 atomic/run cases pass;
  the broad run uses 5.8.3 with the prerequisite SDK declarations.
- A separate disposable source probe imports the actual SDK, renderer bridge
  and Storyboard service from client #7828 and uses a real 120-fps Audio source
  skeleton. All six target rates (10, 25, 23.976, 29.97, 30 and 60) preserve the
  planned interval and source window without persistence. This is module
  execution, not installed UI, media decoding, playback or export.

## Release dependencies and remaining gates

This consumer now requires `clipSourceWindow` from client PR #7828, as the other
two migrated photo consumers already do. Existing runtime capability checks
stop unsupported hosts before commit. The worker SDK/declarations must roll out
before publishing the plugin; no renderer IPC, Electron capability or binary
version is added here. A commit already sent cannot be canceled by closing a
panel; a missing commit receipt stays unknown. Prepared Project music is not
rolled back. Files/journal updates and the Draft commit are separate operations.

Remaining: installed-app/Windows execution, complete saved output and Inspector,
intrinsic Blend/Spatial Conform/layer order/track Audio and effect-internal time
mappings, media bytes/decoding, whole AV playback/export, reference versus changed
input quality and unresolved product judgments. Historical source-path references
are not migrated. No merge, deploy or installation; Chan's apps remain excluded.
