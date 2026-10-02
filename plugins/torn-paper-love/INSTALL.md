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

None. Torn Paper Love needs nothing beyond Selects, on macOS and on Windows.
Music previews and your own music use the ffmpeg built into Selects (through
the panel's host services, not a shell), and your own music's beat is found
inside the panel, so there is no ffmpeg, Node.js or other tool to install.

On a Selects build that lacks those host services, the panel hides **Your own
music** and the section preview, says "This Selects build needs an updated
Runtime.runFFmpeg adapter.", and everything else keeps working.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music into that Project. Its temporary files
go in `.selects/plugin-data/torn-paper-love` in your home folder (for example
`/Users/<you>/.selects/...` on macOS, `C:\Users\<you>\.selects\...` on
Windows), never in either install folder. Their names are plain ASCII:

- `pcm-<number>.f32`: your own music decoded for beat detection (up to about
  32 MB). It is deleted as soon as it is read; the detected beat is kept only
  while the panel is open.
- `cut-<number>.mp3`: the section preview, deleted as soon as it is read.
- `quick-score/`: the quick check's cache for clips Selects hasn't analysed.

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
4. **Your own music** appears in the Track list and **Preview this section**
   plays the chosen section (both use the ffmpeg built into Selects).

## Uninstall

Delete the `torn-paper-love` folder from the panels root and from the skills
root. To also remove the plugin's temporary files, delete
`.selects/plugin-data/torn-paper-love` in your home folder. Drafts and
imported music already in your Projects are not affected.
