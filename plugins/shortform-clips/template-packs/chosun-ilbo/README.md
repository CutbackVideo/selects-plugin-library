# Chosun Ilbo template pack

Five requested designs migrated from `plugins/chosun-clips` on branch
`chosun-ilbo`, commit `2938989c4f647fdb2d0fef685a91f39174cb39ac`.

Templates: heukbaek, panilgi, history, villain, money.
The ten background/logo WebP files are decoded byte-for-byte from the old
embedded data URLs. Window/crop positions, images, editing settings and editorial
prompts retain their original values. Typography corrections from customer requirements and supplied
Premiere projects are recorded in [PREMIERE.md](PREMIERE.md).
Remaining legacy series typography is recorded explicitly; the old per-line colored
stroke uses CSS `currentColor`. Stroke width is fixed from the declared title
size; unlike the old renderer it does not shrink when a long title is fitted.

AI framing stays **off** by default, matching the old fixed-crop app.
This pack uses the existing template API and does not require new split layouts.
The manifest migrates saved `chosun-clips` template IDs through the shared
pack installer; it never modifies the old app's files.

Install this folder through Shortform Clips → Templates → Add templates after
publishing. Requires template API 2. No separate customer app is needed.

The shared validator and the Chosun migration regression test cover this pack.
The migration test checks original image hashes and legacy design settings with
an explicit, field-by-field list of Premiere corrections.

## Customer requirement coverage

The supplied team requirements identify nine programs. This migration includes
only the five that also have an existing design in the legacy app:

| Program | Pack ID | Status |
| --- | --- | --- |
| Black & White Yeouido | `heukbaek` | Legacy design included; supplied Premiere project available for comparison |
| Panilgi | `panilgi` | Legacy design included; supplied Premiere project available for comparison |
| History War | `history` | Legacy design included; supplied Premiere project available for comparison |
| Villain Story | `villain` | Legacy design included; supplied Premiere project available for comparison |
| Money Watch | `money` | Legacy design included; no matching Premiere project in the supplied folder |
| This Makes You Better | — | Requested; Premiere project supplied, pack template not yet implemented |
| Smart Parenting | — | Requested; Premiere project supplied, pack template not yet implemented |
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
