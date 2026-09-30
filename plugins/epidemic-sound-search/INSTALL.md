# Install

Copy the files as described in the library's installation layout:

- `panel.tsx` → `SELECTS_USER_PANELS_ROOT/epidemic-sound-search/panel.tsx`
  (Windows: `%SELECTS_USER_PANELS_ROOT%\epidemic-sound-search\panel.tsx`)
- `README.md` and `INSTALL.md` → `SELECTS_USER_SKILLS_ROOT/epidemic-sound-search/`

Nothing is registered or built. Reopen the Plugin list and the panel appears as
**Epidemic Sound search**.

## Requirements

- macOS, or Windows 10 (version 1803 or later) / Windows 11.
- A Selects build whose panels can use `runShell`, `runScript`, `askAI` and
  browser control. Without browser control the panel still searches and
  auditions, but cannot sign in or save.
- Nothing to install:
  - macOS uses `python3` and `curl`, both part of macOS.
  - Windows uses Windows PowerShell 5.1 and `curl.exe`, both part of Windows.
    The panel calls them by their full System32 paths, so they do not need to
    be on `PATH`.
- Your own Epidemic Sound account. No key or token is entered in Selects.

## First run

1. Open the panel, go to **Settings**, and choose a library folder for saved
   audio.
2. Press the sign-in button and sign in on the Epidemic Sound page that opens
   in the Selects browser (password, not a Google passkey), then press
   *I've signed in*.
3. Search in **Browse**, add tracks to the download list, and press **Save all**.

Runtime data (settings, notes, the library index) is written to
`.selects/plugin-data/epidemic-sound-search/` in your home folder; on Windows
it sits beside the folder named by `SELECTS_USER_SKILLS_ROOT`, because the
Windows shell's own HOME is a temporary folder. Updating the plugin does not
touch it.
