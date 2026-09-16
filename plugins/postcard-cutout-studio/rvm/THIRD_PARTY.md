# Third-party components

No third-party binary, model or installed environment is included in this folder.
Installation obtains these components separately and records pinned versions.

- RVM MobileNetV3 FP32 ONNX, official release v1.0.0:
  https://github.com/PeterL1n/RobustVideoMatting
  The official repository uses GPL-3.0. Review applicable model and integration
  terms before product publication; separate download is not a license exemption.
  Model SHA-256: `88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828`.
- uv 0.8.22: https://github.com/astral-sh/uv (MIT / Apache-2.0).
- Python 3.11.13 from uv-managed Python standalone distributions:
  https://github.com/astral-sh/python-build-standalone .
- ONNX Runtime 1.19.2: https://github.com/microsoft/onnxruntime (MIT).
- NumPy 1.26.4: https://numpy.org/ (BSD-3-Clause).
- Pillow 11.3.0: https://python-pillow.org/ (HPND).
- Additional transitive Python dependencies are pinned and hash-locked in
  `requirements-hashed.txt`; their own upstream licenses apply.
- FFmpeg/FFprobe: https://ffmpeg.org/legal.html . Reused from the local Selects
  installation or an explicitly configured local installation. No binaries
  are redistributed here; applicable terms depend on that build.
