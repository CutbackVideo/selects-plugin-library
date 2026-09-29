# THE END Credits: headless build driver

`adapter.mjs` plugs this style into selects-app-kit's `tools/drive/build-driver.mjs` (`--adapter`). It builds a
Draft the way the panel does: inventory, scene search, plan, ensure-audio, assemble, decorate, then a readback. It
follows spec v1.1 and the `scripts/*.js` config contracts. Panel constants (`TEC_SEARCH_QUERIES`, `TEC_LENGTHS`,
presets and so on) come from `planner.js`, loaded in `node:vm`, never from `panel.tsx`.

| File | What it is |
|---|---|
| `adapter.mjs` | The adapter. Its row inputs are listed in the header comment. |
| `readback-tec.mjs` | The kit readback plus this style's rules (see below); also a CLI (`--help`). |
| `readback-hook.mjs` | A loader hook: the kit driver's `./readback.mjs` import loads `readback-tec.mjs` instead. |
| `matrix.json` | The Staging matrix: 16 rows, 18 builds; each option appears at least twice. `pid`s are `<fill>`. |
| `make-fixtures.mjs`, `fixtures/` | Offline inventory and search JSON made from a footage folder. |

Run from the repo root. Set these once per shell (bash or zsh). `KIT` is your selects-app-kit checkout (read-only), `P` the plugin folder.

```sh
KIT=~/Workspaces/selects-app-kit/tools
P=plugins/the-end-credits
drive() { node --import ./$P/dev/readback-hook.mjs $KIT/drive/build-driver.mjs --plugin $P --adapter $P/dev/adapter.mjs --matrix $P/dev/matrix.json "$@"; }
```

`plugin.json` must exist: the driver reads the id and version from it. Until the package lane adds it, point
`--plugin` at a scratch folder outside the repo. That folder holds symlinks to the plugin's entries plus
`{"id":"the-end-credits","version":"0.0.0"}`. Symlinks or stray files inside the repo would fail `check_public`.

## Offline

```sh
drive --check                                          # validates rows + the coverage rule, no app
drive --key c-std-post --plan-only --inventory $P/dev/fixtures/inventory.json --search $P/dev/fixtures/search.json
node $P/dev/make-fixtures.mjs <footage folder>          # regenerate fixtures (fake rids r0.., real ffprobe sizes)
```

- `--check` needs no app, ffmpeg or env vars.
- The coverage rule checks each value at least twice: layout, length and cue (the 5 cues, `none`, `own`);
  clipSound, look, section (`default`/`early`/`late`), photos and preset (`filmCrew`/`personal`/`travel`/`empty`).
  It also needs seed 2, a title of at least 30 glyphs, and a role that wraps under the 0.55 em measure stub.
- `unfilledPids` counts the `<fill>` placeholders.
- `--plan-only` with `--inventory` and `--search` runs fully offline. Rows with `own:$TEC_OWN_MUSIC` also need that
  env var and ffmpeg, because own music is decoded and beat-detected locally, like the panel does.

## Full build (Staging)

Fill each row's `pid` with a Staging Project of the type named in `project`:
- `landscape`: 16:9 clips only.
- `mixed`: landscape and portrait clips plus photos.

Install the plugin in Selects Staging first: ensure-audio imports bundled cues from `~/.selects/skills/the-end-credits`.

```sh
drive --key c-std-post                  # one Draft (seed 1); --seed 2 for the other version
drive --all --out runs/tec              # every row x its seeds, sequentially
drive --key c-std-post --export         # + SD export for eval / contact sheets
```

Each build writes these files to `--out` (default `$TMPDIR/selects-drive/the-end-credits`):
- `rec-<key>-s<seed>.json`: inputs, plan, frames, rows, roll speed, `expected`, readback and checks.
- `cuts-<key>-s<seed>.json`: for eval.

### Readback rules (`readback-tec.mjs`)

The kit readback's contiguity check needs Main to start at frame 0. The Classic lead-in is instead a gap of `frames[1]`
frames (probe P1), so a Classic build would always fail it. The hook swaps in `readback-tec.mjs`, which:
- reuses the kit's read and checks: size, fps, cut frames, adjacent repeats, the graphic range, the music clip and
  its 1.5 s fade;
- replaces `contiguous` with "starts at `expected.mainStartFrame` (`frames[1]` Classic, 0 Full frame), then
  contiguous";
- checks every main clip's effect stack in order (`stack`): `["Cinematic look","Shot frame"]` with the look on,
  `["Shot frame"]` with it off;
- checks clip sound without the photos (`photoRids`): assemble never sets a photo's level;
- reads `draft.clipTransform()` per main clip and checks the cover scale `max(A/a, a/A)` and position 0 on non-16:9
  sources (`transforms`; 16:9 sources are not checked).

Without the hook the driver still runs, but Classic rows fail `contiguous`, and rows with photos and Ambient/Full sound
fail `clipSound`. To re-check offline: `node $P/dev/readback-tec.mjs --rec <out>/rec-<key>-s1.json` (or
`--from rb.json --expect exp.json`).

## Beat-sync eval (spec R2 tolerance)

The cuts file lists the interior cuts, meaning the end of every main clip except the last. The Classic reveal (gap to
first shot, with a fade-in) is not a scene cut. Full frame's shot 0 to shot 1 cut is included. Timing is grid-only,
so `gridCuts` equals `cuts`. `beats` are the planned cut times in beats (bundled cues and own music with a steady
beat). `toleranceMs` = half a frame at the Draft fps + 1 ms: 17.7 ms at 29.97 fps, 21.9 ms at 23.976, 21.8 ms at 24 (the spec's 16.7/20.8 omit the +1 ms).

```sh
node $KIT/eval/eval-beat-sync.cjs <out>/exp-c-std-post-s1.mp4 --cuts <out>/cuts-c-std-post-s1.json \
  --manifest $P/assets/cues/manifest.json --cue-id post-rock --detector $P/beat-detect.cjs --json eval.json
node -e 'const r=f=>require(require("path").resolve(f)),e=r("eval.json"),c=r(process.argv[1]),t=c.toleranceMs;
  const bad=e.rows.filter(r=>Math.abs(r.toBeatMs)>t);
  console.log({tolMs:+t.toFixed(1),missed:e.cuts.missed.length,worstMs:Math.max(...e.rows.map(r=>Math.abs(r.toBeatMs))),bad:bad.map(r=>r.i)});
  process.exit(bad.length||e.cuts.missed.length?1:0)' <out>/cuts-c-std-post-s1.json
```

Pass means every cut satisfies |`toBeatMs`| <= `toleranceMs` and there are 0 missed cuts. The kit's 17 ms applies only
at 29.97 fps and above. With no music, only check the cut frames; there is no grid to measure against. With own
music, pass `--bpm <cuts.bpm>` instead of `--manifest`.

## Known differences from the panel

- Credit lines are measured with a stub average advance of 0.55 em. The panel and the TSX use a canvas with the real
  fonts, so the roll speed and wraps can differ slightly.
- The planner's `tecCreditLayout` models a fixed title box. The TSX's layout derives from the title's cap centre, so
  the two start-y values differ slightly.
- The Personal/Travel "Moments" count and "Filmed on" dates come from the built picks. Full frame counts shot 0. Own
  music's "loudest part" is the phrase with the highest RMS.
