# Install notes

Nothing needs to be installed by hand, on macOS or Windows.

- The panel cuts its portrait intermediates with the `ffmpeg` that ships with Selects (with
  `libx264`), called through the app's own ffmpeg service. No Python, shell tools or separate
  `ffmpeg` install are used.
- The soundtrack is bundled with the plugin in `assets/`.

No models, credentials or internet connection are needed. Intermediates are written under
`~/.selects/plugin-data/gongju-gallery/` (`%USERPROFILE%\.selects\plugin-data\gongju-gallery\` on
Windows) and are never placed in the install folders.
