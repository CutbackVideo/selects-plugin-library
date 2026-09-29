# Summer Trip — internal contracts

Shared shapes between the planner (`planner.js`), the run_script files (`scripts/*.js`), the graphics/effects (`assets/*.tsx`) and the
panel. `scripts/*.js` own the `__CONFIG__` shapes below; the planner and the panel produce exactly these. All frames are timeline
frames at the Draft's real fps; all "seconds from the section start" values are relative to the music section start (beat 0).

## Beat schedule (planner, pure beats)

`stSchedule({ montageShots: N })` →

```js
{
  mainBeats: [0, 9.5, 14, /* montage cuts */, E, E + 2, E + 4, E + 8], // E = 14 + M, M = 2N + 2
  grid: [{ quad: 'TL', a: 8, b: 10 }, { quad: 'TR', a: 8.5, b: 10.5 }, { quad: 'BR', a: 9, b: 11 }, { quad: 'BL', a: 9.5, b: 11.5 }],
  gridStates: [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5],
  title: [0, 8], labels: [[5, 8], [12, E]], place: [12, 14],
  endingStart: E, end: E + 8, fadeStart: E + 7.5,
  leak: { a: E - 0.25, b: E + 0.25 }, pulses: [E + 2, E + 5.5],
  anchors: [8, 14, E] // the only beats that may snap (own music only)
}
```

## Frame schedule (planner)

`stFrameSchedule({ schedule, bpm, delta, fps, snaps })` → every beat above converted with
`F(b) = b === 0 ? 0 : Math.round((beatSeconds(b) + delta) * fps)` where `beatSeconds(b) = b * 60 / bpm`, except that an anchor beat in
`snaps` (`{ [beat]: seconds }`) uses the snapped seconds for that beat and for every event defined at the same beat. Output mirrors
`stSchedule` with frame numbers (`mainFrames`, `grid[].aFrame/bFrame`, `gridStateFrames`, `titleFrames`, `labelsFrames`,
`placeFrames`, `endingFrame`, `endFrame`, `fadeStartFrame`, `leakFrames`, `pulseFrames`) plus `report: [{ beat, gridSeconds,
plannedSeconds, frame, quantErrorSeconds }]`.

## run_script configs

### assemble.js
```js
{
  projectId, draftName,
  fps: null | number,                 // expected fps; the script rebuilds at the real fps when the first insert changes it
  W: 1920, H: 1080,
  beats: { bpm, delta, snaps },       // the script recomputes frames with the planner's F() at the real fps (planner code inlined)
  schedule: /* stSchedule output */,
  picks: {
    main: [{ rid, kind: 'video' | 'photo', startSeconds, role }], // opener, place, montage…, ending×3 — same order as mainBeats
    grid: [{ rid, kind, startSeconds, quad: 'TL' | 'TR' | 'BR' | 'BL' }] // A–D, same order as schedule.grid
  },
  sizes: { [rid]: { width, height } | null }, // known frame sizes; unknown photos measured on an unsaved scratch Draft
  music: null | {
    resourceId, sectionStart,         // dry cue / own music
    wetResourceId: null | string      // muffled copy; null → single dry overlay to the end (spec §15.6 fallback)
  },
  crossfadeFrames: null,              // null → max(2, round(0.06 * fps))
  clipSound: 'off' | 'ambient' | 'full', ambientDb: -18,
  gridSound: 'routing' | 'volume' | 'none', // chosen after live probe P1; all three branches implemented
  sfx: null | { shutter: [rid, rid, rid, rid], whoosh: rid, whooshSeconds: number }
}
```
Returns `{ sequenceId, fps, frames: /* stFrameSchedule output at the real fps */, placed, gridPlaced, music: { dry: {clipId, a, b,
sourceStart}, wet: null | {clipId, a, b, sourceStart} }, ambientClips, gridSoundApplied, sfxPlaced, notes }`.

### decorate.js (idempotent, saved Draft)
```js
{
  sequenceId, fps, frames,            // from assemble's return
  mute: boolean,                      // clipSound === 'off' → setAudioTracks([]) over Main
  gridSound: 'routing' | 'volume' | 'none',
  title:  { tsx, parameters, editableParameters },   // over [0, frames.titleFrames[1])
  labels: { tsx, parameters, editableParameters },   // over frames.labelsFrames[1] ([12, E))
  look: null | { tsx, strength, leakStrength },      // every Main + grid clip; last montage clip gets leakOutSeconds
  gridPanel: { tsx },                                // on grid clips whose source is not 16:9 (inset mask)
  filmFrame: { tsx, window: { w: 0.87, h: 0.84, radius: 0.02, feather: 0.012 }, leakStrength, timeOrigin: 'clip' | 'source' },
  motion: { tsx, strength, byClipIndex: { [mainIndex]: { motion, direction, axis } } }, // montage photos only
  endingMotion: { [endingIndex]: { motion, direction, axis } }, // ending photos: done inside the film-frame effect
  photos: [rid]                       // photo resource ids
}
```
Effect labels (idempotency keys): "Summer look", "Grid panel", "Film frame", "Photo motion"; graphics "Summer Trip title",
"Summer Trip labels".

### ensure-audio.js
`{ projectId, files: [{ key, path }] }` → `{ ids: { [key]: resourceId }, imported: [key] }` (imports only missing files; matches by
file name).

## Effect parameters (assets/*.tsx)

- Summer look: `{ strength, leakOutSeconds: 0, leakStrength: 1, clipSeconds, sourceStartSeconds, timeOrigin }`.
- Grid panel: `{ insetPct: { top, right, bottom, left } }` in % of the clip's own box.
- Film frame: `{ canvasInBox: { x, y, w, h } /* % of the clip box */, windowW, windowH, radius, feather, fringe, leakInSeconds,
  pulses: [{ at, dur }], leakStrength, fadeOutFrames, clipSeconds, motion: null | { motion, direction, axis, strength },
  sourceStartSeconds, timeOrigin }`.
- Photo motion: as city-weekend-vlog.

## Graphic parameters

Built by `graphics-defs.js` (a plain script like `planner.js`: the panel embeds it verbatim between
`// st-graphics:start` / `// st-graphics:end`, the tests load it in node:vm; it needs a `plugin.json` `files` entry). Parameters
are **flat top-level keys** because the Inspector edits one top-level key per editable definition (so no `colors`/`sizes`/
`positions` objects). Sizes are px of a 1080-high frame, positions % of the frame, times seconds from the graphic's start.

- `stTitleParameters({ presets, presetId, fontsB64, line1, season, wordTimes, seasonPartTime, seasonFullTime, seasonPartLength,
  labelsTime, topMain, topItalic, creditPrefix, creditName })` → Title: `{ preset, line1, season, wordTimes, seasonPartTime,
  seasonFullTime, seasonPartLength, labelsTime, topMain, topItalic, creditPrefix, creditName, creditUppercase (true), line1Color,
  seasonColor, labelColor, shadow, line1Size, seasonSize, labelSize, creditSize, labelTracking, creditTracking (em), line1Y, seasonY, topY (12.6), creditY (89.9),
  marginPct (6), stackGap, faces, fonts }`.
- `stLabelsParameters({ presets, presetId, fontsB64, topMain, topItalic, creditPrefix, creditName, placePrefix, place,
  placeSeconds })` → Labels: `{ preset, topMain, topItalic, creditPrefix, creditName, creditUppercase (false), placePrefix, place,
  placeSeconds, labelColor, placeColor, shadow, labelSize, creditSize, labelTracking, creditTracking, placeSize, topY (8.6), creditY (93.0), placeX (72.5),
  placeY (38.9), prefixScale, prefixDrop, placeCapRatio, marginPct, faces, fonts }`.
- `faces`: `{ [role]: { family, case, tracking, scaleX, fillWidth? } }` (title roles line1/season/label/labelItalic; labels roles
  label/labelItalic/place/placePrefix). `fonts`: `{ [family]: base64 }` — only the chosen preset's families.
- `fontsB64`: `{ [file]: base64 text }` for `stPresetFontFiles(presets, presetId)` (read `assets/fonts/<file>`); a build embeds
  only the chosen preset's fonts.
- Adjust: `stEditable(ST_TITLE_EDITABLE, params)` / `stEditable(ST_LABELS_EDITABLE, params)` (defaultValue = the parameter).
  Cast inlined objects `as any` in the panel (inline JSON literals widen types).
- Label layout differs per graphic, as in the reference: during the title the labels sit at 12.6% / 89.9% with an uppercase credit
  ("BY NAME"); from the place title on at 8.6% / 93.0% with the credit as typed ("By Name"). Default credit prefix: "By".
- Poster: the season word fits `fillWidth` (90%) of the width and line 1 stacks `stackGap` px above its caps (`line1Y` unused).
- Title typing: word i shows from `wordTimes[min(i, len-1)]` (more words than times share the last time); the season shows its
  first `seasonPartLength` letters from `seasonPartTime` (0 or ≥ length → whole word) and all from `seasonFullTime`; labels from
  `labelsTime`. Event frame = `round(seconds · fps)`, so pass times as `frame / fps` from the frame schedule.

## Visible events (verification)

Cuts to check in exports: grid states 8…11.5 (region diff per quadrant), Main cuts from beat 14 on, ending cuts. The Main cut at 9.5
(opener → place) is hidden under the four panels and is NOT a visible event.
