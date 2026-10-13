# Install notes

No extra runtimes, models or credentials are required. The panel builds the Draft through the
Selects SDK and reads its bundled audio from `daily-vlog-8/assets/` in the skills root,
through the host's file access (no shell command), on macOS and Windows. No network access is
used.

Fonts: the titles use the reference edit's faces: `Chelsea Market Pro` for the animated title (not
bundled; without it the title falls back to the system's default face) and `Courier New`, which macOS
and Windows ship, for the two text cards. All three stay editable in the Draft.
