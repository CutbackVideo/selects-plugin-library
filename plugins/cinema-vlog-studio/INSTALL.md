# Install Cinema Vlog Studio

No dependencies, no model download and no Python are required. The standard
installation layout is all that is needed:

- `panel.tsx` goes to `SELECTS_USER_PANELS_ROOT/cinema-vlog-studio/panel.tsx`.
- `README.md`, `INSTALL.md`, `THIRD_PARTY.md` and the three files under
  `assets/` go beneath `SELECTS_USER_SKILLS_ROOT/cinema-vlog-studio/`, keeping
  their relative paths.

The panel reads its sounds from
`$SELECTS_USER_SKILLS_ROOT/cinema-vlog-studio/assets/`, so `assets/` must keep
its name and its three filenames.

## Requirements

- macOS, with the Selects SDK and host shell available to the panel.
- A Project open, containing one folder of imported video (about 5.6 seconds or
  longer for the most demanding slot).

## First run

Open **Cinema Vlog Studio** in the Plugin list. On the first build the panel
imports `cinema-vlog-intro-effects.m4a`, `06-clear-waters-music-preview.mp3` and
`cinema-vlog-camera-click.wav` into the open Project.

The panel writes by creating a new Draft and by importing those three sounds. It
does not modify existing Drafts or any source file. Markers on the Draft you
have open are only read.

## Uninstall

Delete the `cinema-vlog-studio` folder from the panels root and from the skills
root. Sounds already imported into a Project stay there.
