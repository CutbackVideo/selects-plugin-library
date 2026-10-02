# Install Jude Kinetic Style

Experimental. macOS on Apple silicon, a Selects build with Panel `runScript`, `runShell` and `askAI` and editable
motion graphics.

Requirements:

- macOS 14 or later (Apple Vision person masks).
- FFmpeg: the copy bundled inside Selects is used, otherwise one on `PATH`.
- Windows: not yet. The panel opens and shows "Available on macOS for now"; the button and the Clip highlights
  template stop before they change anything. Camera cuts, faces and person masks still run through the macOS engine.
- An internet connection on first use: `runtime.sh` downloads a pinned Node.js 22 (checksum-verified) into
  `~/.selects/plugin-data/_runtime/`, shared with other plugins. Nothing else is installed and nothing is compiled;
  faces and person masks run through Apple Vision from `vision-helper.js` (`osascript -l JavaScript`).

## Setup

Open a talking-head Draft with an analysed transcript, then open **Jude Kinetic Style** from Selects Apps, or run it
as a Clip highlights template. The first run prepares Node.js automatically. It uses the signed-in Selects AI profile;
no API key is required.

Run reports, temporary face samples and mask frames are saved under
`~/.selects/plugin-data/jude-kinetic-style/runs/`; the background music is fetched once to
`~/.selects/plugin-data/jude-kinetic-style/music/`.
