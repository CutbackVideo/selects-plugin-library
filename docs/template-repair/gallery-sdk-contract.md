# Gallery contract through the real Selects SDK

This validates Photo Grid Reveal 0.3.18 from library commit
bdceaf6ea06f09f9e20f9062acd98a9832487844 (draft PR #298). The complete
28-template goal remains active; Chan's shortform apps and packs are excluded.

## Reproducible command

```sh
SELECTS_DEV_REPO=/path/to/combined-selects node tools/check_gallery_sdk.mjs
```

The client checkout must contain the panel deadline change (#7847), source-window
reader (#7828), and fresh Project/file-fingerprint change (#7866), plus its
normal dependencies and ffmpeg/ffprobe on PATH. The command identifies the client
Git revision, copies this repository's spec into a newly reserved client-local
validation directory, runs that client's Vitest with one worker and removes only
that directory in a finally block. It neither installs a binary nor opens an app.
No shell interpolates selected media paths. Missing configuration fails explicitly;
it does not silently skip or substitute a fake SDK. The normal library CI remains
independent because it does not include the private client checkout.

## Boundaries actually exercised

- The generated Gallery SDK operation is compiled and run in the actual script VM.
- Real Project, Resource, Sequence and Clip models, SDK working copies,
  McpRendererBridge and Storyboard perform placement, styling and commit validation.
- Real RemotionSequenceRenderingValidator compiles tile TSX with the same overlay
  compiler and computes real source hashes. This verifies program acceptance and
  stored program readback, not a rendered frame or correct animation appearance.
- Public file observations use the actual local-files bridge with bounded reads
  of disposable PNG, MP4 and WAV files. FFmpeg creates the fixtures; FFprobe and
  the product's media-probe projection observe their actual technical metadata.
  Audio-level measurement is explicitly unmeasured; BPM is manual 113.
- Real host AgentIdCodec maps UUID resources to r0-style aliases. Later independent
  script calls use the same Project scope. A raw external-ID control also passes.
- Project, Resource, Sequence and Generator ports use isolated in-memory storage.
  The renderer's actual commit implementation validates/persists through an
  in-memory history transaction adapter; this does not test SQLite atomicity or
  an installed application's persistence, reload, history UI or cloud sync.

## Cases and causal evidence

Ten cases pass: Images only, Videos only and the 15-Image/6-Video reference slot
mix, each with and without one Audio overlay; a raw-ID control; source-byte and
selected-dimension changes after placement; and source change immediately after
save acknowledgment. Every successful case creates 21 separate visual Clips,
uses exactly one Sequence/Project save pair, checks Project membership and runs
both the Gallery structural readback and existing common full program/transform/
Audio/source-window receipt verification in later script calls.

The source changes are injected at real bridge boundaries, not into a fake Draft
method. Before-commit changes save nothing. A post-save source change reports an
unknown verification outcome while retaining the acknowledged Draft ID.

The same ten-case probe against the pre-guard parent 1c05875813abe5e729a5f55d02e6f95b8b3a7293
passes all seven stable controls but fails the three source-change cases: it
incorrectly returns saved in each. With 0.3.18 all ten pass. Initial setup failures
from an omitted rendering validator and an incomplete legacy readback request
were fixture defects, corrected before the parent/fixed causal comparison; they
are not reported as product bugs.

The combined client validation tree d3e146c0c includes #7866's implementation and
strict-test fix, #7828's source window and the generated declaration docs update.
It is a local combination of the draft branches, not a claim that they were
merged, released or installed together. The standalone #7866 final head is
8fc5fbecd3d5511baed4ed478d1772b4f4e40236. Its normal pre-push checks pass both
TypeScript targets, the ratchets and 38939 unit cases (38 existing skips).
Two initially stale generated-document checks were corrected and then passed in
the full suite. No checks were bypassed.

## Remaining acceptance

This probe does not establish frame rendering, layer order as seen on screen,
Inspector editing, motion appearance, real-music BPM accuracy, complete playback,
export, installed Selects/Windows behavior, reference reproduction or changed-input
quality. The media files are small generated fixtures, not the reference originals.
The default scaffold currently resolves to 24000/1001 fps; this probe reads that
actual grid instead of claiming it tested every Project grid. Earlier timing tests
cover other grids at their own narrower scope. File fingerprints remain
observations, not locks or immutable Resource revisions. All remaining template
work and installed/runtime gates remain open.
