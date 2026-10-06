# Install

Install from the Selects Plugin Library. The panel installs at `SELECTS_USER_PANELS_ROOT/tang-poetry-explainer/panel.tsx`; the other listed files follow the standard skills-root layout.

Requires Selects 2.0.533 or later with plugin media generation and the bundled file/media services, on macOS or Windows x64. No separate Python, Node, model download or provider key is required. Generated files stay under the current user's `.selects/plugin-data/tang-poetry-explainer` directory.

Open a Project and the app. If required host services are absent, update Selects. A source site that cannot be read can be supplied as pasted text. Media generation must be enabled for that Selects account/session. Script planning uses the AI connection configured in Selects; that connection must be signed in. Generated media uses that user's Selects account and credits.

The Windows path and host-service tests are separate from testing a complete generation run in Windows Selects; see the change's validation record for the actual checks completed.

On Windows, source pages and API responses are limited to 4 MiB, portraits to 8 MiB, and each network request to at most 25 seconds. A site that blocks browser access (CORS), exceeds the limit or times out must be supplied as pasted text; unavailable optional portraits are skipped. Downloads do not use the unbounded host downloader on Windows.
