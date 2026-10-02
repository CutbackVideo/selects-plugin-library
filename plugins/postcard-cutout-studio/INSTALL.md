# Install Postcard Cutout Studio

Experimental. Runs on macOS and Windows with a Selects build that has Panel
`runScript`, managed media generation through the `MediaGeneration` service (host
2.0.433 or later; on Windows 2.0.508 or later) and Draft authoring. FFmpeg and FFprobe
with `libvpx-vp9` and `libx264` come with Selects: on macOS the Selects shell puts its
bundled copies on `PATH`; on Windows the Panel calls them directly. macOS also needs
an internet connection on first use (see step 2).

## Setup

1. Place this package in `postcard-cutout-studio` beneath `SELECTS_USER_SKILLS_ROOT`,
   and `panel.tsx` in `postcard-cutout-studio` beneath `SELECTS_USER_PANELS_ROOT`, as
   in the library's [installation layout](../../PUBLISHING.md#installation-layout).
   On macOS the Panel runs `pipeline.py` and `scene_preview.py` from the package; on
   Windows it does the same work itself. The sounds are decoded from `sfx/` and
   checked against its manifest on first use.
2. Nothing else to install by hand. On macOS, on first use `runtime.sh` downloads a
   pinned CPython 3.11.13 (through uv, checked by SHA-256) into
   `~/.selects/plugin-data/_runtime/`, shared with other plugins; the helper uses only
   its standard library. A system `python3` is not used. Windows needs no Python.
3. With a Project open, open **Postcard Cutout Studio** from the Plugin list.

Runs, cutouts, held clips, decoded sounds and logs are kept beneath
`.selects/plugin-data/postcard-cutout-studio` in the user's home.

## Updating

Replace the package and `panel.tsx`; nothing else needs copying. Versions before
0.2.0-alpha.4 kept runs, cutouts and sounds in the Panel folder, and existing Drafts
refer to those files. When that folder already holds runs, the Panel keeps using it,
so leave its other files in place.

## Limits

- Cloud background removal requires generated-media access and uses Selects
  generation credits. Before each new cutout the Panel says so and waits for
  **Use credits and continue**; **Cancel** stops before anything is imported or
  sent. A rebuild with the same subject and range reuses the cutout. A Clip
  highlights template run never starts a paid cutout: it builds when it can reuse
  one, and otherwise asks you to press Create in the Panel.
- macOS: the mask service runs on this computer only. After a restart, open the
  Panel before previewing or exporting an existing postcard Draft. Tested on Apple
  silicon with a Selects development build; released builds are unverified.
- Windows: the Draft reads the mask files from the data folder (Selects 2.0.508 or
  later; an older Selects shows "Update Selects" and turns off choosing a folder and
  creating, and a Clip highlights template run stops before anything is made). Not
  yet checked in a Selects Windows build.

See [THIRD_PARTY.md](THIRD_PARTY.md).
