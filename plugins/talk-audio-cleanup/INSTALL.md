# Install Talk Audio Cleanup

Experimental: macOS and Windows, with a Selects build that has Panel support and
bundled FFmpeg jobs. Windows runs the same code as macOS; it has not yet been
run on a Windows PC.

1. Place this package in `talk-audio-cleanup` beneath
   `SELECTS_USER_SKILLS_ROOT`, and `panel.tsx` in `talk-audio-cleanup` beneath
   `SELECTS_USER_PANELS_ROOT`, as in the library's
   [installation layout](../../PUBLISHING.md#installation-layout).
2. Nothing else to install. The analysis runs inside the app, in the Panel's
   own scripts: no Python, no download, no shell command.

## Uninstall

Delete the `talk-audio-cleanup` folders beneath the panels root and the skills
root. Earlier versions also left a `talk-audio-cleanup` folder in
`$HOME/.selects/plugin-data`, which can be deleted. Cleaned copies of Drafts are ordinary
Drafts and stay in their Projects.
