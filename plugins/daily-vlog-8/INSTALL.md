# Install notes

No extra runtimes, models or credentials are required. The panel builds the Draft through the
Selects SDK and reads its bundled audio from
`$SELECTS_USER_SKILLS_ROOT/daily-vlog-8/assets/`.

The panel reads that directory through a shell command, so the host must allow the panel's
shell access. No network access is used.

Fonts: the animated title falls back through `Gill Sans` and `Arial Black` to a generic
sans-serif, so it renders without installing anything.
