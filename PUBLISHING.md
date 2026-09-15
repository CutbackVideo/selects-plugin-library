# Publishing

1. Add source under `plugins/<id>/`. List package files and a new version in `plugin.json`.
2. Include concise English `SKILL.md` and `INSTALL.md`. Keep runtime files, models, credentials, personal paths and test data out of the repository.
3. Run `python3 tools/check_public.py`, `python3 -m unittest discover -s tests`, and `python3 tools/plugin_package.py pack <id>`.
4. Review and commit the source. Push a tag named `<id>/v<version>` at that commit.
5. Create a draft GitHub release for that tag. Upload the generated ZIP and version record from `.dist/`. Publish it after verifying both assets. Mark experimental versions as prereleases.
6. Copy the version record to `catalog/<id>.json` and push. Verify anonymous download with `python3 tools/plugin_package.py download <id> --destination <new-folder>`.

Only designated maintainers publish. Never replace a published version; release a new version for changes. Keep release notes limited to requirements, changes and known limitations.
