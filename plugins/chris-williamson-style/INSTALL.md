# Install Chris Williamson Style

Experimental. macOS on Apple silicon, a Selects build with Panel `runScript`, `runShell` and `askAI`,
Draft authoring and frame capture. Legacy cleanup also needs the mapped SequenceEdit runtime.

Windows: the panel opens and says "Available on macOS for now"; nothing is changed. Shot detection, face
framing and B-roll preparation still run in `engine.mjs` on Node.js and Apple Vision, which are macOS-only here.

Requirements:

- macOS 14 or later.
- FFmpeg: the copy bundled inside Selects is used, otherwise one on `PATH`.
- An internet connection on first use: `runtime.sh` downloads a pinned Node.js 22 (checksum-verified) into
  `~/.selects/plugin-data/_runtime/`, shared with other plugins. Nothing else is installed and nothing is compiled;
  face detection runs through Apple Vision from `vision-helper.js` (`osascript -l JavaScript`).

## Setup

1. Place `panel.tsx` in `chris-williamson-style` beneath `SELECTS_USER_PANELS_ROOT` and everything else in
   `chris-williamson-style` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Open a talking-head Draft with an analysed transcript, then open **Chris Williamson Style** from the
   Plugin list, or run it as a Clip highlights template. The first run prepares Node.js automatically.

Pictures and run reports go beneath `~/.selects/plugin-data/chris-williamson-style/runs/`;
the Project keeps referencing the imported media, so do not delete a run folder that a Draft still uses.

For source updates, edit `src/` and run `python3 build.py` (Python 3, authoring only). Keep `fonts/` and `media.mjs` beside the Skill. The bundled Inter font is covered by `fonts/OFL.txt`.
