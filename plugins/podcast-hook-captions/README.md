# Podcast Hook Captions

Turns the podcast Draft you have open into a short-form reel, with every piece
left editable: yellow word-pop captions timed from the Draft's own transcript,
kinetic hook titles, a warm punch-in camera look on the Main clips, optional
B-roll, and one mixed track of whoosh, impact, riser and tick sounds.

## Use

1. Open a vertical (9:16) Draft whose Main clips carry an analysed transcript.
   Short clips work best (up to about 1,600 words, one speaker per shot).
2. Open **Podcast Hook Captions** from the Plugin list.
3. Write the hooks, one per line, or press **Suggest with AI**:
   - `hook: lead-in | KEY WORDS` - a title that stays up. The first `hook:`
     opens the video as a title card.
   - `punch: lead-in | KEY WORDS` - a big key word that replaces the captions
     and grows past the frame edge.
   - `stack: lead-in | KEY WORDS` - tilted words with a hand-drawn arrow.
   - `broll: the words it covers | what to show` - B-roll over those words.
   Phrases are matched to the transcript; unmatched lines are listed.
4. Optional: **Use my sound library…** (whoosh / impact / riser / tick files are
   picked by folder and file name; without a library the sounds are
   synthesized), **Choose B-roll folder…**, or a free Pexels API key so a
   `broll:` phrase with no local match is searched on Pexels.
5. **Apply.** It saves two commits: the framing and look, then the captions and
   sound.

## What the Draft gets

- **Captions graphic** across the whole Draft (`Hook Captions`): word pops,
  hook cards, grid and optional rounded frame. Accent colour, fonts, sizes and
  timing stay editable in the Inspector.
- **Hook Captions Look** effect on every Main clip: warm grade, vignette, slow
  zoom and a punch-in on each key word, driven by the same camera plan as the
  titles. Landscape shots are cropped to vertical; adjust framing with *Pan every clip*
  or each clip's Transform.
- **B-roll clips** on a video track, muted, only where a `broll:` line says.
- **One sound clip**: the mixed effects file, imported into the Project.
- With the segmentation helper installed, the speaker's head is measured so
  titles sit around it, the opening title card is placed behind the speaker,
  and stack hooks pass behind them.

The key-word face is Six Caps (SIL OFL), embedded into the graphic at apply
time; any installed family typed into *Hero font* wins.

## Remove

**Remove Hook Captions** reverts the two commits while they are the newest
revisions. If the Draft changed since (or the app restarted), it deletes the
captions graphic, the sound clip, the B-roll it placed and the media it
imported, and restores the framing it changed. The *Hook Captions Look* effect
cannot be removed through the SDK once its commit is no longer the newest; take
it off each Main clip in the Inspector. **Remove reel pieces found on this
Draft** does the same scan without a saved record. Apply refuses a Draft that
still carries the look effect instead of stacking a second camera.

Export the finished reel with **Handoff → Export**.

## Files it creates

Generated sounds, speaker mattes and downloaded B-roll are kept beneath
`.selects/plugin-data/podcast-hook-captions` in your home folder, because the
Project keeps referencing them. Removing a reel deletes its sound file.

## Limits

- macOS on Apple silicon. Speaker placement needs the `person-cutout` helper
  (Apple Vision, macOS 14+); without it titles use reference proportions and
  stack hooks slide off the frame edge.
- Tuned for vertical Drafts; text is proportional and survives other sizes,
  but the title card and set are designed for 9:16.
- The panel UI is English only.
- Pexels downloads use your own API key and the Pexels licence.

Setup: [INSTALL.md](INSTALL.md). Font licence: [THIRD_PARTY.md](THIRD_PARTY.md).
