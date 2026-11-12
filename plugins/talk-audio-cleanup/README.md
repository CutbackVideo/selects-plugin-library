# Talk Audio Cleanup

Cleans the sound of a talking Draft the way a broadcast editing guide asks for,
and leaves the edit otherwise as it is:

- **Cut clicks and blemishes** out of the pauses, a few frames at a time. The
  pause itself stays.
- **Lower breaths** (a sharp intake, a sigh) with the clip's volume, by 11 dB
  unless you change it.
- **Mute loud sniffs** instead of lowering them.
- **Mute one- and two-frame ticks between words** in place, so the picture is
  not cut there.
- **Fade every cut by one frame**, so a cut does not tick.

It works on a copy of the open Draft. The original Draft is not changed.

## How it works

1. Open a 30 fps Draft whose Main clips come from the talking footage and open
   **Talk Audio Cleanup**.
2. Pick what to clean (each kind has a switch) and press **Find what to
   clean**. It decodes the Main clips' audio with the app's FFmpeg and runs
   `engine/analyze.py` on this computer. Nothing is uploaded and no credits are
   used. The first run sets up the Python it needs (a download of a few
   minutes).
3. The result shows how many places were found, how much shorter the copy will
   be, and a strip of where they are, one colour per kind. Each place is a row
   with its level drawn and the stretch that changes marked. Pick a row to move
   the playhead there and to hear it as it is (**Original**) and as it will be
   (**Cleaned**), or to leave that one place as it is. **Fine-tune** raises how
   sure a cut must be (the less certain cuts become volume changes) and changes
   how far breaths are lowered.
4. **Make a cleaned copy** duplicates the Draft and applies the cuts, volume
   changes and fades to the copy. The list stays, now pointing into the copy,
   so the places can be checked there.

The sounds are found by measuring, not by listening. Play a few before you
export.

## What decides

`engine/analyze.py` measures every 30 fps frame of the audio (level over a
tracked noise floor in two bands with half a second of context, pause
geometry, voicing, band levels, spectral change) and a trained model says for
each frame: keep, cut, mute or lower. Then:

- proposals one or two quiet frames apart are joined;
- a proposal where nothing stands 12 dB over the high-band floor is dropped;
- a cut the model is less than 30% sure of becomes a volume change;
- a breath that is loud and hissy is muted rather than lowered.

`python3 engine/analyze.py --self-check` checks these rules.

## Limitations

- The model is not in this package and is not publicly distributed; see
  [INSTALL.md](INSTALL.md). Without it the Panel says the model is not
  installed.
- macOS only: the analysis is a Python program run through the shell.
- 30 fps Drafts only. Clips at another speed are left out, and so are clips
  that play a Synced Timeline.
- A source moment that appears twice on Main is cleaned only where it appears
  first.
- Trained on one recording setup. On other voices, rooms or microphones it
  will find less and may find the wrong things; check the list.
- Words are never cut on purpose, but the model can be wrong.
- A sound that crosses a cut already in the Draft is left alone, and so is a
  clip whose volume is keyframed.
- A source file without an audio stream is left out.
- It does not remove filler words or shorten pauses.
