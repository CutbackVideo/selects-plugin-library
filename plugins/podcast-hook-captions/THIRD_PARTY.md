# Third-party material

- `fonts/SixCaps-Regular.woff2.b64` - Six Caps, Copyright 2011 Vernon Adams,
  licensed under the SIL Open Font License 1.1 (`fonts/OFL-SixCaps.txt`). Stored
  as base64 text of the WOFF2 file and embedded into the titles graphic.
- `fonts/RobotoFlex-Caption.woff2.b64` - Roboto Flex, Copyright 2017 The Roboto
  Flex Project Authors, licensed under the SIL Open Font License 1.1
  (`fonts/OFL-RobotoFlex.txt`). A static instance (weight 700, width 60, optical
  size 36) subset to Latin-1 and common punctuation, stored as base64 text of
  the WOFF2 file and embedded into the titles graphic.
- `fonts/RedditSans-Lead.woff2.b64` - Reddit Sans, Copyright 2020-2023 Reddit,
  Inc., licensed under the SIL Open Font License 1.1 (`fonts/OFL-RedditSans.txt`).
  A static instance (weight 840) subset to Latin-1 and common punctuation,
  stored as base64 text of the WOFF2 file and embedded into the titles graphic.
- Face inference is supplied by the separate `selects-ai-runtime` package.
  Its model/native-runtime licenses and hashes are documented there; this
  consumer ships no YuNet model, ONNX runtime, decoder or inference worker.
- Shot/color/framing reducers preserve the source plugin's existing algorithm.
  The source package was copied from committed plugin-library revision
  `9326fad00db19a64b8e80b26b2266c54b9566d49` before this migration.
- B-roll clips come from Pexels and Pixabay through Selects' stock search, under
  the Pexels and Pixabay content licences. The panel lists each clip's creator
  with a link.
