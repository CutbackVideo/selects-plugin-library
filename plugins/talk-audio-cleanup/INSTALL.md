# Install Talk Audio Cleanup

Experimental: macOS, with a Selects build that has Panel support,
`sdk.runShell` and bundled FFmpeg jobs.

1. Place this package in `talk-audio-cleanup` beneath
   `SELECTS_USER_SKILLS_ROOT`, and `panel.tsx` in `talk-audio-cleanup` beneath
   `SELECTS_USER_PANELS_ROOT`, as in the library's
   [installation layout](../../PUBLISHING.md#installation-layout).
2. Create the Python environment the Panel runs, in the plugin's data folder:

   ```sh
   mkdir -p "$HOME/.selects/plugin-data/talk-audio-cleanup"
   python3 -m venv "$HOME/.selects/plugin-data/talk-audio-cleanup/venv"
   "$HOME/.selects/plugin-data/talk-audio-cleanup/venv/bin/pip" install \
     'numpy==2.4.*' 'scipy==1.18.*' 'scikit-learn==1.9.*' 'joblib>=1.4'
   ```

   Python 3.11 or later.
3. Put the trained model at
   `$HOME/.selects/plugin-data/talk-audio-cleanup/model.joblib`. The model is
   distributed separately from this repository; ask the person who gave you
   this plugin. It was saved with scikit-learn 1.9, which is why step 2 pins
   that version.
4. Check the setup:

   ```sh
   "$HOME/.selects/plugin-data/talk-audio-cleanup/venv/bin/python" \
     "$SELECTS_USER_SKILLS_ROOT/talk-audio-cleanup/engine/analyze.py" --self-check
   ```

   It prints `ok`.

## Uninstall

Delete the `talk-audio-cleanup` folders beneath the panels root, the skills
root and `$HOME/.selects/plugin-data`. Cleaned copies of Drafts are ordinary
Drafts and stay in their Projects.
