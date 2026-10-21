# Gallery pixels through the product export renderer

Photo Grid Reveal 0.3.18 now has a reproducible check from its real SDK
authoring operation through product export projection to browser pixels. This
is another gate in the 28-template repair, not completion of that goal. Chan's
shortform apps and packs remain excluded.

## Reproduce

```sh
# In the explicitly selected, combined client checkout:
node scripts/build-video-renderer-wasm.mjs
# In this library checkout; the output directory must not exist yet:
SELECTS_DEV_REPO=/path/to/combined-selects node tools/check_gallery_pixels.mjs --output=/absolute/new-directory
```

The client needs the deadline (#7847), source-window (#7828), fresh-read and
file-fingerprint (#7866) changes, plus the CSS raster precision/density fix
`9ef36e4db`. Normal client dependencies, ffmpeg/ffprobe and local Chrome with
WebGPU are required. Missing prerequisites fail explicitly. This optional local
command does not turn the private client into a public-library CI dependency.
It owns a temporary client-local fixture directory and loopback Vite server,
uses generated media and in-memory repositories, closes its browser/server and
removes only its fixture directory. Reports and selected PNGs remain in the
requested output directory. It does not install or operate Selects.

## Independent observations

The existing real-SDK fixture saves 21 separate visual Clips, then the actual
RemotionOverlayProjectionAdapter and exportInput produce the export scene and
programs. ExportFrameRenderer, ExportMedia, ExportClock and ExportCompositor
render them using real media decoding, authored-program rasterization and
WebGPU. No hand-built replacement scene substitutes for the saved Draft.

Four cases use the mixed 15-Image/6-Video slot arrangement: a plain red Image,
landscape RGB bands, portrait RGB bands and a square red Image. Landscape
column focus and portrait row focus exercise different source crops. The
actual default Project grid is 24000/1001 fps, with 341 output frames per case.
The oracle is the separately preserved reference-oracle.json, converted to
that grid; expected reveal/color clocks are not copied from saved effects.

Every frame samples nine interior points and a center patch per cell, fourteen
vertical boundaries and eighteen horizontal boundaries. The assertions cover
visibility/reveal timing, grayscale before the shared color event, expected
focused Image colors after it and black grid boundaries. This is sampling of
every frame, not an assertion about every output pixel. Landmark PNGs are also
saved for inspection. A deliberately delayed one-frame color event and a
20-pixel placement error must both be detected.

## Two causes, one existing renderer

The first narrow probe checked 44 landmark frames and only vertical grid
boundaries. It passed, but did not establish full-frame or horizontal-boundary
correctness. Extending to all frames and aspect/focus variants exposed color
bleeding into the grid. Reading horizontal boundaries also showed that the
original probe had missed another affected axis.

CanvasProgramRaster rounded fractional layout through integer offsetLeft,
offsetTop, offsetWidth and offsetHeight. Large placement magnified that error.
It now preserves resolved absolute CSS positions and fractional border-box
sizes. This correction alone still failed the stronger pixel oracle: opacity,
filter and mask groups, and the outer program canvas, had been painted at a
small source resolution and enlarged afterward.

The existing raster path now accepts presentation pixel density without
changing logical program dimensions or frame clocks. ExportProgramRenderer
derives density from the largest stretch of the actual current placement,
including animated affine transforms. Nested groups retain adequate density.
The existing SVG fallback and its cache also respect requested resolution;
spatial filters use that fallback where the direct path cannot preserve CSS
lengths. No new template-specific renderer or shared feature is introduced.
The library module pool remains five features with ten registered consumers.
No IPC, SDK schema or host capability was added; binary version and minimum
host policy are unchanged.

## Causal verification and limits

Failing browser cases precede the fractional fix, and failing density cases
precede the density fix. The final real-browser component suite passes 17
tests across five files, retaining prior controls and adding fractional clips,
scaled opacity/filter groups, resolution-aware SVG caching, affine stretch
and spatial-filter coverage. The expanded Gallery probe passes all 1,364
normal frames, both fault-injection controls and has no captured browser or
HTTP errors. The ordinary real-SDK authoring suite still passes ten cases.

The final pixel run used combined client HEAD d3e146c0c with the owned renderer
patch applied. Its summary records all three production renderer hashes and
the WASM hash; the production source hashes match committed fix 9ef36e4db.
The summary explicitly records the modified tree rather than attributing the
patched output to the unpatched HEAD. Local artifacts retain the initial and
intermediate failures, whose oracle scopes differ and must not be compared
as if they were identical bug counts.

An offline analysis of post-color interior samples finds one stable signature
for each of the 15 Image cells and 226-229 signatures for each of the six Video
cells. This confirms movement/stability at those sampled points with synthetic
media, not natural-motion quality or complete temporal fidelity.

This is isolated macOS Chrome/WebGPU evidence at one Project grid and output
size, with generated small media and no Audio. It is not installed Selects or
Windows behavior, SQLite persistence/reload, Inspector editing, live playback,
native encoded export, complete video/audio comparison, original-reference
reproduction or changed-input quality. Those gates and remaining template
repairs stay open. Increased raster density uses more memory when effects are
magnified; no large-media performance or memory benchmark is claimed.
