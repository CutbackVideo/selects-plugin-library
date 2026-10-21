# Validation and limits

## Current repair checkpoint: 0.3.13

The hidden app-run now uses the existing shared durable run feature. Its request
identity includes ordered photo/video IDs and kinds, effective music, duration
and BPM, excluding display names. It claims before selected-media/asset work,
pins run/Project/library, writes a conditional result receipt inside the same
authoring SDK invocation and independently verifies saved recovery. Lost or
unknown outcomes are never replayed automatically. The initial 26-case parent
suite failed 24 with two controls; the expanded current 50-case suite passes,
including real compiled/minified panel entry points. See
`docs/template-repair/gallery-run.md` in the source repository.

No new shared feature or public client surface was introduced; the other four
durable-run consumers and canonical function bodies are unchanged. Current
installed-host/actual Windows, whole AV/playback/export, owned assets and complete
source-clock/composition acceptance remain pending. Earlier evidence below is
historical, including the live preview failure.

## Earlier repair checkpoint: 0.3.12

Normal creation now uses the existing shared working-copy authoring and receipt
checks. It authors all 21 Image/Video tiles and optional music before its only
commit, acknowledges only the complete saved identity, and independently reads
back transforms, effects/programs, graphics and Audio evidence. The first ten
parent-source cases failed nine with one control; the expanded 33-case parent
baseline failed 30 with three controls. A malformed host-limit regression also
failed before its fix. Current evidence and remaining work are recorded in
`docs/template-repair/gallery-atomic.md` in the source repository.

Client #7847's panel deadline contract is required; sound-bearing verification
also requires #7828's source-window reader. No binary was installed or deployed.
At this earlier checkpoint the hidden app-run still needed durable ownership/recovery, asset ownership,
source-clock completion and installed/actual Windows/whole AV/export checks.
Explicit legacy low-level staged repair operations retain their old contract;
they are not the normal new-creation route.

## Earlier repair checkpoint: 0.3.11

Selected originals are verified before bundled-music import or short-video
preparation. The shared original-Image feature supplies stat/read-one-byte/stat
and fresh dimensions, with no caller-size fallback. Kind changes, path ambiguity
and missing IDs stop before mutation; intentional reuse and frozen-path alias
binding remain. Browsing excludes ambiguous candidates without reading unrelated
original files. Placement rechecks source facts within its mutating SDK call.
The canonical connection wrapper now handles initialization failure/timeout.

The existing generator emits a self-contained installed input-facts artifact;
isolated-package tests ensure the installed builder does not import repository
paths. The original 23-case source suite failed 22 with one control before the
fix, with further failing identity/reobservation/packaging/bootstrap checks.
The new CI step runs all Gallery tests, including React ordering and local
ffmpeg/Python parity. See `docs/template-repair/gallery-input.md` in the source
repository for current evidence. Old records below remain historical evidence.

Multiple staged Draft commits, durable app-run recovery, asset ownership, source
clock boundaries and complete saved-property verification still need migration.
Installed-app/actual Windows, full playback/export and changed-input quality
remain unverified for this version.

This experimental version creates a new editable Draft with 21 independent visual clips. The 3-by-7 grid, reveal order, and shared grayscale-to-color event follow `reference-oracle.json`. Photos remain original Image Resources; the output is not flattened.

## Historical Selects Staging records

- A single panel Create action using 21 original photos saved 21 separate clips. Native export produced H.264, 1080x1920, 60 fps, 853 frames.
- After correcting a Video overlay boundary mismatch, a fresh panel Create action using 15 Images and 6 demonstration Videos saved all 21 clips with exact reveal frames and a shared end at frame 853, without source-audio clips. That earlier repaired attempt remains a first-pass failure. The demonstration Draft played, persisted after app restart, and exported natively.
- A separate live Selects chat request operated the installed panel, explicitly selected 15 original Images and six actual AI-generated scene-motion Videos in slots 4, 6, 11, 17, 19, and 21, and pressed Create once. Exactly one new Draft was saved; the six existing Drafts were preserved. Independent shared `verifyCreated` readback passed for all 21 clips, media paths, reveal frames, transforms, effects, duration, and absence of source audio. This confirms chat-driven creation and saved structure, not complete playback acceptance or universal one-shot reliability.
- Native export of that AI sample succeeded: H.264, 1080x1920, 60 fps, 853 decoded frames. Independent decoded-frame checks passed for all 21 reveal events, grayscale at frame 269, color at 270 and 852, black grid boundaries within two pixels, six moving cells, and 15 stable cells. Source filmstrips and spatial-change measurements confirmed scene changes in all six AI sources; these checks do not certify natural-motion quality by themselves.
- The first bundled-music panel attempt stopped after placing 15 Images because the host's 30-second script deadline expired while placing Videos. A handwritten recovery incorrectly reused session-local Resource aliases and swapped three Video slots; that run failed independent path verification and is not a successful first attempt.
- After adding bounded operations (one Video or at most three styled tiles per script), a fresh panel Create completed once with 15 original Images, six existing AI Videos in slots 4, 6, 11, 17, 19, and 21, and one bundled B2 Audio clip spanning frames 0–853. Panel readback and an external shared verifier passed using the independently preserved input paths. Exactly one Draft was added; existing Drafts were preserved. The saved Draft remained readable after restarting the app.
- Native export of the B2 sample passed the same independent video checks at 1080x1920, 60 fps, and 853 decoded frames. Its single Audio stream matched the selected bundled excerpt with decoded correlation 0.99968, without clipping or unexpected silent intervals. This verifies export content, not live preview playback.
- Planner, shared operation, native Image adapter, and panel behavior tests cover input count, explicit reuse, aspect ratios, focus, tempo, duration, stale Project context, duplicate execution, and saved readback. Short-video hold tests (`hold.test.mjs`) run the panel's hold code on the local ffmpeg and check frame count, held last frames, cache reuse and rebuild, and decoded-frame parity with the former `hold_video.py` (kept in `dev/`). BPM tests (`tempo.test.mjs`) check that the panel's estimate returns the same result as the former `tempo.py` (also in `dev/`) on click tracks, silence, a resampled MP3, and the bundled music. Generated Video duration metadata fallback has a regression test. Automated tests do not replace live app acceptance.

## Remaining limitations

- Live app playback of both the silent AI sample and the B2 sample failed acceptance. The B2 preview displayed `00:00:00 / 00:00:00` and the playhead stayed at frame zero after transport attempts and explicit reopening. Reloading did not resolve the observed preview state. Post-restart playback still needs a separate check. A successful saved readback or export is not a passing preview result. The library preview uses the verified native export; live editor playback remains a separate limitation.
- The earlier internal Image-service route described in historical records is replaced by public original-Image placement. The current source/input/connection repair still needs installed-host validation.
- Automated single-slot replacement in an existing Draft is unavailable. Edit individual clips in the Selects timeline; do not imply the plugin preserves manual edits through an unsupported replacement.
- Bundled B2 import, placement, and native export are verified. The Windows build (version 0.3.5 onward: no shell or Python) has automated coverage only and still needs a live pass on Windows. Automatic BPM, other music inputs, short-video completion, and duplicate-click/transport-loss behavior need additional live acceptance runs. Automated tests alone do not certify these cases.
- Continuous visual review of natural AI motion remains a separate acceptance check. AI generation is source preparation, not a dependency or an automatic generation feature of this plugin.

Creation, saved structural readback, actual playback, and native export are separate outcomes. Inspect the existing Draft before retrying an unknown save result.

The gallery preview is a compact version of the verified B2 native export containing 15 original Image clips, six actual AI scene-motion Video clips, and the selected bundled music. It replaces the earlier silent AI preview and moving-crop demonstration. Preview media are gallery assets and are not installed as user input resources.
