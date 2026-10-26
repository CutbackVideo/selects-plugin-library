---
name: ali-abdaal-style
description: Turn a talking-head draft into a concise, editable Ali Abdaal-inspired short with visual beats, captions, and camera motion.
---
# Ali Abdaal Style

Experimental. Open a talking-head Draft and choose **Create Ali Abdaal Style draft**.
If the Draft already has a Selects transcript, the treatment starts immediately. If it
does not, the first click starts Selects transcript analysis and continues automatically
when the word-timed transcript is ready. The result is a new editable Draft; the original
Draft remains untouched.

The treatment reframes the source to 9:16, adds smooth scene-aware camera movement,
fixed word-timed captions, and editable editorial graphics. Use **Handoff → Export**
for final delivery. Requires a video source that Selects can analyze.

Camera movement preserves the source colours. Video and graphics share a continuous camera path, including overlapping moves.

Headlines use source face observations only during their own scene intervals. Existing empty space is preferred, with a minimal vertical move when needed. When no readable space remains, or observations cannot be verified, that scene reserves a title area and fits the entire moving video below it. The camera motion and source colours are retained. Missing observations are labelled separately on the timeline and in the panel; they are not treated as an absent face. Select a headline to adjust its top position in Inspector. The last layout statuses are saved in plugin storage. This uses the existing shared AI runtime; no new SDK calls are required.
