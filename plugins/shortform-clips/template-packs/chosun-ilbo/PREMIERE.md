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

## Health: This Makes You Better

Source: customer project `Ogungang This Makes You Better shorts (1)` and the
customer-shared image numbered `42-5.png`, copied unchanged to
`assets/health-frame.png`. This is a design asset, not a broadcast test frame.
The image includes the bottom logo. Its transparent video opening is y=394..1499
on the 1080x1920 canvas; the separate logo layer is disabled. Identity with the
project's missing linked `26NEW` frame is not independently confirmed.

- Latest customer message overrides the older second-title face: both title
  lines use `SDGyeokdongG206Hv`; captions use `SDGyeokdongG204Rg`.
- Title run sizes 128 / 128.1191864, text scale 50%, parent vector scale 120%
  produce 76.8 / 76.87151184 px. Parent-transformed baseline distance is
  104.4 px. Tracking 24 gives approximately 1.8432 px.
- Title outline is enabled, 15 * .5 * 1.2 = 9 px, #27282B.
- Caption size 141 * .59 * .95 = 79.0305 px. Separate text layers have
  129.2 px baseline distance after their 95% parent transform. Background color is #33353A,
  enabled at 60% opacity; stored outline values are disabled, so no caption
  stroke is added. Padding derives from 31.506847 * .59 * .95.
- Headline center and caption bottom are converted from the complete Premiere
  transform hierarchy and installed font ascent/descent. See the corrections
  below. Rasterized shadows are not claimed to be pixel-identical.
- Source crop 0..1080 and conservative editorial prompts are application
  defaults, not extracted customer crop/editing instructions.

The generic per-line caption box settings preserve separate backgrounds
without changing existing templates. Videos, fonts and inspection screenshots
remain in the local regression workspace.

### Health caption coordinate correction

The original transcription incorrectly assumed a black caption background.
SourceText document slot 17 explicitly stores RGB(51,53,58); opacity remains
60% from slot 19. Title shadow RGB(39,40,43) is also retained.

Caption baseline 2 is `(1360 - 960) * .95 + 1044 = 1424`; baseline 1 is
1294.8. Horizontal center is 537.48 after the parent transform. CSS box bottom
is derived from the baseline, half-leading, font ascent/descent (800/200 per
1000 units in the installed Rg face), and the source background padding.
The optional `boxBounds: "ink"` renderer measures each actual line with Canvas
TextMetrics after loading its font, then adds the source padding to the glyph
bounds. `baselineBottom: 1424` keeps placement independent of CSS line-height.
Long lines are fitted against measured width; emphasis remains a colored text
span. This replaces the fixed Korean line-height approximation.

The official matching Short `6P_DalHyhcM` (53 seconds) confirms the same
caption wording. It is comparison evidence only; no source settings were
changed to fit its pixels.

### Complete title transform hierarchy

The missing transform was the text subgroup, not a discrepancy between the
customer project and its published video. Component pin links 5/6 -> 7 -> 8
place both title layers under text subgroup 149 (position y=.4875, anchor=.5),
then identity subgroup 148, and vector transform 147 (scale 120%, position
y=.58098959922790527). Subgroup 149 translates -24px before the outer scale,
so the total additional shift is -28.8px.

Title baselines are `(233 - 24 - 960)*1.2 + .58098959922790527*1920` =
214.30003, and 318.70003 for the second line. CSS headline center is their
average minus half the face's ascent-minus-descent (.3 em), giving 243.4493.
The two x offsets (-5.3156 / -4.7784) also retain their source positions.
`headline.offsetX1/offsetX2` apply independently in preview and export; absent
values retain the existing centered layout.

A local comparison of the same title strings found fill bounds within 2px
of the official 1080x1920 Short on both lines. This is a title-position check,
not proof of pixel identity or an application video-export test. Exact source
fonts, colors and transforms remain authoritative.

### Native Premiere shadow and ink-box verification

The local Premiere Pro 2026 reference is a real 1080x1920 RGBA PNG exported at
00:00:05:00. Its only design override is the latest requested second-title Hv
face; the shared frame is relinked and missing BGM is offline. Size=0 and Size=4
with Blur=0 were also exported as controlled diagnostic references.

`shadowSpec` retains color, opacity, angle, distance, size and blur. Effective
title size is 4 * .5 * 1.2 = 2.4; caption size is 4 * .59 * .95 = 2.242.
The caption's absent angle resolves to a down-right shadow in Premiere; the
previous straight-down assumption was wrong. The template now specifies 135°.
SVG dilation uses half the effective Size; Gaussian sigma uses Blur / 6. This
is a tested approximation to Premiere's rasterization, not a claim about its
internal kernel. Color is composited once after spreading/blurring SourceAlpha,
so opacity does not accumulate through repeated CSS text shadows.

The matched health fixture now has <=2px glyph/box boundary differences.
Caption shadow-region alpha MAE decreased from 17.30 to 2.92 (0..255). Native
PNG exports, synthetic text/width/highlight checks and reports remain local.
Other templates keep their existing rendering unless they opt into these fields.
