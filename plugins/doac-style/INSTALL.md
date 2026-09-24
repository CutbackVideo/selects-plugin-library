# Install DOAC Style

Experimental: macOS arm64 and a compatible Selects development build.

## Setup

1. Place this package in `doac-style` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Create `doac-style` beneath `SELECTS_USER_PANELS_ROOT`. Copy `panel.tsx` and
   the whole `approved/` folder there byte for byte. The Panel runs its caption
   compiler from that folder, so copying `panel.tsx` alone is not enough.

   ```sh
   PKG="$SELECTS_USER_SKILLS_ROOT/doac-style"
   PANEL="$SELECTS_USER_PANELS_ROOT/doac-style"
   mkdir -p "$PANEL"
   cp "$PKG/panel.tsx" "$PANEL/panel.tsx"
   cp -R "$PKG/approved" "$PANEL/"
   ```

3. Install the Python dependencies from `approved/requirements.txt` in the
   environment used by the panel's caption compiler.
4. Decode the bundled font before first use:

   ```sh
   ROOT="$SELECTS_USER_PANELS_ROOT/doac-style/approved/native/fonts/permanentmarker"
   base64 -D "$ROOT/PermanentMarker-Regular.ttf.b64" > "$ROOT/PermanentMarker-Regular.ttf"
   ```

5. Reload Selects, open a vertical English talking-head Draft, and choose
   **Create captions** in the **DOAC Style** panel.

## Updating

Versions before 0.1.1 installed the Panel in `SELECTS_USER_PANELS_ROOT/stylish-captions`.
If that folder holds the DOAC Style panel (its `panel.tsx` starts with
`// @name DOAC Style`) and `SELECTS_USER_PANELS_ROOT/doac-style` does not exist yet,
rename the folder to `doac-style` instead of creating a second copy, then repeat
steps 2 and 4. Existing caption Drafts keep working: their caption images are stored
in the Drafts, not read from this folder.

The package includes the approved caption engine, templates, font asset, and
renderer. It excludes local job state, project data, source footage, and test
artifacts.
