# Install notes

The panel shells out to `python3` and `ffmpeg` to cut portrait intermediates.

- `python3` 3.9 or newer, on `PATH`.
- `ffmpeg` with `libx264`, on `PATH`. The script also looks in `/opt/homebrew/bin/ffmpeg`
  and `/usr/local/bin/ffmpeg`.

Check both:

```sh
python3 --version
ffmpeg -version
```

On macOS, `brew install ffmpeg` installs a suitable build.

No models, credentials or network access are needed. Intermediates are written under
`~/.selects/plugin-data/gongju-gallery/` and are never placed in the install folders.
