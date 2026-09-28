---
name: a16z-style-captions
description: Add editable blur-to-sharp editorial captions (a16z style) to the active Selects Draft, with an optional B-roll and motion-graphics workflow.
---
# a16z Style Captions

Experimental. Open an edited Draft that has a Selects transcript, open the
**a16z Style Captions** panel, and choose **Create captions**.

## Captions only (default)

The panel loads the Draft's word-timed dialogue into phrases. Adjust font,
letter spacing, placement, entrance (blur to sharp, fade, rise), emphasis words
and optional red title cards, then choose **Apply captions**. The captions are
saved as one editable motion-graphic clip over the whole Draft; its parameters
stay editable in the inspector. **Undo last apply** reverts the saved edit.

## B-roll + motion graphics (optional)

Switch the mode to add per-phrase visuals:

- **Find B-roll** searches existing Project footage, Wikimedia Commons archive
  video, and public links you supply. YouTube sources need `yt-dlp`.
- Diagram cards (process, comparison, connected ideas) use labels copied from
  the transcript passage only.
- **Apply to draft** places each visual as a separate editable clip.

Changes are previews until applied. Use **Handoff → Export** for final video.

## Limits

- Requires a transcript for the Draft's source media.
- Archive and public footage is downloaded into the app's temporary folder;
  check each clip's license and credit before publishing.
- Panel interface text is English.
