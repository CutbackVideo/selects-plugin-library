# Headless driver (Selfie Aesthetic Edit)

`driver-adapter.mjs` is the style-specific half of the selects-app-kit driver (`tools/drive/build-driver.mjs`): it
rebuilds exactly the configs `panel.tsx` build() sends (panel constants read from `panel.tsx`, `planner.js` and the
`// sae-panel:start/end` helpers run in node:vm) and runs the plugin's `scripts/*.js` verbatim. `matrix.json` has 17
rows (19 builds) over the Projects "Selfie test A" and "Selfie test B".

`KIT` is your selects-app-kit checkout and `PLUGIN` this plugin folder (both absolute).

```sh
# Offline: matrix coverage (every cue incl. own and none, preset, length, clip sound, look, photos, section, seed 2,
# transition mode >= 2 rows; a Korean-UI row; unique Draft names)
node $KIT/tools/drive/build-driver.mjs --plugin $PLUGIN --adapter $PLUGIN/dev/driver-adapter.mjs --matrix $PLUGIN/dev/matrix.json --check

# Offline: plan one row from saved inventory / search files (no Selects needed)
node $KIT/tools/drive/build-driver.mjs --plugin $PLUGIN --adapter $PLUGIN/dev/driver-adapter.mjs --matrix $PLUGIN/dev/matrix.json \
  --key a-funk --plan-only --inventory inv.json --search search.json

# Staging (writes Drafts; only with the go-ahead): one row, or every row x its seeds
node $KIT/tools/drive/build-driver.mjs --plugin $PLUGIN --adapter $PLUGIN/dev/driver-adapter.mjs --matrix $PLUGIN/dev/matrix.json --key b-day-t
TEST_MUSIC=/path/to/track.mp3 node $KIT/tools/drive/build-driver.mjs --plugin $PLUGIN --adapter $PLUGIN/dev/driver-adapter.mjs --matrix $PLUGIN/dev/matrix.json --all

node $PLUGIN/tests/driver.test.cjs        # offline adapter test (TEST_MUSIC set: also the own-music decode)
```

Until the plugin has its `plugin.json`, `build-driver.mjs` cannot start on this folder (it reads `plugin.json` first).
Point `--plugin` at a mirror instead: a folder with a symlink to every entry of `$PLUGIN` plus
`{"id":"selfie-aesthetic","version":"0.0.0"}` as `plugin.json`.

Own music: the two own rows use `own:$TEST_MUSIC` (no personal paths in the repo). Set `TEST_MUSIC` (the sprint used
the CC0 track "HoliznaCC0 - Everything You Ever Dreamed"), or pass `--own <path>`, which replaces every own row's path.
The adapter decodes it like the panel (ffmpeg `-t 240 -ac 1 -ar 22050 -f f32le`; `FFMPEG_DIR` or PATH) and runs
`beat-detect.cjs` `analyze`, then builds the panel's `saeOwnCue` and loudest-section default.

Row inputs: `cue`, `preset`, `look`, `length`, `clipSound`, `photos`, `section` (`default` = the panel's default,
`early` / `late` = the first / last bar line the edit fits, or seconds, snapped like the waveform), `whipMode`
(the A/B; the panel itself always sends `SAE_WHIP_MODE`), `uiLang` (Adjust labels from STRINGS), `seeds`, `export`,
`capture`. Draft names: `Selfie test <A|B> <cue> <preset> <length> s<seed>`, plus ` transition` in transition mode.

Differences from a panel Build and what the readback cannot check:
- No bad-shot spans. The panel reads them with `sdk.call("getResourceVisualSpans")`, which run_script / MCP cannot
  reach, so the plan gets none and may pick a moment the panel would have moved off a bad span.
- Transitions (transition mode): the kit readback does not read `d.transitions()`. Compare
  `rec.decorate.transitions + rec.decorate.transitionsKept` with `rec.expectedTransitions` (holds - 1).
- Adjacency is per bar (the holds of a bar always share a source): `plan()` throws when adjacent bars share a source
  with >= 2 sources and no `adjacent` relaxation; `rec.barRids` lists the bars. `noAdjacent` is not sent.
- Ambient clip sound with photo holds: photos keep 0 dB, so the per-clip -18 dB check is left out
  (`rec.clipSoundUnchecked`).

Evaluate an export: `cuts-<key>-s<seed>.json` (`{ fps, cuts, beats, bpm, gridCuts, ... }`) feeds both
`python3 $PLUGIN/dev/eval-whips.py exp-<key>-s<seed>.mp4 --cuts cuts-<key>-s<seed>.json` and
`node $KIT/tools/eval/eval-beat-sync.cjs exp-<key>-s<seed>.mp4 --cuts cuts-<key>-s<seed>.json`.
