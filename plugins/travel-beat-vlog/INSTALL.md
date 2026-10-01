# Install Travel Beat Vlog

Install this folder through the Selects plugin library. The installer puts `panel.tsx` at `SELECTS_USER_PANELS_ROOT/travel-beat-vlog/panel.tsx` and the other listed files under `SELECTS_USER_SKILLS_ROOT/travel-beat-vlog`. Node.js must be available to the Selects panel shell.

The hero cutout uses Apple Vision person instance masks (macOS 14 or later) through a small Swift tool, `tools/cutout.swift`. On first use it is compiled with `swiftc` (Xcode Command Line Tools) into `~/.selects/plugin-data/travel-beat-vlog/bin/`; cutouts are cached in the same folder. No binary is shipped.

No music is bundled. The user picks a song from the Project; `analyze.mjs` reads it locally with FFmpeg (the one on the PATH, or else the copy inside the Selects app bundle) and writes the fitted song section to `~/.selects/plugin-data/travel-beat-vlog/songs/`, which the plugin imports into the open Project once.

The hero photo and its cutout are placed with the editor's existing Image placement service because the current public panel SDK does not expose Image overlays. This is an experimental host dependency; the panel stops with a clear message if the service is unavailable. It does not modify Selects client source.
