# Photo intrinsic transform readback

Four Photo Reveal 0.5.7 and Camera Shutter Dump 0.1.14 extend the existing
native Image authoring module. No module, client capability or public SDK is
added. This checkpoint does not complete either template or the 28-template
objective. Chan's apps and the excluded compatibility production code are
untouched.

## Root cause and reproduction

The finish functions wrote desired Image/graphic transforms but did not read
them. Pre-commit checks and independent persisted verification covered clip
identity, intervals and graphic parameters; a wrong position/scale/rotation,
flip, anchor or intrinsic motion line could still be reported as a verified
save. An ignored transform mutation could therefore be committed as success.

The first 24 behavior tests produced 22 failures. They use actual compiled
template paths with separate working/saved state: an ignored transform write,
missing read capability, wrong saved Image/graphic placement, flips and motion
keys, remount after a manual move, and an older journal missing evidence. Two
roundoff cases passed before the fix. Additional coverage tests the remaining
fixed groups and malformed durable evidence.

## Ownership and verification

The original design math stays template-owned. Each finish path records the
desired Image transforms beside the existing mutations. Camera also records
its Burst/Text transforms; No.14 expects the documented identity transform for
its centered decoration. The expected values do not come from a mutation reply
or an unchecked snapshot of current state.

`shared/native-image-authoring.js` supplies `inspectImageTransforms`. It reads
fresh SDK ClipInfo targets, requires coverage of every visual clip, and compares
the resolved transform with the intended values. Omitted recipe values expand
to documented SDK defaults. Position, per-axis scale, rotation, anchor,
enabled, both flips, and position/scale/rotation key groups are checked.
The templates use fixed intrinsic transforms; effect-driven animation stays
in its existing separate effect contract. Numerical conversion noise up to
`1e-8 * max(1, abs(expected))` is tolerated; missing/nonfinite values and changed
groups are refused.

Both normal create paths verify their working copy before the sole commit.
The normalized expected values then pass through the existing durable run
receipt. A separate SDK invocation reopens the saved Draft and verifies the
same evidence. It never substitutes the pre-commit working copy for persistence.
Unsupported reads fail before commit, although Project audio may already have
been prepared and is not rolled back. Legacy low-level finish builders keep
their existing commit-result contract rather than claiming new verification.

`shared/template-run.js` validates optional transform records against the exact
Image/graphic identity set and requires well-formed finite values and positive
scale. Generic consumers can omit the field. Image recovery cannot claim a
verified result from an older receipt missing it; it requires inspection,
preserves the file and never replays a save. A manual edit found on remount is
also preserved and reported for inspection.

## Evidence and remaining work

- New transform tests: 46 pass, including minified fresh-VM remounts, ignored
  mutations, unsupported reads, seven saved-state mutation groups for Images
  and graphics, coordinate roundoff and corrupt durable records without a new
  dispatch.
- Focused photo/title/graphics/atomic/durable suite: 160 pass. Broader photo/SDK
  regressions: 428 pass, including the focused suite. Generated SDK scripts
  typecheck and fit their existing budget; scoped generated-copy checks pass.
  Python: 285 pass, 6 skipped. Public source and installation-package checks pass.
- The SDK declarations document the transform defaults, coordinate units and
  key groups. Client implementation confirms a live working-copy read through
  `clipTransform`; no new Electron/renderer capability is introduced.
- Full effect stacks, program identities and editable definitions, Audio
  routing/volume/fades/source trim, layer order and the remaining template audit
  findings are not all verified. Installed-app execution, Windows runtime,
  complete AV playback, original/changed-input visual comparison and export
  remain separate required gates.

Next, extend the existing module's evidence contract for effect programs and
Audio rather than creating per-template verification helpers. Keep the other
26 audited templates in the coverage ledger; none is completed by these tests.
