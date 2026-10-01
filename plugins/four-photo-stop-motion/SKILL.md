---
name: four-photo-stop-motion
description: Build the beat-synced "stop motion" photo format - four photos cycle with a blurred intro, a black pause, one photo per beat with a blur hit, and a dark fade - as editable original Image clips with bundled music.
---

# Four Photo Stop Motion

Use this plugin when the user asks for this stop-motion photo format. The format is fixed; the four photos are the user's.

**Format (measured from the reference at 30 fps; 3:4, 1080x1440, 11.57 s).** Frame numbers below are at 30 fps. New Drafts use the app's default frame rate (for example 23.976), and the plugin converts every time to that rate.

- Intro, frames 0-48: two fast rounds of A, B, C, D (hold 5, 7, 5, 7, 4, 8, 4, 8 frames), each with a light blur.
- Black, frames 48-80.
- Beats, frames 80-325: one photo per beat (every 18-19 frames, about 0.631 s or 95 BPM) in the order A, B, C, D, repeating 13 times. The first three frames of each beat are heavily blurred and shake up and down; the photo then holds sharp. There are no transitions.
- Outro, frames 325-347: a dark grey radial gradient fades to black.
- Music: a bundled original instrumental laid under the whole Draft. The black pause sits on the track's break.

**Inputs:** exactly four registered Project Image resources (JPG/PNG/HEIC) in order A-D. Each fills the 3:4 frame, cover-cropped around an editable focus. Do not duplicate or drop photos on your own. Do not convert photos to video.

Open the installed **Four Photo Stop Motion** panel in the user's Project, load the Project photos, check A-D, optionally adjust framing, and create the Draft. The panel imports the bundled music once, creates a new 1080x1440 Draft, places 21 independent Image clips through the editor's existing Image placement path (the public SDK's `overlayResource` rejects Images; no client code is changed), adds a crop and blur effect to each clip, adds the outro motion graphic and lays the music.

After creation, read back 21 Image clips at the frames above, 21 clip effects, the outro graphic from frame 325 and one music clip from frame 0. If the user asks for the video, export it, wait for completion, and check the MP4 through its final frame. A saved Draft alone is not export verification. If the panel reports a partial Draft or unknown save, inspect that Draft before retrying; never create duplicate Drafts blindly.

Each photo's visible area can be moved later with the Horizontal/Vertical focus of its clip effects. To use a different photo, keep the other choices and create a revised Draft: the crop is computed from the original photo's size.
