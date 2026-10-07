---
name: a16z-style-captions
description: One click turns a talking-head Draft into a 9:16 Short in the a16z house style - tightened pauses, speaker framing, editorial captions with lockups and emphasis, keyword cards, stock B-roll, a name tag and a music bed.
---
# a16z Style Captions

Experimental. Open a talking-head Draft that has a Selects transcript, open the
**a16z Style Captions** panel, optionally fill in the speaker's name and role,
and choose **Make the Short**. The panel creates a new Draft named
"<Draft> · a16z Short" and opens it when it is done (about four minutes).

## What it makes

- **Cut**: long pauses are cut down to short house gaps (a breath at a comma, a
  short beat at a sentence end, about half a second before a punchline).
- **Framing**: a 1080 x 1920 Draft. Each shot is framed on the speaker's face
  (YuNet face detection), filling the frame; jump cuts sometimes punch in, and
  the first shot opens with a short zoom-out settle.
- **Captions**: one motion graphic over the whole Short. Words are grouped the
  way the reference edits group them (phrases of about three words, never
  across a sentence, compounds and key terms kept whole), set in a medium
  grotesk with a soft shadow, and blur in. The opening line and a few key
  claims become mixed-size lockups built word by word; payoffs, numbers and
  imperatives get a larger line; a contrast word can switch to serif italic.
  An assistant pass reads the transcript once to mark key terms, punchlines,
  compounds, quotes and cards; without it the captions follow plain rules.
- **Keyword cards**: up to two full-screen burgundy cards that spell a concept
  the speaker names.
- **B-roll**: stock footage from Pexels and Pixabay through Selects' stock
  search, cut into runs of short shots over the lines that name something
  concrete. Captions over bright footage turn charcoal.
- **Name tag**: when a name is given, a serif name and role line with a
  burgundy wipe on the opening shot.
- **Brand mark**: optional; your own small PNG or SVG in the top-right corner.
- **Music**: an AI-generated ambient bed about 9 dB under the voice, no
  ducking, stopping on the last frame (uses generation credits; can be turned
  off). The voice is levelled with clip gain.

**Rebuild captions and graphics** (shown on a Short made by the panel) redoes
the captions, cards, B-roll, name tag and music on the Short's current cut,
reusing the assistant's marks and the music.

## Limits

- Needs a transcript. English captions.
- Speaker framing uses shared YuNet jobs on macOS and Windows. Install
  `selects-ai-runtime` from the same library revision and use Selects 2.0.570
  or later; no separate Python installation is needed.
- B-roll needs a Selects version with stock search; check each clip's licence
  before publishing. The panel lists the footage credits.
- A style study: not affiliated with a16z. Use your own name, role and logo.
- Panel interface text is English.
