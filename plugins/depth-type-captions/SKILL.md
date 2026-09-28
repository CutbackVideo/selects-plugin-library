---
name: depth-type-captions
description: Add editable phrase typography that wraps around the speaker with subject-aware depth (words in front of or behind the person), plus optional vintage archival B-roll cards, on the active Selects Draft.
---
# Depth Type Captions

Experimental. Open an edited Draft whose source has a Selects transcript and
open the **Depth Type Captions** panel.

## One-click edit

Choose **Edit this draft**. The panel loads the Draft's dialogue, prepares a
local preview and a subject mask of the speaker (Apple Vision, on this Mac),
composes each phrase around the silhouette, and saves the captions to the
timeline as an editable caption clip.

## Manual editing

- **Load draft dialogue** / **Create captions from dialogue** build phrases.
- **Prepare video & subject mask** (or **Refresh video & mask** after the edit
  changes) creates the mask used for depth.
- **Compose with speaker** places lines around the person. Drag words on the
  preview; per word or layer, choose **In front of speaker** or
  **Behind speaker**, depth, offsets, and block, serif, script and connector
  fonts, palette and background.
- **Save captions to timeline** applies the change. **Undo last apply** and
  **Remove saved captions** revert it.

## Vintage B-roll (optional)

**Add vintage archival b-roll** finds public-domain clips from Wikimedia
Commons and the Internet Archive (Prelinger Archives), downloads only the
needed seconds, and places them as separate editable cards.

Use **Handoff → Export** for final video.

## Limits

- macOS only: subject masks are compiled locally with `swiftc` (Xcode Command
  Line Tools). Mask preparation can take several minutes on long Drafts.
- Downloads and caches go to `~/.selects/plugin-data/depth-type-captions`.
  Check each archival clip's rights before publishing.
- Panel interface text is English.
