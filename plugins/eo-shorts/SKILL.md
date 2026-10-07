---
name: eo-shorts
description: Turn a talking-head Draft of up to 95 seconds into a new 9:16 EO-style Short with the EO Shorts panel - tightened talk, speaker framing, typographic scenes with pictures and stock B-roll, music and loudness, export and automatic checks.
---
# EO Shorts

Experimental. The work is done by the **EO Shorts** panel, not by this Skill.

## Use

1. Open a talking-head Draft: one speaker on camera, a 1080p source, up to
   95 seconds, analysed in Selects so it has a transcript.
2. Open **EO Shorts** from the **Apps** tab, choose a style (**Film A** or
   **Film B**) and press **Make EO short**.
3. The panel makes a new Draft named "EO Short · <Draft> · <id>" and leaves the
   open Draft unchanged. A run takes several minutes; planning the scenes alone
   can take up to 10 minutes.

Keep the panel open while it works. If it closes, open it again and press
**Resume** (it appears within about a minute and a half): the run continues from
its first unfinished step. **Cancel** stops after the current operation.

## What it makes

- **Tightened talk.** Long pauses are cut to short gaps, removable fillers
  ("um", "uh") go, and Selects AI may drop a clause that adds nothing (a
  repeat, a false start or an aside). The speech is never sped up.
- **Speaker framing.** Every camera angle of the source is framed on the
  speaker's face (shared YuNet face detection through selects-ai-runtime) as a fixed 9:16 crop.
- **Scenes.** Selects AI plans the whole film: where the speaker stays on
  screen, and where large typography, generated cut-out pictures, stock B-roll
  or photos of the people it names take over, each scene as one Motion Graphic.
- **B-roll and photos.** Stock footage from Pexels and Pixabay through Selects'
  stock search, and photos of named people from Wikimedia Commons (CC0, public
  domain and CC BY only, credited); Selects AI checks each candidate against
  the scene's request before it is used.
- **Sound.** One of twelve bundled instrumental tracks (CC0) ducked under the
  voice, sound effects (CC0) on scene events, and the mix set to about
  -14 LUFS. The music and each effect are ordinary clips an editor can swap
  or delete.
- **Export and checks.** The short is exported as an MP4 into the job folder
  and checked (pace, pauses, music, loudness, format, structure, picture,
  voice, plan and credits); the panel shows the results, the frames and a
  credit list to copy.

**Rebuild** (on a short the panel made) takes the graphics, footage, music and
sound effects off the short and builds them again from the saved plan and
media. Your cuts and your own clips stay.

## Files it creates

Each run is a job folder beneath `.selects/plugin-data/eo-shorts/jobs` in your
home folder (`job.json`, `events.jsonl`, `calls.jsonl`, `receipts/` and one
folder per step, including the export). The shared face runtime and font subsetter
are kept in `.selects/plugin-data/eo-shorts/runtime`. When asked about a run,
read its `job.json` and `receipts/`; the Draft the panel made is `draftId` in
`job.json`. Delete a job folder only after deleting its Draft.

## Limits

- Needs a transcript and a 1080p source of at most 95 seconds; every clip must
  play at 1x.
- Uses Selects AI and picture generation credits.
- Pictures need Selects 2.0.512 or later; without them a picture scene keeps
  its typography. Without stock search, B-roll shots show the speaker.
- Check each B-roll clip's licence before publishing; the panel lists the
  footage credits.
- Panel text, AI notes and job files are English.

Setup: [INSTALL.md](INSTALL.md). Licences: [THIRD_PARTY.md](THIRD_PARTY.md).
