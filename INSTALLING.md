# Installing

1. Resolve the requested branch or tag to a full Git commit once. Use that commit for every file.
2. Read `plugins/<id>/plugin.json` and download only its listed files plus the manifest. Keep relative paths and use a fresh folder.
3. Place the files as described in [Installation layout](PUBLISHING.md#installation-layout): `panel.tsx` in `SELECTS_USER_PANELS_ROOT/<id>/`, everything else in `SELECTS_USER_SKILLS_ROOT/<id>/`.
4. Follow the plugin's setup instructions and verify it in Selects. Preserve an existing installation and its local settings when updating.

The optional Python helper performs the download without GitHub authentication:

```sh
python3 tools/plugin_files.py download portrait-stage --destination ./portrait-stage
```

Use `--ref <commit>` to reproduce a specific revision. The helper downloads source files only; it does not install dependencies or register panels. Its Python requirement is independent of the plugin's runtime.
