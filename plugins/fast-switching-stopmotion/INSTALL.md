# Install Fast Switching Stop Motion

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/fast-switching-stopmotion/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. Place the rest of the package, including `assets/`, in
   `fast-switching-stopmotion` beneath `SELECTS_USER_SKILLS_ROOT`, keeping
   relative paths. The panel loads its music from
   `SELECTS_USER_SKILLS_ROOT/fast-switching-stopmotion/assets/music.mp3`. The
   package has no `SKILL.md`, so it is not listed as a Skill.
3. Nothing else to install: the panel measures motion and builds the
   candidate contact sheet with the ffmpeg bundled in Selects, on macOS and
   Windows.
4. Open **Fast Switching Stop Motion** in the Plugin list with a Project open,
   check the videos to use and press **Create Draft**.

The panel reads the open Project's resources and source file paths. It writes
only by importing the bundled music into the Project once and creating a new
Draft; it never modifies an existing Draft or any source file. The candidate
contact sheet and the motion measurements are written briefly to
`~/.selects/plugin-data/fast-switching-stopmotion/` (on Windows
`%USERPROFILE%\.selects\plugin-data\fast-switching-stopmotion\`) and removed
after use.
Picking moments sends one image to the Selects AI per build.

## Uninstall

Delete the `fast-switching-stopmotion` folder from the panels root and from the
skills root, and optionally `~/.selects/plugin-data/fast-switching-stopmotion/`.
