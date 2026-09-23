# Install Multicam Generator

1. Use a Selects build with user Panels, `sdk.askAI`, `sdk.runScript`, `sdk.runShell`, managed media generation, and the internal timeline/filesystem/FFmpeg adapters. Selects Staging 2.0.443 on macOS was tested. Omni's direct native generation requires the `MediaGeneration` service (host 2.0.433 or newer) and account access.
2. Confirm your account can use your chosen video model and Sync Lipsync 2 Pro. Generation can consume credits and uploads the selected source media to Selects-managed services. No provider key is required.
3. Preserve any existing custom panel, then copy this package's `panel.tsx` unchanged to `SELECTS_USER_PANELS_ROOT/multicam-generator/panel.tsx`, using the environment-provided panels root. Create the directory if needed; no registration API is required.
4. Reopen **Multicam Generator** in the Plugin list. Embedded previews and translations need no separate files.

React and FFmpeg/FFprobe are supplied by Selects. Do not install Node dependencies or model weights for this plugin. Python 3 on PATH enables optional diagnostic logging; if it is unavailable, the error remains in local storage.

See [README.md](README.md) for operation and known limitations, including the AI-mediated request issue affecting non-Omni paths. Completed results are added automatically as separate editable clips. Removing the panel does not delete project media, clips or local cache.
