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

This development package computes full SHA-256 using existing `files.stat` and `files.readRange` for every selected
video original and music file. A missing, changed or unconfirmed source stops
Build and saved-workflow continuation. A complete byte identity is mandatory;
file size, modification time and analysis status do not replace it. Released
Selects compatibility is not yet verified.

When native decoding or Worker analysis fails normally, a confirmed source can
use fixed timing if its real duration is known. Unconfirmed process exit,
workspace cleanup, source identity or Project source links stop the operation.
No fallback bypasses those checks. Video analysis is optional: analysed clips use
scene search; unanalysed clips use the bounded local check.

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

- Owned `sbs-*.f32` / `sbs-*.mp3` staging: own-music PCM (first four minutes,
  up to about 21 MB) and section previews. Files are removed after their native
  producer settles and the bounded output is read. Unknown producer exit retains
  its workspace for inspection.
- `own-music/index` and `own-music/objects`: verified JSON beat results, keyed by
  complete source contents, Worker code and analysis policy. Cache hits verify
  both the published JSON and the current original. Private `.source-*` and
  `.output-*` staging is removed after analysis. A transient analysis failure is
  not cached. Selection never imports music or saves a Project.
- `assets/<sha256>.mp3`: verified bundled cue Audio kept independently of the
  installation. Own music retains its selected original path. Build binds the
  imported Resource's actual Project path to the planned contents and sufficient
  Audio duration; assembly and later Finish title/look recheck those contents
  and links. Restoring the original can resume the same saved workflow.
- `quick-score-v3/index` and `quick-score-v3/objects`: source-bound local video
  scores, keyed by complete file contents and evaluation policy. Cache hits
  recheck the original and cached output. Legacy `quick-score` files are retained
  but not reused. Private source copies and gray/output files are removed after
  processing settles; published cache objects stay available for reuse.

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
