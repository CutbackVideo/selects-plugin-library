# Mini assembly: verify the intended source and cut before saving

This checkpoint follows `mini-look-phase.md`. It repairs one connected feature:
source-clock observation, placement, crop/music readback, and the placed source
origin consumed by Beat punch. It does not complete Mini or the 28-template audit.
Chan's apps and packs remain excluded. Nothing is merged, installed or published.

## Failure and corrected contract

The old operation treated requested source seconds as though they were rounded
on the output Draft grid. The SDK first rounds an insertion on that source's
sequence grid. With 30/25 fps originals and a 24000/1001 fps Draft, the parent
operation's intended cuts `[25, 56]` actually ended at `[25, 57]`. A subsequent
snapshot could faithfully describe that wrong result; matching the saved snapshot
was not proof that the original plan had been executed.

The generated operation now validates its bounded plan before creating anything:
1–256 ordered picks, Resource aliases, finite nonnegative source seconds, positive
native Image dimensions, strictly increasing boundaries starting at zero, and
sound/music policy. A photo Resource is permitted once; Video Resources may repeat.
The existing allocator already enforces this photo policy (`photoUsed`). Thus
Resource-keyed photo motion is retained, with a checked precondition, rather than
inventing an occurrence module to fix an unestablished valid-input bug.

Each distinct source is observed on its own private unsaved Draft. The optional
`timing.insertionFps` output means the insertion grid, not a physical media-rate
claim or an Audio-overlay clock. The default resolver output remains unchanged.
Mini uses batches of at most 50 sources and consumes the observed aliases only if
they exactly match its frozen request. Native Image dimensions retain their
existing separate source-facts owner; the observation does not replace them.

For each shot, Mini computes the output cut, inserts a native-frame-aligned cover,
and binds the single new media occurrence to the requested source and interval.
Prior media placements cannot move or change identity. The SDK may legally create
chapter companions: Mini projects Main/Video/Audio rows for placement binding.
It reads the actual SourceIn/SourceOut at normal speed. Only a verified, declared
native-conformance surplus may be trimmed; unexpected insertion lengths fail
before any corrective trim. It checks the exact final interval/source again.
First-source rate adoption discards the unsaved attempt and replans once; repeated
unexpected rate changes fail. No footage is sped up to hide a timing error.

Crop is bound to that occurrence, preserving unmanaged original transform fields,
and checked after editing and before commit. Music explicitly requests normal 1x
speed, so the overlay uses the Draft grid for its source start and exact duration.
The default Audio-overlay mode uses a different grid and cannot be inferred from
an insertion probe. The short fade is quantized to output frames. Source window,
routing, speed/pitch policy and Audio settings must read back before save.
Ambient level remains the existing best-effort policy: ignored writes are reported
and not counted as applied. Beat punch reads the placed source window, instead of
recomputing an obsolete source clamp from the requested seconds.

Final canvas, frame rate, duration, Main count, placement, source windows and crop
must match the plan before the existing pre-save hook and sole assembly commit.
The result shape, immutable saved-state receipt, exclusive run owner, bounded
transport and unknown-save recovery stay with `template-run`. A lost reply is
recovered by readback, without replaying the assembly mutation. Private probes and
failed layouts are never committed; source media and prior results are retained.
No new public host SDK or renderer/Electron capability is introduced.

## Ownership and existing consumers

| Responsibility | Decision | Compatibility |
| --- | --- | --- |
| Private source alias/insertion-grid observation | Extend `native-image-input` through optional options/output | Legacy calls keep their shared Video probe and omit timing; no Audio probe is added |
| Occurrence delta binding; Main transform and overlay Audio inspection | Extend `native-image-authoring` | Existing defaults remain; internal serialized dependency injection is explicitly updated in every Image and Gallery consumer |
| Native cover/declared trim, cut allocation, fade and sound policy | Keep Mini-specific | These express Mini's edit, rather than a universal host policy |
| Photo `byRid` motion selection | Keep Mini-specific | Allocator and assembly both require one use of each photo Resource; Video reuse is independent |
| Save ownership, state receipts and read-only recovery | Reuse `template-run` | No new persistence module or replay policy |

Generators embed canonical SDK-safe functions into self-contained operations;
installed scripts do not import repository paths. Explicit function parameters
preserve dependencies through minification. The registry remains seven features
and twelve partial consumers, not a full ownership map. Archive receives the
resolver's compatible generated copy only; its assembly is not migrated here.

## Evidence and limits

- The final 32-case generated-operation suite against exact parent `8fe2f3a`
  has 25 failures, including unexpected/ignored writes, wrong source windows,
  native-clock rounding and fade/source mismatch. All 32 pass on this change.
  The later Beat punch case separately reproduced 97 versus required 96 before
  the placed-window correction. Invalid plans create no working Drafts.
- The affected shared/owner/compiled-template suite passes **1,041 cases across
  29 files**, including Image/Gallery atomic authoring, programs, transforms,
  Audio and durable look/assembly recovery. Tests check the generated operation
  against actual SDK declarations. Per-source clock tests also preserve legacy
  resolver behavior. Builder checks detect stale outputs without rewriting them.
- All sixteen existing Mini CJS suites pass (fifteen together, then the corrected
  planner suite). The removed assertion matched source spelling; generated-operation
  tests already verify actual tail placement. Twenty-four Audio/Gallery builder
  cases pass. Python: 299 tests, six pre-existing skips. Public-source, package,
  module and generated-operation checks pass; normal pre-push checks are required.
- CI also exercised retained placement entry points outside the initial focused
  suite. Six cases exposed missing explicit binder injection in the Camera Shutter
  and No.14 legacy wrappers. The unchanged migration suite reproduces those six
  failures locally; both serialized wrappers now pass the dependency. The full
  migration suite and directly affected preflight, compiled, Windows-path and title
  consumers pass. This is a real integration correction, not a relaxed fixture.
- Actual macOS SDK probes show parent `[25, 57]` and corrected `[25, 56]` cuts.
  A saved mixed-Video/music/ambient Draft independently reads back the intended
  cuts, Audio range and fades. A controlled lost assembly reply recovers that
  same Draft with one assembly dispatch/commit. A separate full Mini title,
  two-font, photo-motion and Soft workflow saves/reads back and recovers a lost
  look reply without repeating decoration.
- Those runtime samples precede the final input-admission/empty-Draft guards,
  no-op-transform avoidance and Beat punch placed-window correction. The final
  changes have generated-operation, type and affected-consumer tests; this is
  **not** an exact-final-head installed-panel or rendered playback claim.
- Across this checkpoint, supported APIs create one disposable Project (including
  its default Draft), import three synthetic files, and retain two explicit test
  Drafts with three fixture commits. Unsaved probes/positive no-save failures are
  separate. The 64 existing original Images, prior Project/resources/files and
  three synthetic source-file hashes are preserved. The owned Electron tree,
  ports, LaunchServices registration and copied app are cleaned after testing;
  another task's runtime and required dependency distributions are preserved.

An existing pending run freezes its original assembly source. Updating the plugin
does **not** replace that source under the same identity or repair historical
Drafts. Legacy frozen-recipe safety needs a separate explicit migration/admission
policy, without replaying unknown saves or adopting similarly named Drafts. This
is queued next, rather than silently described as repaired by this checkpoint.

Physical file-content/nested-source attestation, installed PanelHost interaction,
whole-video/audio playback, export, Windows, remaining planner/analysis/cache
behavior and the other template flows remain open. Full ownership and whole-
template acceptance remain **0/28**.

The later [`mini-frozen-recovery.md`](mini-frozen-recovery.md) checkpoint implements
historical-run semantic admission and terminal retirement. It retains the original
source/digest and does not repair old Drafts in place. The evidence/counts above
remain those of this assembly checkpoint.
