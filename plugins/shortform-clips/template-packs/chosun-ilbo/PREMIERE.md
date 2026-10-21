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
  Caption tracking is -44/1000 em, converted to -3.3 px; bar captions now
  retain that optional tracking in both preview and export. The legacy default
  remains -1 px when a template does not specify tracking. This correction is
  source-verified; native Premiere render comparison is still pending.
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
pending a render comparison with the actual fonts and linked assets. Panilgi now uses the paragraph geometry described in the native-reference
follow-up below; it must not be treated as a centered point-text object.

The stored font names are the exact PostScript face identifiers from Premiere.
Installed-font resolution must be checked in the target renderer; a machine
without a matching face can silently use a fallback. This pack supplies no font
files. Tests verify settings and parameter propagation, not installed glyphs.

The Heukbaek reference uses `Mplus1p-Medium` for its CJK ideograph.
`headline.ideographFont` now explicitly selects the installed `MPLUS1p-Medium`
face for Han characters; Korean and punctuation retain the primary Hv face.
The separately acquired font is not included in the pack. Panilgi has per-run tracking differences, and History/Villain vary
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

## Heukbaek native reference follow-up

Actual Premiere PNG at 00:00:00:15 confirms title stroke and shadow are disabled.
The second title fill is #FF29B8 (the absent red channel has default 255; a
parser that requires all RGB fields incorrectly reports no color). The title
text origin is y=.1412200927734375*1920, auto leading 1.2*74=88.8. The outer
graphic group translates x by -33px. Headline center is 293.342578125, and the
resulting horizontal offset is -0.555044151961px.

Captions have first baseline .692657470703125*1920=1329.90234375 and auto
leading 1.2*75=90px. `baselineTop` anchors the first line regardless of the
number of lines; optional bar-caption tracking is -3.3px. Their source center
is .4968719482421875*1080, with a source-derived -3.3783px horizontal offset.
The template retains the existing full-width black band. Native text background
padding is 18.579235076904297px, fully inside that opaque band for the checked
sample; it is not separately replicated by this bar-caption renderer.

The actual Selects still with matching text has <=2px fill-bound differences
for the second title and both caption lines. This is not pixel identity. The
native reference has missing-media placeholders over the title background and
logo: first-title full bounds, original assets, and the complete composition
remain unverified. Do not substitute the legacy WebPs as verified original files.

## Panilgi native reference follow-up

The local Premiere Pro PNG at 00:00:01:00 uses the customer project unchanged
except for relinking the shared logo candidate (1920x1080, matching the stored
stream dimensions). Original episode footage and music remain offline. The
missing SDDolTTF-aLt face belongs to the end-card text, not the compared title
or dialogue. End-card fidelity is not verified.

- Title component 2894 uses a 810x576 paragraph box at (135,201), centered
  horizontally. Its enclosing graphic transform has scale 112%, anchor
  (540,960), position (540,574). The last baseline is
  `(201+576-960)*1.12+574 = 369.04`. Auto-leading is
  `67.30612182617188*1.12*1.2 = 90.459427734375`. Converting the baseline
  midpoint with the installed face's .8/.2 em metrics gives headlineCenter
  301.24685766601556.
- First-line fill is #FFE400 (omitted red channel defaults to 255), second-line
  fill is white. Shadow is disabled. Enabled 4px stroke becomes 4.48px.
  First-line tracking is 0; the second line uses -12/1000 em, or
  -0.9045942773437501px. Separate tracking options preserve these run values.
- Caption component 2795 uses a 810x576 paragraph box. Its text position is
  (135,1248.0000687), parent position (540,509.0000153), anchor (540,960).
  Last baseline is 1373.0000839233398; auto-leading is 66.86399688720703.
  Tracking is 0. Background is enabled, opaque black, padding 13.962264px.
  Both lines share one enclosing rectangle, rather than separate rectangles.
- Glyph-width measurement fits long titles inside the configured safe width,
  including the synthetic italic overhang and outline. It is opt-in and does
  not change other templates' existing headline fit behavior. Ink captions use
  the requested source size before their existing measured-width fit, avoiding
  a second heuristic shrink before actual measurement.

Actual Selects PNG comparison: title vertical fill bounds differ by <=1px;
caption bounds by <=2px vertically and match horizontally in this fixture.
Title horizontal bounds still differ by up to 6px with the existing synthetic
italic renderer. This is not pixel identity. The published comparison Short
Ds3CgUHfvWM uses different headline sizing/placement; its pixels do not override
customer project values. The local comparison uses the published wording and a
still from a different episode for context, not a matched-video export test.
