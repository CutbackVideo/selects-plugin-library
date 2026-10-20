# Chosun Ilbo template pack

Six built-in designs migrated from `plugins/chosun-clips` on branch
`chosun-ilbo`, commit `2938989c4f647fdb2d0fef685a91f39174cb39ac`.

Templates: heukbaek, kimkwangil, panilgi, history, villain, money.
The twelve background/logo WebP files are decoded byte-for-byte from the old
embedded data URLs. Window/crop positions, images, colors, caption settings,
editing settings and editorial prompts retain their original values.
Legacy series typography is recorded explicitly; the old per-line colored
stroke uses CSS `currentColor`. Stroke width is fixed from the declared title
size; unlike the old renderer it does not shrink when a long title is fitted.

AI framing stays **off** by default, matching the old fixed-crop app.
This pack uses the existing template API and does not require new split layouts.
The manifest migrates saved `chosun-clips` template IDs through the shared
pack installer; it never modifies the old app's files.

Install this folder through Shortform Clips → Templates → Add templates after
publishing. Requires template API 2. No separate customer app is needed.

The shared validator and the Chosun migration regression test cover this pack.
The migration test checks original image hashes and legacy design settings.
