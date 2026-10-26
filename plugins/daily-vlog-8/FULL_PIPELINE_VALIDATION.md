# Reports C-05, C-16, C-37 and C-40: full generation follow-up

A real first source at 30000/1001 fps exposed a remaining template defect after
the SDK adopted it from a new 24000/1001 Draft. The first source range had already
been calculated at the old rate, so the first shot ended one frame past its
transition. The transition lookup returned no clip and generation stopped with
`invalid_clip_target`. This was reproduced through the complete production
DailyTemplateRun; the import, ten video pieces and three graphics had executed,
but no Draft was committed.

The builder now measures the adopted rate after the first insert and, when it
changed, lays the reference again on a fresh uncommitted Draft. Only the correctly
timed attempt receives graphics, transitions, music and the final commit. The
reference timing, source jumps, effects, sounds and design are unchanged.

A separate selection defect unnecessarily reused the Opening when it was also
among nine Clips: a distinct later clip was discarded. Template selection now
removes Opening/duplicate resource IDs before checking the seven-unique-clips
minimum and taking the first eight. The designed seven-clip Opening reprise and
first-eight selection-order contract remain intact.

Verification:

- The strengthened reference regression includes 24000/1001 -> 30000/1001 and
  requires the first boundary exactly, plus only one committed attempt.
- Reference/Windows tests: 18 pass. Selection regressions: 6 pass.
- Full production template runs with seven/eight/nine clips and nine overlapping
  Opening inputs save and export, using original full-length replacement media,
  actual SDK resource matching, all audio/graphics/transitions and commit.
- Each saved output is 614 frames at 30000/1001 fps, 1920x1080. Five clips reject
  before authoring with the existing minimum-input guidance.

The runner mounts the template in a nonvisual hook host; it does not test the
host Auto select buttons or installed gallery. The original report expected nine
Clips to mean ten total shots; the existing manifest instead says the first eight
fill the reference. No design change to that contract was made. Chelsea Market
Pro is not bundled and is absent from the checked font directories, so reference
font appearance remains unresolved. Sound identity/timing and interactive
playback require separate output checks; saving/exporting alone does not close
those quality reports.
