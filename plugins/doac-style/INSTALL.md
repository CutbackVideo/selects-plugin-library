# Install DOAC Style

Experimental: macOS arm64 and Windows x64, with a compatible Selects
development build.

On Windows the Panel runs the same caption engine inside Selects
(`approved/web/`: a JavaScript port of the Python engine that draws with
FreeType and Pillow compiled to WebAssembly). On the same fonts it draws the
same frames as the Python engine on macOS (`dev/parity/`). The Windows path has
not yet been checked in Selects on a Windows machine.

## Setup

1. Place this package in `doac-style` beneath `SELECTS_USER_SKILLS_ROOT`, and
   `panel.tsx` in `doac-style` beneath `SELECTS_USER_PANELS_ROOT`, as in the
   library's [installation layout](../../PUBLISHING.md#installation-layout). The
   Panel runs its caption compiler from the package's `approved/` folder.
2. Nothing else to install by hand.
   - Windows: nothing is downloaded. The Panel reads Arial, Arial Black, Georgia
     and Times New Roman from the Windows Fonts folder. Windows has no Helvetica
     or Helvetica Neue, so those slots use the bundled Arimo (metric-compatible,
     SIL OFL); Arimo Bold also stands in for Arial Narrow Bold when Microsoft
     Office's copy is not installed. Those slots look slightly different from
     macOS; the layout rules, timing and checks are the same.
   - macOS: on first use the Panel sets up its caption
   renderer inside the package: a Python virtual environment in `.runtime/` with
   `approved/requirements.txt`, and the bundled font decoded. The environment is
   built on a pinned CPython 3.11.13 that `runtime.sh` downloads (through uv,
   checked by SHA-256) into `~/.selects/plugin-data/_runtime/`, shared with other
   plugins; a system `python3` is not used. It needs a network connection that
   once; later runs reuse it.
3. Reload Selects, open a vertical English or Korean talking-head Draft, and choose
   **Create captions** in the **DOAC Style** panel.

## Updating

Replace the package and `panel.tsx`. The Panel checks its renderer on the next
run and sets it up again when something it needs is missing. Earlier versions
kept files elsewhere, and the Panel no longer reads them:

- 0.1.1 also copied `approved/` next to `panel.tsx`. That copy can be removed.
- 0.1.0 installed the Panel in a folder named `stylish-captions`. If that Panel
  folder holds DOAC Style (its `panel.tsx` starts with `// @name DOAC Style`),
  move it out of the Panels folder so the Plugin list shows one DOAC Style.

Existing caption Drafts are unaffected: their caption images are stored in the
Drafts.

The package includes the approved caption engine, templates, font asset, and
renderer. It excludes local job state, project data, source footage, and test
artifacts.
