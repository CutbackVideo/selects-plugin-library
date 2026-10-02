# Install

The Plugin Library places `panel.tsx` at `SELECTS_USER_PANELS_ROOT/vox-explainer/panel.tsx` and `engine.py` at `SELECTS_USER_SKILLS_ROOT/vox-explainer/engine.py`. Nothing else is downloaded or installed.

## Requirements

- macOS and Selects 2.0.512 or later. Windows is not supported yet: the bundled engine is a Python script run through the macOS shell. On Windows the panel opens and says "Available on macOS for now".
- Python 3.9 or later. macOS provides it with the Command Line Tools; if the app reports that Python is missing, run `xcode-select --install` in Terminal.

## Check

Open a Project, open **Vox Style Explainer** from Apps and confirm the panel shows a link field, a target length and **Draft the script**.
