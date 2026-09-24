# Install Place Count

Read [README.md](README.md) before setup. This is an experimental Panel plugin with no Skill.

## Requirements

A compatible Selects development build must provide:

- Panel scripting, generated-media authoring, and `canAuthorGeneratedMedia`.
- `getProjectDraftScaffold` and project-scoped native Draft operations.
- Host `FileSystem`, `CutbackMediaPicker`, and `ProjectFileTree.listEnrichedFileTree` adapters.
- Browser media decoding and Web Crypto for contact-image caching.

The runtime needs no separately installed Python, Pillow, FFmpeg, model, or provider key. React, Remotion, and the editing engine are supplied by Selects. Node.js is needed only for the included development tests.

## Setup

1. Download the manifest and every listed file from the same Git commit. Place the package in `place-count` beneath `SELECTS_USER_SKILLS_ROOT`, keeping relative paths, and `panel.tsx` in `place-count` beneath `SELECTS_USER_PANELS_ROOT`, as in the library's [installation layout](../../PUBLISHING.md#installation-layout). Copy `panel.tsx` with a file command; do not read, retype, or reformat it. The package has no `SKILL.md`, so it is not listed as a Skill; the panel loads its templates and theme music (`motion.tsx`, `assemble-base.js`, `apply-design.js`, `finish-draft.js`, `place-count-theme.m4a`) from that folder.
2. Before updating an installation, finish active panel operations. Project workspaces and runtime data are kept outside both install folders, so replacing the package does not affect them. Versions before 0.1.0-alpha.6 copied the templates to `templates/place-count` in the user's `.selects` folder; the panel no longer reads that copy.
3. Open **Place Count** in a project. Confirm that the interface is English and no missing-assets or host-adapter warning appears. Choose a small location folder, preview its clips, and check the title and description fields.
4. With approval for a test edit, choose **Create draft**. Verify the saved Draft's independent source clips, editable text layers, and optional audio. Confirm that **Make another version** and recovery preserve existing Drafts. Report source download, installation, and Draft-use verification separately.

If an adapter or codec is unavailable, stop and explain that requirement. Do not install a replacement runtime globally, copy another developer's private paths, or claim successful installation based only on downloaded files.

## Runtime storage

The plugin creates its own project-scoped data under `.selects/plugin-data/place-count` beneath the user's home. It does not require a pre-created source-media folder. Keep recovery data local and out of public source control.

For built-in application integration, inject equivalent stable host adapters and install the four companion assets through the application package. Publishing this folder to the Plugin Library does not register it as a default built-in plugin.
