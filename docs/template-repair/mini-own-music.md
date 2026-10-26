# Mini own-music contents and common beat engine

Mini alpha.28 binds the analysis result to the selected music's complete contents.
An unchanged path, file size, mtime or Resource name is not an audio identity.
Archive alpha.17, Selfie alpha.6 and City alpha.9 receive the identical numerical
engine from one canonical source; their other runtime policies are preserved.

## Failure and repair

The retained diagnostic generates valid thirty-second mono PCM16 WAVs at 22,050 Hz.
The original measures 119.99 BPM; its equal-size/equal-mtime replacement measures
100 BPM. Previously the actual Mini Build callback reused 119.99 BPM and dispatched
assembly after replacement or deletion. Now both cases stop before planning/import.
The unchanged control retains exact-path Audio reuse.

Selection uses `prepareMiniOwnMusic`, a Mini policy adapter over existing owners:

1. `native-image-input.observeSourceFiles` and the asset identity reader confirm
   the whole selected file, with stat observations around its native digest.
2. `bundled-assets.prepareDerivedAsset` reserves a private snapshot, verifies its
   contents and publishes bounded, verified JSON keyed by contents, Worker code,
   sample rate and maximum duration. PCM decoding and staging use existing owners.
3. `analysis-worker` runs the existing beat engine. Mini checks its result schema
   and duration against the decoded samples. A transient failed analysis is not
   cached; fixed timing requires a known duration of the verified snapshot.
4. Build rechecks the analysis identity before planning and immediately before
   import. Its Audio reader returns the actual Project path and confirms enough
   duration for the planned section, while preserving its old default response.
5. Physical music observations and exact Project Resource/path bindings join
   the existing assembly entry/precommit and saved-look continuation checks.
   This includes published bundled cue Audio in both entry paths. A restored
   original can resume the same saved assembly without creating another one.

Unknown source, native process exit or cleanup cannot become an ordinary fallback.
Mini's optional duration probe preserves terminal/preserve flags; an ordinary
unsupported probe still returns unknown. One captured client, cancellation signal
and selection generation own the whole operation. Selection imports/saves nothing.

## Module boundary and compatibility

`shared/audio-beat-analysis.cjs` owns numerical analysis and its inherited explicit
raw Float32 development CLI. `shared/panel-modules.json` declares four `fileTargets`
and Selfie’s inline main-thread fallback. The existing sync tool generates
standalone `beat-detect.cjs` and marked panel consumers, verifies
manifest inclusion, rejects excluded/invalid consumers and checks all targets before
writing. Runtime packages remain independent of repository imports. The original
numerical body is unchanged. Summer/End Credits variants are not substituted.

No new file/cache/Worker/save manager is introduced. Existing input, asset, Worker,
private SDK and durable run owners keep their responsibilities. Bootstrap/root
resolution and the unmigrated consumers' legacy audio/workflow policies remain
separate queued work. The manifest and INSTALL now describe mandatory source
identities, optional video analysis, cache storage and retained unknown workspaces.

## Evidence and limits

- RED counterexamples cover same-path/size/mtime replacement, missing/unknown
  music, missing provenance, change during planning/import, insufficient imported
  Audio duration, absent cue source gates, and swallowed terminal probe failure.
- Real-media fixtures cover native FFmpeg sample decoding, unchanged cache reuse,
  source/Worker invalidation, corrupt output, cancellation, ordinary uncached
  fallback, terminal/preserved workspaces, assembly precommit and saved Audio
  content/path restoration through both entry paths.
- Canonical/copy equality, numerical output, browser Worker VM and raw Float32 CLI
  guards preserve all four engines. Selfie’s inline fallback also embeds the complete
  canonical source in a private CommonJS shim, exposes only `analyze` and keeps
  the Node CLI inactive. A dedicated numerical/Node-IO regression covers this
  additional consumer, which the initial file-only extraction missed.
- A separate real development SDK run executes five scenarios using generated
  owned WAVs, actual native decoding and actual Electron browser Workers. It
  confirms 120/100 BPM invalidation, cache reuse, changed-during-Worker refusal,
  missing-original refusal, Worker termination/URL revocation and no staging.
  Its 263 SDK requests include owned file writes, with zero Project/Draft/import
  creation. No user source or Project data is rewritten.
- Owned Electron daemon 54080 and its 14 processes, copied app, ports and four
  nested Helper registrations were removed after proof. Other tasks and the
  isolated profile/evidence remain preserved.

These are feature and development-runtime proofs. Installed panel selection,
real Project import/save, complete video/audio playback, export, released builds,
Windows and full Mini acceptance remain unverified. Full semantic ownership and
whole-template acceptance remain **0/28**, with Chan excluded.

## Reproduce

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test tests/mini_own_music_sources.test.mjs tests/mini_own_music_analysis.test.mjs tests/mini_own_music_recovery.test.mjs tests/mini_media_scope.test.mjs
node --test tests/audio_beat_engine.test.mjs
node tools/sync_panel_modules.mjs --check
node plugins/mini-vlog/operation-builder.mjs --check
SBS_PANEL_TEST_MODULES=/path/to/node_modules node tools/repro_mini_own_music.mjs
```
