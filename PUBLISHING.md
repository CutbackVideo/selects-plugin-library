# Publishing

1. Add or update `plugins/<id>/`. List portable files in `plugin.json`; include concise English usage and setup instructions. Exclude runtimes, models, credentials, personal paths and test data.
2. Run `python3 tools/check_public.py`, `python3 tools/plugin_files.py check`, and `python3 -m unittest discover -s tests`.
3. Submit a pull request and merge after checks pass. Share the plugin's folder link.
4. Verify anonymous download from the merged commit with `python3 tools/plugin_files.py download <id> --ref <commit> --destination <new-folder>`.

Only designated Cutback maintainers publish. Each Git commit preserves a version of the plugin. No separate release or archive is needed.

## Gallery previews

A plugin may include `preview.mp4` (H.264 MP4, at most 8 MiB) and
`poster.webp` (WebP, at most 512 KiB) at its root. Review their visible
content before publishing; file-header checks do not review media content.
Use a compact preview, preserve its aspect ratio, and enable MP4 fast start.

Declare them in `plugin.json` under `preview`, for example:

```json
"preview": {
  "video": "preview.mp4",
  "poster": "poster.webp",
  "width": 540,
  "height": 960
}
```

Paths are relative to the plugin folder at the same Git commit as the manifest.
These are gallery assets, not installation files: keep them out of `files`.
Preview-only changes do not change the plugin runtime version.
