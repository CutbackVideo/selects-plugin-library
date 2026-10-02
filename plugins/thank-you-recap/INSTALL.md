# Install Thank You Recap

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/thank-you-recap/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. Place the rest of the package, including `assets/` and `licenses/`, in
   `thank-you-recap` beneath `SELECTS_USER_SKILLS_ROOT`, keeping relative paths.
   The panel loads `assets/music.mp3` and `assets/year-fonts.json` from there.
   The package has no `SKILL.md`, so it is not listed as a Skill.
3. Nothing else to install: the panel builds the hero-shot candidate sheet
   with the ffmpeg bundled with Selects, on macOS and Windows.
4. Open **Thank You Recap** in the Plugin list with a Project open, check the
   videos to use and press **Create Draft**.

The panel reads the open Project's resources and source file paths. It writes
only by importing the bundled music into the Project once and creating a new
Draft; it never modifies an existing Draft or any source file. Before
importing, it copies the music to `~/.selects/plugin-data/thank-you-recap/`
under a checksum name, so an updated track is never confused with an older one
already in the Project. The hero-shot candidate sheet is written there too.
Letting the AI choose the hero shot sends one image to the Selects AI per build.

## Uninstall

Delete the `thank-you-recap` folder from the panels root and from the skills
root, and optionally `~/.selects/plugin-data/thank-you-recap/`.
