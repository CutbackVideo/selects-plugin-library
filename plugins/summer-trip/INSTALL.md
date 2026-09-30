# Install Summer Trip

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/summer-trip/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. That
   folder holds nothing else, and there is no separate registration step.
2. Place every other listed file in `summer-trip` beneath
   `SELECTS_USER_SKILLS_ROOT`, keeping relative paths (`planner.js`,
   `graphics-defs.js`, `beat-detect.cjs`, `muffle.cjs`, `scripts/`,
   `assets/`, `sfx/`, and the rest). The panel reads its scripts, graphics,
   effects, fonts, music and sound effects from
   `SELECTS_USER_SKILLS_ROOT/summer-trip/`. The package has no `SKILL.md`,
   so it is not listed as a Skill.
3. Open **Summer Trip** in the Plugin list with a Project open.

## Dependencies

The title, the grid, the look, the film frame, the sound effects and the
Draft build need nothing beyond Selects. Two optional features use
command-line tools. The panel finds them on the shell `PATH` and also in
`/opt/homebrew/bin`, `/usr/local/bin` and the newest nvm Node
(`~/.nvm/versions/node/*/bin`), so tools installed with Homebrew or nvm work
even when Selects is opened from Finder:

- **ffmpeg** (it includes `ffprobe`): music previews, your own music and its
  muffled ending copy. Check with `ffmpeg -version` and `ffprobe -version`.
- **Node.js 18 or later**: your own music only (beat and drop detection).
  Check with `node --version`.

When either tool is missing, the panel hides **Your own music**, says so,
and everything else keeps working.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music, its muffled copy and, when Sound
effects is on, the sound effects into that Project (each once per Project).
Its working files go in `.selects/plugin-data/summer-trip` in your home
folder, never in either install folder:

- the sound effects decoded from `sfx/*.wav.b64` to WAV files (under 1 MB in
  all), kept so a later build imports the same files;
- your own music decoded for beat detection (up to about 32 MB), deleted as
  soon as detection finishes, and the detected beat of the last track you
  dropped (tens of KB);
- the muffled copy of your own music (a WAV file the length of the track),
  kept per track so it is baked and imported only once;
- the section preview, replaced by the next preview.

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/summer-trip/panel.tsx`, and
   `SELECTS_USER_SKILLS_ROOT/summer-trip/` contains `planner.js`,
   `graphics-defs.js`, `scripts/assemble.js`, `assets/fonts/presets.json`
   and `sfx/manifest.json`.
2. Open a Project with analysed video clips and open the panel. The top
   line reads "Ready: N clips · about N s" ("Ready: N clips · N photos ·
   about N s" when the Project has photos). Under the title fields, the
   **Style** control offers Summer, Poster and Postcard, and the title
   preview below it shows line 1, the season word and the labels in the
   chosen style's typefaces.
3. With at least 6 different clips or photos, one of them a video clip of
   about 5 s or more, press **Build**. A new Draft opens at 1920x1080 with
   the title, the grid, the clips and the ending film frame.
4. Optional: if ffmpeg and Node.js are installed, **Your own music** appears
   in the Track list and **Preview this section** plays the chosen section.

## Uninstall

Delete the `summer-trip` folder from the panels root and from the skills
root. To also remove the plugin's working files, delete
`.selects/plugin-data/summer-trip` in your home folder. Drafts and imported
audio already in your Projects are not affected.
