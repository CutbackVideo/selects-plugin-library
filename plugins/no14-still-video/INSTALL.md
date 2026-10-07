# Install Four Photo Reveal

Install this folder through the Selects plugin library. The installer puts `panel.tsx` at `SELECTS_USER_PANELS_ROOT/no14-still-video/panel.tsx` and the listed support files under `SELECTS_USER_SKILLS_ROOT/no14-still-video`. No Node.js or other runtime is needed: the panel computes the plan and finishing step itself.

The panel accepts four registered Project Image resources and places the original JPG/PNG/HEIC files as independently editable Image clips (54 with the bundled song). It does not modify Selects client source and does not create still MP4 source copies. The final Draft can be exported as MP4. Reusing one image for two explicit slots is allowed.

The panel uses an existing editor-internal Image placement service because the current public panel SDK does not expose Image overlays. This is an experimental host compatibility dependency; the panel fails with a clear message if that service is unavailable. See `SKILL.md` for the Selects chat workflow and `VALIDATION.md` for actual verification limits.

The bundled song installs at `SELECTS_USER_SKILLS_ROOT/no14-still-video/assets/music.mp3`. No music service, download, generation model, or extra runtime is required. Music is on by default and can be turned off in the panel. The panel measures it with `selects.media.measureBeatSync` (a Selects build without it shows an update message). See `THIRD_PARTY.md` for source and license.
