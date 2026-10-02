# Install notes

Runs on macOS (tested on macOS 26, Apple silicon) and Windows x64. The two use different engines
for **Analyze photos**; **Make video** is the same on both.

## Windows

Nothing to install. The panel checks and frames the photos itself, and the stickers and scene
clips are written by the ffmpeg bundled with Selects.

- People are cut out by **Selects generation**, so analysis needs Selects 2.0.512 or later and an
  account that can use generation. It **uses Selects credits**: after the free photo check the
  panel says how many photos would be sent (as one short clip, about a third of a second per
  photo) and sends nothing until you press **Send ... and use credits**.
- The approved reference set (see SKILL.md) is rebuilt on macOS only.

## macOS

Analysis runs on this computer with the macOS engine; no photo leaves the computer.

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

## Both

Runs are written to `~/.selects/plugin-data/cutout-beat-gallery/runs/<run>/` (on Windows
`%USERPROFILE%\.selects\plugin-data\cutout-beat-gallery\runs\<run>\`). The Draft refers to those
files, so keep a run folder while a Draft uses it.

On macOS, analysis of 32 photos takes about two minutes; making the Draft about one minute.
