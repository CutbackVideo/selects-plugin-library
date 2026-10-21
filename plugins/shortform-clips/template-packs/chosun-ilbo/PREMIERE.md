# Premiere reference corrections

These settings were extracted from the supplied Premiere projects on 2026-10-21.
They are distinct from the legacy application settings. Private project files,
reference images and render reports are not distributed with this pack.

| Template | Source text component | Applied title font | Applied title sizes |
| --- | --- | --- | --- |
| `heukbaek` | 1677 | `SDGyeokdongG206Hv` | 74 / 74 |
| `panilgi` | 2894 | `SDGyeokdongG206Hv` | 75.04 / 75.3828564453125 |
| `history` | 146 / 147 | `SDGdMyeongjo` | 100 / 100 |
| `villain` | 157 / 158 | `ROKAF-Slab-Serif-Bold` | 100 / 100 |

Sizes come from the per-run Source Text payload, not the unrelated document
shadow-opacity field (which also commonly contains 100).

- `heukbaek`: title and graphic-group scales are 100%. Tracking is -20/1000 em,
  converted to -1.48 px at 74 px. Captions use `SDGyeokdongG204Rg` at 75.
- `panilgi`: run sizes 67 and 67.30612182617188 are multiplied by the enclosing
  Graphic Group's 112% scale. The enabled black 4 px title stroke becomes
  4.48 px. Captions use `TTOmniGothicM` at 55.71999740600586.
- `history`: title size is 100 with text scale 100%; no enclosing Graphic Group
  scale. The stored stroke color does not enable stroke; the enable flag is
  absent, so the legacy synthetic outline is disabled.
- `villain`: the project contains both Medium and Bold title examples. The
  default uses the Bold example, components 157/158, at 100 with scale 100%.
  Its stroke enable flag is also absent, so the synthetic outline is disabled.
- All specified faces use weight 400 in the renderer to avoid adding synthetic
  bold on top of a face that already identifies its weight.
- `money`: no supplied Premiere project. The customer's additional requirements
  explicitly specify ROKAF Sans (Bareun Air Force). Use `ROKAF Sans Bold` at
  weight 400; Bold is a visual interpretation of their supplied example, not an
  extracted weight. Sizes and geometry remain legacy values, not verified values.
  Source: https://docs.google.com/document/d/1eJQliXCx8lyTtCpurKisbSfqV2wEptV9K8FEw5gYAUc/edit

## Evidence policy

Customer messages, shared files and supplied Premiere projects define template
settings and assets. Published YouTube/TikTok videos are visual comparison
references only. Never infer missing customer settings from a published video.
Legacy assets remain explicitly unverified until matched to supplied originals;
a flattened reference screenshot is not a transparent logo or a clean background.

## Geometry and remaining verification

History and Villain text positions have Y values 334 and 470 on a 1080x1920
canvas: a 136 px separation. At the corrected equal 100 px sizes, the current
renderer produces that separation between line-box centers: 116 px line height
+ 6 px from half of the second-line box padding + 14 px gap = 136 px.
Do not set `rowGap: 136` here: the renderer would additionally include box
padding, producing a 142 px separation.

Premiere text origins are not HTML line-box centers. The existing headline
centers, caption positions, video windows and logo placements are retained
pending a render comparison with the actual fonts and linked assets. In
particular, Panilgi's paragraph-text origin and enclosing group transform must
not be converted as if they were a centered HTML text box.

The stored font names are the exact PostScript face identifiers from Premiere.
Installed-font resolution must be checked in the target renderer; a machine
without a matching face can silently use a fallback. This pack supplies no font
files. Tests verify settings and parameter propagation, not installed glyphs.

The Heukbaek reference also uses `Mplus1p-Medium` for a CJK ideograph within a
title. The current single-font title setting cannot reproduce that per-run face
assignment. Panilgi has per-run tracking differences, and History/Villain vary
tracking by the particular headline. Those are not generalized into a single
guessed template value.

Long headlines can still be reduced by the existing fit-to-width heuristic.
These corrections therefore do not constitute a pixel-identical Premiere
render or a completed visual approval.
