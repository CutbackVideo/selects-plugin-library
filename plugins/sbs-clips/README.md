# SBS Radio Clips

Turns a long SBS Radio episode into editable vertical shorts in the program's
own format: the program frame, a two-line headline and captions. Every
headline and caption stays an editable Motion Graphic in the Draft. Built from
Chosun Ilbo TikTok Clips, with the same inputs and panel.

## Using the panel

Open **SBS Radio Clips** from the Plugin list with a Project open.

1. **Source video.** Paste a YouTube link, or pick a video of two minutes or
   more that is already in the Project. A link is downloaded once and reused.
2. **Template.** Leave the program on *Detect automatically* or choose one.
   Keep the recommended number of clips or set it, and add extra instructions
   if you like.
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
- **Money Lab**: green gradient frame, yellow headline with a black
  outline, the guest's half of the split screen, box captions.

The video window and source crop match the programs' YouTube episodes. Footage
framed differently (a single camera, another split) needs the window and crop
changed in the **Templates** tab, where you can also change the headline (now
with an optional outline), background, logo, captions, filler and pause
trimming, and the AI's instructions. Duplicate a template to make your own.

## Data

Templates, unfinished work, downloads and the YouTube downloader live in
`~/.selects/plugin-data/sbs-clips/`. Installing a new version keeps them.
