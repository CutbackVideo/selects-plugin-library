# Install Place Count

Read [README.md](README.md) before setup. This is a panel-only experimental plugin; do not register it as a Skill.

## Requirements

A compatible Selects development build must provide:

- Panel scripting, generated-media authoring, and `canAuthorGeneratedMedia`.
- `getProjectDraftScaffold` and project-scoped native Draft operations.
- Host `FileSystem`, `CutbackMediaPicker`, and `ProjectFileTree.listEnrichedFileTree` adapters.
- Browser media decoding and Web Crypto for contact-image caching.

The runtime needs no separately installed Python, Pillow, FFmpeg, model, or provider key. React, Remotion, and the editing engine are supplied by Selects. Node.js is needed only for the included development tests.

## Setup

1. Download the manifest and every listed file from the same Git commit. Keep their relative paths in a persistent package folder.
2. Before updating an installation, finish active panel operations. Preserve the existing panel, modified assets, project-scoped workspaces, and runtime data; do not replace or remove them without a backup.
3. Resolve the current user's home directory through the host FileSystem service or the operating system. Create `.selects/templates/place-count` beneath that home directory. Copy these files there from the downloaded package:

   - `motion.tsx`
   - `assemble-base.js`
   - `apply-design.js`
   - `finish-draft.js`
   - `place-count-theme.m4a` (default music; without it Drafts are built with no music)

   Preserve existing customized files before replacement. The panel loads these exact names; keeping the source folder alone is not sufficient. Do not copy test fixtures, models, or runtime data into the asset directory.

4. Copy `panel.tsx` unchanged to `SELECTS_USER_PANELS_ROOT/place-count/panel.tsx` with a file command; do not read, retype, or reformat it. Selects lists the Panel from that folder and compiles it when opened; nothing registers it. Preserve an existing panel before replacing it. If an older local prototype is also installed, leave it intact unless the user asks to retire it.
5. Open **Place Count** in a project. Confirm that the interface is English and no missing-assets or host-adapter warning appears. Choose a small location folder, preview its clips, and check the title and description fields.
6. With approval for a test edit, choose **Create draft**. Verify the saved Draft's independent source clips, editable text layers, and optional audio. Confirm that **New story** and recovery preserve existing Drafts. Report source download, installation, and Draft-use verification separately.

If an adapter or codec is unavailable, stop and explain that requirement. Do not install a replacement runtime globally, copy another developer's private paths, or claim successful installation based only on downloaded files.

## Runtime storage

The plugin creates its own project-scoped data under `.selects/plugin-data/place-count` beneath the user's home. It does not require a pre-created source-media folder. Keep recovery and history data local and out of public source control.

For built-in application integration, inject equivalent stable host adapters and install the four companion assets through the application package. Publishing this folder to the Plugin Library does not register it as a default built-in plugin.
