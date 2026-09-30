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
  so shots stay between 0.40 and 1.40 s; the panel then says so under Pace,
  for example "At 156 bpm Quick uses 2 beats per shot." (The bundled tracks
  are between 88 and 112 BPM, so this only happens with your own music.) A
  cut that has no drum or bass hit within a frame of its beat moves onto a
  clearly strong hit within a tenth of a beat (at most 70 ms); every other
  cut stays on the grid.
- **Pace Groove** varies the rhythm with the music's phrases (four bars
  each): every phrase opens with a two-beat shot, the other shots are one
  beat, and the last beat of every two bars splits into two half-beat shots
  when it carries a drum fill. When the video ends in the second half of a
  phrase, its third bar also opens with a two-beat shot. The fills are found
  in the track's drum hits; when a track shows none, every one of those beats
  splits (the bundled tracks have a short fill at the end of every four
  bars). Half-beat shots are always video, never photos, and their cuts stay
  exactly on the half beat. Below 86 BPM every shot is one beat or less, so
  no shot lasts longer than 1.40 s ("At 80 bpm Groove opens phrases with 1
  beat."), and above 150 BPM Groove uses two beats per shot like Quick ("At
  156 bpm Groove uses 2 beats per shot."). Quick stays the default; Groove
  is an option.
- **Everyday shots.** The shots cycle through drink, street, food, park,
  book, transit, flowers and cafe moments, alternating close and wide. Each
  role also accepts its neighbours (a cafe shot for a drink, a train for a
  street, flowers for a park), then any other analysed moment.
- **Moving moments first** (with Beat punch, on by default). Each clip is also searched
  for "hands moving, pouring, walking or the camera moving". A moment within
  0.75 s of such a hit gets a small tie-break bonus (at most 0.1, scaled from
  the weakest to the strongest such hit of the build), so of two similar
  moments the moving one is taken first. The bonus never outranks a better
  role match, except for the first shot: when a moving moment fits it, the
  video opens on one rather than on a photo or a still moment (among the
  moving moments, the best role match and score wins; the photo share moves
  to the other shots). If opening on it would leave shots unfilled, the plan
  is made without it, so it never shortens the video. With all hits equally strong, or
  none, nothing changes. With Beat punch off the search
  and the shot choice are exactly as without this feature.
- **Variety.** The shots are spread over all the selected clips: a shot takes
  a clip that has not been used yet whenever one fits, and a clip is only
  reused once every clip that fits has been used, the least-used first. The
  same clip or photo never fills two shots in a row.
- **Photos** fill about a third of the shots (see [Photos](#photos)).
- **One title lockup** centred over the whole video, from the first frame to
  the last, with no animation (see [Title](#title)).
- A subtle **Soft look** on every clip and photo (strength 0.35): a slight
  lift in the shadows, a little less contrast and a touch of warm pink in
  the highlights only, so dark shots stay dark. The title is not affected.
- **Beat punch** (Advanced, on by default): a quick zoom on every bar's
  first beat in the video clips (see [Photos](#photos)).
- The music starts at the track's **hook** (Start at the hook, on by
  default for the bundled tracks, see [Music](#music)).
- The clips' own sound plays quietly under the music by default (**Clip
  sound**: Ambient, see [Advanced](#advanced)).
- No transitions and no end card. The picture stops on the last beat, and
  the music ends there with a short 0.12 s fade.

The video lasts (shots x beats per shot) beats and is always whole groups of
four shots. **Length** Short, Standard (the default) or Long asks for 12, 24
or 36 shots. With Bedroom Pop (108 BPM, the default track) and Pace Quick
that is about 6.7, 13.3 and 20.0 seconds, and Relaxed doubles them (13.3,
26.7 and 40.0 s). On the shorter reused tracks Long with Relaxed is capped
by the track (see [Music](#music)). With Groove, a length is a number of
whole bars: 12, 24 or 36 beats, as long as Quick (6.7, 13.3 and 20.0 s on
Bedroom Pop), which holds 12, 25 and 38 shots when every fill beat splits
(the panel reads, for example, "Standard: 25 shots (13.3 s)"); a track that
shows fills on only some of those beats gives a few shots fewer in the same
time.

## Default path

1. Open a Project whose video clips are analysed (or that has photos), then
   open **Mini Vlog** from the Plugin list.
2. Check the **Title**. The **A small glimpse** preset is selected, with "a
   small" above the big word "glimpse" and "of today" below it. The preview
   shows the lockup in its own fonts. **Mini vlog** and **A day in my life**
   are one click away.
3. Check the readiness line at the bottom of the **Length** section. It shows
   how many clips and photos were found and the approximate length, for
   example "Ready: 6 clips · 12 photos · about 13 s". When only some are
   chosen it reads, for example, "3 of 6 clips selected", and while clips are
   still being analysed it ends with " · 2 clips still being analysed".
4. Press **Build**. The line above the buttons reads "Creates a new 16:9
   Draft".

The defaults: Title **A small glimpse**, Pace **Quick** (Groove is an
option), **Beat punch** on, **Start at the hook** on (bundled tracks), **Soft
look** on, **Use photos** on, Clip sound **Ambient**, Length **Standard** and
the Bedroom Pop track.
Each of them can be changed before Build.

**Refreshing.** The panel reads the Project's clips when it opens, when you
come back to it (its tab is shown or the window gets focus) and when you press
**Refresh** next to the readiness line. While clips are still being analysed,
or nothing usable was found yet, it also reads them again every 10 seconds,
so the line updates by itself ("N clips are still being analysed. This
updates automatically when they finish."). It never reads them during a
build. The panel does not start analysis on its own, so analyse your clips
first. If Selects is too busy to answer, the panel tries again after 5 and 15 seconds and then says "Selects is busy and didn't answer in time. Wait a moment and press Refresh. If it keeps happening, restart Selects."

**What blocks Build.** The build needs at least **4 shots from 2 different
clips or photos**; each photo counts as one shot. When it cannot run, Build is
disabled and the panel shows the reason:

- "Add at least 2 clips or photos." when fewer than two clips and photos are
  selected;
- "This track is too short for 4 shots from this section." when the music
  cannot hold even four shots;
- "Your footage fits fewer than 4 shots." when the footage cannot fill four
  shots. This is known only once the clips have been searched: the first
  Build then stops with "Your footage fits fewer than 4 shots. Add more
  varied footage or photos or select more clips.", and Build stays disabled
  afterwards;
- "Type the title's big word to build." when the big word is empty.

Progress is shown as "Step n/5 · label · P%" over five steps: Choosing
shots, Preparing music, Creating Draft, Adding title and look, and Opening
Draft. While the clips are searched the step shows how far it is, for example
"Step 1/5 · Choosing shots (3/9 clips checked) · 13%".

The Draft is named "Mini Vlog <preset> YYYY-MM-DD HH:MM:SS", with the preset's
name and the local date and time the build started, for example "Mini Vlog
Mini vlog 2026-09-30 14:05:09". When the build finishes, the new Draft opens,
the panel says "Draft created. Select the title to edit its words, colors,
size or position, a clip to adjust its crop, softness, motion or sound level,
and the music to change its volume. Rebuilding creates a new Draft and does
not keep Inspector edits.", and shows an **Open the new Draft** link with a
button that copies it.

After a build, **Create another version** makes another new Draft from the
same clips with a different shot choice. The Draft already built is kept.

The build keeps the settings it started with. If you switch to another
Project while it runs, it stops without writing anything more.

## Music

Choose a **Track**. The list shows the reference tracks, then the
alternatives under an "Alternatives" heading, each with its tempo (for example
"112 bpm"), then **Your own music** and **No music**:

| Track | Tempo | Group |
| --- | --- | --- |
| Bedroom Pop (default) | 108 BPM | Reference |
| Acoustic Pop | 104 BPM | Reference |
| Weekend Indie Pop | 112 BPM | Reference |
| Golden Hour Disco | 104 BPM | Reference |
| Sunny Soul Strut | 99 BPM | Alternatives |
| Easy Sunday Lo-fi | 88 BPM | Alternatives |
| Your own music | detected | |
| No music | fixed timing | |

The reference tracks suit the style best; the alternatives are slower. The
bundled tracks are instrumentals at -11 LUFS integrated, about as loud as
short-form reference edits, with a fixed gain and a true-peak limiter at
-1 dBTP (not a dynamic leveller, so the swells keep their shape).

**Beat and bar.** Bedroom Pop, Acoustic Pop, Sunny Soul Strut and Easy
Sunday Lo-fi have clear bars: the first beat of a bar is 1.70, 1.71, 3.09
and 3.14 times as strong as the others, where 1.5 is needed. Their videos
start on the first beat of a bar and last whole bars. On Weekend Indie Pop
and Golden Hour Disco the beat is reliable but the start of each bar is not
(1.35 and 1.16 times): the cuts land on the beat, but the video may start
and end mid-bar, and Groove's phrases and the Beat punch's zooms follow the
beat count from the start of the section rather than the heard bars.

The waveform under "Music section — drag to choose" shows a box as long as
the video. Drag the box (or press on the waveform) to choose where in the
track the video starts; the box snaps to groups of four beats, so the cuts
stay on the beat. The arrow keys move it by four beats (by one second without a beat grid), and Home and End move
it to the first and last start. The line under the waveform reads, for
example, "Starts at 4.3 s".

**Start at the hook** (under the preview button, bundled tracks only, on by
default) starts the box on the track's hook: of the starts where the
video fits, the one whose next four bars have the strongest contrast between
loud and quiet hits and the fullest bass (a drum fill adds a little). For a
Standard video that is 37.8 s into Bedroom Pop, 33.5 s into Acoustic Pop,
4.3 s into Weekend Indie Pop, 14.6 s into Sunny Soul Strut and the start of
Golden Hour Disco and Easy Sunday Lo-fi. While it is on, a new Length or
Pace moves the box to the hook window for that length. With it off (and
for your own music, which has no hook scores) the box starts on the most
energetic section that fits, and a new Length or Pace keeps the start where
it can. Turning it on or off moves the box to that default again; you can
always drag it anywhere.

**Preview this
section** plays the whole section; press it again (**Stop preview**) or press
Esc to stop. Selects starts the music on a video frame, which can move it by
up to half a frame; the cuts move with it.

**When the track is too short.** Bedroom Pop and Acoustic Pop are 60
seconds long; the other bundled tracks are 40 seconds long. When the chosen length does not fit between the start of the track and its
end, the video uses the largest group of four shots that fits, and the panel
says so under Pace before you build. With Pace Relaxed on Weekend Indie Pop,
Long reads "Long: 32 of 36 shots fit this track (34.3 s)"; a length that fits
reads, for example, "Standard: 24 shots (12.9 s)". The box can only move to
starts where that length fits. Every bundled track fits Long with Pace Quick.
With Relaxed, Bedroom Pop and Acoustic Pop fit all 36 shots (40.0 and 41.5
s), Weekend Indie Pop, Golden Hour Disco and Sunny Soul Strut fit at most 32
shots, and Easy Sunday Lo-fi at most 24. The picture never outruns
the music, and the music is never cut mid-shot.

**Your own music**: drop an audio file. The plugin listens for the beat and
uses it when the tempo is between 70 and 160 BPM and the detected beat grid is
reliable. When the detected beats land halfway between the kicks and snare
hits, it moves the grid half a beat onto them. Bars are not detected, so the
cuts follow the beat only. Other songs use fixed shot lengths (0.55 s for
Quick, 1.10 s for Relaxed; Groove keeps its pattern on a 0.55 s beat, "Groove
on a 0.55 s beat: 1.10, 0.55 and 0.275 s shots"). The panel then says "Music added; its tempo (N
bpm) is outside 70–160 bpm, so cuts use approximate timing." or "Music added;
its beat could not be found reliably, so cuts use approximate timing.", and
under Pace "Tempo outside 70–160 bpm (N bpm): shots use approximate timing
(0.55 s)." or "No steady beat: shots use approximate timing (0.55 s).". Those
cuts still move onto a clearly strong bass hit nearby (within 120 ms).

Your own music needs ffmpeg and Node.js 18 or later, and the previews need
ffmpeg (see [INSTALL.md](INSTALL.md)). Without both tools the panel does not
list Your own music and says "Install ffmpeg and Node.js 18+ to preview music
or use your own track." The bundled tracks work without them.

**No music** uses the same fixed shot lengths ("No music: shots use
approximate timing (0.55 s).") and has no length limit.

## Photos

Photos (Image resources) in the Project are used as shots. They need no
analysis and are never scene-searched.

- Each photo fills at most one shot.
- About a third of the shots are photo shots when there are enough photos.
  They are spread evenly over the video, from a different starting point for
  each version, and an unused photo fills each of them first.
- For the other shots the plugin prefers a clip used the fewest times so far
  (an unused one whenever it fits). Among those it takes, in order: a video
  moment that matches the shot's role, then a neighbouring role, then any
  other analysed video moment, then an evenly spaced filler moment from the
  clip. A photo fills one of these shots only when no video fits.
- Two shots in a row never come from the same clip or photo, and never more
  than two photos play in a row. When the footage cannot fill the chosen
  length under these rules, the plugin first tries again with the photos
  placed first, then ranks the clips by role and score instead of spreading
  them (with the photos as usual, then placed first), then uses the next
  shorter length (four shots fewer). Before you build the panel says, for
  example, "Your footage fits 20 of 24 shots (10.7 s)"; after the build it
  says "Your footage fits 20 of 24 shots, so this video is about 10.7 s. Add
  more clips or photos for the full length."
- A Project with only photos still builds; then the photos follow each
  other.
- Photos are centre-cropped to fill 16:9, like tall clips. They have no
  sound, so Clip sound skips them.
- **Photo motion.** Each photo gets one mild, eased move across its shot:
  push in, pull out, drift left, right, up or down, a small tilt, or push and
  drift. The same kind of move never comes twice in a row, drifts follow the
  photo's shape (up or down for tall photos, sideways for wide ones), and the
  move never shows the photo's edges.
- Photos also get the Soft look. Exports show the motion, the look and the
  crop. Frame previews made with Selects' frame capture tool can fail or show
  bars on photos with effects; the exported video is correct.

Selects reports no frame size for some photos. The size of such a photo is
read once, by placing it on an unsaved scratch Draft; nothing is saved.

**Beat punch.** With **Beat punch** on (in Advanced, on by default), every
video clip gets a "Beat punch" Video Effect: on the strong beats (the
first beat of each bar, counted from the start of the music section) the picture
zooms in quickly to 106 % over a quarter beat and settles back by half a
beat; a clip with no strong beat in it gets a slow push-in to 103 % across
the shot instead. The zoom is about the centre and never shows the frame's
edges, and the Soft look is applied on top of it. Photos keep their Photo
motion only. Change it with **Punch** (0 to 1) in the clip's Adjust tab; 0
turns it off for that clip. With No music, or music without a steady beat,
every video clip gets the slow push-in only.

## Title

Three lockup presets, chosen in the panel with a live preview:

| Preset | Text fields (initial text) | Look |
| --- | --- | --- |
| **Mini vlog** | Big word "mini", Small word "vlog" | Big italic serif word in pale pink with small sparkles in place of the dots of its i and j, and a small upright serif word in white |
| **A day in my life** | Year (see below), Big words "mini vlog", Tag line "a day in my life" | A star and the year before a pink rounded bold "mini", "vlog" below, and a small white two-line tag with a star |
| **A small glimpse** (default) | Top line "a small", Big word "glimpse", Bottom line "of today" | A small monospaced top and bottom line around a pink rounded bold word, split in two lines at the middle with a hyphen and a star before the second line |

- The Year starts as the current year (editable).
- Each field shows how many characters it holds and allows (for example
  "Big word (4/10)").
- Each preset keeps its own text, so switching presets does not overwrite
  another preset's edits. An empty big word disables Build; an empty small
  field is left out.
- The lockup shrinks to fit 60 % of the video's width.
- The sparkles and stars are drawn as shapes, not typed characters. The
  sparkles sit over every i and j of the big word (at most three); a word
  without them gets one sparkle at its top right.
- The fonts are bundled and embedded in the title, so the Draft renders the
  same on any machine with Selects, and the panel preview uses the same fonts
  and layout:
  - **MV Instrument Serif Italic**: the Mini vlog big word;
  - **MV DM Serif Display**: the Mini vlog small word;
  - **MV Rounded Bold**: the big words and tag of A day in my life and the
    big word of A small glimpse. It is a subset of Quicksand Bold, renamed
    because "Quicksand" is a Reserved Font Name;
  - **MV DM Mono**: the top and bottom lines of A small glimpse.

## Advanced

- **Clip sound**: how much of the clips' own sound plays. **Off** mutes it,
  **Ambient** (the default) keeps it about 18 dB under the music, and
  **Full** keeps it at its original level. The music stays at its full level
  in every mode. Photos have no sound. With No music and Clip sound Off the
  panel says "Silent video: no music and Clip sound is Off." In the Draft, a
  clip's level can be changed in the Inspector.
- **Soft look**: on by default.
- **Beat punch**: on by default. It adds the Beat punch zoom to every video
  clip (see [Photos](#photos)) and prefers moving moments (see [What it
  makes](#what-it-makes)). Off builds without both; switching it searches
  the clips again once.
- **Use photos**: on by default. Off builds from the analysed video only.
- **Choose clips (n/m)**: a checklist of the analysed clips (with their
  length and Tall, Wide or Square) followed by the photos (marked "Photo"),
  with **All** and **None** buttons. All are used by default. Photos cannot
  be chosen while Use photos is off. The readiness line shows how many clips
  and photos are selected.

## The Draft and editing it

The Draft contains:

- one video clip or photo per shot, cut on the beat and centre-cropped to
  16:9;
- one title Motion Graphic ("Mini vlog title") over the whole video;
- a "Soft look" Video Effect on each clip and photo (when Soft look is on),
  a "Photo motion" Video Effect on each photo, and a "Beat punch" Video
  Effect on each video clip (by default; not when Beat punch is off);
- the music clip, trimmed to the video (when music is chosen).

Edit it in the Inspector's **Adjust** tab:

- **Title** ("Mini vlog title"):
  - the preset's text fields, with the same names as in the panel (Big word
    and Small word; Year, Big words and Tag line; or Top line, Big word and
    Bottom line). Clearing any of them except the big word hides that text;
    clearing the big word hides the whole title;
  - **Main color** and **Second color**;
  - **Shadow** (0 to 1);
  - **Size (%)** (60 to 160);
  - **Horizontal position (%)** and **Vertical position (%)** (20 to 80);
  - **Sparkles** (Mini vlog) or **Stars** (the other presets), on or off.
- **Clips and photos**: **Softness** (0 to 1) in the Soft look, and for
  photos **Motion** (Push in, Pull out, Drift left, Drift right, Drift up,
  Drift down, Tilt or Push and drift) and **Motion strength** (0 to 2) in
  Photo motion, and for video clips **Punch** (0 to 1) in Beat punch. A
  clip's crop and sound level are changed in the Inspector as usual.
- **Music**: select the music clip to change its volume.

Finished videos are exported from the Draft with **Handoff → Export**.

## Limitations

- Only 16:9 (1920x1080) videos. There is no vertical option.
- The fonts cover Latin text only. Other scripts, such as Korean or Japanese,
  are shown in a system font instead.
- The title preset cannot be switched in Adjust. To change it, pick another
  preset in the panel and build again. Rebuilding creates a new Draft and does
  not keep Adjust edits.
- On Weekend Indie Pop, Golden Hour Disco and your own music the cuts
  follow the beat, but bar starts are best effort (see [Music](#music)).
- The Draft is built in two commits: first the clips, their crop, their
  Ambient sound level and the music; then the title, the Soft look, the photo
  motion, the Beat punch and, with Clip sound Off, the clips' muted sound (Selects can change
  a clip's audio tracks only once the Draft is saved). If the second commit
  fails, the Draft is kept and the panel says "Draft created, but its title,
  look and clip sound are not applied yet."; **Finish title and look**
  finishes that Draft with the settings it was built with, even if they have
  been changed in the panel since.
- Moving cuts does not move the title, which always spans the whole video as
  built. Moving the music clip's start does not move the cuts either.
