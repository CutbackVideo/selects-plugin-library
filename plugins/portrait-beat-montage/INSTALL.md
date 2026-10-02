# Install Portrait Beat Montage

Experimental: macOS arm64 (tested with Selects Staging on Apple silicon) and Windows x64.

- **macOS** renders with `pipeline.py` and RVM person mattes on this Mac's CPU (one-time setup, below).
- **Windows** renders inside the panel with nothing to install: the host's bundled ffmpeg, and person
  mattes from Selects generation (video background removal). That needs Selects 2.0.512 or later and
  uses generation credits: before anything is sent, the panel says how much video goes out (about 9 s
  for 15 new shot windows) and waits for **Use credits and continue**. Shot windows rendered before are
  reused and are never sent again. A Clip highlights run on Windows builds only when every window is
  cached; otherwise it asks you to open the panel and press **Create new draft** to confirm.

## Requirements

- Nothing to install for video: the pipeline and the RVM runner use the `ffmpeg` and `ffprobe`
  bundled with the Selects app the panel runs in (`Selects.app/Contents/Resources/app.asar.unpacked/dist/bin`).
  Run by hand, `pipeline.py` looks for them in the Selects apps in `/Applications`, then on `PATH`.
- The RVM runtime for person mattes (one-time setup, below).

## One-time RVM setup (macOS)

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
- On Windows a few minutes in the panel (the matte request, then about 6 seconds of transitions per shot window); keep the panel open, or press Cancel.
- Roughly 300 MB of run data per montage under `~/.selects/plugin-data/portrait-beat-montage/`.
  Delete a run folder only when no Draft uses its clips.

See [THIRD_PARTY.md](THIRD_PARTY.md) and [rvm/THIRD_PARTY.md](rvm/THIRD_PARTY.md).
