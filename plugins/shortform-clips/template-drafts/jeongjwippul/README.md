# Jeongjwippul — Premiere-derived draft

`template.json` is a standalone design, deliberately outside the published pack
until exact fonts and native comparison are available. Import it with a runtime
that includes the caption-stroke changes in this branch. Local comparison copies
also embed the bumper captured from the customer-selected official Short; those
images, reports and embedded-image JSON copies are not committed.

## Customer Premiere values applied

Source: `customer-supplied Jeongjwippul Shorts Premiere project`, 1080×1920.

| Element | Source and value |
| --- | --- |
| Video window | Motion component 645: 1920×1080 source, scale 56.25%, center `(540, 844.9999809265137)` → y=541.2499809265137…1148.7499809265137 |
| Headline | Components 1282/1281: `SDMyeongjo-cBd`, sizes 95/95.16839599609375, white/#FFE400, italic, same-color 2px stroke; no enabled shadow or background |
| Headline placement | Point-text baselines y=365.9999942779541/474.0000057220459, x=532.0494164898992/537.0811096136458. CSS center uses the existing 0.3em conversion; exact font render comparison is still required |
| Tracking | Source -40/1000em → per-line -3.8px / -3.80673583984375px |
| Captions | Component 9588: `SDMyeongjo-bMd`, 58.944522857666016px, white, black 7px stroke enabled |
| Caption placement | Component 9588 is point text at normalized y=.57187497615814209 → baseline=1097.9999542236328. This is an explicit source baseline, not an inferred paragraph-box bottom |
| Caption area | Related paragraph component 11297: x=135, width=810. Its paragraph box starts at y=792 with height=576; these dimensions alone do not mean baseline y=1368 |
| Caption shadow | Enabled black, opacity 100%, distance 5.217391, size 6.956522, blur 73.913048. Serialized angle absent; 135° remains the assumed Premiere default, not a measured value |
| Bumper placement | Component 1283: center y=1379.000015258789, scale 56%. It is a separate image component, not a parent transform on the headline |

The caption renderer now applies stroke behind the fill, retains source baseline
positions using measured font metrics, and includes stroke width in width fitting.
Preview and exported Motion Graphics use the same change. Measured mode fits the
requested size once; it no longer applies heuristic fitting before measuring.
Multiple lines start at the point-text baseline and continue at 1.2em. This is an
explicit point-text template policy, not a claim to match every paragraph graphic
in the multi-episode source project.

## Official Short supplementation

Customer-specified reference: https://www.youtube.com/shorts/6iL0pNQCEwY
(Chosun Ilbo, “Which of these people should be replaced? [Jeongjwippul]”).

- Black surrounding frame confirmed visually.
- Lower bumper extracted directly as a 112×174 browser crop, including black
  margins. Local template displays it at 262.9565px width at the Premiere center.
  This is a compressed low-resolution substitute, not the original `bumper PNG`.
- The small upper-left program logo is present in the reference video itself;
  the comparison scene retains it. A separate transparent `logo PNG` has not been
  reconstructed or falsely supplied as an original asset.

## Optional region blur

Premiere contains clip-specific mask blur. It is deliberately not a template
setting: new videos may have no burned-in captions or different caption positions.
Use the Effects app's Region blur only on clips that need it, and adjust its
region manually. This effect does not detect captions.

## Font portability

No installed-font lookup rewrites the template. Both JSON and generated text
parameters retain `SDMyeongjo-cBd` / `SDMyeongjo-bMd`; normal font resolution uses
those faces when installed/activated under the exact names. A missing font is
rendered with the existing system fallback, while the requested name is retained.
No font binary is included. After activating fonts, re-render (restart the app if
its system-font list has not refreshed). Tests cover portable JSON round trips.
The earlier local comparison substituted `SDGdMyeongjo` explicitly; the new mask
verification does not override the requested font names.

## Remaining limitations

- Exact `SDMyeongjo-cBd` and `SDMyeongjo-bMd` are not installed. The importable
  template and current comparison draft preserve these identifiers. System
  fallback currently changes the glyph shapes/weight on this Mac.
  Font software cannot be recovered from raster video frames.
- Original bumper and transparent logo remain missing. The disabled working
  guide `caption length guide PNG` is optional (component 1280 in the sampled graphic).
- Headline metric conversion, shadow-angle default, paragraph variants and
  source-video blur require native Premiere comparison; do not label them exact.
- Editorial duration/count defaults remain customer-unconfirmed.

Validation: portable-template round trip, baseline/stroke adapter and invalid
input tests, plus actual Selects still export with the modified renderer. The
local report distinguishes Premiere values, Short-derived images and the explicit
font resolution. A real 1920×1080 source was rendered through the new effect and
a portrait template draft was exported to a 3-second FHD MP4. A matched effect-off
control has zero pixel difference in the upper 380 rows of the 960×540 still;
the mask region changes. Replay was unavailable, so live playback performance
is unverified. No claim of full native Premiere pixel parity.
