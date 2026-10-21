# Chosun Ilbo template pack

Five requested designs migrated from `plugins/chosun-clips` on branch
`chosun-ilbo`, commit `2938989c4f647fdb2d0fef685a91f39174cb39ac`.

Templates: heukbaek, panilgi, history, villain, money, health, parenting.
The health design is newly transcribed from the supplied Premiere project and
customer frame; it was not migrated from the old app.
The ten background/logo WebP files are decoded byte-for-byte from the old
embedded data URLs. Window/crop positions, images, editing settings and editorial
prompts retain their original values. Typography corrections from customer requirements and supplied
Premiere projects are recorded in [PREMIERE.md](PREMIERE.md).
Remaining legacy series typography is recorded explicitly; the old per-line colored
stroke uses CSS `currentColor`. Stroke width is fixed from the declared title
size; unlike the old renderer it does not shrink when a long title is fitted.

Heukbaek enables AI framing by default: wide shots group all participants into
three columns, existing four-way shots retain their order and boundaries, and
single shots stay single. Its allowlist contains only `columns-3` and `grid-4`;
frequent split permits these scene-based instructions without requiring sustained
back-and-forth dialogue. Group counts are computed automatically.
The other four templates keep AI framing **off**, matching the old fixed-crop app.
Heukbaek requires the split-layout support in Shortform Clips 0.5.0 or later.
The manifest migrates saved `chosun-clips` template IDs through the shared
pack installer; it never modifies the old app's files.

Install this folder through Shortform Clips → Templates → Add templates after
publishing. Requires template API 2. No separate customer app is needed.

The shared validator and the Chosun migration regression test cover this pack.
The migration test checks original image hashes and legacy design settings with
an explicit, field-by-field list of Premiere corrections.

## Customer requirement coverage

The supplied team requirements identify nine programs. This migration includes
the five legacy designs and the newly transcribed health and parenting designs:

| Program | Pack ID | Status |
| --- | --- | --- |
| Black & White Yeouido | `heukbaek` | Legacy design included; supplied Premiere project available for comparison |
| Panilgi | `panilgi` | Legacy design included; supplied Premiere project available for comparison |
| History War | `history` | Legacy design included; supplied Premiere project available for comparison |
| Villain Story | `villain` | Legacy design included; supplied Premiere project available for comparison |
| Money Watch | `money` | Legacy design included; no matching Premiere project in the supplied folder |
| This Makes You Better | `health` | Supplied frame, Premiere typography/transforms; actual Premiere PNG and same-text official Short compared locally |
| Smart Parenting | `parenting` | Supplied frame and Premiere title values; two official Shorts compared locally. Dialogue captions calibrated to the official flu Short, retaining the requested Allimjang R face; title checked against native Premiere render. |
| Jeongjwippul | — | Requested; Premiere project supplied, pack template not yet implemented |
| Today's One Minute | — | Requested; Premiere project supplied, pack template not yet implemented |

Kim Kwang-il's Mouth is excluded: it was present in the legacy app but is not
part of the supplied program requirements. Its template, images and legacy ID
mapping are not distributed by this pack. The generic 16:9 source-video request
is not counted as a separate program.

Migration fidelity and customer-reference fidelity are separate checks. The
tests verify the legacy app's values and image bytes, not a pixel match to the
supplied Premiere projects. Verified font and size corrections are applied;
absolute placement and product-app font resolution remain pending. Local
browser renders verified the five selected title faces using installed fonts or
explicit local font mappings; this is not a complete application export test.
Several original linked assets were not supplied.
The extracted legacy images must not be represented as verified replacements
for those missing Premiere assets. Customer projects, screenshots, font files
and visual inspection reports stay in the local inspection workspace.

Parenting requires locally available `OTRecipekoreaM` (Recipekorea) and
`HakgyoansimAllimjang-Regular` (KERIS Allimjang R). Fonts are not bundled.
Its logo is embedded in the customer frame, so the separate logo layer is off.
See PREMIERE.md for source-backed title values and video-derived caption settings.
