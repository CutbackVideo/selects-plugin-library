# Install Podcast Hook Captions

Experimental. Runs on macOS and Windows with Selects 2.0.512 or later (Panel
`runScript`/`askAI`, Draft authoring, Selects generation with plug-in files).
Nothing else needs installing:

- FFmpeg and FFprobe are the copies bundled with Selects; the panel runs them
  directly, without a shell.
- Face tracking runs in the panel: on first use it downloads ONNX Runtime Web
  1.30.0 (`ort.wasm.bundle.min.mjs`, `ort-wasm-simd-threaded.wasm`) and the YuNet
  face model (`face_detection_yunet_2023mar.onnx`), checks each against a pinned
  SHA-256, and keeps them in the plugin's data folder. This needs network access
  once (about 15 MB).

Tested on macOS. The Windows path uses the same code (no shell commands, no
platform-specific tools) but has not been run on a Windows PC yet.

## Setup

1. Place the files as in the library's
   [installation layout](../../PUBLISHING.md#installation-layout): `panel.tsx`
   in `podcast-hook-captions` beneath `SELECTS_USER_PANELS_ROOT`, everything else
   in `podcast-hook-captions` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Open a Draft, then open **Podcast Hook Captions** from the Plugin list.

## Building the panel from source

`panel.tsx` is generated from `src/` (the panel, the planner and the two
Remotion components):

```sh
cd "$SELECTS_USER_SKILLS_ROOT/podcast-hook-captions"
npm install --no-save esbuild   # once, or pass the path of an existing esbuild
node build.cjs esbuild
```

Outside the app the folder is `~/.selects/skills/podcast-hook-captions` on macOS
and `%USERPROFILE%\.selects\skills\podcast-hook-captions` on Windows.

`build.cjs` writes `src/renderers.ts` and `panel.tsx` beside the panels root
(`../../panels/podcast-hook-captions/panel.tsx`); set `PANEL_OUT` to write it
elsewhere.

## Updating

Replace the package files and `panel.tsx`. The face-tracking runtime, the
sound-effect library and every reel's folder are kept. Earlier versions created
a Python environment in `.selects/python-envs/podcast-hook-captions`; it is no
longer used and can be deleted.
