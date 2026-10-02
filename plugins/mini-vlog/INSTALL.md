# Install Mini Vlog

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/mini-vlog/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. That
   folder holds nothing else, and there is no separate registration step.
2. Place every other listed file in `mini-vlog` beneath
   `SELECTS_USER_SKILLS_ROOT`, keeping relative paths (`planner.js`,
   `beat-detect.cjs`, `scripts/`, `assets/cues/`, `assets/fonts/`, and the
   rest). The panel reads its scripts, music cues and fonts from
   `SELECTS_USER_SKILLS_ROOT/mini-vlog/`. The package has no
   `SKILL.md`, so it is not listed as a Skill.
3. Open **Mini Vlog** in the Plugin list with a Project open.

## Dependencies

The bundled music tracks, the title, the Soft look and the Draft build need
nothing beyond Selects. Two optional features use
command-line tools. The panel finds ffmpeg on the shell `PATH` and also in
`/opt/homebrew/bin` and `/usr/local/bin`, so a Homebrew ffmpeg works even when
Selects is opened from Finder:

Clips without analysis are checked with the ffmpeg built into Selects (through
the host, no shell), so that needs nothing installed on macOS or Windows.

- **ffmpeg** (it includes `ffprobe`): music previews and your own music.
  Check with `ffmpeg -version` and `ffprobe -version`.
- **Node.js**: your own music only (beat detection). Nothing to install: the first time
  you choose your own music, the panel downloads a pinned Node.js (about 26 MB)
  with `runtime.sh` into `~/.selects/plugin-data/_runtime`, shared by every
  plugin. That needs an internet connection once.

When ffmpeg is missing, the panel hides **Your own music**, shows
"Install ffmpeg to preview music or use your own track", and
everything else keeps working.

## Windows

The build path for clips without analysis is written for Windows as well as
macOS: it reaches ffmpeg and files only through the host (the ffmpeg built
into Selects with an argument list, and the host's file functions with paths
joined by the host), uses no shell, and names its temporary files in ASCII.
If this Selects lacks one of those functions, clips without analysis get
evenly spaced moments and the panel says a newer Selects picks better shots.
The rest of the panel is not Windows-ready yet: locating the plugin folders,
music previews and your own music still run macOS shell commands, so the
manifest lists macOS only.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music into that Project. Its temporary audio
files go in `.selects/plugin-data/mini-vlog` in your home folder,
never in either install folder:

- `own-music.f32`: your own music decoded for beat detection (up to about
  32 MB). It is deleted as soon as detection finishes; the detected beat is
  kept only while the panel is open.
- `own-music.json`: the detected beat and music onsets of the last track you
  dropped (tens of KB). The next track replaces it.
- `preview-N.mp3` and `preview-N.b64`: the section preview. The mp3 is
  deleted once it is converted to text, and the text copy is replaced by the next
  preview.
- `quick-score/<clip>.json`: the quick check of a clip without analysis (a few
  KB each), reused while the file is unchanged. The decoded preview
  (`quick-score/<clip>-<n>.gray`, under 1 MB) is deleted as soon as it is read.

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/mini-vlog/panel.tsx`,
   and `SELECTS_USER_SKILLS_ROOT/mini-vlog/` contains `planner.js`,
   `scripts/assemble.js`, `assets/cues/manifest.json` and
   `assets/fonts/presets.json`.
2. Open a Project with video clips (analysed or not) and open the panel. The
   readiness line at the bottom of the Length section reads, for example,
   "Ready: 6 clips · 12 photos · about 13 s", the Track
   list shows the four bundled tracks (two reference tracks, then two
   alternatives), and the Title preview renders in its own typefaces. In a
   Project whose clips were never analysed it is ready too, with " · N clips
   not analysed; analysed clips give better picks" at the end; the panel never
   starts analysis itself, and Build shows "Checking clips N/M" first.
3. With at least 4 usable shots from 2 different clips or photos, press
   **Build**. A new 16:9 Draft opens at 1920x1080 with the title, the clips
   and the music.
4. Optional: if ffmpeg is installed, **Your own music** appears
   in the Track list and **Preview this section** plays the chosen section.

## Uninstall

Delete the `mini-vlog` folder from the panels root and from the
skills root. To also remove the plugin's temporary files, delete
`.selects/plugin-data/mini-vlog` in your home folder. Drafts and
imported music already in your Projects are not affected.
