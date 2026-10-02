# Install Travel Beat Vlog

Install this folder through the Selects plugin library. The installer puts `panel.tsx` at `SELECTS_USER_PANELS_ROOT/travel-beat-vlog/panel.tsx` and the other listed files under `SELECTS_USER_SKILLS_ROOT/travel-beat-vlog`. Nothing else needs to be installed, on macOS or Windows: no Node.js, no FFmpeg and no Xcode Command Line Tools. The song analysis, colour measurement and finishing step run inside the panel, with the FFmpeg Selects ships (`Runtime.runFFmpeg`); the song analysis runs in a Web Worker.

On macOS the hero cutout uses Apple Vision person instance masks (macOS 14 or later) through `tools/cutout.js`, a JavaScript for Automation script that macOS runs with `osascript`, so nothing is compiled. Cutouts are cached in `~/.selects/plugin-data/travel-beat-vlog/cutouts/`. No binary is shipped.

No music is bundled. The user picks a song from the Project; the panel reads it locally with the FFmpeg inside Selects and writes the fitted song section to `~/.selects/plugin-data/travel-beat-vlog/songs/`, which the plugin imports into the open Project once.

The hero photo and its cutout are placed with the editor's existing Image placement service because the current public panel SDK does not expose Image overlays. This is an experimental host dependency; the panel stops with a clear message if the service is unavailable. It does not modify Selects client source.

Windows: the Draft is built the same way, except the hero cutout (Apple Vision is macOS only): the title sits over the hero photo with no subject in front, and the panel says so ("available on macOS for now").
