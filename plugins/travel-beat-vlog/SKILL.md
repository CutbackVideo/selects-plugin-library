---
name: travel-beat-vlog
description: Build the fast "travel beat vlog" short cut to the user's own song - two quick montages on the song's drum hits, a hero photo with a big title behind the people, two 2x2 grids, per-slot reference colour, a fade to near-black - from 26 of the user's videos, one photo and one song. No music is bundled.
---

# Travel Beat Vlog

Use this plugin when the user asks for this travel vlog format. The format is fixed; the videos, the photo and the song are the user's. A song is required.

**Format (measured from the reference at 30 fps; 9:16, 1080x1920, 15.6 s = 468 frames).** This is the reference layout. With the user's song the same sections are stretched or shrunk to the song's tempo, so the Draft is usually 12-19 s long and the frames differ (see "Song" below). The plugin converts every time to the new Draft's frame rate.

- Black, frames 0-12.
- Montage 1, frames 12-55: videos 1-11, cutting at 12, 16, 19, 22, 25, 28, 32, 35, 38, 42 and 48.
- Hero, frames 55-102: the hero photo. From frame 62 a large condensed title (default "TRAVEL", #F4C711) sits behind the people: an Apple Vision cutout of the people is placed on top of the title (macOS; on Windows the title sits over the hero photo, with nobody in front).
- Video 12, frames 102-182, with grid 1 building over it: videos 13-16 in the top-left, top-right, bottom-left and bottom-right quarters from frames 149, 153, 158 and 163.
- Video 17, frames 182-263, with grid 2: videos 18-21 from frames 229, 233, 237 and 242.
- Video 22, frames 263-343. Video 23, frames 343-364.
- Montage 2, frames 364-424: videos 1-5, 8 and 9 again from the same in-point, videos 6 and 7 continuing after their montage-1 part, then videos 24 and 25.
- Video 26, frames 424-465, fading linearly from frame 449.45 to 463.7 to a near-black that holds to the end.
- Every video clip is muted. The user's song plays across the whole Draft.

**Song.** The panel reads the song locally with the FFmpeg inside Selects (no upload) and fits the format to it:

- It finds the tempo, the beat grid, the drum hits and any drum roll (5 or more hits 0.085-0.145 s apart).
- It picks the stretch of the song that fits the format best: a roll at the start of montage 1 (as in the reference) first, then the most hits under the cuts, then a downbeat start, then the closest sound to the reference.
- With **Cuts: Follow the song's hits** (default), montage and grid cuts sit on the song's own hits; montage 1 follows the roll from its first hit. Where the song has no hit, a cut goes on a 16th-note grid. When the hits cannot fill montage 1 (fewer than 6, or starting too late for 11 cuts), the build keeps the reference's cut pattern on the beat and opens on the first hit only if it comes before the second cut. The hero and section cuts go on the half-beat grid, moved onto a hit within an eighth of a beat. **Keep the original rhythm** keeps the reference's cut pattern, scaled to the song's beat.
- Fast songs (over about 112 BPM) count 1.5 song beats per reference beat, so the cuts stay about as fast as the reference.
- Shot lengths are kept to at most 3.6 s for the long shots and 2.0 s for the other clips; montages are spaced evenly if a slow song would need longer. A song too slow for that is refused with "This song is too slow for the format; pick a song with a faster beat." A song shorter than about 17 s is refused.
- The Draft's music is that stretch of the song: 0.4 s of silence, the song from the vlog's opening (the first montage hit, or the beat's first cut when montage 1 keeps the reference pattern), and the reference's fade at the end. It is written once as a WAV under `~/.selects/plugin-data/travel-beat-vlog/songs/` and imported into the Project.

**Colour.** Each slot is matched to the reference's colour for that slot: per-channel gain and offset that move the clip's RGB mean and spread towards the reference's (`color-targets.json`). The panel's "Match colour to the reference" slider sets the strength (0 = the clip's own colour, 1 = full match; default 0.7).

**Inputs:** one Project photo with clearly visible people for the hero, 3 long shots of at least 3.6 s (videos 12, 17 and 22), 23 clips of at least 2.0 s (videos 1-11, 13-16, 18-21 and 23-26, in that order), and one Project song with a clear beat. Vision finds people down to about a fifth of the photo's height; tiny distant figures may not be found. Do not reorder, duplicate or drop inputs on your own.

From the Clip highlights page, pick the hero photo, the long shots, the clips and the song for the template. In the installed **Travel Beat Vlog** panel the same groups are listed: load the Project media, check the hero photo, long shots 1-3, clips 1-23 and the song, choose what goes in front of the title and how to cut, optionally edit the title text and colour, and create the Draft. The plugin analyses the song, cuts out the people locally, imports the cutout and the song section once, measures each video's colour, creates a new 1080x1920 Draft, places the hero photo and the cutout through the editor's existing Image placement path, overlays the 35 video clips, and adds the crop/colour/fade effects, the title graphic, the ending graphic and the song.

After creation, read back 35 muted video clips at the planned frames, the hero and cutout Image clips, the title graphic over the hero, the ending graphic and one audio clip (the song section) from frame 0 to the end. The panel's plan gives the frames for this song. If the user asks for the video, export it, wait for completion, and check the MP4 through its final frame. If the panel reports a partial Draft or unknown save, inspect that Draft before retrying; never create duplicate Drafts blindly.

Title text, colour and font are editable later in the title graphic. Each video's visible area can be moved with the Horizontal/Vertical focus of its clip effect. If Vision finds no person, choose "Main subject" under "In front of the title"; if it finds no subject either, the plugin stops before creating a Draft, so use a photo with a clear subject.
