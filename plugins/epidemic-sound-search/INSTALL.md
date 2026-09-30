# Install

Copy the files as described in the library's installation layout:

- `panel.tsx` → `SELECTS_USER_PANELS_ROOT/epidemic-sound-search/panel.tsx`
- `README.md` and `INSTALL.md` → `SELECTS_USER_SKILLS_ROOT/epidemic-sound-search/`

Nothing is registered or built. Reopen the Plugin list and the panel appears as
**Epidemic Sound search**.

## Requirements

- macOS.
- A Selects build whose panels can use `runShell`, `runScript`, `askAI` and
  browser control. Without browser control the panel still searches and
  auditions, but cannot sign in or save.
- `python3` and `curl` on `PATH`. Both ship with macOS.
- Your own Epidemic Sound account. No key or token is entered in Selects.

## First run

1. Open the panel, go to **Settings**, and choose a library folder for saved
   audio.
2. Press the sign-in button and sign in on the Epidemic Sound page that opens
   in the Selects browser (password, not a Google passkey), then press
   *I've signed in*.
3. Search in **Browse**, add tracks to the download list, and press **Save all**.

Runtime data (settings, notes, the library index) is written to
`~/.selects/plugin-data/epidemic-sound-search/`. Updating the plugin does not
touch it.
