# Sequential template repair: active

## Objective and non-negotiable completion gates

Repair all 28 audited Clip highlights templates while converging on a small,
reusable feature-module pool. Chan's Shortform Clips and template packs are
excluded. Findings are not fixes. The original scope is not reduced to the
consumers already migrated.

Every change follows RED -> GREEN -> REFACTOR: demonstrate the actual failure,
implement a narrowly owned fix, then extract or reuse the feature at a second
consumer. Preserve dependencies of existing consumers. Keep Project/Resource
identity, source/Draft time units, side effects, errors, cancellation and saved
results explicit. Do not turn design choices into bugs.

A template is complete only when its audited defects are accounted for with
code and behavior evidence; valid declared inputs and failure inputs are
covered; relevant existing consumers remain compatible; generated copies pass
checks; supported host/platform execution is verified; and saved output,
full-video/audio playback and export meet that template's original contract.
Unknown observations must not be converted to success or guessed source facts.
Unsupported environments must fail explicitly rather than silently substituting
an unrelated workflow. A passing unit suite alone is not completion.

## Current checkpoint

- Mini Vlog 0.1.0-alpha.13 prepares verified, content-addressed bundled music
  outside the plugin installation in both entry points. It reuses the existing
  asset feature; own music/silence retain their contracts, and earlier cue bytes
  survive a new generation. Initial RED fails twelve of thirteen; all 31 expanded
  cases pass, with 75 Mini/source/identity and 284 related asset/photo checks.
  Eight actual SDK scenarios use one new disposable Project and create no
  Drafts, preserving the earlier Gallery Project. See
  [mini-owned-cues.md](mini-owned-cues.md). The pool stays five features / twelve
  consumers. Existing installation-linked Drafts are not migrated; full template
  and supported-platform/AV gates remain open.

- Gallery 0.3.22 fixes a concurrent cache-index observation race revealed by
  remote Video/PCM checks. The existing derived-file owner reobserves only a
  changed index, at most three times, without replaying a write or encode.
  A persistently changing index stays unknown and cannot trigger replacement
  production. Eight deterministic cases pass after six parent failures; existing
  Gallery contracts pass 440 cases and related photo/asset contracts pass 284.
  Seven actual file-only development-app SDK scenarios confirm the behavior.
  See [gallery-index-observation.md](gallery-index-observation.md). The pool and
  28-template completion gates remain unchanged.

- Mini Vlog 0.1.0-alpha.12 / Archive Vlog 0.1.0-alpha.7 share observed source
  resolution in the existing input feature: five features / twelve consumers.
  Errors retain phase/reason; lost completed insertion replies are observed;
  unconfirmed source steps are not replayed. Original Image size comes from
  native source facts, repairing a 96x160-photo/1920x1080-canvas mix-up. Forty
  focus checks, 71 vlog checks and 966 related consumer checks pass (overlap).
  Seven actual SDK cases use persistent UUIDs and preserve both saved Drafts'
  complete Driver JSON. See [template-source-resolution.md](template-source-resolution.md).
  Original C-09 runtime cause/availability, full template/platform/AV and other
  gates remain open. A missing bounded-read test adapter is corrected on parent
  branches after its exact CI failure is reproduced; no product guard is relaxed.

- Mini Vlog 0.1.0-alpha.11 fixes wrong-cue reuse by filename/approximate length
  and confirms its one music import through an independent Project read. It
  reuses the existing asset reader, generated into the installed operation:
  five features / eleven consumers. The initial eighteen scenarios fail fourteen
  against the parent; nineteen focused checks pass after repair, and the Mini
  Vlog run passes 35 checks. Four actual SDK cases reproduce the wrong content
  and verify correct selection/reuse/lost-reply recovery in new disposable
  Projects, preserving the earlier Gallery Project. See
  [mini-audio-identity.md](mini-audio-identity.md). X12 content-owned music,
  C-09 alias errors and whole-template/platform/AV gates remain open.

- The existing bundled-asset reader now uses its first size observation as a
  bounded read budget and checks metadata afterward. No.14, Stop Motion,
  Polaroid and Gallery receive regenerated active consumers and patch versions.
  Sixteen new cases fail ten against the exact parent and all pass after repair;
  847 related cases pass across 32 files. Seven actual development-app SDK
  scenarios confirm the parent over-read/false-success and fixed behavior with
  no Project mutations. See [bundled-read-bound.md](bundled-read-bound.md).
  Five features / ten consumers remain; full template/platform/AV gates stay open.

- Gallery 0.3.20 fixes lost-reply staging ownership in the existing bundled-assets
  owner. Exact bounded marker readback and a single existing compare-and-replace
  preserve empty-output producers without replaying a mutation. The initial ten
  cases fail seven against the exact parent; the expanded nineteen pass, and the
  related 31-file suite passes 831 cases. Six actual dev-app SDK scenarios cover
  the physical parent orphan, positive recovery and foreign-file retention with
  no Project mutations. See [gallery-stage-ownership.md](gallery-stage-ownership.md).
  Five features / ten consumers remain. Crash/unknown-operation reconciliation,
  cleanup/GC, generic bounded-reader races and full template gates stay open.

- Gallery 0.3.19 repairs a late conversion-success result when the owner stops
  during private-file cleanup or the final source-stat response. The existing
  bundled-assets owner now observes an optional AbortSignal through file I/O and
  rechecks liveness after asynchronous cleanup; Gallery fences its result handoff.
  Complete objects/indexes remain available to a new live request. See
  [gallery-derived-lifetime.md](gallery-derived-lifetime.md). Crash reconciliation,
  lost-reply ownership, full installed/platform/AV and other contract gates remain.

- Gallery now has isolated macOS development-app panel/save/SQLite-reload,
  Driver playback and native MP4 evidence. Actual export exposed an additional
  source-resolution atlas defect after the WASM fix; client #7876 now shares
  presentation-density geometry across the two renderers. Actual pre-encode
  BGRA observation now reduces 3,600 failing border samples to zero; every
  sampled gap is exactly black in both music cases. Byte-verified independent
  encoder replay reproduces all 230 encoded RGB residuals and every decoded
  frame, locating those residuals after composition without relaxing a threshold. See
  [gallery-native-runtime.md](gallery-native-runtime.md) for the repair, codec
  counterevidence and precise remaining acceptance steps. No template is complete.

- Gongju/Recap duration preflight: draft PR #258; CI success observed on
  2026-10-21. The original reported Gongju cause, full installed-template run,
  playback/export and supported-platform checks are still pending.
- Four Photo Reveal/Camera Shutter Dump: original Image source preflight in
  draft PR #259. Read-only checks precede sounds/music import and Draft creation.
  Both remote CI checks passed on 2026-10-21; installed-template gates remain open.
  Their subsequent one-commit working-copy repair is described in
  [photo-atomic-authoring.md](photo-atomic-authoring.md). Durable app-run claims
  and SDK-side receipts now pass two-consumer regression checks; see
  [photo-run-receipts.md](photo-run-receipts.md). Other photo defects and all
  installed save/playback/export/platform verification remain open.
  The local SDK bootstrap now finishes hidden-run connection failures with a
  bounded observation and safe message at both photo consumers; a16z is rebuilt
  for shared-source compatibility. See [template-bootstrap.md](template-bootstrap.md).
  Camera now reads the authoritative Project title; both photo create paths
  check working-copy and persisted graphic receipts. See
  [camera-project-title.md](camera-project-title.md); transforms/effects/audio
  and the full runtime/platform gates remain open.
  Both now verify every Image/graphic intrinsic transform before commit and
  independently after saving, including durable remount readback. See
  [photo-transform-readback.md](photo-transform-readback.md); effect programs,
  editable definitions, full Audio properties and runtime/platform gates remain.
  Audio Resources, Draft intervals, routing, levels and fades are now verified
  before/after commit and on remount. Music Off checks silence. See
  [photo-audio-readback.md](photo-audio-readback.md); source offsets, source bytes,
  audible content, effect programs and runtime/platform gates remain open.
  Program source, parameters, editable definitions, effect order and enabled
  state now have pre-commit, saved-state and remount checks, with a bounded
  source table and unsaved static-preset reference. See
  [photo-program-readback.md](photo-program-readback.md); rendering/Inspector,
  time mappings, Blend/Spatial Conform and layer order remain unverified.
- Place Count's obsolete named capability query: independent draft PR #260;
  canonical Draft-method checks and both remote CI checks pass. Installed-app
  save/playback/export and the other six audited findings remain pending.
- Shared AI observation: read-only bounded retries and recovery identity in
  progress on the existing module; Depth/Travel pilots expanded to Jude/Portrait
  with existing Cutout Gallery/a16z compatibility consumers. See the checkpoint
  document; live inference and complete template outcomes remain pending.
- Existing `shared/media-duration.js`, `shared/local-client.ts`, shared AI client,
  resource adapters, update guards and template-specific planners are reused
  where their contracts match. Do not add overlapping helpers by default.

## Ordered work

1. Finish the current Gongju/Recap and original-photo preflight verification.
2. Repair Place Count's unsupported capability call through the actual SDK.
3. Make shared AI status observation bounded and retry only reads; never blindly
   retry submit, cancellation, import or commit.
4. Converge run lifetime, cancellation, target identity, errors, partial/unknown
   outcomes and save readback at two pilot consumers, then migrate one at a time.
5. Converge Resource identity, paged reads, source/Draft clocks and frame rates.
6. Reuse file/process transport and durable bundled-asset ownership; then apply
   per-family planners, canvas rules, AI caches and visual-quality fixes.
7. Reverify every audited issue and all 28 template contracts on supported hosts.

Keep runtime and generation evidence separate. Public SDK changes, new runtime
import support, global design changes and Chan's app are not implied by this plan.

## Template coverage ledger

No row below is marked complete. Subsequent checkpoints must attach the actual
reproduction, code/tests, save readback, full playback/export and platform evidence.

| Template | Current evidence | Remaining |
| --- | --- | --- |
| `ali-abdaal-style` | Source audit only | Full contract and runtime completion gates above |
| `archive-vlog` | Shared source identity/input observations and native Image facts; source/caller RED/GREEN and actual SDK UUID/alias/photo checks | Original C-09 environment/availability, lifecycle/partial saves and full contract/runtime completion gates above |
| `camera-shutter-dump` | Original-file preflight + single complete Draft commit + durable app-run recovery; full contract still open | Full contract and runtime completion gates above |
| `chris-williamson-style` | Source audit only | Full contract and runtime completion gates above |
| `cinema-vlog-studio` | Source audit only | Full contract and runtime completion gates above |
| `city-weekend-vlog` | Source audit only | Full contract and runtime completion gates above |
| `daily-vlog-8` | Source audit only | Full contract and runtime completion gates above |
| `depth-type-captions` | Shared AI bounded observation + adapter/generated-copy regressions | Full contract and runtime completion gates above |
| `doac-style` | Source audit only | Full contract and runtime completion gates above |
| `fast-switching-stopmotion` | Source audit only | Full contract and runtime completion gates above |
| `four-photo-stop-motion` | Shared bundled Audio/input/bootstrap + single complete commit + durable run recovery and saved-state receipts; client #7828 prerequisite | Full contract and runtime completion gates above |
| `gongju-gallery` | Duration regression + draft #258; CI pass | Full contract and runtime completion gates above |
| `jude-kinetic-style` | Shared AI bounded observation + adapter/generated-copy regressions | Full contract and runtime completion gates above |
| `mini-vlog` | Shared verified content-owned cue bytes in both entries; exact-path own Audio / observed import; shared source identity/native photo facts; caller RED/GREEN and actual SDK music/UUID/lost-reply cases | Existing installation-linked Draft recovery and full X12 acceptance; original C-09 runtime/availability, lifetime/recovery/partial saves and full contract/runtime completion gates above |
| `no14-still-video` | Original-file preflight + single complete Draft commit + durable app-run recovery; full contract still open | Full contract and runtime completion gates above |
| `photo-gallery-no2` | Shared input/run/assets, source-content guards, real SDK/browser rendering; dev-app SQLite/playback/native and codec evidence; shared late-cancellation, lost-reply reservation and bounded asset-read RED/GREEN | Complete image/AV quality, crash/unknown-operation recovery, cleanup failures/GC, installed app, Windows, Inspector, reference/changed-input quality and full contract gates above |
| `place-count` | Canonical authoring check + draft #260; automated regressions pass | Full contract and runtime completion gates above |
| `polaroid-photo-dump` | Shared input/bootstrap + generated-frame exclusion + verified bundled assets + one complete save, durable app-run ownership/recovery and independent receipts; client #7828 prerequisite | Full contract and runtime completion gates above |
| `portrait-beat-montage` | Shared AI bounded observation + adapter/generated-copy regressions | Full contract and runtime completion gates above |
| `postcard-cutout-studio` | Source audit only | Full contract and runtime completion gates above |
| `recap-2026` | Duration regression + draft #258; CI pass | Full contract and runtime completion gates above |
| `selfie-aesthetic` | Source audit only | Full contract and runtime completion gates above |
| `summer-trip` | Source audit only | Full contract and runtime completion gates above |
| `thank-you-recap` | Source audit only | Full contract and runtime completion gates above |
| `the-end-credits` | Source audit only | Full contract and runtime completion gates above |
| `torn-paper-love` | Source audit only | Full contract and runtime completion gates above |
| `travel-beat-vlog` | Shared AI bounded observation + adapter/generated-copy regressions | Full contract and runtime completion gates above |
| `vlog-opening` | Source audit only | Full contract and runtime completion gates above |
