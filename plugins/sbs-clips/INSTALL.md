# Install SBS Radio Clips

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/sbs-clips/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. Install `selects-ai-runtime` from the same library revision (listed in
   `requiresPlugins`, so the app installs it with this plugin). It finds the
   faces the News Direct template follows.
3. The package has no other runtime files and no `SKILL.md`, so it is not
   listed as a Skill.
4. Open **SBS Radio Clips** in the Plugin list with a Project open.

The YouTube downloader (yt-dlp) is fetched automatically the first time a link
is used and is updated automatically when a download fails. The ffmpeg bundled
with Selects (or one on PATH) is used for full-quality downloads.
Templates, saved work and downloads are kept in
`~/.selects/plugin-data/sbs-clips/` (`%USERPROFILE%\.selects\plugin-data\sbs-clips\` on Windows).

Following faces is on for News Direct (Templates tab to change). It needs
`selects-ai-runtime`, Selects 2.0.560 or later and, on Windows, the Microsoft
Visual C++ 2019-or-newer x64 runtime. The first run downloads the face model.
Without them clips keep the fixed crop and the panel says so.

Program detection and clip selection ask Selects for its advanced AI policy
(Sol medium) instead of the chat's model. That needs a Selects build with panel
advanced inference (`agent.panelAdvancedInference`). An older build ignores the
request and uses its usual model; a build whose app does not support it yet
asks you to update. Selects picks the final model: an internal account with
Claude connected stays on its Claude subscription.

## Uninstall

Delete the `sbs-clips` folder from the panels root, and optionally
`~/.selects/plugin-data/sbs-clips/`.
