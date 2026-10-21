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
| `archive-vlog` | Source audit only | Full contract and runtime completion gates above |
| `camera-shutter-dump` | Original-file preflight + single complete Draft commit + durable app-run recovery; full contract still open | Full contract and runtime completion gates above |
| `chris-williamson-style` | Source audit only | Full contract and runtime completion gates above |
| `cinema-vlog-studio` | Source audit only | Full contract and runtime completion gates above |
| `city-weekend-vlog` | Source audit only | Full contract and runtime completion gates above |
| `daily-vlog-8` | Source audit only | Full contract and runtime completion gates above |
| `depth-type-captions` | Shared AI bounded observation + adapter/generated-copy regressions | Full contract and runtime completion gates above |
| `doac-style` | Source audit only | Full contract and runtime completion gates above |
| `fast-switching-stopmotion` | Source audit only | Full contract and runtime completion gates above |
| `four-photo-stop-motion` | Source audit only | Full contract and runtime completion gates above |
| `gongju-gallery` | Duration regression + draft #258; CI pass | Full contract and runtime completion gates above |
| `jude-kinetic-style` | Shared AI bounded observation + adapter/generated-copy regressions | Full contract and runtime completion gates above |
| `mini-vlog` | Source audit only | Full contract and runtime completion gates above |
| `no14-still-video` | Original-file preflight + single complete Draft commit + durable app-run recovery; full contract still open | Full contract and runtime completion gates above |
| `photo-gallery-no2` | Source audit only | Full contract and runtime completion gates above |
| `place-count` | Canonical authoring check + draft #260; automated regressions pass | Full contract and runtime completion gates above |
| `polaroid-photo-dump` | Source audit only | Full contract and runtime completion gates above |
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
