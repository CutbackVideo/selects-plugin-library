# Install notes

macOS only (tested on macOS 26, Apple silicon).

- `python3` with Pillow (`python3 -m pip install --user Pillow`).
- `ffmpeg` with `libx264` and `prores_ks` (`brew install ffmpeg`).
- `swiftc` from the Xcode Command Line Tools (`xcode-select --install`). On first analysis the
  panel compiles `foreground-mask.swift` (macOS Vision person segmentation) once into
  `~/.selects/plugin-data/cutout-beat-gallery/bin/`.

Check:

```sh
python3 -c "import PIL; print(PIL.__version__)"
ffmpeg -hide_banner -encoders | grep prores_ks
swiftc --version
```

Runs are written to `~/.selects/plugin-data/cutout-beat-gallery/runs/<run>/`. The Draft refers
to those files, so keep a run folder while a Draft uses it.

Analysis of 32 photos takes about two minutes; making the Draft about one minute.
