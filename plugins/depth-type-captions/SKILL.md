---
name: depth-type-captions
description: Add editable phrase typography that wraps around the speaker with subject-aware depth (key words tucked behind the person) on the active Selects Draft.
---
# Depth Type Captions

Experimental. Needs Selects 2.0.508 or later on macOS, or 2.0.512 or later on
Windows. Open an edited Draft of up to 90 seconds whose source has a Selects
transcript, then open the **Depth Type Captions** panel.

## Make captions

Choose **Make depth captions**. The panel reads the Draft's dialogue, renders
the Draft at full size, makes a speaker mask for every frame, places each
phrase around the speaker, and saves the captions to the timeline as one
caption clip. The headline word of every phrase sits behind the speaker; when a
phrase finds no open space around the speaker, its smaller lines stay in front
of the speaker so they remain readable.

Speaker masks are made on a Mac with Apple Vision. On Windows they come from
Selects generation (video background removal), which uses Selects credits and
finds people only.

- **Redo** follows the current edit of the Draft, for example after a cut, and
  replaces changes made in Fine-tune. Speaker masks are reused while the
  footage is unchanged.
- **Remove** takes the captions off the timeline. **Undo** reverts the last
  Make, Redo, Save changes or Remove.

## Fine-tune

Open **Fine-tune** to change a phrase's text (clear a line to leave it out),
drag words on the preview, put a word in front of the speaker, delete a phrase,
or change fonts and colors, then choose **Save changes**.

On a Mac, **In front of the text** chooses what hides the words: everything the
subject detector finds in front (people, hands, microphones, desks) or people
only. It takes effect on Redo. Turn off **Behind speaker** for plain captions.

Use **Handoff → Export** for final video.

## Limits

- macOS arm64: speaker masks are compiled locally with `swiftc` (Xcode Command
  Line Tools) and launched with `python3`.
- Windows x64: speaker masks need Selects generation on the account; the panel
  says so if it is unavailable. Turning off **Behind speaker** makes plain
  captions without it.
- Masks are kept at `~/.selects/plugin-data/depth-type-captions`, about 3 MB
  per second of 1080p video (masks plus the full-size render). The saved captions
  and the previous save (for Undo) keep their folders; older ones are removed.
- Panel interface text is English.
