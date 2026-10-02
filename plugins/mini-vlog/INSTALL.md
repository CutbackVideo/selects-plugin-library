# Install Mini Vlog

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/mini-vlog/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. That
   folder holds nothing else, and there is no separate registration step.
2. Place every other listed file in `mini-vlog` beneath
   `SELECTS_USER_SKILLS_ROOT`, keeping relative paths (`planner.js`,
   `beat-detect.cjs`, `scripts/`, `assets/cues/`, `assets/fonts/`, and the
   rest). The panel reads its scripts, music cues and fonts from
   `SELECTS_USER_SKILLS_ROOT/mini-vlog/`. The package has no
   `SKILL.md`, so it is not listed as a Skill.
3. Open **Mini Vlog** in the Plugin list with a Project open.

## Dependencies

Nothing to install, on macOS or Windows. Everything runs on what Selects
brings: the bundled music, the title, the Soft look and the Draft build, and
also the music previews, your own music (beat detection runs inside the panel)
and the quick check of clips without analysis, which use the ffmpeg built into
Selects through the host. No package manager, Node.js or shell commands are needed.

If this Selects lacks one of the host functions the panel uses, the panel
says so ("This Selects build needs an updated … adapter.", or for music
"Previewing music and using your own track need a newer Selects.") and
everything else keeps working: without the music functions **Your own music**
is hidden, and clips without analysis get evenly spaced moments.

## Windows

Mini Vlog runs on Windows x64 as well as macOS (`compatibility.platforms`).
It reaches files and ffmpeg only through the host: the ffmpeg built into
Selects with an argument list (never a shell, so paths with spaces or Korean
names need no quoting), and the host's file functions with paths joined by the
host. The plugin and data folders are found through the host too (the home
folder's `.selects`), and every temporary file has an ASCII name. Korean
titles use Malgun Gothic or Batang on Windows. A Windows pass on a real
machine is still to be done.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music into that Project. Its temporary audio
files go in `.selects/plugin-data/mini-vlog` in your home folder,
never in either install folder:

- `pcm-<time>-<n>.f32`: your own music decoded for beat detection (the first
  4 minutes, up to about 21 MB). It is deleted as soon as it is read back; the
  detected beat is kept only while the panel is open.
- `preview-<n>-<time>.mp3`: the section preview, deleted as soon as it is read
  back.
- `quick-score/<clip>.json`: the quick check of a clip without analysis (a few
  KB each), reused while the file is unchanged. The decoded preview
  (`quick-score/<clip>-<n>.gray`, under 1 MB) is deleted as soon as it is read.

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/mini-vlog/panel.tsx`,
   and `SELECTS_USER_SKILLS_ROOT/mini-vlog/` contains `planner.js`,
   `scripts/assemble.js`, `assets/cues/manifest.json` and
   `assets/fonts/presets.json`.
2. Open a Project with video clips (analysed or not) and open the panel. The
   readiness line at the bottom of the Length section reads, for example,
   "Ready: 6 clips · 12 photos · about 13 s", the Track
   list shows the four bundled tracks (two reference tracks, then two
   alternatives), and the Title preview renders in its own typefaces. In a
   Project whose clips were never analysed it is ready too, with " · N clips
   not analysed; analysed clips give better picks" at the end; the panel never
   starts analysis itself, and Build shows "Checking clips N/M" first.
3. With at least 4 usable shots from 2 different clips or photos, press
   **Build**. A new 16:9 Draft opens at 1920x1080 with the title, the clips
   and the music.
4. **Your own music** appears in the Track list and **Preview this section**
   plays the chosen section (both use the ffmpeg built into Selects).

## Uninstall

Delete the `mini-vlog` folder from the panels root and from the
skills root. To also remove the plugin's temporary files, delete
`.selects/plugin-data/mini-vlog` in your home folder. Drafts and
imported music already in your Projects are not affected.
