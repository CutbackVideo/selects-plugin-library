# Chosun Ilbo template pack

Five requested designs migrated from `plugins/chosun-clips` on branch
`chosun-ilbo`, commit `2938989c4f647fdb2d0fef685a91f39174cb39ac`.

Templates: heukbaek, panilgi, history, villain, money, health, parenting,
jeongjwippul, politics-landscape.
The health design is newly transcribed from the supplied Premiere project and
customer frame; it was not migrated from the old app.
Remaining legacy WebPs were decoded byte-for-byte from the old embedded data URLs.
Pack 1.4.3 replaces Heukbaek and Panilgi artwork with the supplied original files,
adds the original Jeongjwippul bumper, and uses a solid black Panilgi background.
New project transforms are documented in [RECEIVED-POLITICS.md](RECEIVED-POLITICS.md).
Pack 1.4.4 publishes clip-selection and headline rules derived from each
program's published Shorts (health, parenting, heukbaek, jeongjwippul, panilgi).
Use Shortform Clips 0.6.2 for background-region placement and horizontal logo offsets. Typography corrections from customer requirements and supplied
Premiere projects are recorded in [PREMIERE.md](PREMIERE.md).
Remaining legacy series typography is recorded explicitly; the old per-line colored
stroke uses CSS `currentColor`. Stroke width is fixed from the declared title
size; unlike the old renderer it does not shrink when a long title is fitted.

Heukbaek enables AI framing by default: wide shots group all participants into
three columns, existing four-way shots retain their order and boundaries, and
single shots stay single. Its allowlist contains only `columns-3` and `grid-4`;
frequent split permits these scene-based instructions without requiring sustained
back-and-forth dialogue. Group counts are computed automatically.
All other portrait templates now enable AI framing with the Speaker focus preset: follow the speaker, with split and wide shots disabled. Heukbaek also prioritizes the speaker while retaining its explicit grouping rules. The 16:9 source-video template preserves the original framing and does not run portrait reframing.
Heukbaek requires the split-layout support in Shortform Clips 0.5.0 or later.
The manifest migrates saved `chosun-clips` template IDs through the shared
pack installer; it never modifies the old app's files.

Install this folder through Shortform Clips → Templates → Add templates after
publishing. Pack 1.4.1 requires Shortform Clips 0.6.0 or later (template API 6). No separate customer app is needed.

The shared validator and the Chosun migration regression test cover this pack.
The migration test checks original image hashes and legacy design settings with
an explicit, field-by-field list of Premiere corrections.

## Customer requirement coverage

The supplied team requirements identify nine programs. This migration includes
the five legacy designs, health, parenting and Jeongjwippul, plus a generic
16:9 politics source-video layout:

| Program | Pack ID | Status |
| --- | --- | --- |
| Black & White Yeouido | `heukbaek` | Legacy design included; supplied Premiere project available for comparison |
| Panilgi | `panilgi` | Legacy design included; supplied Premiere project available for comparison |
| History War | `history` | Legacy design included; supplied Premiere project available for comparison |
| Villain Story | `villain` | Legacy design included; supplied Premiere project available for comparison |
| Money Watch | `money` | Legacy design included; no matching Premiere project in the supplied folder |
| This Makes You Better | `health` | Supplied frame, Premiere typography/transforms; actual Premiere PNG and same-text official Short compared locally |
| Smart Parenting | `parenting` | Supplied frame and Premiere title values; two official Shorts compared locally. Dialogue captions calibrated to the official flu Short, retaining the requested Allimjang R face; title checked against native Premiere render. |
| Jeongjwippul | `jeongjwippul` | Premiere typography, positions and outline included; requested fonts must be installed, original bumper/logo absent. See [details](JEONGJWIPPUL.md). |
| Politics source video · 16:9 | `politics-landscape` | Editable landscape frame, captions and mapped nameplates; measured geometry, gradient and Pretendard substitutes pending original project/assets. See [details](POLITICS-LANDSCAPE.md). |
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
