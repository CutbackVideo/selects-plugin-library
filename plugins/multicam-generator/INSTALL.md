# Install Multicam Generator

1. Use a Selects build supporting user Panels, `sdk.askAI`, `sdk.runScript`, `sdk.runShell`, managed media generation, and the internal timeline/filesystem/FFmpeg adapters used by this panel.
2. Confirm your account has access to Kling O1 Edit Video [Pro] and Sync Lipsync. Generation consumes credits; no external provider credentials are needed.
3. Copy this package's `panel.tsx` unchanged to `SELECTS_USER_PANELS_ROOT/multicam-generator/panel.tsx`, using the environment-provided panels root. Create that directory if needed. Do not register it via a separate API. Preserve any existing custom panel before replacement.
4. Reload the Panels list if necessary and open **Multicam Generator**.

React is supplied by the Selects panel host. Media preparation uses the host FFmpeg/FFprobe adapters; no model weights or Node dependencies need to be installed. Python 3 on PATH enables optional local diagnostic logging; a logging failure retains the error in local storage.

See [README.md](README.md) for operation, recovery, costs and limitations. Removing the installed panel removes the UI; it does not delete generated project media, clips or local job cache.
