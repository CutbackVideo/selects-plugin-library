# Install 20VC Style

Experimental: macOS arm64 and a compatible Selects development build.

This plugin is a Skill only. It contains no panel, no executable code, and no
dependencies.

1. Place this package in `20vc-style` under `SELECTS_USER_SKILLS_ROOT`, so that
   `SKILL.md` sits at `SELECTS_USER_SKILLS_ROOT/20vc-style/SKILL.md`.
2. Reload Selects, open a project with a synchronized conversation, interview,
   or podcast timeline, and ask the agent for a 20VC-style short.

The procedure uses the Selects editing SDK, the transcript-linked caption
preset, the built-in sound import workflow, the bundled `ffmpeg`, and the
browser available to the agent for free-to-use stock B-roll searches. Image or
video generation runs only after the user approves it and requires a Selects
AI profile with a generation model. The host controls AI inference.

No models, runtimes, credentials, reference videos, source media, or test
artifacts are included. Released-version compatibility and final export are
unverified.
