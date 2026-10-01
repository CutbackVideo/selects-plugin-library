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
- YuNet face detector (`face_detection_yunet_2023mar.onnx`) from the OpenCV Zoo,
  MIT licence. Downloaded on first use; not shipped in this package.
- ONNX Runtime Web 1.30.0 (`onnxruntime-web`, MIT licence, Microsoft), which runs
  the face detector in the panel. Downloaded on first use from the npm CDN; not
  shipped in this package.
- `src/pipeline/yunetDecode.ts` follows the YuNet post-processing of OpenCV's
  `FaceDetectorYN` (Apache 2.0).
- B-roll clips come from Pexels and Pixabay through Selects' stock search, under
  the Pexels and Pixabay content licences. The panel lists each clip's creator
  with a link.
