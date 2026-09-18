# Install iMessage Generator

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/imessage-generator/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There
   is no separate registration step.
2. Confirm your Selects build provides Panel scripting
   (`sdk.runScript`/`sdk.runShell`/`sdk.call`), generated-media authoring,
   and Project file-tree adapters.
3. For free local narration: Python 3.10–3.13 and `ffmpeg` must be on
   `PATH`. The panel's **Voice** tab downloads and verifies the Kokoro
   model (~140 MB) into `~/.selects/tts/kokoro-v1` on first setup.
4. For ElevenLabs narration instead: no local setup is needed, but you
   must enter your own ElevenLabs API key in the panel and approve metered
   requests.
5. Reload the Panels list if necessary and open **iMessage Generator** in
   a project with an open Draft.

Generated audio and panel state are stored under `~/.selects/generated-audio`
and `~/.selects/panel-state`; nothing is written outside the user's `.selects`
directory.
