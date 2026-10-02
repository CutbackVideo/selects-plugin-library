# Install Jude Kinetic Style

Experimental. macOS on Apple silicon or Windows x64, a Selects build with Panel `runScript`, `runShell` and `askAI`
and editable motion graphics.

Requirements:

- FFmpeg: the copy bundled inside Selects is used through the host; nothing to install.
- macOS: face framing and lines behind the speaker need macOS 14 or later (Apple Vision) and, on first use, an
  internet connection: `runtime.sh` downloads a pinned Node.js 22 (checksum-verified) into
  `~/.selects/plugin-data/_runtime/`, shared with other plugins. Nothing else is installed and nothing is compiled;
  faces and person masks run through Apple Vision from `vision-helper.js` (`osascript -l JavaScript`).
- Windows: builds without Node.js. Face framing and lines behind the speaker are available on macOS for now, so on
  Windows every shot is centre-cropped and side captions stay in front of the speaker (the run reports both).
  The Windows path has not yet been checked on a real Windows machine.

## Setup

Open a talking-head Draft with an analysed transcript, then open **Jude Kinetic Style** from Selects Apps, or run it
as a Clip highlights template. On macOS the first run prepares Node.js automatically. It uses the signed-in Selects
AI profile; no API key is required.

Run reports, temporary face samples and mask frames are saved under
`~/.selects/plugin-data/jude-kinetic-style/runs/`; the background music ships with the plugin
(`assets/dark-hallway-distressed.mp3.b64`) and is unpacked once, checksum-verified, to
`~/.selects/plugin-data/jude-kinetic-style/music/`.
