# Install EO Shorts

Experimental. Runs on macOS and Windows with a Selects build that has Panel
`runScript` and `askAI`, Draft motion graphics with generated-media authoring,
and the bundled ffmpeg. Picture generation needs Selects 2.0.512 or later;
stock B-roll needs Selects' stock footage search. Tested on a Selects
development build; released versions are unverified.

Nothing else needs installing:

- FFmpeg and FFprobe are the copies bundled with Selects; the panel runs them
  directly, without a shell.
- Install `selects-ai-runtime` from the same library revision. Shared YuNet face
  jobs run outside the panel on macOS and Windows and require Selects 2.0.570
  or later. Their durable identities stay in each job's `ai-jobs.json`; closing
  the panel detaches observation, Resume reattaches, and Cancel stops active AI.
  Long ranges are split below the decoded source-frame limit; original sample
  times are merged before tracking, including fractional-fps window boundaries.
- The panel still downloads the pinned HarfBuzz font subsetter 1.6.2
  (`harfbuzz-subset.wasm`) into `.selects/plugin-data/eo-shorts/runtime` once.
  It no longer downloads or runs its own YuNet or ONNX Runtime Web.
- Camera-cut detection, face tracking, crop rules, original speech, and music
  remain plugin-owned. Full Windows styled preview/export remains unverified.

## Setup

1. Place `panel.tsx` in `eo-shorts` beneath `SELECTS_USER_PANELS_ROOT`, and
   everything else listed in `plugin.json` (with `plugin.json` itself) in
   `eo-shorts` beneath `SELECTS_USER_SKILLS_ROOT`. The panel reads its fonts,
   music and sound effects from there. Only the files `plugin.json` lists are
   needed; `src/`, `engine/` and `config/` are build inputs.
2. Open a talking-head Draft, then open **EO Shorts** from the **Apps** tab.

## Settings

The defaults are built into `panel.tsx`. Optional overrides live in
`.selects/plugin-data/eo-shorts/config` in your home folder and survive
updates:

- `models.json` chooses which model answers each AI step (by default every
  step uses Selects AI).
- `config.json` with a `commons` object overrides the Wikimedia Commons
  settings, such as `contact` (sent in the Commons API user agent; default
  `https://cutback.video`).

## Building the panel from source

`panel.tsx` is generated from `src/` and `engine/` (the scene compiler, scene
runtime, film styles and planning prompt). From this folder in a clone of the
library:

```sh
npm install --no-save esbuild@0.25.0   # once, or pass the path of an existing esbuild
node build.mjs esbuild
```

`build.mjs` also regenerates `src/mg/sceneRuntimeSource.ts`,
`src/stages/plan/promptSource.ts` and `src/lint/glyphTable.ts` from `engine/`
and `fonts/`. Set `PANEL_OUT` to write the panel elsewhere.

## Updating

Replace the package files and `panel.tsx`. Close the panel first, or wait until
no run is in progress. The runtimes, your settings and every job folder are kept.
