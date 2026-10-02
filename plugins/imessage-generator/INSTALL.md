# Install iMessage Generator

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/imessage-generator/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There
   is no separate registration step.
2. Confirm your Selects build provides Panel scripting
   (`sdk.runScript`/`sdk.call`), generated-media authoring, and Project
   file-tree adapters. Narration audio is stored and mixed with the host's
   FileSystem and bundled ffmpeg, so ElevenLabs narration needs no local
   tools on macOS or Windows.
3. For free local narration (macOS only for now): Python 3.10–3.13 and
   `ffmpeg` must be on `PATH`. The panel's **Voice** tab downloads and
   verifies the Kokoro model (~140 MB) into `~/.selects/tts/kokoro-v1` on
   first setup. On Windows the Local option shows "Available on macOS for
   now"; use ElevenLabs narration (step 4) or Silent timing instead.
4. For ElevenLabs narration instead (macOS and Windows): no local setup is
   needed, but you must enter your own ElevenLabs API key in the panel and
   approve metered requests.
5. Reload the Panels list if necessary and open **iMessage Generator** in
   a project with an open Draft.

Generated audio and panel state are stored under `~/.selects/generated-audio`
and `~/.selects/panel-state`; nothing is written outside the user's `.selects`
directory.
