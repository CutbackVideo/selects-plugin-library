# Shared AI consumer migration

The seven remaining local face/matte consumers use `selects-ai-runtime` through
the existing public `selects.ai` SDK. This change adds plugin-private adapters,
not another host SDK or inference engine. Install the consumer and runtime from
the same library revision on an AI-enabled host (validated develop baseline:
2.0.570).

| Consumer | Version | Shared task | Retained plugin work |
| --- | --- | --- | --- |
| EO Shorts | 0.1.1 | YuNet faces | Camera grouping, speaker selection, scene cuts |
| A16Z Style Captions | 0.20.2 | YuNet faces | HSV shot boundaries, face tracking, reframing |
| Travel Beat Vlog | 0.2.5 | RVM image alpha | Original RGB, hero/title layers, song and colour editing |
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
  a derived CFR video when masks must match a rendered composition.
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

Windows checks used isolated current-develop bundles on Windows, not the
official 2.0.557 Windows test release available on 2026-10-07. This validates the
current code and adapter path; it does not claim all seven complete templates
were manually played or exported on both platforms. Pipeline fixtures also
cover timing, composition and legacy postprocessing separately.

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
