---
name: recap-2026
description: Build the fixed 2026 travel recap template from selected Selects footage.
---

# 2026 Recap

The companion panel is installed at `SELECTS_USER_PANELS_ROOT/recap-2026/panel.tsx`.
This Skill folder owns `timing.json` and `assets/recap-2026-fixed-soundtrack.wav`.
The panel reads these through `SELECTS_USER_SKILLS_ROOT/recap-2026/`.

The published package does not install an example render. `preview.mp4` and `poster.webp` ship at the plugin root as gallery assets only, so the panel's "finished example" player stays empty after a fresh install and reports that the example is unavailable. Dropping a 61.5-second render at `assets/preview.mp4` re-enables that player locally. Such a render is never a source clip and is never inserted into new Drafts.

## Fixed template

- 1080 × 1920 portrait Draft.
- Slot 1: 4.7-second intro with separate editable `thank you` and `2026` title graphic.
- Slots 2–160: 159 short clips following `timing.json`.
- Repeat slots 61–143 with the same source ranges, in the same order.
- Last placement holds through 61.498 seconds, with a black fade near the end.
- Add the bundled original soundtrack as one separate Audio clip. It includes the 2026 narration.
- Mute source-footage audio.
- Do not include the TikTok reference audio or frame-recording UI in the output.

## User input

The panel's order is intro, fast-cut folders, optional exclusions. The user first picks one intro video from any video folder in the project and places a 4.7-second selection window on its source timeline. The intro preview shows the full uncropped frame; its filmstrip and slider change the start time. The user then selects one or several folders of imported videos for the fast cuts; the largest video folder is selected by default. All eligible videos in those folders are used automatically. The optional collapsed "Exclude specific videos" list lets the user remove individual videos from the fast-cut pool. The intro can come from a different folder and is selected independently. The collapsed "Adjust one fast cut" section uses the same source-timeline window picker; it labels positions 1–159 in playback order, shows the first output time and selected duration, and notes when a position repeats later. Read the exact duration for each logical slot from `timing.json`, using the longest placement of that slot for the picker window. Changing folders or exclusions refills the fast cuts; manual fast-cut choices made before that change are replaced.

When there are fewer than 160 videos, fill all 160 slots deterministically: use the chosen intro video of at least five seconds for slot 1, then cycle the selected-folder videos that are not excluded in filename order for slots 2–160. Repeated passes should start at different source offsets where source duration permits. If only one video is available, it can serve as both intro and montage. Exclude source videos under 1.7 seconds because the longest montage placement is about 1.55 seconds plus a frame margin. Never truncate the template merely because the footage pool is small; the fixed soundtrack and output remain about 61.5 seconds long. The repeat of slots 61–143 in the timeline is separate from this source-pool cycling.

No music, narration, year, BPM, title, transition, or cut-order selection is requested. If the user asks to change those, update the fixed template intentionally rather than silently changing one Draft only.

## Build rules

Use the panel's deterministic timeline builder. Read the Project's current source files and Draft fps at run time. Never embed the example Project's resource IDs or absolute paths in distributable code. Convert each absolute timing boundary to a Draft frame before placing its clip; never round each 0.229-second duration independently. Every input slot must resolve to an accessible source range long enough for its longest placement. Use cover scaling for landscape footage in the portrait Draft.

Create and save the intro first. Append short clips in batches, reading the current Main clip count before each batch so a repeated call does not duplicate already committed clips. Add soundtrack and title only after the picture is persisted. Keep the soundtrack and title off the Main footage track.

## Installation

Place `panel.tsx` at `SELECTS_USER_PANELS_ROOT/recap-2026/panel.tsx`. Place this Skill folder, `timing.json`, and `assets/` under `SELECTS_USER_SKILLS_ROOT/recap-2026/`. The panel runs on macOS and Windows with the Selects SDK (host file access and bundled ffmpeg), and no Python or model download. New projects may need analysis of the bundled soundtrack before overlay placement.

The bundled fixed soundtrack is redistributed with this package; the generating account's plan permits redistribution. Installed files contain no project footage. The gallery `preview.mp4` and `poster.webp` at the plugin root are a render of the author's own example footage, published with the author's consent, and are not installed or used at run time.
