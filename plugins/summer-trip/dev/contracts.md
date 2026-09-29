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
  beats: { bpm, delta, snaps },       // the script recomputes frames with the planner's F() at the real fps (planner code inlined);
                                      // with music, delta is recomputed at the real fps as sectionStart − round(sectionStart·fps)/fps
                                      // (beats.delta is used only when music is null)
  schedule: /* stSchedule output */,
  picks: {
    main: [{ rid, kind: 'video' | 'photo', startSeconds, role, duration? }], // opener, place, montage…, ending×3 — same order as
                                      // mainBeats (count = mainBeats.length − 1); optional duration (s) slides a window back to keep a 0.15 s tail
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
  sfx: null | { shutter: [rid…] /* 1–4 takes, cycled */, shutterSeconds: number | number[] /* file length(s); required for
    shutters, per take when an array */, whoosh: rid, whooshSeconds: number /* file length */ }
}
```
Returns:
```js
{
  sequenceId, fps,
  frames,        // stFrameSchedule output at the real fps (+ fps, delta)
  placed:     [{ index, clipId, rid, kind, role, a, b, sourceStart }],             // Main clips, index = mainBeats slot
  gridPlaced: [{ quad, clipId, rid, kind, a, b, sourceStart, scale, position: { x, y } }],
  sizes: { [rid]: { width, height } | null },   // cfg.sizes + sizes measured on the scratch Draft
  music: null | {
    dry: { clipId, a, b, sourceStart /* s0 */, sourceStartFrom: 'clip' | 'overlay' | 'snapped' },
    wet: null | { clipId, a, b, sourceStart },
    crossfadeFrames: null | X, endFadeSeconds, muffle: 'on' | 'off' | 'skipped' // skipped = wet placement failed → full-length dry
  },
  ambientClips,  // Main videos lowered to ambientDb
  gridSoundApplied: { mode, clips /* panels set to −60 dB here */, deferred /* true for 'routing' (done in decorate) */ },
  sfxPlaced: [{ key: 'shutter1'…'shutter4' | 'whooshDrop' | 'whooshEnding', clipId, rid, a, b }],
  notes: [string]
}
```
Music spans (spec §15.6): with `wetResourceId`, dry over [0, Fe + ⌈X/2⌉), wet over [Fe − ⌊X/2⌋, F(end)) with sourceStartSeconds
s0 + (Fe − ⌊X/2⌋)/fps; dry fade-out = wet fade-in = X/fps; the clip reaching F(end) fades out over F(end) − F(end − 0.5) frames. s0 is
read from the placed row / overlay result when Selects reports it, else the frame-snapped section start. If the wet overlay fails, all
music clips placed in this run are removed and the dry is placed again over [0, F(end)); if that removal fails the script throws before
committing. SFX: shutter i over [gridStateFrames[i], + floor(len·fps)); whooshes over [anchor − floor(len·fps), anchor) for anchors F(8)
and Fe (head trimmed via sourceStartSeconds when that would start before 0).

### decorate.js (idempotent, saved Draft)
```js
{
  sequenceId, fps, frames,            // from assemble's return
  placed, gridPlaced, sizes,          // from assemble's return (clip identity, source starts, frame sizes)
  mute: boolean,                      // clipSound === 'off' → setAudioTracks([]) over Main
  gridSound: 'routing' | 'volume' | 'none',
  title:  { tsx, parameters, editableParameters },   // over [0, frames.titleFrames[1])
  labels: { tsx, parameters, editableParameters },   // over frames.labelsFrames[1] ([12, E))
  look: null | { tsx, strength, leakStrength },      // every Main + grid clip; last montage clip gets leakOutSeconds
  gridPanel: { tsx },                                // on grid clips whose source is not 16:9 (inset mask)
  filmFrame: { tsx, window: { w: 0.87, h: 0.84, radius: 0.02, feather: 0.012 }, leakStrength, timeOrigin: 'clip' | 'source',
               fringe? },            // fringe passed through only when set
  motion: { tsx, strength, options: [{ label, value }], byClipIndex: { [mainIndex]: { motion, direction, axis, cover? } } }, // montage photos only
  endingMotion: { [endingIndex]: { motion, direction, axis } }, // ending photos: done inside the film-frame effect
  photos: [rid]                       // photo resource ids
}
```
Effect labels (idempotency keys): "Summer look", "Grid panel", "Film frame", "Photo motion"; graphics "Summer Trip title",
"Summer Trip labels". Main clip i = the Main row starting at `frames.mainFrames[i]` (else `placed[i].clipId`); grid clips = video rows
with the panel's resource starting at `gridPlaced[].a`. Effect order: montage photos Photo motion → Summer look; ending clips Summer
look → Film frame; grid clips Summer look → Grid panel. `gridSound: 'routing'` calls `setAudioTracks({ target: <panel row>, [] })`;
if the SDK refuses a clip target the panel gets `setClipAudio −60 dB` (note); if the Main routing changed, it throws before committing.

Returns `{ titleAdded, labelsAdded, muted, muteKept, gridSound: { mode, routed, kept, lowered }, effects: { added: { look, gridPanel,
filmFrame, motion }, kept: { … } }, committed, alreadyDone, notes }`.

### ensure-audio.js
`{ projectId, files: [{ key, path }] }` → `{ ids: { [key]: resourceId }, imported: [key], missing: [key] }` (imports only missing
files in one importFiles call; matches Audio resources by path, then by file name).

### inventory.js
`{ projectId, only: null | [rid], known?: { [rid]: size }, measureMs?: 8000, probeMs?: 4000 }` →
`{ resources: [{ rid, name, duration, width, height, recordedAt, capturedAt, month, kind: 'video' }], photos: [{ rid, name, width,
height, recordedAt, capturedAt, month, kind: 'photo' }], months: [12 counts, Jan first — whole Project, ignoring only],
skipped: { unanalysed, missing }, captureDates: { known, probed } }`. Dates without a Resource recording date come from
`selects.media.probe` (recorded → creation → filenameTimestamp → encoded unless encodedBy); month is read from the date text.

### search.js
`{ projectId, rids, queries?: { [role]: text } /* default spec §5 roles */, roles?: [role], pageSize?: 6 /* 1–10 */, parallel?: 4
/* ≤ 4 */, budgetMs?: 22000 }` → `{ candidates: [{ rid, role, t, score }], failed: [rid], stats: { ms, waitedMs, rateLimited, jobs } }`.

## Effect parameters (assets/*.tsx)

- Summer look: `{ strength, leakOutSeconds: 0, leakStrength: 1, clipSeconds, sourceStartSeconds, timeOrigin }`.
- Grid panel: `{ insetPct: { top, right, bottom, left } }` in % of the clip's own box (the quadrant rectangle, clamped 0–100).
- Film frame: `{ canvasInBox: { x, y, w, h } /* % of the clip box */, windowW, windowH, radius, feather, fringe, leakInSeconds,
  pulses: [{ at, dur }], leakStrength, fadeOutFrames, clipSeconds, motion: null | { motion, direction, axis, strength },
  sourceStartSeconds, timeOrigin }`. `canvasInBox` = the canvas rectangle in % of the clip's box, where the box is the source
  conformed to FIT the canvas, scaled by the clip transform's scale about its centre and moved by its position (% of canvas height,
  +y up). `pulses[].at` = pulse CENTRE in clip-local seconds (may be < 0 or > clipSeconds), `dur` = full width (half a beat, from
  leakFrames); a pulse straddling a cut is listed on both clips. `leakInSeconds` = (leakFrames.b − endingFrame)/fps on the first ending
  clip; the last montage clip's look gets `leakOutSeconds` = (endingFrame − leakFrames.a)/fps; `fadeOutFrames` = endFrame −
  fadeStartFrame on the last ending clip.
- Photo motion: as city-weekend-vlog.

## Graphic parameters

- Title: `{ preset, line1, season, wordTimes: [s…], seasonPartTime, seasonFullTime, seasonPartLength, labelsTime, topMain, topItalic,
  creditPrefix, creditName, colors: { line1, season, labels }, sizes, positions, fonts: { [family]: base64 } }` — times in seconds from
  the graphic's start.
- Labels: `{ preset, topMain, topItalic, creditPrefix, creditName, placePrefix, place, placeSeconds, colors, sizes, positions, fonts }`.

## Visible events (verification)

Cuts to check in exports: grid states 8…11.5 (region diff per quadrant), Main cuts from beat 14 on, ending cuts. The Main cut at 9.5
(opener → place) is hidden under the four panels and is NOT a visible event.
