---
name: ali-abdaal-style
description: Turn a talking-head draft into a concise, editable Ali Abdaal-inspired short with visual beats, captions, and camera motion.
---

Clip effects are authored with the shipped WGSL graph factories. Use `shader` with `addVideoEffect` / `replaceVideoEffect`; do not add new `tsxCode` clip effects. Existing TSX clip-effect assets are reference fixtures. Captions, titles and other Motion Graphics retain their existing authoring format. This version requires the Selects host with editable WGSL selection/SVG bindings and fixed SVG image sizes; deploy that host before publishing this plugin update.

# Ali Abdaal Style

Experimental. Open a talking-head Draft and choose **Create Ali Abdaal Style draft**.
If the Draft already has a Selects transcript, the treatment starts immediately. If it
does not, the first click starts Selects transcript analysis and continues automatically
when the word-timed transcript is ready. The result is a new editable Draft; the original
Draft remains untouched.

The treatment reframes the source to 9:16, adds smooth scene-aware camera movement,
fixed word-timed captions, and editable editorial graphics. Use **Handoff → Export**
for final delivery. Requires a video source that Selects can analyze.
