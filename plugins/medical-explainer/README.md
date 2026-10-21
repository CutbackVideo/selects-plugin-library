# Medical Explainer

Turns a topic, pasted text or a link into a vertical (9:16) medical explainer: a 16:9 photorealistic 3D medical
animation strip between a two-line title and a brand wordmark, one generated shot per narrated sentence, continuous
camera-move transitions between sentences, and editable scene labels, captions and pointer labels.

Medical facts stay general and textbook-level, but every video still needs a medical review before it is published.

## Use

1. Open a Project, then open **Medical Explainer** from Apps.
2. Enter a topic, a link, or paste the text. Choose the narration language and voice, and the template: the brand
   preset (Generic or Chosun Ilbo Health), the wordmark, the two title colours and the background. Turn on the music bed
   if you want one.
3. Press **Write the script**. Read the 8-10 sentences, the scene labels and the pointer labels, and edit the two title
   lines. The panel shows what will be generated (and paid for with Selects credits) before anything is made.
4. Press **Make keyframes**. Two candidate keyframes are drawn per scene and the AI picks one; change any pick, then
   press **Use these and make the video**. (Turn off the review switches to run straight through.)
5. The scene clips, transitions, labels and a scene check are made, and the video appears as an editable Draft in the
   Project. Every title, label, caption and pointer is its own graphic clip with editable text, colours and font.
6. Export it with **Handoff → Export**.

## What it generates

- Narration per sentence: ElevenLabs v3 (Daniel) by default, or MiniMax Speech 2.8 HD (Korean Calm Lady, Korean Gentle
  Woman). The measured sentence lengths set all timing.
- Keyframes: the keyframe model you choose (Seedream 5.0 Pro by default, or Nano Banana 2.1, Nano Banana Pro, GPT
  Image 2.5, FLUX 3), 16:9, two candidates per scene; scenes 2 onward are edits with scene 1 as the style reference.
  FLUX 3 has no edit model, so its later scenes are drawn from the text and style description alone.
- If Kling refuses a scene's keyframe for its content policy, the run stops and shows that scene. You choose: regenerate
  that scene's keyframe with a model you pick (a new paid request), or use the still image (a slow zoom on the
  keyframe). Nothing is regenerated or resubmitted without that choice. The keyframe model of a started job does not
  change; a different model means a new job.
- Scene clips: Kling v3 Standard (720p), start frame only, `max(5, ceil(length + 0.5))` seconds, two takes per scene.
  Each clip plays from its first frame at normal speed.
- Transitions: Kling v3 Standard, 3 seconds from the last frame a scene shows to the first frame of the next, two takes
  per boundary, played whole at about 1.7x in a 1.8-second slot centred in the 0.8-second pause between sentences. A
  transition that melts or jumps becomes a 0.5-second cross-dissolve.
