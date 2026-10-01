# Install Selfie Aesthetic Edit

## With the Selects agent

Ask the Selects agent to install the Selfie Aesthetic Edit plugin from this repository.
It places the files below for you. You need nothing else.

## Manual copy

The panel file goes in the Panels folder, and every other file goes in the plugin's own
folder in the Skills folder, keeping the relative paths. The Panels folder holds nothing
but `selfie-aesthetic/panel.tsx`. Create the folders if they do not exist. There is no
separate registration step, and the package has no `SKILL.md`, so it is not listed as a Skill.

**macOS** (`~` is your home folder):

- `~/.selects/panels/selfie-aesthetic/panel.tsx`
- everything else in `~/.selects/skills/selfie-aesthetic/`

**Windows** (`%USERPROFILE%` is your home folder):

- `%USERPROFILE%\.selects\panels\selfie-aesthetic\panel.tsx`
- everything else in `%USERPROFILE%\.selects\skills\selfie-aesthetic\`

Copy `panel.tsx` unchanged. The Skills folder then contains:

```
selfie-aesthetic/
  README.md  INSTALL.md  THIRD_PARTY.md
  planner.js  beat-detect.cjs
  scripts/    assemble.js  decorate.js  ensure-audio.js  inventory.js  search.js
  assets/     selfie-whip-look.tsx  selfie-whip-transition.tsx
  assets/cues/  make-funk.mp3  day-trips.mp3  sensual-melancholia.mp3  pantheon.mp3  manifest.json
```

Then open **Selfie Aesthetic Edit** in the Plugin list with a Project open.

## Dependencies

None to install. Music previews and your own music use the ffmpeg bundled with Selects,
and beat detection runs inside the panel. If your version of Selects is too old for them,
the panel says "This needs a newer version of Selects" for those two features; the bundled
tracks and the Draft build still work.

## Files the plugin writes

The plugin changes your Projects only by creating a new Draft in the open Project and
importing the chosen music into it. Temporary audio files go in
`.selects/plugin-data/selfie-aesthetic` in your home folder, never in either install folder:

- `own-music.f32`: your own music decoded for beat detection (up to about 32 MB). It is
  deleted when detection finishes.
- `preview-*.mp3`: the section preview, replaced by the next preview.

## Verify

1. `panel.tsx` is in the Panels folder under `selfie-aesthetic`, and the Skills folder
   `selfie-aesthetic` contains `planner.js`, `scripts/assemble.js` and
   `assets/cues/manifest.json`.
2. Open a Project with analysed video clips and open the panel. The top line reads
   "Ready: N clips ..." and the Music list shows the four bundled tracks. If the files
   cannot be found, the panel says it could not find its files and asks you to reinstall.
3. Press **Build**. A new Draft opens at 1080x1920 with the clips, whips and the music.

## Uninstall

Delete the `selfie-aesthetic` folder from the Panels folder and from the Skills folder. To also
remove temporary files, delete `.selects/plugin-data/selfie-aesthetic` in your home folder.
Drafts and imported music already in your Projects are not affected.
