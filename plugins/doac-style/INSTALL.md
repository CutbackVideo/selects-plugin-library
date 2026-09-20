# Install DOAC Style

Experimental: macOS arm64 and a compatible Selects development build.

1. Place this package in `doac-style` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Copy `panel.tsx` byte-for-byte to
   `SELECTS_USER_PANELS_ROOT/stylish-captions/panel.tsx`.
3. Install the Python dependencies from `approved/requirements.txt` in the
   environment used by the panel's caption compiler.
4. Decode the bundled font before first use:

   ```sh
   ROOT="$SELECTS_USER_PANELS_ROOT/stylish-captions/approved/native/fonts/permanentmarker"
   base64 -D "$ROOT/PermanentMarker-Regular.ttf.b64" > "$ROOT/PermanentMarker-Regular.ttf"
   ```

5. Reload Selects, open a vertical English talking-head Draft, and choose
   **Create captions** in the **DOAC Style** panel.

The package includes the approved caption engine, templates, font asset, and
renderer. It excludes local job state, project data, source footage, and test
artifacts.
