# Install Chris Williamson Style

Experimental. macOS on Apple silicon, a Selects build with Panel `runScript`, `runShell` and `askAI`,
Draft authoring and frame capture. Legacy cleanup also needs the mapped SequenceEdit runtime.

Requirements:

- Node.js 18 or later on the shell `PATH` (`node --version`).
- Xcode Command Line Tools (`xcode-select --install`) to build the Vision helper; macOS 14+.
- FFmpeg: the copy bundled inside Selects is used, otherwise one on `PATH`.

## Setup

1. Place `panel.tsx` in `chris-williamson-style` beneath `SELECTS_USER_PANELS_ROOT` and everything else in
   `chris-williamson-style` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Build the Vision helper:

   ```sh
   cd "$SELECTS_USER_SKILLS_ROOT/chris-williamson-style"
   mkdir -p .local
   swiftc -O vision-helper.swift -o .local/vision-helper
   ```

   Check: `.local/vision-helper faces <any-photo.jpg>` prints one JSON line.
3. Open a talking-head Draft with an analysed transcript, then open **Chris Williamson Style** from the
   Plugin list. The panel reports missing Node.js or a missing helper instead of running.

Pictures and run reports go beneath `~/.selects/plugin-data/chris-williamson-style/runs/`;
the Project keeps referencing the imported media, so do not delete a run folder that a Draft still uses.

For source updates, edit `src/` and run `python3 build.py` (Python 3, authoring only). Keep `fonts/` and `media.mjs` beside the Skill. The bundled Inter font is covered by `fonts/OFL.txt`.
