# Publishing

1. Add or update `plugins/<id>/`. List portable files in `plugin.json`; include concise English usage and setup instructions. Exclude runtimes, models, credentials, personal paths and test data.
2. Run `python3 tools/check_public.py`, `python3 tools/plugin_files.py check`, and `python3 -m unittest discover -s tests`.
3. Submit a pull request and merge after checks pass. Share the plugin's folder link.
4. Verify anonymous download from the merged commit with `python3 tools/plugin_files.py download <id> --ref <commit> --destination <new-folder>`.

Only designated Cutback maintainers publish. Each Git commit preserves a version of the plugin. No separate release or archive is needed.
