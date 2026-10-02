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

Nothing to install, on macOS or Windows. Everything runs on what Selects
ships:

- music previews, your own music and its muffled ending copy, and the quick
  check of clips without analysis use the **ffmpeg and ffprobe bundled with
  Selects**;
- your own music's beat and drop detection runs inside the panel (a
  background worker), so no Node.js or other runtime is needed;
- the panel reads and writes its files through Selects itself, so no shell
  commands are run.

A Selects build too old to offer these services hides **Your own music**,
says that it needs a newer version of Selects, and everything else keeps
working. (`runtime.sh` is the library's shared first-run bootstrap; Summer
Trip ships the copy but no longer runs it.)

Windows x64 is supported the same way as macOS; a hands-on check on a
Windows machine is still pending.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music, its muffled copy and, when Sound
effects is on, the sound effects into that Project (each once per Project).
Its working files go in `.selects/plugin-data/summer-trip` in your home
folder, never in either install folder:

- the sound effects decoded from `sfx/*.wav.b64` to WAV files (under 1 MB in
  all), kept so a later build imports the same files;
- your own music decoded for beat detection (up to about 32 MB), deleted as
  soon as it has been read back;
- the muffled copy of your own music (a WAV file the length of the track),
  kept per track so it is baked and imported only once;
- the section preview, deleted as soon as it has been read back.

On Windows the home folder is `C:\Users\<name>`, so the folder is
`C:\Users\<name>\.selects\plugin-data\summer-trip`. The panel finds its install
folder at `.selects/skills/summer-trip` in the home folder (the default
`SELECTS_USER_SKILLS_ROOT`).

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/summer-trip/panel.tsx`, and
   `SELECTS_USER_SKILLS_ROOT/summer-trip/` contains `planner.js`,
   `graphics-defs.js`, `scripts/assemble.js`, `assets/fonts/presets.json`
   and `sfx/manifest.json`.
2. Open a Project with video clips (analysed or not) and open the panel. The top
   line reads "Ready: N clips · about N s" ("Ready: N clips · N photos ·
   about N s" when the Project has photos). Under the title fields, the
   **Style** control offers Summer, Poster and Postcard, and the title
   preview below it shows line 1, the season word and the labels in the
   chosen style's typefaces. Summer Trip works without analysis: in a Project
   whose clips were never analysed the line still reads "Ready: …" and ends
   with "Analysed clips give better picks" (analysed clips give better scene
   picks); the panel does not start analysis itself. Clips without analysis
   are checked with the host's bundled ffmpeg during Build; nothing needs to
   be installed. Note: `plugin.json` `prepare` still lists "Videos analyzed"
   (left for the Clip highlights template owners to make optional).
3. With at least 6 different clips or photos, one of them a video clip of
   about 5 s or more, press **Build**. A new Draft opens at 1920x1080 with
   the title, the grid, the clips and the ending film frame.
4. **Your own music** appears in the Track list (it uses the ffmpeg bundled
   with Selects) and **Preview this section** plays the chosen section.

## Uninstall

Delete the `summer-trip` folder from the panels root and from the skills
root. To also remove the plugin's working files, delete
`.selects/plugin-data/summer-trip` in your home folder. Drafts and imported
audio already in your Projects are not affected.
