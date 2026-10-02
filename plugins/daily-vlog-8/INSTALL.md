# Install notes

No extra runtimes, models or credentials are required. The panel builds the Draft through the
Selects SDK and reads its bundled audio from `daily-vlog-8/assets/` in the skills root,
through the host's file access (no shell command), on macOS and Windows. No network access is
used.

Fonts: the animated title falls back through `Gill Sans` and `Arial Black` to a generic
sans-serif, and the closing card through Segoe UI and Arial on Windows, so both render
without installing anything.
