# Install

Install from the Selects Plugin Library. The panel installs at `SELECTS_USER_PANELS_ROOT/jared-vox-editorial/panel.tsx`; the other listed files follow the standard skills-root layout.

Requires Selects 2.0.533 or later with plugin media generation and the bundled file/media services, on macOS or Windows x64. No separate Python, Node, model download or provider key is required. Generated files stay under the current user's `.selects/plugin-data/jared-vox-editorial` directory.

Open a Project and the app. If required host services are absent, update Selects. A source site that cannot be read can be supplied as pasted text. Media generation must be enabled for that Selects account/session. Script planning uses the AI connection configured in Selects; that connection must be signed in. Generated media uses that user's Selects account and credits.

The Windows path and host-service tests are separate from testing a complete generation run in Windows Selects; see the change's validation record for the actual checks completed.

Web responses are streamed in the panel with a 25-second deadline: up to 2 MiB for source pages/API replies and 8 MiB for a portrait. The app does not use the host's unbounded main-process downloader. If a site blocks browser access (CORS), stalls, or exceeds the limit, paste its article text instead; an unavailable optional portrait uses the existing silhouette fallback. Downloads are sequential. These limits apply on both macOS and Windows.
