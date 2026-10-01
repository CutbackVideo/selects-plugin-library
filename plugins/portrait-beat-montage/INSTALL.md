# Install Portrait Beat Montage

Experimental: macOS arm64 only, tested with Selects Staging on Apple silicon.

## Requirements

- `ffmpeg` and `ffprobe` on `PATH`, with `libx264`, `libvpx-vp9` and the `minterpolate`
  filter (`brew install ffmpeg` provides all three).
- The RVM runtime for person mattes (one-time setup, below).

## One-time RVM setup

A Clip highlights run sets it up by itself the first time (a few minutes, once). In the panel, press
**Set up RVM**. Either way setup runs in the background and keeps going if the panel closes. Or run:

```sh
cd "$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage/rvm"
sh setup.sh
sh run.sh doctor
```

Setup downloads a pinned private Python 3.11 runtime, hash-locked wheels (numpy, Pillow,
onnxruntime) and the official RVM MobileNetV3 ONNX model into `rvm/.local/`. Nothing is
installed globally. The pipeline itself also runs on that private Python.

## Time and space

- About 2-3 minutes per montage on an Apple silicon CPU (15 shot windows, three at a time); about 30 seconds when the same clips and windows were rendered before (shots are cached).
- Roughly 300 MB of run data per montage under `~/.selects/plugin-data/portrait-beat-montage/`.
  Delete a run folder only when no Draft uses its clips.

See [THIRD_PARTY.md](THIRD_PARTY.md) and [rvm/THIRD_PARTY.md](rvm/THIRD_PARTY.md).
