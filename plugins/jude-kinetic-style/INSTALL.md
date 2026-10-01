# Install Jude Kinetic Style

Experimental. macOS on Apple silicon, a Selects build with Panel `runScript`, `runShell` and `askAI` and editable
motion graphics.

Requirements:

- Node.js 18 or later on the shell `PATH` (`node --version`).
- Xcode Command Line Tools (`xcode-select --install`) to build the Vision helper (faces and person masks).
- FFmpeg: the copy bundled inside Selects is used, otherwise one on `PATH`.

## Setup

1. Build the Vision helper in the installed skill folder, and again after every update of `vision-helper.swift`:

   ```sh
   cd "$SELECTS_USER_SKILLS_ROOT/jude-kinetic-style"
   mkdir -p .local
   swiftc -O vision-helper.swift -o .local/vision-helper
   ```

2. Open a talking-head Draft with an analysed transcript, then open **Jude Kinetic Style** from Selects Apps.
   The panel checks setup and reports missing dependencies. It uses the signed-in Selects AI profile; no API
   key is required.

Run reports, temporary face samples and mask frames are saved under
`~/.selects/plugin-data/jude-kinetic-style/runs/`; the background music is fetched once to
`~/.selects/plugin-data/jude-kinetic-style/music/`.
