# Publishing

1. Add or update `plugins/<id>/`. List portable files in `plugin.json`; include concise English usage and setup instructions. Exclude runtimes, models, credentials, personal paths and test data.
2. Run `python3 tools/check_public.py`, `python3 tools/plugin_files.py check`, and `python3 -m unittest discover -s tests`.
3. Submit a pull request and merge after checks pass. Share the plugin's folder link.
4. Verify anonymous download from the merged commit with `python3 tools/plugin_files.py download <id> --ref <commit> --destination <new-folder>`.

Only designated Cutback maintainers publish. Each Git commit preserves a version of the plugin. No separate release or archive is needed.

## Localized library metadata

Keep the top-level `name` and `summary` as the original fallback text.
`plugin.json` may also include a `localized` object keyed by app language code:

```json
"localized": {
  "de": {
    "name": "Beispiel",
    "summary": "Ein Beispiel-Plugin."
  }
}
```

`localized` is optional, and each language entry is optional. When supplied,
an entry is an object with string `name` and `summary` fields. An empty
`localized` object is valid. The app selects the entry matching its language;
if that entry is absent, it uses the top-level `name` and `summary`.
No other metadata fields are localized by this contract.

For public plugins, the authoring agent writes translations directly for
`de en es fr it ja ko pt tr zh`. This is authoring guidance: the manifest
validator does not require translations, an English dictionary, or all ten
languages. There is no CI translation pipeline or translation build step.
The separate public-source checker currently rejects literal Korean text;
that existing restriction is not changed by this metadata contract.

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
