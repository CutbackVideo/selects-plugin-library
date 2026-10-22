# Archive, Mini and THE END: preserve color-effect source and coverage

Valid transparent PNGs changed opacity when a color effect was enabled. With an
original alpha of 64/255, Archive produced 255/255 and Mini/THE END produced
128/255. Arithmetic filter additions also changed premultiplied RGB. Separately,
strength 0 changed the React tree and remounted the original Source or children.

The shared render-color-filter owner keeps a fixed source container, grades an
opaque RGB copy and applies the original coverage to the final color result.
Each template retains its own masks, curves and strength defaults. Filter identity
belongs to the shared mounted instance.
Existing authoring, font, file, worker and saved-run owners have different
responsibilities and remain unchanged. The pool now has eleven managed modules
and fifteen template consumers. Grain/leak and other intentional overlays are
outside this RGB-only contract.

Before the fix, actual component tests fail twelve zero-transition lifetime cases
and three SVG coverage cases. The current 34 tests cover Source and children,
deliberate source replacement, cleanup, all 256 alpha values, eight colors, four
strengths, Archive warmth 0/1/2, independent ids with/without React useId, and a
frozen original Chromium RGB baseline. The SVG interpreter follows the standard's
premultiplied composition and unpremultiplied matrix/transfer rules. Existing
template-specific RGB policy tests remain in place; obsolete JSX spelling
assertions were replaced by the real rendering/lifetime checks.

An isolated Electron 43.2.0 / real React and Remotion integration records twenty-one
cases across all three original/current components. Both positive strengths keep
every original alpha pixel, including a complete 256-value alpha ramp. Six
old/current comparisons across eight opaque colors are identical. Toggling
strength preserves the mounted source, and simultaneous different settings have
stable independent ids. The original run
fails six alpha cases and three lifetime cases. An initial harness capture-size
assumption failed on Retina; its failure was retained and sampling corrected to
use the actual image scale before recording the source failures.

Private reproducibility files, original sources, source hashes, PNGs, RED/GREEN
logs and owned-runtime cleanup are retained under
clip-highlights-analysis/repro-20261023/archive-color-surface.
This is standalone component/Chromium evidence, not installed full-app, saved
Draft, whole-video/audio playback, encoded export or Windows acceptance.
Full-template acceptance remains 0/28; Chan is excluded. Continue in existing
template #346; there is no app code change or new PR for this packet.

Archive/THE END previously rounded settings for their filter id while grading the
original numeric precision; .3001 and .3004 could name different graphs identically.
Shared per-instance ids remove that collision. Mini also adopts the same owner
and keeps older-React fallback behavior without per-module counters.

Combined affected checks pass 108 tests; the ownership checker suite passes 11.
All 299 Python checks complete with 6 skips. Of 48 inherited template suites,
47 pass. THE END's unchanged cues.test.cjs cannot run its synthetic tempo-stretch
build because the local FFmpeg lacks the rubberband filter. This developer cue
build prerequisite remains explicit; the test and music builder are not weakened
or replaced as part of the RGB repair.
