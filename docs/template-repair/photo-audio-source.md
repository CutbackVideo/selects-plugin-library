# Photo Audio source-window verification

Four Photo Reveal 0.5.10 and Camera Shutter Dump 0.1.17 extend the existing
native Image authoring and durable-run modules. No production module is added.
Chan's apps, template packs and excluded compatibility production code remain
untouched. Neither template nor the 28-template objective is complete.

## Concrete gap and intended input

The previous verifier confirmed sound identity, Draft placement, routing and
level/fades, but not which part of the original sound was used. No.14's music
starts at Resource time 26.2s while its Draft placement starts at zero. Camera
intends twelve sounds from six cyclically selected Audio Resources, each from
source zero. Both recipes intend identity playback and preserved pitch. A
source slip, retiming or changed pitch policy could previously be accepted as
verified, including after reopening the saved run.

The first 36 new cases failed before implementation; Music Off was a passing
control. Tests execute the real compiled create paths with separate persisted
state, and fresh minified panel realms for recovery. A source slip moves both
source boundaries while keeping placement unchanged. The small-drift case is
one source Tick, independently represented in test data only.

## Shared feature and lifecycle

`inspectImageAudio` now reads `clipSourceWindow` using a fresh original ClipInfo
and compares its identity and immediate Resource-source boundaries with each
template's intended values. Existing ClipInfo facts supply exact rational rate
and pitch policy; no duplicate SDK rate observation is added. It never infers
source time from Draft placement or reads internal persisted JSON.

Time comparison permits floating-point arithmetic noise only, using eight
machine epsilons scaled to the operands. It does not reuse the level/fade
relative tolerance. Null, missing, foreign-identity, shifted or nonfinite
source reads fail; source-read diagnostics retain a private cause while the
public failure uses a safe message. Unsupported sound-bearing hosts stop before
the sole Draft commit. Preparation may already have imported reusable Audio
Resources; those imports are not rolled back. Music Off still verifies an
empty set without requiring an unused source-time API.

Normalized expected `source` evidence enters the same bounded Audio receipt,
48 KiB journal and pre-commit budget check. It stores source start/end, rate
and pitch intent, rather than adopting saved observations as the expected
state. Independent saved readback and remount use the same verifier. Generic
record readers still accept old eight-field Audio rows; current Image recovery
refuses missing source evidence before another SDK dispatch. Corrupt or edited
records are preserved, and no save is replayed.

## SDK dependency and evidence boundary

This feature depends on [client PR #7828](https://github.com/CutbackVideo/cutback-client/pull/7828),
commit `56a290fa2ba69025f3d5d5eb6278618b4d7f92b0`. Do not publish these versions
before that SDK is available to users. The installed SDK was not overwritten.
Legacy low-level finish helpers retain their existing result contract.

The pinned client's imported Audio skeleton uses a 120fps source clock.
`insertResource` snaps the requested window on the source grid before its
single media clip conforms to the Draft grid; Audio alone does not trigger
video-format adoption. An independent probe executed the actual SDK/domain at
30, 25, 24000/1001, 30000/1001 and 60fps and confirmed the fixed 26.2s source
instant and intended final span. That is local SDK evidence, not an installed
app run. The production feature hard-codes neither 120fps nor storage Ticks.

The broader check exposed a preexisting No.14 inventory test that still sent
path-only selections and omitted file observations. It also fails at the parent
commit. Its fixture now supplies the already-required Resource identity and
file reads, while preserving the two unmigrated consumers' path-only contract.
No production input validation was weakened.

Remaining gates include installed-app/Windows execution, independent real saved
readback, full AV playback/export and original/changed-input comparison. Source
boundaries do not verify media bytes, decoding, parent-track mute/level,
effect-internal clocks, intrinsic Blend/Spatial Conform, layer order or all
other audited behavior. The public observation does not flatten nested
Resources to physical media-file time.
