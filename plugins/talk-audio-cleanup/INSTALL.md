# Install Talk Audio Cleanup

Experimental: macOS, with a Selects build that has Panel support,
`sdk.runShell` and bundled FFmpeg jobs.

1. Place this package in `talk-audio-cleanup` beneath
   `SELECTS_USER_SKILLS_ROOT`, and `panel.tsx` in `talk-audio-cleanup` beneath
   `SELECTS_USER_PANELS_ROOT`, as in the library's
   [installation layout](../../PUBLISHING.md#installation-layout).
2. Put the trained model at
   `$HOME/.selects/plugin-data/talk-audio-cleanup/model.joblib`. The model is
   not part of this repository and is not publicly distributed; without it the
   Panel stops at **Analyze** and says so. It was saved with scikit-learn 1.9,
   which is why `engine/requirements.txt` pins that version.
3. Nothing else to install by hand. On the first **Analyze** the Panel sets up
   the analysis program's Python in
   `$HOME/.selects/plugin-data/talk-audio-cleanup/venv`: a virtual environment
   with `engine/requirements.txt`, built on a pinned CPython 3.11.13 that
   `runtime.sh` downloads (through uv, checked by SHA-256) into
   `~/.selects/plugin-data/_runtime/`, shared with other plugins. A system
   `python3` is not used. It needs a network connection that once.
4. To check the setup afterwards:

   ```sh
   "$HOME/.selects/plugin-data/talk-audio-cleanup/venv/bin/python" \
     "$SELECTS_USER_SKILLS_ROOT/talk-audio-cleanup/engine/analyze.py" --self-check
   ```

   It prints `ok`.

## Uninstall

Delete the `talk-audio-cleanup` folders beneath the panels root, the skills
root and `$HOME/.selects/plugin-data`. Cleaned copies of Drafts are ordinary
Drafts and stay in their Projects.
