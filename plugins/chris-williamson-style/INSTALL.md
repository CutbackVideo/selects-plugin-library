# Install Chris Williamson Style

Experimental. macOS on Apple silicon or Windows x64, a Selects build with Panel `runScript` and `askAI`,
Draft authoring and frame capture. Legacy cleanup also needs the mapped SequenceEdit runtime.

Windows: shot detection and B-roll preparation run inside the panel on the ffmpeg bundled with Selects; nothing
else is installed for those stages. Face detection uses the separately installed shared AI runtime on both platforms.
A valid empty-face result keeps the existing centred crop. Without libx264 in that ffmpeg, B-roll cutaways are encoded as MPEG-4 instead of H.264. B-roll candidates are downloaded
with a 25 MB and 25-second limit (a larger video is cut to its first 15 seconds by that ffmpeg), as on macOS.
Shared face detection, job recovery/cancellation and crop/effect persistence have been verified on Windows.
The complete styling run and final preview/export still need Windows verification.

Requirements on macOS:

- macOS 14 or later, and Panel `runShell`.
- FFmpeg: the copy bundled inside Selects is used, otherwise one on `PATH`.
- An internet connection on first use: `runtime.sh` downloads a pinned Node.js 22 (checksum-verified) into
  `~/.selects/plugin-data/_runtime/`, shared with other plugins, for shot detection and B-roll preparation.
  Face inference and YuNet model preparation belong to `selects-ai-runtime`; Apple Vision is no longer used.

## Shared face runtime

Install both `chris-williamson-style` and `selects-ai-runtime` from the **same full library commit**.
The installer does not install another source package from a manifest dependency. The shared runtime prepares
its pinned native dependencies and YuNet model automatically on first use, using Selects' embedded Node and
FFmpeg/FFprobe. No global Python or Node installation is required for face detection.

Face job request keys and workflow IDs are saved in the run folder before and after submission. Closing the
panel detaches observation and keeps the background job; reopening and continuing the pending run recovers it.
Cancel face detection stops pending shared face jobs. An intentional retry of a failed or canceled job uses
a new request key; successful and uncertain requests keep their identity.

## Setup

1. Place `panel.tsx` in `chris-williamson-style` beneath `SELECTS_USER_PANELS_ROOT` and everything else in
   `chris-williamson-style` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Open a talking-head Draft with an analysed transcript, then open **Chris Williamson Style** from the
   Plugin list, or run it as a Clip highlights template. On macOS the first run prepares Node.js automatically.

Pictures and run reports go beneath `~/.selects/plugin-data/chris-williamson-style/runs/`;
the Project keeps referencing the imported media, so do not delete a run folder that a Draft still uses.

For source updates, edit `src/` and run `python3 build.py` (Python 3, authoring only). Keep `fonts/` and `media.mjs` beside the Skill. The bundled Inter font is covered by `fonts/OFL.txt`.
