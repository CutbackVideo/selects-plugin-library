# Bounded source frame sheets — validation

Preserve all survey frames and appearance-change boundaries while reducing capture round trips. Sorted unique frames share one selection/scale path with at most 48 frames, eight columns and a 24-second span; duplicate/reordered requests retain the branch-based path. This PR does not change capture cleanup or analysis runtime behavior.

## Customer evidence

October 30 recorded 78 FFmpeg start requests. The request round-trip median rose from 0.541 seconds on October 29 to 5.582 seconds on October 30. These are SDK/Main/IPC request times, not decoder-only timing. The customer workload differs from the fixture below; no end-to-end customer speedup is claimed.

## Independent checks (2026-10-31)

Run:

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules \
SHORTFORM_TEST_FFMPEG=/path/to/ffmpeg \
SHORTFORM_TEST_VIDEO=/path/to/fractional-fps-fixture.mp4 \
node --test plugins/shortform-clips/tests/shortform_raw_source_frames.test.cjs plugins/shortform-clips/tests/shortform_windows_speed.test.cjs
```

All 14 checks passed with no skips. The 1920x1080 H.264 fixture is 14.014 seconds at 30000/1001 fps. Real FFmpeg extraction of 12-frame and full 48-frame multirow sheets was compared per tile against sequential decode; mean absolute grayscale error remained below 3, preserving sample positions across cuts. Invalid batch sizes and unordered/duplicate requests were also checked.

The deterministic survey retained all 175 frames and exact boundaries while reducing FFmpeg starts from nine to six. The regression fails against unmodified main and passes with this isolated change. This request-count test is simulated SDK evidence, not a measured Windows or full-generation time saving. Shared-folder cleanup intentionally retains baseline behavior in this PR.

[Customer report](https://cutbackworkspace.slack.com/archives/C09C6B68N1K/p1793349122572779)
