# Install 2026 Recap

No dependencies, no model download and no Python are required. The standard
installation layout is all that is needed:

- `panel.tsx` goes to `SELECTS_USER_PANELS_ROOT/recap-2026/panel.tsx`.
- `README.md`, `INSTALL.md`, `SKILL.md`, `assets/brighter-year-ahead.wav` and
  `assets/CREDITS.md` go beneath
  `SELECTS_USER_SKILLS_ROOT/recap-2026/`, keeping their relative paths.

The panel reads the song from its skills folder
(`.selects/skills/recap-2026/` in your home folder), so `assets/` must keep its name.

## Requirements

- macOS or Windows, with a Selects build that has `selects.media.measureBeatSync`
  (the panel measures the song with it). The panel also uses the Selects host's
  file access and bundled ffmpeg, so there is nothing else to install.
- The host must allow local images and videos inside plugin panels.
- A Project open, containing at least one imported video of 8.5 seconds or longer.

## First run

Open **2026 Recap** in the Plugin list. The panel imports
`brighter-year-ahead.wav` into the open Project the first time it builds.
The song is placed without analysis, so building uses no credits.

The finished example needs a network connection on first opening. The panel
downloads the published gallery video and optional poster into its plugin data
folder, then reuses them offline. A missing example does not block Draft creation.

The panel writes by creating a new Draft and by importing the bundled
song. It does not modify existing Drafts or any source file.

## Uninstall

Delete the `recap-2026` folder from the panels root and from the skills root.
