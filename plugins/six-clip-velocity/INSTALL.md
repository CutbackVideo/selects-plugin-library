# Install Six Clip Velocity

Install this folder through the Selects plugin library. The installer puts `panel.tsx` at `SELECTS_USER_PANELS_ROOT/six-clip-velocity/panel.tsx` and the other listed files under `SELECTS_USER_SKILLS_ROOT/six-clip-velocity`. Node.js must be available to the Selects panel shell.

On first use the panel imports `assets/music.mp3` from the install folder into the open Project once.

The panel uses the editor's existing clip placement and retiming services, because the current public panel SDK cannot place a retimed piece from the middle of a video. This is an experimental host dependency; the panel stops with a clear message if the services are unavailable. It does not modify Selects client source.
