# Install Photo Gallery 21

This experimental Selects plugin builds an editable 1080×1920, 60 fps, 3×7 gallery. Each original JPG/PNG stays an Image Resource on its own Video track. Video tiles remain Video Resources; only a selected video shorter than the output is extended to a separate cached MP4 that holds its last frame. The gallery is never flattened.

Install `panel.tsx` at `SELECTS_USER_PANELS_ROOT/photo-gallery-no2/panel.tsx` and the files listed in `plugin.json` at `SELECTS_USER_SKILLS_ROOT/photo-gallery-no2/`. Rebuild `panel.tsx` with `node build-panel.mjs` after changing the template, shared operation, or native adapter. Python 3 and ffmpeg/ffprobe are needed only for short-video extension and optional BPM estimation.

The public Selects SDK currently rejects `overlayResource(Image)` and omits Image dimensions from its source-file inventory. The panel uses the app-owned `TimelineMutation` service through its documented panel `window.parent.__DI__` access to place original Images; it checks the open Project, exact media paths, dimensions, and Draft ownership before editing. It uses the public SDK for Video and Audio overlays, effects, transforms, persistence, and readback. This panel host route is provisional and must be retested after a Selects update. No Selects client source is changed.

The Selects chat skill and panel share the planner, preflight, styling, and verification operation. Image placement itself requires the panel host and is not exposed to `run_script`, so chat-only creation with original Images is **not yet supported**. Chat can inspect inputs and, only when a new Draft already uses 60 fps, create an all-Video gallery through the public operation. Otherwise it should guide the user through the panel. Do not claim chat/panel parity or one-shot Image creation from chat until a supported bridge is verified.

The panel currently creates a new Draft and offers individual clip editing in the Selects timeline. Automated replacement of one tile in an existing Draft is not yet supported. Never rebuild a Draft without explicit instruction or claim unrelated manual edits are preserved by a replacement operation.

Run `SELECTS_DEV_REPO=/path/to/selects node --test *.test.mjs` and `python3 -m unittest hold_video_test.py tempo_test.py` from this folder. See [STAGING_VALIDATION.md](STAGING_VALIDATION.md) for live results and outstanding cases.
