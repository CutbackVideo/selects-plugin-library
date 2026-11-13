# Talk Audio Cleanup

Cleans the sound of a talking Draft the way a broadcast editing guide asks for,
and leaves the edit otherwise as it is:

- **Cut spiky sounds** (clicks, mouth noises) out of the pauses, a few frames
  at a time. The pause itself stays.
- **Lower blunt sounds** (a breath, a sigh) with the clip's volume, by 11 dB.
- **Cut a lone opening word** (the Korean opener "ja") when it stands apart
  from the words after it.
- **Fade every cut by one frame**, so a cut does not tick. Where the app can
  place a one-frame audio crossfade that starts at the cut, the fade is that
  transition on the timeline; in an older app it is the next clip's own
  one-frame fade-in.

What counts as a sound to clean is decided by plain rules, and you set their
thresholds. No trained model is involved.

It works on a copy of the open Draft. The original Draft is not changed.

## How it works

1. Open **Talk Audio Cleanup** and choose the source at the top: the timeline
   that is open, or one of the Project's video or audio files. From a Draft it
   makes a cleaned copy; from a source file or a source timeline it makes a
   new, cleaned Draft, since source material cannot be copied.
2. Pick what to clean (each kind has a switch) and press **Find what to
   clean**. It decodes the Main clips' audio with the app's FFmpeg and runs
   `engine/analyze.py` on this computer. Nothing is uploaded and no credits are
   used. The first run sets up the Python it needs (a download of a few
   minutes).
3. The result opens with **What gets cleaned**: five settings, each with its
   name, what it means, and a drawing of a clip in which the sounds it cleans
   light up as you move it. The list of places below
   follows the settings at once. Above the list is a two-row timeline: the
   whole Draft, and the part in view (scroll to move along it, pinch or
   ⌘-scroll to zoom, drag to pull it sideways). Each place is a row with its
   waveform and the stretch that changes marked. Pick a row to hear it as it
   is (**Original**) and as it will be (**Cleaned**), and to show it in the
   timeline. The control on the right of a row changes what is done there:
   cut, lower, mute, or leave as is.
4. **Make a cleaned copy** duplicates the Draft and applies the cuts, volume
   changes and fades to the copy. The list stays, now pointing into the copy,
   so the places can be checked there.

The sounds are found by measuring, not by listening. Play a few before you
export.

## What decides

`engine/analyze.py` measures every 30 fps frame of the audio and reports every
sound that sticks out of a pause: a stretch of frames under -40 dBFS whose
band above 2 kHz peaks 12 dB or more over a tracked noise floor (stretches one
or two quiet frames apart are one sound). The Panel then applies the settings:

| Setting | Default | What it decides |
| --- | --- | --- |
| Sounds away from speech: clean from this loudness | 12 dB | A sound two or more frames from speech on both sides is cleaned when it is at least this far over the floor. |
| Sounds next to speech: clean from this length | 6 frames | A sound right at speech may be the tail of a word, so it is cleaned only from this length. |
| Next to speech but outside a word: clean from this length | 2 frames | When no transcript word covers the sound, a shorter one is cleaned too. Without a transcript this setting does nothing. |
| How far a word reaches past its ends | 0.05 s | This much before and after a word still counts as the word. |
| Where cutting ends and lowering begins | 5.5 dB | How spiky the sound is inside its frame. At or above this it is cut; below, it is lowered. |

The defaults were read off two edited episodes of one show, each checked on
the other: the pauses the rules pick are pauses the editor also touched 82% of
the time, and the rules find about nine in ten of the editor's own sound
clean-ups.

`python3 engine/analyze.py --self-check` checks how sounds are found.

## Limitations

- macOS only: the analysis is a Python program run through the shell.
- The sound is measured in 1/30 s steps. A Draft at another frame rate is
  edited on its own frames, so an edge can land up to half a frame from where
  it was measured; this has been checked in tests, not yet by ear.
- Clips at another speed are left out, and so are clips that play a Synced
  Timeline.
- A source moment that appears twice on Main is cleaned only where it appears
  first.
- The defaults come from one recording setup. On other voices, rooms or
  microphones move the settings and check the list.
- Words are never cut on purpose, but a rule can be wrong: a short word tail
  with no transcript word over it can be taken for a sound.
- It does not mute one-frame ticks inside words: nothing measurable told the
  ones an editor mutes from the ones left alone.
- A sound that crosses a cut already in the Draft is left alone, and so is a
  clip whose volume is keyframed.
- A source file without an audio stream is left out.
- It does not remove filler words or shorten pauses.
