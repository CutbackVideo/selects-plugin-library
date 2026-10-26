# YTN template drafts

This pack starts four teams' short-form designs from the customer-supplied
Premiere projects, Photoshop files and original PNGs received on 2026-10-23.
Every display name explicitly says Draft. These are editable design drafts,
not customer-approved or native-Premiere-render-verified templates.

## Included designs

| Team | Template IDs | Source |
| --- | --- | --- |
| Digital News | `news-shorts` | Current Shorts Premiere project and original frame PNG |
| Digital Production | `top-secret-16x9`, `top-secret-4x3` | Top Secret project, separate original aspect-ratio frame PNGs |
| Digital Production | `knowledge-16x9`, `knowledge-4x3` | Knowledge project, separate original aspect-ratio frame PNGs |
| Digital Content | `now-news-shorts` | Workbook explicitly identifies this as the shared news Shorts design |
| Digital Content | `one-shot-full`, `one-shot-window` | One Shot original format PNGs and Photoshop title layers |
| Star | `star-shorts` | Star Shorts Premiere project, written style guide, blue Photoshop design |

Titles and captions are editable text. Existing logos stay in the supplied frame
images; a second logo is not drawn. Reframing and splits are disabled. The crop
span preserves the width of a 1920x1080 source in each window. Actual 4:3 footage
and end-to-end exports still need checking; the aspect-ratio names identify the
customer's frame variant, not a verified source-media conversion policy.

## Evidence and provisional choices

- News: title `HGHaeDotumP80g` 87, tracking -50 in Premiere (-4.35 px).
  The PDF instead says -35. The draft uses the project value. Caption
  `HGHaeDotumP60g` 63, tracking -35 (-2.205 px), row gap 68 from PDF.
  Both Premiere and PDF specify 60g, while the workbook/TXT say 80g.
  Title colors and 90 px leading come from the PDF. Cross-document differences
  remain recorded rather than silently treating one guide as the final approval.
- Top Secret: `HiKR-ExtraBold` 114 and `EliceDigitalBaeum-Bd` 75,
  with project text positions. Both original font files were supplied.
  The first title color #FF8D8D is sampled from the supplied guide PNG; the
  second line is white. Separate project title positions provide the two
  baselines. Caption positions differ for the two supplied frame variants.
  Final transformed geometry still needs native verification.
- Knowledge: `SDWalkieTalkie02Cd` 61.4187393 and `HGGGothicssiP80g`
  37.2327805, both with project text scale 167.3469696%. The draft incorporates
  that scale into font sizes. Nested graphic transforms still need native checking.
- One Shot: Photoshop title size 150 * 0.5822019483 = 87.3302923,
  font `HGGGothicssiP99g`, tracking -35, baseline transforms 265.661919 /
  360.606347 and corresponding horizontal positions. The chosen colors follow
  the PSD (white/yellow). Its supplied Premiere project primarily describes
  landscape captions; those positions were not copied into this portrait layout.
  Automatic captions are disabled until the portrait caption placement is known.
- Star: project PostScript names `SDGyeokdongG206Hv` (title) and
  `SDGyeokdongG202Ul` (caption), not the ambiguous `02UI` in the TXT.
  Title 65 and caption 80 follow the written guide. Title colors #FD5FFF /
  #FFFFFF and title tracking -40 are preserved. The project also stores 56.25%
  transforms on some captions; final composite caption size and baseline need
  native verification. PSD and Premiere title sizes differ. The draft uses
  Premiere title data. Optional captions are placed below the baked-in logo;
  captioned source footage should leave additional captions disabled.
- Missing local fonts stay explicitly named in the template. A renderer fallback
  does not count as a match. Fonts are not redistributed in this public pack.
- Default headline/editorial instructions are conservative implementation defaults,
  not claimed to be customer-approved editorial rules.
- Baseline mapping, line spacing, decorations, source aspect-ratio handling and
  native exports remain provisional wherever the source transforms have not been
  verified in Premiere. No visual parity claim is made by this pack.

## Asset provenance

Seven PNG files are byte-identical copies of supplied originals. `star-frame.png`
is a derivative of the supplied blue PSD: its title TypeLayer is hidden and the
background/logo layers are composited. It is not extracted from YouTube and does
not bake editable title text into the background. `asset-provenance.json` records
source hashes. No source footage, font files, test screenshots or email bodies
belong in the pack.

## Work not represented by a fake template

- Landscape caption news, News Moa and Star VOD: the current landscape builder
  has a different header/caption/speaker arrangement. Preserve the extracted
  design specification and assess reusable layer support before releasing them.
  Caption-news PNG/PSD bars, animated AVI logos and News Moa intro/outro media
  need separate handling; they are not recreated as generic black boxes.
- This Scene: email says a project was supplied, but its exact file/sequence is
  not identified. Do not create an unrelated placeholder under that name.
- Which Floor: reference links only; dedicated project/assets not identified.
- Y Transcript and Issue Top: the customer's document explicitly says there is
  no video template and no second video edit. Their thumbnail PSDs are separate.

## Verification

The shared pack reader imports all nine drafts. Existing pack compatibility tests
exercise checked-in packs through that same reader. Browser previews render the
actual shared Frame/Caption components; test output and private audit data stay
in the local YTN download folder. Native Premiere comparison and Prod generation /
export have not been performed for these drafts.

## Demo caption placement correction (2026-10-26)

Caption defaults reserve two rows below the video aperture with at least 24 px
of clearance, using font size plus row gap rather than only the last baseline.
Star uses the free area below its baked-in logo (last baseline 1840). These are
readability corrections for the received frame assets, not newly verified
Premiere coordinates. One Shot captions remain disabled. The existing Star
demos retain their broadcast subtitles without a second caption layer.
