# Photo effect and graphic program readback

Four Photo Reveal 0.5.9 and Camera Shutter Dump 0.1.16 extend the existing native
Image authoring/durable-run modules. No new module, public SDK, client/binary
capability or dependency is added. Chan and excluded compatibility production
code remain untouched. Neither template nor the 28-template objective is done.

## Root cause and intended programs

Previous verification checked visual identities/intervals, explicit graphic
parameters, intrinsic transforms and Audio. It did not read effect programs,
their order/enabled state or graphic TSX/Inspector definitions. An ignored
effect write, changed crop code, reordered Fade down, extra parameter or missing
control could still be reported as a verified save. All initial 25 program
tests failed before implementation; two later private-diagnostic tests also
failed before error-boundary correction.

Camera intends crop effects on photos 1-10, empty effect stacks on 11-12 and its
Burst/Text programs on separate graphic clips. No.14 intends its native crop/
reveal program per Image, then the static Fade down preset where its existing
Music On reference plan specifies it, plus its decoration graphic. Existing
layout/time math, source text, controls and program parameter choices remain
template-owned.

## Shared feature and evidence ownership

`imageProgramsFeature` in `shared/native-image-authoring.js` compares fresh
SDK visual/effect targets with the intended source, parameters and editable
definitions. It requires every visual occurrence, exact effect stack length,
order/index, label and enabled state, and correct graphic/non-graphic status.
It expands declared control defaults before comparison. Object property order
does not matter; program source and control order are preserved exactly.

The public preset definition returns null effect TSX. No.14 therefore prepares
one isolated unsaved reference using a validated Image and the canonical static
Fade down preset. It validates the public definition, applied preset identity,
label, controls and values before using the returned source as the canonical
baseline. Target output is never adopted as that baseline. The reference is
never committed; the actual complete Draft still has only one commit. This
path is for the existing static preset, not a promise about content-dependent
filters. Saved recovery uses the original evidence and does not recreate probes.

Evidence deduplicates source strings separately from placement-specific values
and definitions. Before committing, the feature reuses `templateRunJSON` on the
actual prospective journal envelope and minimal result, reserving 120 ASCII
characters for a new Draft ID (larger than the host's UUID). Oversized evidence
is refused before saving; the 48 KiB file cap stays unchanged. No original media
paths, full recipes or private diagnostics are added. Program source in a
journal is compared as data, not executed. Unknown program-read failures get a
safe public message. Preparation may already have imported reusable Audio;
those imports are not rolled back.

`shared/template-run.js` stores the optional compact source table and validates
source references, visual identity coverage, control keys, counts and source
use. Generic users can omit this optional field. Current Image recovery requires
it; missing old evidence, corrupt references or manual changes lead to inspection
without another save or record rewrite. Legacy low-level finish builders retain
their former commit-result contract rather than claiming this verification.

## Evidence and remaining gates

- New program cases: 40 pass. Focused photo/atomic/durable/title/graphics/
  transforms/Audio suite: 238 pass. Broader photo/SDK regression: 506 pass,
  including that focused suite. Real compilation/minification, fresh-VM remounts,
  SDK types/script budgets and real-file durable claims remain covered.
- Cases cover changed effect/graphic source, parameters and controls, ignored
  writes, unsupported reads, healthy and edited remounts, old/corrupt evidence,
  canonical reference ownership, effect order, oversized evidence before commit
  and safe errors. A TypeScript inference failure in the read-only feature
  factory call was corrected without weakening the type check.
- Independent client preset metadata is pinned in a test-only fixture. Using
  its real controls and canonical Reveal source, minimal saved evidence is about
  21 KiB for No.14 Music On and 41 KiB for Camera, within the unchanged cap.
  Python: 285 pass, 6 skipped; public/package/generated-copy checks pass.
- Client source confirms that authored effect/generator raw TSX is retained
  while compilation adds metadata, and that program reads use live working-copy
  targets. The public preset bridge exposes original controls/starting values
  while omitting effect TSX. This is code evidence, not installed execution.
- Effect-internal time mappings, intrinsic Blend/Spatial Conform, layer order,
  exact Audio source offsets/speed, parent-track mute/level, original bytes,
  rendering/Inspector behavior and the remaining audit findings are still open.
  Full AV playback, original/changed-input comparisons, export and supported
  installed-app/Windows execution are separate required gates.

Continue with authoritative source-time/remaining intrinsic-state reads and
other audited templates. Do not infer full semantic or rendering correctness
from a matching program snapshot.
