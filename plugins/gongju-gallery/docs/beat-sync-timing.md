# Fixed-song timing evidence

The current 15-shot composition is preserved. No soundtrack, cut, title, or end
frame was changed for this measurement.

`tests/fixtures/gongju-gallery/beat-sync-v1.json` was produced by the application's
actual `createBeatSyncMeasurer`, with `includeBeatAnalysis: true`, from the bundled
`gallery-bgm-gallery-montage-12s-v2.wav`. Its SHA-256 is
`9729f75628a0cd1e417bc7497f721e95bd10856f3bebf9e9713e7e5b43455f45`.
The fixture records the exact implementation hashes, command, and tool versions.
It is measured data, rather than expected times copied from the template.

The analyzer returned 115.99 BPM, first beat 0.017 seconds, an accepted grid,
9.3 ms median grid residual, and a hit rate of 1. These are the analyzer's
statistics, not probabilities or labels identifying a piano. The strongest
pulse candidate was 116.22 BPM with autocorrelation 0.894 and flux share 0.850.
Raw flux/pulse times use analysis-window centres; the interpreted grid and band
onsets estimate attacks. Those clocks must not be substituted for each other.

Pair the 15 visible shot starts with consecutive global beats 7 through 21 and
the 15 ordered mid-band events in the montage window. Use one fixed sequence,
not a separate nearest event for each cut. The final boundary (reference frame
341) is an output end, not a sixteenth shot start.

| Draft fps | Mean cut minus mid-band event | Mean absolute difference | Within one frame |
| --- | ---: | ---: | ---: |
| 30000/1001 | -8.47 ms | 8.65 ms | 15/15 |
| 24000/1001 | -9.03 ms | 13.03 ms | 15/15 |

The whole production `galleryScript` test verifies the frame conversion,
title-to-first-shot connection, 15 positive contiguous shots, music timeline
start zero, untrimmed music resource/default source start zero, and the fixed
end. The external Draft API is a test boundary; this is not a live app test.
The deliberately injected -0.4-second comparison must fail. It is a sensitivity
control, not a reproduction of the historical report.

These measurements do not support shifting the current cuts by -0.4 seconds:
that increases the measured mid-band mean absolute difference to 408.47 ms.
They also do not establish the intended piano-note identity or accept the
soundtrack/motion aesthetics. No listening was performed.

## Reproduce the measurement

Use an existing application checkout containing the recorded factory and its
existing esbuild dependency, plus FFmpeg/FFprobe on PATH. The generator has a
120-second deadline, writes no decoded audio, does not start the app or use its
SDK, and refuses to overwrite a result. Point `SELECTS_ESBUILD` at an existing
esbuild module if it is outside that application checkout.

```sh
node tests/fixtures/gongju-gallery/measure.mjs \
  --app-root /path/to/existing/cutback-client \
  --output /new/path/measurement.json
```

Compare `source`, `measurement`, and `generation.implementation` with the
committed fixture. A different application commit alone can be unrelated;
different analyzer hashes or measurement values require review. Do not silently
replace the fixture with output from another soundtrack or analyzer revision.

Run the regression with the existing TypeScript test dependency configured as
for the other panel tests:

```sh
node --test tests/gongju_gallery_beat_sync.test.mjs
```
