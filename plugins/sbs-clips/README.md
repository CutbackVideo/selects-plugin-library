# SBS Radio Clips

Turns a long SBS Radio episode into editable vertical shorts in the program's
own format: the program frame, a two-line headline and captions. Every
headline and caption stays an editable Motion Graphic in the Draft. Built from
Chosun Ilbo TikTok Clips, with the same inputs and panel.

## Using the panel

Open **SBS Radio Clips** from the Plugin list with a Project open.

1. **Source video.** Paste a YouTube link, or pick a video of two minutes or
   more that is already in the Project. A link is downloaded once and reused.
2. **Template.** Leave the program on *Detect automatically* or choose one,
   and pick the layout: **YouTube Shorts** or **TikTok**. Keep the recommended
   number of clips or set it, and add extra instructions if you like.
3. **Make clips.** The panel analyzes the video if needed (Selects asks you to
   confirm the credits), identifies the program, lets the Selects AI choose the
   passages and write the headlines, and builds one Draft per clip.
4. **Open** a clip from the results to refine it, then export it with
   **Export** at the top right.

**Cancel** stops the run at once. Progress is saved after every step, so
**Resume** under *Unfinished work* continues a cancelled or closed run.

## Templates

Two programs ship as built-in templates:

- **News Direct**: black frame, white and yellow two-line headline,
  a 1080x1280 video window on the panel's wide shot, box captions.
- **Money Lab**: green gradient frame, a two-line headline with the channel's
  yellow and green gradient fills and black outline, the host label, the
  channel logo and an editable episode date (taken from the YouTube title,
  else today), the guest's half of the split screen, box captions with key
  words in yellow (the AI picks them with each passage; in a Draft caption,
  *asterisks* mark a highlighted word). The
  channel's headline face is a condensed display font; set it in the Templates
  tab when it is installed, otherwise the default sans is used.

Following faces (on for News Direct; change it in the Templates tab): the panel
finds faces with the Selects AI Runtime plugin (installed with this one) and
frames whoever talks in each sentence with a close-up, about 4.5 face widths
across (Templates tab). A first guess comes from mouth movement against each
face's listening level. Then one AI call per clip looks at the picture: close-ups
of every face over each stretch of a few seconds decide who actually talks (the
transcript can give two people one speaker), and each face's close-up
alternatives, cut as the window will show them, decide how wide to go without a
neighbour or a set seam at the edge. If that call fails, the first guess stands.
When no face clearly talks, the window keeps the most faces whole, widening the
view when large faces sit side by side (a split-screen insert). Without the
runtime clips keep the fixed crop.

The video window and source crop match the programs' YouTube episodes. Footage
framed differently (a single camera, another split) needs the window and crop
changed in the **Templates** tab, where you can also change the headline (now
with an optional outline), background, logo, captions, filler and pause
trimming, and the AI's instructions. Duplicate a template to make your own.

## Layouts

Each template has a YouTube Shorts layout and a TikTok layout. The TikTok
layout keeps the headline, captions, logo and date inside the profile grid's
3:4 crop and clear of the app's bottom caption and right-hand buttons. In the
Templates tab, the Layout switch shows and edits either one; the TikTok preview
draws those safe zones.

## Data

Templates, unfinished work, downloads and the YouTube downloader live in
`~/.selects/plugin-data/sbs-clips/`. Installing a new version keeps them.
