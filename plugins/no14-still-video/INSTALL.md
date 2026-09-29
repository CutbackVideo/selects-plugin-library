# Install No.14 Photo Format

Install this folder through the Selects plugin library. The installer puts `panel.tsx` at `SELECTS_USER_PANELS_ROOT/no14-still-video/panel.tsx` and the listed support files under `SELECTS_USER_SKILLS_ROOT/no14-still-video`. Node.js must be available to the Selects panel shell.

The panel accepts four registered Project Image resources and places the original JPG/PNG/HEIC files as eight independently editable Image clips. It does not modify Selects client source and does not create still MP4 source copies. The final Draft can be exported as MP4. Reusing one image for two explicit slots is allowed.

The panel uses an existing editor-internal Image placement service because the current public panel SDK does not expose Image overlays. This is an experimental host compatibility dependency; the panel fails with a clear message if that service is unavailable. See `SKILL.md` for the Selects chat workflow and `VALIDATION.md` for actual verification limits.
