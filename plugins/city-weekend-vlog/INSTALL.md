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

Nothing to install, on macOS or Windows. The panel uses only what Selects
provides: its bundled ffmpeg (through the host, never a shell) for the quick
check of clips without analysis and for decoding your own music, and its
FileSystem for reading the plugin's files. Your own music's beat detection
runs inside the panel (a Web Worker running `beat-detect.cjs`), so no Node.js
is needed. A Selects build without the bundled ffmpeg still works: your own
music is decoded by the panel's audio decoder instead, and clips without
analysis use evenly spaced moments.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music into that Project. Its temporary audio
files go in `.selects/plugin-data/city-weekend-vlog` in your home folder,
never in either install folder:

- `pcm-*.f32`: your own music decoded for beat detection (up to about 32 MB).
  It is deleted as soon as the panel has read it; the detected beat is kept
  only while the panel is open.
- `quick-score/*.json`: the quick check's scores of clips without analysis
  (a few KB per clip), reused while the file is unchanged.

The section preview plays the music file directly and writes nothing.

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/city-weekend-vlog/panel.tsx`,
   and `SELECTS_USER_SKILLS_ROOT/city-weekend-vlog/` contains `planner.js`,
   `scripts/assemble.js`, `assets/cues/manifest.json` and
   `assets/fonts/presets.json`.
2. Open a Project with video clips (analysed or not) and open the panel. The top line
   reads "Ready: N clips · about N s" ("Ready: N clips · N photos · about N s"
   when the Project has photos), the Track list shows the seven
   bundled tracks, and the Font style tiles render in their own typefaces. Clips that were never
   analysed are usable at once and counted as "N clips without analysis: quick picks"; the
   panel never starts or waits for analysis.
3. With at least 16 usable shots (14 for a track with the half-beat burst),
   press **Build**. A new Draft opens at 1080x1920 with the title, the clips
   and the music.
4. **Your own music** is in the Track list, and **Preview this section** plays
   the chosen section.

## Uninstall

Delete the `city-weekend-vlog` folder from the panels root and from the
skills root. To also remove the plugin's temporary files, delete
`.selects/plugin-data/city-weekend-vlog` in your home folder. Drafts and
imported music already in your Projects are not affected.
