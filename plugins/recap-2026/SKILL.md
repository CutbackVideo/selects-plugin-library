---
name: recap-2026
description: Build the 2026 recap template from selected Selects footage, cut to the measured beat of its bundled song.
---

# 2026 Recap

The companion panel is installed at `SELECTS_USER_PANELS_ROOT/recap-2026/panel.tsx`.
This Skill folder owns `assets/brighter-year-ahead.wav` (the default song) and its `assets/CREDITS.md`.
The panel reads the song through `SELECTS_USER_SKILLS_ROOT/recap-2026/`.

The published package does not install an example render. On first opening, the panel downloads the published gallery `preview.mp4` and optional `poster.webp` from a pinned repository revision through the Selects file SDK. Complete files are cached beneath `.selects/plugin-data/recap-2026/` and played inside the panel through SDK local URLs. A network connection is needed only before caching; example failures do not block Draft creation. The example is never a source clip and is never inserted into new Drafts.

## Template (measured from the song)

The cut plan is not stored; the panel measures the song with `selects.media.measureBeatSync` and plans from it
(the rules come from the reference edit, capcutverse "2023 x clocks"):

- 1080 × 1920 portrait Draft, exactly as long as the song. The whole song plays; it is never trimmed.
- Slot 1: intro with separate editable `thank you` and `2026` title graphic, held to the strongest onset within
  0.6 s of 4.67 s after the song comes in (0.5 s loudness within 8 dB of its median).
- Then one cut per beat subdivision (the song's period inside 0.18–0.30 s), each one subdivision after the last and
  moved onto the strongest onset within 20 ms. On the reference's own audio this rule puts 159 of its 240 cuts within
  one 60 fps frame and 224 within two.
- Distinct slots cover 159/242 of the cuts; the remaining cuts replay the slots from 38 % of the way in, with the same
  source ranges, in the same order.
- The cuts stop one subdivision before the song's pulse ends; the last placement holds to the song's end (repeating
  its source if needed) under a black fade where the song falls 16 dB below its median.
- Add the song as one separate Audio clip. Mute source-footage audio.
- Do not include the TikTok reference audio or frame-recording UI in the output.

## User input

The panel's order is intro, fast-cut folders, optional exclusions. The user first picks one intro video from any video folder in the project and places the intro window on its source timeline. The intro preview shows the full uncropped frame; its filmstrip and slider change the start time. The user then selects one or several folders of imported videos for the fast cuts; the largest video folder is selected by default. All eligible videos in those folders are used automatically. The optional collapsed "Exclude specific videos" list lets the user remove individual videos from the fast-cut pool. The intro can come from a different folder and is selected independently. The collapsed "Adjust one fast cut" section uses the same source-timeline window picker; it labels the fast-cut positions in playback order, shows the first output time and selected duration, and notes when a position repeats later. Read each logical slot's duration from the measured plan, using the longest placement of that slot (at most 1.5 s) for the picker window. Changing folders or exclusions refills the fast cuts; manual fast-cut choices made before that change are replaced.

When there are fewer videos than slots, fill every slot deterministically: use the chosen intro video (longer than the intro) for slot 1, then cycle the selected-folder videos that are not excluded in filename order for the other slots. Repeated passes should start at different source offsets where source duration permits. If only one video is available, it can serve as both intro and montage. Exclude source videos under 1.7 seconds. Never truncate the template merely because the footage pool is small; the output is always as long as the song. The replay of slots in the timeline is separate from this source-pool cycling.

No year, title, transition, or cut-order selection is requested. The song is the bundled default; a different song file gets the same rules at its own tempo and length. If the user asks to change those, update the fixed template intentionally rather than silently changing one Draft only.

## Build rules

Use the panel's deterministic timeline builder. Read the Project's current source files and Draft fps at run time. Never embed the example Project's resource IDs or absolute paths in distributable code. Convert each absolute timing boundary to a Draft frame before placing its clip; never round each subdivision independently. Every input slot must resolve to an accessible source range long enough for its longest placement. Use cover scaling for landscape footage in the portrait Draft.

Create and save the intro first. Append short clips in batches, reading the current Main clip count before each batch so a repeated call does not duplicate already committed clips. Add the song and title only after the picture is persisted. Keep the song and title off the Main footage track.

## Installation

Place `panel.tsx` at `SELECTS_USER_PANELS_ROOT/recap-2026/panel.tsx`. Place this Skill folder and `assets/` under `SELECTS_USER_SKILLS_ROOT/recap-2026/`. The panel runs on macOS and Windows with a Selects build that has `selects.media.measureBeatSync` (plus host file access and bundled ffmpeg), and no Python or model download.

The bundled song is redistributed with this package; the generating account's plan permits redistribution. Installed files contain no project footage. The gallery `preview.mp4` and `poster.webp` at the plugin root are a render of the author's own example footage, published with the author's consent, and are not installed or used at run time.
