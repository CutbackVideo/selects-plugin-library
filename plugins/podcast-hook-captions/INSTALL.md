# Install Podcast Hook Captions

Supports macOS arm64 and Windows x64. Requires Selects 2.0.560 or later with the public shared AI SDK. Install both
`podcast-hook-captions` and `selects-ai-runtime` from the **same full library
commit**. The installer does not automatically install another source plugin
from a manifest dependency field. Installing the source packages is distinct
from preparing native dependencies and models, which happens on first use.

## Setup

1. Follow the library [installation instructions](../../INSTALLING.md)
   for each of the two packages: its `panel.tsx` goes under the matching ID in
   `SELECTS_USER_PANELS_ROOT`; remaining listed files go under the matching ID in
   `SELECTS_USER_SKILLS_ROOT`. Preserve existing plugin data and settings.
2. Verify the shared runtime package is complete, including its source entry,
   task implementations and pinned manifest. Do not copy an author's cache or
   machine-specific configuration. Its bundled-Selects Node/runtime and model
   preparation is automatic when a supported host receives the first request.
3. Open a transcribed direct-video Draft and **Podcast Hook Captions**.
4. Use **Run or recover face pass** to check only the shared face stage. This
   action performs no paid generation and commits no Draft edits. Making the
   complete reel retains the original generation/billing behavior.

FFmpeg and FFprobe remain the copies bundled with Selects. The plugin uses them
for source cut/color sampling and media rendering, without a shell. Face
inference and model/runtime installation now belong to the shared runtime,
using CPU on both macOS and Windows. No Python or panel WASM runtime is needed.

## Updating and recovery

Replace package files and generated panel. Keep existing reel folders, recovery
journals and sound-effect data. Legacy panel face-runtime downloads are no longer
used; do not delete a folder containing a Draft's rendered media. A failed,
canceled or completed request keeps its identity: ordinary recovery never mints
a new key. Use **Start new face pass** only for an intentional new isolated pass.
**Rebuild this reel** retries the latest failed or canceled face requests in
that reel with new keys, while retaining successful requests and recovering
pending or uncertain ones. The isolated face pass has its own history.

The source package was migrated from committed revision
`9326fad00db19a64b8e80b26b2266c54b9566d49`; production installed copies were not
modified during authoring. Full paid reel generation is outside this migration's
Mac/Windows face-stage verification.

## Build and tests

`panel.tsx` is already generated and runnable. To rebuild with an existing
esbuild installation:

```sh
PANEL_OUT=panel.tsx node build.cjs /path/to/esbuild/lib/main.js
node --test tests/*.test.cjs
```

On Windows PowerShell, set `$env:PANEL_OUT = "panel.tsx"` before running the
same Node build command. By default the build writes to the installed Panels
layout (`../../panels/podcast-hook-captions/panel.tsx`). No build tool or tests
are needed in the user's runtime path. Optional authoring checks use
`AI_PANEL_TEST_MODULES` pointing at an existing Selects `node_modules`; they
verify the literal scripts against the real public SDK, a delayed Project
switch and the retained shot/color reducer. The pure contract/lifecycle tests
always run without third-party dependencies.
