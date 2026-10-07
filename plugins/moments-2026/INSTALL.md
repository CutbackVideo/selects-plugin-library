# Install 2026 Moments

Nothing to install beyond the standard layout:

- `panel.tsx` goes to `SELECTS_USER_PANELS_ROOT/moments-2026/panel.tsx`.
- `README.md`, `INSTALL.md`, `SKILL.md`, `THIRD_PARTY.md` and `assets/` (the music and its
  licence files) go to `SELECTS_USER_SKILLS_ROOT/moments-2026/`, keeping their paths.

The panel reads `assets/music.m4a` from its skills folder (`.selects/skills/moments-2026/`
in your home folder) and keeps a working copy in `.selects/plugin-data/moments-2026/`.

## Requirements

- macOS or Windows with the Selects SDK. No Python, models or downloads.
- A project with at least one video of 9.5 seconds or longer for the intro, and
  other videos of at least 2.6 seconds. One long video can fill every slot.

## Check

Open **2026 Moments** with a project open. The 15 slots should fill
automatically; **Create Draft** saves a new Draft named `2026 Moments · <time>`
and opens it. The first build in a project imports the bundled music into that
project. Otherwise the panel only creates new Drafts; it never changes existing
Drafts or source files.

## Uninstall

Delete the `moments-2026` folder from the panels root, the skills root and
`.selects/plugin-data/`.
