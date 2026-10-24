# Close the audio detector's Node CLI dependency

Selfie's browser fallback embeds the canonical audio detector. Its Node-only CLI branch referenced ambient `process` without defining it, so the application's actual undefined-name checker rejected the entire panel with five diagnostics. The branch never runs in the browser: the existing local `require`/`module` shim makes `require.main === module` false.

Import `node:process` once inside that existing CLI guard, alongside the existing guarded `node:fs` dependency. This makes the module self-contained without adding a browser global, changing the guard, or changing the analysis algorithm. The normal module synchronizer delivers the same one-line change to the four registered standalone detectors and Selfie's embedded detector. Selfie is versioned `0.1.0-alpha.9`; no app, SDK, generator, or Chan code changes.

Validation:

- Exact application `PANEL_CHECK_WORKER_SOURCE`, TypeScript 5.9.3, and bundled library closure: Selfie changes from five undefined-name errors to none; all four consuming panels pass, with no timeout or skip.
- `node --test tests/audio_beat_engine.test.mjs`: six tests pass. They cover numerical parity across all four consumers, browser worker and Selfie fallback with no Node IO, and all five Node entry points in stdout, output-file, and missing-input modes. Missing inputs still emit JSON and exit with status 1.
- `node tools/sync_panel_modules.mjs --check` and `git diff --check` pass. Synchronization changes only the registered detector copies and Selfie's embedded detector.

This verifies static loading eligibility and the audio engine's existing execution modes. It does not establish actual PanelHost loading, a full Selfie template run, playback, or export.
