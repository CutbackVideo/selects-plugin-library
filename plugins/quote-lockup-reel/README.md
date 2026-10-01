# Quote Lockup Reel

One click turns an analyzed podcast Draft into a 9:16 quote reel.

## What it makes

A new Draft named `<podcast Draft> · Quote Reel`, usually 12-22 seconds long:

1. **The quote.** The Selects AI picks one self-contained quote from the transcript and splits it into clauses of
   about 1-4 seconds. Each clause is one shot. The speech runs uncut underneath.
2. **Shots.** Speaker shots keep the podcast picture in a rounded card on black. One clause, the key line, is shown
   on a black screen with no music. Up to three clauses that describe something visible get stock B-roll. A short
   last clause becomes a quiet one-line outro.
3. **Captions.** Every shot gets its own packed lockup of small serif and bold italic words, laid out by a
   typography engine and drawn as glyph outlines. Each word fades in when it is spoken. When the face detector is
   available, the words on speaker shots start beside the face and the last words drop under the chin, clear of the
   face; words may pass behind the speaker's head when speaker masks are available and every word stays readable.
   Accent colours come from the shot's own colours.
4. **Framing.** Faces are found with YuNet. Each camera angle keeps one framing and one caption side for the whole
   reel, so cuts never re-frame the same angle. Without the face detector, shots are centred.
5. **Music.** An original piano piece: the accompaniment plays up to the key line, stops under it, and the melody
   comes in on the next cut. It sits on its own track at -6 dB, without fades.

The result is an ordinary Draft: the quote is on Main (one clip per shot), B-roll on overlay tracks, the music on an
audio track, and the frame and captions are two motion graphics (`Quote Reel Frame`, `Quote Reel Captions`). Clips
can be trimmed, moved or removed; the captions are drawn as one graphic and are not edited word by word.

## Use

1. Open an analyzed podcast Draft (one person talking works best; English transcripts).
2. Open **Quote Lockup Reel** from the Plugin list and choose **Make reel**.
3. The new reel opens when it is done (about 1-4 minutes). Choosing **Make reel** again while a reel is open makes
   another reel from the same podcast Draft.

## Credits and network

- The Selects AI picks the quote (one turn, or two when the first answer breaks the format).
- Speaker masks (words behind the head) are made with Selects generation and use credits.
- B-roll comes from the Selects stock footage search (no keys needed). Each clip's author and service are listed in
  the panel after a run; the clips are under their providers' licences (for example the Pexels or Pixabay licence).
- The face detector is downloaded once on first use; see [INSTALL.md](INSTALL.md).

## Files

Runs write beneath `.selects/plugin-data/quote-lockup-reel` in your home folder. The reels use some of these files,
so keep them while you keep the reels:

- `music/` (the piano bed the reels play), `mattes/` (speaker masks the captions read) and `stock/` (B-roll clips);
- `reels/<draft>/` (each reel's plan);
- `models/yunet/` (the face detector).
