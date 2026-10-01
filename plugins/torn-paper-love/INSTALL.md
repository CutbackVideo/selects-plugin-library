# Install Torn Paper Love

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/torn-paper-love/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. That
   folder holds nothing else, and there is no separate registration step.
2. Place every other listed file in `torn-paper-love` beneath
   `SELECTS_USER_SKILLS_ROOT`, keeping relative paths (`planner.js`,
   `build-config.js`, `beat-detect.cjs`, `scripts/`, `assets/cues/`,
   `assets/fonts/`, and the rest). The panel reads its scripts, music cues and
   fonts from `SELECTS_USER_SKILLS_ROOT/torn-paper-love/`. The package has no
   `SKILL.md`, so it is not listed as a Skill.
3. Open **Torn Paper Love** in the Plugin list with a Project open.

## Dependencies

The bundled music tracks, the letters, the Faded film look and the Draft build
need nothing beyond Selects. Two optional features use
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
files go in `.selects/plugin-data/torn-paper-love` in your home folder, never
in either install folder:

- `own-music.f32`: your own music decoded for beat detection (up to about
  32 MB). It is deleted as soon as detection finishes; the detected beat is
  kept only while the panel is open.
- `own-music.json`: the detected beat and music onsets of the last track you
  dropped (tens of KB). The next track replaces it.
- `preview-N.mp3` and `preview-N.b64`: the section preview. The mp3 is
  deleted once it is converted to text, and the text copy is replaced by the
  next preview.

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/torn-paper-love/panel.tsx`,
   and `SELECTS_USER_SKILLS_ROOT/torn-paper-love/` contains `planner.js`,
   `build-config.js`, `scripts/assemble.js`, `assets/cues/manifest.json` and
   `assets/fonts/looks.json`.
2. Open a Project with at least 3 photos and open the panel. The readiness
   line under **Length** reads "Ready: N photos · N clips · N shots · about
   N.N s" ("· N clips" is left out when **Use videos** is off), the Track
   list shows the two bundled tracks, and the Words preview strip shows the
   letters.
3. Press **Build**. A new Draft opens at 1440x1080 with the torn photos, the
   letters and the music.
4. Optional: if ffmpeg is installed, **Your own music** appears
   in the Track list and **Preview this section** plays the chosen section.

## Uninstall

Delete the `torn-paper-love` folder from the panels root and from the skills
root. To also remove the plugin's temporary files, delete
`.selects/plugin-data/torn-paper-love` in your home folder. Drafts and
imported music already in your Projects are not affected.
