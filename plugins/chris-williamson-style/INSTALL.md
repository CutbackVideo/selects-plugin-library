# Install Chris Williamson Style

Experimental. macOS on Apple silicon or Windows x64, a Selects build with Panel `runScript` and `askAI`,
Draft authoring and frame capture. Legacy cleanup also needs the mapped SequenceEdit runtime.

Windows: shot detection and B-roll preparation run inside the panel on the ffmpeg bundled with Selects; nothing
else is installed. There is no face detection on Windows, so the speaker is centre-cropped to 9:16 (the run report
says so). Without libx264 in that ffmpeg, B-roll cutaways are encoded as MPEG-4 instead of H.264. Not yet verified
on a real Windows machine.

Requirements on macOS:

- macOS 14 or later, and Panel `runShell`.
- FFmpeg: the copy bundled inside Selects is used, otherwise one on `PATH`.
- An internet connection on first use: `runtime.sh` downloads a pinned Node.js 22 (checksum-verified) into
  `~/.selects/plugin-data/_runtime/`, shared with other plugins. Nothing else is installed and nothing is compiled;
  face detection runs through Apple Vision from `vision-helper.js` (`osascript -l JavaScript`).

## Setup

1. Place `panel.tsx` in `chris-williamson-style` beneath `SELECTS_USER_PANELS_ROOT` and everything else in
   `chris-williamson-style` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Open a talking-head Draft with an analysed transcript, then open **Chris Williamson Style** from the
   Plugin list, or run it as a Clip highlights template. On macOS the first run prepares Node.js automatically.

Pictures and run reports go beneath `~/.selects/plugin-data/chris-williamson-style/runs/`;
the Project keeps referencing the imported media, so do not delete a run folder that a Draft still uses.

For source updates, edit `src/` and run `python3 build.py` (Python 3, authoring only). Keep `fonts/` and `media.mjs` beside the Skill. The bundled Inter font is covered by `fonts/OFL.txt`.
