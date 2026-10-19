# Huick Alpha template pack

One reusable Huick Sseol template for Shortform Clips. After this pack is published, paste its GitHub folder link into **Templates >
Template > + Add templates**. The folder link is
`https://github.com/CutbackVideo/selects-plugin-library/tree/main/plugins/shortform-clips/template-packs/huick`. The pack adds its own template and
does not replace the Hankook Ilbo or SBS Radio packs.

## Design

- 1080 x 1920 canvas; black title band at y=0..540, video at y=540..1920.
- Two centered headline lines: white, then fluorescent lime (`#D3FF00`).
- White speech captions on a black box, ending at y=1560.
- Small transparent Huick Sseol wordmark centered near y=1710.
- Context-focused framing keeps explanatory illustrations and objects visible.
  Automatic filler/silence removal is disabled to preserve pronunciation examples.

The source crop defaults to y=0..900 of a 1080-high source to omit the lower
burned-in captions on presenter shots. Review each generated shot: wider framing
may expose those captions again, and the template cannot remove text baked into
the source. Use a clean source when available.

Fonts are requested by family name (`Pretendard`), not
bundled. The host's Korean fallback is used when unavailable; typography is an
approximation of the references. The transparent logo was reconstructed with
image generation from the reference frame at 3 seconds of `8ipK5SUX6I0`, with
the user's approval to use the reference because no original asset was available.
It is not an original brand asset. Its transparent margins are included in the
configured image width. Episode-specific text below the logo is omitted.

## References

Source episode (composition inspected using YouTube storyboards; full video
download returned HTTP 403 during authoring):

- https://www.youtube.com/watch?v=Fq7JJKQgcDs

Shorts used for visual measurements:

- https://www.youtube.com/shorts/WZV794caUho
- https://www.youtube.com/shorts/WxAVZQHCWPo
- https://www.youtube.com/shorts/HfGJoctptEA
- https://www.youtube.com/shorts/dWXQ0xljaAY
- https://www.youtube.com/shorts/8ipK5SUX6I0

Four references emphasize the second title line in lime; one reverses the
colors. This single template defaults to the majority layout. Headline colors
remain editable. No reference footage or episode-specific artwork is bundled.
