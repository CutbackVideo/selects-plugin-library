# Install Quote Lockup Reel

Experimental. Place the files as in the library's
[installation layout](../../PUBLISHING.md#installation-layout): `panel.tsx` in `quote-lockup-reel` beneath
`SELECTS_USER_PANELS_ROOT`, everything else in `quote-lockup-reel` beneath `SELECTS_USER_SKILLS_ROOT`.
Then open a Draft and choose **Quote Lockup Reel** from the Plugin list.

No other setup is needed:

- **FFmpeg** comes with Selects.
- **Arial** (Bold Italic and Regular) is read from the system fonts that ship with macOS and Windows.
- **Face detector.** On first use the panel downloads three files into
  `.selects/plugin-data/quote-lockup-reel/models/yunet` and checks their SHA-256 before using them:

  | File | Source | SHA-256 |
  |---|---|---|
  | `face_detection_yunet_2023mar.onnx` | `https://github.com/opencv/opencv_zoo/raw/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx` | `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4` |
  | `ort.wasm.bundle.min.mjs` | `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.wasm.bundle.min.mjs` | `11e64bd8ffe11bd1a2a2f0d6275fdfbbba7262f0b76b99b53d228a8a22ef3d90` |
  | `ort-wasm-simd-threaded.wasm` | `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort-wasm-simd-threaded.wasm` | `3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2` |

  Without them (offline, or a failed check) the reel is still made, with centred framing and default caption
  positions.

## Updating

Replace the package files and `panel.tsx`. The plugin-data folder is kept, and existing reels keep their music,
masks and B-roll from it.
