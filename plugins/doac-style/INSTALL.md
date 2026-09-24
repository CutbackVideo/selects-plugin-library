# Install DOAC Style

Experimental: macOS arm64 and a compatible Selects development build.

## Setup

1. Place this package in `doac-style` beneath `SELECTS_USER_SKILLS_ROOT`, and
   `panel.tsx` in `doac-style` beneath `SELECTS_USER_PANELS_ROOT`, as in the
   library's [installation layout](../../PUBLISHING.md#installation-layout). The
   Panel runs its caption compiler from the package's `approved/` folder.
2. Install the Python dependencies from `approved/requirements.txt` in the
   environment used by the panel's caption compiler.
3. Decode the bundled font before first use:

   ```sh
   ROOT="$SELECTS_USER_SKILLS_ROOT/doac-style/approved/native/fonts/permanentmarker"
   base64 -D -i "$ROOT/PermanentMarker-Regular.ttf.b64" -o "$ROOT/PermanentMarker-Regular.ttf"
   ```

4. Reload Selects, open a vertical English talking-head Draft, and choose
   **Create captions** in the **DOAC Style** panel.

## Updating

Replace the package and `panel.tsx`, then repeat step 3. Earlier versions kept
files elsewhere, and the Panel no longer reads them:

- 0.1.1 also copied `approved/` next to `panel.tsx`. That copy can be removed.
- 0.1.0 installed the Panel in a folder named `stylish-captions`. If that Panel
  folder holds DOAC Style (its `panel.tsx` starts with `// @name DOAC Style`),
  move it out of the Panels folder so the Plugin list shows one DOAC Style.

Existing caption Drafts are unaffected: their caption images are stored in the
Drafts.

The package includes the approved caption engine, templates, font asset, and
renderer. It excludes local job state, project data, source footage, and test
artifacts.
