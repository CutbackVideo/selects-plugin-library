# Plugin clip effects in WGSL

`plugins.json` maps all 25 migrated apps to the source factories in this folder.
Only the resulting shader graphs execute during Preview/Export. Self-contained
factory strings are embedded in installed panels and serialized `run_script`
functions, because neither can import files from this repository at runtime.

The source TSX clip effects are retained as comparison fixtures. Captions, titles,
Motion Graphics and existing custom transitions keep their original format.
Existing user Drafts are not rewritten. All new `addVideoEffect` and
`replaceVideoEffect` paths in the installed files use `shader`.

## Rebuild

Install development copies of esbuild and TypeScript, then run:

```sh
node tools/build-podcast-dust.mjs
node tools/build-plugin-shaders.mjs
node tools/build-native-matte-panel.mjs
node plugins/a16z-style-captions/build.cjs
node plugins/podcast-hook-captions/build.cjs
python3 plugins/chris-williamson-style/build.py plugins/chris-williamson-style/panel.tsx
node plugins/eo-shorts/build.mjs
node plugins/photo-gallery-no2/build-panel.mjs
```

`ESBUILD` may name an existing esbuild installation; TypeScript must be resolvable
beside it. If the bundled Chris font changes, run `tools/build-chris-font.py`
with `fonttools[woff]` before rebuilding. The three OpenType faces preserve the
original Inter metrics at weights 700/800/900 and its SIL OFL license.

## Host dependency and rollout

Deploy the [companion Selects host](https://github.com/CutbackVideo/cutback-client/pull/8028)
before publishing this catalog update. It adds
explicit string/boolean uniform codes, escaped SVG parameter bindings, fixed SVG
raster dimensions, and bounded embedded OpenType fonts. An older host cannot
validate every graph in this update. Do not merge the catalog PR until the matching
host has shipped and the appropriate `minSelectsVersion` can be set from that
release; no speculative future version is assigned here.

A successful Publish catalog workflow after a merge to `main` updates the catalog
snapshot. Installed copies still follow the app's ordinary plugin update flow.

## Validation and visual limits

`tests/wgsl_effects.test.mjs` covers every registered effect kind, editable defaults,
and the installed authoring paths. `validation-cases.mjs` supplies 57 synthetic
cases. Export them with `node tools/export-shader-validation.mjs`, then feed that
JSON to the companion client's `validate-plugin-effects` Cargo example. The
example compiles both Metal/HLSL and actually renders nine frames per case on
Metal. It emits raw pixel evidence. This is not full-app or Windows GPU validation.

The first three color grades were also compared against their scalar color
functions (maximum error below 1/255 on the sampled color grid). A complete
frame-by-frame comparison of all 25 original templates is still pending.

Known visual differences requiring review:

- Torn Paper Love uses a GPU contour driven by the same seed/inset/edge controls;
  it does not reproduce the old JavaScript polygon vertex-for-vertex.
- Vlog Opening's drawing boil uses GPU value noise instead of SVG turbulence.
- Summer Trip's colored film edge and Cinema Vlog's shadow use GPU approximations.
- Podcast's subtle grid texture uses an analytic periodic pattern. Dust shape,
  placement and lifecycle data come from the original generator.
- Native SVG text rasterization and CSS/Chromium antialiasing may differ, even
  with the same embedded fonts. Large blur radii use at most 121 taps per axis.

These differences are explicit review items; the port is not a claim of exact
visual parity or release approval.

## Person masks

Selects AI Runtime prepares one durable input with original RGB on the left and
its grayscale mask on the right. The WGSL effect samples both halves and applies
luminance as alpha. Video packing uses the original video as the primary clock,
so mask timestamps cannot introduce extra output frames. It preserves the
original Main audio, and adjusts the foreground transform for the doubled input
width. Tests encode/decode actual still/video inputs, check the last fractional
frame, reuse completed work and stop on an unknown encoder acknowledgment.
