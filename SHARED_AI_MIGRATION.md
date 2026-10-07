# Shared AI consumer migration

The seven remaining local face/matte consumers use `selects-ai-runtime` through
the existing public `selects.ai` SDK. This change adds plugin-private adapters,
not another host SDK or inference engine. Install the consumer and runtime from
the same library revision on an AI-enabled host. The real-media checks below
began on develop 2.0.570. Subsequent checks use develop 2.0.573 with its matching
renderer, preload and MCP bundle.

| Consumer | Version | Shared task | Retained plugin work |
| --- | --- | --- | --- |
| EO Shorts | 0.1.1 | YuNet faces | Camera grouping, speaker selection, scene cuts |
| A16Z Style Captions | 0.20.2 | YuNet faces | HSV shot boundaries, face tracking, reframing |
| Travel Beat Vlog | 0.2.6 | RVM image alpha | Original RGB, hero/title layers, song and colour editing |
| Beat Cutout Gallery | 0.1.4 | RVM image alpha | Cover crop, mask quality filter, outlines, scenes and music |
| Jude Kinetic Style | 0.4.8 | YuNet faces and RVM video alpha | Crop policy, inverted matte sprites and coverage |
| Depth Type Captions | 0.3.6 | RVM video alpha | Rendered source clock, inverted masks and caption composition |
| Portrait Beat Montage | 0.1.13 | RVM video alpha | Per-shot matte transforms, transitions and music |

## Resource and job ownership

- `shared/ai-resources.cjs` resolves the persistent project Resource UUID from
  canonical media references or a guarded join of public source files and
  `listProjectResources`. Clip/transcript aliases never become AI Resource IDs.
- `shared/ai-job-client.cjs` saves a deterministic request identity before
  submission. Main owns inference; a reopened panel observes the saved job.
  Aborting an observer detaches it. Explicit cancellation is durable; a fresh
  user attempt can retry a failed/canceled job with a new request key. Template
  remounts keep the same run intent; a new template Apply is a separate attempt.
  Existing whole-run lifetime policies, including A16Z's ongoing Short build,
  remain in place.
- `shared/video-ai-frames.cjs` materializes durable, adopted PNG masks through
  `prepareMatte`. It verifies the Resource, dimensions, count and source clock
  before using the existing plugin-specific postprocessing. These consumers use
  a derived CFR video when masks must match a rendered composition. Windows
  Portrait sources explicitly enforce output CFR to avoid sparse timestamps
  after seeking a fractional source frame. Its source-recipe namespace prevents
  unfinished runs or prepared units from reusing the older Windows input;
  unchanged Mac caches and resumable runs remain usable. Mask copying uses bounded batches
  after the complete manifest has passed validation; it adds no host timeout
  argument or SDK method.
- Face sampling uses the source-video clock. Long requests are split below the
  runtime decoded-frame limit while retaining one global sampling grid.

Private YuNet/RVM installers, Apple Vision inference and the active paid Windows
matting paths are removed. Shared runtime setup remains responsible for model
and dependency provisioning. Some unshipped/reference-only tools remain for
non-inference reconstruction or regression comparisons.

## Subjects and validation limits

Existing person/foreground choices remain. Objects and animals are submitted to
the same RVM task without a class filter or an additional model. This preserves
the requested workflow, but does not promise a usable mask for every subject.
In real SDK tests, a dog photo produced an empty mask and a fruit photo produced
almost no alpha; the person photo produced a nonempty mask. Previous Apple
Vision quality measurements do not describe the new model.

The integration checks on macOS and Windows exercised real Main-owned image
matting, durable image adoption, canonical file paths, original-RGB/alpha
composition, a 30-frame video matte, video materialization/inversion, YuNet
sampling and same-job recovery. Windows RVM selected DirectML; profiling
confirmed GPU kernels. On Windows, all original RGB bytes and every
mask-to-alpha byte in the three resulting PNGs were preserved exactly.
The new lossless FFV1 AVI inputs also passed project registration, real RVM
decoding and all 30 durable-mask timestamps on both systems. They are private
AI inputs; the final Draft uses the original footage or finished MP4 pieces.

## Full real-media checks (2026-10-07)

The video source was a five-minute Chris Williamson interview with its original
audio and real transcription. Timeline consumers used different 18–30 second
ranges; Travel and Portrait used distinct four-second excerpts of that same
interview. These are multiple excerpts, not a diverse collection of shoots.
Photo tests used natural-background PPM person photographs; supplied alpha
ground truth was not used for inference. Music was the plugins' existing
licensed/CC0 music.

On Mac, all seven consumers created persistent Drafts and native video exports
with the expected composition. All seven saved Drafts also passed actual native
playback on 2.0.573; EO, Jude and Depth were exported in full again on that host.
EO and A16Z exercised their production
controllers through a genuine mounted Panel host; Jude, Depth and Portrait used
the actual template runner. Travel and Gallery exercised their production
pipeline functions with public host SDK calls and real model outputs. Their
Mac harness replaced browser image decoding with FFmpeg and Panel storage with
scratch-file storage; it did not verify every photo-panel UI interaction.
Windows checks use mounted panels/template runners in an isolated develop
bundle rather than modifying the installed application or its user profile.

Real testing also found and fixed four integration problems in this PR:

- Normalize native file-removal flags so cleanup cannot discard valid face
  results or stop EO.
- Import Jude music in a Project operation before committing its Draft edits;
  first import and repeat application both retain exactly one music clip.
- Copy adopted masks in bounded SDK calls, and enforce Portrait's Windows CFR
  source clock. A real Mac copy of 431 masks completed in 0.8 seconds with every
  byte preserved.
- Round Gallery scene edges cumulatively at the destination frame rate. Its
  15 scenes now land on their exact beat frames at 24000/1001 fps.

Performance remains a separate limitation. Mac Portrait's complete run took
30 minutes 5 seconds, with 8.4 seconds of recorded RVM inference across 15 jobs
and 450 frames. It continued for 28 minutes after the last AI job finished.
Mac Gallery took 14 minutes 35 seconds, with 10.0 seconds of recorded inference
across 40 photos, and generated roughly 870 MB of postprocessing assets; 864 MB
was ProRes sticker video. Existing small SDK RGB transfers, pixel processing
and encoding dominate the remaining work; the current logs cannot separate
their individual durations. Successful migration does not make these complete
templates fast or compact.

RVM selected hardware WebGPU/Metal on Mac and DirectML on Windows; previous
Windows profiling confirmed GPU kernels. YuNet's lightweight CPU provider is
intentional. Existing optional GenAI services are outside this local-inference
migration. The Windows A16Z test used its existing semantic rules fallback
because the configured Claude subscription had expired; its real local face
detection, Draft composition and native export still completed.

The latest per-platform generation, playback and export matrix is maintained in
[PR #197](https://github.com/CutbackVideo/selects-plugin-library/pull/197).
Pipeline fixtures also cover timing, composition and legacy postprocessing
separately.

## Repeatable checks

```sh
python3 tools/check_public.py
python3 tools/check_templates.py
python3 tools/plugin_files.py check
python3 -m unittest discover -s tests
node --test tests/shared_ai*.test.cjs tests/video_ai_frames.test.mjs
node --experimental-strip-types --test tests/eo_shorts*.test.mjs
node --test plugins/a16z-style-captions/tests/*.test.cjs
```

Set `SELECTS_CLIENT_REPO` and `SELECTS_DEV_REPO` to an AI-enabled app checkout
when running the SDK declaration checks; standalone library CI exercises the
behavioral contracts and package checks.
