# Install THE END Credits

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/the-end-credits/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. That
   folder holds nothing else, and there is no separate registration step.
2. Place every other listed file in `the-end-credits` beneath
   `SELECTS_USER_SKILLS_ROOT`, keeping relative paths (`planner.js`,
   `beat-detect.cjs`, `scripts/`, `assets/`, and the rest). The panel reads its
   scripts, music cues and fonts from
   `SELECTS_USER_SKILLS_ROOT/the-end-credits/`. The package has no
   `SKILL.md`, so it is not listed as a Skill.
3. Open **THE END Credits** in the Plugin list with a Project open.

## Dependencies

The bundled music tracks, the title, the credits, the look and the Draft build
need nothing beyond Selects. Two optional features use
command-line tools. The panel finds ffmpeg on the shell `PATH` and also in
`/opt/homebrew/bin` and `/usr/local/bin`, so a Homebrew ffmpeg works even when
Selects is opened from Finder:

- **ffmpeg** (it includes `ffprobe`): music previews, your own music, and
  measuring how much each clip moves (so moving footage is preferred; without
  ffmpeg the shots are chosen by the scene match alone). Check with
  `ffmpeg -version` and `ffprobe -version`.
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
files go in `.selects/plugin-data/the-end-credits` in your home folder, never
in either install folder:

- `own-music.f32`: your own music decoded for beat detection (up to about
  32 MB). It is deleted as soon as detection finishes.
- `own-music.json`: the detected beat and loudness of the last track you
  dropped (tens of KB). The next track replaces it.
- `preview-N.mp3` and `preview-N.b64`: the section preview. The mp3 is
  deleted once it is converted to text, and the text copy is replaced by the
  next preview.
- `motion-<clip id>.txt`: the measured movement of one clip (a few KB), read
  once by the panel. All of them are deleted when the measuring step ends.
- `peaks-<id>.u8` and `peaks-<id>.b64`: the waveform of a bundled track
  (`<id>` is the track's id; under 100 KB). The `.u8` is deleted once it
  is converted to text, and the `.b64` as soon as the panel has read it (or
  failed to).

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/the-end-credits/panel.tsx`, and
   `SELECTS_USER_SKILLS_ROOT/the-end-credits/` contains `planner.js`,
   `scripts/assemble.js`, `assets/cues/manifest.json` and
   `assets/fonts/tec-title-serif.woff2.b64`.
2. Open a Project with analysed video clips and open the panel. The top line
   reads "Ready: N clips · N shots · about N s" ("Ready: N clips · N photos ·
   N shots · about N s" when the Project has photos), and the Track list shows
   the five bundled tracks. In a Project whose clips were never analysed, it
   reads "N clips are not analysed yet. Analyse them in Selects to use them
   here." (never "being analysed"); the panel does not start analysis itself.
3. With at least 4 usable clips or photos (5 in Full frame), press **Build**.
   A new 1920x1080 Draft opens with the typed title, the rolling credits, the
   clips and the music.
4. Optional: if ffmpeg is installed, **Your own music** appears
   in the Track list and the play button (**Preview the music of the whole
   video**) plays the chosen section.

## Uninstall

Delete the `the-end-credits` folder from the panels root and from the skills
root. To also remove the plugin's temporary files, delete
`.selects/plugin-data/the-end-credits` in your home folder. Drafts and
imported music already in your Projects are not affected.
