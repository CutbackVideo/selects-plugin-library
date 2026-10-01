---
name: six-clip-velocity
description: Build the "velocity" short-form format - six videos with an opening shot under word-by-word subtitles, then a seven-shot block of speed ramps with vertical blur cuts, a white flash, the block again and a fade to black - as editable retimed video clips with bundled music.
---

# Six Clip Velocity

Use this plugin when the user asks for this velocity edit format. The format is fixed; the six videos and the subtitle words are the user's.

**Format (measured from the reference at 30 fps; 3:4, 1080x1440, 23.3 s, 699 frames).** Frame numbers below are at 30 fps. New Drafts use the Project's frame rate (for example 23.976), and the plugin converts every time to that rate.

- Opening, frames 0-175: video 1 at normal speed. Subtitles over it: four words fade in one by one at frames 2, 16, 26 and 36 while the line slowly grows, a small second line at 73, both fade out at 85-94; then a two-word phrase at 97 and 131 that fades out at 140-144.
- Frames 175-206: video 2 as a speed ramp.
- Block, frames 206-411: seven shots from videos 3, 4, 2, 5, 6, 6 and 4, one every two beats (about 0.976 s, ~123 BPM). Each shot is a velocity ramp: fast at both cuts and slow in the middle (speeds 4, 2.5, 1.2, 0.5, 1, 1.8, 4 across the shot). Every cut is a vertical motion blur over the five frames around it.
- Frame 411: a white flash that dips dark (frames 408-418), into video 1 as a ramp (411-440).
- Frames 440-645: the same seven-shot block again, replaying exactly the same footage.
- Frames 645-699: the last shot keeps playing at normal speed while it fades to black (35% at 645, fully black from 672 to the end).
- Music: a bundled original instrumental laid under the whole Draft, with a beat on every cut.

**Inputs:** exactly six registered Project Video resources, in order 1-6. Each needs enough footage: about 7.9 s for video 1, 3.9 s for video 2, 2.0 s for video 3, 5.6 s for video 4, 2.1 s for video 5 and 4.4 s for video 6 (the panel shows the exact need and refuses shorter videos). Each fills the 3:4 frame, cover-cropped around an editable focus. Optional: the subtitle words (4 words, 1 word, 2 words). Do not duplicate or drop videos on your own, and do not render the edit into one file.

Open the installed **Six Clip Velocity** panel in the user's Project, load the Project videos, check videos 1-6 and the subtitle words, and create the Draft. The panel imports the bundled music once, creates a new 1080x1440 Draft, places 114 independent video clips (each a constant-speed piece of a ramp) through the editor's existing clip placement path, retimes and trims each one, adds a crop and blur effect to each clip, adds the subtitle, flash and fade motion graphics and lays the music. No client code is changed.

After creation, read back 114 video clips covering frames 0-699 without gaps, 114 clip effects, the subtitle graphic over the opening, the flash graphic around frame 411, the fade graphic from frame 645 to the end and one music clip from frame 0. If the user asks for the video, export it, wait for completion, and check the MP4 through its final frame. A saved Draft alone is not export verification. If the panel reports a partial Draft or unknown save, inspect that Draft before retrying; never create duplicate Drafts blindly.

After creation, the subtitle words (Line 1 words 1-4, Line 2, Phrase 2 words 1-2) and the Font are editable fields of the subtitle graphic, and each video's visible area can be moved with the Horizontal/Vertical focus of its clip effects. To use different videos, create a revised Draft: the pieces are cut from each video's own length and size.

Speed ramps are approximated with constant-speed pieces, so speed changes in steps rather than a smooth curve. Overlay video clips play without their own audio; only the music is heard.
