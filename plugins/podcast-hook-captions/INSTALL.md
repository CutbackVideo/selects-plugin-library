# Install Podcast Hook Captions

Experimental. Requires macOS on Apple silicon, a Selects build with Panel
`runScript`/`runShell`, Draft authoring and frame capture, and:

- **Node.js 18 or later** on the shell `PATH` (`node --version`). The panel runs
  its sound mixer and head-measuring scripts with `node`.
- **FFmpeg / FFprobe.** The panel uses the copy bundled inside Selects, or one on
  `PATH`.
- **Xcode Command Line Tools** (`xcode-select --install`) to build the optional
  segmentation helper. Tested with Swift 6.1 on macOS 26.

## Setup

1. Place the files as in the library's
   [installation layout](../../PUBLISHING.md#installation-layout): `panel.tsx`
   in `podcast-hook-captions` beneath `SELECTS_USER_PANELS_ROOT`, everything else
   in `podcast-hook-captions` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Build the segmentation helper (optional, recommended):

   ```sh
   cd "$SELECTS_USER_SKILLS_ROOT/podcast-hook-captions"
   mkdir -p .local
   swiftc -O person-cutout.swift -o .local/person-cutout
   ```

   Check it: `[ -x .local/person-cutout ] && uname -m` prints `arm64`. Without the
   helper the panel still works and says so when you apply.
3. Open a Draft, then open **Podcast Hook Captions** from the Plugin list.

Generated files go beneath `.selects/plugin-data/podcast-hook-captions` in the
user's home folder; the panel creates it on first open.

## Updating

Replace the package files and `panel.tsx`, then rebuild the helper if
`person-cutout.swift` changed. `.local/` and the plugin-data folder are kept.
