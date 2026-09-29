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
nothing beyond Selects. Two optional features use command-line tools on the
shell `PATH`:

- **ffmpeg** (it includes `ffprobe`): music previews and your own music.
  Check with `ffmpeg -version` and `ffprobe -version`.
- **Node.js 18 or later**: your own music only (beat detection). Check with
  `node --version`.

When either tool is missing, the panel hides **Your own music**, shows
"Install ffmpeg and Node.js 18+ to preview music or use your own track", and
everything else keeps working.

## Files the plugin writes

The panel writes only by creating a new Draft in the open Project and
importing the chosen music into that Project. Decoded audio and beat-detection
results for your own music go beneath `.selects/plugin-data/city-weekend-vlog`
in your home folder, never in either install folder, so an update does not
replace them.

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/city-weekend-vlog/panel.tsx`,
   and `SELECTS_USER_SKILLS_ROOT/city-weekend-vlog/` contains `planner.js`,
   `scripts/assemble.js`, `assets/cues/manifest.json` and
   `assets/fonts/presets.json`.
2. Open a Project with analysed video clips and open the panel. The top line
   reads "Ready: N analysed clips · about N s", the Track list shows the four
   bundled tracks, and the Font style tiles render in their own typefaces.
3. With at least 17 usable shots, press **Build**. A new Draft opens at
   1080x1920 with the title, the clips and the music.
4. Optional: if ffmpeg and Node.js are installed, **Your own music** appears
   in the Track list and **Preview this section** plays a 6 s clip.

## Uninstall

Delete the `city-weekend-vlog` folder from the panels root and from the
skills root. To also remove cached data, delete
`.selects/plugin-data/city-weekend-vlog` in your home folder. Drafts and
imported music already in your Projects are not affected.
