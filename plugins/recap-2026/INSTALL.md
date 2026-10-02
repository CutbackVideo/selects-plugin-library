# Install 2026 Recap

No dependencies, no model download and no Python are required. The standard
installation layout is all that is needed:

- `panel.tsx` goes to `SELECTS_USER_PANELS_ROOT/recap-2026/panel.tsx`.
- `README.md`, `INSTALL.md`, `SKILL.md`, `timing.json` and
  `assets/recap-2026-fixed-soundtrack.wav` go beneath
  `SELECTS_USER_SKILLS_ROOT/recap-2026/`, keeping their relative paths.

The panel reads `timing.json` and the soundtrack from its skills folder
(`.selects/skills/recap-2026/` in your home folder), so `assets/` must keep its name.

## Requirements

- macOS or Windows, with the Selects SDK. The panel uses the Selects host's file
  access and bundled ffmpeg, so there is nothing else to install.
- A Project open, containing at least one imported video of 5 seconds or longer.

## First run

Open **2026 Recap** in the Plugin list. The panel imports
`recap-2026-fixed-soundtrack.wav` into the open Project the first time it builds.
A new Project may need that soundtrack analysed before the overlay is placed;
the panel reports this when it applies.

The panel writes by creating a new Draft and by importing the bundled
soundtrack. It does not modify existing Drafts or any source file.

## Uninstall

Delete the `recap-2026` folder from the panels root and from the skills root.
