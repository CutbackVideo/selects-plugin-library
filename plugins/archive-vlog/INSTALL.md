# Install Archive Vlog

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/archive-vlog/panel.tsx` (on Windows,
   `%SELECTS_USER_PANELS_ROOT%\archive-vlog\panel.tsx`), using the
   environment-provided panels root. Create that directory if needed. That
   folder holds nothing else, and there is no separate registration step.
2. Place every other listed file in `archive-vlog` beneath
   `SELECTS_USER_SKILLS_ROOT` (on Windows, `%SELECTS_USER_SKILLS_ROOT%\archive-vlog`),
   keeping relative paths (`planner.js`, `beat-detect.cjs`, `scripts/`,
   `assets/cues/`, `assets/fonts/`, and the rest). The panel reads its
   scripts, music, fonts and beat detector from that folder. The package has
   no `SKILL.md`, so it is not listed as a Skill.
3. Open **Archive Vlog** in the Plugin list with a Project open.

## Dependencies

None: no extra tools to install, on macOS or Windows. Everything runs inside
Selects:

- the Draft build, the title, the effects and the bundled music;
- **Your own music**: decoded by the ffmpeg that ships with Selects (or by the
  panel itself on a Selects build without it) and analysed by the bundled
  `beat-detect.cjs` in a background worker inside the panel;
- **Preview this section**: plays the track's own file in the panel.
- the quick check of clips without Selects' analysis: a small grey preview
  decoded by the same bundled ffmpeg, read back in the panel.

The panel finds its folder through Selects' file service (the default skills
folder, `.selects/skills/archive-vlog` in your home folder); only when the
files are elsewhere does it ask the Selects shell for `SELECTS_USER_SKILLS_ROOT`
(`echo` on either system). If the Selects build is too old for the panel, it
says "Archive Vlog needs a newer version of Selects." and changes nothing.

## Files the plugin writes

The panel writes to your Projects only by creating a new Draft in the open
Project and importing the chosen music into that Project. Its only other file
is temporary: when you drop your own music, the decoded audio (up to about
21 MB) goes in `.selects/plugin-data/archive-vlog` in your home folder
(on Windows, `%USERPROFILE%\.selects\plugin-data\archive-vlog`) and is deleted
as soon as it has been read. The detected beat is kept only while the panel
is open.

## Verify

1. `panel.tsx` is at `SELECTS_USER_PANELS_ROOT/archive-vlog/panel.tsx`, and
   `SELECTS_USER_SKILLS_ROOT/archive-vlog/` contains `planner.js`,
   `beat-detect.cjs`, `scripts/assemble.js`, `assets/cues/manifest.json` and
   `assets/fonts/presets.json`.
2. Open a Project with video clips (analysed or not) and open the panel. The Style
   tiles show Cinematic, A Day Out and Golden Hour, the title preview shows
   the finished lockup in its own typefaces, the Track list shows the four
   bundled tracks (Peaceful Drift first), and the readiness line at the bottom
   of the Length section reads, for example, "Ready: 6 clips · 12 photos". In
   a Project whose clips were never analysed it reads the same, with a note
   that analysed clips give better picks; Build then checks those clips
   itself ("Checking clips 3/6"). The panel does not start analysis.
3. With at least 2 video clips (photos are optional), press
   **Build**. A new 16:9 Draft opens at 1920x1080 with the letterbox opening
   and title (over a soft dark Backdrop, set in the title's Adjust tab), the
   credit, the montage, the fade to black and the music. Every shot carries
   the Cinematic look: deeper shadows with the black point kept, softened
   near-white highlights, restrained greens and cyans, very saturated sunsets
   capped, and warm amber highlights.
4. **Your own music**: drop an audio file. Under it the panel says what it
   found ("Beat found: ... bpm"), and **Preview this section** plays the
   chosen section.

## Uninstall

Delete the `archive-vlog` folder from the panels root and from the skills
root. To also remove the plugin's data folder, delete
`.selects/plugin-data/archive-vlog` in your home folder. Drafts and imported
music already in your Projects are not affected.
