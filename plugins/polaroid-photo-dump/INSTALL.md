# Install Polaroid Photo Dump

Install this folder through the Selects plugin library. The installer puts `panel.tsx` at `SELECTS_USER_PANELS_ROOT/polaroid-photo-dump/panel.tsx` and the other listed files under `SELECTS_USER_SKILLS_ROOT/polaroid-photo-dump`. No Node.js or other runtime is needed: the panel computes the plan and finishing step itself.

On first use the panel decodes the bundled frame image and music itself (no shell or extra tools, on macOS and Windows) into `~/.selects/plugin-data/polaroid-photo-dump` (checked against `assets/manifest.json`) and imports them into the open Project once.

The panel uses the editor's existing Image placement service because the current public panel SDK does not expose Image overlays. This is an experimental host dependency; the panel stops with a clear message if the service is unavailable. It does not modify Selects client source and does not convert photos to video.
