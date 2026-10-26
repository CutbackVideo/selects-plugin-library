# Adopt the first source before setting the canvas

The full Summer Trip pipeline with eight explicitly labelled 12-second, 29.97-fps replacement videos failed in assembly with `invalid_span_range`. Setting the canvas before inserting the first source pins the new Draft's default 23.976-fps settings under the existing SDK contract. The subsequent source-to-Draft conversion left Main at frame 471 while the planned ending was frame 472. Both the wet ending music and its dry fallback requested frame 472 outside the timeline.

Assembly now uses its existing first-insert rate adoption and replanning before applying the intended 1920×1080 canvas. The redundant pre-insert canvas call is removed; the first-insert canvas correction remains. No SDK, source allocation, music, title, label or effect design changes are made.

Validation:
- The existing multi-rate assembly test now models the actual canvas-pins-settings contract. It fails against the previous assembly at 29.97 fps and passes with the change, preserving whole-frame event schedules at 30, 29.97, 25 and 23.976 fps.
- Replaying the exact failed production assembly inputs with only that call removed saved a 29.97-fps, 589-frame Draft with the intended dry/wet music and no assembly notes.
- The entire production template was then rerun with unchanged replacement inputs and options: real inventory, local shot scoring, music preparation, planning, assembly, title/look, canonical save, independent SDK readback and native FHD export all succeeded. Saved Draft: `0c3b1a52-f1e2-449e-a9dc-7f40e0774841`, 1920×1080, 589 frames at 29.97002997 fps.

Original sources were preserved. Replacement identities, durations, fps, selection order, before/after scripts and runtime receipts are in the local analysis workspace's `repro-20261023/reported-cases/round3/vlog/`. Installed-gallery interaction, subjective style and interactive playback are separate checks.
