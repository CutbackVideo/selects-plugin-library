# Installation

## Requirements

- A compatible Selects development build on macOS.
- Panel support and generated-media authoring enabled.
- Host `FileSystem`, `SequenceRepository`, and `SequenceEdit` adapters available.

Worker and OffscreenCanvas support are optional. Released-version and Windows/Linux compatibility are unverified.

## Install or update

Ask your Selects agent to install or update **Timeline Shorts Builder** from its Plugin Library folder link. The installer downloads only the files listed in `plugin.json` and copies `panel.tsx` to the panel directory.

After installation:

1. Open a Selects project containing at least one editable Draft.
2. Open **Timeline Shorts Builder** from the Plugin list.
3. Select a source Draft and run thumbnail preparation.
4. After preparation succeeds, choose the split and create the editable output Draft.

No external model, package manager, provider key, or manual runtime installation is required.
