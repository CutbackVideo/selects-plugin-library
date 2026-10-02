# Install Postcard Cutout Studio

Experimental. Requires macOS, FFmpeg and FFprobe with `libvpx-vp9` and `libx264` (the
Selects shell puts its bundled copies on `PATH`), an internet connection on first use, and a Selects build with Panel `runScript`/`runShell`, managed media
generation through the `MediaGeneration` service (host 2.0.433 or later), and Draft
authoring.

## Setup

1. Place this package in `postcard-cutout-studio` beneath `SELECTS_USER_SKILLS_ROOT`,
   and `panel.tsx` in `postcard-cutout-studio` beneath `SELECTS_USER_PANELS_ROOT`, as
   in the library's [installation layout](../../PUBLISHING.md#installation-layout).
   The Panel runs `pipeline.py` and `scene_preview.py` from the package, and the
   sounds are decoded from `sfx/` and checked against its manifest on first use.
2. Nothing else to install by hand. On first use `runtime.sh` downloads a pinned
   CPython 3.11.13 (through uv, checked by SHA-256) into
   `~/.selects/plugin-data/_runtime/`, shared with other plugins; the helper uses only
   its standard library. A system `python3` is not used.
3. With a Project open, open **Postcard Cutout Studio** from the Plugin list.

Runs, cutouts, held clips, decoded sounds and logs are kept beneath
`.selects/plugin-data/postcard-cutout-studio` in the user's home.

## Updating

Replace the package and `panel.tsx`; nothing else needs copying. Versions before
0.2.0-alpha.4 kept runs, cutouts and sounds in the Panel folder, and existing Drafts
refer to those files. When that folder already holds runs, the Panel keeps using it,
so leave its other files in place.

## Limits

- Cloud background removal requires generated-media access and may use credits.
- The mask service runs on this computer only. After a restart, open the Panel
  before previewing or exporting an existing postcard Draft.
- macOS only for now: the helper runs Python with Unix-only APIs through the macOS
  shell. Tested on Apple silicon with a Selects development build; released builds
  are unverified.
- Windows: the Panel opens and says "Available on macOS for now"; choosing a folder
  and creating are turned off, and a Clip highlights template run stops before
  anything is imported or made.

See [THIRD_PARTY.md](THIRD_PARTY.md).
