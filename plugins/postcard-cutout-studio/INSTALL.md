# Install Postcard Cutout Studio

Experimental: macOS arm64, Python 3, FFmpeg/FFprobe on `PATH`, and a Selects build with Panel, generated-media authoring, Draft-authoring, and Export workflow support.

## Setup

1. Place this package in `postcard-cutout-studio` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Create `postcard-cutout-studio` beneath `SELECTS_USER_PANELS_ROOT`. Copy `panel.tsx` and `pipeline.py` there byte for byte. Preserve that panel folder's private `runs/`, `logs/`, state files, and referenced media on updates.
3. Confirm `python3`, `ffmpeg`, and `ffprobe` are available. The Panel uses them for previews, alpha verification, immutable mask extraction, a distinct foreground Resource, and final decode checks.
4. Open **Postcard Cutout Studio** from the Plugin list. Select Project media, the source window, canvas fitting, and title settings. Enable **Generate a new cutout** only when a new generated-media job is intended.
5. Keep generated cutouts, run folders, and imported foreground media while any Draft references them. Export the finished Draft through Selects.

## Optional local RVM

The folded **Local RVM CPU — Experimental** section avoids a paid cloud job but requires an explicit isolated runtime setup:

```sh
cd "$SELECTS_USER_SKILLS_ROOT/postcard-cutout-studio/rvm"
sh setup.sh
sh run.sh doctor
```

Setup downloads a pinned private Python runtime, hash-locked wheels, and the official RVM MobileNetV3 ONNX model into `rvm/.local/`. No runtime or model is shipped in this package.

## Limits

- Cloud generation requires generated-media access and may consume credits.
- The loopback mask service is local to this computer. Open the Panel after a restart before previewing or exporting an existing Draft.
- Native Panel-click E2E, app/OS restart, released Selects versions, and non-arm64 platforms are unverified.
- Cover fitting can crop the subject. Use source ratio or contain for uncropped framing.
- Local RVM is CPU-only, limited to 30-second jobs, and has different matting quality from the cloud route.

See [THIRD_PARTY.md](THIRD_PARTY.md) and [rvm/THIRD_PARTY.md](rvm/THIRD_PARTY.md).
