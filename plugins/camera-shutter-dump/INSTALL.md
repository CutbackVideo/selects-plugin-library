# Install Camera Shutter Dump

Install this folder through the Selects plugin library. The installer puts `panel.tsx` at `SELECTS_USER_PANELS_ROOT/camera-shutter-dump/panel.tsx` and the other listed files under `SELECTS_USER_SKILLS_ROOT/camera-shutter-dump`. No Node.js or other runtime is needed: the panel computes the plan and finishing step itself.

On first use the panel decodes the bundled shutter sounds with the system `base64` and `shasum` into `~/.selects/plugin-data/camera-shutter-dump/sfx` (checked against `sfx/manifest.json`) and imports them into the open Project once.

The panel uses the editor's existing Image placement service because the current public panel SDK does not expose Image overlays. This is an experimental host dependency; the panel stops with a clear message if the service is unavailable. It does not modify Selects client source and does not convert photos to video.
