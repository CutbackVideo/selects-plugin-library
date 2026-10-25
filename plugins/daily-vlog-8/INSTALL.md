# Install notes

No extra runtimes, models or credentials are required. The panel builds the Draft through the
Selects SDK and reads its bundled audio from `daily-vlog-8/assets/` in the skills root,
through the host's file access (no shell command), on macOS and Windows. No network access is
used.

Fonts: the animated title prefers an installed `Chelsea Market Pro` (not bundled).
The bundled `Chelsea Market` regular face is the fallback when Pro is unavailable;
it is not identical to Pro. Its font data and OFL license are embedded in the saved
opening title. The two text cards use `Courier New`. All three titles stay editable
in the Draft.
