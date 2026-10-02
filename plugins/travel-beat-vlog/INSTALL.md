# Install Travel Beat Vlog

Install this folder through the Selects plugin library. The installer puts `panel.tsx` at `SELECTS_USER_PANELS_ROOT/travel-beat-vlog/panel.tsx` and the other listed files under `SELECTS_USER_SKILLS_ROOT/travel-beat-vlog`. Nothing else needs to be installed by hand: no Node.js and no Xcode Command Line Tools.

The panel runs `build-script.mjs` (and through it `analyze.mjs`) with a pinned Node.js 22.23.3. On first use `runtime.sh` downloads it from nodejs.org, checks its SHA-256 and keeps it in `~/.selects/plugin-data/_runtime/`, shared with other plugins; this needs the internet once and takes about 10 seconds.

The hero cutout uses Apple Vision person instance masks (macOS 14 or later) through `tools/cutout.js`, a JavaScript for Automation script that macOS runs with `osascript`, so nothing is compiled. Cutouts are cached in `~/.selects/plugin-data/travel-beat-vlog/cutouts/`. No binary is shipped.

No music is bundled. The user picks a song from the Project; `analyze.mjs` reads it locally with FFmpeg (the one on the PATH, or else the copy inside the Selects app bundle) and writes the fitted song section to `~/.selects/plugin-data/travel-beat-vlog/songs/`, which the plugin imports into the open Project once.

The hero photo and its cutout are placed with the editor's existing Image placement service because the current public panel SDK does not expose Image overlays. This is an experimental host dependency; the panel stops with a clear message if the service is unavailable. It does not modify Selects client source.

Windows: not yet. The panel opens there and says Travel Beat Vlog is available on macOS for now; it stops before it reads or makes anything, because the song engine still runs on Node.js through `runtime.sh` (a POSIX script) and the cutout on Apple Vision.
