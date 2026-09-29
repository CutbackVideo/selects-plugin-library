# Mini Vlog

Mini Vlog turns the analysed footage and the photos in the open Project into a
16:9 mini vlog: a quick montage cut on the beat of the music, with one small
title lockup over the whole video. The result is a **new, editable Draft**.
The plugin never renders a file and never changes an existing Draft or any
source file.

## What it makes

- A **1920x1080 (16:9)** canvas. Tall clips and photos get a centre crop.
- **Hard cuts on the beat.** With **Pace** Quick (the default) every shot is
  one beat long, about half a second; with Relaxed every shot is two beats.
  Quick uses two beats above 150 BPM, and Relaxed uses one beat below 86 BPM,
  so shots stay between 0.40 and 1.40 s; the panel says so next to Pace when
  this happens. A cut that has no drum or bass hit within a frame of its beat
  moves onto a clearly strong hit within a tenth of a beat (at most 70 ms);
  every other cut stays on the grid.
- **Everyday shots.** The shots cycle through drink, street, food, park,
  book, transit, flowers and cafe moments, alternating close and wide. Each
  role also accepts its neighbours (a cafe shot for a drink, a train for a
  street, flowers for a park), then any other analysed moment.
- **Photos** fill about a third of the shots (see [Photos](#photos)).
- **One title lockup** centred over the whole video, from the first frame to
  the last, with no animation (see [Title](#title)).
- A subtle **Soft look** on every clip and photo (strength 0.35): a slight
  lift in the shadows, a little less contrast and a touch of warm pink in
  the highlights only, so dark shots stay dark. The title is not affected.
- The clips' own sound plays quietly under the music by default (**Clip
  sound**: Ambient, see [Advanced](#advanced)).
- No transitions and no end card. The picture stops on the last beat, and
  the music ends there with a short 0.12 s fade.

The video lasts (shots x beats per shot) beats and is always whole groups of
four shots. **Length** Short, Standard (the default) or Long asks for 12, 24
or 36 shots. With Weekend Indie Pop (112 BPM) and Pace Quick that is about
6.4, 12.9 and 19.3 seconds; Relaxed doubles it.

## Default path

1. Open a Project whose video clips are analysed (or that has photos), then
   open **Mini Vlog** from the Plugin list. The readiness line shows how many
   analysed clips and photos were found and the approximate length, for
   example "Ready: 6 clips · 12 photos · about 13 s". It refreshes while clips
   are still being analysed.
2. Check the **Title**. The **Mini vlog** preset is selected, with "mini" as
   the big word and "vlog" as the small word. The preview shows the lockup in
   its own fonts.
3. Press **Build** ("Creates a new 16:9 Draft").

The build needs at least **4 shots from 2 different clips or photos**; each
photo counts as one shot. With only one clip or photo, Build is disabled and
the panel says "Add at least 2 clips or photos"; when the footage fits fewer
than 4 shots it says "Your footage fits fewer than 4 shots". The panel does
not start analysis on its own, so analyse your clips first.

Progress is shown as "Step n/5 · label · P%" over five steps: Choosing
shots, Preparing music, Creating Draft, Adding title and look, and Opening
Draft. The Draft is named "Mini Vlog <preset> <date>". When the build
finishes, the new Draft opens and a link to it is shown. **Create another
version** makes another Draft with a different shot choice.

The build keeps the settings it started with. If you switch to another
Project while it runs, it stops without writing anything more.

## Music

Choose a **Track**. The list shows the reference tracks first, then the
alternatives:

| Track | Tempo | Group |
| --- | --- | --- |
| Weekend Indie Pop (default) | 112 BPM | Reference |
| Golden Hour Disco | 104 BPM | Reference |
| Sunny Soul Strut | 99 BPM | Alternatives |
| Easy Sunday Lo-fi | 88 BPM | Alternatives |
| Your own music | detected | |
| No music | fixed timing | |

The reference tracks suit the style best; the alternatives are slower.

**Beat and bar.** On Weekend Indie Pop and Golden Hour Disco the beat is
reliable but the start of each bar is not: their first beat of a bar is
barely stronger than the others (1.20 and 1.25 times, where 1.5 is needed).
With these two tracks the cuts land on the beat, but the video may start
and end mid-bar. Sunny Soul Strut and Easy Sunday Lo-fi have clear bars, so
their videos start on the first beat of a bar and last whole bars.

The waveform below the track shows a box as long as the video. Drag the box
(or press on the waveform) to choose where in the track the video starts;
the box snaps to groups of four beats, so the cuts stay on the beat. It
starts on the most energetic section that fits. **Preview this section**
plays the whole section; press it again to stop. Selects starts the music on
a video frame, which can move it by up to half a frame; the cuts move with
it.

**When the track is too short.** Each bundled track is 40 seconds long.
When the chosen length does not fit between the start of the track and its
end, the video uses the largest group of four shots that fits, and the panel
says so before you build, for example "Long: 32 of 36 shots fit this track
(34.3 s)". The box can only move to starts where that length fits. Every
bundled track fits Long with Pace Quick. With Relaxed, Weekend Indie Pop,
Golden Hour Disco and Sunny Soul Strut fit at most 32 shots, and Easy Sunday
Lo-fi at most 24. The picture never outruns the music, and the music is never
cut mid-shot.

**Your own music**: drop an audio file. The plugin listens for the beat and
uses it when the tempo is between 70 and 160 BPM and the detected beat grid is
reliable. When the detected beats land halfway between the kicks and snare
hits, it moves the grid half a beat onto them. Bars are not detected, so the
cuts follow the beat only. Other songs use fixed shot lengths (0.55 s for
Quick, 1.10 s for Relaxed), and the panel says "approximate timing"; those
cuts still move onto a clearly strong bass hit nearby (within 120 ms). Your
own music and the previews need ffmpeg; your own music also needs Node.js 18
or later (see [INSTALL.md](INSTALL.md)). The bundled tracks work without them.

**No music** uses the same fixed shot lengths and has no length limit.

## Photos

Photos (Image resources) in the Project are used as shots. They need no
analysis and are never scene-searched.

- Each photo fills at most one shot.
- About a third of the shots are photos when there are enough of them. They
  are spread evenly over the video, from a different starting point for each
  version.
- For the other shots the plugin prefers, in order: a video moment that
  matches the shot's role, then a neighbouring role, then any other analysed
  video moment, then a photo, and only then an evenly spaced filler moment
  from a video.
- Two shots in a row never come from the same clip or photo, and never more
  than two photos play in a row. When the footage cannot fill the chosen
  length under these rules, the plugin first tries again with the photos
  placed first, then uses the next shorter length (four shots fewer) and
  says so.
- A Project with only photos still builds; then the photos follow each
  other.
- Photos are centre-cropped to fill 16:9, like tall clips. They have no
  sound, so Clip sound skips them.
- **Photo motion.** Each photo gets one mild, eased move across its shot:
  push in, pull out, drift left, right, up or down, a small tilt, or push and
  drift. The move never repeats twice in a row, drifts follow the photo's
  shape (up or down for tall photos, sideways for wide ones), and the move
  never shows the photo's edges. In the Draft, each move's **Motion** and **Motion strength** (0 to 2)
  can be changed.
- Photos also get the Soft look. Exports show the motion, the look and the
  crop. Frame previews made with Selects' frame capture tool can fail or show
  bars on photos with effects; the exported video is correct.

Selects reports no frame size for some photos. The size of such a photo is
read once, by placing it on an unsaved scratch Draft; nothing is saved.

## Title

Three lockup presets, chosen in the panel with a live preview:

| Preset | Text fields (initial text) | Look |
| --- | --- | --- |
| **Mini vlog** (default) | Big word "mini", Small word "vlog" | Big italic serif word in pale pink with small sparkles in place of the dots of its i and j, and a small upright serif word in white |
| **A day in my life** | Year (the most recent recording year), Big words "mini vlog", Tag line "a day in my life" | A star and the year before a pink rounded bold "mini", "vlog" below, and a small white two-line tag with a star |
| **A small glimpse** | Top line "a small", Big word "glimpse", Bottom line "of today" | A small monospaced top and bottom line around a pink rounded bold word, split in two lines at the middle with a hyphen and a star before the second line |

- Each preset keeps its own text, so switching presets does not overwrite
  another preset's edits. An empty big word disables Build; an empty small
  field is left out.
- The lockup shrinks to fit 60 % of the video's width.
- The sparkles and stars are drawn as shapes, not typed characters. The
  sparkles sit over every i and j of the big word (at most three); a word
  without them gets one sparkle at its top right.
- The fonts are Instrument Serif Italic, DM Serif Display, Quicksand Bold and
  DM Mono, renamed with an "MV" prefix (Quicksand as "MV Rounded Bold"). They
  are bundled and embedded in the title, so the Draft renders the same on any
  machine with Selects, and the panel preview uses the same fonts and layout.

## Advanced

- **Clip sound**: how much of the clips' own sound plays. **Off** mutes it,
  **Ambient** (the default) keeps it about 18 dB under the music, and
  **Full** keeps it at its original level. The music stays at its full level
  in every mode. Photos have no sound. In the Draft, a clip's level can be
  changed in the Inspector.
- **Soft look**: on by default.
- **Use photos**: on by default. Off builds from the analysed video only.
- **Choose clips**: a checklist of the analysed clips and the photos. All are
  used by default. The readiness line shows how many clips and photos are
  selected.

**Length** and **Pace** sit next to the readiness line, which shows how many
shots and seconds are requested and how many fit the footage and the music.

## The Draft and editing it

The Draft contains:

- one video clip or photo per shot, cut on the beat and centre-cropped to
  16:9;
- one title Motion Graphic ("Mini vlog title") over the whole video;
- a "Soft look" Video Effect on each clip and photo (when Soft look is on),
  and a "Photo motion" Video Effect on each photo;
- the music clip, trimmed to the video (when music is chosen).

Edit it in the Inspector's **Adjust** tab:

- **Title**: the big, small and tag text, the pink and the secondary colour,
  the shadow (0 to 1), the size (%), and the horizontal and vertical position
  (%); the sparkles can be turned off. Clearing the small or tag text hides
  it.
- **Clips and photos**: **Softness** (0 to 1) of the Soft look, and for
  photos the **Motion** and **Motion strength**. A clip's crop and sound level
  are changed in the Inspector as usual.
- **Music**: select the music clip to change its volume.

Finished videos are exported from the Draft with **Handoff → Export**.

## Limitations

- Only 16:9 (1920x1080) videos. There is no vertical option.
- The fonts cover Latin text only. Other scripts, such as Korean or Japanese,
  are shown in a system font instead.
- The title preset cannot be switched in Adjust. To change it, pick another
  preset in the panel and build again. Rebuilding creates a new Draft and does
  not keep Adjust edits.
- On Weekend Indie Pop, Golden Hour Disco and your own music the cuts follow
  the beat, but bar starts are best effort (see [Music](#music)).
- The Draft is built in two commits: first the clips, their crop, their
  Ambient sound level and the music; then the title, the Soft look, the photo
  motion and, with Clip sound Off, the clips' muted sound (Selects can change
  a clip's audio tracks only once the Draft is saved). If the second commit
  fails, the Draft is kept and the panel says that the title, look and clip
  sound are not applied yet; **Finish title and look** finishes that Draft
  with the settings it was built with, even if they have been changed in the
  panel since.
- Moving cuts does not move the title, which always spans the whole video as
  built. Moving the music clip's start does not move the cuts either.
