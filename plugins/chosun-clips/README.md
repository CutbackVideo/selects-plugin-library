# Chosun Ilbo TikTok Clips

Turns a long Chosun Ilbo YouTube episode into editable vertical TikTok Drafts
in the program's own format: the series frame, a two-line headline and, for
programs whose source has no subtitles, captions. Every headline and caption
stays an editable Motion Graphic in the Draft.

## Using the panel

Open **Chosun Ilbo TikTok Clips** from the Plugin list with a Project open.

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

A bar shows how far the run has got, with the current step and status under
it; while Selects analyzes the video it shows the time left. **Cancel** stops
the run at once. Progress is saved after every step, so **Resume** under
*Unfinished work* continues a cancelled or closed run where it stopped.

## Templates

Six programs ship as built-in templates: 흑백여의도, 김광일의입, 판읽기,
역사전쟁, 악인전 and 머니워치. In the **Templates** tab you can change the
video window and source crop, the headline and logo, the background, captions,
filler and pause trimming, and the AI's instructions for choosing passages and
writing headlines. Duplicate a template to make your own.

## Data

Templates, unfinished work, downloads and the YouTube downloader live in
`~/.selects/plugin-data/chosun-clips/`. Installing a new version keeps them.
