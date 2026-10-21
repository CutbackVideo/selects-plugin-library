# Photo-template Audio readback

Four Photo Reveal 0.5.8 and Camera Shutter Dump 0.1.15 extend the existing native
Image authoring and durable-run modules. No new module, SDK or client capability
is added. Chan's apps, template packs and excluded compatibility production code
remain untouched. Neither template nor the 28-template objective is complete.

## Failure and input contract

Camera intends twelve shutter sounds, selected cyclically from six bundled
Audio Resources, at the exact intervals in its fps-adjusted plan. No.14 Music On
intends one Main Audio Resource spanning the whole Draft; Music Off intends no
sound. These paths use default source routing, 0 dB, no volume keys and no edge
fades. The existing music source-window selection remains template-owned.

Camera's former working-copy check counted known sounds and their start frames.
It did not tie each sound Resource to its intended occurrence. Independent
persisted verification checked neither template's sound. A swapped shutter
Resource, missing music, silent routing, changed volume/fades or unexpected
sound in Music Off could still be reported as a verified save.

All first 24 Audio behavior tests failed before implementation. The fixture
persists sound metadata separately from working state and executes the actual
compiled create/template paths. Added cases include equal-count/equal-start
swapped Resources, changed Resource type, corrupt journals and fractional fps.

## Shared feature and ownership

`inspectImageAudio` lives in `shared/native-image-authoring.js`. Templates keep
their existing Audio selection and timing policy. Camera resolves each newly
placed sound's generated identity through a fresh clip-list diff; the intended
Resource ID and frame range come from the original plan. No.14 records the
intended Main music identity or an empty set for Music Off.

The helper checks the exact Main/Audio-lane set, clip/track identity, kind,
Resource ID/type, interval and explicit source routing. It reads level, volume
keys and fades through the public `clipAudio` API and compares them with the
intended settings. The current recipes intend default routing, 0 dB and no
fades/keys. Normal create paths check this before their sole commit. The result
stores normalized expected values in the existing durable journal before the
SDK reply; a separate SDK request verifies persisted state. Saved observations
are never adopted as intended values.

Music Off checks for unexpected sound without requiring an unused `clipAudio`
API. Sound-bearing requests fail before commit if the read is unsupported or
unavailable. Audio assets may already have been prepared in the Project and are
not rolled back. Existing low-level finish builders retain their former result
contract rather than claiming the new independent verification.

The bounded journal validates sound identities, disjoint visual/sound IDs,
frame ranges, routing and level/key/fade shapes. Its Audio field is optional for
generic consumers but required for current photo recovery, including an empty
Music Off array. Missing old evidence or a manual change is reported for
inspection without saving again or rewriting the journal.

## Evidence and remaining work

- New Audio behavior tests: 38 pass. Focused photo/atomic/durable/title/graphic/
  transform suite: 198 pass. Broader photo/SDK regression: 466 pass, including
  the focused suite. Generated scripts typecheck and fit the existing budget;
  minified fresh-VM remounts and the real-file durable claim remain covered.
  Python: 285 pass, 6 skipped. Public source, package and generated-copy checks
  pass; the pre-push template gate is required before publishing the branch.
- Client `origin/develop` source for `draft/clip-audio.ts` reads the working
  copy and reports level/keys/fades; its existing default-state test returns
  0 dB and zero fades/keys. Public `ClipInfo.audioSourceIndexes` distinguishes
  default routing (`null`) from explicit silence (`[]`). This source inspection
  is not installed-app execution evidence.
- The existing public reads used here do not expose the exact source offset.
  This checkpoint therefore does not prove No.14's 26.2-second music offset,
  shutter source trim/speed, parent-track mute/level, original bytes, audio
  decoding or audible output.
  It also does not verify effect/program identities, editable definitions,
  layer order or every other audited finding.
- Installed-app execution, Windows runtime, original and changed-input visual/
  audio comparison, full AV playback and export remain separate required gates.

Next, verify effect program/parameter ownership with bounded evidence, and find
or implement an authoritative public source-time read before claiming complete
Audio verification. Do not infer source offsets from Draft placement frames.
