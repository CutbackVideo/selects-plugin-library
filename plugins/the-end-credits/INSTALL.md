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

Nothing to install, on macOS or Windows: no Homebrew, Node.js or ffmpeg. The
bundled music tracks, the title, the credits, the look and the Draft build
need nothing beyond Selects. Music previews, the waveform, your own music
(the beat is found inside the panel) and measuring how much each clip moves
use the ffmpeg that comes with Selects. On a Selects build that lacks it, the
panel shows "This needs a newer version of Selects." in the Track section,
hides **Your own music**, and everything else keeps working.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music into that Project. Its temporary files
go in `.selects/plugin-data/the-end-credits` in your home folder, never in
either install folder. Each is named `tmp-<random>.<ext>` and deleted as soon
as the panel has read it:

- `.f32`: your own music decoded for beat detection (up to about 32 MB).
- `.mp3` (or `.wav`): the section preview.
- `.u8`: the waveform of a bundled track (under 100 KB).
- `.gray`: the small grey frames used to measure one clip's movement.

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
4. **Your own music** appears in the Track list and the play button
   (**Preview the music of the whole video**) plays the chosen section.

## Uninstall

Delete the `the-end-credits` folder from the panels root and from the skills
root. To also remove the plugin's temporary files, delete
`.selects/plugin-data/the-end-credits` in your home folder. Drafts and
imported music already in your Projects are not affected.
