# Install City Weekend Vlog

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/city-weekend-vlog/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. That
   folder holds nothing else, and there is no separate registration step.
2. Place every other listed file in `city-weekend-vlog` beneath
   `SELECTS_USER_SKILLS_ROOT`, keeping relative paths (`planner.js`,
   `beat-detect.cjs`, `scripts/`, `assets/cues/`, `assets/fonts/`, and the
   rest). The panel reads its scripts, music cues and fonts from
   `SELECTS_USER_SKILLS_ROOT/city-weekend-vlog/`. The package has no
   `SKILL.md`, so it is not listed as a Skill.
3. Open **City Weekend Vlog** in the Plugin list with a Project open.

## Dependencies

The bundled music tracks, the title, the warm look and the Draft build need
nothing beyond Selects. Two optional features use
command-line tools. The panel finds ffmpeg on the shell `PATH` and also in
`/opt/homebrew/bin` and `/usr/local/bin`, so a Homebrew ffmpeg works even when
Selects is opened from Finder:

- **ffmpeg** (it includes `ffprobe`): music previews and your own music.
  Check with `ffmpeg -version` and `ffprobe -version`.
- **Node.js**: your own music only (beat detection). Nothing to install: the first time
  you choose your own music, the panel downloads a pinned Node.js (about 26 MB)
  with `runtime.sh` into `~/.selects/plugin-data/_runtime`, shared by every
  plugin. That needs an internet connection once.

When ffmpeg is missing, the panel hides **Your own music**, shows
"Install ffmpeg to preview music or use your own track", and
everything else keeps working.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music into that Project. Its temporary audio
files go in `.selects/plugin-data/city-weekend-vlog` in your home folder,
never in either install folder:

- `own-music.f32`: your own music decoded for beat detection (up to about
  32 MB). It is deleted as soon as detection finishes; the detected beat is
  kept only while the panel is open.
- `own-music.json`: the detected beat and music onsets of the last track you
  dropped (tens of KB). The next track replaces it.
- `preview-N.mp3` and `preview-N.b64`: the section preview. The mp3 is
  deleted once it is converted to text, and the text copy is replaced by the next
  preview.

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/city-weekend-vlog/panel.tsx`,
   and `SELECTS_USER_SKILLS_ROOT/city-weekend-vlog/` contains `planner.js`,
   `scripts/assemble.js`, `assets/cues/manifest.json` and
   `assets/fonts/presets.json`.
2. Open a Project with analysed video clips and open the panel. The top line
   reads "Ready: N clips · about N s" ("Ready: N clips · N photos · about N s"
   when the Project has photos), the Track list shows the seven
   bundled tracks, and the Font style tiles render in their own typefaces. In a Project whose clips were never analysed, it
   reads "N clips are not analysed yet. Analyse them in Selects to use them
   here." (never "being analysed"); the panel does not start analysis itself.
3. With at least 16 usable shots (14 for a track with the half-beat burst),
   press **Build**. A new Draft opens at 1080x1920 with the title, the clips
   and the music.
4. Optional: if ffmpeg is installed, **Your own music** appears
   in the Track list and **Preview this section** plays the chosen section.

## Uninstall

Delete the `city-weekend-vlog` folder from the panels root and from the
skills root. To also remove the plugin's temporary files, delete
`.selects/plugin-data/city-weekend-vlog` in your home folder. Drafts and
imported music already in your Projects are not affected.
