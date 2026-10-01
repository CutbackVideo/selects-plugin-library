---
name: travel-beat-vlog
description: Build the fast "travel beat vlog" short - two quick montages, a hero photo with a big title behind the people, two 2x2 grids, per-slot reference colour, a fade to near-black - from 26 of the user's videos and one photo, with bundled music.
---

# Travel Beat Vlog

Use this plugin when the user asks for this travel vlog format. The format is fixed; the videos and the photo are the user's.

**Format (measured from the reference at 30 fps; 9:16, 1080x1920, 15.6 s = 468 frames).** Frame numbers below are at 30 fps. The plugin converts every time to the new Draft's frame rate.

- Black, frames 0-12.
- Montage 1, frames 12-55: videos 1-11, cutting at 12, 16, 19, 22, 25, 28, 32, 35, 38, 42 and 48.
- Hero, frames 55-102: the hero photo. From frame 62 a large condensed title (default "TRAVEL", #F4C711) sits behind the people: an Apple Vision cutout of the people is placed on top of the title.
- Video 12, frames 102-182, with grid 1 building over it: videos 13-16 in the top-left, top-right, bottom-left and bottom-right quarters from frames 149, 153, 158 and 163.
- Video 17, frames 182-263, with grid 2: videos 18-21 from frames 229, 233, 237 and 242.
- Video 22, frames 263-343. Video 23, frames 343-364.
- Montage 2, frames 364-424: videos 1-5, 8 and 9 again from the same in-point, videos 6 and 7 continuing after their montage-1 part, then videos 24 and 25.
- Video 26, frames 424-465, fading linearly from frame 449.45 to 463.7 to a near-black that holds to the end.
- Every video clip is muted. The bundled music plays across the whole Draft; its beats land on the section cuts at frames 102, 182, 263, 343 and 424.

**Colour.** Each slot is matched to the reference's colour for that slot: per-channel gain and offset that move the clip's RGB mean and spread towards the reference's (`color-targets.json`). The panel's "Match colour to the reference" slider sets the strength (0 = the clip's own colour, 1 = full match; default 0.7).

**Inputs:** 26 registered Project videos (each long enough for its slot; the panel shows the minimum), and one Project photo with clearly visible people for the hero. Vision finds people down to about a fifth of the photo's height; tiny distant figures may not be found. Do not reorder, duplicate or drop inputs on your own.

Open the installed **Travel Beat Vlog** panel in the user's Project, load the Project media, check the order of videos 1-26 and the hero photo, optionally edit the title text and colour, and create the Draft. The panel cuts out the people locally, imports the cutout and the bundled music once, measures each video's colour, creates a new 1080x1920 Draft, places the hero photo and the cutout through the editor's existing Image placement path, overlays the 35 video clips, and adds the crop/colour/fade effects, the title graphic, the ending graphic and the music.

After creation, read back 35 muted video clips at the frames above, the hero and cutout Image clips at 55-102 and 62-102, the title graphic at 62-102, the ending graphic from frame 464 and one music clip from frame 0. If the user asks for the video, export it, wait for completion, and check the MP4 through its final frame. If the panel reports a partial Draft or unknown save, inspect that Draft before retrying; never create duplicate Drafts blindly.

Title text, colour and font are editable later in the title graphic. Each video's visible area can be moved with the Horizontal/Vertical focus of its clip effect. If Vision finds no person, choose "Main subject" under "Subject in front of the title"; if it finds no subject either, the panel stops before creating a Draft, so use a photo with a clear subject.
