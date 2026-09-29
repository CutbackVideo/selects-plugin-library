# THE END Credits

THE END Credits turns the analysed footage and the photos in the open Project
into a 16:9 end-credits roll. **THE END** types in on black, then the credits
scroll up while your clips play, cut on the music. The result is a **new,
editable Draft**. The plugin never renders a file and never changes an
existing Draft or any source file.

## What it makes

Two layouts:

- **Classic window (default).** A black 1920x1080 frame. The title and the
  credits sit in the left column and your clips play in a small window on the
  right (about 43% of the frame width). Each clip is cover-cropped into the
  window, so portrait clips and photos are never letterboxed. The window
  itself never moves.
- **Full frame.** The clips fill the whole frame. A big **THE END** types over
  a first, extra shot, then moves to the right third of the frame where the
  credits roll over a soft dark gradient.

Both layouts share this timeline:

- **Lead-in (5.1 s).** Black (Classic) or the first shot (Full frame), while
  the title types in one letter at a time.
- **Shots.** Hard cuts, one every music phrase (4 beats, about 3.9 s), with no
  transitions. The window reveal, or the credits roll in Full frame, starts on
  a musical downbeat.
- **Ending.** The last shot holds for half a second. The picture and the music
  fade out together, and the credits keep rolling as they go.
- A 1920x1080 Draft. Cuts land on the phrase grid at the Draft's real frame
  rate.

## Default path

1. Open a Project whose video clips are analysed (or that has photos), then
   open **THE END Credits** from the Plugin list. The top line shows how many
   analysed clips and photos were found and the approximate length, for
   example "Ready: 5 clips · 8 photos · about 33 s".
2. Check the **Title** (default "THE END") and the **Credits** list.
3. Press **Build**.

The build needs at least **4 usable clips or photos** (5 in Full frame,
which adds an opening shot). If there are fewer, the panel says how many it
found. It does not start analysis on its own, so analyse your clips first.

Progress is shown as five steps: Choosing shots, Preparing music, Creating
Draft, Adding title and look, and Opening Draft. When the build finishes, the
new Draft opens and a link to it is shown. **Create another version** makes
another Draft with a different shot choice. If the last step fails, the Draft
is kept and **Finish title and look** completes it with the settings it was
built with.

## Credits

The **Credits** section has a preset and an editable list of rows. Each row is
a role and a name.

- **Film crew (default)** is the classic ten-row list (Director,
  Screenwriter, Editor and so on) with `[Name Here]` placeholders.
- **Personal** fills the rows from the Project: place, capture dates, the
  music, the number of clips and photos, and "Edited with Selects". A row
  with no value is dropped.
- **Travel** has Directed by, Starring, Memories, Places, Music by, Special
  Thanks and Created with.

In the panel list you can edit a row in place, add or remove rows, move rows
up or down, and **Reset to preset**. Blank rows are dropped. Text in `[ ]` is
a placeholder: it is allowed in the build, and the panel warns how many rows
still have placeholders.

The roll speed is computed from the number of rows and the length, so the last
row reaches the top band as the video ends. It is clamped to 0.6x to 1.6x the
reference speed. With too many rows the panel names the rows that will not
appear and suggests Long or fewer rows; with few rows it says the credits
finish before the end.

After the build, the credits are also editable in the Draft. Select the
credits Motion Graphic and open **Adjust**: **title**, **title color**,
**credit color**, **speed** (0.5 to 2, a multiplier that ignores the clamp),
**show title**, and one text field per built row (`role1..roleK`,
`name1..nameK`). Adjust edits are what the Draft renders.

## Length

| Length | Shots | About, at 62 BPM |
| --- | --- | --- |
| Short | 5 | 25 s |
| Standard (default) | 7 | 33 s |
| Long | 10 | 44 s |

The exact length depends on the music's tempo. If the music section is too
short for the length, the panel offers the longest length that fits; if even
Short does not fit, Build is disabled and the panel says how long the track
must be.

If your footage cannot fill every shot, the build uses fewer, down to four,
and says so: "Your footage fits N shots". A resource is never used in two
shots in a row.

## Music

Choose a **Track**. All five are slow instrumentals, and the default reveals
the window on the swell of the track.

| Track | Felt tempo |
| --- | --- |
| Open Road Swell (default) | 66 BPM |
| Last Light Ballad | 62 BPM |
| Late Night Rhodes | 64 BPM |
| Final Scene | 60 BPM |
| Golden Hour Synth | 65 BPM |
| Your own music | detected |
| No music | fixed 3.9 s shots |

The waveform shows a box as long as the video. Drag it (or press on the
waveform) to choose where the video starts in the track. The box snaps to
positions where a phrase downbeat lands exactly on the reveal. It starts on
the swell. **Preview this section** plays the whole section; press it again
(or Esc) to stop. The music fades out over the last 1.5 s.

**Your own music**: drop an audio file. The plugin listens for the beat and
picks a phrase of 4 beats of 3.4 to 4.4 s. When no steady beat is found, the
panel says "No steady beat found: shots are 3.9 s" and uses fixed 3.9 s
shots; the box then moves in 0.1 s steps. The reveal goes to the loudest part
of your track. Your own music and the previews need ffmpeg; your own music
also needs Node.js 18 or later (see [INSTALL.md](INSTALL.md)). The bundled
tracks work without them.

**No music** builds with fixed 3.9 s shots. With Clip sound also **Off**, the
panel warns "Silent video".

## Clip sound

Under **Advanced**, **Clip sound** sets how much of each clip's own sound
plays:

- **Ambient** (default) keeps it about 18 dB under the music.
- **Full** keeps it at its original level.
- **Off** mutes it.

The last shot's sound fades out with the music. Photos have no sound. In the
Draft, a clip's level can be changed in the Inspector.

## The look

A subtle **Cinematic look** (teal shadows, warm highlights and a small drop in
saturation) is applied to every clip and photo. It is on by default at
strength 0.3; the strength is set per clip in the Inspector, and the switch is
in **Advanced**. The look and the window are separate effects, so the look
never tints the black surround.

## Photos

Photos (Image resources) in the Project are used as shots. They need no
analysis.

- About a third of the shots are photos when there are enough of them, and at
  most two photos play in a row while anything else fits. The first and last
  shots prefer video.
- Each photo gets one subtle, eased move inside its frame (push in, pull out,
  drift, a small tilt), always within the window and never showing the photo's
  edges. Its **Motion** and **Motion strength** can be changed in the
  Inspector.
- **Create another version** picks other photos.

## Advanced

- **Clip sound**: Ambient, Full or Off (see above).
- **Cinematic look**: on by default.
- **Use photos**: on by default. Off builds from the analysed video only.
- **Choose clips**: a checklist of the analysed clips, then the photos. All
  clips are used by default; **All** and **None** select or clear the list.

If the scene search fails for some clips, the build goes on without them and
says "Could not check N clips; they were skipped. Build again to retry them."

## The Draft and editing it

The Draft contains one clip or photo per shot, cut on the phrase grid; the
opening (a black clip in Classic); the title and credits as one Motion
Graphic over the whole video; a look effect and a window effect on each shot;
and the music clip, trimmed to the video. Edit it in the Inspector:

- **Credits and title**: select the Motion Graphic and use **Adjust** (see
  [Credits](#credits)).
- **Window**: each shot's window effect has X, Y and Size (%), the fade-in
  and fade-out lengths, and the motion.
- **Clips**: crop, sound level and look strength.
- **Music**: select the music clip to change its volume.

Finished videos are exported from the Draft with **Handoff -> Export**.

## Limits

- Layout, length, title, credits preset and music section are chosen in the
  panel. Rebuilding creates a new Draft and does not keep Inspector edits.
- The fonts are Latin subsets. Characters outside them use a system serif or
  sans-serif font, and the panel says "Some characters use a system font".
- Long titles are fitted to the column once; each role and name is fitted to
  its width down to 70% of its size, then wraps to two lines.
- The Draft is built in two commits (clips and music, then the title, the
  effects and muted sound). A retry only commits what changed and never
  overwrites your Adjust edits.
- Moving cuts in the Draft does not move the credits or the music.
- macOS arm64 only, on a development build of Selects.
